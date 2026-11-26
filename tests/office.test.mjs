import test from 'node:test';
import assert from 'node:assert/strict';
import { OfficeModel, TEAMS, SPOTS, GRID_COLS, GRID_ROWS, TILE_SIZE, COOK_STAGES, pxToTile, configureRoster } from '../src/model.mjs';
import { EstateScene } from '../src/scene.mjs';
import { mapWakeStatus, normalizeWakeSnapshot, WorkforceAdapter } from '../src/adapter.mjs';
import { readOfficeRoster, sanitizeSnapshot } from '../server.mjs';
import { mergeLiveWakers } from '../waker-resolver.mjs';

const metadata = await readOfficeRoster();
const fixtureRoster = mergeLiveWakers(
  metadata.map(entry => ({ name: entry.name, agentId: entry.name, description: entry.role, selectableForTeam: true })),
  metadata
);
const make = () => {
  configureRoster(fixtureRoster);
  const m = new OfficeModel(() => .42);
  m.activeAgents().forEach(a => m.chooseSpot(a, true));
  return m;
};
const tick = (model, seconds) => { for (let t = 0; t < seconds; t += 1 / 60) model.update(1 / 60); };

test('MOCK development only: 80x60 tile grid (16x16 px base tile); every team room >= 14x12 tiles; desks >= 3 tiles apart', () => {
  const m = make();
  assert.equal(GRID_COLS, 80);
  assert.equal(GRID_ROWS, 60);
  assert.equal(TILE_SIZE, 16);
  for (const team of TEAMS) {
    const [, , tw, th] = team.tileRoom;
    assert.ok(tw >= 14 && th >= 12, `${team.name} is ${tw}x${th} tiles (>= 14x12)`);
  }
  const deskAgents = m.agents.filter(a => !a.unassigned);
  assert.equal(deskAgents.length, fixtureRoster.length);
  for (let i = 0; i < deskAgents.length; i++) {
    for (let j = i + 1; j < deskAgents.length; j++) {
      const a = deskAgents[i], b = deskAgents[j];
      const dist = Math.hypot(a.desk.tx - b.desk.tx, a.desk.ty - b.desk.ty);
      assert.ok(dist >= 3, `Desks for ${a.name} and ${b.name} are ${dist.toFixed(2)} tiles apart (>= 3)`);
    }
  }
});

test('TEST FIXTURE: live-only startup has no fake tasks or approvals and every fixture comes from the live list', () => {
  const m = make();
  assert.equal(m.mode, 'live');
  assert.equal(m.approvals.length, 0);
  assert.equal(m.activeAgents().filter(a => a.status === 'WORKING').length, 0);
  const names = m.agents.map(a => a.name);
  for (const expected of ['sahlu', 'lira', 'ethan', 'lita', 'max', 'lewis', 'safira', 'nathan', 'dinda', 'indah', 'galih']) {
    assert.ok(names.includes(expected), `Roster includes ${expected}`);
  }
  assert.equal(m.get('sahlu').room, 'lobby');
  assert.ok(m.agents.every(a => a.remoteId && a.enabled && !a.placeholder));
});

test('MOCK development only: A* pathfinding routes through doors without ever clipping walls or furniture', () => {
  const m = make();
  for (const a of m.activeAgents()) {
    const pathToPool = m.findPath(a.desk.x, a.desk.y, SPOTS[0].x, SPOTS[0].y);
    assert.ok(pathToPool.length > 3, `${a.name} finds multi-step A* path to pool`);
    for (const pt of pathToPool) {
      const { tx, ty } = pxToTile(pt.x, pt.y);
      assert.equal(m.walkGrid[ty][tx], 0, `Waypoint (${tx},${ty}) for ${a.name} is walkable`);
    }
  }
});

