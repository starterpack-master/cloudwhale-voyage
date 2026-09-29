import type { BackSave } from '../world/back';
import type { PropKind } from '../world/props';
import type { Fortune } from '../care/careMode';

// 저장 데이터 (프로토타입: localStorage)
export type ItemId = 'berry' | 'seed' | 'cotton' | 'wood' | 'pearl';
export const ITEMS: Record<ItemId, { name: string; icon: string; desc: string }> = {
  berry: { name: '별딸기', icon: 'berry', desc: '밤하늘처럼 반짝이는 딸기. 누리가 제일 좋아하는 간식이에요.' },
  seed: { name: '별딸기 씨앗', icon: 'seed', desc: '이끼흙에 심으면 금방 싹이 올라와요.' },
  cotton: { name: '구름솜', icon: 'cotton', desc: '누리가 헤엄치며 걸러 모은 폭신한 구름. 천과 가구의 재료예요.' },
  wood: { name: '하늘유목', icon: 'wood', desc: '구름바다를 떠돌던 나무. 가구와 오두막을 짓는 데 써요.' },
  pearl: { name: '하늘진주', icon: 'pearl', desc: '따개비를 떼어 낸 자리에서 나온 작은 진주.' },
};

export interface SaveData {
  v: 1;
  lastSeen: number;
  shells: number;
  inv: Record<ItemId, number>;
  props: Record<PropKind, number>;
  bond: number;
  bondXp: number;
  fortuneDay: string;
  fortune: Fortune | null;
  back: BackSave | null;
  voyage: { to: string; departedAt: number; durMs: number } | null;
}

const KEY = 'cloudwhale-proto-v1';

export function dayKey(now = Date.now()): string {
  const d = new Date(now - 6 * 3600_000); // 오전 6시에 하루가 바뀜
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function fresh(): SaveData {
  return {
    v: 1, lastSeen: 0, shells: 1240,
    inv: { berry: 2, seed: 6, cotton: 4, wood: 3, pearl: 0 },
    props: { pot: 3, lantern: 2, bench: 1, fence: 4, crate: 2, chime: 1 },
    bond: 2, bondXp: 0.35, fortuneDay: '', fortune: null, back: null, voyage: null,
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...fresh(), ...(JSON.parse(raw) as Partial<SaveData>) } as SaveData;
  } catch { /* 새로 시작 */ }
  return fresh();
}

export function persist(s: SaveData): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* 저장 공간 부족 등 */ }
}

export function resetSave(): void {
  localStorage.removeItem(KEY);
}

// 방치 보상: 마지막 접속 이후 흐른 시간만큼 (최대 12시간)
export interface Journal { away: string; items: [ItemId | 'shell', number][]; note: string; first: boolean; }
const CAP = 12 * 3600_000;
const NOTES = [
  '누리가 분홍빛 구름을 세 번이나 들이마셨어. 덕분에 구름솜이 두둑해.',
  '해 질 녘에 먼 고래 울음이 들렸어. 누리가 한참 귀를 기울이더라.',
  '떠내려온 나무 상자를 건졌는데, 안에는 마른 꽃잎뿐이었어. 그래도 향은 좋았지.',
  '누리가 자다가 꼬리를 한 번 크게 흔들었어. 좋은 꿈을 꾼 모양이야.',
  '알바트로스 한 마리가 누리 머리에 앉았다 갔어. 포롱은 아니었어. 길을 잘 찾는 걸 보니.',
];

export function journalFor(s: SaveData, now: number): Journal {
  if (!s.lastSeen) {
    return { away: '', first: true, note: '반가워. 나는 뽀뽀, 누리 볼에 붙어 사는 빨판상어야. 누리 등은 좁지만 꽤 아늑하다고.',
      items: [['seed', 6], ['cotton', 4], ['wood', 3], ['shell', 1240]] };
  }
  const ms = Math.min(Math.max(0, now - s.lastSeen), CAP);
  const min = Math.floor(ms / 60000);
  const items: Journal['items'] = [
    ['cotton', Math.floor(min / 8)], ['wood', Math.floor(min / 20)], ['shell', Math.min(min * 2, 900)],
  ];
  if (min >= 30) items.push(['seed', Math.floor(min / 30)]);
  const h = Math.floor(min / 60);
  return { away: h ? `${h}시간 ${min % 60}분` : `${min}분`, first: false, note: NOTES[Math.floor(now / 3600_000) % NOTES.length], items: items.filter(([, n]) => n > 0) };
}

export function applyJournal(s: SaveData, j: Journal): void {
  if (j.first) return; // 첫 방문 보상은 fresh()에 이미 들어 있음
  for (const [id, n] of j.items) {
    if (id === 'shell') s.shells += n;
    else s.inv[id] += n;
  }
}
