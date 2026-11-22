import { chromium } from '@playwright/test';
import path from 'path';

const base = 'http://127.0.0.1:4173/Games/super-tic-tac-toe-web/';
const out = '/opt/cursor/artifacts';

const browser = await chromium.launch();
const hostCtx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  recordVideo: { dir: out, size: { width: 390, height: 844 } },
});
const guestCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const host = await hostCtx.newPage();
const guest = await guestCtx.newPage();

await host.goto(`${base}?e2e=1`);
await host.getByRole('button', { name: 'New online game' }).click();
await host.waitForSelector('[data-testid=room-code]', { timeout: 60_000 });
const code = (await host.textContent('[data-testid=room-code]')).match(/[A-Z0-9]{6}/)[0];
await guest.goto(`${base}?e2e=1`);
await guest.getByPlaceholder('Room code').fill(code);
await guest.getByRole('button', { name: 'Join' }).click();
await host.waitForSelector('[data-testid=game-board]', { timeout: 90_000 });
await host.locator('[data-board="4"][data-row="1"][data-col="1"]').click();
await guest.locator('[data-board="4"][data-row="0"][data-col="0"]').click();
await host.waitForTimeout(2000);

const video = await host.video()?.path();
await hostCtx.close();
await guestCtx.close();
await browser.close();
if (video) {
  const dest = path.join(out, 'demo-host.webm');
  console.log('video', video, '->', dest);
}