// 프로토타입 화면 캡처 (헤드리스 크롬, 소프트웨어 WebGL)
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

// dist/ 를 잠깐 띄우는 정적 서버 (캡처가 끝나면 함께 종료)
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
const server = createServer((req, res) => {
  let p = normalize(decodeURIComponent((req.url ?? '/').split('?')[0])).replace(/^([.][.][/\\])+/, '');
  let file = join('dist', p);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join('dist', 'index.html');
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(4173, '127.0.0.1', r));

const OUT = process.env.OUT ?? '/projects/sandbox/.kiro/artifacts/screenshots';
const URL = process.env.URL ?? 'http://127.0.0.1:4173/';
const only = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

async function session(tag, viewport, run) {
  if (only.length && !only.includes(tag)) return;
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2, hasTouch: true });
  page.on('pageerror', (e) => console.log(tag, 'PAGEERROR', e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(tag, m.type(), m.text()); });
  await page.goto(URL);
  await page.waitForTimeout(3000);
  const shot = async (name) => { await page.screenshot({ path: `${OUT}/${tag}-${name}.png` }); console.log('saved', `${tag}-${name}.png`); };
  await run(page, shot);
  await page.close();
}

const flow = async (page, shot) => {
  await shot('1-title');
  await page.click('.start', { force: true });
  await page.waitForTimeout(1500);
  await shot('2-journal');
  await page.click('.modal .big', { force: true });
  await page.waitForTimeout(2500);
  await shot('3-main');
  await page.click('[data-act="care"]', { force: true });
  await page.waitForTimeout(1500);
  const box = await page.locator('.care-cv').boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.35);
    await page.mouse.down();
    for (let k = 0; k < 14; k++) await page.mouse.move(box.x + box.width * (0.42 + (k % 2) * 0.06), box.y + box.height * (0.33 + (k % 3) * 0.02), { steps: 3 });
    await page.mouse.up();
  }
  await page.waitForTimeout(600);
  await shot('4-care');
  await page.click('.care-done', { force: true });
  await page.waitForTimeout(500);
  console.log('care overlay after done:', await page.evaluate(() => !!document.querySelector('.care')));
  await page.waitForTimeout(800);
  await page.click('[data-act="build"]', { force: true });
  await page.waitForTimeout(1200);
  await shot('5-build');
  await page.click('.buildbar .mini.main', { force: true });
  await page.waitForTimeout(600);
  await page.click('[data-act="settings"]', { force: true });
  await page.waitForTimeout(600);
  await page.click('.seg button:nth-child(5)', { force: true });
  await page.waitForTimeout(600);
  await shot('6-settings-night');
  await page.click('.sheet-x', { force: true });
  await page.waitForTimeout(1500);
  await shot('7-night');
};

await session('landscape', { width: 915, height: 412 }, flow);
await session('portrait', { width: 390, height: 844 }, flow);
await browser.close();
server.close();
