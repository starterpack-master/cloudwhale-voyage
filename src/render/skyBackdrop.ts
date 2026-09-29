import { MathUtils, Mesh, PerspectiveCamera, PlaneGeometry, ShaderMaterial } from 'three';
import { shared } from './glsl';
import { sky } from '../core/sky';

// 카메라에 붙어 다니는 하늘 배경: 그라데이션 + 해/달 + 별
const FRAG = /* glsl */ `
uniform vec3 uTop; uniform vec3 uBot; uniform float uNight; uniform float uTime; uniform vec2 uSun;
varying vec2 vUv;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
  vec3 c = mix(uBot, uTop, smoothstep(0.3, 1.0, vUv.y));
  vec2 d = (vUv - uSun) * vec2(1.7, 1.0);
  float r = length(d);
  c += exp(-r * r * 22.0) * mix(vec3(0.28, 0.22, 0.12), vec3(0.12, 0.14, 0.24), uNight);
  float disk = step(r, 0.032);
  float crescent = uNight * step(length(d - vec2(0.012, 0.01)), 0.028);
  c = mix(c, mix(vec3(1.0, 0.97, 0.86), vec3(0.93, 0.94, 1.0), uNight), disk * (1.0 - crescent * 0.85));
  vec2 sp = floor(vUv * vec2(300.0, 170.0));
  float s = step(0.993, h21(sp)) * uNight * smoothstep(0.35, 0.8, vUv.y);
  s *= 0.55 + 0.45 * sin(uTime * 1.7 + h21(sp + 3.1) * 40.0);
  c += s * vec3(1.0, 0.97, 0.9);
  gl_FragColor = vec4(c, 1.0);
}`;

export function createSkyBackdrop(camera: PerspectiveCamera): { fit: () => void } {
  const mat = new ShaderMaterial({
    uniforms: { uTop: { value: sky.top }, uBot: { value: sky.bot }, uNight: shared.uNight, uTime: shared.uTime, uSun: { value: sky.sunUv } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: FRAG,
    depthWrite: false,
  });
  const mesh = new Mesh(new PlaneGeometry(1, 1), mat);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  camera.add(mesh);
  const fit = () => {
    const d = camera.far * 0.95;
    const h = 2 * Math.tan(MathUtils.degToRad(camera.fov / 2)) * d;
    mesh.position.set(0, 0, -d);
    mesh.scale.set(h * camera.aspect * 1.02, h * 1.02, 1);
  };
  fit();
  return { fit };
}
