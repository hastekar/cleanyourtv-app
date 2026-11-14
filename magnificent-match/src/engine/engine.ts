/**
 * Deterministic match-3 engine. No DOM, no Math.random, no clock: the whole game state is a
 * plain object and every random draw comes from the seeded PRNG stored in that state, so a
 * level seed plus a list of actions always replays to exactly the same result. The client,
 * the level verifier, the test bots and the server-side validator all run this same file.
 */

export const EMPTY = -1;
export const KIND_NONE = 0;
export const KIND_LINE_H = 1; // clears its row
export const KIND_LINE_V = 2; // clears its column
export const KIND_BOMB = 3; // clears 3x3
export const KIND_RAINBOW = 4; // clears every tile of one colour
export const RAINBOW_COLOR = 6;
export const RAINBOW = RAINBOW_COLOR | (KIND_RAINBOW << 3);
const CRATE_BASE = 64;

export const isCrate = (t: number): boolean => t >= CRATE_BASE;
export const crateHp = (t: number): number => t - CRATE_BASE;
export const isTile = (t: number): boolean => t >= 0 && t < CRATE_BASE;
export const colorOf = (t: number): number => t & 7;
export const kindOf = (t: number): number => (t >> 3) & 7;
export const makeTile = (color: number, kind = KIND_NONE): number => color | (kind << 3);

export type Goal =
  | { t: 'score'; n: number }
  | { t: 'color'; c: number; n: number }
  | { t: 'frost' }
  | { t: 'crate' };

export interface LevelDef {
  id: number;
  seed: number;
  colors: number;
  moves: number;
  /** Rows, top first. '.' tile, '#' hole, 'c'/'C' crate (1/2 hits), 'f'/'F' frost (1/2 layers). */
  layout: string[];
  goals: Goal[];
  /** Score needed for 2 and 3 stars (winning is always 1 star). */
  stars: [number, number];
  /** A winning move list found by the verifier, flat [a0, b0, a1, b1, ...]. */
  proof: number[];
}

export interface GameState {
  w: number;
  h: number;
  mask: boolean[];
  tiles: number[];
  frost: number[];
  rng: number;
  colors: number;
  movesLeft: number;
  movesUsed: number;
  score: number;
  collected: number[];
  frostLeft: number;
  cratesLeft: number;
  goals: Goal[];
  status: 'playing' | 'won' | 'lost';
}

export type Action =
  | { t: 'move'; a: number; b: number }
  | { t: 'hammer'; i: number }
  | { t: 'cross'; i: number }
  | { t: 'shuffle' }
  | { t: 'continue' };

/** Moves granted by one "continue" after running out. */
export const CONTINUE_MOVES = 5;

export interface FallMove {
  /** Source cell, or -1 for a new tile. */
  from: number;
  to: number;
  tile: number;
  /** For new tiles: the (negative) row it starts from. */
  startRow: number;
}

export type GameEvent =
  | { t: 'swap'; a: number; b: number }
  | {
      t: 'clear';
      cells: { i: number; tile: number }[];
      spawns: { i: number; tile: number }[];
      crates: { i: number; tile: number }[];
      frost: { i: number; hp: number }[];
      blasts: { i: number; kind: number }[];
      /** Tiles turned into specials by a rainbow combo before they go off. */
      converts: { i: number; tile: number }[];
      cascade: number;
      score: number;
      remaining: number[];
    }
  | { t: 'fall'; moves: FallMove[] }
  | { t: 'shuffle'; tiles: number[] }
  | { t: 'end'; status: 'won' | 'lost'; score: number; movesLeft: number };

/* ---------- PRNG (mulberry32, state kept inside the game state) ---------- */

