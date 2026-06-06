# rsbuild-plugin-oxlint

oxlint plugin for Rsbuild.

<p>
  <a href="https://npmjs.com/package/rsbuild-plugin-example">
   <img src="https://img.shields.io/npm/v/rsbuild-plugin-example?style=flat-square&colorA=564341&colorB=EDED91" alt="npm version" />
  </a>
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="license" />
  <a href="https://npmcharts.com/compare/rsbuild-plugin-example?minimal=true"><img src="https://img.shields.io/npm/dm/rsbuild-plugin-example.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="downloads" /></a>
</p>

## Usage

Install:

```bash
npm add rsbuild-plugin-oxlint -D
```

Add plugin to your `rsbuild.config.ts`:

```ts
// rsbuild.config.ts
import { oxlintPlugin } from 'rsbuild-plugin-oxlint';

export default {
  plugins: [oxlintPlugin()],
};
```

## License

[MIT](./LICENSE).
