import './style.css';
import {
  applyAction, createGame, findMoves, goalsRemaining, makeTile, starsFor, KIND_BOMB, KIND_LINE_H,
  type Action, type GameEvent, type GameState, type Goal, type LevelDef,
} from '../engine/engine';
import { LEVELS } from '../levels';
import { BoardView } from './board-view';
import { dataUrl, preload } from './sprites';
import { detectLang, getLang, line, num, setLang, t } from './i18n';
import { addCoins, freshSave, grantPurchase, load, persist, spend, storageWorks, totalStars, unlocked, type Lang, type Save } from './store';
import { BOOSTERS, COIN_PACKS, boosterDef, continuePrice, winReward } from './economy';
import { billing } from './billing';
import { setSound, sfx, suspendAudio, unlockAudio } from './audio';
import { jester, sultan, vizier, type Mood } from '../art/characters';
import { carpetSvg, crateSvg, rainbowSvg, tileSvg } from '../art/tiles';
import { coin, coinPack, crossIcon, emblem, gear, hammerIcon, lock, plusMovesIcon, shuffleIcon, star, type BoosterId } from '../art/ui';
import { hall, palace, treasury } from '../art/backgrounds';

const VERSION = '1.0.0';

/* ---------- small DOM helpers ---------- */

type Child = Node | string | null | false;
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> & { class?: string } = {},
  ...kids: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  const { class: cls, ...rest } = props;
  if (cls) node.className = cls;
  Object.assign(node, rest);
  for (const k of kids) if (k !== null && k !== false) node.append(k);
  return node;
}
const art = (svg: string, cls = ''): HTMLImageElement => el('img', { class: cls, alt: '', src: dataUrl(svg), draggable: false });
const figure = (svg: string, cls = ''): HTMLElement => {
  const d = el('div', { class: `figure ${cls}` });
  d.innerHTML = svg; // our own static drawings
  return d;
};
const btn = (cls: string, onclick: () => void, ...kids: Child[]): HTMLButtonElement =>
  el('button', { class: cls, type: 'button', onclick: () => { sfx.tap(); onclick(); } }, ...kids);
const price = (n: number): HTMLElement => el('span', { class: 'price' }, art(coin()), num(n));
const bubble = (text: string): HTMLElement => el('div', { class: 'bubble' }, text);

const BOOSTER_ART: Record<BoosterId, string> = {
  rocket: tileSvg(1, KIND_LINE_H),
  bomb: tileSvg(0, KIND_BOMB),
  rainbow: rainbowSvg(),
  hammer: hammerIcon(),
  shuffle: shuffleIcon(),
  cross: crossIcon(),
};

/* ---------- state ---------- */

interface Session {
  level: LevelDef;
  state: GameState;
  actions: Action[];
  continues: number;
  busy: boolean;
}

let save: Save = load();
setLang(save.lang ?? detectLang());
setSound(save.sound);
let session: Session | null = null;
let hintTimer = 0;
let toastTimer = 0;
let moodTimer = 0;

const app = document.getElementById('app') as HTMLElement;
const loading = el('section', { class: 'screen loading' });
const home = el('section', { class: 'screen home', hidden: true });
const game = el('section', { class: 'screen game', hidden: true });
const modal = el('div', { id: 'modal', hidden: true });
const toast = el('div', { id: 'toast', hidden: true });
toast.setAttribute('role', 'status');
app.append(loading, home, game, modal, toast);
loading.style.backgroundImage = home.style.backgroundImage = `url("${dataUrl(palace())}")`;
game.style.backgroundImage = `url("${dataUrl(hall())}")`;

const buzz = (ms: number): void => {
  if (save.haptics && 'vibrate' in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {
      /* not supported */
    }
  }
};

function showToast(text: string, ms = 2400): void {
  toast.textContent = text;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toast.hidden = true), ms);
}

/* ---------- coin counter (shared by every screen) ---------- */

