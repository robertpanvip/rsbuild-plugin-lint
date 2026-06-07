import { existsSync } from 'node:fs';
import nodePath from 'node:path';
import type { RsbuildPluginAPI } from '@rsbuild/core';
import lintPlugin from 'rsbuild-plugin-lint';

export interface Options {
  path?: string;
  /**@description Set the file path to the configuration file, or the directory path to find biome.json or biome.jsonc. If used, it disables the default configuration file resolution.*/
  configFile?: string;

  failOnError?: boolean;
  failOnWarning?: boolean;
  lintOnStart?: boolean;
  lintOnHotUpdate?: boolean;

  linterPath?: string;
  /**@description Set the formatting mode for markup: “off” prints everything as plain text, “force” forces the formatting of markup using ANSI even if the console output is determined to be incompatible.*/
  colors?: 'off' | 'force';
  /**@description Connect to a running instance of the Biome daemon server.*/
  useServer?: string;

  /**@description Print additional diagnostics, and some diagnostics show more information. Also, print out what files were processed and which ones were modified.*/
  verbose?: string;

  /**
   * @description Cap the amount of diagnostics displayed. When none is provided, the limit is lifted.
   * @default 20
   */
  maxDiagnostics?: number | 'none';
  /**@description Skip over files containing syntax errors instead of emitting an error diagnostic.*/
  skipParseErrors?: boolean;
  /**@description Silence errors that would be emitted in case no files were processed during the execution of the command.*/
  noErrorsOnUnmatched?: boolean;
  /**Tell Biome to exit with an error code if some diagnostics emit warnings.*/
  errorOnWarnings?: boolean;
  /**
   * @description  The level of diagnostics to show. In order, from the lowest to the most important: info, warn, error. Passing --diagnostic-level=error will cause Biome to print only diagnostics that contain only errors.
   * @default info
   * */
  diagnosticLevel?: 'info' | 'warn' | 'error';
}

export type Code = {
  url: string;
  value: string;
};

export type End = {
  column: number;
  line: number;
};

export type Start = {
  column: number;
  line: number;
};

export type Location = {
  path: string;
  range: RangeItem;
};

export type RangeItem = {
  end: End;
  start: Start;
};

export type Suggestion = {
  range: RangeItem;
  text: string;
};

export type Issue = {
  code: Code;
  location: Location;
  message: string;
  suggestions: Suggestion[];
};
const parse = (output: string): Issue[] => {
  try {
    const out = JSON.parse(output);
    if (out.diagnostics) {
      if (Array.isArray(out.diagnostics)) {
        return out.diagnostics;
      } else {
        return [out.diagnostics];
      }
    }
    return [];
  } catch (e) {
    return [];
  }
};

const formatter = (output: string) => {
  const issues = parse(output);
  return issues.map((item) => ({
    ...item,
    severity: 'error',
    name: '',
    message: item.message,
    file: item.location.path,
    loc: item.location.range,
    code: item.code.url,
    help: (item.suggestions || [])?.map((s) => s.text).join('\n'),
  }));
};

const resolveAbsolutePath = (p: string): string =>
  nodePath.isAbsolute(p) ? p : nodePath.join(process.cwd(), p);

const buildArgs = (options: Options): string[] => {
  const {
    configFile = '',
    colors,
    useServer,
    verbose,
    maxDiagnostics,
    skipParseErrors,
    noErrorsOnUnmatched,
    errorOnWarnings,
    diagnosticLevel,
  } = options;
  const args: string[] = ['lint'];
  if (colors) {
    args.push(`--colors`, `${colors}`);
  }
  if (useServer) {
    args.push(`--use-server`, `${useServer}`);
  }

  if (verbose) {
    args.push(`--verbose`, `${verbose}`);
  }
  if (maxDiagnostics) {
    args.push(`--max-diagnostics`, `${maxDiagnostics}`);
  }

  if (skipParseErrors) {
    args.push(`--skip-parse-errors`, `${skipParseErrors}`);
  }

  if (noErrorsOnUnmatched) {
    args.push(`--no-errors-on-unmatched`, `${noErrorsOnUnmatched}`);
  }

  if (errorOnWarnings) {
    args.push(`--error-on-warnings`, `${errorOnWarnings}`);
  }
  if (diagnosticLevel) {
    args.push(`--diagnostic-level`,diagnosticLevel);
  }

  if (configFile) {
    const configFilePath = resolveAbsolutePath(configFile);
    if (existsSync(configFilePath)) {
      args.push('-config-path', configFilePath);
    }
  }
  return args;
};

export const linterPlugin = (options: Options = {}) => ({
  setup(api: RsbuildPluginAPI) {
    lintPlugin({
      path: options.path,
      shouldFail: options.failOnError || options.failOnWarning,
      args: [...buildArgs(options), '--reporter', 'rdjson'],
      lintPath: options.linterPath,
      executeName: 'biome',
      formatter,
      lintOnStart: options.lintOnStart,
    }).setup(api);
  },
  name: 'biome-plugin',
});
export default linterPlugin;
