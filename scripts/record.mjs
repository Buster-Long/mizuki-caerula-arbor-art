/** 录制真实交互过程：滚动转场、鼠标跟随、场景切换。用于验证动态效果。 */
import { chromium } from './browser.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

const url = process.argv[2] || 'http://localhost:4199/';
const outDir = '.artifacts/video';
await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  recordVideo: { dir: outDir, size: { width: 1440, height: 900 } }
});
const page = await context.newPage();
page.on('pageerror', e => console.log('页面异常:', e.message));

await page.goto(url, { waitUntil: 'load', timeout: 60000 });
// 等首屏模型与粒子就位
await page.waitForTimeout(9000);

/** 平滑滚动，让 FXScroll 的镜头转场完整展开 */
async function scrollBy(total, steps, pause = 90) {
  const each = total / steps;
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, each);
    await page.waitForTimeout(pause);
  }
}

// 首屏停留 + 轻微鼠标游走（触发流体/粒子跟随）
await page.mouse.move(720, 450);
for (let i = 0; i < 22; i++) {
  await page.mouse.move(720 + Math.cos(i * 0.5) * 260, 450 + Math.sin(i * 0.42) * 150, { steps: 4 });
  await page.waitForTimeout(60);
}
await page.waitForTimeout(800);

// 逐段推进六个场景
const legs = [700, 700, 700, 800, 800, 800];
for (const leg of legs) {
  await scrollBy(leg, 10);
  await page.waitForTimeout(1100);
}

// 回滚一点，展示反向转场
await scrollBy(-500, 6);
await page.waitForTimeout(1200);

await context.close();     // 关闭时写入视频
await browser.close();

const files = await fs.readdir(outDir);
console.log('录制完成:', files.join(', '));
