import { describe, expect, it } from 'vitest';
import { freshSave, rewardFor, sanitize, totalStars, unlocked } from '../src/app/store';

describe('save file', () => {
  it('falls back to a clean save for anything malformed', () => {
    for (const bad of [null, undefined, 7, 'x', [], {}, { v: 2 }, { v: 1, best: 'no', hammer: -5, shuffle: 1.5, lang: 'xx', device: 'zz' }]) {
      const s = sanitize(bad);
      expect(s.v).toBe(1);
      expect(s.hammer).toBe(3);
      expect(s.shuffle).toBe(3);
      expect(s.best).toEqual({});
      expect(s.device).toMatch(/^[0-9a-f]{32}$/);
    }
  });

  it('keeps valid fields and drops or clamps invalid ones', () => {
    const s = sanitize({
      v: 1,
      best: { 1: { stars: 3, score: 900 }, 2: { stars: 9, score: 5 }, x: { stars: 1, score: 1 }, 3: { stars: 0, score: 1 }, 4: null, __proto__: { stars: 1, score: 1 } },
      fails: { 2: 4, 3: -1, 5: 'a' },
      hammer: 500, shuffle: 0, sound: false, haptics: 'yes', assist: false, lang: 'tr', device: 'ab'.repeat(16), seenHowTo: true,
    });
    expect(s.best).toEqual({ 1: { stars: 3, score: 900 }, 2: { stars: 3, score: 5 } });
    expect(s.fails).toEqual({ 2: 4 });
    expect(s).toMatchObject({ hammer: 99, shuffle: 0, sound: false, haptics: true, assist: false, lang: 'tr', seenHowTo: true, device: 'ab'.repeat(16) });
  });

  it('round-trips through JSON', () => {
    const s = freshSave();
    s.best['1'] = { stars: 2, score: 1234 };
    expect(sanitize(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });

  it('unlocks levels one at a time and counts stars', () => {
    const s = freshSave();
    expect(unlocked(s, 60)).toBe(1);
    s.best['1'] = { stars: 3, score: 1 };
    s.best['2'] = { stars: 1, score: 1 };
    s.best['4'] = { stars: 3, score: 1 }; // a gap does not unlock past it
    expect(unlocked(s, 60)).toBe(3);
    expect(totalStars(s)).toBe(7);
    for (let i = 1; i <= 60; i++) s.best[String(i)] = { stars: 1, score: 1 };
    expect(unlocked(s, 60)).toBe(60);
  });

  it('pays rewards only for first-time achievements', () => {
    expect(rewardFor(3, true, true)).toEqual({ hammer: 2, shuffle: 0 });
    expect(rewardFor(5, true, false)).toEqual({ hammer: 0, shuffle: 1 });
    expect(rewardFor(15, false, false)).toEqual({ hammer: 0, shuffle: 0 });
  });
});
