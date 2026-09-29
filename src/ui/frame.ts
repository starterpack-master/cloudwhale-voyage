import { C, make } from '../art/draw';

// 도트 9조각 테두리 (12×12, 모서리 4px) → CSS border-image 로 사용
function frame(fill: string, edge: string, light: string, shade: string): string {
  return make(12, 12, (g) => {
    g.r(2, 0, 8, 1, edge); g.r(2, 11, 8, 1, edge); g.r(0, 2, 1, 8, edge); g.r(11, 2, 1, 8, edge);
    g.p(1, 1, edge); g.p(10, 1, edge); g.p(1, 10, edge); g.p(10, 10, edge);
    g.r(2, 1, 8, 10, fill); g.r(1, 2, 10, 8, fill);
    g.r(2, 1, 8, 1, light); g.r(1, 2, 1, 7, light);
    g.r(2, 10, 8, 1, shade); g.r(10, 2, 1, 8, shade);
  }).toDataURL();
}

export function installFrames(): void {
  const s = document.documentElement.style;
  s.setProperty('--f-panel', `url(${frame(C.cream[0], C.ink, C.white, C.cream[2])})`);
  s.setProperty('--f-slot', `url(${frame(C.white, C.lav[3], C.white, C.lav[0])})`);
  s.setProperty('--f-slot-on', `url(${frame(C.pink[0], C.ink, C.white, C.pink[1])})`);
  s.setProperty('--f-btn', `url(${frame(C.pink[1], C.ink, C.pink[0], C.pink[2])})`);
  s.setProperty('--f-btn2', `url(${frame(C.whale[1], C.ink, C.whale[0], C.whale[2])})`);
  s.setProperty('--f-quest', `url(${frame(C.butter[0], C.ink, C.white, C.butter[1])})`);
  s.setProperty('--f-dark', `url(${frame(C.lav[4], C.ink, C.lav[3], '#6a55a8')})`);
}
