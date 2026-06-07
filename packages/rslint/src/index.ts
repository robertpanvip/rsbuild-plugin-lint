import { existsSync } from 'node:fs';
import nodePath from 'node:path';
import type { RsbuildPluginAPI } from '@rsbuild/core';
import lintPlugin from 'rsbuild-plugin-lint';

export interface Options {
  path?: string;
  configFile?: string;
  rslintPath?: string;

  quiet?: boolean;
  fix?: boolean;
  failOnError?: boolean;
  failOnWarning?: boolean;
  lintOnStart?: boolean;
  lintOnHotUpdate?: boolean;

  typeCheck?: boolean;
  maxWarnings?: boolean;
  rule?: string;
  noColor?: boolean;
  forceColor?: boolean;
}

const parse = (output: string): Issue[] => {
  const lines = output.split('\n').filter(Boolean);
  return lines.map((line: string) => {
    try {
      return JSON.parse(line);
    } catch (e) {
      return {
        message: line,
      };
    }
  });
};

export type Start = {
  line: number;
  column: number;
};

export type End = {
  line: number;
  column: number;
};

export type Range = {
  start: Start;
  end: End;
};

export type Issue = {
  ruleName: string;
  message: string;
  filePath: string;
  range: Range;
  severity: string;
};

const formatter = (output: string) => {
  const issues = parse(output);
  return issues.map((item) => ({
    ...item,
    severity: item.severity,
    name: item.ruleName,
    message: item.message,
    file: item.filePath,
    loc: item.range,
    code: item.ruleName,
    help: '',
  }));
};

const resolveAbsolutePath = (p: string): string =>
  nodePath.isAbsolute(p) ? p : nodePath.join(process.cwd(), p);

const buildArgs = (options: Options): string[] => {
  const {
    configFile = '',
    quiet = false,
    fix = false,
    typeCheck = true,
    maxWarnings,
    rule,
    noColor,
    forceColor,
  } = options;
  const args: string[] = [];
  if (quiet) {
    args.push('--quiet');
  }
  if (fix) {
    args.push('--fix');
  }
  if (typeCheck) {
    args.push('--type-check');
  }
  if (maxWarnings) {
    args.push('--max-warnings');
  }
  if (rule) {
    args.push('--rule');
  }
  if (noColor) {
    args.push('--no-color');
  }
  if (forceColor) {
    args.push('--force-color');
  }
  if (configFile) {
    const configFilePath = resolveAbsolutePath(configFile);
    if (existsSync(configFilePath)) {
      args.push('-config', configFilePath);
    }
  }
  args.push('.');
  return args;
};

export const linterPlugin = (options: Options = {}) => ({
  setup(api: RsbuildPluginAPI) {
    lintPlugin({
      path: options.path,
      shouldFail: options.failOnError || options.failOnWarning,
      args: [...buildArgs(options), '--format', 'jsonline'],
      lintPath: options.rslintPath,
      executeName: 'rslint',
      formatter,
      lintOnStart: options.lintOnStart,
    }).setup(api);
  },
  name: 'rslint-plugin',
});
export default linterPlugin;
