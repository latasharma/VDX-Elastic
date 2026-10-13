# VDX 0.3.0 — Gemini voice test

This release needs a new native installation. Old TestFlight/Play builds do not contain Gemini audio support.

Android APK build: https://expo.dev/accounts/latasharma/projects/vdx-elastic/builds/4a016695-f64d-41c8-930e-449faf3b9e39 (build 7; finished successfully).
Direct APK: https://expo.dev/artifacts/eas/2Wqu-LzgxdwXuef1zzHHBtBjDXWWogChDlKLcER2XeA.apk
iOS: version 0.3.0, build 8 archived successfully and uploaded to Apple on October 13, 2026. TestFlight processing/availability has not yet been verified. Upload warnings reported missing dSYMs for prebuilt React, Hermes, and audio codec frameworks; upload itself succeeded.

1. Sign in to VDX with your existing account.
2. Tap the voice bubble. Review the Gemini notice and allow the microphone.
3. Say “Help me write a WhatsApp message.” Let VDX ask who and what to say.
4. VDX listens again after each reply. Tap the bubble to end at any time. Speech interruption during replies is not included yet.
5. Review the proposed text, choose your contact, and inspect the final recipient before approving. You still tap Send inside WhatsApp.
6. Try cancelling, denying the microphone, losing network, and leaving/locking the app. No task should execute; the microphone must stop when VDX leaves the foreground.

Food-ordering services are still unavailable. Gemini must explain that honestly, not claim it placed an order. Conversations are temporary in VDX; only explicitly approved memory saves persist locally.

Report the phone model, OS version, app version/build, exact steps, and whether you saw an error. Do not include passwords or API keys.
