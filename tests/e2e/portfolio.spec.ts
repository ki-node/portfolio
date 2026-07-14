import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const readScrollLockState = () => ({
  bodyInset: document.body.style.inset,
  bodyPosition: document.body.style.position,
  htmlOverflow: document.documentElement.style.overflow,
  scrollY: window.scrollY,
});

test('renders without horizontal overflow', async ({ page }) => {
  await page.goto('./');

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Ich baue Websites');
  await expect(page.locator('html')).toHaveAttribute('data-app-context', 'web');

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});

test('publishes complete anonymous sharing and discovery metadata', async ({ page, request }) => {
  await page.goto('./');

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://ki-node.github.io/portfolio/',
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    'https://ki-node.github.io/portfolio/social-preview.png',
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    'content',
    'summary_large_image',
  );

  const structuredData = await page.locator('script[type="application/ld+json"]').textContent();
  const schema = JSON.parse(structuredData ?? '{}') as Record<string, unknown>;

  expect(schema['@type']).toBe('WebSite');
  expect(schema).not.toHaveProperty('email');
  expect(schema).not.toHaveProperty('person');

  for (const asset of [
    'icon.svg',
    'apple-touch-icon.png',
    'social-preview.png',
    'robots.txt',
    'sitemap.xml',
  ]) {
    const response = await request.get(`./${asset}`);

    expect(response.ok()).toBe(true);
  }
});

test('opens and closes the mobile navigation accessibly', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'The command deck is a mobile navigation pattern.');

  await page.goto('./');

  const trigger = page.locator('[data-menu-button]');
  const navigation = page.getByRole('navigation', { name: 'Hauptnavigation' });

  await expect(trigger).toHaveAccessibleName('Menü öffnen');
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(trigger).toHaveAccessibleName('Menü schließen');
  await expect(navigation).toBeVisible();
  await expect(page.locator('main')).toHaveAttribute('inert', '');
  const navigationLinks = navigation.getByRole('link');

  await expect(navigationLinks.first()).toBeFocused();

  await page.keyboard.press('Shift+Tab');
  await expect(trigger).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(navigationLinks.last()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(trigger).toBeFocused();

  await navigationLinks.first().click();
  await expect(page.locator('#arbeit')).toBeFocused();

  const focusPosition = await page.locator('#arbeit').evaluate((element) => ({
    targetTop: element.getBoundingClientRect().top,
    headerBottom:
      document.querySelector<HTMLElement>('[data-header]')?.getBoundingClientRect().bottom ?? 0,
  }));

  expect(focusPosition.targetTop).toBeGreaterThanOrEqual(focusPosition.headerBottom - 1);

  await trigger.click();

  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toHaveAccessibleName('Menü öffnen');
  await expect(trigger).toBeFocused();
  await expect(page.locator('main')).not.toHaveAttribute('inert', '');
});

test('locks and restores the document at scroll position zero', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'The command deck is a mobile navigation pattern.');
  await page.goto('./');
  await page.evaluate(() => window.scrollTo(0, 0));

  const trigger = page.locator('[data-menu-button]');
  await trigger.click();

  const lockState = await page.evaluate(readScrollLockState);

  expect(lockState).toMatchObject({ bodyPosition: 'fixed', htmlOverflow: 'hidden' });
  expect(lockState.bodyInset).toMatch(/^0px 0(?:px)? auto(?: 0px)?$/u);

  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

test('keeps the background fixed, the menu scrollable and restores deep scroll', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'The command deck is a mobile navigation pattern.');
  await page.setViewportSize({ width: 390, height: 420 });
  await page.goto('./');
  const savedScrollY = await page.evaluate(() => {
    window.scrollTo(0, Math.min(1_400, document.documentElement.scrollHeight - window.innerHeight));
    return window.scrollY;
  });
  const trigger = page.locator('[data-menu-button]');
  const navigation = page.getByRole('navigation', { name: 'Hauptnavigation' });

  for (let iteration = 0; iteration < 2; iteration += 1) {
    await trigger.click();
    const lockedState = await page.evaluate(readScrollLockState);

    expect(lockedState.bodyPosition).toBe('fixed');
    expect(lockedState.bodyInset).toContain(`${-savedScrollY}px`);

    await page.locator('main').dispatchEvent('touchstart', {
      touches: [{ clientX: 190, clientY: 420 }],
    });
    await page.locator('main').dispatchEvent('touchmove', {
      touches: [{ clientX: 190, clientY: 180 }],
    });
    expect((await page.evaluate(readScrollLockState)).bodyInset).toBe(lockedState.bodyInset);

    if (iteration === 0) {
      await page.setViewportSize({ width: 568, height: 390 });
      expect((await page.evaluate(readScrollLockState)).bodyInset).toBe(lockedState.bodyInset);
      await page.setViewportSize({ width: 390, height: 420 });
    }

    const menuScroll = await navigation.evaluate((element) => {
      element.scrollTop = Math.min(120, element.scrollHeight - element.clientHeight);
      return {
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
        scrollTop: element.scrollTop,
      };
    });
    expect(menuScroll.scrollHeight).toBeGreaterThan(menuScroll.clientHeight);
    expect(menuScroll.scrollTop).toBeGreaterThan(0);

    await page.keyboard.press('Escape');
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(savedScrollY);
  }
});

