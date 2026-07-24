# rsbuild-plugin-lint

A collection of high-performance lint plugins for Rsbuild. These plugins integrate Rust-based
linting tools into the Rsbuild workflow, providing ready-to-use code quality checks for projects.

<p>
  <a href="https://github.com/robertpanvip/rsbuild-plugin-lint/actions">
    <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="license" />
  </a>
</p>

## ✨ Features

- 🚀 High performance: Built on Rust-based linters that are orders of magnitude faster than typical JS linters.
- 🔌 Plug-and-play: Simply add the plugin to your `rsbuild.config.ts` to enable linting during development.
- 💡 Live feedback: Lint results are reported to the terminal and browser overlay with precise locations.
- 🧩 Modular design: Core logic is decoupled from specific linters for easy extension and maintenance.
- 🔧 Highly configurable: Options include custom config paths, lint-on-start, rule overrides, and more.

## 📦 Packages

This monorepo contains the following packages:

| Package                       | Description                                                 | Docs                                  |
| ---------------------------- | ----------------------------------------------------------- | ------------------------------------- |
| `rsbuild-plugin-biome`       | Biome-based lint plugin                                      | [README](packages/biome/README.md)    |
| `rsbuild-plugin-oxlint`      | Oxlint-based lint plugin                                     | [README](packages/oxlint/README.md)   |
| `rsbuild-plugin-rslint`      | Rslint-based lint plugin                                     | [README](packages/rslint/README.md)   |
| `rsbuild-plugin-lint` (core) | Generic core plugin used to wrap any command-line linter     | [README](packages/core/README.md)     |

## 📖 Usage

Example using `rsbuild-plugin-oxlint`:

```bash
npm add rsbuild-plugin-oxlint -D
```

```ts
// rsbuild.config.ts
import { defineConfig } from '@rsbuild/core';
import { linterPlugin } from 'rsbuild-plugin-oxlint';

export default defineConfig({
  plugins: [linterPlugin()],
});
```

After starting the dev server, saving files triggers lint checks and results will appear
both in the terminal and in the browser overlay.

## 🏗️ Development

```bash
# Install dependencies
npm install

# Build packages
npm run build -w packages/core
npm run build -w packages/biome
npm run build -w packages/oxlint
npm run build -w packages/rslint

# Run tests
npm run test -w packages/oxlint
```

Each package includes a `playground/` directory for local experimentation and debugging.

## 🪪 License

[MIT](LICENSE).
