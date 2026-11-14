# Store submission answers

| Question | Answer |
| --- | --- |
| Category | Games → Puzzle |
| Price | Free |
| In-app purchases | **Yes** — six consumable coin packs (ids below) |
| Ads | None |
| Account / sign-in | None |
| Google Play Data safety | The app itself collects nothing. Purchases are handled by Google Play Billing; declare "Purchase history" as processed by Google if the form asks. |
| App Store privacy label | Data Not Collected by the app (purchases are handled by Apple) |
| Tracking (ATT) | No |
| Encryption | No non-exempt encryption (`ITSAppUsesNonExemptEncryption = false` is set) |
| Age rating | Answer the questionnaires truthfully: no violence, no user content, no gambling; **does** have in-app purchases |
| Target audience (Play) | 13+ recommended. An app with purchases aimed at children brings the Families policy and extra purchase rules |
| Permissions | Android: INTERNET, BILLING |
| Privacy policy URL | Host `PRIVACY.md` publicly and enter the URL in both consoles |

## In-app products to create in both consoles (type: consumable)

| Product id | Coins |
| --- | --- |
| `coins_1000` | 1 000 |
| `coins_5000` | 5 000 |
| `coins_10000` | 10 000 |
| `coins_25000` | 25 000 |
| `coins_50000` | 50 000 |
| `coins_100000` | 100 000 |

You set the prices in the consoles; the game shows whatever the store returns, in the player's
currency. Nothing in the code contains a price in real money.

## Legal points for a game that sells virtual currency

Check these for each country you publish in — this is a list of things to look up, not legal advice:

- Clear disclosure of in-app purchases in the listing (both stores require it).
- Refund and withdrawal rights for digital content (EU/UK/TR consumer law).
- Rules on purchases by minors; consider the stores' purchase-authentication settings.
- Tax: both stores collect VAT in most countries, but you still have reporting duties.

## Graphics in `store/graphics/`

- `play-icon-512.png`, `play-feature-1024x500.png`, `appstore-icon-1024.png`
- `screenshots/` — phone screenshots taken from the real build by the end-to-end test

Still needed from you: iPhone 6.9" and iPad 13" screenshots at Apple's exact sizes.