export function rngNext(s: { rng: number }): number {
  let t = (s.rng = (s.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const rngInt = (s: { rng: number }, n: number): number => Math.floor(rngNext(s) * n);

/* ---------- Creation ---------- */

/**
 * `startKinds` are pre-level boosters: each turns one plain tile into a special before the
 * first move. Their positions come from a separate generator, so the refill order of the
 * level is the same with or without them.
 */
export function createGame(level: LevelDef, extraMoves = 0, startKinds: number[] = []): GameState {
  const h = level.layout.length;
  const w = level.layout[0].length;
  const n = w * h;
  const s: GameState = {
    w,
    h,
    mask: new Array(n).fill(false),
    tiles: new Array(n).fill(EMPTY),
    frost: new Array(n).fill(0),
    rng: level.seed | 0,
    colors: level.colors,
    movesLeft: level.moves + extraMoves,
    movesUsed: 0,
    score: 0,
    collected: [0, 0, 0, 0, 0, 0],
    frostLeft: 0,
    cratesLeft: 0,
    goals: level.goals,
    status: 'playing',
  };
  for (let y = 0; y < h; y++) {
    const row = level.layout[y];
    if (row.length !== w) throw new Error(`level ${level.id}: ragged layout`);
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      const i = y * w + x;
      if (ch === '#') continue;
      s.mask[i] = true;
      if (ch === 'c' || ch === 'C') {
        s.tiles[i] = CRATE_BASE + (ch === 'C' ? 2 : 1);
        s.cratesLeft++;
      } else if (ch === 'f' || ch === 'F') {
        s.frost[i] = ch === 'F' ? 2 : 1;
        s.frostLeft++;
      } else if (ch !== '.') {
        throw new Error(`level ${level.id}: bad layout char '${ch}'`);
      }
    }
  }
  for (let attempt = 0; attempt < 200; attempt++) {
    fillColors(s);
    if (findGroups(s).length === 0 && findMoves(s).length > 0) {
      const pick = { rng: (level.seed ^ 0x5bd1e995) | 0 };
      for (const kind of startKinds) {
        const plain: number[] = [];
        for (let i = 0; i < n; i++) if (s.mask[i] && isTile(s.tiles[i]) && kindOf(s.tiles[i]) === KIND_NONE) plain.push(i);
        if (plain.length === 0) break;
        const at = plain[rngInt(pick, plain.length)];
        s.tiles[at] = kind === KIND_RAINBOW ? RAINBOW : makeTile(colorOf(s.tiles[at]), kind);
      }
      return s;
    }
    for (let i = 0; i < n; i++) if (isTile(s.tiles[i])) s.tiles[i] = EMPTY;
  }
  throw new Error(`level ${level.id}: could not build a playable board`);
}

export function cloneState(s: GameState): GameState {
  return { ...s, tiles: s.tiles.slice(), frost: s.frost.slice(), collected: s.collected.slice() };
}

/** Gives every empty playable cell a colour that does not complete a run to its left or above. */
function fillColors(s: GameState): void {
  const { w, h, tiles, mask } = s;
  const allowed: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!mask[i] || tiles[i] !== EMPTY) continue;
      allowed.length = 0;
      for (let c = 0; c < s.colors; c++) {
        if (x >= 2 && matchColor(s, i - 1) === c && matchColor(s, i - 2) === c) continue;
        if (y >= 2 && matchColor(s, i - w) === c && matchColor(s, i - 2 * w) === c) continue;
        allowed.push(c);
      }
      tiles[i] = allowed.length ? allowed[rngInt(s, allowed.length)] : rngInt(s, s.colors);
    }
  }
}

/* ---------- Match detection (connected runs) ---------- */

/** Colour a cell matches as, or -1 for holes, empties, crates and rainbows. */
function matchColor(s: GameState, i: number): number {
  if (!s.mask[i]) return -1;
  const t = s.tiles[i];
  if (t < 0 || t >= CRATE_BASE) return -1;
  const c = t & 7;
  return c < RAINBOW_COLOR ? c : -1;
}

interface Group {
  cells: number[];
  color: number;
  maxRun: number;
  hasH: boolean;
  hasV: boolean;
  /** A cell that sits in both a horizontal and a vertical run, or -1. */
  cross: number;
  /** Middle cell of the longest run. */
  mid: number;
  longestIsH: boolean;
}

