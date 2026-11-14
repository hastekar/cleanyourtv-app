/**
 * The three characters, drawn as layered vector art. Parts that move carry a class
 * (c-body, c-head, c-arm-l, c-arm-r, c-lids, c-extra) that the stylesheet animates.
 */
export type Mood = 'idle' | 'happy' | 'sad';

// Each drawing gets its own id prefix: two copies of a character on one page must not share
// gradient ids, or a hidden copy would blank the visible one.
let serial = 0;
const svg = (cls: string, body: string): string => {
  const n = ++serial;
  return `<svg class="char ${cls}" xmlns="http://www.w3.org/2000/svg" viewBox="0 -16 200 266" aria-hidden="true">${body.replace(/\b(su|vi|je)-/g, `$1${n}-`)}</svg>`;
};

const shadow = '<ellipse cx="100" cy="240" rx="62" ry="8" fill="#000" opacity=".28"/>';

/** Eyes with separate lids so they can blink. */
const eyes = (y: number, gap: number, mood: Mood, iris = '#3a2412'): string => {
  const l = 100 - gap;
  const r = 100 + gap;
  const brow =
    mood === 'sad'
      ? `<path d="M${l - 9} ${y - 15}l16-6M${r + 9} ${y - 15}l-16-6" />`
      : mood === 'happy'
        ? `<path d="M${l - 9} ${y - 16}q8-8 17-2M${r + 9} ${y - 16}q-8-8-17-2" />`
        : `<path d="M${l - 9} ${y - 14}q8-5 17-1M${r + 9} ${y - 14}q-8-5-17-1" />`;
  const eye = (x: number): string =>
    mood === 'happy'
      ? `<path d="M${x - 8} ${y + 2}q8-11 16 0" fill="none" stroke="#2a180a" stroke-width="3.5" stroke-linecap="round"/>`
      : `<ellipse cx="${x}" cy="${y}" rx="7.5" ry="9" fill="#fff" stroke="#2a180a" stroke-width="1.5"/><circle cx="${x + 1}" cy="${y + (mood === 'sad' ? 3 : 1)}" r="4.6" fill="${iris}"/><circle cx="${x + 2.6}" cy="${y - 1}" r="1.6" fill="#fff"/>
<rect class="c-lids" x="${x - 9}" y="${y - 10}" width="18" height="20" rx="8" fill="var(--skin)"/>`;
  return `${eye(l)}${eye(r)}<g fill="none" stroke="var(--brow)" stroke-width="4" stroke-linecap="round">${brow}</g>`;
};

