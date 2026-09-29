// 도트 그리기 도구 + 팔레트 (밝은 파스텔, 어두운 톤은 자두빛)
export const C = {
  ink: '#3b2f5c', line: '#5e4f96', white: '#ffffff',
  cloud: ['#ffffff', '#f4f2ff', '#e4e1fb', '#cfcbf2', '#b7b3e6'],
  whale: ['#e6f6ff', '#c6e8ff', '#a6d6fb', '#86bdf0', '#6c9fdd', '#5a85c9'],
  lav: ['#ece2fc', '#d6c6f5', '#bba6e8', '#9c86d4', '#8069bd'],
  cream: ['#fffaf0', '#fff0da', '#f1dcc0', '#dcc2a2'],
  grass: ['#e4f7c6', '#c6ecaa', '#a3da8e', '#82c47a', '#63a86b', '#4b8a5d'],
  soil: ['#f2cdb0', '#dea88a', '#c1856c', '#9a6453', '#724847'],
  wood: ['#f6dfb8', '#e5bd8f', '#c9966b', '#a0704f', '#74503e'],
  stone: ['#f8f4ec', '#e7ddd0', '#cbbdad', '#a39585', '#7d7068'],
  roof: ['#ffd9e6', '#fdb5ce', '#f190b2', '#d06f93', '#a35479'],
  butter: ['#fffbdc', '#fff2a8', '#ffdc72', '#f2bd52'],
  mint: ['#e2fff3', '#bff3dc', '#93dfc0', '#6fc4a4'],
  pink: ['#ffe8f1', '#ffcce0', '#ffa6c8', '#ec7fa6'],
  skin: ['#fff2e8', '#ffdfca', '#f6bea1', '#dc957d'],
  hair: ['#cb95a1', '#a8707f', '#825066', '#5c354d'],
};

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Pix {
  constructor(readonly ctx: CanvasRenderingContext2D, readonly w: number, readonly h: number) {}
  p(x: number, y: number, c: string): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.ctx.fillStyle = c;
    this.ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
  }
  r(x: number, y: number, w: number, h: number, c: string): void {
    this.ctx.fillStyle = c;
    this.ctx.fillRect(Math.floor(x), Math.floor(y), Math.round(w), Math.round(h));
  }
  // 픽셀 단위로 정확한 타원
  e(cx: number, cy: number, rx: number, ry: number, c: string): void {
    for (let y = Math.ceil(cy - ry); y <= cy + ry; y++) {
      const t = (y + 0.5 - cy) / ry;
      if (Math.abs(t) > 1) continue;
      const hw = rx * Math.sqrt(1 - t * t);
      this.r(Math.round(cx - hw), y, Math.round(cx + hw) - Math.round(cx - hw), 1, c);
    }
  }
  map(rows: string[], pal: Record<string, string>, ox = 0, oy = 0, flip = false): void {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const c = pal[row[x]];
        if (c) this.p(ox + (flip ? row.length - 1 - x : x), oy + y, c);
      }
    });
  }
}

// 캔버스를 만들어 그리고, 필요하면 바깥쪽 1px 외곽선을 자동으로 두른다
export function make(w: number, h: number, draw: (g: Pix) => void, outline?: string): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  draw(new Pix(ctx, w, h));
  if (outline) addOutline(cv, outline);
  return cv;
}

export function addOutline(cv: HTMLCanvasElement, color: string): void {
  const ctx = cv.getContext('2d')!;
  const { width: w, height: h } = cv;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const n = parseInt(color.slice(1), 16);
  const a = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) a[i] = d[i * 4 + 3] > 100 ? 1 : 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (a[y * w + x]) continue;
    if ((x > 0 && a[y * w + x - 1]) || (x < w - 1 && a[y * w + x + 1]) || (y > 0 && a[(y - 1) * w + x]) || (y < h - 1 && a[(y + 1) * w + x])) {
      d.set([(n >> 16) & 255, (n >> 8) & 255, n & 255, 255], (y * w + x) * 4);
    }
  }
  ctx.putImageData(img, 0, 0);
}
