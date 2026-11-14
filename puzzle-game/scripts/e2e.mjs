// End-to-end check of the production build in a real browser at phone size:
// plays levels with real pointer gestures and fails on any console error.
import { createRequire } from 'node:module';

// Playwright is taken from wherever it is installed (project or global NODE_PATH).
const { chromium, devices } = createRequire(import.meta.url)('playwright');
import { preview } from 'vite';
import { mkdirSync } from 'node:fs';

const shots = process.env.SHOTS || '';
if (shots) mkdirSync(shots, { recursive: true });
const server = await preview({ preview: { port: 4871, strictPort: true }, logLevel: 'silent' });
const url = 'http://localhost:4871/?e2e';
const browser = await chromium.launch();
const errors = [];
let failed = false;
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failed = true;
};

async function open(device, locale) {
  const ctx = await browser.newContext({ ...devices[device], locale });
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url);
  return { ctx, page };
}
const shot = async (page, name) => shots && page.screenshot({ path: `${shots}/${name}.png` });
const idle = (page) => page.waitForFunction(() => !window.__lumo.busy(), null, { timeout: 30000 });
const status = (page) => page.evaluate(() => window.__lumo.state()?.status);

async function swipe(page, a, b) {
  const [p, q] = await page.evaluate(([a, b]) => [window.__lumo.center(a), window.__lumo.center(b)], [a, b]);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move((p.x + q.x) / 2, (p.y + q.y) / 2);
  await page.mouse.move(q.x, q.y);
  await page.mouse.up();
}

/** Plays the open level with random legal swipes until it ends. */
async function playOut(page, pick = (m) => m[0]) {
  let n = 0;
  while ((await status(page)) === 'playing') {
    const moves = await page.evaluate(() => window.__lumo.moves());
    const before = await page.evaluate(() => window.__lumo.state().movesLeft);
    const m = pick(moves);
    await swipe(page, m.a, m.b);
    await idle(page);
    const after = await page.evaluate(() => window.__lumo.state().movesLeft);
    if (after !== before - 1) throw new Error(`swipe ${m.a}->${m.b} did not spend a move`);
    if (++n > 200) throw new Error('level did not end');
  }
  return status(page);
}

