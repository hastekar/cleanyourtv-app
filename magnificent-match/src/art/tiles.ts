/**
 * Board pieces, drawn as vector art. Every piece is its own drawing with its own silhouette,
 * so pieces are told apart by shape as well as colour.
 *   0 tulip · 1 evil-eye bead · 2 emerald · 3 crescent · 4 lantern · 5 tile star
 */
import { KIND_BOMB, KIND_LINE_V, KIND_NONE, KIND_RAINBOW } from '../engine/engine';

const wrap = (body: string, defs = ''): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>
<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".5" stop-color="#f5b921"/><stop offset="1" stop-color="#a86a00"/></linearGradient>
<filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000" flood-opacity=".35"/></filter>
${defs}</defs>${body}</svg>`;

const PIECES: { defs: string; body: string }[] = [
  {
    // Tulip
    defs: `<linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a94"/><stop offset=".55" stop-color="#e8203c"/><stop offset="1" stop-color="#93091f"/></linearGradient>
<linearGradient id="lf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7be08f"/><stop offset="1" stop-color="#16763a"/></linearGradient>`,
    body: `<g filter="url(#sh)"><path d="M50 62V92" stroke="#16763a" stroke-width="7" stroke-linecap="round"/>
<path d="M50 88C36 88 26 78 24 66c12 0 22 8 26 22Z" fill="url(#lf)" stroke="#0e5529" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M50 88c14 0 24-10 26-22-12 0-22 8-26 22Z" fill="url(#lf)" stroke="#0e5529" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M22 12c8 4 13 10 16 18 3-10 7-17 12-22 5 5 9 12 12 22 3-8 8-14 16-18 4 22 2 54-28 56C20 66 18 34 22 12Z" fill="url(#a)" stroke="#7a0619" stroke-width="3" stroke-linejoin="round"/>
<path d="M50 14c7 12 9 32 0 52-9-20-7-40 0-52Z" fill="#ff5d6e" stroke="#7a0619" stroke-width="2"/>
<path d="M27 22c5 4 8 9 9 16-4 6-5 14-3 22-7-9-8-24-6-38Z" fill="#fff" opacity=".35"/></g>`,
  },
  {
    // Evil-eye bead
    defs: `<radialGradient id="a" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#5aa9ff"/><stop offset=".6" stop-color="#1450c8"/><stop offset="1" stop-color="#07226e"/></radialGradient>`,
    body: `<g filter="url(#sh)"><circle cx="50" cy="52" r="40" fill="url(#a)" stroke="#051a57" stroke-width="3"/>
<circle cx="50" cy="52" r="26" fill="#f6fbff" stroke="#b9d4f5" stroke-width="2"/>
<circle cx="50" cy="52" r="17" fill="#3fc1ff" stroke="#1183c4" stroke-width="2"/>
<circle cx="50" cy="52" r="8.5" fill="#06143f"/>
<ellipse cx="36" cy="32" rx="15" ry="8" fill="#fff" opacity=".45" transform="rotate(-28 36 32)"/>
<circle cx="46" cy="48" r="3" fill="#fff" opacity=".9"/></g>`,
  },
  {
    // Emerald
    defs: `<linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8dffb6"/><stop offset=".5" stop-color="#19c466"/><stop offset="1" stop-color="#065c30"/></linearGradient>`,
    body: `<g filter="url(#sh)" stroke-linejoin="round"><path d="M32 12h36l22 22v32L68 90H32L10 66V34Z" fill="url(#a)" stroke="#04441f" stroke-width="3"/>
<path d="M38 28h24l12 12v20L62 72H38L26 60V40Z" fill="#3fe08a" stroke="#0a8a48" stroke-width="2"/>
<path d="M32 12l6 16M68 12l-6 16M90 34l-16 6M90 66l-16-6M68 90l-6-18M32 90l6-18M10 66l16-6M10 34l16 6" stroke="#0a8a48" stroke-width="2"/>
<path d="M38 28h24l-8 8H34Z" fill="#fff" opacity=".55"/><path d="M32 12h36l-6 16H38Z" fill="#fff" opacity=".28"/></g>`,
  },
  {
    // Crescent with star
    defs: '',
    body: `<g filter="url(#sh)" stroke-linejoin="round"><path d="M62 10A42 42 0 1 0 90 74 34 34 0 1 1 62 10Z" fill="url(#gold)" stroke="#7a4a00" stroke-width="3"/>
<path d="M50 16A36 36 0 0 0 22 66 38 38 0 0 1 50 16Z" fill="#fff" opacity=".5"/>
<path d="M70 36l4.2 9 9.8 1.2-7.2 6.8 1.9 9.8-8.7-4.9-8.7 4.9 1.9-9.8-7.2-6.8 9.8-1.2Z" fill="url(#gold)" stroke="#7a4a00" stroke-width="2.5"/></g>`,
  },
  {
    // Lantern
    defs: `<linearGradient id="a" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6d21c9"/><stop offset=".5" stop-color="#c58bff"/><stop offset="1" stop-color="#5a17ad"/></linearGradient>
<radialGradient id="gl" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#fff7c2"/><stop offset="1" stop-color="#ffb52e"/></radialGradient>`,
    body: `<g filter="url(#sh)" stroke-linejoin="round"><path d="M50 4a6 6 0 0 1 6 6c0 3-2 5-4 6h-4c-2-1-4-3-4-6a6 6 0 0 1 6-6Z" fill="none" stroke="#a86a00" stroke-width="3.5"/>
<path d="M36 26c0-8 6-12 14-12s14 4 14 12Z" fill="url(#gold)" stroke="#7a4a00" stroke-width="2.5"/>
<path d="M30 26h40l8 22-8 30H30l-8-30Z" fill="url(#a)" stroke="#3a0b78" stroke-width="3"/>
<path d="M50 34c8 6 12 14 12 22s-4 14-12 16c-8-2-12-8-12-16s4-16 12-22Z" fill="url(#gl)" stroke="#a86a00" stroke-width="2.5"/>
<path d="M50 46c3 4 5 7 5 11a5 5 0 0 1-10 0c0-4 2-7 5-11Z" fill="#ff7a1a"/>
<path d="M28 78h44l4 8H24Z" fill="url(#gold)" stroke="#7a4a00" stroke-width="2.5"/><circle cx="50" cy="92" r="4.5" fill="url(#gold)" stroke="#7a4a00" stroke-width="2"/>
<path d="M32 30h8l-5 44h-6l-4-26Z" fill="#fff" opacity=".28"/></g>`,
  },
  {
    // Eight-pointed tile star
    defs: `<linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc48a"/><stop offset=".55" stop-color="#ff7a1a"/><stop offset="1" stop-color="#a83c00"/></linearGradient>`,
    body: `<g filter="url(#sh)" stroke-linejoin="round"><path d="M50 6l12.6 13.5 18.5-.6-.6 18.5L94 50 80.5 62.6l.6 18.5-18.5-.6L50 94 37.4 80.5l-18.5.6.6-18.5L6 50l13.5-12.6-.6-18.5 18.5.6Z" fill="url(#a)" stroke="#7a2a00" stroke-width="3"/>
<path d="M50 22l8 9.5 12.3-.9-.9 12.3L79 51l-9.6 8.1.9 12.3-12.3-.9L50 80l-8-9.5-12.3.9.9-12.3L21 51l9.6-8.1-.9-12.3 12.3.9Z" fill="#ffe2bd" stroke="#c75a10" stroke-width="2"/>
<circle cx="50" cy="51" r="13" fill="#12a5a5" stroke="#0a6464" stroke-width="2.5"/><circle cx="50" cy="51" r="5.5" fill="url(#gold)" stroke="#7a4a00" stroke-width="1.5"/>
<path d="M22 22l15-.5L50 8l4 5-12 13-14 .5Z" fill="#fff" opacity=".35"/></g>`,
  },
];

