import { C, make, rng, type Pix } from './draw';

export const T = 16; // 타일 크기

// 구름바다 (128×128, 이음매 없이 반복되는 뭉게 무늬)
export function seaTexture(): HTMLCanvasElement {
  return make(128, 128, (g) => {
    g.r(0, 0, 128, 128, C.cloud[2]);
    const R = rng(11);
    const bumps = Array.from({ length: 30 }, () => {
      const rx = 5 + R() * 13;
      return [R() * 128, R() * 128, rx, rx * 0.5] as const;
    });
    const wrap = (f: (ox: number, oy: number) => void) => { for (const ox of [-128, 0, 128]) for (const oy of [-128, 0, 128]) f(ox, oy); };
    for (const [x, y, rx, ry] of bumps) wrap((ox, oy) => g.e(x + ox, y + oy + 2, rx, ry, C.cloud[3]));
    for (const [x, y, rx, ry] of bumps) wrap((ox, oy) => g.e(x + ox, y + oy, rx * 0.94, ry * 0.9, C.cloud[1]));
    for (const [x, y, rx, ry] of bumps) wrap((ox, oy) => g.e(x + ox - rx * 0.2, y + oy - ry * 0.3, rx * 0.5, ry * 0.4, C.white));
    for (let i = 0; i < 14; i++) g.p(R() * 128, R() * 128, C.white);
  });
}

export function grassTile(g: Pix, x0: number, y0: number, seed: number, ramp = C.grass): void {
  g.r(x0, y0, T, T, ramp[2]);
  const R = rng(seed);
  for (let i = 0; i < 6; i++) { const x = x0 + Math.floor(R() * 15), y = y0 + Math.floor(R() * 15); g.p(x, y, ramp[3]); g.p(x + 1, y, ramp[3]); }
  for (let i = 0; i < 4; i++) {
    const x = x0 + Math.floor(R() * 13), y = y0 + 1 + Math.floor(R() * 13);
    g.p(x, y + 1, ramp[1]); g.p(x + 1, y, ramp[1]); g.p(x + 2, y + 1, ramp[1]);
  }
  if (R() < 0.14) { const x = x0 + 3 + Math.floor(R() * 10), y = y0 + 3 + Math.floor(R() * 10); const c = R() < 0.5 ? C.pink[1] : C.white; g.p(x, y, c); g.p(x + 1, y, c); g.p(x, y - 1, C.butter[1]); }
}

export function plankTile(g: Pix, x0: number, y0: number, seed: number): void {
  for (let row = 0; row < 4; row++) {
    const y = y0 + row * 4;
    g.r(x0, y, T, 4, (row + seed) % 3 === 0 ? C.wood[1] : C.wood[1]);
    g.r(x0, y, T, 1, C.wood[0]);
    g.r(x0, y + 3, T, 1, C.wood[3]);
    const cut = (seed * 7 + row * 5) % 16;
    g.r(x0 + cut, y + 1, 1, 2, C.wood[3]);
    if ((seed + row) % 2) { g.p(x0 + ((cut + 3) % 16), y + 1, C.wood[3]); g.p(x0 + ((cut + 13) % 16), y + 2, C.wood[2]); }
  }
}

// 갈아 둔 흙: 둥근 흙덩이가 줄지어 있는 고랑 (젖으면 더 진하게)
export function soilTile(g: Pix, x0: number, y0: number, wet: boolean): void {
  const base = wet ? '#8a5a4c' : '#b27a62', dark = wet ? '#6c4541' : '#8f5f50', light = wet ? '#a86e5c' : '#cf9a7e';
  g.r(x0 + 1, y0 + 1, T - 2, T - 2, base);
  for (const y of [2, 7, 12]) {
    for (let x = 2; x < T - 2; x += 4) {
      g.r(x0 + x, y0 + y, 3, 2, light);
      g.r(x0 + x, y0 + y + 2, 3, 1, dark);
    }
  }
  g.r(x0 + 1, y0 + T - 2, T - 2, 1, dark);
  g.r(x0 + T - 2, y0 + 1, 1, T - 2, dark);
  g.r(x0 + 1, y0 + 1, T - 2, 1, light);
}

export function sandTile(g: Pix, x0: number, y0: number, seed: number): void {
  g.r(x0, y0, T, T, C.cream[1]);
  const R = rng(seed);
  for (let i = 0; i < 7; i++) g.p(x0 + R() * 16, y0 + R() * 16, R() < 0.6 ? C.cream[2] : C.white);
}

// 이끼 위 징검돌
export function stoneTile(g: Pix, x0: number, y0: number, seed: number): void {
  grassTile(g, x0, y0, seed);
  const R = rng(seed + 3);
  const x = x0 + 8 + (R() - 0.5) * 3, y = y0 + 8 + (R() - 0.5) * 3;
  g.e(x, y + 1, 5.5, 4, C.stone[3]);
  g.e(x, y, 5, 3.5, C.stone[1]);
  g.e(x - 1, y - 1, 2.5, 1.5, C.stone[0]);
}
