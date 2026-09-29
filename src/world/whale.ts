import {
  BoxGeometry, BufferAttribute, BufferGeometry, Color, ExtrudeGeometry, Group, LatheGeometry, Mesh,
  ShaderMaterial, Shape, SphereGeometry, Vector2, Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { COMMON, shared } from '../render/glsl';
import { toon } from './materials';

// 누리 몸 치수 (+X가 머리). 등 위 평평한 면(plateau)에 마을을 짓는다.
export const WHALE = { x0: -8.2, x1: 7.4, R: 3.0, sy: 0.78, sz: 1.18, plateau: 1.25 };

export function radiusAt(x: number): number {
  const t = (x - WHALE.x0) / (WHALE.x1 - WHALE.x0);
  if (t <= 0 || t >= 1) return 0;
  return WHALE.R * Math.pow(Math.sin(Math.PI * Math.pow(t, 1.6)), 0.6);
}

// 등 위 평평한 면의 반폭 (그 x 위치에서)
export function plateauHalfWidth(x: number): number {
  const r = radiusAt(x);
  const ry = r * WHALE.sy;
  if (ry <= WHALE.plateau) return 0;
  return r * WHALE.sz * Math.sqrt(1 - (WHALE.plateau / ry) ** 2);
}

function withPart(g: BufferGeometry, part: number): BufferGeometry {
  const ng = g.index ? g.toNonIndexed() : g;
  const n = ng.attributes.position.count;
  ng.setAttribute('part', new BufferAttribute(new Float32Array(n).fill(part), 1));
  return ng;
}

function bodyGeometry(): BufferGeometry {
  const pts: Vector2[] = [];
  const N = 72;
  for (let i = 0; i <= N; i++) {
    const x = WHALE.x0 + (WHALE.x1 - WHALE.x0) * (i / N);
    pts.push(new Vector2(i === 0 || i === N ? 0 : Math.max(radiusAt(x), 0.04), x));
  }
  const g = new LatheGeometry(pts, 44);
  g.rotateZ(-Math.PI / 2);
  const p = g.attributes.position as BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    let y = p.getY(i) * WHALE.sy;
    if (y > WHALE.plateau) y = WHALE.plateau + (y - WHALE.plateau) * 0.12;
    p.setY(i, y);
    p.setZ(i, p.getZ(i) * WHALE.sz);
  }
  g.computeVertexNormals();
  return g;
}

function flukeGeometry(): BufferGeometry {
  const s = new Shape();
  s.moveTo(0.4, 0);
  s.bezierCurveTo(-0.3, 0.45, -1.1, 1.35, -1.95, 2.55);
  s.bezierCurveTo(-1.55, 1.8, -1.65, 0.75, -1.25, 0);
  s.bezierCurveTo(-1.65, -0.75, -1.55, -1.8, -1.95, -2.55);
  s.bezierCurveTo(-1.1, -1.35, -0.3, -0.45, 0.4, 0);
  const g = new ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.05, bevelSegments: 1, curveSegments: 10 });
  g.translate(0, 0, -0.08);
  g.rotateX(Math.PI / 2);
  g.translate(WHALE.x0 + 0.35, 0.02, 0);
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  return g;
}

function finGeometry(side: 1 | -1): BufferGeometry {
  const g = new SphereGeometry(1, 14, 8);
  g.scale(1.45, 0.13, 0.55);
  g.rotateY(side * 0.55);
  g.rotateX(-side * 0.3);
  g.translate(3.6, 0.35, side * 3.75);
  g.deleteAttribute('uv');
  return g;
}

let cachedGeo: BufferGeometry | null = null;
export function whaleGeometry(): BufferGeometry {
  if (cachedGeo) return cachedGeo;
  const body = bodyGeometry();
  body.deleteAttribute('uv');
  cachedGeo = mergeGeometries([
    withPart(body, 0), withPart(finGeometry(1), 1), withPart(finGeometry(-1), 1), withPart(flukeGeometry(), 2),
  ]);
  cachedGeo.computeBoundingSphere();
  return cachedGeo;
}

const VERT = /* glsl */ `
${COMMON}
attribute float part;
uniform float uSwim; uniform float uPhase;
varying vec3 vN; varying vec3 vW; varying vec3 vL; varying float vPart;
void main(){
  vec3 p = position;
  float w = smoothstep(-2.5, -9.8, p.x);
  p.y += w * w * 0.9 * uSwim * sin(uTime * 1.3 + uPhase - p.x * 0.32);
  if (part > 0.5 && part < 1.5) p.y += (abs(p.z) - 3.3) * 0.25 * sin(uTime * 1.1 + uPhase + sign(p.z) * 0.5);
  vL = p; vPart = part;
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vN = normalize(mat3(modelMatrix) * normal);
  #ifdef CURVE
    wp.xyz = curveWorld(wp.xyz);
  #endif
  vW = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const FRAG = /* glsl */ `
