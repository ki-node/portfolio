import {
  advanceCorePose,
  calculateCoreTarget,
  formatCoordinateLabel,
  isCoreSettled,
  normalizeViewportPoint,
  type CorePose,
  type NormalizedPoint,
  type ViewportPoint,
  type ViewportSize,
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

type InputSource = 'pointer' | 'touch';
type DiagnosticSource = InputSource | 'viewport';

export interface ReticleDiagnostic {
  readonly eventType: string;
  readonly source: DiagnosticSource;
  readonly clientX: number | null;
  readonly clientY: number | null;
  readonly innerWidth: number;
  readonly innerHeight: number;
  readonly visualViewportWidth: number | null;
  readonly visualViewportHeight: number | null;
  readonly reticleX: number | null;
  readonly reticleY: number | null;
}

interface TouchPointerSequence {
  readonly pointerId: number;
  lastEventAt: number;
  lastMoveAt: number | undefined;
  point: ViewportPoint;
}

const POINTER_FRESHNESS_MS = 160;
const DUPLICATE_DISTANCE_PX = 4;

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
  private touchPointerSequence: TouchPointerSequence | undefined;
  private touchOwnsSequence = false;

  constructor(
    private readonly reportInputSource?: (source: InputSource) => void,
    private readonly reportDiagnostic?: (diagnostic: ReticleDiagnostic) => void,
  ) {}

  init() {
    if (!this.core) {
      return;
    }

    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.state = undefined;
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const supportsPointerEvents =
      typeof (window as Window & { PointerEvent?: typeof PointerEvent }).PointerEvent ===
      'function';

    if (supportsPointerEvents) {
      document.addEventListener('pointermove', this.handlePointerMove, {
        capture: true,
        passive: true,
        signal,
      });
      document.addEventListener('pointerdown', this.handlePointerDown, {
        capture: true,
        passive: true,
        signal,
      });
      document.addEventListener('pointerup', this.handlePointerEnd, {
        capture: true,
        passive: true,
        signal,
      });
      document.addEventListener('pointercancel', this.handlePointerEnd, {
        capture: true,
        passive: true,
        signal,
      });
    }

    // WKWebView can expose PointerEvent while still emitting touch-only sequences.
    document.addEventListener('touchstart', this.updateTouchTarget, {
      capture: true,
      passive: true,
      signal,
    });
    document.addEventListener('touchmove', this.updateTouchTarget, {
      capture: true,
      passive: true,
      signal,
    });
    document.addEventListener('touchend', this.handleTouchEnd, {
      capture: true,
      passive: true,
      signal,
    });
    document.addEventListener('touchcancel', this.handleTouchEnd, {
      capture: true,
      passive: true,
      signal,
    });
    window.addEventListener('pageshow', this.handleViewportEvent, { passive: true, signal });
    window.addEventListener('resize', this.handleViewportEvent, { passive: true, signal });
    window.visualViewport?.addEventListener('resize', this.handleViewportEvent, {
      passive: true,
      signal,
    });
    this.refreshViewport('init');
  }

  destroy() {
    this.abortController?.abort();
    this.abortController = undefined;
    this.resetInputTracking();
    window.clearTimeout(this.pulseTimer);
    this.core?.classList.remove('is-energized');

    if (this.state?.frame !== null && this.state?.frame !== undefined) {
      window.cancelAnimationFrame(this.state.frame);
    }
    this.state = undefined;
  }

  requestRender = () => {
    if (!this.state) {
      this.refreshViewport('render-request');
      return;
    }

    this.state.frame ??= window.requestAnimationFrame(this.renderFrame);
  };

  pulse = () => {
    if (!this.core || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    this.core.classList.add('is-energized');
    window.clearTimeout(this.pulseTimer);
    this.pulseTimer = window.setTimeout(() => this.core?.classList.remove('is-energized'), 620);
  };

  resetInputTracking = () => {
    this.touchPointerSequence = undefined;
    this.touchOwnsSequence = false;
  };

  refreshViewport = (eventType = 'manual') => {
    const viewport = this.readValidViewport();

    if (!viewport) {
      this.emitDiagnostic(eventType, 'viewport', null, null);
      return;
    }

    if (!this.state) {
      this.state = this.createInitialState(viewport);
    } else {
      const target = normalizeViewportPoint(
        { clientX: this.state.targetX, clientY: this.state.targetY },
        viewport,
      );
      const current = normalizeViewportPoint(
        { clientX: this.state.currentX, clientY: this.state.currentY },
        viewport,
      );

      this.state.targetX = target.clientX;
      this.state.targetY = target.clientY;
      this.state.currentX = current.clientX;
      this.state.currentY = current.clientY;
      this.state.normalizedPoint = current;
    }

    this.emitDiagnostic(
      eventType,
      'viewport',
      { clientX: this.state.targetX, clientY: this.state.targetY },
      this.state.normalizedPoint,
    );
    this.requestRender();
  };

  prepareForCodeMode = () => this.refreshViewport('code-mode');

  private createInitialState(viewport: ViewportSize): MotionState {
    const center = { clientX: viewport.width / 2, clientY: viewport.height / 2 };

    return {
      targetX: center.clientX,
      targetY: center.clientY,
      currentX: center.clientX,
      currentY: center.clientY,
      pose: { panX: 0, panY: 0, rotateX: 0, rotateY: 0, velocityX: 0, velocityY: 0 },
      normalizedPoint: normalizeViewportPoint(center, viewport),
      frame: null,
      lastLabelUpdate: 0,
    };
  }

  private readonly renderFrame = (timestamp: number) => {
    const state = this.state;
    const viewport = this.readValidViewport();

    if (!state || !this.core || !viewport) {
      if (state) {
        state.frame = null;
      }
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
      viewport,
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

  private readonly setTarget = (point: ViewportPoint, source: InputSource, eventType: string) => {
    const viewport = this.readValidViewport();

    if (!viewport || !Number.isFinite(point.clientX) || !Number.isFinite(point.clientY)) {
      this.emitDiagnostic(eventType, source, point, null);
      return;
    }

    this.state ??= this.createInitialState(viewport);
    const normalizedPoint = normalizeViewportPoint(point, viewport);

    this.state.targetX = normalizedPoint.clientX;
    this.state.targetY = normalizedPoint.clientY;
    this.reportInputSource?.(source);
    this.emitDiagnostic(eventType, source, point, normalizedPoint);
    this.requestRender();
  };

  private readonly handlePointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'touch') {
      if (this.touchOwnsSequence) {
        return;
      }

      this.touchPointerSequence = {
        pointerId: event.pointerId,
        lastEventAt: event.timeStamp,
        lastMoveAt: undefined,
        point: event,
      };
    }

    this.setTarget(event, 'pointer', event.type);
    this.nudgeCore(event);

    if (document.documentElement.classList.contains('is-past-hero')) {
      this.pulse();
    }
  };

  private readonly handlePointerMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch') {
      if (this.touchOwnsSequence) {
        return;
      }

      if (this.touchPointerSequence?.pointerId === event.pointerId) {
        this.touchPointerSequence.lastEventAt = event.timeStamp;
        this.touchPointerSequence.lastMoveAt = event.timeStamp;
        this.touchPointerSequence.point = event;
      } else {
        this.touchPointerSequence = {
          pointerId: event.pointerId,
          lastEventAt: event.timeStamp,
          lastMoveAt: event.timeStamp,
          point: event,
        };
      }
    }

    this.setTarget(event, 'pointer', event.type);
  };

  private readonly handlePointerEnd = (event: PointerEvent) => {
    if (event.pointerType === 'touch' && this.touchPointerSequence?.pointerId === event.pointerId) {
      this.touchPointerSequence = undefined;
    }
  };

  private readonly updateTouchTarget = (event: TouchEvent) => {
    const touch = event.touches[0];

    if (!touch) {
      return;
    }

    const pointerSequence = this.touchPointerSequence;
    const relevantPointerTime =
      event.type === 'touchmove' ? pointerSequence?.lastMoveAt : pointerSequence?.lastEventAt;
    const pointerIsFresh =
      relevantPointerTime !== undefined &&
      Math.abs(event.timeStamp - relevantPointerTime) <= POINTER_FRESHNESS_MS;
    const matchesPointer =
      pointerSequence !== undefined &&
      Math.hypot(
        pointerSequence.point.clientX - touch.clientX,
        pointerSequence.point.clientY - touch.clientY,
      ) <= DUPLICATE_DISTANCE_PX;

    if (!this.touchOwnsSequence && pointerIsFresh && matchesPointer) {
      return;
    }

    this.touchOwnsSequence = true;
    this.setTarget(touch, 'touch', event.type);
  };

  private readonly handleTouchEnd = () => {
    this.resetInputTracking();
  };

  private readonly handleViewportEvent = (event: Event) => {
    this.refreshViewport(event.type);
  };

  private readValidViewport(): ViewportSize | undefined {
    const innerWidth = window.innerWidth;
    const innerHeight = window.innerHeight;

    if (
      Number.isFinite(innerWidth) &&
      Number.isFinite(innerHeight) &&
      innerWidth > 0 &&
      innerHeight > 0
    ) {
      return { width: innerWidth, height: innerHeight };
    }

    const visualWidth = window.visualViewport?.width;
    const visualHeight = window.visualViewport?.height;

    if (
      visualWidth !== undefined &&
      visualHeight !== undefined &&
      Number.isFinite(visualWidth) &&
      Number.isFinite(visualHeight) &&
      visualWidth > 0 &&
      visualHeight > 0
    ) {
      return { width: visualWidth, height: visualHeight };
    }

    return undefined;
  }

  private emitDiagnostic(
    eventType: string,
    source: DiagnosticSource,
    point: ViewportPoint | null,
    calculated: Pick<NormalizedPoint, 'clientX' | 'clientY'> | null,
  ) {
    this.reportDiagnostic?.({
      eventType,
      source,
      clientX: point && Number.isFinite(point.clientX) ? point.clientX : null,
      clientY: point && Number.isFinite(point.clientY) ? point.clientY : null,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      visualViewportWidth: window.visualViewport?.width ?? null,
      visualViewportHeight: window.visualViewport?.height ?? null,
      reticleX: calculated?.clientX ?? null,
      reticleY: calculated?.clientY ?? null,
    });
  }

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
