import './fonts';
import './styles.css';
import Phaser from 'phaser';
import { audio } from './audio/audio';
import { PrologueScene } from './game/Prologue';
import { state, resetAll } from './game/state';
import { WorldScene } from './game/WorldScene';
import { installFrames } from './ui/frame';
import { ui } from './ui/ui';

installFrames();
ui.init(document.getElementById('ui')!);
ui.hud.visible(false);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#e4e1fb',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  scene: state.prologue ? [WorldScene, PrologueScene] : [PrologueScene, WorldScene],
});

// 시작 화면 (첫 터치에서 소리를 켠다)
const title = document.createElement('div');
title.className = 'title';
title.innerHTML = `<div class="ko">구름고래 항해기</div><div class="en">CLOUDWHALE VOYAGE</div>
  <button class="btn px start">${state.prologue ? '이어서 하기' : '시작하기'}</button>
  ${state.prologue ? '<button class="btn2 px small again">처음부터</button>' : ''}
  <div class="fine">프로토타입 v0.2 · 소리를 켜고 들어 보세요 · 가로·세로 모두 지원</div>`;
ui.root.appendChild(title);
(title.querySelector('.start') as HTMLButtonElement).onclick = () => {
  void audio.unlock().then(() => { audio.setMuted(state.muted); audio.startBgm(); });
  title.classList.add('bye');
  setTimeout(() => title.remove(), 650);
  ui.hud.visible(state.prologue);
  if (!state.prologue) (game.scene.getScene('prologue') as PrologueScene).begin();
};
title.querySelector<HTMLButtonElement>('.again')?.addEventListener('click', () => resetAll());

// 누리 등·등불항에 있을 때만 HUD 표시 (돌보기 화면이 열리면 숨김)
setInterval(() => { if (game.scene.isActive('world') && !document.querySelector('.title')) ui.hud.visible(!document.querySelector('.care')); }, 400);
(window as unknown as { __game: Phaser.Game }).__game = game; // 자동 점검용
if ('serviceWorker' in navigator && import.meta.env.PROD) void navigator.serviceWorker.register('./sw.js');
