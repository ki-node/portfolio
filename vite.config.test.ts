import { describe, expect, it } from 'vitest';

import { createViteConfig, resolveBuildProfile } from './vite.config';

describe('Vite build profiles', () => {
  it('keeps the public GitHub Pages base and output directory', () => {
    const profile = resolveBuildProfile('production');
    const config = createViteConfig('production');

    expect(profile.context).toBe('web');
    expect(config.base).toBe('/portfolio/');
    expect(config.build?.outDir).toBe('dist');
  });

  it('uses relocatable paths and an isolated embedded output directory', () => {
    const profile = resolveBuildProfile('embedded');
    const config = createViteConfig('embedded');

    expect(profile.context).toBe('embedded');
    expect(config.base).toBe('./');
    expect(config.build?.outDir).toBe('dist-embedded');
  });
});
