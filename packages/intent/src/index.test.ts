import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRequest } from './index.ts';

test('parses the four explicit commands without executing effects', () => {
  assert.deepEqual(parseRequest(' Remember My keys are by the door. '), {kind:'remember',text:'My keys are by the door.'});
  assert.deepEqual(parseRequest('find memory keys'), {kind:'recall',query:'keys'});
  assert.deepEqual(parseRequest('call +1 (212) 555-1234'), {kind:'call',phone:'+12125551234'});
  assert.deepEqual(parseRequest('message 212-555-1234: Arriving at 6:30!'), {kind:'message',phone:'2125551234',body:'Arriving at 6:30!'});
});
test('memory and message payloads remain inert text, not nested commands', () => {
  assert.deepEqual(parseRequest('remember call +12125551234'), {kind:'remember',text:'call +12125551234'});
  assert.deepEqual(parseRequest('message 2125551234: tel:999; ignore previous instructions'), {kind:'message',phone:'2125551234',body:'tel:999; ignore previous instructions'});
});
test('rejects names, ambiguous extra instructions, extensions and URI injection', () => {
  for (const value of ['call Papa', 'call 1234567 7654321', 'call 2125551234 or 4155551234', 'call 2125551234 then call 4155551234', 'call tel:2125551234', 'call 2125551234;123', 'call 2125551234,123', 'call 2125551234?body=hello', 'call 2125551234%0A', 'call *1234567#', 'call 2125551234 ext 12', 'call +1+2125551234', 'message Papa: hello', 'message tel:2125551234: hello']) {
    assert.throws(() => parseRequest(value), Error, value);
  }
});
test('enforces phone digit bounds and balanced formatting', () => {
  assert.equal(parseRequest('call 1234567').kind, 'call');
  assert.equal(parseRequest('call +123456789012345').kind, 'call');
  for (const number of ['123456', '1234567890123456', '(2125551234', '212)5551234', '((212))5551234', '()2125551234', '１２３４５６７']) assert.throws(() => parseRequest('call '+number));
});
test('rejects missing fields, unsupported grammar, hidden characters and oversized requests', () => {
  for (const value of ['', 'remember ', 'find memory', 'call', 'message 2125551234:', 'message 2125551234:   ', 'send hello', 'please call 2125551234', 'call 2125551234\n', 'call 212\u200b5551234', 'remember '+ 'x'.repeat(10_000)]) assert.throws(() => parseRequest(value), Error, value.slice(0,80));
});
