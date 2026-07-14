// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  EmbeddedLinkAdapter,
  parseBridgeableUrl,
  portfolioBridgeProtocol,
} from './embedded-link-adapter';

afterEach(() => {
  document.body.replaceChildren();
});

describe('EmbeddedLinkAdapter', () => {
  it('allows only mailto and HTTPS URLs', () => {
    expect(parseBridgeableUrl('mailto:test@example.com', 'https://local.invalid/')?.protocol).toBe(
      'mailto:',
    );
    expect(parseBridgeableUrl('https://example.com/path', 'https://local.invalid/')?.protocol).toBe(
      'https:',
    );
    expect(parseBridgeableUrl('javascript:alert(1)', 'https://local.invalid/')).toBeUndefined();
    expect(parseBridgeableUrl('data:text/plain,no', 'https://local.invalid/')).toBeUndefined();
    expect(parseBridgeableUrl('file:///tmp/no', 'https://local.invalid/')).toBeUndefined();
  });

  it('posts a versioned message for an embedded mail link and cleans up on destroy', () => {
    document.body.innerHTML = '<a href="mailto:test@example.com">Mail</a>';
    const postMessage = vi.fn();
    const adapter = new EmbeddedLinkAdapter('embedded', window, document, () => ({ postMessage }));
    const anchor = document.querySelector('a');

    adapter.init();
    anchor?.click();

    expect(postMessage).toHaveBeenCalledWith(
      {
        projectId: portfolioBridgeProtocol.projectId,
        protocolVersion: portfolioBridgeProtocol.version,
        type: portfolioBridgeProtocol.openExternalLinkType,
        url: 'mailto:test@example.com',
      },
      '*',
    );

    adapter.destroy();
    anchor?.addEventListener('click', (event) => event.preventDefault(), { once: true });
    anchor?.click();
    expect(postMessage).toHaveBeenCalledOnce();
  });

  it('leaves hash links, web links and standalone embedded fallbacks untouched', () => {
    document.body.innerHTML = '<a href="#main">Hash</a><a href="https://example.com">Web</a>';
    const postMessage = vi.fn();
    const embedded = new EmbeddedLinkAdapter('embedded', window, document, () => ({ postMessage }));
    const web = new EmbeddedLinkAdapter('web', window, document, () => ({ postMessage }));

    embedded.init();
    web.init();
    document
      .querySelector<HTMLAnchorElement>('a[href="#main"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    document
      .querySelector<HTMLAnchorElement>('a[href="https://example.com"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(postMessage).toHaveBeenCalledOnce();
    embedded.destroy();
    web.destroy();

    const standalone = new EmbeddedLinkAdapter('embedded', window, document, () => undefined);
    standalone.init();
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    const externalLink = document.querySelector<HTMLAnchorElement>('a[href="https://example.com"]');
    let preventedByAdapter = true;
    externalLink?.addEventListener(
      'click',
      (clickEvent) => {
        preventedByAdapter = clickEvent.defaultPrevented;
        clickEvent.preventDefault();
      },
      { once: true },
    );
    externalLink?.dispatchEvent(event);
    expect(preventedByAdapter).toBe(false);
    standalone.destroy();
  });
});
