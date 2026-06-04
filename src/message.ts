import type { OverlayOptions, Logger, Rspack } from '@rsbuild/core';
import { formatStatsError } from './fork/format.js';
import { renderErrorToHtml } from './fork/overlay.js';

type Context = {
  logger: Logger;
  rootPath: string;
  overlay: boolean | OverlayOptions;
};

export function getServerMessageErrors(
  errors: Rspack.StatsError[],
  context: Context,
) {
  const { rootPath, logger, overlay } = context;
  const formattedErrors = errors.map((item) =>
    formatStatsError(item, rootPath, 'error', logger),
  );
  //const overlay = environment?.config.dev.client.overlay;
  let overlayErrors = formattedErrors;

  if (
    overlay &&
    typeof overlay === 'object' &&
    typeof overlay.errors === 'function'
  ) {
    const { errors: filter } = overlay;
    overlayErrors = formattedErrors.filter((error) => filter(new Error(error)));
  }

  const html = overlayErrors
    .map((error) => renderErrorToHtml(error, rootPath))
    .join('\n\n')
    .trim();

  return {
    type: 'errors' as const,
    data: {
      text: formattedErrors,
      html,
    },
  };
}

export function getServerMessageWarnings(
  warnings: Rspack.StatsError[],
  context: Context,
) {
  const formattedWarnings = warnings.map((item) =>
    formatStatsError(item, context.rootPath, 'warning', context.logger),
  );
  return {
    type: 'warnings',
    data: { text: formattedWarnings },
  };
}
