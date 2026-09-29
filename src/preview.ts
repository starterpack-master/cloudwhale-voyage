// 도트 아트 미리보기 시트 (개발용)
import { playerFrames, moaFrames, marFrames, popoFrames } from './art/chars';
import * as O from './art/objects';
import { grassTile, plankTile, sandTile, seaTexture, soilTile, stoneTile } from './art/terrain';
import { eye, fin, fluke, foam, whaleBody } from './art/whale';
import { C, make } from './art/draw';

document.body.style.cssText = 'margin:0;background:#e4e1fb;font-family:sans-serif';
const row = () => { const d = document.createElement('div'); d.style.cssText = 'display:flex;flex-wrap:wrap;align-items:flex-end;padding:6px'; document.body.appendChild(d); return d; };
const show = (parent: HTMLElement, cv: HTMLCanvasElement, s = 4) => {
  cv.style.cssText = `width:${cv.width * s}px;height:${cv.height * s}px;image-rendering:pixelated;margin:4px`;
  parent.appendChild(cv);
};
const r1 = row();
for (const d of ['down', 'up', 'side'] as const) playerFrames(d).forEach((f) => show(r1, f));
[...moaFrames(), ...marFrames(), ...popoFrames()].forEach((f) => show(r1, f));
const r2 = row();
[O.tree('green', 1), O.tree('blossom', 2), O.bush(3), O.rock(), O.hut(), O.lighthouse(), O.stall(), O.lamp()].forEach((c) => show(r2, c, 3));
const r3 = row();
[O.bench(), O.fence(), O.crate(), O.barrel(), O.pot(), O.sign(), O.driftwood(), O.arrow(), O.sparkle(), O.puff(4),
  O.flower(C.pink[2]), ...[0, 1, 2, 3, 4].map(O.crop), eye(false), eye(true), fin()].forEach((c) => show(r3, c, 3));
const r4 = row();
show(r4, make(96, 32, (g) => {
  grassTile(g, 0, 0, 1); grassTile(g, 16, 0, 2); plankTile(g, 32, 0, 1); plankTile(g, 48, 0, 2);
  soilTile(g, 64, 0, false); soilTile(g, 80, 0, true); sandTile(g, 0, 16, 3); stoneTile(g, 16, 16, 4);
}), 4);
show(r4, seaTexture(), 2);
show(r4, fluke(), 2);
const r5 = row();
const whale = make(768, 480, (g) => {
  g.ctx.drawImage(seaTexture(), 0, 0); g.ctx.drawImage(seaTexture(), 128, 0);
  g.ctx.drawImage(foam(768, 480, 1), 0, 0);
  g.ctx.drawImage(whaleBody(768, 480), 0, 0);
});
show(r5, whale, 1.5);
