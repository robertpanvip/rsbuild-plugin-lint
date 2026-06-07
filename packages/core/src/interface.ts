import type { Logger, Rspack } from '@rsbuild/core';

export interface RunChildParams {
  cmd: string;
  args: string[];
  cwd: string;
  logger: Logger;
  shouldFail: boolean;
  formatter: (data: string) => RsLintError[];
  executeName: string;
}

export interface RsLintError extends Error {
  name: string;
  message: string;
  severity: string;
  file: string;
  code: string;
  help: string;
  loc: {
    start: { line: number; column?: number };
    end?: { line: number; column?: number };
  };
}
export type RunChildResult =
  | { status: 'ok' }
  | { status: 'lint-errors'; errors: RsLintError[] }
  | { status: 'fallback' };

export type LintOptions<> = {
  lintOnStart?: boolean;
  restartCompile?: boolean;
  path?: string;
  shouldFail?: boolean;
  lintPath?: string;
  executeName: string;
  args: string[];
  formatter: (data: string) => RsLintError[];
};

export type Issue = Rspack.StatsError & { loc: string };