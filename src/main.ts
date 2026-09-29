import './fonts';
import './styles.css';
import { MathUtils, PerspectiveCamera, Raycaster, Scene, Vector2, Vector3 } from 'three';
import { shared } from './render/glsl';
import { PixelPipeline } from './render/pipeline';
import { createSkyBackdrop } from './render/skyBackdrop';
import { createCloudSea } from './render/cloudSea';
import { createMist } from './render/mist';
import { Particles } from './render/particles';
import { clockLabel, sky, updateSky } from './core/sky';
import { applyJournal, dayKey, journalFor, loadSave, persist, resetSave } from './core/state';
import { Whale } from './world/whale';
import { Back, TOP, type Tile } from './world/back';
import { Player } from './world/player';
import { Islands } from './world/islands';
import { Bots, type Bot } from './world/bots';
import { PROP_INFO, type PropKind } from './world/props';
import { audio } from './audio/audio';
import { openCare } from './care/careMode';
import { Hud, type Act } from './ui/hud';
import { bagPanel, BuildBar, friendsPanel, journalCard, settingsPanel, voyagePanel } from './ui/panels';

const FLOW = 1.1; // 누리가 헤엄치는 속도 = 구름이 뒤로 흐르는 속도
const GROW_MS = 90_000; // 프로토타입: 별딸기는 90초면 다 자람
const RAINBOW = ['#FF9EAE', '#FFC08A', '#FFE27A', '#9FE0B0', '#8CCBFF', '#8E9BE8', '#C49BF0'];

// ---- 장면 ----
const canvas = document.getElementById('world') as HTMLCanvasElement;
const uiRoot = document.getElementById('ui')!;
const pipe = new PixelPipeline(canvas);
const scene = new Scene();
const cam = new PerspectiveCamera(24, 1, 1, 400);
scene.add(cam);
const skyBg = createSkyBackdrop(cam);
scene.add(createCloudSea(), createMist());
const particles = new Particles();
const islands = new Islands();
scene.add(particles.points, islands.group);

const save = loadSave();
const bootJournal = journalFor(save, Date.now());
const nuri = new Whale();
const back = new Back();
nuri.group.add(back.group);
scene.add(nuri.group);
back.load(save.back ?? Back.defaults(Date.now()));
const start = back.at(6, 3) ?? back.tiles.find((t): t is Tile => !!t && back.walkable(t))!;
const player = new Player(back, start);
nuri.group.add(player.sprite);

let building = false;
let sel: PropKind | null = 'pot';
let rot = 0;
let muted = false;
let started = false;
let clock = 0;
let waveAt = -99;

const hud = new Hud(uiRoot, onAct);
const bots = new Bots((w) => scene.add(w.group), hud.labels);
bots.list.forEach((b) => { b.label.onclick = () => greet(b); });
const buildBar = new BuildBar(selectProp, () => { rot = (rot + 1) % 4; audio.ui(); buildBar.update(save.props, sel, `방향을 돌렸어요 (${rot * 90}°)`); }, () => setBuild(false));
uiRoot.appendChild(buildBar.el);

// ---- 카메라: 가로는 옆에서, 세로는 꼬리 쪽 뒤에서 (누리의 긴 몸이 화면의 긴 쪽에 오도록) ----
const rig = { az: 0, pitch: 0.6, dist: 32, taz: 0, tpitch: 0.6, tdist: 32, zoom: 1 };
const target = new Vector3(0.4, 1.3, 0);
function resize(): void {
  const w = innerWidth, h = innerHeight;
  pipe.resize(w, h);
  cam.aspect = w / h;
  cam.updateProjectionMatrix();
  skyBg.fit();
  const portrait = h > w;
  bots?.layout(portrait, !started);
  rig.taz = portrait ? -Math.PI / 2 : 0;
  rig.tpitch = portrait ? 0.8 : 0.58;
  const tanV = Math.tan(MathUtils.degToRad(cam.fov / 2));
  rig.tdist = portrait
    ? Math.max((13 * Math.sin(rig.tpitch) + 3) / tanV, 6 / (tanV * cam.aspect))
    : Math.max(12.5 / (tanV * cam.aspect), (5 * Math.sin(rig.tpitch) + 2.8) / tanV);
  particles.material.uniforms.uScale.value = pipe.ih / (2 * tanV);
}
function updateCamera(dt: number, snap = false): void {
  const k = snap ? 1 : 1 - Math.exp(-dt * 3);
  const taz = rig.taz + (started ? 0 : Math.sin(clock * 0.12) * 0.35);
  rig.az += (taz - rig.az) * k;
  rig.pitch += (rig.tpitch - rig.pitch) * k;
  rig.dist += (rig.tdist - rig.dist) * k;
  const d = rig.dist * rig.zoom;
  cam.position.set(target.x + Math.sin(rig.az) * Math.cos(rig.pitch) * d, target.y + Math.sin(rig.pitch) * d, target.z + Math.cos(rig.az) * Math.cos(rig.pitch) * d);
  cam.lookAt(target);
}

