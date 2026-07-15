import { expect, test, type Page } from '@playwright/test';

const embeddedUrl = 'http://127.0.0.1:4174/';

const reticlePosition = async (frame: ReturnType<Page['frameLocator']>) =>
  frame.locator('[data-code-reticle]').evaluate((element) => {
    const transform = (element as HTMLElement).style.transform;
    const match = /translate3d\(([-\d.]+)px,\s*([-\d.]+)px/u.exec(transform);

    return match ? [Number(match[1]), Number(match[2])] : [];
  });

const dispatchTouch = async (
  frame: ReturnType<Page['frameLocator']>,
  type: 'touchstart' | 'touchmove' | 'touchend',
  clientX: number,
  clientY: number,
) => {
  await frame.locator('body').evaluate(
    (body, input) => {
      const touch = {
        identifier: 17,
        target: body,
        clientX: input.clientX,
        clientY: input.clientY,
      };
      const activeTouches = input.type === 'touchend' ? [] : [touch];
      const event = new Event(input.type, { bubbles: true, cancelable: true });

      Object.defineProperties(event, {
        changedTouches: { value: [touch] },
        targetTouches: { value: activeTouches },
        touches: { value: activeTouches },
      });
      body.dispatchEvent(event);
    },
    { type, clientX, clientY },
  );
};

const openInHubFrame = async (page: Page) => {
  await page.setContent(`
    <!doctype html>
    <html><head>
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <style>
      * { box-sizing: border-box; }
      html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; background: #10091b; }
      .toolbar { height: 104px; padding: 24px; color: white; font: 700 20px system-ui; }
      iframe { display: block; width: 100%; height: calc(100% - 104px); border: 0; }
    </style></head><body>
    <div class="toolbar">ki-node · Portfolio</div>
    <iframe title="Portfolio" sandbox="allow-forms allow-modals allow-same-origin allow-scripts" src="${embeddedUrl}"></iframe>
    </body></html>
  `);
  const frame = page.frameLocator('iframe');
  await expect(frame.locator('html')).toHaveAttribute('data-app-context', 'embedded');
  await expect(frame.getByRole('heading', { level: 1 })).toBeVisible();
  return frame;
};

test('injects embedded context into built HTML before application scripts', async ({ request }) => {
  const response = await request.get(embeddedUrl);
  const html = await response.text();

  expect(html).toMatch(/<html lang="de" data-app-context="embedded">/u);
  expect(html.indexOf('data-app-context="embedded"')).toBeLessThan(html.indexOf('<script'));
});

test('keeps the initial skip link hidden but keyboard reachable', async ({ page }) => {
  const frame = await openInHubFrame(page);
  const skipLink = frame.getByRole('link', { name: 'Zum Inhalt springen' });
  const iframeBox = await page.locator('iframe').boundingBox();

  const initialBox = await skipLink.boundingBox();
  expect(initialBox?.y ?? 0).toBeLessThan(iframeBox?.y ?? 104);

  await page.locator('iframe').focus();
  await page.keyboard.press('Tab');
  await expect(skipLink).toBeFocused();
  expect((await skipLink.boundingBox())?.y ?? 0).toBeGreaterThanOrEqual(iframeBox?.y ?? 104);
});

test('fits the mobile hero below a Hub toolbar without double top inset or overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const frame = await openInHubFrame(page);

  const layout = await frame.locator('html').evaluate(() => {
    const header = document.querySelector<HTMLElement>('.site-header')?.getBoundingClientRect();
    const title = document.querySelector<HTMLElement>('.hero__title')?.getBoundingClientRect();
    const menu = document.querySelector<HTMLElement>('[data-menu-button]')?.getBoundingClientRect();
    const wordmark = document.querySelector<HTMLElement>('.wordmark')?.getBoundingClientRect();

    return {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      safeTop: getComputedStyle(document.documentElement).getPropertyValue('--safe-top').trim(),
      headerBottom: header?.bottom ?? 0,
      titleTop: title?.top ?? 0,
      titleBottom: title?.bottom ?? 0,
      menuRight: menu?.right ?? 0,
      wordmarkLeft: wordmark?.left ?? -1,
    };
  });

  expect(layout.safeTop).toBe('0px');
  expect(layout.titleTop).toBeGreaterThanOrEqual(layout.headerBottom - 1);
  expect(layout.titleBottom).toBeLessThan(740);
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
  expect(layout.wordmarkLeft).toBeGreaterThanOrEqual(0);
  expect(layout.menuRight).toBeLessThanOrEqual(layout.clientWidth + 1);
});

