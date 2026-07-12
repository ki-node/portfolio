import type { Controller } from './controller';

/** Handles progressive reveals and project-card viewport state. */
export class ViewportObserversController implements Controller {
  private readonly revealElements = document.querySelectorAll<HTMLElement>('.reveal');
  private readonly projectCards = document.querySelectorAll<HTMLElement>('.project-card');
  private readonly observers: IntersectionObserver[] = [];

  init() {
    this.observeRevealElements();
    this.observeProjectCards();
  }

  destroy() {
    this.observers.forEach((observer) => observer.disconnect());
  }

  private observeRevealElements() {
    if (!('IntersectionObserver' in window)) {
      this.revealElements.forEach((element) => element.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );

    this.observers.push(observer);
    this.revealElements.forEach((element) => observer.observe(element));
  }

  private observeProjectCards() {
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
      { rootMargin: '-22% 0px -22% 0px', threshold: 0.15 },
    );

    this.observers.push(observer);
    this.projectCards.forEach((card) => observer.observe(card));
  }
}
