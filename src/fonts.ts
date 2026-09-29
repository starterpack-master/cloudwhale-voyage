// 필요한 도트 글꼴(woff2)만 불러온다
import g11 from 'galmuri/dist/Galmuri11.woff2?url';
import g11b from 'galmuri/dist/Galmuri11-Bold.woff2?url';
import g14 from 'galmuri/dist/Galmuri14.woff2?url';

const faces = [
  new FontFace('Galmuri11', `url(${g11}) format('woff2')`, { display: 'swap' }),
  new FontFace('Galmuri11', `url(${g11b}) format('woff2')`, { weight: 'bold', display: 'swap' }),
  new FontFace('Galmuri14', `url(${g14}) format('woff2')`, { display: 'swap' }),
];
for (const f of faces) {
  document.fonts.add(f);
  void f.load().catch(() => undefined);
}
