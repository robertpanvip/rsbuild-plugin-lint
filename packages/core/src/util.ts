import type { Logger } from '@rsbuild/core';
import { detect } from 'package-manager-detector/detect';
import nodePath from 'node:path';
import { spawn } from 'cross-spawn';
import {
  RunChildResult,
  LintOptions,
  RunChildParams,
  RsLintError,
  FullTap,
} from './interface.ts';
import { resolveCommand } from 'package-manager-detector';
import path from 'node:path';
import fs from 'node:fs';
import { codeFrameColumns } from '@babel/code-frame';
import os from 'node:os';
import { color } from 'rslog';

const resolveAbsolutePath = (p: string): string =>
  nodePath.isAbsolute(p) ? p : nodePath.join(process.cwd(), p);

const env = process.env;

export const runLintOnce = async (
  options: LintOptions,
  logger: Logger,
  pmPromise: ReturnType<typeof detect>,
  signal?: AbortSignal,
): Promise<RunChildResult> => {
  const {
    path = '',
    lintPath = '',
    executeName,
    args = [],
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
      cmd: resolved.command,
      cwd,
      logger,
      formatter,
      executeName,
      signal,
    });

    if (result.status === 'fallback') {
      return tryRun(false);
    }
    return result;
  };
  return tryRun(true);
};

const runChild = ({
  cmd,
  args,
  cwd,
  logger,
  formatter,
  executeName,
  signal,
}: RunChildParams): Promise<RunChildResult> =>
  new Promise((resolve, reject) => {
    let output = '';
    const child = spawn(cmd, args, {
      cwd,
      env: { ...env, FORCE_COLOR: '1' },
      shell: false,
      stdio: 'pipe',
    });

    // 收到 abort 信号时杀掉子进程
    const onAbort = () => child.kill('SIGTERM');
    if (signal) {
      if (signal.aborted) {
        child.kill('SIGTERM');
      } else {
        signal.addEventListener('abort', onAbort, { once: true });
      }
    }

    const emit = (data: Buffer) => {
      output += data.toString();
    };

    child.stdout?.on('data', (d) => emit(d));
    child.stderr?.on('data', (d) => emit(d));
    child.on('error', (error) => {
      signal?.removeEventListener('abort', onAbort);
      resolve({ status: 'fallback' });
      logger.error(`${executeName} Error: ${error.message}`);
      reject(error);
    });

    child.on('exit', (code) => {
      signal?.removeEventListener('abort', onAbort);
      const errors = formatter(output);
      if (errors.length) {
        resolve({ status: 'lint-errors', errors });
      } else {
        resolve({ status: 'ok' });
      }
    });
  });

export const formateCodeFrame = (prefix: string, item: RsLintError) => {
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
    message: `${prefix} ${item.code ? `[${color.green(item.code)}]` : ``} ${color.cyan(item.message)} ${color.cyan(item.help)}\n${frame}\n`,
  };
};
// 保存 dev server 的 done tap(对应 interceptDoneToGetDevServerTap)
// 生产模式没有 dev server 的 tap,devServerDoneTap 保持 null,无副作用
const DEV_SERVER_NAMES = [
  'webpack-dev-server',
  'rsbuild-dev-server',
  'rspack-dev-server',
];

export const isDevServerTap = (tap: FullTap) =>
  DEV_SERVER_NAMES.includes(tap.name) && tap.type === 'sync';
