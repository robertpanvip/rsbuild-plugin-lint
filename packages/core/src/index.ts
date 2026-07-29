import type { Logger, RsbuildPluginAPI, Rspack } from '@rsbuild/core';
import { detect } from 'package-manager-detector/detect';
import { color } from 'rslog';
import { FullTap, LintOptions, RsLintError } from './interface.ts';
import { runLintOnce, formateCodeFrame, isDevServerTap } from './util.ts';

/**
 * 把 lint 错误包装成 rspack Error,这样 Rsbuild 自带的 overlay 格式化器
 * 能直接识别(stats.errors 里只要是 Error 实例即可)。
 * 对标 ts-checker-rspack-plugin 的 IssueRspackError。
 */
class IssueError extends Error {
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

    // Rsbuild 的 dev server 通过 error.stack?.includes('ts-checker-rspack-plugin')
    // 来识别异步检查(类型检查/lint)的错误并发送到 overlay(见 @rsbuild/core 756.js:6246)。
    // 伪造这个标识符,让 lint 错误也能通过 isTsError 检查,完全复用 ts-checker 的 overlay 通道。
    if (this.stack && !this.stack.includes('ts-checker-rspack-plugin')) {
      this.stack += '\n    at ts-checker-rspack-plugin';
    }
  }
}

export const linterPlugin = (options: LintOptions) => ({
  name: 'linter-plugin',
  setup(api: RsbuildPluginAPI) {
    const executeName = options.executeName;
    const restartCompile = options.restartCompile ?? true;
    const lintOnStart = options.lintOnStart ?? true;
    const logger: Logger = api.logger;
    const prefix = `${color.yellow('[')}${color.yellow(executeName)}${color.yellow(']')}`;

    // —— 状态(对标 ts-checker 的 plugin state) ——
    let lintPromise: Promise<RsLintError[]> | null = null;
    let abortController: AbortController | null = null;
    let lintInProgress = false;
    let pmPromise: ReturnType<typeof detect> | undefined;
    const getPm = () => {
      if (!pmPromise) pmPromise = detect();
      return pmPromise;
    };

    // —— 启动一次 lint,串行排队 + abort 旧的(对应 tapStartToRunWorkers) ——
    const startLint = () => {
      // 中断上一次 lint
      if (abortController) {
        abortController.abort();
      }
      abortController = new AbortController();
      const signal = abortController.signal;
      lintInProgress = true;

      // 串行排队:等上一次完成后(或 abort 后)再跑
      const current = (lintPromise || Promise.resolve())
        .catch(() => [])
        .then(async () => {
          if (signal.aborted) return [];
          const result = await runLintOnce(options, logger, getPm(), signal);
          return result.status === 'lint-errors' ? result.errors : [];
        })
        .catch((e) => {
          logger.error(`${executeName} Error executing ${executeName}: ${e}`);
          return [];
        })
        .then((issues) => {
          if (current === lintPromise) lintInProgress = false;
          return issues;
        });

      lintPromise = current;
      return current;
    };

    api.modifyRspackConfig((config) => {
      config.plugins = config.plugins ?? [];
      config.plugins.push({
        apply(compiler: Rspack.Compiler) {
          let devServerDoneTap: FullTap | null = null;

          // 捕获在 intercept 之前已注册的 tap
          for (const tap of compiler.hooks.done.taps) {
            if (isDevServerTap(tap)) {
              devServerDoneTap = tap;
            }
          }

          // 捕获之后注册的 tap
          compiler.hooks.done.intercept({
            register: (tap) => {
              if (isDevServerTap(tap)) {
                devServerDoneTap = tap;
              }
              return tap;
            },
          });

          // 编译开始时并行启动 lint(对应 tapStartToRunWorkers / watchRun 分支)
          // 首次编译受 lintOnStart 控制,后续每次保存照常触发
          // 仅注册 watchRun(开发模式),不注册 run(生产模式)——生产模式不生效
          let firstRun = true;
          compiler.hooks.watchRun.tap(`${executeName}-plugin`, () => {
            if (firstRun) {
              firstRun = false;
              if (!lintOnStart) return;
            }
            if (restartCompile) startLint();
          });

          // 开发模式:await lint,注入 errors,重触发 dev server
          // (完全对标 ts-checker-rspack-plugin 的 tapDoneToAsyncGetIssues)
          // 用 tap + async:tapable 不等待返回的 promise,不阻塞 done 钩子链。
          // lint 完成后在微任务中注入 errors(LintRspackError 的 stack 含
          // 'ts-checker-rspack-plugin' 标识符),再重放 devServerDoneTap.fn(stats)
          // 让 Rsbuild 通过 isTsError 通道把错误推送到 overlay。
          compiler.hooks.done.tap(
            `${executeName}-plugin`,
            async (stats: Rspack.Stats) => {
              if (stats.compilation.compiler !== compiler) return;
              const currentPromise = lintPromise;
              if (!currentPromise) return;

              // lint 还在跑时给出进度提示
              if (lintInProgress) {
                logger.info(`${prefix} ${color.cyan('in progress...')}`);
              }

              let issues: RsLintError[] = [];
              try {
                let start = Date.now();
                issues = await currentPromise;
                logger.info(
                  `${prefix} ${color.cyan(`done in ${(Date.now() - start) / 1000}s`)}`,
                );
              } catch {
                return;
              }
              // 已有新一轮 lint 在跑,丢弃这次过期结果
              if (currentPromise !== lintPromise) return;

              // 终端打印错误
              if (issues.length) {
                const formatted = issues
                  .map((i) => formateCodeFrame(prefix, i).message)
                  .join('\n');
                logger.error(formatted);
              }

              // 上报到 dev-server(overlay),如果有错误且 dev server 在监听
              if (issues.length && devServerDoneTap) {
                issues.forEach((issue) => {
                  const error = new IssueError(prefix, issue);
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
  },
});

export default linterPlugin;
