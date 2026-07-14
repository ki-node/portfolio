import { expect, test, type Page } from '@playwright/test';

const embeddedUrl = 'http://127.0.0.1:4174/';

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

  let transform = await frame
    .locator('[data-code-reticle]')
    .evaluate((element) => (element as HTMLElement).style.transform);
  expect(transform).toContain('translate3d(96.00px, 180.00px');

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
  transform = await frame
    .locator('[data-code-reticle]')
    .evaluate((element) => (element as HTMLElement).style.transform);
  expect(transform).toContain('translate3d(205.00px, 315.00px');

  await frame.locator('#arbeit').evaluate((element) => element.scrollIntoView());
  expect(
    await frame
      .locator('[data-code-reticle]')
      .evaluate((element) => (element as HTMLElement).style.transform),
  ).toContain('translate3d(205.00px, 315.00px');
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

  await frame.locator('a[href="#arbeit"]').first().click();
  await expect(frame.locator('#arbeit')).toBeInViewport();
});
