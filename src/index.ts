import * as fs from 'node:fs';
import { existsSync } from 'node:fs';
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

export interface Options {
  path?: string;
  ignorePattern?: string | string[];
  configFile?: string;
  deny?: string[];
  allow?: string[];
  warn?: string[];
  params?: string;
  oxlintPath?: string;
  format?:
    | 'default'
    | 'checkstyle'
    | 'github'
    | 'gitlab'
    | 'json'
    | 'junit'
    | 'stylish'
    | 'unix';
  quiet?: boolean;
  fix?: boolean;
  failOnError?: boolean;
  failOnWarning?: boolean;
  lintOnStart?: boolean;
  lintOnHotUpdate?: boolean;
  devServer?: boolean;
}
const DEBOUNCE_MS = 500;
const resolveAbsolutePath = (p: string): string =>
  nodePath.isAbsolute(p) ? p : nodePath.join(process.cwd(), p);
const buildArgs = (options: Options): string[] => {
  const {
    ignorePattern,
    configFile = 'oxlintrc.json',
    deny = [],
    allow = [],
    warn = [],
    params = '',
    format = '',
    quiet = false,
    fix = false,
    failOnWarning = false,
  } = options;
  const args: string[] = [];
  if (quiet) {
    args.push('--quiet');
  }
  if (fix) {
    args.push('--fix');
  }
  if (format) {
    args.push('--format', format);
  }
  if (failOnWarning) {
    args.push('--deny-warnings');
  }
  const patterns = Array.isArray(ignorePattern)
    ? ignorePattern
    : ignorePattern
      ? [ignorePattern]
      : [];
  patterns.forEach((pattern) => {
    args.push(`--ignore-pattern=${pattern}`);
  });
  deny.forEach((d) => {
    args.push('-D', d);
  });
  allow.forEach((a) => {
    args.push('-A', a);
  });
  warn.forEach((w) => {
    args.push('-W', w);
  });
  const configFilePath = resolveAbsolutePath(configFile);
  if (existsSync(configFilePath)) {
    args.push('-c', configFilePath);
  }
  if (params) {
    args.push(...params.split(' ').filter(Boolean));
  }
  return args;
};
export type SpanItem = {
  offset: number;
  length: number;
  line: number;
  column: number;
};
export type Label = {
  label: string;
  span: SpanItem;
};
export type LintError = {
  name: string;
  message: string;
  code: string;
  severity: string;
  causes: unknown[];
  url: string;
  help: string;
  filename: string;
  labels: Label[];
  related: unknown[];
};
const parseJsonOutput = (output: string): LintError[] => {
  try {
    const json = JSON.parse(output);
    if (json && typeof json === 'object' && Array.isArray(json.diagnostics)) {
      return json.diagnostics;
    }
    if (Array.isArray(json)) {
      return json;
    }
  } catch {
    // ignore parse errors
  }
  return [];
};

interface RunChildParams {
  cmd: string;
  args: string[];
  cwd: string;
  logger: Logger | undefined;
  shouldFail: boolean;
  buffered: boolean;
}

type RunChildResult =
  | { status: 'ok' }
  | { status: 'lint-errors'; errors: LintError[] }
  | { status: 'fallback' };

const env = process.env;

const runChild = ({
  cmd,
  args,
  cwd,
  logger,
  shouldFail,
  buffered,
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
      logger?.error(`oxlint Error: ${error.message}`);
      reject(error);
    });
    child.on('exit', (code) => {
      const output = bufferedOutput.join('\n');
      if (code === 0) {
        if (!buffered) {
          logger?.info('Oxlint successfully finished.');
        }
        const errors = parseJsonOutput(output);
        //resolve({ status: "ok" });
        resolve({ status: 'lint-errors', errors });
      } else if (code === 1) {
        const errors = parseJsonOutput(output);
        if (errors.length > 0) {
          resolve({ status: 'lint-errors', errors });
        } else {
          if (buffered) {
            const errors = bufferedOutput.flatMap((line) => {
              const errors = parseJsonOutput(line);
              //logger?.info(line);
              return errors;
            });
            resolve({ status: 'lint-errors', errors });
          }
          if (shouldFail) {
            reject(new Error('Oxlint found lint errors.'));
          } else {
            //logger?.warn("Oxlint found lint errors.");
            resolve({ status: "lint-errors", errors: [] });
          }
        }
      } else if (buffered) {
        resolve({ status: 'fallback' });
      } else {
        logger?.error(`Oxlint exited with unexpected code: ${code}`);
        resolve({ status: 'ok' });
      }
    });
  });
