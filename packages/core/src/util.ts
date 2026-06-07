import type { Logger } from '@rsbuild/core';
import { detect } from 'package-manager-detector/detect';
import nodePath from 'node:path';
import { spawn } from 'cross-spawn';
import {
  RunChildResult,
  LintOptions,
  RunChildParams,
  RsLintError,
  Issue,
} from './interface.ts';
import { resolveCommand } from 'package-manager-detector';
import path from 'node:path';
import { formatFileName } from './fork/format.ts';
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

const runChild = ({
  cmd,
  args,
  cwd,
  logger,
  shouldFail,
  formatter,
  executeName,
}: RunChildParams): Promise<RunChildResult> =>
  new Promise((resolve, reject) => {
    let output = '';
    const child = spawn(cmd, args, {
      cwd,
      env: { ...env, FORCE_COLOR: '1' },
      shell: false,
      stdio: 'pipe',
    });

    const emit = (data: Buffer) => {
      output += data.toString();
    };

    child.stdout?.on('data', (d) => emit(d));
    child.stderr?.on('data', (d) => emit(d));
    child.on('error', (error) => {
      resolve({ status: 'fallback' });
      logger.error(`${executeName} Error: ${error.message}`);
      reject(error);
    });

    child.on('exit', (code) => {
      if (code !== 0 && shouldFail) {
        reject(new Error(`${executeName} found lint errors.`));
        return;
      }
      const errors = formatter(output);
      if (errors.length) {
        resolve({ status: 'lint-errors', errors });
      } else {
        resolve({ status: 'ok' });
      }
    });
  });

export const formateIssueLoc = (issue: RsLintError) =>
  `${issue.loc.start.line}:${issue.loc.start.column}`;

export function formatLoggerErrors(
  issues: Issue[],
  text: string[],
  rootPath: string,
) {
  let content = text.join('\n');
  issues.forEach((issue) => {
    const isAbsolute = path.isAbsolute(issue.file!);
    const absolutePath =
      rootPath && !isAbsolute ? path.join(rootPath, issue.file!) : issue.file;
    if (issue.file) {
      content = content.replaceAll(
        formatFileName(issue.file!, issue, rootPath),
        `File\n at ${absolutePath}:${issue.loc}\n`,
      );
    }
  });
  return content;
}

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
    message: ` ${prefix} ${item.code ? `[${color.green(item.code)}]` : ``} ${color.cyan(item.message)} ${color.cyan(item.help)}\n${frame}\n`,
  };
};
