# Store submission answers

Answers below describe the default build (no `VITE_CONVEX_URL`). If you turn score sync on,
redo the data sections: the app then sends an anonymous device ID and gameplay actions.

| Question | Answer |
| --- | --- |
| Category | Games → Puzzle |
| Price | Free |
| In-app purchases | None |
| Ads | None |
| Account / sign-in | None |
| Google Play Data safety | No data collected, no data shared |
| App Store privacy label | Data Not Collected |
| Tracking (ATT) | No |
| Encryption (export compliance) | No non-exempt encryption (`ITSAppUsesNonExemptEncryption = false` is set) |
| Age rating | Everyone / 4+ (no violence, no user content, no gambling, no web access) |
| Target audience (Play) | 13+ is the simplest choice; choosing under-13 brings the Families policy review |
| Permissions | Android: INTERNET only (required by the web view; the default build makes no network requests) |
| Privacy policy URL | Host `PRIVACY.md` at a public URL and enter it in both consoles |
| Support URL / email | Yours to provide |

## Graphics in `store/graphics/`

- `play-icon-512.png` — Google Play icon
- `play-feature-1024x500.png` — Google Play feature graphic
- `appstore-icon-1024.png` — App Store icon (no alpha channel)
- `screenshots/` — phone screenshots (1080×2400-class) taken from the real build

Still needed from you: iPhone 6.9" and iPad 13" screenshots at Apple's exact pixel sizes (take
them in the Xcode simulator), and tablet screenshots if you list tablet support on Google Play.
