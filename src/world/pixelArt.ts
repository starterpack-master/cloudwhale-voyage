// 도트 그림 도구: 작은 캔버스에 도형을 그린 뒤 알파를 0/1로 자르고 1px 외곽선을 자동으로 두른다
export const OUTLINE = '#5E4F96';

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function pixelCanvas(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, outline: string | null = OUTLINE): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;
  draw(ctx);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 110 ? 255 : 0;
  if (outline) {
    const [r, g, b] = rgb(outline);
    const a = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) a[i] = d[i * 4 + 3];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (a[y * w + x]) continue;
      const n = (x > 0 && a[y * w + x - 1]) || (x < w - 1 && a[y * w + x + 1]) || (y > 0 && a[(y - 1) * w + x]) || (y < h - 1 && a[(y + 1) * w + x]);
      if (n) d.set([r, g, b, 255], (y * w + x) * 4);
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

export function fromMap(rows: string[], pal: Record<string, string>): HTMLCanvasElement {
  const w = Math.max(...rows.map((r) => r.length));
  return pixelCanvas(w, rows.length, (c) => {
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      const col = pal[ch];
      if (!col) return;
      c.fillStyle = col;
      c.fillRect(x, y, 1, 1);
    }));
  }, null);
}

export function mirror(src: HTMLCanvasElement): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = src.width;
  cv.height = src.height;
  const c = cv.getContext('2d')!;
  c.translate(src.width, 0);
  c.scale(-1, 1);
  c.drawImage(src, 0, 0);
  return cv;
}

// 주인공 (16×22, 두 걸음 프레임)
const CHAR_PAL: Record<string, string> = {
  o: '#4A3F7A', h: '#9B6B7E', H: '#C08FA0', P: '#FF9EC4', k: '#FFE6D8', r: '#FFB9C8', e: '#3E3470',
  t: '#CDB8F0', T: '#A996D8', u: '#FFF6E5', p: '#7E73B8', b: '#5E4F96',
};
const CHAR_TOP = [
  '.....oooooo.....', '...oohhhhhhoo...', '..ohhhHHhhhhhoo.', '.ohhhHHhhhhhhoPo', '.ohhhhhhhhhhhoPo',
  '.ohhkkkkkkkkhhoo', '.ohkkkkkkkkkkho.', '.ohkeekkkkeekho.', '.ohkeekkkkeekho.', '.ohkrkkkkkkrkho.',
  '..okkkkkekkkko..', '...ookkkkkkoo...', '....otuuuuto....', '...ottuuuutto...', '..okttuuuuttko..',
  '..okTttuuttTko..', '...oTTTTTTTTo...', '...oppppppppo...', '....oppppppo....',
];
const LEGS_A = ['.....okko.okko..', '.....obbo.obbo..', '.....oooo.oooo..'];
const LEGS_B = ['.....okkookko...', '.....obboobbo...', '.....oooooooo...'];
export function characterFrames(): HTMLCanvasElement[] {
  return [fromMap([...CHAR_TOP, ...LEGS_A], CHAR_PAL), fromMap([...CHAR_TOP, ...LEGS_B], CHAR_PAL)];
}

// UI 아이콘 (16×16 도트, 외곽선 자동)
type Draw = (c: CanvasRenderingContext2D) => void;
const circle = (c: CanvasRenderingContext2D, x: number, y: number, r: number, col: string) => {
  c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
};
const rect = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string) => {
  c.fillStyle = col; c.fillRect(x, y, w, h);
};
const poly = (c: CanvasRenderingContext2D, pts: number[], col: string) => {
  c.fillStyle = col; c.beginPath(); c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath(); c.fill();
};

