# Rsbuild + Oxlint: Fast Linting Without Slowing Down Your Build

> **Lint your Rsbuild projects with Oxlint without putting linting on the critical path of the build.**
>
> `rsbuild-plugin-oxlint` integrates Oxlint into the Rsbuild development workflow while keeping linting work separate from the actual bundle compilation.

## Why this plugin?

Modern frontend projects need fast feedback, but traditional JavaScript-based linting can become expensive as a codebase grows.

A common solution is to run a linter separately:

```text
Rsbuild build
    ↓
Build completes
    ↓
Run ESLint / another linter
    ↓
Wait for another process
```

This works, but it separates lint diagnostics from the development workflow.

`rsbuild-plugin-oxlint` takes a different approach:

```text
                 ┌─────────────────────┐
                 │      Rsbuild        │
                 │   bundle / compile  │
                 └──────────┬──────────┘
                            │
                            │ runs in parallel
                            ▼
                 ┌─────────────────────┐
                 │       Oxlint        │
                 │   Rust-based lint   │
                 └──────────┬──────────┘
                            │
                  ┌─────────┴─────────┐
                  ▼                   ▼
              Terminal            Dev Overlay
```

The important part is that **linting is not added as a synchronous build step that the compiler has to wait for**.

---

## 🚀 Does it increase build time?

### Production builds: No

The plugin intentionally hooks lint execution into the **development/watch workflow** rather than the normal production `run` build hook.

That means a normal production build does not wait for Oxlint:

```text
rsbuild build
     │
     ├── compile
     ├── bundle
     ├── optimize
     └── emit

          ✅ No Oxlint process is added to the production build path
```

So installing `rsbuild-plugin-oxlint` does **not** turn your production build into:

```text
compile → wait for lint → emit
```

Instead, production compilation remains independent of the plugin's development lint workflow.

### Development builds: Lint runs alongside Rsbuild

During development, the plugin starts Oxlint from the Rsbuild watch lifecycle and does not insert linting into the compilation itself.

Conceptually:

```text
                 Rsbuild compilation
                ┌─────────────────────┐
                │ compile / transform │
                │ bundle / HMR        │
                └─────────────────────┘
                         │
                         │
                         │ parallel
                         ▼
                ┌─────────────────────┐
                │       Oxlint        │
                │      linting        │
                └─────────────────────┘
```

This means linting can consume CPU while it is running, but it is **not implemented as a blocking compilation step**.

> **Build time and lint feedback time are separate concerns.**
>
> The plugin is designed so that Oxlint does not become another synchronous stage in your bundle compilation pipeline.

---

## ⚡ Why Oxlint?

Oxlint is a Rust-based JavaScript and TypeScript linter designed for high performance.

For large repositories, the difference between a linter that takes seconds and one that takes hundreds of milliseconds can have a significant impact on developer feedback loops.

Instead of running a traditional JS linter as another build stage:

```text
Build
 ↓
ESLint
 ↓
wait
 ↓
feedback
```

You can use:

```text
Rsbuild
 ├── compile / HMR
 └── Oxlint
       ↓
   terminal + overlay
```

The goal is simple:

> **Keep the build pipeline focused on building, while linting provides fast feedback alongside it.**

---

## 🔴 Errors appear where you are already working

Running a separate command such as:

```bash
oxlint src
```

is useful, especially in CI.

But during development, you want feedback immediately after saving a file.

With `rsbuild-plugin-oxlint`:

```text
Save App.tsx
      ↓
Rsbuild watches the change
      ↓
Oxlint checks the source
      ↓
┌──────────────────────────────┐
│ Rsbuild Dev Overlay           │
│                              │
│ ✖ no-unused-vars             │
│   src/App.tsx:23:7           │
└──────────────────────────────┘
```

Lint diagnostics are also reported in the terminal.

This gives you a development loop of:

**Save → Build → Lint → Feedback**

without requiring another terminal command or another development server.

---

## 🆚 Why not `@rsbuild/plugin-eslint`?

ESLint remains an excellent and mature choice, especially when you need its extensive ecosystem.

However, adding ESLint directly into a build pipeline can introduce significant work for large projects.

The design goal of this plugin is different:

| | `@rsbuild/plugin-eslint` | `rsbuild-plugin-oxlint` |
|---|---|---|
| Linter | ESLint | Oxlint |
| Implementation | JavaScript | Rust |
| Development feedback | Yes | Yes |
| Browser overlay | Yes | Yes |
| Lint integrated with Rsbuild | Yes | Yes |
| Production build linting | Depends on configuration | **Not part of the normal production build hook** |
| Focus | ESLint ecosystem | **Fast lint feedback** |

