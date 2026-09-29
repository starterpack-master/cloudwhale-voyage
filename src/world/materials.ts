import { Color, FrontSide, ShaderMaterial, type Side } from 'three';
import { COMMON, shared } from '../render/glsl';

const VERT = /* glsl */ `
${COMMON}
varying vec3 vN; varying vec3 vW; varying vec3 vCol;
void main(){
  vec4 wp = vec4(position, 1.0);
  vec3 n = normal;
  #ifdef USE_INSTANCING
    wp = instanceMatrix * wp;
    n = mat3(instanceMatrix) * n;
  #endif
  wp = modelMatrix * wp;
  vN = normalize(mat3(modelMatrix) * n);
  vCol = vec3(1.0);
  #ifdef USE_COLOR
    vCol *= color;
  #endif
  #ifdef USE_INSTANCING_COLOR
    vCol *= instanceColor;
  #endif
  #ifdef CURVE
    wp.xyz = curveWorld(wp.xyz);
  #endif
  vW = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const FRAG = /* glsl */ `
${COMMON}
uniform vec3 uColor; uniform vec3 uEmissive; uniform float uEmissiveNight; uniform float uEmissiveAlways;
varying vec3 vN; varying vec3 vW; varying vec3 vCol;
void main(){
  vec3 viewDir = normalize(cameraPosition - vW);
  vec3 c = toon(uColor * vCol, vN, viewDir);
  c = mix(c, uEmissive, max(uEmissiveAlways, uEmissiveNight * uNight));
  c = applyFog(c, length(cameraPosition - vW));
  gl_FragColor = vec4(c, 1.0);
}`;

export interface ToonOpts {
  color?: string;
  emissive?: string;
  emissiveNight?: number;
  emissiveAlways?: number;
  vertexColors?: boolean;
  curve?: boolean;
  side?: Side;
}

const cache = new Map<string, ShaderMaterial>();

// 툰 셰이딩 재질 (같은 옵션이면 재사용)
export function toon(o: ToonOpts = {}): ShaderMaterial {
  const key = JSON.stringify(o);
  const hit = cache.get(key);
  if (hit) return hit;
  const m = new ShaderMaterial({
    uniforms: {
      ...shared,
      uColor: { value: new Color(o.color ?? '#ffffff') },
      uEmissive: { value: new Color(o.emissive ?? '#FFE7A8') },
      uEmissiveNight: { value: o.emissiveNight ?? 0 },
      uEmissiveAlways: { value: o.emissiveAlways ?? 0 },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    vertexColors: !!o.vertexColors,
    side: o.side ?? FrontSide,
    defines: o.curve ? { CURVE: '' } : {},
  });
  cache.set(key, m);
  return m;
}
