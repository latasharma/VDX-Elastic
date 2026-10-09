# Spoken WhatsApp flow — device acceptance

Implemented in shared Expo source for iOS and Android. This change has not yet been packaged into a new TestFlight build or APK. JavaScript exports are not installable builds.

1. With WhatsApp installed, tap the voice control and say “WhatsApp Priya that I’m running late.”
2. Choose Priya in the native contact picker and select an international-format number. Verify the original message survives selection. Contact information stays on the device.
3. Verify the approval sheet and spoken reply identify the selected recipient and exact message.
4. Tap “Say yes or no,” then say “yes.” WhatsApp should open with the correct recipient and prepared text. Tap Send in WhatsApp to actually send; VDX must report only a handoff, never verified delivery.
5. Repeat with “no,” manual Cancel, and backgrounding during approval recognition. None should open WhatsApp.
6. Say “yes, change the message” at approval. VDX should ask for a clear answer and not execute.
7. Test denied microphone/contact access, contact without a phone number, a number without country code, and WhatsApp absent. Check readable errors and no successful-send claims.
8. Double-tap approval: only one handoff should occur. Return from WhatsApp; it must not repeat automatically.

Voice approval uses a final recognition result tied to the pending plan. It requires tapping the approval microphone; VDX does not continuously listen in the background. The parser supports specific spoken patterns, not unrestricted conversational planning. Other provider integrations remain separate work.

## Request recovery (source after Android build 6)

Sign in and save a cloud request with connectivity disabled or interrupted. Reopen VDX and the Account panel: the pending text and provider should reappear. Retry after reconnecting; there must be one server row and one initial event. Sign out and use another account: the first account's pending text must not appear or submit. Return to the original account to recover it. Cancel a saved request, refresh, and verify its cancelled status and history persist. A retry never places an order. Browser preview pending state is intentionally memory-only.
