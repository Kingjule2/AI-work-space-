import test from 'node:test';
import assert from 'node:assert/strict';
import { createWakeChat, GROUP_TITLE, MAX_TEXT, ROUTING_MARKER, officeCliContext, requireDriveDPath, projectGroupTitle, pickEnabledModel, normalizeProjectId } from '../wake-chat.mjs';
import { createOfficeServer } from '../server.mjs';

const FIXTURE_WAKERS = [
  { name: 'intake-live', agentId: 'a0', description: 'Q&A Specialist', selectableForTeam: true },
  { name: 'product-live', agentId: 'a1', description: 'Product Manager', selectableForTeam: true },
  { name: 'frontend-live', agentId: 'a2', description: 'Frontend Feature Developer', selectableForTeam: true },
  { name: 'unknown-live', agentId: 'a3', description: 'Custom unassigned role', selectableForTeam: true }
];
function fakeCli({ exists = true, online = true, includeIntake = true } = {}) {
  const calls = [], groups = new Map(), followers = new Map();
  let seq = 13;
  const member = (id, name, kind = 'qoder/waker') => ({ id: `cpart_${id}`, wakerRef: { kind, id: `emp_${id}` }, wakerSnapshot: { name }, state: 'active' });
  const detail = (title, id) => ({ conversation: { id, title }, participants: [member('me', 'owner', 'core/human'), ...FIXTURE_WAKERS.filter(() => includeIntake).map(waker => member(waker.agentId, waker.name))] });
  const addGroup = title => {
    const id = `conv_test${groups.size + 1}`;
    groups.set(title, detail(title, id));
    return groups.get(title);
  };
  return {
    calls,
    push: (message, conversation = 'conv_test1') => followers.get(conversation)?.(message),
    async run(args) {
      calls.push(args);
      const command = args.slice(0, 2).join(' ');
      if (command === 'waker list') {
        if (!online) throw new Error('offline fixture');
        return FIXTURE_WAKERS.filter(waker => includeIntake || waker.description !== 'Q&A Specialist');
      }
      if (command === 'group show') {
        const found = groups.get(args[2]) || [...groups.values()].find(group => group.conversation.id === args[2]);
        if (found) return found;
        if (exists && args[2].startsWith(`${GROUP_TITLE} · `)) return addGroup(args[2]);
        throw new Error('group not found');
      }
      if (command === 'group list') {
        if (exists) for (const projectId of ['P-ONE', 'P-TWO', 'P-CHECK', 'P-BRIDGE']) {
          const title = projectGroupTitle(projectId);
          if (!groups.has(title)) addGroup(title);
        }
        return [...groups.values()].map(group => ({ conversation: group.conversation }));
      }
      if (command === 'group create') { exists = true; return { group: addGroup(args[3]) }; }
      if (command === 'messages send') return { message: { seq: ++seq, senderParticipantId: 'cpart_me', body: { type: 'text', text: args[3].slice('--text='.length) }, audience: ['cpart_a0'], createdAt: '2026-11-18T16:09:03Z' }, deliveries: [{ taskId: 'fixture-task-1' }] };
      throw new Error(`unexpected ${command}`);
    },
    follow(conversation, after, onMessage) { calls.push(['follow', conversation, after]); followers.set(conversation, onMessage); return () => { }; }
  };
}

test('TEST FIXTURE: project chat resolves intake and keeps unknown live Wakers visible', async () => {
  const cli = fakeCli(), updates = [], chat = createWakeChat({ cli, onUpdate: data => updates.push(data) });
  const state = await chat.open('p-one');
  assert.equal(state.projectId, 'P-ONE');
  assert.equal(state.intake.roleKey, 'intake');
  assert.equal(state.group, null);
  assert.ok(state.missingRoles.some(role => role.roleKey === 'estimate'));
  await chat.send('P-ONE', 'Brief awal');
  assert.deepEqual((await chat.open('P-ONE')).group, { title: projectGroupTitle('P-ONE'), members: FIXTURE_WAKERS.map(waker => waker.name) });
  assert.ok(cli.calls.some(call => call[0] === 'follow' && call[1] === 'conv_test1'));
  updates.length = 0;
  const reply = { seq: 15, senderParticipantId: 'cpart_a0', body: { type: 'text', text: 'Brief siap. @product-live tolong pecah tugasnya.' }, audience: [], createdAt: '2026-11-18T16:10:00Z' };
  cli.push(reply); cli.push(reply);
  cli.push({ seq: 16, senderParticipantId: 'cpart_a1', body: { type: 'text', text: 'Frontend, build the page.' }, audience: ['cpart_a2'], createdAt: '2026-11-18T16:11:00Z' });
  assert.equal(updates.length, 2, 'a repeated sequence number is ignored');
  assert.deepEqual(updates[0].messages[0].mentions, ['product-live']);
  assert.deepEqual(updates[1].messages[0].mentions, ['frontend-live']);
  assert.equal((await chat.open('P-ONE')).messages.length, 3);
});

