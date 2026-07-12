import type { Controller } from './controller';

/** Exposes page progress to CSS and the technical HUD without scroll thrashing. */
export class PageProgressController implements Controller {
  private readonly hudScroll = document.querySelector<HTMLElement>('[data-hud-scroll]');
  private readonly abortController = new AbortController();
  private frame: number | null = null;

  constructor(private readonly requestCoreRender: () => void) {}

  init() {
    this.update();
    window.addEventListener('scroll', this.requestUpdate, {
      passive: true,
      signal: this.abortController.signal,
    });
    window.addEventListener('resize', this.requestUpdate, {
      passive: true,
      signal: this.abortController.signal,
    });
  }

  destroy() {
    this.abortController.abort();

    if (this.frame !== null) {
      window.cancelAnimationFrame(this.frame);
    }
  }

  private readonly requestUpdate = () => {
    this.frame ??= window.requestAnimationFrame(() => this.update());
  };

  private update() {
    const scrollRange = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollRange > 0 ? window.scrollY / scrollRange : 0;
    const isPastHero = window.scrollY > window.innerHeight * 0.62;
    const didCrossHeroBoundary =
      document.documentElement.classList.contains('is-past-hero') !== isPastHero;

    document.documentElement.style.setProperty('--page-progress', progress.toFixed(4));
    document.documentElement.classList.toggle('is-near-page-end', progress > 0.94);
    document.documentElement.classList.toggle('is-past-hero', isPastHero);

    if (didCrossHeroBoundary) {
      this.requestCoreRender();
    }

    if (this.hudScroll) {
      this.hudScroll.textContent = `SCROLL ${Math.round(progress * 100)
        .toString()
        .padStart(3, '0')}%`;
    }

    this.frame = null;
  }
}
