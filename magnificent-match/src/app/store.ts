/** Progress on this device. Anything unreadable or malformed falls back to a clean save. */
import type { BoosterId } from '../art/ui';
import { START_COINS, START_INVENTORY } from './economy';

export type Lang = 'tr' | 'en';

export interface Save {
  v: 1;
  best: Record<string, { stars: number; score: number }>;
  coins: number;
  inv: Record<BoosterId, number>;
  /** Store transaction ids already paid out, so a purchase is never granted twice. */
  granted: string[];
  sound: boolean;
  haptics: boolean;
  lang: Lang | null;
  seenHowTo: boolean;
}

const KEY = 'magnificent-match.save.v1';
const MAX_COINS = 99_999_999;

export const freshSave = (): Save => ({
  v: 1, best: {}, coins: START_COINS, inv: { ...START_INVENTORY }, granted: [], sound: true, haptics: true, lang: null, seenHowTo: false,
});

const count = (x: unknown, max: number): number | null =>
  typeof x === 'number' && Number.isInteger(x) && x >= 0 ? Math.min(x, max) : null;

/** Rebuilds a save from untrusted JSON, keeping only fields that have the right shape. */
export function sanitize(raw: unknown): Save {
  const s = freshSave();
  if (!raw || typeof raw !== 'object') return s;
  const r = raw as Record<string, unknown>;
  if (r.v !== 1) return s;
  if (r.best && typeof r.best === 'object') {
    for (const [k, v] of Object.entries(r.best as Record<string, unknown>)) {
      const o = v as { stars?: unknown; score?: unknown } | null;
      const stars = count(o?.stars, 3);
      const score = count(o?.score, 1e9);
      if (/^\d{1,4}$/.test(k) && stars !== null && stars >= 1 && score !== null) s.best[k] = { stars, score };
    }
  }
  s.coins = count(r.coins, MAX_COINS) ?? s.coins;
  if (r.inv && typeof r.inv === 'object') {
    for (const id of Object.keys(s.inv) as BoosterId[]) s.inv[id] = count((r.inv as Record<string, unknown>)[id], 999) ?? s.inv[id];
  }
  if (Array.isArray(r.granted)) s.granted = r.granted.filter((x): x is string => typeof x === 'string' && x.length < 200).slice(-200);
  for (const k of ['sound', 'haptics', 'seenHowTo'] as const) if (typeof r[k] === 'boolean') s[k] = r[k] as boolean;
  if (r.lang === 'tr' || r.lang === 'en') s.lang = r.lang;
  return s;
}

export let storageWorks = true;

export function load(): Save {
  try {
    const raw = localStorage.getItem(KEY);
    return sanitize(raw ? JSON.parse(raw) : null);
  } catch {
    return freshSave();
  }
}

export function persist(s: Save): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    storageWorks = true;
  } catch {
    storageWorks = false;
  }
}

/** Highest level the player may start. */
export function unlocked(s: Save, total: number): number {
  let n = 1;
  while (n < total && s.best[String(n)]) n++;
  return n;
}

export const totalStars = (s: Save): number => Object.values(s.best).reduce((a, b) => a + b.stars, 0);

/** Takes coins if the player can afford it. Never goes negative. */
export function spend(s: Save, price: number): boolean {
  if (!Number.isInteger(price) || price < 0 || s.coins < price) return false;
  s.coins -= price;
  return true;
}

export function addCoins(s: Save, n: number): void {
  if (Number.isInteger(n) && n > 0) s.coins = Math.min(MAX_COINS, s.coins + n);
}

/** Pays out a store purchase exactly once per transaction id. */
export function grantPurchase(s: Save, transactionId: string, coins: number): boolean {
  if (!transactionId || s.granted.includes(transactionId)) return false;
  s.granted.push(transactionId);
  if (s.granted.length > 200) s.granted.shift();
  addCoins(s, coins);
  return true;
}