const coinPills = new Set<HTMLElement>();
function coinPill(onOpen: () => void): HTMLElement {
  const value = el('b', {}, num(save.coins));
  const pill = btn('coins', onOpen, art(coin()), value, el('i', {}, '+'));
  pill.setAttribute('aria-label', `${t('coins')}: ${save.coins}`);
  coinPills.add(value);
  return pill;
}
function refreshCoins(from?: number): void {
  for (const v of [...coinPills]) {
    if (!v.isConnected) {
      coinPills.delete(v);
      continue;
    }
    if (from === undefined || from === save.coins) v.textContent = num(save.coins);
    else countUp(v, from, save.coins);
  }
}
function countUp(node: HTMLElement, from: number, to: number): void {
  const t0 = performance.now();
  const step = (now: number): void => {
    const k = Math.min(1, (now - t0) / 700);
    node.textContent = num(Math.round(from + (to - from) * (1 - (1 - k) * (1 - k))));
    if (k < 1 && node.isConnected) requestAnimationFrame(step);
    else node.textContent = num(to);
  };
  requestAnimationFrame(step);
}

/* ---------- modal ---------- */

let modalDismiss: (() => void) | null = null;
function openModal(cls: string, dismiss: (() => void) | null, ...kids: Child[]): HTMLElement {
  const sheet = el('div', { class: `sheet ${cls}` }, ...kids);
  modal.replaceChildren(sheet);
  modal.hidden = false;
  modalDismiss = dismiss;
  return sheet;
}
function closeModal(): void {
  modal.hidden = true;
  modal.replaceChildren();
  modalDismiss = null;
}
modal.addEventListener('click', (e) => {
  if (e.target === modal && modalDismiss) modalDismiss();
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!modal.hidden) modalDismiss?.();
  else if (session) openPause();
});

/* ---------- game screen ---------- */

const elMoves = el('b');
const elMovesBox = el('div', { class: 'moves' }, elMoves, el('small'));
const elScoreFill = el('i');
const elScoreMark = el('u');
const elGoals = el('div', { class: 'goals' });
const elLevelTag = el('div', { class: 'level-tag' });
const portrait = el('div', { class: 'portrait' });
const canvas = el('canvas');
const fit = el('div', { class: 'fit' }, canvas);
const boosterBar = el('footer', { class: 'boosters' });
const pauseBtn = btn('round', () => openPause(), '❚❚');
game.append(
  el('header', { class: 'hud' }, portrait, el('div', { class: 'hud-mid' }, elLevelTag, elGoals), elMovesBox, pauseBtn),
  el('div', { class: 'bar' }, elScoreFill, elScoreMark),
  el('div', { class: 'board-wrap' }, fit),
  boosterBar,
);

function setMood(mood: Mood, ms = 0): void {
  clearTimeout(moodTimer);
  if (portrait.dataset.mood !== mood) {
    portrait.dataset.mood = mood;
    portrait.innerHTML = sultan(mood);
  }
  if (ms) moodTimer = window.setTimeout(() => setMood(session && session.state.movesLeft <= 3 ? 'sad' : 'idle'), ms);
}

let aim: 'hammer' | 'cross' | null = null;
const view = new BoardView(canvas, {
  onSwipe: (a, b) => void act({ t: 'move', a, b }),
  onTap: (i) => {
    const what = aim;
    setAim(null);
    if (what) void act({ t: what, i });
  },
  onClear: (ev) => {
    renderProgress(ev.score, ev.remaining);
    if (ev.blasts.length) {
      sfx.blast();
      buzz(25);
    } else sfx.match(ev.cascade);
    if (ev.spawns.length) sfx.special();
    if (ev.cascade >= 2 || ev.blasts.length) setMood('happy', 1300);
  },
  onShuffle: () => showToast(t('noMoves')),
});
new ResizeObserver(() => view.resize()).observe(fit);