test('TEST FIXTURE: intake-only acceptance sends a scoped request without requiring other names', async () => {
  const cli = fakeCli(), chat = createWakeChat({ cli });
  await assert.rejects(chat.send('P-ONE', '   '), /Tulis permintaan/);
  await assert.rejects(chat.send('P-ONE', 'x'.repeat(MAX_TEXT + 1)), /under 4000/);
  await assert.rejects(chat.send('../P-TWO', 'Halo'), /project_id/);
  assert.equal(cli.calls.length, 0, 'invalid input never reaches QoderWake');
  const risky = 'Bikin landing page "promo" && del /q * ; $(whoami) --mention max';
  const result = await chat.send('p-one', risky);
  assert.equal(result.sent, true);
  assert.equal(result.projectId, 'P-ONE');
  assert.equal(result.intake.name, 'intake-live');
  assert.deepEqual(result.deliveryIds, ['fixture-task-1']);
  assert.ok(result.missingRoles.length > 0);
  const sent = cli.calls.find(args => args[1] === 'send');
  assert.deepEqual([...sent.slice(0, 3), ...sent.slice(4)], ['messages', 'send', 'conv_test1', '--mention', 'intake-live', '--intent', 'request_action']);
  assert.ok(sent[3].startsWith(`--text=${risky}\n\n${ROUTING_MARKER}\nproject_id: P-ONE\nproject_folder: D:/kumpulan project/jadidulu-projects/P-ONE/`));
  for (const required of ['PROJECT_PACK_READY', 'founder AND client', 'INTAKE', 'Current missing later roles']) assert.ok(sent[3].includes(required), required);
  assert.ok(!sent[3].includes('Sahlu, Lira and Alexa'));
  const [message] = (await chat.open('P-ONE')).messages;
  assert.equal(message.text, risky);
  assert.deepEqual(message.mentions, ['intake-live']);
});

test('TEST FIXTURE: group creation uses only the live list and only after a real send', async () => {
  const cli = fakeCli({ exists: false }), chat = createWakeChat({ cli });
  assert.equal((await chat.open('P-ONE')).group, null);
  assert.ok(!cli.calls.some(args => args[1] === 'create'), 'opening chat never changes QoderWake');
  await chat.send('P-ONE', 'Halo intake');
  const created = cli.calls.find(args => args[1] === 'create');
  assert.deepEqual(created, ['group', 'create', '--title', projectGroupTitle('P-ONE'), ...FIXTURE_WAKERS.flatMap(waker => ['--waker', waker.agentId])]);
});

test('TEST FIXTURE: missing intake and offline reject before any message is sent', async () => {
  const missing = fakeCli({ includeIntake: false }), missingChat = createWakeChat({ cli: missing });
  await assert.rejects(missingChat.send('P-ONE', 'Halo'), /Belum ada Waker dengan peran Q&A Specialist/);
  assert.ok(!missing.calls.some(args => args[1] === 'send'));
  const offline = fakeCli({ online: false }), offlineChat = createWakeChat({ cli: offline });
  await assert.rejects(offlineChat.send('P-ONE', 'Halo'), /QoderWake offline/);
  assert.ok(!offline.calls.some(args => args[1] === 'send'));
});

