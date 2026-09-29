import { C, make, rng } from './draw';

const SHADOW = 'rgba(59,47,92,0.2)';

// 나무 (32×40): 둥근 수관에 왼쪽 위에서 빛
export function tree(kind: 'green' | 'blossom', seed: number): HTMLCanvasElement {
  const ramp = kind === 'blossom' ? [C.white, C.pink[0], C.pink[1], C.pink[2], C.pink[3]] : C.grass.slice(1);
  return make(32, 42, (g) => {
    g.e(16, 39, 11, 3, SHADOW);
    g.r(13, 25, 6, 14, C.wood[3]);
    g.r(13, 25, 2, 14, C.wood[2]);
    g.r(18, 25, 1, 14, C.wood[4]);
    g.r(11, 37, 3, 2, C.wood[4]);
    g.r(18, 37, 3, 2, C.wood[4]);
    const blobs: [number, number, number, number][] = [[16, 16, 13, 11], [8, 20, 7, 6], [24, 20, 7, 6], [16, 8, 9, 7]];
    for (const [x, y, rx, ry] of blobs) g.e(x, y, rx, ry, ramp[3]);
    for (const [x, y, rx, ry] of blobs) g.e(x - 1, y - 1, rx - 1.5, ry - 1.5, ramp[2]);
    for (const [x, y, rx, ry] of blobs) g.e(x - 2.5, y - 2.5, rx * 0.5, ry * 0.5, ramp[1]);
    const R = rng(seed);
    for (let i = 0; i < 46; i++) {
      const a = R() * Math.PI * 2, d = Math.sqrt(R());
      const x = 16 + Math.cos(a) * d * 12, y = 15 + Math.sin(a) * d * 10;
      g.p(x, y, R() < 0.5 ? ramp[3] : ramp[1]);
      if (R() < 0.3) g.p(x + 1, y, ramp[3]);
    }
    if (kind === 'blossom') for (let i = 0; i < 10; i++) g.p(6 + R() * 20, 6 + R() * 18, C.white);
    else for (let i = 0; i < 4; i++) { const x = 8 + R() * 16, y = 10 + R() * 12; g.p(x, y, C.pink[2]); g.p(x + 1, y, C.pink[1]); }
  }, C.ink);
}

export function bush(seed: number): HTMLCanvasElement {
  return make(18, 14, (g) => {
    g.e(9, 12, 8, 2, SHADOW);
    g.e(9, 8, 8, 5, C.grass[4]);
    g.e(8, 7, 6.5, 4, C.grass[3]);
    g.e(7, 5.5, 3.5, 2, C.grass[2]);
    const R = rng(seed);
    for (let i = 0; i < 3; i++) g.p(4 + R() * 10, 5 + R() * 5, R() < 0.5 ? C.pink[1] : C.white);
  }, C.ink);
}

export function rock(): HTMLCanvasElement {
  return make(16, 12, (g) => {
    g.e(8, 10, 7, 2, SHADOW);
    g.e(8, 7, 7, 4, C.stone[3]);
    g.e(7, 6, 5.5, 3, C.stone[2]);
    g.r(4, 4, 4, 1, C.stone[1]);
  }, C.ink);
}

// 바닥 장식 꽃 (8×8, 외곽선 없음)
export function flower(color: string): HTMLCanvasElement {
  return make(8, 8, (g) => {
    g.p(3, 5, C.grass[4]); g.p(3, 6, C.grass[4]); g.p(4, 6, C.grass[3]);
    g.p(3, 2, color); g.p(2, 3, color); g.p(4, 3, color); g.p(3, 4, color); g.p(3, 3, C.butter[1]);
  });
}

