// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CurrentYearController } from './current-year-controller';
import { NavigationController } from './navigation-controller';
import { PageProgressController } from './page-progress-controller';
import { PointerEffectsController } from './pointer-effects-controller';
import { SystemCoreController } from './system-core-controller';
import { ViewModeController } from './view-mode-controller';
import { ViewportObserversController } from './viewport-observers-controller';

class IntersectionObserverMock implements IntersectionObserver {
  static instances: IntersectionObserverMock[] = [];

  readonly root = null;
  readonly rootMargin: string;
  readonly scrollMargin: string;
  readonly thresholds: readonly number[];
  readonly observedElements = new Set<Element>();
  disconnected = false;

  constructor(
    private readonly callback: IntersectionObserverCallback,
    options: IntersectionObserverInit = {},
  ) {
    this.rootMargin = options.rootMargin ?? '0px';
    this.scrollMargin = options.scrollMargin ?? '0px';
    this.thresholds = Array.isArray(options.threshold)
      ? options.threshold
      : [options.threshold ?? 0];
    IntersectionObserverMock.instances.push(this);
  }

  observe(target: Element) {
    this.observedElements.add(target);
  }

  unobserve(target: Element) {
    this.observedElements.delete(target);
  }

  disconnect() {
    this.disconnected = true;
    this.observedElements.clear();
  }

  takeRecords() {
    return [];
  }

  /** Emits one deterministic intersection entry for the supplied target. */
  emit(target: Element, isIntersecting: boolean, intersectionRatio = 1) {
    const bounds = target.getBoundingClientRect();
    const entry = {
      boundingClientRect: bounds,
      intersectionRatio,
      intersectionRect: bounds,
      isIntersecting,
      rootBounds: null,
      target,
      time: 0,
    } satisfies IntersectionObserverEntry;

    this.callback([entry], this);
  }
}

let frameCallbacks: Map<number, FrameRequestCallback>;
let nextFrameId: number;

/** Runs every currently queued animation frame exactly once. */
const flushAnimationFrames = (timestamp = 100) => {
  const callbacks = [...frameCallbacks.values()];
  frameCallbacks.clear();
  callbacks.forEach((callback) => callback(timestamp));
};

/** Creates a complete MediaQueryList stub for controller capability checks. */
const createMediaQueryList = (query: string): MediaQueryList => ({
  matches:
    query === '(hover: hover) and (pointer: fine)'
      ? true
      : query === '(prefers-reduced-motion: reduce)'
        ? false
        : false,
  media: query,
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(() => true),
});

const createTouchPointerEvent = (
  type: string,
  init: MouseEventInit & { pointerId?: number } = {},
) => {
  const event = new MouseEvent(type, init) as PointerEvent;
  Object.defineProperties(event, {
    pointerId: { value: init.pointerId ?? 7 },
    pointerType: { value: 'touch' },
  });
  return event;
};

const createTouchEvent = (type: string, clientX: number, clientY: number) =>
  new TouchEvent(type, {
    touches: type === 'touchend' || type === 'touchcancel' ? [] : [{ clientX, clientY } as Touch],
  });

beforeEach(() => {
  document.body.replaceChildren();
  document.body.className = '';
  document.body.removeAttribute('style');
  document.documentElement.className = '';
  document.documentElement.removeAttribute('data-view');
  document.documentElement.removeAttribute('style');
  IntersectionObserverMock.instances = [];
  vi.useFakeTimers();

  frameCallbacks = new Map();
  nextFrameId = 1;

  Object.defineProperty(window, 'IntersectionObserver', {
    configurable: true,
    value: IntersectionObserverMock,
  });
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    configurable: true,
    value: IntersectionObserverMock,
  });
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(createMediaQueryList),
  });
  Object.defineProperty(window, 'PointerEvent', {
    configurable: true,
    value: MouseEvent,
  });
  Object.defineProperty(window, 'requestAnimationFrame', {
    configurable: true,
    value: vi.fn((callback: FrameRequestCallback) => {
      const id = nextFrameId;
      nextFrameId += 1;
      frameCallbacks.set(id, callback);
      return id;
    }),
  });
  Object.defineProperty(window, 'cancelAnimationFrame', {
    configurable: true,
    value: vi.fn((id: number) => frameCallbacks.delete(id)),
  });
  Object.defineProperty(window, 'scrollX', { configurable: true, value: 0 });
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('CurrentYearController', () => {
  it('writes the current year without retaining lifecycle state', () => {
    document.body.innerHTML = '<span data-year></span>';
    const controller = new CurrentYearController();

    controller.init();
    controller.destroy();

    expect(document.querySelector('[data-year]')?.textContent).toBe(
      new Date().getFullYear().toString(),
    );
  });
});

