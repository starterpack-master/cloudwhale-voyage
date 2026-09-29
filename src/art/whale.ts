import { C, addOutline, make, rng } from './draw';

// 위에서 내려다본 누리 (머리가 오른쪽). 좌표는 누리 등 맵의 픽셀 좌표
export const WH = { x0: 76, x1: 724, cy: 244, hw: 120 };

// 꼬리자루는 가늘게, 가장 넓은 곳은 55% 지점, 머리는 둥글고 뭉툭하게
export function halfWidth(x: number): number {
  const t = (x - WH.x0) / (WH.x1 - WH.x0);
  if (t <= 0 || t >= 1) return 0;
  if (t < 0.55) {
    const s = t / 0.55;
    return WH.hw * (0.13 + 0.87 * Math.pow(s * s * (3 - 2 * s), 0.8));
  }
  return WH.hw * Math.pow(1 - Math.pow((t - 0.55) / 0.45, 2.4), 0.5);
}

// 등 한가운데서 얼마나 떨어졌나 (0 = 등줄기, 1 = 가장자리)
export function sideRatio(x: number, y: number): number {
  const hw = halfWidth(x);
  return hw <= 0 ? 9 : Math.abs(y - WH.cy) / hw;
}

const hexRgb = (h: string) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const BAYER = [0, 2, 3, 1];

export function whaleBody(w: number, h: number, ox = 0, oy = 0): HTMLCanvasElement {
  const cv = make(w, h, () => undefined);
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const bands = [C.whale[1], C.whale[2], C.whale[3], C.lav[2], C.lav[3]].map(hexRgb);
  const edges = [0.34, 0.6, 0.8, 0.93];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const r = sideRatio(x + ox, y + oy);
    if (r > 1) continue;
    let b = 0;
    while (b < edges.length && r > edges[b]) b++;
    // 띠 경계는 2×2 디더로 부드럽게
    if (b < edges.length && edges[b] - r < 0.035 && BAYER[(x & 1) + (y & 1) * 2] < 2) b++;
    const [cr, cg, cb] = bands[Math.min(b, bands.length - 1)];
    const i = (y * w + x) * 4;
    d[i] = cr; d[i + 1] = cg; d[i + 2] = cb; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  // 등의 점무늬 + 머리 쪽 별 주근깨
  const R = rng(5);
  ctx.fillStyle = C.whale[0];
  for (let i = 0; i < 70; i++) {
    const x = WH.x0 + 60 + R() * 520, s = (R() < 0.5 ? -1 : 1) * (0.45 + R() * 0.35);
    const y = WH.cy + s * halfWidth(x);
    const px = Math.round(x - ox), py = Math.round(y - oy);
    ctx.fillRect(px, py, 2, 2);
    if (R() < 0.4) ctx.fillRect(px + 2, py + 1, 1, 1);
  }
  ctx.fillStyle = C.butter[1];
  for (const s of [-1, 1]) for (const [dx, k] of [[610, 0.62], [626, 0.72], [640, 0.58]]) {
    const px = Math.round(dx - ox), py = Math.round(WH.cy + s * k * halfWidth(dx) - oy);
    ctx.fillRect(px - 1, py, 3, 1);
    ctx.fillRect(px, py - 1, 1, 3);
  }
  addOutline(cv, C.ink);
  return cv;
}

// 가슴지느러미 (44×20): 원점은 몸에 붙는 쪽
export function fin(): HTMLCanvasElement {
  return make(46, 22, (g) => {
    for (let x = 0; x < 44; x++) {
      const t = x / 44;
      const hw = 9 * Math.sin(Math.PI * Math.pow(1 - t, 0.7)) * (0.35 + 0.65 * (1 - t));
      const cy = 11 - t * 3;
      g.r(x, cy - hw, 1, hw * 2, t < 0.5 ? C.lav[2] : C.lav[3]);
      g.r(x, cy - hw, 1, Math.max(1, hw * 0.6), t < 0.55 ? C.lav[1] : C.lav[2]);
    }
  }, C.ink);
}

// 꼬리지느러미 (64×118): 오른쪽이 몸에 붙는 쪽
export function fluke(): HTMLCanvasElement {
  return make(66, 120, (g) => {
    for (let y = 0; y < 118; y++) {
      const v = Math.abs(y - 59) / 59;
      if (v > 0.98) continue;
      const len = 58 * Math.pow(v, 0.8) * (1 - Math.pow(v, 6)) + 10;
      const notch = v < 0.12 ? (0.12 - v) * 90 : 0;
      const x0 = 64 - len + notch;
      g.r(x0, y, 64 - x0, 1, C.lav[2]);
      g.r(x0, y, Math.max(1, (64 - x0) * 0.35), 1, v > 0.5 ? C.lav[3] : C.lav[1]);
      g.r(58, y, 6, 1, C.whale[3]);
    }
  }, C.ink);
}

export function eye(closed: boolean): HTMLCanvasElement {
  return make(10, 9, (g) => {
    if (closed) { g.r(2, 5, 6, 1, C.ink); g.p(1, 4, C.ink); g.p(8, 4, C.ink); return; }
    g.e(5, 4.5, 3.5, 4, C.ink);
    g.r(3, 2, 2, 2, C.white);
    g.p(6, 6, C.white);
  });
}

// 누리 둘레의 구름 물보라 (두 프레임을 번갈아 보여 줌)
export function foam(w: number, h: number, seed: number): HTMLCanvasElement {
  const R = rng(seed);
  return make(w, h, (g) => {
    for (let x = WH.x0 - 6; x < WH.x1 + 6; x++) {
      const hw = halfWidth(Math.min(Math.max(x, WH.x0 + 1), WH.x1 - 1));
      for (const s of [-1, 1]) {
        for (let k = 1; k < 6; k++) {
          if (R() < 0.34 - k * 0.05) g.p(x, WH.cy + s * (hw + k + 1), k < 3 ? C.white : C.cloud[1]);
        }
      }
    }
  });
}
