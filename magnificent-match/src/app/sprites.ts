/** Turns the vector drawings into cached bitmaps for the board canvas. */
import { KIND_BOMB, KIND_LINE_H, KIND_LINE_V, KIND_NONE, RAINBOW, colorOf, crateHp, isCrate, kindOf, makeTile } from '../engine/engine';
import { carpetSvg, crateSvg, tileSvg } from '../art/tiles';

const CRATE = 64;
const images = new Map<string, HTMLImageElement>();
const cache = new Map<string, HTMLCanvasElement>();

export const dataUrl = (svg: string): string => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** Gives the SVG an intrinsic size so every browser rasterises it sharply. */
const sized = (svg: string): string => svg.replace('<svg ', '<svg width="256" height="256" ');

function loadImage(key: string, svg: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      images.set(key, img);
      resolve();
    };
    img.onerror = () => reject(new Error(`art failed to load: ${key}`));
    img.src = dataUrl(sized(svg));
  });
}

/** Loads every board drawing. Reports progress 0..1 for the loading screen. */
export async function preload(onProgress: (p: number) => void): Promise<void> {
  const jobs: [string, string][] = [];
  for (let c = 0; c < 6; c++) for (const k of [KIND_NONE, KIND_LINE_H, KIND_LINE_V, KIND_BOMB]) jobs.push([String(makeTile(c, k)), tileSvg(c, k)]);
  jobs.push([String(RAINBOW), tileSvg(0, kindOf(RAINBOW))]);
  jobs.push([String(CRATE + 1), crateSvg(1)], [String(CRATE + 2), crateSvg(2)], ['carpet1', carpetSvg(1)], ['carpet2', carpetSvg(2)]);
  let done = 0;
  await Promise.all(
    jobs.map(([key, svg]) =>
      loadImage(key, svg).then(() => {
        done++;
        onProgress(done / jobs.length);
      }),
    ),
  );
}

export function sprite(tile: number, size: number): HTMLCanvasElement {
  const key = `${tile}@${size}`;
  let c = cache.get(key);
  if (!c) {
    if (cache.size > 400) cache.clear();
    c = document.createElement('canvas');
    c.width = c.height = size;
    const img = images.get(String(isCrate(tile) ? CRATE + Math.min(2, crateHp(tile)) : makeTile(colorOf(tile), kindOf(tile))));
    if (img) (c.getContext('2d') as CanvasRenderingContext2D).drawImage(img, 0, 0, size, size);
    cache.set(key, c);
  }
  return c;
}

/** The carpet layer (the engine calls this layer "frost"). */
export function drawFrost(ctx: CanvasRenderingContext2D, hp: number, x: number, y: number, S: number): void {
  const img = images.get(hp >= 2 ? 'carpet2' : 'carpet1');
  if (img) ctx.drawImage(img, x + S * 0.03, y + S * 0.03, S * 0.94, S * 0.94);
}
