import { marFrames, moaFrames, playerFrames, popoFrames } from '../art/chars';
import { sign } from '../art/objects';
import { icon } from '../art/pixel';
import { make } from '../art/draw';
import { audio } from '../audio/audio';
import type { Line, Who } from '../game/story';

const NAME: Record<Who, string> = { popo: '뽀뽀', moa: '모아 할머니', mar: '마르', me: '나', nuri: '누리', sign: '표지판', narr: '' };

// 대화 초상화: 스프라이트를 32×32 칸 가운데에
function portrait(who: Who): HTMLCanvasElement | null {
  const src = who === 'popo' ? popoFrames()[0] : who === 'moa' ? moaFrames()[0] : who === 'mar' ? marFrames()[0]
    : who === 'me' ? playerFrames('down')[0] : who === 'sign' ? sign() : who === 'nuri' ? icon('whale') : null;
  if (!src) return null;
  return make(32, 32, (g) => g.ctx.drawImage(src, Math.floor((32 - src.width) / 2), Math.floor((32 - src.height) / 2) + 2));
}
const faces = new Map<Who, string>();
const faceURL = (who: Who) => {
  if (!faces.has(who)) faces.set(who, portrait(who)?.toDataURL() ?? '');
  return faces.get(who)!;
};

export class Dialog {
  private el: HTMLElement;
  private face: HTMLImageElement;
  private name: HTMLElement;
  private text: HTMLElement;
  private lines: Line[] = [];
  private i = 0;
  private shown = 0;
  private timer = 0;
  private done: (() => void) | null = null;
  open = false;

  constructor(private root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'dlg hidden';
    this.el.innerHTML = '<div class="dlg-face"><img alt=""></div><div class="dlg-body"><div class="dlg-name"></div><div class="dlg-text"></div><div class="dlg-next">▼</div></div>';
    root.appendChild(this.el);
    this.face = this.el.querySelector('img')!;
    this.name = this.el.querySelector('.dlg-name')!;
    this.text = this.el.querySelector('.dlg-text')!;
    this.el.addEventListener('pointerup', (e) => { e.stopPropagation(); this.advance(); });
  }

  say(lines: Line[], onDone?: () => void): void {
    this.lines = lines;
    this.i = 0;
    this.done = onDone ?? null;
    this.open = true;
    this.el.classList.remove('hidden');
    this.root.classList.add('talking'); // 대화 중에는 아래쪽 HUD를 숨긴다
    this.show();
  }

  private show(): void {
    const l = this.lines[this.i];
    const url = faceURL(l.who);
    this.el.classList.toggle('narr', l.who === 'narr');
    this.face.src = url;
    (this.face.parentElement as HTMLElement).style.display = url ? '' : 'none';
    this.name.textContent = NAME[l.who];
    this.name.style.display = NAME[l.who] ? '' : 'none';
    this.shown = 0;
    this.text.textContent = '';
    clearInterval(this.timer);
    this.timer = window.setInterval(() => {
      this.shown++;
      this.text.textContent = l.text.slice(0, this.shown);
      if (this.shown % 2 === 0 && l.text[this.shown - 1] !== ' ') audio.blip(l.who === 'moa' ? 0.8 : l.who === 'popo' ? 1.25 : 1);
      if (this.shown >= l.text.length) clearInterval(this.timer);
    }, 32);
  }

  private advance(): void {
    const l = this.lines[this.i];
    if (!l) return;
    if (this.shown < l.text.length) {
      clearInterval(this.timer);
      this.shown = l.text.length;
      this.text.textContent = l.text;
      return;
    }
    this.i++;
    if (this.i < this.lines.length) { audio.ui(); this.show(); return; }
    this.open = false;
    this.el.classList.add('hidden');
    this.root.classList.remove('talking');
    const d = this.done;
    this.done = null;
    d?.();
  }
}
