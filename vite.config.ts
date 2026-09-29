import { defineConfig } from 'vite';

// base './' → 어떤 정적 호스팅 경로에 올려도 동작
export default defineConfig({
  base: './',
  server: { host: true },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
    rollupOptions: { input: { main: 'index.html', preview: 'preview.html' } },
  },
});
