import type { Controller } from './controller';

/** Keeps the decorative footer year current without coupling it to the app shell. */
export class CurrentYearController implements Controller {
  init() {
    const year = document.querySelector('[data-year]');

    if (year) {
      year.textContent = new Date().getFullYear().toString();
    }
  }

  destroy() {}
}
