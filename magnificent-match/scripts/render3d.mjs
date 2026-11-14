// Renders the 3D scenes in art3d/ to PNG files with headless Chromium (software WebGL).
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const out = process.argv[2] || 'art-studies/3d';
mkdirSync(out, { recursive: true });
const jobs = [
  ['sultan-idle', 'scene=sultan&mood=idle', 900, 1200, true],
  ['sultan-happy', 'scene=sultan&mood=happy', 900, 1200, true],
  ['sultan-sad', 'scene=sultan&mood=sad', 900, 1200, true],
  ['sultan-turn', 'scene=sultan&mood=idle&turn=0.6', 900, 1200, true],
  ['palace', 'scene=palace', 1080, 1920, false],
  ['hall', 'scene=hall', 1080, 1920, false],
].filter((j) => !process.argv[3] || process.argv[3].split(',').some((n) => j[0].startsWith(n)));

const server = await createServer({ root: 'art3d', server: { port: 4875, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const [name, query, w, h, alpha] of jobs) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => console.log('PAGEERR', name, String(e)));
  page.on('console', (m) => m.type() === 'error' && console.log('ERR', name, m.text()));
  await page.goto(`http://localhost:4875/?${query}&w=${w}&h=${h}`);
  await page.waitForFunction(() => window.__done === true, null, { timeout: 180000 });
  await page.locator('canvas').screenshot({ path: `${out}/${name}.png`, omitBackground: alpha });
  console.log('rendered', name);
  await page.close();
}
await browser.close();
await server.close();