export function findGroups(s: GameState): Group[] {
  const { w, h } = s;
  const runs: { cells: number[]; horiz: boolean }[] = [];
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      const c = matchColor(s, y * w + x);
      let x2 = x + 1;
      if (c >= 0) {
        while (x2 < w && matchColor(s, y * w + x2) === c) x2++;
        if (x2 - x >= 3) {
          const cells: number[] = [];
          for (let k = x; k < x2; k++) cells.push(y * w + k);
          runs.push({ cells, horiz: true });
        }
      }
      x = x2;
    }
  }
  for (let x = 0; x < w; x++) {
    let y = 0;
    while (y < h) {
      const c = matchColor(s, y * w + x);
      let y2 = y + 1;
      if (c >= 0) {
        while (y2 < h && matchColor(s, y2 * w + x) === c) y2++;
        if (y2 - y >= 3) {
          const cells: number[] = [];
          for (let k = y; k < y2; k++) cells.push(k * w + x);
          runs.push({ cells, horiz: false });
        }
      }
      y = y2;
    }
  }
  if (runs.length === 0) return [];

  // Union runs that share a cell (L, T and + shapes).
  const parent = runs.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) i = parent[i] = parent[parent[i]];
    return i;
  };
  const owner = new Map<number, number>();
  const crossOf = new Map<number, number>();
  runs.forEach((run, ri) => {
    for (const c of run.cells) {
      const o = owner.get(c);
      if (o === undefined) owner.set(c, ri);
      else {
        parent[find(ri)] = find(o);
        crossOf.set(ri, c);
        crossOf.set(o, c);
      }
    }
  });
  const byRoot = new Map<number, Group>();
  runs.forEach((run, ri) => {
    const root = find(ri);
    let g = byRoot.get(root);
    if (!g) {
      g = {
        cells: [],
        color: colorOf(s.tiles[run.cells[0]]),
        maxRun: 0,
        hasH: false,
        hasV: false,
        cross: -1,
        mid: -1,
        longestIsH: true,
      };
      byRoot.set(root, g);
    }
    for (const c of run.cells) if (!g.cells.includes(c)) g.cells.push(c);
    if (run.horiz) g.hasH = true;
    else g.hasV = true;
    if (run.cells.length > g.maxRun) {
      g.maxRun = run.cells.length;
      g.mid = run.cells[(run.cells.length - 1) >> 1];
      g.longestIsH = run.horiz;
    }
    const x = crossOf.get(ri);
    if (x !== undefined) g.cross = x;
  });
  return [...byRoot.values()];
}

function matchAt(s: GameState, i: number): boolean {
  const c = matchColor(s, i);
  if (c < 0) return false;
  const { w, h } = s;
  const x = i % w;
  const y = (i - x) / w;
  let n = 1;
  for (let k = x - 1; k >= 0 && matchColor(s, y * w + k) === c; k--) n++;
  for (let k = x + 1; k < w && matchColor(s, y * w + k) === c; k++) n++;
  if (n >= 3) return true;
  n = 1;
  for (let k = y - 1; k >= 0 && matchColor(s, k * w + x) === c; k--) n++;
  for (let k = y + 1; k < h && matchColor(s, k * w + x) === c; k++) n++;
  return n >= 3;
}

const swappable = (s: GameState, i: number): boolean => s.mask[i] && isTile(s.tiles[i]);

function isCombo(ta: number, tb: number): boolean {
  const ka = kindOf(ta);
  const kb = kindOf(tb);
  return ka === KIND_RAINBOW || kb === KIND_RAINBOW || (ka !== KIND_NONE && kb !== KIND_NONE);
}

function swapWorks(s: GameState, a: number, b: number): boolean {
  if (!swappable(s, a) || !swappable(s, b)) return false;
  const ta = s.tiles[a];
  const tb = s.tiles[b];
  if (isCombo(ta, tb)) return true;
  if (colorOf(ta) === colorOf(tb)) return false;
  s.tiles[a] = tb;
  s.tiles[b] = ta;
  const ok = matchAt(s, a) || matchAt(s, b);
  s.tiles[a] = ta;
  s.tiles[b] = tb;
  return ok;
}

