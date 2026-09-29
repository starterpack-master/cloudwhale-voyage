// 앱 아이콘(PNG) 생성: 32×32 도트 그림을 정수 배율로 키워 저장
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const N = 32;
const px = new Uint8Array(N * N * 4);
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const set = (x, y, c) => { if (x < 0 || y < 0 || x >= N || y >= N) return; px.set([...hex(c), 255], (y * N + x) * 4); };
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const t = y / N;
  const a = hex('#CFE8FF'), b = hex('#FFE6EE');
  px.set([0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)).concat(255), (y * N + x) * 4);
}
for (const [x, y] of [[5, 5], [26, 7], [9, 26]]) set(x, y, '#FFFFFF');
const cx = 17, cy = 19, rx = 11, ry = 7.2;
const inside = (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
const tail = (x, y) => x >= 2 && x <= 7 && Math.abs(y - (15 - (7 - x) * 0.2)) <= (7 - x) * 0.7 + 0.5;
const body = (x, y) => inside(x, y) || tail(x, y) || (x >= 6 && x <= 8 && Math.abs(y - 18) <= 1);
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  if (!body(x, y)) continue;
  const edge = !body(x + 1, y) || !body(x - 1, y) || !body(x, y + 1) || !body(x, y - 1);
  const ny = (y - cy) / ry;
  set(x, y, edge ? '#5E4F96' : ny > 0.35 ? '#FFF6E5' : ny < -0.3 ? '#A8DAFF' : '#CDB8F0');
}
set(23, 18, '#3E3470'); set(23, 19, '#3E3470'); set(24, 18, '#3E3470'); set(24, 19, '#3E3470'); set(23, 18, '#FFFFFF');
set(21, 21, '#FFB9C8'); set(22, 21, '#FFB9C8');
for (const [x, y] of [[19, 10], [18, 9], [20, 9], [19, 8], [17, 7], [21, 7], [19, 6]]) set(x, y, '#FFFFFF');
set(18, 12, '#9FD8B4'); set(17, 11, '#9FD8B4'); set(19, 11, '#9FD8B4');

const table = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = table[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};
function png(size) {
  const s = size / N;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (Math.floor(y / s) * N + Math.floor(x / s)) * 4;
    raw.set(px.subarray(i, i + 4), y * (size * 4 + 1) + 1 + x * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
mkdirSync('public/icons', { recursive: true });
for (const size of [192, 512]) writeFileSync(`public/icons/icon-${size}.png`, png(size));
console.log('icons written');
