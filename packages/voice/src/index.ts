import { fromByteArray, toByteArray } from 'base64-js';
export type VoiceProposal = { kind:'call'|'message'|'remember'|'recall'|'unavailable'; recipient?:string; body?:string; channel?:'sms'|'whatsapp'; text?:string };
export function proposal(value:unknown):VoiceProposal {
 if(!value||typeof value!=='object')throw Error('Invalid task proposal.');
 const v=value as Record<string,unknown>;
 if(!['call','message','remember','recall','unavailable'].includes(String(v.kind)))throw Error('Unsupported task.');
 const out:VoiceProposal={kind:v.kind as VoiceProposal['kind']};
 for(const key of ['recipient','body','text'] as const){if(v[key]!==undefined){if(typeof v[key]!=='string'||!v[key].trim()||v[key].length>4000||/[\u0000-\u001f\u007f]/.test(v[key]))throw Error('Invalid task detail.');out[key]=v[key].trim();}}
 if(v.channel!==undefined){if(v.channel!=='sms'&&v.channel!=='whatsapp')throw Error('Unsupported channel.');out.channel=v.channel;}
 if((out.kind==='call'||out.kind==='message')&&!out.recipient)throw Error('Ask who the recipient is.');
 if(out.kind==='message'&&(!out.body||!out.channel))throw Error('Ask for the message and channel.');
 if(['remember','recall','unavailable'].includes(out.kind)&&!out.text)throw Error('Ask for the missing details.');
 return out;
}
export function pcmEncode(samples:Float32Array):string {
 const bytes=new Uint8Array(samples.length*2),view=new DataView(bytes.buffer);
 samples.forEach((x,i)=>{const n=Number.isFinite(x)?Math.max(-1,Math.min(1,x)):0;view.setInt16(i*2,Math.round(n*(n<0?32768:32767)),true)});
 return fromByteArray(bytes);
}
export function pcmDecode(encoded:string):Float32Array {
 if(encoded.length>256000)throw Error('Audio chunk too large.');
 const bytes=toByteArray(encoded);if(bytes.length%2)throw Error('Invalid PCM audio.');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),samples=new Float32Array(bytes.length/2);
 for(let i=0;i<samples.length;i++)samples[i]=view.getInt16(i*2,true)/32768;
 return samples;
}
// Generation guards invalidate callbacks from a closed or superseded session.
export class SessionGeneration {
 private generation=0;
 begin(){return ++this.generation;}
 end(){++this.generation;}
 current(id:number){return id===this.generation;}
}
