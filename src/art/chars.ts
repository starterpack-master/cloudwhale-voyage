import { C, make } from './draw';

// 캐릭터 도트 (16×20). 문자 하나 = 픽셀 하나
const PLAYER_PAL: Record<string, string> = {
  o: C.ink, h: C.hair[1], H: C.hair[0], d: C.hair[2], k: C.skin[1], K: C.skin[2], r: C.pink[2], e: C.ink, w: C.white,
  c: C.lav[1], C: C.lav[2], u: C.cream[1], p: '#8a7fc6', P: '#6e62ad', b: '#6e5a8a', y: C.butter[2],
};
const HEAD_DOWN = [
  '......oooo......', '....oohhhhoo....', '...ohHHhhhhho...', '..ohHHhhhhhhho..', '..ohhhhhhhhhyyo.',
  '..ohhkkkkkkhhho.', '..ohkkkkkkkkkho.', '..ohkeekkkeekho.', '..ohkewkkkewkho.', '..odkrkkkkkrkdo.',
  '...okkkkekkkko..', '....ookkkkoo....',
];
const BODY_DOWN = ['...occuuuucco...', '..okccuuuuccko..', '..okCccccccCko..', '...oCppppppCo...', '...opppppppPo...', '....oPppppPo....'];
const HEAD_UP = [
  '......oooo......', '....oohhhhoo....', '...ohhhhhhHho...', '..ohhhhhhhhHho..', '..ohhhhhhhhhhoyy',
  '..ohhhhhhhhhhho.', '..ohhhhhhhhhhho.', '..odhhhhhhhhhdo.', '..odhhhhhhhhhdo.', '...odhhhhhhhdo..',
  '...okkddddddko..', '....ookkkkoo....',
];
const BODY_UP = ['...occcccccco...', '..okcccccccccko.', '..okCccccccCko..', '...oCppppppCo...', '...opppppppPo...', '....oPppppPo....'];
const HEAD_SIDE = [
  '......oooo......', '....oohhhhoo....', '...ohhHHhhhho...', '..ohhHHhhhhhho..', '.yohhhhhhhhhhho.',
  '.yohhhhhhkkkko..', '..ohhhhhkkkkkko.', '..ohhhhkkkkeeko.', '..ohhhhkkkkewko.', '..odhhhkkkkrkko.',
  '...odhhkkkkkko..', '....oohkkkkoo...',
];
const BODY_SIDE = ['.....occuuco....', '....occuuucko...', '....oCcccccko...', '....oCppppppo...', '....oppppppPo...', '.....oPpppPo....'];
const LEGS: Record<string, string[][]> = {
  down: [['.....okkokko....', '.....obbobbo....'], ['.....okkokko....', '....obbo.obo....'], ['.....okkokko....', '.....obo.obbo...']],
  side: [['.....okkokko....', '.....obbobbo....'], ['....okko.okko...', '....obbo.obbo...'], ['......okkko.....', '......obbbo.....']],
};

export type Dir = 'down' | 'up' | 'side';
// 방향별 3프레임(가만히, 왼발, 오른발). 걸을 땐 1px 통통 튄다
export function playerFrames(dir: Dir): HTMLCanvasElement[] {
  const head = dir === 'down' ? HEAD_DOWN : dir === 'up' ? HEAD_UP : HEAD_SIDE;
  const body = dir === 'down' ? BODY_DOWN : dir === 'up' ? BODY_UP : BODY_SIDE;
  const legs = dir === 'side' ? LEGS.side : LEGS.down;
  return [0, 1, 2].map((f) => make(16, 21, (g) => {
    const bob = f === 0 ? 1 : 0;
    g.map([...head, ...body, ...legs[f]], PLAYER_PAL, 0, bob);
  }));
}

const MOA_PAL: Record<string, string> = {
  o: C.ink, x: '#e3dcf2', X: '#c2b8dc', k: C.skin[1], e: C.ink, r: C.pink[2], p: C.pink[2], P: C.pink[3],
  u: C.cream[0], U: C.cream[2], l: C.lav[2], L: C.lav[3], b: '#6e5a8a', g: C.butter[3],
};
const MOA = [
  '......ooo.......', '.....oxxxo......', '....ooxXxoo.....', '...oxxxxxxxo....', '..oxXxxxxxxXxo..',
  '..oxXkkkkkkXxo..', '..oxkkkkkkkkxo..', '..oxkeekkeekxo..', '..oxkkkkkkkkxo..', '..oxkrkkkkrkxo..',
  '...okkkeekkko...', '....ookkkkoo....', '...oppppppppo...', '..okpPppppPpko..', '..okuuuuuuuuko..',
  '..oluuugguuulo..', '..olluuuuuullo..', '..olllllllllo...', '...oLlllllLo....', '....obo..obo....',
];
const MOA_BLINK = MOA.map((r, i) => (i === 7 ? '..oxkookkookxo..' : r));
export function moaFrames(): HTMLCanvasElement[] {
  return [MOA, MOA_BLINK].map((rows) => make(16, 21, (g) => g.map(rows, MOA_PAL, 0, 1)));
}

const MAR_PAL: Record<string, string> = {
  o: C.ink, w: C.white, W: C.cloud[2], p: C.pink[1], e: C.ink, n: C.pink[3], y: C.butter[2], Y: C.butter[3], t: C.lav[1],
};
const MAR = [
  '................', '..oo......oo....', '..owo....owo....', '..owpo..opwo....', '..owwwoooowwo...',
  '..owwwwwwwwwo...', '..owwewwwwewo...', '..owwewwwwewo...', '..owpwwnwwpwo...', '...owwwwwwwo....',
  '...oyyyyyyyo....', '..owwYyyyYwwo...', '..owwwwwwwwwo...', '..oWwwwwwwwWo.oo', '...oWwwwwwWo.oWo',
  '...owwooowwo.oo.', '...ooo...ooo....',
];
export function marFrames(): HTMLCanvasElement[] {
  return [0, 1].map((f) => make(16, 21, (g) => g.map(f ? MAR.map((r, i) => (i === 6 || i === 7 ? '..owwowwwwowo...' : r)) : MAR, MAR_PAL, 0, 4)));
}

// 뽀뽀: 누리 볼에 붙어 사는 빨판상어 (둥실둥실)
const POPO_PAL: Record<string, string> = { o: C.ink, m: C.mint[2], M: C.mint[3], x: C.mint[1], e: C.ink, w: C.white, f: C.mint[3] };
const POPO = [
  '....oooooo......', '..ooxmxmxmoo....', '.omxmxmxmxmmoo.o', 'omewmmmmmmmmmoom', 'omeemmmmmmmmmmfo',
  '.ommmmMMMMmmoo.o', '..oommmmmmoo....', '....oooooo......',
];
export function popoFrames(): HTMLCanvasElement[] {
  return [0, 1].map((f) => make(16, 10, (g) => g.map(POPO, POPO_PAL, 0, f)));
}