export interface Move {
  a: number;
  b: number;
}

/** Every legal swap on the board. Empty result on a playing board means a dead board. */
export function findMoves(s: GameState): Move[] {
  const { w, h } = s;
  const out: Move[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (x + 1 < w && swapWorks(s, i, i + 1)) out.push({ a: i, b: i + 1 });
      if (y + 1 < h && swapWorks(s, i, i + w)) out.push({ a: i, b: i + w });
    }
  }
  return out;
}

/* ---------- Goals ---------- */

/** Units still missing per goal (0 = done). */
export function goalsRemaining(s: GameState): number[] {
  return s.goals.map((g) => {
    switch (g.t) {
      case 'score':
        return Math.max(0, g.n - s.score);
      case 'color':
        return Math.max(0, g.n - s.collected[g.c]);
      case 'frost':
        return s.frostLeft;
      case 'crate':
        return s.cratesLeft;
    }
  });
}

const goalsDone = (s: GameState): boolean => goalsRemaining(s).every((r) => r === 0);

/* ---------- Resolution ---------- */

function clearStep(
  s: GameState,
  seeds: number[],
  matched: number[],
  spawns: { i: number; tile: number }[],
  converts: { i: number; tile: number }[],
  cascade: number,
  events: GameEvent[],
): void {
  const { w, h, tiles, mask } = s;
  const n = w * h;
  const flag = new Uint8Array(n);
  const queue = seeds.slice();
  const blasts: { i: number; kind: number }[] = [];
  while (queue.length) {
    const i = queue.pop() as number;
    if (i < 0 || i >= n || flag[i] || !mask[i]) continue;
    flag[i] = 1;
    const t = tiles[i];
    if (!isTile(t)) continue;
    const kind = kindOf(t);
    if (kind === KIND_NONE) continue;
    const x = i % w;
    const y = (i - x) / w;
    blasts.push({ i, kind });
    if (kind === KIND_LINE_H) {
      for (let k = 0; k < w; k++) queue.push(y * w + k);
    } else if (kind === KIND_LINE_V) {
      for (let k = 0; k < h; k++) queue.push(k * w + x);
    } else if (kind === KIND_BOMB) {
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) queue.push(ny * w + nx);
        }
    } else if (kind === KIND_RAINBOW) {
      // Set off by a blast rather than a swap: takes the most common colour still standing.
      const counts = [0, 0, 0, 0, 0, 0];
      for (let k = 0; k < n; k++) if (!flag[k]) {
        const c = matchColor(s, k);
        if (c >= 0) counts[c]++;
      }
      let best = 0;
      for (let c = 1; c < 6; c++) if (counts[c] > counts[best]) best = c;
      for (let k = 0; k < n; k++) if (!flag[k] && matchColor(s, k) === best) queue.push(k);
    }
  }

  const cells: { i: number; tile: number }[] = [];
  const crates: { i: number; tile: number }[] = [];
  const frost: { i: number; hp: number }[] = [];
  const crateHit = new Uint8Array(n);
  const hitCrate = (i: number): void => {
    if (crateHit[i]) return;
    crateHit[i] = 1;
    const hp = crateHp(tiles[i]) - 1;
    if (hp <= 0) {
      tiles[i] = EMPTY;
      s.cratesLeft--;
      s.score += 30;
    } else tiles[i] = CRATE_BASE + hp;
    crates.push({ i, tile: tiles[i] });
  };
  for (let i = 0; i < n; i++) {
    if (!flag[i]) continue;
    const t = tiles[i];
    if (isCrate(t)) hitCrate(i);
    else if (t >= 0) {
      cells.push({ i, tile: t });
      const c = colorOf(t);
      if (c < RAINBOW_COLOR) s.collected[c]++;
      tiles[i] = EMPTY;
      if (s.frost[i] > 0) {
        s.frost[i]--;
        if (s.frost[i] === 0) {
          s.frostLeft--;
          s.score += 20;
        }
        frost.push({ i, hp: s.frost[i] });
      }
    }
  }
  for (const i of matched) {
    const x = i % w;
    if (x > 0 && isCrate(tiles[i - 1])) hitCrate(i - 1);
    if (x < w - 1 && isCrate(tiles[i + 1])) hitCrate(i + 1);
    if (i - w >= 0 && isCrate(tiles[i - w])) hitCrate(i - w);
    if (i + w < n && isCrate(tiles[i + w])) hitCrate(i + w);
  }
  for (const sp of spawns) tiles[sp.i] = sp.tile;
  s.score += cells.length * 10 * cascade + spawns.length * 40;
  events.push({
    t: 'clear',
    cells,
    spawns,
    crates,
    frost,
    blasts,
    converts,
    cascade,
    score: s.score,
    remaining: goalsRemaining(s),
  });
}