test('MOCK development only: integer pixel zoom steps (1x, 2x, 3x, 4x) and camera locate align on desktop and phone', () => {
  for (const [width, height] of [[1280, 800], [941, 650], [390, 614]]) {
    const scene = Object.create(EstateScene.prototype);
    scene.canvas = { getBoundingClientRect: () => ({ width, height }) };
    scene.zoom = 1; scene.pan = { x: 0, y: 0 }; scene.model = make();
    scene.resize();
    for (const s of [1, 2, 3, 4]) {
      scene.setPixelScale(s);
      assert.equal(scene.pixelScale, s);
      assert.equal(scene.scale, s);
    }
    scene.locate('lita');
    scene.pan = { ...scene.focus };
    const a = scene.model.get('lita');
    const located = scene.screenPoint(scene.project(a.x, a.y, 10));
    assert.ok(Math.abs(located.x - width / 2) < 1e-8);
    assert.ok(Math.abs(located.y - scene.viewportCenterY) < 1e-8);
    scene.reset();
    assert.equal(scene.pixelScale, 1);
    assert.deepEqual(scene.pan, { x: 0, y: 0 });
  }
});

test('MOCK development only: at least 6 different standby activities run at once, including a full multi-step cooking sequence', () => {
  const m = make();
  const idleWithSpots = m.activeAgents().filter(a => a.status === 'IDLE' && a.spot !== null);
  assert.ok(idleWithSpots.length >= 6);
  const types = new Set(idleWithSpots.map(a => SPOTS[a.spot]?.type));
  assert.ok(types.size >= 6, `At least 6 distinct standby activities visible (got ${types.size})`);

  const cook = m.activeAgents().find(a => a.cookStage === 0);
  assert.ok(cook, 'an initial chef begins at cookStage 0');
  const visitedStages = [COOK_STAGES[cook.cookStage].stage];
  for (let s = 0; s < 40 && visitedStages.length < COOK_STAGES.length; s++) {
    tick(m, 1.0);
    if (cook.cookStage >= 0) {
      const stageName = COOK_STAGES[cook.cookStage]?.stage;
      if (stageName && !visitedStages.includes(stageName)) visitedStages.push(stageName);
    }
  }
  assert.deepEqual(visitedStages, ['fridge', 'counter', 'stove', 'serve', 'sink']);
});

test('MOCK development only: no two Wakers ever share the same reserved spot', () => {
  const m = make();
  for (let i = 0; i < 60; i++) {
    m.activeAgents().forEach(a => m.chooseSpot(a, true));
    const spots = m.activeAgents().map(a => a.spot).filter(s => s !== null);
    assert.equal(new Set(spots).size, spots.length);
  }
});

test('MOCK development only: when a live event sets a Waker WORKING, they drop standby activity and walk to their desk; BLOCKED calls ethan', () => {
  const m = make(), lita = m.get('lita');
  m.applyEvent({ agent_id: 'lita', status: 'WORKING', task: 'Design real portal UI', timestamp: new Date().toISOString() });
  assert.equal(lita.status, 'WORKING'); assert.equal(lita.spot, null); assert.equal(lita.cookStage, -1); assert.ok(lita.path.length);
  tick(m, 14);
  assert.ok(Math.hypot(lita.x - lita.desk.x, lita.y - lita.desk.y) < 6);

  m.applyEvent({ agent_id: 'ethan', status: 'WORKING', task: 'Supervise sprint', timestamp: new Date().toISOString() });
  m.applyEvent({ agent_id: 'safira', status: 'BLOCKED', task: 'Need staging DB', timestamp: new Date().toISOString() });
  tick(m, 12);
  const ethan = m.get('ethan'), safira = m.get('safira');
  assert.ok(Math.hypot(ethan.x - safira.desk.x, ethan.y - safira.desk.y) < 36, 'ethan walks over to blocked safira');
});

