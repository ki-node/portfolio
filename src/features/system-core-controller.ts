import {
  advanceCorePose,
  calculateCoreTarget,
  formatCoordinateLabel,
  isCoreSettled,
  normalizeViewportPoint,
  type CorePose,
  type NormalizedPoint,
  type ViewportPoint,
} from '../motion/core-motion';
import type { Controller } from './controller';

interface MotionState {
  targetX: number;
  targetY: number;
  currentX: number;
  currentY: number;
  pose: CorePose;
  normalizedPoint: NormalizedPoint;
  frame: number | null;
  lastLabelUpdate: number;
}

/** Owns touch/pointer tracking, the X-Ray reticle and the floating system core. */
export class SystemCoreController implements Controller {
  private readonly core = document.querySelector<HTMLElement>('[data-system-core]');
  private readonly coreCoordinates = document.querySelector<HTMLElement>('[data-core-coordinates]');
  private readonly codeReticle = document.querySelector<HTMLElement>('[data-code-reticle]');
  private readonly hudCoordinates = document.querySelector<HTMLElement>('[data-hud-coordinates]');
  private abortController: AbortController | undefined;
  private pulseTimer: number | undefined;
  private state: MotionState | undefined;
  private prefersReducedMotion = false;

  init() {
    if (!this.core) {
      return;
    }

    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.state = this.createInitialState();
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const supportsPointerEvents =
      typeof (window as Window & { PointerEvent?: typeof PointerEvent }).PointerEvent ===
      'function';

    if (supportsPointerEvents) {
      window.addEventListener('pointermove', this.handlePointerMove, { passive: true, signal });
      window.addEventListener('pointerdown', this.handlePointerDown, { passive: true, signal });
    } else {
      window.addEventListener('touchstart', this.updateTouchTarget, { passive: true, signal });
      window.addEventListener('touchmove', this.updateTouchTarget, { passive: true, signal });
    }
  }

  destroy() {
    this.abortController?.abort();
    this.abortController = undefined;
    window.clearTimeout(this.pulseTimer);
    this.core?.classList.remove('is-energized');

    if (this.state?.frame !== null && this.state?.frame !== undefined) {
      window.cancelAnimationFrame(this.state.frame);
      this.state.frame = null;
    }
  }

  requestRender = () => {
    if (this.state) {
      this.state.frame ??= window.requestAnimationFrame(this.renderFrame);
    }
  };

  pulse = () => {
    if (!this.core || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    this.core.classList.add('is-energized');
    window.clearTimeout(this.pulseTimer);
    this.pulseTimer = window.setTimeout(() => this.core?.classList.remove('is-energized'), 620);
  };

  private createInitialState(): MotionState {
    const center = { clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 };

    return {
      targetX: center.clientX,
      targetY: center.clientY,
      currentX: center.clientX,
      currentY: center.clientY,
      pose: { panX: 0, panY: 0, rotateX: 0, rotateY: 0, velocityX: 0, velocityY: 0 },
      normalizedPoint: normalizeViewportPoint(center, {
        width: window.innerWidth,
        height: window.innerHeight,
      }),
      frame: null,
      lastLabelUpdate: 0,
    };
  }

  private readonly renderFrame = (timestamp: number) => {
    const state = this.state;

    if (!state || !this.core) {
      return;
    }

    state.currentX = state.targetX;
    state.currentY = state.targetY;
    this.codeReticle?.style.setProperty(
      'transform',
      `translate3d(${state.currentX.toFixed(2)}px, ${state.currentY.toFixed(2)}px, 0) translate(-50%, -50%)`,
    );

    state.normalizedPoint = normalizeViewportPoint(
      { clientX: state.currentX, clientY: state.currentY },
      { width: window.innerWidth, height: window.innerHeight },
    );
    const isPastHero = document.documentElement.classList.contains('is-past-hero');
    const target = calculateCoreTarget(
      state.normalizedPoint,
      isPastHero && !this.prefersReducedMotion,
    );

    state.pose = advanceCorePose(state.pose, target);
    this.core.style.setProperty('--core-pan-x', `${state.pose.panX.toFixed(3)}rem`);
    this.core.style.setProperty('--core-pan-y', `${state.pose.panY.toFixed(3)}rem`);
    this.core.style.setProperty('--core-x', `${state.pose.rotateX.toFixed(3)}deg`);
    this.core.style.setProperty('--core-y', `${state.pose.rotateY.toFixed(3)}deg`);

    if (timestamp - state.lastLabelUpdate > 80) {
      const label = formatCoordinateLabel(state.normalizedPoint);

      this.coreCoordinates?.replaceChildren(label);
      this.hudCoordinates?.replaceChildren(label);
      state.lastLabelUpdate = timestamp;
    }

    const pointerSettled =
      Math.abs(state.targetX - state.currentX) < 0.2 &&
      Math.abs(state.targetY - state.currentY) < 0.2;

    if (!pointerSettled || !isCoreSettled(state.pose, target)) {
      state.frame = window.requestAnimationFrame(this.renderFrame);
    } else {
      state.frame = null;
    }
  };

  private readonly setTarget = (point: ViewportPoint) => {
    if (!this.state) {
      return;
    }

    const normalizedPoint = normalizeViewportPoint(point, {
      width: window.innerWidth,
      height: window.innerHeight,
    });

    this.state.targetX = normalizedPoint.clientX;
    this.state.targetY = normalizedPoint.clientY;
    this.requestRender();
  };

  private readonly handlePointerDown = (event: PointerEvent) => {
    this.setTarget(event);
    this.nudgeCore(event);

    if (document.documentElement.classList.contains('is-past-hero')) {
      this.pulse();
    }
  };

  private readonly handlePointerMove = (event: PointerEvent) => {
    this.setTarget(event);
  };

  private readonly updateTouchTarget = (event: TouchEvent) => {
    const touch = event.touches[0];

    if (touch) {
      this.setTarget(touch);
    }
  };

  private nudgeCore(point: ViewportPoint) {
    if (
      !this.state ||
      !this.core ||
      this.prefersReducedMotion ||
      !document.documentElement.classList.contains('is-past-hero')
    ) {
      return;
    }

    const bounds = this.core.getBoundingClientRect();
    const deltaX = bounds.left + bounds.width / 2 - point.clientX;
    const deltaY = bounds.top + bounds.height / 2 - point.clientY;
    const distance = Math.max(1, Math.hypot(deltaX, deltaY));

    this.state.pose.velocityX += (deltaX / distance) * 0.075;
    this.state.pose.velocityY += (deltaY / distance) * 0.055;
    this.requestRender();
  }
}