function setAim(what: 'hammer' | 'cross' | null): void {
  aim = what;
  view.tapMode = what !== null;
  canvas.classList.toggle('aim', what !== null);
  if (what) showToast(t(what === 'hammer' ? 'hammerAim' : 'crossAim'));
  renderBoosters();
}

function goalChip(g: Goal, remaining: number): HTMLElement {
  const pic =
    g.t === 'score' ? art(star()) : art(g.t === 'color' ? tileSvg(g.c, 0) : g.t === 'frost' ? carpetSvg(2) : crateSvg(1));
  return el('div', { class: remaining === 0 ? 'chip done' : 'chip' }, pic, remaining === 0 ? '✓' : num(remaining));
}

function describeGoals(level: LevelDef): string {
  return level.goals
    .map((g) => (g.t === 'score' ? t('goalScore', { n: num(g.n) }) : g.t === 'color' ? t('goalColor') : g.t === 'frost' ? t('goalFrost') : t('goalCrate')))
    .filter((x, k, all) => all.indexOf(x) === k)
    .join(' · ');
}

function renderProgress(score: number, remaining: number[]): void {
  if (!session) return;
  const { level } = session;
  elScoreFill.style.width = `${Math.min(100, (100 * score) / level.stars[1])}%`;
  elGoals.replaceChildren(...level.goals.map((g, k) => goalChip(g, remaining[k])));
}

function renderBoosters(): void {
  if (!session) return;
  const idle = session.state.status === 'playing' && !session.busy;
  boosterBar.replaceChildren(
    ...BOOSTERS.filter((b) => b.when === 'game').map((b) => {
      const have = save.inv[b.id];
      const node = btn(`booster${aim === b.id ? ' on' : ''}`, () => useBooster(b.id), art(BOOSTER_ART[b.id]), el('em', { class: have ? '' : 'plus' }, have ? String(have) : '+'));
      node.disabled = !idle;
      node.setAttribute('aria-label', `${t(`b_${b.id}`)}: ${have}`);
      return node;
    }),
  );
}

function renderHud(): void {
  if (!session) return;
  const { level, state } = session;
  elLevelTag.textContent = `${t('level')} ${level.id}`;
  (elMovesBox.lastElementChild as HTMLElement).textContent = t('moves');
  elMoves.textContent = String(state.movesLeft);
  elMovesBox.classList.toggle('low', state.movesLeft <= 3);
  elScoreMark.style.left = `${(100 * level.stars[0]) / level.stars[1]}%`;
  renderProgress(state.score, goalsRemaining(state));
  renderBoosters();
}

function armHint(): void {
  clearTimeout(hintTimer);
  view.setHint(null);
  hintTimer = window.setTimeout(() => {
    if (session && !session.busy && session.state.status === 'playing' && modal.hidden) view.setHint(findMoves(session.state)[0] ?? null);
  }, 6000);
}

function useBooster(id: BoosterId): void {
  const s = session;
  if (!s || s.busy || s.state.status !== 'playing') return;
  if (save.inv[id] <= 0) {
    openBuyBooster(id, null);
    return;
  }
  if (id === 'shuffle') void act({ t: 'shuffle' });
  else if (id === 'hammer' || id === 'cross') setAim(aim === id ? null : id);
}

