# VDX Supabase setup

Project: https://hwlawgdhhgmbxbyhnvlg.supabase.co

Configured locally. Public Auth settings and JWKS were verified: email sign-in enabled, signups enabled, ES256 signing. The user reported applying the request-table migration and checking RLS enabled with three policies. Backend functions are not deployed; authenticated cross-user isolation still needs testing. No test user was created.

1. Configure the app with the project URL and publishable (or legacy anon) key from the project's Connect dialog. Never use a service-role/secret key in an Expo public variable.
2. Inspect existing project tables, policies and Auth settings before applying the migration in `supabase/migrations`. It creates only `vdx_requests`; user isolation is enforced with RLS, and clients cannot change workflow status.
3. Email/password sign-in, account creation and device-local sign-out are wired in the mobile Account panel. Native sessions use Expo SecureStore; browser previews use memory only. End-to-end authentication still needs a tester. Email confirmation uses the project’s existing confirmation settings; return to the app and sign in after confirmation. Password recovery is not implemented yet.
4. Verify the signing algorithm. The existing Node server accepts RS256/ES256 using the project's public JWKS. Projects still using legacy HS256 need server-side Auth validation or a deliberate signing-key migration; do not silently change existing project keys.
5. Provision a server or Supabase Edge Functions for provider OAuth callbacks and execution. The current Node HTTP server with SQLite is not a Supabase Edge Function and has not been migrated to Postgres. The SQL migration alone does not complete that migration.
6. Test two distinct accounts for isolation, sign-in/out, expired sessions, pending-request recovery and denied linking before release.

The public project URL alone does not grant management access or provider authorization. Provider OAuth secrets must remain in backend secret storage. Supabase sign-in authenticates VDX users; it does not automatically connect WhatsApp, Uber Eats or DoorDash.

The publishable key is configured in ignored `.env.local`. Configure the same public variables in EAS before a cloud build; the local file is not committed. Native secure storage requires rebuilding the app. Supabase account sign-in is separate from provider OAuth and does not enable unavailable services.
