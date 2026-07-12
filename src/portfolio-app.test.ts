import { describe, expect, it, vi } from 'vitest';

import type { Controller } from './features/controller';
import { PortfolioApp } from './portfolio-app';

const createController = (name: string, calls: string[]): Controller => ({
  init: vi.fn(() => calls.push(`${name}:init`)),
  destroy: vi.fn(() => calls.push(`${name}:destroy`)),
});

describe('PortfolioApp', () => {
  it('initializes once and destroys controllers in reverse order', () => {
    const calls: string[] = [];
    const app = new PortfolioApp([
      createController('navigation', calls),
      createController('motion', calls),
    ]);

    app.init();
    app.init();
    app.destroy();
    app.destroy();

    expect(calls).toEqual([
      'navigation:init',
      'motion:init',
      'motion:destroy',
      'navigation:destroy',
    ]);
  });
});
