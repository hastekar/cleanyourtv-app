/**
 * Server-side check of a finished run: the actions are replayed from the level seed with the
 * same engine the client uses, so a score can only be recorded if it was really played.
 */
import { replay, starsFor, type Action, type LevelDef } from './engine';
import { assistMoves } from './assist';

export interface RunClaim {
  levelId: number;
  /** Failed attempts in a row before this run (decides the extra moves the client was given). */
  fails: number;
  actions: Action[];
}

export type RunVerdict = { ok: true; score: number; stars: number; boosters: number } | { ok: false; reason: string };

export function verifyRun(levels: LevelDef[], claim: RunClaim): RunVerdict {
  const level = levels[claim.levelId - 1];
  if (!level || level.id !== claim.levelId) return { ok: false, reason: 'unknown level' };
  if (!Array.isArray(claim.actions) || claim.actions.length > 500) return { ok: false, reason: 'bad action list' };
  const fails = Number.isInteger(claim.fails) && claim.fails > 0 ? claim.fails : 0;
  let state;
  try {
    state = replay(level, assistMoves(fails, true), claim.actions);
  } catch {
    return { ok: false, reason: 'illegal action' };
  }
  if (state.status !== 'won') return { ok: false, reason: 'run does not end in a win' };
  return {
    ok: true,
    score: state.score,
    stars: starsFor(level, state.score),
    boosters: claim.actions.filter((a) => a.t !== 'move').length,
  };
}
