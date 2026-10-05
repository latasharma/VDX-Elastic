# Elastic development plan and team

> **5 October 2026 revision:** The current platform is Expo/React Native for iOS and Android together. The team consists of agent workstreams. Own-app tap-to-talk is the primary voice entry; Alexa is optional. [Expo and voice decision](Elastic-Expo-and-Voice-Decision.md) supersedes conflicting Android-only, Alexa sequencing, human staffing and schedule assumptions below. Unchanged Core, approval and evidence requirements still apply.

5 October 2026 · Proposed for approval · Based on Elastic Design Document v0.1

## Decision requested

Approve the staged plan below and authorize Step 1: inventory the existing repositories, reproduce the development baseline where tools permit, and produce an evidence-backed backlog. No implementation team has been hired or launched. The roster is a staffing proposal. Human hiring, spending, external accounts, release publication and later feature expansion are separate decisions.

The first product milestone is a web request that reaches Elastic Core, obtains phone confirmation, prepares the correct dialer through VDX, and reports the supported outcome in the live node tree. The user still presses Call. Alexa is the next driver after this path works; its feasibility is investigated early.

## Proposed full team

| Role | Staffing assumption | Accountability |
|---|---|---|
| Product owner | User, with weekly decision time | Audience, scope, feature priority, budget and release approval |
| Technical lead / backend engineer | 1 full-time | End-to-end architecture, Core/runtime, integration, technical decisions and code review |
| Android engineer | 1 full-time | VDX, pairing, command journal, contact resolution, permissions and phone lifecycle |
| Web engineer | 1 full-time | Request UI, node graph, equivalent accessible list, history and reconnect behaviour |
| QA / test automation engineer | 1 full-time | Contract and integration tests, failure injection, device matrix and release evidence |
| Accessibility designer / researcher | 0.5 full-time equivalent | Onboarding, TalkBack/keyboard flows, spoken interactions and user studies |
| Security / infrastructure engineer | 0.25 full-time equivalent | Identity, device credentials, account isolation, deployment, backups and operational review |
| Alexa / integrations specialist | 0.25 early; up to 1 during Alexa phase | Platform spike, account linking, voice session handling and adapter integration |
| Pilot participants | 5–8 compensated people; scheduled sessions | Real-world formative feedback from blind and low-vision users |

This is approximately 5 full-time equivalents during the core build, with integrations staffing increasing for Alexa. Some fractional roles may be combined by qualified people. The technical lead owns the whole working journey, not only the backend. QA and accessibility work start in the first week.

AI assistance may support implementation, test authoring, documentation and review. It does not replace physical-phone evidence, independent accessibility feedback, accountable release ownership or human hiring. If an AI-agent team is desired, assign bounded workstreams only after approval and repository isolation; this plan does not claim those agents are already running.

## Step-by-step delivery

### Step 1 — Establish what exists

Owner: technical lead, with Android engineer and QA. Target: first 3–5 working days.

1. Locate VDX, Elastic Core, existing adapters and node-tree code. Record repository and branch ownership.
2. Read repository instructions. Identify active work and preserve it.
3. Inspect current PR state and dependencies; do not assume the 3 October status is current.
4. Reproduce builds and relevant tests in an isolated development environment. Record missing SDKs, devices and credentials.
5. Trace the production request/execution paths and distinguish implemented, disconnected, stubbed and unverified behaviour.
6. Produce a reusable-code inventory, risk register, prioritized backlog and revised effort estimate.

Deliverable: baseline report with exact revisions, commands/results, blockers and a demo where possible.

Gate A: user reviews the baseline and confirms scope/resources before the implementation phases. A missing Elastic repository is recorded as unknown until confirmed absent; it is not assumed to require a rewrite.

### Step 2 — Resolve platform uncertainty and fix interfaces

Owners: lead, Android and integrations engineers; QA and accessibility reviewer. Target: week 2, with some investigation during Step 1.

1. Test remote request delivery when the phone is active, backgrounded, locked, disconnected and restarted.
2. Determine the evidence available for dialer preparation without broad new permissions.
3. Test the accessible notification-to-app handoff where Android requires user interaction.
4. Validate Alexa invocation, identity/account-linking options, session limits and delayed result handling against current official documentation and a development experiment.
5. Freeze version 1 of request, Intent IR, capability, command, approval and evidence schemas.
6. Agree on supported devices/languages and the precise completion claim.

Deliverables: short decision records, shared fixtures, interface schemas and prototype recordings/logs.

Exit: no unresolved assumption blocks the first calling journey. Touch-free calling or materially expanded permissions require a scope decision.

### Step 3 — Build the coordinator and device simulator

Owner: lead/backend engineer; QA verifies. Target: weeks 3–4.

