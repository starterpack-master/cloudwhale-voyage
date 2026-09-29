import type { MapId } from './maps';

// 저장 데이터 (브라우저 localStorage)
export interface Crop { stage: number; watered: boolean; t: number }
export interface GameState {
  v: 2;
  step: number;                       // 이야기 진행 단계 (story.ts STEPS 인덱스)
  count: number;                      // 현재 단계의 진행 수 (심기 0/3 같은)
  inv: { seed: number; berry: number; wood: number; bench: number; note: number };
  crops: Record<string, Crop>;        // "i,j" → 작물
  placed: { tex: string; tx: number; ty: number }[];
  woodTaken: string[];
  map: MapId;
  pos: [number, number];
  bond: number;
  prologue: boolean;
  muted: boolean;
}

const KEY = 'cloudwhale-v2';

export function fresh(): GameState {
  return {
    v: 2, step: 0, count: 0, inv: { seed: 0, berry: 0, wood: 0, bench: 0, note: 0 }, crops: {}, placed: [],
    woodTaken: [], map: 'whale', pos: [21, 16], bond: 0, prologue: false, muted: false,
  };
}

export const state: GameState = (() => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as GameState;
      if (s.v === 2) return { ...fresh(), ...s };
    }
  } catch { /* 새로 시작 */ }
  return fresh();
})();

export function save(): void {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* 저장 공간 부족 */ }
}

export function resetAll(): void {
  localStorage.removeItem(KEY);
  location.reload();
}
