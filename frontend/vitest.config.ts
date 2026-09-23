/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    // *.live.test.* hit https://yongkang.dev; run them on demand with `npm run test:live`.
    exclude: ['e2e/**', 'node_modules/**', ...(process.env.LIVE ? [] : ['**/*.live.test.*'])],
  },
})
