import type { Controller } from './controller';

/** Controls the accessible design/X-Ray mode switch. */
export class ViewModeController implements Controller {
  private readonly buttons = document.querySelectorAll<HTMLButtonElement>('[data-mode]');
  private readonly status = document.querySelector<HTMLElement>('[data-mode-status]');
  private readonly abortController = new AbortController();
  private transitionTimer: number | undefined;

  constructor(private readonly pulseCore: () => void) {}

  init() {
    this.buttons.forEach((button) => {
      button.addEventListener('click', () => this.activate(button.dataset.mode), {
        signal: this.abortController.signal,
      });
    });
  }

  destroy() {
    this.abortController.abort();
    window.clearTimeout(this.transitionTimer);
  }

  private activate(mode: string | undefined) {
    if (!mode) {
      return;
    }

    document.documentElement.classList.toggle('is-code-mode', mode === 'code');
    document.documentElement.dataset.view = mode;
    document.documentElement.classList.add('is-mode-transitioning');

    window.clearTimeout(this.transitionTimer);
    this.transitionTimer = window.setTimeout(() => {
      document.documentElement.classList.remove('is-mode-transitioning');
    }, 560);

    this.buttons.forEach((button) => {
      const isActive = button.dataset.mode === mode;

      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });

    if (this.status) {
      this.status.textContent =
        mode === 'code'
          ? 'Code-Ansicht mit technischen X-Ray-Informationen aktiviert.'
          : 'Design-Ansicht aktiviert.';
    }

    if (mode === 'code') {
      this.pulseCore();
    }
  }
}