1. Implement authenticated requests and a versioned capability registry.
2. Implement the fixed calling recipe, unresolved-contact handling and approval states.
3. Persist run state and events transactionally with outbound work.
4. Add deadlines, expiry, cancellation, retry classification and duplicate suppression.
5. Build a simulated phone that returns controlled success, failure, delay and uncertain outcomes.
6. Establish CI for contracts, runtime tests and reproducible builds.

Deliverable: an API demonstration where every meaningful run state can be reproduced.

Exit: restart, replay and changed-argument tests pass; approval bypasses fail closed.

### Step 4 — Build the live node tree and accessible web flow

Owner: web engineer with accessibility designer and QA. Target: weeks 3–5, parallel to Step 3 after schemas settle.

1. Build request entry and phone-status views.
2. Render recipe nodes and dependency edges using actual persisted events.
3. Show responsible node, status, time and redacted evidence.
4. Provide an equivalent ordered list for screen readers and keyboard users.
5. Add clarification, cancellation, history, reconnect and cursor replay.
6. Ensure the UI never equates command dispatch with verified completion.

Deliverable: a complete simulated journey and failure demonstrations, clearly labelled as simulation.

Exit: visual graph and accessible list reflect the same authoritative run state.

### Step 5 — Connect a physical VDX phone

Owner: Android engineer; backend integration owned jointly by the lead. Target: weeks 4–6.

1. Reuse and stabilize the relevant VDX production path.
2. Implement explicit pairing, credential storage and device revocation.
3. Add validated command receipt and a durable local execution journal.
4. Expose local contact resolution and dialer preparation as versioned capabilities.
5. Bind phone confirmation to exact action arguments and expiry.
6. Return acknowledgements and precise evidence; recover from disconnections without repeating uncertain actions.

Deliverable: web request → Core → phone approval → dialer handoff → node-tree outcome on a physical phone.

Gate B: demonstrate the supported happy path, wrong/ambiguous contact, denied permission, offline phone and cancellation. Do not unlock more features to compensate for an incomplete calling path.

### Step 6 — Complete voice and first-use experience

Owners: Android and web engineers with accessibility designer. Target: weeks 6–7.

1. Connect existing VDX speech input and speech output to the common contracts.
2. Make pairing, permissions, clarification and recovery independently usable.
3. Handle speech/TalkBack interaction, interruption, duplicate names and unsupported language/model availability.
4. Add history deletion and revocation controls.
5. Explain connected versus local processing accurately. Keep optional cloud AI out of the critical calling path.

Deliverable: a new pilot user can install, pair, ask, correct and complete the supported task.

Exit: accessibility review finds no blocking issue in the core journey.

### Step 7 — Harden and run a closed pilot

Owners: QA, accessibility researcher and security reviewer; engineers fix failures. Target: weeks 8–10.

1. Run the agreed physical-device matrix and at least 100 scripted task runs, recording denominators and device breakdowns.
2. Inject duplicate commands, crashes after dispatch, expired approval, revoked device, server restart and network loss.
3. Verify cross-account isolation, log redaction, retention/deletion and restore behaviour.
4. Run formative sessions with 5–8 compensated blind/low-vision users.
5. Fix blockers and produce a release-candidate evidence pack tied to one exact revision/build.

Proposed gates: at least 95% completion of the agreed task on supported configurations; zero wrong-recipient actions, approval bypasses or unsupported success claims in the agreed suite; zero unresolved release-blocking crashes. These are thresholds to test, not present results or universal guarantees. User-study findings are reported separately from scripted success rates.

Gate C: user reviews evidence and approves pilot distribution. Hosting/provider, paid services and participant arrangements must be agreed before commitments are made.

### Step 8 — Add Alexa through the same Core

Owners: integrations specialist and lead, with Android and QA support. Provisional: 2–4 additional weeks following the phone milestone, re-estimated after Step 2.

1. Build the chosen Alexa adapter and account association flow.
2. Translate Alexa requests to the same Intent IR and recipe.
3. Handle session expiry, clarification and truthful delayed results.
4. Preserve the existing phone-approval boundary for the first Alexa version.
5. Test shared-household identity and spoken disclosure of sensitive information.
6. Prepare platform submission materials if public distribution is chosen.

Deliverable: “Alexa, ask Elastic to prepare a call…” produces the same trace and evidence as web/VDX input. Phone interaction may still be required; do not market it as fully hands-free.

Gate D: user approves Alexa publication separately. Platform review time is outside engineering estimates.

### Step 9 — Expand capabilities one at a time

Owner: product owner prioritizes; lead assigns implementation ownership.

Proposed order: one approved read-only MCP integration to prove another node type; useful memory with correction/deletion; message preparation and channel-specific handoff; camera descriptions with guided capture and safety evaluation. Nano is optional where measured useful. TV is a separate workstream. WebMCP and A2A receive their own discovery and integration tasks when a concrete use case justifies them.

