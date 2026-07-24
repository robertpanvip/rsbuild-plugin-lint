# rsbuild-plugin-rslint

将 [Rslint](https://rsbuild.dev/guide/basic/linter.html) 集成到 [Rsbuild](https://rsbuild.dev/) 构建流程的插件。

Rslint 是 Rsbuild 官方的 Linter,基于 Rust 编写,同时支持 JavaScript / TypeScript 的 Lint 与类型检查(Type Check)。本插件将它无缝接入 Rsbuild dev server,让开发者在保存代码时即可看到结果。

<p>
  <a href="https://npmjs.com/package/rsbuild-plugin-rslint">
    <img src="https://img.shields.io/npm/v/rsbuild-plugin-rslint?style=flat-square&colorA=564341&colorB=EDED91" alt="npm version" />
  </a>
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="license" />
</p>

## ✨ 特性

- 🚀 **原生高速**: 基于 Rust 编写的 Linter
- 🧠 **类型检查支持**: 可开启 `--type-check` 进行 TS 类型检查(默认开启)
- 💡 **实时反馈**: 保存文件即触发 Lint,结果同步到终端与浏览器 Overlay
- 🎛️ **高度可配**: 支持通过 `rslint.config.*` 自定义规则

## 📦 安装

```bash
npm add rsbuild-plugin-rslint -D
# 或
pnpm add rsbuild-plugin-rslint -D
# 或
yarn add rsbuild-plugin-rslint -D
```

## 🚀 使用

```ts
// rsbuild.config.ts
import { defineConfig } from '@rsbuild/core';
import { linterPlugin } from 'rsbuild-plugin-rslint';

export default defineConfig({
  plugins: [linterPlugin()],
});
```

启动开发服务器:

```bash
npm run dev
```

## ⚙️ 配置

`linterPlugin` 支持以下选项:

| 选项            | 类型      | 默认值   | 描述                                                          |
| --------------- | --------- | -------- | ------------------------------------------------------------- |
| `path`          | `string`  | -        | 指定需要 Lint 的路径                                          |
| `configFile`    | `string`  | -        | 配置文件路径,传递给 `-config`                                 |
| `rslintPath`    | `string`  | -        | 自定义 rslint 可执行文件路径                                  |
| `quiet`         | `boolean` | `false`  | 静默模式                                                      |
| `fix`           | `boolean` | `false`  | 自动修复可修复的问题                                          |
| `failOnError`   | `boolean` | `false`  | 有错误时让构建失败                                            |
| `failOnWarning` | `boolean` | `false`  | 有警告时让构建失败                                            |
| `lintOnStart`   | `boolean` | `true`   | dev server 启动时是否立即执行 Lint                            |
| `typeCheck`     | `boolean` | `true`   | 是否启用 TypeScript 类型检查                                  |
| `maxWarnings`   | `boolean` | -        | 是否启用最大警告数限制                                        |
| `rule`          | `string`  | -        | 通过 `--rule` 指定单条规则配置                                |
| `noColor`       | `boolean` | -        | 禁用 ANSI 颜色输出                                            |
| `forceColor`    | `boolean` | -        | 强制启用 ANSI 颜色输出                                        |

### 示例

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

## 🏗️ 开发

```bash
npm run build   # 构建
npm run dev     # 监听模式
npm run test    # 测试
```

本地调试可进入 `playground/` 目录。

## 🪪 License

[MIT](./LICENSE).
