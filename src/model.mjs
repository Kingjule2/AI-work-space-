export const TILE_SIZE = 16;
export const GRID_COLS = 80;
export const GRID_ROWS = 60;
export const WORLD_W = GRID_COLS * TILE_SIZE; // 1280
export const WORLD_H = GRID_ROWS * TILE_SIZE; // 960

export const tileToPx = (tx, ty) => ({ x: tx * TILE_SIZE + 8, y: ty * TILE_SIZE + 8 });
export const pxToTile = (x, y) => ({ tx: Math.max(0, Math.min(GRID_COLS - 1, Math.floor(x / TILE_SIZE))), ty: Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(y / TILE_SIZE))) });

// Hard rule: every team room is at least 14 x 12 tiles; doors are 2 tiles wide; desks >= 3 tiles apart.
export const TEAMS = [
  {
    id: 'intake',
    name: 'Front Office',
    stage: 'Intake',
    color: '#d98a26',
    dark: '#8f5314',
    light: '#f5dcb0',
    icon: 'inbox',
    tileRoom: [12, 6, 16, 14], // 16 x 14 tiles
    room: [12 * 16, 6 * 16, 16 * 16, 14 * 16],
    door: [20 * 16 + 8, 19 * 16 + 8],
    tileDoor: [20, 19]
  },
  {
    id: 'delivery',
    name: 'Project Room',
    stage: 'Delivery',
    color: '#3b78b8',
    dark: '#21476e',
    light: '#c9dff2',
    icon: 'layers',
    tileRoom: [50, 6, 18, 18], // 18 x 18 tiles (biggest room)
    room: [50 * 16, 6 * 16, 18 * 16, 18 * 16],
    door: [50 * 16 + 8, 20 * 16 + 8],
    tileDoor: [50, 20]
  },
  {
    id: 'billing',
    name: 'Finance Room',
    stage: 'Billing',
    color: '#3d8c5a',
    dark: '#225435',
    light: '#cce8d4',
    icon: 'wallet',
    tileRoom: [12, 25, 16, 14], // 16 x 14 tiles
    room: [12 * 16, 25 * 16, 16 * 16, 14 * 16],
    door: [20 * 16 + 8, 25 * 16 + 8],
    tileDoor: [20, 25]
  },
  {
    id: 'control',
    name: 'Command Center',
    stage: 'Control',
    color: '#7a4ca3',
    dark: '#452763',
    light: '#dec9f0',
    icon: 'command',
    tileRoom: [50, 26, 18, 14], // 18 x 14 tiles
    room: [50 * 16, 26 * 16, 18 * 16, 14 * 16],
    door: [55 * 16 + 8, 26 * 16 + 8],
    tileDoor: [55, 26]
  }
];

export const ROOMS = [
  { id: 'intake', name: 'Front Office', tx: 12, ty: 6, tw: 16, th: 14, color: '#d98a26', floor: '#f0d8a8', teamId: 'intake' },
  { id: 'founder', name: 'Founder Suite', tx: 28, ty: 6, tw: 11, th: 13, color: '#d4a024', floor: '#e8d4a6' },
  { id: 'meeting', name: 'Meeting Room', tx: 39, ty: 6, tw: 11, th: 13, color: '#a87952', floor: '#e5d8c0' },
  { id: 'delivery', name: 'Project Room', tx: 50, ty: 6, tw: 18, th: 18, color: '#3b78b8', floor: '#cde0f0', teamId: 'delivery' },
  { id: 'restroom', name: 'Restrooms', tx: 12, ty: 20, tw: 7, th: 5, color: '#7a8899', floor: '#e2ecf0' },
  { id: 'balcony', name: 'West Balcony', tx: 9, ty: 21, tw: 3, th: 3, color: '#8c7d6b', floor: '#d6cbb9' },
  { id: 'atrium', name: 'Central Atrium', tx: 19, ty: 19, tw: 31, th: 4, color: '#cbb896', floor: '#e8dec8' },
  { id: 'kitchen', name: 'Kitchen & Dining', tx: 28, ty: 23, tw: 22, th: 9, color: '#c97a4b', floor: '#f2e6cf' },
  { id: 'billing', name: 'Finance Room', tx: 12, ty: 25, tw: 16, th: 14, color: '#3d8c5a', floor: '#cee6d5', teamId: 'billing' },
  { id: 'lounge', name: 'Lounge & Game Room', tx: 28, ty: 32, tw: 22, th: 7, color: '#8f6814', floor: '#e0cfa9' },
  { id: 'control', name: 'Command Center', tx: 50, ty: 26, tw: 18, th: 14, color: '#7a4ca3', floor: '#dfd0ed', teamId: 'control' },
  { id: 'lobby', name: 'Lobby & Reception', tx: 28, ty: 39, tw: 22, th: 8, color: '#d4a024', floor: '#efe4cc' }
];

export const DISHES = [
  { id: 'noodles', name: 'Spicy Ramen Noodles', color: '#f5c97b', accent: '#d14949' },
  { id: 'rice', name: 'Garlic Rice Bowl', color: '#f2ead8', accent: '#3d8c5a' },
  { id: 'burger', name: 'Estate Pixel Burger', color: '#d98a26', accent: '#5a8a49' },
  { id: 'soup', name: 'Herb Garden Soup', color: '#82b366', accent: '#fae06b' },
  { id: 'salad', name: 'Fresh Harvest Salad', color: '#5a8a49', accent: '#d14949' },
  { id: 'cake', name: 'Golden Honey Cake', color: '#fae06b', accent: '#d14949' }
];

