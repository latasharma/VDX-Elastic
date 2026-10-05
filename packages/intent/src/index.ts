/** Deliberately constrained, local parser. Parsing a request never authorizes or executes it. */
export type RequestIntent =
  | { kind: 'remember'; text: string }
  | { kind: 'recall'; query: string }
  | { kind: 'call'; phone: string }
  | { kind: 'message'; phone: string; body: string };

const USAGE = 'Use remember <text>, find memory <query>, call <phone number>, or message <phone number>: <body>.';
const MAX_REQUEST_LENGTH = 10_000;

/** Accept only ASCII digits and ordinary visual separators. Never pass URI syntax to a dialer. */
function normalizePhone(raw: string): string {
  const phone = raw.trim();
  if (!/^\+?[0-9 ()-]+$/.test(phone)) {
    throw new Error('Use a phone number, not a contact name. Only digits, an optional leading +, spaces, parentheses and hyphens are supported; extensions and dial codes are not.');
  }
  if (/[0-9]{7,}[ ()-]+[0-9]{7,}/.test(phone)) throw new Error('Enter one phone number per request.');
  // Reject malformed parentheses and ambiguous grouped numbers instead of guessing.
  let depth = 0;
  for (const character of phone) {
    if (character === '(') {
      if (depth !== 0) throw new Error('Use a phone number with balanced, non-nested parentheses.');
      depth++;
    }
    if (character === ')') {
      if (depth !== 1) throw new Error('Use a phone number with balanced, non-nested parentheses.');
      depth--;
    }
  }
  if (depth !== 0 || /\(\s*\)/.test(phone)) throw new Error('Use a phone number with balanced, non-empty parentheses.');
  const normalized = phone.replace(/[ ()-]/g, '');
  if (!/^\+?[0-9]{7,15}$/.test(normalized)) {
    throw new Error('Use a phone number containing 7–15 digits, with an optional leading +.');
  }
  return normalized;
}

export function parseRequest(input: string): RequestIntent {
  if (typeof input !== 'string') throw new Error(USAGE);
  if (input.length > MAX_REQUEST_LENGTH) throw new Error('Keep requests under 10,000 characters.');
  // Control characters are unsafe in phone URIs and invisible commands are ambiguous.
  if (/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/.test(input)) {
    throw new Error('Enter a single-line request without hidden control characters.');
  }
  const request = input.trim();
  const remember = /^remember\s+(.+)$/i.exec(request);
  if (remember) return { kind: 'remember', text: remember[1]!.trim() };
  const recall = /^find memory\s+(.+)$/i.exec(request);
  if (recall) return { kind: 'recall', query: recall[1]!.trim() };
  const call = /^call\s+(.+)$/i.exec(request);
  if (call) return { kind: 'call', phone: normalizePhone(call[1]!) };
  const message = /^message\s+([^:]+):\s*(.+)$/i.exec(request);
  if (message) return { kind: 'message', phone: normalizePhone(message[1]!), body: message[2]!.trim() };
  throw new Error(USAGE);
}
