# rsbuild-plugin-lint (Core)

`rsbuild-plugin-lint` is a generic core plugin for Rsbuild that provides a `lintPlugin` factory.
It does not tie itself to a specific linter; instead, it helps wrap any command-line linter
(for example: oxlint, rslint, biome) into the Rsbuild dev workflow.

> This is the core package of the monorepo and targets authors who want to wrap linters. End
> users should typically use the higher-level packages like `rsbuild-plugin-oxlint` or
> `rsbuild-plugin-biome`.

<p>
  <a href="https://npmjs.com/package/rsbuild-plugin-lint">
    <img src="https://img.shields.io/npm/v/rsbuild-plugin-lint?style=flat-square&colorA=564341&colorB=EDED91" alt="npm version" />
  </a>
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="license" />
</p>

## ✨ Features

- Generic plugin core to quickly wrap any command-line linter
- Automatically invokes the package-manager-specific runner (`exec` / `dlx` / `npx`) to execute linters
- Triggers linting after Rsbuild compilation with a 500ms debounce and optionally on start
- Aggregates linter results into the Rsbuild compilation, and reports to terminal logger and overlay
- Renders rich diagnostics: stack/code frame/file location

## 📦 Install

```bash
npm add rsbuild-plugin-lint -D
```

## 🚀 Usage — Wrapping a linter

Example: quickly wrap an imaginary `my-linter` tool using `rsbuild-plugin-lint`:

```ts
import type { RsbuildPluginAPI } from '@rsbuild/core';
import lintPlugin from 'rsbuild-plugin-lint';

const formatter = (output: string) => {
  // Parse your linter's raw output and map it to the RsLintError structure
  return JSON.parse(output).map((item: any) => ({
    severity: item.severity,   // 'error' | 'warning' | ...
    name: item.ruleName,       // rule name
    message: item.message,     // message
    file: item.filename,       // file path
    loc: item.location,        // { start: { line, column }, end: { line, column } }
    code: item.code,           // rule code or URL
    help: item.suggestions,    // fix suggestions
  }));
};

export const myLinterPlugin = (options: {
  path?: string;
  failOnError?: boolean;
  lintOnStart?: boolean;
} = {}) => ({
  setup(api: RsbuildPluginAPI) {
    lintPlugin({
      executeName: 'my-linter',
      args: ['lint', '--format', 'json', options.path || '.'],
      formatter,
      shouldFail: options.failOnError,
      path: options.path,
      lintOnStart: options.lintOnStart ?? true,
    }).setup(api);
  },
  name: 'my-linter-plugin',
});
```

Then use it in your Rsbuild config:

```ts
import { myLinterPlugin } from 'my-linter';

export default {
  plugins: [myLinterPlugin()],
};
```

## ⚙️ Configuration — `LintOptions`

`lintPlugin` accepts the following options:

| Option         | Type                                      | Required | Description                                                           |
| -------------- | ----------------------------------------- | -------- | --------------------------------------------------------------------- |
| `executeName`  | `string`                                  | ✅       | Linter name used as a prefix for logs and overlay                     |
| `args`         | `string[]`                                | ✅       | Command-line arguments passed to the linter executable                |
| `formatter`    | `(data: string) => RsLintError[]`         | ✅       | Parse linter output and map it to a unified error structure          |
| `path`         | `string`                                  | -        | Working directory / target path to lint                               |
| `lintPath`     | `string`                                  | -        | Path to linter executable; if omitted the package-manager runner is used |
| `shouldFail`   | `boolean`                                 | -        | Fail the build on errors/warnings                                     |
| `lintOnStart`  | `boolean`                                 | -        | Run lint once when dev server starts (default `true`)                 |

### `RsLintError` shape

```ts
interface RsLintError extends Error {
  name: string;                 // rule name
  message: string;              // message
  severity: string;             // 'error' | 'warning' | ...
  file: string;                 // file path
  code: string;                 // rule code or docs URL
  help: string;                 // suggestions / fix hints
  loc: {
    start: { line: number; column?: number };
    end?:   { line: number; column?: number };
  };
}
```

## 🏗️ Internal workflow

1. **Register hooks**: `onAfterDevCompile` triggers linting (500ms debounce), `onAfterStartDevServer` triggers first run
2. **Spawn subprocess**: Run the command using the appropriate package-manager runner (`pnpm dlx` / `npx` / `yarn dlx`)
3. **Format output**: Use the provided `formatter` to convert raw output into `RsLintError[]`
4. **Report**:
   - Write into `compilation.errors` / `compilation.warnings`
   - Output to the terminal `logger`
   - Push diagnostics to the browser overlay via `sockWrite`

## 🏗️ Development

```bash
npm run build   # build
npm run dev     # watch mode
npm run test    # tests
```

## 🪪 License

[MIT](./LICENSE).