// 작은 오두막 (48×48)
export function hut(roofRamp = C.roof, wall = C.cream): HTMLCanvasElement {
  return make(48, 50, (g) => {
    g.e(24, 46, 22, 3, SHADOW);
    g.r(6, 22, 36, 23, wall[1]);
    for (let x = 9; x < 42; x += 5) g.r(x, 24, 1, 21, wall[2]);
    g.r(6, 22, 36, 2, wall[3]);
    g.r(6, 43, 36, 2, wall[2]);
    // 창문 + 꽃상자
    g.r(10, 27, 12, 10, C.wood[3]);
    g.r(11, 28, 10, 8, C.butter[1]);
    g.r(11, 28, 10, 2, C.butter[0]);
    g.r(15, 28, 2, 8, C.wood[3]);
    g.r(11, 31, 10, 1, C.wood[3]);
    g.r(9, 37, 14, 3, C.wood[2]);
    for (let x = 10; x < 22; x += 3) { g.p(x, 36, C.pink[2]); g.p(x + 1, 36, C.grass[3]); }
    // 문
    g.r(27, 29, 10, 16, C.wood[3]);
    g.r(28, 30, 8, 15, C.lav[2]);
    g.r(28, 30, 8, 1, C.lav[1]);
    g.r(31, 30, 1, 15, C.lav[3]);
    g.p(34, 38, C.butter[2]);
    // 지붕 (위 능선 → 처마로 넓어짐, 비늘 기와)
    for (let y = 4; y < 24; y++) {
      const t = (y - 4) / 19;
      const x0 = Math.round(12 - t * 11), x1 = Math.round(36 + t * 11);
      const row = (y - 4) % 4;
      g.r(x0, y, x1 - x0, 1, row === 3 ? roofRamp[3] : t < 0.35 ? roofRamp[1] : roofRamp[2]);
      if (row === 2) for (let x = x0 + ((y >> 2) % 2) * 2; x < x1; x += 4) g.p(x, y, roofRamp[3]);
      if (row === 0) g.r(x0, y, 3, 1, roofRamp[0]);
    }
    g.r(11, 3, 26, 2, roofRamp[3]);
    g.r(12, 3, 24, 1, roofRamp[2]);
    g.r(31, 0, 6, 9, C.stone[2]);
    g.r(31, 0, 2, 9, C.stone[1]);
    g.r(30, 0, 8, 2, C.stone[3]);
  }, C.ink);
}

// 등대 (32×84): 크림·분홍 줄무늬 탑, 빛나는 등실
export function lighthouse(): HTMLCanvasElement {
  return make(32, 86, (g) => {
    g.e(16, 82, 14, 3, SHADOW);
    g.e(16, 78, 14, 5, C.stone[3]);
    g.e(15, 77, 12, 4, C.stone[2]);
    for (let y = 22; y < 76; y++) {
      const t = (y - 22) / 54;
      const hw = 5 + t * 3.5;
      const band = Math.floor((y - 22) / 9) % 2;
      const base = band ? C.pink[1] : C.cream[1];
      const dark = band ? C.pink[2] : C.cream[2];
      g.r(16 - hw, y, hw * 2, 1, base);
      g.r(16 + hw - 3, y, 3, 1, dark);
      g.p(16 - hw + 1, y, band ? C.pink[0] : C.white);
    }
    g.r(13, 64, 6, 12, C.lav[3]);
    g.r(14, 65, 4, 11, C.lav[2]);
    g.r(12, 44, 4, 5, C.wood[3]);
    g.r(13, 45, 2, 3, C.butter[1]);
    g.r(8, 18, 16, 4, C.lav[3]);
    g.r(7, 20, 18, 2, C.lav[4]);
    g.r(10, 8, 12, 10, C.butter[1]);
    g.r(11, 9, 3, 8, C.butter[0]);
    g.r(15, 8, 1, 10, C.lav[3]);
    g.r(19, 8, 1, 10, C.lav[3]);
    g.e(16, 6, 7, 4, C.lav[2]);
    g.e(15, 5, 5, 2.5, C.lav[1]);
    g.r(15, 0, 2, 3, C.lav[3]);
  }, C.ink);
}

