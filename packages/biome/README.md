# rsbuild-plugin-biome

rslint plugin for Rsbuild.

<p>
  <a href="https://npmjs.com/package/rsbuild-plugin-biome">
   <img src="https://img.shields.io/npm/v/rsbuild-plugin-biome?style=flat-square&colorA=564341&colorB=EDED91" alt="npm version" />
  </a>
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="license" />
  <a href="https://npmcharts.com/compare/rsbuild-plugin-biome?minimal=true"><img src="https://img.shields.io/npm/dm/rsbuild-plugin-example.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="downloads" /></a>
</p>

## Usage

Install:

```bash
npm add rsbuild-plugin-biome -D
```

Add plugin to your `rsbuild.config.ts`:

```ts
// rsbuild.config.ts
import { linterPlugin } from 'rsbuild-plugin-biome';

export default {
  plugins: [linterPlugin()],
};
```

## License

[MIT](./LICENSE).