/** Gold arrow heads for line pieces. */
const arrows = (vertical: boolean): string =>
  `<g ${vertical ? 'transform="rotate(90 50 50)"' : ''} stroke="#7a4a00" stroke-width="2.5" stroke-linejoin="round" fill="url(#gold)">
<path d="M2 50l17-15v9h9v12h-9v9Z"/><path d="M98 50L81 35v9h-9v12h9v9Z"/></g>`;

const burst = `<path d="M50 0l7 17 14-12-1 18 18-4-9 16 18 5-15 10 15 10-18 5 9 16-18-4 1 18-14-12-7 17-7-17-14 12 1-18-18 4 9-16L3 60l15-10L3 40l18-5-9-16 18 4-1-18 14 12Z" fill="url(#gold)" stroke="#7a4a00" stroke-width="2.5" stroke-linejoin="round"/>
<circle cx="50" cy="50" r="33" fill="#2a1438" stroke="#7a4a00" stroke-width="2.5"/>`;

const fuse = `<path d="M70 20q8-10 16-6" fill="none" stroke="#5b3a16" stroke-width="4" stroke-linecap="round"/>
<path d="M88 6l2 6 6 1-5 4 1 6-5-3-5 3 1-6-5-4 6-1Z" fill="#fff3b0" stroke="#ff7a1a" stroke-width="1.5"/>`;

export function tileSvg(color: number, kind: number): string {
  if (kind === KIND_RAINBOW) return rainbowSvg();
  const p = PIECES[color];
  if (kind === KIND_NONE) return wrap(p.body, p.defs);
  if (kind === KIND_BOMB) return wrap(`${burst}<g transform="translate(22 22) scale(.56)">${p.body}</g>${fuse}`, p.defs);
  const v = kind === KIND_LINE_V;
  return wrap(
    `<rect x="${v ? 31 : 3}" y="${v ? 3 : 31}" width="${v ? 38 : 94}" height="${v ? 94 : 38}" rx="19" fill="#fff3b0" opacity=".55" stroke="url(#gold)" stroke-width="3"/>
<g transform="translate(16 16) scale(.68)">${p.body}</g>${arrows(v)}`,
    p.defs,
  );
}

