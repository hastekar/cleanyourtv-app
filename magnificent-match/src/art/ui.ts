/** Interface art: coin, boosters, coin packs and small symbols. */
const G = `<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".5" stop-color="#f5b921"/><stop offset="1" stop-color="#a86a00"/></linearGradient>
<filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000" flood-opacity=".35"/></filter>`;
const wrap = (body: string, defs = '', box = '0 0 100 100'): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}"><defs>${G}${defs}</defs>${body}</svg>`;

const coinAt = (x: number, y: number, r: number): string =>
  `<g transform="translate(${x} ${y}) scale(${r / 40})"><circle r="40" fill="url(#gold)" stroke="#7a4a00" stroke-width="4"/><circle r="30" fill="none" stroke="#a86a00" stroke-width="3" opacity=".7"/>
<path d="M6-20A21 21 0 1 0 20 12 17 17 0 1 1 6-20Z" fill="#a86a00"/><path d="M4-22A21 21 0 1 0 18 10 17 17 0 1 1 4-22Z" fill="#fff3b0"/>
<path d="M-28-14q10-16 26-18" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".6"/></g>`;

export const coin = (): string => wrap(`<g filter="url(#sh)">${coinAt(50, 50, 42)}</g>`);

const flatCoin = (x: number, y: number): string =>
  `<ellipse cx="${x}" cy="${y + 5}" rx="20" ry="8" fill="#a86a00" stroke="#7a4a00" stroke-width="2"/><rect x="${x - 20}" y="${y}" width="40" height="5" fill="#d99a12"/><ellipse cx="${x}" cy="${y}" rx="20" ry="8" fill="url(#gold)" stroke="#7a4a00" stroke-width="2"/>`;

/** Coin pack art, growing with the tier (0..5). */
export function coinPack(tier: number): string {
  if (tier <= 1) {
    const stacks = tier === 0 ? [[50, 70, 3]] : [[32, 72, 3], [66, 72, 5]];
    const body = stacks.map(([x, y, n]) => Array.from({ length: n }, (_, k) => flatCoin(x, y - k * 9)).join('')).join('');
    return wrap(`<g filter="url(#sh)">${body}${coinAt(tier === 0 ? 50 : 30, 30, 16)}</g>`);
  }
  if (tier <= 3) {
    return wrap(
      `<g filter="url(#sh)">${tier === 3 ? flatCoin(22, 84) + flatCoin(80, 86) + flatCoin(80, 77) : ''}
<path d="M30 34c-18 14-24 32-20 46 4 12 76 12 80 0 4-14-2-32-20-46Z" fill="url(#bag)" stroke="#4a2a0c" stroke-width="3" stroke-linejoin="round"/>
<path d="M30 34c-6-8-8-16-4-22 8 4 16 0 24 2s16 2 24-2c4 6 2 14-4 22Z" fill="url(#bag)" stroke="#4a2a0c" stroke-width="3" stroke-linejoin="round"/>
<path d="M28 32h44v8H28Z" fill="url(#gold)" stroke="#7a4a00" stroke-width="2.5"/>${coinAt(50, 62, 15)}${coinAt(40, 12, 9)}${coinAt(60, 10, 9)}${tier === 3 ? coinAt(50, 4, 9) : ''}</g>`,
      `<linearGradient id="bag" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c98a4b"/><stop offset="1" stop-color="#7a4517"/></linearGradient>`,
    );
  }
  const jewels = tier === 5 ? '<path d="M24 34l8-10 8 10-8 8Z" fill="#19c466" stroke="#065c30" stroke-width="2"/><path d="M62 30l8-10 8 10-8 8Z" fill="#e3243f" stroke="#8a0d22" stroke-width="2"/><circle cx="50" cy="20" r="7" fill="#3fc1ff" stroke="#1450c8" stroke-width="2"/>' : '';
  return wrap(
    `<g filter="url(#sh)" stroke-linejoin="round"><path d="M12 40c2-22 14-34 38-34s36 12 38 34l-8 4H20Z" fill="url(#w)" stroke="#4a2a0c" stroke-width="3" transform="rotate(-8 50 40)"/>
${coinAt(30, 40, 12)}${coinAt(50, 36, 13)}${coinAt(70, 40, 12)}${coinAt(40, 30, 10)}${coinAt(62, 28, 10)}${jewels}
<path d="M8 46h84v40a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6Z" fill="url(#w)" stroke="#4a2a0c" stroke-width="3"/>
<path d="M8 46h84v10H8ZM24 46h9v46h-9ZM67 46h9v46h-9Z" fill="url(#gold)" stroke="#7a4a00" stroke-width="2.5"/>
<path d="M42 50h16v18a8 8 0 0 1-16 0Z" fill="url(#gold)" stroke="#7a4a00" stroke-width="2.5"/><circle cx="50" cy="61" r="3.2" fill="#4a2a0c"/></g>`,
    `<linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c98a4b"/><stop offset="1" stop-color="#8a5220"/></linearGradient>`,
  );
}

export type BoosterId = 'hammer' | 'cross' | 'shuffle' | 'rocket' | 'bomb' | 'rainbow';

const plate = (c1: string, c2: string): string =>
  `<circle cx="50" cy="50" r="46" fill="url(#gold)" stroke="#7a4a00" stroke-width="3"/><circle cx="50" cy="50" r="38" fill="url(#pl)" stroke="#7a4a00" stroke-width="2"/>`.replace('url(#pl)', `url(#pl)`) +
  `<defs><radialGradient id="pl" cx=".4" cy=".3" r=".9"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient></defs>`;

