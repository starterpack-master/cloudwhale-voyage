import Phaser from 'phaser';
import { T } from '../art/terrain';
import { WH, halfWidth } from '../art/whale';
import { audio } from '../audio/audio';
import { openCare } from '../care/careMode';
import { ui } from '../ui/ui';
import type { Item } from '../ui/hud';
import { buildHarborMap, buildWhaleMap, FARM, type MapDef, type MapId, type MapObj } from './maps';
import { save, state, resetAll } from './state';
import { STEPS, TALK, stepIndex, type Line } from './story';
import { registerTextures } from './textures';

type Dir = 'down' | 'up' | 'side';
const SPEED = 90;
const GROW = 4000; // 물 준 뒤 단계마다 4초 (첫날 튜토리얼용)
const NURI = { x: WH.x1 - 58, y: WH.cy };
const feet = (i: number, j: number): [number, number] => [i * T + 8, j * T + 13];

export class WorldScene extends Phaser.Scene {
  map!: MapDef;
  private mapId: MapId = 'whale';
  private spawn: [number, number] | null = null;
  private player!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Ellipse;
  private objs = new Map<string, Phaser.GameObjects.Sprite>();
  private crops = new Map<string, { soil: Phaser.GameObjects.Image; crop: Phaser.GameObjects.Sprite }>();
  private path: [number, number][] = [];
  private arrive: (() => void) | null = null;
  private dir: Dir = 'down';
  private tile: [number, number] = [0, 0];
  private arrow!: Phaser.GameObjects.Image;
  private sea!: Phaser.GameObjects.TileSprite;
  private puffs: Phaser.GameObjects.Image[] = [];
  private eyes: Phaser.GameObjects.Sprite[] = [];
  private foam?: Phaser.GameObjects.Sprite;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private placing = false;
  private ghost?: Phaser.GameObjects.Image;
  private stepT = 0;
  private saveT = 0;
  private busyUntil = 0;

  constructor() { super('world'); }

  init(data: { map?: MapId; spawn?: [number, number] }): void {
    this.mapId = data.map ?? state.map;
    this.spawn = data.spawn ?? (data.map ? null : state.pos);
    this.objs.clear();
    this.crops.clear();
    this.puffs = [];
    this.eyes = [];
    this.path = [];
    this.arrive = null;
    this.placing = false;
  }

  get step(): string { return STEPS[state.step]?.id ?? 'free'; }
  private reached(id: string): boolean { return state.step >= stepIndex(id); }
  private walkable(i: number, j: number): boolean {
    return i >= 0 && j >= 0 && i < this.map.w && j < this.map.h && this.map.walk[j * this.map.w + i] === 1;
  }
  private tex(key: string, cv: HTMLCanvasElement): string {
    if (this.textures.exists(key)) this.textures.remove(key);
    this.textures.addCanvas(key, cv);
    return key;
  }

