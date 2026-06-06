import * as fs from 'node:fs';
import nodePath from 'node:path';
import type {
  Logger,
  OverlayOptions,
  RsbuildDevServer,
  RsbuildPluginAPI,
  Rspack,
} from '@rsbuild/core';
import { spawn } from 'cross-spawn';
import { resolveCommand } from 'package-manager-detector/commands';
import { detect } from 'package-manager-detector/detect';
import * as os from 'node:os';
import { codeFrameColumns } from '@babel/code-frame';
import { getServerMessageErrors } from './message.js';

const DEBOUNCE_MS = 500;

const resolveAbsolutePath = (p: string): string =>
  nodePath.isAbsolute(p) ? p : nodePath.join(process.cwd(), p);



interface RunChildParams {
  cmd: string;
  args: string[];
  cwd: string;
  logger: Logger | undefined;
  shouldFail: boolean;
  buffered: boolean;
  formatter: (data: string) => RsLintError[];
  executeName: string;
}

type RunChildResult =
  | { status: 'ok' }
  | { status: 'lint-errors'; errors: RsLintError[] }
  | { status: 'fallback' };

const env = process.env;

const runChild = ({
  cmd,
  args,
  cwd,
  logger,
  shouldFail,
  buffered,
  formatter,
  executeName,
}: RunChildParams): Promise<RunChildResult> =>
  new Promise((resolve, reject) => {
    const bufferedOutput: string[] = [];
    const child = spawn(cmd, args, {
      cwd,
      env: { ...env, FORCE_COLOR: '1' },
      shell: false,
      stdio: 'pipe',
    });
    const emit = (data: Buffer, log: (s: string) => void) => {
      const trimmed = data.toString().trimEnd();
      if (!trimmed) {
        return;
      }
      if (buffered) {
        bufferedOutput.push(trimmed);
      } else {
        log(trimmed);
      }
    };
    child.stdout?.on('data', (d) => emit(d, (s) => logger?.info(s)));
    child.stderr?.on('data', (d) => emit(d, (s) => logger?.error(s)));
    child.on('error', (error) => {
      if (buffered) {
        resolve({ status: 'fallback' });
        return;
      }
      logger?.error(`${executeName} Error: ${error.message}`);
      reject(error);
    });
    child.on('exit', (code) => {
      const output = bufferedOutput.join('\n');
      if (code === 0) {
        if (!buffered) {
          logger?.info(`${executeName} successfully finished.`);
        }
        const errors = formatter(output);
        //resolve({ status: "ok" });
        resolve({ status: 'lint-errors', errors });
      } else if (code === 1) {
        const errors = formatter(output);
        if (errors.length > 0) {
          resolve({ status: 'lint-errors', errors });
        } else {
          if (buffered) {
            const errors = bufferedOutput.flatMap((line) => {
              return formatter(line);
            });
            resolve({ status: 'lint-errors', errors });
          }
          if (shouldFail) {
            reject(new Error(`${executeName} found lint errors.`));
          } else {
            resolve({ status: 'lint-errors', errors: [] });
          }
        }
      } else if (buffered) {
        resolve({ status: 'fallback' });
      } else {
        logger?.error(`${executeName} exited with unexpected code: ${code}`);
        resolve({ status: 'ok' });
      }
    });
  });

type LintOptions = {
  lintOnStart?: boolean;
  path?: string;
  shouldFail?: boolean;
  lintPath?: string;
  executeName: string;
  args: string[];
  formatter: (data: string) => RsLintError[];
};

const runLintOnce = async (
  options: LintOptions,
  logger: Logger | undefined,
  pmPromise: ReturnType<typeof detect>,
): Promise<RunChildResult> => {
  const {
    path = '',
    lintPath = '',
    executeName,
    args = [],
    shouldFail = false,
    formatter,
  } = options;
  const cwd = resolveAbsolutePath(path);
  const pm = await pmPromise;
  if (!pm) {
    throw new Error('Could not detect package manager');
  }
  const tryRun = async (useExecuteLocal: boolean): Promise<RunChildResult> => {
    const resolved = lintPath
      ? { args, command: resolveAbsolutePath(lintPath) }
      : resolveCommand(
          pm.agent,
          useExecuteLocal ? 'execute-local' : 'execute',
          [executeName, ...args],
        );
    if (!resolved) {
      if (useExecuteLocal && !lintPath) {
        return tryRun(false);
      }
      throw new Error(
        `${executeName} Could not resolve ${executeName} command for ${pm.agent}`,
      );
    }
    const result = await runChild({
      args: resolved.args,
      buffered: useExecuteLocal && !lintPath,
      cmd: resolved.command,
      cwd,
      logger,
      shouldFail,
      formatter,
      executeName,
    });
    if (result.status === 'fallback') {
      return tryRun(false);
    }
    return result;
  };
  return tryRun(true);
};

interface RsLintError extends Error {
  name: string;
  message: string;
  severity: string;
  file: string;
  code: string;
  help: string;
  loc: {
    start: { line: number; column?: number };
    end: { line: number; column?: number };
  };
}

