// Scratch: read-only look at the QoderWake Console "New Automation" dialog. Never clicks Save.
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const shot = name => fileURLToPath(new URL(`./_wake-${name}.png`, import.meta.url));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 1400 } });
page.setDefaultTimeout(5000);
const clean = value => value.replace(/\n{2,}/g, '\n').trim();
const dialog = page.locator('[role="dialog"]').last();
const dump = async label => { console.log(`\n===== ${label} =====\n${clean(await dialog.innerText().catch(() => '(dialog not readable)')).slice(0, 3500)}`); await page.screenshot({ path: shot(label.replace(/\W+/g, '_')) }).catch(() => {}); };
const popup = async label => console.log(`POPUP ${label}:`, JSON.stringify(await page.locator('[role="option"], [role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]').evaluateAll(els => els.filter(e => e.offsetParent).map(e => e.innerText.trim().replace(/\s+/g, ' ').slice(0, 80)))));
const click = async (locator, label) => { try { await locator.click(); await page.waitForTimeout(700); return true; } catch (error) { console.log(`CLICK FAILED ${label}: ${error.message.split('\n')[0]}`); return false; } };
const role = (name, text, scope = dialog) => scope.getByRole(name, { name: text, exact: true }).first();
const run = process.argv[2] || 'triggers';
try {
  await page.goto('http://127.0.0.1:19820/work-center?machineId=b53ef4bd-28e2-44ee-8d53-483b4e9b3e1a', { timeout: 30000 });
  await page.getByRole('button', { name: 'New auto work' }).click({ timeout: 30000 });
  await dialog.waitFor(); await page.waitForTimeout(800);
  if (run === 'finish') {
    await dialog.getByRole('combobox').first().click();
    await page.getByRole('option', { name: 'Custom', exact: true }).click();
    await dialog.getByText('Expression', { exact: true }).click();
    console.log('CRON INPUTS:', JSON.stringify(await dialog.locator('input').evaluateAll(els => els.map(e => ({ placeholder: e.placeholder, value: e.value })))));
    const expression = dialog.locator('input:visible').last();
    await expression.fill('* * * * *'); await expression.press('Tab');
    await dump('minimum_cron');
    await dialog.getByRole('radiogroup', { name: 'Schedule type', exact: true }).getByRole('radio').nth(1).click();
    await dump('one_time_verified');
    await role('button', 'Triggers').click();
    await role('button', 'Result delivery').click();
    await dialog.getByRole('radiogroup', { name: 'Result delivery', exact: true }).getByRole('radio').nth(1).click();
    await dump('im_verified');
    await role('button', 'Task execution').click();
    await dialog.getByRole('radiogroup', { name: 'Workspace', exact: true }).getByRole('radio').nth(1).click();
    await dump('local_workspace_verified');
  } else if (run === 'triggers') {
    if (await click(dialog.getByRole('combobox').first(), 'repeat combobox')) { await popup('Repeats'); for (const name of ['Hourly', 'Weekly', 'Custom']) { if (await click(page.getByRole('option', { name }).first(), 'option ' + name)) { await dump('repeat_' + name); await click(dialog.getByRole('combobox').first(), 'reopen'); } } await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
    await click(role('radio', 'one-time'), 'one-time'); await dump('schedule_one_time');
    await click(role('tab', 'Event'), 'Event'); await dump('trigger_event');
    for (const [i, box] of (await dialog.getByRole('combobox').all()).entries()) { if (await click(box, `event combobox ${i}`)) { await popup(`event combobox ${i}`); await page.keyboard.press('Escape'); await page.waitForTimeout(400); } }
    await click(role('tab', 'API'), 'API'); await dump('trigger_api');
    await click(dialog.getByRole('button', { name: 'Add trigger' }), 'Add trigger'); await dump('second_trigger');
  } else {
    await click(role('button', 'Triggers'), 'collapse triggers');
    await click(role('button', 'Advanced settings'), 'Advanced settings'); await dump('advanced');
    for (const [i, box] of (await dialog.getByRole('combobox').all()).entries()) { if (await click(box, `advanced combobox ${i}`)) { await popup(`advanced combobox ${i}`); await page.keyboard.press('Escape'); await page.waitForTimeout(400); } }
    await click(role('button', 'Result delivery'), 'Result delivery'); await dump('delivery');
    await click(role('radio', 'im'), 'Deliver to IM'); await dump('delivery_im');
    await click(role('radio', 'task'), 'View in task only');
    await click(role('button', 'Task execution'), 'Task execution'); await dump('execution');
    if (await click(role('button', 'Auto'), 'model menu')) { await popup('model'); await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
    await click(role('radio', 'file'), 'Local Directory'); await dump('workspace_local');
    await click(role('tab', 'Run WakerFlow'), 'Run WakerFlow'); await dump('execution_wakerflow');
  }
  console.log('\nELEMENTS:', JSON.stringify(await dialog.locator('button, [role="radio"], [role="switch"], [role="checkbox"], input, textarea').evaluateAll(els => els.map(e => [e.getAttribute('role') || e.tagName.toLowerCase(), (e.getAttribute('aria-label') || e.innerText || e.placeholder || '').trim().replace(/\s+/g, ' ').slice(0, 50), e.getAttribute('aria-checked') || e.value || ''].join('|')))));
} finally { await browser.close(); }
