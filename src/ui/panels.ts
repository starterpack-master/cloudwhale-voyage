import { iconImg } from '../world/pixelArt';
import { ITEMS, type ItemId, type Journal, type SaveData } from '../core/state';
import { PROP_INFO, type PropKind } from '../world/props';
import type { Bot } from '../world/bots';
import type { PhaseName } from '../core/sky';

const el = (tag: string, cls = '', html = ''): HTMLElement => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

export function bagPanel(s: SaveData): HTMLElement {
  const wrap = el('div', 'bag');
  const grid = el('div', 'slots');
  const info = el('p', 'slot-info', '물건을 누르면 설명이 보여요');
  (Object.keys(ITEMS) as ItemId[]).forEach((id) => {
    const b = el('button', 'slot');
    b.append(iconImg(ITEMS[id].icon), el('b', '', String(s.inv[id])), el('span', '', ITEMS[id].name));
    b.onclick = () => { info.textContent = `${ITEMS[id].name} — ${ITEMS[id].desc}`; grid.querySelectorAll('.slot').forEach((x) => x.classList.toggle('on', x === b)); };
    grid.appendChild(b);
  });
  wrap.append(grid, info);
  return wrap;
}

export const DESTS = [
  { name: '새벽 여울', note: '누리의 고향 · 지금 머무는 곳', lock: '', hours: 0 },
  { name: '꽃구름 군도', note: '봄 · 잠든 고래 해솔이 있는 곳', lock: '', hours: 2 },
  { name: '적운 고원', note: '여름 · 폭풍의 눈', lock: '2장에서 열려요', hours: 3 },
  { name: '노을 해협', note: '가을 · 노을빛 편지', lock: '3장에서 열려요', hours: 3 },
  { name: '오로라 빙운해', note: '겨울 · 오로라 아래 온기', lock: '4장에서 열려요', hours: 4 },
  { name: '별의 바다', note: '밤 · 별이 헤엄치는 곳', lock: '5장에서 열려요', hours: 4 },
];

export function voyagePanel(s: SaveData, onGo: (name: string, hours: number) => void): HTMLElement {
  const wrap = el('div', 'voyage');
  wrap.appendChild(el('p', 'lead', '목적지를 정하고 누리를 재우면, 접속하지 않는 동안에도 누리가 헤엄쳐 가요.'));
  DESTS.forEach((d, i) => {
    const row = el('div', `dest${d.lock ? ' locked' : ''}${i === 0 ? ' here' : ''}`);
    row.append(el('div', 'dn', `<b>${d.name}</b><span>${d.note}</span>`));
    const going = s.voyage?.to === d.name;
    const btn = el('button', 'mini', i === 0 ? '현재 위치' : d.lock ? d.lock : going ? '항해 중' : `${d.hours}시간 항해`);
    (btn as HTMLButtonElement).disabled = i === 0 || !!d.lock || going;
    btn.onclick = () => onGo(d.name, d.hours);
    row.appendChild(btn);
    wrap.appendChild(row);
  });
  return wrap;
}

export function friendsPanel(bots: Bot[], onGreet: (b: Bot) => void): HTMLElement {
  const wrap = el('div', 'friends');
  wrap.appendChild(el('p', 'lead', '같은 해역에서 헤엄치는 고래지기들이에요. (프로토타입에서는 데모 고래지기가 보여요)'));
  for (const b of bots) {
    const row = el('div', 'friend');
    row.append(iconImg('whale'), el('div', 'dn', `<b>${b.keeper}</b><span>${b.whale} · ${b.stage} — “${b.motto}”</span>`));
    const g = el('button', 'mini', '인사하기');
    g.onclick = () => onGreet(b);
    const v = el('button', 'mini ghost', '놀러 가기');
    (v as HTMLButtonElement).disabled = true;
    v.title = '다음 단계에서 열려요';
    row.append(g, v);
    wrap.appendChild(row);
  }
  wrap.appendChild(el('p', 'fine', '선단 초대, 고래 방문, 우편은 다음 단계에서 열려요.'));
  return wrap;
}

