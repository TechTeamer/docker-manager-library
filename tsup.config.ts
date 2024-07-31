import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    'docker-manager-library': 'src/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: 'build',
})
