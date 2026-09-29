import { iconImg } from '../world/pixelArt';

export type Act = 'care' | 'build' | 'bag' | 'voyage' | 'friends' | 'settings' | 'wave';

const h = (tag: string, cls = '', html = ''): HTMLElement => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

// 화면 위 UI (가로: 오른쪽 아래 버튼 묶음 / 세로: 아래 탭 바)
export class Hud {
  readonly labels: HTMLElement;
  private hud: HTMLElement;
  private sheet: HTMLElement;
  private modal: HTMLElement;
  private toasts: HTMLElement;
  private q = <T extends HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T;

  constructor(private root: HTMLElement, onAct: (a: Act) => void) {
    this.labels = h('div', 'labels');
    this.hud = h('div', 'hud', `
      <div class="hud-top">
        <div class="card place"><span data-i="whale"></span><div class="col"><b class="region">새벽 여울</b><span class="clock"></span></div></div>
        <div class="card nuri"><div class="col"><b>누리 <small>도담</small></b><div class="bond"><i></i></div><span class="bond-t"></span></div></div>
        <div class="grow"></div>
        <div class="pill"><span data-i="shell"></span><span class="shells"></span></div>
        <div class="pill"><span data-i="pearl"></span><span class="pearls"></span></div>
        <button class="round" data-act="settings" aria-label="설정"><span data-i="settings"></span></button>
      </div>
      <div class="voyage-bar hidden"><span class="vtext"></span><div class="vprog"><i></i></div></div>
      <div class="hud-actions">
        <button class="act main" data-act="care"><span data-i="care"></span><span>돌보기</span></button>
        <button class="act" data-act="build"><span data-i="build"></span><span>꾸미기</span></button>
        <button class="act" data-act="bag"><span data-i="bag"></span><span>가방</span></button>
        <button class="act" data-act="voyage"><span data-i="voyage"></span><span>항해</span></button>
        <button class="act" data-act="friends"><span data-i="friends"></span><span>이웃</span></button>
      </div>
      <button class="act wave" data-act="wave"><span data-i="wave"></span><span>꼬리 인사</span></button>
      <div class="toasts"></div>`);
    this.sheet = h('div', 'sheet', `<div class="sheet-head"><b class="sheet-title"></b>
      <button class="round sheet-x" aria-label="닫기"><span data-i="close"></span></button></div><div class="sheet-body"></div>`);
    this.modal = h('div', 'modal hidden', '<div class="modal-card"></div>');
    root.append(this.labels, this.hud, this.sheet, this.modal);
    root.querySelectorAll<HTMLElement>('[data-i]').forEach((s) => s.replaceWith(iconImg(s.dataset.i!)));
    root.querySelectorAll<HTMLButtonElement>('[data-act]').forEach((b) => { b.onclick = () => onAct(b.dataset.act as Act); });
    this.q<HTMLButtonElement>('.sheet-x', this.sheet).onclick = () => this.closeSheet();
    this.toasts = this.q('.toasts', this.hud);
  }

  setClock(t: string): void { this.q('.clock', this.hud).textContent = t; }
  setRegion(t: string): void { this.q('.region', this.hud).textContent = t; }
  setCurrency(shells: number, pearls: number): void {
    this.q('.shells', this.hud).textContent = shells.toLocaleString('ko-KR');
    this.q('.pearls', this.hud).textContent = String(pearls);
  }
  setBond(level: number, xp: number): void {
    this.q('.bond i', this.hud).style.width = `${Math.round(xp * 100)}%`;
    this.q('.bond-t', this.hud).textContent = `교감 ${level}단계`;
  }
  setVisible(on: boolean): void { this.hud.classList.toggle('off', !on); this.labels.classList.toggle('off', !on); }

  toast(text: string, icon?: string): void {
    const t = h('div', 'toast');
    if (icon) t.appendChild(iconImg(icon));
    t.appendChild(document.createTextNode(text));
    this.toasts.appendChild(t);
    while (this.toasts.children.length > 3) this.toasts.firstElementChild?.remove();
    setTimeout(() => t.classList.add('bye'), 2400);
    setTimeout(() => t.remove(), 2900);
  }

  setVoyage(text: string | null, p = 0): void {
    const bar = this.q('.voyage-bar', this.hud);
    bar.classList.toggle('hidden', !text);
    if (!text) return;
    this.q('.vtext', bar).textContent = text;
    this.q('.vprog i', bar).style.width = `${Math.round(p * 100)}%`;
  }

  openSheet(title: string, body: HTMLElement): void {
    this.q('.sheet-title', this.sheet).textContent = title;
    const b = this.q('.sheet-body', this.sheet);
    b.replaceChildren(body);
    this.sheet.classList.add('open');
  }
  closeSheet(): void { this.sheet.classList.remove('open'); }
  get sheetOpen(): boolean { return this.sheet.classList.contains('open'); }

  showModal(body: HTMLElement): void {
    this.q('.modal-card', this.modal).replaceChildren(body);
    this.modal.classList.remove('hidden');
    requestAnimationFrame(() => this.modal.classList.add('show'));
  }
  hideModal(): void {
    this.modal.classList.remove('show');
    setTimeout(() => this.modal.classList.add('hidden'), 250);
  }

  // 시작 화면 (첫 터치에서 소리 켜기)
  showTitle(onStart: () => void): void {
    const t = h('div', 'title-screen', `
      <div class="logo"><span class="ko">구름고래 항해기</span><span class="en">Cloudwhale Voyage</span></div>
      <p class="tag">오랜만에 올려다본 하늘에서,<br/>아기 고래가 당신의 노래에 대답했다.</p>
      <button class="start">하늘로 가기</button>
      <p class="fine">UX 프로토타입 · 소리를 켜고 들어 보세요 · 가로·세로 모두 지원</p>`);
    this.root.appendChild(t);
    this.setVisible(false);
    this.q<HTMLButtonElement>('.start', t).onclick = () => {
      t.classList.add('bye');
      setTimeout(() => t.remove(), 700);
      this.setVisible(true);
      onStart();
    };
  }
}
