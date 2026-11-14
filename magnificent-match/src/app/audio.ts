/** Sound effects synthesised with Web Audio; no audio files are shipped. */
let ctx: AudioContext | null = null;
let enabled = true;

export function setSound(on: boolean): void {
  enabled = on;
}

/** Browsers only allow audio after a user gesture; call this from one. */
export function unlockAudio(): void {
  if (!enabled) return;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.12, delay = 0, slide = 0): void {
  if (!enabled || !ctx || ctx.state !== 'running') return;
  try {
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch {
    /* sound is optional */
  }
}

export const sfx = {
  swap: (): void => tone(330, 0.09, 'triangle', 0.08, 0, 1.4),
  bad: (): void => tone(160, 0.14, 'square', 0.05, 0, 0.7),
  match: (cascade: number): void => tone(440 * Math.pow(2, Math.min(cascade - 1, 9) / 6), 0.16, 'triangle', 0.12),
  blast: (): void => tone(220, 0.28, 'sawtooth', 0.09, 0, 0.3),
  special: (): void => {
    tone(660, 0.1, 'sine', 0.1);
    tone(990, 0.16, 'sine', 0.1, 0.07);
  },
  win: (): void => [523, 659, 784, 1047].forEach((f, k) => tone(f, 0.22, 'triangle', 0.12, k * 0.11)),
  lose: (): void => [392, 330, 262].forEach((f, k) => tone(f, 0.26, 'sine', 0.1, k * 0.16)),
  tap: (): void => tone(520, 0.05, 'sine', 0.06),
};

export function suspendAudio(): void {
  if (ctx && ctx.state === 'running') void ctx.suspend();
}