const ICONS: Record<string, Draw> = {
  care: (c) => { circle(c, 5.5, 6, 3.6, '#FF9EC4'); circle(c, 10.5, 6, 3.6, '#FF9EC4'); poly(c, [2, 7, 14, 7, 8, 14], '#FF9EC4'); rect(c, 4, 4, 2, 2, '#FFFFFF'); },
  build: (c) => { poly(c, [1.5, 8, 8, 1.5, 14.5, 8], '#E8A9C4'); rect(c, 3, 8, 10, 6, '#FFF6E5'); rect(c, 9, 10, 3, 4, '#B98FAF'); rect(c, 4, 9, 3, 3, '#FFF1A8'); },
  bag: (c) => { rect(c, 5, 2, 6, 2, '#B58E6A'); rect(c, 2, 4, 12, 10, '#D9B08C'); rect(c, 2, 4, 12, 3, '#B58E6A'); rect(c, 7, 6, 2, 3, '#FFF1A8'); },
  voyage: (c) => { circle(c, 8, 8, 6.4, '#FFF6E5'); poly(c, [8, 2.5, 10, 8, 6, 8], '#FF9EC4'); poly(c, [8, 13.5, 10, 8, 6, 8], '#A8DAFF'); rect(c, 7, 7, 2, 2, '#5E4F96'); },
  friends: (c) => { circle(c, 5.5, 9, 4.2, '#A8DAFF'); circle(c, 10.5, 8, 4.2, '#FFC8DD'); rect(c, 4, 8, 1, 2, '#3E3470'); rect(c, 10, 7, 1, 2, '#3E3470'); rect(c, 12, 7, 1, 2, '#3E3470'); },
  settings: (c) => { for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; rect(c, 7 + Math.cos(a) * 5.5, 7 + Math.sin(a) * 5.5, 2, 2, '#CDB8F0'); } circle(c, 8, 8, 5, '#CDB8F0'); circle(c, 8, 8, 2, '#FFF6E5'); },
  wave: (c) => { poly(c, [8, 14, 7, 9, 2, 3, 6, 5, 8, 8, 10, 5, 14, 3, 9, 9], '#A8DAFF'); rect(c, 7, 9, 2, 5, '#A8DAFF'); },
  whale: (c) => { c.fillStyle = '#A8DAFF'; c.beginPath(); c.ellipse(9, 9, 6, 4.2, 0, 0, Math.PI * 2); c.fill(); poly(c, [3.5, 8, 0.5, 5, 1, 12], '#A8DAFF'); c.fillStyle = '#FFF6E5'; c.beginPath(); c.ellipse(10, 11.4, 4, 1.6, 0, 0, Math.PI * 2); c.fill(); rect(c, 12, 8, 1, 2, '#3E3470'); rect(c, 10, 4, 1, 2, '#9FD8B4'); },
  shell: (c) => { poly(c, [8, 14, 1.5, 6, 4, 2.5, 8, 1.5, 12, 2.5, 14.5, 6], '#FFD6B8'); rect(c, 7, 4, 1, 9, '#F2B08F'); rect(c, 4, 6, 1, 5, '#F2B08F'); rect(c, 11, 6, 1, 5, '#F2B08F'); },
  pearl: (c) => { circle(c, 8, 8.5, 5.2, '#EDE6FF'); circle(c, 9, 9.5, 3.4, '#CDB8F0'); rect(c, 5, 5, 2, 2, '#FFFFFF'); },
  berry: (c) => { circle(c, 8, 9.5, 4.8, '#FF9EC4'); poly(c, [4, 5, 8, 2, 12, 5, 8, 6.5], '#8FD1A8'); rect(c, 10, 8, 2, 2, '#FFF1A8'); rect(c, 6, 11, 1, 1, '#FFF6E5'); },
  cotton: (c) => { circle(c, 5, 9, 3.6, '#FFFFFF'); circle(c, 10.5, 9, 3.6, '#FFFFFF'); circle(c, 8, 6, 3.8, '#FFFFFF'); rect(c, 4, 11, 9, 2, '#E3DDF5'); },
  wood: (c) => { rect(c, 1.5, 5, 13, 6, '#D9B08C'); circle(c, 13, 8, 3, '#EBCBA5'); circle(c, 13, 8, 1.2, '#B58E6A'); rect(c, 3, 7, 6, 1, '#B58E6A'); },
  seed: (c) => { c.fillStyle = '#E7C9A0'; c.beginPath(); c.ellipse(8, 10, 3.4, 4, 0, 0, Math.PI * 2); c.fill(); rect(c, 7.5, 2, 1, 4, '#8FD1A8'); poly(c, [8, 4, 12, 2, 11, 5], '#8FD1A8'); },
  pot: (c) => { poly(c, [3.5, 8, 12.5, 8, 11, 14, 5, 14], '#E7A48F'); circle(c, 8, 6, 3.6, '#9FD8B4'); rect(c, 5, 3, 2, 2, '#FFC8DD'); rect(c, 9, 4, 2, 2, '#FFF1A8'); },
  lantern: (c) => { rect(c, 7, 7, 2, 8, '#8C7BB8'); rect(c, 4, 3, 8, 6, '#FFF1A8'); rect(c, 3, 2, 10, 2, '#5E4F96'); rect(c, 6, 5, 4, 2, '#FFFFFF'); },
  bench: (c) => { rect(c, 1.5, 7, 13, 3, '#D9B08C'); rect(c, 1.5, 3, 13, 3, '#EBCBA5'); rect(c, 3, 10, 2, 4, '#B58E6A'); rect(c, 11, 10, 2, 4, '#B58E6A'); },
  fence: (c) => { rect(c, 2, 3, 3, 11, '#F4EAD9'); rect(c, 11, 3, 3, 11, '#F4EAD9'); rect(c, 1, 6, 14, 2, '#EADBC8'); rect(c, 1, 10, 14, 2, '#EADBC8'); },
  crate: (c) => { rect(c, 2, 3, 12, 11, '#D9B08C'); rect(c, 2, 3, 12, 2, '#B58E6A'); rect(c, 2, 12, 12, 2, '#B58E6A'); rect(c, 7, 5, 2, 7, '#EBCBA5'); },
  chime: (c) => { rect(c, 3, 1.5, 10, 2, '#8C7BB8'); rect(c, 7.5, 3, 1, 3, '#FFFFFF'); poly(c, [5, 10, 6.5, 5.5, 9.5, 5.5, 11, 10], '#BDF0DC'); rect(c, 7, 11, 2, 3.5, '#FFF6E5'); },
  close: (c) => { poly(c, [3, 5, 5, 3, 13, 11, 11, 13], '#FFB3C1'); poly(c, [11, 3, 13, 5, 5, 13, 3, 11], '#FFB3C1'); },
  rotate: (c) => { c.strokeStyle = '#A8DAFF'; c.lineWidth = 2.6; c.beginPath(); c.arc(8, 8.5, 4.6, Math.PI * 0.2, Math.PI * 1.7); c.stroke(); poly(c, [9, 1.5, 14, 4, 9, 7], '#A8DAFF'); },
};

const iconCache = new Map<string, HTMLCanvasElement>();
export function icon(name: string): HTMLCanvasElement {
  let cv = iconCache.get(name);
  if (!cv) {
    cv = pixelCanvas(16, 16, ICONS[name] ?? ICONS.care);
    iconCache.set(name, cv);
  }
  return cv;
}

// DOM용: 아이콘 캔버스를 픽셀 그대로 키운 <img>
export function iconImg(name: string, cls = 'px-icon'): HTMLImageElement {
  const img = new Image();
  img.src = icon(name).toDataURL();
  img.className = cls;
  img.alt = '';
  img.draggable = false;
  return img;
}
