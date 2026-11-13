/**
 * Canvas view of a board. It never decides anything: the engine resolves a move at once and
 * hands back a list of events, and this file only plays them as animation.
 */
import { EMPTY, KIND_BOMB, KIND_LINE_H, KIND_LINE_V, type GameEvent, type GameState, type Move } from '../engine/engine';
import { drawFrost, sprite } from './sprites';

interface Sprite {
  tile: number;
  x: number;
  y: number;
  s: number;
  a: number;
}

interface Tween {
  t0: number;
  dur: number;
  step: (t: number) => void;
  done: () => void;
}

interface Effect {
  kind: number;
  x: number;
  y: number;
  t0: number;
}

type ClearEvent = Extract<GameEvent, { t: 'clear' }>;

export interface ViewHooks {
  onSwipe(a: number, b: number): void;
  onTap(i: number): void;
  onClear(ev: ClearEvent): void;
  onShuffle(): void;
}

const easeOut = (t: number): number => 1 - (1 - t) * (1 - t);
const easeIn = (t: number): number => t * t;

export class BoardView {
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private mask: boolean[] = [];
  private frost: number[] = [];
  private sprites: (Sprite | null)[] = [];
  private tweens: Tween[] = [];
  private effects: Effect[] = [];
  private cell = 0; // device pixels
  private cssCell = 0;
  private raf = 0;
  private selected = -1;
  private hintMove: Move | null = null;
  private drag: { i: number; x: number; y: number; id: number } | null = null;
  /** When true, taps are reported through onTap and swipes are ignored (hammer aiming). */
  tapMode = false;
  locked = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private hooks: ViewHooks,
  ) {
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    canvas.addEventListener('pointerdown', (e) => this.down(e));
    canvas.addEventListener('pointermove', (e) => this.move(e));
    const end = (e: PointerEvent): void => this.up(e);
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', () => (this.drag = null));
  }

  setState(s: GameState): void {
    this.w = s.w;
    this.h = s.h;
    this.mask = s.mask.slice();
    this.frost = s.frost.slice();
    this.sprites = s.tiles.map((t, i) => (t === EMPTY ? null : this.make(t, i)));
    this.tweens = [];
    this.effects = [];
    this.selected = -1;
    this.hintMove = null;
    this.drag = null;
    this.resize();
  }

  private make(tile: number, i: number): Sprite {
    return { tile, x: i % this.w, y: Math.floor(i / this.w), s: 1, a: 1 };
  }

  /** Fits the canvas into its parent, keeping square cells and crisp pixels. */
  resize(): void {
    const box = this.canvas.parentElement;
    if (!box || !this.w) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const css = Math.floor(Math.min(box.clientWidth / this.w, box.clientHeight / this.h));
    if (css <= 0) return;
    this.cssCell = css;
    this.cell = Math.round(css * dpr);
    this.canvas.style.width = `${css * this.w}px`;
    this.canvas.style.height = `${css * this.h}px`;
    this.canvas.width = this.cell * this.w;
    this.canvas.height = this.cell * this.h;
  }

  start(): void {
    if (this.raf) return;
    const loop = (now: number): void => {
      this.raf = requestAnimationFrame(loop);
      this.tick(now);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  setHint(m: Move | null): void {
    this.hintMove = m;
  }

  clearSelection(): void {
    this.selected = -1;
  }

  /** Centre of a cell in CSS pixels relative to the viewport (used by end-to-end tests). */
  cellCenter(i: number): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: r.left + ((i % this.w) + 0.5) * this.cssCell, y: r.top + (Math.floor(i / this.w) + 0.5) * this.cssCell };
  }

  /* ---------- input ---------- */

  private cellAt(e: PointerEvent): number {
    const r = this.canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / this.cssCell);
    const y = Math.floor((e.clientY - r.top) / this.cssCell);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return -1;
    const i = y * this.w + x;
    return this.mask[i] ? i : -1;
  }

  private down(e: PointerEvent): void {
    if (this.locked || !e.isPrimary) return;
    const i = this.cellAt(e);
    if (i < 0) return;
    e.preventDefault();
    if (this.tapMode) {
      this.hooks.onTap(i);
      return;
    }
    this.drag = { i, x: e.clientX, y: e.clientY, id: e.pointerId };
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      /* capture is a nicety, not a requirement */
    }
  }

  private move(e: PointerEvent): void {
    const d = this.drag;
    if (!d || d.id !== e.pointerId || this.locked) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    const limit = this.cssCell * 0.35;
    if (Math.abs(dx) < limit && Math.abs(dy) < limit) return;
    this.drag = null;
    const x = d.i % this.w;
    const y = Math.floor(d.i / this.w);
    let nx = x;
    let ny = y;
    if (Math.abs(dx) > Math.abs(dy)) nx += dx > 0 ? 1 : -1;
    else ny += dy > 0 ? 1 : -1;
    if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) return;
    this.selected = -1;
    this.hooks.onSwipe(d.i, ny * this.w + nx);
  }

  private up(e: PointerEvent): void {
    const d = this.drag;
    this.drag = null;
    if (!d || d.id !== e.pointerId || this.locked) return;
    // A tap: select, or swap with the previously selected neighbour.
    const sel = this.selected;
    if (sel >= 0 && sel !== d.i) {
      const dist = Math.abs(sel - d.i);
      const adjacent = dist === this.w || (dist === 1 && Math.floor(sel / this.w) === Math.floor(d.i / this.w));
      this.selected = -1;
      if (adjacent) {
        this.hooks.onSwipe(sel, d.i);
        return;
      }
    }
    this.selected = sel === d.i ? -1 : d.i;
  }

  /* ---------- animation ---------- */

  private anim(dur: number, step: (t: number) => void): Promise<void> {
    return new Promise((resolve) => {
      this.tweens.push({ t0: performance.now(), dur, step, done: resolve });
    });
  }

  private tick(now: number): void {
    if (this.tweens.length) {
      const finished = new Set<Tween>();
      for (const tw of this.tweens.slice()) {
        const t = Math.min(1, Math.max(0, (now - tw.t0) / tw.dur));
        tw.step(t);
        if (t >= 1) finished.add(tw);
      }
      this.tweens = this.tweens.filter((tw) => !finished.has(tw));
      finished.forEach((tw) => tw.done());
    }
    this.render(now);
  }

  /** Swap that the engine refused: nudge the two tiles and put them back. */
  async bounce(a: number, b: number): Promise<void> {
    const A = this.sprites[a];
    const B = this.sprites[b];
    if (!A || !B) return;
    const ax = A.x, ay = A.y, bx = B.x, by = B.y;
    await this.anim(220, (t) => {
      const k = Math.sin(t * Math.PI) * 0.45;
      A.x = ax + (bx - ax) * k;
      A.y = ay + (by - ay) * k;
      B.x = bx + (ax - bx) * k;
      B.y = by + (ay - by) * k;
    });
    A.x = ax; A.y = ay; B.x = bx; B.y = by;
  }

  async play(events: GameEvent[]): Promise<void> {
    this.hintMove = null;
    this.selected = -1;
    for (const ev of events) {
      if (ev.t === 'swap') await this.playSwap(ev.a, ev.b);
      else if (ev.t === 'clear') await this.playClear(ev);
      else if (ev.t === 'fall') await this.playFall(ev);
      else if (ev.t === 'shuffle') await this.playShuffle(ev.tiles);
    }
  }

  private async playSwap(a: number, b: number): Promise<void> {
    const A = this.sprites[a];
    const B = this.sprites[b];
    if (!A || !B) return;
    const ax = A.x, ay = A.y, bx = B.x, by = B.y;
    await this.anim(150, (t) => {
      const k = easeOut(t);
      A.x = ax + (bx - ax) * k;
      A.y = ay + (by - ay) * k;
      B.x = bx + (ax - bx) * k;
      B.y = by + (ay - by) * k;
    });
    this.sprites[a] = B;
    this.sprites[b] = A;
  }

  private async playClear(ev: ClearEvent): Promise<void> {
    const now = performance.now();
    for (const c of ev.converts) {
      const sp = this.sprites[c.i];
      if (sp) sp.tile = c.tile;
    }
    if (ev.converts.length) await this.anim(220, () => {});
    for (const b of ev.blasts) this.effects.push({ kind: b.kind, x: b.i % this.w, y: Math.floor(b.i / this.w), t0: now });
    this.hooks.onClear(ev);
    const going = ev.cells.map((c) => this.sprites[c.i]).filter((s): s is Sprite => !!s);
    await this.anim(190, (t) => {
      for (const sp of going) {
        sp.s = 1 + 0.15 * Math.sin(t * Math.PI) - t;
        sp.a = 1 - easeIn(t);
      }
    });
    for (const c of ev.cells) this.sprites[c.i] = null;
    for (const c of ev.crates) this.sprites[c.i] = c.tile === EMPTY ? null : this.make(c.tile, c.i);
    for (const f of ev.frost) this.frost[f.i] = f.hp;
    if (ev.spawns.length) {
      const born = ev.spawns.map((sp) => (this.sprites[sp.i] = this.make(sp.tile, sp.i)));
      await this.anim(160, (t) => {
        for (const sp of born) sp.s = easeOut(t) * (1 + 0.25 * Math.sin(t * Math.PI));
      });
      for (const sp of born) sp.s = 1;
    }
  }

  private async playFall(ev: Extract<GameEvent, { t: 'fall' }>): Promise<void> {
    const jobs = ev.moves.map((m) => {
      const sp = m.from >= 0 ? this.sprites[m.from] ?? this.make(m.tile, m.from) : { tile: m.tile, x: m.to % this.w, y: m.startRow, s: 1, a: 1 };
      return { sp, y0: sp.y, y1: Math.floor(m.to / this.w), to: m.to, from: m.from, tile: m.tile };
    });
    for (const j of jobs) if (j.from >= 0) this.sprites[j.from] = null;
    let longest = 0;
    for (const j of jobs) {
      this.sprites[j.to] = j.sp;
      j.sp.tile = j.tile;
      longest = Math.max(longest, j.y1 - j.y0);
    }
    const dur = 110 + 70 * Math.sqrt(longest) * 1.6;
    await this.anim(dur, (t) => {
      for (const j of jobs) {
        // every tile falls at the same acceleration and lands when it has covered its distance
        const own = Math.min(1, (t * Math.sqrt(longest)) / Math.sqrt(j.y1 - j.y0));
        j.sp.y = j.y0 + (j.y1 - j.y0) * easeIn(own);
      }
    });
    for (const j of jobs) j.sp.y = j.y1;
  }

  private async playShuffle(tiles: number[]): Promise<void> {
    this.hooks.onShuffle();
    const all = this.sprites.filter((s): s is Sprite => !!s);
    await this.anim(200, (t) => all.forEach((sp) => (sp.s = 1 - easeIn(t))));
    this.sprites = tiles.map((t, i) => (t === EMPTY ? null : this.make(t, i)));
    const fresh = this.sprites.filter((s): s is Sprite => !!s);
    await this.anim(240, (t) => fresh.forEach((sp) => (sp.s = easeOut(t))));
    fresh.forEach((sp) => (sp.s = 1));
  }

  /* ---------- drawing ---------- */

  private render(now: number): void {
    const { ctx, cell: S, w, h } = this;
    if (!S) return;
    ctx.clearRect(0, 0, w * S, h * S);
    for (let i = 0; i < w * h; i++) {
      if (!this.mask[i]) continue;
      const x = (i % w) * S;
      const y = Math.floor(i / w) * S;
      ctx.fillStyle = ((i % w) + Math.floor(i / w)) % 2 ? 'rgba(255,255,255,0.075)' : 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.roundRect(x + 1, y + 1, S - 2, S - 2, S * 0.14);
      ctx.fill();
      if (this.frost[i] > 0) drawFrost(ctx, this.frost[i], x, y, S);
    }
    const pulse = 0.5 + 0.5 * Math.sin(now / 160);
    const hint = this.hintMove;
    this.sprites.forEach((sp, i) => {
      if (!sp || sp.s <= 0 || sp.a <= 0) return;
      let scale = sp.s;
      if (hint && (i === hint.a || i === hint.b)) scale *= 1 + 0.1 * pulse;
      if (i === this.selected) scale *= 1.08;
      const size = S * scale;
      ctx.globalAlpha = Math.max(0, Math.min(1, sp.a));
      ctx.drawImage(sprite(sp.tile, S), (sp.x + 0.5) * S - size / 2, (sp.y + 0.5) * S - size / 2, size, size);
    });
    ctx.globalAlpha = 1;
    if (this.selected >= 0) {
      const x = (this.selected % w) * S;
      const y = Math.floor(this.selected / w) * S;
      ctx.lineWidth = S * 0.06;
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(x + S * 0.05, y + S * 0.05, S * 0.9, S * 0.9, S * 0.16);
      ctx.stroke();
    }
    if (this.effects.length) {
      this.effects = this.effects.filter((e) => now - e.t0 < 320);
      for (const e of this.effects) {
        const t = Math.max(0, (now - e.t0) / 320);
        ctx.globalAlpha = 1 - t;
        ctx.fillStyle = '#ffffff';
        const thick = S * 0.5 * (1 - t * 0.6);
        if (e.kind === KIND_LINE_H) ctx.fillRect(0, (e.y + 0.5) * S - thick / 2, w * S, thick);
        else if (e.kind === KIND_LINE_V) ctx.fillRect((e.x + 0.5) * S - thick / 2, 0, thick, h * S);
        else {
          ctx.lineWidth = S * 0.18 * (1 - t);
          ctx.strokeStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc((e.x + 0.5) * S, (e.y + 0.5) * S, S * (e.kind === KIND_BOMB ? 0.4 + 1.3 * t : 0.4 + 3 * t), 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }
  }
}
