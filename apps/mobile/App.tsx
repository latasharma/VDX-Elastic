import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Alert, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SMS from 'expo-sms';
import { ExpoSpeechRecognitionModule as Speech, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { parseRequest, RequestIntent } from '../../packages/intent/src';
import { executeApproved } from '../../packages/actions/src';

type Memory = { id:string; text:string; createdAt:string };
type Step = { title:string; state:'waiting'|'running'|'done'|'blocked'|'failed'|'cancelled'|'unverified'; detail:string };
type Run = { intent:RequestIntent; steps:Step[]; receipt:string; status:'approval'|'running'|'done'|'failed'|'cancelled'|'unverified' };
const KEY='vdx.memory.v1';
const colors={ink:'#191322',purple:'#713BFF',muted:'#70677D',lime:'#E6FF8A'};
const errorMessage=(e:unknown)=>e instanceof Error?e.message:'Something went wrong. Please try again.';
function Button({title,onPress,disabled=false,secondary=false}:{title:string;onPress:()=>void;disabled?:boolean;secondary?:boolean}) {
 return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[s.button,secondary&&s.secondary,(disabled||pressed)&&{opacity:.5}]}><Text style={[s.buttonText,secondary&&{color:colors.purple}]}>{title}</Text></Pressable>;
}
export default function App(){return <SafeAreaProvider><Workspace/></SafeAreaProvider>}
function Workspace(){
 const [screen,setScreen]=useState<'home'|'run'|'memory'>('home');
 const [input,setInput]=useState(''); const [error,setError]=useState('');
 const [memories,setMemories]=useState<Memory[]>([]); const [loaded,setLoaded]=useState(false);
 const [run,setRun]=useState<Run|null>(null); const [selected,setSelected]=useState(0);
 const [stepsView,setStepsView]=useState(false); const [listening,setListening]=useState(false);
 const [voicePending,setVoicePending]=useState(false); const voiceLock=useRef(false);
 const [busy,setBusy]=useState(false); const lock=useRef(false); const inputRef=useRef<TextInput>(null);
 useSpeechRecognitionEvent('start',()=>{setListening(true);setVoicePending(false)});
 useSpeechRecognitionEvent('end',()=>{setListening(false);setVoicePending(false);voiceLock.current=false});
 useSpeechRecognitionEvent('result',e=>{if(e.results[0])setInput(e.results[0].transcript)});
 useSpeechRecognitionEvent('error',e=>{setListening(false);setVoicePending(false);voiceLock.current=false;setError(`Voice: ${e.message || e.error}. You can type your request instead.`)});
 useEffect(()=>{void (async()=>{try{const raw=await AsyncStorage.getItem(KEY); const data:unknown=raw?JSON.parse(raw):[];
 if(!Array.isArray(data)||!data.every(m=>m&&typeof m.id==='string'&&typeof m.text==='string'&&typeof m.createdAt==='string'))throw Error('Saved memory could not be read. Existing data has not been overwritten.');
 setMemories(data);setLoaded(true);}catch(e){setError(errorMessage(e))}})();
 const subscription=AppState.addEventListener('change',state=>{if(state!=='active')Speech.abort()});
 return ()=>{subscription.remove();Speech.abort()};},[]);
 useEffect(()=>{if(screen!=='home'){Speech.abort();setListening(false);setVoicePending(false);voiceLock.current=false}},[screen]);
 const updateStep=(i:number,state:Step['state'],detail:string)=>setRun(r=>r?{...r,steps:r.steps.map((n,j)=>j===i?{...n,state,detail}:n)}:r);
 const complete=(receipt:string)=>{updateStep(2,'done',receipt);setRun(r=>r?{...r,status:'done',receipt}:r);AccessibilityInfo.announceForAccessibility(receipt)};
 async function submit(){
 if(lock.current||listening||voiceLock.current)return;
 setError('');let intent:RequestIntent;try{intent=parseRequest(input)}catch(e){setError(errorMessage(e));return}
 if(!loaded){setError('Memory storage is not ready. Restart the app and try again.');return}
 lock.current=true;setBusy(true);setScreen('run');setSelected(0);
 const effect=intent.kind==='call'||intent.kind==='message';
 const action=intent.kind==='remember'?'Save memory':intent.kind==='recall'?'Search memory':intent.kind==='call'?'Open phone app':'Open message composer';
 setRun({intent,status:effect?'approval':'running',receipt:'',steps:[{title:'Understand request',state:'done',detail:`Recognized ${intent.kind} request locally.`},{title:effect?'Your approval':'Local storage',state:effect?'blocked':'running',detail:effect?'Review the recipient and action before continuing.':'Working with memories on this device.'},{title:action,state:'waiting',detail:'Not started.'}]});
 try{
 if(effect)return;
 if(intent.kind==='remember'){
 const next=[{id:`${Date.now()}-${Math.random().toString(36).slice(2)}`,text:intent.text,createdAt:new Date().toISOString()},...memories];
 await AsyncStorage.setItem(KEY,JSON.stringify(next));setMemories(next);updateStep(1,'done','Storage confirmed the write.');complete('Saved on this device. Your memory will remain after restarting the app.');
 }else if(intent.kind==='recall'){
 const matches=memories.filter(m=>m.text.toLocaleLowerCase().includes(intent.query.toLocaleLowerCase()));updateStep(1,'done',`Searched ${memories.length} saved memories.`);complete(matches.length?matches.map(m=>m.text).join('\n\n'):'No matching memories. Try another keyword.');
 }
 }catch(e){updateStep(1,'failed',errorMessage(e));updateStep(2,'cancelled','Storage failed; no result was recorded.');setRun(r=>r?{...r,status:'failed',receipt:errorMessage(e)}:r)}finally{lock.current=false;setBusy(false)}
 }
 async function approve(){
 if(lock.current||!run||run.status!=='approval')return;
 lock.current=true;setBusy(true);const intent=run.intent;
 setRun(r=>r?{...r,status:'running'}:r);updateStep(1,'done','You explicitly approved this action.');updateStep(2,'running','Waiting for the system interface.');
 let composerOutcome: 'sent'|'cancelled'|'unknown' = 'sent';
 try{const receipt=await executeApproved(intent,true,{
 openPhone:async phone=>{if(Platform.OS==='web')throw Error('Use the native iOS or Android app for phone actions.');await Linking.openURL(`tel:${phone}`)},
 composeMessage:async(phone,body)=>{if(!await SMS.isAvailableAsync())throw Error('Messaging is unavailable on this device. Try a physical phone with messaging configured.');const result=await SMS.sendSMSAsync([phone],body);composerOutcome=result.result;return result.result;}
 });complete(receipt);if(intent.kind==='message' && (composerOutcome as string)!=='sent'){const state=(composerOutcome as string)==='cancelled'?'cancelled':'unverified';updateStep(2,state,receipt);setRun(r=>r?{...r,status:state}:r)}}catch(e){updateStep(2,'failed',errorMessage(e));setRun(r=>r?{...r,status:'failed',receipt:errorMessage(e)}:r)}finally{lock.current=false;setBusy(false)}
 }
 function cancel(){if(lock.current)return;setRun(r=>r?{...r,status:'cancelled',receipt:'Cancelled before handing anything to the phone.',steps:r.steps.map(n=>n.state==='done'?n:{...n,state:'cancelled',detail:'Cancelled by you.'})}:r)}
 async function voice(){
 if(listening){Speech.stop();return}if(voiceLock.current)return;
 voiceLock.current=true;setVoicePending(true);
 try{if(!Speech.isRecognitionAvailable())throw Error('Speech recognition is unavailable');const permission=await Speech.requestPermissionsAsync();if(!permission.granted)throw Error('Microphone or speech permission was denied');setError('');Speech.start({lang:'en-US',interimResults:true,continuous:false})}catch(e){voiceLock.current=false;setVoicePending(false);setError(`${errorMessage(e)}. You can still type below.`)}
 }
 async function removeMemory(id:string){if(lock.current)return;lock.current=true;setBusy(true);try{const next=memories.filter(m=>m.id!==id);await AsyncStorage.setItem(KEY,JSON.stringify(next));setMemories(next)}catch(e){setError(errorMessage(e))}finally{lock.current=false;setBusy(false)}}
 const blocked=busy||run?.status==='approval';
 return <SafeAreaView style={s.safe}><StatusBar style="dark"/><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
 <View style={s.header}><Text style={s.brand}>elastic<Text style={{color:colors.purple}}> / VDX</Text></Text><Text style={s.badge}>EARLY ACCESS · 0.2</Text></View>
 {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
 {screen==='home'&&<><Text accessibilityRole="header" style={s.hero}>Make room{ '\n'}for more.</Text><Text style={s.body}>Ask. Review. See what happened.</Text>
 <View style={s.quick}>{['Call','Message','Remember'].map((title,i)=><Pressable key={title} accessibilityRole="button" disabled={!!blocked} onPress={()=>{setInput(['call ','message ','remember '][i]);inputRef.current?.focus()}} style={[s.tile,{backgroundColor:['#DDC9FF',colors.lime,'#EEE6FF'][i]}]}><Text style={s.tileTitle}>{title}</Text></Pressable>)}</View>
 <Text style={s.heading}>What would you like to do?</Text>
 <TextInput ref={inputRef} accessibilityLabel="Your request" value={input} onChangeText={setInput} editable={!blocked&&!listening&&!voicePending} placeholder="remember I parked on level 2" placeholderTextColor={colors.muted} style={s.input} maxLength={10000} autoCorrect={false}/>
 <Button title={voicePending?'Starting microphone…':listening?'Stop listening':'Tap to speak'} onPress={()=>void voice()} disabled={!!blocked||voicePending} secondary/>
 <Text style={s.small}>Speech uses your device’s recognition service and may be processed online. Review the transcript before continuing. English (US).</Text>
 <Button title="Review request →" onPress={()=>void submit()} disabled={!!blocked||listening||voicePending||!input.trim()||!loaded}/>
 <View style={s.card}><Text style={s.heading}>Try these requests</Text>{['remember I parked on level 2','find memory parked','call +1 (202) 555-0123','message +1 (202) 555-0123: I am on my way'].map(example=><Pressable key={example} accessibilityRole="button" disabled={!!blocked} onPress={()=>setInput(example)} style={s.example}><Text style={s.body}>{example}</Text></Pressable>)}<Text style={s.small}>Example phone numbers are placeholders. Replace them with a real number you intend to contact. Contact names are not supported yet.</Text></View>
 </>}
 {screen==='run'&&(!run?<Text style={s.body}>Start a request from Home to see its node tree.</Text>:<><Text accessibilityRole="header" style={s.heading}>Your run</Text><Text style={s.body}>{run.intent.kind.toUpperCase()}</Text><Text accessibilityLiveRegion="polite" style={s.badge}>{run.status==='approval'?'Waiting for approval':run.status}</Text><Button title={stepsView?'Show node tree':'Show accessible steps'} secondary onPress={()=>setStepsView(!stepsView)}/>
 <View style={{marginVertical:20}}>{run.steps.map((step,i)=><View key={i}><Pressable accessibilityRole="button" accessibilityLabel={`${i+1}. ${step.title}. ${step.state}. ${step.detail}`} accessibilityState={{selected:selected===i}} onPress={()=>setSelected(i)} style={[s.node,{backgroundColor:step.state==='done'?colors.lime:step.state==='blocked'?'#FFE5A3':'#F0EBF7'},selected===i&&{borderColor:colors.purple}]}><Text style={s.tileTitle}>{step.state==='done'?'✓':step.state==='failed'?'!':`${i+1}`}</Text><View style={{flex:1}}><Text style={s.tileTitle}>{step.title}</Text><Text style={s.small}>{step.state}</Text></View></Pressable>{i<run.steps.length-1&&!stepsView&&<Text accessible={false} style={s.edge}>│{ '\n'}▼</Text>}{stepsView&&<View style={{height:12}}/>}</View>)}</View>
 <View style={s.card}><Text style={s.heading}>{run.steps[selected]?.title}</Text><Text selectable style={s.body}>{run.steps[selected]?.detail}</Text></View>
 {!!run.receipt&&<View style={s.card}><Text style={s.heading}>Result & evidence</Text><Text selectable style={s.body}>{run.receipt}</Text></View>}
 {run.status!=='running'&&run.status!=='approval'&&<Button title="New request" onPress={()=>setScreen('home')}/>}
 </>)}
 {screen==='memory'&&<><Text accessibilityRole="header" style={s.hero}>Your memory.</Text><Text style={s.body}>Saved only on this device. No cloud sync. These notes use ordinary app storage; do not store passwords or secrets.</Text>{loaded&&!memories.length&&<Text style={s.body}>No memories yet. Try “remember I parked on level 2”.</Text>}{memories.map(m=><View key={m.id} style={s.card}><Text selectable style={s.body}>{m.text}</Text><Text style={s.small}>{new Date(m.createdAt).toLocaleString()}</Text><Button title="Delete memory" secondary disabled={!!blocked} onPress={()=>Alert.alert('Delete this memory?','This cannot be undone.',[{text:'Keep',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>void removeMemory(m.id)}])}/></View>)}</>}
 </ScrollView><View style={s.nav}>{(['home','run','memory'] as const).map(tab=><Pressable key={tab} accessibilityRole="tab" accessibilityState={{selected:screen===tab}} onPress={()=>setScreen(tab)} style={[s.navItem,screen===tab&&{backgroundColor:'#EEE6FF'}]}><Text style={{color:colors.purple,fontWeight:'700'}}>{tab==='run'?'Your run':tab==='home'?'Home':'Memory'}</Text></Pressable>)}</View>
 <Modal visible={run?.status==='approval'} transparent animationType="slide" onRequestClose={cancel} onShow={()=>AccessibilityInfo.announceForAccessibility('Review the recipient and action. Approval is required.')}><SafeAreaView style={s.backdrop}><ScrollView contentContainerStyle={s.modal} accessibilityViewIsModal><View style={s.sheet}><Text accessibilityRole="header" style={s.heading}>You are in control.</Text><Text selectable style={s.body}>{run?.intent.kind==='call'?`Open the phone interface for ${run.intent.phone}? The operating system may show a call confirmation.`:run?.intent.kind==='message'?`Prepare a message to ${run.intent.phone}:\n\n${run.intent.body}`:''}</Text><Text style={s.small}>This is a real device handoff. Call connection and message delivery cannot be verified by Elastic.</Text><Button title="Approve and continue" onPress={()=>void approve()} disabled={busy}/><Button title="Cancel request" secondary onPress={cancel} disabled={busy}/></View></ScrollView></SafeAreaView></Modal>
 </SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:'#FCFAFF'},page:{padding:22,paddingBottom:36,width:'100%',maxWidth:680,alignSelf:'center'},header:{gap:12,marginBottom:22},brand:{fontSize:25,fontWeight:'800',color:colors.ink},badge:{color:colors.purple,fontWeight:'700',fontSize:12},hero:{fontSize:46,lineHeight:50,fontWeight:'800',letterSpacing:-1.8,color:colors.ink,marginVertical:18},body:{fontSize:16,lineHeight:24,color:colors.ink,marginVertical:8},small:{fontSize:13,lineHeight:20,color:colors.muted,marginVertical:6},heading:{fontSize:23,fontWeight:'700',color:colors.ink,marginBottom:6},quick:{flexDirection:'row',gap:8,marginVertical:24},tile:{flex:1,padding:14,minHeight:82,borderRadius:22,justifyContent:'center'},tileTitle:{fontSize:16,fontWeight:'700',color:colors.ink},input:{borderWidth:1,borderColor:'#BCAADE',borderRadius:20,padding:18,minHeight:60,fontSize:17,color:colors.ink,backgroundColor:'white'},button:{backgroundColor:colors.purple,padding:16,minHeight:52,borderRadius:26,alignItems:'center',marginVertical:8},secondary:{backgroundColor:'#EEE6FF'},buttonText:{fontSize:16,fontWeight:'700',color:'white'},card:{backgroundColor:'white',padding:18,borderRadius:22,marginTop:20,borderWidth:1,borderColor:'#EAE4F2'},example:{paddingVertical:8,borderBottomWidth:1,borderColor:'#EAE4F2'},node:{borderWidth:2,borderColor:'transparent',borderRadius:24,padding:18,flexDirection:'row',gap:14,alignItems:'center'},edge:{textAlign:'center',color:colors.purple,fontSize:17,lineHeight:16},error:{padding:16,color:'#8C251D',backgroundColor:'#FFE9E3',borderRadius:16,marginBottom:12},nav:{flexDirection:'row',padding:12,gap:6,borderTopWidth:1,borderColor:'#EAE4F2'},navItem:{flex:1,padding:14,minHeight:48,borderRadius:24,alignItems:'center'},backdrop:{flex:1,backgroundColor:'rgba(25,19,34,.55)'},modal:{flexGrow:1,justifyContent:'flex-end',padding:18},sheet:{padding:24,backgroundColor:'#FCFAFF',borderRadius:28}});
