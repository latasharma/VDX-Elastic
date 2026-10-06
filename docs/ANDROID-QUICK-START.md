# VDX Elastic — Android testing quick start

**For team testers · 6 October 2026 · APK version 0.2.1 (build 3)**

## 1. Download on your Android phone

Open this link in your phone’s browser:

**[Download the Android APK](https://expo.dev/artifacts/eas/SKCMkc05ulV5EVBXmAh5Figi09c_E0oNbleVk3er58A.apk)**

You do not need Expo Go, Android Studio, or a GitHub account. This is a standalone test app, not a Play Store release.

## 2. Install and open

1. After the download finishes, open the `.apk` file from Downloads.
2. If Android asks, allow **Install unknown apps → Allow from this source** for the browser or file manager you used. Wording varies by phone. Only install the APK linked above; do not disable Play Protect.
3. Tap **Install**, then **Open**. You can turn off “Allow from this source” afterward.
4. Tap **Tap to speak** and allow microphone/speech access when requested. You can also type. Speech recognition uses your phone’s service and may require internet access.

## 3. Try these checks

| Try | Expected result |
| --- | --- |
| Type `remember I parked on level 2`, then **Review request** | A saved-memory result appears. |
| Close and reopen the app. Type `find memory parked` | The saved note is returned. |
| Tap **Tap to speak** and say “remember my meeting is at three” | Your words appear. Review the transcript, then submit. |
| Type `call YOUR_PHONE_NUMBER` | Review/approval appears before opening the dialer. Cancel first to verify nothing opens. |
| Type `message YOUR_PHONE_NUMBER: Testing VDX` | Review/approval appears before the SMS composer. You control sending in the composer. |
| Open **Your run** and select a node | The app shows the action’s status and evidence. |

Replace `YOUR_PHONE_NUMBER` with your own or a consenting teammate’s number, including country code where appropriate. Calls and SMS may incur carrier charges. Opening a dialer or composer does not prove a call connected or a message was delivered.

## 4. Know what is in this build

**Included:** microphone input, typed requests, local memory, phone/SMS handoffs, approval and run details.

**Not included:** the newer blue cloud, spoken replies, connection popups, contact-name lookup, WhatsApp, service account linking, food ordering, or general conversational task execution. Those features are either newer source changes or still unfinished. Do not expect “order a pizza” to work in this APK. Notes stay on the device in ordinary app storage; do not save passwords or sensitive information.

## 5. Troubleshooting and feedback

- **App not installed:** an older preview may use a different signing key. Record any notes you need before uninstalling it; uninstalling deletes local memories. Then install again.
- **No voice input:** check Android Settings → Apps → VDX Elastic → Permissions → Microphone. Try typing if speech remains unavailable.
- **Download blocked:** verify you used the exact link above. If Android reports a security problem, report it rather than bypassing protection.
- **Report a problem:** send the team your phone model, Android version, app version **0.2.1 (3)**, exact steps, expected/actual result, and a screenshot. Remove phone numbers and personal messages before sharing.

[Source code](https://github.com/latasharma/VDX-Elastic) · [Expo build details](https://expo.dev/accounts/latasharma/projects/vdx-elastic/builds/c1e4f84d-e47c-40ee-851b-eded3bace481)
