// End-to-end check of the production build in a real browser at phone size: real pointer
// gestures, the coin economy, the continue offer, the shop, and no console errors.
import { createRequire } from 'node:module';
import { preview } from 'vite';
import { mkdirSync } from 'node:fs';

const { chromium, devices } = createRequire(import.meta.url)('playwright');
const shots = process.env.SHOTS || '';
if (shots) mkdirSync(shots, { recursive: true });
const server = await preview({ preview: { port: 4873, strictPort: true }, logLevel: 'silent' });
const url = 'http://localhost:4873/?e2e';
const browser = await chromium.launch();
const errors = [];
let failed = false;
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failed = true;
};
const KEY = 'magnificent-match.save.v1';
const seed = (over = {}) => {
  const best = {};
  for (let i = 1; i <= (over.cleared ?? 0); i++) best[i] = { stars: 1, score: 1 };
  return JSON.stringify({ v: 1, best, coins: over.coins ?? 1000, inv: over.inv ?? { rocket: 1, bomb: 1, rainbow: 1, hammer: 2, shuffle: 2, cross: 1 }, granted: [], sound: true, haptics: true, lang: over.lang ?? 'tr', seenHowTo: true });
};

async function open(device, locale, save) {
  const ctx = await browser.newContext({ ...devices[device], locale });
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  if (save) await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [KEY, save]);
  await page.goto(url);
  await page.waitForSelector('.home:not([hidden])');
  return { ctx, page };
}
const tap = (page, sel) => page.click(sel, { force: true });
const shot = async (page, name) => { if (shots) { await page.waitForTimeout(350); await page.screenshot({ path: `${shots}/${name}.png` }); } };
const idle = (page) => page.waitForFunction(() => !window.__mm.busy(), null, { timeout: 30000 });
const st = (page) => page.evaluate(() => { const s = window.__mm.state(); return s && { status: s.status, movesLeft: s.movesLeft, movesUsed: s.movesUsed }; });
const sv = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__mm.save())));

async function swipe(page, a, b) {
  const [p, q] = await page.evaluate(([a, b]) => [window.__mm.center(a), window.__mm.center(b)], [a, b]);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move((p.x + q.x) / 2, (p.y + q.y) / 2);
  await page.mouse.move(q.x, q.y);
  await page.mouse.up();
}
async function playOut(page, pick) {
  let n = 0;
  while ((await st(page)).status === 'playing') {
    const moves = await page.evaluate(() => window.__mm.moves());
    const before = (await st(page)).movesLeft;
    const m = pick(moves);
    await swipe(page, m.a, m.b);
    await idle(page);
    if ((await st(page)).movesLeft !== before - 1 && (await st(page)).status !== 'won') throw new Error('swipe did not spend a move');
    if (++n > 200) throw new Error('level did not end');
  }
  await page.waitForSelector('#modal .sheet');
  return (await st(page)).status;
}

// --- First run in Turkish: loading, home, pre-level, tutorial, play, win, persistence ---
{
  const { ctx, page } = await open('Pixel 7', 'tr-TR');
  check((await page.textContent('.play.huge')) === 'Seviye 1', 'Turkish is picked from the device language');
  await shot(page, '02-home');
  await tap(page, '.play.huge');
  await shot(page, '03-prelevel');
  await tap(page, '.pick:nth-child(1)');
  await tap(page, '.sheet .play');
  check((await sv(page)).inv.rocket === 0, 'a picked pre-level booster is spent at the start');
  check(await page.evaluate(() => window.__mm.state().tiles.some((t) => (t >> 3) === 1)), 'the Arrow piece is on the board');
  await shot(page, '04-howto');
  await tap(page, '.sheet .play');
  await shot(page, '05-game');

  const bad = await page.evaluate(() => {
    const s = window.__mm.state();
    const legal = new Set(window.__mm.moves().flatMap((m) => [m.a + ',' + m.b, m.b + ',' + m.a]));
    for (let i = 0; i < s.w * s.h - 1; i++) if ((i + 1) % s.w && !legal.has(i + ',' + (i + 1))) return { a: i, b: i + 1, moves: s.movesLeft };
  });
  await swipe(page, bad.a, bad.b);
  await idle(page);
  check((await st(page)).movesLeft === bad.moves, 'illegal swipe costs no move');

  await tap(page, '.booster:nth-child(1)');
  let c = await page.evaluate(() => window.__mm.center(8));
  await page.mouse.click(c.x, c.y);
  await idle(page);
  check((await sv(page)).inv.hammer === 1, 'Mallet is spent when used');
  if ((await st(page)).status === 'playing') {
    await tap(page, '.booster:nth-child(3)');
    c = await page.evaluate(() => window.__mm.center(14));
    await page.mouse.click(c.x, c.y);
    await idle(page);
    check((await sv(page)).inv.cross === 0, 'Twin Arrows is spent when used');
    await shot(page, '06-midgame');
  }
  if ((await st(page)).status === 'playing') {
    await page.goBack();
    check(await page.isVisible('#modal .sheet'), 'back button pauses the game');
    await shot(page, '07-pause');
    await tap(page, '#modal .play');
  }
  let end = (await st(page)).status === 'playing' ? await playOut(page, (m) => m[0]) : (await st(page)).status;
  let guard = 0;
  while (end !== 'won' && guard++ < 8) {
    await tap(page, '#modal .plain'); // give up
    await tap(page, '#modal .play'); // retry -> pre-level
    await tap(page, '#modal .play'); // play
    end = await playOut(page, (m) => m[0]);
  }
  check(end === 'won', 'level 1 can be won without spending coins');
  await shot(page, '08-win');
  const s1 = await sv(page);
  check(s1.coins > 1000 && s1.best['1'].stars >= 1, `winning pays coins (${s1.coins})`);
  await page.reload();
  await page.waitForSelector('.home:not([hidden])');
  const s2 = await sv(page);
  check(s2.coins === s1.coins && !!s2.best['1'], 'coins and progress survive a reload');
  check((await page.textContent('.play.huge')) === 'Seviye 2', 'level 2 is unlocked');
  await ctx.close();
}

