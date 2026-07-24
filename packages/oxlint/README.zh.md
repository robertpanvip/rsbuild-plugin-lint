# rsbuild-plugin-oxlint

将 [Oxlint](https://oxc-project.github.io/) 集成到 [Rsbuild](https://rsbuild.dev/) 构建流程的插件。

Oxlint 是基于 Rust 编写的高性能 JavaScript / TypeScript Linter,与 ESLint 兼容,但速度可快 50~100 倍。本插件把它无缝接入 Rsbuild 的开发体验中。

<p>
  <a href="https://npmjs.com/package/rsbuild-plugin-oxlint">
    <img src="https://img.shields.io/npm/v/rsbuild-plugin-oxlint?style=flat-square&colorA=564341&colorB=EDED91" alt="npm version" />
  </a>
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="license" />
</p>

## ✨ 特性

- 🚀 **极速**: 基于 Rust 的 Oxlint,毫秒级完成大规模代码的 Lint
- 🔌 **零配置可用**: 默认自动读取 `.oxlintrc.json` 配置
- 💡 **实时反馈**: 保存文件即触发 Lint,结果同步到终端与浏览器 Overlay
- 📋 **丰富规则**: 支持 deny / allow / warn 三级规则覆盖
- 🧩 **高度可配**: 支持自定义配置文件路径、ignore pattern、修复模式等

## 📦 安装

```bash
npm add rsbuild-plugin-oxlint -D
# 或
pnpm add rsbuild-plugin-oxlint -D
# 或
yarn add rsbuild-plugin-oxlint -D
```

## 🚀 使用

```ts
// rsbuild.config.ts
import { defineConfig } from '@rsbuild/core';
import { linterPlugin } from 'rsbuild-plugin-oxlint';

export default defineConfig({
  plugins: [linterPlugin()],
});
```

启动开发服务器:

```bash
npm run dev
```

保存源文件即可看到 Lint 结果。

## ⚙️ 配置

`linterPlugin` 支持以下选项:

| 选项              | 类型                                                                                     | 默认值             | 描述                                                         |
| ----------------- | ---------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------ |
| `path`            | `string`                                                                                 | -                  | 指定需要 Lint 的路径                                         |
| `ignorePattern`   | `string \| string[]`                                                                     | -                  | 忽略的 glob 模式,对应 `--ignore-pattern`                    |
| `configFile`      | `string`                                                                                 | `'oxlintrc.json'`  | 配置文件路径                                                 |
| `deny`            | `string[]`                                                                               | `[]`               | 标记为错误(deny)的规则,对应 `-D`                            |
| `allow`           | `string[]`                                                                               | `[]`               | 允许(关闭)的规则,对应 `-A`                                  |
| `warn`            | `string[]`                                                                               | `[]`               | 标记为警告的规则,对应 `-W`                                  |
| `params`          | `string`                                                                                 | `''`               | 直接透传的额外命令行参数                                     |
| `oxlintPath`      | `string`                                                                                 | -                  | 自定义 oxlint 可执行文件路径                                 |
| `format`          | `'default' \| 'checkstyle' \| 'github' \| 'gitlab' \| 'json' \| 'junit' \| 'stylish' \| 'unix'` | -                  | 输出格式                                                     |
| `quiet`           | `boolean`                                                                                | `false`            | 静默模式                                                     |
| `fix`             | `boolean`                                                                                | `false`            | 自动修复可修复的问题                                         |
| `failOnError`     | `boolean`                                                                                | `false`            | 有错误时让构建失败                                           |
| `failOnWarning`   | `boolean`                                                                                | `false`            | 有警告时让构建失败                                           |
| `lintOnStart`     | `boolean`                                                                                | `true`             | dev server 启动时是否立即执行 Lint                           |

### 示例

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

## 📘 配置文件

可在项目根目录放置 `.oxlintrc.json`,示例:

```json
{
  "deny": ["no-unused-vars", "no-debugger"],
  "allow": ["no-console"],
  "ignore": ["dist/", "node_modules/"]
}
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
