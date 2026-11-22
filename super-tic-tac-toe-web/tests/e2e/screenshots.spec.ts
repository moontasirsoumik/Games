import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const outDir =
  process.env.SCREENSHOT_DIR ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../artifacts');

async function openOnlineHost(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Play Online' }).click();
  await page.getByRole('button', { name: 'New online game' }).click();
  await expect(page.getByTestId('room-code')).toBeVisible({ timeout: 60_000 });
}

test('capture phone screenshots', async ({ browser, baseURL }) => {
  test.setTimeout(180_000);
  const hostCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const guestCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const host = await hostCtx.newPage();
  const guest = await guestCtx.newPage();
  const root = `${baseURL}?e2e=1`;

  await host.goto(root);
  await host.screenshot({ path: path.join(outDir, 'ui-01-home.png'), fullPage: true });

  await host.getByRole('button', { name: 'Play vs Computer' }).click();
  await expect(host.getByTestId('cpu-setup')).toBeVisible();
  await host.screenshot({ path: path.join(outDir, 'ui-02-cpu-setup.png'), fullPage: true });
  await host.getByRole('button', { name: 'Start match' }).click();
  await expect(host.getByTestId('game-board')).toBeVisible();
  await host.locator('[data-testid="cell"][data-board="4"][data-row="1"][data-col="1"]').click();
  await host.waitForTimeout(1200);
  await host.screenshot({ path: path.join(outDir, 'ui-03-cpu-midgame.png'), fullPage: true });

  await host.goto(root);
  await openOnlineHost(host);
  await host.screenshot({ path: path.join(outDir, 'ui-04-online-wait.png'), fullPage: true });

  const code = (await host.getByTestId('room-code').textContent())?.match(/[A-Z0-9]{6}/)?.[0]!;
  await guest.goto(root);
  await guest.getByRole('button', { name: 'Play Online' }).click();
  await guest.getByPlaceholder('Room code').fill(code);
  await guest.getByRole('button', { name: 'Join' }).click();
  await expect(host.getByTestId('game-board')).toBeVisible({ timeout: 90_000 });

  await host.locator('[data-testid="cell"][data-board="4"][data-row="1"][data-col="1"]').click();
  await guest.locator('[data-testid="cell"][data-board="4"][data-row="0"][data-col="0"]').click();
  await host.screenshot({ path: path.join(outDir, 'ui-05-online-midgame.png'), fullPage: true });

  for (let i = 0; i < 40; i++) {
    if (await host.getByTestId('game-over').isVisible().catch(() => false)) break;
    for (const p of [host, guest]) {
      const turn = await p.getByTestId('turn-indicator').textContent();
      if (!turn?.includes('to play')) continue;
      const who = turn.includes('X') ? 'X' : 'O';
      const page = who === 'X' ? host : guest;
      const c = page.locator('[data-testid="cell"]:not([disabled])').first();
      if (await c.count()) await c.click();
    }
    await host.waitForTimeout(180);
  }

  if (await host.getByTestId('game-over').isVisible()) {
    await host.screenshot({ path: path.join(outDir, 'ui-06-win.png'), fullPage: true });
  }

  await hostCtx.close();
  await guestCtx.close();
});