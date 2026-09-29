import Phaser from 'phaser';
import { marFrames, moaFrames, playerFrames, popoFrames } from '../art/chars';
import * as O from '../art/objects';
import { C, make } from '../art/draw';
import { plankTile, seaTexture, soilTile } from '../art/terrain';
import { eye, fin, fluke, foam } from '../art/whale';

// 여러 프레임을 한 장으로 이어 붙여 텍스처 + 프레임 번호(0,1,2…)로 등록
function sheet(scene: Phaser.Scene, key: string, frames: HTMLCanvasElement[]): void {
  const fw = frames[0].width, fh = frames[0].height;
  const cv = make(fw * frames.length, fh, (g) => frames.forEach((f, i) => g.ctx.drawImage(f, i * fw, 0)));
  const tex = scene.textures.addCanvas(key, cv)!;
  frames.forEach((_, i) => tex.add(i, 0, i * fw, 0, fw, fh));
}
function one(scene: Phaser.Scene, key: string, cv: HTMLCanvasElement): void {
  scene.textures.addCanvas(key, cv);
}

export function registerTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists('pl_down')) return;
  for (const d of ['down', 'up', 'side'] as const) {
    sheet(scene, `pl_${d}`, playerFrames(d));
    scene.anims.create({ key: `walk_${d}`, frames: scene.anims.generateFrameNumbers(`pl_${d}`, { frames: [1, 0, 2, 0] }), frameRate: 9, repeat: -1 });
  }
  sheet(scene, 'moa', moaFrames());
  scene.anims.create({ key: 'moa', frames: scene.anims.generateFrameNumbers('moa', { frames: [0, 0, 0, 0, 0, 1] }), frameRate: 3, repeat: -1 });
  sheet(scene, 'mar', marFrames());
  scene.anims.create({ key: 'mar', frames: scene.anims.generateFrameNumbers('mar', { frames: [0, 0, 0, 0, 1] }), frameRate: 3, repeat: -1 });
  sheet(scene, 'popo', popoFrames());
  scene.anims.create({ key: 'popo', frames: scene.anims.generateFrameNumbers('popo', { frames: [0, 1] }), frameRate: 2, repeat: -1 });
  sheet(scene, 'eye', [eye(false), eye(true)]);
  sheet(scene, 'crop', [0, 1, 2, 3, 4].map(O.crop));
  sheet(scene, 'soil', [false, true].map((wet) => make(16, 16, (g) => soilTile(g, 0, 0, wet))));
  one(scene, 'hut', O.hut());
  one(scene, 'hutPink', O.hut(C.roof));
  one(scene, 'hutMint', O.hut([C.mint[0], C.mint[1], C.mint[2], C.mint[3], '#4f9f83']));
  one(scene, 'hutLav', O.hut(C.lav));
  one(scene, 'lighthouse', O.lighthouse());
  one(scene, 'stall', O.stall());
  one(scene, 'lamp', O.lamp());
  one(scene, 'bench', O.bench());
  one(scene, 'fence', O.fence());
  one(scene, 'crate', O.crate());
  one(scene, 'barrel', O.barrel());
  one(scene, 'pot', O.pot());
  one(scene, 'sign', O.sign());
  one(scene, 'treeG', O.tree('green', 3));
  one(scene, 'treeB', O.tree('blossom', 5));
  one(scene, 'bush', O.bush(2));
  one(scene, 'rock', O.rock());
  one(scene, 'driftwood', O.driftwood());
  one(scene, 'arrow', O.arrow());
  one(scene, 'sparkle', O.sparkle());
  one(scene, 'sparkleY', O.sparkle(C.butter[2]));
  one(scene, 'dot', make(2, 2, (g) => g.r(0, 0, 2, 2, C.white)));
  one(scene, 'petal', make(3, 2, (g) => { g.r(0, 0, 2, 2, C.pink[1]); g.p(2, 1, C.pink[0]); }));
  [0, 1, 2].forEach((s) => one(scene, `puff${s}`, O.puff(s + 1)));
  one(scene, 'sea', seaTexture());
  one(scene, 'fin', fin());
  one(scene, 'fluke', fluke());
  sheet(scene, 'foam', [foam(768, 480, 1), foam(768, 480, 2)]);
  one(scene, 'gangway', make(16, 64, (g) => {
    for (let j = 0; j < 4; j++) plankTile(g, 0, j * 16, j);
    g.r(0, 0, 1, 64, C.wood[4]); g.r(15, 0, 1, 64, C.wood[4]);
  }));
  one(scene, 'none', make(1, 1, () => undefined));
}