/** Padişah: the Sultan. */
export function sultan(mood: Mood = 'idle'): string {
  const mouth =
    mood === 'happy'
      ? '<path d="M86 121q14 16 28 0Z" fill="#7a1420" stroke="#3b1c0c" stroke-width="2" stroke-linejoin="round"/><path d="M91 123q9 4 18 0" stroke="#fff" stroke-width="3" fill="none"/>'
      : mood === 'sad'
        ? '<path d="M90 127q10-8 20 0" fill="none" stroke="#3b1c0c" stroke-width="3" stroke-linecap="round"/>'
        : '<path d="M90 122q10 8 20 0" fill="none" stroke="#3b1c0c" stroke-width="3" stroke-linecap="round"/>';
  return svg(
    `sultan ${mood}`,
    `<defs>
<linearGradient id="su-robe" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e3243f"/><stop offset="1" stop-color="#8a0d22"/></linearGradient>
<linearGradient id="su-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".5" stop-color="#f5b921"/><stop offset="1" stop-color="#a86a00"/></linearGradient>
<radialGradient id="su-skin" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#ffd9b0"/><stop offset="1" stop-color="#e2a877"/></radialGradient>
<linearGradient id="su-turban" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d9dcec"/></linearGradient>
</defs>${shadow}
<g class="c-body" style="--skin:#f0bd8e;--brow:#4a2a10">
  <path d="M70 236h26l-2 8H62ZM104 236h26l8 8h-32Z" fill="#f5b921" stroke="#7a4a00" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M44 238c-6-52 2-86 28-100h56c26 14 34 48 28 100Z" fill="url(#su-robe)" stroke="#5e0816" stroke-width="3" stroke-linejoin="round"/>
  <path d="M60 170c4 6 4 14 0 20M140 170c-4 6-4 14 0 20M70 214c6 4 6 12 2 18M130 214c-6 4-6 12-2 18" stroke="#f5b921" stroke-width="2.5" fill="none" opacity=".7"/>
  <path d="M90 138h20l6 100H84Z" fill="url(#su-gold)" stroke="#7a4a00" stroke-width="2.5"/>
  <g fill="#e3243f" stroke="#7a4a00" stroke-width="1.5"><circle cx="100" cy="160" r="4.5"/><circle cx="100" cy="178" r="4.5"/><circle cx="100" cy="222" r="4.5"/></g>
  <path d="M48 190q52 16 104 0l2 16q-54 16-108 0Z" fill="#12a5a5" stroke="#0a6464" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M92 192h16v16H92Z" fill="url(#su-gold)" stroke="#7a4a00" stroke-width="2.5"/><circle cx="100" cy="200" r="4" fill="#19c466" stroke="#065c30" stroke-width="1.5"/>
  <g class="c-arm-l"><path d="M60 146c-18 6-26 24-24 46l18 2c0-14 4-24 14-30Z" fill="url(#su-robe)" stroke="#5e0816" stroke-width="3" stroke-linejoin="round"/>
    <path d="M32 190h24v9H32Z" fill="url(#su-gold)" stroke="#7a4a00" stroke-width="2"/><circle cx="44" cy="207" r="10" fill="url(#su-skin)" stroke="#a56c3c" stroke-width="2.5"/></g>
  <g class="c-arm-r"><path d="M140 146c18 6 26 24 24 46l-18 2c0-14-4-24-14-30Z" fill="url(#su-robe)" stroke="#5e0816" stroke-width="3" stroke-linejoin="round"/>
    <path d="M144 190h24v9h-24Z" fill="url(#su-gold)" stroke="#7a4a00" stroke-width="2"/><circle cx="156" cy="207" r="10" fill="url(#su-skin)" stroke="#a56c3c" stroke-width="2.5"/></g>
  <path d="M58 146c10-16 74-16 84 0-4 14-18 20-42 12-24 8-38 2-42-12Z" fill="#fffaf0" stroke="#cdb894" stroke-width="2.5" stroke-linejoin="round"/>
  <g fill="#3b2a1c"><circle cx="74" cy="150" r="2"/><circle cx="90" cy="156" r="2"/><circle cx="110" cy="156" r="2"/><circle cx="126" cy="150" r="2"/></g>
  <g class="c-head">
    <circle cx="58" cy="100" r="8" fill="url(#su-skin)" stroke="#a56c3c" stroke-width="2.5"/><circle cx="142" cy="100" r="8" fill="url(#su-skin)" stroke="#a56c3c" stroke-width="2.5"/>
    <circle cx="100" cy="98" r="42" fill="url(#su-skin)" stroke="#a56c3c" stroke-width="3"/>
    <path d="M60 104c0 34 16 50 40 50s40-16 40-50c-6 14-14 18-22 16-6-6-30-6-36 0-8 2-16-2-22-16Z" fill="#5b3418" stroke="#3b1c0c" stroke-width="3" stroke-linejoin="round"/>
    <path d="M78 140q22 10 44 0M84 148q16 6 32 0" stroke="#7a4a26" stroke-width="2" fill="none" opacity=".8"/>
    ${mouth}
    <path d="M100 112c-8-6-22-4-28 6 10 2 20 0 28-4 8 4 18 6 28 4-6-10-20-12-28-6Z" fill="#3b1c0c"/>
    <path d="M96 100q4 9 8 0" fill="#e2a877" stroke="#a56c3c" stroke-width="2" stroke-linecap="round"/>
    ${eyes(92, 17, mood)}
    <circle cx="74" cy="108" r="6" fill="#ff8f7a" opacity=".45"/><circle cx="126" cy="108" r="6" fill="#ff8f7a" opacity=".45"/>
    <path d="M100 4c14 0 22 14 22 30H78c0-16 8-30 22-30Z" fill="url(#su-robe)" stroke="#5e0816" stroke-width="3"/>
    <path d="M44 66c-8-30 24-46 56-46s64 16 56 46c-10 12-102 12-112 0Z" fill="url(#su-turban)" stroke="#8d93b3" stroke-width="3" stroke-linejoin="round"/>
    <path d="M50 44q50-22 100 0M46 58q54-20 108 0M64 30q36-12 72 0" stroke="#b9bfd9" stroke-width="2.5" fill="none"/>
    <path d="M100 26c-6-14-2-24 8-28 0 12 4 16-2 30Z" fill="#12a5a5" stroke="#0a6464" stroke-width="2" stroke-linejoin="round"/>
    <path d="M100 30l11 14-11 16-11-16Z" fill="#19c466" stroke="url(#su-gold)" stroke-width="4" stroke-linejoin="round"/><path d="M100 34l-6 10h12Z" fill="#fff" opacity=".6"/>
  </g>
</g>`,
  );
}

