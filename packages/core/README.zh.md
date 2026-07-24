# rsbuild-plugin-lint (Core)

`rsbuild-plugin-lint` 是一个通用的 Rsbuild Lint 核心插件。它不绑定具体的 Lint 工具,而是对外暴露一个可定制的 `lintPlugin` 工厂函数,用于将任意命令行 Lint 工具(如 oxlint / rslint / biome 等)接入 Rsbuild 的开发流程。

> 这是 monorepo 的**核心包**,面向的是**二次封装的开发者**。普通用户请直接使用上层封装(如 `rsbuild-plugin-oxlint` / `rsbuild-plugin-biome` / `rsbuild-plugin-rslint`)。

<p>
  <a href="https://npmjs.com/package/rsbuild-plugin-lint">
    <img src="https://img.shields.io/npm/v/rsbuild-plugin-lint?style=flat-square&colorA=564341&colorB=EDED91" alt="npm version" />
  </a>
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="license" />
</p>

## ✨ 特性

- 通用的插件内核,可快速封装任意命令行 Lint 工具
- 自动调用对应包管理器(npm / pnpm / yarn)的 `exec` / `dlx` / `npx` 来运行 Lint 工具
- 在 Rsbuild 编译完成后触发 Lint(500ms 防抖),并支持启动时立即执行
- 将 Lint 错误聚合到 Rsbuild 编译结果,同时同步到终端 logger 与浏览器 Overlay
- 提供错误栈 / code frame / 文件位置等丰富的渲染能力

## 📦 安装

```bash
npm add rsbuild-plugin-lint -D
```

## 🚀 使用 — 二次封装

以下是基于 `rsbuild-plugin-lint` 快速封装一个 `my-linter` 插件的示例:

```ts
import type { RsbuildPluginAPI } from '@rsbuild/core';
import lintPlugin from 'rsbuild-plugin-lint';

const formatter = (output: string) => {
  // 将你的 Lint 工具的原始输出,解析为统一的 RsLintError 结构
  return JSON.parse(output).map((item: any) => ({
    severity: item.severity,   // 'error' | 'warning' | ...
    name: item.ruleName,        // 规则名
    message: item.message,      // 错误信息
    file: item.filename,        // 文件路径
    loc: item.location,         // { start: { line, column }, end: { line, column } }
    code: item.code,            // 规则 code / url
    help: item.suggestions,     // 修复建议
  }));
};

export const myLinterPlugin = (options: {
  path?: string;
  failOnError?: boolean;
  lintOnStart?: boolean;
} = {}) => ({
  setup(api: RsbuildPluginAPI) {
    lintPlugin({
      executeName: 'my-linter',     // 日志前缀 / Overlay 名称
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

然后在你的 Rsbuild 配置中使用:

```ts
import { myLinterPlugin } from 'my-linter';

export default {
  plugins: [myLinterPlugin()],
};
```

## ⚙️ 配置 — `LintOptions`

`lintPlugin` 接受以下配置:

| 选项           | 类型                                        | 必填 | 描述                                              |
| -------------- | ------------------------------------------- | ---- | ------------------------------------------------- |
| `executeName`  | `string`                                    | ✅   | Lint 工具名称,作为日志与 Overlay 的标识前缀       |
| `args`         | `string[]`                                  | ✅   | 传递给 Lint 可执行文件的命令行参数                |
| `formatter`    | `(data: string) => RsLintError[]`           | ✅   | 解析 Lint 工具输出,并映射到统一的错误结构         |
| `path`         | `string`                                    | -    | 工作目录 / Lint 目标路径,默认当前工作区           |
| `lintPath`     | `string`                                    | -    | Lint 可执行文件路径,未指定时通过包管理器动态调用 |
| `shouldFail`   | `boolean`                                   | -    | Lint 出现错误 / 警告时是否让构建失败              |
| `lintOnStart`  | `boolean`                                   | -    | 启动 dev server 时是否立即执行一次 Lint(默认 `true`) |

### `RsLintError` 结构

```ts
interface RsLintError extends Error {
  name: string;                 // 规则名
  message: string;              // 错误信息
  severity: string;             // 'error' | 'warning' | ...
  file: string;                 // 文件路径
  code: string;                 // 规则 code 或文档 url
  help: string;                 // 修复建议
  loc: {
    start: { line: number; column?: number };
    end?:   { line: number; column?: number };
  };
}
```

## 🏗️ 内部工作流程

1. **注册 hooks**:`onAfterDevCompile` 触发 Lint(500ms 防抖),`onAfterStartDevServer` 触发首次 Lint
2. **子进程执行**:根据当前包管理器选择 `pnpm dlx` / `npx` / `yarn dlx` 运行命令
3. **格式化输出**:通过 `formatter` 把原始输出转为统一的 `RsLintError[]`
4. **上报**:
   - 写入 `compilation.errors` / `compilation.warnings`
   - 通过 Rsbuild `logger` 输出到终端
   - 通过 `sockWrite` 推送到浏览器 Overlay

## 🏗️ 开发

```bash
npm run build   # 构建
npm run dev     # 监听模式
npm run test    # 测试
```

## 🪪 License

[MIT](./LICENSE).