export interface SettingsOpts {
  muted: boolean; preview: PhaseName | null;
  onMute: (m: boolean) => void; onPreview: (p: PhaseName | null) => void; onReset: () => void;
}
export function settingsPanel(o: SettingsOpts): HTMLElement {
  const wrap = el('div', 'settings');
  const snd = el('div', 'row', '<span>소리</span>');
  const sb = el('button', 'mini', o.muted ? '꺼짐' : '켜짐');
  sb.onclick = () => { o.muted = !o.muted; sb.textContent = o.muted ? '꺼짐' : '켜짐'; o.onMute(o.muted); };
  snd.appendChild(sb);
  const pv = el('div', 'row col', '<span>하늘 시간 미리보기</span>');
  const seg = el('div', 'seg');
  const opts: [PhaseName | null, string][] = [[null, '실제 하늘'], ['dawn', '새벽'], ['day', '낮'], ['sunset', '노을'], ['night', '밤']];
  for (const [p, label] of opts) {
    const b = el('button', o.preview === p ? 'on' : '', label);
    b.onclick = () => { seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); o.onPreview(p); };
    seg.appendChild(b);
  }
  pv.appendChild(seg);
  pv.appendChild(el('p', 'fine', '모든 고래지기는 같은 하늘을 봐요. 하늘의 하루는 실제 2시간이에요.'));
  const rs = el('div', 'row', '<span>처음부터 다시</span>');
  const rb = el('button', 'mini warn', '저장 지우기');
  rb.onclick = () => { if (confirm('저장된 진행을 지우고 처음부터 시작할까요?')) o.onReset(); };
  rs.appendChild(rb);
  wrap.append(snd, pv, rs, el('p', 'fine', '구름고래 항해기 · UX 프로토타입 v0.1'));
  return wrap;
}

export function journalCard(j: Journal, onClaim: () => void): HTMLElement {
  const wrap = el('div', 'journal');
  wrap.appendChild(el('div', 'jhead', j.first ? '<b>첫 번째 항해 일지</b><span>누리의 등 위에서 눈을 떴어요</span>' : `<b>항해 일지</b><span>누리가 ${j.away} 동안 헤엄쳤어요</span>`));
  const list = el('div', 'jitems');
  for (const [id, n] of j.items) {
    const it = el('div', 'jitem');
    it.append(iconImg(id === 'shell' ? 'shell' : ITEMS[id].icon), el('span', '', id === 'shell' ? '조가비' : ITEMS[id].name), el('b', '', `+${n.toLocaleString('ko-KR')}`));
    list.appendChild(it);
  }
  wrap.append(list, el('p', 'note', `<span>뽀뽀의 메모</span>${j.note}`));
  const b = el('button', 'big', '받기');
  b.onclick = onClaim;
  wrap.appendChild(b);
  return wrap;
}

// 꾸미기 모드 하단 바
export class BuildBar {
  readonly el = el('div', 'buildbar hidden');
  private items = el('div', 'bitems');
  private hint = el('div', 'bhint', '놓을 소품을 고르고, 누리 등 위의 빈칸을 눌러 주세요');
  constructor(onSelect: (k: PropKind) => void, onRotate: () => void, onDone: () => void) {
    const tools = el('div', 'btools');
    const rot = el('button', 'mini', '');
    rot.append(iconImg('rotate'), document.createTextNode('돌리기'));
    rot.onclick = onRotate;
    const done = el('button', 'mini main', '완료');
    done.onclick = onDone;
    tools.append(rot, done);
    (Object.keys(PROP_INFO) as PropKind[]).forEach((k) => {
      const b = el('button', 'bitem');
      b.dataset.k = k;
      b.append(iconImg(k), el('span', '', PROP_INFO[k].name), el('b', 'cnt', ''));
      b.onclick = () => onSelect(k);
      this.items.appendChild(b);
    });
    this.el.append(this.hint, this.items, tools);
  }
  update(counts: Record<PropKind, number>, sel: PropKind | null, hint?: string): void {
    this.items.querySelectorAll<HTMLElement>('.bitem').forEach((b) => {
      const k = b.dataset.k as PropKind;
      b.classList.toggle('on', k === sel);
      b.classList.toggle('empty', counts[k] <= 0);
      (b.querySelector('.cnt') as HTMLElement).textContent = `×${counts[k]}`;
    });
    if (hint) this.hint.textContent = hint;
  }
  show(on: boolean): void { this.el.classList.toggle('hidden', !on); }
}
