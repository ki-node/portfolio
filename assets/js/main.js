/**
 * Controls navigation, header state and viewport reveal animations.
 */
class PortfolioApp {
  /**
   * Creates the application and caches interactive elements.
   */
  constructor() {
    this.header = document.querySelector('[data-header]');
    this.menuButton = document.querySelector('[data-menu-button]');
    this.menuLabel = document.querySelector('[data-menu-label]');
    this.navigation = document.querySelector('[data-navigation]');
    this.navigationLinks = document.querySelectorAll('[data-nav-section]');
    this.pageContent = document.querySelectorAll('main, footer');
    this.revealElements = document.querySelectorAll('.reveal');
    this.modeButtons = document.querySelectorAll('[data-mode]');
    this.modeStatus = document.querySelector('[data-mode-status]');
    this.projectCards = document.querySelectorAll('.project-card');
    this.systemCore = document.querySelector('[data-system-core]');
    this.coreCoordinates = document.querySelector('[data-core-coordinates]');
    this.codeReticle = document.querySelector('[data-code-reticle]');
    this.hudCoordinates = document.querySelector('[data-hud-coordinates]');
    this.hudScroll = document.querySelector('[data-hud-scroll]');
    this.scrollFrame = null;
    this.modeTransitionTimer = null;
    this.corePulseTimer = null;
    this.requestCoreRender = null;
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

    this.menuButton.addEventListener('click', () => this.toggleMenu());

    this.navigation.addEventListener('click', (event) => {
      if (event.target instanceof HTMLAnchorElement) {
        this.closeMenu(false);
        this.focusNavigationTarget(event.target.hash);
        return;
      }

      const link = event.target instanceof Element
        ? event.target.closest('a')
        : null;

      if (link instanceof HTMLAnchorElement) {
        this.closeMenu(false);
        this.focusNavigationTarget(link.hash);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.closeMenu(true);
      }
    });

    window.addEventListener('resize', () => {
      if (window.matchMedia('(min-width: 50.0625rem)').matches) {
        this.closeMenu(false);
      }
    }, { passive: true });
  }

