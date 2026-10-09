import 'react-native-url-polyfill/auto';
import { createClient,processLock } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
const url=process.env.EXPO_PUBLIC_SUPABASE_URL;
const key=process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
// Browser previews use memory only; native sessions use the OS-protected key store.
const memory=new Map<string,string>();
const storage={
 getItem:(key:string)=>Platform.OS==='web'?Promise.resolve(memory.get(key)??null):SecureStore.getItemAsync(key),
 setItem:async(key:string,value:string)=>{if(Platform.OS==='web'){memory.set(key,value);return;}await SecureStore.setItemAsync(key,value);},
 removeItem:async(key:string)=>{if(Platform.OS==='web'){memory.delete(key);return;}await SecureStore.deleteItemAsync(key);},
};
export const supabase=url&&key?createClient(url,key,{auth:{storage,autoRefreshToken:true,persistSession:true,detectSessionInUrl:false,lock:processLock}}):null;
