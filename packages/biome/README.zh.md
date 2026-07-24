# rsbuild-plugin-biome

将 [Biome](https://biomejs.dev/) 集成到 [Rsbuild](https://rsbuild.dev/) 构建流程中,为项目提供高性能的 JS/TS/CSS/JSON 统一 Lint 能力。

<p>
  <a href="https://npmjs.com/package/rsbuild-plugin-biome">
    <img src="https://img.shields.io/npm/v/rsbuild-plugin-biome?style=flat-square&colorA=564341&colorB=EDED91" alt="npm version" />
  </a>
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="license" />
</p>

## ✨ 特性

- 基于 Biome,提供超高性能的 Lint 检查
- 开发时保存文件自动触发 Lint,并在终端 / 浏览器 Overlay 中展示
- 支持通过 `biome.json` / `biome.jsonc` 自定义配置
- 支持连接本地 Biome daemon 服务,进一步提升速度
- 与 Rsbuild dev server 深度集成,错误定位到具体行列

## 📦 安装

```bash
npm add rsbuild-plugin-biome -D
# 或
pnpm add rsbuild-plugin-biome -D
# 或
yarn add rsbuild-plugin-biome -D
```

> `@biomejs/biome` 已作为依赖自动安装,无需手动安装。

## 🚀 使用

在你的 `rsbuild.config.ts` 中引入:

```ts
import { defineConfig } from '@rsbuild/core';
import { linterPlugin } from 'rsbuild-plugin-biome';

export default defineConfig({
  plugins: [linterPlugin()],
});
```

启动开发服务器:

```bash
npm run dev
```

当你修改并保存源文件时,插件会自动运行 `biome lint`,并将诊断结果同步到终端与浏览器 Overlay。

## ⚙️ 配置

`linterPlugin` 支持的选项:

| 选项                   | 类型                 | 默认值   | 描述                                                                              |
| ---------------------- | -------------------- | -------- | --------------------------------------------------------------------------------- |
| `path`                 | `string`             | -        | 要 Lint 的目标路径,默认为当前工作目录                                             |
| `configFile`           | `string`             | -        | Biome 配置文件路径或查找目录。启用后将禁用默认配置解析                             |
| `failOnError`          | `boolean`            | `false`  | 出现错误时是否让构建失败                                                          |
| `failOnWarning`        | `boolean`            | `false`  | 出现警告时是否让构建失败                                                          |
| `lintOnStart`          | `boolean`            | `true`   | 启动 dev server 时是否立即执行一次 Lint                                            |
| `linterPath`           | `string`             | -        | 自定义 biome 可执行文件路径。用于指向非标准位置的 biome 二进制                     |
| `colors`               | `'off' \| 'force'`   | -        | 输出格式化模式:`off` 输出纯文本,`force` 强制使用 ANSI                             |
| `useServer`            | `string`             | -        | 连接到已在运行的 Biome daemon                                                     |
| `verbose`              | `string`             | -        | 打印更多诊断信息及被处理 / 修改的文件                                             |
| `maxDiagnostics`       | `number \| 'none'`   | `20`     | 限制显示的诊断数量,传 `'none'` 表示不限制                                          |
| `skipParseErrors`      | `boolean`            | `false`  | 跳过含有语法错误的文件,而非输出错误诊断                                           |
| `noErrorsOnUnmatched`  | `boolean`            | `false`  | 当没有处理任何文件时,抑制错误输出                                                 |
| `errorOnWarnings`      | `boolean`            | `false`  | 有警告时以错误码退出                                                              |
| `diagnosticLevel`      | `'info' \| 'warn' \| 'error'` | `'info'` | 显示的诊断级别,从低到高:`info` / `warn` / `error`                               |

示例:

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

## 🏗️ 开发

```bash
# 构建
npm run build

# 监听模式
npm run dev

# 测试
npm run test
```

本地调试可进入 `playground/` 目录:

```bash
cd playground
npm install
npm run dev
```

## 🪪 License

[MIT](./LICENSE).
