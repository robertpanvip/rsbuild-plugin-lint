# rsbuild-plugin-lint

High-performance lint plugins for [Rsbuild](https://rsbuild.dev/), powered by Rust-based linters.

> **Lint your Rsbuild project without putting linting into the production build path.**
>
> `rsbuild-plugin-oxlint` runs Oxlint alongside the development workflow, providing fast feedback in the terminal and browser overlay instead of turning linting into a synchronous production-build step.

<p>
  <a href="https://www.npmjs.com/package/rsbuild-plugin-oxlint">
    <img src="https://img.shields.io/npm/v/rsbuild-plugin-oxlint?style=flat-square" alt="npm version" />
  </a>
  <a href="https://github.com/robertpanvip/rsbuild-plugin-lint/actions">
    <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="license" />
  </a>
</p>

## Why rsbuild-plugin-oxlint?

Rsbuild already has excellent build performance. Linting should not turn that fast build pipeline into a waiting step.

Traditional integration often looks like:

```text
Rsbuild build
    ↓
Bundle
    ↓
Wait for ESLint / lint command
    ↓
Finish build
```

This plugin takes a different approach:

```text
                 ┌──→ Rsbuild compilation
                 │
Development ─────┤
                 │
                 └──→ Oxlint
                         ↓
                  Terminal + Overlay
```

### 🚀 Linting without blocking the production build path

`rsbuild-plugin-oxlint` is designed so that linting is **not inserted into the normal production `run` compilation hook**. In development, linting is started alongside the Rsbuild watch workflow and reports its results independently.

That means:

- **Production builds are not made to wait for linting.**
- **Development compilation and linting can run in parallel.**
- Lint results can be shown in the terminal and Rsbuild's browser overlay.
- Oxlint's Rust implementation keeps the linting step extremely fast.

> **Important:** “does not increase build time” means linting is not added as a blocking step to the normal production build pipeline. Oxlint still consumes CPU resources when it runs, and development feedback may continue after or alongside compilation.

## ✨ Features

- ⚡ **Fast feedback** — powered by Rust-based linters such as Oxlint and Biome.
- 🚫 **No blocking production lint step** — linting is kept out of the normal production `run` path.
- 🔄 **Development integration** — lint on startup and during the Rsbuild watch workflow.
- 💡 **Live diagnostics** — report issues to the terminal and browser overlay.
- 🎯 **Precise locations** — diagnostics include source file, line and column information.
- 🧩 **Modular architecture** — a shared core makes it easy to integrate different linters.
- 🔧 **Highly configurable** — custom config files, ignored paths, rules, fix mode and more.

## 📦 Packages

This monorepo contains the following packages:

| Package | Description | Docs |
| --- | --- | --- |
| `rsbuild-plugin-oxlint` | Oxlint integration for Rsbuild | [README](packages/oxlint/README.md) |
| `rsbuild-plugin-biome` | Biome integration for Rsbuild | [README](packages/biome/README.md) |
| `rsbuild-plugin-rslint` | Rslint integration for Rsbuild | [README](packages/rslint/README.md) |
| `rsbuild-plugin-lint` | Generic core for CLI-based linters | [README](packages/core/README.md) |

## 🚀 Quick Start

### Oxlint

```bash
npm add -D rsbuild-plugin-oxlint oxlint
```

```ts
// rsbuild.config.ts
import { defineConfig } from '@rsbuild/core';
import { linterPlugin } from 'rsbuild-plugin-oxlint';

export default defineConfig({
  plugins: [linterPlugin()],
});
```

Start your development server:

```bash
npm run dev
```

Save a source file and Oxlint will report diagnostics in the terminal and browser overlay.

### Biome

```bash
npm add -D rsbuild-plugin-biome @biomejs/biome
```

### Rslint

```bash
npm add -D rsbuild-plugin-rslint
```

## 🆚 Why not run ESLint during the build?

If your goal is to keep the Rsbuild pipeline fast, putting a full lint command directly into the build chain can make every build wait for linting.

This project separates the concerns:

| | Traditional build-time linting | `rsbuild-plugin-oxlint` |
| --- | --- | --- |
| Production compilation waits for lint | Often | **No** |
| Development feedback | Depends on setup | **Terminal + Overlay** |
| Linter | Usually JS-based | **Oxlint / Rust** |
| Watch workflow | External setup | **Integrated** |
| Incremental development feedback | Depends on setup | **Built in** |

The goal is simple: **keep Rsbuild focused on building, while Oxlint focuses on finding lint issues.**

## 📊 Performance

Oxlint is designed as a high-performance JavaScript/TypeScript linter implemented in Rust. For large projects, this can make linting dramatically faster than traditional JavaScript-based linting tools.

This plugin does **not** claim that running linting is free. It claims a more specific architectural property:

> **Linting is not used as a blocking production build step.**

For development, the linter and Rsbuild can work concurrently, so a slow lint operation does not need to become a synchronous dependency of every compilation.

For meaningful performance comparisons, benchmark your own project with your own rule set and hardware.

## ⚙️ Configuration

`rsbuild-plugin-oxlint` supports options such as:

- `path` — path to lint
- `ignorePattern` — files or patterns to ignore
- `configFile` — custom Oxlint configuration
- `deny` / `allow` / `warn` — rule overrides
- `fix` — automatically fix supported issues
- `failOnError` / `failOnWarning` — control build failure behavior
- `lintOnStart` — run lint when the development server starts
- `typeAware` / `typeCheck` — enable Oxlint type-aware capabilities when configured
- `tsconfig` — specify the TypeScript configuration

See the complete [Oxlint plugin documentation](packages/oxlint/README.md).

## 🏗️ Development

```bash
npm install

npm run build -w packages/core
npm run build -w packages/biome
npm run build -w packages/oxlint
npm run build -w packages/rslint

npm run test -w packages/oxlint
```

Each package includes a `playground/` directory for local experimentation and debugging.

## 🤝 Contributing

Issues, feature requests and pull requests are welcome.

If you use Rsbuild and Oxlint in a real project, feedback about startup time, incremental builds and lint feedback latency is especially valuable.

## 🪪 License

[MIT](LICENSE).