export const ROSTER = [];
export const UNASSIGNED_TEAM = { id: 'unassigned', name: 'Unassigned', stage: 'Live', color: '#7a8899', dark: '#333c4a', light: '#e2ecf0', icon: 'users', tileRoom: [28, 39, 22, 8] };
const APPEARANCES = [
  ['#bb8155', '#2c221e', 'curly', 'coffee'], ['#e7b48c', '#402921', 'long', 'cook'],
  ['#c79169', '#3c3430', 'glasses', 'garden'], ['#cb9471', '#523f30', 'quiff', 'coffee'],
  ['#e3ae87', '#8d5039', 'bun', 'cook'], ['#b98262', '#262d36', 'headphones', 'swim'],
  ['#935f46', '#25282c', 'curly', 'ball'], ['#d9a17e', '#343346', 'hijab', 'garden'],
  ['#e5b491', '#8c683c', 'cap', 'smoke'], ['#c38c67', '#443d50', 'hijab', 'coffee'],
  ['#dca886', '#59362b', 'bob', 'arcade']
];
export function configureRoster(records) {
  if (!Array.isArray(records) || records.some(r => !r || typeof r.name !== 'string' || !r.name.trim() || typeof r.role !== 'string') || new Set(records.map(r => r.agentId || r.name.toLowerCase())).size !== records.length) throw new Error('Expected unique live Waker definitions.');
  const counts = new Map();
  const rows = records.map((r, i) => {
    const team = TEAMS.find(t => t.name === r.team) || UNASSIGNED_TEAM;
    const slot = counts.get(team.id) || 0;
    counts.set(team.id, slot + 1);
    const [tx, ty] = team.tileRoom;
    const [skin, hair, style, hobby] = APPEARANCES[(r.avatarVariant ?? i) % APPEARANCES.length];
    const intakeLobby = r.roleKey === 'intake';
    const xStart = team.id === 'delivery' ? tx + 2 : tx + 3;
    const x = xStart + (slot % 5) * 3;
    const y = ty + 4 + Math.floor(slot / 5) * 3;
    return [r.agentId || r.name, r.name, r.role, team.id, x * 16 + 8, y * 16 + 8, skin, hair, style, { room: intakeLobby ? 'lobby' : team.id, hobby, placeholder: false, squad: r.squad, pod: r.default_pod, shared: r.shared, configurationStatus: r.status, roleKey: r.roleKey || 'unassigned', remoteId: r.remoteId || r.agentId }];
  });
  ROSTER.splice(0, ROSTER.length, ...rows);
}

export const STATUSES = {
  WORKING: { label: 'Working', color: '#4ca65a' },
  IDLE: { label: 'Standby', color: '#7a8899' },
  WAITING_APPROVAL: { label: 'Needs approval', color: '#d98a26' },
  BLOCKED: { label: 'Blocked', color: '#d14949' },
  ERROR: { label: 'Error', color: '#d14949' },
  PAUSED: { label: 'Paused', color: '#7a4ca3' },
  STOPPED: { label: 'Stopped', color: '#7a8899' },
  UNMAPPED: { label: 'Not connected', color: '#8c7d6b' },
  STALE: { label: 'Offline', color: '#8c7d6b' },
  PLACEHOLDER: { label: 'Coming soon', color: '#9c8462' }
};

const makeSpot = (tx, ty, activity, type, zone = 'estate', dir = 'down') => ({
  tx, ty, x: tx * 16 + 8, y: ty * 16 + 8, activity, type, zone, dir
});

export const SPOTS = [
  makeSpot(72, 12, 'Swimming laps', 'swim', 'pool', 'down'),
  makeSpot(75, 15, 'Swimming in the pool', 'swim', 'pool', 'left'),
  makeSpot(73, 18, 'Floating in the pool', 'swim', 'pool', 'up'),
  makeSpot(72, 31, 'Shooting hoops', 'ball', 'court', 'up'),
  makeSpot(75, 34, 'Playing ball', 'ball', 'court', 'left'),
  makeSpot(73, 38, 'Kicking a ball', 'ball', 'court', 'up'),
  makeSpot(4, 35, 'Smoking corner', 'smoke', 'smoke', 'down'),
  makeSpot(6, 35, 'Smoking corner', 'smoke', 'smoke', 'down'),
  makeSpot(8, 35, 'Smoking corner', 'smoke', 'smoke', 'left'),
  makeSpot(6, 10, 'Watering the herb garden', 'garden', 'garden', 'left'),
  makeSpot(6, 13, 'Harvesting fresh herbs', 'garden', 'garden', 'right'),
  makeSpot(6, 16, 'Tending vegetable beds', 'garden', 'garden', 'left'),
  makeSpot(4, 20, 'Grilling at the BBQ', 'bbq', 'bbq', 'up'),
  makeSpot(4, 26, 'Chatting in the gazebo', 'chat', 'gazebo', 'right'),
  makeSpot(6, 26, 'Chatting in the gazebo', 'chat', 'gazebo', 'left'),
  makeSpot(46, 34, 'Playing retro arcade', 'arcade', 'lounge', 'up'),
  makeSpot(47, 34, 'High-score arcade run', 'arcade', 'lounge', 'up'),
  makeSpot(41, 35, 'Playing pool table', 'pool_game', 'lounge', 'right'),
  makeSpot(44, 36, 'Lining up a pool shot', 'pool_game', 'lounge', 'left'),
  makeSpot(30, 35, 'Napping on the lounge sofa', 'nap', 'lounge', 'right'),
  makeSpot(35, 35, 'Reading in the lounge', 'read', 'lounge', 'up'),
  makeSpot(29, 28, 'Brewing fresh coffee', 'coffee', 'kitchen', 'up'),
  makeSpot(31, 28, 'Heating a snack', 'coffee', 'kitchen', 'up'),
  makeSpot(33, 28, 'Grabbing a pastry', 'eat', 'kitchen', 'up'),
  makeSpot(42, 24, 'Eating at dining table', 'eat', 'dining', 'down'),
  makeSpot(43, 24, 'Eating at dining table', 'eat', 'dining', 'down'),
  makeSpot(44, 24, 'Eating at dining table', 'eat', 'dining', 'down'),
  makeSpot(45, 24, 'Eating at dining table', 'eat', 'dining', 'down'),
  makeSpot(42, 26, 'Eating together', 'eat', 'dining', 'up'),
  makeSpot(44, 26, 'Eating together', 'eat', 'dining', 'up'),
  makeSpot(42, 29, 'Having tea at bistro table', 'eat', 'dining', 'right'),
  makeSpot(44, 29, 'Having lunch at bistro table', 'eat', 'dining', 'left'),
  makeSpot(69, 11, 'Poolside lounging', 'sit', 'pool', 'right'),
  makeSpot(69, 15, 'Poolside lounging', 'sit', 'pool', 'right'),
  makeSpot(6, 44, 'Watching koi on the bridge', 'walk', 'pond', 'down'),
  makeSpot(35, 51, 'Strolling by the fountain', 'walk', 'courtyard', 'right'),
  makeSpot(34, 41, 'Drinking water in lobby', 'coffee', 'lobby', 'up'),
  makeSpot(29, 24, 'Taking ingredients from fridge', 'cook_fridge', 'kitchen', 'up'),
  makeSpot(30, 24, 'Chopping fresh vegetables', 'cook_chop', 'kitchen', 'up'),
  makeSpot(31, 24, 'Prepping herbs on board', 'cook_chop', 'kitchen', 'up'),
  makeSpot(32, 24, 'Cooking on the stove', 'cook_stove', 'kitchen', 'up'),
  makeSpot(33, 24, 'Sizzling pan on the stove', 'cook_stove', 'kitchen', 'up'),
  makeSpot(35, 24, 'Washing dishes at the sink', 'wash', 'kitchen', 'up'),
  makeSpot(36, 24, 'Rinsing bowls at the sink', 'wash', 'kitchen', 'up'),
  // Indoor Office Discussion & Team Meeting Spots (indices 44..55; keeps COOK_STAGES 37..43 intact)
  makeSpot(42, 10, 'Discussing sprint in Meeting Room', 'discuss', 'meeting', 'right'),
  makeSpot(45, 10, 'Discussing sprint in Meeting Room', 'discuss', 'meeting', 'left'),
  makeSpot(42, 13, 'Reviewing specs in Meeting Room', 'discuss', 'meeting', 'right'),
  makeSpot(45, 13, 'Reviewing specs in Meeting Room', 'discuss', 'meeting', 'left'),
  makeSpot(24, 20, 'Quick sync in Atrium', 'chat', 'atrium', 'right'),
  makeSpot(26, 20, 'Quick sync in Atrium', 'chat', 'atrium', 'left'),
  makeSpot(44, 20, 'Discussing task in Atrium', 'chat', 'atrium', 'right'),
  makeSpot(46, 20, 'Discussing task in Atrium', 'chat', 'atrium', 'left'),
  makeSpot(31, 36, 'Chatting in Lounge', 'chat', 'lounge', 'right'),
  makeSpot(33, 36, 'Chatting in Lounge', 'chat', 'lounge', 'left'),
  makeSpot(31, 42, 'Briefing in Lobby', 'chat', 'lobby', 'right'),
  makeSpot(33, 42, 'Briefing in Lobby', 'chat', 'lobby', 'left')
];

