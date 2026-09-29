import { Group, Mesh, PlaneGeometry, ShaderMaterial } from 'three';
import { COMMON, shared } from './glsl';

// 해무: 구름바다 위로 낮게 흐르는 안개 두 겹 (반투명 대신 디더링)
const VERT = /* glsl */ `
${COMMON}
varying vec3 vW;
void main(){
  vec3 wp = curveWorld((modelMatrix * vec4(position, 1.0)).xyz);
  vW = wp;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;

const FRAG = /* glsl */ `
${COMMON}
uniform float uMist; uniform float uLayer;
varying vec3 vW;
void main(){
  vec2 q = (vW.xz + vec2(uFlow * (0.8 + uLayer * 0.3), 0.0)) * 0.04 + vec2(uTime * 0.012, uTime * 0.005 + uLayer * 3.1);
  float n = fbm(q);
  float a = smoothstep(0.5, 0.8, n) * uMist * (0.75 + uLayer * 0.25);
  a *= smoothstep(0.95, 1.9, length(vW.xz / vec2(10.5, 5.2)));
  float dist = length(cameraPosition - vW);
  a *= smoothstep(10.0, 24.0, dist);
  if (a < bayer4(gl_FragCoord.xy)) discard;
  vec3 c = mix(uFog, vec3(1.0), 0.4 - uNight * 0.3);
  c = applyFog(c, dist * 0.85);
  gl_FragColor = vec4(c, 1.0);
}`;

export function createMist(): Group {
  const g = new Group();
  [0.9, 2.3].forEach((y, i) => {
    const geo = new PlaneGeometry(260, 260, 40, 40);
    geo.rotateX(-Math.PI / 2);
    const mat = new ShaderMaterial({
      uniforms: { ...shared, uLayer: { value: i } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthWrite: false,
    });
    const m = new Mesh(geo, mat);
    m.position.y = y;
    m.renderOrder = 10 + i;
    m.frustumCulled = false;
    g.add(m);
  });
  return g;
}
