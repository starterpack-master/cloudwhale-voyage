import { Mesh, PlaneGeometry, ShaderMaterial } from 'three';
import { COMMON, shared } from './glsl';

// 구름바다: 노이즈로 일렁이는 표면 + 누리 둘레 물결 + 뒤쪽 항적
const VERT = /* glsl */ `
${COMMON}
uniform vec3 uCloudLight; uniform vec3 uCloudShadow;
varying vec3 vW; varying vec3 vN; varying float vH;
float heightAt(vec2 p){
  vec2 q = p + vec2(uFlow, 0.0);
  float h = (fbm(q * 0.075 + vec2(0.0, uTime * 0.01)) - 0.5) * 2.6;
  h += (fbm(q * 0.24 + 7.3) - 0.5) * 0.9;
  float r = length(p / vec2(9.4, 4.1));
  h += exp(-pow((r - 1.0) * 3.2, 2.0)) * 0.6 * (0.8 + 0.2 * sin(uTime * 1.5 + p.x * 0.6));
  float back = max(-p.x - 8.0, 0.0);
  float wake = exp(-pow(p.y / (1.4 + back * 0.14), 2.0)) * step(0.0, back) * exp(-back * 0.05);
  h += wake * 0.55 * (0.6 + 0.4 * sin(p.x * 0.9 + uTime * 2.2));
  return h;
}
void main(){
  vec3 p = position;
  float h = heightAt(p.xz);
  float hx = heightAt(p.xz + vec2(0.7, 0.0));
  float hz = heightAt(p.xz + vec2(0.0, 0.7));
  vN = normalize(vec3(h - hx, 0.7, h - hz));
  vH = h;
  vec3 wp = (modelMatrix * vec4(p.x, h - 0.3, p.z, 1.0)).xyz;
  wp = curveWorld(wp);
  vW = wp;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;

const FRAG = /* glsl */ `
${COMMON}
uniform vec3 uCloudLight; uniform vec3 uCloudShadow;
varying vec3 vW; varying vec3 vN; varying float vH;
void main(){
  float d = dot(normalize(vN), normalize(uSunDir));
  float band = d > 0.66 ? 1.0 : (d > 0.4 ? 0.7 : 0.4);
  float crest = smoothstep(0.2, 1.2, vH);
  vec3 c = mix(uCloudShadow, uCloudLight, clamp(band * 0.78 + crest * 0.38, 0.0, 1.0));
  vec2 g = floor((vW.xz + vec2(uFlow, 0.0)) * 2.2);
  float tw = step(0.986, hash12(g)) * step(0.6, band) * (0.5 + 0.5 * sin(uTime * 3.0 + hash12(g + 1.7) * 30.0));
  c += tw * 0.28 * (1.0 - uNight * 0.6);
  float glow = step(0.993, hash12(g + 9.1)) * uNight * (0.6 + 0.4 * sin(uTime * 2.0 + g.x));
  c += glow * vec3(0.35, 0.55, 0.8);
  c = applyFog(c, length(cameraPosition - vW));
  gl_FragColor = vec4(c, 1.0);
}`;

export function createCloudSea(): Mesh {
  const geo = new PlaneGeometry(300, 300, 200, 200);
  geo.rotateX(-Math.PI / 2);
  const mat = new ShaderMaterial({ uniforms: { ...shared }, vertexShader: VERT, fragmentShader: FRAG });
  const mesh = new Mesh(geo, mat);
  mesh.frustumCulled = false;
  return mesh;
}