test('tracks a real touchscreen tap and pointer drag in iframe viewport coordinates', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'Touch input is available in mobile browser projects.');
  await page.setViewportSize({ width: 390, height: 844 });
  const frame = await openInHubFrame(page);
  await frame.getByRole('button', { name: 'Code' }).click();
  const iframeBox = await page.locator('iframe').boundingBox();

  expect(iframeBox).not.toBeNull();
  await page.touchscreen.tap((iframeBox?.x ?? 0) + 96, (iframeBox?.y ?? 0) + 180);

  await expect.poll(() => reticlePosition(frame)).toEqual([96, 180]);

  await frame.locator('body').dispatchEvent('pointerdown', {
    clientX: 110,
    clientY: 210,
    pointerId: 7,
    pointerType: 'touch',
  });
  await frame.locator('body').dispatchEvent('pointermove', {
    clientX: 205,
    clientY: 315,
    pointerId: 7,
    pointerType: 'touch',
  });
  await expect.poll(() => reticlePosition(frame)).toEqual([205, 315]);

  await frame.locator('body').dispatchEvent('pointerup', {
    clientX: 205,
    clientY: 315,
    pointerId: 7,
    pointerType: 'touch',
  });

  // WKWebView may announce PointerEvent support but stop after pointerdown.
  await frame.locator('body').dispatchEvent('pointerdown', {
    clientX: 110,
    clientY: 210,
    pointerId: 19,
    pointerType: 'touch',
  });
  await dispatchTouch(frame, 'touchstart', 110, 210);
  await dispatchTouch(frame, 'touchmove', 225, 330);
  await expect.poll(() => reticlePosition(frame)).toEqual([225, 330]);

  // Later pointer events from the abandoned sequence must not overwrite touch.
  await frame.locator('body').dispatchEvent('pointermove', {
    clientX: 280,
    clientY: 380,
    pointerId: 19,
    pointerType: 'touch',
  });
  await expect.poll(() => reticlePosition(frame)).toEqual([225, 330]);
  await dispatchTouch(frame, 'touchend', 225, 330);

  // Touch-only input remains valid even though PointerEvent exists.
  await dispatchTouch(frame, 'touchstart', 86, 176);
  await dispatchTouch(frame, 'touchmove', 166, 276);
  await expect.poll(() => reticlePosition(frame)).toEqual([166, 276]);
  await dispatchTouch(frame, 'touchend', 166, 276);

  await frame.locator('#arbeit').evaluate((element) => element.scrollIntoView());
  await dispatchTouch(frame, 'touchstart', 64, 128);
  await expect.poll(() => reticlePosition(frame)).toEqual([64, 128]);

  await frame.getByRole('button', { name: 'Design' }).click();
  await frame.getByRole('button', { name: 'Code' }).click();
  await dispatchTouch(frame, 'touchstart', 104, 208);
  await expect.poll(() => reticlePosition(frame)).toEqual([104, 208]);

  await frame.locator('html').evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await dispatchTouch(frame, 'touchstart', 140, 240);
  expect(await reticlePosition(frame)).toEqual([104, 208]);

  await page.locator('iframe').evaluate((element, source) => {
    (element as HTMLIFrameElement).src = source;
  }, `${embeddedUrl}?reinitialize=1`);
  await expect
    .poll(() =>
      page
        .frames()
        .find((candidate) => candidate.parentFrame())
        ?.url(),
    )
    .toContain('reinitialize=1');
  await expect(frame.getByRole('heading', { level: 1 })).toBeVisible();
  await frame
    .locator('html')
    .evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
  await frame
    .getByRole('button', { name: 'Code' })
    .evaluate((button: HTMLButtonElement) => button.click());
  await dispatchTouch(frame, 'touchstart', 124, 224);
  await expect.poll(() => reticlePosition(frame)).toEqual([124, 224]);
});

