import test from 'node:test';
import assert from 'node:assert/strict';
import { executeApproved, type ActionPorts } from './index.ts';

const call = {kind:'call' as const, phone:'+12125551234'};
const message = {kind:'message' as const, phone:'+12125551234', body:'I will arrive at six.'};
function recordingPorts(result: 'sent' | 'cancelled' | 'unknown' = 'unknown') {
  const calls: unknown[][] = [];
  const ports: ActionPorts = {
    async openPhone(phone) { calls.push(['phone', phone]); },
    async composeMessage(phone, body) { calls.push(['message', phone, body]); return result; },
  };
  return {calls, ports};
}
test('no phone effects without explicit approval', async () => {
  const {calls, ports} = recordingPorts();
  for (const intent of [call, message]) await assert.rejects(executeApproved(intent, false, ports), /approval/);
  await assert.rejects(executeApproved(call, 'yes' as unknown as boolean, ports), /approval/);
  assert.deepEqual(calls, []);
});
test('phone handoff is performed once and never claims connection', async () => {
  const {calls, ports} = recordingPorts();
  const receipt = await executeApproved(call, true, ports);
  assert.deepEqual(calls, [['phone', call.phone]]);
  assert.match(receipt, /operating system accepted the phone handoff/);
  assert.match(receipt, /does not confirm that a call started or connected/);
});
test('message receipts distinguish composer status from recipient delivery', async () => {
  for (const result of ['sent', 'cancelled', 'unknown'] as const) {
    const {calls, ports} = recordingPorts(result);
    const receipt = await executeApproved(message, true, ports);
    assert.deepEqual(calls, [['message', message.phone, message.body]]);
    if (result === 'sent') assert.match(receipt, /composer reported sent.*Delivery.*not verified/);
    if (result === 'cancelled') assert.match(receipt, /cancellation.*No message delivery is confirmed/);
    if (result === 'unknown') assert.match(receipt, /Sending and delivery are unverified/);
  }
});
test('native errors propagate without retry or success receipt', async () => {
  const failure = new Error('Native service unavailable');
  let attempts = 0;
  const ports: ActionPorts = { async openPhone() { attempts++; throw failure; }, async composeMessage() { attempts++; throw failure; } };
  await assert.rejects(executeApproved(call, true, ports), error => error === failure);
  await assert.rejects(executeApproved(message, true, ports), error => error === failure);
  assert.equal(attempts, 2);
});
test('unsupported intents and malformed effect inputs cannot invoke ports', async () => {
  const {calls, ports} = recordingPorts();
  await assert.rejects(executeApproved({kind:'remember',text:'keys'}, true, ports), /Only call and message/);
  await assert.rejects(executeApproved({kind:'recall',query:'keys'}, true, ports), /Only call and message/);
  await assert.rejects(executeApproved({...call,phone:'tel:1234567;123'}, true, ports), /normalized phone/);
  await assert.rejects(executeApproved({...message,body:' '}, true, ports), /message body/);
  assert.deepEqual(calls, []);
});
