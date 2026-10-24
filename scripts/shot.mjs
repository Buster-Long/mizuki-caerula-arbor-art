/** 页面截图工具：用系统 Chrome 渲染，验证真实视觉效果。 */
import { chromium } from './browser.mjs';
import fs from 'node:fs/promises';

const url = process.argv[2] || 'http://localhost:4199/';
const out = process.argv[3] || '.artifacts/shot.png';
const scroll = Number(process.argv[4] || 0);
const wait = Number(process.argv[5] || 6000);

await fs.mkdir('.artifacts', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('页面异常:', e.message));
await page.goto(url, { waitUntil: 'load', timeout: 45000 });
await page.waitForTimeout(wait);
if (scroll) {
  await page.mouse.move(720, 450);
  for (let i = 0; i < scroll; i++) {
    await page.mouse.wheel(0, 260);
    await page.waitForTimeout(260);
  }
  await page.waitForTimeout(2200);
}
await page.screenshot({ path: out });
console.log('截图已保存:', out);
await browser.close();
