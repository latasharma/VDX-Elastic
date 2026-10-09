export const services = [
 { id:'contacts', name:'Contacts', mode:'device', detail:'Choose a contact on this phone. Your address book stays on the device.' },
 { id:'whatsapp', name:'WhatsApp', mode:'handoff', detail:'Prepare a message, then confirm sending in WhatsApp. This does not link or read your personal account.' },
 { id:'uber-eats', name:'Uber Eats', mode:'restricted', detail:'Consumer Delivery API approval and provider credentials are required before account linking can be enabled.' },
 { id:'doordash', name:'DoorDash', mode:'restricted', detail:'DoorDash MCP is private beta for organizational ordering, not currently available for consumer-facing products.' },
] as const;
export type ServiceId = typeof services[number]['id'];
export function service(id:string) { return services.find(s=>s.id===id); }
export function whatsappURL(phone:string,body:string) {
 if(!/^\+[1-9]\d{6,14}$/.test(phone)) throw Error('Use a full international phone number beginning with +.');
 if(!body.trim() || body.length>4000) throw Error('Enter a message between 1 and 4,000 characters.');
 return `whatsapp://send?phone=${phone.slice(1)}&text=${encodeURIComponent(body)}`;
}
export type ContactRequest = {kind:'call'|'message';recipient:string;body?:string;channel:'sms'|'whatsapp'};
/** Constrained routing only; never a general natural-language planner. */
export function contactRequest(text:string):ContactRequest|undefined {
 text=text.trim().replace(/^(?:can you|could you|would you)\s+/i,'').replace(/^please\s+/i,'');
 const spoken=/^(?:whatsapp|send (?:a )?whatsapp (?:message )?to)\s+(.+?)\s+(?:that|saying|to say)\s+(.+)$/i.exec(text)??/^(?:message|text)\s+(.+?)\s+on whatsapp\s+(?:that|saying|to say)\s+(.+)$/i.exec(text);
 if(spoken)return {kind:'message',recipient:spoken[1]!.trim(),body:spoken[2]!.trim(),channel:'whatsapp'};
 const whatsapp=/^(?:please\s+)?(?:send\s+(?:a\s+)?whatsapp\s+(?:message\s+)?to|whatsapp)\s+([^:]+):\s*(.+)$/i.exec(text.trim());
 if(whatsapp)return {kind:'message',recipient:whatsapp[1]!.trim(),body:whatsapp[2]!.trim(),channel:'whatsapp'};
 const message=/^(?:message|text)\s+([^:]+):\s*(.+)$/i.exec(text.trim());
 if(message&&!/^\+?[\d ()-]+$/.test(message[1]!.trim()))return {kind:'message',recipient:message[1]!.trim(),body:message[2]!.trim(),channel:'sms'};
 const call=/^call\s+(.+)$/i.exec(text.trim());
 if(call&&!/^\+?[\d ()-]+$/.test(call[1]!.trim()))return {kind:'call',recipient:call[1]!.trim(),channel:'sms'};
}

/** Approvals must be an entire explicit utterance, never a substring of a message. */
export function approvalAnswer(text:string):'approve'|'cancel'|'unclear' {
 const answer=text.trim().toLowerCase().replace(/[.!?]+$/,'');
 if(['yes','yes please','approve','continue','open whatsapp'].includes(answer))return 'approve';
 if(['no','cancel','stop','no thanks'].includes(answer))return 'cancel';
 return 'unclear';
}
