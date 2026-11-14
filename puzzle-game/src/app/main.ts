import './style.css';
import {
  applyAction, createGame, findMoves, goalsRemaining, makeTile, starsFor,
  type Action, type GameEvent, type GameState, type Goal, type LevelDef,
} from '../engine/engine';
import { assistMoves } from '../engine/assist';
import { LEVELS } from '../levels';
import { BoardView } from './board-view';
import { icon } from './sprites';
import { detectLang, getLang, setLang, t, type Key, type Lang } from './i18n';
import { load, persist, rewardFor, freshSave, storageWorks, totalStars, unlocked, type Save } from './store';
import { setSound, sfx, suspendAudio, unlockAudio } from './audio';
import { submitRun, syncEnabled } from './sync';

const VERSION = '1.0.0';
const CRATE_ICON = 64 + 1;

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
const btn = (label: string, cls: string, onclick: () => void): HTMLButtonElement =>
  el('button', { class: cls, type: 'button', onclick: () => { sfx.tap(); onclick(); } }, label);

interface Session {
  level: LevelDef;
  state: GameState;
  actions: Action[];
  fails: number;
  busy: boolean;
}

let save: Save = load();
setLang(save.lang ?? detectLang());
setSound(save.sound);

const app = document.getElementById('app') as HTMLElement;
const home = el('section', { class: 'screen' });
const game = el('section', { class: 'screen', hidden: true });
const modal = el('div', { id: 'modal', hidden: true });
const toast = el('div', { id: 'toast', hidden: true });
toast.setAttribute('role', 'status');
app.append(home, game, modal, toast);

let session: Session | null = null;
let hintTimer = 0;
let toastTimer = 0;

const buzz = (ms: number): void => {
  if (save.haptics && 'vibrate' in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {
      /* not supported */
    }
  }
};

function showToast(text: string, ms = 2200): void {
  toast.textContent = text;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toast.hidden = true), ms);
}

/* ---------- modal ---------- */

let modalDismiss: (() => void) | null = null;

