# rsbuild-plugin-oxlint

Integrates [Oxlint](https://oxc-project.github.io/) into the Rsbuild build workflow.

Oxlint is a high-performance JavaScript/TypeScript linter written in Rust and compatible with
ESLint rulesets; it can be 50–100x faster than traditional JS linters. This package brings
Oxlint into the Rsbuild developer experience.

<p>
  <a href="https://npmjs.com/package/rsbuild-plugin-oxlint">
    <img src="https://img.shields.io/npm/v/rsbuild-plugin-oxlint?style=flat-square&colorA=564341&colorB=EDED91" alt="npm version" />
  </a>
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="license" />
</p>

## ✨ Features

- 🚀 Blazing fast: Oxlint (Rust) performs linting at millisecond scale for large codebases
- 🔌 Works out-of-the-box: automatically reads `.oxlintrc.json` by default
- 💡 Live feedback: lint runs on save and reports diagnostics to terminal and browser overlay
- 📋 Rich rule set: supports deny / allow / warn rule levels
- 🧩 Highly configurable: custom config paths, ignore patterns, fix mode, etc.

## 📦 Install

```bash
npm add rsbuild-plugin-oxlint -D
# or
pnpm add rsbuild-plugin-oxlint -D
# or
yarn add rsbuild-plugin-oxlint -D
```

## 🚀 Usage

```ts
// rsbuild.config.ts
import { defineConfig } from '@rsbuild/core';
import { linterPlugin } from 'rsbuild-plugin-oxlint';

export default defineConfig({
  plugins: [linterPlugin()],
});
```

Start the dev server:

```bash
npm run dev
```

Saving source files will show lint results.

## ⚙️ Configuration

`linterPlugin` supports the following options:

| Option            | Type                                                                                     | Default            | Description                                                         |
| ----------------- | ---------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------- |
| `path`            | `string`                                                                                 | -                  | Path to lint                                                         |
| `ignorePattern`   | `string \| string[]`                                                                     | -                  | Glob patterns to ignore (maps to `--ignore-pattern`)                 |
| `configFile`      | `string`                                                                                 | `'oxlintrc.json'`  | Path to the config file                                              |
| `deny`            | `string[]`                                                                               | `[]`               | Rules treated as errors (`-D`)                                       |
| `allow`           | `string[]`                                                                               | `[]`               | Rules to allow/disable (`-A`)                                        |
| `warn`            | `string[]`                                                                               | `[]`               | Rules treated as warnings (`-W`)                                     |
| `params`          | `string`                                                                                 | `''`               | Extra CLI parameters to forward                                       |
| `oxlintPath`      | `string`                                                                                 | -                  | Custom Oxlint binary path                                             |
| `format`          | `'default' \| 'checkstyle' \| 'github' \| 'gitlab' \| 'json' \| 'junit' \| 'stylish' \| 'unix'` | - | Output format                                                           |
| `quiet`           | `boolean`                                                                                | `false`            | Quiet mode                                                           |
| `fix`             | `boolean`                                                                                | `false`            | Auto-fix fixable issues                                               |
| `failOnError`     | `boolean`                                                                                | `false`            | Fail build on errors                                                  |
| `failOnWarning`   | `boolean`                                                                                | `false`            | Fail build on warnings                                                |
| `lintOnStart`     | `boolean`                                                                                | `true`             | Run lint when dev server starts                                       |

### Example

```ts
import { defineConfig } from '@rsbuild/core';
import { linterPlugin } from 'rsbuild-plugin-oxlint';

export default defineConfig({
  plugins: [
    linterPlugin({
      deny: ['no-unused-vars', 'no-debugger'],
      allow: ['no-console'],
      ignorePattern: ['dist/**', '*.d.ts'],
      failOnError: true,
      fix: true,
    }),
  ],
});
```

## 📘 Config file

You can place a `.oxlintrc.json` in your project root, e.g.:

```json
{
  "deny": ["no-unused-vars", "no-debugger"],
  "allow": ["no-console"],
  "ignore": ["dist/", "node_modules/"]
}
```

## 🏗️ Development

```bash
npm run build   # build
npm run dev     # watch
npm run test    # tests
```

For local debugging use the `playground/` directory.

## 🪪 License

[MIT](./LICENSE).
