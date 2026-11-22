import { test, expect } from '@playwright/test';

async function assertMarksInsideBoard(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Play vs Computer' }).click();
  await page.getByRole('button', { name: 'Start match' }).click();
  await page.locator('[data-testid="cell"][data-board="4"][data-row="1"][data-col="1"]').click();
  await page.waitForTimeout(900);

  const cell = page.locator('[data-testid="cell"][data-board="4"][data-row="1"][data-col="1"].mark-x');
  await expect(cell).toBeVisible();
  const mini = page.locator('.mini-board').nth(4);
  const cellBox = await cell.boundingBox();
  const miniBox = await mini.boundingBox();
  expect(cellBox).toBeTruthy();
  expect(miniBox).toBeTruthy();
  if (cellBox && miniBox) {
    expect(cellBox.x).toBeGreaterThanOrEqual(miniBox.x - 1);
    expect(cellBox.y).toBeGreaterThanOrEqual(miniBox.y - 1);
    expect(cellBox.x + cellBox.width).toBeLessThanOrEqual(miniBox.x + miniBox.width + 1);
    expect(cellBox.y + cellBox.height).toBeLessThanOrEqual(miniBox.y + miniBox.height + 1);
  }
}

test.describe('board piece alignment', () => {
  test('390px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./?e2e=1');
    await assertMarksInsideBoard(page);
  });

  test('360px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('./?e2e=1');
    await assertMarksInsideBoard(page);
  });
});
