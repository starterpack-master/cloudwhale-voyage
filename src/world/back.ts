import {
  BoxGeometry, BufferGeometry, Color, Float32BufferAttribute, Group, InstancedMesh, LineBasicMaterial,
  LineSegments, Matrix4, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, Vector3,
} from 'three';
import { toon } from './materials';
import { makeHut, makeProp, type PropKind } from './props';
import { plateauHalfWidth, WHALE } from './whale';

// 누리 등 위 격자 (도담 단계 14×8, 몸 모양에 맞게 가장자리는 비움)
export const TILE = 0.68;
export const GW = 14;
export const GH = 8;
export const GX0 = -4.5;
export const GZ0 = -(GH * TILE) / 2;
export const TOP = WHALE.plateau + 0.14;

export interface Crop { plantedAt: number; growMs: number; group: Group; stage: number; }
export interface Tile {
  i: number; j: number; x: number; z: number;
  soil: boolean; path: boolean;
  prop: Object3D | null; kind: PropKind | 'hut' | null; rot: number;
  crop: Crop | null;
}
export interface BackSave { props: { i: number; j: number; kind: PropKind; rot: number }[]; crops: { i: number; j: number; plantedAt: number; growMs: number }[]; }

const HUT = { i: 9, j: 1, w: 3, h: 3 };
const FARM = { i: 4, j: 4, w: 4, h: 2 };

