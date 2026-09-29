import './care.css';
import { audio, haptic } from '../audio/audio';
import { icon, pixelCanvas } from '../art/pixel';

export interface Fortune { color: string; name: string; effect: string; }
export interface CareResult { pearls: number; bond: number; fortune: Fortune | null; }
export interface CareOptions { root: HTMLElement; onClose: (r: CareResult) => void; fortuneAvailable: boolean; }

type Tool = 'brush' | 'sponge' | 'feather' | 'heart';
type Face = 'idle' | 'happy' | 'squint' | 'closed' | 'surprised';
interface Part { x: number; y: number; vx: number; vy: number; life: number; max: number; col: string; g: number; }
interface Bubble { x: number; y: number; r: number; }
interface Barn { u: number; v: number; hp: number; gone: boolean; }

const FORTUNES: Fortune[] = [
  { color: '#FF9EAE', name: '빨강', effect: '채집할 때 재료가 조금 더 나와요' },
  { color: '#FFC08A', name: '주황', effect: '요리 효과가 오래가요' },
  { color: '#FFE27A', name: '노랑', effect: '판매 가격이 조금 올라요' },
  { color: '#9FE0B0', name: '초록', effect: '작물이 조금 더 빨리 자라요' },
  { color: '#8CCBFF', name: '파랑', effect: '귀한 물고기를 만날 확률이 올라요' },
  { color: '#8E9BE8', name: '남색', effect: '숨은 보물이 더 잘 보여요' },
  { color: '#C49BF0', name: '보라', effect: '희귀한 표류물이 흘러와요' },
];
const HINT: Record<Tool, string> = {
  brush: '따개비를 문질러 떼어 주세요',
  sponge: '몸을 둥글게 문질러 거품을 내 주세요',
  feather: '숨구멍 주변을 살살 간질여 보세요',
  heart: '누리 몸에 손을 얹고 가만히 있어 보세요',
};
const TOOL_NAME: Record<Tool, string> = { brush: '따개비', sponge: '거품', feather: '깃털', heart: '심장 소리' };
const BARNS: [number, number][] = [[-0.12, -0.62], [0.06, -0.8], [0.2, -0.45], [0.36, -0.68], [0.44, -0.3], [-0.02, -0.28], [0.58, -0.52], [0.15, -0.12]];

const hex = (h: string): [number, number, number] => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const C = {
  line: hex('#5E4F96'), top: hex('#C4E6FF'), sky: hex('#A8DAFF'), lav: hex('#CDB8F0'), lilac: hex('#9A86D0'),
  cream: hex('#FFF6E5'), groove: hex('#EADFF0'), creamS: hex('#E3D8EE'), bgTop: hex('#CFE8FF'), bgBot: hex('#FFEFF3'),
  cloud: hex('#FFFFFF'), cloudS: hex('#EFE9FA'),
};