${COMMON}
uniform vec3 uTop; uniform vec3 uSide; uniform vec3 uBelly; uniform vec3 uSpot;
varying vec3 vN; varying vec3 vW; varying vec3 vL; varying float vPart;
void main(){
  vec3 n = normalize(vN);
  vec3 base = mix(uSide, uTop, smoothstep(0.2, 0.85, n.y));
  float belly = smoothstep(-0.25, -0.6, n.y) * step(vL.x, 6.9);
  float groove = step(0.55, fract(vL.z * 2.4));
  base = mix(base, mix(uBelly, uBelly * vec3(0.9, 0.88, 0.95), groove), belly);
  if (vPart > 1.5) base = mix(uSide, uTop, 0.35 + 0.5 * n.y);
  // 입선: 머리 옆으로 길게
  float mouthY = -0.42 - (7.3 - vL.x) * 0.07;
  float mouth = step(abs(vL.y - mouthY), 0.05) * step(4.2, vL.x) * step(1.0, abs(vL.z));
  base = mix(base, uSide * 0.72, mouth);
  // 볼의 별 주근깨 (밤엔 은은히 빛남)
  float cheek = step(4.4, vL.x) * step(vL.x, 6.6) * step(-0.25, vL.y) * step(vL.y, 0.95) * step(1.3, abs(vL.z));
  float fr = step(0.84, hash12(floor(vL.xy * 3.2) + sign(vL.z) * 7.0)) * cheek;
  // 등 옆의 옅은 점무늬
  float spots = step(0.9, hash12(floor(vec2(vL.x * 1.6, vL.y * 2.2)) + sign(vL.z) * 3.0)) * step(0.1, n.y) * step(n.y, 0.7) * step(vPart, 0.5);
  base = mix(base, mix(base, uTop * 1.06, 0.6), spots);
  vec3 c = toon(base, n, normalize(cameraPosition - vW));
  c = mix(c, uSpot, fr * (0.65 + 0.35 * uNight));
  c += fr * uNight * vec3(0.28, 0.24, 0.1);
  c = applyFog(c, length(cameraPosition - vW));
  gl_FragColor = vec4(c, 1.0);
}`;

export interface WhaleTint { top: string; side: string; belly: string; spot: string; }
export const NURI_TINT: WhaleTint = { top: '#A8DAFF', side: '#CDB8F0', belly: '#FFF6E5', spot: '#FFF1A8' };

export function whaleMaterial(tint: WhaleTint, phase = 0, curve = false): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      ...shared,
      uTop: { value: new Color(tint.top) }, uSide: { value: new Color(tint.side) },
      uBelly: { value: new Color(tint.belly) }, uSpot: { value: new Color(tint.spot) },
      uSwim: { value: 1 }, uPhase: { value: phase },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    defines: curve ? { CURVE: '' } : {},
  });
}

// 누리(또는 다른 고래지기의 고래) 한 마리
export class Whale {
  readonly group = new Group();
  readonly body: Mesh;
  readonly material: ShaderMaterial;
  readonly blowhole = new Vector3(5.75, 1.3, 0);
  private phase: number;

  constructor(tint: WhaleTint = NURI_TINT, phase = 0, curve = false) {
    this.phase = phase;
    this.material = whaleMaterial(tint, phase, curve);
    this.body = new Mesh(whaleGeometry(), this.material);
    this.group.add(this.body);
    const flat = (color: string) => toon({ color, emissive: color, emissiveAlways: 1, curve });
    const eyeGeo = new SphereGeometry(0.27, 10, 8);
    const hiGeo = new SphereGeometry(0.09, 6, 4);
    for (const s of [1, -1]) {
      const eye = new Mesh(eyeGeo, flat('#3E3470'));
      eye.scale.set(0.9, 1.15, 0.6);
      eye.position.set(5.55, 0.06, s * 2.42);
      const hi = new Mesh(hiGeo, flat('#FFFFFF'));
      hi.position.set(5.62, 0.15, s * 2.53);
      this.group.add(eye, hi);
    }
    const hole = new Mesh(new SphereGeometry(0.28, 10, 6), flat('#7F74B8'));
    hole.scale.set(1, 0.18, 0.7);
    hole.position.copy(this.blowhole);
    const leaf = toon({ color: '#9FD8B4', curve });
    const sprout = new Group();
    const stem = new Mesh(new BoxGeometry(0.05, 0.22, 0.05), leaf);
    stem.position.y = 0.11;
    const l1 = new Mesh(new BoxGeometry(0.2, 0.04, 0.1), leaf);
    l1.position.set(0.09, 0.22, 0);
    l1.rotation.z = 0.4;
    const l2 = l1.clone();
    l2.position.x = -0.09;
    l2.rotation.z = -0.4;
    sprout.add(stem, l1, l2);
    sprout.position.set(this.blowhole.x - 0.45, this.blowhole.y, 0.25);
    this.group.add(hole, sprout);
  }

  update(t: number): void {
    const g = this.group;
    g.position.y = 0.3 + Math.sin(t * 0.6 + this.phase) * 0.12;
    g.rotation.z = Math.sin(t * 0.6 + this.phase + 1) * 0.012;
    g.rotation.x = Math.sin(t * 0.45 + this.phase) * 0.01;
  }

  blowholeWorld(out: Vector3): Vector3 {
    return this.group.localToWorld(out.copy(this.blowhole));
  }
}
