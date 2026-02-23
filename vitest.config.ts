import { defineConfig } from 'vitest/config';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    transformMode: {
      web: [/\.[jt]sx?$/],
    },
    
    deps: {
      optimizer: {
        web: {
          include: ['solid-js'],
        },
      },
    },
  },
});