describe('NavigationController', () => {
  it('locks both scroll roots and restores the exact position on destroy', () => {
    document.body.innerHTML = `
      <header data-header>
        <button data-menu-button aria-expanded="false"><span data-menu-label>Menü öffnen</span></button>
        <nav data-navigation>
          <a href="#arbeit" data-nav-section="arbeit">Arbeit</a>
          <a href="#profil" data-nav-section="profil">Profil</a>
        </nav>
      </header>
      <main><section id="arbeit"></section><section id="profil"></section></main>
      <footer></footer>
    `;
    const controller = new NavigationController();
    const button = document.querySelector<HTMLButtonElement>('[data-menu-button]');
    const main = document.querySelector<HTMLElement>('main');
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    Object.defineProperty(window, 'scrollX', { configurable: true, value: 12 });
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 640 });

    controller.init();
    button?.click();
    flushAnimationFrames();

    expect(button?.getAttribute('aria-expanded')).toBe('true');
    expect(main?.inert).toBe(true);
    expect(document.documentElement.classList.contains('is-menu-open')).toBe(true);
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(document.body.style.position).toBe('fixed');
    expect(document.body.style.inset).toBe('-640px 0 auto -12px');
    expect(IntersectionObserverMock.instances).toHaveLength(1);

    controller.destroy();

    expect(button?.getAttribute('aria-expanded')).toBe('false');
    expect(main?.inert).toBe(false);
    expect(document.documentElement.classList.contains('is-menu-open')).toBe(false);
    expect(document.documentElement.style.overflow).toBe('');
    expect(document.body.style.position).toBe('');
    expect(scrollTo).toHaveBeenCalledWith({ left: 12, top: 640, behavior: 'auto' });
    expect(IntersectionObserverMock.instances[0]?.disconnected).toBe(true);

    button?.click();
    expect(button?.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('ViewModeController', () => {
  it('clears its transition timer and ignores input after destroy', () => {
    document.body.innerHTML = `
      <button data-mode="design" aria-pressed="true">Design</button>
      <button data-mode="code" aria-pressed="false">Code</button>
      <p data-mode-status></p>
    `;
    const pulseCore = vi.fn();
    const resetInputTracking = vi.fn();
    const controller = new ViewModeController(pulseCore, resetInputTracking);
    const codeButton = document.querySelector<HTMLButtonElement>('[data-mode="code"]');
    const designButton = document.querySelector<HTMLButtonElement>('[data-mode="design"]');

    controller.init();
    codeButton?.click();

    expect(document.documentElement.classList.contains('is-code-mode')).toBe(true);
    expect(document.documentElement.classList.contains('is-mode-transitioning')).toBe(true);
    expect(codeButton?.getAttribute('aria-pressed')).toBe('true');
    expect(pulseCore).toHaveBeenCalledOnce();

    designButton?.click();
    expect(resetInputTracking).toHaveBeenCalledOnce();
    codeButton?.click();

    controller.destroy();
    vi.runAllTimers();

    expect(document.documentElement.classList.contains('is-mode-transitioning')).toBe(false);
    designButton?.click();
    expect(document.documentElement.classList.contains('is-code-mode')).toBe(true);
  });
});

describe('PageProgressController', () => {
  it('updates progress in one frame and cancels queued work on destroy', () => {
    document.body.innerHTML = '<span data-hud-scroll></span>';
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 2_000,
    });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1_000 });
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 700 });
    const requestCoreRender = vi.fn();
    const controller = new PageProgressController(requestCoreRender);

    controller.init();

    expect(document.documentElement.style.getPropertyValue('--page-progress')).toBe('0.7000');
    expect(document.documentElement.classList.contains('is-past-hero')).toBe(true);
    expect(requestCoreRender).toHaveBeenCalledOnce();

    window.dispatchEvent(new Event('scroll'));
    expect(frameCallbacks).toHaveLength(1);

    controller.destroy();
    expect(frameCallbacks).toHaveLength(0);

    window.dispatchEvent(new Event('scroll'));
    expect(frameCallbacks).toHaveLength(0);
  });
});

