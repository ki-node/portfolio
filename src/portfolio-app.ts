import type { Controller } from './features/controller';
import { readExposedAppContext, type AppContext } from './app-context';
import { CurrentYearController } from './features/current-year-controller';
import { NavigationController } from './features/navigation-controller';
import { PageProgressController } from './features/page-progress-controller';
import { PointerEffectsController } from './features/pointer-effects-controller';
import { SystemCoreController } from './features/system-core-controller';
import { ViewModeController } from './features/view-mode-controller';
import { ViewportObserversController } from './features/viewport-observers-controller';
import { EmbeddedLinkAdapter } from './features/embedded-link-adapter';
import type { ReticleDiagnosticReporter } from './features/reticle-diagnostics';

export const createPortfolioControllers = (
  context: AppContext = readExposedAppContext(),
  reportReticleDiagnostic?: ReticleDiagnosticReporter,
): Controller[] => {
  const systemCore = new SystemCoreController(undefined, reportReticleDiagnostic);

  return [
    new CurrentYearController(),
    new NavigationController(),
    systemCore,
    new ViewModeController(
      systemCore.pulse,
      systemCore.resetInputTracking,
      systemCore.prepareForCodeMode,
    ),
    new PageProgressController(systemCore.requestRender),
    new PointerEffectsController(),
    new ViewportObserversController(),
    new EmbeddedLinkAdapter(context),
  ];
};

/** Composes independent progressive controllers into the page lifecycle. */
export class PortfolioApp {
  private initialized = false;

  constructor(private readonly controllers: readonly Controller[] = createPortfolioControllers()) {}

  init() {
    if (this.initialized) {
      return;
    }

    this.controllers.forEach((controller) => controller.init());
    this.initialized = true;
  }

  destroy() {
    if (!this.initialized) {
      return;
    }

    [...this.controllers].reverse().forEach((controller) => controller.destroy());
    this.initialized = false;
  }
}
