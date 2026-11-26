import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 1300 } });
try {
  await page.goto('http://127.0.0.1:19820/work-center?machineId=b53ef4bd-28e2-44ee-8d53-483b4e9b3e1a');
  await page.getByRole('button', { name: 'New auto work' }).click({ timeout: 30000 });
  const dialog = page.locator('[role="dialog"]').last();
  await dialog.waitFor(); await page.waitForTimeout(800);
  console.log(JSON.stringify(await dialog.locator('button, [role], input, label, select').evaluateAll(els => els.map(e => [e.tagName.toLowerCase(), e.getAttribute('role') || '', e.getAttribute('type') || '', (e.getAttribute('aria-label') || e.innerText || e.value || '').trim().replace(/\s+/g, ' ').slice(0, 40), e.getAttribute('aria-expanded') || '', e.getAttribute('aria-haspopup') || ''].join('|'))), null, 0));
} finally { await browser.close(); }