function cropGroup(): Group {
  const g = new Group();
  const leaf = toon({ color: '#8FD1A8' });
  const add = (stage: number, w: number, h: number, d: number, x: number, y: number, z: number, m = leaf) => {
    const b = new Mesh(new BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    b.userData.stage = stage;
    g.add(b);
  };
  add(0, 0.06, 0.1, 0.06, -0.05, 0.05, 0);
  add(0, 0.06, 0.08, 0.06, 0.06, 0.04, 0.03);
  add(1, 0.18, 0.18, 0.18, 0, 0.09, 0);
  add(1, 0.08, 0.1, 0.08, 0.1, 0.2, 0.02);
  add(2, 0.32, 0.26, 0.32, 0, 0.13, 0);
  add(2, 0.07, 0.07, 0.07, 0.12, 0.29, 0.1, toon({ color: '#FFFFFF' }));
  add(3, 0.34, 0.3, 0.34, 0, 0.15, 0);
  const berry = toon({ color: '#FF9EC4', emissive: '#FFD3E6', emissiveAlways: 0.15 });
  add(3, 0.12, 0.12, 0.12, 0.14, 0.3, 0.12, berry);
  add(3, 0.12, 0.12, 0.12, -0.13, 0.26, 0.1, berry);
  add(3, 0.11, 0.11, 0.11, 0.02, 0.34, -0.13, berry);
  add(3, 0.05, 0.05, 0.05, 0.15, 0.39, 0.13, toon({ color: '#FFF1A8', emissive: '#FFF1A8', emissiveAlways: 0.6 }));
  return g;
}

function setStage(c: Crop, stage: number): void {
  c.stage = stage;
  for (const ch of c.group.children) ch.visible = ch.userData.stage === stage;
}

export class Back {
  readonly group = new Group();
  readonly tiles: (Tile | null)[] = [];
  readonly pick: Mesh;
  private grid: LineSegments;
  private hi: Mesh;
  private hiOk = toon({ color: '#BDF0DC', emissive: '#BDF0DC', emissiveAlways: 1 });
  private hiBad = toon({ color: '#FFB3C1', emissive: '#FFB3C1', emissiveAlways: 1 });
  private spawning: { o: Object3D; t0: number }[] = [];

  constructor() {
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const x0 = GX0 + i * TILE, z0 = GZ0 + j * TILE;
      const hw = Math.min(plateauHalfWidth(x0), plateauHalfWidth(x0 + TILE));
      const ok = Math.max(Math.abs(z0), Math.abs(z0 + TILE)) <= hw - 0.08;
      const soil = i >= FARM.i && i < FARM.i + FARM.w && j >= FARM.j && j < FARM.j + FARM.h;
      const path = j === 3 && i >= 2 && i <= 8;
      this.tiles.push(ok ? { i, j, x: x0 + TILE / 2, z: z0 + TILE / 2, soil, path, prop: null, kind: null, rot: 0, crop: null } : null);
    }
    const list = this.tiles.filter((t): t is Tile => !!t);
    const inst = new InstancedMesh(new BoxGeometry(TILE, 0.28, TILE), toon(), list.length);
    const m = new Matrix4();
    const c = new Color();
    list.forEach((t, k) => {
      m.makeTranslation(t.x, TOP - 0.14 - (t.soil ? 0.05 : 0), t.z);
      inst.setMatrixAt(k, m);
      const h = ((t.i * 7 + t.j * 13) % 5) / 5;
      c.set(t.soil ? (h > 0.5 ? '#D8A6A0' : '#CF9C98') : t.path ? (h > 0.4 ? '#F3E9DA' : '#EADFCF') : (h > 0.55 ? '#B4E3C4' : h > 0.25 ? '#A7DDB9' : '#9CD6B1'));
      inst.setColorAt(k, c);
    });
    this.group.add(inst);
    // 격자선 (건축 모드)
    const pts: number[] = [];
    for (const t of list) {
      const a = t.x - TILE / 2, b = t.z - TILE / 2, y = TOP + 0.012;
      pts.push(a, y, b, a + TILE, y, b, a, y, b, a, y, b + TILE, a + TILE, y, b, a + TILE, y, b + TILE, a, y, b + TILE, a + TILE, y, b + TILE);
    }
    const lg = new BufferGeometry();
    lg.setAttribute('position', new Float32BufferAttribute(pts, 3));
    this.grid = new LineSegments(lg, new LineBasicMaterial({ color: '#8E7CC3' }));
    this.grid.visible = false;
    this.hi = new Mesh(new BoxGeometry(TILE * 0.96, 0.04, TILE * 0.96), this.hiOk);
    this.hi.visible = false;
    this.pick = new Mesh(new PlaneGeometry(GW * TILE + 3, GH * TILE + 3), new MeshBasicMaterial({ visible: false }));
    this.pick.rotation.x = -Math.PI / 2;
    this.pick.position.set(GX0 + (GW * TILE) / 2, TOP, 0);
    this.group.add(this.grid, this.hi, this.pick);
    const hut = makeHut();
    hut.position.set(GX0 + (HUT.i + HUT.w / 2) * TILE, TOP, GZ0 + (HUT.j + HUT.h / 2) * TILE);
    this.group.add(hut);
    for (let j = HUT.j; j < HUT.j + HUT.h; j++) for (let i = HUT.i; i < HUT.i + HUT.w; i++) {
      const t = this.at(i, j);
      if (t) { t.kind = 'hut'; t.prop = hut; }
    }
  }

  at(i: number, j: number): Tile | null {
    if (i < 0 || j < 0 || i >= GW || j >= GH) return null;
    return this.tiles[j * GW + i];
  }

  fromLocal(p: Vector3): Tile | null {
    return this.at(Math.floor((p.x - GX0) / TILE), Math.floor((p.z - GZ0) / TILE));
  }

  center(t: Tile, out = new Vector3()): Vector3 {
    return out.set(t.x, TOP, t.z);
  }

  walkable(t: Tile | null): boolean {
    return !!t && !t.prop;
  }

  canPlace(t: Tile | null): boolean {
    return !!t && !t.prop && !t.soil && !t.crop;
  }

  place(kind: PropKind, t: Tile, rot = 0, now = performance.now()): void {
    const o = makeProp(kind);
    o.position.set(t.x, TOP, t.z);
    o.rotation.y = rot * (Math.PI / 2);
    o.scale.setScalar(0.01);
    this.group.add(o);
    t.prop = o;
    t.kind = kind;
    t.rot = rot;
    this.spawning.push({ o, t0: now });
  }

  remove(t: Tile): PropKind | null {
    if (!t.prop || t.kind === 'hut' || !t.kind) return null;
    const k = t.kind;
    this.group.remove(t.prop);
    t.prop = null;
    t.kind = null;
    return k;
  }

  plant(t: Tile, plantedAt: number, growMs: number): void {
    const c: Crop = { plantedAt, growMs, group: cropGroup(), stage: -1 };
    c.group.position.set(t.x, TOP - 0.05, t.z);
    this.group.add(c.group);
    t.crop = c;
    setStage(c, 0);
  }

  harvest(t: Tile): boolean {
    if (!t.crop || t.crop.stage < 3) return false;
    this.group.remove(t.crop.group);
    t.crop = null;
    return true;
  }

  progress(t: Tile, now: number): number {
    return t.crop ? Math.min(1, (now - t.crop.plantedAt) / t.crop.growMs) : 0;
  }

  // 작물 단계·소품 등장·풍경 흔들림
  update(time: number, now: number, perf = performance.now()): Tile[] {
    const ready: Tile[] = [];
    for (const t of this.tiles) {
      if (!t?.crop) continue;
      const p = this.progress(t, now);
      const s = p >= 1 ? 3 : Math.min(2, Math.floor(p * 3));
      if (s !== t.crop.stage) setStage(t.crop, s);
      if (s === 3) ready.push(t);
      t.crop.group.scale.y = 1 + Math.sin(time * 2 + t.i) * 0.03;
    }
    this.spawning = this.spawning.filter(({ o, t0 }) => {
      const k = Math.min(1, (perf - t0) / 380);
      o.scale.setScalar(k < 1 ? 1 + Math.sin(k * Math.PI) * 0.25 - (1 - k) * 0.8 : 1);
      return k < 1;
    });
    this.group.traverse((o) => {
      if (o.name === 'sway') o.rotation.z = Math.sin(time * 1.6 + o.id) * 0.18;
    });
    return ready;
  }

  setBuildMode(on: boolean): void {
    this.grid.visible = on;
    if (!on) this.hi.visible = false;
  }

  highlight(t: Tile | null, ok: boolean): void {
    this.hi.visible = !!t;
    if (!t) return;
    this.hi.position.set(t.x, TOP + 0.03, t.z);
    this.hi.material = ok ? this.hiOk : this.hiBad;
  }

  save(): BackSave {
    const out: BackSave = { props: [], crops: [] };
    for (const t of this.tiles) {
      if (!t) continue;
      if (t.prop && t.kind && t.kind !== 'hut') out.props.push({ i: t.i, j: t.j, kind: t.kind, rot: t.rot });
      if (t.crop) out.crops.push({ i: t.i, j: t.j, plantedAt: t.crop.plantedAt, growMs: t.crop.growMs });
    }
    return out;
  }

  load(s: BackSave): void {
    for (const p of s.props) {
      const t = this.at(p.i, p.j);
      if (t && this.canPlace(t)) this.place(p.kind, t, p.rot, -1e9);
    }
    for (const c of s.crops) {
      const t = this.at(c.i, c.j);
      if (t?.soil && !t.crop) this.plant(t, c.plantedAt, c.growMs);
    }
  }

  static defaults(now: number): BackSave {
    const grow = 90_000;
    return {
      props: [
        { i: 8, j: 4, kind: 'lantern', rot: 0 }, { i: 3, j: 2, kind: 'lantern', rot: 0 },
        { i: 8, j: 2, kind: 'pot', rot: 0 }, { i: 12, j: 4, kind: 'pot', rot: 0 },
        { i: 9, j: 5, kind: 'bench', rot: 0 }, { i: 8, j: 1, kind: 'chime', rot: 0 },
        { i: 3, j: 5, kind: 'crate', rot: 0 }, { i: 5, j: 6, kind: 'fence', rot: 0 }, { i: 6, j: 6, kind: 'fence', rot: 0 },
      ],
      crops: [
        { i: 4, j: 4, plantedAt: now - grow, growMs: grow }, { i: 5, j: 4, plantedAt: now - grow * 1.2, growMs: grow },
        { i: 6, j: 4, plantedAt: now - grow * 0.5, growMs: grow }, { i: 4, j: 5, plantedAt: now - grow * 0.2, growMs: grow },
      ],
    };
  }
}
