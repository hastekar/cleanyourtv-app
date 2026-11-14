// Renders the app icon, splash screens and store graphics from one SVG into every size the
// web manifest, the Android project and the iOS project need. Re-run after changing the art.
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');

const gems = (s) => `
  <g transform="translate(256 256) scale(${s})">
    <g transform="translate(-92 -70)">
      <circle r="78" fill="url(#r)" stroke="#8f0f24" stroke-width="9"/>
      <ellipse cx="-16" cy="-40" rx="52" ry="22" fill="#fff" opacity=".35" transform="rotate(-17)"/>
    </g>
    <g transform="translate(96 -62)">
      <rect x="-68" y="-68" width="136" height="136" rx="26" fill="url(#b)" stroke="#124a9c" stroke-width="9"/>
      <ellipse cx="-10" cy="-40" rx="46" ry="18" fill="#fff" opacity=".35" transform="rotate(-12)"/>
    </g>
    <g transform="translate(0 92)">
      <path d="M0-84 84 0 0 84-84 0Z" fill="url(#y)" stroke="#a87400" stroke-width="9" stroke-linejoin="round"/>
      <path d="M0-66-56-8 0-30 30-36Z" fill="#fff" opacity=".4"/>
    </g>
  </g>`;
const defs = `<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c3580"/><stop offset="1" stop-color="#101433"/></linearGradient>
  <linearGradient id="r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6b7a"/><stop offset="1" stop-color="#c8162f"/></linearGradient>
  <linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cc4ff"/><stop offset="1" stop-color="#1c6fd6"/></linearGradient>
  <linearGradient id="y" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe98a"/><stop offset="1" stop-color="#e0a800"/></linearGradient>
</defs>`;
const svg = (body, bg = true, radius = 0) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">${defs}${bg ? `<rect width="512" height="512" rx="${radius}" fill="url(#bg)"/>` : ''}${body}</svg>`;

const ART = {
  icon: svg(gems(1.05)),
  round: svg(`<circle cx="256" cy="256" r="256" fill="url(#bg)"/>${gems(0.86)}`, false),
  maskable: svg(gems(0.78)),
  foreground: svg(gems(0.6), false),
};

const browser = await chromium.launch();
async function render(html, w, h, file, transparent = false) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.setContent(`<style>html,body{margin:0;height:100%;background:${transparent ? 'transparent' : '#101433'};overflow:hidden}</style>${html}`);
  await page.screenshot({ path: file, omitBackground: transparent });
  await page.close();
  console.log(file, `${w}x${h}`);
}
const splash = (w, h) => {
  const s = Math.round(Math.min(w, h) * 0.34);
  return `<div style="height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(170deg,#232a63,#101433 70%)"><div style="width:${s}px;height:${s}px">${svg(gems(1.05), false)}</div></div>`;
};
const size = (file) => {
  const d = readFileSync(file);
  return [d.readUInt32BE(16), d.readUInt32BE(20)];
};
const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));

// Web
mkdirSync('public/icons', { recursive: true });
await render(ART.icon, 192, 192, 'public/icons/icon-192.png');
await render(ART.icon, 512, 512, 'public/icons/icon-512.png');
await render(ART.maskable, 512, 512, 'public/icons/icon-maskable-512.png');

// Stores
mkdirSync('store/graphics', { recursive: true });
await render(ART.icon, 512, 512, 'store/graphics/play-icon-512.png');
await render(ART.icon, 1024, 1024, 'store/graphics/appstore-icon-1024.png');
await render(
  `<div style="height:100%;display:flex;align-items:center;gap:40px;padding-left:70px;background:linear-gradient(120deg,#2c3580,#101433);font:800 76px system-ui,sans-serif;color:#f4f6ff"><div style="width:300px;height:300px">${svg(gems(1.05), false)}</div><div>Lumo <span style="color:#ffd23f">Match</span><div style="font:500 30px system-ui,sans-serif;color:#aab3e6;margin-top:10px">Every level proven winnable. No ads. No purchases.</div></div></div>`,
  1024, 500, 'store/graphics/play-feature-1024x500.png',
);

// Android and iOS: overwrite each placeholder at its own size.
for (const file of [...walk('android/app/src/main/res'), ...walk('ios/App/App/Assets.xcassets')].filter((f) => f.endsWith('.png'))) {
  const [w, h] = size(file);
  if (file.includes('splash')) await render(splash(w, h), w, h, file);
  else if (file.includes('foreground')) await render(ART.foreground, w, h, file, true);
  else if (file.includes('round')) await render(ART.round, w, h, file, true);
  else await render(ART.icon, w, h, file);
}
await browser.close();
