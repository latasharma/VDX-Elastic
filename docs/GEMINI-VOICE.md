# Gemini voice implementation

Status: implemented; Edge Function and voice-rate-limit migration deployed to VDX Supabase. Anonymous endpoint test returns 401. Live verification on 2026-10-13 passed: authenticated token issuance (200), constrained WebSocket setup, and a generated PCM spoken reply. Temporary admin-created test accounts were removed; no confirmation emails were sent. Native microphone/playback testing remains pending. Existing TestFlight/Play builds do not contain this code.

## User flow

Tap the bubble, acknowledge that audio goes to Google Gemini, and grant microphone permission. Sign in to VDX first. Gemini listens, speaks, and asks follow-up questions. Tap again to end. The first implementation pauses input during playback, then resumes listening automatically; spoken interruption is not yet supported. Leaving the app, opening Account, changing tabs, an audio interruption, or signing out closes the session. Sessions end after nine minutes; there is no automatic reconnection or action retry.

Gemini can propose calls, SMS/WhatsApp handoffs, explicit memory saves, and memory searches. A proposal cannot approve or execute itself. The user reviews the proposal; phone actions still use the existing immutable runtime plan and final approval. Named recipients open the local contact picker. No address book is uploaded. Unsupported providers are explicitly unavailable. Adding Gemini does not grant Uber Eats or DoorDash access.

## Backend

For a new environment, apply `supabase/migrations/202610130001_voice_sessions.sql` and deploy `gemini-session`. VDX production has this migration applied. The two older request migrations were previously applied through SQL Editor and are not recorded in CLI migration history; do not blindly replay them with `db push`. The function verifies the bearer session with Supabase Auth, rate-limits each account to 12 session requests/hour, and mints a one-use Gemini token with a one-minute start window and ten-minute expiry. Model/system instruction/tool constraints are set on the token. The permanent API key is never sent to the app.

Required Supabase function secret: `GEMINI_API_KEY`. Optional: `GEMINI_LIVE_MODEL` (default `gemini-3.8-live`). Verify model availability for the billing project before release. Never set `EXPO_PUBLIC_GEMINI_API_KEY`.

The function uses the v1beta token endpoint and constrained Live WebSocket, verified with the configured key. The REST wire field is `bidiGenerateContentSetup` with the setup object directly inside it. `liveConnectConstraints` is an SDK field and was rejected by the live REST endpoint; do not copy it into the REST body. Model `gemini-3.8-live` accepted the session and returned PCM audio.

The client sends raw mono PCM in memory and plays 24 kHz PCM replies using `react-native-audio-api`. No recording files, transcript database, analytics content logs, or session-resumption history are created. Google processes the audio under its API terms; temporary storage in VDX is not a promise about Google's retention.

## Native release validation

1. Add the backend secret and verify authenticated token issuance; anonymous requests must return 401. No signup test emails are needed.
2. Install updated native dependencies (iOS pod install / Android EAS build). Expo Go and old native binaries cannot load this audio module. Do not ship this change as an OTA update to old binaries.
3. On each physical platform: allow/deny microphone; start/cancel during connection; converse through three follow-up turns; end during playback; lock/background while connecting and recording; open Account; sign out; interrupt with a call; disconnect networking.
4. Confirm the microphone indicator disappears and conversation text clears after ending. Confirm stopping never executes a proposal.
5. Ask to message a named contact: inspect the exact recipient/body and cancel first; repeat and approve a handoff. Delivery must remain unverified.
6. Ask for food ordering: the app must explain unavailable provider access and must never report an order placed.
7. Test with speaker, wired/Bluetooth headset and both permission states. Check the nine-minute limit and rapid repeat starts.

Automated checks: `npm test`, `npm run typecheck`, Expo iOS/Android export, and the PGlite migration suite (requires `PGLITE_MODULE`). Exports validate JavaScript bundling, not native compilation or real audio behavior.

References: https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens ; https://ai.google.dev/api/live ; https://docs.swmansion.com/react-native-audio-api/docs/inputs/audio-recorder/
