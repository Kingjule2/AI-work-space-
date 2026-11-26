import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { realpathSync, statSync } from 'node:fs';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createWakeChat, wakeCli, requireDriveDPath, listKnownProjects, listProjectGroups, listProjectFiles, normalizeProjectId, projectFolderPath } from './wake-chat.mjs';
import { createLiveDirectory } from './waker-resolver.mjs';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

const root = path.dirname(fileURLToPath(import.meta.url));
const pairingCode = randomBytes(24).toString('hex');
const isExtension = value => /^chrome-extension:\/\/[a-p]{32}$/.test(value || '');
const validString = (value, max) => typeof value === 'string' && value.length <= max;
export function sanitizeSnapshot(body) {
  if (!body || !Array.isArray(body.agents) || !Array.isArray(body.tasks) || body.agents.length > 250 || body.tasks.length > 1000) throw new Error('Invalid snapshot.');
  const agents = body.agents.map(a => {
    if (!validString(a.id, 128) || !validString(a.name, 100)) throw new Error('Invalid agent.');
    return { id: a.id, name: a.name };
  });
  const tasks = body.tasks.map(t => {
    if (!validString(t.id, 500) || !validString(t.agentId, 128) || !validString(t.title, 2000) || !['running', 'pending', 'waiting', 'failed', 'cancelled', 'done', 'paused', 'blocked'].includes(t.status)) throw new Error('Invalid task.');
    return { id: t.id, agentId: t.agentId, title: t.title, status: t.status, updatedAt: validString(t.updatedAt, 50) ? t.updatedAt : '', url: validString(t.url, 500) && /^\/conversations\//.test(t.url) ? t.url : '' };
  });
  return { agents, tasks, timestamp: new Date().toISOString(), receivedAt: Date.now() };
}
export async function readOfficeRoster() {
  const file = requireDriveDPath(path.resolve(root, '../jadidulu-config/jadidulu_roster_33-waker.json'), 'Office roster');
  const roster = JSON.parse(await readFile(file, 'utf8'));
  const teams = ['Front Office', 'Project Room', 'Finance Room', 'Command Center'];
  if (!Array.isArray(roster) || roster.some(r => !r || !validString(r.name, 60) || !/^[a-z]+$/.test(r.name) || !validString(r.role, 160) || !teams.includes(r.team) || !validString(r.squad, 80) || ![null, 'Project 1', 'Project 2', 'Project 3'].includes(r.default_pod) || typeof r.shared !== 'boolean' || !validString(r.status, 80)) || new Set(roster.map(r => r.name.toLowerCase())).size !== roster.length) throw new Error('Office roster metadata must contain unique valid Waker definitions.');
  return roster.map(({ name, role, team, squad, default_pod, shared, status }) => ({ name, role, team, squad, default_pod, shared, status }));
}
function json(res, status, data, headers = {}) { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers }); res.end(JSON.stringify(data)); }
async function readBody(req, limit) {
  let size = 0; const chunks = [];
  for await (const chunk of req) { size += chunk.length; if (size > limit) return null; chunks.push(chunk); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export function createOfficeServer({ port = 19821, cli = wakeCli } = {}) {
  const origin = `http://127.0.0.1:${port}`;
  const clients = new Set();
  let latest = null, quietTicks = 0, lastBridgeAt = 0, pollingSessions = false, lastSessionSig = '';
  const broadcast = (event, data) => { for (const client of clients) client.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); };
  const directory = createLiveDirectory({ cli, readMetadata: readOfficeRoster });
  directory.onChange(data => broadcast('roster', data));
  directory.start();
  const chat = createWakeChat({ cli, directory, onUpdate: data => broadcast('chat', data) });
  async function pollLiveSessions() {
    if (cli !== wakeCli || pollingSessions || !clients.size || Date.now() - lastBridgeAt < 18000) return;
    const roster = directory.snapshot().roster;
    if (!roster.length) return;
    pollingSessions = true;
    try {
      const sessions = await cli.run(['session', 'list'], 15000);
      if (!Array.isArray(sessions)) return;
      const byAgent = new Map(roster.map(w => [w.agentId, w]));
      const tasks = [];
      for (const s of sessions) {
        if (!s || !byAgent.has(s.agentId)) continue;
        const rawStatus = String(s.status || '').toLowerCase();
        const rt = String(s.runtimeState || '').toLowerCase();
        let status = '';
        if (rawStatus === 'running' || ['running', 'streaming', 'executing', 'busy', 'tool_running', 'thinking'].includes(rt)) status = 'running';
        else if (['waiting_approval', 'waiting_confirmation'].includes(rt)) status = 'waiting';
        else if (rawStatus === 'blocked' || rt === 'blocked') status = 'blocked';
        else if (rawStatus === 'failed') status = 'failed';
        else continue;
        tasks.push({
          id: String(s.sessionId || `sess-${s.agentId}`).slice(0, 500),
          agentId: s.agentId,
          title: String(s.title || 'Active task in QoderWake').slice(0, 2000),
          status,
          updatedAt: typeof s.lastActiveAt === 'string' ? s.lastActiveAt : (typeof s.startedAt === 'string' ? s.startedAt : ''),
          url: s.sessionId ? `/conversations/${encodeURIComponent(s.sessionId)}` : ''
        });
      }
      const sig = JSON.stringify(tasks.map(t => [t.agentId, t.status, t.title]));
      if (sig !== lastSessionSig || (tasks.length > 0 && (!latest || Date.now() - latest.receivedAt > 12000))) {
        lastSessionSig = sig;
        const snapshot = sanitizeSnapshot({
          agents: roster.map(w => ({ id: w.agentId, name: w.name })),
          tasks
        });
        latest = snapshot;
        broadcast('snapshot', snapshot);
      }
    } catch { /* Ignore transient session poll timeouts. */ }
    finally { pollingSessions = false; }
  }
  const sessionTimer = cli === wakeCli ? setInterval(pollLiveSessions, 6000) : null;
  sessionTimer?.unref();
  const paired = req => { const key = req.headers['x-office-key']; return typeof key === 'string' && Buffer.byteLength(key) === Buffer.byteLength(pairingCode) && timingSafeEqual(Buffer.from(key), Buffer.from(pairingCode)); };
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    if (req.headers.host !== `127.0.0.1:${port}` && req.headers.host !== `localhost:${port}`) return json(res, 403, { error: 'Local office host required.' });
    const requestOrigin = req.headers.origin;
    const extension = isExtension(requestOrigin);
    const sameOrigin = !requestOrigin || requestOrigin === origin || requestOrigin === `http://localhost:${port}`;
    const requestUrl = new URL(req.url, origin);
    const pathname = requestUrl.pathname;
    if (pathname === '/api/bridge' && extension) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Office-Key');
    }
    if (req.method === 'OPTIONS' && pathname === '/api/bridge' && extension) { res.writeHead(204); return res.end(); }
    if (!sameOrigin && !(extension && pathname === '/api/bridge')) return json(res, 403, { error: 'Origin is not allowed.' });
    if (req.headers['sec-fetch-site'] === 'cross-site' && !extension) return json(res, 403, { error: 'Cross-site access is not allowed.' });
    if (req.method === 'GET' && pathname === '/api/config') return json(res, 200, { pairingCode, port, readOnly: true });
    if (req.method === 'GET' && pathname === '/api/roster') {
      const data = requestUrl.searchParams.get('resync') === '1' ? await directory.refresh() : directory.snapshot();
      return json(res, 200, data);
    }
    if (req.method === 'GET' && pathname === '/api/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' });
      res.write('retry: 3000\n\n'); clients.add(res);
      if (latest) res.write(`event: snapshot\ndata: ${JSON.stringify(latest)}\n\n`);
      req.on('close', () => clients.delete(res)); return;
    }
    if (req.method === 'POST' && pathname === '/api/bridge') {
      if (!paired(req)) return json(res, 401, { error: 'Pairing code is invalid. Copy the current code from the office connection dialog.' });
      if (!req.headers['content-type']?.startsWith('application/json')) return json(res, 415, { error: 'JSON required.' });
      try {
        const body = await readBody(req, 512000);
        if (!body) return json(res, 413, { error: 'Snapshot too large.' });
        if (body.disconnected === true) { latest = null; lastBridgeAt = 0; broadcast('disconnected', {}); return json(res, 200, { accepted: true }); }
        lastBridgeAt = Date.now();
        latest = sanitizeSnapshot(body); broadcast('snapshot', latest);
        return json(res, 200, { accepted: true, readOnly: true, agents: latest.agents.length });
      } catch { return json(res, 400, { error: 'Invalid bridge snapshot.' }); }
    }
    if (pathname === '/api/chat' && ['GET', 'POST'].includes(req.method)) {
      if (!paired(req)) return json(res, 401, { error: 'Office key is invalid. Reload the office page.' });
      if (req.method === 'GET') {
        try { return json(res, 200, await chat.open(requestUrl.searchParams.get('project_id'))); } catch (error) { return json(res, error.status || 503, { available: false, error: error.message }); }
      }
      if (!req.headers['content-type']?.startsWith('application/json')) return json(res, 415, { error: 'JSON required.' });
      let body;
      try { body = await readBody(req, 32000); } catch { return json(res, 400, { error: 'Invalid request.' }); }
      if (!body) return json(res, 413, { error: 'Request too large.' });
      try {
        return json(res, 200, await chat.send(body.project_id, body.text, {
          mention: typeof body.mention === 'string' ? body.mention : '',
          founderApproval: body.founderApproval === true
        }));
      } catch (error) { return json(res, error.status || 502, { error: error.message }); }
    }
    if (req.method === 'GET' && pathname === '/api/projects') {
      return json(res, 200, { projects: listKnownProjects(), groups: listProjectGroups() });
    }
    if (req.method === 'POST' && pathname === '/api/projects') {
      if (!paired(req)) return json(res, 401, { error: 'Office key is invalid. Reload the office page.' });
      if (!req.headers['content-type']?.startsWith('application/json')) return json(res, 415, { error: 'JSON required.' });
      let body;
      try { body = await readBody(req, 4096); } catch { return json(res, 400, { error: 'Invalid request.' }); }
      if (!body) return json(res, 413, { error: 'Request too large.' });
      const rawName = typeof body.name === 'string' ? body.name.trim() : '';
      const rawId = typeof body.project_id === 'string' && body.project_id.trim() ? body.project_id.trim() : rawName;
      try {
        const result = await chat.createProject(rawId, { name: rawName });
        return json(res, result.created ? 201 : 200, result);
      } catch (error) { return json(res, error.status || 502, { error: error.message }); }
    }
    if (req.method === 'GET' && pathname === '/api/projects/files') {
      if (!paired(req)) return json(res, 401, { error: 'Office key is invalid. Reload the office page.' });
      try { return json(res, 200, listProjectFiles(requestUrl.searchParams.get('project_id'))); }
      catch (error) { return json(res, error.status || 400, { error: error.message }); }
    }
    if (req.method === 'GET' && pathname.startsWith('/preview/')) {
      try {
        const rest = pathname.slice('/preview/'.length);
        const slash = rest.indexOf('/');
        const rawProject = slash < 0 ? rest : rest.slice(0, slash);
        const projectId = normalizeProjectId(decodeURIComponent(rawProject));
        let relPath = slash < 0 ? '' : rest.slice(slash + 1).split('/').map(decodeURIComponent).join('/');
        if (!relPath) {
          const listing = listProjectFiles(projectId);
          relPath = listing.entryHtml || 'index.html';
        }
        if (relPath.includes('\0') || relPath.includes('\\') || relPath.startsWith('/') || relPath.split('/').includes('..')) return json(res, 400, { error: 'Invalid preview path.' });
        const folder = requireDriveDPath(projectFolderPath(projectId), 'Project output folder');
        const candidate = path.win32.resolve(folder, relPath);
        const relative = path.win32.relative(folder, candidate);
        if (path.win32.isAbsolute(relative) || relative === '..' || relative.startsWith(`..${path.win32.sep}`)) return json(res, 403, { error: 'Preview path outside project folder.' });
        const resolved = realpathSync(candidate);
        const realRel = path.win32.relative(folder, resolved);
        if (path.win32.isAbsolute(realRel) || realRel === '..' || realRel.startsWith(`..${path.win32.sep}`)) return json(res, 403, { error: 'Preview target resolves outside project folder.' });
        if (!statSync(resolved).isFile()) return json(res, 404, { error: 'Preview file not found.' });
        const ext = path.win32.extname(resolved).toLowerCase();
        const data = await readFile(resolved);
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Frame-Options': 'SAMEORIGIN' });
        return res.end(data);
      } catch (error) {
        return json(res, error.status || 404, { error: error.status ? error.message : 'Preview file not found.' });
      }
    }
    if (req.method === 'GET' && ['/','/index.html'].includes(pathname)) {
      try {
        const html = await readFile(path.join(root, 'index.html'));
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'" });
        return res.end(html);
      } catch { return json(res, 500, { error: 'Run npm run build first.' }); }
    }
    if (pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }
    return json(res, 404, { error: 'Not found.' });
  });
  const heartbeat = setInterval(() => {
    for (const client of clients) client.write(': heartbeat\n\n');
    quietTicks = clients.size ? 0 : quietTicks + 1;
    if (quietTicks === 5) chat.pause();
  }, 12000);
  heartbeat.unref();
  server.shutdown = () => { clearInterval(heartbeat); if (sessionTimer) clearInterval(sessionTimer); directory.stop(); chat.close(); };
  server.on('close', server.shutdown);
  return server;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = 19821;
  const server = createOfficeServer({ port });
  server.listen(port, '127.0.0.1', () => console.log(`JADIDULU estate is open at http://127.0.0.1:${port}\nChrome bridge is read-only. Requests go to the live intake Waker through the local QoderWake CLI.`));
  server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Port ${port} is already in use. Close the previous office server or use its existing page.` : error.message); process.exitCode = 1; });
  process.on('exit', server.shutdown);
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGBREAK']) process.on(signal, () => process.exit(0));
}
