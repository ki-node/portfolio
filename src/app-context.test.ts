// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';

import { exposeAppContext, readExposedAppContext, resolveAppContext } from './app-context';

afterEach(() => {
  document.documentElement.removeAttribute('data-app-context');
});

describe('application context', () => {
  it('uses the web context for normal Vite modes', () => {
    expect(resolveAppContext('production')).toBe('web');
    expect(resolveAppContext('development')).toBe('web');
  });

  it('detects and exposes the embedded context centrally', () => {
    expect(exposeAppContext('embedded')).toBe('embedded');
    expect(document.documentElement.dataset.appContext).toBe('embedded');
    expect(readExposedAppContext()).toBe('embedded');
  });
});
