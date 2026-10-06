import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CapabilityRegistry, TaskRun, type Plan } from './index.ts';
const plan = (): Plan => ({ id: 'run-1', summary: 'Send the reviewed message', nodes: [{ id: 'send', capability: 'message', input: { body: 'Hello' }, dependsOn: [] }] });
function setup(execute: Parameters<CapabilityRegistry['register']>[0]['execute']) {
  const registry = new CapabilityRegistry(); registry.register({ id: 'message', title: 'Message', effect: 'write', execute }); return registry;
}
test('approval binds an immutable plan and duplicate execution is rejected', async () => {
  let count = 0;
  const p = plan();
  const run = new TaskRun(p, setup(async input => { count++; assert.equal(input.body, 'Hello'); return { status: 'handoff', detail: 'Opened' }; }));
  p.nodes[0]!.input.body = 'Changed';
  await assert.rejects(run.execute(), /approval/);
  assert.throws(() => run.approve('other'));
  run.approve('run-1');
  const first = run.execute(); await assert.rejects(run.execute()); await first;
  assert.equal(count, 1);
  assert.equal(run.snapshot().evidence.at(-1)?.state, 'handoff');
});
test('unknown write outcome is never retried', async () => {
  let count = 0; const run = new TaskRun(plan(), setup(async () => { count++; throw Error('Timeout'); }));
  run.approve('run-1'); assert.equal((await run.execute()).status, 'blocked');
  await assert.rejects(run.execute()); assert.equal(count, 1);
});
test('handoff does not satisfy a confirmed dependency', async () => {
  let count = 0; const p = plan(); p.nodes.push({ ...p.nodes[0]!, id: 'followup', dependsOn: ['send'] });
  const run = new TaskRun(p, setup(async () => { count++; return { status: 'handoff', detail: 'Opened' }; }));
  run.approve(p.id); assert.equal((await run.execute()).status, 'blocked'); assert.equal(count, 1);
});
test('unconnected capabilities and cyclic dependencies are rejected', () => {
  assert.throws(() => new TaskRun(plan(), new CapabilityRegistry()), /not connected/);
  const p = plan(); p.nodes[0]!.dependsOn = ['send'];
  assert.throws(() => new TaskRun(p, setup(async () => ({ status: 'confirmed', detail: 'ok' }))), /Dependencies/);
});
test('cancelled plans cannot execute', async () => {
  const run = new TaskRun(plan(), setup(async () => ({ status: 'confirmed', detail: 'ok' })));
  run.cancel(); assert.throws(() => run.approve('run-1')); await assert.rejects(run.execute());
});
