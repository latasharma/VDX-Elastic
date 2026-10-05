/** Simulated execution contracts. No function in this package performs phone actions. */
export type NodeStatus = 'pending' | 'running' | 'awaiting_approval' | 'succeeded' | 'failed' | 'cancelled';
export type NodeId = 'intent' | 'contact' | 'approval' | 'handoff' | 'evidence';
export interface RunNode { id: NodeId; label: string; capability: string; status: NodeStatus; }
export interface RunEdge { source: NodeId; target: NodeId; }
export interface Evidence { kind: 'simulated_handoff'; statement: string; simulated: true; callConnected: false; }
export interface RunEvent { runId: string; sequence: number; type: 'node.started' | 'node.completed' | 'approval.requested' | 'approval.granted' | 'run.cancelled' | 'node.failed'; nodeId: NodeId; evidence?: Evidence; }
export interface Run { id: string; intent: 'call.prepare'; simulated: true; nodes: RunNode[]; edges: RunEdge[]; lastSequence: number; events: RunEvent[]; evidence: Evidence[]; sync: 'current' | 'gap'; expectedSequence?: number; status: 'active' | 'awaiting_approval' | 'completed' | 'failed' | 'cancelled'; }
const definitions: Array<[NodeId, string, string]> = [
  ['intent', 'Understand request', 'intent.normalize'],
  ['contact', 'Resolve demo contact', 'contacts.resolve'],
  ['approval', 'Confirm calling handoff', 'approval.request'],
  ['handoff', 'Prepare simulated dialer', 'call.prepare'],
  ['evidence', 'Record outcome', 'evidence.record'],
];
export function createRun(id = 'demo-call-1'): Run {
  return { id, intent: 'call.prepare', simulated: true, nodes: definitions.map(([id, label, capability]) => ({ id, label, capability, status: 'pending' })), edges: definitions.slice(1).map((item, i) => ({ source: definitions[i]![0], target: item[0] })), lastSequence: 0, events: [], evidence: [], sync: 'current', status: 'active' };
}
/** Duplicate deliveries are ignored. A gap pauses reduction until the missing event is replayed. Invalid transitions throw. */
export function applyEvent(run: Run, event: RunEvent): Run {
  if (event.runId !== run.id) throw new Error('Event belongs to a different run');
  if (!Number.isSafeInteger(event.sequence) || event.sequence < 1) throw new Error('Invalid event sequence');
  if (event.sequence <= run.lastSequence) {
    const previous = run.events.find(item => item.sequence === event.sequence);
    if (!previous || previous.type !== event.type || previous.nodeId !== event.nodeId || previous.runId !== event.runId || previous.evidence?.kind !== event.evidence?.kind || previous.evidence?.statement !== event.evidence?.statement || previous.evidence?.simulated !== event.evidence?.simulated || previous.evidence?.callConnected !== event.evidence?.callConnected) throw new Error('Conflicting duplicate event');
    return run;
  }
  if (event.sequence !== run.lastSequence + 1) return { ...run, sync: 'gap', expectedSequence: run.lastSequence + 1 };
  if (run.status === 'completed' || run.status === 'cancelled' || run.status === 'failed') throw new Error('Run is terminal');
  const node = run.nodes.find(n => n.id === event.nodeId);
  if (!node) throw new Error('Unknown node');
  const dependenciesReady = run.edges.filter(e => e.target === node.id).every(e => run.nodes.find(n => n.id === e.source)?.status === 'succeeded');
  let status: NodeStatus = node.status;
  if (event.type === 'node.started') {
    if (node.status !== 'pending' || !dependenciesReady || node.id === 'approval') throw new Error('Node cannot start');
    status = 'running';
  } else if (event.type === 'approval.requested') {
    if (node.id !== 'approval' || node.status !== 'pending' || !dependenciesReady) throw new Error('Approval cannot be requested');
    status = 'awaiting_approval';
  } else if (event.type === 'approval.granted') {
    if (node.id !== 'approval' || node.status !== 'awaiting_approval') throw new Error('Approval was not requested');
    status = 'succeeded';
  } else if (event.type === 'node.completed') {
    if (node.status !== 'running') throw new Error('Node is not running');
    if (node.id === 'evidence' && !event.evidence) throw new Error('Evidence is required');
    status = 'succeeded';
  } else if (event.type === 'node.failed') {
    if (node.status !== 'running' && node.status !== 'awaiting_approval') throw new Error('Node is not active');
    status = 'failed';
  } else if (event.type === 'run.cancelled') status = 'cancelled';
  else throw new Error('Unknown event type');
  if (event.evidence && (node.id !== 'evidence' || event.type !== 'node.completed' || event.evidence.kind !== 'simulated_handoff' || event.evidence.simulated !== true || event.evidence.callConnected !== false)) throw new Error('Invalid simulation evidence');
  const nodes = run.nodes.map(n => event.type === 'run.cancelled' ? { ...n, status: n.status === 'succeeded' ? 'succeeded' as const : 'cancelled' as const } : n.id === node.id ? { ...n, status } : { ...n });
  return { ...run, nodes, events: [...run.events, { ...event, ...(event.evidence ? { evidence: { ...event.evidence } } : {}) }], evidence: event.evidence ? [...run.evidence, { ...event.evidence }] : [...run.evidence], lastSequence: event.sequence, sync: 'current', expectedSequence: undefined,
    status: event.type === 'run.cancelled' ? 'cancelled' : status === 'failed' ? 'failed' : nodes.every(n => n.status === 'succeeded') ? 'completed' : nodes.some(n => n.status === 'awaiting_approval') ? 'awaiting_approval' : 'active' };
}
export const simulatedEvidence: Evidence = Object.freeze({ kind: 'simulated_handoff', statement: 'Demo only: simulated dialer preparation. No phone action occurred and no call connected.', simulated: true, callConnected: false });
/** Stops at approval. The UI must explicitly call approveRun to continue. */
export function advanceRun(run: Run): Run {
  if (run.sync === 'gap' || run.status !== 'active') return run;
  const node = run.nodes.find(n => n.status !== 'succeeded');
  if (!node) return run;
  const type: RunEvent['type'] = node.id === 'approval' ? 'approval.requested' : node.status === 'pending' ? 'node.started' : 'node.completed';
  return applyEvent(run, { runId: run.id, sequence: run.lastSequence + 1, type, nodeId: node.id, ...(type === 'node.completed' && node.id === 'evidence' ? { evidence: simulatedEvidence } : {}) });
}
export function approveRun(run: Run): Run {
  if (run.sync === 'gap') throw new Error('Replay missing events before approval');
  return applyEvent(run, { runId: run.id, sequence: run.lastSequence + 1, type: 'approval.granted', nodeId: 'approval' });
}
export function cancelRun(run: Run): Run {
  if (run.sync === 'gap') throw new Error('Replay missing events before cancellation');
  return applyEvent(run, { runId: run.id, sequence: run.lastSequence + 1, type: 'run.cancelled', nodeId: run.nodes.find(n => n.status !== 'succeeded')?.id ?? 'evidence' });
}
