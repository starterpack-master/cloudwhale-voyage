// 첫날 흐름 전체를 자동으로 진행하며 화면을 캡처하는 점검 스크립트
// node scripts/play.mjs [landscape|portrait]
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
await new Promise((r) => server.listen(4175, '127.0.0.1', r));
const mode = process.argv[2] ?? 'landscape';
const vp = mode === 'portrait' ? { width: 390, height: 844 } : { width: 915, height: 412 };
const OUT = '/projects/sandbox/.kiro/artifacts/screenshots';
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 2, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const wait = (ms) => page.waitForTimeout(ms);
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4175/'; // 실서버 점검: BASE_URL=https://.../ node scripts/play.mjs
const tag = process.env.BASE_URL ? 'live-' : '';
const shot = async (n) => { await page.screenshot({ path: `${OUT}/v2-${tag}${mode}-${n}.png` }); console.log('saved', n); };
const W = (fn, arg) => page.evaluate(fn, arg);
const scene = `window.__game.scene.getScene('world')`;
const st = () => W(() => JSON.parse(localStorage.getItem('cloudwhale-v2') || '{}'));
// 대화창이 떠 있는 동안 눌러서 넘기기
async function talkThrough(max = 40, snapAt = -1, name = '') {
  for (let k = 0; k < max; k++) {
    const open = await W(() => !!document.querySelector('.dlg') && !document.querySelector('.dlg').classList.contains('hidden'));
    if (!open) return;
    if (k === snapAt) await shot(name);
    await page.click('.dlg', { force: true });
    await wait(260);
  }
}
async function until(fn, ms = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await W(fn)) return true; await wait(200); }
  console.log('TIMEOUT', fn.toString().slice(0, 80));
  return false;
}
const call = (expr) => W(new Function(`const s = ${scene}; ${expr}`));

await page.goto(BASE);
await wait(2500);
await shot('01-title');
await page.click('.start', { force: true });
await wait(900);
await talkThrough(12, 3, '02-prologue');
await wait(2200);
await talkThrough(8);
await until(() => window.__game.scene.isActive('world'), 15000);
await wait(1800);
await talkThrough(20, 1, '03-popo');
await wait(600);
await shot('04-quest-plant');
const FARM = [[16, 16], [17, 16], [18, 16]];
for (const [i, j] of FARM) {
  await call(`s.tap(${i * 16 + 8}, ${j * 16 + 8})`);
  await until(new Function(`return !!JSON.parse(localStorage.getItem('cloudwhale-v2')).crops['${i},${j}']`), 8000);
  await wait(300);
}
await talkThrough();
for (const [i, j] of FARM) {
  await call(`s.tap(${i * 16 + 8}, ${j * 16 + 8})`);
  await until(new Function(`return !!JSON.parse(localStorage.getItem('cloudwhale-v2')).crops['${i},${j}']?.watered`), 8000);
  await wait(300);
}
await shot('05-watered');
await talkThrough();
await call(`s.tap(${724 - 58}, 244)`);
await until(() => !!document.querySelector('.care'), 12000);
await wait(900);
const box = await page.locator('.care-cv').boundingBox();
if (box) {
  for (let y = 0.12; y < 0.68; y += 0.03) {
    await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * y);
    await page.mouse.down();
    for (const [a, b] of [[0.15, 0.85], [0.85, 0.15]]) for (let t = 0; t <= 1; t += 0.035) await page.mouse.move(box.x + box.width * (a + (b - a) * t), box.y + box.height * y, { steps: 2 });
    await page.mouse.up();
  }
}
await shot('06-care');
await page.click('.care-done', { force: true });
await wait(900);
await talkThrough();
console.log('step after care', (await st()).step);
await wait(9000);
for (const [i, j] of FARM) {
  await call(`s.tap(${i * 16 + 8}, ${j * 16 + 8})`);
  await until(new Function(`return !JSON.parse(localStorage.getItem('cloudwhale-v2')).crops['${i},${j}']`), 8000);
  await wait(300);
}
await talkThrough();
await call(`s.tap(${724 - 58}, 244)`);
await until(() => !document.querySelector('.dlg').classList.contains('hidden'), 15000);
await wait(400);
await talkThrough(10, 1, '07-feed');
await wait(1500);
await shot('08-docked');
await call(`s.go('harbor', [6, 17])`);
await wait(1800);
await shot('09-harbor');
await call(`s.talk('moa')`);
await wait(500);
await talkThrough(20, 2, '10-moa-story');
for (const id of ['wood1', 'wood2', 'wood3']) { await call(`s.talk('wood', s.map.objects.find((o) => o.id === '${id}'))`); await wait(400); await talkThrough(); }
await call(`s.talk('moa')`);
await wait(400);
await talkThrough();
await call(`s.go('whale', [30, 21])`);
await wait(1800);
await call(`s.useItem('bench')`);
await wait(300);
await shot('11-place-bench');
await call(`s.tryPlace(${24 * 16 + 16}, ${17 * 16 + 8})`);
await wait(1200);
await talkThrough();
await wait(600);
await shot('12-ending');
const s = await st();
console.log('final step', s.step, 'inv', JSON.stringify(s.inv), 'placed', s.placed.length);
console.log('errors', errors.length ? errors : 'none');
await browser.close();
server.close();
