import Phaser from 'phaser';
import { C, make } from '../art/draw';
import { audio } from '../audio/audio';
import { ui } from '../ui/ui';
import { save, state } from './state';
import type { Line } from './story';
import { registerTextures } from './textures';

const W = 480, H = 270;

// 노을 진 도시 (480×270)
function city(): HTMLCanvasElement {
  return make(W, H, (g) => {
    const sky = ['#b9a6e8', '#cdb0e6', '#e0b7de', '#f2bfd2', '#ffcbc4', '#ffd8bc'];
    sky.forEach((c, k) => g.r(0, k * 30, W, 30, c));
    for (let k = 1; k < sky.length; k++) for (let x = (k % 2) * 2; x < W; x += 4) g.p(x, k * 30, sky[k - 1]);
    g.e(360, 172, 26, 26, '#ffe7c4');
    g.e(360, 172, 20, 20, '#fff4dc');
    // 먼 빌딩 (연한 색, 뒤쪽)
    for (let bx = -10, k = 0; bx < W; k++) {
      const bw = 18 + ((k * 7) % 3) * 10, bh = 70 + ((k * 13) % 5) * 22;
      g.r(bx, H - 36 - bh, bw, bh, '#b3a1e0');
      if (k % 3 === 0) g.r(bx + 4, H - 36 - bh - 6, 2, 6, '#b3a1e0');
      bx += bw + 3;
    }
    const R = [3, 7, 5, 9, 4, 8, 6, 5, 7, 4, 9, 6, 3, 8, 5, 7];
    let x = 0;
    R.forEach((r, k) => {
      const bw = 22 + (r % 4) * 7, bh = 40 + r * 9;
      g.r(x, H - 36 - bh, bw, bh, k % 2 ? '#7a64b4' : '#6b56a6');
      g.r(x, H - 36 - bh, bw, 2, '#8a74c4');
      if (k % 4 === 1) { g.r(x + bw - 9, H - 36 - bh - 7, 6, 7, '#6b56a6'); g.r(x + bw - 8, H - 36 - bh - 9, 4, 2, '#6b56a6'); }
      if (k % 5 === 2) g.r(x + 5, H - 36 - bh - 12, 1, 12, '#6b56a6');
      for (let wy = H - 30 - bh; wy < H - 44; wy += 9) for (let wx = x + 4; wx < x + bw - 4; wx += 7) if ((wx * 7 + wy * 3 + k) % 5 < 2) g.r(wx, wy, 3, 4, C.butter[1]);
      x += bw + 2;
    });
    g.r(0, H - 36, W, 36, '#5e4f96');
    g.r(0, H - 36, W, 2, '#8069bd');
    for (let q = 10; q < W; q += 40) g.r(q, H - 18, 20, 2, '#8069bd');
  });
}

export class PrologueScene extends Phaser.Scene {
  private waiting = true;
  constructor() { super('prologue'); }

  create(): void {
    registerTextures(this);
    if (!this.textures.exists('city')) this.textures.addCanvas('city', city());
    this.add.image(0, 0, 'city').setOrigin(0);
    const puffs = [0, 1, 2, 0].map((k, i) => this.add.image(60 + i * 120, 40 + (i % 2) * 30, `puff${k}`).setAlpha(0.85));
    this.tweens.add({ targets: puffs, x: '-=40', duration: 20000 });
    const me = this.add.sprite(W / 2, H - 22, 'pl_up', 0).setOrigin(0.5, 1);
    const fit = () => {
      const sw = this.scale.width, sh = this.scale.height;
      const z = Math.max(1, Math.round(Math.max(sw / W, sh / H)));
      // 화면 아래를 길바닥에 맞추고, 남는 위쪽은 하늘색 배경이 채움
      this.cameras.main.setZoom(z).setBackgroundColor('#b9a6e8').centerOn(W / 2, H - sh / z / 2);
    };
    fit();
    this.scale.on('resize', fit);
    this.events.once('shutdown', () => this.scale.off('resize', fit));
    this.data.set('me', me);
  }

  // 시작 화면에서 "시작" 을 누르면 호출
  begin(): void {
    if (!this.waiting) return;
    this.waiting = false;
    const me = this.data.get('me') as Phaser.GameObjects.Sprite;
    const n = (text: string): Line => ({ who: 'narr', text });
    ui.dlg.say([
      n('퇴근길. 오늘도 고개를 숙인 채 걷고 있었다.'),
      n('신호를 기다리다 문득 올려다본 하늘에, 노을빛 구름이 천천히 흘러간다.'),
      { who: 'me', text: '…하늘을 본 게 언제였더라.' },
      n('나도 모르게, 어릴 적 흥얼거리던 노래가 입가에 맴돈다.'),
    ], () => {
      this.notes(me);
      this.time.delayedCall(1800, () => {
        audio.whaleCall(0, 1.4);
        const shadow = this.add.image(W + 80, 70, 'fluke').setTint(0xffffff).setAlpha(0.35).setScale(0.8);
        this.tweens.add({ targets: shadow, x: -80, duration: 5200, ease: 'Sine.inOut' });
        ui.dlg.say([n('그때 구름 너머에서, 길고 낮은 울음이 대답했다.'), n('바람이 확 불어오고, 발밑이 가벼워진다.')], () => this.fly(me));
      });
    });
  }

  private notes(me: Phaser.GameObjects.Sprite): void {
    for (let k = 0; k < 6; k++) {
      this.time.delayedCall(k * 260, () => {
        const t = this.add.text(me.x + (Math.random() - 0.5) * 10, me.y - 26, '♪', { fontFamily: 'Galmuri11', fontSize: '10px', color: '#fffaf0' });
        this.tweens.add({ targets: t, y: t.y - 36, x: t.x + (Math.random() - 0.5) * 20, alpha: 0, duration: 1600, onComplete: () => t.destroy() });
      });
    }
  }

  private fly(me: Phaser.GameObjects.Sprite): void {
    audio.spout();
    this.tweens.add({ targets: me, y: me.y - 200, duration: 1600, ease: 'Quad.in' });
    this.cameras.main.fadeOut(1500, 255, 250, 240);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      state.prologue = true;
      state.map = 'whale';
      state.pos = [21, 16];
      save();
      this.scene.start('world', { map: 'whale', spawn: [21, 16] });
    });
  }
}
