import { PortfolioApp } from './portfolio-app';

export interface PortfolioApplication {
  init(): void;
  destroy(): void;
}

interface PortfolioLifecycleOptions {
  targetWindow?: Window;
  targetDocument?: Document;
  createApp?: () => PortfolioApplication;
}

export interface PortfolioLifecycle {
  destroy(): void;
}

/** Starts once the DOM is ready and owns the page-level iframe cleanup boundary. */
export const mountPortfolio = ({
  targetWindow = window,
  targetDocument = document,
  createApp = () => new PortfolioApp(),
}: PortfolioLifecycleOptions = {}): PortfolioLifecycle => {
  let app: PortfolioApplication | undefined;
  let destroyed = false;

  const start = () => {
    if (destroyed || app) {
      return;
    }

    app = createApp();
    app.init();
  };

  const destroy = () => {
    if (destroyed) {
      return;
    }

    destroyed = true;
    targetDocument.removeEventListener('DOMContentLoaded', start);
    targetWindow.removeEventListener('pagehide', destroy);
    app?.destroy();
    app = undefined;
  };

  if (targetDocument.readyState === 'loading') {
    targetDocument.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  targetWindow.addEventListener('pagehide', destroy, { once: true });

  return { destroy };
};