export const DISCUSSION_GROUPS = [
  { id: 'meeting', spots: [44, 45, 46, 47], label: 'Meeting Room huddle' },
  { id: 'atrium-west', spots: [48, 49], label: 'Atrium sync' },
  { id: 'atrium-east', spots: [50, 51], label: 'Delivery corridor sync' },
  { id: 'lounge', spots: [52, 53], label: 'Lounge discussion' },
  { id: 'lobby', spots: [54, 55], label: 'Lobby briefing' },
  { id: 'gazebo', spots: [13, 14], label: 'Gazebo break chat' }
];

export const DISCUSSION_SCRIPTS = [
  ['Cek brief klien?', 'PRD sudah rapi!', 'Desain lanjut!', 'Siap dikawal!'],
  ['API contract ok?', 'Endpoint ready!', 'FE siap integrasi!', 'Gas ke QA!'],
  ['Layout HP aman?', 'Zero overflow!', 'Kontras 4.5:1!', 'Mantap, clean!'],
  ['Sprint aman?', 'Progress lancar!', 'Tanpa blocker!', 'Lanjut milestone!'],
  ['Cek test case?', 'Suite hijau!', 'Regresi aman!', 'Siap rilis!'],
  ['Ngopi sebentar?', 'Boleh, lanjut sync', 'Ide bagus tuh!', 'Oke deal!'],
  ['Review PR yuk', 'Otw cek kode!', 'Struktur rapi!', 'Approved!']
];

export const COOK_STAGES = [
  { stage: 'fridge', spots: [37], duration: 2.2, label: () => 'Taking ingredients from fridge', pose: 'cook' },
  { stage: 'counter', spots: [38, 39], duration: 2.6, label: () => 'Chopping ingredients at counter', pose: 'cook' },
  { stage: 'stove', spots: [40, 41], duration: 3.0, label: d => `Cooking ${d.name}`, pose: 'cook' },
  { stage: 'serve', spots: [24, 25, 26, 27, 28, 29, 30, 31], duration: 3.4, label: d => `Eating ${d.name}`, pose: 'eat' },
  { stage: 'sink', spots: [42, 43], duration: 2.4, label: () => 'Washing dishes at sink', pose: 'cook' }
];

