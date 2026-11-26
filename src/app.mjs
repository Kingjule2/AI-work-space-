import { OfficeModel, TEAMS, STATUSES, UNASSIGNED_TEAM, configureRoster } from './model.mjs';
import { EstateScene } from './scene.mjs';
import { WorkforceAdapter, WAKE_URL, normalizeProjectId } from './adapter.mjs';

const ICONS = {
  grid: '<rect x="3" y="3" width="6" height="6"/><rect x="15" y="3" width="6" height="6"/><rect x="3" y="15" width="6" height="6"/><rect x="15" y="15" width="6" height="6"/>',
  estate: '<path d="m3 10 9-7 9 7v11H3V10Z"/><path d="M9 21v-7h6v7M7 9h10M12 3v6"/>',
  inbox: '<path d="M4 4h16l2 12v4H2v-4L4 4Z"/><path d="M2 15h6l2 3h4l2-3h6M8 8h8M8 11h8"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8l10-5Zm-10 9 10 5 10-5M2 16l10 5 10-5"/>',
  wallet: '<rect x="3" y="5" width="18" height="15"/><path d="M3 7V4l13-2v3m0 6h6v6h-6v-6Z"/><path d="M18 14h.01"/>',
  command: '<rect x="8" y="8" width="8" height="8"/><path d="M8 8H5V5h3v3Zm8 0V5h3v3h-3ZM8 16v3H5v-3h3Zm8 0h3v3h-3v-3Z"/>',
  shield: '<path d="m12 2 8 3v6c0 5-4 8-8 11-4-3-8-6-8-11V5l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  moon: '<path d="M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-right': '<path d="m9 6 6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  pause: '<path d="M8 5v14M16 5v14" stroke-width="3"/>',
  stop: '<rect x="6" y="6" width="12" height="12"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  coffee: '<path d="M4 8h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Zm12 1h2a3 3 0 0 1 0 6h-2M7 2v3m5-3v3M2 22h18"/>',
  location: '<path d="M19 10c0 5-7 12-7 12S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  maximize: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  activity: '<path d="M2 12h4l3-8 6 16 3-8h4"/>',
  expand: '<path d="M4 9V4h5m6 16h5v-5M4 4l6 6m10 10-6-6"/>',
  file: '<path d="M14 2H5v20h14V7l-5-5Zm0 0v5h5M8 12h8m-8 4h8"/>',
  arrow: '<path d="M3 12h18m-6-6 6 6-6 6"/>',
  external: '<path d="M14 3h7v7M21 3 10 14M10 3H3v18h18v-7"/>',
  users: '<circle cx="9" cy="7" r="3.5"/><path d="M2 21v-3a7 7 0 0 1 14 0v3M17 4a3.5 3.5 0 0 1 0 7m1 3a6 6 0 0 1 4 6"/>',
  plug: '<path d="m8 3 4 4M17 4l3 3M7 7l10 10M9 9l-4 4a5 5 0 0 0 7 7l4-4M5 20l-3 3M12 7l4-4m1 9 4-4"/>',
  motion: '<path d="M2 8h6m-6 4h4m-4 4h6"/><circle cx="16" cy="12" r="6"/><path d="M16 9v3l2 2"/>',
  chat: '<path d="M4 5h16v11H9l-5 4V5Z"/><path d="M8 9h8M8 12h5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>'
};
const icon = name => `<span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24">${ICONS[name] || ICONS.info}</svg></span>`;
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
$$('[data-icon]').forEach(el => el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[el.dataset.icon] || ICONS.info}</svg>`);

let model, adapter, rosterError = '';
let selectedId = '', selectedTeam = null, expandedTeams = new Set(['intake', 'delivery']), activeTab = 'chat', feedFilter = 'all', search = '', dialogType = '', renderScheduled = false;
let plannedWakers = [];
let lastAnnouncement = '', toastTimer, chatBusy = false, projectCreating = false, chatNote = null, chatShown = '';
const pendingProjectNames = new Map();
const tryNormalizeProject = value => { try { return normalizeProjectId(value); } catch { return ''; } };
const saved = key => { try { return localStorage.getItem(key); } catch { return null; } };
const persist = (key, value) => { try { localStorage.setItem(key, value); } catch { /* Storage unavailable */ } };

$('.app-shell').inert = true;
let scene;
function initializeScene() {
  scene = new EstateScene($('#estate-canvas'), model, selectTarget, () => showApprovals());
  scene.selected = selectedId;
  scene.onZoom = (zoom, pixelScale) => {
    $('#zoom-label').textContent = `${Math.round(zoom * 100)}%`;
    $$('.scale-btn').forEach(b => b.classList.toggle('active', Number(b.dataset.scale) === pixelScale));
  };
  scene.onControlPanel = panelId => {
    if (panelId === 'approve' || panelId === 'reject') showApprovals();
    else showConnection();
  };
}

function avatar(a) {
  const url = scene.getAvatarDataURL(a);
  return url ? `<img class="pixel-avatar" src="${url}" alt="">` : '';
}
function timeText(timestamp) { return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function toast(text) { const el = $('#toast'); el.textContent = text; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => el.hidden = true, 4200); }
function scheduleRender() { if (!renderScheduled) { renderScheduled = true; requestAnimationFrame(() => { renderScheduled = false; render(); }); } }

function switchTab(tab) {
  activeTab = tab;
  $$('[data-panel-tab]').forEach(b => {
    const on = b.dataset.panelTab === tab;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', String(on));
  });
  $$('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== tab; });
  if (tab === 'chat') {
    const thread = $('#chat-thread');
    if (thread) thread.scrollTop = thread.scrollHeight;
  } else if (tab === 'output' && adapter?.projectId) {
    adapter.refreshProjectFiles();
  }
}

function renderDirectory() {
  const focused = document.activeElement?.dataset.waker || document.activeElement?.dataset.team;
  const html = [...TEAMS, UNASSIGNED_TEAM].map(team => {
    const matching = model.agents.filter(a => a.team === team.id && `${a.name} ${a.role} ${team.name} ${team.stage} ${a.unassigned ? 'unassigned' : ''} ${a.placeholder ? 'coming soon' : ''}`.toLowerCase().includes(search));
    if (!matching.length) return '';
    const expanded = expandedTeams.has(team.id) || Boolean(search);
    return `<div class="team-block" style="--team:${team.color}"><button class="team-button" data-team="${team.id}" aria-expanded="${expanded}" aria-controls="team-${team.id}"><span class="team-room-icon">${icon(team.icon)}</span><span class="team-title">${team.name}</span><span class="team-size">${matching.length}</span>${icon(expanded ? 'chevron-down' : 'chevron-right')}</button><div class="team-wakers" id="team-${team.id}" ${expanded ? '' : 'hidden'}>${matching.map(a => `<button class="waker-item ${a.id === selectedId ? 'selected' : ''} ${a.placeholder && !a.enabled ? 'placeholder-item' : ''}" data-waker="${a.id}" aria-label="${escapeHTML(`${a.name}, ${a.role}, ${STATUSES[a.status].label}`)}" aria-pressed="${a.id === selectedId}"><span class="mini-avatar">${avatar(a)}</span><span class="waker-item-text"><span class="waker-item-name">${escapeHTML(a.name)}${a.unassigned ? '<span class="soon-tag">LIVE</span>' : ''}</span><span class="waker-item-role">${escapeHTML(a.role)}</span></span><i class="dot" style="--dot:${STATUSES[a.status].color}"></i></button>`).join('')}</div></div>`;
  }).join('');
  $('#team-directory').innerHTML = html || '<p class="no-results">No Wakers found.<br>Try a name, role, or team.</p>';
  if (focused) $(`#team-directory [data-waker="${focused}"], #team-directory [data-team="${focused}"]`)?.focus({ preventScroll: true });
}