// --- Turkish phone: first run, tutorial, level 1, persistence, back button ---
{
  const { ctx, page } = await open('Pixel 7', 'tr-TR');
  check((await page.textContent('.home-top p')) === 'Adil eşleştirme bulmacası', 'Turkish is picked from the device language');
  await shot(page, '01-home-tr');
  await page.click('.home-play button');
  check(await page.isVisible('#modal .sheet'), 'first run shows how to play');
  await page.click('#modal button');
  await page.waitForTimeout(400);
  await shot(page, '02-level1');

  // an illegal swipe must bounce and cost nothing
  const st = await page.evaluate(() => {
    const s = window.__lumo.state();
    const legal = new Set(window.__lumo.moves().flatMap((m) => [m.a + ',' + m.b, m.b + ',' + m.a]));
    for (let i = 0; i < s.w * s.h - 1; i++) if ((i + 1) % s.w && !legal.has(i + ',' + (i + 1))) return { a: i, b: i + 1, moves: s.movesLeft };
  });
  await swipe(page, st.a, st.b);
  await idle(page);
  check((await page.evaluate(() => window.__lumo.state().movesLeft)) === st.moves, 'illegal swipe costs no move');

  // tap-tap also swaps
  const first = (await page.evaluate(() => window.__lumo.moves()))[0];
  for (const i of [first.a, first.b]) {
    const p = await page.evaluate((i) => window.__lumo.center(i), i);
    await page.mouse.click(p.x, p.y);
  }
  await idle(page);
  check((await page.evaluate(() => window.__lumo.state().movesUsed)) === 1, 'tap then tap on a neighbour swaps');
  await shot(page, '03-midgame');

  // hammer booster
  await page.click('.boosters button:first-child');
  const c = await page.evaluate(() => window.__lumo.center(8));
  await page.mouse.click(c.x, c.y);
  await idle(page);
  check((await page.evaluate(() => window.__lumo.save().hammer)) === 2, 'hammer is spent when used');
  if ((await status(page)) === 'playing') {
    await page.click('.boosters button:last-child');
    await idle(page);
    check((await page.evaluate(() => window.__lumo.save().shuffle)) === 2, 'shuffle is spent when used');
  }

  // system back pauses, second back leaves
  if ((await status(page)) === 'playing') {
    await page.goBack();
    check(await page.isVisible('#modal .sheet'), 'back button pauses the game');
    await shot(page, '04-pause');
    await page.click('#modal button.primary');
  }
  const end = await playOut(page, (m) => m[Math.floor(m.length / 2)]);
  await page.waitForSelector('#modal .sheet');
  await shot(page, `05-${end}`);
  check(end === 'won' || end === 'lost', `level 1 ended (${end})`);

  // keep playing until level 1 is won, then check it is saved across a reload
  let guard = 0;
  while ((await status(page)) !== 'won' && guard++ < 8) {
    await page.click('#modal button.primary');
    await playOut(page, (m) => m[0]);
    await page.waitForSelector('#modal .sheet');
  }
  check((await status(page)) === 'won', 'level 1 can be won by a naive player within a few tries');
  await shot(page, '06-won');
  await page.reload();
  const best = await page.evaluate(() => window.__lumo.save().best['1']);
  check(best && best.stars >= 1, 'progress survives a reload');
  check(!(await page.isDisabled('.grid button:nth-child(2)')), 'level 2 is unlocked');
  check(await page.isDisabled('.grid button:nth-child(3)'), 'level 3 is still locked');
  await shot(page, '07-home-progress');

  // settings: switch language
  await page.click('.home-foot button:last-child');
  await shot(page, '08-settings');
  await page.click('.seg button:last-child');
  await page.click('#modal button.primary');
  check((await page.textContent('.home-top p')) === 'The fair match puzzle', 'language switch applies');
  await ctx.close();
}

// --- Every level opens, lays out and plays on a small phone and a tablet ---
for (const device of ['iPhone SE', 'iPad Mini']) {
  const { ctx, page } = await open(device, 'en-US');
  await page.evaluate(() => {
    const best = {};
    for (let i = 1; i <= 60; i++) best[i] = { stars: 1, score: 1 };
    localStorage.setItem('lumo-match.save.v1', JSON.stringify({ v: 1, best, fails: {}, hammer: 3, shuffle: 3, sound: true, haptics: true, assist: true, lang: 'en', device: 'a'.repeat(32), seenHowTo: true }));
  });
  await page.reload();
  let fits = true;
  for (let id = 1; id <= 60; id++) {
    await page.click(`.grid button:nth-child(${id})`);
    await page.waitForTimeout(60);
    const box = await page.evaluate(() => {
      const c = document.querySelector('canvas').getBoundingClientRect();
      const b = document.querySelector('.boosters').getBoundingClientRect();
      const g = document.querySelector('.goals').getBoundingClientRect();
      return { w: c.width, top: c.top, bottom: c.bottom, left: c.left, right: c.right, vw: innerWidth, vh: innerHeight, foot: b.top, goals: g.bottom, footEnd: b.bottom };
    });
    if (!(box.w >= 200 && box.left >= 0 && box.right <= box.vw && box.top >= box.goals - 1 && box.bottom <= box.foot + 1 && box.footEnd <= box.vh + 1)) {
      fits = false;
      console.log('layout problem on level', id, box);
    }
    const moves = await page.evaluate(() => window.__lumo.moves());
    await swipe(page, moves[0].a, moves[0].b);
    await idle(page);
    if (id === 28 || id === 44) await shot(page, `level${id}-${device.replace(' ', '')}`);
    if (await page.isVisible('#modal .sheet')) await page.click('#modal button.ghost');
    else {
      await page.click('.pause');
      await page.click('#modal button.ghost');
    }
  }
  check(fits, `${device}: all 60 boards fit between HUD and boosters`);
  await ctx.close();
}

check(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
await browser.close();
await server.close();
process.exit(failed ? 1 : 0);