export const lintPlugin = (options: LintOptions) => ({
  setup(api: RsbuildPluginAPI) {
    const executeName = options.executeName;
    let timeoutId: NodeJS.Timeout | undefined;
    let pmPromise: ReturnType<typeof detect> | undefined;
    const logger: Logger = api.logger;
    let send: RsbuildDevServer['sockWrite'] | undefined;
    let lastCompilation: Rspack.Compilation | null = null;
    const lintResults: {
      error: RsLintError[];
      warning: RsLintError[];
    } = {
      error: [],
      warning: [],
    };

    let overlay: boolean | OverlayOptions = true;

    const getPm = () => {
      if (!pmPromise) {
        pmPromise = detect();
      }
      return pmPromise;
    };

    const sendErrorToOverlay = (errors: RsLintError[]) => {
      if (errors.length === 0) return;
      try {
        if (!send || typeof send !== 'function') {
          logger?.warn(
            'sockWrite not available, cannot send errors to overlay',
          );
          return;
        }

        const lastResult = (lastCompilation?.errors ?? []).filter(
          (item) => !item.message.trimStart().startsWith('× [oxlint]'),
        );

        const issues = [
          ...lastResult.map((item) => ({
            ...item,
            loc: item.loc
              ? !('name' in item.loc)
                ? `${item.loc.start.line}:${item.loc.start.column}`
                : item.loc
              : undefined,
          })),
          ...errors
            .map((e) => formateCodeFrame(e))
            .map((item) => ({
              ...item,
              loc: item.loc
                ? `${item.loc.start.line}:${item.loc.start.column}`
                : undefined,
            })),
        ] as Rspack.StatsError[];
        send(
          'errors' as const,
          getServerMessageErrors(issues, {
            rootPath: api.context.rootPath,
            logger: logger!,
            overlay,
          }).data,
        );
        logger?.info(`Sent ${errors.length} lint errors to overlay`);
      } catch (e) {
        logger?.error(`Failed to send error to overlay: ${e}`);
      }
    };

    const clearOverlay = () => {
      try {
        if (!send || typeof send !== 'function') return;
        send('errors', { html: '', text: [] });
      } catch (e) {
        logger?.error(`${executeName} Failed to clear overlay: ${e}`);
      }
    };
    let runId = 0;
    const runLint = async () => {
      try {
        const currentRun = ++runId;

        const result = await runLintOnce(options, logger, getPm());

        if (currentRun !== runId) {
          return;
        }
        if (result.status === 'lint-errors') {
          lintResults.error = result.errors;
          sendErrorToOverlay(lintResults.error);
        } else {
          clearOverlay();
        }
      } catch (error) {
        logger?.error(`${executeName} Error executing ${executeName}: ${error}`);
      }
    };

    const debouncedRun = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => runLint(), DEBOUNCE_MS);
    };

    const formateCodeFrame = (item: RsLintError) => {
      const source =
        item.file &&
        fs.existsSync(item.file) &&
        fs.readFileSync(item.file, 'utf-8');
      let frame = '';
      if (source && item.loc) {
        frame = codeFrameColumns(source, item.loc, {
          highlightCode: true,
        })
          .split('\n')
          .map((line: string) => `  ${line}`)
          .join(os.EOL);
      }
      return {
        ...item,
        message: `[${executeName}] [${item.code}] ${item.message} ${item.help} \n${frame}`,
      };
    };

    api.modifyRspackConfig((config) => {
      config.plugins = config.plugins ?? [];

      config.plugins.push({
        apply(compiler: Rspack.Compiler) {
          compiler.hooks.thisCompilation.tap(
            `${executeName}-plugin`,
            (compilation) => {
              try {
                compilation.errors.push(
                  ...lintResults.error.map((item) => {
                    return formateCodeFrame(item);
                  }),
                );
                compilation.warnings.push(
                  ...lintResults.warning.map((w) => {
                    return formateCodeFrame(w);
                  }),
                );
                lastCompilation = compilation;
              } catch (e) {
                console.error(e);
              }
            },
          );
        },
      });
    });
    api.modifyRsbuildConfig((config) => {
      config.server = config.server ?? {};
      config.plugins = config.plugins ?? [];
      overlay = config.dev?.client?.overlay ?? true;
      const setup = config.server.setup ?? [];
      const _setup: typeof setup = (context) => {
        if (context.action === 'dev') {
          const devServer = context.server as RsbuildDevServer;
          send = devServer.sockWrite;
          devServer.httpServer?.on('upgrade', (req) => {
            if (req.url?.includes(config.dev?.client?.path)) {
              setTimeout(() => {
                sendErrorToOverlay(lintResults.error);
              }, 500);
            }
          });
        }
      };
      if (Array.isArray(setup)) {
        config.server.setup = [_setup, ...setup];
      } else {
        config.server.setup = (context) => {
          _setup(context);
          return setup(context);
        };
      }
    });
    api.onAfterDevCompile(() => {
      debouncedRun();
    });
    api.onAfterStartDevServer(async () => {
      const { lintOnStart = true } = options;
      if (lintOnStart) {
        await runLint();
      }
    });
  },
  name: 'lint-plugin',
});
export default lintPlugin;