// 도구 아이콘
const TOOL_ICON: Record<Tool, () => HTMLCanvasElement> = {
  brush: () => pixelCanvas(16, 16, (c) => {
    c.fillStyle = '#D9B08C'; c.fillRect(9, 2, 3, 8);
    c.fillStyle = '#FFF6E5'; c.fillRect(4, 10, 11, 3);
    c.fillStyle = '#FFC8DD'; for (let x = 4; x < 15; x += 2) c.fillRect(x, 13, 1, 2);
  }),
  sponge: () => pixelCanvas(16, 16, (c) => {
    c.fillStyle = '#FFF1A8'; c.fillRect(2, 5, 12, 8);
    c.fillStyle = '#F2C46B'; c.fillRect(4, 7, 2, 2); c.fillRect(9, 9, 2, 2); c.fillRect(11, 6, 1, 1);
    c.fillStyle = '#FFFFFF'; c.fillRect(3, 2, 3, 3); c.fillRect(10, 1, 2, 2);
  }),
  feather: () => pixelCanvas(16, 16, (c) => {
    c.fillStyle = '#FFC8DD'; c.beginPath(); c.ellipse(9, 7, 3.5, 6.5, 0.6, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#FFFFFF'; c.fillRect(8, 4, 1, 6);
    c.fillStyle = '#B98FAF'; c.fillRect(4, 12, 1, 3); c.fillRect(5, 11, 1, 1);
  }),
  heart: () => icon('care'),
};

export function openCare(opts: CareOptions): void {
  const el = document.createElement('div');
  el.className = 'care';
  el.innerHTML = `
    <div class="care-top"><div class="care-title">누리 돌보기</div>
      <span class="care-chip" data-k="barn"></span><span class="care-chip" data-k="pearl"></span><span class="care-chip" data-k="bond"></span>
      <button class="care-done">완료</button></div>
    <div class="care-stage"><canvas class="care-cv"></canvas><div class="care-fx"></div>
      <button class="care-rinse hidden">헹구기</button><div class="care-card"></div></div>
    <div class="care-hint"></div>
    <div class="care-tools"></div>`;
  opts.root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  audio.open();

  const $ = <T extends HTMLElement>(s: string) => el.querySelector(s) as T;
  const stage = $<HTMLDivElement>('.care-stage');
  const cv = $<HTMLCanvasElement>('.care-cv');
  const fx = $<HTMLDivElement>('.care-fx');
  const hint = $<HTMLDivElement>('.care-hint');
  const card = $<HTMLDivElement>('.care-card');
  const rinseBtn = $<HTMLButtonElement>('.care-rinse');
  const ctx = cv.getContext('2d')!;

  let tool: Tool = 'brush';
  let pearls = 0, bond = 0;
  let fortune: Fortune | null = null;
  let fortuneUsed = !opts.fortuneAvailable;
  let iw = 240, ih = 135, sc = 3;
  let cx = 0, cy = 0, rx = 1, ry = 1;
  const barns: Barn[] = BARNS.map(([u, v]) => ({ u, v, hp: 1, gone: false }));
  let allClean = false;
  let bubbles: Bubble[] = [];
  let foam = 0, sweep = -1, foamDone = false;
  let tickle = 0, sneezeAt = -1, rainbowAt = -99;
  let holding = false, breath = 0, beat = 0, restDone = false, lastHalf = -1;
  const parts: Part[] = [];
  let happyUntil = 0, squintUntil = 0, blinkAt = 2, pulse = 0, twitch = 0, time = 0;
  const ptr = { x: -99, y: -99, down: false, lx: 0, ly: 0 };
  const icons = Object.fromEntries((Object.keys(TOOL_ICON) as Tool[]).map((k) => [k, TOOL_ICON[k]()])) as Record<Tool, HTMLCanvasElement>;

  // 도구 버튼
  const tools = $<HTMLDivElement>('.care-tools');
  (Object.keys(TOOL_NAME) as Tool[]).forEach((t) => {
    const b = document.createElement('button');
    b.className = 'care-tool';
    b.dataset.tool = t;
    const img = new Image();
    img.src = icons[t].toDataURL();
    b.append(img, Object.assign(document.createElement('span'), { textContent: TOOL_NAME[t] }));
    b.onclick = () => { tool = t; audio.ui(); refresh(); };
    tools.appendChild(b);
  });

  function refresh(): void {
    tools.querySelectorAll<HTMLButtonElement>('.care-tool').forEach((b) => b.classList.toggle('on', b.dataset.tool === tool));
    const left = barns.filter((b) => !b.gone).length;
    $<HTMLSpanElement>('[data-k="barn"]').textContent = `따개비 ${BARNS.length - left}/${BARNS.length}`;
    $<HTMLSpanElement>('[data-k="pearl"]').textContent = `하늘진주 +${pearls}`;
    $<HTMLSpanElement>('[data-k="bond"]').textContent = `교감 +${bond}`;
    if (tool === 'sponge' && foamDone) hint.textContent = '거품이 가득해요. 헹궈 볼까요?';
    else if (tool === 'brush' && allClean) hint.textContent = '따개비를 모두 떼어 냈어요. 누리가 개운해 보여요';
    else if (!(tool === 'heart' && holding)) hint.textContent = HINT[tool];
    rinseBtn.classList.toggle('hidden', !(tool === 'sponge' && foamDone && sweep < 0));
  }

  function layout(): void {
    const r = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const short = Math.min(r.width, r.height) * dpr;
    sc = Math.max(2, Math.round(short / 150));
    iw = Math.ceil((r.width * dpr) / sc);
    ih = Math.ceil((r.height * dpr) / sc);
    cv.width = iw;
    cv.height = ih;
    cv.style.width = `${(iw * sc) / dpr}px`;
    cv.style.height = `${(ih * sc) / dpr}px`;
    ctx.imageSmoothingEnabled = false;
    if (iw >= ih) {
      ry = Math.round(ih * 0.42); rx = Math.round(ry * 2.3);
      cx = Math.round(Math.min(iw * 0.93, iw - 6) - rx); cy = Math.round(ih * 0.62);
    } else {
      ry = Math.round(Math.min(ih * 0.25, iw * 0.44)); rx = Math.round(ry * 1.65);
      cx = Math.round(iw - 5 - rx); cy = Math.round(ih * 0.6);
    }
  }

  // 캔버스 좌표 → 화면(스테이지) 좌표
  const toCss = (x: number, y: number) => {
    const r = cv.getBoundingClientRect();
    const s = stage.getBoundingClientRect();
    return [r.left - s.left + (x / iw) * r.width, r.top - s.top + (y / ih) * r.height];
  };
  function float(text: string, x: number, y: number): void {
    const [px, py] = toCss(x, y);
    const f = document.createElement('div');
    f.className = 'care-float';
    f.textContent = text;
    f.style.left = `${px}px`;
    f.style.top = `${py}px`;
    fx.appendChild(f);
    setTimeout(() => f.remove(), 1200);
  }
  const burst = (x: number, y: number, n: number, cols: string[], sp = 40, g = 60) => {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, s = sp * (0.3 + Math.random() * 0.7);
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - sp * 0.5, life: 0.6 + Math.random() * 0.5, max: 1.1, col: cols[k % cols.length], g });
    }
  };
  // 누리 실루엣: 앞(머리)은 뭉툭하게, 뒤(꼬리 쪽)로 갈수록 가늘게
  const shapeE = (x: number, y: number, ox: number, oy: number, ery: number) => {
    const nx = (x - ox) / rx;
    const ny = (y - oy) / (ery * (nx < 0 ? 1 + nx * 0.3 : 1));
    return (nx > 0 ? Math.pow(Math.abs(nx), 2.6) : nx * nx) + ny * ny;
  };
  const inWhale = (x: number, y: number) => shapeE(x, y, cx, cy, ry) <= 1;
  const barnPos = (b: Barn): [number, number] => [cx + b.u * rx, cy + b.v * ry];
  const blowhole = (): [number, number] => [cx + rx * 0.34, cy - ry * Math.sqrt(1 - Math.pow(0.34, 2.6)) + 3];
  const pan = (x: number) => (x / iw) * 2 - 1;
  const face = (): Face => {
    if (sneezeAt > 0) return 'surprised';
    if (tool === 'heart' && holding) return 'closed';
    if (time < squintUntil) return 'squint';
    if (time < happyUntil || restDone) return 'happy';
    if (time > blinkAt && time < blinkAt + 0.13) return 'closed';
    if (time > blinkAt + 0.13) blinkAt = time + 2.5 + Math.random() * 3;
    return 'idle';
  };
  const cheer = (s = 1.6) => { happyUntil = time + s; };

  // ---- 손 동작 ----
  function toCanvas(e: PointerEvent): void {
    const r = cv.getBoundingClientRect();
    ptr.x = ((e.clientX - r.left) / r.width) * iw;
    ptr.y = ((e.clientY - r.top) / r.height) * ih;
  }
  function move(dist: number): void {
    const speed = Math.min(1, dist / 6);
    if (tool === 'brush') {
      for (const b of barns) {
        if (b.gone) continue;
        const [bx, by] = barnPos(b);
        if (Math.hypot(ptr.x - bx, ptr.y - by) > Math.max(7, ry * 0.13)) continue;
        audio.scrub(speed, pan(ptr.x));
        squintUntil = time + 0.25;
        b.hp -= dist * 0.02;
        if (Math.random() < 0.5) parts.push({ x: bx, y: by, vx: (Math.random() - 0.5) * 30, vy: -10 - Math.random() * 20, life: 0.4, max: 0.4, col: '#E6E1F2', g: 60 });
        if (b.hp <= 0) {
          b.gone = true;
          pearls++;
          audio.pop(pan(bx));
          haptic(15);
          burst(bx, by, 10, ['#FFFFFF', '#FFF1A8', '#E6E1F2']);
          float('+1 하늘진주', bx, by - 6);
          if (barns.every((q) => q.gone)) { allClean = true; bond++; cheer(3); audio.whaleCall(0, 1.4); audio.sparkle(); }
          refresh();
        }
      }
    } else if (tool === 'sponge' && !foamDone && inWhale(ptr.x, ptr.y) && dist > 0.5) {
      audio.foam(speed, pan(ptr.x));
      if (Math.random() < Math.min(1, dist / 3)) {
        bubbles.push({ x: ptr.x + (Math.random() - 0.5) * 6, y: ptr.y + (Math.random() - 0.5) * 6, r: 2 + Math.floor(Math.random() * 4) });
        if (bubbles.length > 180) bubbles.shift();
        foam = Math.min(1, foam + 0.012);
        if (foam >= 1) { foamDone = true; audio.chime(); refresh(); }
      }
    } else if (tool === 'feather' && sneezeAt < 0) {
      const [hx, hy] = blowhole();
      if (Math.hypot(ptr.x - hx, ptr.y - hy) < Math.max(18, ry * 0.35) && dist > 0.3) {
        audio.tickle(speed, pan(ptr.x));
        tickle = Math.min(1, tickle + dist * 0.004);
        twitch = 0.15;
        if (tickle >= 1) { sneezeAt = time + 0.85; audio.sneezeBuildUp(); }
      }
    }
  }
  const down = (e: PointerEvent) => {
    cv.setPointerCapture(e.pointerId);
    toCanvas(e);
    ptr.down = true; ptr.lx = ptr.x; ptr.ly = ptr.y;
    if (tool === 'heart' && inWhale(ptr.x, ptr.y) && !restDone) { holding = true; audio.pat(); refresh(); }
  };
  const moveEv = (e: PointerEvent) => {
    toCanvas(e);
    if (!ptr.down) return;
    const d = Math.hypot(ptr.x - ptr.lx, ptr.y - ptr.ly);
    ptr.lx = ptr.x; ptr.ly = ptr.y;
    if (tool === 'heart') { if (d > 6) holding = false; return; }
    move(d);
  };
  const up = () => { ptr.down = false; if (holding) { holding = false; refresh(); } };
  cv.addEventListener('pointerdown', down);
  cv.addEventListener('pointermove', moveEv);
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('pointerleave', () => { if (!ptr.down) ptr.x = ptr.y = -99; });

  rinseBtn.onclick = () => { sweep = 0; audio.splash(0); rinseBtn.classList.add('hidden'); };

  function showFortune(): void {
    if (fortuneUsed) { hint.textContent = '오늘의 무지개는 이미 받았어요'; return; }
    fortuneUsed = true;
    fortune = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
    card.innerHTML = `<div class="sw" style="background:${fortune.color}"></div>
      <div class="t">오늘의 무지개 · ${fortune.name}</div><div class="d">${fortune.effect}</div><div class="k">화면을 누르면 닫혀요</div>`;
    card.classList.add('show');
    audio.chime();
    card.onclick = () => card.classList.remove('show');
  }

  // ---- 시간 흐름 ----
  function step(dt: number): void {
    time += dt;
    twitch = Math.max(0, twitch - dt);
    pulse = Math.max(0, pulse - dt * 3);
    if (sneezeAt > 0 && time >= sneezeAt) {
      sneezeAt = -1;
      tickle = 0;
      audio.sneeze();
      haptic(30);
      const [hx, hy] = blowhole();
      for (let k = 0; k < 46; k++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.1, s = 60 + Math.random() * 70;
        parts.push({ x: hx, y: hy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.9 + Math.random() * 0.5, max: 1.4, col: k % 3 ? '#FFFFFF' : '#A8DAFF', g: 120 });
      }
      rainbowAt = time;
      cheer(2.5);
      bond++;
      refresh();
      setTimeout(showFortune, 900);
    }
    if (sweep >= 0) {
      sweep += dt / 1.3;
      const sx = sweep * (iw + 20) - 10;
      bubbles = bubbles.filter((b) => {
        if (b.x > sx) return true;
        if (Math.random() < 0.5) audio.pop(pan(b.x));
        parts.push({ x: b.x, y: b.y, vx: 20 + Math.random() * 20, vy: -20 * Math.random(), life: 0.4, max: 0.4, col: '#DDF1FF', g: 80 });
        return false;
      });
      if (sweep >= 1) {
        sweep = -1; foam = 0; foamDone = false; bubbles = [];
        bond++; cheer(3);
        for (let k = 0; k < 16; k++) burst(cx + (Math.random() * 1.6 - 0.6) * rx * 0.6, cy - Math.random() * ry * 0.8, 1, ['#FFFFFF', '#FFF1A8']);
        audio.sparkle(); audio.whaleCall(0, 1.45);
        float('뽀송해졌어요', cx + rx * 0.3, cy - ry * 0.9);
        refresh();
      }
    }
    if (tool === 'heart' && holding && !restDone) {
      beat += dt;
      if (beat >= 1.2) { beat = 0; pulse = 1; audio.heartbeat(); haptic(8); }
      breath += dt;
      const half = Math.floor(breath / 4);
      if (half !== lastHalf) {
        lastHalf = half;
        if (half % 2 === 0) { audio.breathIn(4); hint.textContent = '들이쉬고…'; } else { audio.breathOut(4); hint.textContent = '내쉬고…'; }
      }
      if (breath >= 24) {
        restDone = true; holding = false; bond++; cheer(4);
        hint.textContent = '마음이 편안해졌어요';
        float('교감 +1', cx + rx * 0.4, cy - ry * 0.8);
        audio.whaleCall(0, 1.3);
        refresh();
      }
    }
    for (const p of parts) { p.life -= dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);
  }

  // ---- 그리기 ----
  let dcx = 0, dcy = 0, dry = 1;
  const fill = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const disc = (x: number, y: number, r: number, col: string) => {
    ctx.fillStyle = col;
    for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy)); ctx.fillRect(Math.round(x) - w, Math.round(y) + dy, w * 2 + 1, 1); }
  };

  function drawBase(): void {
    const img = ctx.createImageData(iw, ih);
    const d = img.data;
    dcx = cx + (twitch > 0 ? Math.round(Math.sin(time * 70)) : 0);
    dcy = cy + Math.round(Math.sin(time * 1.3)) - (sneezeAt > 0 ? 1 : 0);
    dry = ry + (pulse > 0.5 ? 1 : 0) + (sneezeAt > 0 ? 1 : 0);
    const cl = [0, 1, 2].map((k) => [((k * 131 + time * (3 + k)) % (iw + 80)) - 40, ih * (0.1 + k * 0.11), 6 + (k % 2) * 3]);
    for (let y = 0; y < ih; y++) {
      const t = y / ih;
      const row = [0, 1, 2].map((c) => C.bgTop[c] + (C.bgBot[c] - C.bgTop[c]) * t);
      for (let x = 0; x < iw; x++) {
        const e = shapeE(x, y, dcx, dcy, dry);
        let col: number[] = row;
        if (e <= 1) {
          const edge = shapeE(x + 1, y, dcx, dcy, dry) > 1 || shapeE(x - 1, y, dcx, dcy, dry) > 1
            || shapeE(x, y + 1, dcx, dcy, dry) > 1 || shapeE(x, y - 1, dcx, dcy, dry) > 1;
          if (edge) col = C.line;
          else {
            const nx = (x - dcx) / rx, ny = (y - dcy) / dry;
            const dot = -0.35 * nx - 0.72 * ny + 0.6 * Math.sqrt(1 - e);
            if (ny > 0.34 - nx * 0.1) col = (e * 11) % 1 < 0.16 ? C.groove : dot < 0.08 ? C.creamS : C.cream;
            else col = dot > 0.66 ? C.top : dot > 0.3 ? C.sky : dot > 0.02 ? C.lav : C.lilac;
          }
        } else {
          for (const [kx, ky, kr] of cl) {
            for (const [ox, oy, s] of [[-1.3, 0.3, 1], [0, -0.35, 1.3], [1.3, 0.35, 0.95]]) {
              if ((x - kx - ox * kr) ** 2 + (y - ky - oy * kr) ** 2 <= (kr * s) ** 2) col = y > ky + kr * 0.45 ? C.cloudS : C.cloud;
            }
          }
        }
        const i = (y * iw + x) * 4;
        d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  // 회전한 타원을 1px 외곽선과 함께 칠하기
  function blob(x0: number, y0: number, a: number, b: number, ang: number, col: string, line: string): void {
    const c = Math.cos(ang), s = Math.sin(ang), R = Math.ceil(Math.max(a, b)) + 1;
    const ins = (px: number, py: number) => {
      const dx = px - x0, dy = py - y0, u = (dx * c + dy * s) / a, v = (-dx * s + dy * c) / b;
      return u * u + v * v <= 1;
    };
    for (let py = Math.floor(y0 - R); py <= y0 + R; py++) for (let px = Math.floor(x0 - R); px <= x0 + R; px++) {
      if (!ins(px, py)) continue;
      fill(px, py, 1, 1, !ins(px + 1, py) || !ins(px - 1, py) || !ins(px, py + 1) || !ins(px, py - 1) ? line : col);
    }
  }

  function drawFace(): void {
    const es = Math.max(1, Math.round(ry / 22));
      blob(dcx + rx * 0.5, dcy + dry * 0.72, dry * 0.34, dry * 0.12, -0.55 + Math.sin(time * 1.4) * 0.1, '#CDB8F0', '#5E4F96');
    const ex = dcx + rx * 0.74, ey = dcy + dry * 0.1;
    const P = (x: number, y: number, col = '#3E3470') => fill(ex + x * es, ey + y * es, es, es, col);
    const f = face();
    if (f === 'idle' || f === 'surprised') {
      const w = f === 'surprised' ? 4 : 3, h = f === 'surprised' ? 5 : 4;
      fill(ex, ey, w * es, h * es, '#3E3470');
      P(0, 0, '#FFFFFF');
      P(w - 1, h - 2, '#FFFFFF');
    } else if (f === 'happy') {
      [[-1, 2], [0, 1], [1, 0], [2, 0], [3, 1], [4, 2]].forEach(([x, y]) => P(x, y));
    } else if (f === 'closed') {
      [[-1, 1], [0, 2], [1, 3], [2, 3], [3, 2], [4, 1]].forEach(([x, y]) => P(x, y));
    } else {
      [[-1, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 1]].forEach(([x, y]) => P(x, y));
    }
    fill(ex - es, ey + 5 * es, 4 * es, 2 * es, f === 'idle' && !restDone ? '#FFD3E2' : '#FFB9C8');
    const k = Math.max(1, es - 1);
    for (const [u, v] of [[0.86, 0.26], [0.9, 0.15], [0.8, 0.34]]) {
      const sx = dcx + rx * u, sy = dcy + dry * v;
      fill(sx, sy - k, k, k * 3, '#FFF1A8');
      fill(sx - k, sy, k * 3, k, '#FFF1A8');
    }
    // 입선: 머리 앞에서 눈 아래까지 부드럽게, 끝은 살짝 올라감
    const x0 = dcx + rx * 0.965, y0 = dcy + dry * 0.26, x1 = dcx + rx * 0.84, y1 = dcy + dry * 0.52, x2 = dcx + rx * 0.62, y2 = dcy + dry * 0.42;
    for (let q = 0; q <= 40; q++) {
      const t = q / 40;
      const x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * x1 + t * t * x2, y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * y1 + t * t * y2;
      fill(x, y, k, k, '#7E6FB0');
    }
    fill(x2 - k, y2 - k, k, k, '#7E6FB0');
  }

  function draw(): void {
    drawBase();
    const es = Math.max(1, Math.round(ry / 22));
    // 숨구멍 두 개 + 새싹
    const [hx0, hy0] = blowhole();
    const hx = hx0, hy = hy0 + dcy - cy;
    for (const s of [-1, 1]) { fill(hx + s * 2 * es - (s < 0 ? es : 0), hy, es, es, '#6F669C'); fill(hx + s * es - (s < 0 ? es : 0), hy + es, es, es, '#6F669C'); }
    fill(hx - 6 * es, hy - 4 * es, es, 4 * es, '#8FD1A8');
    fill(hx - 8 * es, hy - 5 * es, 2 * es, es, '#9FD8B4');
    fill(hx - 5 * es, hy - 6 * es, 2 * es, es, '#9FD8B4');
    drawFace();
    for (const b of barns) {
      if (b.gone) continue;
      const [bx, by0] = barnPos(b);
      const by = by0 + dcy - cy;
      const r = Math.max(2, Math.round(es * 2.2 * (0.55 + 0.45 * b.hp)));
      blob(bx, by, r * 1.15, r * 0.85, 0, '#CBC3E0', '#7E74A8');
      fill(bx - r * 0.6, by - r * 0.45, Math.max(1, es - 1), 1, '#F3F0FA');
      blob(bx + 0.5, by - r * 0.15, Math.max(1, r * 0.5), Math.max(1, r * 0.32), 0, '#6F669C', '#8E86B0');
    }
    for (const b of bubbles) { disc(b.x, b.y, b.r + 1, '#D9D2F0'); disc(b.x, b.y, b.r, '#FFFFFF'); fill(b.x - b.r / 2, b.y - b.r / 2, 1, 1, '#DDF1FF'); }
    if (sweep >= 0) {
      const sx = sweep * (iw + 20) - 10;
      for (let y = 0; y < ih; y++) for (let x = Math.floor(sx - 8); x < sx; x++) if ((x + y + Math.floor(time * 30)) % 3 === 0) fill(x, y, 1, 1, '#DDF1FF');
    }
    const age = time - rainbowAt;
    if (age < 3) {
      const bands = ['#FF9EAE', '#FFC08A', '#FFE27A', '#9FE0B0', '#8CCBFF', '#8E9BE8', '#C49BF0'];
      const bw = Math.max(1, Math.round(ry / 20));
      const R0 = Math.round(ry * 0.95);
      const alpha = age < 2.2 ? Math.min(1, age * 3) : 1 - (age - 2.2) / 0.8;
      bands.forEach((col, k) => {
        const r = R0 - k * bw;
        for (let a = Math.PI; a <= Math.PI * 2; a += 0.6 / r) {
          const x = Math.round(hx + Math.cos(a) * r), y = Math.round(hy - 4 + Math.sin(a) * r);
          if (((x * 7 + y * 13) % 10) / 10 < alpha) fill(x, y, bw, bw, col);
        }
      });
    }
    for (const p of parts) if ((p.life / p.max) > 0.15 || Math.floor(time * 20) % 2) fill(p.x, p.y, 1, 1, p.col);
    if (tool === 'heart' && holding) {
      const ph = (breath % 8) / 4;
      const k = ph < 1 ? ph : 2 - ph;
      const r = 5 + Math.round(k * 14);
      for (let a = 0; a < Math.PI * 2; a += 0.5 / r) fill(ptr.x + Math.cos(a) * r, ptr.y + Math.sin(a) * r, 1, 1, '#FFC8DD');
    }
    if (ptr.x > -50 && !(tool === 'heart' && holding)) ctx.drawImage(icons[tool], Math.round(ptr.x - 8), Math.round(ptr.y - 13));
    const meter = tool === 'sponge' ? foam : tool === 'feather' ? tickle : -1;
    if (meter >= 0) {
      const w = Math.min(60, Math.round(iw * 0.3)), x = Math.round((iw - w) / 2), y = 4;
      fill(x - 1, y - 1, w + 2, 5, '#5E4F96');
      fill(x, y, w, 3, '#FFF6E5');
      fill(x, y, Math.round(w * meter), 3, tool === 'sponge' ? '#A8DAFF' : '#FFC8DD');
    }
  }

  let raf = 0, last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    draw();
    raf = requestAnimationFrame(frame);
  };
  const onResize = () => layout();
  window.addEventListener('resize', onResize);
  layout();
  refresh();
  raf = requestAnimationFrame(frame);

  $<HTMLButtonElement>('.care-done').onclick = () => {
    audio.close();
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
    el.classList.remove('show');
    setTimeout(() => el.remove(), 280);
    opts.onClose({ pearls, bond, fortune });
  };
}
