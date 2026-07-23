import type {
  Logger,
  RsbuildPluginAPI,
  Rspack,
} from '@rsbuild/core';
import { detect } from 'package-manager-detector/detect';
import { color } from 'rslog';
import type { LintOptions, RsLintError } from './interface.ts';
import { runLintOnce, formateCodeFrame } from './util.ts';

/**
 * 把 lint 错误包装成 rspack Error,这样 Rsbuild 自带的 overlay 格式化器
 * 能直接识别(stats.errors 里只要是 Error 实例即可)。
 * 对标 ts-checker-rspack-plugin 的 IssueRspackError。
 */
class LintRspackError extends Error {
  /** 隐藏 JS 调用栈 —— lint 错误没有运行时栈 */
  hideStack = true;
  /** 触发错误的源文件,带 :line:col,overlay 点击可跳转 */
  file: string;
  /** 原始 lint 错误对象 */
  issue: RsLintError;

  constructor(prefix: string, issue: RsLintError) {
    const framed = formateCodeFrame(prefix, issue);
    super(framed.message);
    this.name = issue.code || 'LintError';
    this.issue = { ...issue, message: framed.message };

    this.file = issue.file;
    if (issue.loc?.start) {
      const { line, column } = issue.loc.start;
      this.file += `:${line}${column ? `:${column}` : ''}`;
    }
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export const lintPlugin = (options: LintOptions) => ({
  setup(api: RsbuildPluginAPI) {
    const executeName = options.executeName;
    const restartCompile = options.restartCompile ?? true;
    const logger: Logger = api.logger;
    const prefix = `${color.yellow('[')}${color.yellow(executeName)}${color.yellow(']')}`;

    // —— 状态(对标 ts-checker 的 plugin state) ——
    let lintPromise: Promise<RsLintError[]> | null = null;
    let lastIssues: RsLintError[] = [];
    let pmPromise: ReturnType<typeof detect> | undefined;
    const getPm = () => {
      if (!pmPromise) pmPromise = detect();
      return pmPromise;
    };

    // —— 启动一次 lint,返回 promise(对应 tapStartToRunWorkers) ——
    const startLint = () => {
      const current = runLintOnce(options, logger, getPm())
        .then((result) =>
          result.status === 'lint-errors' ? result.errors : [],
        )
        .catch((e) => {
          logger.error(`${executeName} Error executing ${executeName}: ${e}`);
          return [];
        });
      lintPromise = current;
      return current;
    };

    api.modifyRspackConfig((config) => {
      config.plugins = config.plugins ?? [];
      config.plugins.push({
        apply(compiler: Rspack.Compiler) {
          // 保存 dev server 的 done tap(对应 interceptDoneToGetDevServerTap)
          let devServerDoneTap: any = null;
          compiler.hooks.done.intercept({
            register: (tap) => {
              if (
                ['webpack-dev-server', 'rsbuild-dev-server'].includes(
                  tap.name,
                ) &&
                tap.type === 'sync'
              ) {
                devServerDoneTap = tap;
              }
              return tap;
            },
          });

          // 编译开始时并行启动 lint(对应 tapStartToRunWorkers / watchRun 分支)
          const trigger = () => {
            if (restartCompile) startLint();
          };
          compiler.hooks.watchRun.tap(`${executeName}-plugin`, trigger);
          compiler.hooks.run.tap(`${executeName}-plugin`, trigger);

          // 编译完成后:await lint,注入 errors,重触发 dev server
          // (对应 tapDoneToAsyncGetIssues)
          compiler.hooks.done.tap(
            `${executeName}-plugin`,
            async (stats: Rspack.Stats) => {
              if (stats.compilation.compiler !== compiler) return;
              const currentPromise = lintPromise;
              if (!currentPromise) return; // 还没跑过(比如首次未触发)

              let issues: RsLintError[] = [];
              try {
                issues = await currentPromise;
              } catch {
                return;
              }
              // 已有新一轮 lint 在跑,丢弃这次过期结果
              if (currentPromise !== lintPromise) return;

              lastIssues = issues;

              if (issues.length && devServerDoneTap) {
                issues.forEach((issue) => {
                  const error = new LintRspackError(prefix, issue);
                  if (issue.severity === 'warning') {
                    stats.compilation.warnings.push(error);
                  } else {
                    stats.compilation.errors.push(error);
                  }
                });
                // 手动重触发 dev server,让它拿"脏" stats 再发一次
                devServerDoneTap.fn(stats);
              }
            },
          );
        },
      });
    });

    // 初始 lint(对应 tapStartToRunWorkers 里 watchRun 首次触发)
    api.onAfterStartDevServer(() => {
      const { lintOnStart = true } = options;
      if (lintOnStart) startLint();
    });
  },
  name: 'linter-plugin',
});

export default lintPlugin;