function gravity(s: GameState, events: GameEvent[]): void {
  const { w, h, tiles, mask } = s;
  const moves: FallMove[] = [];
  for (let x = 0; x < w; x++) {
    // Playable cells of this column, bottom first. Tiles fall straight through holes.
    const col: number[] = [];
    for (let y = h - 1; y >= 0; y--) if (mask[y * w + x]) col.push(y * w + x);
    let write = 0;
    for (let read = 0; read < col.length; read++) {
      const t = tiles[col[read]];
      if (t === EMPTY) continue;
      if (read !== write) {
        tiles[col[write]] = t;
        tiles[col[read]] = EMPTY;
        moves.push({ from: col[read], to: col[write], tile: t, startRow: 0 });
      }
      write++;
    }
    for (let k = write, j = 0; k < col.length; k++, j++) {
      const t = makeTile(rngInt(s, s.colors));
      tiles[col[k]] = t;
      moves.push({ from: -1, to: col[k], tile: t, startRow: -1 - j });
    }
  }
  if (moves.length) events.push({ t: 'fall', moves });
}

function groupsToClear(
  groups: Group[],
  swapped: number[],
): { seeds: number[]; spawns: { i: number; tile: number }[] } {
  const seeds: number[] = [];
  const spawns: { i: number; tile: number }[] = [];
  for (const g of groups) {
    for (const c of g.cells) seeds.push(c);
    let kind = KIND_NONE;
    if (g.maxRun >= 5) kind = KIND_RAINBOW;
    else if (g.hasH && g.hasV) kind = KIND_BOMB;
    else if (g.maxRun === 4) kind = g.longestIsH ? KIND_LINE_V : KIND_LINE_H;
    if (kind === KIND_NONE) continue;
    let at = swapped.find((c) => g.cells.includes(c));
    if (at === undefined) at = kind === KIND_BOMB && g.cross >= 0 ? g.cross : g.mid;
    spawns.push({ i: at, tile: kind === KIND_RAINBOW ? RAINBOW : makeTile(g.color, kind) });
  }
  return { seeds, spawns };
}

/** Falls, then clears and falls again until the board is stable. */
function settle(s: GameState, events: GameEvent[], cascade: number): void {
  for (let guard = 0; guard < 500; guard++) {
    gravity(s, events);
    const groups = findGroups(s);
    if (groups.length === 0) return;
    cascade++;
    const { seeds, spawns } = groupsToClear(groups, []);
    clearStep(s, seeds, seeds, spawns, [], cascade, events);
  }
  throw new Error('cascade did not settle');
}

function shuffleBoard(s: GameState): boolean {
  const n = s.w * s.h;
  const idx: number[] = [];
  for (let i = 0; i < n; i++) if (s.mask[i] && isTile(s.tiles[i])) idx.push(i);
  for (let attempt = 0; attempt < 100; attempt++) {
    for (let k = idx.length - 1; k > 0; k--) {
      const j = rngInt(s, k + 1);
      const tmp = s.tiles[idx[k]];
      s.tiles[idx[k]] = s.tiles[idx[j]];
      s.tiles[idx[j]] = tmp;
    }
    if (findGroups(s).length === 0 && findMoves(s).length > 0) return true;
  }
  // The colours on the board cannot be arranged into a playable position: deal new ones.
  for (let attempt = 0; attempt < 100; attempt++) {
    for (const i of idx) if (kindOf(s.tiles[i]) === KIND_NONE) s.tiles[i] = EMPTY;
    fillColors(s);
    if (findGroups(s).length === 0 && findMoves(s).length > 0) return true;
  }
  return false;
}

