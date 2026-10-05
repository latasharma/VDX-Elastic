# VDX Android reuse audit

Date: 2026-10-05. Read-only source inspection; no Android build, downloaded application, or test suite was executed.

## Exact baseline

- Repository: https://github.com/luxurylifestyleco/vdx-android
- Default branch: `master`, inspected commit `1a1147c0a7c8fa0a2ba576f2c3357ae2aae5e1e0`.
- PR #1, execution perception fixes: merged on 2026-10-03.
- PR #2, startup/Sentry fix: open; head `fedd7f250efcd32f3bd97d21dba3821c5a659374`.
- PR #3, outcome verification/consent: open; head `6355ce48e907fb7ba4ba01bc3816ca13caa3a6ab`.
- This audit inspects master, not the two unmerged heads. Their capabilities must not be counted as delivered on master.
- GitHub reports `license: null`, and no license file was found. Public visibility does not establish permission to redistribute implementation. Confirm ownership/reuse rights before copying source. The initial Elastic implementation should remain independently authored from the agreed requirements.

## Reuse candidates

All source paths below are relative to the inspected repository.

| Area | Source evidence | Recommended migration |
| --- | --- | --- |
| Voice lifecycle | `app/src/main/java/com/vdx/BubbleForegroundService.kt` uses Android SpeechRecognizer and TTS; `sonic/SonicEngine.kt` connects cleanup, entity repair, parsing, policy and execution. | Keep lifecycle/interrupt/error requirements; implement shared Expo interface with platform-specific recognition. Do not port a foreground overlay service to iOS or assume system speech is always offline. |
| Intent parser | `sonic/voice/IntentParser.kt` uses explicit regex rules, unknown/clarification responses, cancellation and call confirmation. | Reimplement the narrow first-release grammar in shared TypeScript and add a public test corpus. Parser presence does not prove execution support. No broad language guarantee. |
| Entity repair | `sonic/voice/EntityRepairEngine.kt` uses app aliases, optional contacts, vocabulary and UI labels, with phonetic/substring matching. | Preserve clarification intent, but separate name matching from Android package/UI access. Ambiguous contacts require explicit selection; avoid silently changing targets. |
| External driver | No `DemoDriver` implementation found on master. `sonic/SonicEngine.kt:330` exposes `submitTask`, forwarding to `processText`. | Useful evidence of a text entry point; not a remote authenticated adapter. Build versioned request/result contracts, authentication and transport separately. |
| Voice safety | `sonic/executor/VoiceSafeActions.kt` has allow/confirm/block classifications; calls to `enforce` appear in SonicEngine. `PaymentBlocklist.kt` checks package names and text. | Reimplement policy as shared capability-level rules and enforce at the execution boundary. A lexical denylist is supplementary, not authorization. |
| Bound confirmation | `memory/ConfirmationToken.kt` binds action, draft hash, session, user, expiry and single use. `MemoryToActionPipeline.kt` validates a draft-note token before writing and reads the result back. | Reuse the design requirements. Existing tokens are in-memory and Bubble-specific; do not treat them as durable server authorization or a proven concurrency-safe implementation. |
| Memory | `memory/MemoryStore.kt`, node/edge/contradiction entities and DAOs, `DraftNoteStore.kt`; Room database version 5 with explicit migrations. Retrieval ranks local text matches, bounded to a small graph. | Define portable schema, scope isolation, correction/deletion and migration tests before adding Expo SQLite. This is a memory graph, not the execution node-tree UI. |
| Phone actions | Both `com/vdx/RobotHand.kt` and `com/vdx/sonic/robot/RobotHand.kt` exist. The former's call implementation opens ACTION_DIAL and only supplies a number when the input looks numeric. | Audit reachable execution paths before reuse. Do not assume named contacts are resolved or a call connected. Use explicit calling-handoff evidence. iOS needs supported native handoffs, not generic Android accessibility automation. |

Paths abbreviated as `sonic/...` and `memory/...` share the prefix `app/src/main/java/com/vdx/`.

## First-release implications

1. Keep the new shared request, approval, event and graph contracts independent of Android classes.
2. Build typed-number calling handoff with honest results first; resolve real contacts through platform permissions before claiming named-contact support.
3. Display simulated execution as simulated. A local UI transition or opening a URL is not proof of a connected call.
4. Port behaviour and regression cases selectively after confirming reuse rights; do not import the whole app or merge unrelated pending PRs.
5. Add contact ambiguity, stale approval, cancellation, denied permission, unavailable phone handler and failed handoff cases to physical-device acceptance tests.

## Unknowns requiring later verification

- Actual successful Android build, startup fix integration and physical-device compatibility.
- Current installed app's reachable RobotHand path and end-to-end cancellation coverage.
- The deck's DemoDriver may exist on another branch; it was not found in this baseline.
- Scope isolation in memory needs review: exact-name retrieval is inserted before the token-match scope filter. Do not expose this store as a multi-user backend unchanged.
- No iOS runtime or Expo bridge was demonstrated by this source inspection.
- No latency, speech accuracy, accessibility usability or reported test-count claims were reproduced.
- No evidence that the live execution node-tree UI, secure phone pairing, durable remote runtime or full Elastic capability registry is implemented by this Android repository.

## Source links

- [Pinned source tree](https://github.com/luxurylifestyleco/vdx-android/tree/1a1147c0a7c8fa0a2ba576f2c3357ae2aae5e1e0)
- [Merged PR #1](https://github.com/luxurylifestyleco/vdx-android/pull/1)
- [Open PR #2](https://github.com/luxurylifestyleco/vdx-android/pull/2)
- [Open PR #3](https://github.com/luxurylifestyleco/vdx-android/pull/3)