// --- Economy: continue offer prices, buying boosters, the shop without a store ---
{
  const { ctx, page } = await open('Pixel 7', 'en-US', seed({ coins: 5000, cleared: 9, lang: 'en', inv: { rocket: 0, bomb: 0, rainbow: 0, hammer: 0, shuffle: 0, cross: 0 } }));
  await tap(page, '.topbar .coins');
  await shot(page, '09-shop');
  check((await page.locator('.pack:disabled').count()) === 6, 'coin packs cannot be bought where there is no store');
  await tap(page, '.pack:nth-child(1)').catch(() => {});
  check((await sv(page)).coins === 5000, 'no coins are ever granted without a store purchase');
  await tap(page, '.shop-row .buy >> nth=0');
  let s = await sv(page);
  check(s.coins === 4100 && s.inv.rocket === 3, 'booster pack: 3 for 900 coins');
  await tap(page, '#modal .col .plain');

  // lose level 10 on purpose (it is the first hard level), then check the continue prices
  await tap(page, '.row2 .plain:nth-child(1)');
  await shot(page, '10-levels');
  await tap(page, '.grid .node:nth-child(10)');
  await tap(page, '#modal .play');
  let end = await playOut(page, (m) => m[m.length - 1]);
  let tries = 0;
  while (end === 'won' && tries++ < 5) {
    await tap(page, '#modal .plain');
    await tap(page, '.row2 .plain:nth-child(1)');
    await tap(page, `.grid .node:nth-child(${10 - tries})`);
    await tap(page, '#modal .play');
    end = await playOut(page, (m) => m[m.length - 1]);
  }
  check(end === 'lost', 'a level was lost for the continue test');
  await shot(page, '11-continue-offer');
  check((await page.textContent('#modal .buy.wide .price')).replace(/\D/g, '') === '900', 'first continue costs 900');
  const before = (await sv(page)).coins;
  await tap(page, '#modal .buy.wide');
  await idle(page);
  let now = await st(page);
  check(now.status === 'playing' && now.movesLeft === 5 && (await sv(page)).coins === before - 900, 'continue takes 900 coins and gives 5 moves');
  end = await playOut(page, (m) => m[m.length - 1]);
  if (end === 'lost') {
    check((await page.textContent('#modal .buy.wide .price')).replace(/\D/g, '') === '1900', 'second continue costs 1900');
    await tap(page, '#modal .buy.wide');
    await idle(page);
    end = await playOut(page, (m) => m[m.length - 1]);
  }
  if (end === 'lost') {
    check((await page.textContent('#modal .buy.wide .price')).replace(/\D/g, '') === '2900', 'third continue costs 2900');
    const c0 = (await sv(page)).coins;
    await tap(page, '#modal .buy.wide');
    await page.waitForSelector('.sheet.shop');
    check((await sv(page)).coins === c0 && (await st(page)).status === 'lost', 'a continue the player cannot afford charges nothing and opens the shop');
    await tap(page, '#modal .col .plain');
    await tap(page, '#modal .col .plain');
    await shot(page, '12-lose');
  }
  await ctx.close();
}

// --- Every level opens, lays out and plays on a small phone and a tablet ---
for (const device of ['iPhone SE', 'iPad Mini']) {
  const { ctx, page } = await open(device, 'en-US', seed({ cleared: 60, lang: 'en' }));
  let fits = true;
  for (let id = 1; id <= 60; id++) {
    await tap(page, '.row2 .plain:nth-child(1)');
    await tap(page, `.grid .node:nth-child(${id})`);
    await tap(page, '#modal .play');
    await page.waitForTimeout(60);
    const box = await page.evaluate(() => {
      const c = document.querySelector('canvas').getBoundingClientRect();
      const b = document.querySelector('.boosters').getBoundingClientRect();
      const g = document.querySelector('.bar').getBoundingClientRect();
      return { w: c.width, top: c.top, bottom: c.bottom, left: c.left, right: c.right, vw: innerWidth, vh: innerHeight, foot: b.top, bar: g.bottom, footEnd: b.bottom };
    });
    if (!(box.w >= 200 && box.left >= 0 && box.right <= box.vw && box.top >= box.bar - 1 && box.bottom <= box.foot + 1 && box.footEnd <= box.vh + 1)) {
      fits = false;
      console.log('layout problem on level', id, box);
    }
    const moves = await page.evaluate(() => window.__mm.moves());
    await swipe(page, moves[0].a, moves[0].b);
    await idle(page);
    if (id === 44) await shot(page, `13-level44-${device.replace(' ', '')}`);
    if (!(await page.isVisible('#modal .sheet'))) await tap(page, '.game .round');
    await tap(page, '#modal .col .plain:last-child');
    await page.waitForSelector('.home:not([hidden])');
  }
  check(fits, `${device}: all 60 boards fit between HUD and boosters`);
  await ctx.close();
}

check(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
await browser.close();
await server.close();
process.exit(failed ? 1 : 0);
