import { describe, expect, it } from 'vitest';
import { BOOSTERS, COIN_PACKS, continuePrice, winReward } from '../src/app/economy';
import { addCoins, freshSave, grantPurchase, sanitize, spend, unlocked } from '../src/app/store';

describe('prices', () => {
  it('continue starts at 900 and rises by 1000 each time', () => {
    expect([0, 1, 2, 3].map(continuePrice)).toEqual([900, 1900, 2900, 3900]);
    expect(continuePrice(-3)).toBe(900);
  });
  it('booster packs are 3 for 900, or 3 for 1900 for the strong ones', () => {
    for (const b of BOOSTERS) {
      expect(b.qty).toBe(3);
      expect(b.price).toBe(['rainbow', 'cross'].includes(b.id) ? 1900 : 900);
    }
    expect(new Set(BOOSTERS.map((b) => b.id)).size).toBe(6);
  });
  it('win rewards are positive and replays cannot farm first-clear bonuses', () => {
    expect(winReward(1, 1, true)).toBe(80);
    expect(winReward(10, 3, true)).toBe(600);
    expect(winReward(10, 3, false)).toBe(50);
  });
  it('coin packs have unique ids and grow', () => {
    expect(new Set(COIN_PACKS.map((p) => p.id)).size).toBe(COIN_PACKS.length);
    for (let k = 1; k < COIN_PACKS.length; k++) expect(COIN_PACKS[k].coins).toBeGreaterThan(COIN_PACKS[k - 1].coins);
  });
});

describe('wallet', () => {
  it('never goes negative and rejects bad amounts', () => {
    const s = freshSave();
    expect(spend(s, 900)).toBe(true);
    expect(s.coins).toBe(100);
    expect(spend(s, 900)).toBe(false);
    expect(spend(s, -5)).toBe(false);
    expect(spend(s, 0.5)).toBe(false);
    expect(s.coins).toBe(100);
    addCoins(s, -50);
    addCoins(s, 1.5);
    expect(s.coins).toBe(100);
  });
  it('pays a store transaction exactly once', () => {
    const s = freshSave();
    expect(grantPurchase(s, 'tx-1', 5000)).toBe(true);
    expect(grantPurchase(s, 'tx-1', 5000)).toBe(false);
    expect(grantPurchase(s, '', 5000)).toBe(false);
    expect(s.coins).toBe(6000);
    expect(sanitize(JSON.parse(JSON.stringify(s))).granted).toEqual(['tx-1']);
  });
});

describe('save file', () => {
  it('falls back to a clean save for anything malformed', () => {
    for (const bad of [null, 7, 'x', [], {}, { v: 2 }, { v: 1, coins: -1, inv: { hammer: 'many' }, granted: [1, {}] }]) {
      const s = sanitize(bad);
      expect(s.coins).toBe(1000);
      expect(s.inv.hammer).toBe(2);
      expect(s.granted).toEqual([]);
    }
  });
  it('keeps valid fields, clamps counts and round-trips', () => {
    const s = sanitize({ v: 1, coins: 1e12, inv: { hammer: 5000, cross: 0, bogus: 3 }, best: { 1: { stars: 2, score: 10 } }, lang: 'tr' });
    expect(s.coins).toBe(99_999_999);
    expect(s.inv).toMatchObject({ hammer: 999, cross: 0, shuffle: 2 });
    expect('bogus' in s.inv).toBe(false);
    expect(unlocked(s, 60)).toBe(2);
    expect(sanitize(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
});
