import test from 'node:test';
import assert from 'node:assert/strict';
import { ROLE_DEFINITIONS, WORKFLOW_ROLES, createLiveDirectory, mergeLiveWakers, missingLaterRoles, missingRoleMessage, plannedWakers, resolveRoleWakers } from '../waker-resolver.mjs';

const metadataFor = (name, roleKey) => ({ name, role: ROLE_DEFINITIONS[roleKey].label, team: 'Project Room', squad: ROLE_DEFINITIONS[roleKey].squad, default_pod: null, shared: false, status: 'fixture' });
const liveFor = (name, roleKey) => ({ name, agentId: `id-${name}`, description: ROLE_DEFINITIONS[roleKey]?.label || '', selectableForTeam: true });

test('TEST FIXTURE: all roles resolve by metadata and QoderWake ID', () => {
  const metadata = WORKFLOW_ROLES.map(roleKey => metadataFor(`live-${roleKey}`, roleKey));
  const live = WORKFLOW_ROLES.map(roleKey => liveFor(`live-${roleKey}`, roleKey));
  const resolved = mergeLiveWakers(live, metadata);
  assert.equal(resolved.length, WORKFLOW_ROLES.length);
  for (const roleKey of WORKFLOW_ROLES) assert.equal(resolveRoleWakers(resolved, roleKey)[0].agentId, `id-live-${roleKey}`);
  assert.deepEqual(missingLaterRoles(resolved), []);
  assert.deepEqual(plannedWakers(metadata, resolved), []);
});

test('TEST FIXTURE: only intake is enough to accept and later missing roles are explicit', () => {
  const resolved = mergeLiveWakers([liveFor('live-intake', 'intake')], [metadataFor('live-intake', 'intake'), metadataFor('planned-product', 'product')]);
  assert.equal(resolveRoleWakers(resolved, 'intake').length, 1);
  assert.ok(missingLaterRoles(resolved).some(role => role.roleKey === 'product'));
  assert.deepEqual(plannedWakers([metadataFor('planned-product', 'product')], resolved).map(waker => waker.name), ['planned-product']);
});

test('TEST FIXTURE: missing intake returns an Indonesian role error, never a fixed name', () => {
  assert.equal(resolveRoleWakers([], 'intake').length, 0);
  assert.equal(missingRoleMessage('intake'), 'Belum ada Waker dengan peran Q&A Specialist di QoderWake.');
});

test('TEST FIXTURE: an unknown extra live Waker remains visible as Unassigned', () => {
  const [unknown] = mergeLiveWakers([{ name: 'unknown-live', agentId: 'remote-extra', description: 'Frontend Feature Developer', selectableForTeam: true }], []);
  assert.equal(unknown.team, 'Unassigned');
  assert.equal(unknown.roleKey, 'frontend');
  assert.equal(unknown.agentId, 'remote-extra');
});

test('TEST FIXTURE: QoderWake offline keeps only the last known live list and marks it stale', async () => {
  let online = false;
  const cli = { run: async () => { if (!online) throw new Error('offline fixture'); return [liveFor('live-intake', 'intake')]; } };
  const directory = createLiveDirectory({ cli, readMetadata: async () => [metadataFor('live-intake', 'intake')] });
  assert.deepEqual((await directory.refresh()).roster, []);
  online = true;
  const live = await directory.refresh();
  assert.equal(live.count, 1);
  assert.equal(live.stale, false);
  online = false;
  const offline = await directory.refresh();
  assert.equal(offline.count, 1);
  assert.equal(offline.stale, true);
  assert.equal(offline.roster[0].agentId, 'id-live-intake');
});
