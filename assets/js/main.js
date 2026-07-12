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
    this.observeRevealElements();
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
}

document.addEventListener('DOMContentLoaded', () => {
  new PortfolioApp().init();
});
