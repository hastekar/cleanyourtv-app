/**
 * The only difficulty adjustment in the game, and it only ever helps. The level seed and the
 * refill order never change; after repeated failures on the same level the player is openly
 * given a few extra moves. Spending, play time and win streaks are not inputs.
 */
export function assistMoves(failsInARow: number, enabled: boolean): number {
  if (!enabled) return 0;
  if (failsInARow >= 6) return 5;
  if (failsInARow >= 4) return 3;
  if (failsInARow >= 2) return 2;
  return 0;
}
