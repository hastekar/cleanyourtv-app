# Lumo Match

A match-3 puzzle built on one promise: **the game never works against the player.**

- Every one of the 60 levels ships with a machine-found winning move list that uses no
  boosters. The test suite replays all 60 on every change.
- The order tiles fall in is fixed by the level seed. Nothing about the player — spending,
  play time, win streak — feeds into it.
- No purchases, no ads, no lives, no timers, no account, no data collection.
- The only difficulty adjustment is visible and only ever helps: a few extra moves after
  repeated losses on the same level (can be turned off).

Turkish and English. Runs as a web app/PWA and, through Capacitor, as an Android and an iOS app.

## Layout

| Path | What |
| --- | --- |
| `src/engine/engine.ts` | Deterministic game rules. No DOM, no clock, no `Math.random`. |
| `src/engine/bots.ts` | Bot players used to verify and calibrate levels. |
| `src/engine/assist.ts` | The extra-moves rule. |
| `src/engine/verify.ts` | Replays a claimed run from the seed (used by the backend). |
| `src/levels/levels.json` | The 60 levels with their proofs. Generated — do not edit by hand. |
| `src/levels/report.json` | Bot win rates per level, for review. |
| `src/app/` | Canvas view, input, screens, sound, save file, translations. |
| `convex/` | Optional Convex backend that verifies and stores scores. |
| `android/`, `ios/` | Capacitor projects. |
| `store/` | Store listing text, submission answers, icons, screenshots. |
| `scripts/` | Level generator, asset renderer, browser end-to-end test. |

## Commands

```sh
npm ci
npm run dev        # local dev server
npm test           # engine, all level proofs, save file, run verifier
npm run build      # typecheck + production web build into dist/
npm run e2e        # plays the production build in headless Chromium (needs `playwright`)
npm run levels     # regenerate levels.json (deterministic)
npm run assets     # re-render icons and splash screens (needs `playwright`)
```

## How a level is made

`scripts/generate-levels.ts` picks a layout and goals, then lets bots play it a few hundred
times. Bots only see what a person sees: their look-ahead runs on a copy of the board with a
scrambled random generator, so they cannot peek at upcoming tiles. The move limit is set so
that a *casual* bot (half its moves random) wins a target share of attempts — about 92% on the
first levels, falling to about 62%, and 50% on every tenth level. The shortest winning run is
stored as the level's proof.

What the proof does and does not say: it shows a winning line exists for that seed without
boosters. It does not say the line is easy to find; the bot win rates in `report.json` are the
difficulty estimate, and they come from bots, not from people. Expect to retune after real
players have tried it.

## Releasing

Nothing here is signed and nothing has been uploaded to any store. You need your own
developer accounts and signing keys.

**Before the first release**

1. Check that the name "Lumo Match" and the id `app.lumomatch.game` are free for you to use
   (trademark search, both stores). To change the id: `capacitor.config.ts`,
   `android/app/build.gradle` (`namespace`, `applicationId`), the Android package directory,
   and the bundle identifier in Xcode.
2. Put a contact address in `PRIVACY.md` and host it at a public URL.

**Android (Google Play)** — needs Android Studio or the Android SDK, and JDK 21.

```sh
npm run android                      # build web + copy into android/
cd android && ./gradlew bundleRelease
```

Sign the bundle with your upload key (Play App Signing), upload
`app/build/outputs/bundle/release/app-release.aab` to an internal testing track first, fill in
the listing from `store/`, then promote. New personal Play accounts must run a closed test
with 12 testers for 14 days before production access.

**iOS (App Store)** — needs a Mac with Xcode and an Apple Developer membership.

```sh
npm run ios
npx cap open ios
```

Select your team under Signing & Capabilities, Archive, upload to App Store Connect, test with
TestFlight, then submit. Take the iPhone and iPad screenshots in the simulator.

**Web** — upload `dist/` to any static host (HTTPS). It installs as a PWA and works offline.

## Optional score backend (Convex)

Off by default. To enable: `npx convex dev` in this folder to create a deployment, then build
with `VITE_CONVEX_URL=<deployment url>`. The client sends the list of actions of each won
level with a random device id; `convex/runs.ts` replays them with the same engine and stores
the replayed score, so a score cannot be invented. This path is typechecked and its verifier
is unit-tested, but it has not been run against a live deployment. Turning it on means the
app sends data: update `PRIVACY.md` and the stores' data forms first.