test('MOCK development only: reduced motion freezes standby animations while live task state still snaps to desk', () => {
  const m = make(); m.reducedMotion = true;
  const positions = m.activeAgents().map(a => [a.x, a.y]); tick(m, 20);
  assert.deepEqual(m.activeAgents().map(a => [a.x, a.y]), positions);
  m.applyEvent({ agent_id: 'lita', status: 'WORKING', task: 'Real live task', timestamp: new Date().toISOString() });
  tick(m, .1);
  assert.equal(m.get('lita').x, m.get('lita').desk.x);
});

test('MOCK development only: live snapshot matches actual names; online never means working', () => {
  const m = make();
  const snapshot = { agents: [{ id: 'remote-lita', name: 'lita' }, { id: 'remote-sahlu', name: 'sahlu' }], tasks: [{ agentId: 'remote-lita', title: 'Current task', status: 'running' }, { agentId: 'remote-lita', title: 'Older task', status: 'done' }], timestamp: new Date().toISOString() };
  const events = normalizeWakeSnapshot(snapshot, m.agents);
  assert.equal(events.find(e => e.local_id === 'lita').status, 'WORKING');
  assert.equal(events.find(e => e.local_id === 'sahlu').status, 'IDLE');
  assert.equal(mapWakeStatus('online'), 'IDLE');
});

test('MOCK development only: old failures never mask a running task or a newer completed task', () => {
  const m = make();
  const snapshot = {
    agents: [{ id: 'remote-lita', name: 'lita' }], tasks: [
      { agentId: 'remote-lita', title: 'Old failure', status: 'failed', updatedAt: '2026-11-17T01:00:00Z' },
      { agentId: 'remote-lita', title: 'Recovered task', status: 'done', updatedAt: '2026-11-18T01:00:00Z' }
    ], timestamp: new Date().toISOString()
  };
  assert.equal(normalizeWakeSnapshot(snapshot, m.agents).find(e => e.local_id === 'lita').status, 'IDLE');
  snapshot.tasks.push({ agentId: 'remote-lita', title: 'New work', status: 'running', updatedAt: '2026-11-18T02:00:00Z' });
  assert.equal(normalizeWakeSnapshot(snapshot, m.agents).find(e => e.local_id === 'lita').status, 'WORKING');
});

test('MOCK development only: adapter accepts valid events and rejects invalid statuses or timestamps', () => {
  const a = new WorkforceAdapter(make());
  assert.equal(a.receive({ agent_id: 'lita', status: 'WORKING', task: 'From event', timestamp: new Date().toISOString() }), true);
  assert.equal(a.model.get('lita').task, 'From event');
  assert.equal(a.receive({ agent_id: 'lita', status: 'INVALID', timestamp: new Date().toISOString() }), false);
  assert.equal(a.receive({ agent_id: 'lita', status: 'WORKING', timestamp: 'invalid' }), false);
});

test('MOCK development only: live command hands off to QoderWake without mutating an agent', () => {
  const m = make(), adapter = new WorkforceAdapter(m);
  adapter.connected = true;
  const a = m.get('lita'); a.remoteId = 'real-lita'; let handoff;
  adapter.addEventListener('command-handoff', e => handoff = e.detail);
  const result = adapter.command({ agent_id: 'lita', action: 'pause' });
  assert.equal(result.sent, false);
  assert.equal(handoff.command.action, 'pause');
  const unmapped = m.get('max'); unmapped.remoteId = '';
  assert.throws(() => adapter.command({ agent_id: 'max', action: 'stop' }), /not been connected/);
});

test('MOCK development only: bridge strips extra data and rejects invalid or oversized payloads', () => {
  const snapshot = sanitizeSnapshot({ agents: [{ id: 'a', name: 'lita', token: 'do-not-forward', skills: [] }], tasks: [{ id: 't', agentId: 'a', title: '<script>alert(1)</script>', status: 'running', url: 'https://evil.example/' }] });
  assert.deepEqual(snapshot.agents, [{ id: 'a', name: 'lita' }]); assert.equal(snapshot.tasks[0].url, '');
  assert.throws(() => sanitizeSnapshot({ agents: Array(251).fill({}), tasks: [] }));
  assert.throws(() => sanitizeSnapshot({ agents: [], tasks: [{ id: 'x', status: 'oops' }] }));
});