/** In-game boosters. */
export const hammerIcon = (): string =>
  wrap(`<g filter="url(#sh)">${plate('#5aa9ff', '#143c9c')}<g transform="rotate(-38 50 50)" stroke-linejoin="round">
<rect x="45" y="34" width="10" height="52" rx="4" fill="#b07a43" stroke="#4a2a0c" stroke-width="2.5"/>
<rect x="24" y="16" width="52" height="28" rx="7" fill="#d9dfea" stroke="#3d4756" stroke-width="3"/><rect x="24" y="16" width="12" height="28" rx="5" fill="url(#gold)" stroke="#7a4a00" stroke-width="2.5"/><rect x="64" y="16" width="12" height="28" rx="5" fill="url(#gold)" stroke="#7a4a00" stroke-width="2.5"/>
<path d="M40 22h20" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/></g></g>`);

export const crossIcon = (): string =>
  wrap(`<g filter="url(#sh)">${plate('#ff9aa5', '#a3142b')}<g fill="url(#gold)" stroke="#7a4a00" stroke-width="2.5" stroke-linejoin="round">
<path d="M50 10l14 14h-8v20h20v-8l14 14-14 14v-8H56v20h8L50 90 36 76h8V56H24v8L10 50l14-14v8h20V24h-8Z"/></g><circle cx="50" cy="50" r="6" fill="#fff" opacity=".8"/></g>`);

export const shuffleIcon = (): string =>
  wrap(`<g filter="url(#sh)">${plate('#8dffb6', '#0b7a43')}<g fill="none" stroke="#7a4a00" stroke-width="13" stroke-linecap="round"><path d="M24 44a27 27 0 0 1 46-12M76 56a27 27 0 0 1-46 12"/></g>
<g fill="none" stroke="url(#gold)" stroke-width="8" stroke-linecap="round"><path d="M24 44a27 27 0 0 1 46-12M76 56a27 27 0 0 1-46 12"/></g>
<path d="M62 16l18 14-22 8Z" fill="url(#gold)" stroke="#7a4a00" stroke-width="2.5" stroke-linejoin="round"/><path d="M38 84L20 70l22-8Z" fill="url(#gold)" stroke="#7a4a00" stroke-width="2.5" stroke-linejoin="round"/></g>`);

/** "+5 moves" badge for the continue offer. */
export const plusMovesIcon = (): string =>
  wrap(`<g filter="url(#sh)">${plate('#d7a8ff', '#571aa3')}<text x="50" y="66" text-anchor="middle" font-family="Georgia,serif" font-weight="900" font-size="46" fill="#fff3b0" stroke="#7a4a00" stroke-width="2.5" paint-order="stroke">+5</text></g>`);

export const star = (on = true): string =>
  wrap(`<path d="M50 5l13.5 28.5 31 4-22.8 21.6 5.9 30.9L50 74.6 22.4 90l5.9-30.9L5.5 37.5l31-4Z" fill="${on ? 'url(#gold)' : '#3b2a5c'}" stroke="${on ? '#7a4a00' : '#22163a'}" stroke-width="4" stroke-linejoin="round" ${on ? 'filter="url(#sh)"' : ''}/>${on ? '<path d="M50 14l9 22-24 6Z" fill="#fff" opacity=".5"/>' : ''}`);

export const gear = (): string =>
  wrap(`<path d="M43 6h14l3 12 8 4 11-6 10 10-6 11 4 8 12 3v14l-12 3-4 8 6 11-10 10-11-6-8 4-3 12H43l-3-12-8-4-11 6-10-10 6-11-4-8-12-3V43l12-3 4-8-6-11 10-10 11 6 8-4Z" fill="url(#gold)" stroke="#7a4a00" stroke-width="3" stroke-linejoin="round" transform="translate(5 5) scale(.9)"/><circle cx="50" cy="50" r="14" fill="#3a1a52" stroke="#7a4a00" stroke-width="3"/>`);

export const lock = (): string =>
  wrap(`<path d="M30 46V34a20 20 0 0 1 40 0v12" fill="none" stroke="#9aa7b8" stroke-width="9"/><rect x="20" y="44" width="60" height="46" rx="9" fill="#5d6b80" stroke="#2b3442" stroke-width="3"/><circle cx="50" cy="62" r="7" fill="#2b3442"/><path d="M47 64h6l2 14H45Z" fill="#2b3442"/>`);

/** Emblem used on the loading screen and as the app icon: a jewelled turban. */
export const emblem = (): string =>
  wrap(
    `<g filter="url(#sh)" stroke-linejoin="round"><path d="M50 6c9 0 14 9 14 20H36c0-11 5-20 14-20Z" fill="#e3243f" stroke="#5e0816" stroke-width="3"/>
<path d="M10 62C2 34 24 18 50 18s48 16 40 44c-8 12-72 12-80 0Z" fill="url(#tb)" stroke="#8d93b3" stroke-width="3"/>
<path d="M16 42q34-18 68 0M12 56q38-18 76 0" stroke="#b9bfd9" stroke-width="2.5" fill="none"/>
<path d="M50 20c-5-12-1-20 7-23 0 10 4 14-2 25Z" fill="#12a5a5" stroke="#0a6464" stroke-width="2"/>
<path d="M50 24l12 16-12 18-12-18Z" fill="#19c466" stroke="url(#gold)" stroke-width="5"/><path d="M50 28l-7 12h14Z" fill="#fff" opacity=".6"/>
<path d="M14 70q36 14 72 0l-4 14q-32 12-64 0Z" fill="url(#gold)" stroke="#7a4a00" stroke-width="3"/><g fill="#e3243f" stroke="#7a4a00" stroke-width="1.5"><circle cx="30" cy="79" r="4"/><circle cx="50" cy="82" r="4"/><circle cx="70" cy="79" r="4"/></g></g>`,
    `<linearGradient id="tb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#d9dcec"/></linearGradient>`,
  );
