/**
 * Every price and payout in one place. Coins buy convenience only: extra moves and boosters.
 * Nothing here can change a level's seed, its refill order or its move limit, and every level
 * ships with a proof that it can be won without spending anything.
 */
import { KIND_BOMB, KIND_LINE_H, KIND_RAINBOW } from '../engine/engine';
import type { BoosterId } from '../art/ui';

export const START_COINS = 1000;

/** Price of the n-th continue (0-based) within one attempt: 900, 1900, 2900, ... */
export const continuePrice = (n: number): number => 900 + 1000 * Math.max(0, Math.floor(n));

export interface BoosterDef {
  id: BoosterId;
  /** 'pre' boosters are picked before the level, 'game' boosters are used on the board. */
  when: 'pre' | 'game';
  price: number;
  qty: number;
  /** Special tile a pre-level booster places on the board. */
  kind?: number;
}

export const BOOSTERS: BoosterDef[] = [
  { id: 'rocket', when: 'pre', price: 900, qty: 3, kind: KIND_LINE_H },
  { id: 'bomb', when: 'pre', price: 900, qty: 3, kind: KIND_BOMB },
  { id: 'rainbow', when: 'pre', price: 1900, qty: 3, kind: KIND_RAINBOW },
  { id: 'hammer', when: 'game', price: 900, qty: 3 },
  { id: 'shuffle', when: 'game', price: 900, qty: 3 },
  { id: 'cross', when: 'game', price: 1900, qty: 3 },
];

export const boosterDef = (id: BoosterId): BoosterDef => BOOSTERS.find((b) => b.id === id) as BoosterDef;

export const START_INVENTORY: Record<BoosterId, number> = { rocket: 1, bomb: 1, rainbow: 1, hammer: 2, shuffle: 2, cross: 1 };

/** Coins paid for a win. Replays pay the base amount only. */
export function winReward(levelId: number, stars: number, firstClear: boolean): number {
  let coins = 20 + 10 * stars;
  if (firstClear) coins += 50;
  if (firstClear && levelId % 10 === 0) coins += 500; // treasure room every tenth level
  return coins;
}

/** Coin packs sold for real money. Prices come from the store at run time, never from here. */
export const COIN_PACKS: { id: string; coins: number }[] = [
  { id: 'coins_1000', coins: 1000 },
  { id: 'coins_5000', coins: 5000 },
  { id: 'coins_10000', coins: 10000 },
  { id: 'coins_25000', coins: 25000 },
  { id: 'coins_50000', coins: 50000 },
  { id: 'coins_100000', coins: 100000 },
];