function openModal(dismiss: (() => void) | null, ...kids: Child[]): void {
  modal.replaceChildren(el('div', { class: 'sheet' }, ...kids));
  modal.hidden = false;
  modalDismiss = dismiss;
  (modal.querySelector('button') as HTMLButtonElement | null)?.focus({ preventScroll: true });
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

const elLevel = el('b');
const elMoves = el('b');
const elScore = el('b');
const elMovesBox = el('div', { class: 'stat moves' }, elMoves, el('small'));
const elBarFill = el('i');
const elBarMark = el('u');
const elGoals = el('div', { class: 'goals' });
const canvas = el('canvas');
const hammerCount = el('em');
const shuffleCount = el('em');
const hammerLabel = el('span');
const shuffleLabel = el('span');
const hammerBtn = el('button', { class: '', type: 'button', onclick: () => toggleHammer() }, hammerLabel, hammerCount);
const shuffleBtn = el('button', { class: '', type: 'button', onclick: () => void act({ t: 'shuffle' }) }, shuffleLabel, shuffleCount);
const levelCaption = el('small');
const scoreCaption = el('small');
const pauseBtn = el('button', { class: 'pause', type: 'button', onclick: () => openPause() }, '❚❚');
const fit = el('div', { class: 'fit' }, canvas);
game.append(
  el('header', { class: 'hud' }, pauseBtn, el('div', { class: 'stat' }, elLevel, levelCaption), elMovesBox, el('div', { class: 'stat' }, elScore, scoreCaption)),
  el('div', { class: 'bar' }, elBarFill, elBarMark),
  elGoals,
  el('div', { class: 'board-wrap' }, fit),
  el('footer', { class: 'boosters' }, hammerBtn, shuffleBtn),
);

const view = new BoardView(canvas, {
  onSwipe: (a, b) => void act({ t: 'move', a, b }),
  onTap: (i) => {
    setAim(false);
    void act({ t: 'hammer', i });
  },
  onClear: (ev) => {
    renderProgress(ev.score, ev.remaining);
    if (ev.blasts.length) {
      sfx.blast();
      buzz(25);
    } else sfx.match(ev.cascade);
    if (ev.spawns.length) sfx.special();
  },
  onShuffle: () => showToast(t('noMoves')),
});
new ResizeObserver(() => view.resize()).observe(fit);

function setAim(on: boolean): void {
  view.tapMode = on;
  canvas.classList.toggle('aim', on);
  hammerBtn.classList.toggle('on', on);
  if (on) showToast(t('hammerAim'));
}

function toggleHammer(): void {
  if (!session || session.busy || session.state.status !== 'playing' || save.hammer <= 0) return;
  sfx.tap();
  setAim(!view.tapMode);
}

function goalChip(g: Goal, remaining: number): HTMLElement {
  const pic =
    g.t === 'score'
      ? el('span', { class: 'star' }, '★')
      : el('img', { alt: '', src: g.t === 'color' ? icon(makeTile(g.c)) : g.t === 'frost' ? icon('frost') : icon(CRATE_ICON) });
  const chip = el('div', { class: remaining === 0 ? 'chip done' : 'chip' }, pic, remaining === 0 ? '✓' : String(remaining));
  const label: Key = g.t === 'score' ? 'goalScore' : g.t === 'color' ? 'goalColor' : g.t === 'frost' ? 'goalFrost' : 'goalCrate';
  chip.setAttribute('aria-label', `${t(label, { n: g.t === 'score' ? g.n : '' })}: ${remaining}`);
  return chip;
}

function renderProgress(score: number, remaining: number[]): void {
  if (!session) return;
  const { level } = session;
  elScore.textContent = String(score);
  elBarFill.style.width = `${Math.min(100, (100 * score) / level.stars[1])}%`;
  elGoals.replaceChildren(...level.goals.map((g, k) => goalChip(g, remaining[k])));
}

function renderHud(): void {
  if (!session) return;
  const { level, state } = session;
  elLevel.textContent = String(level.id);
  levelCaption.textContent = t('level');
  scoreCaption.textContent = t('score');
  (elMovesBox.lastElementChild as HTMLElement).textContent = t('moves');
  elMoves.textContent = String(state.movesLeft);
  elMovesBox.classList.toggle('low', state.movesLeft <= 3);
  elBarMark.style.left = `${(100 * level.stars[0]) / level.stars[1]}%`;
  hammerLabel.textContent = `🔨 ${t('hammer')}`;
  shuffleLabel.textContent = `🔀 ${t('shuffle')}`;
  hammerCount.textContent = String(save.hammer);
  shuffleCount.textContent = String(save.shuffle);
  const idle = state.status === 'playing' && !session.busy;
  hammerBtn.disabled = save.hammer <= 0 || !idle;
  shuffleBtn.disabled = save.shuffle <= 0 || !idle;
  pauseBtn.setAttribute('aria-label', t('paused'));
  renderProgress(state.score, goalsRemaining(state));
}

function armHint(): void {
  clearTimeout(hintTimer);
  view.setHint(null);
  hintTimer = window.setTimeout(() => {
    if (session && !session.busy && session.state.status === 'playing' && modal.hidden) {
      view.setHint(findMoves(session.state)[0] ?? null);
    }
  }, 6000);
}

async function act(action: Action): Promise<void> {
  const s = session;
  if (!s || s.busy || s.state.status !== 'playing' || !modal.hidden) return;
  if (action.t === 'shuffle' && save.shuffle <= 0) return;
  if (action.t === 'hammer' && save.hammer <= 0) return;
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
    if (action.t === 'hammer') save.hammer--;
    if (action.t === 'shuffle') save.shuffle--;
    if (action.t !== 'move') persist(save);
    elMoves.textContent = String(s.state.movesLeft);
    hammerBtn.disabled = shuffleBtn.disabled = true;
    await view.play(events);
  }
  if (session !== s) return; // the player left or restarted while the animation ran
  s.busy = false;
  view.locked = false;
  renderHud();
  if (s.state.status === 'playing') armHint();
  else finishLevel(s);
}

function describeGoals(level: LevelDef): string {
  return level.goals
    .map((g) => (g.t === 'score' ? t('goalScore', { n: g.n }) : g.t === 'color' ? t('goalColor') : g.t === 'frost' ? t('goalFrost') : t('goalCrate')))
    .filter((x, k, all) => all.indexOf(x) === k)
    .join(' · ');
}

function startLevel(id: number): void {
  const level = LEVELS[id - 1];
  if (!level || id > unlocked(save, LEVELS.length)) return;
  unlockAudio();
  const fails = save.fails[String(id)] ?? 0;
  const extra = assistMoves(fails, save.assist);
  // The server replays with the same assist rule, so it is told the fail count the client used.
  session = { level, state: createGame(level, extra), actions: [], fails: save.assist ? fails : 0, busy: false };
  closeModal();
  setAim(false);
  home.hidden = true;
  game.hidden = false;
  if (!history.state?.game) history.pushState({ game: true }, '');
  view.locked = false;
  view.setState(session.state);
  view.start();
  renderHud();
  armHint();
  if (!save.seenHowTo) {
    save.seenHowTo = true;
    persist(save);
    openModal(closeModal, el('h2', {}, t('title')), el('p', {}, t('howTo')), el('div', { class: 'col' }, btn(t('play'), 'primary', closeModal)));
  } else {
    showToast(`${describeGoals(level)}${extra ? `\n${t('assistNow', { n: extra })}` : ''}`);
  }
}

