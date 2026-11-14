/** Procedural artwork: every tile is drawn with canvas paths, so the game ships no image assets. */
import { KIND_BOMB, KIND_LINE_H, KIND_LINE_V, KIND_RAINBOW, colorOf, crateHp, isCrate, kindOf } from '../engine/engine';

const PALETTE: [string, string, string][] = [
  ['#ff6b7a', '#e8253f', '#8f0f24'],
  ['#7cc4ff', '#2f8cf0', '#124a9c'],
  ['#7df0ae', '#27c46c', '#0d7038'],
  ['#ffe98a', '#f7c21e', '#a87400'],
  ['#d7a8ff', '#a050f0', '#571aa3'],
  ['#ffb980', '#f77a25', '#9c3f00'],
];

/** Each colour has its own shape, so the game never relies on colour alone. */
function shapePath(ctx: CanvasRenderingContext2D, color: number, r: number): void {
  ctx.beginPath();
  const poly = (pts: number, rot: number, inner = 1): void => {
    const n = inner === 1 ? pts : pts * 2;
    for (let k = 0; k < n; k++) {
      const rad = inner !== 1 && k % 2 ? r * inner : r;
      const a = rot + (k * Math.PI * 2) / n;
      const x = Math.cos(a) * rad;
      const y = Math.sin(a) * rad;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };
  switch (color) {
    case 0:
      ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2);
      break;
    case 1:
      ctx.roundRect(-r * 0.82, -r * 0.82, r * 1.64, r * 1.64, r * 0.3);
      break;
    case 2:
      ctx.translate(0, r * 0.12);
      poly(3, -Math.PI / 2);
      break;
    case 3:
      poly(4, 0);
      break;
    case 4:
      poly(6, 0);
      break;
    default:
      poly(5, -Math.PI / 2, 0.52);
  }
}

function drawGem(ctx: CanvasRenderingContext2D, color: number, kind: number, S: number): void {
  const r = S * 0.4;
  ctx.save();
  ctx.translate(S / 2, S / 2);
  ctx.lineJoin = 'round';
  if (kind === KIND_RAINBOW) {
    const g = ctx.createConicGradient(0, 0, 0);
    PALETTE.forEach((p, k) => g.addColorStop(k / 6, p[1]));
    g.addColorStop(1, PALETTE[0][1]);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = S * 0.05;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.38, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
    return;
  }
  const [light, mid, dark] = PALETTE[color];
  ctx.save();
  shapePath(ctx, color, r);
  const g = ctx.createLinearGradient(0, -r, 0, r);
  g.addColorStop(0, light);
  g.addColorStop(0.55, mid);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = S * 0.045;
  ctx.strokeStyle = dark;
  ctx.stroke();
  ctx.clip();
  // gloss
  ctx.beginPath();
  ctx.ellipse(-r * 0.2, -r * 0.55, r * 0.7, r * 0.32, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fill();
  if (kind === KIND_LINE_H || kind === KIND_LINE_V) {
    if (kind === KIND_LINE_V) ctx.rotate(Math.PI / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    for (const y of [-0.42, 0, 0.42]) ctx.fillRect(-r * 1.2, y * r - r * 0.09, r * 2.4, r * 0.18);
  }
  ctx.restore();
  if (kind === KIND_LINE_H || kind === KIND_LINE_V) {
    // arrow heads outside the shape show the direction of the blast
    if (kind === KIND_LINE_V) ctx.rotate(Math.PI / 2);
    ctx.fillStyle = '#ffffff';
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(dir * r * 1.22, 0);
      ctx.lineTo(dir * r * 0.9, -r * 0.26);
      ctx.lineTo(dir * r * 0.9, r * 0.26);
      ctx.closePath();
      ctx.fill();
    }
  } else if (kind === KIND_BOMB) {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#1b1b2b';
    ctx.fill();
    ctx.lineWidth = S * 0.04;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-r * 0.15, -r * 0.15, r * 0.14, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
  ctx.restore();
}

function drawCrate(ctx: CanvasRenderingContext2D, hp: number, S: number): void {
  const p = S * 0.1;
  const s = S - p * 2;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(p, p, s, s, S * 0.1);
  ctx.fillStyle = '#b07a43';
  ctx.fill();
  ctx.lineWidth = S * 0.05;
  ctx.strokeStyle = '#5e3b17';
  ctx.stroke();
  ctx.clip();
  ctx.strokeStyle = '#7d5226';
  ctx.lineWidth = S * 0.035;
  for (let k = 1; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(p + (s * k) / 4, p);
    ctx.lineTo(p + (s * k) / 4, p + s);
    ctx.stroke();
  }
  if (hp >= 2) {
    // reinforced: two steel bands
    ctx.fillStyle = '#9aa7b8';
    ctx.strokeStyle = '#4b5665';
    ctx.lineWidth = S * 0.025;
    for (const y of [0.3, 0.7]) {
      ctx.fillRect(p, S * y - S * 0.06, s, S * 0.12);
      ctx.strokeRect(p, S * y - S * 0.06, s, S * 0.12);
    }
  } else {
    ctx.strokeStyle = '#5e3b17';
    ctx.lineWidth = S * 0.06;
    ctx.beginPath();
    ctx.moveTo(p, p);
    ctx.lineTo(p + s, p + s);
    ctx.moveTo(p + s, p);
    ctx.lineTo(p, p + s);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawFrost(ctx: CanvasRenderingContext2D, hp: number, x: number, y: number, S: number): void {
  const p = S * 0.04;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x + p, y + p, S - p * 2, S - p * 2, S * 0.14);
  ctx.fillStyle = hp >= 2 ? 'rgba(190,232,255,0.85)' : 'rgba(170,222,255,0.42)';
  ctx.fill();
  ctx.lineWidth = S * (hp >= 2 ? 0.07 : 0.04);
  ctx.strokeStyle = hp >= 2 ? '#ffffff' : 'rgba(255,255,255,0.75)';
  ctx.stroke();
  ctx.restore();
}

const cache = new Map<string, HTMLCanvasElement>();

/** A cached bitmap of a tile at `size` device pixels. */
export function sprite(tile: number, size: number): HTMLCanvasElement {
  const key = `${tile}@${size}`;
  let c = cache.get(key);
  if (!c) {
    if (cache.size > 400) cache.clear();
    c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d') as CanvasRenderingContext2D;
    if (isCrate(tile)) drawCrate(ctx, crateHp(tile), size);
    else drawGem(ctx, colorOf(tile), kindOf(tile), size);
    cache.set(key, c);
  }
  return c;
}

/** Small icon for HUD chips: a tile, or 'frost'. */
export function icon(what: number | 'frost', px = 56): string {
  if (what === 'frost') {
    const c = document.createElement('canvas');
    c.width = c.height = px;
    drawFrost(c.getContext('2d') as CanvasRenderingContext2D, 2, 0, 0, px);
    return c.toDataURL();
  }
  return sprite(what, px).toDataURL();
}
