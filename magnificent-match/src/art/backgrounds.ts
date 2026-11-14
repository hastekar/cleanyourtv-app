/** Full-screen scenery, drawn as vector art and scaled to cover any screen. */
const scene = (body: string, defs: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice"><defs>${defs}</defs>${body}</svg>`;

const stars = (seed: number, n: number, maxY: number): string => {
  let s = seed;
  const r = (): number => ((s = (s * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: n }, () => `<circle cx="${(r() * 400).toFixed(0)}" cy="${(r() * maxY).toFixed(0)}" r="${(0.6 + r() * 1.6).toFixed(1)}" fill="#fff" opacity="${(0.35 + r() * 0.6).toFixed(2)}"/>`).join('');
};

const dome = (x: number, y: number, r: number, fill: string): string =>
  `<path d="M${x - r} ${y}c0-${r * 0.9} ${r * 0.5}-${r * 1.25} ${r}-${r * 1.45}c${r * 0.5} ${r * 0.2} ${r} ${r * 0.55} ${r} ${r * 1.45}Z" fill="${fill}"/><path d="M${x} ${y - r * 1.45}v-${r * 0.45}" stroke="${fill}" stroke-width="3"/><circle cx="${x}" cy="${y - r * 1.95}" r="${Math.max(2.5, r * 0.09)}" fill="#f5b921"/>`;

const minaret = (x: number, y: number, h: number, fill: string): string =>
  `<rect x="${x - 6}" y="${y - h}" width="12" height="${h}" fill="${fill}"/><rect x="${x - 10}" y="${y - h * 0.72}" width="20" height="6" fill="${fill}"/><rect x="${x - 9}" y="${y - h * 0.42}" width="18" height="5" fill="${fill}"/>
<path d="M${x - 7} ${y - h}l7-34 7 34Z" fill="${fill}"/><circle cx="${x}" cy="${y - h - 36}" r="2.5" fill="#f5b921"/>`;

/** The palace at dusk: home and loading screens. */
export function palace(): string {
  const far = '#4a2f7d';
  const near = '#2a1a57';
  const windows = Array.from({ length: 9 }, (_, k) => `<path d="M${44 + k * 39} 560v-22a9 9 0 0 1 18 0v22Z" fill="#ffcf5c"/>`).join('');
  return scene(
    `<rect width="400" height="800" fill="url(#sky)"/>${stars(7, 70, 330)}
<circle cx="318" cy="120" r="150" fill="url(#glow)"/><path d="M330 76A46 46 0 1 0 356 150 38 38 0 1 1 330 76Z" fill="#fff3c4"/>
<g opacity=".9">${dome(90, 470, 46, far)}${dome(310, 470, 52, far)}${minaret(30, 480, 150, far)}${minaret(370, 480, 170, far)}<rect y="466" width="400" height="80" fill="${far}"/></g>
${minaret(128, 520, 220, near)}${minaret(272, 520, 220, near)}${dome(200, 500, 92, near)}${dome(84, 520, 40, near)}${dome(316, 520, 40, near)}
<rect y="510" width="400" height="120" fill="${near}"/><path d="M0 510h400v8H0Z" fill="#3a2670"/>${windows}
<path d="M170 630v-56a30 30 0 0 1 60 0v56Z" fill="#ffb53d"/><path d="M178 630v-54a22 22 0 0 1 44 0v54Z" fill="#fff0b8"/>
<rect y="626" width="400" height="174" fill="url(#floor)"/>
<g stroke="#5a3a8f" stroke-width="2" opacity=".55"><path d="M200 626L-80 800M200 626L60 800M200 626v174M200 626l140 174M200 626l280 174M0 664h400M0 714h400M0 772h400"/></g>
<rect width="400" height="800" fill="url(#vig)"/>`,
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#120b3a"/><stop offset=".45" stop-color="#4a1f7a"/><stop offset=".68" stop-color="#d45a6a"/><stop offset=".8" stop-color="#ffb35c"/></linearGradient>
<radialGradient id="glow"><stop offset="0" stop-color="#fff3c4" stop-opacity=".45"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></radialGradient>
<linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2670"/><stop offset="1" stop-color="#1a0f3f"/></linearGradient>
<radialGradient id="vig" cx=".5" cy=".45" r=".8"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient>`,
  );
}

/** The throne hall wall behind the board: tiled wall, arch and hanging lamps. */
export function hall(): string {
  const lamp = (x: number, len: number): string =>
    `<path d="M${x} 0v${len}" stroke="#a86a00" stroke-width="2"/><circle cx="${x}" cy="${len + 22}" r="34" fill="url(#lg)"/><path d="M${x - 9} ${len}h18l5 14-5 20h-18l-5-20Z" fill="#f5b921" stroke="#7a4a00" stroke-width="2"/><path d="M${x - 4} ${len + 8}h8v18h-8Z" fill="#fff3b0"/>`;
  return scene(
    `<rect width="400" height="800" fill="url(#wall)"/><rect width="400" height="800" fill="url(#pat)" opacity=".5"/>
<path d="M0 0h400v210c-30-120-110-170-200-170S30 90 0 210Z" fill="#0b3f46"/><path d="M0 210C30 90 110 40 200 40s170 50 200 170" fill="none" stroke="url(#gd)" stroke-width="7"/>
<path d="M0 232C36 112 112 62 200 62s164 50 200 170" fill="none" stroke="#f5b921" stroke-width="2" opacity=".6"/>
${lamp(70, 70)}${lamp(330, 70)}${lamp(200, 14)}
<rect y="690" width="400" height="110" fill="url(#fl)"/><path d="M0 690h400v7H0Z" fill="url(#gd)"/>
<rect width="400" height="800" fill="url(#vig)"/>`,
    `<linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#146e78"/><stop offset="1" stop-color="#0a3a4a"/></linearGradient>
<linearGradient id="gd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".5" stop-color="#f5b921"/><stop offset="1" stop-color="#a86a00"/></linearGradient>
<linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a1a2c"/><stop offset="1" stop-color="#3d0a16"/></linearGradient>
<radialGradient id="lg"><stop offset="0" stop-color="#ffe9a0" stop-opacity=".55"/><stop offset="1" stop-color="#ffe9a0" stop-opacity="0"/></radialGradient>
<radialGradient id="vig" cx=".5" cy=".5" r=".8"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient>
<pattern id="pat" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M25 3l6 16 16 6-16 6-6 16-6-16-16-6 16-6Z" fill="none" stroke="#3fd0d0" stroke-width="1.6"/><circle cx="25" cy="25" r="4" fill="#3fd0d0"/><circle cx="0" cy="0" r="5" fill="none" stroke="#f5b921" stroke-width="1.4"/><circle cx="50" cy="0" r="5" fill="none" stroke="#f5b921" stroke-width="1.4"/><circle cx="0" cy="50" r="5" fill="none" stroke="#f5b921" stroke-width="1.4"/><circle cx="50" cy="50" r="5" fill="none" stroke="#f5b921" stroke-width="1.4"/></pattern>`,
  );
}

/** The treasury: shop background. */
export function treasury(): string {
  let s = 11;
  const r = (): number => ((s = (s * 16807) % 2147483647) / 2147483647);
  const pile = Array.from({ length: 60 }, () => {
    const x = r() * 400;
    const y = 690 + r() * 100 - Math.sin((x / 400) * Math.PI) * 50;
    return `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="15" ry="6" fill="#f5b921" stroke="#7a4a00" stroke-width="1.5"/>`;
  }).join('');
  return scene(
    `<rect width="400" height="800" fill="url(#bg)"/><rect width="400" height="800" fill="url(#pat)" opacity=".35"/>
<circle cx="200" cy="700" r="330" fill="url(#gl)"/><path d="M-10 800c60-150 360-150 420 0Z" fill="#c98a12"/>${pile}<rect width="400" height="800" fill="url(#vig)"/>`,
    `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a0f4a"/><stop offset="1" stop-color="#5a1a3a"/></linearGradient>
<radialGradient id="gl"><stop offset="0" stop-color="#ffd35c" stop-opacity=".5"/><stop offset="1" stop-color="#ffd35c" stop-opacity="0"/></radialGradient>
<radialGradient id="vig" cx=".5" cy=".5" r=".8"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient>
<pattern id="pat" width="44" height="44" patternUnits="userSpaceOnUse"><path d="M22 4l18 18-18 18L4 22Z" fill="none" stroke="#f5b921" stroke-width="1.3"/><circle cx="22" cy="22" r="3" fill="#f5b921"/></pattern>`,
  );
}