function renderDetails() {
  const a = model.get(selectedId);
  if (!a) {
    $('#map-selected-name').textContent = 'JADIDULU';
    $('#strip-role').textContent = 'Loading office roster…';
    $('#waker-details').innerHTML = '';
    return;
  }
  const team = TEAMS.find(t => t.id === a.team) || TEAMS[0];
  const status = STATUSES[a.status] || STATUSES.UNMAPPED;
  const task = a.status === 'STALE' ? 'Offline · data Waker terakhir; lakukan Resync.' : a.remoteId ? a.task || 'No active task reported by QoderWake.' : 'Configured role only · Not present in the current snapshot.';
  const disabled = !adapter.connected || !a.remoteId;
  const following = scene.followId === a.id;

  // Compact strip inside Chat tab
  $('#strip-avatar').innerHTML = avatar(a);
  $('#map-selected-name').textContent = a.name;
  $('#strip-role').textContent = `${a.role} · ${task}`;
  $('#map-follow').setAttribute('aria-pressed', String(following));
  $('#map-pause').disabled = disabled;
  $('#map-stop').disabled = disabled;
  $('#map-task').disabled = false;

  // Full profile inside Team tab
  $('#waker-details').innerHTML = `<div class="profile-card"><div class="profile-head"><div class="profile-avatar">${avatar(a)}</div><div><h2>${escapeHTML(a.name)}</h2><p class="profile-role">${escapeHTML(a.role)} · ${escapeHTML(team.name)}</p><div class="status-chip" style="color:${status.color}"><i class="dot" style="--dot:${status.color}"></i>${status.label}</div></div></div><p style="font-size:10px;font-weight:700;line-height:1.5">${escapeHTML(task)}</p>${!a.remoteId ? `<p>Configuration: ${escapeHTML(a.configurationStatus)}. No capacity or credit data from the bridge.</p>` : ''}<div class="needs-grid"><div class="need-box"><span>ENG<b>${Math.round(a.needs.energy)}%</b></span><div class="need-bar"><i style="width:${Math.round(a.needs.energy)}%;background:#3b78b8"></i></div></div><div class="need-box"><span>HNG<b>${Math.round(a.needs.hunger)}%</b></span><div class="need-bar"><i style="width:${Math.round(a.needs.hunger)}%;background:#d98a26"></i></div></div><div class="need-box"><span>SOC<b>${Math.round(a.needs.social)}%</b></span><div class="need-bar"><i style="width:${Math.round(a.needs.social)}%;background:#3d8c5a"></i></div></div></div><div class="waker-actions"><button class="button outlined assign-button" data-action="assign" ${disabled ? 'disabled' : ''}>${icon('external')}Open in QoderWake ↗</button><button class="button outlined" data-action="pause" ${disabled ? 'disabled' : ''}>${icon('pause')}Pause ↗</button><button class="button outlined" data-action="stop" ${disabled ? 'disabled' : ''}>${icon('stop')}Stop ↗</button><button class="button primary assign-button" data-action="follow">${icon('location')}${following ? 'Unfollow Waker' : 'Follow on Map'}</button></div></div>`;
}

const capName = value => { const s = String(value || ''); return s ? s[0].toUpperCase() + s.slice(1) : ''; };
const officeName = name => {
  const found = model.agents.find(a => a.name.toLowerCase() === String(name).toLowerCase());
  return found ? capName(found.name) : String(name);
};

