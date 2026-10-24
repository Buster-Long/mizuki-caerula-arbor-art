/**
 * 按滚动百分比截图：用于原版 / 改版在"同一段落"做对照。
 * 「滚 N 格」受页面总高度影响，两版高度不同就会错位，必须用比例。
 *
 * 用法：node scripts/shotp.mjs <url> <输出> <百分比 0~1> [等待ms]
 */
import { chromium } from './browser.mjs';
import fs from 'node:fs/promises';

const url = process.argv[2] || 'http://localhost:4199/';
const out = process.argv[3] || '.artifacts/shotp.png';
const pct = Math.min(1, Math.max(0, Number(process.argv[4] ?? 0)));
const wait = Number(process.argv[5] || 7000);

await fs.mkdir('.artifacts', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('页面异常:', e.message));
await page.goto(url, { waitUntil: 'load', timeout: 45000 });
await page.waitForTimeout(wait);

await page.mouse.move(720, 450);
const target = await page.evaluate((p) => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo(0, max * p);
  return { max, y: max * p };
}, pct);

await page.waitForTimeout(2600);
const now = await page.evaluate(() => window.scrollY);
await page.screenshot({ path: out });
console.log(`截图已保存: ${out}  目标 ${target.y.toFixed(0)}px / 实际 ${now}px / 可滚 ${target.max}px`);
await browser.close();