test('MOCK development only: external command destinations are restricted to the supplied QoderWake origin', () => {
  const a = new WorkforceAdapter(make());
  assert.equal(a.safeUrl('javascript:alert(1)'), '');
  assert.equal(a.safeUrl('//evil.example/conversations/abc'), '');
  assert.equal(a.safeUrl('/api/settings'), '');
  assert.equal(a.safeUrl('/conversations/abc'), 'http://127.0.0.1:19820/conversations/abc');
});

test('MOCK development only: adapter caches project chats independently and rejects cross-project messages', async () => {
  const a = new WorkforceAdapter(make());
  await a.setProject('P-ALPHA');
  a.mergeChat([{ seq: 1, projectId: 'P-ALPHA', from: { kind: 'human', name: 'You' }, text: 'Alpha brief', mentions: ['sahlu'], createdAt: new Date().toISOString() }], 'P-ALPHA');
  await a.setProject('P-BETA');
  a.mergeChat([{ seq: 1, projectId: 'P-BETA', from: { kind: 'human', name: 'You' }, text: 'Beta brief', mentions: ['sahlu'], createdAt: new Date().toISOString() }], 'P-BETA');
  a.mergeChat([{ seq: 2, projectId: 'P-BETA', from: { kind: 'waker', name: 'sahlu' }, text: 'Wrong project', mentions: [], createdAt: new Date().toISOString() }], 'P-ALPHA');
  assert.equal(a.chatSessions.get('P-ALPHA').messages.length, 1);
  assert.equal(a.chatSessions.get('P-BETA').messages.length, 1);
  assert.equal(a.chatSessions.get('P-ALPHA').messages[0].text, 'Alpha brief');
  assert.equal(a.chatSessions.get('P-BETA').messages[0].text, 'Beta brief');
});

test('MOCK development only: every WORKING agent walks unobstructed and sits squarely at their desk; indoor discussions animate turns', () => {
  const m = make();
  const testIds = ['sahlu', 'lira', 'max', 'lewis', 'indah', 'galih'];
  for (const id of testIds) {
    const a = m.get(id);
    a.enabled = true; a.status = 'IDLE';
    m.chooseSpot(a, true);
    m.applyEvent({ agent_id: id, status: 'WORKING', task: `Build ${id}`, timestamp: new Date().toISOString() });
  }
  tick(m, 14);
  for (const id of testIds) {
    const a = m.get(id);
    assert.equal(a.status, 'WORKING');
    assert.equal(Math.hypot(a.x - a.desk.x, a.y - a.desk.y), 0, `${id} sits squarely at desk`);
    assert.equal(a.dir, 'up', `${id} faces monitor when seated`);
    assert.equal(a.pose, 'sit_type');
  }
  const m2 = make();
  const count = m2.startMeetingHuddle(4);
  assert.equal(count, 4);
  tick(m2, 12);
  const inMeeting = m2.agents.filter(a => a.chatGroup === 'meeting' && !a.path.length);
  assert.equal(inMeeting.length, 4, 'all 4 huddle agents arrived at Meeting Room chairs');
  assert.equal(inMeeting.filter(a => a.speaking).length, 1, 'exactly one active speaker per turn');
  assert.ok(inMeeting.every(a => a.chatBubble.length > 0), 'all discussion participants show speech/listening bubbles');
  const firstSpeaker = inMeeting.find(a => a.speaking).id;
  tick(m2, 2.6);
  const nextSpeaker = inMeeting.find(a => a.speaking).id;
  assert.notEqual(nextSpeaker, firstSpeaker, 'speaker alternates on the next discussion beat');
});
