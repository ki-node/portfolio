import type { AppContext } from '../app-context';
import type { Controller } from './controller';

export const portfolioBridgeProtocol = {
  projectId: 'portfolio',
  version: 1,
  openExternalLinkType: 'ki-node:open-external-link',
} as const;

export interface PortfolioExternalLinkMessage {
  projectId: typeof portfolioBridgeProtocol.projectId;
  protocolVersion: typeof portfolioBridgeProtocol.version;
  type: typeof portfolioBridgeProtocol.openExternalLinkType;
  url: string;
}

export const parseBridgeableUrl = (rawUrl: string, baseUrl: string): URL | undefined => {
  try {
    const url = new URL(rawUrl, baseUrl);

    return url.protocol === 'mailto:' || url.protocol === 'https:' ? url : undefined;
  } catch {
    return undefined;
  }
};

/** Forwards explicitly allowed links to the embedding Hub without coupling to its DOM. */
export class EmbeddedLinkAdapter implements Controller {
  private readonly abortController = new AbortController();

  constructor(
    private readonly context: AppContext,
    private readonly targetWindow: Window = window,
    private readonly targetDocument: Document = document,
    private readonly resolveHost: () => Pick<Window, 'postMessage'> | undefined = () =>
      targetWindow.parent === targetWindow ? undefined : targetWindow.parent,
  ) {}

  init() {
    if (this.context !== 'embedded') {
      return;
    }

    this.targetDocument.addEventListener('click', this.handleClick, {
      capture: true,
      signal: this.abortController.signal,
    });
  }

  destroy() {
    this.abortController.abort();
  }

  private readonly handleClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) {
      return;
    }

    const target = event.target;
    const anchor = target instanceof Element ? target.closest<HTMLAnchorElement>('a[href]') : null;

    const rawHref = anchor?.getAttribute('href') ?? '';
    const host = this.resolveHost();

    if (!anchor || rawHref.startsWith('#') || !host) {
      return;
    }

    const url = parseBridgeableUrl(anchor.href, this.targetWindow.location.href);

    if (!url) {
      return;
    }

    const message: PortfolioExternalLinkMessage = {
      projectId: portfolioBridgeProtocol.projectId,
      protocolVersion: portfolioBridgeProtocol.version,
      type: portfolioBridgeProtocol.openExternalLinkType,
      url: url.href,
    };

    event.preventDefault();
    host.postMessage(message, '*');
  };
}
