import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// Optional backend. One row per (anonymous device, level): the best verified result.
export default defineSchema({
  results: defineTable({
    device: v.string(),
    levelId: v.number(),
    score: v.number(),
    stars: v.number(),
    boosters: v.number(),
  })
    .index('by_device_level', ['device', 'levelId'])
    .index('by_level_score', ['levelId', 'score']),
});
