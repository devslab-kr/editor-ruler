import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs', 'iife'],
  globalName: 'EditorRuler',
  dts: true,
  sourcemap: true,
  clean: true,
});