// ---- 입력: 탭 = 이동/상호작용, 두 손가락·휠 = 확대 ----
const ray = new Raycaster();
const ndc = new Vector2();
const pointers = new Map<number, { x: number; y: number }>();
let down: { x: number; y: number } | null = null;
let pinch0 = 0, zoom0 = 1;
const spread = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
canvas.addEventListener('pointerdown', (e) => {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) { pinch0 = spread(); zoom0 = rig.zoom; down = null; } else down = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener('pointermove', (e) => {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2 && pinch0) rig.zoom = MathUtils.clamp((zoom0 * pinch0) / spread(), 0.7, 1.4);
  if (building) { const t = pickTile(e.clientX, e.clientY); back.highlight(t, !!t && (back.canPlace(t) || (!!t.prop && t.kind !== 'hut'))); }
});
const release = (e: PointerEvent) => {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinch0 = 0;
  if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 14) tap(e.clientX, e.clientY);
  down = null;
};
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', (e) => { pointers.delete(e.pointerId); down = null; });
canvas.addEventListener('wheel', (e) => { rig.zoom = MathUtils.clamp(rig.zoom * (1 + Math.sign(e.deltaY) * 0.08), 0.7, 1.4); }, { passive: true });

function setRay(x: number, y: number): void {
  ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, cam);
}
function pickTile(x: number, y: number): Tile | null {
  setRay(x, y);
  const hit = ray.intersectObject(back.pick, false)[0];
  return hit ? back.fromLocal(nuri.group.worldToLocal(hit.point.clone())) : null;
}
function hitHead(x: number, y: number): boolean {
  setRay(x, y);
  const hit = ray.intersectObject(nuri.body, false)[0];
  return !!hit && nuri.group.worldToLocal(hit.point.clone()).x > 4.4;
}
const tileWorld = (t: Tile, lift = 0.3) => nuri.group.localToWorld(back.center(t).setY(TOP + lift));

function tap(x: number, y: number): void {
  if (!started) return;
  if (hud.sheetOpen) { hud.closeSheet(); return; }
  const t = pickTile(x, y);
  if (building) { if (t) buildAt(t); return; }
  if (t) interact(t);
  else if (hitHead(x, y)) spout(true);
}

