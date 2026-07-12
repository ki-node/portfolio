import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('renders without horizontal overflow', async ({ page }) => {
  await page.goto('./');

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Ich baue Websites');

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
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
  await expect(navigation.getByRole('link').first()).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toHaveAccessibleName('Menü öffnen');
  await expect(trigger).toBeFocused();
  await expect(page.locator('main')).not.toHaveAttribute('inert', '');
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

test('has no automatically detectable WCAG A/AA violations', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'axe-core is validated in mobile and desktop Chromium.');

  await page.goto('./');

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