function finish(s: GameState, events: GameEvent[], spentMove: boolean): void {
  if (spentMove) {
    s.movesLeft--;
    s.movesUsed++;
  }
  if (goalsDone(s)) {
    s.status = 'won';
    s.score += s.movesLeft * 50;
  } else if (s.movesLeft <= 0) {
    s.status = 'lost';
  } else if (findMoves(s).length === 0) {
    // Dead board: reshuffle for free. Only a board that cannot be dealt at all ends the run.
    if (shuffleBoard(s)) events.push({ t: 'shuffle', tiles: s.tiles.slice() });
    else s.status = 'lost';
  }
  if (s.status !== 'playing') {
    events.push({ t: 'end', status: s.status, score: s.score, movesLeft: s.movesLeft });
  }
}

/**
 * Swaps two adjacent cells. Returns the animation events, or null when the swap is not legal
 * (in which case the state is untouched).
 */
export function applyMove(s: GameState, a: number, b: number): GameEvent[] | null {
  if (s.status !== 'playing') return null;
  const { w, h } = s;
  const n = w * h;
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a >= n || b >= n) return null;
  const d = Math.abs(a - b);
  const sameRow = Math.floor(a / w) === Math.floor(b / w);
  if (!((d === 1 && sameRow) || d === w)) return null;
  if (!swapWorks(s, a, b)) return null;

  const events: GameEvent[] = [{ t: 'swap', a, b }];
  const ta = s.tiles[a];
  const tb = s.tiles[b];
  s.tiles[a] = tb;
  s.tiles[b] = ta;

  if (isCombo(ta, tb)) {
    const seeds: number[] = [];
    const converts: { i: number; tile: number }[] = [];
    const ka = kindOf(ta);
    const kb = kindOf(tb);
    const bx = b % w;
    const by = (b - bx) / w;
    if (ka === KIND_RAINBOW && kb === KIND_RAINBOW) {
      s.tiles[a] = s.tiles[b] = RAINBOW_COLOR;
      for (let i = 0; i < n; i++) seeds.push(i);
    } else if (ka === KIND_RAINBOW || kb === KIND_RAINBOW) {
      const rainbowAt = ka === KIND_RAINBOW ? b : a;
      const other = ka === KIND_RAINBOW ? tb : ta;
      const color = colorOf(other);
      const kind = kindOf(other);
      s.tiles[rainbowAt] = RAINBOW_COLOR;
      seeds.push(rainbowAt);
      for (let i = 0; i < n; i++) {
        if (matchColor(s, i) !== color) continue;
        if (kind !== KIND_NONE && kindOf(s.tiles[i]) === KIND_NONE) {
          const k = kind === KIND_BOMB ? KIND_BOMB : (i + Math.floor(i / w)) % 2 ? KIND_LINE_H : KIND_LINE_V;
          s.tiles[i] = makeTile(color, k);
          converts.push({ i, tile: s.tiles[i] });
        }
        seeds.push(i);
      }
    } else {
      // Two specials: both are spent, the blast is centred on the cell swapped into.
      s.tiles[a] = colorOf(tb);
      s.tiles[b] = colorOf(ta);
      const bombs = (ka === KIND_BOMB ? 1 : 0) + (kb === KIND_BOMB ? 1 : 0);
      const r = bombs === 2 ? 2 : 1;
      if (bombs === 2) {
        for (let y = by - r; y <= by + r; y++)
          for (let x = bx - r; x <= bx + r; x++) if (x >= 0 && x < w && y >= 0 && y < h) seeds.push(y * w + x);
      } else {
        const half = bombs === 1 ? 1 : 0;
        for (let y = by - half; y <= by + half; y++) if (y >= 0 && y < h) for (let x = 0; x < w; x++) seeds.push(y * w + x);
        for (let x = bx - half; x <= bx + half; x++) if (x >= 0 && x < w) for (let y = 0; y < h; y++) seeds.push(y * w + x);
      }
      seeds.push(a, b);
    }
    clearStep(s, seeds, [], [], converts, 1, events);
  } else {
    const { seeds, spawns } = groupsToClear(findGroups(s), [b, a]);
    clearStep(s, seeds, seeds, spawns, [], 1, events);
  }
  settle(s, events, 1);
  finish(s, events, true);
  return events;
}

