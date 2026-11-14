import { describe, expect, it } from 'vitest';
import {
  EMPTY, KIND_BOMB, KIND_LINE_H, KIND_LINE_V, RAINBOW, applyHammer, applyMove, applyShuffle, cloneState, createGame,
  findGroups, findMoves, isCrate, kindOf, makeTile, proofActions, replay, rngNext, starsFor,
  type GameEvent, type GameState, type LevelDef,
} from '../src/engine/engine';
import { playout, pickMove } from '../src/engine/bots';
import { assistMoves } from '../src/engine/assist';
import { verifyRun } from '../src/engine/verify';
import { LEVELS } from '../src/levels';

const level = (layout: string[], over: Partial<LevelDef> = {}): LevelDef => ({
  id: 999, seed: 12345, colors: 5, moves: 20, layout, goals: [{ t: 'score', n: 1e9 }], stars: [0, 0], proof: [], ...over,
});
const open = (w: number, h: number): string[] => Array.from({ length: h }, () => '.'.repeat(w));

/** Board from rows of colour digits; a..f = special kinds via suffix map. */
function board(rows: string[], over: Partial<LevelDef> = {}): GameState {
  const s = createGame(level(open(rows[0].length, rows.length), over));
  rows.forEach((row, y) => [...row].forEach((ch, x) => (s.tiles[y * s.w + x] = Number(ch))));
  expect(findGroups(s)).toHaveLength(0);
  return s;
}

function assertStable(s: GameState): void {
  for (let i = 0; i < s.tiles.length; i++) {
    if (s.mask[i]) expect(s.tiles[i]).not.toBe(EMPTY);
    else expect(s.tiles[i]).toBe(EMPTY);
  }
  expect(findGroups(s)).toHaveLength(0);
  expect(s.frostLeft).toBe(s.frost.filter((f) => f > 0).length);
  expect(s.cratesLeft).toBe(s.tiles.filter(isCrate).length);
  if (s.status === 'playing') expect(findMoves(s).length).toBeGreaterThan(0);
}

describe('prng', () => {
  it('is deterministic and uniform enough', () => {
    const a = { rng: 42 }, b = { rng: 42 };
    let sum = 0;
    for (let i = 0; i < 10000; i++) {
      const v = rngNext(a);
      expect(v).toBe(rngNext(b));
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      sum += v;
    }
    expect(sum / 10000).toBeGreaterThan(0.48);
    expect(sum / 10000).toBeLessThan(0.52);
  });
});

