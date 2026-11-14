import type { LevelDef } from '../engine/engine';
import data from './levels.json';

export const LEVELS = data as unknown as LevelDef[];
export const levelById = (id: number): LevelDef | undefined => LEVELS[id - 1];
