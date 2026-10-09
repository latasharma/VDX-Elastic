import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { ConnectionStore,type OAuthProvider } from '../../../apps/server/connections.ts';
import { whatsappURL,contactRequest } from './index.ts';
const p:OAuthProvider={id:'uber-eats',authorizationURL:'https://provider.example/authorize',tokenURL:'https://provider.example/token',redirectURI:'https://vdx.example/oauth/uber-eats/callback',clientId:'test',clientSecret:'test-only',scopes:['test']};
test('user isolation, expiring single-use linking and pending-request resumption',async()=>{
 const store=new ConnectionStore(':memory:',randomBytes(32));
 try{
 const id=store.saveRequest('alice','Order lunch','uber-eats');assert.equal(store.request('bob',id),undefined);
 const url=new URL(store.begin('alice',p));assert.equal(url.searchParams.get('code_challenge_method'),'S256');
 const exchange:typeof fetch=async()=>new Response(JSON.stringify({access_token:'test-secret',token_type:'bearer',expires_in:3600}));
 const state=url.searchParams.get('state')!;await store.finish(p,state,'test-code',exchange);
 assert.equal(store.connected('alice',p.id),true);assert.equal(store.connected('bob',p.id),false);
 assert.equal(store.request('alice',id).status,'ready_to_plan');
 await assert.rejects(store.finish(p,state,'test-code',exchange));
 assert.ok(!JSON.stringify(store.db.prepare('SELECT * FROM connections').all()).includes('test-secret'));
 store.disconnect('alice',p.id);assert.equal(store.connected('alice',p.id),false);
 }finally{store.close();}
});
test('expired and wrong-provider callbacks do not connect',async()=>{
 const store=new ConnectionStore(':memory:',randomBytes(32));try{
 const state=new URL(store.begin('alice',p)).searchParams.get('state')!;
 await assert.rejects(store.finish({...p,id:'doordash'},state,'code'));
 store.db.prepare('UPDATE oauth SET expires=0').run();
 await assert.rejects(store.finish(p,state,'code'));assert.equal(store.connected('alice',p.id),false);
 }finally{store.close();}
});
test('WhatsApp requires international number and escapes message URI characters',()=>{
 assert.throws(()=>whatsappURL('2025550123','hello'));
 assert.equal(whatsappURL('+12025550123','hello & bye'),'whatsapp://send?phone=12025550123&text=hello%20%26%20bye');
 assert.equal(contactRequest('WhatsApp Priya: hello')?.channel,'whatsapp');
 assert.equal(contactRequest('call Priya')?.recipient,'Priya');
 assert.equal(contactRequest('call +12025550123'),undefined);
});
test('provider rejection never connects or resumes a request',async()=>{
 const store=new ConnectionStore(':memory:',randomBytes(32));try{
 const id=store.saveRequest('alice','Order lunch',p.id);
 const state=new URL(store.begin('alice',p)).searchParams.get('state')!;
 await assert.rejects(store.finish(p,state,'code',async()=>new Response('{}',{status:401})));
 assert.equal(store.connected('alice',p.id),false);assert.equal(store.request('alice',id).status,'waiting_connection');
 }finally{store.close();}
});

test('spoken WhatsApp requests preserve recipient and message without executing instructions',async()=>{
 const {approvalAnswer}=await import('./index.ts');
 for(const text of ['WhatsApp Priya that I’m running late','Can you WhatsApp Priya saying I’m running late','Message Priya on WhatsApp to say I’m running late']){
 assert.deepEqual(contactRequest(text),{kind:'message',recipient:'Priya',body:'I’m running late',channel:'whatsapp'});
 }
 assert.equal(contactRequest('WhatsApp Mary Jane that yes, cancel my appointment')?.body,'yes, cancel my appointment');
 assert.equal(approvalAnswer('yes, cancel my appointment'),'unclear');
 assert.equal(approvalAnswer('yes but change the recipient'),'unclear');
 assert.equal(approvalAnswer('Yes!'),'approve');
 assert.equal(approvalAnswer('No.'),'cancel');
 assert.equal(contactRequest('WhatsApp Priya'),undefined);
});