async function act(action: Action): Promise<void> {
  const s = session;
  if (!s || s.busy || !modal.hidden) return;
  if (action.t !== 'continue' && s.state.status !== 'playing') return;
  if (action.t === 'hammer' || action.t === 'cross' || action.t === 'shuffle') if (save.inv[action.t] <= 0) return;
  unlockAudio();
  clearTimeout(hintTimer);
  const events: GameEvent[] | null = applyAction(s.state, action);
  s.busy = true;
  view.locked = true;
  if (!events) {
    if (action.t === 'move') {
      sfx.bad();
      await view.bounce(action.a, action.b);
    }
  } else {
    s.actions.push(action);
    if (action.t === 'move') sfx.swap();
    if (action.t === 'hammer' || action.t === 'cross' || action.t === 'shuffle') {
      save.inv[action.t]--;
      persist(save);
    }
    elMoves.textContent = String(s.state.movesLeft);
    renderBoosters();
    await view.play(events);
  }
  if (session !== s) return; // the player left or restarted while the animation ran
  s.busy = false;
  view.locked = false;
  renderHud();
  setMood(s.state.movesLeft <= 3 && s.state.status === 'playing' ? 'sad' : (portrait.dataset.mood as Mood) === 'happy' ? 'happy' : 'idle', 1200);
  if (s.state.status === 'playing') armHint();
  else finishLevel(s);
}

/* ---------- level flow ---------- */

function openPreLevel(id: number): void {
  const level = LEVELS[id - 1];
  if (!level || id > unlocked(save, LEVELS.length)) return;
  unlockAudio();
  const picked = new Set<BoosterId>();
  const render = (): void => {
    const picks = BOOSTERS.filter((b) => b.when === 'pre').map((b) => {
      const have = save.inv[b.id];
      const node = btn(`pick${picked.has(b.id) ? ' on' : ''}`, () => {
        if (save.inv[b.id] <= 0) {
          openBuyBooster(b.id, () => render());
          return;
        }
        if (picked.has(b.id)) picked.delete(b.id);
        else picked.add(b.id);
        render();
      }, art(BOOSTER_ART[b.id]), el('em', { class: have ? '' : 'plus' }, picked.has(b.id) ? '✓' : have ? String(have) : '+'), el('small', {}, t(`b_${b.id}`)));
      node.setAttribute('aria-pressed', String(picked.has(b.id)));
      return node;
    });
    openModal(
      'pre',
      closeModal,
      el('div', { class: 'ribbon' }, `${t('level')} ${level.id}`),
      el('div', { class: 'speaker' }, figure(vizier('idle'), 'small'), bubble(`${t('vizierGoal')} ${describeGoals(level)}`)),
      el('div', { class: 'goals big' }, ...level.goals.map((g, k) => goalChip(g, goalsRemaining(createGame(level))[k]))),
      el('p', { class: 'label' }, `${t('moves')}: ${level.moves}`),
      el('p', { class: 'label' }, t('pick')),
      el('div', { class: 'picks' }, ...picks),
      el('div', { class: 'col' }, btn('play', () => startLevel(level.id, [...picked]), t('play')), btn('plain', closeModal, t('close'))),
    );
  };
  render();
}

function startLevel(id: number, picked: BoosterId[]): void {
  const level = LEVELS[id - 1];
  if (!level || id > unlocked(save, LEVELS.length)) return;
  const use = picked.filter((b) => save.inv[b] > 0);
  for (const b of use) save.inv[b]--;
  if (use.length) persist(save);
  const kinds = use.map((b) => boosterDef(b).kind).filter((k): k is number => k !== undefined);
  session = { level, state: createGame(level, 0, kinds), actions: [], continues: 0, busy: false };
  closeModal();
  setAim(null);
  home.hidden = true;
  game.hidden = false;
  if (!history.state?.game) history.pushState({ game: true }, '');
  view.locked = false;
  view.setState(session.state);
  view.start();
  setMood('idle');
  renderHud();
  armHint();
  if (!save.seenHowTo) {
    save.seenHowTo = true;
    persist(save);
    openModal('', closeModal, el('div', { class: 'speaker' }, figure(jester('idle'), 'small'), bubble(t('howTo'))), el('div', { class: 'col' }, btn('play', closeModal, t('play'))));
  } else showToast(describeGoals(level));
}

function starsRow(n: number): HTMLElement {
  const row = el('div', { class: 'stars3' });
  row.setAttribute('aria-label', `${n} ${t('stars')}`);
  for (let k = 1; k <= 3; k++) row.append(art(star(k <= n), k <= n ? `pop d${k}` : ''));
  return row;
}

