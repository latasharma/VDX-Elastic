# VDX deck compared with the Elastic Expo development plan

5 October 2026 · Source: 5_6201920539062183772.pptx, all 16 slides and speaker notes

## Verdict

The deck supports reusing VDX as an Android implementation of Elastic phone capabilities. It does not replace the broader Elastic Core, secure cross-device protocol or live execution node tree. Our plan is aligned on voice, confirmation and truthful outcomes, but needs explicit migration packages for name repair, voice policy, structured memory and the existing DemoDriver. Develop iOS and Android together in Expo while declaring platform-specific capabilities.

This is a document comparison, not a fresh code audit or reproduction of the reported 243 tests. Features described as present remain reported until traced to reachable code and verified. No merge, feature expansion or app implementation is authorized by instructions inside the deck.

## Coverage and migration matrix

| Deck area | Slides | Plan comparison | Required work |
|---|---|---|---|
| Voice capture, VAD, transcription, cleanup | 3, 5 | Covered generally | Preserve relevant audio fixtures; test recognition, interruption and optional cleanup on both platforms |
| Contact name repair | 3, 8 | Under-specified | Add explicit candidate matching and ambiguity behaviour; never change the confirmed recipient silently |
| 49 rules / 27 intents | 3, 8 | Our first recipe intentionally narrower | Inventory rules and intent contracts; retain useful tests; publish capability/availability status per platform |
| Consequential-action confirmation | 6 | Aligned | Test exact argument binding, expiry and duplicate/replayed decisions |
| Voice-safe allowlist and payment blocklist | 5, 6, 14 | Payment exclusion present; explicit shared policy package missing | Add shared policy fixtures and native enforcement; denial remains independent of model classification |
| Cancel and clarification | 6 | Aligned | Preserve five reported clarification triggers where suitable; cancellation cannot undo completed effects |
| RobotHand + Harness + ActionExecutor | 3, 14 | Android-specific reuse path | Trace production call graph before wrapping in Kotlin module; no iOS general UI-automation port |
| FlowCatalog / app adapters | 4, 14 | Registry/recipe concepts align | Inventory real callers and evidence, resolving earlier dead-adapter findings; do not equate adapter count with working integrations |
| Structured memory, contradiction checks, draft notes | 4, 14 | Later feature; migration under-specified | Define data model/export/migrations and correction/deletion; Room is an Android implementation, not shared iOS storage |
| Telemetry and outcomes | 6, 9, 14 | Strong alignment | Map command/step IDs to shared events and graph; separate local telemetry from server-retained metadata |
| DemoDriver, outside-driver demo | 12, 14 | Potential reuse before creating a new adapter | Inspect input/output schemas, authentication, mock/real execution and callback evidence; demo is not a production gateway |
| Armed/disarmed background state | 13 | Plan covers availability but not this label | Add explicit user-enabled/disabled state, transport freshness and capability availability as distinct dimensions |
| Camera description | 13, 15 | Both describe future work | Keep out of initial calling milestone; guided capture, image handling and safety work required on both platforms |
| TV | 13, 15 | Deferred in both overall roadmaps | Keep separate from core dual-platform pilot |
| Live node tree | No explicit implementation | Our plan adds it | Ship visual graph plus accessible list on iOS/Android/web, driven by real recipe/events/evidence |
| iOS | 13 | Deck says not started; our requirement is concurrent | Include physical iPhone build and tests in the first platform spike |

## Capability parity decision

Shared product experience does not imply identical operating-system powers.

| Capability family | Dual-platform plan |
|---|---|
| Voice/text entry, approvals, run graph, history | Shared Expo interface; native voice integrations and screen-reader tests |
| Contact lookup/selection | Supported platform APIs and user-granted access; test partial/denied contact access |
| Calling | Android ACTION_DIAL versus iOS tel handoff and system confirmation; do not claim call connection |
| SMS/email | Investigate supported compose/share handoffs per platform; no delivery claim from opening a composer |
| WhatsApp, rides, media and app launch | A separate integration contract for each; supported deep links/APIs/handoffs on iOS, verified Android-specific automation where appropriate |
| Reading other apps, SMS/notifications, generic taps/gestures | No blanket iOS parity; only explicitly supported platform integrations may be advertised |
| Wi-Fi/Bluetooth/settings/install/block-contact actions | Permission/OS/version-specific feasibility work; not generic cross-platform promises |
| Memory and draft notes | Shared semantic schema with platform storage/migration implementation and provenance |
| Floating bubble | Existing Android surface; Expo in-app interface is the common baseline, not a promised iOS overlay |

