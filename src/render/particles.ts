import { BufferAttribute, BufferGeometry, Color, DynamicDrawUsage, Points, ShaderMaterial } from 'three';
import { COMMON, shared } from './glsl';

// 0 반짝임(십자), 1 둥근 점, 2 꽃잎 — 반투명 대신 디더로 사라짐
const VERT = /* glsl */ `
${COMMON}
uniform float uScale;
attribute vec3 aColor; attribute float aSize; attribute float aKind; attribute float aAlpha;
varying vec3 vC; varying float vK; varying float vA;
void main(){
  vec3 wp = curveWorld((modelMatrix * vec4(position, 1.0)).xyz);
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = max(1.0, aSize * uScale / -mv.z);
  vC = aColor; vK = aKind; vA = aAlpha;
}`;
const FRAG = /* glsl */ `
${COMMON}
varying vec3 vC; varying float vK; varying float vA;
void main(){
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float inside;
  if (vK < 0.5) inside = step(min(abs(p.x), abs(p.y)), 0.34) * step(length(p), 1.0);
  else if (vK < 1.5) inside = step(dot(p, p), 1.0);
  else inside = step(dot(p * vec2(1.0, 1.7), p * vec2(1.0, 1.7)), 1.0);
  if (inside < 0.5 || vA < bayer4(gl_FragCoord.xy)) discard;
  gl_FragColor = vec4(vC, 1.0);
}`;

const MAX = 900;
export interface SpawnOpts {
  x: number; y: number; z: number;
  vx?: number; vy?: number; vz?: number;
  life: number; size: number; color: string | Color;
  kind?: 0 | 1 | 2; grav?: number; drag?: number; flow?: number;
}

export class Particles {
  readonly points: Points;
  readonly material: ShaderMaterial;
  private geo = new BufferGeometry();
  private pos = new Float32Array(MAX * 3);
  private col = new Float32Array(MAX * 3);
  private size = new Float32Array(MAX);
  private kind = new Float32Array(MAX);
  private alpha = new Float32Array(MAX);
  private vel = new Float32Array(MAX * 3);
  private life = new Float32Array(MAX);
  private maxLife = new Float32Array(MAX);
  private grav = new Float32Array(MAX);
  private drag = new Float32Array(MAX);
  private flow = new Float32Array(MAX);
  private next = 0;
  private tmp = new Color();

  constructor() {
    const add = (name: string, arr: Float32Array, n: number) => {
      const a = new BufferAttribute(arr, n);
      a.setUsage(DynamicDrawUsage);
      this.geo.setAttribute(name, a);
    };
    add('position', this.pos, 3);
    add('aColor', this.col, 3);
    add('aSize', this.size, 1);
    add('aKind', this.kind, 1);
    add('aAlpha', this.alpha, 1);
    this.material = new ShaderMaterial({
      uniforms: { ...shared, uScale: { value: 700 } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthWrite: false,
    });
    this.points = new Points(this.geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 20;
  }

  spawn(o: SpawnOpts): void {
    const i = this.next;
    this.next = (this.next + 1) % MAX;
    this.pos.set([o.x, o.y, o.z], i * 3);
    this.vel.set([o.vx ?? 0, o.vy ?? 0, o.vz ?? 0], i * 3);
    this.tmp.set(o.color);
    this.col.set([this.tmp.r, this.tmp.g, this.tmp.b], i * 3);
    this.size[i] = o.size;
    this.kind[i] = o.kind ?? 0;
    this.life[i] = this.maxLife[i] = o.life;
    this.grav[i] = o.grav ?? 0;
    this.drag[i] = o.drag ?? 0.5;
    this.flow[i] = o.flow ?? 0;
  }

  // 반짝이 한 무더기
  burst(x: number, y: number, z: number, n: number, color: string, speed = 2.2, kind: 0 | 1 | 2 = 0): void {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.6);
      this.spawn({ x, y, z, vx: Math.cos(a) * s, vy: 1.2 + Math.random() * speed, vz: Math.sin(a) * s,
        life: 0.7 + Math.random() * 0.6, size: 0.22 + Math.random() * 0.14, color, kind, grav: 3.5, drag: 1.4 });
    }
  }

  update(dt: number, flowSpeed: number): void {
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) { this.alpha[i] = 0; continue; }
      this.life[i] -= dt;
      const j = i * 3;
      this.vel[j + 1] -= this.grav[i] * dt;
      const k = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[j] *= k; this.vel[j + 1] *= k; this.vel[j + 2] *= k;
      this.pos[j] += (this.vel[j] - this.flow[i] * flowSpeed) * dt;
      this.pos[j + 1] += this.vel[j + 1] * dt;
      this.pos[j + 2] += this.vel[j + 2] * dt;
      const l = Math.max(0, this.life[i]);
      this.alpha[i] = Math.min(1, (l / this.maxLife[i]) * 2.5) * Math.min(1, (this.maxLife[i] - l) * 10);
    }
    for (const n of ['position', 'aColor', 'aSize', 'aKind', 'aAlpha']) this.geo.attributes[n].needsUpdate = true;
  }
}
