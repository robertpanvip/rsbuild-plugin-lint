import { existsSync } from 'node:fs';
import nodePath from 'node:path';
import type { RsbuildPluginAPI } from '@rsbuild/core';
import lintPlugin from 'rsbuild-plugin-lint';

export interface Options {
  path?: string;
  project?: string;
  tsgoPath?: string;
  noEmit?: boolean;
  pretty?: boolean;
  strict?: boolean;
  failOnError?: boolean;
  failOnWarning?: boolean;
  lintOnStart?: boolean;
  params?: string;
}

type ParsedIssue = {
  file: string;
  line: number;
  column: number;
  severity: string;
  code: string;
  message: string;
};

const parseTscOutput = (output: string): ParsedIssue[] => {
  const clean = output.replace(/\x1b\[[0-9;]*m/g, '');
  const parts = clean.split(/(?=^[^:\n]+:\d+:\d+ - (error|warning) TS\d+:)/m);
  return parts
    .flatMap((block) => {
      const m = block.match(
        /^(.+?):(\d+):(\d+) - (error|warning) (TS\d+):\s*([\s\S]*?)(?:\n\n|Found\s+\d+)/,
      );

      if (!m) return [];

      return [
        {
          file: m[1],
          line: Number(m[2]),
          column: Number(m[3]),
          severity: m[4],
          code: m[5],
          message: m[6].trim(),
        },
      ];
    })
    .filter(Boolean);
};

const formatter = (output: string) => {
  const issues = parseTscOutput(output);
  return issues.map((item) => ({
    severity: item.severity,
    name: item.code,
    code: item.code,
    message: item.message,
    help: '',
    file: item.file,
    loc: {
      start: { line: item.line, column: item.column, offset: 0, length: 0 },
      end: { line: item.line, column: item.column, offset: 0, length: 0 },
    },
  }));
};

const resolveAbsolutePath = (p: string): string =>
  nodePath.isAbsolute(p) ? p : nodePath.join(process.cwd(), p);

const buildArgs = (options: Options): string[] => {
  const {
    project,
    noEmit = true,
    pretty = false,
    strict = false,
    params = '',
  } = options;

  const args: string[] = [];

  if (noEmit) {
    args.push('--noEmit');
  }
  if (pretty) {
    args.push('--pretty');
  }
  if (strict) {
    args.push('--strict');
  }
  if (project) {
    const projectPath = resolveAbsolutePath(project);
    if (existsSync(projectPath)) {
      args.push('--project', projectPath);
    }
  }
  if (params) {
    args.push(...params.split(' ').filter(Boolean));
  }
  return args;
};

export const linterPlugin = (options: Options = {}) => ({
  setup(api: RsbuildPluginAPI) {
    lintPlugin({
      path: options.path,
      shouldFail: options.failOnError || options.failOnWarning,
      args: buildArgs(options),
      lintPath: options.tsgoPath,
      executeName: 'tsgo',
      formatter,
      lintOnStart: options.lintOnStart,
    }).setup(api);
  },
  name: 'tsgo-plugin',
});
export default linterPlugin;