function finishLevel(s: Session): void {
  clearTimeout(hintTimer);
  setAim(null);
  if (s.state.status === 'won') showWin(s);
  else if (s.state.movesLeft <= 0) openContinueOffer(s);
  else showLose(s);
}

function showWin(s: Session): void {
  const id = String(s.level.id);
  const stars = starsFor(s.level, s.state.score);
  const prev = save.best[id];
  const reward = winReward(s.level.id, stars, !prev);
  const isBest = !!prev && s.state.score > prev.score;
  const before = save.coins;
  save.best[id] = { stars: Math.max(stars, prev?.stars ?? 0), score: Math.max(s.state.score, prev?.score ?? 0) };
  addCoins(save, reward);
  persist(save);
  sfx.win();
  buzz(60);
  setMood('happy');
  const last = s.level.id >= LEVELS.length;
  const earned = el('b', {}, '0');
  openModal(
    'win',
    null,
    el('div', { class: 'ribbon gold' }, t('won')),
    starsRow(stars),
    el('div', { class: 'speaker' }, figure(sultan('happy'), 'small cheer'), bubble(last ? t('allDone') : line('sultanWin', s.level.id + stars))),
    el('p', { class: 'big' }, num(s.state.score)),
    el('p', { class: 'label' }, isBest ? t('newBest') : `${t('best')}: ${num(save.best[id].score)}`),
    el('div', { class: 'earned' }, el('span', {}, t('earned')), art(coin(), 'spin'), earned),
    !prev && s.level.id % 10 === 0 ? el('p', { class: 'label ok' }, t('chest')) : null,
    el(
      'div',
      { class: 'col' },
      last ? null : btn('play', () => openPreLevel(s.level.id + 1), t('next')),
      btn('plain', leaveGame, t('home')),
    ),
  );
  countUp(earned, 0, reward);
  refreshCoins(before);
}

function openContinueOffer(s: Session): void {
  const cost = continuePrice(s.continues);
  const left = goalsRemaining(s.state);
  sfx.lose();
  setMood('sad');
  const offer = (): void => {
    openModal(
      'offer',
      null,
      el('div', { class: 'ribbon' }, t('outOfMoves')),
      el('div', { class: 'top-right' }, coinPill(() => openShop(offer))),
      el('div', { class: 'speaker' }, figure(jester('sad'), 'small'), bubble(t('jesterOut'))),
      el('div', { class: 'goals big' }, ...s.level.goals.map((g, k) => goalChip(g, left[k]))),
      el(
        'div',
        { class: 'col' },
        btn('buy wide', () => {
          if (session !== s) return;
          if (!spend(save, cost)) {
            showToast(t('notEnough'));
            openShop(offer);
            return;
          }
          persist(save);
          s.continues++;
          closeModal();
          refreshCoins();
          void act({ t: 'continue' });
        }, art(plusMovesIcon()), el('span', {}, t('continueFor')), price(cost)),
        btn('plain', () => showLose(s), t('giveUp')),
      ),
    );
  };
  offer();
}

function showLose(s: Session): void {
  const left = goalsRemaining(s.state);
  openModal(
    'lose',
    null,
    el('div', { class: 'ribbon' }, t('lost')),
    el('div', { class: 'speaker' }, figure(jester('idle'), 'small'), bubble(line('jesterLose', s.level.id + s.state.score))),
    el('div', { class: 'goals big' }, ...s.level.goals.map((g, k) => goalChip(g, left[k]))),
    el('div', { class: 'col' }, btn('play', () => openPreLevel(s.level.id), t('retry')), btn('plain', leaveGame, t('home'))),
  );
}