function renderChat() {
  const chat = adapter.chat;
  const signature = `${adapter.projectId}|${chat.messages.map(m => `${m.seq}:${m.from.name}:${m.mentions.join()}`).join('|')}`;
  if (signature !== chatShown) {
    const thread = $('#chat-thread'), pinned = !chatShown || thread.scrollHeight - thread.scrollTop - thread.clientHeight < 40;
    thread.innerHTML = chat.messages.map(m => `<div class="chat-message ${m.from.kind === 'human' ? 'mine' : m.from.kind === 'waker' ? '' : 'system'}"><div class="chat-meta"><b>${escapeHTML(m.from.kind === 'human' ? 'You' : officeName(m.from.name))}</b>${m.mentions.length ? `<span class="chat-to">→ ${escapeHTML(m.mentions.map(officeName).join(', '))}</span>` : ''}<time>${timeText(m.createdAt)}</time></div><div class="chat-text">${escapeHTML(m.text)}</div></div>`).join('');
    if (pinned) thread.scrollTop = thread.scrollHeight;
    chatShown = signature;
  }
  const enteredRaw = $('#project-id').value.trim();
  const enteredProject = tryNormalizeProject(enteredRaw);
  const ready = adapter.connected && chat.status === 'ready' && Boolean(adapter.projectId) && enteredProject === adapter.projectId && !rosterError;
  const members = chat.group?.members || [];
  const targetSelect = $('#chat-target');
  const prevTarget = targetSelect.value;
  const optionSig = members.join(',');
  if (targetSelect.dataset.sig !== optionSig) {
    targetSelect.dataset.sig = optionSig;
    targetSelect.innerHTML = `<option value="">To: Intake (default)</option>${members.map(name => `<option value="${escapeHTML(name)}">@${escapeHTML(officeName(name))}</option>`).join('')}`;
    if (members.includes(prevTarget)) targetSelect.value = prevTarget;
  }
  const hasGroup = Boolean(chat.group && members.length);
  const previewUrl = adapter.projectFiles?.projectId === adapter.projectId ? adapter.projectFiles.previewUrl : '';
  $('#chat-route-bar').hidden = !adapter.projectId || (!hasGroup && !previewUrl);
  $('#founder-approve-btn').hidden = !hasGroup || !ready;
  $('#founder-approve-btn').disabled = chatBusy || !ready;
  $('#quick-preview-link').hidden = !previewUrl;
  if (previewUrl) $('#quick-preview-link').href = previewUrl;
  const runs = Array.isArray(chat.runs) ? chat.runs : [];
  const activeRuns = runs.filter(r => ['running', 'queued', 'pending'].includes(r.status));
  const latestRun = runs[0];
  const banner = $('#chat-run-banner');
  if (activeRuns.length) {
    banner.hidden = false;
    banner.className = 'run-banner working';
    banner.textContent = `Sedang berjalan: ${activeRuns.map(r => officeName(r.waker)).join(', ')}…`;
  } else if (latestRun && latestRun.status === 'failed' && (!chat.messages.length || chat.messages[chat.messages.length - 1].from.kind === 'human')) {
    banner.hidden = false;
    banner.className = 'run-banner error';
    banner.textContent = `Run ${officeName(latestRun.waker)} gagal: ${latestRun.error || 'unknown error'}`;
  } else {
    banner.hidden = true;
    banner.textContent = '';
  }
  const modelTag = chat.model?.id ? ` · ${chat.model.id}` : '';
  const note = projectCreating ? { text: 'Membuat project & grup Waker baru di QoderWake…' }
    : chatBusy ? { text: 'Mengirim ke Waker intake… QoderWake perlu waktu untuk memprosesnya.' }
    : rosterError ? { text: rosterError, error: true }
    : !adapter.connected ? { text: adapter.rosterState.error || 'QoderWake offline. Permintaan tidak dikirim.', error: true }
    : chatNote || (!adapter.projectId ? { text: 'Ketik nama project (cth: Testing) lalu klik + Buat untuk langsung bikin grup Waker.' }
    : enteredProject !== adapter.projectId ? { text: 'Tekan Tab/Enter untuk memuat, atau klik + Buat untuk membuat grup baru.' }
    : chat.status === 'error' ? { text: chat.error, error: true }
    : chat.status === 'waiting' ? { text: 'Waiting to open this project conversation.' }
    : !ready ? { text: 'Connecting to QoderWake…' }
    : { text: chat.group ? `“${chat.group.title}” (${chat.group.members.length} Wakers) · uses credits${modelTag}.` : `Klik + Buat atau kirim pesan untuk membuat grup “JADIDULU Office - ${adapter.projectId}”${modelTag}.` });
  $('#chat-state').textContent = note.text; $('#chat-state').classList.toggle('error', Boolean(note.error));
  const busy = chatBusy || projectCreating;
  $('#project-id').readOnly = busy; $('#chat-input').readOnly = busy; $('#chat-send').disabled = busy || !ready;
  const createBtn = $('#project-create-btn');
  if (createBtn) {
    createBtn.disabled = busy || !adapter.connected || Boolean(rosterError);
    createBtn.textContent = projectCreating ? 'Membuat…' : '+ Buat';
  }
  $('#chat-retry').hidden = busy || !adapter.connected || chat.status !== 'error';
}

