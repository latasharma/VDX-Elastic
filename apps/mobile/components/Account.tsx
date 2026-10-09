import { CloudRequests } from './CloudRequests';
import React,{useEffect,useRef,useState} from 'react';
import {AppState,Modal,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {Session} from '@supabase/supabase-js';
import {supabase} from '../lib/supabase';
export function Account(){
 const [open,setOpen]=useState(false),[session,setSession]=useState<Session|null>(null);
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const locked=useRef(false);
 useEffect(()=>{
 if(!supabase)return;
 let mounted=true;
 void supabase.auth.getSession().then(({data,error})=>{if(mounted){setSession(data.session);if(error)setMessage('Please sign in again.');}}).catch(()=>{if(mounted)setMessage('Could not restore your session. Please sign in again.');});
 const {data}=supabase.auth.onAuthStateChange((_event,value)=>{setSession(value);setPassword('');});
 if(AppState.currentState==='active')supabase.auth.startAutoRefresh();
 const listener=AppState.addEventListener('change',s=>{if(s==='active')supabase?.auth.startAutoRefresh();else supabase?.auth.stopAutoRefresh();});
 return()=>{mounted=false;data.subscription.unsubscribe();listener.remove();supabase?.auth.stopAutoRefresh();};
 },[]);
 async function authenticate(signup=false){
 if(!supabase||locked.current)return;locked.current=true;setBusy(true);setMessage('');
 try{
 const result=signup?await supabase.auth.signUp({email:email.trim(),password}):await supabase.auth.signInWithPassword({email:email.trim(),password});
 if(result.error)throw result.error;
 setPassword('');
 setMessage(signup&&!result.data.session?'Check your email to confirm your account, then return here and sign in.':'You are signed in. Service connections will appear as they become available.');
 }catch(e){setMessage(e instanceof Error?e.message:'Sign-in failed. Try again.');}finally{locked.current=false;setBusy(false);}
 }
 async function signOut(){if(!supabase||locked.current)return;locked.current=true;setBusy(true);try{const {error}=await supabase.auth.signOut({scope:'local'});if(error)throw error;setMessage('Signed out on this device.');}catch{setMessage('Could not sign out. Please try again.');}finally{locked.current=false;setBusy(false);}}
 return <><Pressable accessibilityRole="button" onPress={()=>setOpen(true)} style={s.link}><Text style={s.linkText}>{session?'Account':'Sign in'}</Text></Pressable>
 <Modal visible={open} transparent animationType="slide" onRequestClose={()=>{if(!busy){setOpen(false);setPassword('');}}}><SafeAreaView style={s.overlay}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}><View style={s.sheet}>
 <Text style={s.title}>{session?'Your VDX account':'Connect your VDX account'}</Text><Text style={s.body}>Your account keeps cloud requests separate from other users. Local phone features work without signing in.</Text>
 {!supabase?<Text style={s.body}>Account setup is not configured in this build.</Text>:session?<><Text style={s.body}>{session.user.email}</Text><CloudRequests key={session.user.id} userId={session.user.id}/><Pressable accessibilityRole="button" disabled={busy} onPress={()=>void signOut()} style={s.button}><Text style={s.label}>Sign out on this device</Text></Pressable></>:<>
 <TextInput accessibilityLabel="Email address" placeholder="Email address" placeholderTextColor="#B8ADC9" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} editable={!busy} style={s.input}/>
 <TextInput accessibilityLabel="Password" placeholder="Password" placeholderTextColor="#B8ADC9" autoCapitalize="none" autoCorrect={false} secureTextEntry value={password} onChangeText={setPassword} editable={!busy} style={s.input}/>
 <Pressable accessibilityRole="button" disabled={busy||!email.trim()||!password} onPress={()=>void authenticate()} style={s.button}><Text style={s.label}>{busy?'Please wait…':'Sign in'}</Text></Pressable>
 <Pressable accessibilityRole="button" disabled={busy||!email.trim()||!password} onPress={()=>void authenticate(true)} style={s.link}><Text style={s.linkText}>Create account</Text></Pressable></>}
 {!!message&&<Text accessibilityLiveRegion="polite" style={s.body}>{message}</Text>}
 <Pressable accessibilityRole="button" disabled={busy} onPress={()=>{setOpen(false);setPassword('');}} style={s.link}><Text style={s.linkText}>Close</Text></Pressable>
 </View></ScrollView></SafeAreaView></Modal></>;
}
const s=StyleSheet.create({link:{padding:12,minHeight:48},linkText:{color:'#D8CDE8',fontSize:18},overlay:{flex:1,backgroundColor:'#000000AA'},content:{flexGrow:1,justifyContent:'flex-end',padding:18},sheet:{backgroundColor:'#15101F',borderRadius:24,padding:24,gap:12},title:{color:'#F5F1FA',fontSize:25,fontWeight:'700'},body:{color:'#D8CDE8',fontSize:17,lineHeight:25},input:{borderWidth:1,borderColor:'#785B99',borderRadius:14,padding:16,color:'#F5F1FA',fontSize:18},button:{backgroundColor:'#5B2A9E',borderRadius:22,padding:16,minHeight:52},label:{color:'white',fontSize:18,textAlign:'center',fontWeight:'600'}});
