import { Color, ColorManagement, Vector3 } from 'three';

// 파스텔 색을 hex 그대로 쓰기 위해 색 관리 끔 (가장 먼저 평가되는 모듈)
ColorManagement.enabled = false;

// 모든 월드 셰이더가 같은 객체를 참조하는 공용 uniform (시간대·안개·빛)
export const shared = {
  uTime: { value: 0 },
  uSunDir: { value: new Vector3(0.4, 0.8, 0.45).normalize() },
  uLight: { value: new Color('#FFFFFF') },
  uShadow: { value: new Color('#ADA0E6') },
  uFog: { value: new Color('#E6F2FF') },
  uFogNear: { value: 38 },
  uFogFar: { value: 95 },
  uCurve: { value: 0.012 },
  uNight: { value: 0 },
  uCloudLight: { value: new Color('#FFFFFF') },
  uCloudShadow: { value: new Color('#CFC4F2') },
  uMist: { value: 0.3 },
  uFlow: { value: 0 }, // 구름이 흘러간 거리 (누리가 앞으로 헤엄친 거리)
};

export const COMMON = /* glsl */ `
uniform float uTime; uniform vec3 uSunDir; uniform vec3 uLight; uniform vec3 uShadow;
uniform vec3 uFog; uniform float uFogNear; uniform float uFogFar; uniform float uCurve;
uniform float uNight; uniform float uFlow;
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash12(i), hash12(i+vec2(1.,0.)), u.x), mix(hash12(i+vec2(0.,1.)), hash12(i+vec2(1.,1.)), u.x), u.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for(int i=0;i<4;i++){ v += a*vnoise(p); p = p*2.03 + 17.1; a *= 0.5; } return v; }
// 멀리 갈수록 아래로 휘는 '둥근 하늘' 효과
vec3 curveWorld(vec3 wp){ float r = max(length(wp.xz) - 10.0, 0.0); wp.y -= uCurve * r * r; return wp; }
// 툰 3단 명암 + 보랏빛 그림자
vec3 toon(vec3 base, vec3 n, vec3 viewDir){
  float d = dot(normalize(n), normalize(uSunDir));
  float band = d > 0.5 ? 1.0 : (d > 0.05 ? 0.78 : 0.56);
  vec3 c = base * mix(uShadow, mix(vec3(1.0), uLight, 0.5), band);
  float rim = pow(1.0 - max(dot(normalize(n), viewDir), 0.0), 3.0);
  return c + rim * 0.12 * uLight;
}
vec3 applyFog(vec3 c, float dist){ return mix(c, uFog, smoothstep(uFogNear, uFogFar, dist)); }
float bayer4(vec2 p){ ivec2 q = ivec2(mod(floor(p), 4.0));
  float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
  return (m[q.x + q.y * 4] + 0.5) / 16.0; }
`;
