import { chromium } from '@playwright/test';
import path from 'path';

const base = process.argv[2] ?? 'http://127.0.0.1:4173/Games/super-tic-tac-toe-web/';
const out = '/opt/cursor/artifacts';

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  recordVideo: { dir: out, size: { width: 390, height: 844 } },
});
const page = await ctx.newPage();
await page.goto(`${base}?e2e=1`);
await page.getByRole('button', { name: 'Play vs Computer' }).click();
await page.getByRole('button', { name: 'Start match' }).click();
await page.waitForSelector('[data-testid=game-board]');
await page.locator('[data-board="4"][data-row="1"][data-col="1"]').click();
await page.waitForTimeout(2500);
await ctx.close();
await browser.close();
console.log('recorded to', out);