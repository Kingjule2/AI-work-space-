export const ROLE_DEFINITIONS = Object.freeze({
  intake: { label: 'Q&A Specialist', squad: 'Intake' },
  product: { label: 'Product Manager', squad: 'Product' },
  estimate: { label: 'Estimator & Proposal', squad: 'Estimation' },
  plan: { label: 'Project Administrator', squad: 'Project Administration' },
  design: { label: 'UI/UX', squad: 'UI/UX' },
  frontend: { label: 'Frontend', squad: 'Frontend' },
  backend: { label: 'Backend', squad: 'Backend' },
  qa: { label: 'QA', squad: 'QA' },
  devops: { label: 'DevOps', squad: 'DevOps' },
  change: { label: 'Change Request Handler', squad: 'Change Requests' }
});
export const WORKFLOW_ROLES = Object.freeze(Object.keys(ROLE_DEFINITIONS));
const SQUAD_ROLES = new Map(Object.entries(ROLE_DEFINITIONS).map(([key, definition]) => [definition.squad, key]));
const ROLE_ALIASES = new Map([
  ['q&a specialist', 'intake'],
  ['product manager', 'product'],
  ['estimator & proposal', 'estimate'],
  ['project administrator', 'plan'],
  ['change request handler', 'change']
]);
const normalizeName = value => String(value || '').trim().toLowerCase();

export function roleKeyFor(metadata = {}) {
  if (SQUAD_ROLES.has(metadata.squad)) return SQUAD_ROLES.get(metadata.squad);
  const role = normalizeName(metadata.role);
  if (ROLE_ALIASES.has(role)) return ROLE_ALIASES.get(role);
  if (role.includes('ui/ux') || role.includes('user experience') || role.includes('prototype designer')) return 'design';
  if (role.includes('frontend') || role.includes('design system') || role.includes('accessibility') || role.includes('api integration')) return 'frontend';
  if (role.includes('backend') || role.includes('database') || role.includes('security and integration')) return 'backend';
  if (role.includes('devops') || role.includes('infrastructure') || role.includes('monitoring') || role.includes('ci/cd')) return 'devops';
  if (role.includes('test') || role.includes('quality assurance') || role === 'qa lead') return 'qa';
  return 'unassigned';
}

export function resolveRoleWakers(liveWakers, roleKey) {
  return liveWakers.filter(waker => waker.roleKey === roleKey);
}

export function missingRoleMessage(roleKey) {
  const label = ROLE_DEFINITIONS[roleKey]?.label || roleKey;
  return `Belum ada Waker dengan peran ${label} di QoderWake.`;
}

export function missingLaterRoles(liveWakers) {
  return WORKFLOW_ROLES.slice(1).filter(roleKey => !resolveRoleWakers(liveWakers, roleKey).length).map(roleKey => ({ roleKey, label: ROLE_DEFINITIONS[roleKey].label }));
}

export function mergeLiveWakers(liveRecords, metadataRecords) {
  if (!Array.isArray(liveRecords) || !Array.isArray(metadataRecords)) throw new Error('Invalid Waker resolver input.');
  const metadata = new Map(metadataRecords.map(record => [normalizeName(record.name), record]));
  return liveRecords.map((remote, index) => {
    const name = String(remote.name || '').trim();
    if (!name || typeof remote.agentId !== 'string' || !remote.agentId) throw new Error('Every live Waker needs a name and QoderWake ID.');
    const configured = metadata.get(normalizeName(name));
    const role = configured?.role || remote.description || 'Unassigned';
    const roleKey = configured ? roleKeyFor(configured) : roleKeyFor({ role });
    return {
      name,
      role,
      team: configured?.team || 'Unassigned',
      squad: configured?.squad || 'Unassigned',
      default_pod: configured?.default_pod ?? null,
      shared: configured?.shared ?? false,
      status: configured ? 'LIVE_VERIFIED' : 'LIVE_UNASSIGNED',
      agentId: remote.agentId,
      remoteId: remote.agentId,
      selectableForTeam: remote.selectableForTeam !== false,
      roleKey,
      description: remote.description || configured?.role || '',
      avatarVariant: index
    };
  });
}

export function plannedWakers(metadataRecords, liveWakers) {
  const liveNames = new Set(liveWakers.map(waker => normalizeName(waker.name)));
  return metadataRecords.filter(record => !liveNames.has(normalizeName(record.name)));
}

export function createLiveDirectory({ cli, readMetadata, refreshMs = 30000 }) {
  let state = { roster: [], planned: [], stale: true, offline: true, lastSynced: null, error: 'Belum disinkronkan.' };
  let refreshing = null, timer = null;
  const listeners = new Set();
  const snapshot = () => ({ ...state, source: 'QoderWake waker list', runtimeVerified: !state.stale, count: state.roster.length });
  const emit = () => { const data = snapshot(); for (const listener of listeners) listener(data); };

  async function refresh() {
    if (refreshing) return refreshing;
    refreshing = (async () => {
      try {
        const [liveRecords, metadataRecords] = await Promise.all([cli.run(['waker', 'list']), readMetadata()]);
        const roster = mergeLiveWakers(liveRecords, metadataRecords);
        state = { roster, planned: plannedWakers(metadataRecords, roster), stale: false, offline: false, lastSynced: new Date().toISOString(), error: '' };
      } catch {
        state = { ...state, stale: true, offline: true, error: 'QoderWake offline. Menampilkan data terakhir.' };
      }
      emit();
      return snapshot();
    })().finally(() => { refreshing = null; });
    return refreshing;
  }

  return {
    refresh,
    snapshot,
    onChange(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    start() { refresh(); timer = setInterval(refresh, refreshMs); timer.unref(); },
    stop() { clearInterval(timer); timer = null; }
  };
}