function remain(t: Tile): string {
  const s = Math.max(0, Math.ceil(((t.crop?.plantedAt ?? 0) + (t.crop?.growMs ?? 0) - Date.now()) / 1000));
  return s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60}초 남았어요` : `${s}초 남았어요`;
}
function interact(t: Tile): void {
  if (t.crop) {
    if (back.progress(t, Date.now()) >= 1) player.walkTo(t, () => harvest(t), true);
    else { hud.toast(`별딸기가 자라는 중 · ${remain(t)}`, 'seed'); player.walkTo(t, undefined, true); }
  } else if (t.soil) {
    if (save.inv.seed <= 0) { hud.toast('씨앗이 없어요. 항해하며 모아 봐요', 'seed'); return; }
    player.walkTo(t, () => plant(t), true);
  } else if (t.prop) {
    player.walkTo(t, () => {
      if (t.kind === 'chime') audio.chime();
      else if (t.kind === 'hut') hud.toast('누리 등 위의 작은 오두막', 'build');
      else if (t.kind === 'bench') hud.toast('잠시 앉아 흘러가는 구름을 봐요', 'bench');
    }, true);
  } else player.walkTo(t);
}

// ---- 농사 ----
function plant(t: Tile): void {
  if (!t.soil || t.crop || save.inv.seed <= 0) return;
  save.inv.seed--;
  back.plant(t, Date.now(), GROW_MS);
  audio.plant();
  const p = tileWorld(t, 0.2);
  particles.burst(p.x, p.y, p.z, 8, '#9FD8B4', 1.4, 1);
  hud.toast(`별딸기 씨앗을 심었어요 · 남은 씨앗 ${save.inv.seed}`, 'seed');
}
function harvest(t: Tile): void {
  if (!back.harvest(t)) return;
  save.inv.berry += 2;
  addBond(0.04);
  audio.harvest();
  const p = tileWorld(t, 0.4);
  particles.burst(p.x, p.y, p.z, 16, '#FFF1A8');
  particles.burst(p.x, p.y, p.z, 8, '#FF9EC4', 1.8, 1);
  hud.toast('별딸기 +2', 'berry');
  refreshHud();
}

// ---- 꾸미기 ----
function setBuild(on: boolean): void {
  building = on;
  back.setBuildMode(on);
  buildBar.show(on);
  hud.setVisible(!on);
  hud.closeSheet();
  if (on) { buildBar.update(save.props, sel, '놓을 소품을 고르고, 누리 등 위의 빈칸을 눌러 주세요 · 놓인 소품을 누르면 치워요'); audio.open(); }
  else { back.highlight(null, true); audio.close(); persistNow(); }
}
function selectProp(k: PropKind): void {
  sel = k;
  audio.ui();
  buildBar.update(save.props, sel, save.props[k] > 0 ? `${PROP_INFO[k].name} · 빈칸을 눌러 놓아요` : `${PROP_INFO[k].name} · 남은 게 없어요. 놓인 것을 치우면 돌아와요`);
}
function buildAt(t: Tile): void {
  if (t.prop && t.kind !== 'hut') {
    const k = back.remove(t);
    if (k) { save.props[k]++; audio.remove(); buildBar.update(save.props, sel, `치웠어요 · ${PROP_INFO[k].name}`); }
    return;
  }
  if (!sel) return;
  if (!back.canPlace(t) || player.tile === t) { buildBar.update(save.props, sel, '여기에는 놓을 수 없어요'); return; }
  if (save.props[sel] <= 0) { buildBar.update(save.props, sel, `${PROP_INFO[sel].name} · 남은 게 없어요`); return; }
  back.place(sel, t, rot);
  save.props[sel]--;
  audio.place();
  const p = tileWorld(t, 0.3);
  particles.burst(p.x, p.y, p.z, 10, '#FFF1A8', 1.6);
  buildBar.update(save.props, sel, `놓았어요 · ${PROP_INFO[sel].name}`);
}

// ---- 누리 ----
const tmp = new Vector3();
const camRight = new Vector3();
function spout(sound: boolean): void {
  nuri.blowholeWorld(tmp);
  if (sound) { audio.spout(); audio.whaleCall(0, 1.4); }
  for (let k = 0; k < 50; k++) {
    const a = Math.random() * Math.PI * 2, s = Math.random() * 0.9;
    particles.spawn({ x: tmp.x, y: tmp.y + 0.2, z: tmp.z, vx: Math.cos(a) * s, vy: 5 + Math.random() * 3.5, vz: Math.sin(a) * s,
      life: 1.2 + Math.random() * 0.6, size: 0.2 + Math.random() * 0.12, color: k % 3 ? '#FFFFFF' : '#CFEFFF', kind: 1, grav: 7, drag: 0.4 });
  }
  if (shared.uNight.value > 0.5) return;
  camRight.setFromMatrixColumn(cam.matrixWorld, 0);
  RAINBOW.forEach((c, i) => {
    const r = 3.2 - i * 0.17;
    for (let k = 0; k <= 26; k++) {
      const a = (k / 26) * Math.PI;
      const p = tmp.clone().addScaledVector(camRight, Math.cos(a) * r);
      particles.spawn({ x: p.x, y: tmp.y + 1.4 + Math.sin(a) * r, z: p.z, life: 2.6, size: 0.26, color: c, kind: 1, drag: 0 });
    }
  });
}
function tailWave(): void {
  waveAt = clock;
  audio.whaleCall(0, 1.35);
  hud.toast('누리가 꼬리로 인사했어요', 'wave');
  setTimeout(() => {
    const p = nuri.group.localToWorld(tmp.set(-9.6, 1.2, 0)).clone();
    particles.burst(p.x, p.y, p.z, 24, '#FFFFFF', 2.8, 1);
    audio.splash(-0.3);
  }, 700);
  const b = bots.list[Math.floor(Math.random() * bots.list.length)];
  setTimeout(() => { b.emoteUntil = clock + 3; audio.whaleCall(0.4, 1.1); hud.toast(`${b.keeper} 님의 ${b.whale}이 답가를 불러요`, 'friends'); }, 1600);
}
function greet(b: Bot): void {
  if (!started) return;
  b.emoteUntil = clock + 3;
  audio.whaleCall(0, 1.4);
  setTimeout(() => audio.whaleCall(0.4, 1.1), 900);
  hud.toast(`${b.keeper} 님과 인사를 나눴어요`, 'wave');
}
function addBond(x: number): void {
  save.bondXp += x;
  while (save.bondXp >= 1) { save.bondXp -= 1; save.bond++; hud.toast(`누리와의 교감이 ${save.bond}단계가 되었어요`, 'care'); audio.sparkle(); }
}

// ---- 메뉴 ----
function onAct(a: Act): void {
  if (!started) return;
  audio.ui();
  if (a === 'care') startCare();
  else if (a === 'build') setBuild(true);
  else if (a === 'wave') tailWave();
  else if (a === 'bag') hud.openSheet('가방', bagPanel(save));
  else if (a === 'voyage') hud.openSheet('항해', voyagePanel(save, go));
  else if (a === 'friends') hud.openSheet('이웃 고래지기', friendsPanel(bots.list, greet));
  else if (a === 'settings') hud.openSheet('설정', settingsPanel({
    muted, preview: sky.preview,
    onMute: (m) => { muted = m; audio.setMuted(m); },
    onPreview: (p) => { sky.preview = p; },
    onReset: () => { resetSave(); location.reload(); },
  }));
}
function startCare(): void {
  hud.setVisible(false);
  hud.closeSheet();
  openCare({
    root: uiRoot,
    fortuneAvailable: save.fortuneDay !== dayKey(),
    onClose: (r) => {
      hud.setVisible(true);
      save.inv.pearl += r.pearls;
      addBond(r.bond * 0.2 + r.pearls * 0.02);
      if (r.fortune) { save.fortuneDay = dayKey(); save.fortune = r.fortune; }
      if (r.pearls || r.bond) hud.toast(`누리의 기분이 좋아졌어요${r.pearls ? ` · 하늘진주 +${r.pearls}` : ''}`, 'care');
      if (r.fortune) hud.toast(`오늘의 무지개 · ${r.fortune.name}`, 'care');
      spout(false);
      refreshHud();
      persistNow();
    },
  });
}
function go(name: string, hours: number): void {
  save.voyage = { to: name, departedAt: Date.now(), durMs: hours * 3600_000 };
  hud.closeSheet();
  hud.toast(`항해를 시작했어요 · ${name}`, 'voyage');
  persistNow();
}
function refreshHud(): void {
  hud.setCurrency(save.shells, save.inv.pearl);
  hud.setBond(save.bond, save.bondXp);
}
function persistNow(): void {
  if (!started) return;
  save.lastSeen = Date.now();
  save.back = back.save();
  persist(save);
}
function tickUi(): void {
  hud.setClock(clockLabel(sky.phase));
  const v = save.voyage;
  if (!v) { hud.setVoyage(null); return; }
  const p = (Date.now() - v.departedAt) / v.durMs;
  if (p >= 1) { hud.toast(`${v.to}에 도착했어요`, 'voyage'); save.voyage = null; hud.setVoyage(null); return; }
  const m = Math.ceil(((1 - p) * v.durMs) / 60000);
  hud.setVoyage(`${v.to}까지 ${m >= 60 ? `${Math.floor(m / 60)}시간 ` : ''}${m % 60}분`, p);
}

// ---- 매 프레임 ----
let last = performance.now();
let uiT = 0, sparkT = 0, ambT = 0, saveT = 0, breatheT = 25;
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  clock += dt;
  shared.uTime.value = clock;
  shared.uFlow.value += FLOW * dt;
  updateSky();
  audio.setMood(sky.name);
  nuri.update(clock);
  const w = clock - waveAt;
  nuri.material.uniforms.uSwim.value = 1 + (w < 2.2 ? Math.sin((w / 2.2) * Math.PI) * 1.8 : 0);
  islands.update(dt, FLOW, clock);
  camRight.setFromMatrixColumn(cam.matrixWorld, 0);
  player.update(dt, camRight, shared.uNight.value);
  const ready = back.update(clock, Date.now());
  sparkT += dt;
  if (sparkT > 0.45 && ready.length) {
    sparkT = 0;
    const p = tileWorld(ready[Math.floor(Math.random() * ready.length)], 0.55);
    particles.spawn({ x: p.x + (Math.random() - 0.5) * 0.4, y: p.y, z: p.z + (Math.random() - 0.5) * 0.4, vy: 0.6, life: 0.9, size: 0.26, color: '#FFF1A8', kind: 0, drag: 0 });
  }
  ambT += dt;
  const night = shared.uNight.value;
  if (ambT > (night > 0.5 ? 0.12 : 0.2)) {
    ambT = 0;
    if (night > 0.5) particles.spawn({ x: (Math.random() - 0.5) * 18, y: 1.8 + Math.random() * 2.6, z: (Math.random() - 0.5) * 9,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.3, vz: (Math.random() - 0.5) * 0.4, life: 3 + Math.random() * 2, size: 0.17, color: '#FFF1A8', kind: 1, drag: 0 });
    else particles.spawn({ x: 22 + Math.random() * 12, y: 2 + Math.random() * 6, z: (Math.random() - 0.5) * 30,
      vx: -1.4 - Math.random(), vy: -0.25, vz: (Math.random() - 0.5) * 0.5, life: 14, size: 0.2, color: Math.random() < 0.5 ? '#FFD6E4' : '#FFFFFF', kind: 2, drag: 0, flow: 1 });
  }
  breatheT -= dt;
  if (breatheT <= 0) { breatheT = 40 + Math.random() * 20; spout(false); if (started) audio.spout(); }
  particles.update(dt, FLOW);
  updateCamera(dt);
  bots.update(clock, dt, cam, innerWidth, innerHeight);
  uiT += dt;
  if (uiT > 0.5) { uiT = 0; tickUi(); }
  saveT += dt;
  if (saveT > 5) { saveT = 0; persistNow(); }
  pipe.render(scene, cam, shared.uFog.value);
  requestAnimationFrame(frame);
}

// ---- 시작 ----
resize();
updateSky();
updateCamera(0, true);
refreshHud();
tickUi();
window.addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => { if (document.hidden) persistNow(); });
requestAnimationFrame(frame);
hud.showTitle(() => {
  started = true;
  void audio.unlock().then(() => { audio.startBgm(); audio.whaleCall(0, 1.4); });
  hud.showModal(journalCard(bootJournal, () => {
    applyJournal(save, bootJournal);
    hud.hideModal();
    audio.coin();
    refreshHud();
    persistNow();
    hud.toast('누리 등 위의 빈칸을 눌러 걸어 보세요', 'whale');
  }));
});
if ('serviceWorker' in navigator && import.meta.env.PROD) void navigator.serviceWorker.register('./sw.js');
