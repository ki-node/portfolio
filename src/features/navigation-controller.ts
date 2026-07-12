import type { Controller } from './controller';

/** Owns the mobile command deck, sticky header and active-section state. */
export class NavigationController implements Controller {
  private readonly header = document.querySelector<HTMLElement>('[data-header]');
  private readonly menuButton = document.querySelector<HTMLButtonElement>('[data-menu-button]');
  private readonly menuLabel = document.querySelector<HTMLElement>('[data-menu-label]');
  private readonly navigation = document.querySelector<HTMLElement>('[data-navigation]');
  private readonly navigationLinks =
    document.querySelectorAll<HTMLAnchorElement>('[data-nav-section]');
  private readonly pageContent = document.querySelectorAll<HTMLElement>('main, footer');
  private readonly abortController = new AbortController();
  private sectionObserver: IntersectionObserver | undefined;
  private focusFrame: number | undefined;
  private focusTimer: number | undefined;

  init() {
    this.bindMenu();
    this.bindHeader();
    this.observeSections();
  }

  destroy() {
    this.abortController.abort();
    this.sectionObserver?.disconnect();
    window.cancelAnimationFrame(this.focusFrame ?? 0);
    window.clearTimeout(this.focusTimer);
    this.closeMenu(false);
  }

  private bindMenu() {
    if (!this.menuButton || !this.navigation) {
      return;
    }

    const signal = this.abortController.signal;

    this.menuButton.addEventListener('click', () => this.toggleMenu(), { signal });
    this.navigation.addEventListener('click', (event) => this.handleNavigationClick(event), {
      signal,
    });
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

  private handleNavigationClick(event: MouseEvent) {
    const link =
      event.target instanceof HTMLAnchorElement
        ? event.target
        : event.target instanceof Element
          ? event.target.closest('a')
          : null;

    if (!(link instanceof HTMLAnchorElement)) {
      return;
    }

    this.closeMenu(false);
    this.focusNavigationTarget(link.hash);
  }

  private toggleMenu() {
    if (this.menuButton?.getAttribute('aria-expanded') === 'true') {
      this.closeMenu(true);
      return;
    }

    this.openMenu();
  }

  private openMenu() {
    this.menuButton?.setAttribute('aria-expanded', 'true');
    this.navigation?.classList.add('is-open');
    document.body.classList.add('is-menu-open');
    this.menuLabel?.replaceChildren('Menü schließen');
    this.pageContent.forEach((element) => (element.inert = true));

    this.focusFrame = window.requestAnimationFrame(() => {
      this.navigation?.querySelector<HTMLAnchorElement>('a')?.focus();
    });
  }

  private closeMenu(restoreFocus: boolean) {
    const wasOpen = this.menuButton?.getAttribute('aria-expanded') === 'true';

    this.menuButton?.setAttribute('aria-expanded', 'false');
    this.navigation?.classList.remove('is-open');
    document.body.classList.remove('is-menu-open');
    this.menuLabel?.replaceChildren('Menü öffnen');
    this.pageContent.forEach((element) => (element.inert = false));

    if (wasOpen && restoreFocus) {
      this.menuButton.focus();
    }
  }

  private focusNavigationTarget(hash: string) {
    if (!hash) {
      return;
    }

    this.focusTimer = window.setTimeout(() => {
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

  private bindHeader() {
    if (!this.header) {
      return;
    }

    const updateHeader = () => this.header?.classList.toggle('is-scrolled', window.scrollY > 24);

    updateHeader();
    window.addEventListener('scroll', updateHeader, {
      passive: true,
      signal: this.abortController.signal,
    });
  }

  private observeSections() {
    if (!this.navigationLinks.length || !('IntersectionObserver' in window)) {
      return;
    }

    const sections = Array.from(this.navigationLinks)
      .map((link) => document.getElementById(link.dataset.navSection ?? ''))
      .filter((section): section is HTMLElement => section instanceof HTMLElement);

    this.sectionObserver = new IntersectionObserver(
      (entries) => {
        const activeEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (activeEntry?.target instanceof HTMLElement) {
          this.setActiveSection(activeEntry.target.id);
        }
      },
      { rootMargin: '-32% 0px -55% 0px', threshold: [0.05, 0.2, 0.5] },
    );
    sections.forEach((section) => this.sectionObserver?.observe(section));
  }

  private setActiveSection(sectionId: string) {
    this.navigationLinks.forEach((link) => {
      if (link.dataset.navSection === sectionId) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }
}
