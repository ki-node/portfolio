import { expect, test } from '@playwright/test';

const visualOptions = {
  animations: 'disabled' as const,
  caret: 'hide' as const,
  maxDiffPixelRatio: 0.005,
};

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await page.evaluate(async () => document.fonts.ready);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('hero design view remains visually stable', async ({ page }) => {
  await expect(page).toHaveScreenshot('hero-design.png', visualOptions);
});

test('X-Ray code view remains visually stable', async ({ page }) => {
  await page.getByRole('button', { name: 'Code' }).click();
  await expect(page.locator('html')).toHaveClass(/is-code-mode/);

  await expect(page).toHaveScreenshot('hero-code.png', visualOptions);
});

test('mobile command deck remains visually stable', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'The command deck is a mobile navigation pattern.');

  await page.locator('[data-menu-button]').click();
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();

  await expect(page).toHaveScreenshot('mobile-navigation.png', visualOptions);
});

test('primary project card remains visually stable', async ({ page }) => {
  const project = page.locator('.project-card').first();

  await project.scrollIntoViewIfNeeded();
  await expect(project).toBeVisible();

  await expect(project).toHaveScreenshot('primary-project-card.png', visualOptions);
});
