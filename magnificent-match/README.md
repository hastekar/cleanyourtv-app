# Magnificent Match

A palace match-3 with three characters — the Sultan (Padişah), his Grand Vizier (Vezir) and his
Jester (Soytarı) — and a coin economy. Turkish and English. Web/PWA, Android and iOS (Capacitor).

## The economy, and the line it does not cross

Coins buy convenience and nothing else:

| What | Price |
| --- | --- |
| Continue with +5 moves | 900, then 1900, then 2900, … (+1000 each time in one attempt) |
| 3× Arrow, 3× Gunpowder (before a level) | 900 |
| 3× Sultan's Jewel (before a level) | 1900 |
| 3× Mallet, 3× Shuffle (during a level) | 900 |
| 3× Twin Arrows (during a level) | 1900 |

Coins are earned by winning (30–50 per win, +50 on a first clear, +500 on every tenth level) and
sold in six packs for real money. All numbers live in `src/app/economy.ts`.

What makes this not pay-to-win is enforced in code and tests, not just promised:

- Every level ships with a machine-found winning move list that spends nothing. Tests replay all 60.
- The level seed fixes the order pieces fall in. Spending, play time and win rate are not inputs
  to anything. A pre-level booster places its piece using a separate random stream, and a test
  checks the refill order is identical with and without boosters.
- No lives, no timers, no ads, no countdown on the continue offer, and "Give up" is always there.

Be aware of the tension: move limits were calibrated so a casual bot wins 50–92% of attempts
without help. Revenue will come from players who *want* to skip a retry, not from players who
are stuck. If you later tighten the limits to sell more continues, the fairness claims in the
game text and store listing stop being true and must be removed.

## Artwork

Everything on screen is original vector art written for this game, in `src/art/`:

| File | Contents |
| --- | --- |
| `characters.ts` | Sultan, Vizier, Jester — each with idle / happy / sad faces and separately animated head, arms, eyelids and props |
| `tiles.ts` | Six pieces (tulip, evil-eye bead, emerald, crescent, lantern, tile star), their Arrow and Gunpowder forms, the Sultan's Jewel, two chests, two carpets |
| `ui.ts` | Coin, six coin-pack drawings, booster icons, star, gear, lock, emblem |
| `backgrounds.ts` | Palace at dusk (loading, home), throne hall (game), treasury (shop) |

Animations are CSS (`src/app/style.css`: breathing, blinking, cheering, juggling, bells, pop-in
stars, spinning coin) and canvas (`board-view.ts`: swaps, clears, falls, blasts, shuffles).
This is code-drawn vector art in one consistent style; it is not hand-painted studio
illustration, and replacing any drawing means editing one function.

## Commands

```sh
npm ci
npm run dev
npm test           # engine, 60 level proofs, economy, wallet, save file
npm run build
npm run e2e        # plays the production build in headless Chromium (needs `playwright`)
npm run assets     # re-render icons, splash screens and store graphics from the art
```

## Real-money purchases — read before release

`src/app/billing.ts` talks to Google Play Billing / StoreKit through `cordova-plugin-purchase`.
**It has never been run against a store.** It compiles and the shop is wired to it, but before
release you must:

1. Create the six consumable products from `store/submission.md` in both consoles.
2. Test buy, cancel, failed payment, interrupted purchase (kill the app mid-payment) and
   reinstall with licence testers / sandbox accounts on real devices.
3. Decide about server-side receipt validation. Today coins are granted on the device when the
   store approves a transaction; that is normal for an offline game but can be cheated on
   rooted devices, and coins are lost if the player changes phone. Fixing either needs accounts
   and a server.

In a browser there is no store: packs show no price, cannot be bought, and no coins are granted.

## Releasing

Nothing here is signed or uploaded. See `../puzzle-game/README.md` → Releasing for the Android
and iOS steps; they are the same, with app id `app.magnificentmatch.game`. Check that the name
"Magnificent Match" is free to use (trademark search, both stores) before you commit to it.

The engine in `src/engine/` started as a copy of `../puzzle-game/src/engine/` with continue,
Twin Arrows and pre-level boosters added. If both games are kept, move it to a shared package.
