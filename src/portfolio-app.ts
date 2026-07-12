import {
  advanceCorePose,
  calculateCoreTarget,
  formatCoordinateLabel,
  isCoreSettled,
  normalizeViewportPoint,
  type CorePose,
  type NormalizedPoint,
  type ViewportPoint,
} from './motion/core-motion';

/**
 * Controls navigation, header state and viewport reveal animations.
 */

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

export class PortfolioApp {
  private readonly header: HTMLElement | null;
  private readonly menuButton: HTMLButtonElement | null;
  private readonly menuLabel: HTMLElement | null;
  private readonly navigation: HTMLElement | null;
  private readonly navigationLinks: NodeListOf<HTMLAnchorElement>;
  private readonly pageContent: NodeListOf<HTMLElement>;
  private readonly revealElements: NodeListOf<HTMLElement>;
  private readonly modeButtons: NodeListOf<HTMLButtonElement>;
  private readonly modeStatus: HTMLElement | null;
  private readonly projectCards: NodeListOf<HTMLElement>;
  private readonly systemCore: HTMLElement | null;
  private readonly coreCoordinates: HTMLElement | null;
  private readonly codeReticle: HTMLElement | null;
  private readonly hudCoordinates: HTMLElement | null;
  private readonly hudScroll: HTMLElement | null;
  private scrollFrame: number | null;
  private modeTransitionTimer: number | undefined;
  private corePulseTimer: number | undefined;
  private requestCoreRender: (() => void) | undefined;
  private stopCoreRender: (() => void) | undefined;
  private readonly abortController = new AbortController();
  private readonly observers: IntersectionObserver[] = [];

  /**
   * Creates the application and caches interactive elements.
   */
  constructor() {
    this.header = document.querySelector<HTMLElement>('[data-header]');
    this.menuButton = document.querySelector<HTMLButtonElement>('[data-menu-button]');
    this.menuLabel = document.querySelector<HTMLElement>('[data-menu-label]');
    this.navigation = document.querySelector<HTMLElement>('[data-navigation]');
    this.navigationLinks = document.querySelectorAll<HTMLAnchorElement>('[data-nav-section]');
    this.pageContent = document.querySelectorAll<HTMLElement>('main, footer');
    this.revealElements = document.querySelectorAll<HTMLElement>('.reveal');
    this.modeButtons = document.querySelectorAll<HTMLButtonElement>('[data-mode]');
    this.modeStatus = document.querySelector<HTMLElement>('[data-mode-status]');
    this.projectCards = document.querySelectorAll<HTMLElement>('.project-card');
    this.systemCore = document.querySelector<HTMLElement>('[data-system-core]');
    this.coreCoordinates = document.querySelector<HTMLElement>('[data-core-coordinates]');
    this.codeReticle = document.querySelector<HTMLElement>('[data-code-reticle]');
    this.hudCoordinates = document.querySelector<HTMLElement>('[data-hud-coordinates]');
    this.hudScroll = document.querySelector<HTMLElement>('[data-hud-scroll]');
    this.scrollFrame = null;
    this.modeTransitionTimer = undefined;
    this.corePulseTimer = undefined;
    this.requestCoreRender = undefined;
    this.stopCoreRender = undefined;
  }

  /**
   * Initializes all available interface features.
   *
   * @returns {void}
   */
  init() {
    this.setCurrentYear();
    this.bindMenu();
    this.bindHeader();
    this.bindModeSwitch();
    this.bindPageProgress();
    this.bindPointerEffects();
    this.bindSystemCore();
    this.observeNavigationSections();
    this.observeRevealElements();
    this.observeProjectCards();
  }

  /** Releases listeners, observers, timers and queued animation frames. */
  destroy() {
    this.abortController.abort();
    this.observers.forEach((observer) => observer.disconnect());
    window.clearTimeout(this.modeTransitionTimer);
    window.clearTimeout(this.corePulseTimer);
    this.stopCoreRender?.();

    if (this.scrollFrame !== null) {
      window.cancelAnimationFrame(this.scrollFrame);
    }
  }

  /**
   * Writes the current year into the footer.
   *
   * @returns {void}
   */
  setCurrentYear() {
    const year = document.querySelector('[data-year]');

    if (!year) {
      return;
    }

    year.textContent = new Date().getFullYear().toString();
  }

