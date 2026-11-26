import { STATUSES } from './model.mjs';

export const WAKE_URL = 'http://127.0.0.1:19820/work-management?machineId=b53ef4bd-28e2-44ee-8d53-483b4e9b3e1a';
export const WAKE_ORIGIN = 'http://127.0.0.1:19820';
export const ACTIONS = ['assign', 'pause', 'resume', 'stop', 'approve', 'reject'];
export function normalizeProjectName(value) {
  const clean = String(value || '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  if (clean.length > 60 || /[<>:"/\\|?*\x00-\x1f]/.test(clean) || clean.includes('..')) {
    throw new Error('Gunakan nama project huruf, angka, spasi, atau tanda hubung (tanpa karakter / \\ .).');
  }
  return clean;
}
export function normalizeProjectId(value) {
  const raw = String(value || '').trim();
  if (!raw || raw.length > 60 || !/^[A-Za-z0-9][A-Za-z0-9 _-]{0,59}$/.test(raw)) {
    throw new Error('Gunakan nama project atau project_id yang valid (huruf, angka, spasi, atau tanda hubung, mis. TESTING atau P-VENDOR).');
  }
  const slug = raw.toUpperCase().replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  const projectId = slug.startsWith('P-') ? slug : `P-${slug}`;
  if (!/^P-[A-Z0-9](?:[A-Z0-9-]{0,38}[A-Z0-9])?$|^P-[A-Z0-9]$/.test(projectId)) {
    throw new Error('Use a project_id such as P-VENDOR: P- followed by letters, numbers or hyphens (max 40 chars).');
  }
  return projectId;
}

export function mapWakeStatus(status) {
  const map = { running: 'WORKING', pending: 'IDLE', waiting: 'WAITING_APPROVAL', failed: 'ERROR', cancelled: 'STOPPED', done: 'IDLE', paused: 'PAUSED', blocked: 'BLOCKED' };
  return map[status] || 'IDLE';
}

export function normalizeWakeSnapshot(snapshot, roster) {
  const events = [];
  const priority = { waiting: 6, running: 5, blocked: 4, paused: 3, pending: 2, failed: 0, done: 0, cancelled: 0 };
  for (const a of roster) {
    const matches = snapshot.agents.filter(r => r.name.toLowerCase().trim() === a.name.toLowerCase());
    const remote = matches.length === 1 ? matches[0] : null;
    if (!remote) {
      events.push({ agent_id: a.id, local_id: a.id, team: a.team, status: 'UNMAPPED', task: '', artifact: '', timestamp: snapshot.timestamp });
      continue;
    }
    const tasks = snapshot.tasks
      .filter(t => t.agentId === remote.id)
      .sort((a, b) => (priority[b.status] ?? -1) - (priority[a.status] ?? -1) || Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0));
    const task = tasks[0];
    const done = tasks.find(t => t.status === 'done');
    events.push({
      agent_id: remote.id,
      local_id: a.id,
      team: a.team,
      status: task ? mapWakeStatus(task.status) : 'IDLE',
      task: task && !['done', 'cancelled'].includes(task.status) ? task.title : '',
      artifact: done?.title || '',
      timestamp: snapshot.timestamp,
      live_url: task?.url || '',
      remote_id: remote.id
    });
  }
  return events;
}

export class WorkforceAdapter extends EventTarget {
  constructor(model) {
    super();
    this.model = model;
    this.mode = 'live';
    this.connected = false;
    this.lastSnapshot = null;
    this.lastSeen = 0;
    this.source = null;
    this.matchedCount = 0;
    this.rosterState = { roster: [], planned: [], stale: true, offline: true, error: 'Belum disinkronkan.' };
    this.bridgeConnected = false;
    this.rosterTimer = null;
    this.focusRefresh = null;
    this.projectId = '';
    this.chatSessions = new Map();
    this.chat = { status: 'waiting', group: null, messages: [], runs: [], model: null, error: '' };
    this.projectFiles = { projectId: '', folder: '', exists: false, files: [], entryHtml: '', previewUrl: '' };
    this.knownProjects = [];
    this.officeKey = '';
    this.openingChats = new Map();
    this.connectionEpoch = 0;
    this.chatDrivenIds = new Set();
  }

