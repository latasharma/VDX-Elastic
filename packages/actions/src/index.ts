import type { RequestIntent } from '../../intent/src/index';

export interface ActionPorts {
  /** Resolve only when the operating system accepts the handoff; reject when it fails. */
  openPhone(phone: string): Promise<void>;
  /** Report the native composer's result, never infer recipient delivery. */
  composeMessage(phone: string, body: string): Promise<'sent' | 'cancelled' | 'unknown'>;
}

/** The caller must bind approval to this exact immutable intent. No automatic retries. */
export async function executeApproved(intent: RequestIntent, approved: boolean, ports: ActionPorts): Promise<string> {
  if (approved !== true) throw new Error('Explicit approval is required before opening a phone action.');
  if (intent.kind === 'call') {
    const phone = intent.phone;
    if (!/^\+?[0-9]{7,15}$/.test(phone)) throw new Error('A normalized phone number is required.');
    await ports.openPhone(phone);
    return 'The operating system accepted the phone handoff. This does not confirm that a call started or connected.';
  }
  if (intent.kind === 'message') {
    const { phone, body } = intent;
    if (!/^\+?[0-9]{7,15}$/.test(phone)) throw new Error('A normalized phone number is required.');
    if (typeof body !== 'string' || body.trim().length === 0) throw new Error('A message body is required.');
    const result = await ports.composeMessage(phone, body);
    switch (result) {
      case 'sent': return 'The message composer reported sent. Delivery to the recipient is not verified.';
      case 'cancelled': return 'The message composer reported cancellation. No message delivery is confirmed.';
      case 'unknown': return 'The message composer returned no confirmed sending outcome. Sending and delivery are unverified.';
      default: throw new Error('The message composer returned an unsupported outcome. Sending and delivery are unverified.');
    }
  }
  throw new Error('Only call and message requests are supported by phone actions.');
}