describe('PointerEffectsController', () => {
  it('removes pointer listeners and inline lighting coordinates on destroy', () => {
    document.body.innerHTML = '<article class="project-card"></article>';
    const card = document.querySelector<HTMLElement>('.project-card');
    vi.spyOn(card as HTMLElement, 'getBoundingClientRect').mockReturnValue({
      bottom: 120,
      height: 100,
      left: 10,
      right: 210,
      top: 20,
      width: 200,
      x: 10,
      y: 20,
      toJSON: () => ({}),
    });
    const controller = new PointerEffectsController();

    controller.init();
    card?.dispatchEvent(new MouseEvent('pointermove', { clientX: 110, clientY: 70 }));

    expect(card?.style.getPropertyValue('--pointer-x')).toBe('50.00%');
    expect(card?.style.getPropertyValue('--pointer-y')).toBe('50.00%');

    controller.destroy();
    expect(card?.style.getPropertyValue('--pointer-x')).toBe('');

    card?.dispatchEvent(new MouseEvent('pointermove', { clientX: 210, clientY: 120 }));
    expect(card?.style.getPropertyValue('--pointer-x')).toBe('');
  });
});

describe('ViewportObserversController', () => {
  it('unobserves revealed elements and disconnects every owned observer', () => {
    document.body.innerHTML = `
      <div class="reveal"></div>
      <article class="project-card"></article>
    `;
    const reveal = document.querySelector<HTMLElement>('.reveal');
    const card = document.querySelector<HTMLElement>('.project-card');
    const controller = new ViewportObserversController();

    controller.init();
    expect(IntersectionObserverMock.instances).toHaveLength(2);

    if (reveal && card) {
      IntersectionObserverMock.instances[0]?.emit(reveal, true);
      IntersectionObserverMock.instances[1]?.emit(card, true);
    }

    expect(reveal?.classList.contains('is-visible')).toBe(true);
    expect(card?.classList.contains('is-in-view')).toBe(true);
    expect(IntersectionObserverMock.instances[0]?.observedElements.has(reveal as Element)).toBe(
      false,
    );

    controller.destroy();
    expect(IntersectionObserverMock.instances.every((observer) => observer.disconnected)).toBe(
      true,
    );
  });
});

