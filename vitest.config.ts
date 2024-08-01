/// <reference types="vitest" />
import path from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    testTimeout: 25000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
