import { defineConfig } from 'vite';

export default defineConfig({
  base: '/portfolio/',
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    sourcemap: false,
    reportCompressedSize: true,
  },
});
