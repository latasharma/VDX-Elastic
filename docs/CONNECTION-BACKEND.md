# Connection backend — implementation and remaining gates

## Current implementation

The Node 24 backend in `apps/server` verifies VDX user JWTs against a configured HTTPS JWKS endpoint (issuer, audience and asymmetric algorithms checked). It stores requests and provider tokens in SQLite, encrypting their payloads with AES-256-GCM. OAuth linking uses PKCE, random one-use state and a ten-minute expiry. Provider credentials never go to the mobile app. Linking changes matching pending requests to `ready_to_plan`; it does not place an order or grant execution approval.

Endpoints: GET `/health`, authenticated GET `/connections`, POST `/requests`, GET `/requests/:id`, POST/DELETE `/connections/:provider`, and public state-validated GET `/oauth/:provider/callback`. No OAuth provider is enabled by default. There is no arbitrary URL/tool execution endpoint.

Run with Node 24, the environment variables in `apps/server/.env.example`, and `npm run server:start`. Environment variables must be provided by the shell or hosting secret manager; the server does not load `.env` automatically. The process binds to loopback and needs a TLS reverse proxy. Store the database on a private persistent volume; back up the vault key separately. Never expose the SQLite files through a static server.

An operator-supplied provider configuration is an array with `id`, `authorizationURL`, `tokenURL`, `clientId`, `clientSecret`, `scopes`, and `redirectURI`. Use only approved, documented provider endpoints. The current exchange uses client-secret POST; providers requiring other methods need an adapter. Tokens with absent/expired expiry are not reported as active. Refresh, remote revocation, provider-specific validation and key rotation are not implemented. Disconnect deletes locally saved authorization and in-progress linking; users should also revoke access in the provider account.

## Mobile flows

- `call Priya` or `message Priya: Running late` asks the user to choose a contact, then a phone number, then approve. This is manual disambiguation, not automatic name matching. Selected contact information stays on the device.
- `WhatsApp Priya: Running late` follows contact selection and approval, then opens WhatsApp with prepared text. WhatsApp requires a full international number. The user presses Send inside WhatsApp. There is no account linking, chat reading, delivery confirmation or automatic personal-account sending.
- Android requests read access when choosing a contact. Write access is blocked. iOS uses the native contact picker.
- Device flows run locally. The mobile app uses Supabase account sign-in, secure native session storage and saved requests. The separate Node OAuth prototype is not deployed or wired to the mobile app.

## Provider access gates (checked 7 October 2026)

- [Uber Consumer Delivery](https://developer.uber.com/docs/consumer-delivery/introduction): early access; detailed specifications and credentials require approval. No ordering adapter implemented.
- [DoorDash MCP](https://developer.doordash.com/en-US/docs/mcp/overview/about_mcp/): private beta for organizational ordering, explicitly not consumer-facing products. Do not enable for the consumer VDX app without provider authorization for that use case.
- Personal WhatsApp uses device handoff, not WhatsApp Business Cloud API impersonation.

## Not production-complete

Pending: hosting and identity provider; mobile sign-in/callback UX; real service adapters; MCP client and tool policy; conversational planner; durable execution and reconciliation; provider quote-bound approvals; rate limiting; observability and operational recovery; token refresh/revocation; device verification. Existing in-memory TaskRun remains separate from this connection store.

Tests use a mocked OAuth exchange and synthetic tokens. Passing them is not evidence of working Uber/DoorDash access. Do not label linking as a completed order.

## Supabase lifecycle deployment — 7 October 2026

Migration 202610070002 was applied through the authenticated VDX SQL editor. It adds owner-scoped retry keys, the vdx_save_request and vdx_cancel_request RPCs, and RLS-protected request status events. Existing inserts remain compatible with Android build 6. The current mobile source now uses the retry-safe RPC. Before submission it stores a request and fixed retry ID in chunked native SecureStore; reopening the account restores any unfinished save for explicit retry. The browser preview retains pending requests in memory only. Android build 6 predates this change and still uses direct inserts. Cancellation/history controls were added after build 6 was submitted and need a subsequent binary. Historical rows receive a current-state snapshot, not reconstructed history. This event table is not the complete node-tree evidence ledger.

PostgreSQL-compatible PGlite tests cover duplicate and conflicting retries, cross-user isolation, anonymous denial, forbidden status/evidence writes, and idempotent cancellation. Real-device session/recovery tests remain. Run supabase/tests/request-lifecycle.mjs with PGLITE_MODULE pointing to an installed PGlite entry.
