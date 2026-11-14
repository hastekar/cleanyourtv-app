import {
  mutationGeneric,
  queryGeneric,
  type DataModelFromSchemaDefinition,
  type MutationBuilder,
  type QueryBuilder,
} from 'convex/server';
import { v } from 'convex/values';
import { verifyRun } from '../src/engine/verify';
import { LEVELS } from '../src/levels';
import schema from './schema';

// Typed builders derived from the schema (what `convex codegen` would otherwise generate).
type DataModel = DataModelFromSchemaDefinition<typeof schema>;
const mutation = mutationGeneric as MutationBuilder<DataModel, 'public'>;
const query = queryGeneric as QueryBuilder<DataModel, 'public'>;

const action = v.union(
  v.object({ t: v.literal('move'), a: v.number(), b: v.number() }),
  v.object({ t: v.literal('hammer'), i: v.number() }),
  v.object({ t: v.literal('shuffle') }),
);

/**
 * Records a win. The client sends what it did, never what it scored: the run is replayed
 * here from the level seed with the same engine, and only the replayed result is stored.
 */
export const submit = mutation({
  args: { device: v.string(), levelId: v.number(), fails: v.number(), actions: v.array(action) },
  handler: async (ctx, args) => {
    if (!/^[0-9a-f]{32}$/.test(args.device)) return { ok: false as const, reason: 'bad device id' };
    const verdict = verifyRun(LEVELS, args);
    if (!verdict.ok) return verdict;
    const row = { device: args.device, levelId: args.levelId, score: verdict.score, stars: verdict.stars, boosters: verdict.boosters };
    const existing = await ctx.db
      .query('results')
      .withIndex('by_device_level', (q) => q.eq('device', args.device).eq('levelId', args.levelId))
      .unique();
    if (!existing) await ctx.db.insert('results', row);
    else if (verdict.score > existing.score) await ctx.db.replace(existing._id, row);
    return verdict;
  },
});

/** Top verified scores of a level. Device ids are not returned. */
export const top = query({
  args: { levelId: v.number() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query('results')
      .withIndex('by_level_score', (q) => q.eq('levelId', args.levelId))
      .order('desc')
      .take(20);
    return rows.map((r) => ({ score: r.score, stars: r.stars, boosters: r.boosters }));
  },
});
