// 오프라인 플레이 + 새 버전 바로 반영
// - 해시가 붙은 에셋(assets/): 캐시 먼저 (내용이 바뀌면 파일 이름이 바뀐다)
// - 그 밖(페이지·매니페스트·아이콘): 네트워크 먼저, 끊기면 캐시
const CACHE = 'cloudwhale-v2';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const old = (await caches.keys()).filter((k) => k !== CACHE);
    await Promise.all(old.map((k) => caches.delete(k)));
    await self.clients.claim();
    // 예전 버전이 캐시에서 띄운 화면이 있으면 새 버전으로 다시 연다 (첫 방문자는 그대로)
    if (!old.length) return;
    for (const w of await self.clients.matchAll({ type: 'window' })) w.navigate(w.url).catch(() => {});
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (url.pathname.includes('/assets/')) {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    }
    try {
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = (await cache.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' && (await cache.match('./')));
      if (hit) return hit;
      throw err;
    }
  })());
});