  create(): void {
    registerTextures(this);
    const docked = this.reached('goHarbor');
    this.map = this.mapId === 'whale' ? buildWhaleMap(docked) : buildHarborMap();
    const W = this.map.w * T, H = this.map.h * T, M = 40 * T;
    this.sea = this.add.tileSprite(-M, -M, W + 2 * M, H + 2 * M, 'sea').setOrigin(0).setDepth(0);
    for (let k = 0; k < 7; k++) {
      this.puffs.push(this.add.image(Math.random() * W, Math.random() * H, `puff${k % 3}`).setDepth(1).setAlpha(0.9));
    }
    if (this.map.id === 'whale') this.whaleParts();
    this.map.under.forEach((cv, k) => this.add.image(0, 0, this.tex(`u_${this.map.id}${k}`, cv)).setOrigin(0).setDepth(4));
    this.add.image(0, 0, this.tex(`g_${this.map.id}`, this.map.ground)).setOrigin(0).setDepth(5);
    for (const o of this.map.objects) this.addObj(o);
    if (this.map.id === 'whale') {
      for (const [i, j] of FARM) this.addCrop(i, j);
      for (const p of state.placed) this.addPlaced(p.tex, p.tx, p.ty);
    }
    const [si, sj] = this.spawn && this.walkable(this.spawn[0], this.spawn[1]) ? this.spawn : this.map.spawn;
    this.tile = [si, sj];
    const [px, py] = feet(si, sj);
    this.shadow = this.add.ellipse(px, py, 12, 5, 0x3b2f5c, 0.22).setDepth(9);
    this.player = this.add.sprite(px, py, 'pl_down', 0).setOrigin(0.5, 1);
    this.arrow = this.add.image(0, 0, 'arrow').setOrigin(0.5, 1).setDepth(20000).setVisible(false);
    this.ambient();
    this.fitCamera();
    this.cameras.main.startFollow(this.player, true, 0.14, 0.14);
    this.cameras.main.fadeIn(350, 228, 225, 251);
    this.scale.on('resize', this.fitCamera, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.fitCamera, this));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (ui.dlg.open || ui.busy || this.time.now < this.busyUntil) return;
      if (p.getDistance() > 12) return;
      this.tap(p.worldX, p.worldY);
    });
    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,ENTER') as Record<string, Phaser.Input.Keyboard.Key>;
    ui.handlers.item = (i) => this.useItem(i);
    ui.handlers.care = () => this.openCareScreen();
    ui.handlers.menu = () => this.menu();
    ui.handlers.quest = () => ui.hud.quest(STEPS[state.step].title + this.progress(), STEPS[state.step].hint, true);
    ui.hud.place(this.map.name);
    this.refreshUi();
    state.map = this.map.id;
    save();
    if (this.step === 'talkPopo' && this.map.id === 'whale') this.time.delayedCall(700, () => this.talk('popo'));
    if (this.step === 'goHarbor' && this.map.id === 'harbor') this.advance();
  }

  private fitCamera(): void {
    const cam = this.cameras.main;
    const w = this.scale.width, h = this.scale.height;
    const z = Math.max(1, Math.floor(Math.min(Math.max(w, h) / (T * 17), Math.min(w, h) / (T * 10.5))));
    cam.setZoom(z);
    const vw = w / z, vh = h / z, W = this.map.w * T, H = this.map.h * T;
    const bw = Math.max(W, vw), bh = Math.max(H, vh);
    cam.setBounds((W - bw) / 2, (H - bh) / 2, bw, bh);
  }

  private whaleParts(): void {
    this.foam = this.add.sprite(0, 0, 'foam', 0).setOrigin(0).setDepth(2);
    this.time.addEvent({ delay: 420, loop: true, callback: () => this.foam?.setFrame(this.foam.frame.name === '0' ? 1 : 0) });
    const fx = 468, hw = halfWidth(fx);
    for (const s of [-1, 1]) {
      const fin = this.add.image(fx, WH.cy + s * (hw - 10), 'fin').setOrigin(0.02, 0.5).setDepth(3);
      fin.setRotation(s * 2.3);
      fin.setFlipY(s > 0);
      this.tweens.add({ targets: fin, rotation: fin.rotation + s * 0.12, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    const fl = this.add.image(WH.x0 + 8, WH.cy, 'fluke').setOrigin(1, 0.5).setDepth(3);
    this.tweens.add({ targets: fl, scaleY: 0.86, scaleX: 1.04, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const ex = WH.x1 - 74, ehw = halfWidth(ex);
    for (const s of [-1, 1]) {
      const e = this.add.sprite(ex, WH.cy + s * (ehw - 7), 'eye', 0).setDepth(6);
      this.eyes.push(e);
      this.add.rectangle(ex + 2, WH.cy + s * (ehw - 14), 7, 3, 0xffa6c8, 0.9).setDepth(6);
    }
    this.time.addEvent({ delay: 3300, loop: true, callback: () => this.blink() });
  }

  private blink(ms = 140): void {
    this.eyes.forEach((e) => e.setFrame(1));
    this.time.delayedCall(ms, () => this.eyes.forEach((e) => e.setFrame(0)));
  }

  private addObj(o: MapObj): void {
    if (o.hidden) return;
    if (o.talk === 'wood' && (state.woodTaken.includes(o.id) || !this.reached('wood'))) {
      if (state.woodTaken.includes(o.id)) return;
    }
    const x = o.tx * T + 8 + (o.ox ?? 0), y = (o.ty + 1) * T + (o.oy ?? 0);
    const s = this.add.sprite(x, y, o.tex, 0).setOrigin(0.5, 1).setDepth(10 + y);
    if (o.anim) s.play(o.anim);
    if (o.id === 'popo') this.tweens.add({ targets: s, y: y - 3, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    if (o.talk === 'wood') {
      this.time.addEvent({ delay: 900 + Math.random() * 600, loop: true, callback: () => { if (s.active) this.sparkleAt(x + (Math.random() - 0.5) * 12, y - 8); } });
      s.setVisible(this.reached('wood'));
    }
    if (o.id === 'gangway') s.setOrigin(0.5, 1).setDepth(7);
    this.objs.set(o.id, s);
  }

  private addCrop(i: number, j: number): void {
    const key = `${i},${j}`, c = state.crops[key];
    const soil = this.add.image(i * T, j * T, 'soil', c?.watered ? 1 : 0).setOrigin(0).setDepth(6);
    const crop = this.add.sprite(i * T + 8, (j + 1) * T, 'crop', c ? c.stage : 0).setOrigin(0.5, 1).setDepth(10 + (j + 1) * T - 4).setVisible(!!c);
    this.crops.set(key, { soil, crop });
  }

  private addPlaced(tex: string, tx: number, ty: number): void {
    const y = (ty + 1) * T;
    this.add.image(tx * T + 16, y, tex).setOrigin(0.5, 1).setDepth(10 + y);
    this.map.walk[ty * this.map.w + tx] = 0;
    this.map.walk[ty * this.map.w + tx + 1] = 0;
  }

  private ambient(): void {
    const W = this.map.w * T, H = this.map.h * T;
    this.add.particles(0, 0, 'sparkle', {
      x: { min: 0, max: W }, y: { min: 0, max: H }, lifespan: 1400, frequency: 260, quantity: 1,
      scale: { start: 1, end: 0 }, alpha: { start: 0.9, end: 0 },
    }).setDepth(1);
    this.add.particles(0, 0, 'petal', {
      x: { min: W * 0.2, max: W }, y: { min: 0, max: H * 0.8 }, lifespan: 7000, frequency: 700,
      speedX: { min: -22, max: -10 }, speedY: { min: 4, max: 12 }, rotate: { min: 0, max: 360 }, alpha: { start: 1, end: 0 },
    }).setDepth(15000);
  }

  sparkleAt(x: number, y: number, n = 1, tex = 'sparkle'): void {
    for (let k = 0; k < n; k++) {
      const s = this.add.image(x + (n > 1 ? (Math.random() - 0.5) * 16 : 0), y + (n > 1 ? (Math.random() - 0.5) * 10 : 0), tex).setDepth(19000);
      this.tweens.add({ targets: s, y: s.y - 10 - Math.random() * 8, alpha: 0, duration: 700 + Math.random() * 300, onComplete: () => s.destroy() });
    }
  }

  private progress(): string {
    const st = STEPS[state.step];
    return st?.need ? ` (${Math.min(state.count, st.need)}/${st.need})` : '';
  }

  refreshUi(flash = false): void {
    const st = STEPS[state.step];
    ui.hud.quest(st.title + this.progress(), st.hint, flash);
    ui.hud.items(state.inv, this.step === 'placeBench' && this.map.id === 'whale' ? 'bench' : undefined);
    ui.hud.showCare(this.map.id === 'whale' && this.reached('care') && !ui.dlg.open);
  }

  // ---- 길찾기 (8방향, 모서리 끼기 금지) ----
  private findPath(goal: (i: number, j: number) => boolean): [number, number][] | null {
    const { w } = this.map;
    const start = this.tile[1] * w + this.tile[0];
    const prev = new Map<number, number>([[start, -1]]);
    const q = [start];
    let end = -1;
    while (q.length) {
      const c = q.shift()!;
      const ci = c % w, cj = Math.floor(c / w);
      if (goal(ci, cj)) { end = c; break; }
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const ni = ci + di, nj = cj + dj, n = nj * w + ni;
        if (!this.walkable(ni, nj) || prev.has(n)) continue;
        if (di && dj && (!this.walkable(ci + di, cj) || !this.walkable(ci, cj + dj))) continue;
        prev.set(n, c);
        q.push(n);
      }
      if (prev.size > 4000) break;
    }
    if (end < 0) return null;
    const out: [number, number][] = [];
    for (let c = end; c !== start && c >= 0; c = prev.get(c)!) out.unshift([c % w, Math.floor(c / w)]);
    return out;
  }

  // 목표 칸(또는 그 옆 칸)까지 걸어가서 arrive 실행
  walkTo(i: number, j: number, arrive?: () => void, beside = false): void {
    const near = (a: number, b: number) => Math.max(Math.abs(a - i), Math.abs(b - j)) <= 1;
    const goal = beside || !this.walkable(i, j) ? (a: number, b: number) => near(a, b) : (a: number, b: number) => a === i && b === j;
    const p = this.findPath(goal);
    if (!p) { this.sparkleAt(i * T + 8, j * T + 8); return; }
    this.path = p;
    this.arrive = arrive ?? null;
    if (!p.length) { this.face(i, j); this.arrive = null; arrive?.(); }
  }

  private face(i: number, j: number): void {
    const dx = i - this.tile[0], dy = j - this.tile[1];
    if (Math.abs(dx) > Math.abs(dy)) { this.dir = 'side'; this.player.setFlipX(dx < 0); } else if (dy) this.dir = dy < 0 ? 'up' : 'down';
    this.player.setTexture(`pl_${this.dir}`, 0);
  }

  // ---- 탭 ----
  private tap(x: number, y: number): void {
    if (this.placing) { this.tryPlace(x, y); return; }
    const i = Math.floor(x / T), j = Math.floor(y / T);
    for (const o of this.map.objects) {
      if (!o.talk || o.hidden) continue;
      const s = this.objs.get(o.id);
      if (!s || !s.visible) continue;
      if (s.getBounds().contains(x, y) || (o.tx === i && o.ty === j)) { this.walkTo(o.tx, o.ty, () => this.talk(o.talk!, o), true); return; }
    }
    if (this.map.id === 'whale' && Math.hypot((x - NURI.x) / 1.3, y - NURI.y) < 46) {
      this.walkTo(Math.floor(NURI.x / T) - 2, Math.floor(NURI.y / T), () => this.talk('nuri'));
      return;
    }
    if (this.map.soil.some(([a, b]) => a === i && b === j)) { this.walkTo(i, j, () => this.soil(i, j), true); return; }
    const ex = this.map.exits.find((e) => e.tx === i && Math.abs(e.ty - j) <= 1);
    if (ex) { this.walkTo(ex.tx, ex.ty, () => this.go(ex.to, ex.spawn)); return; }
    this.walkTo(i, j);
  }

  private say(lines: Line[], then?: () => void): void {
    this.path = [];
    ui.hud.showCare(false);
    ui.dlg.say(lines, () => { this.busyUntil = this.time.now + 150; this.refreshUi(); then?.(); });
  }

  advance(): void {
    state.step = Math.min(state.step + 1, STEPS.length - 1);
    state.count = 0;
    save();
    audio.chime();
    this.refreshUi(true);
  }

  private count(): boolean {
    state.count++;
    this.refreshUi();
    return state.count >= (STEPS[state.step].need ?? 1);
  }

  // ---- 말 걸기·조사하기 ----
  private talk(key: string, o?: MapObj): void {
    const st = this.step;
    if (key === 'popo') {
      if (st === 'talkPopo') this.say(TALK.popoIntro, () => { state.inv.seed += 3; ui.hud.toast('별딸기 씨앗 +3', 'seed'); this.advance(); });
      else this.say([{ who: 'popo', text: STEPS[state.step].hint + '.' }, ...TALK.popoIdle]);
    } else if (key === 'nuri') {
      if (st === 'feed' || (state.inv.berry > 0 && this.reached('free'))) this.feed();
      else if (this.reached('care')) this.openCareScreen();
      else this.say([{ who: 'nuri', text: '(누리가 커다란 눈을 끔벅인다. 볼 쪽이 조금 간지러워 보인다.)' }]);
    } else if (key === 'moa') {
      if (st === 'meetMoa') this.say(TALK.moaStory, () => { this.advance(); this.objs.forEach((s, id) => { if (id.startsWith('wood')) s.setVisible(true); }); });
      else if (st === 'bringWood' || (st === 'wood' && state.inv.wood >= 3)) {
        this.say(TALK.moaWood, () => {
          state.inv.wood -= 3; state.inv.bench += 1;
          ui.hud.toast('나무 벤치 +1', 'bench');
          if (st === 'wood') this.advance();
          this.advance();
        });
      } else this.say(TALK.moaIdle);
    } else if (key === 'mar') this.say(TALK.marIdle);
    else if (key === 'wood' && o) this.pickWood(o);
    else if (TALK[key]) this.say(TALK[key]);
  }

  private pickWood(o: MapObj): void {
    const s = this.objs.get(o.id);
    if (!s?.visible || state.woodTaken.includes(o.id)) return;
    state.woodTaken.push(o.id);
    state.inv.wood++;
    audio.harvest();
    this.sparkleAt(s.x, s.y - 6, 6);
    this.tweens.add({ targets: s, y: s.y - 14, alpha: 0, duration: 380, onComplete: () => s.destroy() });
    ui.hud.toast('하늘유목 +1', 'wood');
    if (this.step === 'wood' && this.count()) this.say(TALK.woodAll, () => this.advance());
    else this.refreshUi();
    save();
  }

  // ---- 밭 ----
  private soil(i: number, j: number): void {
    const key = `${i},${j}`, c = state.crops[key], v = this.crops.get(key)!;
    const st = this.step;
    if (!c) {
      if (state.inv.seed <= 0) { ui.hud.toast(this.reached('plant') ? '씨앗이 없어요' : '먼저 뽀뽀에게 말을 걸어 봐요', 'seed'); return; }
      state.inv.seed--;
      state.crops[key] = { stage: 0, watered: false, t: 0 };
      v.crop.setFrame(0).setVisible(true);
      audio.plant();
      this.sparkleAt(v.crop.x, v.crop.y - 6, 3, 'sparkleY');
      if (st === 'plant' && this.count()) this.say(TALK.afterPlant, () => this.advance());
    } else if (!c.watered) {
      c.watered = true;
      c.t = Date.now();
      v.soil.setFrame(1);
      audio.splash(0);
      this.drops(v.crop.x, v.crop.y - 10);
      if (st === 'water' && this.count()) this.say(TALK.afterWater, () => this.advance());
    } else if (c.stage >= 4) {
      delete state.crops[key];
      v.crop.setVisible(false);
      v.soil.setFrame(0);
      state.inv.berry++;
      audio.harvest();
      this.sparkleAt(v.crop.x, v.crop.y - 8, 6);
      ui.hud.toast('별딸기 +1', 'berry');
      if (st === 'harvest' && this.count()) this.say(TALK.afterHarvest, () => this.advance());
    } else {
      ui.hud.toast('별딸기가 자라는 중이에요', 'seed');
    }
    this.refreshUi();
    save();
  }

  private drops(x: number, y: number): void {
    for (let k = 0; k < 7; k++) {
      const d = this.add.image(x + (Math.random() - 0.5) * 10, y - Math.random() * 6, 'dot').setDepth(19000).setTint(0x9fd2fa);
      this.tweens.add({ targets: d, y: d.y + 12, alpha: 0, duration: 420 + Math.random() * 200, onComplete: () => d.destroy() });
    }
  }

  // ---- 누리 ----
  private openCareScreen(): void {
    if (this.map.id !== 'whale' || ui.busy) return;
    ui.busy = true;
    ui.hud.visible(false);
    openCare({
      root: ui.root,
      fortuneAvailable: true,
      onClose: (r) => {
        ui.busy = false;
        ui.hud.visible(true);
        this.busyUntil = this.time.now + 300;
        state.bond += r.bond + r.pearls;
        this.happy();
        if (this.step === 'care') {
          if (r.pearls + r.bond > 0) this.say(TALK.afterCare, () => this.advance());
          else ui.hud.toast('따개비를 문질러 떼어 주세요', 'care');
        }
        save();
      },
    });
  }

  private happy(): void {
    this.blink(1400);
    this.spout();
    audio.whaleCall(0, 1.4);
  }

  private spout(): void {
    const x = 614, y = WH.cy;
    for (let k = 0; k < 26; k++) {
      const d = this.add.image(x, y, 'dot').setDepth(19500);
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.9, sp = 30 + Math.random() * 40;
      this.tweens.add({ targets: d, x: x + Math.cos(a) * sp, y: y + Math.sin(a) * sp, alpha: 0, duration: 700 + Math.random() * 400, ease: 'Quad.out', onComplete: () => d.destroy() });
    }
    audio.spout();
  }

  private feed(): void {
    if (state.inv.berry <= 0) { ui.hud.toast('별딸기가 없어요', 'berry'); return; }
    state.inv.berry--;
    const b = this.add.image(this.player.x, this.player.y - 20, 'crop', 4).setDepth(19000);
    this.tweens.add({
      targets: b, x: NURI.x + 30, y: NURI.y, duration: 600, ease: 'Quad.in',
      onComplete: () => {
        b.destroy();
        audio.coin();
        this.sparkleAt(NURI.x + 30, NURI.y, 8, 'sparkleY');
        this.happy();
        state.bond++;
        if (this.step === 'feed') {
          this.time.delayedCall(900, () => this.say(TALK.afterFeed, () => { this.advance(); this.go('whale', this.tile); }));
        } else ui.hud.toast('누리가 맛있게 먹었어요', 'berry');
        this.refreshUi();
        save();
      },
    });
  }

  // ---- 가방 줄 ----
  private useItem(i: Item): void {
    if (ui.dlg.open) return;
    audio.ui();
    if (i === 'bench' && state.inv.bench > 0) {
      if (this.map.id !== 'whale') { ui.hud.toast('벤치는 누리 등 위에 놓을 수 있어요', 'bench'); return; }
      this.placing = true;
      this.ghost = this.add.image(this.player.x, this.player.y, 'bench').setOrigin(0.5, 1).setAlpha(0.6).setDepth(19000);
      ui.hud.setBanner('벤치를 놓을 이끼 칸을 눌러 주세요', () => this.stopPlace());
      return;
    }
    const names: Record<Item, string> = { seed: '별딸기 씨앗 · 밭에 심어요', berry: '별딸기 · 누리가 제일 좋아하는 간식', wood: '하늘유목 · 구름바다를 떠돌던 나무', bench: '나무 벤치 · 누리 등에 놓을 수 있어요', note: '노래조각 · 하늘노래의 한 조각' };
    ui.hud.toast(state.inv[i] ? names[i] : `${names[i].split(' · ')[0]}이(가) 아직 없어요`, i);
  }

  private stopPlace(): void {
    this.placing = false;
    this.ghost?.destroy();
    this.ghost = undefined;
    ui.hud.setBanner(null);
  }

  private tryPlace(x: number, y: number): void {
    if (state.inv.bench <= 0) { this.stopPlace(); return; }
    const i = Math.floor(x / T - 0.5), j = Math.floor(y / T);
    const ok = this.walkable(i, j) && this.walkable(i + 1, j) && !(this.tile[0] >= i && this.tile[0] <= i + 1 && this.tile[1] === j)
      && !this.map.soil.some(([a, b]) => b === j && (a === i || a === i + 1));
    if (!ok) { ui.hud.toast('여기에는 놓을 수 없어요', 'bench'); return; }
    this.stopPlace();
    state.inv.bench--;
    state.placed.push({ tex: 'bench', tx: i, ty: j });
    this.addPlaced('bench', i, j);
    audio.place();
    this.sparkleAt(i * T + 16, j * T + 8, 8, 'sparkleY');
    save();
    if (this.step === 'placeBench') {
      this.time.delayedCall(500, () => {
        audio.whaleCall(0, 1.5);
        this.say(TALK.benchPlaced, () => { state.inv.note++; ui.hud.toast('노래조각 1/5', 'note'); this.advance(); this.ending(); });
      });
    }
    this.refreshUi();
  }

  // ---- 장소 이동 ----
  go(to: MapId, spawn: [number, number]): void {
    if (ui.busy) return;
    ui.busy = true;
    this.path = [];
    state.map = to;
    state.pos = spawn;
    save();
    this.cameras.main.fadeOut(300, 228, 225, 251);
    this.cameras.main.once('camerafadeoutcomplete', () => { ui.busy = false; this.scene.restart({ map: to, spawn }); });
  }

  private card(html: string, buttons: [string, string, () => void][]): void {
    const c = document.createElement('div');
    c.className = 'card px';
    c.innerHTML = html;
    const row = document.createElement('div');
    row.className = 'row';
    for (const [label, cls, fn] of buttons) {
      const b = document.createElement('button');
      b.className = `${cls} px`;
      b.textContent = label;
      b.onclick = () => { audio.ui(); fn(); };
      row.appendChild(b);
    }
    c.appendChild(row);
    ui.busy = true;
    ui.hud.modal(c);
  }
  private closeCard(): void { ui.hud.modal(null); ui.busy = false; this.busyUntil = this.time.now + 200; }

  private ending(): void {
    audio.sparkle();
    this.card(`<h2>프롤로그 끝</h2><p>누리와 함께한 첫날이 저물어요.<br/>누리가 처음으로 노래를 흥얼거렸어요.</p>
      <p><b>노래조각 1/5</b></p><p>다음 이야기 · 꽃구름 군도<br/>꽃동산인 줄 알았던 곳에서, 잠든 고래 해솔을 만나요.</p>`,
    [['계속 둘러보기', 'btn', () => this.closeCard()]]);
  }

  private menu(): void {
    this.card(`<h2>설정</h2><p>구름고래 항해기 · 프로토타입 v0.2</p>`, [
      [state.muted ? '소리 켜기' : '소리 끄기', 'btn2', () => { state.muted = !state.muted; audio.setMuted(state.muted); save(); this.closeCard(); }],
      ['처음부터 다시', 'btn2', () => resetAll()],
      ['닫기', 'btn', () => this.closeCard()],
    ]);
  }

  // ---- 매 프레임 ----
  update(time: number, delta: number): void {
    const dt = delta / 1000;
    this.sea.tilePositionX += dt * 5;
    this.sea.tilePositionY += dt * 1.5;
    for (const p of this.puffs) {
      p.x -= dt * 8;
      if (p.x < -60) { p.x = this.map.w * T + 60; p.y = Math.random() * this.map.h * T; }
    }
    this.move(dt);
    this.grow();
    this.pointArrow(time);
    if (this.ghost) { const pt = this.input.activePointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2; this.ghost.setPosition(Math.floor(pt.x / T) * T + 8, Math.floor(pt.y / T) * T + T); }
    this.saveT += dt;
    if (this.saveT > 4) { this.saveT = 0; state.pos = [...this.tile]; save(); }
  }

  private move(dt: number): void {
    const k = this.keys;
    const kx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    const ky = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    let vx = 0, vy = 0;
    if ((kx || ky) && !ui.dlg.open && !ui.busy) {
      this.path = [];
      const n = Math.hypot(kx, ky);
      const nx = this.player.x + (kx / n) * SPEED * dt, ny = this.player.y + (ky / n) * SPEED * dt;
      if (this.walkable(Math.floor(nx / T), Math.floor((ny - 3) / T))) { this.player.setPosition(nx, ny); vx = kx; vy = ky; }
      else if (this.walkable(Math.floor(nx / T), Math.floor((this.player.y - 3) / T))) { this.player.x = nx; vx = kx; }
      else if (this.walkable(Math.floor(this.player.x / T), Math.floor((ny - 3) / T))) { this.player.y = ny; vy = ky; }
      this.tile = [Math.floor(this.player.x / T), Math.floor((this.player.y - 3) / T)];
    } else if (this.path.length) {
      const [ti, tj] = this.path[0];
      const [tx, ty] = feet(ti, tj);
      const dx = tx - this.player.x, dy = ty - this.player.y, d = Math.hypot(dx, dy), s = SPEED * dt;
      vx = dx; vy = dy;
      if (d <= s) {
        this.player.setPosition(tx, ty);
        this.tile = [ti, tj];
        this.path.shift();
        const ex = this.map.exits.find((e) => e.tx === ti && e.ty === tj);
        if (!this.path.length) { const a = this.arrive; this.arrive = null; if (a) a(); else if (ex) this.go(ex.to, ex.spawn); }
      } else this.player.setPosition(this.player.x + (dx / d) * s, this.player.y + (dy / d) * s);
    }
    const moving = vx !== 0 || vy !== 0;
    if (moving) {
      this.dir = Math.abs(vx) > Math.abs(vy) ? 'side' : vy < 0 ? 'up' : 'down';
      if (this.dir === 'side') this.player.setFlipX(vx < 0);
      this.player.play(`walk_${this.dir}`, true);
      this.stepT += dt;
      if (this.stepT > 0.3) { this.stepT = 0; audio.footstep(); }
    } else if (this.player.anims.isPlaying) {
      this.player.stop();
      this.player.setTexture(`pl_${this.dir}`, 0);
    }
    this.player.setDepth(10 + this.player.y);
    this.shadow.setPosition(this.player.x, this.player.y - 1);
  }

  private grow(): void {
    const now = Date.now();
    for (const [key, c] of Object.entries(state.crops)) {
      if (!c.watered || c.stage >= 4) continue;
      const stage = Math.min(4, 1 + Math.floor((now - c.t) / GROW));
      if (stage !== c.stage) {
        c.stage = stage;
        const v = this.crops.get(key);
        if (v) { v.crop.setFrame(stage); this.sparkleAt(v.crop.x, v.crop.y - 8, stage === 4 ? 5 : 1, stage === 4 ? 'sparkleY' : 'sparkle'); }
        if (stage === 4) { v?.soil.setFrame(0); c.watered = true; }
      }
    }
  }

  // 지금 할 일의 대상 위에 노란 화살표
  private pointArrow(time: number): void {
    const st = STEPS[state.step];
    let pos: [number, number] | null = null;
    if (st.map !== this.map.id) {
      const ex = this.map.exits[0];
      if (ex) pos = [ex.tx * T + 8, ex.ty * T - 2];
    } else if (st.target === 'popo' || st.target === 'moa') {
      const s = this.objs.get(st.target);
      if (s) pos = [s.x, s.y - s.height - 2];
    } else if (st.target === 'soil') {
      const want = (c: { stage: number; watered: boolean } | undefined) =>
        st.id === 'plant' ? !c : st.id === 'water' ? !!c && !c.watered : !!c && c.stage >= 4;
      const hit = FARM.find(([i, j]) => want(state.crops[`${i},${j}`])) ?? FARM.find(([i, j]) => state.crops[`${i},${j}`]);
      if (hit) pos = [hit[0] * T + 8, hit[1] * T - 2];
    } else if (st.target === 'nuri') pos = [NURI.x, NURI.y - 30];
    else if (st.target === 'gangway') {
      const s = this.objs.get('gangway');
      if (s) pos = [s.x, s.y - 60];
    } else if (st.target === 'wood') {
      let best: Phaser.GameObjects.Sprite | null = null;
      this.objs.forEach((s, id) => {
        if (!id.startsWith('wood') || !s.active || !s.visible) return;
        if (!best || Phaser.Math.Distance.Between(s.x, s.y, this.player.x, this.player.y) < Phaser.Math.Distance.Between(best.x, best.y, this.player.x, this.player.y)) best = s;
      });
      const b = best as Phaser.GameObjects.Sprite | null;
      if (b) pos = [b.x, b.y - 12];
    }
    const show = !!pos && !ui.dlg.open && !ui.busy;
    this.arrow.setVisible(show);
    if (!show || !pos) return;
    // 대상이 화면 밖이면 화면 가장자리에서 그쪽을 가리킴
    const v = this.cameras.main.worldView, m = 12;
    const inside = pos[0] > v.x + m && pos[0] < v.right - m && pos[1] > v.y + m && pos[1] < v.bottom - m;
    if (inside) {
      this.arrow.setOrigin(0.5, 1).setRotation(0).setPosition(pos[0], pos[1] + Math.round(Math.sin(time / 170) * 3));
    } else {
      const cx = v.centerX, cy = v.centerY, a = Math.atan2(pos[1] - cy, pos[0] - cx);
      const k = Math.min((v.width / 2 - m) / Math.abs(Math.cos(a) || 1e-6), (v.height / 2 - m) / Math.abs(Math.sin(a) || 1e-6));
      const pulse = Math.sin(time / 170) * 2;
      this.arrow.setOrigin(0.5).setRotation(a - Math.PI / 2).setPosition(cx + Math.cos(a) * (k + pulse), cy + Math.sin(a) * (k + pulse));
    }
  }
}
