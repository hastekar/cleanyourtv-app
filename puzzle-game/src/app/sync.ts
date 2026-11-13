/**
 * Optional score sync. Off unless the build sets VITE_CONVEX_URL; without it this module does
 * nothing and the game never opens a network connection.
 */
import type { Action } from '../engine/engine';

const URL_ = (import.meta.env.VITE_CONVEX_URL as string | undefined) || '';

export const syncEnabled = URL_ !== '';

export async function submitRun(device: string, levelId: number, fails: number, actions: Action[]): Promise<void> {
  if (!syncEnabled) return;
  try {
    const [{ ConvexHttpClient }, { anyApi }] = await Promise.all([import('convex/browser'), import('convex/server')]);
    await new ConvexHttpClient(URL_).mutation(anyApi.runs.submit, { device, levelId, fails, actions });
  } catch {
    /* offline or rejected: local progress is unaffected */
  }
}
