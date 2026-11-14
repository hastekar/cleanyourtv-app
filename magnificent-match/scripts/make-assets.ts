// Renders the app icon, splash screens and store graphics from the game's own vector art into
// every size the web manifest, the Android project and the iOS project need.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { emblem } from '../src/art/ui';
import { palace } from '../src/art/backgrounds';
import { jester, sultan, vizier } from '../src/art/characters';

const { chromium } = createRequire(import.meta.url)('playwright');
const url = (svg: string): string => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const BG = 'background:radial-gradient(circle at 50% 35%,#6a2fa8,#120b3a 75%)';
const mark = (pct: number): string => `<img src="${url(emblem())}" style="width:${pct}%;height:${pct}%">`;
const center = 'height:100%;display:flex;align-items:center;justify-content:center';

const ART = {
  icon: `<div style="${center};${BG}">${mark(78)}</div>`,
  round: `<div style="${center};${BG};border-radius:50%">${mark(66)}</div>`,
  maskable: `<div style="${center};${BG}">${mark(58)}</div>`,
  foreground: `<div style="${center}">${mark(50)}</div>`,
};
const splash = (w: number, h: number): string =>
  `<div style="${center};background:url('${url(palace())}') center/cover"><img src="${url(emblem())}" style="width:${Math.round(Math.min(w, h) * 0.36)}px"></div>`;
const title = (px: number): string =>
  `<div style="font:900 ${px}px/0.95 Georgia,serif;background:linear-gradient(#fff7c9 20%,#f5b921 55%,#c97f00);-webkit-background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 4px 0 #5a2f00)">Magnificent<br>Match</div>`;

const browser = await chromium.launch();
async function render(html: string, w: number, h: number, file: string, transparent = false): Promise<void> {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.setContent(`<style>html,body{margin:0;height:100%;background:${transparent ? 'transparent' : '#120b3a'};overflow:hidden}svg{display:block}</style>${html}`);
  await page.screenshot({ path: file, omitBackground: transparent });
  await page.close();
  console.log(file, `${w}x${h}`);
}
const size = (file: string): [number, number] => {
  const d = readFileSync(file);
  return [d.readUInt32BE(16), d.readUInt32BE(20)];
};
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));

mkdirSync('public/icons', { recursive: true });
await render(ART.icon, 192, 192, 'public/icons/icon-192.png');
await render(ART.icon, 512, 512, 'public/icons/icon-512.png');
await render(ART.maskable, 512, 512, 'public/icons/icon-maskable-512.png');

mkdirSync('store/graphics', { recursive: true });
await render(ART.icon, 512, 512, 'store/graphics/play-icon-512.png');
await render(ART.icon, 1024, 1024, 'store/graphics/appstore-icon-1024.png');
const fig = (svg: string, h: number): string => `<div style="height:${h}px;aspect-ratio:200/266">${svg.replace('<svg ', '<svg style="height:100%" ')}</div>`;
await render(
  `<div style="height:100%;display:flex;align-items:flex-end;justify-content:space-between;padding:0 30px;background:url('${url(palace())}') center 62%/cover">
<div style="align-self:center;text-align:center">${title(86)}</div><div style="display:flex;align-items:flex-end">${fig(vizier('idle'), 300)}${fig(sultan('happy'), 400)}${fig(jester('idle'), 300)}</div></div>`,
  1024, 500, 'store/graphics/play-feature-1024x500.png',
);

for (const file of [...walk('android/app/src/main/res'), ...walk('ios/App/App/Assets.xcassets')].filter((f) => f.endsWith('.png'))) {
  const [w, h] = size(file);
  if (file.includes('splash')) await render(splash(w, h), w, h, file);
  else if (file.includes('foreground')) await render(ART.foreground, w, h, file, true);
  else if (file.includes('round')) await render(ART.round, w, h, file, true);
  else await render(ART.icon, w, h, file);
}
await browser.close();
