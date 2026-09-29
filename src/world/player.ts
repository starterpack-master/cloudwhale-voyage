import { CanvasTexture, Color, NearestFilter, Sprite, SpriteMaterial, Vector3 } from 'three';
import { characterFrames, mirror } from './pixelArt';
import type { Back, Tile } from './back';

// 주인공: 도트 스프라이트, 누리 등 격자 위를 BFS로 걸어 다님
export class Player {
  readonly sprite: Sprite;
  readonly pos = new Vector3();
  tile: Tile;
  private tex: CanvasTexture[];
  private mat: SpriteMaterial;
  private path: Tile[] = [];
  private arrive: (() => void) | null = null;
  private walkT = 0;
  private left = false;
  private white = new Color('#FFFFFF');
  private nightTint = new Color('#A7AEE6');
  private back: Back;

  constructor(back: Back, start: Tile) {
    this.back = back;
    const f = characterFrames();
    this.tex = [f[0], f[1], mirror(f[0]), mirror(f[1])].map((cv) => {
      const t = new CanvasTexture(cv);
      t.magFilter = NearestFilter;
      t.minFilter = NearestFilter;
      t.generateMipmaps = false;
      return t;
    });
    this.mat = new SpriteMaterial({ map: this.tex[0], alphaTest: 0.5 });
    this.sprite = new Sprite(this.mat);
    this.sprite.center.set(0.5, 0.03);
    this.sprite.scale.set(0.98, 1.35, 1);
    this.tile = start;
    back.center(start, this.pos);
    this.sprite.position.copy(this.pos);
  }

  get moving(): boolean { return this.path.length > 0; }

  // 목표 타일(또는 그 옆)까지 경로 탐색
  walkTo(target: Tile, onArrive?: () => void, beside = false): boolean {
    const goal = (t: Tile) => (beside || !this.back.walkable(target)
      ? Math.abs(t.i - target.i) + Math.abs(t.j - target.j) <= 1 && t !== target
      : t === target);
    if (goal(this.tile) && !this.moving) { onArrive?.(); return true; }
    const prev = new Map<Tile, Tile | null>([[this.tile, null]]);
    const q: Tile[] = [this.tile];
    let end: Tile | null = null;
    while (q.length) {
      const t = q.shift()!;
      if (goal(t)) { end = t; break; }
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = this.back.at(t.i + di, t.j + dj);
        if (n && this.back.walkable(n) && !prev.has(n)) { prev.set(n, t); q.push(n); }
      }
    }
    if (!end) return false;
    const path: Tile[] = [];
    for (let t: Tile | null = end; t && t !== this.tile; t = prev.get(t) ?? null) path.unshift(t);
    this.path = path;
    this.arrive = onArrive ?? null;
    return true;
  }

  update(dt: number, camRight: Vector3, night: number): void {
    const next = this.path[0];
    if (next) {
      const target = this.back.center(next, new Vector3());
      const d = target.clone().sub(this.pos);
      const len = d.length();
      const step = 2.6 * dt;
      if (Math.abs(d.dot(camRight)) > 0.01) this.left = d.dot(camRight) < 0;
      if (len <= step) {
        this.pos.copy(target);
        this.tile = next;
        this.path.shift();
        if (!this.path.length) { const a = this.arrive; this.arrive = null; a?.(); }
      } else {
        this.pos.addScaledVector(d, step / len);
      }
      this.walkT += dt;
    } else {
      this.walkT = 0;
    }
    const frame = this.moving ? Math.floor(this.walkT / 0.16) % 2 : 0;
    this.mat.map = this.tex[frame + (this.left ? 2 : 0)];
    this.sprite.position.copy(this.pos);
    this.sprite.position.y += this.moving && frame === 1 ? 0.03 : 0;
    this.mat.color.copy(this.white).lerp(this.nightTint, night * 0.55);
  }
}