/** Hammer booster: removes one tile (or hits one crate) without spending a move. */
export function applyHammer(s: GameState, i: number): GameEvent[] | null {
  if (s.status !== 'playing') return null;
  if (!Number.isInteger(i) || i < 0 || i >= s.w * s.h || !s.mask[i] || s.tiles[i] === EMPTY) return null;
  const events: GameEvent[] = [];
  clearStep(s, [i], [], [], [], 1, events);
  settle(s, events, 1);
  finish(s, events, false);
  return events;
}

/** Cross booster: clears the whole row and column of a cell without spending a move. */
export function applyCross(s: GameState, i: number): GameEvent[] | null {
  if (s.status !== 'playing') return null;
  const { w, h } = s;
  if (!Number.isInteger(i) || i < 0 || i >= w * h || !s.mask[i]) return null;
  const x = i % w;
  const y = (i - x) / w;
  const seeds: number[] = [];
  for (let k = 0; k < w; k++) seeds.push(y * w + k);
  for (let k = 0; k < h; k++) seeds.push(k * w + x);
  const events: GameEvent[] = [];
  clearStep(s, seeds, [], [], [], 1, events);
  // shown as a line blast in both directions
  const first = events[0];
  if (first.t === 'clear') first.blasts.unshift({ i, kind: KIND_LINE_H }, { i, kind: KIND_LINE_V });
  settle(s, events, 1);
  finish(s, events, false);
  return events;
}

/** Continue after running out of moves: a few more moves on the same board. */
export function applyContinue(s: GameState): GameEvent[] | null {
  if (s.status !== 'lost' || s.movesLeft > 0) return null;
  s.movesLeft = CONTINUE_MOVES;
  s.status = 'playing';
  const events: GameEvent[] = [];
  if (findMoves(s).length === 0) {
    if (shuffleBoard(s)) events.push({ t: 'shuffle', tiles: s.tiles.slice() });
    else {
      s.movesLeft = 0;
      s.status = 'lost';
      return null;
    }
  }
  return events;
}

/** Shuffle booster: rearranges the board without spending a move. */
export function applyShuffle(s: GameState): GameEvent[] | null {
  if (s.status !== 'playing') return null;
  const events: GameEvent[] = [];
  if (!shuffleBoard(s)) return null;
  events.push({ t: 'shuffle', tiles: s.tiles.slice() });
  return events;
}

export function applyAction(s: GameState, act: Action): GameEvent[] | null {
  if (act.t === 'move') return applyMove(s, act.a, act.b);
  if (act.t === 'hammer') return applyHammer(s, act.i);
  if (act.t === 'cross') return applyCross(s, act.i);
  if (act.t === 'continue') return applyContinue(s);
  return applyShuffle(s);
}

/** Replays a list of actions from the level's seed. Throws on the first illegal action. */
export function replay(level: LevelDef, extraMoves: number, actions: Action[]): GameState {
  const s = createGame(level, extraMoves);
  actions.forEach((act, k) => {
    if (applyAction(s, act) === null) throw new Error(`illegal action #${k}`);
  });
  return s;
}

export function proofActions(level: LevelDef): Action[] {
  const out: Action[] = [];
  for (let k = 0; k + 1 < level.proof.length; k += 2) out.push({ t: 'move', a: level.proof[k], b: level.proof[k + 1] });
  return out;
}

export function starsFor(level: LevelDef, score: number): number {
  return score >= level.stars[1] ? 3 : score >= level.stars[0] ? 2 : 1;
}
