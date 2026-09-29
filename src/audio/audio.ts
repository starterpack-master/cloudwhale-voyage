// 절차적 사운드 엔진: 음원 파일 없이 Web Audio로 BGM·효과음·ASMR 소리를 만든다
export type Mood = 'day' | 'sunset' | 'night' | 'dawn';

const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
// Fmaj9 → Em7 → Dm9 → Cmaj7 (각 2마디)
const CHORDS = [[53, 57, 60, 64, 67], [52, 55, 59, 62, 66], [50, 53, 57, 60, 64], [48, 52, 55, 59, 62]];
const PENTA = [0, 2, 4, 7, 9];
const MOOD = {
  day: { pad: 1500, pluck: 0.34, oct: 0, air: 700 },
  sunset: { pad: 1100, pluck: 0.26, oct: 0, air: 550 },
  night: { pad: 650, pluck: 0.17, oct: 12, air: 380 },
  dawn: { pad: 1800, pluck: 0.3, oct: 12, air: 900 },
};
const STEP = 60 / 70 / 4; // 16분음표

interface ToneOpts { type?: OscillatorType; gain?: number; attack?: number; pan?: number; send?: number; glide?: number; dest?: AudioNode; }
interface NoiseOpts { type?: BiquadFilterType; freq: number; to?: number; q?: number; gain: number; attack?: number; pan?: number; send?: number; }

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private bgm!: GainNode;
  private sfx!: GainNode;
  private verbIn!: GainNode;
  private padFilter!: BiquadFilterNode;
  private airFilter!: BiquadFilterNode;
  private noise!: AudioBuffer;
  private muted = false;
  private vol = { bgm: 0.5, sfx: 0.9 };
  private bgmOn = false;
  private nextTime = 0;
  private step = 0;
  private mood: Mood = 'day';
  private last: Record<string, number> = {};

  get ready(): boolean { return !!this.ctx && this.ctx.state === 'running'; }

  async unlock(): Promise<void> {
    if (!this.ctx) this.build();
    const c = this.ctx!;
    if (c.state !== 'running') { try { await c.resume(); } catch { /* 다음 터치에 다시 */ } }
  }

  private build(): void {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const c = (this.ctx = new AC());
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 18; comp.ratio.value = 3.5;
    this.master = c.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(comp).connect(c.destination);
    this.bgm = c.createGain(); this.bgm.gain.value = this.vol.bgm; this.bgm.connect(this.master);
    this.sfx = c.createGain(); this.sfx.gain.value = this.vol.sfx; this.sfx.connect(this.master);
    // 리버브 (합성 임펄스)
    const len = Math.floor(c.sampleRate * 2.8);
    const ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8);
    }
    const verb = c.createConvolver();
    verb.buffer = ir;
    const verbOut = c.createGain(); verbOut.gain.value = 0.55;
    this.verbIn = c.createGain();
    this.verbIn.connect(verb).connect(verbOut).connect(this.master);
    this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.padFilter = c.createBiquadFilter(); this.padFilter.type = 'lowpass'; this.padFilter.frequency.value = MOOD.day.pad;
    this.padFilter.connect(this.bgm);
    this.airFilter = c.createBiquadFilter(); this.airFilter.type = 'lowpass'; this.airFilter.frequency.value = MOOD.day.air;
    const silent = c.createBufferSource();
    silent.buffer = c.createBuffer(1, 1, 22050);
    silent.connect(c.destination);
    silent.start();
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend(); else void this.ctx.resume();
    });
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.1);
  }

  setVolumes(v: { bgm?: number; sfx?: number }): void {
    Object.assign(this.vol, v);
    if (!this.ctx) return;
    this.bgm.gain.setTargetAtTime(this.vol.bgm, this.ctx.currentTime, 0.1);
    this.sfx.gain.setTargetAtTime(this.vol.sfx, this.ctx.currentTime, 0.1);
  }

  // ---- 기본 소리 조각 ----
  private out(pan: number, send: number, dest: AudioNode): AudioNode {
    const c = this.ctx!;
    const p = c.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    p.connect(dest);
    if (send > 0) { const s = c.createGain(); s.gain.value = send; p.connect(s).connect(this.verbIn); }
    return p;
  }

  private tone(freq: number, t: number, dur: number, o: ToneOpts = {}): OscillatorNode {
    const c = this.ctx!;
    const osc = c.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (o.glide) osc.frequency.exponentialRampToValueAtTime(o.glide, t + dur);
    const g = c.createGain();
    const a = o.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.gain ?? 0.15, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dur);
    osc.connect(g).connect(this.out(o.pan ?? 0, o.send ?? 0.15, o.dest ?? this.sfx));
    osc.start(t);
    osc.stop(t + a + dur + 0.05);
    return osc;
  }

  private noiseBurst(t: number, dur: number, o: NoiseOpts): void {
    const c = this.ctx!;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = o.type ?? 'bandpass';
    f.frequency.setValueAtTime(o.freq, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    f.Q.value = o.q ?? 1;
    const g = c.createGain();
    const a = o.attack ?? 0.004;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.gain), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dur);
    src.connect(f).connect(g).connect(this.out(o.pan ?? 0, o.send ?? 0.05, this.sfx));
    src.start(t, Math.random() * 1.6, a + dur + 0.05);
  }

  // 벨/칼림바 같은 뜯는 소리 (FM)
  private pluck(freq: number, t: number, gain: number, pan: number, dest: AudioNode, decay = 1.6): void {
    const c = this.ctx!;
    const car = c.createOscillator();
    car.frequency.value = freq;
    const mod = c.createOscillator();
    mod.frequency.value = freq * 3.5;
    const mg = c.createGain();
    mg.gain.setValueAtTime(freq * 1.2, t);
    mg.gain.exponentialRampToValueAtTime(1, t + 0.4);
    mod.connect(mg).connect(car.frequency);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    car.connect(g).connect(this.out(pan, 0.35, dest));
    car.start(t); mod.start(t);
    car.stop(t + decay + 0.1); mod.stop(t + decay + 0.1);
  }

  private throttle(key: string, min: number, max: number): boolean {
    const now = this.ctx!.currentTime;
    if (now - (this.last[key] ?? 0) < min + Math.random() * (max - min)) return false;
    this.last[key] = now;
    return true;
  }

  private get now(): number { return this.ctx!.currentTime; }
  private get ok(): boolean { return !!this.ctx && this.ctx.state === 'running'; }

  // ---- BGM ----
  startBgm(): void {
    if (!this.ok || this.bgmOn) return;
    this.bgmOn = true;
    const c = this.ctx!;
    const air = c.createBufferSource();
    air.buffer = this.noise;
    air.loop = true;
    const ag = c.createGain(); ag.gain.value = 0.014;
    air.connect(this.airFilter).connect(ag).connect(this.bgm);
    air.start();
    this.nextTime = c.currentTime + 0.1;
    this.step = 0;
    setInterval(() => this.schedule(), 25);
  }

  setMood(m: Mood): void {
    if (m === this.mood) return;
    this.mood = m;
    if (!this.ctx) return;
    this.padFilter.frequency.setTargetAtTime(MOOD[m].pad, this.now, 1.2);
    this.airFilter.frequency.setTargetAtTime(MOOD[m].air, this.now, 1.2);
  }

  private schedule(): void {
    if (!this.ok) return;
    const c = this.ctx!;
    while (this.nextTime < c.currentTime + 0.14) {
      const t = this.nextTime;
      const s = this.step;
      const chord = CHORDS[Math.floor(s / 32) % CHORDS.length];
      const md = MOOD[this.mood];
      if (s % 32 === 0) {
        const dur = STEP * 32;
        for (const n of chord) {
          for (const det of [-6, 6]) {
            const o = c.createOscillator();
            o.type = det < 0 ? 'triangle' : 'sine';
            o.frequency.value = hz(n);
            o.detune.value = det;
            const g = c.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.028, t + 1.6);
            g.gain.setValueAtTime(0.028, t + dur - 0.4);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.8);
            o.connect(g).connect(this.padFilter);
            o.start(t);
            o.stop(t + dur + 2);
          }
        }
        this.tone(hz(chord[0] - 12), t, STEP * 30, { gain: 0.05, attack: 0.8, send: 0.1, dest: this.bgm });
      }
      const onBeat = s % 4 === 0;
      if (Math.random() < md.pluck * (onBeat ? 1.4 : 0.6)) {
        const pool = Math.random() < 0.6 ? chord.map((n) => n + 12) : PENTA.map((p) => 72 + p);
        const n = pool[Math.floor(Math.random() * pool.length)] + md.oct;
        this.pluck(hz(n), t, 0.05 + Math.random() * 0.03, Math.random() * 0.8 - 0.4, this.bgm, this.mood === 'night' ? 2.4 : 1.6);
      }
      this.nextTime += STEP;
      this.step++;
    }
  }

  // ---- 효과음 ----
  ui(): void { if (!this.ok) return; const t = this.now; this.tone(1320, t, 0.22, { gain: 0.06 }); this.tone(1980, t, 0.16, { gain: 0.025 }); }
  // 대사 한 글자씩 나올 때의 작은 소리
  blip(pitch = 1): void { if (!this.ok) return; this.tone(620 * pitch + Math.random() * 40, this.now, 0.035, { gain: 0.028, type: 'triangle', send: 0 }); }
  footstep(): void { if (!this.ok) return; this.noiseBurst(this.now, 0.03, { type: 'lowpass', freq: 500, gain: 0.05 }); }
  open(): void { if (!this.ok) return; const t = this.now; this.tone(880, t, 0.25, { gain: 0.06 }); this.tone(1320, t + 0.07, 0.3, { gain: 0.06 }); }
  close(): void { if (!this.ok) return; const t = this.now; this.tone(1320, t, 0.2, { gain: 0.05 }); this.tone(880, t + 0.07, 0.3, { gain: 0.05 }); }
  plant(): void {
    if (!this.ok) return;
    const t = this.now;
    this.noiseBurst(t, 0.08, { type: 'lowpass', freq: 700, gain: 0.18 });
    this.tone(240, t, 0.12, { gain: 0.1, glide: 160, type: 'triangle' });
  }
  harvest(): void { if (!this.ok) return; const t = this.now; [1047, 1319, 1568].forEach((f, i) => this.pluck(f, t + i * 0.07, 0.09, 0.2, this.sfx, 1.2)); }
  sparkle(): void { if (!this.ok) return; const t = this.now; [2093, 2637, 3136, 2637].forEach((f, i) => this.tone(f, t + i * 0.05, 0.25, { gain: 0.025, send: 0.4 })); }
  coin(): void { if (!this.ok) return; const t = this.now; this.pluck(1568, t, 0.07, 0, this.sfx, 0.5); this.pluck(2093, t + 0.08, 0.07, 0, this.sfx, 0.8); }
  chime(): void { if (!this.ok) return; const t = this.now; this.pluck(1760, t, 0.06, 0.3, this.sfx, 2.2); this.pluck(2217, t + 0.12, 0.04, -0.2, this.sfx, 2.0); }
  place(): void {
    if (!this.ok) return;
    const t = this.now;
    this.tone(190, t, 0.09, { type: 'triangle', gain: 0.16, glide: 120 });
    this.noiseBurst(t, 0.05, { freq: 900, q: 2, gain: 0.12 });
  }
  remove(): void { if (!this.ok) return; this.noiseBurst(this.now, 0.25, { freq: 2200, to: 500, gain: 0.08, attack: 0.05 }); }

  // 낮고 부드러운 고래 울음 (pitch 1.4 ≈ 아기 고래)
  whaleCall(pan = 0, pitch = 1): void {
    if (!this.ok) return;
    const c = this.ctx!;
    const t = this.now;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900 * pitch;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.45);
    g.gain.setValueAtTime(0.16, t + 1.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
    lp.connect(g).connect(this.out(pan, 0.7, this.sfx));
    const vib = c.createOscillator(); vib.frequency.value = 5;
    const vg = c.createGain(); vg.gain.value = 5 * pitch;
    vib.connect(vg);
    for (const [type, det] of [['sine', 0], ['triangle', 7]] as const) {
      const o = c.createOscillator();
      o.type = type;
      o.detune.value = det;
      o.frequency.setValueAtTime(170 * pitch, t);
      o.frequency.exponentialRampToValueAtTime(265 * pitch, t + 0.8);
      o.frequency.exponentialRampToValueAtTime(215 * pitch, t + 1.7);
      o.frequency.exponentialRampToValueAtTime(150 * pitch, t + 2.7);
      vg.connect(o.frequency);
      o.connect(lp);
      o.start(t); o.stop(t + 2.9);
    }
    vib.start(t); vib.stop(t + 2.9);
  }

  spout(): void {
    if (!this.ok) return;
    const t = this.now;
    this.noiseBurst(t, 1.1, { freq: 700, to: 3200, q: 0.7, gain: 0.22, attack: 0.22, send: 0.3 });
    this.noiseBurst(t + 0.3, 0.9, { type: 'highpass', freq: 4000, gain: 0.05, attack: 0.1, send: 0.3 });
  }

  pop(pan = 0): void {
    if (!this.ok) return;
    const t = this.now;
    this.tone(900 + Math.random() * 300, t, 0.06, { gain: 0.12, glide: 250, pan, send: 0.1 });
    this.noiseBurst(t, 0.012, { type: 'highpass', freq: 3000, gain: 0.08, pan });
  }

  splash(pan = 0): void { if (!this.ok) return; this.noiseBurst(this.now, 0.8, { type: 'lowpass', freq: 4500, to: 600, gain: 0.26, attack: 0.02, pan, send: 0.3 }); }

  // ---- ASMR ----
  scrub(intensity: number, pan: number): void {
    if (!this.ok || !this.throttle('scrub', 0.025, 0.045)) return;
    const i = Math.max(0, Math.min(1, intensity));
    this.noiseBurst(this.now, 0.015 + Math.random() * 0.025, { freq: 2500 + Math.random() * 3500, q: 1 + Math.random() * 2, gain: 0.05 + 0.28 * i * (0.8 + Math.random() * 0.4), pan });
  }

  foam(intensity: number, pan: number): void {
    if (!this.ok || !this.throttle('foam', 0.03, 0.06)) return;
    const i = Math.max(0, Math.min(1, intensity));
    this.noiseBurst(this.now, 0.03, { type: 'lowpass', freq: 800 + Math.random() * 1200, gain: 0.04 + 0.12 * i, pan });
    if (Math.random() < 0.3) this.tone(900 + Math.random() * 300, this.now, 0.05, { gain: 0.035, glide: 1800, pan, send: 0.1 });
  }

  tickle(intensity: number, pan: number): void {
    if (!this.ok || !this.throttle('tickle', 0.04, 0.07)) return;
    this.noiseBurst(this.now, 0.05, { type: 'highpass', freq: 5200, gain: 0.012 + 0.04 * Math.min(1, intensity), pan, attack: 0.01 });
  }

  sneezeBuildUp(): void {
    if (!this.ok) return;
    const t = this.now;
    this.noiseBurst(t, 0.8, { freq: 400, to: 2000, q: 0.9, gain: 0.12, attack: 0.5 });
    this.tone(300, t, 0.8, { gain: 0.03, glide: 520, attack: 0.4 });
  }

  sneeze(): void {
    if (!this.ok) return;
    const t = this.now;
    this.noiseBurst(t, 0.35, { freq: 1800, q: 0.8, gain: 0.34, attack: 0.01, send: 0.3 });
    this.tone(95, t, 0.2, { gain: 0.25, glide: 50 });
    this.noiseBurst(t + 0.15, 0.7, { type: 'highpass', freq: 3500, gain: 0.06, attack: 0.05, send: 0.4 });
  }

  heartbeat(): void {
    if (!this.ok) return;
    const t = this.now;
    this.tone(55, t, 0.12, { gain: 0.4, attack: 0.012, send: 0 });
    this.tone(48, t + 0.18, 0.12, { gain: 0.3, attack: 0.012, send: 0 });
  }

  breathIn(d: number): void { if (!this.ok) return; this.noiseBurst(this.now, d * 0.8, { type: 'lowpass', freq: 300, to: 1300, gain: 0.05, attack: d * 0.6, send: 0.2 }); }
  breathOut(d: number): void { if (!this.ok) return; this.noiseBurst(this.now, d * 0.9, { type: 'lowpass', freq: 1300, to: 280, gain: 0.05, attack: 0.3, send: 0.2 }); }

  pat(): void {
    if (!this.ok) return;
    const t = this.now;
    this.tone(110, t, 0.1, { gain: 0.2, glide: 80, send: 0.05 });
    this.noiseBurst(t, 0.06, { type: 'lowpass', freq: 400, gain: 0.1 });
  }
}

export const audio = new AudioEngine();

export function haptic(ms: number): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(ms);
}
