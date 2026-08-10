import { defineConfig } from 'vitest/config';

// Separate from vite.config.ts on purpose: tests need neither the React
// fast-refresh nor the Tailwind plugin (esbuild handles the JSX transform).
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
