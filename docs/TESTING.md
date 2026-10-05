# Testing the mobile preview

## Scope
The first preview is a standalone native Expo app using the approved violet/lime design. It runs a fictional call-preparation simulation. It does not access contacts, record audio, send messages or place calls.

## Acceptance walkthrough (both platforms)
1. Launch the app: the Home screen shows the bold design and simulation notice.
2. Tap **Try the call demo**. The node tree advances and stops at approval.
3. Wait: no further nodes should execute without approval.
4. Tap **Approve simulation** once or repeatedly: the run completes once.
5. Select the evidence node and confirm it says no real phone action occurred.
6. Start another demo and cancel at approval: remaining steps must stay cancelled.
7. Switch between Home and Your run and between Node tree and Accessible steps.
8. Repeat with large system text and VoiceOver/TalkBack; controls and approval text must remain accessible.
9. Close and reopen: demo state resets (persistence is not implemented).

## Android
The local ARM64 APK is a release-mode preview signed with the generated development key, not a store release. It includes its JavaScript bundle and does not need Metro. It targets modern 64-bit Android phones, Android 7.0+; physical-device validation is pending. Transfer the APK to your phone and permit installation from the app opening it.

Reproduce locally after npm ci:
```sh
npx expo prebuild --platform android --no-install
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a -Pkotlin.compiler.execution.strategy=in-process
```

## iPhone
Use the EAS preview profile for a signed ad hoc build. Sign in to Apple through the EAS terminal prompts, register the test iPhone with eas device:create, then run eas build --platform ios --profile preview. Do not paste passwords or signing keys into chat.

The simulator profile produces a Mac iOS Simulator app, which cannot install on an iPhone.

## Build profiles
- preview: standalone APK or signed iPhone internal build
- simulator: standalone iOS Simulator build
- production: reserved for later store distribution; not release-approved

Expo project: https://expo.dev/accounts/latasharma/projects/vdx-elastic

## Verified build status — October 5, 2026
- Android ARM64 release-mode APK: compiled successfully (547 Gradle tasks), signature verified.
- Android package SHA-256: 5134b1054c19a6f76cb8362c85a7672e549d15da76e9e92c7886a8fa3cc3daea.
- Download: https://github.com/latasharma/VDX-Elastic/releases/tag/v0.1.0-preview.1
- Emulator launch could not be validated: installed emulator exits with code 132 before ADB sees a device, including a cold-start retry.
- iOS CocoaPods installation succeeded. Local xcodebuild failed to load the workspace in the sandbox; no local native iOS build was produced.
- iOS Simulator EAS build: https://expo.dev/accounts/latasharma/projects/vdx-elastic/builds/e1f0b07d-ef24-4c95-a499-4a7d6cc8628e (submitted; completion pending).
- iPhone EAS build: blocked because no suitable signing credentials are configured.
