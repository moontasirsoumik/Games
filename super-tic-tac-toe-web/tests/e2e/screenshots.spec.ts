import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const outDir =
  process.env.SCREENSHOT_DIR ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../artifacts');

test('capture phone screenshots', async ({ browser, baseURL }) => {
  test.setTimeout(120_000);
  const hostCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const guestCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const host = await hostCtx.newPage();
  const guest = await guestCtx.newPage();

  await host.goto(`${baseURL}?e2e=1`);
  await host.screenshot({ path: path.join(outDir, '01-menu.png'), fullPage: true });

  await host.getByRole('button', { name: 'New online game' }).click();
  await expect(host.getByTestId('room-code')).toBeVisible({ timeout: 60_000 });
  await host.screenshot({ path: path.join(outDir, '02-waiting-share.png'), fullPage: true });

  const code = (await host.getByTestId('room-code').textContent())?.match(/[A-Z0-9]{6}/)?.[0]!;
  await guest.goto(`${baseURL}?e2e=1`);
  await guest.getByPlaceholder('Room code').fill(code);
  await guest.getByRole('button', { name: 'Join' }).click();
  await expect(host.getByTestId('game-board')).toBeVisible({ timeout: 90_000 });
  await expect(guest.getByTestId('game-board')).toBeVisible({ timeout: 90_000 });

  await host.locator('[data-testid="cell"][data-board="4"][data-row="1"][data-col="1"]').click();
  await guest.locator('[data-testid="cell"][data-board="4"][data-row="0"][data-col="0"]').click();
  await host.locator('[data-testid="cell"][data-board="0"][data-row="1"][data-col="1"]').click();

  await host.screenshot({ path: path.join(outDir, '03-midgame-host.png'), fullPage: true });
  await guest.screenshot({ path: path.join(outDir, '03-midgame-guest.png'), fullPage: true });

  for (let i = 0; i < 30; i++) {
    const turnH = await host.getByTestId('turn-indicator').textContent();
    if (turnH?.includes('X to play')) {
      const c = host.locator('[data-testid="cell"]:not([disabled])').first();
      if (await c.count()) await c.click();
    }
    const turnG = await guest.getByTestId('turn-indicator').textContent();
    if (turnG?.includes('O to play')) {
      const c = guest.locator('[data-testid="cell"]:not([disabled])').first();
      if (await c.count()) await c.click();
    }
    if (await host.getByTestId('game-over').isVisible().catch(() => false)) break;
    await host.waitForTimeout(200);
  }

  if (await host.getByTestId('game-over').isVisible()) {
    await host.screenshot({ path: path.join(outDir, '04-win-host.png'), fullPage: true });
  } else {
    await host.evaluate(() => (window as unknown as { __e2eRematch?: () => void }).__e2eRematch?.());
    await host.screenshot({ path: path.join(outDir, '04-rematch-host.png'), fullPage: true });
  }

  await hostCtx.close();
  await guestCtx.close();
});