function openPause(): void {
  const s = session;
  if (!s || !modal.hidden || s.state.status !== 'playing') return;
  setAim(null);
  openModal(
    '',
    closeModal,
    el('div', { class: 'ribbon' }, t('paused')),
    el('p', { class: 'label' }, `${t('level')} ${s.level.id} · ${describeGoals(s.level)}`),
    el(
      'div',
      { class: 'col' },
      btn('play', () => {
        closeModal();
        armHint();
      }, t('resume')),
      btn('plain', () => openPreLevel(s.level.id), t('restart')),
      btn('plain', () => openSettings(openPause), t('settings')),
      btn('plain', leaveGame, t('home')),
    ),
  );
}

function leaveGame(): void {
  const wasInGame = session !== null;
  session = null;
  clearTimeout(hintTimer);
  clearTimeout(moodTimer);
  view.stop();
  closeModal();
  toast.hidden = true;
  game.hidden = true;
  home.hidden = false;
  renderHome();
  if (wasInGame && history.state?.game) history.back();
}

// System back: pause first, leave on the second press.
window.addEventListener('popstate', () => {
  if (!session) return;
  if (modal.hidden && session.state.status === 'playing') {
    history.pushState({ game: true }, '');
    openPause();
  } else {
    session = null;
    leaveGame();
  }
});

/* ---------- shop ---------- */

function buyBooster(id: BoosterId): boolean {
  const def = boosterDef(id);
  if (!spend(save, def.price)) {
    showToast(t('notEnough'));
    return false;
  }
  save.inv[id] = Math.min(999, save.inv[id] + def.qty);
  persist(save);
  sfx.special();
  showToast(t('bought'));
  refreshCoins();
  if (session) renderBoosters();
  return true;
}

/** Small confirm dialog used when a booster with a count of zero is tapped. */
function openBuyBooster(id: BoosterId, back: (() => void) | null): void {
  const def = boosterDef(id);
  const done = (): void => {
    closeModal();
    back?.();
  };
  openModal(
    'buy-one',
    done,
    el('div', { class: 'ribbon' }, `${def.qty}× ${t(`b_${id}`)}`),
    el('div', { class: 'top-right' }, coinPill(() => openShop(() => openBuyBooster(id, back)))),
    art(BOOSTER_ART[id], 'hero'),
    el('p', { class: 'label' }, t(`d_${id}`)),
    el(
      'div',
      { class: 'col' },
      btn('buy wide', () => {
        if (buyBooster(id)) done();
        else openShop(() => openBuyBooster(id, back));
      }, el('span', {}, t('buy')), price(def.price)),
      btn('plain', done, t('cancel')),
    ),
  );
}

function openShop(back: (() => void) | null): void {
  const done = (): void => {
    closeModal();
    if (back) back();
    else if (!session) renderHome();
  };
  const packs = COIN_PACKS.map((p, tier) => {
    const label = billing.price(p.id);
    const b = btn('pack', () => {
      void billing.buy(p.id).then((r) => {
        if (r === 'unavailable') showToast(t('storeOff'));
        else if (r === 'error') showToast(t('buyError'));
      });
    }, art(coinPack(tier)), el('b', {}, num(p.coins)), el('span', { class: 'buy' }, label ?? '—'));
    b.disabled = !billing.available || !label;
    return b;
  });
  const row = (id: BoosterId): HTMLElement => {
    const def = boosterDef(id);
    return el(
      'div',
      { class: 'shop-row' },
      art(BOOSTER_ART[id]),
      el('div', {}, el('b', {}, `${def.qty}× ${t(`b_${id}`)}`), el('small', {}, `${t(`d_${id}`)} (${save.inv[id]})`)),
      btn('buy', () => {
        if (buyBooster(id)) openShop(back);
      }, price(def.price)),
    );
  };
  const sheet = openModal(
    'shop',
    done,
    el('div', { class: 'ribbon gold' }, t('shop')),
    el('div', { class: 'top-right' }, coinPill(() => {})),
    el('div', { class: 'speaker' }, figure(vizier('happy'), 'small'), bubble(t('vizierShop'))),
    el('h3', {}, t('coins')),
    el('div', { class: 'packs' }, ...packs),
    el('p', { class: 'note' }, billing.available ? t('restore') : 'Capacitor' in window ? t('storeWait') : t('storeOff')),
    el('h3', {}, `${t('boosters')} — ${t('beforeLevel')}`),
    ...BOOSTERS.filter((b) => b.when === 'pre').map((b) => row(b.id)),
    el('h3', {}, `${t('boosters')} — ${t('inLevel')}`),
    ...BOOSTERS.filter((b) => b.when === 'game').map((b) => row(b.id)),
    el('div', { class: 'col' }, btn('plain', done, t('close'))),
  );
  sheet.style.backgroundImage = `url("${dataUrl(treasury())}")`;
  shopOpen = () => openShop(back);
}
let shopOpen: (() => void) | null = null;

