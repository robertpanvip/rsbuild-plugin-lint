# rsbuild-plugin-tsgo

[![npm](https://img.shields.io/npm/v/rsbuild-plugin-tsgo.svg)](https://www.npmjs.com/package/rsbuild-plugin-tsgo)

Tsgo (TypeScript type checker, written in Go) lint plugin for [Rsbuild](https://rsbuild.dev/).

## What is tsgo?

tsgo is a Go-based implementation of the TypeScript compiler (`tsc`). It exposes a CLI compatible with common `tsc` flags like `--noEmit`, `--project`, `--strict`, etc. This plugin wraps tsgo into the Rsbuild dev workflow, providing type-check errors as a lint overlay in the browser.

## Install

```bash
# npm
npm add rsbuild-plugin-tsgo -D

# pnpm
pnpm add rsbuild-plugin-tsgo -D

# yarn
yarn add rsbuild-plugin-tsgo -D
```

## Usage

```ts
import { defineConfig } from '@rsbuild/core';
import { pluginTsgo } from 'rsbuild-plugin-tsgo';

export default defineConfig({
  plugins: [
    pluginTsgo({
      project: './tsconfig.json',
    }),
  ],
});
```

## Options

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `path` | `string` | `''` | Working directory path. |
| `tsgoPath` | `string` | `''` | Custom path to the `tsgo` binary. |
| `project` | `string` | `'./tsconfig.json'` | Path to the TypeScript configuration file. |
| `noEmit` | `boolean` | `true` | Skip emitting output files, only run type checking. |
| `pretty` | `boolean` | `false` | Enable styled output (colors). |
| `strict` | `boolean` | `false` | Enable all strict type-checking options. |
| `failOnError` | `boolean` | `false` | Exit with non-zero status on type errors. |
| `failOnWarning` | `boolean` | `false` | Exit with non-zero status on warnings. |
| `lintOnStart` | `boolean` | `true` | Run type check when dev server starts. |
| `params` | `string` | `''` | Additional CLI arguments to pass to tsgo. |

## Contributing

Please refer to the [top-level README](../../README.md) for contributing guidelines.

## License

[MIT](./LICENSE)