function renderOutput() {
  const info = adapter.projectFiles || { projectId: '', folder: '', files: [], entryHtml: '', previewUrl: '' };
  const count = info.projectId === adapter.projectId ? info.files.length : 0;
  $('#output-count').textContent = String(count);
  $('#output-project-label').textContent = adapter.projectId || 'No Project Selected';
  $('#output-folder-path').textContent = adapter.projectId ? (info.folder || `D:/kumpulan project/jadidulu-projects/${adapter.projectId}/`) : 'Masukkan Project ID di tab Chat untuk melihat hasil file.';
  const hasPreview = Boolean(info.projectId === adapter.projectId && info.previewUrl);
  $('#output-preview-bar').hidden = !hasPreview;
  if (hasPreview) $('#output-preview-btn').href = info.previewUrl;
  const formatSize = bytes => bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
  $('#output-file-list').innerHTML = count
    ? info.files.map(file => `<a class="output-file-row" href="${escapeHTML(file.previewUrl)}" target="_blank" rel="noopener noreferrer"><span class="output-file-name">${escapeHTML(file.path)}</span><span class="output-file-size">${formatSize(file.size)}</span></a>`).join('')
    : '<div class="empty-state">Belum ada file output di folder proyek ini.</div>';
}

function renderProjectSuggestions() {
  const list = $('#project-suggestions');
  if (!list) return;
  list.innerHTML = (adapter.knownProjects || []).map(id => `<option value="${escapeHTML(id)}"></option>`).join('');
}

function chatActivity(fresh) {
  const local = name => model.agents.find(a => a.name.toLowerCase() === String(name).toLowerCase());
  for (const m of fresh) {
    if (Date.now() - Date.parse(m.createdAt) > 120000) continue;
    const from = m.from.kind === 'waker' ? local(m.from.name) : null, targets = m.mentions.map(local).filter(Boolean);
    const flat = `${m.projectId} · ${m.text.replace(/\s+/g, ' ')}`, snippet = flat.length > 110 ? `${flat.slice(0, 110)}…` : flat;
    if (m.from.kind === 'human') {
      targets.forEach(to => model.relay(null, to.id, 'Request'));
      if (targets[0]) { selectedId = targets[0].id; if (scene) scene.selected = selectedId; }
      model.log(`You → ${targets.map(a => officeName(a.name)).join(', ') || 'the team'} · “${snippet}”`, 'command', targets[0]?.id);
    } else if (from && targets.length) {
      targets.forEach(to => model.relay(from.id, to.id, from.roleKey === 'intake' ? 'Brief' : from.roleKey === 'product' ? 'Task' : 'Update'));
      selectedId = targets[0].id; if (scene) scene.selected = selectedId;
      model.log(`${officeName(from.name)} → ${targets.map(a => officeName(a.name)).join(', ')} · ${snippet}`, 'handoff', targets[0].id);
    } else {
      if (from) { selectedId = from.id; if (scene) scene.selected = selectedId; }
      model.log(`${from ? officeName(from.name) : officeName(m.from.name)} · ${snippet}`, 'live', from?.id);
    }
  }
}

function focusChat() {
  switchTab('chat');
  if (innerWidth <= 860) { $('.details-panel').classList.add('open'); updateDrawerAccess(); }
  $(adapter.projectId ? '#chat-input' : '#project-id').focus();
}

function renderFeed() {
  const entries = model.logs.filter(l => feedFilter === 'all' || l.kind === feedFilter);
  $('#activity-list').innerHTML = entries.slice(0, 40).map(l => `<div class="feed-row ${l.kind}"><span class="feed-symbol">${icon({ work: 'activity', approval: 'shield', handoff: 'file', command: 'command', success: 'check', live: 'plug' }[l.kind] || 'coffee')}</span><span class="feed-text">${escapeHTML(l.text)}</span><time class="feed-time">${timeText(l.timestamp)}</time></div>`).join('') || '<div class="empty-state">No activity yet.</div>';
  const latest = model.logs[0];
  if (latest && latest.id !== lastAnnouncement) { $('#live-announcer').textContent = latest.text; lastAnnouncement = latest.id; }
}

function render() {
  renderDirectory(); renderDetails(); renderFeed(); renderChat(); renderOutput(); renderProjectSuggestions();
  const active = model.activeAgents();
  const working = active.filter(a => a.status === 'WORKING').length;
  $('#working-pill').textContent = `${working}/${model.agents.length}`;
  $('#approval-count').textContent = model.approvals.length;
  $('#approval-count').hidden = model.approvals.length === 0;
  updateConnection();
}

function selectTarget(id, isTeam = false) {
  selectedTeam = isTeam ? id : null;
  if (isTeam) {
    if (expandedTeams.has(id)) expandedTeams.delete(id); else expandedTeams.add(id);
    scene.locate(id, true); renderDirectory();
  } else {
    selectedId = id;
    const agent = model.get(id);
    if (agent) expandedTeams.add(agent.team);
    scene.locate(id);
    render();
  }
}

function showDialog(title, eyebrow, html, type = '') {
  dialogType = type; $('#dialog-title').textContent = title; $('#dialog-eyebrow').textContent = eyebrow; $('#dialog-content').innerHTML = html;
  if (!$('#office-dialog').open) $('#office-dialog').showModal();
}
function closeDialog() { $('#office-dialog').close(); dialogType = ''; }

function showApprovals(agentId = null) {
  const gates = model.approvals.filter(g => !agentId || g.agentId === agentId);
  showDialog('Founder Suite · Live Approvals', 'QODERWAKE APPROVAL INBOX', gates.length ? gates.map(g => `<article class="dialog-card"><span class="badge">${escapeHTML(g.title)}</span><h3>${escapeHTML(g.artifact)}</h3><p>${escapeHTML(g.detail)}</p><p style="margin-top:6px">Waker: ${escapeHTML(model.get(g.agentId).name)}</p><div class="dialog-actions"><button class="button primary" data-gate-action="approve" data-gate-agent="${g.agentId}">${icon('external')}Review in QoderWake</button></div></article>`).join('') : '<div class="empty-state">No verified founder gates are available. Waiting task status is not proof of an approval gate; inspect the official QoderWake task.</div>', 'approvals');
}

