import type { Controller } from './controller';

/** Adds precise-pointer lighting while leaving touch and reduced-motion paths quiet. */
export class PointerEffectsController implements Controller {
  private readonly cards = document.querySelectorAll<HTMLElement>('.project-card');
  private readonly abortController = new AbortController();

  init() {
    const supportsPointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!supportsPointer || prefersReducedMotion) {
      return;
    }

    this.cards.forEach((card) => {
      card.addEventListener('pointermove', (event) => this.updateCardLight(card, event), {
        signal: this.abortController.signal,
      });
      card.addEventListener('pointerleave', () => this.resetCardLight(card), {
        signal: this.abortController.signal,
      });
    });
  }

  destroy() {
    this.abortController.abort();
    this.cards.forEach((card) => this.resetCardLight(card));
  }

  private updateCardLight(card: HTMLElement, event: PointerEvent) {
    const bounds = card.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;

    card.style.setProperty('--pointer-x', `${x.toFixed(2)}%`);
    card.style.setProperty('--pointer-y', `${y.toFixed(2)}%`);
  }

  private resetCardLight(card: HTMLElement) {
    card.style.removeProperty('--pointer-x');
    card.style.removeProperty('--pointer-y');
  }
}
