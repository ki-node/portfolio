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
    this.navigation = document.querySelector('[data-navigation]');
    this.revealElements = document.querySelectorAll('.reveal');
    this.modeButtons = document.querySelectorAll('[data-mode]');
    this.modeStatus = document.querySelector('[data-mode-status]');
    this.projectCards = document.querySelectorAll('.project-card');
    this.scrollFrame = null;
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
        this.closeMenu();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.closeMenu();
      }
    });
  }

  /**
   * Toggles the mobile navigation state.
   *
   * @returns {void}
   */
  toggleMenu() {
    const isOpen = this.menuButton.getAttribute('aria-expanded') === 'true';

    this.menuButton.setAttribute('aria-expanded', String(!isOpen));
    this.navigation.classList.toggle('is-open', !isOpen);
  }

  /**
   * Closes the mobile navigation.
   *
   * @returns {void}
   */
  closeMenu() {
    this.menuButton?.setAttribute('aria-expanded', 'false');
    this.navigation?.classList.remove('is-open');
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

        this.modeButtons.forEach((item) => {
          const isActive = item.dataset.mode === mode;

          item.classList.toggle('is-active', isActive);
          item.setAttribute('aria-pressed', String(isActive));
        });

        if (this.modeStatus) {
          this.modeStatus.textContent = mode === 'code'
            ? 'Code-Ansicht aktiviert.'
            : 'Design-Ansicht aktiviert.';
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
