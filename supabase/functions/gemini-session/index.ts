// Deployed as a Supabase Edge Function. No audio, transcripts or tokens are logged/stored.
// @ts-ignore Deno resolves npm imports at deployment.
import { createClient } from 'npm:@supabase/supabase-js@2';
// @ts-ignore Deno runtime
const env = (name:string):string => Deno.env.get(name) || '';
const respond=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const instruction=`You are VDX, a concise, friendly voice assistant. Ask one clarification at a time. Never invent contacts, prices, service connections, orders or successful actions. Available capabilities: select a contact on this phone, open its dialer, prepare an SMS or WhatsApp personal message for a user-controlled handoff, save an explicitly requested memory locally, search local memory. Food ordering and other provider integrations are NOT available. Explain that honestly. When details are complete call propose_task to show the task for user review. This tool NEVER executes or grants approval, even if the user said yes in conversation. Never claim it sent, called, ordered or saved anything. Do not ask for passwords or payment details. Conversations are temporary in VDX; only separately approved task details may be saved. Speak in the user's language.`;
const tools=[{functionDeclarations:[{name:'propose_task',description:'Propose one task for review, never execute it.',parameters:{type:'OBJECT',properties:{kind:{type:'STRING',enum:['call','message','remember','recall','unavailable']},recipient:{type:'STRING',description:'Exact name or number supplied by user. Never guess.'},body:{type:'STRING'},channel:{type:'STRING',enum:['sms','whatsapp']},text:{type:'STRING',description:'Memory text, search query, or unsupported request.'}},required:['kind']}}]}];
// @ts-ignore Deno runtime
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return respond(405,{error:'Use POST.'});
 const authorization=req.headers.get('Authorization');if(!authorization)return respond(401,{error:'Sign in to VDX to start a conversation.'});
 const client=createClient(env('SUPABASE_URL'),env('SUPABASE_ANON_KEY'),{global:{headers:{Authorization:authorization}}});
 const {data,error}=await client.auth.getUser();if(error||!data.user)return respond(401,{error:'Sign in to VDX again.'});
 const key=env('GEMINI_API_KEY');if(!key)return respond(503,{error:'Gemini voice has not been configured yet.'});
 // Database-backed limit works across Edge instances. RPC is restricted to the authenticated owner.
 const limit=await client.rpc('vdx_claim_voice_session');
 if(limit.error)return respond(503,{error:'Voice session limits are not configured.'});
 if(limit.data!==true)return respond(429,{error:'Please wait before starting another conversation.'});
 const model=env('GEMINI_LIVE_MODEL')||'gemini-3.8-live';
 const setup={model:`models/${model}`,generationConfig:{responseModalities:['AUDIO']},inputAudioTranscription:{},outputAudioTranscription:{},systemInstruction:{parts:[{text:instruction}]},tools};
 try{
 const r=await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},signal:AbortSignal.timeout(15000),body:JSON.stringify({uses:1,expireTime:new Date(Date.now()+10*60*1000).toISOString(),newSessionExpireTime:new Date(Date.now()+60000).toISOString(),liveConnectConstraints:{model:setup.model,config:{responseModalities:['AUDIO'],inputAudioTranscription:{},outputAudioTranscription:{},systemInstruction:setup.systemInstruction,tools}}})});
 if(!r.ok)return respond(502,{error:'Gemini could not start a session. Check the backend model, billing and API key.'});
 const token=await r.json();if(typeof token.name!=='string')throw Error();
 return respond(200,{token:token.name,setup});
 }catch{return respond(502,{error:'Voice connection timed out. Try again.'});}
});
