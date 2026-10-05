# Native validation readiness

Inspected 2026-10-05. VDX Elastic is an Expo/React Native mobile application targeting iOS and Android. A web preview is only supplementary; it does not validate a native build or phone actions.

## Confirmed local inventory

- Expo config has iOS bundle identifier and Android package `com.latasharma.vdxelastic`.
- Package scripts use `expo run:ios` and `expo run:android`; `expo-dev-client` is installed as a dependency.
- Xcode 27.0 (27A266a) is selected at `/Applications/Xcode.app/Contents/Developer`.
- CocoaPods executable is available.
- Java 21.0.10, Android platform-tools/adb and emulator executable are available.
- Android SDK platforms 29 and 36 are present; an Android 37.1 ARM64 Google APIs/Play Store system image is present.
- `emulator -list-avds` lists `Pixel_8`.
- iOS simulator runtime files for 26.2/26.4 and device configuration records exist locally. These records do not establish that the service can boot them.

## Current limitation

Read-only `xcrun simctl list` failed to connect to CoreSimulatorService in the current restricted execution environment and could not open its log file. This is not evidence that simulator runtimes are missing. Native boot/install validation requires a working simulator-service connection and any necessary filesystem permissions.

No simulator was booted, application installed, native project generated, SDK downloaded, paid service started, or native build run by this audit. Connected physical-device availability was not verified.

## Feasible validation sequence

1. Export/bundle both native JavaScript targets and run shared model tests. This checks code packaging only.
2. Generate native development projects in the project workspace, then inspect generated SDK/deployment targets against installed toolchains.
3. Build locally for an available Android emulator and iOS simulator. If required dependencies are uncached, report that a download is needed rather than representing the build as offline-ready.
4. Boot existing simulators when host access permits; install and exercise request entry, approval, cancellation, visual node tree, accessible Steps view and evidence details.
5. Test OS handoff failure honestly in simulators. A simulator does not establish a connected telephone call.
6. Validate the actual calling handoff, microphone/contacts permissions, lifecycle recovery, VoiceOver and TalkBack on physical phones before claiming the mobile milestone complete.

Local simulator builds are the intended first validation path; cloud build subscriptions and store publication are not prerequisites for that path. Physical iOS deployment still needs appropriate signing setup. Native project generation/build may require additional cache-directory access and uncached dependencies; toolchain presence alone does not prove a successful build.