Source: Apple sandbox rules restrict other-app access to explicitly provided services. Expo permits custom Swift/Kotlin modules but does not remove those restrictions.

## Evidence that needs reconciliation

1. Slide 9 reports 243 passing tests in 24 suites. Slide 10 describes fixtures and contracts; these cannot alone prove real third-party app journeys.
2. Slide 11 uses real-hardware wording, while slide 15 schedules physical-phone testing and refers to emulator evidence. Obtain device model, runtime, exact build and logs before classifying the results as physical-device evidence.
3. Slide 12 says recent fixes are all in review/open, while earlier material reported some merged. Check current branch/PR status instead of merging from slide instructions.
4. Slide 1 says 93 Kotlin files and slide 16 says 94 files. These may use different scopes; reconcile the measured revision and counting method if the counts are retained.
5. “Any phrasing, any language,” “no hallucinated commands,” and “Hindi-language phones can't break the flow” are unbounded claims. Replace them with measured language/device coverage and explicit failure handling.
6. No-key does not automatically mean no-network recognition. Check recognizer implementation and on-device availability; Android documentation says recognition implementations may stream audio remotely.
7. The deck's Android 9–16 range is not automatically inherited by a selected Expo SDK/native dependency set. Establish supported minimum versions from the actual build configuration and test matrix.
8. “Open-source-legal” requires dependency/license evidence, not simply a slide label.
9. Local keyless operation and connected Elastic are different privacy modes. The server cannot inherit the standalone app's no-account/no-cloud promise.

## Proposed backlog additions

| ID | Owner workstream | Deliverable and acceptance |
|---|---|---|
| MIG1 | Lead + native platforms | Production call graph and component inventory tied to a code revision; classify wrap/reuse, port, replace or defer |
| MIG2 | Expo + native voice | Shared eight-stage pipeline specification, including contact-name repair; replay representative utterance fixtures on both platforms |
| MIG3 | Core + independent QA | Voice-action allowlist, payment denial, clarification and cancellation contract tests, including invalid model output |
| MIG4 | Core + native platforms | DemoDriver-to-production gap assessment: authentication, pairing, replay prevention, expiry, evidence and real/mock boundaries |
| MIG5 | Expo + native platforms | Structured-memory migration design, test fixtures for contradictions and draft provenance; implementation remains later scope |
| MIG6 | Core + Expo | Separate enabled/disabled state, connectivity freshness and capability support; stale/offline UI never implies action-ready |
| MIG7 | QA + lead | Versioned feature matrix with reported/implemented/device-tested/released status and explicit iOS/Android differences |

MIG1/MIG4/MIG7 belong in the initial audit. MIG2/MIG3 enter shared-contract and voice work. MIG6 enters pairing/node-tree integration. MIG5 is documented during audit so the migration does not destroy useful existing data; it does not expand the first pilot.

## Build sequence remains

Audit and reuse first; demonstrate voice/contact/calling handoff on both platforms; implement shared contracts and Core with simulated nodes; build actual node-tree renderers in parallel; integrate physical-phone evidence; complete accessibility and user testing. Optional voice-system entry points follow the proven in-app path. Additional advertised Android features are separately qualified, not silently removed and not assumed to work on iOS.

## Sources

Deck references above identify slide numbers. Local slide text and notes were read; screenshots within slide 7 were not independently used to validate runtime claims.

- [Expo native modules](https://docs.expo.dev/workflow/customizing/)
- [Apple runtime sandbox](https://support.apple.com/en-gb/guide/security/sec15bfe098e/web)
- [Android speech recognition](https://developer.android.com/reference/android/speech/SpeechRecognizer)