test('TEST FIXTURE: concurrent project sessions keep groups, followers and messages separate', async () => {
  const cli = fakeCli(), chat = createWakeChat({ cli });
  await Promise.all([chat.open('P-ONE'), chat.open('P-TWO')]);
  await Promise.all([chat.send('P-ONE', 'Brief vendor'), chat.send('P-TWO', 'Brief koperasi')]);
  const [one, two] = await Promise.all([chat.open('P-ONE'), chat.open('P-TWO')]);
  assert.notEqual(one.group.title, two.group.title);
  assert.equal(one.group.title, projectGroupTitle('P-ONE'));
  assert.equal(two.group.title, projectGroupTitle('P-TWO'));
  assert.deepEqual((await chat.open('P-ONE')).messages.map(message => message.text), ['Brief vendor']);
  assert.deepEqual((await chat.open('P-TWO')).messages.map(message => message.text), ['Brief koperasi']);
  cli.push({ seq: 99, senderParticipantId: 'cpart_a0', body: { type: 'text', text: 'Only project one' }, audience: [], createdAt: '2026-11-18T16:12:00Z' }, 'conv_test1');
  assert.equal((await chat.open('P-ONE')).messages.length, 2);
  assert.equal((await chat.open('P-TWO')).messages.length, 1);
});

