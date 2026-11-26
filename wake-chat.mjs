import { execFile, spawn } from 'node:child_process';
import { mkdirSync, readdirSync, realpathSync, statfsSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { workflowInstructions } from '../jadidulu-records/_protocol/catalog.mjs';
import { createLiveDirectory, missingLaterRoles, missingRoleMessage, resolveRoleWakers } from './waker-resolver.mjs';

export const GROUP_TITLE = 'JADIDULU Office';
export const INTAKE_ROLE = 'intake';
export const MAX_TEXT = 4000;
export const ROUTING_MARKER = '--- JADIDULU Office routing ---';
export const PROJECT_ROOT = 'D:/kumpulan project/jadidulu-projects';
const routingBrief = (projectId, missingRoles, { founderApproval = false } = {}) => `${ROUTING_MARKER}
project_id: ${projectId}
project_folder: ${PROJECT_ROOT}/${projectId}/
The owner sent this request from the JADIDULU Office control room. Reply in the owner's language.
${workflowInstructions}
Current missing later roles: ${missingRoles.length ? missingRoles.map(role => role.label).join(', ') : 'none'}.
Accept the intake request even when later roles are missing. Complete only valid current-stage work, then pause with the exact missing role and next action. Never invoke a missing Waker.
Output files: Write all project artifacts and deliverable code files directly inside ${PROJECT_ROOT}/${projectId}/ (for a website, save the runnable entry page at ${PROJECT_ROOT}/${projectId}/index.html together with its CSS/JS files).
Handoff wake rule: When handing off to another existing Waker in this group, call group_message_send with their participantId in wake_participant_ids so QoderWake wakes them immediately.
Missing Estimator fallback: If Estimator & Proposal is missing, complete INTAKE -> PRODUCT -> PLAN (PROJECT_PACK_READY), then pause at Gate 1 (WAITING_APPROVAL) and ask the human founder in this group for explicit scope/budget approval and client acceptance. Once the human founder explicitly approves in this group, PLAN dispatches DESIGN -> FRONTEND (and BACKEND only when the brief requires a backend) -> QA directly.
Static site rule: If the brief explicitly specifies a frontend-only static HTML/CSS/JS website with no backend or database, BACKEND build is N/A; FRONTEND builds directly against DESIGN and hands off to QA.${founderApproval ? '\nHUMAN FOUNDER ACTION: The logged-in human founder explicitly sent this Gate 1 Scope/Budget Approval & Client Acceptance message from the JADIDULU Office UI. Proceed immediately with PLAN -> DESIGN -> FRONTEND (and BACKEND only if required) -> QA and write the runnable website files into ' + `${PROJECT_ROOT}/${projectId}/` + '.' : ''}
Group chat handoffs and native automation triggers are separate channels. Never start the same step through both. Mention only the assigned existing group member when their prerequisites are met. Do not treat group chat history as a secure approval store, an atomic claim store or proof that a native automation was fired.`;

const validId = value => typeof value === 'string' && /^[a-z0-9][\w:-]{0,127}$/i.test(value);
const firstLine = value => String(value || '').trim().split(/\r?\n/)[0].slice(0, 300);
const problem = (status, message) => Object.assign(new Error(message), { status });
export function normalizeProjectName(value) {
  const clean = String(value || '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  if (clean.length > 60 || /[<>:"/\\|?*\x00-\x1f]/.test(clean) || clean.includes('..')) {
    throw problem(400, 'Gunakan nama project huruf, angka, spasi, atau tanda hubung (tanpa karakter / \\ .).');
  }
  return clean;
}
export function normalizeProjectId(value) {
  const raw = String(value || '').trim();
  if (!raw || raw.length > 60 || !/^[A-Za-z0-9][A-Za-z0-9 _-]{0,59}$/.test(raw)) {
    throw problem(400, 'Gunakan nama project atau project_id yang valid (huruf, angka, spasi, atau tanda hubung, mis. TESTING atau P-VENDOR).');
  }
  const slug = raw.toUpperCase().replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  const projectId = slug.startsWith('P-') ? slug : `P-${slug}`;
  if (!/^P-[A-Z0-9](?:[A-Z0-9-]{0,38}[A-Z0-9])?$|^P-[A-Z0-9]$/.test(projectId)) {
    throw problem(400, 'Use a project_id such as P-VENDOR: P- followed by letters, numbers or hyphens (max 40 chars).');
  }
  return projectId;
}
export function projectGroupTitle(value, displayName = '') {
  const projectId = normalizeProjectId(value);
  const cleanName = displayName ? normalizeProjectName(displayName) : '';
  if (cleanName && cleanName.toUpperCase() !== projectId) {
    return `${GROUP_TITLE} - ${cleanName} (${projectId})`;
  }
  return `${GROUP_TITLE} - ${projectId}`;
}
export function projectFolderPath(value) {
  const projectId = normalizeProjectId(value);
  const rootDir = requireDriveDPath(PROJECT_ROOT, 'Project output root');
  return path.win32.join(rootDir, projectId);
}
export function ensureProjectFolder(value) {
  const dir = projectFolderPath(value);
  mkdirSync(dir, { recursive: true });
  return requireDriveDPath(dir, 'Project output folder');
}
export function listProjectFiles(value) {
  const projectId = normalizeProjectId(value);
  const dir = projectFolderPath(projectId);
  let exists = false;
  try { exists = statSync(dir).isDirectory(); } catch { exists = false; }
  if (!exists) return { projectId, folder: `${PROJECT_ROOT}/${projectId}/`, exists: false, files: [], entryHtml: '' };
  const verifiedRoot = requireDriveDPath(dir, 'Project output folder');
  const files = [];
  const skip = new Set(['node_modules', '.git', '.next', '.cache']);
  const walk = (current, relPrefix, depth) => {
    if (depth > 5 || files.length >= 200) return;
    let entries = [];
    try { entries = readdirSync(current, { withFileTypes: true }); } catch { return; }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (files.length >= 200) break;
      if (skip.has(entry.name)) continue;
      const full = path.win32.join(current, entry.name);
      const rel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(full, rel, depth + 1);
      else if (entry.isFile()) {
        try {
          const st = statSync(full);
          const isHtml = /\.html?$/i.test(entry.name);
          files.push({
            path: rel,
            size: st.size,
            updatedAt: st.mtime.toISOString(),
            isHtml,
            previewUrl: `/preview/${encodeURIComponent(projectId)}/${rel.split('/').map(encodeURIComponent).join('/')}`
          });
        } catch { /* Ignore transient file errors. */ }
      }
    }
  };
  walk(verifiedRoot, '', 0);
  const htmlFiles = files.filter(file => file.isHtml);
  const entry = htmlFiles.find(file => file.path.toLowerCase() === 'index.html')
    || htmlFiles.find(file => file.path.toLowerCase() === 'src/index.html')
    || htmlFiles.find(file => file.path.toLowerCase() === 'dist/index.html')
    || htmlFiles.find(file => file.path.toLowerCase().endsWith('/index.html'))
    || htmlFiles[0]
    || null;
  return {
    projectId,
    folder: `${PROJECT_ROOT}/${projectId}/`,
    exists: true,
    files,
    entryHtml: entry ? entry.path : '',
    previewUrl: entry ? entry.previewUrl : ''
  };
}
export function listProjectGroups(storePath = PROJECT_GROUP_STORE) {
  const groups = {};
  if (!storePath) return groups;
  try {
    const data = JSON.parse(readFileSync(storePath, 'utf8'));
    for (const [key, val] of Object.entries(data || {})) {
      try {
        const id = normalizeProjectId(key);
        if (validId(val)) groups[id] = val;
      } catch { /* Ignore invalid entries. */ }
    }
  } catch { /* Store may not exist yet. */ }
  return groups;
}
export function listKnownProjects(storePath = PROJECT_GROUP_STORE) {
  const ids = new Set();
  if (storePath) {
    try {
      const data = JSON.parse(readFileSync(storePath, 'utf8'));
      for (const key of Object.keys(data || {})) {
        try { ids.add(normalizeProjectId(key)); } catch { /* Ignore invalid keys. */ }
      }
    } catch { /* Store may not exist yet. */ }
  }
  try {
    const rootDir = requireDriveDPath(PROJECT_ROOT, 'Project output root');
    for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      try { ids.add(normalizeProjectId(entry.name)); } catch { /* Ignore non-project dirs. */ }
    }
  } catch { /* Project root may be empty. */ }
  return [...ids].sort();
}
export function pickEnabledModel(models) {
  if (!Array.isArray(models)) return null;
  const enabled = models.filter(m => m && typeof m.id === 'string' && m.id && m.isEnabled === true);
  if (!enabled.length) return null;
  return enabled.find(m => m.provider === 'organization' && m.isFree)
    || enabled.find(m => m.provider === 'organization')
    || enabled.find(m => m.isFree)
    || enabled[0];
}
export function requireDriveDPath(value, label) {
  const root = path.win32.resolve('D:/kumpulan project');
  const inside = candidate => {
    const relative = path.win32.relative(root, candidate);
    return !path.win32.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.win32.sep}`);
  };
  if (typeof value !== 'string' || !path.win32.isAbsolute(value) || !inside(path.win32.resolve(value))) throw problem(503, `${label} must be under D:/kumpulan project/.`);
  let resolved;
  try { resolved = realpathSync(value); } catch { throw problem(503, `${label} must exist before connecting QoderWake.`); }
  if (!inside(resolved)) throw problem(503, `${label} resolves outside D:/kumpulan project/.`);
  return resolved;
}
export function officeCliContext(env = process.env) {
  const cwd = requireDriveDPath(process.cwd(), 'Office working directory');
  const file = requireDriveDPath(env.JADIDULU_QODERWAKE_CLI, 'JADIDULU_QODERWAKE_CLI');
  if (!statSync(file).isFile()) throw problem(503, 'JADIDULU_QODERWAKE_CLI must be an executable file.');
  requireDriveDPath(env.TEMP, 'TEMP');
  requireDriveDPath(env.TMP, 'TMP');
  requireDriveDPath(env.TMPDIR, 'TMPDIR');
  requireDriveDPath(env.QODER_CONFIG_DIR, 'QODER_CONFIG_DIR');
  if (env === process.env) requireDriveDPath(os.tmpdir(), 'Effective temporary directory');
  const disk = statfsSync(cwd, { bigint: true });
  if (disk.bavail * disk.bsize < 10n * 1024n ** 3n) throw problem(503, 'Drive D has less than 10 GiB free.');
  return { file, cwd };
}

export const wakeCli = {
  run(args, timeout = 60000) {
    return new Promise((resolve, reject) => {
      const { file, cwd } = officeCliContext();
      execFile(file, [...args, '--json'], { cwd, timeout, windowsHide: true, maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) { reject(new Error(error.killed ? 'QoderWake did not answer in time.' : firstLine(stderr) || firstLine(stdout) || 'The QoderWake CLI failed.')); return; }
        try { resolve(JSON.parse(stdout)); } catch { reject(new Error('The QoderWake CLI returned an unreadable response.')); }
      });
    });
  },
  follow(conversationId, afterSeq, onMessage, onExit) {
    const { file, cwd } = officeCliContext();
    const child = spawn(file, ['messages', 'list', conversationId, '--after-seq', String(afterSeq), '--follow', '--json'], { cwd, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
    let buffer = '', ended = false;
    const finish = () => { if (!ended) { ended = true; onExit(); } };
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      buffer += chunk;
      for (let end = buffer.indexOf('\n'); end >= 0; end = buffer.indexOf('\n')) {
        const line = buffer.slice(0, end).trim(); buffer = buffer.slice(end + 1);
        if (!line) continue;
        try { onMessage(JSON.parse(line)); } catch { /* The follower may print non-JSON notices. */ }
      }
    });
    child.on('error', finish); child.on('close', finish);
    return () => child.kill();
  }
};

const PROJECT_GROUP_STORE = 'D:/kumpulan project/jadidulu-config/office-project-groups.json';
function storedConversation(storePath, projectId) {
  if (!storePath) return '';
  try {
    const data = JSON.parse(readFileSync(storePath, 'utf8'));
    return validId(data[projectId]) ? data[projectId] : '';
  } catch { return ''; }
}
function rememberConversation(storePath, projectId, conversationId) {
  if (!storePath) return;
  let data = {};
  try { data = JSON.parse(readFileSync(storePath, 'utf8')); } catch { /* First project group. */ }
  data[projectId] = conversationId;
  writeFileSync(storePath, JSON.stringify(data, null, 2));
}
function forgetConversation(storePath, projectId) {
  if (!storePath) return;
  try {
    const data = JSON.parse(readFileSync(storePath, 'utf8'));
    if (Object.prototype.hasOwnProperty.call(data, projectId)) {
      delete data[projectId];
      writeFileSync(storePath, JSON.stringify(data, null, 2));
    }
  } catch { /* Store may not exist yet. */ }
}

export function createWakeChat({ cli = wakeCli, directory, onUpdate = () => { }, storePath = cli === wakeCli ? PROJECT_GROUP_STORE : null, ensureFolder = cli === wakeCli } = {}) {
  const liveDirectory = directory || createLiveDirectory({ cli, readMetadata: async () => [] });
  const sessions = new Map();
  let closed = false;
  let cachedModel = { checkedAt: 0, model: null, enabledModels: [] };

  async function resolveActiveModel() {
    const ttl = cachedModel.model ? 60000 : 5000;
    if (Date.now() - cachedModel.checkedAt < ttl) return cachedModel;
    try {
      const list = await cli.run(['models', 'list'], 30000);
      const enabledModels = Array.isArray(list) ? list.filter(m => m && m.isEnabled === true && typeof m.id === 'string').map(m => ({ id: m.id, name: String(m.displayName || m.name || m.id), isFree: Boolean(m.isFree), provider: String(m.provider || '') })) : [];
      cachedModel = { checkedAt: Date.now(), model: pickEnabledModel(list), enabledModels };
    } catch {
      cachedModel = { checkedAt: Date.now(), model: null, enabledModels: [] };
    }
    return cachedModel;
  }

  function createSession(projectId) {
    let title = projectGroupTitle(projectId);
    let conversation = storedConversation(storePath, projectId), people = new Map(), wakers = [], records = [], runs = [], followSeq = 0, stopFollow = null, startedAt = 0, delay = 5000;
    let opening = null, reloading = null, retry = null, runsTimer = null, refreshingRuns = false, sending = false, creating = false, watching = false, intake = null, lastRunSig = '', modelQueue = Promise.resolve();
    const seen = new Set(), unknown = new Set(), configuredModels = new Map();
    const wakerName = name => wakers.find(w => w.toLowerCase() === name) || '';

    function ensureGroupMemberModels(targetNames, modelId) {
      if (!conversation || !modelId || cli !== wakeCli) return Promise.resolve();
      const unique = [...new Set(targetNames.map(n => wakerName(String(n || '').toLowerCase())).filter(Boolean))];
      const runBatch = async () => {
        for (const name of unique) {
          if (closed || configuredModels.get(name) === modelId) continue;
          try {
            await cli.run(['group', 'member', 'set-model', conversation, '--waker', name, '--model', modelId], 30000);
            configuredModels.set(name, modelId);
          } catch { /* Non-fatal if group member already configured or transient revision conflict. */ }
        }
      };
      modelQueue = modelQueue.then(runBatch, runBatch);
      return modelQueue;
    }

    async function currentIntake({ offlineAllowed = false, allowCached = false } = {}) {
      const snap = liveDirectory.snapshot();
      const fresh = allowCached && cli === wakeCli && !snap.stale && snap.roster.length > 0 && (Date.now() - Date.parse(snap.lastSynced || 0)) < 15000;
      const state = fresh ? snap : await liveDirectory.refresh();
      if (state.stale && !offlineAllowed) throw problem(503, 'QoderWake offline. Permintaan tidak dikirim; daftar terakhir ditandai stale.');
      intake = resolveRoleWakers(state.roster, INTAKE_ROLE)[0] || null;
      if (!intake && !state.stale) throw problem(409, missingRoleMessage(INTAKE_ROLE));
      return { state, intake };
    }
    async function loadGroup(target) {
      const detail = await cli.run(['group', 'show', target]);
      if (!validId(detail?.conversation?.id) || !Array.isArray(detail.participants)) throw new Error('QoderWake returned an unexpected group format.');
      conversation = detail.conversation.id;
      if (typeof detail.conversation.title === 'string' && detail.conversation.title.trim()) title = detail.conversation.title.trim();
      people = new Map(); wakers = [];
      for (const p of detail.participants) {
        if (!validId(p?.id)) continue;
        const person = { kind: p.wakerRef?.kind === 'core/human' ? 'human' : 'waker', name: String(p.wakerSnapshot?.name || 'Member').slice(0, 100) };
        people.set(p.id, person);
        if (validId(p.wakerRef?.id)) people.set(p.wakerRef.id, person);
        if (person.kind === 'waker' && p.state === 'active') wakers.push(person.name);
      }
    }
    async function findGroup() {
      if (!conversation) return false;
      try {
        await loadGroup(conversation);
        return true;
      } catch (error) {
        if (/not found|404|403|forbidden|unauthorized|access denied|does not exist|no such|permission/i.test(String(error?.message || ''))) {
          conversation = '';
          people = new Map();
          wakers = [];
          forgetConversation(storePath, projectId);
          return false;
        }
        throw error;
      }
    }
    async function createGroup(displayName = '') {
      const { state, intake: resolvedIntake } = await currentIntake();
      const targetTitle = projectGroupTitle(projectId, displayName);
      const members = state.roster.filter(waker => waker.selectableForTeam && validId(waker.agentId));
      let created;
      try {
        created = await cli.run(['group', 'create', '--title', targetTitle, ...members.flatMap(waker => ['--waker', waker.agentId])], 90000);
      } catch (error) {
        const groups = await cli.run(['group', 'list'], 30000).catch(() => []);
        const found = Array.isArray(groups) && groups.find(group => {
          const gTitle = String(group?.conversation?.title || '');
          return gTitle === targetTitle || gTitle === title || gTitle.endsWith(`(${projectId})`);
        });
        if (!found) throw error;
        conversation = found.conversation.id;
        rememberConversation(storePath, projectId, conversation);
        intake = resolvedIntake;
        await loadGroup(conversation);
        return;
      }
      if (!validId(created?.group?.conversation?.id)) throw new Error('QoderWake did not confirm the new project group.');
      conversation = created.group.conversation.id;
      title = targetTitle;
      rememberConversation(storePath, projectId, conversation);
      intake = resolvedIntake;
      await loadGroup(conversation);
    }
    function view(r) {
      const from = people.get(r.sender) || { kind: 'system', name: 'QoderWake' };
      const names = new Set(r.audience.map(id => people.get(id)?.name).filter(Boolean));
      for (const [, tag] of r.text.matchAll(/@([\p{L}\p{N}_-]{1,60})/gu)) { const hit = wakerName(tag.toLowerCase()); if (hit) names.add(hit); }
      if (r.routed && intake && !names.size && wakerName(intake.name.toLowerCase())) names.add(wakerName(intake.name.toLowerCase()));
      return { seq: r.seq, projectId, from: { kind: from.kind, name: from.name }, text: r.text, mentions: [...names].filter(name => name !== from.name), createdAt: r.createdAt };
    }
    function formatRuns(rawRuns) {
      if (!Array.isArray(rawRuns)) return [];
      return rawRuns.slice(-10).map(run => {
        const who = people.get(run?.participantId)?.name || 'Waker';
        const code = run?.error?.code ? String(run.error.code) : '';
        const errMsg = run?.error?.message ? String(run.error.message) : '';
        const detail = code === '118' ? 'Model/credit limit reached (code 118). Pastikan model aktif seperti qwen3.8-max / efficient.' : errMsg || code;
        return { id: String(run?.id || ''), waker: who, status: String(run?.status || 'unknown'), error: detail, updatedAt: run?.updatedAt || run?.finishedAt || run?.startedAt || '' };
      });
    }
    async function refreshRuns() {
      if (refreshingRuns || !conversation || closed) return;
      refreshingRuns = true;
      try {
        const list = await cli.run(['runs', 'list', conversation], 45000);
        const nextRuns = formatRuns(list);
        const sig = JSON.stringify(nextRuns.map(r => [r.id, r.status, r.error]));
        runs = nextRuns;
        if (sig !== lastRunSig) {
          lastRunSig = sig;
          onUpdate({ projectId, messages: [], runs });
        }
      } catch { /* Fixture CLIs or older versions may not expose runs list. */ }
      finally { refreshingRuns = false; }
    }
    function startRunsPoll() {
      if (runsTimer || closed || !watching || !conversation || cli !== wakeCli) return;
      refreshRuns();
      runsTimer = setInterval(refreshRuns, 10000);
      runsTimer.unref();
    }
    function state() {
      const live = liveDirectory.snapshot();
      return {
        available: true,
        projectId,
        group: conversation ? { title, members: [...wakers] } : null,
        intake: intake ? { name: intake.name, agentId: intake.agentId, roleKey: intake.roleKey } : null,
        missingRoles: missingLaterRoles(live.roster),
        stale: live.stale,
        maxText: MAX_TEXT,
        model: cachedModel.model ? { id: cachedModel.model.id, name: String(cachedModel.model.displayName || cachedModel.model.name || cachedModel.model.id), isFree: Boolean(cachedModel.model.isFree) } : null,
        runs,
        messages: records.map(view)
      };
    }
    function reloadPeople() {
      if (reloading || !conversation) return;
      reloading = loadGroup(conversation).then(() => onUpdate({ reset: true, ...state() }), () => { }).finally(() => { reloading = null; });
    }
    function ingest(message) {
      if (!message || !Number.isInteger(message.seq) || seen.has(message.seq)) return;
      seen.add(message.seq);
      const raw = message.body?.type === 'text' && typeof message.body.text === 'string' ? message.body.text : `[${String(message.body?.type || 'attachment').slice(0, 40)}]`;
      const cut = raw.indexOf(ROUTING_MARKER);
      const record = {
        seq: message.seq, sender: String(message.senderParticipantId || ''), routed: cut >= 0,
        text: (cut < 0 ? raw : raw.slice(0, cut)).trim().slice(0, 12000),
        audience: (Array.isArray(message.audience) ? message.audience : []).map(a => typeof a === 'string' ? a : a?.participantId || a?.id).filter(validId),
        createdAt: Number.isFinite(Date.parse(message.createdAt)) ? new Date(message.createdAt).toISOString() : new Date().toISOString()
      };
      records.push(record); records.sort((a, b) => a.seq - b.seq);
      if (records.length > 300) records = records.slice(-300);
      if (record.sender && !people.has(record.sender) && !unknown.has(record.sender)) { unknown.add(record.sender); reloadPeople(); }
      onUpdate({ projectId, messages: [view(record)], runs });
    }
    function startFollow() {
      if (stopFollow || closed || !watching || !conversation) return;
      startedAt = Date.now();
      stopFollow = cli.follow(conversation, followSeq, message => {
        if (Number.isInteger(message?.seq)) followSeq = Math.max(followSeq, message.seq);
        ingest(message);
      }, () => {
        stopFollow = null;
        delay = Date.now() - startedAt > 60000 ? 5000 : Math.min(delay * 2, 120000);
        if (!closed && watching) retry = setTimeout(startFollow, delay);
      });
      startRunsPoll();
    }
    return {
      projectId,
      async createProject(options = {}) {
        if (closed) throw problem(503, 'The office chat is closed.');
        if (creating) throw problem(409, 'Grup proyek sedang dibuat di QoderWake.');
        creating = true;
        try {
          const { state: liveState, intake: resolvedIntake } = await currentIntake();
          if (ensureFolder) ensureProjectFolder(projectId);
          const alreadyExists = await findGroup();
          let created = false;
          if (!alreadyExists) {
            const displayName = options?.name ? normalizeProjectName(options.name) : '';
            await createGroup(displayName);
            created = true;
          }
          if (cli === wakeCli) {
            const { model: activeModel } = await resolveActiveModel();
            const modelId = activeModel?.id || '';
            if (modelId) {
              const coreRoles = ['intake', 'product', 'plan', 'design', 'frontend', 'backend', 'qa', 'devops'];
              const roleMembers = coreRoles.flatMap(role => resolveRoleWakers(liveState.roster, role).slice(0, 2).map(w => w.name));
              ensureGroupMemberModels([resolvedIntake.name, ...roleMembers], modelId).catch(() => {});
            }
          }
          watching = true;
          startFollow();
          const current = state();
          onUpdate({ reset: true, ...current });
          return {
            created,
            projectId,
            folder: `${PROJECT_ROOT}/${projectId}/`,
            group: current.group,
            intake: current.intake,
            missingRoles: current.missingRoles,
            model: current.model
          };
        } finally {
          creating = false;
        }
      },
      async open() {
        if (closed) throw problem(503, 'The office chat is closed.');
        await currentIntake({ offlineAllowed: true, allowCached: true });
        if (cli === wakeCli) await resolveActiveModel();
        if (!opening) opening = findGroup().catch(error => { opening = null; throw error; });
        await opening;
        if (!conversation) opening = null;
        watching = true; startFollow();
        return state();
      },
      async send(input, options = {}) {
        const text = typeof input === 'string' ? input.replace(/\r\n?/g, '\n').trim() : '';
        if (!text) throw problem(400, 'Tulis permintaan untuk Waker intake terlebih dahulu.');
        if (text.length > MAX_TEXT) throw problem(413, `Keep the request under ${MAX_TEXT} characters.`);
        if (sending) throw problem(409, 'The previous request for this project is still being sent.');
        sending = true;
        try {
          const { state: liveState, intake: resolvedIntake } = await currentIntake();
          if (ensureFolder) ensureProjectFolder(projectId);
          if (!conversation && !(await findGroup())) await createGroup();
          const intakeName = wakerName(resolvedIntake.name.toLowerCase());
          if (!intakeName) throw problem(409, 'Waker dengan peran Q&A Specialist tidak tersedia sebagai anggota grup proyek ini.');
          const founderApproval = options?.founderApproval === true;
          let targetName = intakeName;
          const requestedMention = typeof options?.mention === 'string' ? options.mention.trim().toLowerCase() : '';
          if (requestedMention) {
            const matched = wakerName(requestedMention);
            if (!matched) throw problem(409, `Waker "${options.mention}" tidak tersedia di grup proyek ini.`);
            targetName = matched;
          } else if (founderApproval) {
            const planWaker = resolveRoleWakers(liveState.roster, 'plan')[0];
            const planName = planWaker ? wakerName(planWaker.name.toLowerCase()) : '';
            if (planName) targetName = planName;
          }
          const missingRoles = missingLaterRoles(liveState.roster);
          const { model: activeModel } = await resolveActiveModel();
          const modelId = activeModel?.id || '';
          if (modelId && cli === wakeCli) {
            await ensureGroupMemberModels([targetName], modelId);
            const coreRoles = ['intake', 'product', 'plan', 'design', 'frontend', 'backend', 'qa', 'devops'];
            const roleMembers = coreRoles.flatMap(role => resolveRoleWakers(liveState.roster, role).slice(0, 2).map(w => w.name));
            ensureGroupMemberModels(roleMembers, modelId).catch(() => {});
          }
          const args = ['messages', 'send', conversation, `--text=${text}\n\n${routingBrief(projectId, missingRoles, { founderApproval })}`, '--mention', targetName, '--intent', 'request_action'];
          const result = await cli.run(args, 90000);
          if (!Number.isInteger(result?.message?.seq)) throw new Error('QoderWake did not confirm the message.');
          ingest(result.message);
          watching = true; startFollow();
          if (cli === wakeCli) setTimeout(refreshRuns, 4500).unref();
          const deliveryIds = (Array.isArray(result.deliveries) ? result.deliveries : []).map(delivery => delivery?.taskId || delivery?.sessionId || delivery?.conversationSessionId || delivery?.id).filter(Boolean);
          const wakeQueued = result.message?.deliveryPolicy === 'wake' && Array.isArray(result.message?.audience) && result.message.audience.length > 0;
          const delivered = Array.isArray(result.deliveries) && result.deliveries.length > 0
            ? result.deliveries.length
            : (wakeQueued ? result.message.audience.length : (Array.isArray(result.deliveries) ? result.deliveries.length : null));
          return {
            sent: true,
            projectId,
            seq: result.message.seq,
            delivered,
            intake: { name: resolvedIntake.name, agentId: resolvedIntake.agentId, roleKey: INTAKE_ROLE },
            target: targetName,
            model: modelId || null,
            missingRoles,
            deliveryIds
          };
        } finally { sending = false; }
      },
      pause() { watching = false; clearTimeout(retry); clearInterval(runsTimer); runsTimer = null; stopFollow?.(); stopFollow = null; },
      close() { this.pause(); }
    };
  }

  function session(value) {
    const projectId = normalizeProjectId(value);
    if (!sessions.has(projectId)) sessions.set(projectId, createSession(projectId));
    return sessions.get(projectId);
  }
  return {
    async open(projectId) { return session(projectId).open(); },
    async createProject(projectId, options) { return session(projectId).createProject(options); },
    async send(projectId, text, options) { return session(projectId).send(text, options); },
    pause() { for (const chat of sessions.values()) chat.pause(); },
    close() { closed = true; for (const chat of sessions.values()) chat.close(); }
  };
}
