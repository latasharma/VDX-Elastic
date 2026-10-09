import { DatabaseSync } from 'node:sqlite';
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { service } from '../../packages/connections/src/index.ts';
export type OAuthProvider = {id:string; authorizationURL:string; tokenURL:string; clientId:string; clientSecret:string; scopes:string[]; redirectURI:string};
/** Secrets stay server-side. Store on an encrypted volume; back up both DB and key securely. */
export class ConnectionStore {
 readonly db:DatabaseSync;
 constructor(path:string,private key:Buffer) {
  if(key.length!==32)throw Error('A 32-byte vault key is required.');
  this.db=new DatabaseSync(path);
  this.db.exec(`PRAGMA journal_mode=WAL;
   CREATE TABLE IF NOT EXISTS requests(id TEXT PRIMARY KEY, owner TEXT NOT NULL, payload TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS oauth(state TEXT PRIMARY KEY, owner TEXT NOT NULL, provider TEXT NOT NULL, verifier TEXT NOT NULL, expires INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS connections(owner TEXT NOT NULL, provider TEXT NOT NULL, secret TEXT NOT NULL, PRIMARY KEY(owner,provider));`);
 }
 private seal(value:unknown,aad:string) {const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',this.key,iv);cipher.setAAD(Buffer.from(aad));const data=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64');}
 private open(value:string,aad:string) {const b=Buffer.from(value,'base64');const c=createDecipheriv('aes-256-gcm',this.key,b.subarray(0,12));c.setAAD(Buffer.from(aad));c.setAuthTag(b.subarray(12,28));return JSON.parse(Buffer.concat([c.update(b.subarray(28)),c.final()]).toString());}
 saveRequest(owner:string,text:string,provider:string) {
  if(!service(provider)||!text.trim()||text.length>10000)throw Error('Invalid request.');
  const id=randomUUID();this.db.prepare('INSERT INTO requests VALUES(?,?,?)').run(id,owner,this.seal({text,provider,status:'waiting_connection'},owner+id));return id;
 }
 request(owner:string,id:string) {const row=this.db.prepare('SELECT payload FROM requests WHERE owner=? AND id=?').get(owner,id);return row?this.open(String(row.payload),owner+id):undefined;}
 begin(owner:string,p:OAuthProvider) {
  for(const url of [p.authorizationURL,p.tokenURL,p.redirectURI])if(new URL(url).protocol!=='https:')throw Error('OAuth endpoints must use HTTPS.');
  const state=randomBytes(32).toString('base64url'),verifier=randomBytes(32).toString('base64url');
  this.db.prepare('DELETE FROM oauth WHERE expires < ?').run(Date.now());
  this.db.prepare('INSERT INTO oauth VALUES(?,?,?,?,?)').run(state,owner,p.id,this.seal(verifier,state),Date.now()+600000);
  const url=new URL(p.authorizationURL);for(const [k,v] of Object.entries({response_type:'code',client_id:p.clientId,redirect_uri:p.redirectURI,scope:p.scopes.join(' '),state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}))url.searchParams.set(k,v);
  return url.toString();
 }
 async finish(p:OAuthProvider,state:string,code:string,exchange:typeof fetch=fetch) {
  // Atomic consumption prevents two callbacks exchanging the same grant.
  const row=this.db.prepare('DELETE FROM oauth WHERE state=? AND provider=? RETURNING *').get(state,p.id);
  if(!row||Number(row.expires)<Date.now()||!code||code.length>8192)throw Error('Invalid or expired authorization.');
  const response=await exchange(p.tokenURL,{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',code,redirect_uri:p.redirectURI,client_id:p.clientId,client_secret:p.clientSecret,code_verifier:this.open(String(row.verifier),state)})});
  if(!response.ok)throw Error('Provider rejected account linking.');
  const data=await response.json() as Record<string,unknown>;
  if(typeof data.access_token!=='string'||!data.access_token||String(data.token_type).toLowerCase()!=='bearer')throw Error('Invalid provider token.');
  const owner=String(row.owner);this.db.prepare('INSERT OR REPLACE INTO connections VALUES(?,?,?)').run(owner,p.id,this.seal({...data,receivedAt:Date.now()},owner+p.id));
  for(const request of this.db.prepare('SELECT id,payload FROM requests WHERE owner=?').all(owner)){const data=this.open(String(request.payload),owner+request.id);if(data.provider===p.id&&data.status==='waiting_connection'){data.status='ready_to_plan';this.db.prepare('UPDATE requests SET payload=? WHERE id=? AND owner=?').run(this.seal(data,owner+request.id),request.id,owner);}}
  return {linked:true}; // Never return provider tokens to the mobile app.
 }
 connected(owner:string,provider:string) {const row=this.db.prepare('SELECT secret FROM connections WHERE owner=? AND provider=?').get(owner,provider);if(!row)return false;const token=this.open(String(row.secret),owner+provider);return typeof token.expires_in==='number'&&token.expires_in>0&&token.receivedAt+token.expires_in*1000>Date.now();}
 disconnect(owner:string,provider:string) {this.db.prepare('DELETE FROM connections WHERE owner=? AND provider=?').run(owner,provider);this.db.prepare('DELETE FROM oauth WHERE owner=? AND provider=?').run(owner,provider);}
 close(){this.db.close();}
}