test('TEST FIXTURE: chat endpoints require the office key, origin and project_id', async () => {
  const port = 19823, origin = `http://127.0.0.1:${port}`, cli = fakeCli();
  const server = createOfficeServer({ port, cli });
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  try {
    const { pairingCode } = await (await fetch(`${origin}/api/config`)).json();
    const post = (headers, body = { project_id: 'P-ONE', text: 'Halo' }) => fetch(`${origin}/api/chat`, { method: 'POST', headers, body: JSON.stringify(body) });
    assert.equal((await fetch(`${origin}/api/chat`)).status, 401);
    assert.equal((await post({ 'Content-Type': 'application/json' })).status, 401);
    assert.equal((await post({ 'Content-Type': 'application/json', 'X-Office-Key': pairingCode, Origin: 'https://untrusted.example' })).status, 403);
    assert.equal((await post({ 'Content-Type': 'text/plain', 'X-Office-Key': pairingCode })).status, 415);
    assert.equal((await post({ 'Content-Type': 'application/json', 'X-Office-Key': pairingCode }, { text: 'No scope' })).status, 400);
    const opened = await fetch(`${origin}/api/chat?project_id=P-ONE`, { headers: { 'X-Office-Key': pairingCode } });
    assert.equal(opened.status, 200);
    const accepted = await post({ 'Content-Type': 'application/json', 'X-Office-Key': pairingCode, Origin: origin });
    const body = await accepted.json();
    assert.equal(body.sent, true);
    assert.equal(body.intake.roleKey, 'intake');
    assert.deepEqual(body.deliveryIds, ['fixture-task-1']);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('development only: reject C, relative, sibling and traversing paths before CLI execution', () => {
  for (const file of ['C:/Users/User/.qoderwake/bin/qoderwake.exe', 'wake-chat.mjs', 'D:/kumpulan project-other/file', 'D:/kumpulan project/../file']) {
    assert.throws(() => requireDriveDPath(file, 'test path'), /must be under D:/);
  }
  assert.throws(() => officeCliContext({}), /JADIDULU_QODERWAKE_CLI/);
  assert.throws(() => officeCliContext({ JADIDULU_QODERWAKE_CLI: 'C:/Users/User/.qoderwake/bin/qoderwake.exe' }), /JADIDULU_QODERWAKE_CLI/);
  assert.throws(() => officeCliContext({ JADIDULU_QODERWAKE_CLI: 'D:/kumpulan project/aiworkspace/wake-chat.mjs', TEMP: 'C:/Temp' }), /TEMP must be under D:/);
});

test('TEST FIXTURE: roster endpoint returns only live Wakers and planned metadata separately', async () => {
  const port = 19826, origin = `http://127.0.0.1:${port}`;
  const server = createOfficeServer({ port, cli: fakeCli() });
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  try {
    const response = await fetch(`${origin}/api/roster?resync=1`);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.runtimeVerified, true);
    assert.equal(data.roster.length, FIXTURE_WAKERS.length);
    assert.equal(data.count, FIXTURE_WAKERS.length);
    assert.equal(data.roster.find(waker => waker.roleKey === 'intake').name, 'intake-live');
    assert.equal(data.roster.find(waker => waker.name === 'unknown-live').team, 'Unassigned');
    assert.ok(data.planned.some(waker => waker.name === 'alexa'));
    assert.ok(!data.roster.some(waker => waker.name === 'alexa'));
    assert.equal((await fetch(`${origin}/api/roster`, { headers: { Origin: 'https://untrusted.example' } })).status, 403);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('TEST FIXTURE: enabled model selection avoids disabled auto model and supports explicit mention routing', async () => {
  const picked = pickEnabledModel([
    { id: 'auto', isEnabled: false, isFree: false, provider: 'system' },
    { id: 'efficient', isEnabled: true, isFree: true, provider: 'system' },
    { id: 'qwen3.8-max', isEnabled: true, isFree: true, provider: 'organization' }
  ]);
  assert.equal(picked.id, 'qwen3.8-max');
  const base = fakeCli();
  const cli = {
    calls: base.calls,
    follow: base.follow,
    async run(args) {
      if (args[0] === 'models' && args[1] === 'list') return [{ id: 'auto', isEnabled: false }, { id: 'qwen3.8-max', isEnabled: true, isFree: true, provider: 'organization' }];
      return base.run(args);
    }
  };
  const chat = createWakeChat({ cli, ensureFolder: false });
  const res = await chat.send('P-ONE', 'Lanjutkan ke frontend', { mention: 'frontend-live' });
  assert.equal(res.target, 'frontend-live');
  assert.equal(res.model, 'qwen3.8-max');
  const sent = cli.calls.find(args => args[1] === 'send');
  assert.deepEqual([...sent.slice(0, 3), ...sent.slice(4)], ['messages', 'send', 'conv_test1', '--mention', 'frontend-live', '--intent', 'request_action']);
});

test('TEST FIXTURE: friendly project names auto-normalize and POST /api/projects creates a QoderWake group immediately', async () => {
  assert.equal(normalizeProjectId('Testing'), 'P-TESTING');
  assert.equal(normalizeProjectId('Toko Kopi Senja'), 'P-TOKO-KOPI-SENJA');
  assert.equal(normalizeProjectId('p-local'), 'P-LOCAL');
  assert.throws(() => normalizeProjectId('../P-TWO'), /project_id/);
  assert.throws(() => normalizeProjectId('bad/name'), /project_id/);

  const port = 19827, origin = `http://127.0.0.1:${port}`, cli = fakeCli({ exists: false });
  const server = createOfficeServer({ port, cli });
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  try {
    const { pairingCode } = await (await fetch(`${origin}/api/config`)).json();
    const post = (headers, body) => fetch(`${origin}/api/projects`, { method: 'POST', headers, body: JSON.stringify(body) });
    assert.equal((await post({ 'Content-Type': 'application/json' }, { name: 'Testing App' })).status, 401);
    assert.equal((await post({ 'Content-Type': 'application/json', 'X-Office-Key': pairingCode, Origin: 'https://evil.example' }, { name: 'Testing App' })).status, 403);
    const createdRes = await post({ 'Content-Type': 'application/json', 'X-Office-Key': pairingCode, Origin: origin }, { name: 'Testing App' });
    assert.equal(createdRes.status, 201);
    const created = await createdRes.json();
    assert.equal(created.created, true);
    assert.equal(created.projectId, 'P-TESTING-APP');
    assert.equal(created.group.title, 'JADIDULU Office - Testing App (P-TESTING-APP)');
    assert.equal(created.group.members.length, FIXTURE_WAKERS.length);
    const createCalls = cli.calls.filter(args => args[0] === 'group' && args[1] === 'create');
    assert.equal(createCalls.length, 1);

    // Repeating for the same project reuses the existing group without duplicating it
    const repeatRes = await post({ 'Content-Type': 'application/json', 'X-Office-Key': pairingCode, Origin: origin }, { name: 'Testing App' });
    assert.equal(repeatRes.status, 200);
    const repeated = await repeatRes.json();
    assert.equal(repeated.created, false);
    assert.equal(repeated.projectId, 'P-TESTING-APP');
    assert.equal(cli.calls.filter(args => args[0] === 'group' && args[1] === 'create').length, 1);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
