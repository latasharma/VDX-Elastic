export type PendingRequest={id:string;owner:string;text:string;provider:string};
export interface PendingStorage {read():Promise<PendingRequest|null>;write(value:PendingRequest):Promise<void>;clear():Promise<void>}
export async function savePending(owner:string,storage:PendingStorage,send:(request:PendingRequest)=>Promise<void>){
 const pending=await storage.read();
 if(!pending)return;
 if(pending.owner!==owner)throw Error('Sign in to the account that saved this request.');
 // Keep the exact retry identity until the server acknowledges the save.
 await send(pending);
 await storage.clear();
}