async function showConnection() {
  showDialog('QoderWake Live Bridge', 'CHROME BRIDGE · STATUS SYNC', '<p class="dialog-description">Loading local pairing code…</p>', 'connection');
  let key = '', available = false;
  if (location.protocol !== 'file:') {
    try { const r = await fetch('/api/config'); if (!r.ok) throw new Error(); const config = await r.json(); key = config.pairingCode; available = true; } catch { /* Server not running */ }
  }
  if (dialogType !== 'connection') return;
  const totalRoles = model.agents.length;
  const matches = adapter.lastSnapshot ? adapter.lastSnapshot.agents.filter(r => model.agents.some(a => a.name.toLowerCase() === r.name.toLowerCase().trim())).length : 0;
  $('#dialog-content').innerHTML = `<p class="dialog-description"><strong>Ask Intake</strong> requires a current QoderWake live list and a verified D-drive runtime before real requests are sent. Status snapshots alone do not prove that QoderWake storage and logs are on D.</p><div class="connection-state" id="dialog-connection-state">${adapter.connected ? `${matches} / ${totalRoles} roles synced · Live bridge connected` : 'QoderWake offline · Chat unavailable'}</div>${available ? `<ol class="connection-instructions"><li>Use a separate Chrome profile stored under <strong>D:/kumpulan project/</strong>, then open <strong>Extensions → Manage extensions</strong> and enable <strong>Developer mode</strong>.</li><li>Click <strong>Load unpacked</strong> and choose the <strong>extension</strong> folder.</li><li>Paste the pairing code below in the <strong>JADIDULU Bridge</strong> popup and click <strong>Connect</strong>.</li></ol><label class="field-label" for="pairing-code">Local office pairing code</label><div class="code-row"><input id="pairing-code" class="text-input" readonly value="${escapeHTML(key)}"><button id="copy-code">Copy</button></div>` : '<div class="notice">Run <strong>npm start</strong> and open <strong>http://127.0.0.1:19821</strong> to connect QoderWake.</div>'}<div class="dialog-actions"><a class="button primary" href="${WAKE_URL}" target="_blank" rel="noopener noreferrer">${icon('external')}Open QoderWake</a><button class="button outlined" data-dialog-cancel>Close</button></div>`;
}

function updateConnection() {
  const totalRoles = model.agents.length;
  $('#connection-short').textContent = rosterError || (adapter.connected
    ? `Live · ${totalRoles}/${totalRoles} synced`
    : `Offline · ${totalRoles} cached`);
  $('#connection-dot').style.background = rosterError || !adapter.connected ? '#d14949' : '#3d8c5a';
}

function sendCommand(action, extra = {}) {
  try { adapter.command({ agent_id: selectedId, action, ...extra }); }
  catch (error) { toast(error.message); }
  scheduleRender();
}

function setMotion(value) {
  model.reducedMotion = value; document.body.classList.toggle('reduced', value);
  $('#motion-toggle').setAttribute('aria-pressed', String(value));
  persist('jadidulu-motion', String(value));
}

function setNight(value) {
  scene.night = value;
  document.body.classList.toggle('dark', value);
  $('#theme-toggle').innerHTML = icon(value ? 'sun' : 'moon');
  persist('jadidulu-theme', value ? 'dark' : 'light');
}

$$('[data-panel-tab]').forEach(btn => btn.onclick = () => switchTab(btn.dataset.panelTab));
$('#team-directory').addEventListener('click', event => {
  const waker = event.target.closest('[data-waker]'); if (waker) selectTarget(waker.dataset.waker);
  const team = event.target.closest('[data-team]'); if (team) selectTarget(team.dataset.team, true);
});
$('#team-directory').addEventListener('keydown', event => {
  const buttons = $$('#team-directory button').filter(b => !b.closest('[hidden]'));
  const index = buttons.indexOf(document.activeElement);
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); buttons[(index + (event.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length]?.focus(); }
});
$('#waker-search').addEventListener('input', event => { search = event.target.value.toLowerCase().trim(); renderDirectory(); });
$('#waker-details').addEventListener('click', event => {
  const button = event.target.closest('[data-action]'); if (!button) return;
  const action = button.dataset.action;
  if (action === 'follow') { const f = scene.toggleFollow(selectedId); toast(f ? `Following ${model.get(selectedId).name}` : 'Camera follow off'); renderDetails(); }
  else sendCommand(action);
});