Each capability needs a manifest, data-flow/permission review, recipe, evidence semantics, failure tests, accessible interaction and an explicit release decision. No estimate for these is included in the calling pilot.

## Schedule and dependencies

The provisional core-pilot schedule is 10 weeks plus 2 weeks of contingency, measured from staffed kickoff and required access. It is an internal planning estimate, not a market benchmark or delivery promise. Extra frontend/QA capacity supports parallel work and stronger validation; it does not remove platform dependencies. The prior design's 8–12-week range is refined here into explicit steps, not independently verified.

Critical dependency chain: existing-code baseline → platform feasibility → schemas → runtime + VDX command path → physical-phone integration → accessibility pilot → release evidence. UI and simulator work can run in parallel after schema agreement. Alexa feasibility starts early; Alexa implementation follows the proven phone path.

If access or physical devices are unavailable, document the blocked item and continue independent work. Never present simulated evidence as physical-device verification.

## Backlog and working practices

Initial work packages:

| ID | Package | Depends on |
|---|---|---|
| E01 | Code inventory and reproducible baseline | Repository access |
| E02 | Android lifecycle and dialer-evidence experiments | E01, physical devices |
| E03 | Alexa feasibility | Chosen Alexa development environment |
| E04 | Versioned shared contracts | E01, E02 |
| E05 | Registry, fixed recipe, approvals and durable events | E04 |
| E06 | Phone simulator and failure fixtures | E04 |
| E07 | Node tree, accessible list and stream replay | E04, E06 |
| E08 | Phone pairing, credentials and journal | E02, E04 |
| E09 | Contact/dialer capabilities and evidence | E08 |
| E10 | Physical end-to-end integration | E05, E07, E09 |
| E11 | Voice and accessible onboarding | E10 |
| E12 | Security, reliability and pilot evidence | E10, E11 |
| E13 | Alexa adapter and validation | E03, E10 |

Every task records owner, dependency, acceptance criteria, test evidence and code revision. Each implementation change gets a review by someone other than its author. Changes to shared contracts require both backend and Android review. QA maintains failures, not just passing counts.

Use isolated work branches/checkouts, a controlled integration branch and automated checks. Integration is continuous; hold one weekly demonstration of the complete journey and a short written risk/decision update. Keep a feature freeze during release-candidate verification. Public release includes signed artifacts, known limitations, operational ownership and a rollback procedure.

## Resource and budget worksheet

Before hiring or spending, fill in actual rates and availability. Proposed budget formula:

`sum(role weekly cost × allocated weeks) + devices + participant compensation + hosting/monitoring + release costs + contingency`.

Suggested financial contingency for planning: 15–20%, subject to user approval. This is a proposed reserve, not an assessed quote. Keep Alexa and later capabilities as separate budget lines. No vendor fees or staffing rates have been researched or committed.

Initial resources: repository access, Android development tools, at least two physical Android configurations with a broader pilot matrix, test accounts/contact data, and a designated decision-maker. Choose specific devices from the intended audience before purchases.

## Approval checkpoints

- **Now:** approve the plan as a proposed direction and authorize Step 1 only.
- **Gate A:** approve revised implementation scope, named staffing, resources and estimate after the audit.
- **Gate B:** accept the physical end-to-end milestone or prioritize fixes.
- **Gate C:** approve pilot distribution based on evidence.
- **Gate D:** approve Alexa publication if pursued.

Routine implementation within an approved phase proceeds without repeated permission requests. Scope changes, spending and external publication remain explicit decisions. These checkpoints are proposed because the user requested a reviewable plan and approval before execution.

## Required node tree workstream — 5 October update

The [node tree implementation specification](Elastic-Design-Document.md#node-tree-implementation--required-in-the-first-release) is now part of the build scope. Deliver actual connected-node visualizations on Expo iOS, Expo Android and web, plus equivalent accessible lists. Begin NT1 schemas and fixtures during shared-contract work, NT2 projection during Core work, and NT3/NT4 renderers during client foundation work. Integrate NT5 physical-device evidence before the end-to-end gate; NT6 independent review is required before pilot. All six packages are defined in the design document. This corrects the prior mobile-list-only wording.

## Latest VDX deck comparison — 5 October 2026

See [VDX deck versus development plan](VDX-Deck-Plan-Comparison.md) for slide-by-slide coverage and proposed migration packages MIG1–MIG7. The audit must trace the eight-stage pipeline, contact-name repair, shared voice/action policy, structured memory, DemoDriver and armed/disarmed availability. Reuse working Kotlin components behind Expo native modules where appropriate. Both iOS and Android participate from the first device milestone; Android-only automation is not a shared capability promise. Reported 243-test results and feature counts remain unverified until reproduced against an exact revision. These audit additions do not authorize merging or expanding the first-release feature scope.
