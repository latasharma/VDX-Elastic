import { Account } from './components/Account';
import * as Contacts from 'expo-contacts/legacy';
import {contactRequest,whatsappURL,approvalAnswer,type ContactRequest} from '../../packages/connections/src';
import { VoiceCloud } from './components/VoiceCloud';
import { useFonts } from 'expo-font';
import { Syne_700Bold } from '@expo-google-fonts/syne';
import { Newsreader_400Regular_Italic } from '@expo-google-fonts/newsreader';
import { DMMono_400Regular } from '@expo-google-fonts/dm-mono';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Alert, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Talk from 'expo-speech';
import * as SMS from 'expo-sms';
import { ExpoSpeechRecognitionModule as Speech, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { parseRequest, RequestIntent } from '../../packages/intent/src';
import { executeApproved } from '../../packages/actions/src';
import { CapabilityRegistry, TaskRun } from '../../packages/runtime/src';

type Memory = { id:string; text:string; createdAt:string };
type Step = { title:string; state:'waiting'|'running'|'done'|'blocked'|'failed'|'cancelled'|'unverified'; detail:string };
type Run = { recipientName?:string; channel?:'sms'|'whatsapp'; intent:RequestIntent; steps:Step[]; receipt:string; status:'approval'|'running'|'done'|'failed'|'cancelled'|'unverified' };
const KEY='vdx.memory.v1';
const colors={ink:'#F5F1FA',purple:'#B99AFF',muted:'#B8ADC9',lime:'#34234B'};
const errorMessage=(e:unknown)=>e instanceof Error?e.message:'Something went wrong. Please try again.';
function Button({title,onPress,disabled=false,secondary=false}:{title:string;onPress:()=>void;disabled?:boolean;secondary?:boolean}) {
 return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[s.button,secondary&&s.secondary,(disabled||pressed)&&{opacity:.5}]}><Text style={[s.buttonText,secondary&&{color:colors.purple}]}>{title}</Text></Pressable>;
}
export default function App(){const [fontsLoaded,fontError]=useFonts({Syne_700Bold,Newsreader_400Regular_Italic,DMMono_400Regular});if(!fontsLoaded&&!fontError)return <View style={{flex:1,backgroundColor:'#0A0712'}}/>;return <SafeAreaProvider><Workspace/></SafeAreaProvider>}
function Workspace(){
 const [contactTask,setContactTask]=useState<ContactRequest|null>(null);
 const [contactOptions,setContactOptions]=useState<{name:string;number:string}[]>([]);
 const [picking,setPicking]=useState(false);
 async function pickContact(){
 if(picking)return;setPicking(true);
 try{if(Platform.OS==='web')throw Error('Open VDX on your iPhone or Android phone to choose a contact.');
 if(Platform.OS==='android'){const permission=await Contacts.requestPermissionsAsync();if(!permission.granted){setConnection({title:'Allow contact access',message:'Enable Contacts for VDX in Settings, then return to choose your recipient.',settings:true});return;}}
 const person=await Contacts.presentContactPickerAsync();if(!person)return;
 const options=(person.phoneNumbers??[]).filter(p=>p.number).map(p=>({name:person.name||'Selected contact',number:p.number!}));
 if(!options.length)throw Error('This contact has no phone number. Choose another contact.');setContactOptions(options);
 }catch(e){setError(errorMessage(e));}finally{setPicking(false)}
 }
 async function resumeContact(number:string,name:string){
 const task=contactTask;if(!task)return;
 const normalized=number.replace(/[ ()-]/g,'');
 if(task.channel==='whatsapp'){try{whatsappURL(normalized,task.body||'')}catch(e){setError(errorMessage(e));return;}}
 setContactTask(null);setContactOptions([]);
 await submit(task.kind==='call'?`call ${number}`:`message ${number}: ${task.body}`,task.channel,name);
 }

 const [connection,setConnection]=useState<{title:string;message:string;settings?:boolean;unavailable?:boolean}|null>(null);
 const [typing,setTyping]=useState(false);
 const [talkBack,setTalkBack]=useState(true);
 const pendingTranscript=useRef('');
 const finalApprovalTranscript=useRef('');
 const acceptingSpeech=useRef(false);
 const approvalListening=useRef<string|null>(null);
 function stopVoice(){acceptingSpeech.current=false;approvalListening.current=null;pendingTranscript.current='';finalApprovalTranscript.current='';try{Speech.abort()}catch{}void Talk.stop().catch(()=>{});}
 function reply(text:string){if(talkBack){void Talk.stop().then(()=>Talk.speak(text.slice(0,3000),{language:'en-US',useApplicationAudioSession:false})).catch(()=>{});}}
 function connectionNeeded(text:string){
 const food=/\b(pizza|food|meal|restaurant|ubereats|uber eats|doordash)\b/i.test(text);
 const contacts=!/whatsapp/i.test(text)&&/\b(call|message|text)\b/i.test(text)&&!/[0-9]{3}/.test(text);
 const title=food?'Food ordering needs a connection':/whatsapp/i.test(text)?'WhatsApp is not connected':contacts?'Contacts are not connected':'A connected service is needed';
 const message=food?'To prepare your order, I need a food-ordering service. This integration is not available yet. Nothing has been ordered.':contacts?'Finding someone by name needs access to your contacts. Contact lookup is not available in this build yet. You can use a phone number instead.':'I cannot complete this request with the services available in this build. No action has been taken.';
 setConnection({title,message,unavailable:true});reply(message);
 }
 const taskRun=useRef<TaskRun|null>(null);
 const [screen,setScreen]=useState<'home'|'run'|'memory'>('home');
 const [input,setInput]=useState(''); const [error,setError]=useState('');
 const [memories,setMemories]=useState<Memory[]>([]); const [loaded,setLoaded]=useState(false);
 const [run,setRun]=useState<Run|null>(null); const [selected,setSelected]=useState(0);
 const [stepsView,setStepsView]=useState(false); const [listening,setListening]=useState(false);
 const [voicePending,setVoicePending]=useState(false); const voiceLock=useRef(false);
 const [busy,setBusy]=useState(false); const lock=useRef(false); const inputRef=useRef<TextInput>(null);
 useSpeechRecognitionEvent('start',()=>{setListening(true);setVoicePending(false)});
 useSpeechRecognitionEvent('end',()=>{const accepted=acceptingSpeech.current;acceptingSpeech.current=false;setListening(false);setVoicePending(false);voiceLock.current=false;const text=pendingTranscript.current;pendingTranscript.current='';const approvalId=approvalListening.current;approvalListening.current=null;if(!accepted)return;if(approvalId){if(taskRun.current?.snapshot().plan.id!==approvalId||run?.status!=='approval')return;const answer=approvalAnswer(finalApprovalTranscript.current);finalApprovalTranscript.current='';if(answer==='approve')void approve();else if(answer==='cancel')cancel();else reply('Please say yes to continue, or no to cancel.');}else if(text)void submit(text);});
 useSpeechRecognitionEvent('result',e=>{if(!acceptingSpeech.current)return;if(e.results[0]){setInput(e.results[0].transcript);pendingTranscript.current=e.results[0].transcript;if(approvalListening.current&&e.isFinal)finalApprovalTranscript.current=e.results[0].transcript;}});
 useSpeechRecognitionEvent('error',e=>{acceptingSpeech.current=false;approvalListening.current=null;pendingTranscript.current='';setListening(false);setVoicePending(false);voiceLock.current=false;setError(`Voice: ${e.message || e.error}. You can type your request instead.`)});
 useEffect(()=>{void (async()=>{try{const raw=await AsyncStorage.getItem(KEY); const data:unknown=raw?JSON.parse(raw):[];
 if(!Array.isArray(data)||!data.every(m=>m&&typeof m.id==='string'&&typeof m.text==='string'&&typeof m.createdAt==='string'))throw Error('Saved memory could not be read. Existing data has not been overwritten.');
 setMemories(data);setLoaded(true);}catch(e){setError(errorMessage(e))}})();
 const subscription=AppState.addEventListener('change',state=>{if(state!=='active')stopVoice()});
 return ()=>{subscription.remove();pendingTranscript.current='';Speech.abort();void Talk.stop()};},[]);
 useEffect(()=>{if(screen!=='home'){Speech.abort();setListening(false);setVoicePending(false);voiceLock.current=false}},[screen]);
 const updateStep=(i:number,state:Step['state'],detail:string)=>setRun(r=>r?{...r,steps:r.steps.map((n,j)=>j===i?{...n,state,detail}:n)}:r);
 const complete=(receipt:string)=>{updateStep(2,'done',receipt);setRun(r=>r?{...r,status:'done',receipt}:r);reply(receipt)};
 async function submit(spoken?:string,channel:'sms'|'whatsapp'='sms',recipientName?:string){
 if(lock.current||run?.status==='approval'||(!spoken&&listening)||voiceLock.current)return;
 const request=spoken??input;
 const contact=contactRequest(request);
 if(contact){setError('');setContactTask(contact);setContactOptions([]);reply(`Choose the contact for ${contact.recipient}. I will show the recipient and action before continuing.`);return;}
 setError('');let intent:RequestIntent;try{intent=parseRequest(request)}catch(e){if(/^(remember|find memory)\b/i.test(request)||/^(call|message)\s+\+?[0-9]/i.test(request)){const message=errorMessage(e);setConnection({title:'A little more detail',message});reply(message);}else connectionNeeded(request);return}
 if(!loaded){setError('Memory storage is not ready. Restart the app and try again.');return}
 lock.current=true;setBusy(true);setScreen('run');setSelected(0);
 const effect=intent.kind==='call'||intent.kind==='message';
 taskRun.current=null;
 if(effect){
 const fixedIntent={...intent};
 const fixedChannel=channel;
 const registry=new CapabilityRegistry();
 registry.register({id:`phone.${intent.kind}`,title:intent.kind==='call'?'Open phone':'Compose message',effect:'write',execute:async()=>{
 let outcome:'sent'|'cancelled'|'unknown'='unknown';
 if(fixedChannel==='whatsapp'&&fixedIntent.kind==='message'){const url=whatsappURL(fixedIntent.phone,fixedIntent.body);if(!await Linking.canOpenURL(url))throw Error('WhatsApp is not installed or cannot be opened.');await Linking.openURL(url);return {status:'handoff',detail:'Opened WhatsApp with your message. Tap Send in WhatsApp to send it. Delivery is not verified.'};}
 const detail=await executeApproved(fixedIntent,true,{
 openPhone:async phone=>{if(Platform.OS==='web')throw Error('Use the native app for phone actions.');await Linking.openURL(`tel:${phone}`)},
 composeMessage:async(phone,body)=>{if(!await SMS.isAvailableAsync())throw Error('Messaging unavailable.');const result=await SMS.sendSMSAsync([phone],body);outcome=result.result;return result.result;}
 });
 return {status:(outcome as string)==='cancelled'?'cancelled':fixedIntent.kind==='message'&&(outcome as string)==='unknown'?'unknown':'handoff',detail};
 }});
 taskRun.current=new TaskRun({id:`request-${Date.now()}`,summary:request,nodes:[{id:'action',capability:`phone.${intent.kind}`,input:{...intent},dependsOn:[]}]},registry);
 }

 const action=intent.kind==='remember'?'Save memory':intent.kind==='recall'?'Search memory':intent.kind==='call'?'Open phone app':'Open message composer';
 setRun({intent,channel,recipientName,status:effect?'approval':'running',receipt:'',steps:[{title:'Understand request',state:'done',detail:`Recognized ${intent.kind} request locally.`},{title:effect?'Your approval':'Local storage',state:effect?'blocked':'running',detail:effect?'Review the recipient and action before continuing.':'Working with memories on this device.'},{title:action,state:'waiting',detail:'Not started.'}]});
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
 lock.current=true;stopVoice();setBusy(true);const intent=run.intent;
 setRun(r=>r?{...r,status:'running'}:r);updateStep(1,'done','You explicitly approved this action.');updateStep(2,'running','Waiting for the system interface.');
 try{
 const task=taskRun.current;if(!task)throw Error('No prepared task. Start a new request.');
 task.approve(task.snapshot().plan.id);
 const result=await task.execute();const evidence=result.evidence.at(-1);
 const receipt=evidence?.detail||'No verified outcome.';
 const state=evidence?.state==='cancelled'?'cancelled':evidence?.state==='confirmed'?'done':'unverified';
 updateStep(2,state,receipt);setRun(r=>r?{...r,status:state,receipt}:r);
 reply(receipt);
 }catch(e){updateStep(2,'failed',errorMessage(e));setRun(r=>r?{...r,status:'failed',receipt:errorMessage(e)}:r)}finally{lock.current=false;setBusy(false)}
 }

 function cancel(){if(lock.current)return;stopVoice();taskRun.current?.cancel();setRun(r=>r?{...r,status:'cancelled',receipt:'Cancelled before handing anything to the phone.',steps:r.steps.map(n=>n.state==='done'?n:{...n,state:'cancelled',detail:'Cancelled by you.'})}:r)}
 async function voice(forApproval=false){
 if(listening){Speech.stop();return}if(voiceLock.current)return;
 if(forApproval&&run?.status!=='approval')return;
 approvalListening.current=forApproval?taskRun.current?.snapshot().plan.id??null:null;
 voiceLock.current=true;setVoicePending(true);
 try{await Talk.stop();pendingTranscript.current='';finalApprovalTranscript.current='';if(!Speech.isRecognitionAvailable())throw Error('Speech recognition is unavailable');const permission=await Speech.requestPermissionsAsync();if(!permission.granted){approvalListening.current=null;voiceLock.current=false;setVoicePending(false);const message='Microphone and speech access are needed to hear your request. Enable them for VDX Elastic in Settings, or type instead.';setConnection({title:'Allow voice access',message,settings:true});reply(message);return;}setError('');acceptingSpeech.current=true;Speech.start({lang:'en-US',interimResults:true,continuous:false})}catch(e){acceptingSpeech.current=false;approvalListening.current=null;voiceLock.current=false;setVoicePending(false);setError(`${errorMessage(e)}. You can still type below.`)}
 }
 async function removeMemory(id:string){if(lock.current)return;lock.current=true;setBusy(true);try{const next=memories.filter(m=>m.id!==id);await AsyncStorage.setItem(KEY,JSON.stringify(next));setMemories(next)}catch(e){setError(errorMessage(e))}finally{lock.current=false;setBusy(false)}}
 const blocked=busy||run?.status==='approval';
 return <SafeAreaView style={s.safe}><StatusBar style="light"/><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
 <View style={[s.header,{flexDirection:"row",justifyContent:"space-between",alignItems:"center"}]}><Text style={s.brand}>VDX</Text><Account/></View>
 {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
 {screen==='home'&&<View style={{minHeight:440,justifyContent:'center',alignItems:'center',gap:18}}>
 <Text style={s.statement}>Just say it.</Text>
 <VoiceCloud listening={listening} pending={voicePending} disabled={!!blocked} onPress={()=>void voice()}/>
 {!!input&&<Text selectable style={[s.body,{textAlign:'center'}]}>“{input}”</Text>}
 <Pressable accessibilityRole="button" onPress={()=>setTyping(!typing)}><Text style={s.voiceControl}>{typing?'Hide keyboard entry':'Type instead'}</Text></Pressable>
 {typing&&<View style={{width:'100%'}}><TextInput accessibilityLabel="Your request" value={input} onChangeText={setInput} editable={!blocked&&!listening} placeholder="What would you like to do?" style={s.input}/><Button title="Continue" onPress={()=>void submit()} disabled={!!blocked||listening||voicePending||!input.trim()}/></View>}
 <Pressable accessibilityRole="switch" accessibilityState={{checked:talkBack}} onPress={()=>{setTalkBack(!talkBack);void Talk.stop()}}><Text style={s.voiceControl}>Spoken replies {talkBack?'on':'off'}</Text></Pressable>
 </View>}
 {screen==='run'&&(!run?<Text style={s.body}>Start a request from Home to see its node tree.</Text>:<><Text accessibilityRole="header" style={s.heading}>Your run</Text><Text style={s.body}>{run.intent.kind.toUpperCase()}</Text><Text accessibilityLiveRegion="polite" style={s.badge}>{run.status==='approval'?'Waiting for approval':run.status}</Text><Button title={stepsView?'Show node tree':'Show accessible steps'} secondary onPress={()=>setStepsView(!stepsView)}/>
 <View style={{marginVertical:20}}>{run.steps.map((step,i)=><View key={i}><Pressable accessibilityRole="button" accessibilityLabel={`${i+1}. ${step.title}. ${step.state}. ${step.detail}`} accessibilityState={{selected:selected===i}} onPress={()=>setSelected(i)} style={[s.node,{backgroundColor:step.state==='done'?colors.lime:step.state==='blocked'?'#453317':'#21182E'},selected===i&&{borderColor:colors.purple}]}><Text style={s.tileTitle}>{step.state==='done'?'✓':step.state==='failed'?'!':`${i+1}`}</Text><View style={{flex:1}}><Text style={s.tileTitle}>{step.title}</Text><Text style={s.small}>{step.state}</Text></View></Pressable>{i<run.steps.length-1&&!stepsView&&<Text accessible={false} style={s.edge}>│{ '\n'}▼</Text>}{stepsView&&<View style={{height:12}}/>}</View>)}</View>
 <View style={s.card}><Text style={s.heading}>{run.steps[selected]?.title}</Text><Text selectable style={s.body}>{run.steps[selected]?.detail}</Text></View>
 {!!run.receipt&&<View style={s.card}><Text style={s.heading}>Result & evidence</Text><Text selectable style={s.body}>{run.receipt}</Text></View>}
 {run.status!=='running'&&run.status!=='approval'&&<Button title="New request" onPress={()=>setScreen('home')}/>}
 </>)}
 {screen==='memory'&&<><Text accessibilityRole="header" style={s.hero}>Your memory.</Text><Text style={s.body}>Saved only on this device. No cloud sync. These notes use ordinary app storage; do not store passwords or secrets.</Text>{loaded&&!memories.length&&<Text style={s.body}>No memories yet. Try “remember I parked on level 2”.</Text>}{memories.map(m=><View key={m.id} style={s.card}><Text selectable style={s.body}>{m.text}</Text><Text style={s.small}>{new Date(m.createdAt).toLocaleString()}</Text><Button title="Delete memory" secondary disabled={!!blocked} onPress={()=>Alert.alert('Delete this memory?','This cannot be undone.',[{text:'Keep',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>void removeMemory(m.id)}])}/></View>)}</>}
 </ScrollView><View style={s.nav}>{(['home','run','memory'] as const).map(tab=><Pressable key={tab} accessibilityRole="tab" accessibilityState={{selected:screen===tab}} onPress={()=>setScreen(tab)} style={[s.navItem,screen===tab&&{backgroundColor:'#21142F'}]}><Text style={{color:colors.purple,fontWeight:'700'}}>{tab==='run'?'Your run':tab==='home'?'Home':'Memory'}</Text></Pressable>)}</View>
 <Modal visible={!!contactTask&&!connection} transparent animationType="slide" onRequestClose={()=>{setContactTask(null);setContactOptions([])}}><SafeAreaView style={s.backdrop}><ScrollView contentContainerStyle={s.modal}><View style={s.sheet}><Text style={s.heading}>Choose {contactTask?.recipient}</Text><Text style={s.body}>Select the person you mean. Only your selection is used on this phone.</Text>{contactOptions.map((p,i)=><Button key={i} title={`${p.name} · ${p.number}`} onPress={()=>void resumeContact(p.number,p.name)}/>)}<Button title={picking?'Opening contacts…':'Choose from Contacts'} disabled={picking} onPress={()=>void pickContact()}/><Button title="Cancel" secondary disabled={picking} onPress={()=>{setContactTask(null);setContactOptions([])}}/></View></ScrollView></SafeAreaView></Modal>
 <Modal visible={!!connection} transparent animationType="slide" onRequestClose={()=>{setConnection(null);void Talk.stop()}}><SafeAreaView style={s.backdrop}><View style={s.modal}><View style={s.sheet}><Text style={s.heading}>{connection?.title}</Text><Text style={s.body}>{connection?.message}</Text>{connection?.settings?<Button title="Open Settings" onPress={()=>{void Talk.stop();void Linking.openSettings().catch(()=>setError('Please open your phone Settings and select VDX Elastic.'));setConnection(null)}}/>:connection?.unavailable?<Text style={s.badge}>NOT AVAILABLE YET</Text>:null}<Button title="Got it" secondary onPress={()=>{setConnection(null);void Talk.stop()}}/></View></View></SafeAreaView></Modal>
 <Modal visible={run?.status==='approval'} transparent animationType="slide" onRequestClose={cancel} onShow={()=>reply(run?.intent.kind==='message'?`Prepare a ${run.channel==='whatsapp'?'WhatsApp':'text'} message to ${run.recipientName||run.intent.phone}: ${run.intent.body}. ${run.channel==='whatsapp'?'You will still tap Send in WhatsApp. ':''}Continue?`:'Review the phone number, then approve to open the dialer.')}><SafeAreaView style={s.backdrop}><ScrollView contentContainerStyle={s.modal} accessibilityViewIsModal><View style={s.sheet}><Text accessibilityRole="header" style={s.heading}>You are in control.</Text><Text selectable style={s.body}>{run?.intent.kind==='call'?`Open the phone interface for ${run.intent.phone}? The operating system may show a call confirmation.`:run?.intent.kind==='message'?`Prepare a ${run.channel==='whatsapp'?'WhatsApp':'SMS'} message to ${run.recipientName?`${run.recipientName} (${run.intent.phone})`:run.intent.phone}:\n\n${run.intent.body}`:''}</Text><Text style={s.small}>This is a real device handoff. Call connection and message delivery cannot be verified by Elastic.</Text><Button title={listening?"Stop listening":voicePending?"Starting microphone…":"Say yes or no"} secondary disabled={busy||voicePending} onPress={()=>void voice(true)}/><Button title="Approve and continue" onPress={()=>void approve()} disabled={busy}/><Button title="Cancel request" secondary onPress={cancel} disabled={busy}/></View></ScrollView></SafeAreaView></Modal>
 </SafeAreaView>;
}
const s=StyleSheet.create({statement:{fontFamily:'Newsreader_400Regular_Italic',fontSize:36,lineHeight:46,color:colors.ink,textAlign:'center'},voiceControl:{fontSize:18,lineHeight:26,fontWeight:'600',color:'#D8CDE8',paddingVertical:12,paddingHorizontal:16},safe:{flex:1,backgroundColor:'#0A0712'},page:{padding:22,paddingBottom:36,width:'100%',maxWidth:680,alignSelf:'center'},header:{gap:12,marginBottom:22},brand:{fontFamily:'Syne_700Bold',fontSize:28,color:colors.ink},badge:{color:colors.purple,fontFamily:'DMMono_400Regular',fontSize:14},hero:{fontSize:46,lineHeight:50,fontWeight:'800',letterSpacing:-1.8,color:colors.ink,marginVertical:18},body:{fontSize:16,lineHeight:24,color:colors.ink,marginVertical:8},small:{fontSize:13,lineHeight:20,color:colors.muted,marginVertical:6},heading:{fontSize:23,fontWeight:'700',color:colors.ink,marginBottom:6},quick:{flexDirection:'row',gap:8,marginVertical:24},tile:{flex:1,padding:14,minHeight:82,borderRadius:22,justifyContent:'center'},tileTitle:{fontSize:16,fontWeight:'700',color:colors.ink},input:{borderWidth:1,borderColor:'#785B99',borderRadius:20,padding:18,minHeight:60,fontSize:17,color:colors.ink,backgroundColor:'#15101F'},button:{backgroundColor:'#5B2A9E',padding:16,minHeight:52,borderRadius:26,alignItems:'center',marginVertical:8},secondary:{backgroundColor:'#21142F'},buttonText:{fontSize:16,fontWeight:'700',color:'white'},card:{backgroundColor:'#15101F',padding:18,borderRadius:22,marginTop:20,borderWidth:1,borderColor:'#39264D'},example:{paddingVertical:8,borderBottomWidth:1,borderColor:'#39264D'},node:{borderWidth:2,borderColor:'transparent',borderRadius:24,padding:18,flexDirection:'row',gap:14,alignItems:'center'},edge:{textAlign:'center',color:colors.purple,fontSize:17,lineHeight:16},error:{padding:16,color:'#FFCEC6',backgroundColor:'#3C202B',borderRadius:16,marginBottom:12},nav:{flexDirection:'row',padding:12,gap:6,borderTopWidth:1,borderColor:'#39264D'},navItem:{flex:1,padding:14,minHeight:48,borderRadius:24,alignItems:'center'},backdrop:{flex:1,backgroundColor:'rgba(25,19,34,.55)'},modal:{flexGrow:1,justifyContent:'flex-end',padding:18},sheet:{padding:24,backgroundColor:'#0A0712',borderRadius:28}});
