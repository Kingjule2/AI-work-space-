import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createOfficeServer } from '../server.mjs';
import { ROUTING_MARKER } from '../wake-chat.mjs';

const port = 19824, origin = `http://127.0.0.1:${port}`;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const check = (condition, message) => { assert.ok(condition, message); console.log(`PASS ${message}`); };
const member = (id, name, kind = 'qoder/waker') => ({ id: `cpart_${id}`, wakerRef: { kind, id: `emp_${id}` }, wakerSnapshot: { name }, state: 'active' });
const names = ['intake-live', 'product-live', 'design-live', 'frontend-live'];
const descriptions = { 'intake-live': 'Q&A Specialist', 'product-live': 'Product Manager', 'design-live': 'UI/UX Designer', 'frontend-live': 'Frontend Developer' };
let emit = () => {}, seq = 1, failNext = false;
const sent = [];
const cli = {
  async run(args) {
    const command = args.slice(0, 2).join(' ');
    if (command === 'waker list') return names.map(name => ({ name, agentId: `id-${name}`, description: descriptions[name], selectableForTeam: true }));
    if (command === 'group list') return [{ conversation: { id: 'conv_check1', title: 'JADIDULU Office - P-CHECK' } }];
    if (command === 'group show') { await wait(400); return { conversation: { id: 'conv_check1' }, participants: [member('me', 'owner', 'core/human'), ...names.map(name => member(name, name))] }; }
    if (command === 'messages send') {
      await wait(900);
      if (failNext) { failNext = false; throw new Error('QoderWake did not answer in time.'); }
      sent.push(args);
      return { message: { seq: ++seq, senderParticipantId: 'cpart_me', body: { type: 'text', text: args[3].slice('--text='.length) }, audience: ['cpart_intake-live'], createdAt: new Date().toISOString() }, deliveries: [{ taskId: 'fixture-task' }] };
    }
    throw new Error(`unexpected ${command}`);
  },
  follow(conversation, after, onMessage) {
    emit = onMessage;
    setTimeout(() => onMessage({ seq: 1, senderParticipantId: 'cpart_me', body: { type: 'text', text: 'Older note from yesterday.' }, audience: [], createdAt: '2026-11-17T08:00:00Z' }), 50);
    return () => {};
  }
};
const push = (from, text, audience = []) => emit({ seq: ++seq, senderParticipantId: `cpart_${from}`, body: { type: 'text', text }, audience: audience.map(name => `cpart_${name}`), createdAt: new Date().toISOString() });

const server = createOfficeServer({ port, cli });
await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
const key = (await (await fetch(`${origin}/api/config`)).json()).pairingCode;
const feed = () => fetch(`${origin}/api/bridge`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Office-Key': key }, body: JSON.stringify({ agents: names.map(name => ({ id: `id-${name}`, name })), tasks: [{ id: 't1', agentId: 'id-design-live', title: 'Design the dashboard', status: 'running' }] }) });
await feed();
const timer = setInterval(feed, 5000);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  page.on('pageerror', error => errors.push(error.message));
  const state = () => page.locator('#chat-state').innerText();
  const feedText = () => page.locator('#activity-list').textContent();
  await page.goto(origin);
  await page.locator('#intake-chat').waitFor();
  check(await page.locator('#intake-chat').isVisible(), 'TEST FIXTURE: Ask Intake chat opens in the right panel');
  await page.fill('#project-id', 'P-CHECK');
  await page.locator('#project-id').press('Tab');
  await page.waitForFunction(() => document.querySelector('#chat-state').textContent.includes('JADIDULU Office'));
  check(/4 Wakers/.test(await state()) && /credits/.test(await state()), 'the composer names the live group and warns about credits');
  await page.locator('.chat-message').first().waitFor();
  check(!(await feedText()).includes('Older note'), 'old history is shown without replaying it as new activity');

  const request = 'Buat landing page <b>promo</b> & "diskon" $(whoami)';
  await page.fill('#chat-input', request);
  await page.press('#chat-input', 'Enter');
  await page.waitForFunction(() => document.querySelector('#chat-state').textContent.includes('Mengirim ke Waker intake'));
  check(await page.locator('#chat-send').isDisabled() && await page.locator('#chat-input').evaluate(el => el.readOnly), 'the composer locks while sending');
  await page.waitForFunction(() => document.querySelectorAll('.chat-message.mine').length === 2);
  check(await page.locator('.chat-message.mine .chat-text').last().innerText() === request, 'the request appears as written');
  check((await page.locator('.chat-message.mine .chat-to').last().innerText()).includes('intake-live'), 'the request goes to the resolved intake Waker');
  check(await page.inputValue('#chat-input') === '' && /Terkirim ke intake-live/.test(await state()), 'the composer clears only after acceptance');
  assert.deepEqual([...sent[0].slice(0, 3), ...sent[0].slice(4)], ['messages', 'send', 'conv_check1', '--mention', 'intake-live', '--intent', 'request_action']);
  check(sent[0][3].startsWith(`--text=${request}`) && sent[0][3].includes(ROUTING_MARKER), 'CLI receives one scoped text argument');
  check((await feedText()).includes('You → Intake-live'), 'the request is recorded in the activity log');

  push('intake-live', 'Brief siap. @product-live tolong bagi tugasnya.');
  await page.waitForFunction(() => document.querySelector('#activity-list').textContent.includes('Intake-live → Product-live'));
  push('product-live', 'Design dan frontend, lanjutkan.', ['design-live', 'frontend-live']);
  await page.waitForFunction(() => document.querySelector('#activity-list').textContent.includes('Product-live → Design-live, Frontend-live'));
  check((await page.locator('.chat-message .chat-to').last().innerText()).includes('Design-live, Frontend-live'), 'role handoffs appear in thread and feed');

  push('ghost', '<img src=x onerror="window.__xss=1">');
  await page.waitForFunction(() => document.querySelector('#chat-thread').textContent.includes('onerror'));
  check(await page.locator('#chat-thread img').count() === 0 && await page.evaluate(() => window.__xss) === undefined, 'message text is never interpreted as HTML');

  failNext = true;
  await page.fill('#chat-input', 'Second request');
  await page.click('#chat-send');
  await page.locator('#chat-state.error').waitFor();
  check(/did not answer in time/.test(await state()) && /Check the thread/.test(await state()), 'a failed send is never reported as sent');
  check(await page.inputValue('#chat-input') === 'Second request' && sent.length === 1, 'unsent text stays in the composer');
  await page.fill('#chat-input', '');

  await page.click('[data-panel-tab="team"]');
  await page.fill('#waker-search', 'design-live');
  await page.click('[data-waker="id-design-live"]');
  await page.click('[data-panel-tab="chat"]');
  await page.click('#map-pause');
  check(/NO COMMAND SENT/.test(await page.locator('#dialog-eyebrow').innerText()), 'Pause hands off without sending a command');
  await page.click('#dialog-close');

  for (const [width, height] of [[1280, 720], [390, 844]]) {
    await page.setViewportSize({ width, height });
    if (width <= 860 && !(await page.locator('.details-panel.open').count())) await page.click('#mobile-details');
    await page.waitForTimeout(250);
    const box = await page.locator('#chat-send').boundingBox(), panel = await page.locator('#intake-chat').boundingBox();
    check(box && box.y + box.height <= height && panel.x >= 0 && panel.x + panel.width <= width, `the composer stays reachable at ${width}×${height}`);
  }
  assert.deepEqual(errors, []);
  console.log('PASS no page errors');
} finally {
  clearInterval(timer);
  await browser.close();
  server.closeAllConnections(); server.close();
}
