import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Ensures assets load correctly on GitHub Pages, Vercel, Netlify, and subpaths
  build: {
    outDir: 'dist'
  }
});
