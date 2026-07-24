# rsbuild-plugin-biome

Integrates [Biome](https://biomejs.dev/) into the [Rsbuild](https://rsbuild.dev/) build
workflow, providing high-performance linting for JS/TS/CSS/JSON files.

<p>
  <a href="https://npmjs.com/package/rsbuild-plugin-biome">
    <img src="https://img.shields.io/npm/v/rsbuild-plugin-biome?style=flat-square&colorA=564341&colorB=EDED91" alt="npm version" />
  </a>
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="license" />
</p>

## ✨ Features

- Powered by Biome for extremely fast linting
- Auto-runs on file save and reports diagnostics to terminal and browser overlay
- Supports configuration via `biome.json` / `biome.jsonc`
- Optional connection to a local Biome daemon for even faster checks
- Deep integration with Rsbuild dev server with precise file/line diagnostics

## 📦 Install

```bash
npm add rsbuild-plugin-biome -D
# or
pnpm add rsbuild-plugin-biome -D
# or
yarn add rsbuild-plugin-biome -D
```

Note: `@biomejs/biome` is automatically installed as a dependency; no manual install required.

## 🚀 Usage

Import the plugin in your `rsbuild.config.ts`:

```ts
import { defineConfig } from '@rsbuild/core';
import { linterPlugin } from 'rsbuild-plugin-biome';

export default defineConfig({
  plugins: [linterPlugin()],
});
```

Start the dev server:

```bash
npm run dev
```

When you edit and save files, the plugin runs `biome lint` and syncs diagnostics to the terminal
and the browser overlay.

## ⚙️ Configuration

Options supported by `linterPlugin`:

| Option                | Type                  | Default | Description                                                                            |
| --------------------- | --------------------- | ------- | -------------------------------------------------------------------------------------- |
| `path`                | `string`              | -       | Target path to lint, defaults to the current working directory                         |
| `configFile`          | `string`              | -       | Path or lookup directory for Biome config; when provided, default resolution is disabled |
| `failOnError`         | `boolean`             | `false` | Fail the build on errors                                                                |
| `failOnWarning`       | `boolean`             | `false` | Fail the build on warnings                                                              |
| `lintOnStart`         | `boolean`             | `true`  | Run lint once when the dev server starts                                               |
| `linterPath`          | `string`              | -       | Custom path to the Biome executable                                                    |
| `colors`              | `'off' \| 'force'`    | -       | Output formatting: `off` for plain text, `force` to force ANSI                         |
| `useServer`           | `string`              | -       | Connect to a running Biome daemon                                                      |
| `verbose`             | `string`              | -       | Print extra diagnostics and list processed/modified files                              |
| `maxDiagnostics`      | `number \| 'none'`    | `20`    | Limit the number of diagnostics shown; pass `'none'` for no limit                      |
| `skipParseErrors`     | `boolean`             | `false` | Skip files that contain syntax errors instead of reporting them                        |
| `noErrorsOnUnmatched` | `boolean`             | `false` | Suppress errors when no files were processed                                           |
| `errorOnWarnings`     | `boolean`             | `false` | Exit with an error code when warnings are present                                      |
| `diagnosticLevel`     | `'info' \| 'warn' \| 'error'` | `'info'` | Diagnostic level to display                                                            |

Example:

```ts
import { defineConfig } from '@rsbuild/core';
import { linterPlugin } from 'rsbuild-plugin-biome';

export default defineConfig({
  plugins: [
    linterPlugin({
      configFile: './biome.json',
      diagnosticLevel: 'warn',
      maxDiagnostics: 50,
      failOnError: true,
    }),
  ],
});
```

## 🏗️ Development

```bash
# Build
npm run build

# Watch / dev
npm run dev

# Test
npm run test
```

For local debugging, go to the `playground/` directory:

```bash
cd playground
npm install
npm run dev
```

## 🪪 License

[MIT](./LICENSE).
