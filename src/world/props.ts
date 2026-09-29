import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Group, Mesh, Shape } from 'three';
import { toon, type ToonOpts } from './materials';

export type PropKind = 'pot' | 'lantern' | 'bench' | 'fence' | 'crate' | 'chime';
export const PROP_INFO: Record<PropKind, { name: string }> = {
  pot: { name: '꽃 화분' }, lantern: { name: '등불' }, bench: { name: '나무 벤치' },
  fence: { name: '낮은 울타리' }, crate: { name: '나무 상자' }, chime: { name: '풍경' },
};

function box(w: number, h: number, d: number, x: number, y: number, z: number, o: ToonOpts): Mesh {
  const m = new Mesh(new BoxGeometry(w, h, d), toon(o));
  m.position.set(x, y, z);
  return m;
}
const WOOD = { color: '#D9B08C' };
const WOOD_D = { color: '#B58E6A' };
const LAMP = { color: '#FFF3C4', emissive: '#FFE7A8', emissiveNight: 0.95, emissiveAlways: 0.25 };

// 소품: 바닥(y=0)이 타일 윗면
export function makeProp(kind: PropKind): Group {
  const g = new Group();
  switch (kind) {
    case 'pot': {
      const pot = new Mesh(new CylinderGeometry(0.19, 0.14, 0.26, 8), toon({ color: '#E7A48F' }));
      pot.position.y = 0.13;
      g.add(pot, box(0.3, 0.14, 0.3, 0, 0.32, 0, { color: '#9FD8B4' }));
      g.add(box(0.1, 0.1, 0.1, 0.07, 0.43, 0.05, { color: '#FFC8DD' }), box(0.1, 0.1, 0.1, -0.08, 0.41, -0.04, { color: '#FFF1A8' }));
      break;
    }
    case 'lantern':
      g.add(box(0.08, 0.9, 0.08, 0, 0.45, 0, { color: '#8C7BB8' }), box(0.26, 0.28, 0.26, 0, 1.02, 0, LAMP));
      g.add(box(0.34, 0.06, 0.34, 0, 1.19, 0, { color: '#5E4F96' }));
      break;
    case 'bench':
      g.add(box(0.62, 0.07, 0.28, 0, 0.26, 0, WOOD), box(0.62, 0.2, 0.05, 0, 0.42, -0.12, WOOD));
      for (const x of [-0.24, 0.24]) g.add(box(0.06, 0.24, 0.24, x, 0.12, 0, WOOD_D));
      break;
    case 'fence':
      for (const x of [-0.28, 0.28]) g.add(box(0.08, 0.42, 0.08, x, 0.21, 0, { color: '#EADBC8' }));
      g.add(box(0.64, 0.05, 0.05, 0, 0.3, 0, { color: '#F4EAD9' }), box(0.64, 0.05, 0.05, 0, 0.14, 0, { color: '#F4EAD9' }));
      break;
    case 'crate':
      g.add(box(0.46, 0.44, 0.46, 0, 0.22, 0, WOOD), box(0.48, 0.07, 0.48, 0, 0.4, 0, WOOD_D), box(0.48, 0.07, 0.48, 0, 0.06, 0, WOOD_D));
      break;
    case 'chime': {
      g.add(box(0.07, 1.1, 0.07, 0, 0.55, 0, { color: '#8C7BB8' }), box(0.36, 0.05, 0.06, 0.14, 1.08, 0, { color: '#8C7BB8' }));
      const bell = new Group();
      bell.add(box(0.02, 0.18, 0.02, 0, -0.09, 0, { color: '#FFFFFF' }));
      const cup = new Mesh(new CylinderGeometry(0.06, 0.1, 0.14, 8), toon({ color: '#BDF0DC', emissive: '#E8FFF6', emissiveNight: 0.4 }));
      cup.position.y = -0.24;
      bell.add(cup, box(0.12, 0.14, 0.02, 0, -0.4, 0, { color: '#FFF6E5' }));
      bell.position.set(0.28, 1.06, 0);
      bell.name = 'sway';
      g.add(bell);
      break;
    }
  }
  return g;
}

// 누리 등 위의 작은 오두막 (+z 쪽에 문, -x 쪽에 창)
export function makeHut(): Group {
  const g = new Group();
  const wall = { color: '#FFF6E5' };
  const W = 1.62, H = 1.0, D = 1.66;
  g.add(box(W, H, D, 0, H / 2, 0, wall));
  const tri = new Shape();
  tri.moveTo(-D / 2, 0);
  tri.lineTo(D / 2, 0);
  tri.lineTo(0, 0.62);
  tri.lineTo(-D / 2, 0);
  const gable = new Mesh(new ExtrudeGeometry(tri, { depth: W, bevelEnabled: false }), toon(wall));
  gable.geometry.rotateY(Math.PI / 2);
  gable.geometry.translate(-W / 2, H, 0);
  g.add(gable);
  const roofMat = { color: '#E8A9C4' };
  for (const s of [1, -1]) {
    const r = box(W + 0.34, 0.1, 1.16, 0, H + 0.33, s * 0.44, roofMat);
    r.rotation.x = s * 0.64;
    g.add(r);
  }
  g.add(box(W + 0.36, 0.1, 0.12, 0, H + 0.68, 0, { color: '#D48FB0' }));
  g.add(box(0.22, 0.46, 0.22, -0.42, H + 0.62, -0.3, { color: '#CDB8F0' }));
  g.add(box(0.38, 0.62, 0.05, 0.2, 0.31, D / 2 + 0.02, { color: '#B98FAF' }));
  g.add(box(0.05, 0.05, 0.03, 0.06, 0.32, D / 2 + 0.05, { color: '#FFF1A8' }));
  g.add(box(0.34, 0.3, 0.05, -0.42, 0.56, D / 2 + 0.02, LAMP));
  g.add(box(0.05, 0.3, 0.34, -W / 2 - 0.02, 0.56, 0.1, LAMP));
  g.add(box(0.5, 0.06, 0.2, -0.42, 0.36, D / 2 + 0.1, { color: '#9FD8B4' }));
  return g;
}