  /**
   * Connects the mobile navigation controls.
   *
   * @returns {void}
   */
  bindMenu() {
    if (!this.menuButton || !this.navigation) {
      return;
    }

    const signal = this.abortController.signal;

    this.menuButton.addEventListener('click', () => this.toggleMenu(), { signal });

    this.navigation.addEventListener(
      'click',
      (event) => {
        if (event.target instanceof HTMLAnchorElement) {
          this.closeMenu(false);
          this.focusNavigationTarget(event.target.hash);
          return;
        }

        const link = event.target instanceof Element ? event.target.closest('a') : null;

        if (link instanceof HTMLAnchorElement) {
          this.closeMenu(false);
          this.focusNavigationTarget(link.hash);
        }
      },
      { signal },
    );

    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape') {
          this.closeMenu(true);
        }
      },
      { signal },
    );

    window.addEventListener(
      'resize',
      () => {
        if (window.matchMedia('(min-width: 50.0625rem)').matches) {
          this.closeMenu(false);
        }
      },
      { passive: true, signal },
    );
  }

  /**
   * Toggles the mobile navigation state.
   *
   * @returns {void}
   */
  toggleMenu() {
    const isOpen = this.menuButton?.getAttribute('aria-expanded') === 'true';

    if (isOpen) {
      this.closeMenu(true);
      return;
    }

    this.openMenu();
  }

  /**
   * Opens the mobile command deck and isolates the background content.
   *
   * @returns {void}
   */
  openMenu() {
    this.menuButton?.setAttribute('aria-expanded', 'true');
    this.navigation?.classList.add('is-open');
    document.body.classList.add('is-menu-open');

    if (this.menuLabel) {
      this.menuLabel.textContent = 'Menü schließen';
    }

    this.pageContent.forEach((element) => {
      element.inert = true;
    });

    window.requestAnimationFrame(() => {
      const firstLink = this.navigation?.querySelector<HTMLAnchorElement>('a');

      firstLink?.focus();
    });
  }

  /**
   * Closes the mobile command deck.
   *
   * @param {boolean} restoreFocus Whether focus should return to the menu trigger.
   * @returns {void}
   */
  closeMenu(restoreFocus: boolean = false) {
    const wasOpen = this.menuButton?.getAttribute('aria-expanded') === 'true';

    this.menuButton?.setAttribute('aria-expanded', 'false');
    this.navigation?.classList.remove('is-open');
    document.body.classList.remove('is-menu-open');

    if (this.menuLabel) {
      this.menuLabel.textContent = 'Menü öffnen';
    }

    this.pageContent.forEach((element) => {
      element.inert = false;
    });

    if (wasOpen && restoreFocus) {
      this.menuButton.focus();
    }
  }

  /**
   * Moves focus to the selected in-page destination after navigation.
   *
   * @param {string} hash Target fragment identifier.
   * @returns {void}
   */
  focusNavigationTarget(hash: string) {
    if (!hash) {
      return;
    }

    window.setTimeout(() => {
      const target = document.querySelector<HTMLElement>(hash);

      if (!(target instanceof HTMLElement)) {
        return;
      }

      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      target.addEventListener('blur', () => target.removeAttribute('tabindex'), {
        once: true,
        signal: this.abortController.signal,
      });
    }, 0);
  }

  /**
   * Adds a compact backdrop after the page has been scrolled.
   *
   * @returns {void}
   */
  bindHeader() {
    const header = this.header;

    if (!header) {
      return;
    }

    const updateHeader = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 24);
    };

    updateHeader();
    window.addEventListener('scroll', updateHeader, {
      passive: true,
      signal: this.abortController.signal,
    });
  }

  /**
   * Connects the accessible design and code mode controls.
   *
   * @returns {void}
   */
  bindModeSwitch() {
    if (!this.modeButtons.length) {
      return;
    }

    this.modeButtons.forEach((button) => {
      button.addEventListener(
        'click',
        () => {
          const mode = button.dataset.mode;

          if (!mode) {
            return;
          }

          document.documentElement.classList.toggle('is-code-mode', mode === 'code');
          document.documentElement.dataset.view = mode;
          document.documentElement.classList.add('is-mode-transitioning');

          window.clearTimeout(this.modeTransitionTimer);
          this.modeTransitionTimer = window.setTimeout(() => {
            document.documentElement.classList.remove('is-mode-transitioning');
          }, 560);

          this.modeButtons.forEach((item) => {
            const isActive = item.dataset.mode === mode;

            item.classList.toggle('is-active', isActive);
            item.setAttribute('aria-pressed', String(isActive));
          });

          if (this.modeStatus) {
            this.modeStatus.textContent =
              mode === 'code'
                ? 'Code-Ansicht mit technischen X-Ray-Informationen aktiviert.'
                : 'Design-Ansicht aktiviert.';
          }

          if (mode === 'code') {
            this.pulseSystemCore();
          }
        },
        { signal: this.abortController.signal },
      );
    });
  }

  /**
   * Updates the decorative core using normalized page scroll progress.
   *
   * @returns {void}
   */
  bindPageProgress() {
    const updateProgress = () => {
      const scrollRange = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollRange > 0 ? window.scrollY / scrollRange : 0;

      document.documentElement.style.setProperty('--page-progress', progress.toFixed(4));
      document.documentElement.classList.toggle('is-near-page-end', progress > 0.94);
      const isPastHero = window.scrollY > window.innerHeight * 0.62;
      const didCrossHeroBoundary =
        document.documentElement.classList.contains('is-past-hero') !== isPastHero;

      document.documentElement.classList.toggle('is-past-hero', isPastHero);

      if (didCrossHeroBoundary) {
        this.requestCoreRender?.();
      }

      if (this.hudScroll) {
        const percentage = Math.round(progress * 100)
          .toString()
          .padStart(3, '0');

        this.hudScroll.textContent = `SCROLL ${percentage}%`;
      }

      this.scrollFrame = null;
    };

    const requestUpdate = () => {
      if (this.scrollFrame !== null) {
        return;
      }

      this.scrollFrame = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener('scroll', requestUpdate, {
      passive: true,
      signal: this.abortController.signal,
    });
    window.addEventListener('resize', requestUpdate, {
      passive: true,
      signal: this.abortController.signal,
    });
  }

  /**
   * Adds pointer-position lighting on devices with a precise pointer.
   *
   * @returns {void}
   */
  bindPointerEffects() {
    const supportsPointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!supportsPointer || prefersReducedMotion) {
      return;
    }

    this.projectCards.forEach((card) => {
      card.addEventListener(
        'pointermove',
        (event) => {
          const bounds = card.getBoundingClientRect();
          const x = ((event.clientX - bounds.left) / bounds.width) * 100;
          const y = ((event.clientY - bounds.top) / bounds.height) * 100;

          card.style.setProperty('--pointer-x', `${x.toFixed(2)}%`);
          card.style.setProperty('--pointer-y', `${y.toFixed(2)}%`);
        },
        { signal: this.abortController.signal },
      );

      card.addEventListener(
        'pointerleave',
        () => {
          card.style.removeProperty('--pointer-x');
          card.style.removeProperty('--pointer-y');
        },
        { signal: this.abortController.signal },
      );
    });
  }

  /**
   * Makes the hero system core and code reticle respond to touch and pointer input.
   *
   * @returns {void}
   */
  bindSystemCore() {
    if (!this.systemCore) {
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const systemCore = this.systemCore;
    const state: MotionState = {
      targetX: window.innerWidth / 2,
      targetY: window.innerHeight / 2,
      currentX: window.innerWidth / 2,
      currentY: window.innerHeight / 2,
      pose: {
        panX: 0,
        panY: 0,
        rotateX: 0,
        rotateY: 0,
        velocityX: 0,
        velocityY: 0,
      },
      normalizedPoint: normalizeViewportPoint(
        { clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 },
        { width: window.innerWidth, height: window.innerHeight },
      ),
      frame: null,
      lastLabelUpdate: 0,
    };

    const renderFrame = (timestamp: number) => {
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
        isPastHero && !prefersReducedMotion,
      );

      state.pose = advanceCorePose(state.pose, target);

      systemCore.style.setProperty('--core-pan-x', `${state.pose.panX.toFixed(3)}rem`);
      systemCore.style.setProperty('--core-pan-y', `${state.pose.panY.toFixed(3)}rem`);
      systemCore.style.setProperty('--core-x', `${state.pose.rotateX.toFixed(3)}deg`);
      systemCore.style.setProperty('--core-y', `${state.pose.rotateY.toFixed(3)}deg`);

      if (timestamp - state.lastLabelUpdate > 80) {
        const label = formatCoordinateLabel(state.normalizedPoint);

        if (this.coreCoordinates) {
          this.coreCoordinates.textContent = label;
        }

        if (this.hudCoordinates) {
          this.hudCoordinates.textContent = label;
        }

        state.lastLabelUpdate = timestamp;
      }

      const pointerSettled =
        Math.abs(state.targetX - state.currentX) < 0.2 &&
        Math.abs(state.targetY - state.currentY) < 0.2;
      const coreSettled = isCoreSettled(state.pose, target);

      if (!pointerSettled || !coreSettled) {
        state.frame = window.requestAnimationFrame(renderFrame);
        return;
      }

      state.frame = null;
    };

    const requestRender = () => {
      state.frame ??= window.requestAnimationFrame(renderFrame);
    };

    const setTarget = (point: ViewportPoint) => {
      const normalizedPoint = normalizeViewportPoint(point, {
        width: window.innerWidth,
        height: window.innerHeight,
      });

      state.targetX = normalizedPoint.clientX;
      state.targetY = normalizedPoint.clientY;
      requestRender();
    };

    const nudgeCore = (point: ViewportPoint) => {
      if (prefersReducedMotion || !document.documentElement.classList.contains('is-past-hero')) {
        return;
      }

      const bounds = systemCore.getBoundingClientRect();
      const deltaX = bounds.left + bounds.width / 2 - point.clientX;
      const deltaY = bounds.top + bounds.height / 2 - point.clientY;
      const distance = Math.max(1, Math.hypot(deltaX, deltaY));

      state.pose.velocityX += (deltaX / distance) * 0.075;
      state.pose.velocityY += (deltaY / distance) * 0.055;
      requestRender();
    };

    const updateTouchTarget = (event: TouchEvent) => {
      const touch = event.touches[0];

      if (touch) {
        setTarget(touch);
      }
    };

    this.requestCoreRender = requestRender;
    this.stopCoreRender = () => {
      if (state.frame !== null) {
        window.cancelAnimationFrame(state.frame);
        state.frame = null;
      }
    };

    const signal = this.abortController.signal;

    window.addEventListener('pointermove', setTarget, { passive: true, signal });
    window.addEventListener(
      'pointerdown',
      (event) => {
        setTarget(event);
        nudgeCore(event);

        if (document.documentElement.classList.contains('is-past-hero')) {
          this.pulseSystemCore();
        }
      },
      { passive: true, signal },
    );
    window.addEventListener(
      'touchstart',
      (event) => {
        updateTouchTarget(event);
      },
      { passive: true, signal },
    );
    window.addEventListener('touchmove', updateTouchTarget, { passive: true, signal });
  }

  /**
   * Briefly energizes the hero core while respecting reduced-motion preferences.
   *
   * @returns {void}
   */
  pulseSystemCore() {
    if (!this.systemCore || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    this.systemCore.classList.add('is-energized');
    window.clearTimeout(this.corePulseTimer);
    this.corePulseTimer = window.setTimeout(() => {
      this.systemCore?.classList.remove('is-energized');
    }, 620);
  }

  /**
   * Tracks the current content section and exposes it to the navigation.
   *
   * @returns {void}
   */
  observeNavigationSections() {
    if (!this.navigationLinks.length || !('IntersectionObserver' in window)) {
      return;
    }

    const sections = Array.from(this.navigationLinks)
      .map((link) => document.getElementById(link.dataset.navSection ?? ''))
      .filter((section): section is HTMLElement => section instanceof HTMLElement);

    const setActiveSection = (sectionId: string) => {
      this.navigationLinks.forEach((link) => {
        if (link.dataset.navSection === sectionId) {
          link.setAttribute('aria-current', 'location');
          return;
        }

        link.removeAttribute('aria-current');
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const activeEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (activeEntry?.target instanceof HTMLElement) {
          setActiveSection(activeEntry.target.id);
        }
      },
      {
        rootMargin: '-32% 0px -55% 0px',
        threshold: [0.05, 0.2, 0.5],
      },
    );

    this.observers.push(observer);

    sections.forEach((section) => observer.observe(section));
  }

  /**
   * Reveals content as it enters the viewport with a no-JavaScript fallback.
   *
   * @returns {void}
   */
  observeRevealElements() {
    if (!('IntersectionObserver' in window)) {
      this.revealElements.forEach((element) => element.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      {
        rootMargin: '0px 0px -8% 0px',
        threshold: 0.08,
      },
    );

    this.observers.push(observer);

    this.revealElements.forEach((element) => observer.observe(element));
  }

  /**
   * Activates project visuals when cards enter the central viewport area.
   *
   * @returns {void}
   */
  observeProjectCards() {
    if (!('IntersectionObserver' in window)) {
      this.projectCards.forEach((card) => card.classList.add('is-in-view'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle('is-in-view', entry.isIntersecting);
        });
      },
      {
        rootMargin: '-22% 0px -22% 0px',
        threshold: 0.15,
      },
    );

    this.observers.push(observer);

    this.projectCards.forEach((card) => observer.observe(card));
  }
}
