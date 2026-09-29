import { C, Pix, make } from '../art/draw';
import { T, grassTile, plankTile, sandTile, stoneTile } from '../art/terrain';
import { WH, halfWidth, sideRatio, whaleBody } from '../art/whale';

export type MapId = 'whale' | 'harbor';
export interface MapObj {
  id: string; tex: string; tx: number; ty: number;   // 발밑 기준 타일 (가운데 아래)
  solid?: [number, number, number, number];           // 막힌 타일 사각형 (i0, j0, w, h)
  talk?: string;                                      // 눌렀을 때 대화/행동 키
  anim?: string; flip?: boolean; ox?: number; oy?: number; hidden?: boolean;
}
export interface Exit { tx: number; ty: number; to: MapId; spawn: [number, number]; }
export interface MapDef {
  id: MapId; name: string; w: number; h: number;
  under: HTMLCanvasElement[]; ground: HTMLCanvasElement;
  walk: Uint8Array; objects: MapObj[]; spawn: [number, number];
  soil: [number, number][]; exits: Exit[]; decals: { tex: string; x: number; y: number }[];
}

type Kind = 0 | 1 | 2 | 3 | 4; // 0 없음, 1 이끼, 2 널판, 3 모래, 4 징검돌
function paintTiles(w: number, h: number, kind: Uint8Array, base?: HTMLCanvasElement): HTMLCanvasElement {
  const at = (i: number, j: number) => (i < 0 || j < 0 || i >= w || j >= h ? 0 : kind[j * w + i]);
  return make(w * T, h * T, (g) => {
    if (base) g.ctx.drawImage(base, 0, 0);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const k = at(i, j), x = i * T, y = j * T, s = i * 31 + j * 17;
      if (k === 1) grassTile(g, x, y, s);
      else if (k === 2) plankTile(g, x, y, s);
      else if (k === 3) sandTile(g, x, y, s);
      else if (k === 4) stoneTile(g, x, y, s);
    }
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) edges(g, i, j, at);
  });
}

// 가장자리: 아래쪽엔 두께(옆면), 둘레엔 어두운 선
function edges(g: Pix, i: number, j: number, at: (i: number, j: number) => number): void {
  const k = at(i, j);
  if (!k) return;
  const x = i * T, y = j * T;
  const land = (a: number) => a !== 0;
  const onWhale = k === 1 || k === 4;
  const line = k === 2 ? C.wood[4] : k === 3 ? C.cream[3] : C.grass[5];
  const n = !land(at(i, j - 1)), wv = !land(at(i - 1, j)), e = !land(at(i + 1, j)), s = !land(at(i, j + 1));
  if (n) g.r(x, y, T, 1, line);
  if (wv) g.r(x, y, 1, T, line);
  if (e) g.r(x + T - 1, y, 1, T, line);
  // 볼록한 모서리는 3px 깎아 둥글게
  const cut = (cx: number, cy: number, dx: number, dy: number) => {
    g.ctx.clearRect(cx, cy, 1, 1); g.ctx.clearRect(cx + dx, cy, 1, 1); g.ctx.clearRect(cx, cy + dy, 1, 1);
    g.p(cx + dx, cy + dy, line); g.p(cx + 2 * dx, cy, line); g.p(cx, cy + 2 * dy, line);
  };
  if (n && wv) cut(x, y, 1, 1);
  if (n && e) cut(x + T - 1, y, -1, 1);
  if (s && wv && k !== 2) cut(x, y + T - 1, 1, -1);
  if (s && e && k !== 2) cut(x + T - 1, y + T - 1, -1, -1);
  if (!land(at(i, j + 1))) {
    if (k === 2) {
      g.r(x, y + T, T, 4, C.wood[3]); g.r(x, y + T + 3, T, 1, C.wood[4]); g.r(x, y + T, T, 1, C.wood[4]);
      if (i % 3 === 0) g.r(x + 2, y + T + 4, 3, 7, C.wood[4]);
    } else if (onWhale) {
      g.r(x, y + T - 1, T, 1, line);
      g.r(x, y + T, T, 2, C.lav[3]);
    } else {
      g.r(x, y + T, T, 2, C.soil[2]); g.r(x, y + T + 2, T, 3, C.soil[3]); g.r(x, y + T + 5, T, 1, C.soil[4]);
      for (let q = 1; q < T; q += 4) g.p(x + q, y + T, C.grass[3]);
    }
  }
}

