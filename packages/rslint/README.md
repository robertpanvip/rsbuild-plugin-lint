# rsbuild-plugin-rslint

Integrates [Rslint](https://rsbuild.dev/guide/basic/linter.html) into the Rsbuild build
workflow.

Rslint is Rsbuild's official linter written in Rust. It supports both JavaScript and TypeScript
linting and can optionally perform TypeScript type checks. This package connects Rslint to the
Rsbuild dev server so developers see diagnostics as they save files.

<p>
  <a href="https://npmjs.com/package/rsbuild-plugin-rslint">
    <img src="https://img.shields.io/npm/v/rsbuild-plugin-rslint?style=flat-square&colorA=564341&colorB=EDED91" alt="npm version" />
  </a>
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="license" />
</p>

## ✨ Features

- 🚀 Native Rust performance
- 🧠 Type checking support: enable `--type-check` for TS type checks (on by default)
- 💡 Live feedback: lint runs on save and reports diagnostics to terminal and overlay
- 🎛️ Highly configurable: customize rules via `rslint.config.*`

## 📦 Install

```bash
npm add rsbuild-plugin-rslint -D
# or
pnpm add rsbuild-plugin-rslint -D
# or
yarn add rsbuild-plugin-rslint -D
```

## 🚀 Usage

```ts
// rsbuild.config.ts
import { defineConfig } from '@rsbuild/core';
import { linterPlugin } from 'rsbuild-plugin-rslint';

export default defineConfig({
  plugins: [linterPlugin()],
});
```

Start the dev server:

```bash
npm run dev
```

## ⚙️ Configuration

`linterPlugin` supports the following options:

| Option           | Type      | Default | Description                                                      |
| ---------------- | --------- | ------- | ---------------------------------------------------------------- |
| `path`           | `string`  | -       | Path to lint                                                      |
| `configFile`     | `string`  | -       | Path passed to `-config`                                          |
| `rslintPath`     | `string`  | -       | Custom rslint binary path                                          |
| `quiet`          | `boolean` | `false` | Quiet mode                                                         |
| `fix`            | `boolean` | `false` | Auto-fix fixable issues                                             |
| `failOnError`    | `boolean` | `false` | Fail the build on errors                                            |
| `failOnWarning`  | `boolean` | `false` | Fail the build on warnings                                          |
| `lintOnStart`    | `boolean` | `true`  | Run lint when dev server starts                                    |
| `typeCheck`      | `boolean` | `true`  | Enable TypeScript type checking                                     |
| `maxWarnings`    | `boolean` | -       | Enable maximum warnings limit                                       |
| `rule`           | `string`  | -       | Provide single-rule configuration via `--rule`                      |
| `noColor`        | `boolean` | -       | Disable ANSI colors                                                 |
| `forceColor`     | `boolean` | -       | Force ANSI colors                                                    |

### Example

```ts
import { defineConfig } from '@rsbuild/core';
import { linterPlugin } from 'rsbuild-plugin-rslint';

export default defineConfig({
  plugins: [
    linterPlugin({
      configFile: './rslint.config.js',
      typeCheck: true,
      failOnError: true,
      noColor: false,
    }),
  ],
});
```

## 🏗️ Development

```bash
npm run build   # build
npm run dev     # watch
npm run test    # tests
```

For local debugging, use the `playground/` directory.

## 🪪 License

[MIT](./LICENSE).
