/**
 * Builds src/levels/levels.json. For each level it picks a layout and goals, then calibrates
 * the move limit against bot playouts so that a casual player wins a set share of attempts,
 * and stores a winning move list as proof that the level can be beaten without boosters.
 * Deterministic: running it twice gives the same file.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createGame, replay, proofActions, type Goal, type LevelDef } from '../src/engine/engine';
import { playout, type Persona, type Playout } from '../src/engine/bots';

const COUNT = 60;
const CAP = 90;
const RUNS: Record<Persona, number> = { casual: 60, strategic: 40, novice: 40, bottom: 0 };

const hash = (n: number): number => {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  return (x ^ (x >>> 16)) | 0;
};

type Grid = string[][];
const blank = (w: number, h: number): Grid => Array.from({ length: h }, () => Array<string>(w).fill('.'));

const SHAPES: ((g: Grid) => void)[] = [
  () => {},
  (g) => {
    const h = g.length, w = g[0].length;
    g[0][0] = g[0][w - 1] = g[h - 1][0] = g[h - 1][w - 1] = '#';
  },
  (g) => {
    const h = g.length, w = g[0].length;
    const cy = (h >> 1) - 1, cx = (w >> 1) - 1;
    g[cy][cx] = g[cy][cx + 1] = g[cy + 1][cx] = g[cy + 1][cx + 1] = '#';
  },
  (g) => {
    const h = g.length, w = g[0].length;
    for (const [y, x] of [[0, 0], [0, 1], [1, 0], [0, w - 1], [0, w - 2], [1, w - 1]]) g[y][x] = '#';
    for (const [y, x] of [[h - 1, 0], [h - 1, w - 1]]) g[y][x] = '#';
  },
  (g) => {
    const h = g.length, w = g[0].length;
    const my = h >> 1;
    g[my][0] = g[my][w - 1] = g[my - 1][0] = g[my - 1][w - 1] = '#';
  },
];

/** Marks `ch` on cells picked by a symmetric pattern; holes are left alone. */
function paint(g: Grid, weak: string, pattern: number, amount: number, allStrong: boolean, sparse = 1): void {
  const h = g.length, w = g[0].length;
  const strong = weak.toUpperCase();
  const ch = allStrong ? strong : weak;
  const put = (y: number, x: number, c = ch): void => {
    if (y >= 0 && y < h && x >= 0 && x < w && g[y][x] === '.' && (x + 2 * y) % sparse === 0) g[y][x] = c;
  };
  switch (pattern % 5) {
    case 0: // bottom rows
      for (let r = 0; r < amount; r++) for (let x = 0; x < w; x++) put(h - 1 - r, x, r === 0 && amount > 1 ? strong : ch);
      break;
    case 1: // centre block
      for (let y = (h >> 1) - amount; y < (h >> 1) + amount; y++)
        for (let x = (w >> 1) - amount; x < (w >> 1) + amount; x++) put(y, x);
      break;
    case 2: // checkerboard in the lower half
      for (let y = h - 1 - amount * 2; y < h; y++) for (let x = 0; x < w; x++) if ((x + y) % 2 === 0) put(y, x);
      break;
    case 3: // two side columns
      for (let y = h - 2 - amount; y < h; y++) {
        put(y, 0);
        put(y, w - 1);
        if (amount > 1) {
          put(y, 1);
          put(y, w - 2);
        }
      }
      break;
    case 4: // ring
      for (let x = 1; x < w - 1; x++) {
        put(1, x);
        put(h - 2, x, amount > 1 ? strong : ch);
      }
      for (let y = 1; y < h - 1; y++) {
        put(y, 1);
        put(y, w - 2);
      }
      break;
  }
}

interface Draft {
  layout: string[];
  colors: number;
  goals: Goal[];
}

function draft(n: number, scale: number, bl: number): Draft {
  const r = hash(n * 7919) >>> 0;
  const colors = n <= 6 ? 4 : n <= 32 ? 5 : 6;
  const [w, h] = n <= 3 ? [6, 6] : n <= 9 ? [7, 7] : n % 4 === 0 ? [8, 9] : n % 4 === 2 ? [7, 8] : [8, 8];
  const g = blank(w, h);
  if (n > 5) SHAPES[r % SHAPES.length](g);
  const amount = bl >= 4 ? 3 : bl >= 2 ? 2 : 1;
  const strong = bl === 1 || bl === 3;
  const sparse = bl >= 0 ? 1 : 1 - bl;
  const kind = n === 1 ? 0 : n === 2 ? 1 : n === 3 ? 1 : n === 4 ? 2 : n === 5 ? 0 : n === 7 ? 3 : n % 5;
  const goals: Goal[] = [];
  const c1 = r % colors;
  const c2 = (c1 + 1 + ((r >>> 8) % (colors - 1))) % colors;
  const qty = (base: number): number => Math.max(6, Math.round((base * scale) / 2) * 2);
  if (kind === 0) goals.push({ t: 'score', n: Math.round(((700 + n * 45) * scale) / 50) * 50 });
  if (kind === 1) {
    goals.push({ t: 'color', c: c1, n: qty(14 + n * 0.5) });
    if (n >= 3) goals.push({ t: 'color', c: c2, n: qty(12 + n * 0.4) });
  }
  if (kind === 2) {
    paint(g, 'f', r >>> 4, amount, strong, sparse);
    goals.push({ t: 'frost' });
  }
  if (kind === 3) {
    paint(g, 'c', (r >>> 4) % 2 === 0 ? 0 : 3, amount, strong, sparse);
    goals.push({ t: 'crate' });
  }
  if (kind === 4) {
    paint(g, 'c', 0, 1, strong, sparse);
    paint(g, 'f', 1 + ((r >>> 4) % 2) * 3, amount, false, sparse);
    goals.push({ t: 'crate' }, { t: 'frost' });
    if (n > 20) goals.push({ t: 'color', c: c1, n: qty(10 + n * 0.3) });
  }
  return { layout: g.map((row) => row.join('')), colors, goals };
}