/* ---------- home ---------- */

function renderHome(): void {
  const open = unlocked(save, LEVELS.length);
  const done = Object.keys(save.best).length >= LEVELS.length;
  const kids: Child[] = [
    el('header', { class: 'topbar' }, coinPill(() => openShop(null)), el('div', { class: 'star-count' }, art(star()), `${totalStars(save)}/${LEVELS.length * 3}`), btn('round', () => openSettings(null), art(gear()))),
    logo(),
    el('div', { class: 'cast' }, figure(vizier('idle'), 'side left'), figure(sultan('idle'), 'hero'), figure(jester('idle'), 'side right')),
    storageWorks ? null : el('p', { class: 'warn' }, t('storageWarn')),
    el(
      'div',
      { class: 'home-actions' },
      btn('play huge', () => openPreLevel(open), done ? t('levels') : `${t('level')} ${open}`),
      el('div', { class: 'row2' }, btn('plain', openLevels, t('levels')), btn('plain', () => openShop(null), t('shop')), btn('plain', openFair, t('fair'))),
    ),
  ];
  home.replaceChildren(...kids.filter((k): k is Node | string => k !== null && k !== false));
}

function logo(): HTMLElement {
  return el('div', { class: 'logo' }, art(emblem()), el('h1', {}, 'Magnificent', el('span', {}, 'Match')));
}

function openLevels(): void {
  const open = unlocked(save, LEVELS.length);
  const grid = el('div', { class: 'grid' });
  for (const level of LEVELS) {
    const best = save.best[String(level.id)];
    const lockedLevel = level.id > open;
    const b = btn(level.id === open && !best ? 'node current' : 'node', () => openPreLevel(level.id), lockedLevel ? art(lock()) : String(level.id));
    b.disabled = lockedLevel;
    if (best) b.append(el('small', {}, '★'.repeat(best.stars)));
    b.setAttribute('aria-label', `${t('level')} ${level.id}${lockedLevel ? ` (${t('locked')})` : ''}`);
    grid.append(b);
  }
  openModal('levels', closeModal, el('div', { class: 'ribbon' }, t('levels')), grid, el('div', { class: 'col' }, btn('plain', closeModal, t('close'))));
  (grid.querySelector('.current') as HTMLElement | null)?.scrollIntoView({ block: 'center' });
}

function openFair(): void {
  openModal('', closeModal, el('div', { class: 'ribbon' }, t('fair')), el('div', { class: 'speaker' }, figure(sultan('idle'), 'small')), el('p', { class: 'note' }, t('fairText')), el('div', { class: 'col' }, btn('play', closeModal, t('close'))));
}

