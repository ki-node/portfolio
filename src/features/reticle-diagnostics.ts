import type { ReticleDiagnostic } from './system-core-controller';

export type ReticleDiagnosticReporter = (diagnostic: ReticleDiagnostic) => void;

/** Development-only console reporter; production builds pass no reporter. */
export const reportReticleDiagnostic: ReticleDiagnosticReporter = (diagnostic) => {
  console.debug('[portfolio:reticle]', diagnostic);
};