If your priority is ESLint compatibility and its ecosystem, ESLint is still a valid choice.

If your priority is **fast linting with minimal impact on the Rsbuild compilation path**, Oxlint is worth considering.

---

## 🧩 Simple setup

Install the plugin and Oxlint:

```bash
npm add -D rsbuild-plugin-oxlint oxlint
```

Then add it to your Rsbuild configuration:

```ts
import { defineConfig } from '@rsbuild/core';
import { linterPlugin } from 'rsbuild-plugin-oxlint';

export default defineConfig({
  plugins: [linterPlugin()],
});
```

That's it.

Start your development server normally:

```bash
npm run dev
```

Save a source file and Oxlint will run through the Rsbuild development workflow.

---

## ⚙️ Control the behavior

The plugin supports common linting controls such as:

```ts
linterPlugin({
  lintOnStart: true,
  failOnError: true,
  fix: false,
  deny: ['no-unused-vars'],
  allow: ['no-console'],
  warn: ['no-debugger'],
});
```

You can also configure paths, ignore patterns, custom Oxlint binaries, output formats, and additional Oxlint parameters.

See the package documentation for the complete option list.

---

## 🏗️ Design philosophy

`rsbuild-plugin-oxlint` is built around one principle:

> **Linting should improve the development feedback loop, not become another bottleneck in the build pipeline.**

The implementation uses the shared `rsbuild-plugin-lint` core and starts linting from the Rsbuild watch lifecycle. The lint result is then formatted into Rsbuild-compatible diagnostics and surfaced through the terminal and development overlay.

This separation is intentional:

```text
                Rsbuild
                   │
        ┌──────────┴──────────┐
        │                     │
   Compilation             Linting
        │                     │
     Rspack                Oxlint
        │                     │
        ▼                     ▼
      Assets          Diagnostics
                              │
                     ┌────────┴────────┐
                     ▼                 ▼
                  Terminal         Overlay
```

The build system remains responsible for building the application; Oxlint remains responsible for code-quality diagnostics.

---

## 📈 A better developer feedback loop

For a large frontend repository, every unnecessary synchronous step in the development pipeline adds friction.

A fast workflow looks like:

```text
                 ┌─────────────┐
                 │   Edit code │
                 └──────┬──────┘
                        │
                        ▼
                 ┌─────────────┐
                 │   Rsbuild   │
                 │ compile/HMR │
                 └──────┬──────┘
                        │
                        ├───────────────┐
                        │               │
                        ▼               ▼
                  Updated app       Oxlint
                                        │
                                  diagnostics
                                        │
                              ┌─────────┴─────────┐
                              ▼                   ▼
                           Terminal            Overlay
```

You get application updates and lint feedback without turning linting into a mandatory synchronous stage of the bundle build.

---

## 🎯 When should you use it?

Use `rsbuild-plugin-oxlint` if you:

- use **Rsbuild**;
- want **Oxlint** integrated into your development workflow;
- want lint results in the **terminal and browser overlay**;
- care about keeping linting **off the critical path of production compilation**;
- want a lightweight alternative to running a separate lint command during development.

For CI, you can still run Oxlint explicitly:

```bash
oxlint .
```

This gives you a clean separation:

```text
Local development
→ rsbuild-plugin-oxlint
→ fast feedback

CI / release
→ oxlint .
→ explicit quality gate
```

---

## Summary

`rsbuild-plugin-oxlint` is not trying to make Rsbuild do more work before it can finish a build.

It is designed to make Oxlint a **parallel development companion** to Rsbuild:

- 🚀 Rust-based, fast linting through Oxlint
- ⚡ Linting is not inserted as a synchronous production build stage
- 🔴 Diagnostics in the Rsbuild development overlay
- 💻 Diagnostics in the terminal
- 🔄 Automatic linting during development
- 🧩 Configurable rules, paths, ignore patterns, and execution options

### The key idea

> **Build your application with Rsbuild. Lint your code with Oxlint. Get both workflows together without making linting a blocking stage of the build.**

---

## Links

- [rsbuild-plugin-lint](https://github.com/robertpanvip/rsbuild-plugin-lint)
- [rsbuild-plugin-oxlint](https://github.com/robertpanvip/rsbuild-plugin-lint/tree/main/packages/oxlint)
- [Oxlint](https://oxc.rs/)
- [Rsbuild](https://rsbuild.rs/)
