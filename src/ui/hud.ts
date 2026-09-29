import { iconImg, pixelCanvas } from '../art/pixel';

export type Item = 'seed' | 'berry' | 'wood' | 'bench' | 'note';
const ITEM: Record<Item, { name: string; icon: string }> = {
  seed: { name: '별딸기 씨앗', icon: 'seed' }, berry: { name: '별딸기', icon: 'berry' }, wood: { name: '하늘유목', icon: 'wood' },
  bench: { name: '나무 벤치', icon: 'bench' }, note: { name: '노래조각', icon: 'note' },
};
const noteIcon = () => {
  const img = new Image();
  img.src = pixelCanvas(16, 16, (c) => {
    c.fillStyle = '#ffdc72'; c.beginPath(); c.ellipse(5.5, 11.5, 3.2, 2.6, -0.4, 0, Math.PI * 2); c.fill();
    c.fillRect(8, 2, 2, 10); c.fillRect(8, 2, 5, 2); c.fillRect(11, 3, 2, 3);
    c.fillStyle = '#fffbdc'; c.fillRect(4, 10, 2, 1);
  }).toDataURL();
  img.className = 'px-icon';
  return img;
};
const icn = (name: string) => (name === 'note' ? noteIcon() : iconImg(name));
const h = (tag: string, cls: string, html = '') => Object.assign(document.createElement(tag), { className: cls, innerHTML: html });

export class Hud {
  private root: HTMLElement;
  private q: HTMLElement;
  private chip: HTMLElement;
  private bar: HTMLElement;
  private careBtn: HTMLElement;
  private toasts: HTMLElement;
  private banner: HTMLElement;
  private modalEl: HTMLElement;

  constructor(root: HTMLElement, on: { item: (i: Item) => void; care: () => void; menu: () => void; quest: () => void }) {
    this.root = h('div', 'hud');
    this.q = h('div', 'quest px', '<div class="q-label">지금 할 일</div><div class="q-title"></div><div class="q-hint"></div>');
    this.q.onclick = on.quest;
    const tr = h('div', 'topright');
    this.chip = h('div', 'chip px');
    const menu = h('button', 'btn2 px menu', '');
    menu.appendChild(iconImg('settings'));
    menu.onclick = on.menu;
    tr.append(this.chip, menu);
    this.bar = h('div', 'bar px');
    (Object.keys(ITEM) as Item[]).forEach((id) => {
      const b = h('button', 'slot px');
      b.dataset.id = id;
      b.title = ITEM[id].name;
      b.append(icn(ITEM[id].icon), h('b', 'cnt'));
      b.onclick = () => on.item(id);
      this.bar.appendChild(b);
    });
    this.careBtn = h('button', 'care-btn btn px', '<span>누리 돌보기</span>');
    this.careBtn.prepend(iconImg('care'));
    this.careBtn.onclick = on.care;
    this.toasts = h('div', 'toasts');
    this.banner = h('div', 'banner px hidden');
    this.modalEl = h('div', 'modal hidden');
    this.root.append(this.q, tr, this.bar, this.careBtn, this.toasts, this.banner, this.modalEl);
    root.appendChild(this.root);
  }

  quest(title: string, hint: string, flash = false): void {
    (this.q.querySelector('.q-title') as HTMLElement).textContent = title;
    (this.q.querySelector('.q-hint') as HTMLElement).textContent = hint;
    if (flash) { this.q.classList.remove('flash'); void this.q.offsetWidth; this.q.classList.add('flash'); }
  }
  place(name: string): void { this.chip.textContent = name; }
  items(inv: Record<Item, number>, highlight?: Item): void {
    this.bar.querySelectorAll<HTMLElement>('.slot').forEach((b) => {
      const id = b.dataset.id as Item;
      (b.querySelector('.cnt') as HTMLElement).textContent = inv[id] ? String(inv[id]) : '';
      b.classList.toggle('empty', !inv[id]);
      b.classList.toggle('on', id === highlight && inv[id] > 0);
    });
  }
  showCare(on: boolean): void { this.careBtn.classList.toggle('hidden', !on); }
  visible(on: boolean): void { this.root.classList.toggle('off', !on); }

  toast(text: string, icon?: Item | string): void {
    const t = h('div', 'toast px');
    if (icon) t.appendChild(icn(icon in ITEM ? ITEM[icon as Item].icon : icon));
    t.appendChild(document.createTextNode(text));
    this.toasts.appendChild(t);
    while (this.toasts.children.length > 3) this.toasts.firstElementChild?.remove();
    setTimeout(() => t.classList.add('bye'), 2600);
    setTimeout(() => t.remove(), 3100);
  }

  setBanner(text: string | null, onCancel?: () => void): void {
    this.banner.classList.toggle('hidden', !text);
    if (!text) return;
    this.banner.innerHTML = `<span>${text}</span>`;
    if (onCancel) {
      const b = h('button', 'btn2 px small', '취소');
      b.onclick = onCancel;
      this.banner.appendChild(b);
    }
  }

  modal(body: HTMLElement | null): void {
    this.modalEl.classList.toggle('hidden', !body);
    this.modalEl.replaceChildren(...(body ? [body] : []));
  }
}
