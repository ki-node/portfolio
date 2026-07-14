interface StylePropertySnapshot {
  readonly name: string;
  readonly value: string;
  readonly priority: string;
}

interface InlineStyleSnapshot {
  readonly element: HTMLElement;
  readonly properties: readonly StylePropertySnapshot[];
}

interface ScrollLockState {
  readonly scrollX: number;
  readonly scrollY: number;
  readonly styles: readonly InlineStyleSnapshot[];
}

/** Freezes the document viewport while leaving an overlay's own scrolling intact. */
export class DocumentScrollLock {
  private state: ScrollLockState | undefined;

  get isLocked() {
    return this.state !== undefined;
  }

  lock() {
    if (this.state) {
      return;
    }

    const root = document.documentElement;
    const body = document.body;
    const scrollingElement = document.scrollingElement;
    const lockedElements = Array.from(
      new Set(
        [root, body, scrollingElement].filter(
          (element): element is HTMLElement => element instanceof HTMLElement,
        ),
      ),
    );
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    this.state = {
      scrollX,
      scrollY,
      styles: lockedElements.map((element) => ({
        element,
        properties: [
          'overflow',
          'overscroll-behavior',
          ...(element === body ? ['position', 'inset', 'width'] : []),
        ].map((name) => ({
          name,
          value: element.style.getPropertyValue(name),
          priority: element.style.getPropertyPriority(name),
        })),
      })),
    };

    lockedElements.forEach((element) => {
      element.style.setProperty('overflow', 'hidden');
      element.style.setProperty('overscroll-behavior', 'none');
    });
    body.style.setProperty('position', 'fixed');
    body.style.setProperty('inset', `${-scrollY}px 0 auto ${-scrollX}px`);
    body.style.setProperty('width', '100%');
  }

  refresh() {
    if (!this.state) {
      return;
    }

    document.body.style.setProperty(
      'inset',
      `${-this.state.scrollY}px 0 auto ${-this.state.scrollX}px`,
    );
  }

  unlock() {
    const state = this.state;

    if (!state) {
      return;
    }

    this.state = undefined;
    state.styles.forEach(({ element, properties }) => {
      properties.forEach(({ name, value, priority }) => {
        if (value) {
          element.style.setProperty(name, value, priority);
        } else {
          element.style.removeProperty(name);
        }
      });
    });
    window.scrollTo({ left: state.scrollX, top: state.scrollY, behavior: 'auto' });
  }
}
