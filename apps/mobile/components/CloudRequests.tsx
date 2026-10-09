import React,{useEffect,useRef,useState} from 'react';
import {AppState,Pressable,Text,TextInput,View} from 'react-native';
import {supabase} from '../lib/supabase';
import {pendingStorage,requestId} from '../lib/pendingRequests';
import {savePending,type PendingRequest} from '../../../packages/requests/src';
type Row={id:string;request_text:string;provider:string;status:string};
export function CloudRequests({userId}:{userId:string}){
 const [rows,setRows]=useState<Row[]>([]),[text,setText]=useState(''),[provider,setProvider]=useState('uber-eats'),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const lock=useRef(false),generation=useRef(0);
 const storage=React.useMemo(()=>pendingStorage(userId),[userId]);
 const [pending,setPending]=useState<PendingRequest|null>(null),[restoring,setRestoring]=useState(true);
 const [history,setHistory]=useState<Record<string,string[]>>({});
 async function cancelRequest(id:string){
 if(!supabase||lock.current)return;lock.current=true;setBusy(true);
 try{const {error}=await supabase.rpc('vdx_cancel_request',{p_request_id:id});if(error)throw error;setMessage('Request cancelled. Nothing has been ordered.');setHistory({});await load();}
 catch{setMessage('Could not confirm cancellation. Refresh before trying again.');}finally{lock.current=false;setBusy(false);}
 }
 async function showHistory(id:string){
 if(!supabase)return;const n=generation.current;
 const {data,error}=await supabase.from('vdx_request_events').select('status,created_at').eq('request_id',id).order('id');
 if(n!==generation.current)return;
 if(error){setMessage('Could not load request history.');return;}
 setHistory(h=>({...h,[id]:(data??[]).map(e=>`${e.status.replaceAll('_',' ')} · ${new Date(e.created_at).toLocaleString()}`)}));
 }
 async function load(){
 if(!supabase)return;const n=++generation.current;
 const {data,error}=await supabase.from('vdx_requests').select('id,request_text,provider,status').eq('user_id',userId).order('created_at',{ascending:false}).limit(20);
 if(n!==generation.current)return;
 if(error){setMessage('Could not load requests. Please try again.');return;}
 setRows((data??[]) as Row[]);
 }
 useEffect(()=>{let active=true;void storage.read().then(p=>{if(active){setPending(p);if(p){setText(p.text);setProvider(p.provider);setMessage('An unfinished save was restored. Retry safely to check its status.');}setRestoring(false);}}).catch(()=>{if(active)setMessage('Could not restore your pending request. Reopen your account to try again.');});void load().catch(()=>setMessage('Could not reach your requests.'));const listener=AppState.addEventListener('change',state=>{if(state==='active')void load().catch(()=>setMessage('Could not refresh requests.'));});return()=>{active=false;generation.current++;listener.remove();};},[userId,storage]);
 async function save(){
 if(!supabase||lock.current||!text.trim())return;lock.current=true;setBusy(true);setMessage('');
 try{
 const {data,error:authError}=await supabase.auth.getUser();if(authError||data.user?.id!==userId)throw Error('Please sign in again.');
 if(!pending){const value={id:requestId(),owner:userId,text:text.trim(),provider};await storage.write(value);setPending(value);}
 await savePending(userId,storage,async value=>{const {data:current,error:sessionError}=await supabase!.auth.getUser();if(sessionError||current.user?.id!==userId)throw Error('Please sign in again.');const {error}=await supabase!.rpc('vdx_save_request',{p_client_request_id:value.id,p_text:value.text,p_provider:value.provider});if(error)throw Error('Save not confirmed. Your request is kept on this device. Retry safely when connected.');});
 setPending(null);
 setText('');setMessage('Saved for later. Nothing has been ordered.');await load();
 }catch(e){setMessage(e instanceof Error?e.message:'Could not confirm the save. Refresh before retrying.');}finally{lock.current=false;setBusy(false);}
 }
 return <View style={{gap:12,marginTop:18}}><Text style={{color:'#F5F1FA',fontSize:22,fontWeight:'600'}}>Saved cloud requests</Text>
 <Text style={{color:'#D8CDE8',fontSize:16,lineHeight:24}}>Save a request to your VDX account. Ordering connections are not available yet; saved requests will not execute automatically.</Text>
 <TextInput accessibilityLabel="Request to save to your account" value={text} onChangeText={setText} editable={!busy&&!pending&&!restoring} maxLength={10000} placeholder="What would you like to do later?" placeholderTextColor="#B8ADC9" style={{color:'white',borderColor:'#785B99',borderWidth:1,borderRadius:14,padding:14,fontSize:18}}/>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{[['uber-eats','Uber Eats'],['doordash','DoorDash']].map(([id,label])=><Pressable key={id} accessibilityRole="radio" accessibilityState={{checked:provider===id}} disabled={busy||!!pending||restoring} onPress={()=>setProvider(id!)} style={{padding:14,borderRadius:16,backgroundColor:provider===id?'#5B2A9E':'#21142F'}}><Text style={{color:'white',fontSize:17}}>{label}</Text></Pressable>)}</View>
 <Pressable accessibilityRole="button" disabled={busy||restoring||!text.trim()} onPress={()=>void save()} style={{padding:16,backgroundColor:'#5B2A9E',borderRadius:18,opacity:busy||!text.trim()?.5:1}}><Text style={{color:'white',fontSize:18}}>{busy?'Saving…':restoring?'Restoring…':pending?'Retry saved request':'Save to my account'}</Text></Pressable>
 <Pressable accessibilityRole="button" disabled={busy} onPress={()=>void load().catch(()=>setMessage('Could not refresh requests.'))} style={{padding:12}}><Text style={{color:'#D8CDE8',fontSize:18}}>Refresh requests</Text></Pressable>
 {!!message&&<Text accessibilityLiveRegion="polite" style={{color:'#D8CDE8',fontSize:16}}>{message}</Text>}
 {rows.map(row=><View key={row.id} style={{padding:14,backgroundColor:'#21142F',borderRadius:14}}><Text style={{color:'white',fontSize:18}}>{row.request_text}</Text><Text style={{color:'#B8ADC9',fontSize:16,marginTop:8}}>{row.provider==='uber-eats'?'Uber Eats':'DoorDash'} · {row.status==='waiting_connection'?'Waiting for connection':row.status==='ready_to_plan'?'Ready to review':'Cancelled'}</Text><Pressable accessibilityRole="button" disabled={busy} onPress={()=>void showHistory(row.id).catch(()=>setMessage('Could not load history.'))} style={{paddingVertical:12}}><Text style={{color:'#D8CDE8',fontSize:17}}>View history</Text></Pressable>{history[row.id]?.map((event,i)=><Text key={i} style={{color:'#D8CDE8',fontSize:16}}>{event}</Text>)}{row.status!=='cancelled'&&<Pressable accessibilityRole="button" disabled={busy} onPress={()=>void cancelRequest(row.id)} style={{paddingVertical:12}}><Text style={{color:'#FFD66B',fontSize:17}}>Cancel saved request</Text></Pressable>}</View>)}
 </View>;
}
