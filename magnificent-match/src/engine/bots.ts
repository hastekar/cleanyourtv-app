/**
 * Bot players ("procedural personas") used to verify and calibrate levels. They never see
 * the real refill order: every look-ahead runs on a copy whose PRNG has been scrambled, so a
 * bot knows exactly what a human can see on the board and nothing more.
 */
import { applyMove, cloneState, findMoves, goalsRemaining, rngInt, rngNext, type GameState, type Move } from './engine';

export type Persona = 'novice' | 'bottom' | 'casual' | 'strategic';

function evaluate(s: GameState, before: number[]): number {
  if (s.status === 'won') return 1e9 + s.score;
  const after = goalsRemaining(s);
  let progress = 0;
  for (let k = 0; k < after.length; k++) if (before[k] > 0) progress += (before[k] - after[k]) / before[k];
  return progress * 10000 + s.score;
}

function bestMove(s: GameState, moves: Move[], bot: { rng: number }): Move {
  const before = goalsRemaining(s);
  let best: Move[] = [];
  let bestVal = -Infinity;
  for (const m of moves) {
    const c = cloneState(s);
    c.rng = (rngNext(bot) * 4294967296) | 0;
    applyMove(c, m.a, m.b);
    const val = evaluate(c, before);
    if (val > bestVal) {
      bestVal = val;
      best = [m];
    } else if (val === bestVal) best.push(m);
  }
  return best[rngInt(bot, best.length)];
}

export function pickMove(s: GameState, persona: Persona, bot: { rng: number }): Move | null {
  const moves = findMoves(s);
  if (moves.length === 0) return null;
  switch (persona) {
    case 'novice':
      return moves[rngInt(bot, moves.length)];
    case 'bottom': {
      const low = Math.max(...moves.map((m) => Math.max(m.a, m.b)));
      const rowOf = (i: number): number => Math.floor(i / s.w);
      const lowest = moves.filter((m) => rowOf(Math.max(m.a, m.b)) === rowOf(low));
      return lowest[rngInt(bot, lowest.length)];
    }
    case 'casual':
      return rngNext(bot) < 0.5 ? bestMove(s, moves, bot) : moves[rngInt(bot, moves.length)];
    case 'strategic':
      return rngNext(bot) < 0.1 ? moves[rngInt(bot, moves.length)] : bestMove(s, moves, bot);
  }
}

export interface Playout {
  won: boolean;
  movesUsed: number;
  /** Score at the moment the goals were met, before the leftover-move bonus. */
  score: number;
  moves: number[];
}

/** Plays `s` (which is consumed) until the game ends. */
export function playout(s: GameState, persona: Persona, botSeed: number): Playout {
  const bot = { rng: botSeed | 0 };
  const moves: number[] = [];
  while (s.status === 'playing') {
    const m = pickMove(s, persona, bot);
    if (!m) break; // unreachable: the engine reshuffles dead boards
    applyMove(s, m.a, m.b);
    moves.push(m.a, m.b);
  }
  const won = s.status === 'won';
  return { won, movesUsed: s.movesUsed, score: won ? s.score - s.movesLeft * 50 : s.score, moves };
}