/** The Sultan's Jewel: matches with everything. */
export function rainbowSvg(): string {
  const gems = ['#e8203c', '#ff7a1a', '#f5b921', '#19c466', '#1450c8', '#a050f0']
    .map((c, k) => {
      const a = (k * Math.PI) / 3 - Math.PI / 2;
      return `<circle cx="${(50 + Math.cos(a) * 27).toFixed(1)}" cy="${(50 + Math.sin(a) * 27).toFixed(1)}" r="9" fill="${c}" stroke="#7a4a00" stroke-width="2"/><circle cx="${(47 + Math.cos(a) * 27).toFixed(1)}" cy="${(47 + Math.sin(a) * 27).toFixed(1)}" r="2.6" fill="#fff" opacity=".8"/>`;
    })
    .join('');
  return wrap(`<g filter="url(#sh)"><path d="M50 3l10 9 13-3 4 13 13 4-3 13 9 11-9 11 3 13-13 4-4 13-13-3-10 9-10-9-13 3-4-13-13-4 3-13-9-11 9-11-3-13 13-4 4-13 13 3Z" fill="url(#gold)" stroke="#7a4a00" stroke-width="3" stroke-linejoin="round"/>
<circle cx="50" cy="50" r="38" fill="#3a1a52" stroke="#7a4a00" stroke-width="2"/>${gems}
<path d="M50 34l12 16-12 16-12-16Z" fill="#eafcff" stroke="#3aa7c7" stroke-width="2" stroke-linejoin="round"/><path d="M50 34l-12 16h24Z" fill="#fff"/><path d="M50 34v32M38 50h24" stroke="#9fdcf0" stroke-width="1.5"/></g>`);
}

/** Treasure chest blocker. Two hits when iron-bound. */
export function crateSvg(hp: number): string {
  const iron =
    hp >= 2
      ? `<path d="M10 52h80v10H10Z" fill="#9aa7b8" stroke="#3d4756" stroke-width="2"/><path d="M26 22h10v66H26ZM64 22h10v66H64Z" fill="#9aa7b8" stroke="#3d4756" stroke-width="2"/>
<g fill="#e7edf5" stroke="#3d4756" stroke-width="1"><circle cx="31" cy="30" r="2.4"/><circle cx="69" cy="30" r="2.4"/><circle cx="31" cy="80" r="2.4"/><circle cx="69" cy="80" r="2.4"/></g>`
      : '';
  return wrap(
    `<g filter="url(#sh)" stroke-linejoin="round"><path d="M10 44c0-18 14-28 40-28s40 10 40 28Z" fill="url(#w)" stroke="#4a2a0c" stroke-width="3"/>
<path d="M10 44h80v40a6 6 0 0 1-6 6H16a6 6 0 0 1-6-6Z" fill="url(#w)" stroke="#4a2a0c" stroke-width="3"/>
<path d="M22 22v22M36 17v27M50 16v28M64 17v27M78 22v22M30 44v46M50 44v46M70 44v46" stroke="#6b3f17" stroke-width="2" opacity=".7"/>
<path d="M10 40h80v9H10Z" fill="url(#gold)" stroke="#7a4a00" stroke-width="2.5"/>${iron}
<path d="M42 38h16v20a8 8 0 0 1-16 0Z" fill="url(#gold)" stroke="#7a4a00" stroke-width="2.5"/><circle cx="50" cy="50" r="3.2" fill="#4a2a0c"/><path d="M48.6 51h2.8l1 7h-4.8Z" fill="#4a2a0c"/>
<path d="M18 28c8-7 18-9 28-9" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".3"/></g>`,
    `<linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c98a4b"/><stop offset="1" stop-color="#8a5220"/></linearGradient>`,
  );
}

/** Carpet layer under a piece. Two layers for the thick one. */
export function carpetSvg(hp: number): string {
  const thick = hp >= 2;
  const base = thick ? '#8c1228' : '#c4455a';
  const edge = thick ? '#4f0614' : '#8c1228';
  const fringe = Array.from({ length: 9 }, (_, k) => `<path d="M${10 + k * 10} 4v8M${10 + k * 10} 88v8" stroke="#f1dfb5" stroke-width="3" stroke-linecap="round"/>`).join('');
  return wrap(`${fringe}<rect x="4" y="9" width="92" height="82" rx="5" fill="${base}" stroke="${edge}" stroke-width="3"/>
<rect x="11" y="16" width="78" height="68" rx="3" fill="none" stroke="url(#gold)" stroke-width="${thick ? 4 : 2.5}"/>
<path d="M50 24l22 26-22 26-22-26Z" fill="${thick ? '#12787a' : '#e9a8b2'}" stroke="url(#gold)" stroke-width="2.5" stroke-linejoin="round" opacity="${thick ? 1 : 0.9}"/>
${thick ? '<path d="M50 36l11 14-11 14-11-14Z" fill="url(#gold)"/><g fill="url(#gold)"><circle cx="20" cy="25" r="3.5"/><circle cx="80" cy="25" r="3.5"/><circle cx="20" cy="75" r="3.5"/><circle cx="80" cy="75" r="3.5"/></g>' : ''}`);
}
