# rsbuild-plugin-oxlint

Integrates [Oxlint](https://oxc-project.github.io/) into the Rsbuild development workflow.

> **Fast Rsbuild linting without adding linting to the production build path.**

Oxlint is a high-performance JavaScript/TypeScript linter written in Rust. This package brings Oxlint into the Rsbuild developer experience with terminal diagnostics and browser Overlay feedback.

## 🚀 Why rsbuild-plugin-oxlint?

Rsbuild is designed for fast builds. Linting should not turn the build pipeline into a synchronous waiting step.

A traditional build-time integration can look like this:

```text
Rsbuild build
    ↓
Bundle
    ↓
Wait for Lint
    ↓
Build complete
```

`rsbuild-plugin-oxlint` is designed differently:

```text
                 ┌──→ Rsbuild compilation
                 │
Development ─────┤
                 │
                 └──→ Oxlint
                         ↓
                  Terminal + Overlay
```

### ⚡ Does it increase build time?

**It does not add linting as a blocking step to the normal production build path.**

The plugin does not register Oxlint as a synchronous task in the production `run` compilation hook. Production compilation therefore does not need to wait for a full Oxlint run before completing.

In development, Oxlint runs as an independent task alongside the Rsbuild watch workflow, so linting can provide feedback without becoming a required synchronous dependency of every compilation.

This means:

- **Production builds do not wait for Oxlint to finish.**
- **Linting is not inserted into the normal production build chain.**
- **Development compilation and linting can run concurrently.**
- Lint results are available in the terminal and browser Overlay.

> **Important:** “Does not increase build time” means that linting is not added as a blocking production build step. Running Oxlint still consumes CPU resources, and a lint task may continue running while development compilation proceeds.

## ✨ Features

- 🚀 **Blazing fast** — Oxlint is implemented in Rust and is designed for high-performance JavaScript/TypeScript linting.
- 🚫 **Non-blocking production integration** — Oxlint is not added as a synchronous production build step.
- 💡 **Live feedback** — lint results are reported in the terminal and browser Overlay during development.
- 🔄 **Development workflow integration** — supports linting when the dev server starts and during the watch workflow.
- 📋 **Rich rule control** — supports `deny`, `allow`, and `warn` rule levels.
- 🧩 **Highly configurable** — custom config paths, ignore patterns, fix mode, output formats, and more.

## 📦 Install

```bash
npm add rsbuild-plugin-oxlint oxlint -D
# or
pnpm add rsbuild-plugin-oxlint oxlint -D
# or
yarn add rsbuild-plugin-oxlint oxlint -D
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

Start the development server:

```bash
npm run dev
```

Saving source files will trigger linting and report diagnostics to the terminal and browser Overlay.

## 🆚 Why not run ESLint during the build?

Putting a complete lint command directly into a build pipeline can make every build wait for linting to finish.

This plugin separates **building** from **lint feedback**:

| | Traditional build-time linting | `rsbuild-plugin-oxlint` |
| --- | --- | --- |
| Production build waits for lint | Often | **No** |
| Lint is a synchronous production build step | Yes / depends on integration | **No** |
| Development feedback | Depends on setup | **Terminal + Overlay** |
| Linter | Often JavaScript-based | **Oxlint / Rust** |
| Watch workflow | Extra setup may be required | **Integrated** |

The goal is simple:

> **Let Rsbuild build, and let Oxlint lint — without making linting a production build bottleneck.**

## ⚙️ Configuration

`linterPlugin` supports the following options:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `path` | `string` | - | Path to lint |
| `ignorePattern` | `string \| string[]` | - | Glob patterns to ignore (maps to `--ignore-pattern`) |
| `configFile` | `string` | `'oxlintrc.json'` | Path to the config file |
| `deny` | `string[]` | `[]` | Rules treated as errors (`-D`) |
| `allow` | `string[]` | `[]` | Rules to allow/disable (`-A`) |
| `warn` | `string[]` | `[]` | Rules treated as warnings (`-W`) |
| `params` | `string` | `''` | Extra CLI parameters to forward |
| `oxlintPath` | `string` | - | Custom Oxlint binary path |
| `format` | `'default' \| 'checkstyle' \| 'github' \| 'gitlab' \| 'json' \| 'junit' \| 'stylish' \| 'unix'` | - | Output format |
| `quiet` | `boolean` | `false` | Quiet mode |
| `fix` | `boolean` | `false` | Auto-fix fixable issues |
| `failOnError` | `boolean` | `false` | Fail according to configured lint behavior |
| `failOnWarning` | `boolean` | `false` | Fail according to configured lint behavior |
| `lintOnStart` | `boolean` | `true` | Run lint when the dev server starts |

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

You can place a `.oxlintrc.json` in your project root, for example:

```json
{
  "deny": ["no-unused-vars", "no-debugger"],
  "allow": ["no-console"],
  "ignore": ["dist/", "node_modules/"]
}
```

## 📊 Performance

Oxlint is designed to be much faster than traditional JavaScript-based linting tools, especially on large codebases.

More importantly, this plugin keeps linting out of the normal production build's synchronous execution path. That architectural separation means you can keep lint feedback integrated into the Rsbuild development experience without making every production compilation wait for a lint command.

For meaningful performance comparisons, benchmark your own project, rule set, and hardware.

## 🏗️ Development

```bash
npm run build   # build
npm run dev     # watch
npm run test    # tests
```

For local debugging use the `playground/` directory.

## 🪪 License

[MIT](./LICENSE).
