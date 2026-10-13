import {test} from 'node:test';
import assert from 'node:assert/strict';
import {proposal,pcmEncode,pcmDecode,SessionGeneration} from './index';
test('proposals never accept execution/approval authority from the model',()=>{
 assert.deepEqual(proposal({kind:'message',recipient:'Mom',body:'Arriving soon',channel:'whatsapp',approved:true,execute:true}),{kind:'message',recipient:'Mom',body:'Arriving soon',channel:'whatsapp'});
 assert.throws(()=>proposal({kind:'approve'}));
 assert.throws(()=>proposal({kind:'message',recipient:'Mom'}));
 assert.throws(()=>proposal({kind:'message',recipient:'Mom',body:'Hi',channel:'bank'}));
 assert.throws(()=>proposal({kind:'remember',text:'a'.repeat(4001)}));
 assert.throws(()=>proposal({kind:'call',recipient:'123\n456'}));
});
test('PCM is little endian, clipped, and round trips within quantization',()=>{
 const values=new Float32Array([-2,-1,-.5,0,.5,1,2,NaN]);
 const decoded=pcmDecode(pcmEncode(values));
 [-1,-1,-.5,0,.5,1,1,0].forEach((x,i)=>assert.ok(Math.abs(decoded[i]!-x)<=1/32768));
 assert.equal(pcmEncode(new Float32Array([-1,0])),'AIAAAA==');
 assert.throws(()=>pcmDecode('AA=='));
 assert.throws(()=>pcmDecode('A'.repeat(256004)));
});
test('closed and superseded session callbacks are stale',()=>{
 const gate=new SessionGeneration(),first=gate.begin();assert.equal(gate.current(first),true);
 gate.end();assert.equal(gate.current(first),false);
 const second=gate.begin();assert.equal(gate.current(first),false);assert.equal(gate.current(second),true);
});
