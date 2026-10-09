import {test} from 'node:test';import assert from 'node:assert/strict';
import {savePending,type PendingRequest} from './index';
test('lost acknowledgement and restart preserve retry identity; success clears pending state',async()=>{
 let pending:PendingRequest|null={id:'same-key',owner:'a',text:'Dinner',provider:'uber-eats'};
 const storage={read:async()=>pending,write:async(p:PendingRequest)=>{pending=p},clear:async()=>{pending=null}};
 const received=new Set<string>();
 await assert.rejects(savePending('a',storage,async p=>{received.add(p.id);throw Error('lost response')}));
 assert.ok(pending);await savePending('a',storage,async p=>{received.add(p.id)});
 assert.equal(received.size,1);assert.equal(pending,null);
});
test('another account cannot submit pending text',async()=>{
 let sent=false;await assert.rejects(savePending('b',{read:async()=>({id:'key',owner:'a',text:'Private',provider:'uber-eats'}),write:async()=>{},clear:async()=>{}},async()=>{sent=true}));assert.equal(sent,false);
});
