# 0.2 functional preview acceptance

Install a new 0.2 native build. The old 0.1 APK and simulator app remain simulations.

1. Enter `remember I parked on level 2`, submit, and check the actual storage receipt.
2. Force-close/reopen, visit Memory and verify the note remains.
3. Enter `find memory parked`; confirm the saved text appears. Search an absent word and verify no matches.
4. Delete a note from Memory, confirm deletion, restart and check it stays deleted.
5. Tap to speak, grant permissions, dictate a supported command and review/correct text before submission. Deny permission on a fresh install and verify typing still works. Leaving Home or backgrounding should stop listening.
6. Enter `call` followed by your intended real phone number. Cancel approval: no handoff should occur. Repeat and approve: the OS phone interface should open. Elastic must not claim connection.
7. Enter `message <your test number>: <body>`. Confirm both recipient and body at approval, then inspect the native composer. Cancel it; the run should show cancelled on platforms that report that outcome. Unknown results must show unverified, not delivered.
8. Try `call Papa`, malformed numbers and unsupported requests: show useful errors with no native action.
9. Tap approval quickly twice: only one handoff should occur.
10. Repeat with large text, VoiceOver/TalkBack and offline memory use.

Phone/SMS require a physical device with appropriate services. Simulator inability to call is expected and must produce an error, not a success receipt. OS speech availability varies; online processing can occur. No contacts permission is requested because this version accepts phone numbers directly.

Memory is ordinary app-local storage; don't save credentials or secrets. Runs are session-only. This is a constrained local assistant, not a general-purpose AI service.