export function buildWalkGrid() {
  const grid = Array.from({ length: GRID_ROWS }, () => new Uint8Array(GRID_COLS));
  const blockRect = (tx, ty, tw, th) => {
    for (let y = Math.max(0, ty); y < Math.min(GRID_ROWS, ty + th); y++) {
      for (let x = Math.max(0, tx); x < Math.min(GRID_COLS, tx + tw); x++) grid[y][x] = 1;
    }
  };
  const clearRect = (tx, ty, tw, th) => {
    for (let y = Math.max(0, ty); y < Math.min(GRID_ROWS, ty + th); y++) {
      for (let x = Math.max(0, tx); x < Math.min(GRID_COLS, tx + tw); x++) grid[y][x] = 0;
    }
  };

  blockRect(0, 0, GRID_COLS, 1);
  blockRect(0, GRID_ROWS - 1, GRID_COLS, 1);
  blockRect(0, 0, 1, GRID_ROWS);
  blockRect(GRID_COLS - 1, 0, 1, GRID_ROWS);

  blockRect(12, 6, 56, 2);
  blockRect(12, 46, 56, 1);
  blockRect(12, 6, 1, 41);
  blockRect(67, 6, 1, 41);

  blockRect(27, 6, 1, 13);
  blockRect(38, 6, 1, 13);
  blockRect(49, 6, 1, 13);
  blockRect(12, 19, 38, 1);
  blockRect(50, 23, 18, 1);
  blockRect(50, 18, 1, 6);
  blockRect(18, 20, 1, 5);
  blockRect(12, 25, 16, 2);
  blockRect(27, 25, 1, 14);
  blockRect(12, 38, 16, 1);
  blockRect(50, 26, 18, 2);
  blockRect(50, 26, 1, 14);
  blockRect(50, 39, 18, 1);
  blockRect(28, 22, 10, 1);
  blockRect(28, 31, 9, 1);
  blockRect(28, 38, 9, 1);
  blockRect(37, 39, 5, 1);

  for (const [, , , , dx, dy, , , , opts] of ROSTER) {
    if (opts?.unassigned) continue;
    const tx = Math.floor(dx / 16), ty = Math.floor(dy / 16);
    blockRect(tx, ty - 1, 1, 1);
  }

  blockRect(29, 23, 9, 1);
  blockRect(29, 27, 1, 1);
  blockRect(31, 27, 1, 1);
  blockRect(33, 27, 1, 1);
  blockRect(42, 25, 4, 1);
  blockRect(43, 29, 1, 1);
  blockRect(32, 10, 3, 1);
  blockRect(43, 11, 2, 2);
  blockRect(30, 32, 2, 1);
  blockRect(34, 32, 2, 1);
  blockRect(46, 33, 2, 1);
  blockRect(42, 35, 2, 2);
  blockRect(65, 8, 2, 2);
  blockRect(65, 19, 2, 1);
  blockRect(14, 27, 2, 1);
  blockRect(24, 27, 2, 1);

  blockRect(4, 41, 5, 3);
  blockRect(4, 45, 5, 2);
  clearRect(5, 44, 3, 1);
  blockRect(38, 51, 2, 2);
  blockRect(31, 55, 2, 2);
  blockRect(15, 50, 3, 2);
  blockRect(20, 50, 3, 2);
  blockRect(15, 54, 3, 2);
  blockRect(3, 19, 2, 1);

  clearRect(38, 46, 2, 1);
  clearRect(38, 6, 2, 2);
  clearRect(12, 21, 1, 2);
  clearRect(12, 18, 1, 2);
  clearRect(67, 24, 1, 2);
  clearRect(20, 19, 2, 1);
  clearRect(27, 13, 2, 2);
  clearRect(32, 18, 2, 2);
  clearRect(38, 13, 2, 2);
  clearRect(43, 18, 2, 2);
  clearRect(49, 13, 2, 2);
  clearRect(50, 20, 1, 2);
  clearRect(55, 23, 2, 1);
  clearRect(18, 21, 1, 2);
  clearRect(20, 25, 2, 2);
  clearRect(27, 33, 1, 2);
  clearRect(55, 26, 2, 2);
  clearRect(50, 33, 1, 2);
  clearRect(38, 22, 4, 1);
  clearRect(38, 31, 4, 1);
  clearRect(35, 38, 2, 2);
  clearRect(42, 38, 2, 2);
  clearRect(36, 58, 6, 2);

  for (const [, , , , dx, dy] of ROSTER) {
    const tx = Math.floor(dx / 16), ty = Math.floor(dy / 16);
    grid[ty][tx] = 0;
  }
  for (const spot of SPOTS) grid[spot.ty][spot.tx] = 0;

  return grid;
}

export class OfficeModel {
  constructor(random = Math.random) {
    this.random = random;
    this.time = 0;
    this.mode = 'live';
    this.projectName = 'QoderWake · JADIDULU Office';
    this.reducedMotion = false;
    this.logs = [];
    this.handoffs = [];
    this.approvals = [];
    this.listeners = new Set();
    this.progress = { intake: 0, delivery: 0, billing: 0, control: 0 };
    this.reloadRoster();
  }

  reloadRoster() {
    this.walkGrid = buildWalkGrid();
    const previous = new Map((this.agents || []).map(agent => [agent.id, agent]));
    this.agents = ROSTER.map(([id, name, role, team, x, y, skin, hair, style, opts = {}], i) => {
      const remoteId = opts.remoteId || id;
      const desk = { x, y, tx: Math.floor(x / 16), ty: Math.floor(y / 16) };
      const old = previous.get(id);
      if (old) {
        const sameDesk = old.desk.x === x && old.desk.y === y;
        if (!sameDesk) this.releaseSpot(old);
        return { ...old, name, role, team, skin, hair, style, index: i, enabled: true, placeholder: false, squad: opts.squad, pod: opts.pod, shared: opts.shared, configurationStatus: opts.configurationStatus, roleKey: opts.roleKey, room: opts.room || team, desk, remoteId, ...(sameDesk ? {} : { x, y, path: [] }) };
      }
      return {
        id, name, role, team, skin, hair, style, index: i,
        placeholder: false, enabled: true,
        squad: opts.squad, pod: opts.pod, shared: opts.shared, configurationStatus: opts.configurationStatus, roleKey: opts.roleKey,
        unassigned: team === 'unassigned', hobby: opts.hobby || 'coffee', room: opts.room || team, desk,
        x, y, dir: 'down', pose: 'idle', walkFrame: 0,
        path: [], spot: null, status: 'IDLE', task: '', artifact: '', dish: null, cookStage: -1,
        chatPartner: null, chatBubble: '', chatGroup: null, speaking: false, discussKind: '', discussUntil: 0,
        needs: { energy: 65 + (i * 7) % 30, hunger: 60 + (i * 11) % 35, social: 62 + (i * 13) % 32 },
        weights: { cook: opts.hobby === 'cook' ? 3.2 : 1, swim: opts.hobby === 'swim' ? 3.2 : 1, ball: opts.hobby === 'ball' ? 3.2 : 1, smoke: opts.hobby === 'smoke' ? 2.8 : 0.7, garden: opts.hobby === 'garden' ? 3.0 : 1, coffee: opts.hobby === 'coffee' ? 2.8 : 1.2, arcade: opts.hobby === 'arcade' ? 3.0 : 1, read: opts.hobby === 'read' ? 2.8 : 1, chat: opts.hobby === 'chat' ? 3.0 : 1.5 },
        loop: 0, history: [], activity: 'No active task reported by QoderWake.', activityDuration: 10, activityUntil: 0,
        remoteId, previousStatus: 'IDLE', liveUrl: '', taskStarted: 0
      };
    });
  }