// 마르의 노점 (48×40): 줄무늬 차양
export function stall(): HTMLCanvasElement {
  return make(48, 42, (g) => {
    g.e(24, 39, 22, 3, SHADOW);
    g.r(6, 12, 3, 26, C.wood[3]);
    g.r(39, 12, 3, 26, C.wood[3]);
    g.r(4, 26, 40, 12, C.wood[2]);
    g.r(4, 26, 40, 2, C.wood[1]);
    for (let x = 6; x < 44; x += 8) g.r(x, 29, 1, 9, C.wood[3]);
    const goods = [C.pink[2], C.butter[2], C.mint[2], C.lav[2], C.pink[1]];
    goods.forEach((c, i) => { g.e(10 + i * 7, 24, 3, 2.5, c); g.p(9 + i * 7, 23, C.white); });
    for (let x = 2; x < 46; x++) {
      const stripe = Math.floor((x - 2) / 6) % 2;
      g.r(x, 4, 1, 10, stripe ? C.pink[1] : C.cream[0]);
      g.r(x, 4, 1, 1, stripe ? C.pink[2] : C.cream[2]);
      const sc = (x - 2) % 6;
      g.r(x, 14, 1, sc === 0 || sc === 5 ? 1 : 2, stripe ? C.pink[2] : C.cream[2]);
    }
    g.r(2, 2, 44, 2, C.pink[3]);
  }, C.ink);
}

export function lamp(): HTMLCanvasElement {
  return make(10, 28, (g) => {
    g.e(5, 26, 4, 1.5, SHADOW);
    g.r(4, 9, 2, 17, C.lav[4]);
    g.r(3, 24, 4, 2, C.lav[4]);
    g.r(2, 3, 6, 6, C.butter[1]);
    g.r(3, 4, 2, 4, C.butter[0]);
    g.r(1, 1, 8, 2, C.ink);
    g.r(2, 9, 6, 1, C.lav[4]);
  }, C.ink);
}

export function bench(): HTMLCanvasElement {
  return make(30, 18, (g) => {
    g.e(15, 16, 13, 2, SHADOW);
    g.r(2, 2, 26, 3, C.wood[1]);
    g.r(2, 5, 26, 1, C.wood[3]);
    g.r(2, 8, 26, 4, C.wood[1]);
    g.r(2, 8, 26, 1, C.wood[0]);
    g.r(2, 11, 26, 1, C.wood[3]);
    for (const x of [4, 24]) { g.r(x, 5, 2, 3, C.wood[3]); g.r(x, 12, 2, 4, C.wood[3]); }
  }, C.ink);
}

export function fence(): HTMLCanvasElement {
  return make(16, 16, (g) => {
    for (const x of [1, 12]) { g.r(x, 3, 3, 12, C.cream[1]); g.r(x, 3, 1, 12, C.white); g.r(x, 2, 3, 1, C.cream[2]); }
    g.r(0, 6, 16, 2, C.cream[2]);
    g.r(0, 11, 16, 2, C.cream[2]);
  }, C.ink);
}

export function crate(): HTMLCanvasElement {
  return make(16, 16, (g) => {
    g.r(1, 3, 14, 12, C.wood[2]);
    g.r(1, 3, 14, 2, C.wood[1]);
    g.r(1, 13, 14, 2, C.wood[3]);
    g.r(3, 5, 1, 8, C.wood[3]);
    g.r(12, 5, 1, 8, C.wood[3]);
    g.r(4, 8, 8, 1, C.wood[3]);
  }, C.ink);
}

export function barrel(): HTMLCanvasElement {
  return make(12, 16, (g) => {
    g.e(6, 9, 5, 6.5, C.wood[2]);
    g.r(2, 4, 3, 10, C.wood[1]);
    g.r(1, 5, 10, 1, C.lav[3]);
    g.r(1, 12, 10, 1, C.lav[3]);
    g.e(6, 3, 4, 1.5, C.wood[3]);
  }, C.ink);
}

export function pot(): HTMLCanvasElement {
  return make(14, 16, (g) => {
    g.r(3, 9, 8, 6, C.soil[2]);
    g.r(3, 9, 2, 6, C.soil[1]);
    g.r(2, 8, 10, 2, C.soil[3]);
    g.e(7, 6, 5, 3.5, C.grass[3]);
    g.e(6, 5, 3, 2, C.grass[2]);
    g.p(4, 3, C.pink[2]); g.p(9, 4, C.butter[2]); g.p(7, 2, C.pink[1]);
  }, C.ink);
}