  connect() {
    if (location.protocol === 'file:') {
      this.chat.status = 'error';
      this.chat.error = 'Start the local office server with npm start and open http://127.0.0.1:19821 to connect QoderWake.';
      this.dispatchEvent(new CustomEvent('chat', { detail: { fresh: [] } }));
      return;
    }
    this.refreshRoster();
    this.rosterTimer = setInterval(() => this.refreshRoster(), 30000);
    this.focusRefresh = () => this.refreshRoster();
    window.addEventListener('focus', this.focusRefresh);
    this.source = new EventSource('/api/events');
    this.source.addEventListener('roster', event => {
      try { this.applyRosterState(JSON.parse(event.data)); } catch { /* Invalid roster events are ignored. */ }
    });
    this.source.onopen = () => { if (this.connected && this.projectId) this.openChat(); };
    this.source.addEventListener('chat', e => {
      try {
        const data = JSON.parse(e.data);
        const projectId = normalizeProjectId(data.projectId);
        if (!Array.isArray(data.messages)) return;
        if (!this.chatSessions.has(projectId)) this.chatSessions.set(projectId, { status: 'waiting', group: null, messages: [], runs: [], model: null, error: '' });
        const session = this.chatSessions.get(projectId);
        if (data.reset) { session.messages = []; session.group = data.group || null; }
        if (Array.isArray(data.runs)) session.runs = data.runs;
        if (data.model) session.model = data.model;
        const fresh = this.mergeChat(data.messages, projectId);
        if (projectId === this.projectId) {
          this.syncChatActivity(projectId);
          this.dispatchEvent(new CustomEvent('chat', { detail: { fresh: data.reset ? [] : fresh } }));
        }
      } catch { /* Malformed or unscoped chat events are ignored. */ }
    });
    this.source.addEventListener('snapshot', e => {
      try {
        const snapshot = JSON.parse(e.data);
        if (!Array.isArray(snapshot.agents) || !Array.isArray(snapshot.tasks)) return;
        if (!Number.isFinite(snapshot.receivedAt) || !Number.isFinite(Date.parse(snapshot.timestamp)) || Date.now() - snapshot.receivedAt >= 20000 || snapshot.receivedAt > Date.now() + 1000) { this.markDisconnected(); return; }
        this.syncSnapshot(snapshot);
        this.lastSnapshot = snapshot;
        this.lastSeen = snapshot.receivedAt;
        this.bridgeConnected = true;
        if (this.projectId && this.chat.status === 'waiting') this.openChat();
        this.dispatchEvent(new Event('connection'));
      } catch { this.markDisconnected(); }
    });
    this.source.addEventListener('disconnected', () => this.markDisconnected());
    this.source.onerror = () => this.markDisconnected();
    this.healthTimer = setInterval(() => {
      if (this.connected && this.bridgeConnected && Date.now() - this.lastSeen >= 20000) this.markDisconnected();
    }, 4000);
  }

  markDisconnected() {
    this.bridgeConnected = false;
    this.connected = !this.rosterState.stale;
    this.matchedCount = this.model.agents.length;
    if (this.rosterState.stale) {
      for (const session of this.chatSessions.values()) { session.status = 'waiting'; session.error = this.rosterState.error || 'QoderWake offline.'; }
      this.chat.status = 'waiting';
      this.chat.error = this.rosterState.error || 'QoderWake offline.';
      this.model.seed();
    }
    this.model.changed();
    this.dispatchEvent(new Event('connection'));
  }

  applyRosterState(data) {
    if (!data || !Array.isArray(data.roster) || !Array.isArray(data.planned)) return;
    if (this.rosterState.stale !== data.stale) this.connectionEpoch++;
    this.rosterState = data;
    this.connected = !data.stale;
    this.matchedCount = data.roster.length;
    if (data.stale) {
      for (const session of this.chatSessions.values()) { session.status = 'waiting'; session.error = data.error || 'QoderWake offline.'; }
      this.chat.status = 'waiting';
      this.chat.error = data.error || 'QoderWake offline.';
      this.model.seed();
    }
    this.dispatchEvent(new CustomEvent('roster', { detail: data }));
    this.dispatchEvent(new Event('connection'));
    if (!data.stale && this.projectId && this.chat.status === 'waiting') this.openChat();
  }

