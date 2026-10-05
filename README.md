# VDX Elastic — mobile early access 0.2

Expo / React Native for iOS and Android. Approved expressive violet/lime design.

## Working flows
- Type a constrained request or dictate an editable English transcript.
- `remember I parked on level 2` saves local persistent memory.
- `find memory parked` searches saved notes by substring.
- `call +12025550123` asks approval, then hands the number to the operating system's phone interface.
- `message +12025550123: I am on my way` asks approval and opens the native SMS composer. You control sending there.
- Node states and result receipts reflect actual storage and device adapter responses; unknown SMS outcomes remain unverified.
- Memory tab supports deletion with confirmation.

Example numbers are placeholders. Replace them before testing actual communication. No contact-name lookup or arbitrary language assistant is implemented. Speech may use the OS provider's online services. Memory uses ordinary app storage (not a secrets vault); no cloud sync. Run history is session-only.

## Development
Use Node 24, `npm ci`, then `npm run typecheck` and `npm test`.
Native module changes require a fresh native build; Expo Go and the 0.1 demo binary are insufficient.

Generate native projects with `npx expo prebuild`; preserve local signing/customizations before regeneration. Then `npm run ios` or `npm run android`. For Xcode open `ios/VDXElastic.xcworkspace` after CocoaPods installation, select your team and use Release for a standalone app.

EAS profiles: preview for an internal phone build, simulator for iOS Simulator. Device signing is required for iPhone.

## Scope
This is a local execution slice, not the complete Elastic server. MCP adapters, server orchestration, durable run replay, multi-device pairing and branching node layout remain planned. Legacy simulation model/tests remain as reference; the app now uses local intent/action adapters.

See docs/TESTING-0.2.md for the acceptance walkthrough. Native build success and physical-device validation are tracked separately. Dependency audit has outstanding transitive findings; this is not approved for public release.