$('#map-follow').onclick = () => { const f = scene.toggleFollow(selectedId); toast(f ? `Following ${model.get(selectedId).name}` : 'Camera follow off'); renderDetails(); };
$('#map-pause').onclick = () => sendCommand('pause');
$('#map-stop').onclick = () => sendCommand('stop');
$('#map-task').onclick = () => focusChat();
$('#zoom-in').onclick = () => scene.stepIntegerZoom(1);
$('#zoom-out').onclick = () => scene.stepIntegerZoom(-1);
$$('.scale-btn').forEach(btn => btn.onclick = () => scene.setPixelScale(Number(btn.dataset.scale)));
$('#reset-view').onclick = () => scene.reset();
$('.brand').onclick = event => { event.preventDefault(); scene.reset(); };
$('#founder-button').onclick = () => showApprovals();
$('#meeting-button').onclick = () => {
  const count = model.startMeetingHuddle(4);
  if (count >= 2) {
    scene.followId = null;
    if (scene.pixelScale < 2) scene.setPixelScale(2);
    const p = scene.project(44 * 16, 12 * 16, 10);
    scene.focus = { x: (scene.center.x - p.x) * scene.scale, y: (scene.center.y - p.y) * scene.scale };
    if (model.reducedMotion) scene.pan = { ...scene.focus };
    toast(`Diskusi tim dimulai di Meeting Room (${count} Waker).`);
  } else {
    toast('Semua Waker sedang bekerja di meja masing-masing.');
  }
  render();
};
$('#connect-button').onclick = showConnection;
$('#theme-toggle').onclick = () => setNight(!scene.night);
$('#motion-toggle').onclick = () => setMotion(!model.reducedMotion);
$('#mobile-details').onclick = () => { $('.details-panel').classList.add('open'); updateDrawerAccess(); };
$('#close-details').onclick = () => { $('.details-panel').classList.remove('open'); updateDrawerAccess(); };
$$('[data-feed]').forEach(button => button.onclick = () => { feedFilter = button.dataset.feed; $$('[data-feed]').forEach(b => b.classList.toggle('active', b === button)); renderFeed(); });
$('#dialog-close').onclick = closeDialog;
$('#office-dialog').addEventListener('close', () => dialogType = '');
$('#office-dialog').addEventListener('click', event => { if (event.target === $('#office-dialog')) { const r = event.target.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeDialog(); } });
$('#dialog-content').addEventListener('click', async event => {
  if (event.target.closest('[data-dialog-cancel]')) { closeDialog(); return; }
  if (event.target.closest('#confirm-create-project')) {
    const nameInput = $('#new-project-name');
    const rawName = nameInput ? nameInput.value.trim() : '';
    if (!rawName) { nameInput?.focus(); return; }
    try { normalizeProjectId(rawName); } catch (error) {
      const errEl = $('#new-project-error');
      if (errEl) { errEl.textContent = error.message; errEl.hidden = false; }
      nameInput?.focus();
      return;
    }
    closeDialog();
    await createProjectFromInput(rawName, rawName);
    return;
  }
  if (event.target.closest('#confirm-founder-approve')) {
    closeDialog();
    const projectId = adapter.projectId;
    if (!projectId || chatBusy) return;
    chatBusy = true; chatNote = null; renderChat();
    try {
      const approvalText = `FOUNDER APPROVAL (Gate 1 — Scope & Budget Approved + Client Acceptance Confirmed) untuk ${projectId}. Lanjutkan langsung ke tahap PLAN -> DESIGN -> FRONTEND (dan BACKEND hanya jika dibutuhkan brief) -> QA, lalu tulis semua hasil akhir website (termasuk index.html, CSS, dan JS) langsung di D:/kumpulan project/jadidulu-projects/${projectId}/.`;
      const result = await adapter.sendChat(approvalText, projectId, { founderApproval: true });
      chatNote = { text: `Persetujuan Founder terkirim ke ${result.target || result.intake?.name}. Tim mulai membangun proyek.` };
      adapter.refreshProjectFiles(projectId);
    } catch (error) {
      chatNote = { text: error.message, error: true };
    }
    chatBusy = false; renderChat();
    return;
  }
  const gate = event.target.closest('[data-gate-action]');
  if (gate) { selectedId = gate.dataset.gateAgent; scene.selected = selectedId; sendCommand(gate.dataset.gateAction); return; }
  if (event.target.closest('#copy-code')) {
    try { await navigator.clipboard.writeText($('#pairing-code').value); toast('Pairing code copied.'); }
    catch { $('#pairing-code').select(); toast('Select and copy with Ctrl+C.'); }
  }
});

window.addEventListener('keydown', event => {
  if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && !$('#office-dialog').open) {
    event.preventDefault();
    switchTab('team');
    if (innerWidth <= 860) { $('.details-panel').classList.add('open'); updateDrawerAccess(); }
    $('#waker-search').focus();
  }
  if (event.key === 'Escape') { $('.details-panel').classList.remove('open'); updateDrawerAccess(); }
});


