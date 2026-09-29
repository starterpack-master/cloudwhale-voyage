// 빠른 캡처: node scripts/snap.mjs <경로> <이름> [가로] [세로] [대기ms]
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = createServer((req, res) => {
  let file = join('dist', normalize(decodeURIComponent((req.url ?? '/').split('?')[0])).replace(/^([.][.][/\\])+/, ''));
  if (!existsSync(file) || statSync(file).isDirectory()) file = join('dist', 'index.html');
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(4174, '127.0.0.1', r));
const [path = '/', name = 'snap', w = '915', h = '412', wait = '2500'] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('console', m.text()); });
await page.goto(`http://127.0.0.1:4174${path}`);
await page.waitForTimeout(+wait);
await page.screenshot({ path: `/projects/sandbox/.kiro/artifacts/screenshots/${name}.png`, fullPage: true });
console.log('saved', name);
await browser.close();
server.close();
