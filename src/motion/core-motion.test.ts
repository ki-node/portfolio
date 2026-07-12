import { describe, expect, it } from 'vitest';

import {
  advanceCorePose,
  calculateCoreTarget,
  clamp,
  formatCoordinateLabel,
  isCoreSettled,
  normalizeViewportPoint,
  type CorePose,
} from './core-motion';

const restingPose: CorePose = {
  panX: 0,
  panY: 0,
  rotateX: 0,
  rotateY: 0,
  velocityX: 0,
  velocityY: 0,
};

describe('core motion', () => {
  it('clamps input values', () => {
    expect(clamp(-5, 0, 100)).toBe(0);
    expect(clamp(120, 0, 100)).toBe(100);
    expect(clamp(42, 0, 100)).toBe(42);
  });

  it('normalizes and clamps viewport coordinates', () => {
    expect(
      normalizeViewportPoint({ clientX: 200, clientY: 400 }, { width: 400, height: 800 }),
    ).toEqual({ clientX: 200, clientY: 400, xPercent: 50, yPercent: 50 });

    expect(
      normalizeViewportPoint({ clientX: -10, clientY: 900 }, { width: 400, height: 800 }),
    ).toEqual({ clientX: 0, clientY: 800, xPercent: 0, yPercent: 100 });
  });

  it('keeps the core neutral when interaction is inactive', () => {
    expect(calculateCoreTarget({ xPercent: 100, yPercent: 0 }, false)).toEqual({
      panX: 0,
      panY: 0,
      rotateX: 0,
      rotateY: 0,
    });
  });

  it('maps pointer position to bounded core targets', () => {
    expect(calculateCoreTarget({ xPercent: 100, yPercent: 0 }, true)).toEqual({
      panX: 1.35,
      panY: -1.05,
      rotateX: 4,
      rotateY: 6,
    });
  });

  it('advances the spring and damps its velocity', () => {
    const next = advanceCorePose(
      { ...restingPose, velocityX: 0.1, velocityY: -0.1 },
      { panX: 1, panY: 1, rotateX: 2, rotateY: 2 },
    );

    expect(next).toEqual({
      panX: 0.2,
      panY: 0,
      rotateX: 0.24,
      rotateY: 0.24,
      velocityX: 0.082,
      velocityY: -0.082,
    });
  });

  it('detects a resting core and formats telemetry', () => {
    expect(isCoreSettled(restingPose, { panX: 0, panY: 0, rotateX: 0, rotateY: 0 })).toBe(true);
    expect(
      formatCoordinateLabel(
        normalizeViewportPoint({ clientX: 25, clientY: 75 }, { width: 100, height: 100 }),
      ),
    ).toBe('X 25 / Y 75');
  });
});
