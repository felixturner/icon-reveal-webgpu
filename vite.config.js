import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  // GitHub Pages serves the build from /icon-reveal-webgpu/
  base: command === 'build' ? '/icon-reveal-webgpu/' : '/',
}));