$('#chat-form').addEventListener('submit', async event => {
  event.preventDefault();
  const input = $('#chat-input'), text = input.value.trim(), projectId = $('#project-id').value.trim();
  if (chatBusy || !adapter.connected || rosterError) return;
  if (!projectId) { $('#project-id').focus(); return; }
  if (!text) { input.focus(); return; }
  chatBusy = true; chatNote = null; renderChat();
  try {
    const mention = $('#chat-target').value || '';
    const result = await adapter.sendChat(text, projectId, mention ? { mention } : {});
    input.value = '';
    const targetName = result.target || result.intake?.name || 'Waker intake';
    const missing = (result.missingRoles || []).map(role => role.label).join(', ');
    const pause = missing && !mention ? ` Tahap berikutnya yang belum memiliki Waker: ${missing}. Gunakan ✓ Approve Build jika ingin Founder menyetujui scope langsung.` : '';
    chatNote = result.delivered === 0
      ? { text: `QoderWake menyimpan permintaan tetapi tidak melaporkan pengiriman ke ${targetName}. Periksa grup di QoderWake.`, error: true }
      : { text: `Terkirim ke ${targetName}. QoderWake sedang membangunkan Waker (balasan pertama bisa 1–2 menit).${pause}` };
    if (!adapter.chat.group) adapter.openChat();
    adapter.refreshKnownProjects().then(renderProjectSuggestions);
    adapter.refreshProjectFiles(projectId);
  } catch (error) {
    const offline = error instanceof TypeError, unsure = offline || /in time/.test(error.message);
    chatNote = { text: `${offline ? 'The office server did not answer.' : error.message}${unsure ? ' Check the thread before sending again.' : ''}`, error: true };
  }
  chatBusy = false; renderChat();
});
$('#founder-approve-btn').onclick = () => {
  if (!adapter.projectId || chatBusy) return;
  showDialog(
    `Approve Scope & Build (${adapter.projectId})`,
    'FOUNDER GATE 1 · HUMAN CONFIRMATION',
    `<p class="dialog-description">Anda sebagai Founder menyetujui scope, budget, dan penerimaan klien untuk <strong>${escapeHTML(adapter.projectId)}</strong> sehingga <strong>PLAN</strong> dapat langsung mendistribusikan tugas ke <strong>DESIGN → FRONTEND → QA</strong> dan menghasilkan file website di <code>D:/kumpulan project/jadidulu-projects/${escapeHTML(adapter.projectId)}/</code>.</p><div class="dialog-actions"><button class="button primary" id="confirm-founder-approve" type="button">${icon('check')}Confirm Founder Approval &amp; Build</button><button class="button outlined" data-dialog-cancel type="button">Cancel</button></div>`,
    'founder-approve'
  );
};
$('#output-refresh').onclick = () => { if (adapter?.projectId) adapter.refreshProjectFiles(adapter.projectId); };
async function createProjectFromInput(rawInput, customName = '') {
  if (chatBusy || projectCreating || !adapter.connected || rosterError) return;
  const trimmed = String(rawInput || '').trim();
  if (!trimmed) { showNewProjectDialog(); return; }
  const normalizedId = tryNormalizeProject(trimmed);
  const resolvedName = customName || (normalizedId && trimmed.toUpperCase() !== normalizedId ? trimmed : pendingProjectNames.get(normalizedId) || '');
  projectCreating = true; chatNote = null; renderChat();
  try {
    const result = await adapter.createProject(trimmed, resolvedName);
    pendingProjectNames.delete(result.projectId);
    $('#project-id').value = result.projectId;
    renderProjectSuggestions();
    renderOutput();
    const title = result.group?.title || `JADIDULU Office - ${result.projectId}`;
    const memberCount = result.group?.members?.length || model.agents.length;
    const msg = result.created
      ? `Grup baru “${title}” (${memberCount} Waker) berhasil dibuat di QoderWake!`
      : `Grup proyek “${title}” sudah ada di QoderWake dan siap digunakan.`;
    chatNote = { text: msg };
    toast(result.created ? `Grup Waker baru dibuat: ${result.projectId}` : `Membuka grup: ${result.projectId}`);
    model.log(msg, 'command');
    $('#chat-input').focus();
  } catch (error) {
    chatNote = { text: error.message, error: true };
  }
  projectCreating = false; renderChat();
}

function showNewProjectDialog(initialName = '') {
  showDialog(
    'Buat Project & Grup Waker Baru',
    'QODERWAKE · NEW PROJECT GROUP',
    `<p class="dialog-description">Masukkan nama project baru. Sistem akan otomatis membuat folder proyek di Drive D dan langsung membuat <strong>grup QoderWake baru</strong> berisi seluruh Waker aktif (${model.agents.length} Waker).</p>
    <label class="field-label" for="new-project-name">Nama Project</label>
    <input id="new-project-name" class="text-input" maxlength="60" placeholder="Contoh: Testing App, Web Kopi Senja, Portal HR" value="${escapeHTML(initialName)}" autocomplete="off" spellcheck="false">
    <div class="notice" id="new-project-preview" style="margin-top:8px">Ketik nama project untuk melihat Project ID &amp; nama grup QoderWake.</div>
    <p id="new-project-error" style="color:#d14949;font-size:10px;font-weight:800;margin-top:6px" hidden></p>
    <div class="dialog-actions"><button class="button primary" id="confirm-create-project" type="button">${icon('plus')}Buat Project &amp; Grup Waker</button><button class="button outlined" data-dialog-cancel type="button">Batal</button></div>`,
    'new-project'
  );
  const input = $('#new-project-name'), preview = $('#new-project-preview'), errEl = $('#new-project-error');
  const updatePreview = () => {
    const val = input.value.trim();
    if (!val) {
      preview.textContent = 'Ketik nama project untuk melihat Project ID & nama grup QoderWake.';
      errEl.hidden = true;
      return;
    }
    try {
      const id = normalizeProjectId(val);
      const grpTitle = val.toUpperCase() === id ? `JADIDULU Office - ${id}` : `JADIDULU Office - ${val} (${id})`;
      preview.innerHTML = `<strong>Project ID:</strong> ${escapeHTML(id)}<br><strong>Grup QoderWake:</strong> ${escapeHTML(grpTitle)}<br><strong>Folder:</strong> D:/kumpulan project/jadidulu-projects/${escapeHTML(id)}/`;
      errEl.hidden = true;
    } catch (error) {
      errEl.textContent = error.message;
      errEl.hidden = false;
    }
  };
  input.addEventListener('input', updatePreview);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#confirm-create-project').click(); } });
  updatePreview();
  input.focus();
}

