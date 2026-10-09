import * as SecureStore from 'expo-secure-store';
import {Platform} from 'react-native';
import type {PendingRequest,PendingStorage} from '../../../packages/requests/src';
const memory=new Map<string,string>();
const get=(k:string)=>Platform.OS==='web'?Promise.resolve(memory.get(k)??null):SecureStore.getItemAsync(k);
const put=async(k:string,v:string)=>{if(Platform.OS==='web')memory.set(k,v);else await SecureStore.setItemAsync(k,v);};
const remove=async(k:string)=>{if(Platform.OS==='web')memory.delete(k);else await SecureStore.deleteItemAsync(k);};
// Retry identifiers are not credentials. UUID format is required by Postgres.
export const requestId=()=> 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.floor(Math.random()*16);return (c==='x'?r:(r&3)|8).toString(16)});
export function pendingStorage(owner:string):PendingStorage{
 const root=`vdx.pending.${owner}`;
 return {
 async read(){const raw=await get(root);if(!raw)return null;const {id,count}=JSON.parse(raw);if(typeof id!=='string'||!Number.isInteger(count)||count<1||count>300)throw Error('Saved request is unreadable.');let text='';for(let i=0;i<count;i++){const part=await get(`${root}.${id}.${i}`);if(part===null)throw Error('Saved request is incomplete.');text+=part;}const value=JSON.parse(text);if(value.owner!==owner||value.id!==id)throw Error('Saved request belongs to a different account.');return value;},
 async write(value){if(await get(root))throw Error('Resolve your pending save first.');const chars=Array.from(JSON.stringify(value));const count=Math.ceil(chars.length/250);for(let i=0;i<count;i++)await put(`${root}.${value.id}.${i}`,chars.slice(i*250,(i+1)*250).join(''));await put(root,JSON.stringify({id:value.id,count}));},
 async clear(){const raw=await get(root);if(!raw)return;const {id,count}=JSON.parse(raw);await remove(root);for(let i=0;i<count;i++)await remove(`${root}.${id}.${i}`);}
 };
}
