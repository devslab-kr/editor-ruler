import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs', 'iife'],
  globalName: 'EditorRulerSummernote',
  dts: true,
  sourcemap: true,
  clean: true,
});
