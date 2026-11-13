/** Progress on this device. Anything unreadable or malformed falls back to a clean save. */
import type { Lang } from './i18n';

export interface Save {
  v: 1;
  best: Record<string, { stars: number; score: number }>;
  fails: Record<string, number>;
  hammer: number;
  shuffle: number;
  sound: boolean;
  haptics: boolean;
  assist: boolean;
  lang: Lang | null;
  device: string;
  seenHowTo: boolean;
}

const KEY = 'lumo-match.save.v1';

const randomId = (): string => {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
};

export const freshSave = (): Save => ({
  v: 1, best: {}, fails: {}, hammer: 3, shuffle: 3, sound: true, haptics: true, assist: true, lang: null, device: randomId(), seenHowTo: false,
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
  if (r.fails && typeof r.fails === 'object') {
    for (const [k, v] of Object.entries(r.fails as Record<string, unknown>)) {
      const n = count(v, 999);
      if (/^\d{1,4}$/.test(k) && n !== null) s.fails[k] = n;
    }
  }
  s.hammer = count(r.hammer, 99) ?? s.hammer;
  s.shuffle = count(r.shuffle, 99) ?? s.shuffle;
  for (const k of ['sound', 'haptics', 'assist', 'seenHowTo'] as const) if (typeof r[k] === 'boolean') s[k] = r[k] as boolean;
  if (r.lang === 'tr' || r.lang === 'en') s.lang = r.lang;
  if (typeof r.device === 'string' && /^[0-9a-f]{32}$/.test(r.device)) s.device = r.device;
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

/** What a first-time clear of a level pays out. Boosters are never sold. */
export function rewardFor(levelId: number, firstClear: boolean, firstThreeStars: boolean): { hammer: number; shuffle: number } {
  return {
    hammer: (firstClear && levelId % 3 === 0 ? 1 : 0) + (firstThreeStars ? 1 : 0),
    shuffle: firstClear && levelId % 5 === 0 ? 1 : 0,
  };
}