test('removes the document scroll lock during pagehide cleanup', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'The command deck is a mobile navigation pattern.');
  await page.goto('./');
  await page.locator('[data-menu-button]').click();
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));

  await expect
    .poll(() => page.evaluate(readScrollLockState))
    .toMatchObject({ bodyPosition: '', htmlOverflow: '' });
});

test('reflows at 320 CSS pixels without clipping controls', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('./');

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);

  for (const control of [
    page.locator('[data-menu-button]'),
    page.getByRole('button', { name: 'Design' }),
    page.getByRole('button', { name: 'Code' }),
  ]) {
    const bounds = await control.boundingBox();

    expect(bounds).not.toBeNull();
    expect(bounds?.x).toBeGreaterThanOrEqual(0);
    expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(321);
    expect(bounds?.width).toBeGreaterThanOrEqual(24);
    expect(bounds?.height).toBeGreaterThanOrEqual(24);
  }
});

test('keeps the command deck usable in a short landscape viewport', async ({ page }) => {
  await page.setViewportSize({ width: 568, height: 320 });
  await page.goto('./');

  const trigger = page.locator('[data-menu-button]');
  const navigation = page.getByRole('navigation', { name: 'Hauptnavigation' });
  const lastLink = navigation.getByRole('link').last();

  await trigger.click();
  await lastLink.scrollIntoViewIfNeeded();
  await expect(lastLink).toBeVisible();

  const bounds = await lastLink.boundingBox();

  expect(bounds).not.toBeNull();
  expect(bounds?.y).toBeGreaterThanOrEqual(0);
  expect((bounds?.y ?? 0) + (bounds?.height ?? 0)).toBeLessThanOrEqual(321);
});

test('switches between design and X-Ray code modes', async ({ page }) => {
  await page.goto('./');

  const designButton = page.getByRole('button', { name: 'Design' });
  const codeButton = page.getByRole('button', { name: 'Code' });

  await codeButton.click();
  await expect(codeButton).toHaveAttribute('aria-pressed', 'true');
  await expect(designButton).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('html')).toHaveClass(/is-code-mode/);
  await expect(page.locator('[data-mode-status]')).toContainText('Code-Ansicht');

  const titleBoundary = await page.locator('.hero__title').evaluate((element) => ({
    right: element.getBoundingClientRect().right,
    viewportWidth: window.innerWidth,
  }));

  expect(titleBoundary.right).toBeLessThanOrEqual(titleBoundary.viewportWidth + 1);

  await designButton.click();
  await expect(designButton).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).not.toHaveClass(/is-code-mode/);
});

test('reveals structured anonymized case studies without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('./');

  const firstProject = page.locator('.project-card').first();
  const details = firstProject.locator('details');

  await firstProject.getByText('Technische Details').click();
  await expect(details).toHaveAttribute('open', '');
  await expect(firstProject.getByText('Ausgangslage')).toBeVisible();
  await expect(firstProject.getByText('Umsetzung')).toBeVisible();
  await expect(firstProject.getByText('Wirkung')).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});

test('has no automatically detectable WCAG A/AA violations', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'axe-core is validated in mobile and desktop Chromium.');

  await page.goto('./');
  await page.locator('.project-details').evaluateAll((detailsElements) => {
    detailsElements.forEach((details) => details.setAttribute('open', ''));
  });

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});

test('honours reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');

  const animationDurationMs = await page.locator('.ambient__orb--one').evaluate((element) => {
    const style = getComputedStyle(element);
    const duration = style.animationDuration.trim();

    return duration.endsWith('ms')
      ? Number.parseFloat(duration)
      : Number.parseFloat(duration) * 1000;
  });

  expect(animationDurationMs).toBeLessThanOrEqual(0.01);
});

test('keeps text and focus visible in forced-colors mode', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Forced-colors emulation is Chromium-only.');

  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('./');

  const emphasizedTitleColor = await page
    .locator('.hero__title em')
    .evaluate((element) => getComputedStyle(element).color);

  expect(emphasizedTitleColor).not.toBe('rgba(0, 0, 0, 0)');

  const codeButton = page.getByRole('button', { name: 'Code' });

  await codeButton.focus();
  await expect(codeButton).toBeFocused();

  const outlineStyle = await codeButton.evaluate(
    (element) => getComputedStyle(element).outlineStyle,
  );

  expect(outlineStyle).not.toBe('none');
});