  onChange(fn, options = {}) { this.listeners.add(fn); if (options.initial) fn(); return () => this.listeners.delete(fn); }
  changed() { this.listeners.forEach(fn => fn()); }
  get(id) { return this.agents.find(a => a.id === id || a.name.toLowerCase() === String(id).toLowerCase()); }
  activeAgents() { return this.agents.filter(a => a.enabled); }

  isWalkable(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= GRID_COLS || ty >= GRID_ROWS) return false;
    return this.walkGrid[ty][tx] === 0;
  }

  findPath(startX, startY, targetX, targetY) {
    const start = pxToTile(startX, startY);
    const goal = pxToTile(targetX, targetY);
    if (start.tx === goal.tx && start.ty === goal.ty) return [{ x: targetX, y: targetY }];

    const cols = GRID_COLS, rows = GRID_ROWS, total = cols * rows;
    const gScore = new Float32Array(total).fill(1e9);
    const parent = new Int32Array(total).fill(-1);
    const closed = new Uint8Array(total);
    const startIdx = start.ty * cols + start.tx;
    const goalIdx = goal.ty * cols + goal.tx;
    gScore[startIdx] = 0;

    const open = [startIdx];
    const fScore = new Float32Array(total).fill(1e9);
    fScore[startIdx] = Math.abs(goal.tx - start.tx) + Math.abs(goal.ty - start.ty);

    const dirs = [
      [0, -1, 1], [1, 0, 1], [0, 1, 1], [-1, 0, 1],
      [1, -1, 1.414], [1, 1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]
    ];

    let found = false;
    while (open.length > 0) {
      let bestPos = 0;
      for (let i = 1; i < open.length; i++) {
        if (fScore[open[i]] < fScore[open[bestPos]]) bestPos = i;
      }
      const current = open[bestPos];
      open[bestPos] = open[open.length - 1];
      open.pop();

      if (current === goalIdx) { found = true; break; }
      if (closed[current]) continue;
      closed[current] = 1;

      const cx = current % cols, cy = (current / cols) | 0;
      for (let d = 0; d < dirs.length; d++) {
        const [dx, dy, cost] = dirs[d];
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const nIdx = ny * cols + nx;
        if (closed[nIdx]) continue;
        if (nIdx !== goalIdx && this.walkGrid[ny][nx] !== 0) continue;
        if (dx !== 0 && dy !== 0) {
          if (this.walkGrid[cy][nx] !== 0 || this.walkGrid[ny][cx] !== 0) continue;
        }
        const tentativeG = gScore[current] + cost;
        if (tentativeG < gScore[nIdx]) {
          parent[nIdx] = current;
          gScore[nIdx] = tentativeG;
          fScore[nIdx] = tentativeG + Math.hypot(goal.tx - nx, goal.ty - ny);
          open.push(nIdx);
        }
      }
    }

    if (!found) return [{ x: targetX, y: targetY }];

    const waypoints = [];
    let curr = goalIdx;
    while (curr !== -1 && curr !== startIdx) {
      const tx = curr % cols, ty = (curr / cols) | 0;
      waypoints.push(tileToPx(tx, ty));
      curr = parent[curr];
    }
    waypoints.reverse();
    if (waypoints.length) waypoints[waypoints.length - 1] = { x: targetX, y: targetY };
    else waypoints.push({ x: targetX, y: targetY });
    return waypoints;
  }

  togglePlaceholder(id, forceState = null) {
    const a = this.get(id);
    if (!a || !a.placeholder) return false;
    const next = forceState !== null ? Boolean(forceState) : !a.enabled;
    a.enabled = next;
    if (next) {
      a.status = 'IDLE';
      a.x = a.desk.x; a.y = a.desk.y; a.path = [];
      this.chooseSpot(a, false);
      this.log(`${a.name} desk switched ON.`, 'command', a.id);
    } else {
      this.releaseSpot(a);
      a.status = 'PLACEHOLDER'; a.task = ''; a.activity = 'Coming soon';
      a.path = []; a.x = a.desk.x; a.y = a.desk.y;
      this.log(`${a.name} set back to placeholder desk.`, 'command', a.id);
    }
    this.changed();
    return a.enabled;
  }

  log(text, kind = 'info', agentId = null) {
    this.logs.unshift({ id: `${this.time}-${this.logs.length}-${this.random()}`, text, kind, agentId, timestamp: new Date().toISOString() });
    this.logs = this.logs.slice(0, 120);
    this.changed();
  }

  relay(fromId, toId, label) {
    const fromAgent = this.get(fromId);
    const toAgent = this.get(toId);
    const from = fromAgent?.desk || { x: 39 * 16 + 8, y: 41 * 16 + 8 };
    const to = toAgent?.desk;
    if (!to) return false;
    const via = fromAgent && toAgent && fromAgent.team !== toAgent.team
      ? { x: 44 * 16 + 8, y: 12 * 16 + 8 }
      : null;
    this.handoffs.push({ from: { ...from }, to: { ...to }, via, label, age: 0, duration: 2.8 });
    const tag = String(label || 'Update').slice(0, 12);
    if (fromAgent && toAgent && fromAgent !== toAgent) {
      fromAgent.chatPartner = toAgent.id;
      fromAgent.chatBubble = `Kirim ${tag}!`;
      fromAgent.speaking = true;
      fromAgent.discussKind = 'work';
      fromAgent.discussUntil = this.time + 7;
      toAgent.chatPartner = fromAgent.id;
      toAgent.chatBubble = `Terima ${tag}!`;
      toAgent.speaking = false;
      toAgent.discussKind = 'work';
      toAgent.discussUntil = this.time + 7;
    } else if (toAgent) {
      toAgent.chatBubble = `Siap ${tag}!`;
      toAgent.speaking = true;
      toAgent.discussKind = 'work';
      toAgent.discussUntil = this.time + 6;
    }
    return true;
  }

  startMeetingHuddle(maxParticipants = 4) {
    const meetingSpots = [44, 45, 46, 47];
    const candidates = this.activeAgents().filter(a => ['IDLE', 'UNMAPPED'].includes(a.status));
    if (candidates.length < 2) return 0;
    const chosen = candidates.slice(0, Math.min(maxParticipants, meetingSpots.length));
    // Free those meeting spots from anyone else first
    for (const a of this.agents) {
      if (meetingSpots.includes(a.spot) && !chosen.includes(a)) this.releaseSpot(a);
    }
    chosen.forEach((a, idx) => {
      this.releaseSpot(a);
      const spotIdx = meetingSpots[idx];
      const spot = SPOTS[spotIdx];
      a.spot = spotIdx;
      a.activity = spot.activity;
      a.activityDuration = 18 + this.random() * 6;
      a.activityUntil = 0;
      a.chatGroup = 'meeting';
      if (this.reducedMotion) {
        a.x = spot.x; a.y = spot.y; a.dir = spot.dir; a.path = [];
        a.activityUntil = this.time + a.activityDuration;
      } else {
        this.route(a, spot, false);
      }
    });
    this.log(`Diskusi tim dimulai di Meeting Room (${chosen.map(a => a.name).join(', ')}).`, 'info', chosen[0]?.id);
    this.changed();
    return chosen.length;
  }

  seed() {
    this.approvals = [];
    this.handoffs = [];
    this.progress = { intake: 0, delivery: 0, billing: 0, control: 0 };
    for (const a of this.agents) {
      this.releaseSpot(a);
      a.enabled = Boolean(a.remoteId); a.liveUrl = ''; a.lastSynced = null;
      a.path = []; a.status = 'UNMAPPED'; a.task = ''; a.artifact = '';
      a.activity = a.remoteId ? 'Offline · last known QoderWake Waker' : 'Waiting for a verified QoderWake snapshot';
      a.x = a.desk.x; a.y = a.desk.y;
    }
  }

  history(a, status) {
    if (!STATUSES[status]) return;
    a.history.unshift({ status, timestamp: new Date().toISOString() });
    a.history = a.history.slice(0, 12);
  }

  releaseSpot(a) {
    a.spot = null; a.activityUntil = 0; a.cookStage = -1; a.dish = null;
    a.chatGroup = null; a.speaking = false; a.discussKind = ''; a.discussUntil = 0;
    if (a.chatPartner) {
      const partner = this.get(a.chatPartner);
      if (partner && partner.chatPartner === a.id) {
        partner.chatPartner = null; partner.chatBubble = ''; partner.speaking = false;
      }
      a.chatPartner = null; a.chatBubble = '';
    }
  }

  route(a, target, toDesk = false) {
    const dest = toDesk ? a.desk : target;
    a.path = this.findPath(a.x, a.y, dest.x, dest.y);
  }

  startCookingSequence(a, immediate = false) {
    this.releaseSpot(a);
    a.dish = DISHES[Math.floor(this.random() * DISHES.length)];
    a.cookStage = 0;
    this.applyCookStage(a, immediate);
  }

  applyCookStage(a, immediate = false) {
    const stageDef = COOK_STAGES[a.cookStage];
    if (!stageDef) {
      a.cookStage = -1; a.dish = null;
      a.needs.hunger = Math.min(100, a.needs.hunger + 40);
      this.chooseSpot(a, false);
      return;
    }
    const occupied = new Set(this.agents.filter(b => b !== a && b.spot !== null).map(b => b.spot));
    const available = stageDef.spots.filter(idx => !occupied.has(idx));
    const spotIdx = available.length ? available[Math.floor(this.random() * available.length)] : stageDef.spots[0];
    if (occupied.has(spotIdx)) { this.chooseSpot(a, immediate, true); return; }
    a.spot = spotIdx;
    const spot = SPOTS[spotIdx];
    a.activity = stageDef.label(a.dish || DISHES[0]);
    a.activityDuration = stageDef.duration + this.random() * 0.8;
    a.activityUntil = 0;
    if (immediate) {
      a.x = spot.x; a.y = spot.y; a.dir = spot.dir || 'up'; a.path = [];
      a.activityUntil = this.time + a.activityDuration;
    } else {
      this.route(a, spot, false);
    }
  }

  chooseSpot(a, immediate = false, skipCookForce = false) {
    if (a.placeholder && !a.enabled) return;
    const anyoneCooking = this.agents.some(b => b.enabled && b.status === 'IDLE' && b.cookStage >= 0);
    if (!anyoneCooking && !skipCookForce) {
      const fridgeOccupied = this.agents.some(b => b !== a && b.spot === 37);
      if (!fridgeOccupied) { this.startCookingSequence(a, immediate); return; }
    }

    this.releaseSpot(a);
    const occupied = new Set(this.agents.filter(b => b !== a && b.spot !== null).map(b => b.spot));
    const choices = SPOTS.map((s, i) => i).filter(i => !occupied.has(i) && i !== a.spot && !(i > 37 && i <= 43));
    if (!choices.length) return;

    let chosen;
    if (immediate) {
      const activeTypes = new Set(this.agents.filter(b => b !== a && b.spot !== null).map(b => SPOTS[b.spot]?.type));
      const novelChoices = choices.filter(i => !activeTypes.has(SPOTS[i].type));
      const pool = novelChoices.length ? novelChoices : choices;
      chosen = pool[a.index % pool.length];
    } else {
      const hasWaitingPartner = idx => {
        const group = DISCUSSION_GROUPS.find(g => g.spots.includes(idx));
        return Boolean(group && group.spots.some(sIdx => sIdx !== idx && occupied.has(sIdx)));
      };
      let totalWeight = 0;
      const weights = choices.map(i => {
        const s = SPOTS[i];
        let w = 1;
        if (i === 37 || s.type === 'eat' || s.type === 'bbq') w *= (a.weights.cook || 1) * (a.needs.hunger < 55 ? 2.6 : 1.1);
        else if (s.type === 'nap' || s.type === 'sit' || s.type === 'coffee') w *= (a.weights.coffee || 1) * (a.needs.energy < 55 ? 2.5 : 1.1);
        else if (s.type === 'discuss' || s.type === 'chat') {
          w *= (a.weights.chat || 1.4) * (a.needs.social < 65 ? 2.8 : 1.6);
          if (hasWaitingPartner(i)) w *= 3.8;
        }
        else if (s.type === 'arcade' || s.type === 'pool_game') w *= (a.weights.chat || 1) * (a.needs.social < 55 ? 2.2 : 1.1);
        else if (s.type === 'swim') w *= a.weights.swim || 1;
        else if (s.type === 'ball') w *= a.weights.ball || 1;
        else if (s.type === 'smoke') w *= a.weights.smoke || 0.8;
        else if (s.type === 'garden') w *= a.weights.garden || 1;
        totalWeight += w;
        return w;
      });
      let r = this.random() * totalWeight;
      chosen = choices[0];
      for (let k = 0; k < choices.length; k++) { r -= weights[k]; if (r <= 0) { chosen = choices[k]; break; } }
    }

    if (chosen === 37) { this.startCookingSequence(a, immediate); return; }

    a.spot = chosen;
    const spot = SPOTS[chosen];
    a.activity = spot.activity;
    a.activityUntil = 0;
    const group = DISCUSSION_GROUPS.find(g => g.spots.includes(chosen));
    a.chatGroup = group ? group.id : null;
    a.activityDuration = group ? (14 + this.random() * 8) : (8 + this.random() * 7);

    if (spot.type === 'eat') a.dish = DISHES[(a.index + Math.floor(this.time)) % DISHES.length];

    if (immediate) {
      a.x = spot.x; a.y = spot.y; a.dir = spot.dir || 'down'; a.path = [];
      a.activityUntil = this.time + a.activityDuration;
    } else {
      this.route(a, spot, false);
    }
  }

  setStatus(a, status, task = a.task, notify = true) {
    if (!a || !STATUSES[status]) return;
    if (a.placeholder && !a.enabled && !['PLACEHOLDER', 'UNMAPPED'].includes(status)) a.enabled = true;
    const previous = a.status;
    a.status = status;
    a.task = task;
    this.history(a, status);
    if (a.placeholder && !a.enabled) { if (notify) this.changed(); return; }
    if (status === 'PAUSED') {
      if (previous !== 'PAUSED') a.previousStatus = previous;
    } else if (['IDLE', 'STOPPED', 'UNMAPPED'].includes(status)) {
      if (!a.path.length && a.spot === null) this.chooseSpot(a);
    } else if (status !== 'PLACEHOLDER') {
      this.releaseSpot(a);
      this.route(a, a.desk, true);
      a.activity = '';
      if (status === 'WORKING') a.taskStarted = this.time;
    }
    if (notify) this.changed();
  }

  applyEvent(event) {
    const a = this.agents.find(a => a.remoteId === event.agent_id || a.id === event.agent_id || a.name.toLowerCase() === String(event.agent_id).toLowerCase());
    if (!a || !STATUSES[event.status]) return false;
    if (a.placeholder && !['UNMAPPED', 'PLACEHOLDER'].includes(event.status)) a.enabled = true;
    const task = typeof event.task === 'string' ? event.task.slice(0, 2000) : '';
    if (a.status !== event.status || a.task !== task) {
      this.setStatus(a, event.status, task, false);
      this.log(`${a.name} · ${STATUSES[event.status].label}${task ? ` · ${task}` : ''}`, 'live', a.id);
    }
    if (typeof event.artifact === 'string') a.artifact = event.artifact;
    if (event.timestamp) a.lastSynced = event.timestamp;
    return true;
  }

  update(dt) {
    this.time += dt;
    let dirty = false;

    this.handoffs.forEach(h => h.age += dt);
    this.handoffs = this.handoffs.filter(h => h.age < h.duration);

    for (const a of this.agents) {
      if (!a.enabled || a.status === 'PLACEHOLDER' || a.status === 'PAUSED') continue;

      if (a.status === 'WORKING') {
        a.needs.energy = Math.max(15, a.needs.energy - dt * 0.35);
        a.needs.hunger = Math.max(15, a.needs.hunger - dt * 0.4);
        a.needs.social = Math.max(15, a.needs.social - dt * 0.25);
      } else if (a.spot !== null && !a.path.length) {
        const sType = SPOTS[a.spot]?.type;
        if (sType === 'eat' || sType === 'bbq' || a.cookStage >= 0) a.needs.hunger = Math.min(100, a.needs.hunger + dt * 2.5);
        if (sType === 'nap' || sType === 'sit' || sType === 'coffee') a.needs.energy = Math.min(100, a.needs.energy + dt * 2.5);
        if (sType === 'discuss' || sType === 'chat' || sType === 'arcade' || sType === 'pool_game' || sType === 'ball') a.needs.social = Math.min(100, a.needs.social + dt * 2.5);
      }

      const deskBound = ['WORKING', 'WAITING_APPROVAL', 'BLOCKED', 'ERROR'].includes(a.status);
      if (a.path.length && !this.reducedMotion) {
        const target = a.path[0];
        const dx = target.x - a.x, dy = target.y - a.y, d = Math.hypot(dx, dy);
        const speed = deskBound ? 240 : 120;
        const step = Math.min(d, dt * speed);
        if (Math.abs(dx) > Math.abs(dy)) a.dir = dx > 0 ? 'right' : 'left';
        else if (d > 0.5) a.dir = dy > 0 ? 'down' : 'up';

        const nx = a.x + (dx / (d || 1)) * step;
        const ny = a.y + (dy / (d || 1)) * step;
        const blocker = deskBound ? null : this.agents.find(b => b !== a && b.enabled && Math.hypot(nx - b.x, ny - b.y) < 10 && (b.index < a.index || !b.path.length));
        if (!blocker) { a.x = nx; a.y = ny; }
        else {
          const side = a.index % 2 ? 1 : -1;
          const sx = nx + (-dy / (d || 1)) * dt * 20 * side;
          const sy = ny + (dx / (d || 1)) * dt * 20 * side;
          const st = pxToTile(sx, sy);
          if (this.isWalkable(st.tx, st.ty)) { a.x = sx; a.y = sy; }
          else { a.x = nx; a.y = ny; }
        }
        a.walkFrame = (Math.floor(this.time * 8 + a.index) % 3);
        if (d < 3) {
          a.x = target.x; a.y = target.y; a.path.shift();
          if (!a.path.length && a.spot !== null) {
            a.dir = SPOTS[a.spot]?.dir || 'down';
            a.activityUntil = this.time + a.activityDuration;
          } else if (!a.path.length && deskBound) {
            if (Math.hypot(a.x - a.desk.x, a.y - a.desk.y) <= 6) {
              a.x = a.desk.x; a.y = a.desk.y;
            }
            a.dir = 'up';
            a.pose = 'sit_type';
          }
        }
      } else if (this.reducedMotion && deskBound && Math.hypot(a.x - a.desk.x, a.y - a.desk.y) > 1) {
        a.x = a.desk.x; a.y = a.desk.y; a.path = []; a.dir = 'up'; a.pose = 'sit_type';
      }

      if (['IDLE', 'UNMAPPED'].includes(a.status) && !a.path.length && !this.reducedMotion && this.time >= a.activityUntil) {
        if (a.cookStage >= 0) { a.cookStage++; this.applyCookStage(a, false); }
        else this.chooseSpot(a, false);
      }

      // Expire timed work/handoff discussion bubbles cleanly
      if (a.discussKind === 'work' && a.discussUntil > 0 && this.time > a.discussUntil) {
        a.chatBubble = ''; a.speaking = false; a.chatPartner = null; a.discussKind = ''; a.discussUntil = 0;
      }
    }

    const supervisor = this.agents.find(a => a.roleKey === 'plan') || this.get('ethan');
    const blocked = this.agents.find(a => a !== supervisor && a.enabled && ['BLOCKED', 'ERROR'].includes(a.status));
    if (supervisor && blocked && supervisor.status === 'WORKING') {
      const targetX = blocked.desk.x + 16, targetY = blocked.desk.y;
      const last = supervisor.path[supervisor.path.length - 1];
      if ((!last || Math.hypot(last.x - targetX, last.y - targetY) > 12) && Math.hypot(supervisor.x - targetX, supervisor.y - targetY) > 24) {
        supervisor.path = this.findPath(supervisor.x, supervisor.y, targetX, targetY);
      }
    }

    // Guarantee EVERY desk-bound working agent actually walks to and sits squarely at their desk
    for (const a of this.agents) {
      if (!a.enabled || !['WORKING', 'WAITING_APPROVAL', 'BLOCKED', 'ERROR'].includes(a.status)) continue;
      if (a === supervisor && blocked && a.status === 'WORKING') continue;
      const dist = Math.hypot(a.x - a.desk.x, a.y - a.desk.y);
      if (dist > 4 && !a.path.length) {
        if (this.reducedMotion) { a.x = a.desk.x; a.y = a.desk.y; a.dir = 'up'; a.pose = 'sit_type'; }
        else this.route(a, a.desk, true);
      } else if (dist <= 4 && !a.path.length) {
        a.x = a.desk.x; a.y = a.desk.y; a.dir = 'up'; a.pose = 'sit_type';
      }
    }

    this.updateDiscussions();

    if (dirty) this.changed();
  }

  updateDiscussions() {
    // 1. Indoor Meeting Room & Social Discussion Groups (multi-turn animated back-and-forth)
    const groupedAgents = new Set();
    const beat = Math.floor(this.time / 2.4);
    for (let gIdx = 0; gIdx < DISCUSSION_GROUPS.length; gIdx++) {
      const group = DISCUSSION_GROUPS[gIdx];
      const members = this.agents.filter(a => a.enabled && ['IDLE', 'UNMAPPED'].includes(a.status) && !a.path.length && a.spot !== null && group.spots.includes(a.spot));
      if (members.length >= 2) {
        const scriptIdx = (gIdx + members.reduce((sum, m) => sum + m.index, 0) + Math.floor(beat / 4)) % DISCUSSION_SCRIPTS.length;
        const script = DISCUSSION_SCRIPTS[scriptIdx];
        const speakerIdx = beat % members.length;
        const speaker = members[speakerIdx];
        const line = script[beat % script.length];
        members.forEach((m, idx) => {
          groupedAgents.add(m.id);
          const partner = members[(idx + 1) % members.length];
          m.chatGroup = group.id;
          m.chatPartner = partner.id;
          // Face partner across table/pair
          const dx = partner.x - m.x, dy = partner.y - m.y;
          if (Math.abs(dx) >= Math.abs(dy)) m.dir = dx >= 0 ? 'right' : 'left';
          else m.dir = dy >= 0 ? 'down' : 'up';
          if (m === speaker) {
            m.speaking = true;
            m.chatBubble = line;
            m.discussKind = group.id === 'meeting' ? 'meeting' : 'social';
          } else {
            m.speaking = false;
            m.chatBubble = '...';
            m.discussKind = 'listen';
          }
        });
      }
    }
    for (const a of this.agents) {
      if (groupedAgents.has(a.id) || a.discussKind === 'work') continue;
      if (a.discussKind === 'meeting' || a.discussKind === 'social' || a.discussKind === 'listen') {
        a.chatBubble = ''; a.speaking = false; a.chatPartner = null; a.discussKind = '';
      }
    }

    // 2. Live Desk-to-Desk Collaboration Sync among seated WORKING teammates
    if (!this.reducedMotion) {
      const seatedWorkers = this.agents.filter(a => a.enabled && a.status === 'WORKING' && !a.path.length && Math.hypot(a.x - a.desk.x, a.y - a.desk.y) <= 6);
      if (seatedWorkers.length >= 2 && !seatedWorkers.some(a => a.discussKind === 'work')) {
        const syncSlot = Math.floor(this.time / 9);
        if (this._lastWorkSyncSlot !== syncSlot) {
          this._lastWorkSyncSlot = syncSlot;
          const a1 = seatedWorkers[syncSlot % seatedWorkers.length];
          const a2 = seatedWorkers[(syncSlot + 1) % seatedWorkers.length];
          const pairs = [
            ['Sync progress?', 'Lancar, lanjut!'],
            ['API sudah ok?', 'Ready, cek ya!'],
            ['UI cocok spec?', 'Sip, rapi!'],
            ['Test case aman?', 'Semua pass!']
          ];
          const [q, ans] = pairs[syncSlot % pairs.length];
          a1.chatPartner = a2.id; a1.chatBubble = q; a1.speaking = true; a1.discussKind = 'work'; a1.discussUntil = this.time + 4.5;
          a2.chatPartner = a1.id; a2.chatBubble = ans; a2.speaking = false; a2.discussKind = 'work'; a2.discussUntil = this.time + 4.5;
        }
      }
    }
  }
}