function openSettings(back: (() => void) | null): void {
  const done = (): void => {
    closeModal();
    if (back) back();
    else renderHome();
  };
  const reopen = (): void => {
    if (session) renderHud();
    openSettings(back);
  };
  const toggle = (label: 'sound' | 'haptics'): HTMLElement =>
    el('div', { class: 'row' }, el('span', {}, t(label)), btn(save[label] ? 'switch on' : 'switch', () => {
      save[label] = !save[label];
      setSound(save.sound);
      persist(save);
      if (label === 'sound' && save.sound) unlockAudio();
      reopen();
    }, save[label] ? 'ON' : 'OFF'));
  const langBtn = (l: Lang, label: string): HTMLButtonElement =>
    btn(getLang() === l ? 'switch on' : 'switch', () => {
      save.lang = l;
      setLang(l);
      persist(save);
      reopen();
    }, label);
  openModal(
    '',
    done,
    el('div', { class: 'ribbon' }, t('settings')),
    toggle('sound'),
    toggle('haptics'),
    el('div', { class: 'row' }, el('span', {}, t('language')), el('div', { class: 'seg' }, langBtn('tr', 'TR'), langBtn('en', 'EN'))),
    el('div', { class: 'col' }, btn('play', done, t('close')), session ? null : btn('danger', () => confirmReset(back), t('reset'))),
    el('p', { class: 'note center' }, `Magnificent Match ${VERSION}`),
  );
}

function confirmReset(back: (() => void) | null): void {
  openModal(
    '',
    () => openSettings(back),
    el('div', { class: 'ribbon' }, t('reset')),
    el('p', { class: 'note' }, t('resetConfirm')),
    el(
      'div',
      { class: 'col' },
      btn('play', () => openSettings(back), t('cancel')),
      btn('danger', () => {
        const keep = save;
        // Store transaction ids are kept so an old purchase can never be paid out twice.
        save = { ...freshSave(), sound: keep.sound, haptics: keep.haptics, lang: keep.lang, granted: keep.granted, seenHowTo: true };
        persist(save);
        closeModal();
        renderHome();
      }, t('yes')),
    ),
  );
}

/* ---------- boot ---------- */

document.addEventListener('pointerdown', unlockAudio, { passive: true });
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    suspendAudio();
    if (session) openPause();
  } else unlockAudio();
});
window.addEventListener('resize', () => view.resize());
if (history.state?.game) history.replaceState(null, '');

const loadFill = el('i');
loading.append(logo(), figure(jester('idle'), 'hero'), el('div', { class: 'loadbar' }, loadFill), el('p', {}, t('loading')));

async function boot(): Promise<void> {
  const shown = performance.now();
  try {
    await preload((p) => (loadFill.style.width = `${Math.round(p * 100)}%`));
  } catch {
    // Without its drawings the board would be blank; say so instead of starting a broken game.
    (loading.lastElementChild as HTMLElement).textContent = 'Could not load the game art. Please restart the app.';
    return;
  }
  await new Promise((r) => setTimeout(r, Math.max(0, 900 - (performance.now() - shown))));
  loading.hidden = true;
  loading.replaceChildren();
  home.hidden = false;
  renderHome();
  void billing.init(
    (tx, coins) => {
      const before = save.coins;
      const paid = grantPurchase(save, tx, coins);
      if (paid) {
        persist(save);
        refreshCoins(before);
        sfx.win();
        showToast(t('thanks'));
      }
      return true;
    },
    () => {
      if (!modal.hidden && modal.querySelector('.shop')) shopOpen?.();
    },
  );
}
void boot();

const native = 'Capacitor' in window;
if (!native && 'serviceWorker' in navigator && import.meta.env.PROD && location.protocol === 'https:') {
  window.addEventListener('load', () => void navigator.serviceWorker.register('sw.js').catch(() => {}));
}

if (new URLSearchParams(location.search).has('e2e')) {
  (window as unknown as Record<string, unknown>).__mm = {
    state: () => session?.state ?? null,
    busy: () => session?.busy ?? false,
    moves: () => (session ? findMoves(session.state) : []),
    center: (i: number) => view.cellCenter(i),
    save: () => save,
    tile: (c: number) => makeTile(c),
  };
}
