import { defineConfig, type Plugin, type UserConfig } from 'vite';

import { resolveAppContext, type AppContext } from './src/app-context';

export interface PortfolioBuildProfile {
  context: AppContext;
  base: '/portfolio/' | './';
  outDir: 'dist' | 'dist-embedded';
}

const buildProfiles = {
  web: {
    context: 'web',
    base: '/portfolio/',
    outDir: 'dist',
  },
  embedded: {
    context: 'embedded',
    base: './',
    outDir: 'dist-embedded',
  },
} satisfies Record<AppContext, PortfolioBuildProfile>;

export const resolveBuildProfile = (mode: string): PortfolioBuildProfile =>
  buildProfiles[resolveAppContext(mode)];

export const createAppContextHtmlPlugin = (context: AppContext): Plugin => ({
  name: 'portfolio-app-context',
  transformIndexHtml: {
    order: 'pre',
    handler(html) {
      return html.replace('<html lang="de">', `<html lang="de" data-app-context="${context}">`);
    },
  },
});

export const createViteConfig = (mode: string): UserConfig => {
  const profile = resolveBuildProfile(mode);

  return {
    base: profile.base,
    plugins: [createAppContextHtmlPlugin(profile.context)],
    build: {
      outDir: profile.outDir,
      target: 'es2022',
      cssCodeSplit: true,
      sourcemap: false,
      reportCompressedSize: true,
    },
  };
};

export default defineConfig(({ mode }) => createViteConfig(mode));
