import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, applyEvent, advanceRun, approveRun, cancelRun } from './index.ts';

test('simulation stops at approval and only records a simulated handoff', () => {
  let run = createRun();
  for (let i = 0; i < 20; i++) run = advanceRun(run);
  assert.equal(run.status, 'awaiting_approval');
  assert.equal(run.nodes.find(n => n.id === 'handoff')!.status, 'pending');
  assert.deepEqual(run.evidence, []);
  run = approveRun(run);
  for (let i = 0; i < 10; i++) run = advanceRun(run);
  assert.equal(run.status, 'completed');
  assert.equal(run.evidence[0]!.callConnected, false);
  assert.equal(run.evidence[0]!.simulated, true);
});
test('duplicate delivery is ignored and gaps require ordered replay', () => {
  const initial = createRun();
  const event = { runId: initial.id, sequence: 1, type: 'node.started' as const, nodeId: 'intent' as const };
  const started = applyEvent(initial, event);
  assert.equal(applyEvent(started, event), started);
  const gap = applyEvent(initial, { ...event, sequence: 2 });
  assert.equal(gap.sync, 'gap');
  assert.equal(gap.lastSequence, 0);
  assert.equal(gap.expectedSequence, 1);
  assert.equal(advanceRun(gap), gap);
  assert.equal(applyEvent(gap, event).sync, 'current');
  assert.equal(initial.nodes[0]!.status, 'pending');
});
test('effects cannot start before approval; grants cannot precede requests', () => {
  const run = createRun();
  assert.throws(() => applyEvent(run, { runId: run.id, sequence: 1, type: 'node.started', nodeId: 'handoff' }));
  assert.throws(() => approveRun(run));
});
test('cancelled run cannot resume and never gains success evidence', () => {
  const run = cancelRun(advanceRun(createRun()));
  assert.equal(run.status, 'cancelled');
  assert.equal(advanceRun(run), run);
  assert.deepEqual(run.evidence, []);
  assert.throws(() => approveRun(run));
});
test('events from another run are rejected', () => {
  assert.throws(() => applyEvent(createRun(), { runId: 'other', sequence: 1, type: 'node.started', nodeId: 'intent' }));
});
test('failure remains terminal and blocks dependent actions', () => {
  const started = advanceRun(createRun());
  const failed = applyEvent(started, { runId: started.id, sequence: 2, type: 'node.failed', nodeId: 'intent' });
  assert.equal(failed.status, 'failed');
  assert.equal(failed.nodes.find(n => n.id === 'handoff')!.status, 'pending');
  assert.equal(advanceRun(failed), failed);
});
test('evidence completion requires a receipt and rejects call-connected claims', () => {
  let run = createRun();
  for (let i = 0; i < 5; i++) run = advanceRun(run);
  run = approveRun(run);
  for (let i = 0; i < 3; i++) run = advanceRun(run);
  const event = { runId: run.id, sequence: run.lastSequence + 1, type: 'node.completed' as const, nodeId: 'evidence' as const };
  assert.throws(() => applyEvent(run, event));
  assert.throws(() => applyEvent(run, { ...event, evidence: { kind: 'simulated_handoff', statement: 'Connected', simulated: true, callConnected: true } } as unknown as Parameters<typeof applyEvent>[1]));
});
test('conflicting duplicate sequence is rejected rather than silently losing evidence', () => {
  const initial = createRun();
  const run = advanceRun(initial);
  assert.throws(() => applyEvent(run, { ...run.events[0]!, type: 'node.completed' }), /Conflicting duplicate/);
});
test('cancelling via a completed node preserves all completed work', () => {
  const run = advanceRun(advanceRun(createRun()));
  const cancelled = applyEvent(run, { runId: run.id, sequence: 3, nodeId: 'intent', type: 'run.cancelled' });
  assert.equal(cancelled.nodes[0]!.status, 'succeeded');
  assert.ok(cancelled.nodes.slice(1).every(n => n.status === 'cancelled'));
  assert.equal(run.nodes[1]!.status, 'pending');
});
test('accepted event evidence is snapshotted independently of the caller and ledger', () => {
  let run = createRun();
  for (let i = 0; i < 5; i++) run = advanceRun(run);
  run = approveRun(run);
  for (let i = 0; i < 3; i++) run = advanceRun(run);
  const evidence = { kind: 'simulated_handoff' as const, statement: 'Original', simulated: true as const, callConnected: false as const };
  const complete = applyEvent(run, { runId: run.id, sequence: run.lastSequence + 1, type: 'node.completed', nodeId: 'evidence', evidence });
  evidence.statement = 'Changed externally';
  assert.equal(complete.events.at(-1)!.evidence!.statement, 'Original');
  assert.equal(complete.evidence[0]!.statement, 'Original');
  assert.notEqual(complete.events.at(-1)!.evidence, complete.evidence[0]);
});
