import { PerspectiveCamera, Vector3 } from 'three';
import { shared } from '../render/glsl';
import { Whale, type WhaleTint } from './whale';

// 같은 해역에서 헤엄치는 다른 고래지기 (프로토타입: 데모 봇)
export interface Bot {
  id: string; keeper: string; whale: string; stage: string; motto: string;
  w: Whale; base: Vector3; label: HTMLElement; phase: number; emoteUntil: number;
}

// pos: 가로 화면(누리 뒤편), pos2: 세로 화면(누리 앞쪽)에서 잘 보이는 자리
type Def = { keeper: string; whale: string; stage: string; motto: string; tint: WhaleTint; pos: [number, number]; pos2: [number, number]; scale: number };
const DEFS: Def[] = [
  { keeper: '윤슬', whale: '바람', stage: '너울', motto: '꽃구름 군도로 가는 길이에요', pos: [-9, -17], pos2: [17, -3.2], scale: 0.55,
    tint: { top: '#FFD6E4', side: '#E9B8D8', belly: '#FFF6E5', spot: '#FFFFFF' } },
  { keeper: '하늘빛', whale: '모래', stage: '도담', motto: '오늘은 구름낚시만 하려고요', pos: [10, -22], pos2: [24, 3.4], scale: 0.5,
    tint: { top: '#C7F0DE', side: '#A9D8E8', belly: '#FFF6E5', spot: '#FFF1A8' } },
  { keeper: '새벽달', whale: '온', stage: '윤슬', motto: '노을 해협에서 편지를 건졌어요', pos: [15, -11], pos2: [31, -1], scale: 0.6,
    tint: { top: '#FFE3C2', side: '#F3C1B0', belly: '#FFF6E5', spot: '#FFF1A8' } },
];

export class Bots {
  readonly list: Bot[] = [];
  private v = new Vector3();

  constructor(addToScene: (w: Whale) => void, labelLayer: HTMLElement) {
    DEFS.forEach((d, k) => {
      const w = new Whale(d.tint, k * 2.1 + 1, true);
      w.group.scale.setScalar(d.scale);
      w.group.position.set(d.pos[0], 0, d.pos[1]);
      addToScene(w);
      const label = document.createElement('button');
      label.className = 'nameplate';
      label.innerHTML = `<b>${d.keeper}</b><span>${d.whale} · ${d.stage}</span>`;
      labelLayer.appendChild(label);
      this.list.push({ id: `bot${k}`, keeper: d.keeper, whale: d.whale, stage: d.stage, motto: d.motto,
        w, base: new Vector3(d.pos[0], 0, d.pos[1]), label, phase: k * 1.7, emoteUntil: 0 });
    });
  }

  // 화면 방향이 바뀌면 다른 고래들이 천천히 보이는 자리로 헤엄쳐 감
  private portrait = false;
  layout(portrait: boolean, snap = false): void {
    this.portrait = portrait;
    if (snap) this.list.forEach((b, i) => { const p = portrait ? DEFS[i].pos2 : DEFS[i].pos; b.base.set(p[0], 0, p[1]); });
  }

  update(t: number, dt: number, cam: PerspectiveCamera, w: number, h: number): void {
    const k = shared.uCurve.value;
    this.list.forEach((b, i) => {
      const p = this.portrait ? DEFS[i].pos2 : DEFS[i].pos;
      const f = 1 - Math.exp(-dt * 0.6);
      b.base.x += (p[0] - b.base.x) * f;
      b.base.z += (p[1] - b.base.z) * f;
    });
    for (const b of this.list) {
      b.w.update(t);
      b.w.group.position.x = b.base.x + Math.sin(t * 0.05 + b.phase) * 4;
      b.w.group.position.z = b.base.z + Math.sin(t * 0.07 + b.phase * 2) * 1.5;
      b.w.group.rotation.y = Math.sin(t * 0.06 + b.phase) * 0.12;
      const p = b.w.group.position;
      const r = Math.max(Math.hypot(p.x, p.z) - 10, 0);
      this.v.set(p.x, p.y + 3.4 * b.w.group.scale.x - k * r * r, p.z).project(cam);
      const sx = ((this.v.x + 1) / 2) * w, sy = ((1 - this.v.y) / 2) * h;
      // 화면 밖이거나 위·아래 UI와 겹치면 이름표를 숨김
      const vis = this.v.z < 1 && sx > 50 && sx < w - 50 && sy > (h > w ? 170 : 110) && sy < h - (h > w ? 190 : 110);
      b.label.style.display = vis ? '' : 'none';
      b.label.style.transform = `translate(-50%, -100%) translate(${sx}px, ${sy}px)`;
      b.label.classList.toggle('greeting', b.emoteUntil > t);
    }
  }
}