function grid(w: number, h: number): { kind: Uint8Array; walk: Uint8Array } {
  return { kind: new Uint8Array(w * h), walk: new Uint8Array(w * h) };
}
function solidify(walk: Uint8Array, w: number, objs: MapObj[]): void {
  for (const o of objs) {
    if (!o.solid) continue;
    const [i0, j0, sw, sh] = o.solid;
    for (let j = j0; j < j0 + sh; j++) for (let i = i0; i < i0 + sw; i++) walk[j * w + i] = 0;
  }
}

const flowerCols = [C.pink[2], C.white, C.butter[2], C.lav[2]];
function sprinkleFlowers(g: Pix, cells: [number, number][], seed: number): void {
  let s = seed;
  for (const [i, j] of cells) {
    s = (s * 9301 + 49297) % 233280;
    if (s % 7 !== 0) continue;
    const c = flowerCols[s % 4], x = i * T + 3 + (s % 9), y = j * T + 4 + (s % 7);
    g.p(x, y + 2, C.grass[4]); g.p(x, y, c); g.p(x - 1, y + 1, c); g.p(x + 1, y + 1, c); g.p(x, y + 1, C.butter[1]);
  }
}

// ---- 누리 등 (48×30) ----
export const FARM: [number, number][] = [16, 17, 18, 19].flatMap((i) => [16, 17].map((j) => [i, j] as [number, number]));
export function buildWhaleMap(docked: boolean): MapDef {
  const w = 48, h = 30;
  const { kind, walk } = grid(w, h);
  const garden: [number, number][] = [];
  const cj = (WH.cy - 8) / T;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = i * T + 8, y = j * T + 8;
    if (sideRatio(x, y) < 0.82) walk[j * w + i] = 1;
    // 텃밭: 등줄기를 따라 위아래 대칭, 가장자리는 둥글게 (칸 단위)
    const half = Math.min(4, Math.floor((0.62 * halfWidth(x)) / T - 0.4));
    if (x > 176 && x < 616 && Math.abs(j - cj) <= half) { kind[j * w + i] = 1; garden.push([i, j]); }
  }
  for (const i of [26, 27, 28, 29, 30]) { kind[19 * w + i] = 4; }
  for (const [i, j] of FARM) kind[j * w + i] = 1;
  const under = [whaleBody(w * T, h * T)];
  const ground = paintTiles(w, h, kind);
  const g = new Pix(ground.getContext('2d')!, ground.width, ground.height);
  // 숨구멍 두 개 + 새싹
  g.r(612, 238, 4, 2, C.lav[4]); g.r(612, 248, 4, 2, C.lav[4]);
  g.r(604, 236, 1, 5, C.grass[4]); g.r(601, 235, 3, 1, C.grass[2]); g.r(605, 234, 3, 1, C.grass[2]);
  sprinkleFlowers(g, garden.filter(([i, j]) => !FARM.some(([a, b]) => a === i && b === j)), 3);
  const objects: MapObj[] = [
    { id: 'hut', tex: 'hut', tx: 26, ty: 13, solid: [25, 12, 3, 2], talk: 'hut' },
    { id: 'lamp1', tex: 'lamp', tx: 23, ty: 13, solid: [23, 13, 1, 1] },
    { id: 'lamp2', tex: 'lamp', tx: 29, ty: 18, solid: [29, 18, 1, 1] },
    { id: 'pot1', tex: 'pot', tx: 24, ty: 13, solid: [24, 13, 1, 1] },
    { id: 'pot2', tex: 'pot', tx: 28, ty: 13, solid: [28, 13, 1, 1] },
    { id: 'sign', tex: 'sign', tx: 20, ty: 15, solid: [20, 15, 1, 1], talk: 'signFarm' },
    { id: 'tree1', tex: 'treeB', tx: 13, ty: 15, solid: [13, 15, 1, 1] },
    { id: 'tree2', tex: 'treeG', tx: 34, ty: 18, solid: [34, 18, 1, 1] },
    { id: 'crate', tex: 'crate', tx: 31, ty: 12, solid: [31, 12, 1, 1] },
    { id: 'barrel', tex: 'barrel', tx: 32, ty: 12, solid: [32, 12, 1, 1] },
    ...[16, 17, 18, 19].map((i) => ({ id: `fence${i}`, tex: 'fence', tx: i, ty: 18, solid: [i, 18, 1, 1] as [number, number, number, number] })),
    { id: 'popo', tex: 'popo', tx: 22, ty: 16, anim: 'popo', talk: 'popo', oy: -6 },
    { id: 'nuri', tex: 'none', tx: 41, ty: 15, talk: 'nuri', hidden: true },
  ];
  if (docked) {
    objects.push({ id: 'gangway', tex: 'gangway', tx: 30, ty: 24 });
    for (const j of [21, 22, 23, 24]) walk[j * w + 30] = 1;
  }
  solidify(walk, w, objects);
  const exits: Exit[] = docked ? [{ tx: 30, ty: 24, to: 'harbor', spawn: [6, 17] }] : [];
  return { id: 'whale', name: '누리의 등', w, h, under, ground, walk, objects, spawn: [21, 16], soil: FARM, exits, decals: [] };
}


