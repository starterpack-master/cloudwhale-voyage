import { Color, Vector2, Vector3 } from 'three';
import { shared } from '../render/glsl';

// 하늘 시계: 모든 유저가 같은 하늘을 본다 (1 하늘일 = 실제 2시간)
export const SKY_DAY_MS = 2 * 60 * 60 * 1000;
const SKY_EPOCH = Date.UTC(2026, 0, 1);
export type PhaseName = 'day' | 'sunset' | 'night' | 'dawn';
export const PHASE_KO: Record<PhaseName, string> = { day: '낮', sunset: '노을', night: '밤', dawn: '새벽' };

interface Key { p: number; top: string; bot: string; fog: string; cl: string; cs: string; light: string; shadow: string; night: number; mist: number; }
const DAY = { top: '#9ED0FF', bot: '#EAF6FF', fog: '#E3F0FF', cl: '#FFFFFF', cs: '#CFC4F2', light: '#FFFFFF', shadow: '#ADA0E6', night: 0, mist: 0.2 };
const NIGHT = { top: '#1E2655', bot: '#46548F', fog: '#3C4680', cl: '#9AA8E0', cs: '#4A5294', light: '#B4C0F4', shadow: '#4A4A96', night: 1, mist: 0.45 };
const KEYS: Key[] = [
  { p: 0.0, top: '#BFD9FF', bot: '#FFE6EC', fog: '#FBE6EE', cl: '#FFFFFF', cs: '#D9C7EE', light: '#FFF4EA', shadow: '#B9A6E0', night: 0, mist: 0.85 },
  { p: 0.1, ...DAY },
  { p: 0.6, ...DAY },
  { p: 0.7, top: '#B79BE6', bot: '#FFC9A8', fog: '#FFD3C2', cl: '#FFE9D6', cs: '#C29ACB', light: '#FFE2C4', shadow: '#9C83C9', night: 0.15, mist: 0.35 },
  { p: 0.76, top: '#5A5AA8', bot: '#E7A6B8', fog: '#B99AC8', cl: '#D8C2E4', cs: '#7F6FB0', light: '#D9C8F0', shadow: '#6E62A8', night: 0.6, mist: 0.4 },
  { p: 0.84, ...NIGHT },
  { p: 0.9, ...NIGHT },
  { p: 0.95, top: '#7F8FD8', bot: '#FFC4CF', fog: '#F2C9D8', cl: '#FFEAF0', cs: '#B6A3DA', light: '#FFE2EA', shadow: '#9C8ACB', night: 0.4, mist: 0.9 },
];
const PREVIEW: Record<PhaseName, number> = { day: 0.35, sunset: 0.71, night: 0.86, dawn: 0.96 };

export const sky = {
  phase: 0,
  name: 'day' as PhaseName,
  preview: null as PhaseName | null,
  top: new Color(),
  bot: new Color(),
  sunUv: new Vector2(0.8, 0.82),
};

export function realPhase(now = Date.now()): number {
  const t = (now - SKY_EPOCH) % SKY_DAY_MS;
  return (t < 0 ? t + SKY_DAY_MS : t) / SKY_DAY_MS;
}

export function phaseName(p: number): PhaseName {
  if (p < 0.667) return 'day';
  if (p < 0.75) return 'sunset';
  if (p < 0.917) return 'night';
  return 'dawn';
}

// 하늘 시각 표시: 낮 06~18시, 노을 18~20시, 밤 20~04시, 새벽 04~06시
export function clockLabel(p: number): string {
  let h: number;
  if (p < 0.667) h = 6 + (p / 0.667) * 12;
  else if (p < 0.75) h = 18 + ((p - 0.667) / 0.083) * 2;
  else if (p < 0.917) h = 20 + ((p - 0.75) / 0.167) * 8;
  else h = 4 + ((p - 0.917) / 0.083) * 2;
  h %= 24;
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60 / 10) * 10;
  return `${PHASE_KO[phaseName(p)]} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

const cA = new Color();
const cB = new Color();
function mixHex(out: Color, a: string, b: string, t: number): void {
  cA.set(a); cB.set(b); out.copy(cA).lerp(cB, t);
}
const sun = new Vector3();
const moon = new Vector3(-0.35, 0.85, 0.45).normalize();

export function updateSky(now = Date.now()): void {
  const p = sky.preview ? PREVIEW[sky.preview] : realPhase(now);
  sky.phase = p;
  sky.name = phaseName(p);
  let i = KEYS.length - 1;
  for (let k = 0; k < KEYS.length; k++) if (KEYS[k].p <= p) i = k;
  const a = KEYS[i];
  const b = KEYS[(i + 1) % KEYS.length];
  const span = (b.p > a.p ? b.p : b.p + 1) - a.p;
  const t = span > 0 ? Math.min(1, (p - a.p) / span) : 0;
  const s = t * t * (3 - 2 * t);
  mixHex(sky.top, a.top, b.top, s);
  mixHex(sky.bot, a.bot, b.bot, s);
  mixHex(shared.uFog.value, a.fog, b.fog, s);
  mixHex(shared.uCloudLight.value, a.cl, b.cl, s);
  mixHex(shared.uCloudShadow.value, a.cs, b.cs, s);
  mixHex(shared.uLight.value, a.light, b.light, s);
  mixHex(shared.uShadow.value, a.shadow, b.shadow, s);
  const night = a.night + (b.night - a.night) * s;
  shared.uNight.value = night;
  shared.uMist.value = a.mist + (b.mist - a.mist) * s;
  // 해: 낮 동안 동→서로, 밤엔 달빛
  const dayT = Math.min(p / 0.74, 1);
  sun.set(Math.cos(dayT * Math.PI) * 0.8, 0.25 + Math.sin(Math.PI * dayT) * 0.8, 0.55).normalize();
  shared.uSunDir.value.copy(sun).lerp(moon, night).normalize();
  sky.sunUv.set(0.86 - dayT * 0.5, 0.62 + Math.sin(Math.PI * dayT) * 0.28);
  if (night > 0.5) sky.sunUv.set(0.24, 0.84);
}