/** Vezir: the Grand Vizier, keeper of the treasury. */
export function vizier(mood: Mood = 'idle'): string {
  const mouth =
    mood === 'happy'
      ? '<path d="M90 112q10 10 20 0" fill="#7a1420" stroke="#30303c" stroke-width="2"/>'
      : '<path d="M92 114q10 5 18-2" fill="none" stroke="#30303c" stroke-width="2.5" stroke-linecap="round"/>';
  return svg(
    `vizier ${mood}`,
    `<defs>
<linearGradient id="vi-robe" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7a3fd1"/><stop offset="1" stop-color="#34107a"/></linearGradient>
<linearGradient id="vi-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".5" stop-color="#f5b921"/><stop offset="1" stop-color="#a86a00"/></linearGradient>
<radialGradient id="vi-skin" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#f3d2ae"/><stop offset="1" stop-color="#cf9c72"/></radialGradient>
<linearGradient id="vi-hat" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0d7a5a"/><stop offset=".5" stop-color="#27c48f"/><stop offset="1" stop-color="#0a5c44"/></linearGradient>
</defs>${shadow}
<g class="c-body" style="--skin:#e2b78d;--brow:#8a8f9c">
  <path d="M76 238h20v7H68ZM104 238h20l8 7h-28Z" fill="#34107a" stroke="#1c0647" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M58 240c-8-54 0-88 22-102h40c22 14 30 48 22 102Z" fill="url(#vi-robe)" stroke="#1c0647" stroke-width="3" stroke-linejoin="round"/>
  <path d="M94 138h12l10 102H84Z" fill="#1c0647" opacity=".35"/>
  <path d="M80 138c6 40 6 72 2 102M120 138c-6 40-6 72-2 102" stroke="url(#vi-gold)" stroke-width="4" fill="none"/>
  <path d="M64 196q36 12 72 0v12q-36 12-72 0Z" fill="url(#vi-gold)" stroke="#7a4a00" stroke-width="2.5" stroke-linejoin="round"/>
  <g class="c-arm-l"><path d="M72 146c-16 8-22 26-18 48l16-2c-2-12 2-22 10-28Z" fill="url(#vi-robe)" stroke="#1c0647" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="62" cy="200" r="9" fill="url(#vi-skin)" stroke="#8f6238" stroke-width="2.5"/></g>
  <g class="c-arm-r"><path d="M128 146c18 4 28 18 30 34l-14 8c-4-10-12-16-22-18Z" fill="url(#vi-robe)" stroke="#1c0647" stroke-width="3" stroke-linejoin="round"/>
    <g class="c-extra"><rect x="140" y="142" width="34" height="52" rx="4" fill="#fff5d6" stroke="#b08a48" stroke-width="2.5"/>
      <rect x="136" y="136" width="42" height="10" rx="5" fill="#e6c98a" stroke="#b08a48" stroke-width="2.5"/><rect x="136" y="190" width="42" height="10" rx="5" fill="#e6c98a" stroke="#b08a48" stroke-width="2.5"/>
      <path d="M147 156h20M147 164h20M147 172h14" stroke="#8a6a34" stroke-width="2.5" stroke-linecap="round"/><circle cx="165" cy="181" r="5" fill="#e3243f" stroke="#8a0d22" stroke-width="1.5"/></g>
    <circle cx="152" cy="186" r="9" fill="url(#vi-skin)" stroke="#8f6238" stroke-width="2.5"/></g>
  <path d="M74 142q26-12 52 0l-6 12q-20-8-40 0Z" fill="url(#vi-gold)" stroke="#7a4a00" stroke-width="2.5" stroke-linejoin="round"/>
  <g class="c-head">
    <path d="M70 92c-2-22 10-40 30-40s32 18 30 40c-2 20-12 34-30 34s-28-14-30-34Z" fill="url(#vi-skin)" stroke="#8f6238" stroke-width="3"/>
    <path d="M74 106c2 22 10 34 16 44 4 8 8 18 10 30 2-12 6-22 10-30 6-10 14-22 16-44-8 10-18 12-26 10-8 2-18 0-26-10Z" fill="#dfe3ee" stroke="#8a8f9c" stroke-width="3" stroke-linejoin="round"/>
    <path d="M92 132q4 20 8 34M108 132q-4 20-8 34" stroke="#aab0c0" stroke-width="2" fill="none"/>
    ${mouth}
    <path d="M100 106c-6-5-20-5-30 4 10 3 22 2 30-2 8 4 20 5 30 2-10-9-24-9-30-4Z" fill="#c9cedb" stroke="#8a8f9c" stroke-width="2" stroke-linejoin="round"/>
    <path d="M100 82q-7 14 0 18q6-3 3-8Z" fill="#cf9c72" stroke="#8f6238" stroke-width="2" stroke-linejoin="round"/>
    ${eyes(84, 14, mood, '#2d4a3a')}
    <path d="M70 62c-4-34 8-58 30-58s34 24 30 58c-14-8-46-8-60 0Z" fill="url(#vi-hat)" stroke="#06402f" stroke-width="3" stroke-linejoin="round"/>
    <path d="M64 68c0-12 16-18 36-18s36 6 36 18c-10 8-62 8-72 0Z" fill="#fdfdff" stroke="#8d93b3" stroke-width="3"/>
    <path d="M70 62q30-10 60 0" stroke="#b9bfd9" stroke-width="2.5" fill="none"/>
    <circle cx="100" cy="30" r="7" fill="#e3243f" stroke="url(#vi-gold)" stroke-width="3.5"/>
  </g>
</g>`,
  );
}

