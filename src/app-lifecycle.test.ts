// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { mountPortfolio, type PortfolioApplication } from './app-lifecycle';

describe('portfolio page lifecycle', () => {
  it('waits for a loading iframe document before initializing', () => {
    const readyState = vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');
    const init = vi.fn();
    const destroy = vi.fn();
    const lifecycle = mountPortfolio({ createApp: () => ({ init, destroy }) });

    expect(init).not.toHaveBeenCalled();

    document.dispatchEvent(new Event('DOMContentLoaded'));
    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(init).toHaveBeenCalledOnce();

    lifecycle.destroy();
    readyState.mockRestore();

    expect(destroy).toHaveBeenCalledOnce();
  });

  it('destroys the application once when its iframe page is hidden', () => {
    const init = vi.fn();
    const destroy = vi.fn();
    const app: PortfolioApplication = {
      init,
      destroy,
    };
    const lifecycle = mountPortfolio({ createApp: () => app });

    expect(init).toHaveBeenCalledOnce();

    window.dispatchEvent(new Event('pagehide'));
    window.dispatchEvent(new Event('pagehide'));
    lifecycle.destroy();

    expect(destroy).toHaveBeenCalledOnce();
  });
});
