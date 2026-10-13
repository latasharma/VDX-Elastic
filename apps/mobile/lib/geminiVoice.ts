import { AppState, Platform } from 'react-native';
import { supabase } from './supabase';
import { pcmEncode, pcmDecode, proposal, SessionGeneration, type VoiceProposal } from '../../../packages/voice/src';
export type VoiceState='idle'|'connecting'|'listening'|'speaking';
type Events={state:(state:VoiceState)=>void; transcript:(text:string)=>void; reply:(text:string)=>void; proposal:(task:VoiceProposal)=>void; error:(message:string)=>void};
/** One foreground session. Never writes audio, transcripts, or credentials to storage. */
export class GeminiVoice {
 private generation=new SessionGeneration();
 private cleanup:(()=>Promise<void>)|null=null;
 private stopping=Promise.resolve();
 private active=false;
 constructor(private events:Events){}
 async stop(){this.generation.end();this.active=false;const cleanup=this.cleanup;this.cleanup=null;this.events.state('idle');this.events.transcript('');this.events.reply('');this.stopping=this.stopping.then(async()=>{await cleanup?.()});await this.stopping;}
 async start(){
 if(this.active||AppState.currentState!=='active')return;
 await this.stopping;
 if(this.active||AppState.currentState!=='active')return;
 this.active=true;const id=this.generation.begin();
 const valid=()=>this.generation.current(id)&&AppState.currentState==='active';
 let socket:WebSocket|undefined;
 let recorder:InstanceType<typeof import('react-native-audio-api').AudioRecorder>|undefined;
 let context:InstanceType<typeof import('react-native-audio-api').AudioContext>|undefined;
 let queue:ReturnType<InstanceType<typeof import('react-native-audio-api').AudioContext>['createBufferQueueSource']>|undefined;
 let audio:typeof import('react-native-audio-api')|undefined;
 let recordingStart:Promise<unknown>|undefined;
 let timer:ReturnType<typeof setTimeout>|undefined;
 let lifetime:ReturnType<typeof setTimeout>|undefined;
 let interruption:{remove:()=>void}|undefined;
 const abort=new AbortController();
 const background=AppState.addEventListener('change',state=>{if(state!=='active')void this.stop()});
 this.cleanup=async()=>{
 abort.abort();clearTimeout(timer);clearTimeout(lifetime);background.remove();interruption?.remove();
 if(socket){socket.onmessage=null;socket.onerror=null;socket.onclose=null;socket.close();}
 recorder?.clearOnAudioReady();recorder?.clearOnError();
 await recordingStart?.catch(()=>{});
 await recorder?.stop().catch(()=>{});
 try{if(queue)queue.onBufferEnded=null;queue?.stop();queue?.disconnect()}catch{}
 await context?.close().catch(()=>{});
 await audio?.AudioManager.setAudioSessionActivity(false).catch(()=>{});
 };
 const fail=(message:string)=>{if(!valid())return;void this.stop();this.events.error(message)};
 this.events.state('connecting');
 try{
 if(Platform.OS==='web')throw Error('Gemini conversation is available in the new iOS and Android builds.');
 if(!supabase)throw Error('VDX account service is not configured.');
 const {data}=await supabase.auth.getSession();if(!valid())return;
 if(!data.session)throw Error('Tap Account and sign in before starting a Gemini conversation.');
 audio=await import('react-native-audio-api');if(!valid())return;
 const permission=await audio.AudioManager.requestRecordingPermissions();if(!valid())return;
 if(permission!=='Granted')throw Error('Allow microphone access in your phone Settings to talk with VDX.');
 const endpoint=`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/gemini-session`;
 timer=setTimeout(()=>fail('Voice connection timed out. Tap to try again.'),25000);
 const response=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${data.session.access_token}`,'Content-Type':'application/json'},signal:abort.signal});
 if(!valid())return;
 const result=await response.json();if(!valid())return;
 if(!response.ok)throw Error(result.error||'Gemini voice is not deployed yet.');
 if(typeof result.token!=='string'||!result.setup?.model)throw Error('Invalid voice session configuration.');
 audio.AudioManager.setAudioSessionOptions({iosCategory:'playAndRecord',iosMode:'voiceChat',iosOptions:['defaultToSpeaker','allowBluetoothHFP']});
 await audio.AudioManager.setAudioSessionActivity(true);if(!valid()){await audio.AudioManager.setAudioSessionActivity(false);return;}
 audio.AudioManager.observeAudioInterruptions(true);
 interruption=audio.AudioManager.addSystemEventListener('interruption',e=>{if(e.type==='began')void this.stop()});
 context=new audio.AudioContext({sampleRate:24000});
 queue=context.createBufferQueueSource();queue.connect(context.destination);queue.start(0,0);
 recorder=new audio.AudioRecorder();recorder.onError(()=>fail('Microphone interrupted. Tap to start again.'));
 let queuedFrames=0;const buffers=new Map<string,number>();let speaking=false;let turnDone=true;
 const listening=()=>{if(valid()&&turnDone&&queuedFrames===0){speaking=false;this.events.state('listening')}};
 queue.onBufferEnded=e=>{queuedFrames-=buffers.get(e.bufferId)||0;buffers.delete(e.bufferId);listening()};
 socket=new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(result.token)}`);
 const send=(value:unknown)=>{if(valid()&&socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify(value))};
 const configured=recorder.onAudioReady({sampleRate:16000,bufferLength:1600,channelCount:1},({buffer,numFrames})=>{
 // Half-duplex avoids the speaker feeding its own reply back into the model.
 if(!valid()||speaking)return;
 if(socket&&socket.bufferedAmount>128000){fail('Connection is too slow for voice. Please try again.');return;}
 send({realtimeInput:{audio:{data:pcmEncode(buffer.getChannelData(0).subarray(0,numFrames)),mimeType:`audio/pcm;rate=${buffer.sampleRate}`}}});
 });
 if(configured.status==='error')throw Error('Could not configure microphone streaming.');
 socket.onopen=()=>{if(valid())send({setup:result.setup});else socket?.close()};
 socket.onerror=()=>fail('Gemini connection failed. Check your connection and try again.');
 socket.onclose=()=>fail('Conversation ended. Tap the bubble to start again.');
 let transcript='',reply='';let handled=false;let started=false;
 socket.onmessage=event=>{void (async()=>{
 if(!valid())return;
 const raw=typeof event.data==='string'?event.data:await event.data.text();if(!valid())return;
 const message=JSON.parse(raw);
 if(message.setupComplete&&!started){started=true;clearTimeout(timer);lifetime=setTimeout(()=>fail('Conversation time limit reached. Tap to start another.'),9*60000);
 recordingStart=recorder!.start();const start=await recordingStart as {status:string};if(!valid())return;if(start.status==='error')throw Error();this.events.state('listening');}
 const content=message.serverContent;
 if(content?.inputTranscription?.text){if(turnDone){transcript='';reply='';turnDone=false;}transcript=(transcript+content.inputTranscription.text).slice(-4000);this.events.transcript(transcript);}
 if(content?.outputTranscription?.text){reply=(reply+content.outputTranscription.text).slice(-4000);this.events.reply(reply);}
 if(content?.interrupted){queue?.clearBuffers();buffers.clear();queuedFrames=0;speaking=false;}
 for(const part of content?.modelTurn?.parts||[]){if(part.inlineData?.data&&part.inlineData.mimeType?.startsWith('audio/pcm')){
 const samples=pcmDecode(part.inlineData.data);if(queuedFrames+samples.length>24000*30)throw Error('Audio queue exceeded limit.');
 const buffer=context!.createBuffer(1,samples.length,24000);buffer.copyToChannel(new Float32Array(samples),0);const key=queue!.enqueueBuffer(buffer);buffers.set(key,samples.length);queuedFrames+=samples.length;speaking=true;turnDone=false;this.events.state('speaking');}}
 if(content?.turnComplete){turnDone=true;listening();}
 if(message.goAway){fail('Conversation is ending. Tap to start another.');return;}
 for(const call of message.toolCall?.functionCalls||[]){
 if(handled)break;
 try{if(call.name!=='propose_task')throw Error('Unsupported voice tool.');const task=proposal(call.args);handled=true;
 send({toolResponse:{functionResponses:[{id:call.id,name:call.name,response:{status:'awaiting_user_review',executed:false}}]}});
 await this.stop();this.events.proposal(task);
 }catch(e){send({toolResponse:{functionResponses:[{id:call.id,name:call.name,response:{error:e instanceof Error?e.message:'Missing task details.'}}]}});}
 }
 })().catch(()=>fail('Voice was interrupted. No action was taken. Please try again.'));};
 }catch(e){if(valid())fail(e instanceof Error?e.message:'Voice could not start.');else await this.stop();}
 }
}
