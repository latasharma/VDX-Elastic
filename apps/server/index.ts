import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRemoteJWKSet,jwtVerify } from 'jose';
import { ConnectionStore, type OAuthProvider } from './connections.ts';
import { services,service } from '../../packages/connections/src/index.ts';
function required(name:string){const v=process.env[name];if(!v)throw Error(`Missing ${name}`);return v;}
const issuer=required('OIDC_ISSUER'),audience=required('OIDC_AUDIENCE');
const jwksURL=new URL(required('OIDC_JWKS_URL'));if(jwksURL.protocol!=='https:')throw Error('JWKS must use HTTPS.');
const jwks=createRemoteJWKSet(jwksURL);
const store=new ConnectionStore(required('VDX_DATABASE_PATH'),Buffer.from(required('VDX_VAULT_KEY'),'base64'));
// No public consumer provider is enabled without an approved adapter and access agreement.
const providers:OAuthProvider[]=process.env.VDX_PROVIDER_CONFIG?JSON.parse(readFileSync(process.env.VDX_PROVIDER_CONFIG,'utf8')):[];
for(const p of providers){if(!service(p.id)||!p.clientId||!p.clientSecret||!Array.isArray(p.scopes))throw Error('Invalid provider configuration.');for(const value of [p.authorizationURL,p.tokenURL,p.redirectURI]){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)throw Error('Provider endpoints must use HTTPS.');}}
const server=createServer(async(req,res)=>{
 res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
 const send=(status:number,body:unknown)=>{res.writeHead(status);res.end(JSON.stringify(body));};
 try {
 const url=new URL(req.url||'/', 'http://localhost');
 if(req.method==='GET'&&url.pathname==='/health')return send(200,{status:'ok'});
 const callback=/^\/oauth\/([\w-]+)\/callback$/.exec(url.pathname);
 if(req.method==='GET'&&callback){const provider=providers.find(p=>p.id===callback[1]);if(!provider)return send(404,{error:'Unknown provider.'});try{await store.finish(provider,url.searchParams.get('state')||'',url.searchParams.get('code')||'');return send(200,{message:'Account linked. Return to VDX to continue your request. No order has been placed.'});}catch{return send(400,{error:'Linking failed or expired. Start again in VDX.'});}}
 const token=req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];if(!token)return send(401,{error:'Sign in to VDX first.'});
 let owner:string;try{const {payload}=await jwtVerify(token,jwks,{issuer,audience,algorithms:['RS256','ES256']});if(!payload.sub)throw Error();owner=payload.sub;}catch{return send(401,{error:'Your VDX session has expired. Sign in again.'});}
 if(req.method==='GET'&&url.pathname==='/connections')return send(200,services.map(s=>({...s,linked:store.connected(owner,s.id),canLink:providers.some(p=>p.id===s.id)})));
 const requestMatch=/^\/requests\/([\w-]+)$/.exec(url.pathname);
 if(req.method==='GET'&&requestMatch){const result=store.request(owner,requestMatch[1]!);return send(result?200:404,result??{error:'Request not found.'});}
 if(req.method==='POST'&&url.pathname==='/requests'){
 let raw='';for await(const chunk of req){raw+=chunk.toString();if(Buffer.byteLength(raw)>16000)return send(413,{error:'Request too large.'});}
 let body;try{body=JSON.parse(raw);}catch{return send(400,{error:'Invalid JSON.'});}
 if(typeof body?.text!=='string'||typeof body?.provider!=='string'||!service(body.provider)||!body.text.trim()||body.text.length>10000)return send(400,{error:'Provide a request and supported service.'});
 const id=store.saveRequest(owner,body.text,body.provider);return send(201,{id,status:'waiting_connection'});
 }
 const match=/^\/connections\/([\w-]+)$/.exec(url.pathname);
 if(match&&service(match[1]!)){
 if(req.method==='DELETE'){store.disconnect(owner,match[1]!);return send(200,{disconnected:true,notice:'Local authorization removed. Revoke access in the provider account as well.'});}
 if(req.method==='POST'){const provider=providers.find(p=>p.id===match[1]);if(!provider)return send(409,{error:'Provider linking is not enabled.',service:service(match[1]!)});return send(200,{authorizationURL:store.begin(owner,provider)});}
 }
 send(404,{error:'Not found.'});
 }catch{send(500,{error:'Unable to complete the request. No action was submitted to a provider.'});}
});
server.requestTimeout=20000;server.headersTimeout=10000;
server.listen(Number(process.env.PORT||8787),'127.0.0.1',()=>console.log('VDX connection server listening on loopback.'));
process.on('SIGTERM',()=>server.close(()=>{store.close();process.exit(0);}));
