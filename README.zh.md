# rsbuild-plugin-lint

为 [Rsbuild](https://rsbuild.dev/) 打造的一系列高性能 Lint 插件。基于 Rust 生态的 Lint 工具,为 Rsbuild 项目提供开箱即用的代码质量检查能力。

<p>
  <a href="https://github.com/robertpanvip/rsbuild-plugin-lint/actions">
    <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="license" />
  </a>
</p>

## ✨ 特性

- 🚀 **高性能**: 底层基于 Rust 编写的 Lint 工具,相比传统的 JS Lint 工具速度提升数十倍
- 🔌 **即插即用**: 只需在 `rsbuild.config.ts` 中引入插件,即可获得开发时 Lint 能力
- 💡 **实时反馈**: 开发过程中在终端和浏览器 Overlay 同时展示 Lint 结果,错误定位精准
- 🧩 **模块化设计**: 核心逻辑与各 Lint 工具解耦,易于扩展与维护
- 🔧 **高度可配**: 支持自定义配置文件路径、启动时 Lint、规则覆盖等多项选项

## 📦 Packages

本项目采用 monorepo 结构,包含以下几个包:

| 包名                         | 描述                                              | 文档                                  |
| ---------------------------- | ------------------------------------------------- | ------------------------------------- |
| `rsbuild-plugin-biome`       | 基于 [Biome](https://biomejs.dev/) 的 Lint 插件   | [README](packages/biome/README.md)    |
| `rsbuild-plugin-oxlint`      | 基于 [Oxlint](https://oxc-project.github.io/) 的 Lint 插件 | [README](packages/oxlint/README.md) |
| `rsbuild-plugin-rslint`      | 基于 [Rslint](https://rsbuild.dev/guide/basic/linter.html) 的 Lint 插件 | [README](packages/rslint/README.md) |
| `rsbuild-plugin-lint` (core) | 通用核心插件,可基于它封装任何命令行 Lint 工具     | [README](packages/core/README.md)     |

## 📖 使用

以 `rsbuild-plugin-oxlint` 为例:

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

启动开发服务器后,保存文件即可触发 Lint 检查,结果会同时在终端与浏览器 Overlay 中显示。

## 🏗️ 开发

```bash
# 安装依赖
npm install

# 构建所有包
npm run build -w packages/core
npm run build -w packages/biome
npm run build -w packages/oxlint
npm run build -w packages/rslint

# 运行测试
npm run test -w packages/oxlint
```

每个子包下都有 `playground` 目录,便于本地调试。

## 🪪 License

[MIT](LICENSE).
