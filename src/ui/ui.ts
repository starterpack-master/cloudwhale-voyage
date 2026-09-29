import { Dialog } from './dialog';
import { Hud, type Item } from './hud';

// 화면 위 UI 한 벌 (장면이 바뀌어도 유지)
export const ui = {
  root: null as unknown as HTMLElement,
  hud: null as unknown as Hud,
  dlg: null as unknown as Dialog,
  handlers: { item: (_i: Item) => undefined as void, care: () => undefined as void, menu: () => undefined as void, quest: () => undefined as void },
  busy: false, // 돌보기 화면·모달이 열려 있을 때
  init(root: HTMLElement): void {
    this.root = root;
    this.hud = new Hud(root, {
      item: (i) => this.handlers.item(i), care: () => this.handlers.care(),
      menu: () => this.handlers.menu(), quest: () => this.handlers.quest(),
    });
    this.dlg = new Dialog(root);
  },
};