test('locks embedded background scrolling while keeping the mobile menu scrollable', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'The command deck is a mobile navigation pattern.');
  await page.setViewportSize({ width: 390, height: 524 });
  const frame = await openInHubFrame(page);
  const savedScrollY = await frame.locator('html').evaluate(() => {
    window.scrollTo(0, Math.min(1_200, document.documentElement.scrollHeight - window.innerHeight));
    return window.scrollY;
  });

  await frame.locator('[data-menu-button]').click();
  const lockState = await frame.locator('html').evaluate(() => ({
    bodyInset: document.body.style.inset,
    bodyPosition: document.body.style.position,
    htmlOverflow: document.documentElement.style.overflow,
  }));
  expect(lockState).toMatchObject({ bodyPosition: 'fixed', htmlOverflow: 'hidden' });
  expect(lockState.bodyInset).toContain(`${-savedScrollY}px`);

  await dispatchTouch(frame, 'touchstart', 190, 420);
  await dispatchTouch(frame, 'touchmove', 190, 180);
  expect(await frame.locator('body').evaluate((body) => body.style.inset)).toBe(
    lockState.bodyInset,
  );

  const menuScroll = await frame
    .getByRole('navigation', { name: 'Hauptnavigation' })
    .evaluate((element) => {
      element.scrollTop = Math.min(100, element.scrollHeight - element.clientHeight);
      return {
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
        scrollTop: element.scrollTop,
      };
    });
  expect(menuScroll.scrollHeight).toBeGreaterThan(menuScroll.clientHeight);
  expect(menuScroll.scrollTop).toBeGreaterThan(0);

  await frame.getByRole('button', { name: 'Menü schließen' }).click();
  await expect.poll(() => frame.locator('html').evaluate(() => window.scrollY)).toBe(savedScrollY);

  await frame.locator('[data-menu-button]').click();
  await frame.locator('html').evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await expect(frame.locator('body')).not.toHaveClass(/is-menu-open/u);
  await expect.poll(() => frame.locator('body').evaluate((body) => body.style.position)).toBe('');
});

test('forwards allowed links with the versioned bridge and leaves hashes local', async ({
  page,
}) => {
  const frame = await openInHubFrame(page);
  await page.evaluate(() => {
    (window as Window & { bridgeMessages?: unknown[] }).bridgeMessages = [];
    window.addEventListener('message', (event) => {
      (window as Window & { bridgeMessages: unknown[] }).bridgeMessages.push(event.data);
    });
  });

  await frame.getByRole('link', { name: 'Nachricht schreiben' }).click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as Window & { bridgeMessages?: unknown[] }).bridgeMessages),
    )
    .toContainEqual({
      projectId: 'portfolio',
      protocolVersion: 1,
      type: 'ki-node:open-external-link',
      url: 'mailto:kontakt@example.com',
    });

  await frame.locator('body').evaluate((body) => {
    const link = document.createElement('a');
    link.href = 'https://example.com/path';
    link.textContent = 'Extern';
    body.append(link);
  });
  await frame.getByRole('link', { name: 'Extern' }).click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as Window & { bridgeMessages?: unknown[] }).bridgeMessages),
    )
    .toContainEqual({
      projectId: 'portfolio',
      protocolVersion: 1,
      type: 'ki-node:open-external-link',
      url: 'https://example.com/path',
    });

  await frame.getByRole('link', { name: 'Ausgewählte Arbeit ansehen' }).click();
  await expect(frame.locator('#arbeit')).toBeInViewport();
});