const runOxlintOnce = async (
  options: Options,
  logger: Logger | undefined,
  pmPromise: ReturnType<typeof detect>,
): Promise<RunChildResult> => {
  const {
    path = '',
    oxlintPath = '',
    failOnError = false,
    failOnWarning = false,
  } = options;
  const shouldFail = failOnError || failOnWarning;
  const args = [...buildArgs(options), '--format', 'json'];
  const cwd = resolveAbsolutePath(path);
  const pm = await pmPromise;
  if (!pm) {
    throw new Error('Could not detect package manager');
  }
  const tryRun = async (useExecuteLocal: boolean): Promise<RunChildResult> => {
    const resolved = oxlintPath
      ? { args, command: resolveAbsolutePath(oxlintPath) }
      : resolveCommand(
          pm.agent,
          useExecuteLocal ? 'execute-local' : 'execute',
          ['oxlint', ...args],
        );
    if (!resolved) {
      if (useExecuteLocal && !oxlintPath) {
        return tryRun(false);
      }
      throw new Error(`Could not resolve oxlint command for ${pm.agent}`);
    }
    const result = await runChild({
      args: resolved.args,
      buffered: useExecuteLocal && !oxlintPath,
      cmd: resolved.command,
      cwd,
      logger,
      shouldFail,
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

export const oxlintPlugin = (options: Options = {}) => ({
  setup(api: RsbuildPluginAPI) {
    let timeoutId: NodeJS.Timeout | undefined;
    let pmPromise: ReturnType<typeof detect> | undefined;
    let logger: Logger | undefined;
    let send: RsbuildDevServer['sockWrite'] | undefined;
    let lastCompilation: Rspack.Compilation | null = null;
    let lintResults: {
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
          (item) =>
            (item as unknown as { __oxlint?: boolean }).__oxlint !== true,
        );
        const issues = [
          ...lastResult,
          ...errors.map((e) => formateCodeFrame(e)),
        ] as unknown as Rspack.StatsError[];
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
        logger?.error(`Failed to clear overlay: ${e}`);
      }
    };
    let runId = 0;
    const runOxlint = async () => {
      try {
        const currentRun = ++runId;

        const result = await runOxlintOnce(options, logger, getPm());

        if (currentRun !== runId) {
          return;
        }
        if (result.status === 'lint-errors') {
          lintResults.error = result.errors.map((item) => ({
            ...item,
            severity: item.severity,
            name: item.code,
            message: item.message,
            file: item.filename,
            loc: {
              start: item.labels[0]?.span,
              end: {
                line: item.labels[0]?.span.line + 1,
                column: 0,
              },
            },
          }));
          sendErrorToOverlay(lintResults.error);
        } else {
          clearOverlay();
        }
      } catch (error) {
        logger?.error(`Error executing oxlint: ${error}`);
      }
    };

    const debouncedRun = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => runOxlint(), DEBOUNCE_MS);
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
        __oxlint: true,
        message: `[oxlint] [${item.code}] ${item.message} ${item.help} \n${frame}`,
      };
    };

    logger = api.logger;

    api.modifyRspackConfig((config) => {
      config.plugins = config.plugins ?? [];

      config.plugins.push({
        apply(compiler: Rspack.Compiler) {
          compiler.hooks.thisCompilation.tap('oxlint-plugin', (compilation) => {
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
          });
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
              setTimeout(()=>{
                sendErrorToOverlay(lintResults.error);
              },500)
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
    api.onAfterStartDevServer(async (server) => {
      const { lintOnStart = true } = options;
      if (lintOnStart) {
        await runOxlint();
      }
    });
  },
  name: 'oxlint-plugin',
});
export default oxlintPlugin;
