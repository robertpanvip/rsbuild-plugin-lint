import { defineConfig } from '@rsbuild/core';
import { linterPlugin } from '../src/index.ts';

export default defineConfig({
  plugins: [linterPlugin()],
});
