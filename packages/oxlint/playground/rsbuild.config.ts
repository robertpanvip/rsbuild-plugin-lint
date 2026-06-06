import { defineConfig } from '@rsbuild/core';
import { oxlintPlugin } from '../src/index.ts';

export default defineConfig({
  plugins: [oxlintPlugin()],
});
