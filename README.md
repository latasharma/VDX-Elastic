# VDX Elastic

A mobile-first Expo application for iOS and Android, with an execution node tree that shows what happened at each step.

## Current build

The first development milestone is an interactive **simulation**, not a phone controller. It uses a fictional contact and never accesses your microphone, contacts, phone dialer or external tools.

- Visual connected-node view and an accessible Steps view.
- An explicit approval gate before simulated calling handoff.
- Node details, ordered event history and labelled simulation evidence.
- Cancellation and a deterministic, tested run-state reducer.
- Shared React Native UI and TypeScript contracts.

Not connected yet: authentication, server persistence, device pairing, speech recognition, native phone actions, Siri, Alexa or MCP tools. A successful demo means only that the simulation completed.

## Run locally

Use Node 24 and npm. Install dependencies with `npm ci`.

```sh
npm run ios     # native iOS development build
npm run android # native Android development build
npm test
npm run typecheck
npm run export:all
```

For native development builds, use `npm run ios` or `npm run android` with the appropriate Xcode/Android SDK and device configuration. Native build and physical-phone validation are separate release gates; a passing web build does not establish them.

## Layout

- `apps/mobile/App.tsx`: shared Expo application, graph and step views.
- `packages/run-model/src`: deterministic simulation contracts, reducer and tests.
- `docs`: architecture, migration audit and build plan.

## Plan

Start with [current Expo decisions](docs/Elastic-Expo-and-Voice-Decision.md), [design and node-tree specification](docs/Elastic-Design-Document.md), and [VDX reuse audit](docs/VDX-REUSE-AUDIT.md). Earlier planning sections have explicit supersession notices.

The next milestone is a durable Core API and secure device pairing, followed by separately verified iOS/Android calling handoffs. No connected-call claim is made from opening a phone UI.

## Source provenance

This foundation is newly written for VDX-Elastic. The existing public VDX repository was inspected as a reference, but its source was not copied. Its reuse/license status needs resolution before importing code.

A browser preview (`npm run web`) is an optional developer aid, not the mobile product or a substitute for native validation.