export function sign(): HTMLCanvasElement {
  return make(18, 20, (g) => {
    g.r(8, 9, 2, 10, C.wood[3]);
    g.r(1, 2, 16, 8, C.wood[1]);
    g.r(1, 8, 16, 2, C.wood[2]);
    g.r(4, 4, 7, 1, C.wood[3]);
    g.r(4, 6, 10, 1, C.wood[3]);
  }, C.ink);
}

// 별딸기 성장 단계 (16×16): 0 씨앗, 1 새싹, 2 잎, 3 꽃, 4 열매
export function crop(stage: number): HTMLCanvasElement {
  return make(16, 16, (g) => {
    const L = C.grass[3], D = C.grass[4], H = C.grass[2];
    if (stage === 0) { g.r(6, 10, 4, 2, C.soil[3]); g.p(7, 10, C.butter[3]); g.p(8, 11, C.butter[3]); return; }
    if (stage >= 1) { g.r(7, 8, 2, 5, D); g.r(5, 8, 2, 2, L); g.r(9, 7, 2, 2, H); }
    if (stage >= 2) { g.e(8, 8, 5, 3.5, L); g.e(7, 7, 3, 2, H); g.r(7, 10, 2, 3, D); }
    if (stage === 3) { g.p(5, 6, C.white); g.p(10, 5, C.white); g.p(8, 4, C.white); g.p(8, 5, C.butter[1]); }
    if (stage === 4) {
      for (const [x, y] of [[5, 7], [10, 6], [8, 9]]) {
        g.r(x - 1, y - 1, 3, 3, C.pink[2]); g.p(x - 1, y - 1, C.pink[1]); g.p(x + 1, y + 1, C.pink[3]); g.p(x, y, C.butter[1]);
      }
    }
  }, stage > 0 ? C.ink : undefined);
}

export function driftwood(): HTMLCanvasElement {
  return make(18, 10, (g) => {
    g.e(9, 8, 8, 1.5, SHADOW);
    g.r(2, 3, 13, 4, C.wood[2]);
    g.r(2, 3, 13, 1, C.wood[1]);
    g.e(15, 5, 2, 2, C.wood[1]);
    g.p(15, 5, C.wood[3]);
    g.r(5, 5, 5, 1, C.wood[3]);
    g.r(9, 1, 1, 2, C.wood[3]);
  }, C.ink);
}

export function arrow(): HTMLCanvasElement {
  return make(11, 11, (g) => {
    g.r(3, 0, 5, 5, C.butter[2]);
    g.r(3, 0, 2, 5, C.butter[1]);
    for (let y = 5; y < 10; y++) g.r(y - 4, y, 11 - (y - 4) * 2, 1, y < 7 ? C.butter[2] : C.butter[3]);
  }, C.ink);
}

export function sparkle(color: string = C.white): HTMLCanvasElement {
  return make(5, 5, (g) => { g.r(2, 0, 1, 5, color); g.r(0, 2, 5, 1, color); g.p(2, 2, C.butter[0]); });
}

// 바다 위를 흘러가는 뭉게구름 (48×22)
export function puff(seed: number): HTMLCanvasElement {
  const R = rng(seed);
  return make(48, 22, (g) => {
    const parts = [[12, 13, 10, 7], [24, 10, 12, 9], [36, 13, 10, 7]].map(([x, y, rx, ry]) => [x + R() * 2, y, rx, ry]);
    for (const [x, y, rx, ry] of parts) g.e(x, y, rx, ry, C.cloud[3]);
    for (const [x, y, rx, ry] of parts) g.e(x - 1, y - 2, rx - 1, ry - 1.5, C.cloud[0]);
    for (const [x, y, rx] of parts) g.r(x - rx * 0.4, y - 5, rx * 0.5, 1, C.white);
  }, C.cloud[4]);
}
