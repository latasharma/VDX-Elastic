/** Platform-independent capability runtime. Providers, not UI labels, determine outcomes. */
export type Outcome = { status: 'confirmed' | 'handoff' | 'cancelled' | 'unknown'; detail: string; reference?: string };
export type Capability = {
  id: string;
  title: string;
  effect: 'read' | 'write';
  execute(input: Readonly<Record<string, string>>, context: { idempotencyKey: string }): Promise<Outcome>;
};
export type Node = { id: string; capability: string; input: Record<string, string>; dependsOn: string[] };
export type Plan = { id: string; summary: string; nodes: Node[] };
export type Evidence = { sequence: number; nodeId: string; state: 'waiting' | 'running' | Outcome['status']; detail: string; at: string; reference?: string };
export type Snapshot = { plan: Plan; status: 'approval' | 'ready' | 'running' | 'complete' | 'cancelled' | 'blocked'; evidence: Evidence[] };

export class CapabilityRegistry {
  private entries = new Map<string, Capability>();
  register(capability: Capability) {
    if (this.entries.has(capability.id)) throw Error(`Duplicate capability: ${capability.id}`);
    this.entries.set(capability.id, Object.freeze({ ...capability }));
  }
  get(id: string) { return this.entries.get(id); }
  list() { return [...this.entries.values()].map(({ id, title, effect }) => ({ id, title, effect })); }
}

/** One in-memory run; durable server execution and provider reconciliation remain separate work. */
export class TaskRun {
  private value: Snapshot;
  private listeners = new Set<(snapshot: Snapshot) => void>();
  private capabilities = new Map<string, Capability>();
  constructor(plan: Plan, registry: CapabilityRegistry) {
    const copy: Plan = JSON.parse(JSON.stringify(plan));
    if (!copy.id || !copy.summary || !copy.nodes.length) throw Error('A named, nonempty plan is required.');
    const seen = new Set<string>();
    for (const node of copy.nodes) {
      if (!node.id || seen.has(node.id)) throw Error('Node IDs must be unique.');
      if (node.dependsOn.some(id => !seen.has(id))) throw Error('Dependencies must precede their consumers.');
      const capability = registry.get(node.capability);
      if (!capability) throw Error(`Capability is not connected: ${node.capability}`);
      this.capabilities.set(node.id, capability);
      seen.add(node.id);
    }
    this.value = { plan: copy, status: copy.nodes.some(n => this.capabilities.get(n.id)!.effect === 'write') ? 'approval' : 'ready', evidence: [] };
  }
  snapshot(): Snapshot { return JSON.parse(JSON.stringify(this.value)); }
  subscribe(listener: (snapshot: Snapshot) => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }
  private publish() { for (const listener of this.listeners) { try { listener(this.snapshot()); } catch { /* UI failures must not replay effects. */ } } }
  private record(nodeId: string, state: Evidence['state'], detail: string, reference?: string) {
    this.value.evidence.push({ sequence: this.value.evidence.length + 1, nodeId, state, detail, at: new Date().toISOString(), reference });
    this.publish();
  }
  approve(planId: string) {
    if (planId !== this.value.plan.id || this.value.status !== 'approval') throw Error('Approval does not match the pending plan.');
    this.value.status = 'ready';
    this.publish();
  }
  cancel() {
    if (!['approval', 'ready'].includes(this.value.status)) throw Error('This run cannot be cancelled before execution anymore.');
    this.value.status = 'cancelled'; this.publish();
  }
  async execute(): Promise<Snapshot> {
    if (this.value.status !== 'ready') throw Error('Run requires approval or has already started.');
    this.value.status = 'running'; this.publish();
    for (const node of this.value.plan.nodes) {
      const unresolved = node.dependsOn.some(id => !this.value.evidence.some(e => e.nodeId === id && e.state === 'confirmed'));
      if (unresolved) {
        this.value.status = 'blocked';
        this.record(node.id, 'waiting', 'A dependency has no confirmed outcome.');
        return this.snapshot();
      }
      this.record(node.id, 'running', 'Adapter execution started.');
      let result: Outcome;
      try {
        result = await this.capabilities.get(node.id)!.execute(Object.freeze({ ...node.input }), { idempotencyKey: `${this.value.plan.id}:${node.id}` });
        if (!result || !['confirmed', 'handoff', 'cancelled', 'unknown'].includes(result.status) || typeof result.detail !== 'string') throw Error('Invalid provider outcome.');
      } catch {
        // A timeout may follow a successful remote write. Never retry or infer failure.
        result = { status: 'unknown', detail: 'The adapter did not return a verified outcome. Check the service before trying again.' };
      }
      this.record(node.id, result.status, result.detail, result.reference);
      if (result.status === 'unknown' || result.status === 'cancelled') {
        this.value.status = result.status === 'cancelled' ? 'cancelled' : 'blocked';
        this.publish(); return this.snapshot();
      }
    }
    this.value.status = 'complete'; this.publish(); return this.snapshot();
  }
}