describe('shipped levels', () => {
  it('has 60 levels with consecutive ids', () => {
    expect(LEVELS).toHaveLength(60);
    LEVELS.forEach((l, k) => expect(l.id).toBe(k + 1));
  });

  it.each(LEVELS.map((l) => [l.id, l] as const))('level %i starts stable and its proof wins without boosters', (_id, l) => {
    const s = createGame(l);
    assertStable(s);
    expect(l.proof.length / 2).toBeLessThanOrEqual(l.moves);
    expect(l.stars[1]).toBeGreaterThan(l.stars[0]);
    const end = replay(l, 0, proofActions(l));
    expect(end.status).toBe('won');
    expect(starsFor(l, end.score)).toBeGreaterThanOrEqual(1);
    // Fixed-seed regression: the same input must give the same result, bit for bit.
    expect(replay(l, 0, proofActions(l))).toEqual(end);
  });

  it.each(LEVELS.map((l) => [l.id, l] as const))('level %i keeps its invariants through random play', (_id, l) => {
    for (const persona of ['novice', 'bottom', 'casual'] as const) {
      const s = createGame(l);
      const bot = { rng: l.id * 977 + persona.length };
      let lastScore = 0;
      while (s.status === 'playing') {
        const m = pickMove(s, persona, bot)!;
        const before = s.movesLeft;
        const ev = applyMove(s, m.a, m.b)!;
        expect(ev[0]).toEqual({ t: 'swap', a: m.a, b: m.b });
        expect(s.movesLeft).toBe(before - 1);
        expect(s.score).toBeGreaterThanOrEqual(lastScore);
        lastScore = s.score;
        assertStable(s);
      }
      expect(s.movesLeft).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('moves', () => {
  it('rejects illegal swaps and leaves the state untouched', () => {
    const s = createGame(LEVELS[0]);
    const snap = cloneState(s);
    const legal = new Set(findMoves(s).flatMap((m) => [`${m.a},${m.b}`, `${m.b},${m.a}`]));
    const n = s.w * s.h;
    for (let a = -2; a < n + 2; a++)
      for (let b = -2; b < n + 2; b++) {
        if (legal.has(`${a},${b}`)) continue;
        expect(applyMove(s, a, b)).toBeNull();
      }
    expect(applyMove(s, 0.5, 1)).toBeNull();
    expect(applyMove(s, s.w - 1, s.w)).toBeNull(); // wraps around a row end
    expect(s).toEqual(snap);
  });

  it('accepts a swap in either direction with the same result', () => {
    const a = createGame(LEVELS[0]), b = createGame(LEVELS[0]);
    const m = findMoves(a)[0];
    applyMove(a, m.a, m.b);
    applyMove(b, m.b, m.a);
    expect(a.score).toBe(b.score);
  });

  it('does nothing once the game is over', () => {
    const l = LEVELS[0];
    const s = replay(l, 0, proofActions(l));
    expect(applyMove(s, 0, 1)).toBeNull();
    expect(applyHammer(s, 0)).toBeNull();
    expect(applyShuffle(s)).toBeNull();
  });
});

const firstClear = (ev: GameEvent[]) => ev.find((e) => e.t === 'clear') as Extract<GameEvent, { t: 'clear' }>;

describe('special tiles', () => {
  const base = ['01234', '12340', '23401', '34012', '40123'];
  const put = (rows: string[], y: number, x: number, ch: string): void => {
    rows[y] = rows[y].slice(0, x) + ch + rows[y].slice(x + 1);
  };

  it('makes a line tile from four in a row', () => {
    const rows = base.slice();
    // row 2: 0 0 . 0 with the missing 0 one cell above the gap
    rows[2] = '00301';
    put(rows, 1, 2, '0');
    const s = board(rows);
    const ev = applyMove(s, 1 * 5 + 2, 2 * 5 + 2)!;
    const c = firstClear(ev);
    expect(c.cells).toHaveLength(4);
    expect(c.spawns).toHaveLength(1);
    expect(c.spawns[0].i).toBe(12);
    expect(kindOf(c.spawns[0].tile)).toBe(KIND_LINE_V);
  });

  it('makes a rainbow from five in a row', () => {
    const s = createGame(level(open(7, 7)));
    const rows = ['0123401', '1234012', '2340123', '3401234', '4012340', '0123401', '1234012'];
    rows.forEach((row, y) => [...row].forEach((ch, x) => (s.tiles[y * 7 + x] = Number(ch))));
    // five: row 3 -> 0 0 x 0 0 with a 0 above the gap
    [0, 1, 3, 4].forEach((x) => (s.tiles[3 * 7 + x] = 0));
    s.tiles[3 * 7 + 2] = 2;
    s.tiles[2 * 7 + 2] = 0;
    s.tiles[2 * 7 + 0] = 3; s.tiles[2 * 7 + 1] = 1; s.tiles[4 * 7 + 0] = 2; s.tiles[4 * 7 + 1] = 3;
    s.tiles[4 * 7 + 3] = 3; s.tiles[4 * 7 + 4] = 1; s.tiles[2 * 7 + 3] = 4; s.tiles[2 * 7 + 4] = 2;
    expect(findGroups(s)).toHaveLength(0);
    const c = firstClear(applyMove(s, 2 * 7 + 2, 3 * 7 + 2)!);
    expect(c.spawns[0]).toEqual({ i: 3 * 7 + 2, tile: RAINBOW });

  });

  it('makes a bomb from an L or T shape', () => {
    const w = 6;
    const s = createGame(level(open(6, 6)));
    const rows = ['012340', '123401', '234012', '340123', '401234', '012340'];
    rows.forEach((row, y) => [...row].forEach((ch, x) => (s.tiles[y * w + x] = Number(ch))));
    // T: row 2 cols 1..3 = 0 except centre (2,2) which gets its 0 from (1,2)... plus column 2 rows 3,4 = 0
    s.tiles[2 * w + 1] = 0; s.tiles[2 * w + 3] = 0; s.tiles[3 * w + 2] = 0; s.tiles[4 * w + 2] = 0;
    s.tiles[2 * w + 2] = 3; s.tiles[1 * w + 2] = 0;
    s.tiles[1 * w + 1] = 2; s.tiles[1 * w + 3] = 4; s.tiles[0 * w + 2] = 1; s.tiles[5 * w + 2] = 1;
    s.tiles[3 * w + 1] = 4; s.tiles[3 * w + 3] = 2; s.tiles[4 * w + 1] = 3; s.tiles[4 * w + 3] = 1;
    s.tiles[2 * w + 0] = 1; s.tiles[2 * w + 4] = 2;
    expect(findGroups(s)).toHaveLength(0);
    const c = firstClear(applyMove(s, 1 * w + 2, 2 * w + 2)!);
    expect(c.cells).toHaveLength(5);
    expect(c.spawns).toHaveLength(1);
    expect(c.spawns[0].i).toBe(2 * w + 2);
    expect(kindOf(c.spawns[0].tile)).toBe(KIND_BOMB);
  });

  it('line tiles clear a whole row or column when matched', () => {
    const rows = base.slice();
    rows[2] = '00301';
    put(rows, 1, 2, '0');
    const s = board(rows);
    s.tiles[2 * 5 + 0] = makeTile(0, KIND_LINE_H);
    const c = firstClear(applyMove(s, 7, 12)!);
    const cleared = new Set(c.cells.map((x) => x.i));
    for (let x = 0; x < 5; x++) expect(cleared.has(2 * 5 + x)).toBe(true);
    expect(c.blasts).toEqual([{ i: 10, kind: KIND_LINE_H }]);
  });

  it('rainbow + colour clears every tile of that colour', () => {
    const s = board(base.slice());
    s.tiles[12] = RAINBOW;
    const target = s.tiles[13];
    const count = s.tiles.filter((t) => t === target).length;
    const c = firstClear(applyMove(s, 12, 13)!);
    expect(c.cells.filter((x) => x.tile === target)).toHaveLength(count);
    expect(s.collected[target]).toBeGreaterThanOrEqual(count);
  });

  it('rainbow + rainbow clears the board, two bombs clear 5x5, two lines clear a cross', () => {
    let s = board(base.slice());
    s.tiles[12] = RAINBOW; s.tiles[13] = RAINBOW;
    expect(firstClear(applyMove(s, 12, 13)!).cells).toHaveLength(25);

    s = board(base.slice());
    s.tiles[12] = makeTile(0, KIND_BOMB); s.tiles[13] = makeTile(1, KIND_BOMB);
    expect(firstClear(applyMove(s, 13, 12)!).cells).toHaveLength(25);

    s = board(base.slice());
    s.tiles[12] = makeTile(0, KIND_LINE_H); s.tiles[13] = makeTile(1, KIND_LINE_H);
    expect(firstClear(applyMove(s, 13, 12)!).cells).toHaveLength(9);
  });

  it('rainbow + special turns that colour into specials and sets them off', () => {
    const s = board(base.slice());
    s.tiles[12] = RAINBOW;
    s.tiles[13] = makeTile(3, KIND_LINE_V);
    const c = firstClear(applyMove(s, 12, 13)!);
    expect(c.converts.length).toBeGreaterThan(0);
    expect(c.blasts.length).toBeGreaterThan(c.converts.length - 1);
  });
});

describe('blockers and goals', () => {
  it('crates take hits from neighbouring matches and fall like tiles', () => {
    const s = createGame(level(['.....', '.....', '.....', '.....', 'CcCcC'], { goals: [{ t: 'crate' }], moves: 90 }));
    expect(s.cratesLeft).toBe(5);
    const r = playout(s, 'strategic', 7);
    expect(r.won).toBe(true);
    expect(s.cratesLeft).toBe(0);
  });

  it('frost is removed by clearing tiles on it', () => {
    const s = createGame(level(['.....', '.fFf.', '.FfF.', '.fFf.', '.....'], { goals: [{ t: 'frost' }], moves: 90 }));
    expect(s.frostLeft).toBe(9);
    expect(playout(s, 'strategic', 3).won).toBe(true);
    expect(s.frost.every((f) => f === 0)).toBe(true);
  });

  it('winning converts leftover moves into score and ends the game', () => {
    const s = createGame(level(open(6, 6), { goals: [{ t: 'score', n: 30 }], moves: 10 }));
    const m = findMoves(s)[0];
    const ev = applyMove(s, m.a, m.b)!;
    expect(s.status).toBe('won');
    expect(ev[ev.length - 1]).toMatchObject({ t: 'end', status: 'won', movesLeft: 9 });
    expect(s.score).toBeGreaterThanOrEqual(30 + 9 * 50);
  });

  it('running out of moves loses', () => {
    const s = createGame(level(open(6, 6), { moves: 1 }));
    const m = findMoves(s)[0];
    const ev = applyMove(s, m.a, m.b)!;
    expect(s.status).toBe('lost');
    expect(ev[ev.length - 1]).toMatchObject({ t: 'end', status: 'lost' });
  });

  it('tiles fall through holes', () => {
    const s = createGame(level(['....', '....', '#..#', '....', '....', '....'], { colors: 4, moves: 60 }));
    for (let k = 0; k < 60 && s.status === 'playing'; k++) {
      const m = findMoves(s)[0];
      applyMove(s, m.a, m.b);
      assertStable(s);
    }
  });
});

describe('dead boards and boosters', () => {
  it('reshuffles instead of getting stuck, on boards where dead positions are common', () => {
    let shuffles = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const s = createGame(level(open(4, 4), { colors: 6, seed, moves: 80 }));
      const bot = { rng: seed };
      while (s.status === 'playing') {
        const m = pickMove(s, 'novice', bot)!;
        expect(m).not.toBeNull();
        const ev = applyMove(s, m.a, m.b)!;
        shuffles += ev.filter((e) => e.t === 'shuffle').length;
        assertStable(s);
      }
      expect(s.movesLeft).toBe(0);
    }
    expect(shuffles).toBeGreaterThan(0);
  });

  it('shuffle booster keeps the same tiles and leaves a playable board', () => {
    const s = createGame(LEVELS[20]);
    const before = s.tiles.slice().sort();
    const moves = s.movesLeft;
    expect(applyShuffle(s)).toHaveLength(1);
    expect(s.tiles.slice().sort()).toEqual(before);
    expect(s.movesLeft).toBe(moves);
    assertStable(s);
  });

  it('hammer removes a tile without spending a move and rejects bad cells', () => {
    const s = createGame(LEVELS[0]);
    const moves = s.movesLeft;
    const ev = applyHammer(s, 7)!;
    expect(firstClear(ev).cells[0].i).toBe(7);
    expect(s.movesLeft).toBe(moves);
    assertStable(s);
    expect(applyHammer(s, -1)).toBeNull();
    expect(applyHammer(s, 9999)).toBeNull();
    const holed = createGame(level(['#...', '....', '....', '....']));
    expect(applyHammer(holed, 0)).toBeNull();
  });

  it('special line orientation constants differ', () => {
    expect(KIND_LINE_H).not.toBe(KIND_LINE_V);
  });
});

describe('fair assist', () => {
  it('only ever adds moves, and only after repeated failures', () => {
    expect(assistMoves(0, true)).toBe(0);
    expect(assistMoves(1, true)).toBe(0);
    expect(assistMoves(2, true)).toBe(2);
    expect(assistMoves(4, true)).toBe(3);
    expect(assistMoves(50, true)).toBe(5);
    expect(assistMoves(50, false)).toBe(0);
    for (let f = 0; f < 20; f++) expect(assistMoves(f + 1, true)).toBeGreaterThanOrEqual(assistMoves(f, true));
  });
});

describe('server-side run verification', () => {
  const l = LEVELS[4];
  it('accepts a genuine winning run and reports the replayed score', () => {
    const v = verifyRun(LEVELS, { levelId: l.id, fails: 0, actions: proofActions(l) });
    expect(v).toMatchObject({ ok: true, score: replay(l, 0, proofActions(l)).score, boosters: 0 });
  });
  it('rejects unknown levels, illegal actions and runs that do not win', () => {
    expect(verifyRun(LEVELS, { levelId: 0, fails: 0, actions: [] }).ok).toBe(false);
    expect(verifyRun(LEVELS, { levelId: 61, fails: 0, actions: [] }).ok).toBe(false);
    expect(verifyRun(LEVELS, { levelId: l.id, fails: 0, actions: [] })).toEqual({ ok: false, reason: 'run does not end in a win' });
    expect(verifyRun(LEVELS, { levelId: l.id, fails: 0, actions: [{ t: 'move', a: 0, b: 30 }] })).toEqual({ ok: false, reason: 'illegal action' });
    expect(verifyRun(LEVELS, { levelId: l.id, fails: 0, actions: [...proofActions(l), { t: 'shuffle' }] }).ok).toBe(false);
  });
});
