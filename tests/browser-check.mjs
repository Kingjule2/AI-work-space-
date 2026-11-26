import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOfficeServer } from '../server.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 19825;
const server = createOfficeServer({ port });
await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
page.on('pageerror', error => errors.push(error.message));
const check = (condition, message) => { assert.ok(condition, message); console.log(`PASS ${message}`); };

try {
  await page.goto(`http://127.0.0.1:${port}`);
  await page.locator('#intake-chat').waitFor();
  await page.screenshot({ path: path.join(root, 'tests/desktop.png') });

  // Verify clean 2-column layout: zero topbar, zero left sidebar, zero bottom feed, full-bleed map on left + Chat on right
  check(await page.locator('.topbar').count() === 0, 'top bar removed');
  check(await page.locator('.sidebar').count() === 0, 'left sidebar removed');
  check(await page.locator('.activity-panel').count() === 0, 'bottom activity bar removed');
  check(await page.locator('#intake-chat').isVisible(), 'right panel opens directly on Ask Intake chat');
  check(await page.locator('#project-id').isVisible(), 'chat requires an explicit project context');
  await page.fill('#project-id', 'p-local');
  await page.locator('#project-id').press('Tab');
  check(await page.locator('#project-id').inputValue() === 'P-LOCAL', 'project context is normalized without contacting QoderWake');
  check(await page.locator('#chat-send').isDisabled(), 'no live request can be sent without a verified bridge');
  const mapBox = await page.locator('#estate-canvas').boundingBox();
  check(mapBox.x === 0 && mapBox.y === 0 && mapBox.height === 1000, 'pixel mansion fills full left height edge-to-edge');
  await page.waitForFunction(() => document.querySelector('#connection-short').textContent.startsWith('Live'));
  const liveData = await page.evaluate(async () => (await (await fetch('/api/roster?resync=1')).json()));
  check(liveData.roster.length === liveData.count && liveData.roster.length > 0, 'live roster endpoint returns the real QoderWake count');
  check(!liveData.roster.some(waker => waker.name === 'alexa'), 'missing planned Waker is absent from live roster');
  check(await page.locator('#connection-short').textContent() === `Live · ${liveData.count}/${liveData.count} synced`, 'header uses live count for both numerator and denominator');
  check(await page.locator('#working-pill').textContent() === `0/${liveData.count}`, 'Team tab shows working divided by existing live Wakers');

  // Team tab search locates any Waker in under 3 seconds
  await page.click('[data-panel-tab="team"]');
  check(await page.locator('#planned-list').isHidden(), 'planned Wakers are hidden by default');
  await page.click('#planned-toggle');
  check((await page.locator('#planned-list').innerText()).includes('alexa'), 'planned toggle reveals missing metadata without drawing it');
  await page.click('#planned-toggle');
  const start = Date.now();
  await page.fill('#waker-search', 'Backend API Feature Developer');
  await page.locator('[data-waker]').first().click();
  check(Date.now() - start < 3000, 'Team tab search locates a Waker in under 3 seconds');
  check((await page.locator('#waker-details h2').innerText()).toLowerCase() === 'tegar', 'selected live Waker updates in Team tab');
  await page.fill('#waker-search', 'no-such-waker');
  check(await page.locator('.no-results').isVisible(), 'empty directory search has clear feedback');
  await page.fill('#waker-search', '');
  await page.click('#resync-button');
  await page.waitForFunction(() => document.querySelector('#toast').textContent.includes('Resync selesai'));
  check(await page.locator('#connection-short').textContent() === `Live · ${liveData.count}/${liveData.count} synced`, 'manual Resync preserves the real live count');
  await page.click('[data-panel-tab="chat"]');

  // Night / dark theme toggle
  await page.click('#theme-toggle');
  check(await page.locator('body').evaluate(el => el.classList.contains('dark')), 'dark/night theme renders');
  await page.screenshot({ path: path.join(root, 'tests/night.png') });
  await page.click('#theme-toggle');

  // Integer zoom steps 1x, 2x, 3x, 4x
  await page.click('[data-scale="2"]');
  check(await page.locator('#zoom-label').textContent() === '200%', '2x integer pixel zoom step works');
  await page.click('[data-scale="3"]');
  check(await page.locator('#zoom-label').textContent() === '300%', '3x integer pixel zoom step works');
  await page.click('[data-scale="4"]');
  check(await page.locator('#zoom-label').textContent() === '400%', '4x integer pixel zoom step works');
  await page.click('#reset-view');
  check(await page.locator('#zoom-label').textContent() === '100%', 'camera reset restores 1x overview');

  await page.click('#motion-toggle');
  check(await page.locator('#motion-toggle').getAttribute('aria-pressed') === 'true', 'reduce motion option works');
  await page.click('#motion-toggle');

  await page.click('#connect-button');
  check((await page.locator('#pairing-code').inputValue()).length === 48, 'bridge dialog provides local pairing code');
  await page.click('#dialog-close');

  const fps = await page.evaluate(() => new Promise(resolve => {
    let frames = 0;
    const start = performance.now();
    const sample = now => { frames++; if (now - start >= 1200) resolve(Math.round(frames * 1000 / (now - start))); else requestAnimationFrame(sample); };
    requestAnimationFrame(sample);
  }));
  console.log(`MEASURED ${fps} fps in desktop Chrome`);

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  mobile.on('pageerror', error => errors.push(error.message));
  await mobile.goto(`http://127.0.0.1:${port}`);
  await mobile.locator('#mobile-details').waitFor();
  check(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile layout has no horizontal overflow');
  await mobile.screenshot({ path: path.join(root, 'tests/mobile.png') });

  assert.deepEqual(errors, []);
  console.log('PASS zero browser runtime errors');
} finally {
  await browser.close();
  server.closeAllConnections();
  server.close();
}
