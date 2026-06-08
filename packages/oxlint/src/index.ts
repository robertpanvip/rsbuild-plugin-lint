import { existsSync } from 'node:fs';
import nodePath from 'node:path';
import type { RsbuildPluginAPI } from '@rsbuild/core';
import lintPlugin from 'rsbuild-plugin-lint';

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
  typeAware?: boolean;
  typeCheck?: boolean;
  tsconfig?: string;
}

type SpanItem = {
  offset: number;
  length: number;
  line: number;
  column: number;
};

type Label = {
  label: string;
  span: SpanItem;
};

type LintError = {
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

const formatter = (output: string) => {
  const issues= parseJsonOutput(output);
  return issues.map((item) => ({
    ...item,
    severity: item.severity,
    name: item.code,
    message: item.message,
    file: item.filename,
    loc: {
      start: item.labels[0]?.span,
      end: item.labels[0]?.span,
    },
  }));
};

const resolveAbsolutePath = (p: string): string =>
  nodePath.isAbsolute(p) ? p : nodePath.join(process.cwd(), p);

const checkTsPluginInstalled = (logger: { warn: (msg: string) => void }): boolean => {
  try {
    require.resolve('oxlint-tsgolint');
    return true;
  } catch {
    return false;
  }
};

const buildArgs = (options: Options, logger?: { warn: (msg: string) => void }): string[] => {
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
    typeAware = false,
    tsconfig = '',
    typeCheck = false,
  } = options;
  
  if (
    (typeAware || tsconfig || typeCheck) &&
    logger &&
    !checkTsPluginInstalled(logger)
  ) {
    logger.warn(
      'oxlint-tsgolint is not installed. Type-aware linting requires oxlint-tsgolint.\n' +
        'Please install it with: npm install oxlint-tsgolint --save-dev\n' +
        'The --type-aware and --tsconfig options will be ignored.',
    );
    return buildArgs({ ...options, typeAware: false, tsconfig: '' }, logger);
  }
  
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
  if (typeAware) {
    args.push('--type-aware');
  }
  if (typeCheck) {
    args.push('--type-check');
  }
  if (tsconfig) {
    args.push('--tsconfig', resolveAbsolutePath(tsconfig));
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

export const linterPlugin = (options: Options = {}) => ({
  setup(api: RsbuildPluginAPI) {
    const args = buildArgs(options, api.logger);
    lintPlugin({
      path: options.path,
      shouldFail: options.failOnError || options.failOnWarning,
      args: [...args, '--format', 'json'],
      lintPath: options.oxlintPath,
      executeName: 'oxlint',
      formatter,
      lintOnStart: options.lintOnStart,
    }).setup(api);
  },
  name: 'oxlint-plugin',
});

export default linterPlugin;