function starsRow(n: number): HTMLElement {
  const row = el('div', { class: 'stars3' });
  row.setAttribute('aria-label', `${n} ${t('stars')}`);
  for (let k = 1; k <= 3; k++) row.append(k <= n ? el('b', {}, '★') : '★');
  return row;
}

function finishLevel(s: Session): void {
  clearTimeout(hintTimer);
  setAim(false);
  const id = String(s.level.id);
  if (s.state.status === 'won') {
    const stars = starsFor(s.level, s.state.score);
    const prev = save.best[id];
    const reward = rewardFor(s.level.id, !prev, stars === 3 && (!prev || prev.stars < 3));
    const isBest = !prev || s.state.score > prev.score;
    save.best[id] = { stars: Math.max(stars, prev?.stars ?? 0), score: Math.max(s.state.score, prev?.score ?? 0) };
    save.fails[id] = 0;
    save.hammer = Math.min(99, save.hammer + reward.hammer);
    save.shuffle = Math.min(99, save.shuffle + reward.shuffle);
    persist(save);
    void submitRun(save.device, s.level.id, s.fails, s.actions);
    sfx.win();
    buzz(60);
    const last = s.level.id >= LEVELS.length;
    const rewardText = [reward.hammer ? `🔨 +${reward.hammer}` : '', reward.shuffle ? `🔀 +${reward.shuffle}` : ''].filter(Boolean).join('  ');
    openModal(
      null,
      el('h2', {}, t('won')),
      starsRow(stars),
      el('p', { class: 'big' }, String(s.state.score)),
      el('p', {}, isBest && prev ? t('newBest') : `${t('best')}: ${save.best[id].score}`),
      rewardText ? el('p', { class: 'ok' }, `${t('reward')}: ${rewardText}`) : null,
      last ? el('p', { class: 'ok' }, t('allDone')) : null,
      el(
        'div',
        { class: 'col' },
        last ? null : btn(t('next'), 'primary', () => startLevel(s.level.id + 1)),
        btn(t('restart'), last ? 'primary' : '', () => startLevel(s.level.id)),
        btn(t('home'), 'ghost', leaveGame),
      ),
    );
  } else {
    const fails = (save.fails[id] ?? 0) + 1;
    save.fails[id] = Math.min(999, fails);
    persist(save);
    sfx.lose();
    const extra = assistMoves(fails, save.assist);
    const left = goalsRemaining(s.state);
    openModal(
      null,
      el('h2', {}, t('lost')),
      el('div', { class: 'goals' }, ...s.level.goals.map((g, k) => goalChip(g, left[k]))),
      extra ? el('p', { class: 'ok' }, t('assistNext', { n: extra })) : null,
      el('p', { class: 'note' }, t('lostHint')),
      el('div', { class: 'col' }, btn(t('retry'), 'primary', () => startLevel(s.level.id)), btn(t('home'), 'ghost', leaveGame)),
    );
  }
}

function openPause(): void {
  const s = session;
  if (!s || !modal.hidden || s.state.status !== 'playing') return;
  setAim(false);
  openModal(
    closeModal,
    el('h2', {}, t('paused')),
    el('p', {}, `${t('level')} ${s.level.id} · ${describeGoals(s.level)}`),
    el(
      'div',
      { class: 'col' },
      btn(t('resume'), 'primary', () => {
        closeModal();
        armHint();
      }),
      btn(t('restart'), '', () => startLevel(s.level.id)),
      btn(t('settings'), '', () => openSettings(openPause)),
      btn(t('home'), 'ghost', leaveGame),
    ),
  );
}

function leaveGame(): void {
  const wasInGame = session !== null;
  session = null;
  clearTimeout(hintTimer);
  view.stop();
  closeModal();
  toast.hidden = true;
  game.hidden = true;
  home.hidden = false;
  renderHome();
  if (wasInGame && history.state?.game) history.back();
}

// System back (Android back button / browser back): pause first, leave on the second press.
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

/* ---------- home ---------- */

