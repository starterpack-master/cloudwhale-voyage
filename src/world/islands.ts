import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, Mesh, SphereGeometry } from 'three';
import { toon } from './materials';

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 먼 하늘에 떠 있는 섬들 (구름과 함께 뒤로 흘러감)
function island(seed: number): Group {
  const r = rng(seed);
  const g = new Group();
  const size = 2 + r() * 2.6;
  const rock = new Mesh(new ConeGeometry(size, size * 1.5, 7), toon({ color: r() > 0.5 ? '#B9A6DA' : '#C9B3D9', curve: true }));
  rock.rotation.x = Math.PI;
  rock.position.y = -size * 0.75;
  const top = new Mesh(new CylinderGeometry(size * 1.02, size * 0.95, 0.55, 7), toon({ color: '#A7DDB9', curve: true }));
  top.position.y = 0.27;
  g.add(rock, top);
  const trees = 1 + Math.floor(r() * 3);
  for (let k = 0; k < trees; k++) {
    const a = r() * Math.PI * 2;
    const d = r() * size * 0.55;
    const trunk = new Mesh(new BoxGeometry(0.22, 0.7, 0.22), toon({ color: '#B89A8A', curve: true }));
    trunk.position.set(Math.cos(a) * d, 0.85, Math.sin(a) * d);
    const blossom = r() > 0.55;
    const crown = new Mesh(blossom ? new SphereGeometry(0.75, 8, 6) : new ConeGeometry(0.7, 1.5, 7),
      toon({ color: blossom ? '#FFC8DD' : '#8FD1A8', curve: true }));
    crown.position.set(trunk.position.x, blossom ? 1.6 : 1.8, trunk.position.z);
    g.add(trunk, crown);
  }
  if (r() > 0.6) {
    const house = new Mesh(new BoxGeometry(0.9, 0.7, 0.9), toon({ color: '#FFF6E5', curve: true }));
    house.position.set(size * 0.3, 0.9, -size * 0.2);
    const roof = new Mesh(new ConeGeometry(0.8, 0.6, 4), toon({ color: '#E8A9C4', curve: true }));
    roof.position.set(house.position.x, 1.55, house.position.z);
    roof.rotation.y = Math.PI / 4;
    g.add(house, roof);
  }
  return g;
}

export class Islands {
  readonly group = new Group();
  private list: { g: Group; baseY: number; phase: number }[] = [];

  constructor() {
    for (let k = 0; k < 8; k++) {
      const g = island(k * 97 + 13);
      const r = rng(k * 31 + 7);
      g.position.set(-120 + k * 30 + r() * 12, 0, -24 - r() * 55);
      this.list.push({ g, baseY: 1.2 + r() * 3.2, phase: r() * 6 });
      this.group.add(g);
    }
  }

  update(dt: number, flowSpeed: number, t: number): void {
    for (const it of this.list) {
      it.g.position.x -= flowSpeed * dt;
      if (it.g.position.x < -125) it.g.position.x += 250;
      it.g.position.y = it.baseY + Math.sin(t * 0.4 + it.phase) * 0.25;
      it.g.rotation.y += dt * 0.02;
    }
  }
}
