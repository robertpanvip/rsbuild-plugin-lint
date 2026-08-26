# rsbuild-plugin-lint

为 [Rsbuild](https://rsbuild.dev/) 打造的一系列高性能 Lint 插件，基于 Rust 生态的 Lint 工具，为 Rsbuild 项目提供快速、开箱即用的代码质量检查能力。

> **让 Lint 伴随 Rsbuild 开发流程运行，同时不把 Lint 加入生产构建的阻塞链路。**
>
> `rsbuild-plugin-oxlint` 专注于在开发过程中提供快速反馈：Lint 与 Rsbuild 编译并行运行，并通过终端和浏览器 Overlay 展示结果，而不是让每一次生产构建都等待一次完整的 Lint 检查。

<p>
  <a href="https://www.npmjs.com/package/rsbuild-plugin-oxlint">
    <img src="https://img.shields.io/npm/v/rsbuild-plugin-oxlint?style=flat-square" alt="npm version" />
  </a>
  <a href="https://github.com/robertpanvip/rsbuild-plugin-lint/actions">
    <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="license" />
  </a>
</p>

## 为什么选择 rsbuild-plugin-oxlint？

Rsbuild 本身非常注重构建性能。Lint 不应该因为被插入构建流程，而让原本快速的构建流程变成等待 Lint 的流程。

传统的构建时 Lint 通常类似：

```text
Rsbuild build
    ↓
Bundle
    ↓
等待 ESLint / Lint 命令执行
    ↓
构建完成
```

本项目采用不同的方式：

```text
                 ┌──→ Rsbuild 编译
                 │
开发流程 ─────────┤
                 │
                 └──→ Oxlint
                         ↓
                    终端 + Overlay
```

### 🚀 不增加生产构建时间

`rsbuild-plugin-oxlint` 的核心设计是：**不将 Lint 插入正常生产构建的同步执行链路。**

生产构建不会因为插件执行了一次 Lint 而额外等待 Lint 完成。因此，对于正常的 production `run` 流程，Lint 不是构建完成的前置条件。

开发模式下，Lint 则作为独立任务与 Rsbuild 的开发 / watch 流程协同运行，为开发者提供实时反馈。

这意味着：

- **生产构建不会等待 Lint 完成。**
- **Lint 不会成为生产构建流程中的同步阻塞步骤。**
- **开发环境下 Lint 与 Rsbuild 编译可以并行运行。**
- Lint 结果可以同时显示在终端和浏览器 Overlay 中。
- Oxlint 基于 Rust 实现，可以提供非常快的 Lint 反馈。

> **准确来说，“不会增加 build time”指的是：Lint 不会作为阻塞任务加入正常生产构建链路。** Lint 本身运行时仍然会占用 CPU 资源；开发模式下，如果 Lint 本身耗时较长，它仍可能在编译完成后继续产生反馈，但不会因此把 Lint 变成每次编译都必须同步等待的步骤。

## ✨ 特性

- ⚡ **高性能**：基于 Rust 编写的 Lint 工具，例如 Oxlint、Biome。
- 🚫 **不阻塞生产构建**：Lint 不加入正常 production `run` 的同步构建链路。
- 🔄 **开发流程集成**：支持开发启动时以及 Rsbuild watch 流程中的 Lint。
- 💡 **实时反馈**：终端和浏览器 Overlay 同时展示 Lint 结果。
- 🎯 **精准定位**：错误包含文件、行号和列号等位置信息。
- 🧩 **模块化设计**：核心逻辑与具体 Lint 工具解耦，便于扩展。
- 🔧 **高度可配**：支持自定义配置文件、忽略路径、规则覆盖、自动修复等能力。

## 📦 Packages

本项目采用 monorepo 结构，包含以下几个包：

| 包名 | 描述 | 文档 |
| --- | --- | --- |
| `rsbuild-plugin-oxlint` | 基于 [Oxlint](https://oxc-project.github.io/) 的 Rsbuild Lint 插件 | [README](packages/oxlint/README.md) |
| `rsbuild-plugin-biome` | 基于 [Biome](https://biomejs.dev/) 的 Rsbuild Lint 插件 | [README](packages/biome/README.md) |
| `rsbuild-plugin-rslint` | 基于 Rslint 的 Rsbuild Lint 插件 | [README](packages/rslint/README.md) |
| `rsbuild-plugin-lint` (core) | 通用核心，可基于它封装其他命令行 Lint 工具 | [README](packages/core/README.md) |

## 🚀 快速开始

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

启动开发服务器：

```bash
npm run dev
```

修改并保存源文件后，Oxlint 会进行检查，并将结果输出到终端和浏览器 Overlay。

### Biome

```bash
npm add -D rsbuild-plugin-biome @biomejs/biome
```

### Rslint

```bash
npm add -D rsbuild-plugin-rslint
```

## 🆚 为什么不在 build 中运行 ESLint？

如果目标是保持 Rsbuild 的构建速度，那么把完整的 Lint 命令直接加入 build 流程，通常意味着每次构建都需要等待 Lint 完成。

本项目将 **“构建”** 与 **“代码检查”** 分开：

| | 传统 build-time Lint | `rsbuild-plugin-oxlint` |
| --- | --- | --- |
| 生产构建等待 Lint | 通常需要 | **不需要** |
| Lint 是否进入生产构建同步链路 | 是 / 取决于实现 | **否** |
| 开发反馈 | 取决于配置 | **终端 + Overlay** |
| Linter | 通常为 JS 生态工具 | **Oxlint / Rust** |
| Watch 流程 | 需要额外配置 | **集成支持** |
| 增量开发反馈 | 取决于配置 | **内置支持** |

核心目标很简单：

> **让 Rsbuild 专注于构建，让 Oxlint 专注于发现代码问题。**

## 📊 性能与构建时间

Oxlint 是基于 Rust 实现的高性能 JavaScript / TypeScript Linter。对于大型项目，它通常可以比传统 JavaScript Lint 工具提供更快的检查速度。

但本项目更重要的性能设计并不是简单地声称“Lint 不消耗时间”，而是：

> **Lint 不作为阻塞任务加入正常生产构建链路。**

也就是说，不应该出现：

```text
编译
  ↓
等待 Lint
  ↓
输出构建结果
```

而是将两项工作解耦：

```text
        ┌──→ Rsbuild 编译
        │
        └──→ Oxlint 检查
                ↓
          Terminal / Overlay
```

因此，即使 Lint 任务仍然需要 CPU 时间，它也不会因为被插件集成而强制成为生产构建的同步等待步骤。

> 如果要进行严格的性能比较，建议使用你自己的项目、规则集和硬件进行 benchmark。

## ⚙️ 配置

`rsbuild-plugin-oxlint` 支持以下常用配置：

- `path`：指定需要检查的路径
- `ignorePattern`：忽略文件或路径
- `configFile`：自定义 Oxlint 配置文件
- `allow` / `deny` / `warn`：规则级别控制
- `fix`：自动修复支持的错误
- `failOnError` / `failOnWarning`：控制错误或警告是否导致失败
- `lintOnStart`：开发服务器启动时执行 Lint
- `format`：配置输出格式
- `params`：向 Oxlint CLI 传递额外参数

完整配置请参考 [Oxlint 插件文档](packages/oxlint/README.md)。

## 🏗️ 开发

```bash
# 安装依赖
npm install

# 构建各个包
npm run build -w packages/core
npm run build -w packages/biome
npm run build -w packages/oxlint
npm run build -w packages/rslint

# 运行测试
npm run test -w packages/oxlint
```

每个子包下都有 `playground` 目录，便于本地调试和验证。

## 🤝 贡献

欢迎提交 Issue、Feature Request 和 Pull Request。

如果你在真实的 Rsbuild 项目中使用 Rsbuild + Oxlint，尤其欢迎反馈以下数据：

- 开发服务器启动时间
- 增量编译时间
- Lint 反馈延迟
- 大型项目中的 CPU / 内存占用

## 🪪 License

[MIT](LICENSE)。