describe('SystemCoreController', () => {
  const renderSystemCore = () => {
    document.body.innerHTML = `
      <div data-system-core><span data-core-coordinates></span></div>
      <div data-code-reticle></div>
      <output data-hud-coordinates></output>
    `;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 700 });
  };

  it('prefers a current complete pointer sequence and deduplicates matching touch events', () => {
    renderSystemCore();
    const reticle = document.querySelector<HTMLElement>('[data-code-reticle]');
    const inputSource = vi.fn();
    const controller = new SystemCoreController(inputSource);

    controller.init();
    window.dispatchEvent(createTouchPointerEvent('pointerdown', { clientX: 72, clientY: 144 }));
    window.dispatchEvent(createTouchEvent('touchstart', 72, 144));
    flushAnimationFrames();
    expect(reticle?.style.transform).toContain('translate3d(72.00px, 144.00px');

    window.dispatchEvent(createTouchPointerEvent('pointermove', { clientX: 180, clientY: 260 }));
    window.dispatchEvent(createTouchEvent('touchmove', 180, 260));
    flushAnimationFrames();
    expect(reticle?.style.transform).toContain('translate3d(180.00px, 260.00px');
    expect(inputSource).toHaveBeenLastCalledWith('pointer');

    window.dispatchEvent(createTouchPointerEvent('pointerup'));
    window.dispatchEvent(createTouchEvent('touchend', 0, 0));
    controller.destroy();
  });

  it('hands an incomplete pointer sequence over to touch movement automatically', () => {
    renderSystemCore();
    const reticle = document.querySelector<HTMLElement>('[data-code-reticle]');
    const inputSource = vi.fn();
    const controller = new SystemCoreController(inputSource);

    controller.init();
    window.dispatchEvent(createTouchPointerEvent('pointerdown', { clientX: 72, clientY: 144 }));
    window.dispatchEvent(createTouchEvent('touchstart', 72, 144));
    window.dispatchEvent(createTouchEvent('touchmove', 205, 315));
    flushAnimationFrames();

    expect(reticle?.style.transform).toContain('translate3d(205.00px, 315.00px');
    expect(inputSource).toHaveBeenLastCalledWith('touch');

    window.dispatchEvent(createTouchPointerEvent('pointermove', { clientX: 250, clientY: 350 }));
    flushAnimationFrames();
    expect(reticle?.style.transform).toContain('translate3d(205.00px, 315.00px');

    window.dispatchEvent(createTouchEvent('touchend', 0, 0));
    window.dispatchEvent(createTouchPointerEvent('pointerdown', { clientX: 120, clientY: 220 }));
    flushAnimationFrames();
    expect(reticle?.style.transform).toContain('translate3d(120.00px, 220.00px');
    expect(inputSource).toHaveBeenLastCalledWith('pointer');
    controller.destroy();
  });

  it('accepts touch-only input even when the PointerEvent API is present', () => {
    renderSystemCore();
    const reticle = document.querySelector<HTMLElement>('[data-code-reticle]');
    const inputSource = vi.fn();
    const controller = new SystemCoreController(inputSource);

    controller.init();
    window.dispatchEvent(createTouchEvent('touchstart', 90, 180));
    window.dispatchEvent(createTouchEvent('touchmove', 195, 305));
    flushAnimationFrames();

    expect(reticle?.style.transform).toContain('translate3d(195.00px, 305.00px');
    expect(inputSource).toHaveBeenLastCalledWith('touch');

    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(createTouchEvent('touchend', 0, 0));
    window.dispatchEvent(createTouchEvent('touchstart', 44, 88));
    flushAnimationFrames();
    expect(reticle?.style.transform).toContain('translate3d(44.00px, 88.00px');
    controller.destroy();
  });

  it('resets arbitration on mode changes and removes every listener on destroy', () => {
    renderSystemCore();
    const inputSource = vi.fn();
    const controller = new SystemCoreController(inputSource);

    controller.init();
    window.dispatchEvent(createTouchPointerEvent('pointerdown', { clientX: 72, clientY: 144 }));
    window.dispatchEvent(createTouchEvent('touchmove', 205, 315));
    controller.resetInputTracking();
    window.dispatchEvent(createTouchPointerEvent('pointermove', { clientX: 180, clientY: 260 }));
    flushAnimationFrames();
    expect(inputSource).toHaveBeenLastCalledWith('pointer');

    controller.destroy();
    inputSource.mockClear();
    window.dispatchEvent(createTouchEvent('touchstart', 100, 100));
    expect(inputSource).not.toHaveBeenCalled();

    controller.init();
    window.dispatchEvent(createTouchEvent('touchstart', 110, 210));
    flushAnimationFrames();
    expect(inputSource).toHaveBeenLastCalledWith('touch');
    controller.destroy();
  });

  it('cancels frames, timers and input listeners while clearing transient state', () => {
    renderSystemCore();
    const core = document.querySelector<HTMLElement>('[data-system-core]');
    const controller = new SystemCoreController();

    controller.init();
    controller.pulse();
    controller.requestRender();

    expect(core?.classList.contains('is-energized')).toBe(true);
    expect(frameCallbacks).toHaveLength(1);

    controller.destroy();
    expect(core?.classList.contains('is-energized')).toBe(false);
    expect(frameCallbacks).toHaveLength(0);

    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 100, clientY: 100 }));
    vi.runAllTimers();
    expect(frameCallbacks).toHaveLength(0);
  });
});
