export const appContexts = ['web', 'embedded'] as const;

export type AppContext = (typeof appContexts)[number];

/** Resolves the only build-time distinction exposed to the application. */
export const resolveAppContext = (mode: string): AppContext =>
  mode === 'embedded' ? 'embedded' : 'web';

/** Makes the central context available to CSS, diagnostics and future bridge wiring. */
export const exposeAppContext = (
  mode: string,
  root: HTMLElement = document.documentElement,
): AppContext => {
  const context = resolveAppContext(mode);

  root.dataset.appContext = context;

  return context;
};