function renderHome(): void {
  const open = unlocked(save, LEVELS.length);
  const done = Object.keys(save.best).length >= LEVELS.length;
  const grid = el('div', { class: 'grid' });
  for (const level of LEVELS) {
    const best = save.best[String(level.id)];
    const b = el(
      'button',
      { type: 'button', disabled: level.id > open, class: level.id === open && !best ? 'current' : '', onclick: () => startLevel(level.id) },
      String(level.id),
      el('small', {}, best ? '★'.repeat(best.stars) : ''),
    );
    b.setAttribute('aria-label', `${t('level')} ${level.id}${level.id > open ? ` (${t('locked')})` : best ? `, ${best.stars} ${t('stars')}` : ''}`);
    grid.append(b);
  }
  const title = el('h1', {}, 'Lumo ', el('span', {}, 'Match'));
  home.replaceChildren(
    el(
      'div',
      { class: 'home-top' },
      title,
      el('p', {}, t('tagline')),
      el('div', { class: 'home-stars' }, `★ ${totalStars(save)} / ${LEVELS.length * 3}`),
      storageWorks ? null : el('p', { class: 'note' }, t('storageWarn')),
    ),
    el('div', { class: 'home-play' }, btn(done ? t('allDone') : `${t('play')} · ${t('level')} ${open}`, 'primary', () => startLevel(open))),
    grid,
    el('div', { class: 'home-foot' }, btn(t('fair'), '', openFair), btn(t('settings'), '', () => openSettings(null))),
  );
  (grid.querySelector('.current') as HTMLElement | null)?.scrollIntoView({ block: 'center' });
}

function openFair(): void {
  openModal(closeModal, el('h2', {}, t('fair')), el('p', { class: 'note' }, t('fairText')), el('div', { class: 'col' }, btn(t('close'), 'primary', closeModal)));
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
  const toggle = (label: Key, key: 'sound' | 'haptics' | 'assist'): HTMLElement =>
    el(
      'div',
      { class: 'row' },
      el('span', {}, t(label)),
      btn(save[key] ? 'ON' : 'OFF', save[key] ? 'on' : '', () => {
        save[key] = !save[key];
        setSound(save.sound);
        persist(save);
        if (key === 'sound' && save.sound) unlockAudio();
        reopen();
      }),
    );
  const langBtn = (l: Lang, label: string): HTMLButtonElement =>
    btn(label, getLang() === l ? 'on' : '', () => {
      save.lang = l;
      setLang(l);
      persist(save);
      reopen();
    });
  openModal(
    done,
    el('h2', {}, t('settings')),
    toggle('sound', 'sound'),
    toggle('haptics', 'haptics'),
    toggle('assist', 'assist'),
    el('p', { class: 'note' }, t('assistNote')),
    el('div', { class: 'row' }, el('span', {}, t('language')), el('div', { class: 'seg' }, langBtn('tr', 'TR'), langBtn('en', 'EN'))),
    el('p', { class: 'note' }, `${t('privacy')}: ${t(syncEnabled ? 'privacyTextSync' : 'privacyText')}`),
    el(
      'div',
      { class: 'col' },
      btn(t('close'), 'primary', done),
      session ? null : btn(t('reset'), 'danger', () => confirmReset(back)),
    ),
    el('p', { class: 'note' }, `Lumo Match ${VERSION}`),
  );
}

function confirmReset(back: (() => void) | null): void {
  openModal(
    () => openSettings(back),
    el('h2', {}, t('reset')),
    el('p', {}, t('resetConfirm')),
    el(
      'div',
      { class: 'col' },
      btn(t('cancel'), 'primary', () => openSettings(back)),
      btn(t('yes'), 'danger', () => {
        const keep = save;
        save = { ...freshSave(), sound: keep.sound, haptics: keep.haptics, assist: keep.assist, lang: keep.lang, seenHowTo: true };
        persist(save);
        closeModal();
        renderHome();
      }),
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
renderHome();

const native = 'Capacitor' in window;
if (!native && 'serviceWorker' in navigator && import.meta.env.PROD && location.protocol === 'https:') {
  window.addEventListener('load', () => void navigator.serviceWorker.register('sw.js').catch(() => {}));
}

if (new URLSearchParams(location.search).has('e2e')) {
  (window as unknown as Record<string, unknown>).__lumo = {
    state: () => session?.state ?? null,
    busy: () => session?.busy ?? false,
    moves: () => (session ? findMoves(session.state) : []),
    center: (i: number) => view.cellCenter(i),
    save: () => save,
  };
}