  async refreshRoster(force = false) {
    try {
      const response = await fetch(`/api/roster${force ? '?resync=1' : ''}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Offline');
      const data = await response.json();
      this.applyRosterState(data);
      return data;
    } catch {
      const data = { ...this.rosterState, stale: true, offline: true, error: 'QoderWake offline. Menampilkan data terakhir.' };
      this.applyRosterState(data);
      return data;
    }
  }

  mergeChat(messages, projectId = this.projectId) {
    const session = this.chatSessions.get(projectId);
    if (!session) return [];
    const fresh = messages.filter(m => m?.projectId === projectId && Number.isInteger(m?.seq) && !session.messages.some(known => known.seq === m.seq));
    session.messages.push(...fresh);
    session.messages.sort((a, b) => a.seq - b.seq);
    return fresh;
  }

  setProject(value) {
    const projectId = normalizeProjectId(value);
    if (!this.chatSessions.has(projectId)) this.chatSessions.set(projectId, { status: 'waiting', group: null, messages: [], runs: [], model: null, error: '' });
    this.projectId = projectId;
    this.chat = this.chatSessions.get(projectId);
    this.dispatchEvent(new CustomEvent('chat', { detail: { fresh: [] } }));
    this.refreshProjectFiles(projectId).catch(() => {});
    return this.openChat();
  }

  async createProject(rawInput, customName = '') {
    const trimmed = String(rawInput || '').trim();
    const projectId = normalizeProjectId(trimmed);
    const displayName = normalizeProjectName(customName || (trimmed.toUpperCase() !== projectId ? trimmed : ''));
    if (!this.connected) throw new Error('QoderWake sedang offline. Pastikan QoderWake aktif sebelum membuat grup proyek baru.');
    for (let attempt = 0; ; attempt++) {
      if (!this.officeKey) {
        const config = await fetch('/api/config');
        if (!config.ok) throw new Error('The office server is not reachable.');
        this.officeKey = (await config.json()).pairingCode;
      }
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'X-Office-Key': this.officeKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, name: displayName })
      });
      if (response.status === 401 && !attempt) { this.officeKey = ''; continue; }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `The office server returned ${response.status}.`);
      if (!this.chatSessions.has(projectId)) this.chatSessions.set(projectId, { status: 'ready', group: null, messages: [], runs: [], model: null, error: '' });
      const session = this.chatSessions.get(projectId);
      session.group = data.group || session.group;
      if (data.model) session.model = data.model;
      session.status = 'ready';
      session.error = '';
      this.projectId = projectId;
      this.chat = session;
      if (!this.knownProjects.includes(projectId)) this.knownProjects = [...this.knownProjects, projectId].sort();
      this.dispatchEvent(new CustomEvent('chat', { detail: { fresh: [] } }));
      this.refreshKnownProjects().catch(() => {});
      this.refreshProjectFiles(projectId).catch(() => {});
      return data;
    }
  }

  async refreshKnownProjects() {
    if (typeof location === 'undefined' || location.protocol === 'file:') return [];
    try {
      const response = await fetch('/api/projects', { cache: 'no-store' });
      if (!response.ok) return this.knownProjects;
      const data = await response.json();
      if (Array.isArray(data.projects)) this.knownProjects = data.projects;
    } catch { /* Ignore */ }
    return this.knownProjects;
  }

  async refreshProjectFiles(projectId = this.projectId) {
    if (typeof location === 'undefined' || location.protocol === 'file:' || !projectId) return this.projectFiles;
    const id = normalizeProjectId(projectId);
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        if (!this.officeKey) {
          const config = await fetch('/api/config');
          if (!config.ok) return this.projectFiles;
          this.officeKey = (await config.json()).pairingCode;
        }
        const response = await fetch(`/api/projects/files?project_id=${encodeURIComponent(id)}`, {
          headers: { 'X-Office-Key': this.officeKey },
          cache: 'no-store'
        });
        if (response.status === 401 && !attempt) { this.officeKey = ''; continue; }
        if (!response.ok) return this.projectFiles;
        const data = await response.json();
        if (id === this.projectId) {
          this.projectFiles = data;
          this.dispatchEvent(new CustomEvent('project-files', { detail: data }));
        }
        return data;
      }
    } catch { /* Ignore transient file list errors. */ }
    return this.projectFiles;
  }

  async chatRequest(body, projectId = this.projectId) {
    const id = normalizeProjectId(projectId);
    for (let attempt = 0; ; attempt++) {
      if (!this.officeKey) {
        const config = await fetch('/api/config');
        if (!config.ok) throw new Error('The office server is not reachable.');
        this.officeKey = (await config.json()).pairingCode;
      }
      const response = await fetch(`/api/chat?project_id=${encodeURIComponent(id)}`, {
        method: body ? 'POST' : 'GET',
        headers: { 'X-Office-Key': this.officeKey, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify({ ...body, project_id: id }) : undefined
      });
      if (response.status === 401 && !attempt) { this.officeKey = ''; continue; }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `The office server returned ${response.status}.`);
      return data;
    }
  }

  async openChat() {
    if (!this.connected || !this.projectId) return;
    const projectId = this.projectId;
    if (this.openingChats.has(projectId)) return this.openingChats.get(projectId);
    const epoch = this.connectionEpoch;
    const session = this.chatSessions.get(projectId);
    session.status = 'loading';
    session.error = '';
    this.dispatchEvent(new CustomEvent('chat', { detail: { fresh: [] } }));
    const opening = (async () => {
      try {
        const data = await this.chatRequest(null, projectId);
        if (!this.connected || epoch !== this.connectionEpoch) return;
        if (data.projectId !== projectId) throw new Error('QoderWake returned a different project context.');
        session.group = data.group;
        if (Array.isArray(data.runs)) session.runs = data.runs;
        if (data.model) session.model = data.model;
        this.mergeChat(data.messages, projectId);
        session.status = 'ready';
        if (projectId === this.projectId) this.syncChatActivity(projectId);
      } catch (error) {
        if (!this.connected || epoch !== this.connectionEpoch) return;
        session.status = 'error';
        session.error = error instanceof TypeError ? 'The office server is not reachable. Start it with npm start.' : error.message;
      } finally {
        this.openingChats.delete(projectId);
        if (projectId === this.projectId) this.dispatchEvent(new CustomEvent('chat', { detail: { fresh: [] } }));
      }
    })();
    this.openingChats.set(projectId, opening);
    return opening;
  }

  async sendChat(text, projectId = this.projectId, options = {}) {
    const id = normalizeProjectId(projectId);
    if (id !== this.projectId) await this.setProject(id);
    if (!this.connected || this.chat.status !== 'ready') throw new Error('Connect the live bridge and verify the D-drive runtime before sending.');
    const payload = { text };
    if (options.mention) payload.mention = options.mention;
    if (options.founderApproval) payload.founderApproval = true;
    const result = await this.chatRequest(payload, id);
    const targetName = result?.target || result?.intake?.name || '';
    if (targetName) {
      const targetAgent = this.model.agents.find(a => a.name.toLowerCase() === String(targetName).toLowerCase());
      if (targetAgent) {
        this.chatDrivenIds.add(targetAgent.id);
        this.receive({
          agent_id: targetAgent.id,
          status: 'WORKING',
          task: `${id} · ${String(text).replace(/\s+/g, ' ').slice(0, 120)}`,
          timestamp: new Date().toISOString()
        });
      }
    }
    return result;
  }

  syncChatActivity(projectId = this.projectId) {
    if (!projectId || !this.chatSessions.has(projectId)) return;
    if (!this.chatDrivenIds) this.chatDrivenIds = new Set();
    const session = this.chatSessions.get(projectId);
    const runs = Array.isArray(session?.runs) ? session.runs : [];
    const messages = Array.isArray(session?.messages) ? session.messages : [];
    const now = Date.now();
    const workingByName = new Map();
    const errorByName = new Map();

    // 1. Live QoderWake runs (sorted newest first)
    const seenWakerRun = new Set();
    for (const run of runs) {
      const name = String(run?.waker || '').toLowerCase();
      if (!name || seenWakerRun.has(name)) continue;
      seenWakerRun.add(name);
      if (['running', 'pending', 'queued'].includes(run.status)) {
        workingByName.set(name, `${projectId} · Sedang memproses tugas di QoderWake`);
      } else if (run.status === 'failed') {
        const age = now - Date.parse(run.updatedAt || 0);
        if (Number.isFinite(age) && age < 180000) {
          errorByName.set(name, `${projectId} · ${run.error || 'Run gagal'}`);
        }
      }
    }

    // 2. Recent message handoffs & active responder in the current conversation
    const recentMsgs = messages.slice(-3);
    for (const msg of recentMsgs) {
      const msgAge = now - Date.parse(msg.createdAt || 0);
      if (!Number.isFinite(msgAge) || msgAge < -60000 || msgAge > 900000) continue;
      const snippet = `${projectId} · ${String(msg.text || '').replace(/\s+/g, ' ').slice(0, 110)}`;
      if (msg === messages[messages.length - 1]) {
        for (const mentioned of (msg.mentions || [])) {
          const mName = String(mentioned || '').toLowerCase();
          if (mName && !workingByName.has(mName)) workingByName.set(mName, snippet);
        }
      }
      if (msg.from?.kind === 'waker') {
        const sName = String(msg.from.name || '').toLowerCase();
        if (sName && !workingByName.has(sName)) workingByName.set(sName, snippet);
      }
    }

    const ts = new Date().toISOString();
    for (const agent of this.model.agents) {
      const key = agent.name.toLowerCase();
      if (workingByName.has(key)) {
        this.chatDrivenIds.add(agent.id);
        this.receive({ agent_id: agent.id, status: 'WORKING', task: workingByName.get(key), timestamp: ts });
      } else if (errorByName.has(key)) {
        this.chatDrivenIds.add(agent.id);
        this.receive({ agent_id: agent.id, status: 'ERROR', task: errorByName.get(key), timestamp: ts });
      } else if (this.chatDrivenIds.has(agent.id) && !this.bridgeConnected) {
        this.chatDrivenIds.delete(agent.id);
        this.receive({ agent_id: agent.id, status: 'IDLE', task: '', artifact: `${projectId} · Selesai`, timestamp: ts });
      }
    }
    this.model.changed();
  }

  syncSnapshot(snapshot) {
    const events = normalizeWakeSnapshot(snapshot, this.model.agents);
    this.matchedCount = 0;
    events.forEach(event => {
      const a = this.model.get(event.local_id || event.agent_id);
      if (a) {
        a.remoteId = event.remote_id || null;
        a.enabled = Boolean(a.remoteId);
        if (!a.enabled) { this.model.releaseSpot(a); a.path = []; a.activity = 'Not present in the current QoderWake snapshot'; }
        if (a.remoteId) this.matchedCount++;
        a.liveUrl = this.safeUrl(event.live_url);
      }
      if (event.status === 'IDLE' && a && this.chatDrivenIds?.has(a.id)) return;
      this.receive(event);
    });
    this.model.approvals = this.model.agents
      .filter(a => a.status === 'WAITING_APPROVAL')
      .map(a => ({
        id: a.id,
        agentId: a.id,
        title: 'QoderWake needs your input',
        artifact: a.task || 'Pending task',
        detail: 'QoderWake reports a waiting task, not a verified founder gate. Open the official task to inspect its actual request. No approval is sent by this office.',
        live: true
      }));
    this.model.changed();
  }

  safeUrl(value) {
    if (!value) return '';
    try {
      const url = new URL(value, WAKE_ORIGIN);
      return url.origin === WAKE_ORIGIN && url.pathname.startsWith('/conversations/') ? url.href : '';
    } catch { return ''; }
  }

  receive(event) {
    if (!event || typeof event.agent_id !== 'string' || !STATUSES[event.status] || !Number.isFinite(Date.parse(event.timestamp))) return false;
    const accepted = this.model.applyEvent(event);
    if (accepted) this.dispatchEvent(new CustomEvent('workforce-event', { detail: event }));
    return accepted;
  }

  command(command) {
    if (!command || !ACTIONS.includes(command.action) || typeof command.agent_id !== 'string') throw new Error('Invalid workforce command.');
    const a = this.model.agents.find(a => a.id === command.agent_id || a.remoteId === command.agent_id);
    if (!a) throw new Error('Waker not found.');
    if (!this.connected || !a.remoteId) throw new Error('This role has not been connected to a current QoderWake snapshot.');
    this.dispatchEvent(new CustomEvent('command-handoff', {
      detail: { command, url: a.liveUrl || `${WAKE_ORIGIN}/conversations/entry/latest?waker=${encodeURIComponent(a.remoteId)}` }
    }));
    return { sent: false, requiresQoderWake: true };
  }

  disconnect() { this.source?.close(); clearInterval(this.healthTimer); clearInterval(this.rosterTimer); if (this.focusRefresh) window.removeEventListener('focus', this.focusRefresh); this.connectionEpoch++; this.rosterState = { ...this.rosterState, stale: true, offline: true }; this.markDisconnected(); }
}