const quantile = (sorted: number[], q: number): number => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))];

interface Report {
  id: number;
  moves: number;
  size: string;
  colors: number;
  goals: string;
  win: Record<string, number>;
  proofMoves: number;
}

function build(n: number): { level: LevelDef; report: Report } {
  const target = n % 10 === 0 ? 0.5 : 0.92 - 0.3 * Math.min(1, (n - 1) / 45);
  const LO = 12;
  const HI = 32;
  let scale = 1;
  let bl = Math.min(2, Math.floor(n / 20));
  const tried = new Set<string>();
  let best: { off: number; level: LevelDef; report: Report } | null = null;
  for (let attempt = 0; attempt < 14; attempt++) {
    const key = `${scale.toFixed(3)}|${bl}`;
    if (tried.has(key)) break;
    tried.add(key);
    const d = draft(n, scale, bl);
    const base: LevelDef = { id: n, seed: hash(n), ...d, moves: CAP, stars: [0, 0], proof: [] };
    createGame(base);
    const runs: Record<string, Playout[]> = {};
    for (const p of Object.keys(RUNS) as Persona[]) {
      runs[p] = [];
      for (let k = 0; k < RUNS[p]; k++) runs[p].push(playout(createGame(base), p, hash(n * 100003 + k * 31 + p.length)));
    }
    const needed = (p: Playout): number => (p.won ? p.movesUsed : Infinity);
    const casual = runs.casual.map(needed).sort((a, b) => a - b);
    const moves = quantile(casual, target);

    if (Number.isFinite(moves) && moves <= 45) {
      const all = [...runs.casual, ...runs.strategic, ...runs.novice];
      const winners = all.filter((p) => needed(p) <= moves).sort((a, b) => a.movesUsed - b.movesUsed);
      const finals = winners.map((p) => p.score + (moves - p.movesUsed) * 50).sort((a, b) => a - b);
      const round = (x: number): number => Math.ceil(x / 50) * 50;
      const s2 = round(quantile(finals, 0.45));
      const s3 = Math.max(s2 + 50, round(quantile(finals, 0.85)));
      const level: LevelDef = { ...base, moves, stars: [s2, s3], proof: winners[0].moves };
      const rate = (p: string): number => Math.round((100 * runs[p].filter((x) => needed(x) <= moves).length) / runs[p].length);
      const report: Report = {
        id: n,
        moves,
        size: `${d.layout[0].length}x${d.layout.length}`,
        colors: d.colors,
        goals: d.goals.map((g) => g.t).join('+'),
        win: { novice: rate('novice'), casual: rate('casual'), strategic: rate('strategic') },
        proofMoves: level.proof.length / 2,
      };
      const off = moves < LO ? LO - moves : moves > HI ? moves - HI : 0;
      if (!best || off < best.off) best = { off, level, report };
      if (off === 0) break;
    }

    // Outside the comfortable range of move limits: resize the goals or the blockers.
    const resizable = d.goals.some((g) => g.t === 'score' || g.t === 'color');
    const blockers = d.goals.some((g) => g.t === 'frost' || g.t === 'crate');
    if (!(moves <= HI)) {
      if (blockers && bl > -2) bl--;
      else if (resizable) scale *= 0.8;
      else break;
    } else if (blockers && bl < 4) bl++;
    else if (resizable) scale *= 1.25;
    else break;
  }
  if (!best) throw new Error(`level ${n}: no acceptable configuration`);
  // The proof must replay to a win under the final move limit, exactly as a device would.
  if (replay(best.level, 0, proofActions(best.level)).status !== 'won') throw new Error(`level ${n}: proof does not replay`);
  return best;
}

const levels: LevelDef[] = [];
const reports: Report[] = [];
for (let n = 1; n <= COUNT; n++) {
  const { level, report } = build(n);
  levels.push(level);
  reports.push(report);
  console.log(
    `${String(n).padStart(2)} ${report.size} c${report.colors} ${report.goals.padEnd(18)} moves ${String(report.moves).padStart(2)}` +
      `  win% novice ${report.win.novice} casual ${report.win.casual} strategic ${report.win.strategic}  proof ${report.proofMoves}`,
  );
}
const out = (name: string): string => fileURLToPath(new URL(`../src/levels/${name}`, import.meta.url));
writeFileSync(out('levels.json'), JSON.stringify(levels).replace(/\},\{"id"/g, '},\n{"id"') + '\n');
writeFileSync(out('report.json'), JSON.stringify(reports, null, 1) + '\n');
