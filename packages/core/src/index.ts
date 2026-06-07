import type {
  Logger,
  OverlayOptions,
  RsbuildDevServer,
  RsbuildPluginAPI,
  Rspack,
} from '@rsbuild/core';
import { detect } from 'package-manager-detector/detect';
import { color } from 'rslog';
import { getServerMessageErrors } from './message.js';
import type { LintOptions, RsLintError, Issue } from './interface.ts';
import {
  formateCodeFrame,
  formateIssueLoc,
  formatLoggerErrors,
  runLintOnce,
} from './util.ts';

const DEBOUNCE_MS = 500;

export const lintPlugin = (options: LintOptions) => ({
  setup(api: RsbuildPluginAPI) {
    const executeName = options.executeName;
    let timeoutId: NodeJS.Timeout | undefined;
    let pmPromise: ReturnType<typeof detect> | undefined;
    const logger: Logger = api.logger;
    let send: RsbuildDevServer['sockWrite'] | undefined;
    let lastCompilation: Rspack.Compilation | null = null;
    const prefix = `${color.yellow('[')}${color.yellow(executeName)}${color.yellow(']')}`;

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

    const sendErrorToLogger = (issues: Issue[], text: string[]) => {
      logger.error(formatLoggerErrors(issues, text, api.context.rootPath));
    };

    const sendErrorToOverlay = (errors: RsLintError[]) => {
      if (errors.length === 0) return;
      try {
        if (!send || typeof send !== 'function') {
          logger.warn('sockWrite not available, cannot send errors to overlay');
          return;
        }
        const toSends = errors
          .map((e) => formateCodeFrame(prefix, e))
          .map((item) => ({
            ...item,
            file: item.file,
            loc: item.loc ? formateIssueLoc(item) : undefined,
          }));

        const lastResult = (lastCompilation?.errors ?? []).filter((item) =>
          toSends.some(
            (t) =>
              t.file === item.file &&
              t.loc === item.loc &&
              t.name === item.name,
          ),
        );

        const issues = [
          ...lastResult.map((item) => ({
            ...item,
            loc: item.loc
              ? !('name' in item.loc)
                ? formateIssueLoc(item as RsLintError)
                : item.loc
              : undefined,
          })),
          ...toSends,
        ] as Issue[];

        const rootPath = api.context.rootPath;
        const innerContext = {
          rootPath,
          logger: logger!,
          overlay,
        };
        const data = getServerMessageErrors(issues, innerContext).data;

        send('errors' as const, data);

        logger.info(`Sent ${errors.length} lint errors to overlay`);
        return {
          issues,
          text: data.text,
        };
      } catch (e) {
        logger.error(`Failed to send error to overlay: ${e}`);
      }
    };

    const clearOverlay = () => {
      try {
        if (!send || typeof send !== 'function') return;
        send('errors', { html: '', text: [] });
      } catch (e) {
        logger.error(`${executeName} Failed to clear overlay: ${e}`);
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
          const data = sendErrorToOverlay(lintResults.error);
          if (data) {
            sendErrorToLogger(data.issues, data.text);
          }
        } else {
          clearOverlay();
        }
      } catch (error) {
        logger.error(`${executeName} Error executing ${executeName}: ${error}`);
      }
    };

    const debouncedRun = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => runLint(), DEBOUNCE_MS);
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
                    return formateCodeFrame(prefix, item);
                  }),
                );
                compilation.warnings.push(
                  ...lintResults.warning.map((w) => {
                    return formateCodeFrame(prefix, w);
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
              Promise.resolve().then(() => {
                const data = sendErrorToOverlay(lintResults.error);
                if (data) {
                  sendErrorToLogger(data.issues, data.text);
                }
              });
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