/** Soytarı: the Sultan's jester. */
export function jester(mood: Mood = 'idle'): string {
  const mouth =
    mood === 'sad'
      ? '<path d="M82 122q18-14 36 0" fill="none" stroke="#3b1c0c" stroke-width="3.5" stroke-linecap="round"/>'
      : '<path d="M78 112q22 30 44 0Z" fill="#7a1420" stroke="#3b1c0c" stroke-width="2.5" stroke-linejoin="round"/><path d="M84 116q16 7 32 0" stroke="#fff" stroke-width="4" fill="none"/><path d="M92 128q8-5 16 0" fill="#ff7a8a"/>';
  const bell = (x: number, y: number): string =>
    `<g class="c-bell"><circle cx="${x}" cy="${y}" r="7.5" fill="url(#je-gold)" stroke="#7a4a00" stroke-width="2"/><path d="M${x - 4} ${y + 2}h8" stroke="#7a4a00" stroke-width="2"/></g>`;
  return svg(
    `jester ${mood}`,
    `<defs>
<linearGradient id="je-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".5" stop-color="#f5b921"/><stop offset="1" stop-color="#a86a00"/></linearGradient>
<radialGradient id="je-skin" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#ffe1c2"/><stop offset="1" stop-color="#eeb48a"/></radialGradient>
<clipPath id="je-clip"><path d="M56 240c-6-46 4-80 24-96h40c20 16 30 50 24 96Z"/></clipPath>
</defs>${shadow}
<g class="c-body" style="--skin:#f7c9a2;--brow:#7a3a10">
  <path d="M60 236c-14-2-24 2-28 10h44v-10ZM140 236c14-2 24 2 28 10h-44v-10Z" fill="#12a5a5" stroke="#0a6464" stroke-width="2.5" stroke-linejoin="round"/>
  ${bell(30, 244)}${bell(170, 244)}
  <g clip-path="url(#je-clip)"><rect x="40" y="130" width="60" height="120" fill="#ff7a1a"/><rect x="100" y="130" width="60" height="120" fill="#12a5a5"/>
    <g fill="#fff3b0" opacity=".9"><path d="M70 150l10 14-10 14-10-14ZM70 186l10 14-10 14-10-14ZM70 222l10 14-10 14-10-14Z"/></g>
    <g fill="#34107a" opacity=".55"><path d="M130 150l10 14-10 14-10-14ZM130 186l10 14-10 14-10-14ZM130 222l10 14-10 14-10-14Z"/></g></g>
  <path d="M56 240c-6-46 4-80 24-96h40c20 16 30 50 24 96Z" fill="none" stroke="#5a2a08" stroke-width="3" stroke-linejoin="round"/>
  <g class="c-arm-l"><path d="M78 148c-22 0-38 12-44 30l14 8c6-10 16-16 30-16Z" fill="#12a5a5" stroke="#0a6464" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="38" cy="186" r="10" fill="url(#je-skin)" stroke="#b0764a" stroke-width="2.5"/></g>
  <g class="c-arm-r"><path d="M122 148c22 0 38 12 44 30l-14 8c-6-10-16-16-30-16Z" fill="#ff7a1a" stroke="#a83c00" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="162" cy="186" r="10" fill="url(#je-skin)" stroke="#b0764a" stroke-width="2.5"/>
    <g class="c-extra"><circle cx="170" cy="158" r="11" fill="#e3243f" stroke="#8a0d22" stroke-width="2.5"/><path d="M162 154q8-6 15 0" stroke="#fff" stroke-width="2.5" fill="none" opacity=".7"/>
      <circle cx="186" cy="124" r="9" fill="#f5b921" stroke="#7a4a00" stroke-width="2.5"/><circle cx="160" cy="100" r="8" fill="#19c466" stroke="#065c30" stroke-width="2.5"/></g></g>
  <path d="M60 150l12-12 14 12 14-12 14 12 14-12 12 12-10 14-16-10-14 12-14-12-16 10Z" fill="#fff8ec" stroke="#cdb894" stroke-width="2.5" stroke-linejoin="round"/>
  <g class="c-head">
    <circle cx="100" cy="96" r="40" fill="url(#je-skin)" stroke="#b0764a" stroke-width="3"/>
    ${mouth}
    <circle cx="100" cy="102" r="7" fill="#e3243f" stroke="#8a0d22" stroke-width="2"/><circle cx="98" cy="100" r="2" fill="#fff" opacity=".8"/>
    ${eyes(88, 16, mood, '#1b5fae')}
    <circle cx="70" cy="108" r="7" fill="#ff6f6f" opacity=".5"/><circle cx="130" cy="108" r="7" fill="#ff6f6f" opacity=".5"/>
    <path d="M62 74c-16-6-34-24-40-46 20 2 40 14 50 30Z" fill="#ff7a1a" stroke="#a83c00" stroke-width="3" stroke-linejoin="round"/>
    <path d="M138 74c16-6 34-24 40-46-20 2-40 14-50 30Z" fill="#12a5a5" stroke="#0a6464" stroke-width="3" stroke-linejoin="round"/>
    <path d="M78 62c2-26 10-46 22-58 12 12 20 32 22 58Z" fill="#e3243f" stroke="#8a0d22" stroke-width="3" stroke-linejoin="round"/>
    <path d="M58 78c10-22 74-22 84 0-12 8-72 8-84 0Z" fill="url(#je-gold)" stroke="#7a4a00" stroke-width="3" stroke-linejoin="round"/>
    ${bell(20, 26)}${bell(180, 26)}${bell(100, 4)}
  </g>
</g>`,
  );
}
