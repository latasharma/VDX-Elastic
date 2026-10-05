# Approved mobile design direction

On October 5, 2026, the user selected B: Bold & expressive.

Use violet primary controls, lime completed nodes, amber approvals, near-white surfaces and bold ink typography. Home and run views share this language on iOS and Android. Preserve readable text, accessible step navigation and explicit approvals.

The current implementation is an early simulation. Voice, messaging, memory persistence and actual device actions are not connected. Only the call simulation is available; other categories are marked coming soon. The current graph is sequential; branching, pan/zoom and server events remain planned.

Validation: TypeScript and 10 runtime tests pass. Platform JavaScript exports are separate from native binary compilation and physical-device testing. Native builds were paused for design review and are not yet ready to distribute.

Dependency audit previously reported 23 transitive findings (7 moderate, 16 high) after a non-breaking audit fix. These require triage before release.
