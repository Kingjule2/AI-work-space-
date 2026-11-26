(() => {
  let busy = false;
  async function readJSON(path) {
    const response = await fetch(path, { credentials: 'same-origin', signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'Sign in to QoderWake in this tab first.' : `QoderWake returned ${response.status}.`);
    const result = await response.json();
    if (!result.success) throw new Error('QoderWake did not return an authenticated result.');
    return result.data;
  }
  async function snapshot() {
    if (busy) return;
    busy = true;
    try {
      const { enabled } = await chrome.storage.local.get('enabled');
      if (!enabled) return;
      const [roster, active, waiting, failed, recent] = await Promise.all([
        readJSON('/api/agents'),
        readJSON('/api/board/tasks?status=running&period=30d&offset=0&limit=100'),
        readJSON('/api/board/tasks?status=waiting&period=30d&offset=0&limit=100'),
        readJSON('/api/board/tasks?status=failed%2Ccancelled&period=30d&offset=0&limit=100'),
        readJSON('/api/board/tasks?period=30d&offset=0&limit=100')
      ]);
      if (!Array.isArray(roster) || ![active, waiting, failed, recent].every(data => Array.isArray(data.items))) throw new Error('QoderWake response format changed. Bridge paused.');
      if ([active, waiting, failed, recent].some(data => data.hasMore)) throw new Error('Task list exceeds 100 results. Bridge paused to avoid an incomplete live view.');
      const unique = new Map([...recent.items, ...failed.items, ...active.items, ...waiting.items].map(t => [t.id, t]));
      const agents = roster.filter(a => a.name !== 'Waker Assistant').map(a => ({ id: a.agentId, name: a.name }));
      const tasks = [...unique.values()].map(t => ({ id: t.id, agentId: t.assignee?.id || t.agent?.id || '', title: t.title || '', status: t.status, updatedAt: t.updatedAt || '', url: t.links?.primaryUrl || '' }));
      await chrome.runtime.sendMessage({ type: 'JADIDULU_SNAPSHOT', snapshot: { agents, tasks } });
    } catch (error) {
      try { await chrome.runtime.sendMessage({ type: 'JADIDULU_SNAPSHOT', error: error.message }); } catch { /* Reloading an extension invalidates its previous content-script context. */ }
    } finally { busy = false; }
  }
  chrome.runtime.onMessage.addListener(message => { if (message.type === 'JADIDULU_REFRESH') snapshot(); });
  chrome.storage.onChanged.addListener(changes => { if (changes.enabled || changes.pairingCode) snapshot(); });
  snapshot();
  setInterval(snapshot, 5000);
})();
