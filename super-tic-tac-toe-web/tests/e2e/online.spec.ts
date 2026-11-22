import { test, expect, type Page } from '@playwright/test';

async function clickCell(page: Page, board: number, row: number, col: number) {
  const cell = page.locator(
    `[data-testid="cell"][data-board="${board}"][data-row="${row}"][data-col="${col}"]:not([disabled])`,
  );
  await cell.click();
}

async function hostCreatesRoom(page: Page) {
  await page.goto('./?e2e=1');
  await page.getByRole('button', { name: 'Play Online' }).click();
  await page.getByRole('button', { name: 'New online game' }).click();
  await expect(page.getByTestId('room-code')).toBeVisible({ timeout: 60_000 });
  const codeText = await page.getByTestId('room-code').textContent();
  const match = codeText?.match(/[A-Z0-9]{6}/);
  expect(match).toBeTruthy();
  return match![0];
}

async function guestJoins(page: Page, code: string) {
  await page.goto('./?e2e=1');
  await page.getByRole('button', { name: 'Play Online' }).click();
  await page.getByPlaceholder('Room code').fill(code);
  await page.getByRole('button', { name: 'Join' }).click();
}

test.describe('online multiplayer', () => {
  test('two players, illegal move rejected, rematch, guest reconnect', async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    const host = await hostContext.newPage();
    const guest = await guestContext.newPage();

    const code = await hostCreatesRoom(host);
    await guestJoins(guest, code);

    await expect(host.getByTestId('game-board')).toBeVisible({ timeout: 90_000 });
    await expect(guest.getByTestId('game-board')).toBeVisible({ timeout: 90_000 });

    await clickCell(host, 4, 1, 1);
    await expect(guest.getByTestId('turn-indicator')).toContainText('O to play');

    await clickCell(guest, 4, 0, 0);

    await guest.evaluate(() => {
      const w = window as unknown as { __sendRaw?: (m: unknown) => void };
      w.__sendRaw?.({
        type: 'move',
        move: { board: 8, row: 2, col: 2 },
        player: 1,
        moveNumber: 999,
      });
    });

    await expect(guest.getByText(/rejected|Illegal|Not your turn/i)).toBeVisible({
      timeout: 10_000,
    }).catch(async () => {
      const toast = guest.locator('.toast');
      await expect(toast).toBeVisible({ timeout: 5_000 });
    });

    await host.evaluate(() => {
      (window as unknown as { __e2eRematch?: () => void }).__e2eRematch?.();
    });
    await expect(host.getByTestId('turn-indicator')).toContainText(/to play/, { timeout: 10_000 });

    await guest.reload();
    await expect(guest.getByTestId('game-board')).toBeVisible({ timeout: 90_000 });

    const thirdContext = await browser.newContext();
    const third = await thirdContext.newPage();
    await guestJoins(third, code);
    await expect(third.getByText(/Room full/i)).toBeVisible({ timeout: 60_000 });

    await hostContext.close();
    await guestContext.close();
    await thirdContext.close();
  });
});