$('#project-create-btn').onclick = () => {
  if (chatBusy || projectCreating || !adapter.connected || rosterError) return;
  const raw = $('#project-id').value.trim();
  if (!raw) { showNewProjectDialog(); return; }
  createProjectFromInput(raw);
};
async function selectProjectFromInput(inputEl) {
  const raw = inputEl.value.trim();
  if (!raw) return;
  try {
    chatNote = null;
    const id = normalizeProjectId(raw);
    if (raw.toUpperCase() !== id) pendingProjectNames.set(id, raw);
    inputEl.value = id;
    const pending = adapter.setProject(id);
    renderChat();
    await pending;
  } catch (error) {
    chatNote = { text: error.message, error: true };
  }
  renderChat();
}
$('#project-id').addEventListener('keydown', async event => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  if (chatBusy || projectCreating) return;
  if (!event.target.value.trim()) { showNewProjectDialog(); return; }
  await selectProjectFromInput(event.target);
});
$('#chat-input').addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); $('#chat-form').requestSubmit(); }
});
$('#chat-input').addEventListener('input', () => { if (chatNote && !chatBusy) { chatNote = null; renderChat(); } });
$('#project-id').addEventListener('input', () => { if (chatNote && !chatBusy && !projectCreating) chatNote = null; renderChat(); });
$('#project-id').addEventListener('change', async event => {
  if (chatBusy || projectCreating) return;
  await selectProjectFromInput(event.target);
});
$('#chat-retry').onclick = () => { chatNote = null; adapter.openChat(); };
$('#chat-size').onclick = () => {
  const expanded = $('#selected-strip').hidden = !$('#selected-strip').hidden;
  $('#chat-size').setAttribute('aria-expanded', String(expanded));
  $('#chat-thread').scrollTop = $('#chat-thread').scrollHeight;
};

function initializeOffice() {
  model.onChange(scheduleRender, { initial: true });
  setMotion(saved('jadidulu-motion') === null ? matchMedia('(prefers-reduced-motion: reduce)').matches : saved('jadidulu-motion') === 'true');
  if (saved('jadidulu-theme') === 'dark') setNight(true);
  setInterval(() => {
    if (['IDLE', 'UNMAPPED', 'STOPPED'].includes(model.get(selectedId)?.status)) renderDetails();
  }, 1500);
}
function updateDrawerAccess() {
  $('.details-panel').inert = innerWidth <= 860 && !$('.details-panel').classList.contains('open');
}
window.addEventListener('resize', updateDrawerAccess);
updateDrawerAccess();

function renderPlanned() {
  const toggle = $('#planned-toggle');
  toggle.hidden = plannedWakers.length === 0;
  toggle.textContent = `Planned, not created yet (${plannedWakers.length})`;
  $('#planned-list').innerHTML = plannedWakers.map(waker => `<div class="empty-state"><strong>${escapeHTML(waker.name)}</strong> · ${escapeHTML(waker.role)}<br><small>Metadata only · not drawn, counted or routable.</small></div>`).join('');
  if (!plannedWakers.length) $('#planned-list').hidden = true;
}

function applyRosterData(data) {
  configureRoster(data.roster);
  model.reloadRoster();
  adapter.rosterState = data;
  adapter.connected = !data.stale;
  adapter.matchedCount = data.roster.length;
  plannedWakers = data.planned;
  if (data.stale) model.seed();
  else for (const agent of model.agents) if (agent.status === 'STALE') agent.status = 'IDLE';
  if (!model.get(selectedId)) selectedId = model.agents.find(agent => agent.roleKey === 'intake')?.id || model.agents[0]?.id || '';
  if (scene) { scene.selected = selectedId; scene.buildAtlas(); scene.groundKey = ''; }
  renderPlanned();
  model.changed();
}

$('#planned-toggle').onclick = () => {
  const list = $('#planned-list');
  list.hidden = !list.hidden;
  $('#planned-toggle').setAttribute('aria-expanded', String(!list.hidden));
};
$('#resync-button').onclick = async () => {
  const button = $('#resync-button');
  button.disabled = true;
  const data = await adapter.refreshRoster(true);
  button.disabled = false;
  toast(data.stale ? 'QoderWake offline · menampilkan data terakhir.' : `Resync selesai · ${data.roster.length} Waker live.`);
};

async function bootOffice() {
  if (location.protocol === 'file:') {
    rosterError = 'Start the D-drive office server; the file:// view cannot connect to QoderWake.';
    $('#strip-role').textContent = rosterError;
    return;
  }
  try {
    const res = await fetch('/api/roster');
    if (!res.ok) throw new Error('The D-drive roster could not be loaded.');
    const data = await res.json();
    if (!Array.isArray(data.roster)) throw new Error('The D-drive roster is invalid.');
    configureRoster(data.roster);
    model = new OfficeModel();
    adapter = new WorkforceAdapter(model);
    if (!model.get(selectedId)) selectedId = model.agents.find(agent => agent.roleKey === 'intake')?.id || model.agents[0]?.id || '';
    initializeScene();
    model.onChange(scheduleRender, { initial: true });
    adapter.addEventListener('roster', event => applyRosterData(event.detail));
    adapter.addEventListener('command-handoff', event => {
      const { url, command } = event.detail;
      showDialog('Finish this in QoderWake.', 'LIVE CONTROL · NO COMMAND SENT', `<p class="dialog-description">Your <strong>${escapeHTML(command.action)}</strong> action opens the official QoderWake screen.</p><div class="dialog-actions"><a class="button primary" href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${icon('external')}Open Waker in QoderWake</a><button class="button outlined" data-dialog-cancel>Cancel</button></div>`, 'handoff');
    });
    adapter.addEventListener('connection', scheduleRender);
    adapter.addEventListener('chat', event => {
      chatActivity(event.detail.fresh);
      if (event.detail.fresh.length && adapter.projectId) adapter.refreshProjectFiles(adapter.projectId);
      renderChat(); updateConnection();
    });
    adapter.addEventListener('project-files', () => { renderOutput(); renderChat(); });
    initializeOffice();
    applyRosterData(data);
    $('.app-shell').inert = false;
    render();
    adapter.connect();
    adapter.refreshKnownProjects().then(renderProjectSuggestions);
  } catch (error) {
    rosterError = error.message;
    if (model) render();
    else $('#strip-role').textContent = rosterError;
  }
}
bootOffice();