  /**
   * Toggles the mobile navigation state.
   *
   * @returns {void}
   */
  toggleMenu() {
    const isOpen = this.menuButton.getAttribute('aria-expanded') === 'true';

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
      const firstLink = this.navigation?.querySelector('a');

      firstLink?.focus();
    });
  }

  /**
   * Closes the mobile command deck.
   *
   * @param {boolean} restoreFocus Whether focus should return to the menu trigger.
   * @returns {void}
   */
  closeMenu(restoreFocus = false) {
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
      this.menuButton?.focus();
    }
  }

  /**
   * Moves focus to the selected in-page destination after navigation.
   *
   * @param {string} hash Target fragment identifier.
   * @returns {void}
   */
  focusNavigationTarget(hash) {
    if (!hash) {
      return;
    }

    window.setTimeout(() => {
      const target = document.querySelector(hash);

      if (!(target instanceof HTMLElement)) {
        return;
      }

      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
    }, 0);
  }

  /**
   * Adds a compact backdrop after the page has been scrolled.
   *
   * @returns {void}
   */
  bindHeader() {
    if (!this.header) {
      return;
    }

    const updateHeader = () => {
      this.header.classList.toggle('is-scrolled', window.scrollY > 24);
    };

    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
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
      button.addEventListener('click', () => {
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
          this.modeStatus.textContent = mode === 'code'
            ? 'Code-Ansicht mit technischen X-Ray-Informationen aktiviert.'
            : 'Design-Ansicht aktiviert.';
        }

        if (mode === 'code') {
          this.pulseSystemCore();
        }
      });
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
      const didCrossHeroBoundary = document.documentElement.classList.contains('is-past-hero') !== isPastHero;

      document.documentElement.classList.toggle('is-past-hero', isPastHero);

      if (didCrossHeroBoundary) {
        this.requestCoreRender?.();
      }

      if (this.hudScroll) {
        const percentage = Math.round(progress * 100).toString().padStart(3, '0');

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
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
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
      card.addEventListener('pointermove', (event) => {
        const bounds = card.getBoundingClientRect();
        const x = ((event.clientX - bounds.left) / bounds.width) * 100;
        const y = ((event.clientY - bounds.top) / bounds.height) * 100;

        card.style.setProperty('--pointer-x', `${x.toFixed(2)}%`);
        card.style.setProperty('--pointer-y', `${y.toFixed(2)}%`);
      });

      card.addEventListener('pointerleave', () => {
        card.style.removeProperty('--pointer-x');
        card.style.removeProperty('--pointer-y');
      });
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
    const state = {
      targetX: window.innerWidth / 2,
      targetY: window.innerHeight / 2,
      currentX: window.innerWidth / 2,
      currentY: window.innerHeight / 2,
      panX: 0,
      panY: 0,
      rotateX: 0,
      rotateY: 0,
      velocityX: 0,
      velocityY: 0,
      frame: null,
      isTouching: false,
      lastLabelUpdate: 0,
    };

    const renderFrame = (timestamp) => {
      const followFactor = state.isTouching ? 0.68 : 0.58;

      state.currentX += (state.targetX - state.currentX) * followFactor;
      state.currentY += (state.targetY - state.currentY) * followFactor;

      this.codeReticle?.style.setProperty(
        'transform',
        `translate3d(${state.currentX.toFixed(2)}px, ${state.currentY.toFixed(2)}px, 0) translate(-50%, -50%)`,
      );

      const x = Math.min(100, Math.max(0, (state.currentX / window.innerWidth) * 100));
      const y = Math.min(100, Math.max(0, (state.currentY / window.innerHeight) * 100));
      const isPastHero = document.documentElement.classList.contains('is-past-hero');
      const targetPanX = isPastHero && !prefersReducedMotion ? ((x - 50) / 50) * 1.35 : 0;
      const targetPanY = isPastHero && !prefersReducedMotion ? ((y - 50) / 50) * 1.05 : 0;
      const targetRotateX = isPastHero && !prefersReducedMotion ? ((50 - y) / 50) * 4 : 0;
      const targetRotateY = isPastHero && !prefersReducedMotion ? ((x - 50) / 50) * 6 : 0;

      state.panX += (targetPanX - state.panX) * 0.1 + state.velocityX;
      state.panY += (targetPanY - state.panY) * 0.1 + state.velocityY;
      state.rotateX += (targetRotateX - state.rotateX) * 0.12;
      state.rotateY += (targetRotateY - state.rotateY) * 0.12;
      state.velocityX *= 0.82;
      state.velocityY *= 0.82;

      this.systemCore.style.setProperty('--core-pan-x', `${state.panX.toFixed(3)}rem`);
      this.systemCore.style.setProperty('--core-pan-y', `${state.panY.toFixed(3)}rem`);
      this.systemCore.style.setProperty('--core-x', `${state.rotateX.toFixed(3)}deg`);
      this.systemCore.style.setProperty('--core-y', `${state.rotateY.toFixed(3)}deg`);

      if (timestamp - state.lastLabelUpdate > 80) {
        const xLabel = Math.round(x).toString().padStart(2, '0');
        const yLabel = Math.round(y).toString().padStart(2, '0');
        const label = `X ${xLabel} / Y ${yLabel}`;

        if (this.coreCoordinates) {
          this.coreCoordinates.textContent = label;
        }

        if (this.hudCoordinates) {
          this.hudCoordinates.textContent = label;
        }

        state.lastLabelUpdate = timestamp;
      }

      const pointerSettled = Math.abs(state.targetX - state.currentX) < 0.2
        && Math.abs(state.targetY - state.currentY) < 0.2;
      const coreSettled = Math.abs(targetPanX - state.panX) < 0.005
        && Math.abs(targetPanY - state.panY) < 0.005
        && Math.abs(targetRotateX - state.rotateX) < 0.01
        && Math.abs(targetRotateY - state.rotateY) < 0.01
        && Math.abs(state.velocityX) < 0.001
        && Math.abs(state.velocityY) < 0.001;

      if (!pointerSettled || !coreSettled) {
        state.frame = window.requestAnimationFrame(renderFrame);
        return;
      }

      state.frame = null;
    };

    const requestRender = () => {
      if (state.frame === null) {
        state.frame = window.requestAnimationFrame(renderFrame);
      }
    };

    const setTarget = (point) => {
      state.targetX = Math.min(window.innerWidth, Math.max(0, point.clientX));
      state.targetY = Math.min(window.innerHeight, Math.max(0, point.clientY));
      requestRender();
    };

    const nudgeCore = (point) => {
      if (prefersReducedMotion || !document.documentElement.classList.contains('is-past-hero')) {
        return;
      }

      const bounds = this.systemCore.getBoundingClientRect();
      const deltaX = bounds.left + bounds.width / 2 - point.clientX;
      const deltaY = bounds.top + bounds.height / 2 - point.clientY;
      const distance = Math.max(1, Math.hypot(deltaX, deltaY));

      state.velocityX += (deltaX / distance) * 0.075;
      state.velocityY += (deltaY / distance) * 0.055;
      requestRender();
    };

    const updateTouchTarget = (event) => {
      const touch = event.touches[0];

      if (touch) {
        setTarget(touch);
      }
    };

    this.requestCoreRender = requestRender;

    window.addEventListener('pointermove', setTarget, { passive: true });
    window.addEventListener('pointerdown', (event) => {
      setTarget(event);
      nudgeCore(event);

      if (document.documentElement.classList.contains('is-past-hero')) {
        this.pulseSystemCore();
      }
    }, { passive: true });
    window.addEventListener('touchstart', (event) => {
      state.isTouching = true;
      updateTouchTarget(event);
    }, { passive: true });
    window.addEventListener('touchmove', updateTouchTarget, { passive: true });
    window.addEventListener('touchend', () => {
      state.isTouching = false;
      requestRender();
    }, { passive: true });
    window.addEventListener('touchcancel', () => {
      state.isTouching = false;
      requestRender();
    }, { passive: true });
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
      .filter((section) => section instanceof HTMLElement);

    const setActiveSection = (sectionId) => {
      this.navigationLinks.forEach((link) => {
        if (link.dataset.navSection === sectionId) {
          link.setAttribute('aria-current', 'location');
          return;
        }

        link.removeAttribute('aria-current');
      });
    };

    const observer = new IntersectionObserver((entries) => {
      const activeEntry = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (activeEntry?.target instanceof HTMLElement) {
        setActiveSection(activeEntry.target.id);
      }
    }, {
      rootMargin: '-32% 0px -55% 0px',
      threshold: [0.05, 0.2, 0.5],
    });

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

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, {
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.08,
    });

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

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('is-in-view', entry.isIntersecting);
      });
    }, {
      rootMargin: '-22% 0px -22% 0px',
      threshold: 0.15,
    });

    this.projectCards.forEach((card) => observer.observe(card));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PortfolioApp().init();
});