// ---- 등불항 (46×32): 널판 데크, 등대 섬, 아래쪽 작은 숲섬, 왼쪽엔 정박한 누리 ----
export function buildHarborMap(): MapDef {
  const w = 46, h = 32;
  const { kind, walk } = grid(w, h);
  const set = (i0: number, j0: number, i1: number, j1: number, k: Kind) => {
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) kind[j * w + i] = k;
  };
  const ellipse = (ci: number, cj: number, ri: number, rj: number, k: Kind) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (((i + 0.5 - ci) / ri) ** 2 + ((j + 0.5 - cj) / rj) ** 2 <= 1) kind[j * w + i] = k;
  };
  ellipse(40.5, 6, 5.2, 4, 1);
  ellipse(33, 27.5, 10.5, 4.3, 3);
  ellipse(33, 27.3, 8.6, 3.2, 1);
  set(11, 13, 39, 21, 2);
  set(3, 16, 10, 18, 2);
  set(38, 9, 39, 12, 2);
  set(31, 22, 32, 24, 2);
  // 데크 위 꽃밭 두 곳 (널판만 이어지지 않게)
  set(19, 18, 21, 19, 1);
  set(27, 18, 29, 19, 1);
  for (let q = 0; q < w * h; q++) if (kind[q]) walk[q] = 1;
  const ox = 724 - 190, oy = 244 - 400;
  const under = [whaleBody(w * T, h * T, ox, oy)];
  const ground = paintTiles(w, h, kind);
  const g = new Pix(ground.getContext('2d')!, ground.width, ground.height);
  const grass: [number, number][] = [];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (kind[j * w + i] === 1) grass.push([i, j]);
  sprinkleFlowers(g, grass, 7);
  // 정박한 누리의 눈
  g.e(724 - 70 - ox + 6, 400 - 44, 3.5, 4, C.ink); g.r(724 - 70 - ox + 4, 400 - 47, 2, 2, C.white);
  const solid1 = (i: number, j: number): [number, number, number, number] => [i, j, 1, 1];
  const objects: MapObj[] = [
    { id: 'houseA', tex: 'hutPink', tx: 14, ty: 14, solid: [13, 13, 3, 2], talk: 'house' },
    { id: 'houseB', tex: 'hutMint', tx: 18, ty: 14, solid: [17, 13, 3, 2], talk: 'house' },
    { id: 'stall', tex: 'stall', tx: 26, ty: 14, solid: [25, 13, 3, 2] },
    { id: 'mar', tex: 'mar', tx: 26, ty: 15, anim: 'mar', talk: 'mar', solid: solid1(26, 15) },
    { id: 'houseC', tex: 'hutLav', tx: 34, ty: 14, solid: [33, 13, 3, 2], talk: 'house' },
    { id: 'lighthouse', tex: 'lighthouse', tx: 40, ty: 8, solid: [40, 7, 1, 2] },
    { id: 'moa', tex: 'moa', tx: 39, ty: 10, anim: 'moa', talk: 'moa', solid: solid1(39, 10) },
    ...[[8, 15], [12, 16], [21, 16], [30, 16], [37, 16], [38, 21], [13, 21]].map(([i, j], k) => ({ id: `lamp${k}`, tex: 'lamp', tx: i, ty: j, solid: solid1(i, j) })),
    { id: 'bench1', tex: 'bench', tx: 23, ty: 19, solid: [22, 19, 2, 1] },
    { id: 'bench2', tex: 'bench', tx: 34, ty: 19, solid: [33, 19, 2, 1] },
    { id: 'tree4', tex: 'treeB', tx: 20, ty: 18, solid: solid1(20, 18) },
    { id: 'tree5', tex: 'treeG', tx: 28, ty: 18, solid: solid1(28, 18) },
    { id: 'bushD1', tex: 'bush', tx: 21, ty: 19, solid: solid1(21, 19) },
    { id: 'bushD2', tex: 'bush', tx: 27, ty: 19, solid: solid1(27, 19) },
    ...[[12, 13], [16, 13], [20, 13], [31, 13], [36, 13]].map(([i, j], k) => ({ id: `planter${k}`, tex: 'pot', tx: i, ty: j, solid: solid1(i, j) })),
    { id: 'crate3', tex: 'crate', tx: 29, ty: 15, solid: solid1(29, 15) },
    { id: 'barrel2', tex: 'barrel', tx: 24, ty: 15, solid: solid1(24, 15) },
    { id: 'barrel1', tex: 'barrel', tx: 28, ty: 14, solid: solid1(28, 14) },
    { id: 'crate1', tex: 'crate', tx: 29, ty: 14, solid: solid1(29, 14) },
    { id: 'crate2', tex: 'crate', tx: 24, ty: 14, solid: solid1(24, 14) },
    { id: 'pot1', tex: 'pot', tx: 16, ty: 16, solid: solid1(16, 16) },
    { id: 'pot2', tex: 'pot', tx: 32, ty: 16, solid: solid1(32, 16) },
    { id: 'sign', tex: 'sign', tx: 10, ty: 16, solid: solid1(10, 16), talk: 'signHarbor' },
    { id: 'tree1', tex: 'treeG', tx: 27, ty: 27, solid: solid1(27, 27) },
    { id: 'tree2', tex: 'treeB', tx: 33, ty: 26, solid: solid1(33, 26) },
    { id: 'tree3', tex: 'treeG', tx: 38, ty: 28, solid: solid1(38, 28) },
    { id: 'bush1', tex: 'bush', tx: 30, ty: 29, solid: solid1(30, 29) },
    { id: 'bush2', tex: 'bush', tx: 36, ty: 25, solid: solid1(36, 25) },
    { id: 'rock1', tex: 'rock', tx: 43, ty: 5, solid: solid1(43, 5) },
    { id: 'wood1', tex: 'driftwood', tx: 24, ty: 28, talk: 'wood' },
    { id: 'wood2', tex: 'driftwood', tx: 35, ty: 30, talk: 'wood' },
    { id: 'wood3', tex: 'driftwood', tx: 42, ty: 27, talk: 'wood' },
  ];
  solidify(walk, w, objects);
  return {
    id: 'harbor', name: '등불항', w, h, under, ground, walk, objects, spawn: [6, 17], soil: [],
    exits: [{ tx: 3, ty: 17, to: 'whale', spawn: [30, 21] }], decals: [],
  };
}

export const WHALE_HEAD = { x: WH.x1 - 60, y: WH.cy, hw: halfWidth(WH.x1 - 60) };
