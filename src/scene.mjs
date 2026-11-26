import {
  TILE_SIZE, GRID_COLS, GRID_ROWS, WORLD_W, WORLD_H,
  TEAMS, ROOMS, SPOTS, STATUSES, COOK_STAGES
} from './model.mjs';

// 32-Color Master Pixel-Art Palette
export const PALETTE = {
  INK: '#1e1c24',
  STONE_DARK: '#8c7d6b',
  STONE_MID: '#b8a890',
  STONE_LIGHT: '#ded0b8',
  STONE_CREAM: '#f2ead8',
  WOOD_DARK: '#4a3222',
  WOOD_MID: '#785235',
  WOOD_LIGHT: '#a87952',
  WOOD_TAN: '#cfa97e',
  GOLD_DARK: '#8f6814',
  GOLD_MID: '#d4a024',
  GOLD_BRIGHT: '#fae06b',
  AMBER_DARK: '#8f5314',
  AMBER_MID: '#d98a26',
  AMBER_LIGHT: '#f5c97b',
  BLUE_DARK: '#21476e',
  BLUE_MID: '#3b78b8',
  BLUE_LIGHT: '#8abce6',
  GREEN_DARK: '#225435',
  GREEN_MID: '#3d8c5a',
  GREEN_LIGHT: '#88cc9e',
  PURPLE_DARK: '#452763',
  PURPLE_MID: '#7a4ca3',
  PURPLE_LIGHT: '#b894db',
  GRASS_DARK: '#3b6336',
  GRASS_MID: '#5a8a49',
  GRASS_LIGHT: '#82b366',
  WATER_DEEP: '#2c7da0',
  WATER_BRIGHT: '#61c0df',
  RED_ALERT: '#d14949',
  SLATE_DARK: '#333c4a',
  SLATE_LIGHT: '#7a8899'
};

// Compact 3x5 pixel bitmap font for crisp 1px-aligned pixel labels on the internal canvas
const GLYPHS = {
  A: ['010', '101', '111', '101', '101'],
  B: ['110', '101', '110', '101', '110'],
  C: ['011', '100', '100', '100', '011'],
  D: ['110', '101', '101', '101', '110'],
  E: ['111', '100', '110', '100', '111'],
  F: ['111', '100', '110', '100', '100'],
  G: ['011', '100', '101', '101', '011'],
  H: ['101', '101', '111', '101', '101'],
  I: ['111', '010', '010', '010', '111'],
  J: ['001', '001', '001', '101', '010'],
  K: ['101', '101', '110', '101', '101'],
  L: ['100', '100', '100', '100', '111'],
  M: ['101', '111', '111', '101', '101'],
  N: ['101', '111', '111', '111', '101'],
  O: ['010', '101', '101', '101', '010'],
  P: ['110', '101', '110', '100', '100'],
  Q: ['010', '101', '101', '111', '011'],
  R: ['110', '101', '110', '101', '101'],
  S: ['011', '100', '010', '001', '110'],
  T: ['111', '010', '010', '010', '010'],
  U: ['101', '101', '101', '101', '111'],
  V: ['101', '101', '101', '101', '010'],
  W: ['101', '101', '111', '111', '101'],
  X: ['101', '101', '010', '101', '101'],
  Y: ['101', '101', '010', '010', '010'],
  Z: ['111', '001', '010', '100', '111'],
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
  '!': ['010', '010', '010', '000', '010'],
  '?': ['111', '001', '010', '000', '010'],
  ':': ['000', '010', '000', '010', '000'],
  '.': ['000', '000', '000', '000', '010'],
  '-': ['000', '000', '111', '000', '000'],
  '&': ['010', '101', '010', '101', '011'],
  '%': ['101', '001', '010', '100', '101'],
  '/': ['001', '001', '010', '100', '100'],
  '(': ['010', '100', '100', '100', '010'],
  ')': ['010', '001', '001', '001', '010'],
  ' ': ['000', '000', '000', '000', '000']
};

export function drawPixelText(ctx, text, x, y, color = '#f2ead8', scale = 1, align = 'center', shadow = '#1e1c24') {
  const str = String(text || '').toUpperCase();
  const charW = 4 * scale;
  const totalW = str.length * charW - scale;
  const startX = Math.round(align === 'center' ? x - totalW / 2 : align === 'right' ? x - totalW : x);
  const startY = Math.round(y);
  const renderPass = (ox, oy, fill) => {
    ctx.fillStyle = fill;
    let cx = startX + ox;
    for (let i = 0; i < str.length; i++) {
      const g = GLYPHS[str[i]] || GLYPHS[' '];
      for (let r = 0; r < 5; r++) {
        const row = g[r];
        for (let c = 0; c < 3; c++) {
          if (row[c] === '1') ctx.fillRect(cx + c * scale, startY + oy + r * scale, scale, scale);
        }
      }
      cx += charW;
    }
  };
  if (shadow) renderPass(scale, scale, shadow);
  renderPass(0, 0, color);
}

function drawIndexedMatrix(ctx, ox, oy, rows, colorMap) {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const color = colorMap[ch];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(ox + x, oy + y, 1, 1);
      }
    }
  }
}

export class EstateScene {
  constructor(canvas, model, onSelect = () => { }, onApproval = () => { }) {
    this.canvas = canvas;
    this.ctx = canvas?.getContext ? canvas.getContext('2d') : null;
    this.model = model;
    this.onSelect = onSelect;
    this.onApproval = onApproval;
    this.selected = 'lita';
    this.selectedTeam = null;
    this.followId = null;
    this.night = false;

    // Integer pixel zoom steps: 1x (full estate overview), 2x (mansion detail), 3x (close), 4x (macro pixel art)
    this.pixelScale = 1;
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
    this.focus = null;
    this.pointers = new Map();
    this.hitboxes = [];
    this.lastTime = 0;
    this.fps = 60;
    this.base = 1;
    this.scale = 1;
    this.center = { x: 40 * TILE_SIZE, y: 31 * TILE_SIZE };
    this.worldBounds = { x: 0, y: 0, width: WORLD_W, height: WORLD_H };

    if (typeof document !== 'undefined') {
      this.internalCanvas = document.createElement('canvas');
      this.internalCtx = this.internalCanvas.getContext('2d');
      this.groundCanvas = document.createElement('canvas');
      this.groundCanvas.width = WORLD_W;
      this.groundCanvas.height = WORLD_H;
      this.groundKey = '';
      this.atlasCanvas = document.createElement('canvas');
      this.atlasCanvas.width = 512;
      this.atlasCanvas.height = 512;
      this.atlas = {};
      this.buildAtlas();
      this.minimapCanvas = document.getElementById('minimap-canvas');
      this.bindMinimap();
    }

    if (this.canvas && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(canvas);
      this.bind();
      this.resize();
      this.frame = this.frame.bind(this);
      requestAnimationFrame(this.frame);
    }
  }

  project(x, y, z = 0) {
    return { x: Math.round(x), y: Math.round(y - z * 0.5) };
  }

  screenPoint(p) {
    const s = this.scale || this.pixelScale || 1;
    const cx = this.center?.x ?? 40 * TILE_SIZE;
    const cy = this.center?.y ?? 31 * TILE_SIZE;
    const vy = this.viewportCenterY ?? (this.h || 600) / 2;
    return {
      x: (this.w || 1000) / 2 + this.pan.x + (p.x - cx) * s,
      y: vy + this.pan.y + (p.y - cy) * s
    };
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.w = Math.max(300, Math.round(rect.width));
    this.h = Math.max(240, Math.round(rect.height));
    this.dpr = 1;
    if ('width' in this.canvas) {
      this.canvas.width = this.w;
      this.canvas.height = this.h;
    }
    this.center = { x: 40 * TILE_SIZE, y: 30 * TILE_SIZE };
    this.viewportCenterY = this.h / 2;
    this.base = 1;
    this.scale = this.pixelScale;
    this.worldBounds = { x: 0, y: 0, width: WORLD_W, height: WORLD_H };
  }

  // Generate sprites and props from compact palette-indexed arrays into offscreen atlasCanvas
  buildAtlas() {
    const ctx = this.atlasCanvas.getContext('2d');
    ctx.clearRect(0, 0, 512, 512);

    // 1. Food Dishes (10x7 px each at y=0)
    const dishTemplates = {
      noodles: ['..BBBBBB..', '.BYYYYYYB.', 'BYYRYYRYYB', 'BYGGGGGGYB', 'BYYYYYYYYB', '.BBBBBBBB.', '..BBBBBB..'],
      rice: ['...WWWW...', '..WWWWWW..', '.WWGWWGWW.', 'WWWWWWWWWW', 'BBBBBBBBBB', '.BBBBBBBB.', '..BBBBBB..'],
      burger: ['..OOOOOO..', '.OOOOOOOO.', 'GGGGGGGGGG', 'RRRRRRRRRR', 'YYYYYYYYYY', '.OOOOOOOO.', '..OOOOOO..'],
      soup: ['..BBBBBB..', '.BGGGGGGB.', 'BGGYGGYGGB', 'BGGGGGGGGB', '.BBBBBBBB.', '..BBBBBB..'],
      salad: ['..GGGGGG..', '.GGRGGRGG.', 'GGGYGGYGGG', '.BBBBBBBB.', '..BBBBBB..'],
      cake: ['....RR....', '..YYYYYY..', '.WWWWWWWW.', '.YYYYYYYY.', '.RRRRRRRR.', 'WWWWWWWWWW']
    };
    const dishMap = {
      B: PALETTE.BLUE_MID, Y: PALETTE.GOLD_BRIGHT, R: PALETTE.RED_ALERT,
      G: PALETTE.GRASS_LIGHT, W: PALETTE.STONE_CREAM, O: PALETTE.AMBER_MID
    };
    Object.keys(dishTemplates).forEach((key, i) => {
      drawIndexedMatrix(ctx, i * 16, 0, dishTemplates[key], dishMap);
      this.atlas[`dish_${key}`] = { x: i * 16, y: 0, w: 10, h: 7 };
    });

    // 2. Potted Plant (12x16 at y=16)
    drawIndexedMatrix(ctx, 0, 16, [
      '....GGGG....',
      '..GGLGGLGG..',
      '.GGLLGGLLGG.',
      '..GGDGGDGG..',
      '...GDDDDG...',
      '....GGGG....',
      '..KKKKKKKK..',
      '..KOOOOOOK..',
      '...KOOOOK...',
      '...KDDDDK...',
      '....KKKK....'
    ], { G: PALETTE.GRASS_MID, L: PALETTE.GRASS_LIGHT, D: PALETTE.GRASS_DARK, K: PALETTE.INK, O: PALETTE.WOOD_LIGHT });
    this.atlas.plant = { x: 0, y: 16, w: 12, h: 11 };

    // 3. Watering Can (10x8 at x=16, y=16)
    drawIndexedMatrix(ctx, 16, 16, [
      '....KKKK..',
      '...KBBBBK.',
      'KK.KBBBBKK',
      '.KKKBBBBK.',
      '...KDDDDK.',
      '....KKKK..'
    ], { K: PALETTE.INK, B: PALETTE.BLUE_LIGHT, D: PALETTE.BLUE_MID });
    this.atlas.can = { x: 16, y: 16, w: 10, h: 6 };

    // 4. Bake 16x24 character sprites for every Waker across 4 directions, 3 walk frames & 11 poses
    this.agentSprites = new Map();
    for (const a of this.model.agents) this.bakeAgentSprites(a);
  }

  bakeAgentSprites(a) {
    if (typeof document === 'undefined') return;
    const team = TEAMS.find(t => t.id === a.team) || TEAMS[0];
    const poses = [
      'down_0', 'down_1', 'down_2', 'up_0', 'up_1', 'up_2',
      'left_0', 'left_1', 'left_2', 'right_0', 'right_1', 'right_2',
      'sit_type', 'sit_type_2', 'wait_approval', 'swim', 'cook', 'eat', 'coffee', 'smoke', 'ball', 'chat', 'wave', 'nap',
      'talk_down', 'talk_up', 'talk_left', 'talk_right'
    ];
    const strip = document.createElement('canvas');
    strip.width = poses.length * 16;
    strip.height = 24;
    const c = strip.getContext('2d');
    const map = {
      K: PALETTE.INK, S: a.skin, H: a.hair,
      T: a.unassigned ? PALETTE.GOLD_MID : team.color,
      D: a.unassigned ? PALETTE.GOLD_DARK : team.dark,
      L: PALETTE.STONE_CREAM, P: PALETTE.SLATE_DARK,
      G: PALETTE.GOLD_BRIGHT, W: PALETTE.WATER_BRIGHT,
      C: PALETTE.WOOD_LIGHT, R: PALETTE.RED_ALERT
    };
    poses.forEach((pose, idx) => this.drawCharacterPoseToAtlas(c, idx * 16, 0, a, pose, map));
    this.agentSprites.set(a.id, { canvas: strip, poses });
  }

  drawCharacterPoseToAtlas(c, ox, oy, a, pose, map) {
    if (pose === 'nap') {
      drawIndexedMatrix(c, ox, oy + 7, [
        '..KKKK....KKKK..',
        '.KHHHHK..KTTTTK.',
        '.KHSSSHKKTTTTTTK',
        '.KSSKSSKTTTTTTTK',
        '.KSSSSSKPPPPPPPK',
        '..KKKKK..KKKKKK.'
      ], map);
      return;
    }
    if (pose === 'swim') {
      drawIndexedMatrix(c, ox, oy + 6, [
        '....KKKKKKKK....',
        '...KHHHHHHHHK...',
        '..KHHSSSSSSHHK..',
        '..KHSSKSSKSSHK..',
        '..KHSSSSSSSSHK..',
        '...KSSSSSSSSK...',
        '..WWTTTTTTTTWW..',
        '.WWWWWWWWWWWWWW.',
        '..WWWWWWWWWWWW..'
      ], map);
      return;
    }

    const isSeatedWork = pose === 'sit_type' || pose === 'sit_type_2';
    const isTalking = pose.startsWith('talk_');
    const isUp = pose.startsWith('up') || isSeatedWork || pose === 'talk_up';
    const isLeft = pose.startsWith('left') || pose === 'talk_left';
    const isRight = pose.startsWith('right') || pose === 'talk_right';
    const frame = pose.endsWith('_1') ? 1 : pose.endsWith('_2') ? 2 : 0;

    const headRows = isUp ? [
      '....KKKKKKKK....', '...KHHHHHHHHK...', '..KHHHHHHHHHHK..', '..KHHHHHHHHHHK..',
      '..KHHHHHHHHHHK..', '..KHHHHHHHHHHK..', '..KHHHHHHHHHHK..', '...KHHHHHHHHK...', '....KKKKKKKK....'
    ] : isLeft ? [
      '....KKKKKKKK....', '...KHHHHHHHHK...', '..KHHHHHHHHHHK..', '..KSSSSSHHHHHK..',
      '..KSKSSSSHHHHK..', isTalking ? '..KRRSSSSHHHHK..' : '..KSSSSSSHHHHK..', '..KSSSSSSSHHHK..', '...KSSSSSSHHK...', '....KKKKKKKK....'
    ] : isRight ? [
      '....KKKKKKKK....', '...KHHHHHHHHK...', '..KHHHHHHHHHHK..', '..KHHHHHSSSSSK..',
      '..KHHHHSSSSKSK..', isTalking ? '..KHHHHSSSSRRK..' : '..KHHHHSSSSSSK..', '..KHHHSSSSSSSK..', '...KHHSSSSSSK...', '....KKKKKKKK....'
    ] : [
      '....KKKKKKKK....', '...KHHHHHHHHK...', '..KHHSSSSSSHHK..', '..KHSSSSSSSSHK..',
      '..KSSKSSSSKSSK..', '..KSSSSSSSSSSK..', isTalking ? '..KSSSRRRSSSSK..' : '..KSSSSRSSSSSK..', '...KSSSSSSSSK...', '....KKKKKKKK....'
    ];
    drawIndexedMatrix(c, ox, oy + (isSeatedWork ? 1 : 2), headRows, map);

    if (a.style === 'bun') {
      drawIndexedMatrix(c, ox + 5, oy, ['..KKKK..', '.KHHHHK.', '..KKKK..'], map);
    } else if (a.style === 'cap') {
      drawIndexedMatrix(c, ox + 2, oy + 1, ['..KKKKKKKKKK..', '.KDDDDDDDDDDK.', 'KDDDDDDDDDDDDK'], map);
    } else if (a.style === 'headphones') {
      c.fillStyle = PALETTE.GOLD_BRIGHT;
      c.fillRect(ox + 1, oy + (isSeatedWork ? 4 : 5), 2, 4);
      c.fillRect(ox + 13, oy + (isSeatedWork ? 4 : 5), 2, 4);
    } else if (a.style === 'glasses' && !isUp) {
      c.fillStyle = PALETTE.STONE_CREAM;
      c.fillRect(ox + 4, oy + 6, 3, 2);
      c.fillRect(ox + 9, oy + 6, 3, 2);
    } else if (a.style === 'hijab') {
      c.fillStyle = a.hair;
      c.fillRect(ox + 3, oy + (isSeatedWork ? 3 : 4), 2, 7);
      c.fillRect(ox + 11, oy + (isSeatedWork ? 3 : 4), 2, 7);
    }

    let torsoRows = [
      '...KKKKKKKKKK...', '..KTTTTTTTTTTK..', '..KTTTTTTTTTTK..',
      '..KSTTTTTTTTSK..', '..KSTTTTTTTTSK..', '...KDDDDDDDDK...'
    ];
    if (pose === 'wait_approval' || pose === 'wave') {
      torsoRows = [
        '...KKKKKKKKKK.KK', '..KTTTTTTTTTTKSK', '..KTTTTTTTTTTKSK',
        '..KSTTTTTTTTTK..', '..KSTTTTTTTTTK..', '...KDDDDDDDDK...'
      ];
    } else if (pose === 'sit_type') {
      torsoRows = [
        '.KKKKKKKKKKKK...', 'KSKTTTTTTTTTTK..', '..KTTTTTTTTTTK..',
        '..KTTTTTTTTSSK..', '...KDDDDDDDDK...'
      ];
    } else if (pose === 'sit_type_2') {
      torsoRows = [
        '...KKKKKKKKKKKK.', '..KTTTTTTTTTTKSK', '..KTTTTTTTTTTK..',
        '..KSSTTTTTTTTK..', '...KDDDDDDDDK...'
      ];
    } else if (pose === 'cook') {
      torsoRows = [
        '...KKKKKKKKKK...', '..KTTTTTTTTTTK..', '..KTTTTTTTTTTK..',
        '..KSSTTTTTTSSK..', '...KKKKKKKKKK...'
      ];
    } else if (pose === 'talk_right') {
      torsoRows = [
        '...KKKKKKKKKK...', '..KTTTTTTTTTTKK.', '..KTTTTTTTTTTKSK',
        '..KSTTTTTTTTTKK.', '..KSTTTTTTTTSK..', '...KDDDDDDDDK...'
      ];
    } else if (pose === 'talk_left') {
      torsoRows = [
        '...KKKKKKKKKK...', '.KKTTTTTTTTTTK..', 'KSKTTTTTTTTTTK..',
        '.KKTTTTTTTTTSK..', '..KSTTTTTTTTSK..', '...KDDDDDDDDK...'
      ];
    } else if (pose === 'talk_down' || pose === 'talk_up') {
      torsoRows = [
        '...KKKKKKKKKK...', '..KTTTTTTTTTTK..', '.KKTTTTTTTTTTKK.',
        '.KSSTTTTTTTTSSK.', '..KTTTTTTTTTTK..', '...KDDDDDDDDK...'
      ];
    } else if (pose === 'coffee') {
      torsoRows = [
        '...KKKKKKKKKK...', '..KTTTTTTTTTTK..', '..KTTTTTTTTTLLK.',
        '..KSTTTTTTTTLLK.', '...KDDDDDDDDK...'
      ];
    } else if (pose === 'smoke') {
      torsoRows = [
        '...KKKKKKKKKK...', '..KTTTTTTTTTTK..', '..KTTTTTTTTTSLLL',
        '..KSTTTTTTTTSK..', '...KDDDDDDDDK...'
      ];
    }
    drawIndexedMatrix(c, ox, oy + (isSeatedWork ? 10 : 11), torsoRows, map);

    if (isSeatedWork || pose === 'eat') {
      drawIndexedMatrix(c, ox, oy + (isSeatedWork ? 15 : 17), ['...KPPPPPPPPK...', '...KPPK..KPPK...', '...KKKK..KKKK...'], map);
    } else {
      const legs0 = ['...KPPPPPPPPK...', '...KPPK..KPPK...', '...KPPK..KPPK...', '...KKKK..KKKK...'];
      const legs1 = ['...KPPPPPPPPK...', '..KPPK....KPPK..', '..KKKK....KPPK..', '..........KKKK..'];
      const legs2 = ['...KPPPPPPPPK...', '..KPPK....KPPK..', '..KPPK....KKKK..', '..KKKK..........'];
      drawIndexedMatrix(c, ox, oy + 17, frame === 1 ? legs1 : frame === 2 ? legs2 : legs0, map);
    }
  }

  getAvatarDataURL(agent) {
    if (typeof document === 'undefined') return '';
    this.avatarCache = this.avatarCache || new Map();
    const key = `${agent.id}|${agent.status}`;
    if (this.avatarCache.has(key)) return this.avatarCache.get(key);
    const c = document.createElement('canvas');
    c.width = 16; c.height = 16;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const team = TEAMS.find(t => t.id === agent.team) || TEAMS[0];
    ctx.fillStyle = team.light;
    ctx.fillRect(0, 0, 16, 16);
    const entry = this.agentSprites?.get(agent.id);
    if (entry) ctx.drawImage(entry.canvas, 0, 1, 16, 16, 0, 1, 16, 16);
    const url = c.toDataURL();
    this.avatarCache.set(key, url);
    return url;
  }

  bindMinimap() {
    if (!this.minimapCanvas) return;
    let dragging = false;
    const panToMinimap = e => {
      const r = this.minimapCanvas.getBoundingClientRect();
      const mx = Math.max(0, Math.min(1, (e.clientX - r.left) / (r.width || 1)));
      const my = Math.max(0, Math.min(1, (e.clientY - r.top) / (r.height || 1)));
      this.followId = null; this.focus = null;
      this.pan.x = Math.round((this.center.x - mx * WORLD_W) * this.scale);
      this.pan.y = Math.round((this.center.y - my * WORLD_H) * this.scale);
    };
    this.minimapCanvas.addEventListener('pointerdown', e => { dragging = true; this.minimapCanvas.setPointerCapture(e.pointerId); panToMinimap(e); });
    this.minimapCanvas.addEventListener('pointermove', e => { if (dragging) panToMinimap(e); });
    this.minimapCanvas.addEventListener('pointerup', () => { dragging = false; });
  }

  bind() {
    const c = this.canvas;
    c.addEventListener('pointerdown', e => {
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      c.setPointerCapture(e.pointerId);
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.moved = false;
      if (this.pointers.size === 2) this.pinchDistance = this.pointerDistance();
    });
    c.addEventListener('pointermove', e => {
      if (!this.pointers.has(e.pointerId)) return;
      const prev = this.pointers.get(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 2) {
        const distance = this.pointerDistance();
        if (Math.abs(distance - this.pinchDistance) > 14) {
          this.stepIntegerZoom(distance > this.pinchDistance ? 1 : -1);
          this.pinchDistance = distance;
        }
        this.moved = true;
      } else {
        const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
        if (Math.hypot(e.clientX - this.dragStart.x, e.clientY - this.dragStart.y) > 4) this.moved = true;
        if (this.moved) { this.pan.x += dx; this.pan.y += dy; this.focus = null; this.followId = null; }
      }
    });
    c.addEventListener('pointerup', e => {
      if (!this.moved && this.pointers.size === 1) {
        const r = c.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        const hit = [...this.hitboxes].reverse().find(b => Math.abs(x - b.x) < b.w / 2 && Math.abs(y - b.y) < b.h / 2);
        if (hit?.type === 'agent') this.onSelect(hit.id, false);
        else if (hit?.type === 'approval') this.onApproval();
        else if (hit?.type === 'room') this.onSelect(hit.id, true);
        else if (hit?.type === 'control_panel') this.onControlPanel?.(hit.id);
      }
      this.pointers.delete(e.pointerId);
    });
    c.addEventListener('pointercancel', e => this.pointers.delete(e.pointerId));
    c.addEventListener('wheel', e => { e.preventDefault(); this.stepIntegerZoom(e.deltaY < 0 ? 1 : -1); }, { passive: false });
    c.addEventListener('keydown', e => {
      if (['+', '=', '-', '0', '1', '2', '3', '4', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
      if (e.key === '+' || e.key === '=') this.stepIntegerZoom(1);
      if (e.key === '-') this.stepIntegerZoom(-1);
      if (e.key === '0') this.reset();
      if (['1', '2', '3', '4'].includes(e.key)) this.setPixelScale(Number(e.key));
      const moves = { ArrowUp: [0, 32], ArrowDown: [0, -32], ArrowLeft: [32, 0], ArrowRight: [-32, 0] };
      if (moves[e.key]) { this.pan.x += moves[e.key][0]; this.pan.y += moves[e.key][1]; this.followId = null; }
    });
  }

  pointerDistance() { const [a, b] = [...this.pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); }

  // Integer zoom steps: 1x (Full Estate Overview), 2x (Crisp Mansion Detail), 3x (Close), 4x (Macro)
  setPixelScale(intScale) {
    const clamped = Math.max(1, Math.min(4, Math.round(intScale)));
    this.pixelScale = clamped;
    const zoomMap = { 1: 1.0, 2: 2.0, 3: 3.0, 4: 4.0 };
    this.zoom = zoomMap[clamped] || 1.0;
    this.scale = this.pixelScale;
    this.onZoom?.(this.zoom, this.pixelScale);
  }

  stepIntegerZoom(delta) {
    this.setPixelScale(this.pixelScale + (delta > 0 ? 1 : -1));
  }

  setZoom(z) {
    if (z > this.zoom + 0.05) this.stepIntegerZoom(1);
    else if (z < this.zoom - 0.05) this.stepIntegerZoom(-1);
    else { this.scale = this.pixelScale; this.onZoom?.(this.zoom, this.pixelScale); }
  }

  reset() {
    this.pan = { x: 0, y: 0 };
    this.focus = null;
    this.followId = null;
    this.setPixelScale(1);
  }

  toggleFollow(id = this.selected) {
    this.followId = this.followId === id ? null : id;
    if (this.followId) this.locate(this.followId, false, true);
    return this.followId;
  }

  locate(id, isTeam = false, keepFollow = false) {
    this.selectedTeam = isTeam ? id : null;
    if (!isTeam) this.selected = id;
    if (!keepFollow && isTeam) this.followId = null;
    const target = isTeam ? TEAMS.find(t => t.id === id)?.room : null;
    const a = isTeam ? { x: target[0] + target[2] / 2, y: target[1] + target[3] / 2 } : this.model.get(id);
    if (!a) return;
    const p = this.project(a.x, a.y, 10);
    if (this.pixelScale < 2) this.setPixelScale(2);
    const s = this.scale || this.pixelScale || 2;
    this.focus = { x: (this.center.x - p.x) * s, y: (this.center.y - p.y) * s };
    if (this.model.reducedMotion) this.pan = { ...this.focus };
  }

  renderStaticGround() {
    const key = `${this.night}|${this.selectedTeam}|${this.model.agents.map(a => `${a.status}:${a.enabled}`).join(',')}`;
    if (this.groundKey === key) return;
    this.groundKey = key;

    const c = this.groundCanvas.getContext('2d');
    c.imageSmoothingEnabled = false;

    // 1. Estate Lawn Base (80 x 60 tiles) with rich pixel grass clusters & wildflowers
    c.fillStyle = this.night ? '#243d26' : PALETTE.GRASS_MID;
    c.fillRect(0, 0, WORLD_W, WORLD_H);
    for (let ty = 0; ty < GRID_ROWS; ty++) {
      for (let tx = 0; tx < GRID_COLS; tx++) {
        const px = tx * 16, py = ty * 16;
        if ((tx + ty) % 2 === 0) {
          c.fillStyle = this.night ? '#1f3621' : '#538243';
          c.fillRect(px, py, 16, 16);
        }
        const h = (tx * 17 + ty * 31) % 19;
        c.fillStyle = this.night ? '#2e4e2f' : PALETTE.GRASS_LIGHT;
        c.fillRect(px + (h % 12) + 2, py + ((h * 3) % 11) + 2, 2, 1);
        c.fillRect(px + (h % 12) + 3, py + ((h * 3) % 11) + 1, 1, 2);
        // Scattered wildflower pixels in outer yards
        if ((tx < 11 || tx > 68 || ty > 48 || ty < 5) && h === 5) {
          c.fillStyle = (tx + ty) % 3 === 0 ? PALETTE.GOLD_BRIGHT : (tx + ty) % 3 === 1 ? PALETTE.STONE_CREAM : PALETTE.RED_ALERT;
          c.fillRect(px + 6, py + 7, 2, 2);
        }
      }
    }

    // Perimeter sculpted hedge walls
    const drawHedge = (x, y, w, h) => {
      c.fillStyle = PALETTE.INK; c.fillRect(x, y, w, h);
      c.fillStyle = this.night ? '#1a2e1d' : PALETTE.GRASS_DARK; c.fillRect(x + 1, y + 1, w - 2, h - 2);
      c.fillStyle = this.night ? '#27422a' : PALETTE.GRASS_MID; c.fillRect(x + 2, y + 2, w - 4, Math.max(2, h - 6));
    };
    drawHedge(0, 0, WORLD_W, 14);
    drawHedge(0, WORLD_H - 14, 35 * 16, 14);
    drawHedge(43 * 16, WORLD_H - 14, WORLD_W - 43 * 16, 14);
    drawHedge(0, 0, 14, WORLD_H);
    drawHedge(WORLD_W - 14, 0, 14, WORLD_H);

    // 2. Outdoor Stone Walkways, Driveway, Parking Lot
    const drawStoneRect = (tx, ty, tw, th, baseCol = PALETTE.STONE_MID, trimCol = PALETTE.STONE_DARK) => {
      for (let y = ty; y < ty + th; y++) {
        for (let x = tx; x < tx + tw; x++) {
          const px = x * 16, py = y * 16;
          c.fillStyle = baseCol; c.fillRect(px, py, 16, 16);
          c.fillStyle = trimCol; c.fillRect(px, py + 15, 16, 1); c.fillRect(px + 15, py, 1, 16);
          c.fillStyle = this.night ? '#7a7164' : PALETTE.STONE_LIGHT; c.fillRect(px + 1, py + 1, 13, 1);
          c.fillStyle = trimCol; c.fillRect(px + 8, py + 1, 1, 7); c.fillRect(px + 1, py + 8, 14, 1);
        }
      }
    };

    // Main Stone Driveway (X=34..43, Y=47..59) + West/East paths + North patio
    drawStoneRect(34, 47, 10, 13, this.night ? '#595248' : PALETTE.STONE_MID, PALETTE.STONE_DARK);
    drawStoneRect(11, 47, 23, 2, this.night ? '#595248' : PALETTE.STONE_MID, PALETTE.STONE_DARK);
    drawStoneRect(44, 47, 25, 2, this.night ? '#595248' : PALETTE.STONE_MID, PALETTE.STONE_DARK);
    drawStoneRect(10, 16, 2, 31, this.night ? '#595248' : PALETTE.STONE_MID, PALETTE.STONE_DARK);
    drawStoneRect(68, 24, 2, 23, this.night ? '#595248' : PALETTE.STONE_MID, PALETTE.STONE_DARK);
    drawStoneRect(35, 3, 8, 3, this.night ? '#595248' : PALETTE.STONE_MID, PALETTE.STONE_DARK);

    // Parking Lot (X=14..26, Y=49..56)
    c.fillStyle = PALETTE.SLATE_DARK;
    c.fillRect(14 * 16, 49 * 16, 13 * 16, 8 * 16);
    c.strokeStyle = PALETTE.GOLD_BRIGHT;
    c.lineWidth = 1;
    for (let bx = 15; bx <= 23; bx += 4) {
      c.strokeRect(bx * 16, 49 * 16 + 4, 3 * 16, 3 * 16);
      c.strokeRect(bx * 16, 53 * 16 + 4, 3 * 16, 3 * 16);
    }

    // 3. Outdoor Estate Zones
    // A. Northwest Herb & Vegetable Garden (X=2..9, Y=7..17)
    drawStoneRect(2, 7, 8, 10, this.night ? '#4d3a29' : PALETTE.WOOD_MID, PALETTE.WOOD_DARK);
    for (const bx of [3, 7]) {
      c.fillStyle = PALETTE.WOOD_DARK; c.fillRect(bx * 16, 8 * 16, 2 * 16, 8 * 16);
      c.fillStyle = '#382315'; c.fillRect(bx * 16 + 2, 8 * 16 + 2, 2 * 16 - 4, 8 * 16 - 4);
      for (let ry = 0; ry < 7; ry++) {
        c.fillStyle = PALETTE.GRASS_DARK; c.fillRect(bx * 16 + 5, (8 + ry) * 16 + 6, 8, 7);
        c.fillStyle = PALETTE.GRASS_LIGHT; c.fillRect(bx * 16 + 6, (8 + ry) * 16 + 5, 6, 5);
        c.fillStyle = PALETTE.GRASS_DARK; c.fillRect(bx * 16 + 17, (8 + ry) * 16 + 6, 8, 7);
        c.fillStyle = PALETTE.GRASS_LIGHT; c.fillRect(bx * 16 + 18, (8 + ry) * 16 + 5, 6, 5);
        c.fillStyle = ry % 2 === 0 ? PALETTE.RED_ALERT : PALETTE.AMBER_MID;
        c.fillRect(bx * 16 + 8, (8 + ry) * 16 + 7, 2, 2);
        c.fillRect(bx * 16 + 20, (8 + ry) * 16 + 7, 2, 2);
      }
    }
    // Watering can prop at (6, 11)
    if (this.atlas.can) c.drawImage(this.atlasCanvas, this.atlas.can.x, this.atlas.can.y, 10, 6, 6 * 16 + 3, 11 * 16 + 5, 10, 6);

    // B. West BBQ, Picnic & Timber Gazebo Area (X=2..9, Y=18..29)
    drawStoneRect(2, 18, 8, 11, this.night ? '#594c3d' : PALETTE.STONE_LIGHT, PALETTE.STONE_MID);
    // Wooden Picnic Table (7..8, 20)
    c.fillStyle = PALETTE.WOOD_DARK; c.fillRect(7 * 16, 20 * 16, 32, 16);
    c.fillStyle = PALETTE.WOOD_TAN; c.fillRect(7 * 16 + 2, 20 * 16 + 2, 28, 12);
    c.fillStyle = PALETTE.RED_ALERT; c.fillRect(7 * 16 + 10, 20 * 16 + 2, 12, 12);
    c.fillStyle = PALETTE.STONE_CREAM; c.fillRect(7 * 16 + 12, 20 * 16 + 4, 4, 4); c.fillRect(7 * 16 + 16, 20 * 16 + 8, 4, 4);
    // Octagonal Gazebo floor & corner posts (X=3..7, Y=25..28)
    drawStoneRect(3, 25, 5, 4, PALETTE.WOOD_LIGHT, PALETTE.WOOD_MID);
    c.strokeStyle = PALETTE.GOLD_MID; c.lineWidth = 2; c.strokeRect(3 * 16 + 2, 25 * 16 + 2, 5 * 16 - 4, 4 * 16 - 4);
    for (const [gx, gy] of [[3, 25], [7, 25], [3, 28], [7, 28]]) {
      c.fillStyle = PALETTE.WOOD_DARK; c.fillRect(gx * 16 + 2, gy * 16 + 2, 6, 6);
    }

    // C. Southwest Covered Smoking Corner (X=3..8, Y=32..37)
    drawStoneRect(3, 32, 6, 5, this.night ? '#414750' : PALETTE.SLATE_LIGHT, PALETTE.SLATE_DARK);
    c.fillStyle = PALETTE.WOOD_DARK;
    c.fillRect(3 * 16, 32 * 16, 6 * 16, 6); // Shelter beam roof top
    c.fillStyle = PALETTE.AMBER_MID;
    c.fillRect(3 * 16 + 2, 32 * 16 + 1, 6 * 16 - 4, 3);
    // Wooden benches & chrome ashtray
    c.fillStyle = PALETTE.WOOD_MID; c.fillRect(4 * 16, 34 * 16 + 2, 28, 8); c.fillRect(7 * 16 - 6, 34 * 16 + 2, 26, 8);
    c.fillStyle = PALETTE.SLATE_DARK; c.fillRect(6 * 16 - 4, 34 * 16 + 2, 8, 8);
    c.fillStyle = PALETTE.STONE_CREAM; c.fillRect(6 * 16 - 2, 34 * 16 + 4, 4, 4);

    // D. Southwest Koi Pond with Bridge & Lily Pads (X=3..9, Y=41..46)
    c.fillStyle = PALETTE.STONE_DARK; c.fillRect(3 * 16 - 3, 41 * 16 - 3, 7 * 16 + 6, 6 * 16 + 6);
    c.fillStyle = PALETTE.WATER_DEEP; c.fillRect(3 * 16, 41 * 16, 7 * 16, 6 * 16);
    c.fillStyle = PALETTE.WATER_BRIGHT; c.fillRect(3 * 16 + 4, 41 * 16 + 4, 7 * 16 - 8, 6 * 16 - 8);
    // Lily pads & lotus blooms
    for (const [lx, ly] of [[4, 42], [8, 42], [4, 46], [8, 45]]) {
      c.fillStyle = PALETTE.GRASS_DARK; c.fillRect(lx * 16 + 2, ly * 16 + 2, 8, 7);
      c.fillStyle = PALETTE.GRASS_LIGHT; c.fillRect(lx * 16 + 3, ly * 16 + 3, 6, 5);
      c.fillStyle = PALETTE.RED_ALERT; c.fillRect(lx * 16 + 5, ly * 16 + 4, 2, 2);
    }
    // Arched Wooden Bridge across Koi Pond (Y=44)
    drawStoneRect(3, 44, 7, 1, PALETTE.WOOD_LIGHT, PALETTE.WOOD_DARK);
    c.fillStyle = PALETTE.WOOD_DARK; c.fillRect(3 * 16, 44 * 16, 7 * 16, 2); c.fillRect(3 * 16, 45 * 16 - 2, 7 * 16, 2);

    // E. East Large Swimming Pool, Deck, Loungers, Parasols & Diving Board (X=68..78, Y=7..23)
    drawStoneRect(68, 7, 10, 17, this.night ? '#695640' : PALETTE.WOOD_TAN, PALETTE.WOOD_LIGHT);
    c.fillStyle = PALETTE.STONE_CREAM; c.fillRect(71 * 16 - 3, 9 * 16 - 3, 6 * 16 + 6, 12 * 16 + 6);
    c.fillStyle = this.night ? '#1a5a75' : PALETTE.WATER_DEEP; c.fillRect(71 * 16, 9 * 16, 6 * 16, 12 * 16);
    c.fillStyle = this.night ? '#2b82a3' : PALETTE.WATER_BRIGHT; c.fillRect(71 * 16 + 5, 9 * 16 + 5, 6 * 16 - 10, 12 * 16 - 10);
    // Diving Board
    c.fillStyle = PALETTE.SLATE_DARK; c.fillRect(73 * 16 + 2, 8 * 16 + 1, 12, 23);
    c.fillStyle = PALETTE.STONE_CREAM; c.fillRect(73 * 16 + 3, 8 * 16 + 2, 10, 21);
    c.fillStyle = PALETTE.BLUE_MID; c.fillRect(73 * 16 + 4, 9 * 16 + 2, 8, 3);
    // Poolside Loungers & Striped Parasols
    for (const ly of [11, 15, 19]) {
      c.fillStyle = PALETTE.WOOD_DARK; c.fillRect(69 * 16 - 2, ly * 16, 16, 22);
      c.fillStyle = PALETTE.STONE_CREAM; c.fillRect(69 * 16, ly * 16 + 2, 12, 18);
      c.fillStyle = PALETTE.BLUE_LIGHT; c.fillRect(69 * 16 + 1, ly * 16 + 3, 10, 6);
    }
    for (const [py, col] of [[13, PALETTE.RED_ALERT], [17, PALETTE.BLUE_MID]]) {
      const px = 69 * 16 + 6, cy = py * 16 + 6;
      c.fillStyle = 'rgba(0,0,0,0.22)'; c.fillRect(px - 8, cy - 6, 18, 16);
      c.fillStyle = PALETTE.INK; c.fillRect(px - 10, cy - 10, 20, 18);
      c.fillStyle = col; c.fillRect(px - 9, cy - 9, 18, 16);
      c.fillStyle = PALETTE.STONE_CREAM; c.fillRect(px - 5, cy - 9, 4, 16); c.fillRect(px + 3, cy - 9, 4, 16);
      c.fillStyle = PALETTE.GOLD_BRIGHT; c.fillRect(px - 1, cy - 2, 2, 2);
    }

    // F. East Lawn Ball Court (Hoops + Mini Soccer Goal) (X=70..76, Y=28..40)
    c.fillStyle = this.night ? '#3d523a' : '#739e59';
    c.fillRect(70 * 16, 28 * 16, 7 * 16, 12 * 16);
    c.strokeStyle = PALETTE.STONE_CREAM; c.lineWidth = 2;
    c.strokeRect(70 * 16 + 2, 28 * 16 + 2, 7 * 16 - 4, 12 * 16 - 4);
    c.fillStyle = PALETTE.STONE_CREAM; c.fillRect(70 * 16 + 2, 34 * 16, 7 * 16 - 4, 2);
    c.strokeRect(72 * 16 + 8, 33 * 16, 2 * 16, 2 * 16);
    // Basketball hoop & backboard (North)
    c.fillStyle = PALETTE.STONE_CREAM; c.fillRect(72 * 16 + 10, 28 * 16 - 2, 28, 6);
    c.fillStyle = PALETTE.RED_ALERT; c.fillRect(73 * 16 + 4, 28 * 16 + 4, 8, 4);
    // Soccer goal net (South)
    c.fillStyle = PALETTE.STONE_CREAM; c.fillRect(72 * 16 + 8, 40 * 16 - 5, 32, 6);
    c.fillStyle = PALETTE.SLATE_DARK; c.fillRect(72 * 16 + 10, 40 * 16 - 3, 28, 3);

    // G. Guard Booth at Main Entrance (31..32, 55..56)
    c.fillStyle = PALETTE.WOOD_DARK; c.fillRect(31 * 16, 55 * 16, 32, 32);
    c.fillStyle = PALETTE.STONE_CREAM; c.fillRect(31 * 16 + 2, 55 * 16 + 2, 28, 28);
    c.fillStyle = this.night ? PALETTE.GOLD_BRIGHT : PALETTE.WATER_BRIGHT; c.fillRect(31 * 16 + 5, 55 * 16 + 8, 22, 12);
    c.fillStyle = PALETTE.RED_ALERT; c.fillRect(33 * 16, 56 * 16 + 4, 22, 4); // Striped gate arm
    c.fillStyle = PALETTE.STONE_CREAM; c.fillRect(33 * 16 + 4, 56 * 16 + 4, 4, 4); c.fillRect(33 * 16 + 12, 56 * 16 + 4, 4, 4);

    // 4. Mansion Drop Shadow & Room Floors
    c.fillStyle = 'rgba(20, 18, 28, 0.35)';
    c.fillRect(12 * 16 + 7, 6 * 16 + 7, 56 * 16, 41 * 16);

    for (const room of ROOMS) {
      const rx = room.tx * 16, ry = room.ty * 16, rw = room.tw * 16, rh = room.th * 16;
      c.fillStyle = this.night ? '#38342e' : room.floor;
      c.fillRect(rx, ry, rw, rh);
      for (let ty = room.ty; ty < room.ty + room.th; ty++) {
        for (let tx = room.tx; tx < room.tx + room.tw; tx++) {
          const px = tx * 16, py = ty * 16;
          if (room.id === 'kitchen' || room.id === 'restroom' || room.id === 'lobby') {
            if ((tx + ty) % 2 === 0) {
              c.fillStyle = this.night ? '#46413a' : PALETTE.STONE_CREAM;
              c.fillRect(px, py, 16, 16);
            }
          } else {
            c.fillStyle = 'rgba(0,0,0,0.06)';
            c.fillRect(px, py + 15, 16, 1);
            c.fillRect(px + 15, py, 1, 15);
          }
        }
      }
      if (room.teamId) {
        const team = TEAMS.find(t => t.id === room.teamId);
        const active = this.model.agents.some(a => a.enabled && a.team === team.id && a.status === 'WORKING');
        c.fillStyle = team.color + (this.night ? '38' : '24');
        c.fillRect(rx + 18, ry + 34, rw - 36, rh - 46);
        c.strokeStyle = active ? team.color : team.dark;
        c.lineWidth = active ? 2 : 1;
        c.strokeRect(rx + 18, ry + 34, rw - 36, rh - 46);
        if (this.selectedTeam === team.id) {
          c.strokeStyle = PALETTE.GOLD_BRIGHT; c.lineWidth = 2; c.strokeRect(rx + 2, ry + 2, rw - 4, rh - 4);
        }
      }
    }

    // Lobby Grand Gold/Crimson Carpet Runner & Founder Persian Carpet
    c.fillStyle = PALETTE.RED_ALERT; c.fillRect(38 * 16, 42 * 16, 32, 64);
    c.strokeStyle = PALETTE.GOLD_BRIGHT; c.lineWidth = 1; c.strokeRect(38 * 16 + 2, 42 * 16 + 2, 28, 60);
    c.fillStyle = PALETTE.AMBER_DARK; c.fillRect(30 * 16, 11 * 16, 7 * 16, 5 * 16);
    c.strokeStyle = PALETTE.GOLD_BRIGHT; c.strokeRect(30 * 16 + 3, 11 * 16 + 3, 7 * 16 - 6, 5 * 16 - 6);

    // Restroom Fixtures (Stalls & Sinks at X=13..17, Y=20..24)
    c.fillStyle = PALETTE.STONE_DARK; c.fillRect(14 * 16, 20 * 16 + 4, 2, 24); c.fillRect(16 * 16, 20 * 16 + 4, 2, 24);
    c.fillStyle = PALETTE.STONE_CREAM; c.fillRect(13 * 16 + 4, 21 * 16, 8, 8); c.fillRect(15 * 16 + 4, 21 * 16, 8, 8);
    c.fillStyle = PALETTE.WATER_BRIGHT; c.fillRect(13 * 16 + 4, 23 * 16 + 4, 10, 6); c.fillRect(15 * 16 + 4, 23 * 16 + 4, 10, 6);

    // West Balcony Wrought-Iron Railing (X=9..11, Y=21..23)
    c.strokeStyle = PALETTE.SLATE_DARK; c.lineWidth = 2; c.strokeRect(9 * 16 + 1, 21 * 16 + 1, 3 * 16 - 2, 3 * 16 - 2);

    // East Hallway connector (X=50..67, Y=24..25)
    drawStoneRect(50, 24, 18, 2, this.night ? '#4a4339' : '#e8dec8', PALETTE.STONE_MID);

    // 5. 3/4 Top-Down Mansion North Walls (2 tiles tall with stone face, team stripe & wood wainscot)
    const drawNorthWallSpan = (tx, ty, tw, accentColor = PALETTE.WOOD_MID) => {
      const px = tx * 16, py = ty * 16, pw = tw * 16;
      c.fillStyle = PALETTE.INK; c.fillRect(px, py, pw, 32);
      c.fillStyle = PALETTE.WOOD_DARK; c.fillRect(px + 1, py + 1, pw - 2, 6);
      c.fillStyle = PALETTE.STONE_CREAM; c.fillRect(px + 2, py + 2, pw - 4, 3);
      c.fillStyle = this.night ? '#665b4e' : PALETTE.STONE_LIGHT; c.fillRect(px + 1, py + 8, pw - 2, 13);
      c.fillStyle = accentColor; c.fillRect(px + 1, py + 21, pw - 2, 3);
      c.fillStyle = PALETTE.WOOD_MID; c.fillRect(px + 1, py + 24, pw - 2, 7);
    };

    drawNorthWallSpan(12, 6, 15, PALETTE.AMBER_MID);
    drawNorthWallSpan(27, 6, 11, PALETTE.GOLD_MID);
    drawNorthWallSpan(40, 6, 10, PALETTE.WOOD_LIGHT);
    drawNorthWallSpan(50, 6, 18, PALETTE.BLUE_MID);
    drawNorthWallSpan(12, 25, 8, PALETTE.GREEN_MID);
    drawNorthWallSpan(22, 25, 6, PALETTE.GREEN_MID);
    drawNorthWallSpan(50, 26, 5, PALETTE.PURPLE_MID);
    drawNorthWallSpan(57, 26, 11, PALETTE.PURPLE_MID);
    drawNorthWallSpan(28, 22, 10, PALETTE.AMBER_DARK);

    // Glowing Windows along North Wall
    for (const wx of [15, 23, 29, 46, 53, 62]) {
      const px = wx * 16, py = 6 * 16 + 10;
      c.fillStyle = PALETTE.WOOD_DARK; c.fillRect(px, py, 28, 14);
      c.fillStyle = this.night ? PALETTE.GOLD_BRIGHT : PALETTE.WATER_BRIGHT;
      c.fillRect(px + 2, py + 2, 11, 10); c.fillRect(px + 15, py + 2, 11, 10);
    }

    // 6. Signature Room Wall Panels & Equipment
    // Front Office Whiteboard + Printer + Shelves
    c.fillStyle = PALETTE.WOOD_DARK; c.fillRect(18 * 16, 6 * 16 + 9, 48, 16);
    c.fillStyle = PALETTE.STONE_CREAM; c.fillRect(18 * 16 + 2, 6 * 16 + 11, 44, 12);
    c.fillStyle = PALETTE.AMBER_MID; c.fillRect(18 * 16 + 5, 6 * 16 + 14, 16, 2);
    c.fillStyle = PALETTE.BLUE_MID; c.fillRect(18 * 16 + 25, 6 * 16 + 14, 14, 2);
    // Front Office Printer (14, 16) & Bookshelves (25, 9..10)
    c.fillStyle = PALETTE.SLATE_DARK; c.fillRect(14 * 16, 16 * 16, 18, 14);
    c.fillStyle = PALETTE.STONE_CREAM; c.fillRect(14 * 16 + 3, 16 * 16 + 2, 12, 5);
    c.fillStyle = PALETTE.WOOD_DARK; c.fillRect(25 * 16, 9 * 16, 16, 28);
    for (let b = 0; b < 3; b++) { c.fillStyle = [PALETTE.AMBER_MID, PALETTE.BLUE_MID, PALETTE.RED_ALERT][b]; c.fillRect(25 * 16 + 2, 9 * 16 + 3 + b * 8, 12, 5); }

    // Founder Suite Control Wall (Approve, Reject, Pause, Stop)
    for (const [x, col, txt] of [[30 * 16 + 4, PALETTE.GREEN_MID, 'OK'], [32 * 16, PALETTE.RED_ALERT, 'NO'], [33 * 16 + 12, PALETTE.AMBER_MID, 'II'], [35 * 16 + 8, PALETTE.SLATE_LIGHT, 'ST']]) {
      c.fillStyle = PALETTE.SLATE_DARK; c.fillRect(x, 6 * 16 + 9, 22, 16);
      c.fillStyle = col; c.fillRect(x + 2, 6 * 16 + 11, 18, 12);
      drawPixelText(c, txt, x + 11, 6 * 16 + 14, PALETTE.INK, 1, 'center', null);
    }

    // Meeting Room Strategy Display
    c.fillStyle = PALETTE.SLATE_DARK; c.fillRect(41 * 16, 6 * 16 + 9, 64, 16);
    c.fillStyle = PALETTE.BLUE_DARK; c.fillRect(41 * 16 + 2, 6 * 16 + 11, 60, 12);
    c.fillStyle = PALETTE.AMBER_MID; c.fillRect(41 * 16 + 6, 6 * 16 + 15, 14, 4);
    c.fillStyle = PALETTE.BLUE_LIGHT; c.fillRect(41 * 16 + 24, 6 * 16 + 15, 14, 4);
    c.fillStyle = PALETTE.GREEN_LIGHT; c.fillRect(41 * 16 + 42, 6 * 16 + 15, 14, 4);

    // Project Room Sprint Board Wall
    c.fillStyle = PALETTE.SLATE_DARK; c.fillRect(56 * 16, 6 * 16 + 9, 64, 16);
    for (let col = 0; col < 4; col++) {
      c.fillStyle = [PALETTE.AMBER_LIGHT, PALETTE.BLUE_LIGHT, PALETTE.GREEN_LIGHT, PALETTE.GOLD_BRIGHT][col];
      c.fillRect(56 * 16 + 4 + col * 15, 6 * 16 + 12, 11, 4);
      c.fillRect(56 * 16 + 4 + col * 15, 6 * 16 + 18, 11, 4);
    }

    // Finance Room Calculator Wall Chart
    c.fillStyle = PALETTE.WOOD_DARK; c.fillRect(16 * 16, 25 * 16 + 9, 48, 16);
    c.fillStyle = PALETTE.STONE_CREAM; c.fillRect(16 * 16 + 2, 25 * 16 + 11, 44, 12);
    c.fillStyle = PALETTE.GREEN_MID; c.fillRect(16 * 16 + 6, 25 * 16 + 18, 7, 4); c.fillRect(16 * 16 + 16, 25 * 16 + 15, 7, 7); c.fillRect(16 * 16 + 26, 25 * 16 + 12, 7, 10);

    // Command Center Wall of Pipeline Monitors
    for (let m = 0; m < 4; m++) {
      const mx = (58 + m * 2) * 16, my = 26 * 16 + 9;
      c.fillStyle = PALETTE.INK; c.fillRect(mx, my, 26, 16);
      c.fillStyle = [PALETTE.AMBER_MID, PALETTE.BLUE_MID, PALETTE.GREEN_MID, PALETTE.PURPLE_LIGHT][m];
      c.fillRect(mx + 2, my + 2, 22, 12);
      c.fillStyle = PALETTE.STONE_CREAM; c.fillRect(mx + 4, my + 5, 16, 2); c.fillRect(mx + 4, my + 9, 10, 2);
    }

    // Kitchen Spice Shelf
    c.fillStyle = PALETTE.WOOD_DARK; c.fillRect(30 * 16, 22 * 16 + 16, 96, 4);
    for (let s = 0; s < 11; s++) {
      c.fillStyle = [PALETTE.RED_ALERT, PALETTE.GOLD_BRIGHT, PALETTE.GRASS_LIGHT, PALETTE.AMBER_MID][s % 4];
      c.fillRect(30 * 16 + 4 + s * 8, 22 * 16 + 10, 5, 6);
    }

    // Lobby Waiting Sofas & Water Dispenser
    for (const sx of [30, 45]) {
      c.fillStyle = PALETTE.WOOD_DARK; c.fillRect(sx * 16, 43 * 16, 36, 14);
      c.fillStyle = PALETTE.BLUE_MID; c.fillRect(sx * 16 + 2, 43 * 16 + 3, 32, 9);
    }
    c.fillStyle = PALETTE.STONE_CREAM; c.fillRect(34 * 16 + 2, 40 * 16, 12, 14);
    c.fillStyle = PALETTE.WATER_BRIGHT; c.fillRect(34 * 16 + 4, 40 * 16 - 4, 8, 7);

    // Architectural Side & Partition Walls (clean solid masonry)
    for (let ty = 6; ty < 47; ty++) {
      for (let tx = 12; tx < 68; tx++) {
        if (this.model.walkGrid[ty][tx] !== 1) continue;
        if (ty === 6 || ty === 7 || (ty >= 25 && ty <= 26 && tx < 28) || (ty >= 26 && ty <= 27 && tx >= 50) || (ty === 22 && tx >= 28 && tx < 38)) continue;
        const isArchWall = tx === 12 || tx === 67 || ty === 46 || tx === 27 || tx === 38 || tx === 49 || tx === 50 || tx === 18 || ty === 19 || ty === 23 || ty === 38 || ty === 39 || ty === 31;
        if (isArchWall) {
          c.fillStyle = PALETTE.WOOD_DARK; c.fillRect(tx * 16, ty * 16, 16, 16);
          c.fillStyle = PALETTE.STONE_MID; c.fillRect(tx * 16 + 2, ty * 16 + 2, 12, 10);
          c.fillStyle = PALETTE.STONE_CREAM; c.fillRect(tx * 16 + 2, ty * 16 + 2, 12, 3);
        }
      }
    }

    // Indoor Potted Plants in corners
    if (this.atlas.plant) {
      for (const [px, py] of [[13, 8], [26, 17], [51, 8], [66, 22], [13, 36], [51, 37], [29, 40], [48, 40], [36, 45], [42, 45]]) {
        c.drawImage(this.atlasCanvas, this.atlas.plant.x, this.atlas.plant.y, 12, 11, px * 16 + 2, py * 16 + 2, 12, 11);
      }
    }

    // Outdoor Lamp Posts (10 along driveway, paths, pool)
    this.lamps = [[34, 48], [43, 48], [34, 54], [43, 54], [11, 20], [11, 36], [68, 12], [68, 22], [68, 34], [28, 48]];
    for (const [lx, ly] of this.lamps) {
      c.fillStyle = PALETTE.SLATE_DARK; c.fillRect(lx * 16 + 6, ly * 16 - 6, 3, 18);
      c.fillStyle = this.night ? PALETTE.GOLD_BRIGHT : PALETTE.STONE_CREAM; c.fillRect(lx * 16 + 4, ly * 16 - 10, 7, 6);
    }

    // 7. JADIDULU Pixel Branding (1. Mansion Facade Roofline, 2. Reception Wall, 3. South Entrance, 4. Main Gate Arch)
    c.fillStyle = PALETTE.WOOD_DARK; c.fillRect(33 * 16, 4 * 16 + 4, 12 * 16, 20);
    c.strokeStyle = PALETTE.GOLD_BRIGHT; c.lineWidth = 2; c.strokeRect(33 * 16 + 1, 4 * 16 + 5, 12 * 16 - 2, 18);
    drawPixelText(c, 'JADIDULU MANSION', 39 * 16, 4 * 16 + 10, PALETTE.GOLD_BRIGHT, 2, 'center', PALETTE.INK);

    c.fillStyle = PALETTE.WOOD_DARK; c.fillRect(36 * 16 + 8, 39 * 16 + 1, 5 * 16, 14);
    c.strokeStyle = PALETTE.GOLD_MID; c.lineWidth = 1; c.strokeRect(36 * 16 + 9, 39 * 16 + 2, 5 * 16 - 2, 12);
    drawPixelText(c, 'JADIDULU', 39 * 16, 39 * 16 + 5, PALETTE.GOLD_BRIGHT, 1, 'center', PALETTE.INK);

    c.fillStyle = PALETTE.WOOD_DARK; c.fillRect(36 * 16, 46 * 16 + 1, 6 * 16, 14);
    drawPixelText(c, 'JADIDULU', 39 * 16, 46 * 16 + 5, PALETTE.GOLD_BRIGHT, 1, 'center', PALETTE.INK);

    c.fillStyle = PALETTE.STONE_DARK; c.fillRect(35 * 16, 57 * 16, 16, 32); c.fillRect(42 * 16, 57 * 16, 16, 32);
    c.fillStyle = PALETTE.INK; c.fillRect(35 * 16, 57 * 16, 8 * 16, 16);
    c.strokeStyle = PALETTE.GOLD_MID; c.lineWidth = 1; c.strokeRect(35 * 16 + 1, 57 * 16 + 1, 8 * 16 - 2, 14);
    drawPixelText(c, 'JADIDULU', 39 * 16, 57 * 16 + 4, PALETTE.GOLD_BRIGHT, 2, 'center', PALETTE.GOLD_DARK);
  }

  drawDesk(c, a) {
    const dx = a.desk.tx * 16, dy = (a.desk.ty - 1) * 16;
    const team = TEAMS.find(t => t.id === a.team) || TEAMS[0];
    c.fillStyle = 'rgba(0,0,0,0.22)'; c.fillRect(dx - 7, dy + 4, 30, 16);
    c.fillStyle = PALETTE.WOOD_DARK; c.fillRect(dx - 8, dy, 32, 16);
    c.fillStyle = a.id === 'sahlu' ? PALETTE.GOLD_MID : PALETTE.WOOD_LIGHT; c.fillRect(dx - 7, dy + 1, 30, 10);
    c.fillStyle = PALETTE.WOOD_MID; c.fillRect(dx - 7, dy + 11, 30, 4);

    // Monitor + keyboard + coffee cup
    const active = a.enabled && ['WORKING', 'WAITING_APPROVAL', 'BLOCKED'].includes(a.status);
    c.fillStyle = PALETTE.SLATE_DARK; c.fillRect(dx + 1, dy - 5, 14, 10);
    c.fillStyle = !a.enabled ? '#222630' : active ? (a.status === 'WAITING_APPROVAL' ? PALETTE.GOLD_BRIGHT : PALETTE.WATER_BRIGHT) : '#475263';
    c.fillRect(dx + 2, dy - 4, 12, 8);
    if (active) {
      const tick = this.model.reducedMotion ? 0 : Math.floor(this.model.time * 5 + a.index) % 4;
      c.fillStyle = PALETTE.STONE_CREAM;
      c.fillRect(dx + 3, dy - 3, 5 + (tick % 4), 1);
      c.fillRect(dx + 3, dy - 1, 8 - (tick % 3), 1);
      c.fillRect(dx + 3, dy + 1, 4 + ((tick + 2) % 5), 1);
      c.fillStyle = PALETTE.GREEN_LIGHT;
      c.fillRect(dx + 12, dy + 2, 1, 1);
    }
    c.fillStyle = PALETTE.SLATE_LIGHT; c.fillRect(dx + 3, dy + 6, 10, 3); // keyboard
    c.fillStyle = PALETTE.STONE_CREAM; c.fillRect(dx + 16, dy + 4, 3, 4); // mug

    // Swivel Chair
    const cx = a.desk.tx * 16 + 2, cy = a.desk.ty * 16 + 2;
    c.fillStyle = PALETTE.INK; c.fillRect(cx, cy, 12, 11);
    c.fillStyle = a.enabled ? team.color : PALETTE.SLATE_LIGHT; c.fillRect(cx + 1, cy + 1, 10, 9);
  }

  drawKitchenAndFurniture(c, addY) {
    // 1. Kitchen Appliances Row (Y=23)
    const kItems = [
      { tx: 29, top: PALETTE.STONE_CREAM, front: PALETTE.SLATE_LIGHT, tall: true },
      { tx: 30, top: PALETTE.WOOD_TAN, front: PALETTE.WOOD_MID, board: true },
      { tx: 31, top: PALETTE.WOOD_TAN, front: PALETTE.WOOD_MID, board: true },
      { tx: 32, top: PALETTE.SLATE_DARK, front: PALETTE.SLATE_LIGHT, stove: true },
      { tx: 33, top: PALETTE.SLATE_DARK, front: PALETTE.SLATE_LIGHT, stove: true },
      { tx: 34, top: PALETTE.WOOD_LIGHT, front: PALETTE.SLATE_DARK, oven: true },
      { tx: 35, top: PALETTE.STONE_CREAM, front: PALETTE.WOOD_MID, sink: true },
      { tx: 36, top: PALETTE.STONE_CREAM, front: PALETTE.WOOD_MID, sink: true },
      { tx: 37, top: PALETTE.SLATE_DARK, front: PALETTE.SLATE_LIGHT }
    ];
    for (const item of kItems) {
      addY(23 * 16 + 14, () => {
        const x = item.tx * 16, y = 23 * 16;
        c.fillStyle = PALETTE.INK; c.fillRect(x, y - (item.tall ? 6 : 0), 16, item.tall ? 22 : 16);
        c.fillStyle = item.top; c.fillRect(x + 1, y + 1 - (item.tall ? 6 : 0), 14, 9);
        c.fillStyle = item.front; c.fillRect(x + 1, y + 10 - (item.tall ? 6 : 0), 14, item.tall ? 11 : 5);
        if (item.board) { c.fillStyle = PALETTE.GOLD_BRIGHT; c.fillRect(x + 3, y + 3, 9, 5); c.fillStyle = PALETTE.RED_ALERT; c.fillRect(x + 5, y + 4, 3, 3); }
        else if (item.stove) { c.fillStyle = PALETTE.RED_ALERT; c.fillRect(x + 2, y + 3, 5, 4); c.fillStyle = PALETTE.GOLD_MID; c.fillRect(x + 9, y + 3, 5, 4); }
        else if (item.oven) { c.fillStyle = PALETTE.AMBER_MID; c.fillRect(x + 3, y + 11, 10, 3); }
        else if (item.sink) { c.fillStyle = PALETTE.WATER_BRIGHT; c.fillRect(x + 3, y + 3, 10, 5); }
      });
    }

    // 2. Kitchen Coffee, Microwave & Snack Island (Y=27)
    addY(27 * 16 + 14, () => {
      for (const [tx, col] of [[29, PALETTE.WOOD_DARK], [31, PALETTE.STONE_CREAM], [33, PALETTE.AMBER_MID]]) {
        const x = tx * 16, y = 27 * 16;
        c.fillStyle = PALETTE.INK; c.fillRect(x, y, 16, 16);
        c.fillStyle = PALETTE.WOOD_MID; c.fillRect(x + 1, y + 1, 14, 14);
        c.fillStyle = col; c.fillRect(x + 3, y - 3, 10, 10);
      }
    });

    // 3. Dining Room: Long Table for 8 + 8 Chairs & Small Bistro Table for 2 + 2 Chairs
    addY(24 * 16 + 10, () => {
      for (const cx of [42, 43, 44, 45]) {
        c.fillStyle = PALETTE.WOOD_DARK; c.fillRect(cx * 16 + 3, 24 * 16 + 4, 10, 10);
        c.fillStyle = PALETTE.AMBER_MID; c.fillRect(cx * 16 + 4, 24 * 16 + 5, 8, 7);
      }
    });
    addY(25 * 16 + 14, () => {
      c.fillStyle = 'rgba(0,0,0,0.22)'; c.fillRect(42 * 16 + 2, 25 * 16 + 4, 4 * 16, 15);
      c.fillStyle = PALETTE.WOOD_DARK; c.fillRect(42 * 16 - 2, 25 * 16, 4 * 16 + 4, 16);
      c.fillStyle = PALETTE.WOOD_LIGHT; c.fillRect(42 * 16, 25 * 16 + 2, 4 * 16, 11);
      c.fillStyle = PALETTE.STONE_CREAM; c.fillRect(42 * 16 + 4, 25 * 16 + 5, 4 * 16 - 8, 4);
      c.drawImage(this.atlasCanvas, 0, 0, 10, 7, 42 * 16 + 6, 25 * 16 + 4, 10, 7);
      c.drawImage(this.atlasCanvas, 32, 0, 10, 7, 44 * 16 + 8, 25 * 16 + 4, 10, 7);
    });
    addY(26 * 16 + 14, () => {
      for (const cx of [42, 43, 44, 45]) {
        c.fillStyle = PALETTE.WOOD_DARK; c.fillRect(cx * 16 + 3, 26 * 16 + 2, 10, 10);
        c.fillStyle = PALETTE.AMBER_MID; c.fillRect(cx * 16 + 4, 26 * 16 + 3, 8, 7);
      }
    });
    addY(29 * 16 + 14, () => {
      // Bistro chairs & small table for 2
      c.fillStyle = PALETTE.WOOD_DARK; c.fillRect(42 * 16 + 3, 29 * 16 + 3, 10, 10); c.fillRect(44 * 16 + 3, 29 * 16 + 3, 10, 10);
      c.fillStyle = PALETTE.AMBER_MID; c.fillRect(42 * 16 + 4, 29 * 16 + 4, 8, 8); c.fillRect(44 * 16 + 4, 29 * 16 + 4, 8, 8);
      c.fillStyle = PALETTE.WOOD_DARK; c.fillRect(43 * 16, 29 * 16, 16, 16);
      c.fillStyle = PALETTE.WOOD_TAN; c.fillRect(43 * 16 + 2, 29 * 16 + 2, 12, 11);
      c.drawImage(this.atlasCanvas, 80, 0, 10, 7, 43 * 16 + 3, 29 * 16 + 4, 10, 7);
    });

    // 4. Founder Executive Desk & Meeting Room Round Handoff Table with Chairs
    addY(10 * 16 + 14, () => {
      c.fillStyle = 'rgba(0,0,0,0.24)'; c.fillRect(32 * 16 + 2, 10 * 16 + 4, 48, 16);
      c.fillStyle = PALETTE.WOOD_DARK; c.fillRect(32 * 16, 10 * 16, 48, 16);
      c.fillStyle = PALETTE.GOLD_MID; c.fillRect(32 * 16 + 2, 10 * 16 + 2, 44, 10);
      c.fillStyle = PALETTE.GOLD_BRIGHT; c.fillRect(32 * 16 + 38, 10 * 16 + 3, 5, 5); // gold lamp
    });
    addY(12 * 16 + 14, () => {
      // Round Meeting Table surrounded by 4 well-spaced chairs at (42,10), (45,10), (42,13), (45,13)
      for (const [cx, cy] of [[42, 10], [45, 10], [42, 13], [45, 13]]) {
        c.fillStyle = PALETTE.WOOD_DARK; c.fillRect(cx * 16 + 3, cy * 16 + 3, 10, 10);
        c.fillStyle = PALETTE.WOOD_LIGHT; c.fillRect(cx * 16 + 4, cy * 16 + 4, 8, 8);
      }
      c.fillStyle = PALETTE.WOOD_DARK; c.fillRect(43 * 16 - 2, 11 * 16, 36, 30);
      c.fillStyle = PALETTE.WOOD_TAN; c.fillRect(43 * 16, 11 * 16 + 2, 32, 24);
      c.fillStyle = PALETTE.STONE_CREAM; c.fillRect(43 * 16 + 10, 11 * 16 + 8, 12, 10);
      c.fillStyle = PALETTE.GOLD_MID; c.fillRect(43 * 16 + 12, 11 * 16 + 10, 8, 2);
    });

    // 5. Lounge TV, Bookshelf, Arcade Cabinets, Sofas & Pool Table
    addY(32 * 16 + 14, () => {
      // TV console (30..31, 32) & Bookshelf (34..35, 32)
      c.fillStyle = PALETTE.SLATE_DARK; c.fillRect(30 * 16, 32 * 16, 32, 14);
      c.fillStyle = PALETTE.WATER_BRIGHT; c.fillRect(30 * 16 + 3, 32 * 16 + 2, 26, 9);
      c.fillStyle = PALETTE.WOOD_DARK; c.fillRect(34 * 16, 32 * 16, 32, 14);
      for (let b = 0; b < 5; b++) { c.fillStyle = [PALETTE.RED_ALERT, PALETTE.GOLD_BRIGHT, PALETTE.BLUE_LIGHT, PALETTE.GREEN_LIGHT, PALETTE.PURPLE_LIGHT][b]; c.fillRect(34 * 16 + 3 + b * 5, 32 * 16 + 3, 4, 8); }
    });
    addY(33 * 16 + 14, () => {
      for (const tx of [46, 47]) {
        const x = tx * 16, y = 33 * 16 - 6;
        c.fillStyle = PALETTE.INK; c.fillRect(x, y - 1, 16, 24);
        c.fillStyle = PALETTE.PURPLE_DARK; c.fillRect(x + 1, y, 14, 22);
        c.fillStyle = PALETTE.GOLD_BRIGHT; c.fillRect(x + 3, y + 2, 10, 3);
        c.fillStyle = PALETTE.WATER_BRIGHT; c.fillRect(x + 3, y + 6, 10, 7);
        c.fillStyle = PALETTE.RED_ALERT; c.fillRect(x + 4, y + 15, 2, 2); c.fillStyle = PALETTE.GREEN_LIGHT; c.fillRect(x + 9, y + 15, 2, 2);
      }
    });
    addY(35 * 16 + 14, () => {
      for (const tx of [30, 34]) {
        c.fillStyle = PALETTE.WOOD_DARK; c.fillRect(tx * 16, 35 * 16, 32, 15);
        c.fillStyle = PALETTE.AMBER_MID; c.fillRect(tx * 16 + 2, 35 * 16 + 3, 28, 9);
        c.fillStyle = PALETTE.GOLD_BRIGHT; c.fillRect(tx * 16 + 3, 35 * 16 + 4, 5, 5);
      }
      // Pool Table (42..43, 35..36)
      c.fillStyle = PALETTE.WOOD_DARK; c.fillRect(42 * 16 - 2, 35 * 16, 36, 26);
      c.fillStyle = PALETTE.GREEN_MID; c.fillRect(42 * 16 + 1, 35 * 16 + 3, 30, 20);
      c.fillStyle = PALETTE.STONE_CREAM; c.fillRect(42 * 16 + 9, 35 * 16 + 11, 2, 2);
      c.fillStyle = PALETTE.GOLD_BRIGHT; c.fillRect(42 * 16 + 21, 35 * 16 + 10, 2, 2);
      c.fillStyle = PALETTE.RED_ALERT; c.fillRect(42 * 16 + 23, 35 * 16 + 12, 2, 2);
    });

    // 6. Project Room Server Rack & Safira Device Test Table
    addY(9 * 16 + 14, () => {
      c.fillStyle = PALETTE.INK; c.fillRect(65 * 16 - 1, 8 * 16 - 1, 32, 30);
      c.fillStyle = PALETTE.SLATE_DARK; c.fillRect(65 * 16, 8 * 16, 30, 28);
      for (let r = 0; r < 4; r++) {
        c.fillStyle = (Math.floor(this.model.time * 4) + r) % 2 ? PALETTE.GREEN_LIGHT : PALETTE.WATER_BRIGHT;
        c.fillRect(65 * 16 + 4, 8 * 16 + 4 + r * 6, 8, 2);
        c.fillRect(65 * 16 + 16, 8 * 16 + 4 + r * 6, 8, 2);
      }
    });
    addY(19 * 16 + 14, () => {
      c.fillStyle = PALETTE.WOOD_DARK; c.fillRect(65 * 16, 19 * 16, 30, 15);
      c.fillStyle = PALETTE.WOOD_LIGHT; c.fillRect(65 * 16 + 1, 19 * 16 + 1, 28, 12);
      c.fillStyle = PALETTE.WATER_BRIGHT; c.fillRect(65 * 16 + 4, 19 * 16 + 3, 6, 8); c.fillRect(65 * 16 + 14, 19 * 16 + 4, 10, 6);
    });

    // 7. Finance Room Safe & Filing Cabinets
    addY(27 * 16 + 14, () => {
      c.fillStyle = PALETTE.SLATE_DARK; c.fillRect(14 * 16, 27 * 16, 30, 16);
      c.fillStyle = PALETTE.SLATE_LIGHT; c.fillRect(14 * 16 + 2, 27 * 16 + 2, 12, 12); c.fillRect(14 * 16 + 16, 27 * 16 + 2, 12, 12);
      c.fillStyle = PALETTE.INK; c.fillRect(24 * 16 - 1, 27 * 16 - 3, 28, 20);
      c.fillStyle = PALETTE.SLATE_DARK; c.fillRect(24 * 16, 27 * 16 - 2, 26, 18);
      c.fillStyle = PALETTE.GOLD_BRIGHT; c.fillRect(24 * 16 + 10, 27 * 16 + 4, 6, 6);
    });

    // 8. Outdoor Props: BBQ Grill, Courtyard Fountain, 3 Pixel Cars, Lush Trees & Flower Beds
    addY(19 * 16 + 14, () => {
      c.fillStyle = PALETTE.INK; c.fillRect(3 * 16 + 1, 19 * 16 - 1, 30, 17);
      c.fillStyle = PALETTE.RED_ALERT; c.fillRect(3 * 16 + 2, 19 * 16, 28, 15);
      c.fillStyle = PALETTE.INK; c.fillRect(3 * 16 + 5, 19 * 16 + 2, 22, 8);
      c.fillStyle = PALETTE.AMBER_MID; c.fillRect(3 * 16 + 8, 19 * 16 + 4, 4, 4); c.fillRect(3 * 16 + 16, 19 * 16 + 5, 5, 3);
    });
    addY(52 * 16, () => {
      const fx = 38 * 16, fy = 51 * 16;
      c.fillStyle = PALETTE.STONE_DARK; c.fillRect(fx - 5, fy - 5, 42, 38);
      c.fillStyle = PALETTE.STONE_LIGHT; c.fillRect(fx - 3, fy - 3, 38, 34);
      c.fillStyle = PALETTE.WATER_BRIGHT; c.fillRect(fx, fy, 32, 28);
      const splash = this.model.reducedMotion ? 0 : Math.floor(this.model.time * 6) % 3;
      c.fillStyle = PALETTE.STONE_CREAM; c.fillRect(fx + 14, fy + 8 - splash * 2, 4, 10 + splash * 2);
      c.fillRect(fx + 10 - splash, fy + 10, 2, 2); c.fillRect(fx + 20 + splash, fy + 10, 2, 2);
    });
    for (const [tx, ty, col] of [[15, 50, PALETTE.RED_ALERT], [20, 50, PALETTE.BLUE_MID], [15, 54, PALETTE.GOLD_MID]]) {
      addY((ty + 1) * 16 + 12, () => {
        const x = tx * 16, y = ty * 16 + 4;
        c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x + 2, y + 4, 44, 21);
        c.fillStyle = PALETTE.INK; c.fillRect(x + 3, y - 1, 42, 22);
        c.fillStyle = col; c.fillRect(x + 4, y, 40, 20);
        c.fillStyle = PALETTE.WATER_BRIGHT; c.fillRect(x + 12, y + 3, 22, 14);
        c.fillStyle = PALETTE.GOLD_BRIGHT; c.fillRect(x + 41, y + 3, 3, 4); c.fillRect(x + 41, y + 13, 3, 4);
      });
    }
    const trees = [
      [3, 3], [8, 3], [22, 3], [56, 3], [73, 3], [76, 25], [76, 44], [69, 48], [62, 52], [50, 52], [11, 51], [4, 52]
    ];
    for (const [tx, ty] of trees) {
      addY(ty * 16 + 14, () => {
        const x = tx * 16, y = ty * 16;
        c.fillStyle = 'rgba(0,0,0,0.24)'; c.fillRect(x - 3, y + 10, 22, 8);
        c.fillStyle = PALETTE.WOOD_DARK; c.fillRect(x + 5, y + 2, 6, 12);
        c.fillStyle = PALETTE.WOOD_MID; c.fillRect(x + 6, y + 2, 4, 11);
        c.fillStyle = PALETTE.INK; c.fillRect(x - 5, y - 15, 26, 20);
        c.fillStyle = PALETTE.GRASS_DARK; c.fillRect(x - 4, y - 14, 24, 18);
        c.fillStyle = PALETTE.GRASS_MID; c.fillRect(x - 3, y - 13, 20, 14);
        c.fillStyle = PALETTE.GRASS_LIGHT; c.fillRect(x - 1, y - 11, 14, 8);
      });
    }
  }

  drawCharacter(c, a) {
    if (!a.enabled || a.status === 'PLACEHOLDER') return;
    const t = this.model.reducedMotion || a.status === 'PAUSED' ? 0 : this.model.time;
    const moving = a.path.length > 0 && !this.model.reducedMotion && a.status !== 'PAUSED';
    const spot = a.spot !== null ? SPOTS[a.spot] : null;
    const working = ['WORKING', 'WAITING_APPROVAL', 'BLOCKED', 'ERROR'].includes(a.status) && !moving;
    const atDesk = working && Math.hypot(a.x - a.desk.x, a.y - a.desk.y) <= 8;
    const talkBeat = !this.model.reducedMotion && Math.floor(t * 5 + a.index) % 2 === 0;

    let pose = `${a.dir || 'down'}_0`;
    if (moving) pose = `${a.dir || 'down'}_${(Math.floor(t * 8 + a.index) % 2) + 1}`;
    else if (a.status === 'WAITING_APPROVAL') pose = 'wait_approval';
    else if (working) pose = (t > 0 && Math.floor(t * 5 + a.index) % 2 === 1) ? 'sit_type_2' : 'sit_type';
    else if (a.speaking && talkBeat) pose = `talk_${a.dir || 'down'}`;
    else if (spot) {
      const sMap = {
        swim: 'swim', cook_fridge: 'cook', cook_chop: 'cook', cook_stove: 'cook', wash: 'cook',
        eat: 'eat', coffee: 'coffee', smoke: 'smoke', ball: 'ball', chat: `${a.dir || 'down'}_0`, discuss: `${a.dir || 'down'}_0`, nap: 'nap',
        bbq: 'cook', garden: 'cook', arcade: 'sit_type', pool_game: `${a.dir || 'down'}_0`, read: 'sit_type', sit: 'sit_type'
      };
      pose = sMap[spot.type] || `${a.dir || 'down'}_0`;
    }

    const talkBob = !moving && a.speaking && !working && talkBeat ? -1 : 0;
    const seatShift = atDesk ? -2 : 0;
    const px = Math.round(a.x - 8), py = Math.round(a.y - 20 + seatShift + talkBob);
    if (this.selected === a.id && !this.selectedTeam) {
      c.fillStyle = PALETTE.GOLD_BRIGHT; c.fillRect(px + 1, py + 19 - talkBob, 14, 4);
      c.fillStyle = PALETTE.INK; c.fillRect(px + 2, py + 20 - talkBob, 12, 2);
    } else if (pose !== 'swim' && !atDesk) {
      c.fillStyle = 'rgba(0,0,0,0.28)'; c.fillRect(px + 3, py + 20 - talkBob, 10, 3);
    }

    const spriteData = this.agentSprites?.get(a.id);
    if (spriteData) {
      const idx = Math.max(0, spriteData.poses.indexOf(pose));
      c.drawImage(spriteData.canvas, idx * 16, 0, 16, 24, px, py, 16, 24);
    }

    // Swivel chair backrest rim behind seated working agent so they clearly sit IN the chair
    if (atDesk) {
      const team = TEAMS.find(tm => tm.id === a.team) || TEAMS[0];
      c.fillStyle = PALETTE.INK; c.fillRect(px + 2, py + 16, 12, 5);
      c.fillStyle = team.dark; c.fillRect(px + 3, py + 17, 10, 3);
      c.fillStyle = team.color; c.fillRect(px + 3, py + 17, 10, 1);
    }

    if (!moving && (a.dish || spot?.type === 'eat')) {
      const dishId = a.dish?.id || 'noodles';
      const rect = this.atlas[`dish_${dishId}`] || this.atlas.dish_noodles;
      if (rect && (a.cookStage >= 2 || spot?.type === 'eat')) {
        c.drawImage(this.atlasCanvas, rect.x, rect.y, rect.w, rect.h, px + 3, py + 9, rect.w, rect.h);
      }
    }

    if (!moving && !this.model.reducedMotion) {
      if (spot?.type === 'cook_stove' || spot?.type === 'bbq') {
        const lift = Math.floor((t * 10) % 8);
        c.fillStyle = PALETTE.STONE_CREAM; c.fillRect(px + 6, py - 2 - lift, 2, 2);
        c.fillStyle = PALETTE.GOLD_BRIGHT; c.fillRect(px + 10, py + 2 - (lift % 4), 1, 1);
      } else if (spot?.type === 'smoke') {
        for (let p = 0; p < 3; p++) {
          const drift = Math.floor((t * 6 + p * 3) % 10);
          c.fillStyle = 'rgba(242, 234, 216, 0.78)'; c.fillRect(px + 13 + (drift % 3), py + 6 - drift, 2, 2);
        }
      } else if (spot?.type === 'ball') {
        const bounce = Math.abs(Math.round(Math.sin(t * 5 + a.index) * 6));
        c.fillStyle = PALETTE.AMBER_MID; c.fillRect(px + 15, py + 16 - bounce, 4, 4);
      } else if (spot?.type === 'nap') {
        const zLift = Math.floor((t * 4) % 8);
        drawPixelText(c, 'Z', px + 14, py - zLift, PALETTE.GOLD_BRIGHT, 1, 'left', PALETTE.INK);
      }
    }
  }

  drawPixelLabels(c, camX, camY, S = this.pixelScale) {
    // 0. Founder Suite Control Wall interactive panels
    for (const [id, wx] of [['approve', 30 * 16 + 15], ['reject', 32 * 16 + 11], ['pause', 33 * 16 + 23], ['stop', 35 * 16 + 19]]) {
      this.hitboxes.push({ id, type: 'control_panel', x: (wx - camX) * S, y: (6 * 16 + 17 - camY) * S, w: 22 * S, h: 18 * S });
    }

    // 1. Placeholder Desk "COMING SOON" tags
    for (const a of this.model.agents) {
      if (a.placeholder && !a.enabled) {
        const sx = Math.round(a.desk.x - camX), sy = Math.round(a.desk.y - 22 - camY);
        c.fillStyle = PALETTE.INK; c.fillRect(sx - 23, sy - 1, 46, 9);
        c.fillStyle = PALETTE.WOOD_MID; c.fillRect(sx - 22, sy, 44, 7);
        drawPixelText(c, 'COMING SOON', sx, sy + 1, PALETTE.GOLD_BRIGHT, 1, 'center', null);
        this.hitboxes.push({ id: a.id, type: 'agent', x: sx * S, y: (sy + 10) * S, w: 48 * S, h: 32 * S });
      }
    }

    // 2. Team Room Banners & Progress Bars + Common Room Tags
    for (const team of TEAMS) {
      const [rx, ry, rw] = team.room;
      const bx = Math.round(rx + rw / 2 - camX), by = Math.round(ry + 6 - camY);
      const pct = this.model.progress[team.id] || 0;
      c.fillStyle = PALETTE.INK; c.fillRect(bx - 34, by - 2, 68, 12);
      c.fillStyle = team.dark; c.fillRect(bx - 33, by - 1, 66, 10);
      drawPixelText(c, team.name, bx, by, PALETTE.STONE_CREAM, 1, 'center', null);
      c.fillStyle = PALETTE.INK; c.fillRect(bx - 28, by + 7, 56, 2);
      c.fillStyle = PALETTE.GOLD_BRIGHT; c.fillRect(bx - 28, by + 7, Math.round(56 * pct / 100), 2);
      this.hitboxes.push({ id: team.id, type: 'room', x: bx * S, y: (by + 4) * S, w: 72 * S, h: 20 * S });
    }
    for (const [label, tx, ty] of [['MEETING ROOM', 44, 16], ['KITCHEN & DINING', 39, 22], ['LOUNGE & GAMES', 39, 32], ['POOL', 74, 8], ['GARDEN', 6, 7], ['BALL COURT', 73, 27]]) {
      const lx = Math.round(tx * 16 - camX), ly = Math.round(ty * 16 - 4 - camY);
      const lw = label.length * 4 + 6;
      c.fillStyle = 'rgba(30,28,36,0.78)'; c.fillRect(lx - lw / 2, ly, lw, 7);
      drawPixelText(c, label, lx, ly + 1, PALETTE.STONE_CREAM, 1, 'center', null);
    }

    // 3. Founder Suite Glowing Approval Marker
    const fx = Math.round(33 * 16 + 8 - camX), fy = Math.round(14 * 16 - camY);
    const hasApproval = this.model.approvals.length > 0;
    const pulse = hasApproval && !this.model.reducedMotion ? Math.round(Math.sin(this.model.time * 5) * 2) : 0;
    c.fillStyle = hasApproval ? PALETTE.GOLD_BRIGHT : PALETTE.WOOD_MID; c.fillRect(fx - 26, fy - 4 + pulse, 52, 11);
    c.fillStyle = hasApproval ? PALETTE.AMBER_DARK : PALETTE.INK; c.fillRect(fx - 25, fy - 3 + pulse, 50, 9);
    drawPixelText(c, hasApproval ? `APPROVE (${this.model.approvals.length})` : 'FOUNDER SUITE', fx, fy - 1 + pulse, hasApproval ? PALETTE.GOLD_BRIGHT : PALETTE.STONE_CREAM, 1, 'center', null);
    this.hitboxes.push({ type: 'approval', x: fx * S, y: fy * S, w: 60 * S, h: 24 * S });

    // 4. Active Character Name Tags, Status Badges & Speech Bubbles
    for (const a of this.model.agents) {
      if (!a.enabled || a.status === 'PLACEHOLDER') continue;
      const sx = Math.round(a.x - camX), sy = Math.round(a.y - 28 - camY);
      const selected = this.selected === a.id && !this.selectedTeam;
      const tagW = Math.max(28, a.name.length * 4 + 12);

      c.fillStyle = selected ? PALETTE.GOLD_BRIGHT : PALETTE.INK; c.fillRect(sx - tagW / 2 - 1, sy - 1, tagW + 2, 9);
      c.fillStyle = selected ? PALETTE.WOOD_DARK : '#262430'; c.fillRect(sx - tagW / 2, sy, tagW, 7);
      c.fillStyle = STATUSES[a.status]?.color || PALETTE.SLATE_LIGHT; c.fillRect(sx - tagW / 2 + 2, sy + 2, 3, 3);
      drawPixelText(c, a.name, sx + 2, sy + 1, selected ? PALETTE.GOLD_BRIGHT : PALETTE.STONE_CREAM, 1, 'center', null);

      if (['WAITING_APPROVAL', 'BLOCKED', 'ERROR', 'PAUSED'].includes(a.status)) {
        const bx = sx + tagW / 2 + 3;
        c.fillStyle = STATUSES[a.status].color; c.fillRect(bx, sy - 1, 7, 8);
        drawPixelText(c, a.status === 'PAUSED' ? 'II' : '!', bx + 4, sy + 1, PALETTE.STONE_CREAM, 1, 'center', null);
      }

      const bubbleText = a.chatBubble || (a.status === 'WORKING' && selected ? a.task : selected ? a.activity : (a.cookStage >= 0 ? a.activity : ''));
      if (bubbleText) {
        const isListen = a.discussKind === 'listen' && bubbleText === '...';
        const dotCount = this.model.reducedMotion ? 3 : (Math.floor(this.model.time * 3 + a.index) % 3) + 1;
        const short = isListen ? '.'.repeat(dotCount) : (bubbleText.length > 24 ? bubbleText.slice(0, 23) : bubbleText);
        const bw = Math.max(14, short.length * 4 + 8);
        const bgCol = a.discussKind === 'work' ? '#d8f5e8' : a.discussKind === 'meeting' ? '#fff4cc' : isListen ? '#ebe2ce' : PALETTE.STONE_CREAM;
        const borderCol = a.discussKind === 'work' ? PALETTE.GREEN_DARK : a.discussKind === 'meeting' ? PALETTE.AMBER_DARK : PALETTE.INK;
        c.fillStyle = borderCol; c.fillRect(sx - bw / 2 - 1, sy - 13, bw + 2, 9);
        c.fillStyle = bgCol; c.fillRect(sx - bw / 2, sy - 12, bw, 7);
        // Speech bubble pointer tail pointing down toward agent
        if (a.chatBubble) {
          c.fillStyle = borderCol; c.fillRect(sx - 2, sy - 4, 5, 2); c.fillRect(sx - 1, sy - 2, 3, 1);
          c.fillStyle = bgCol; c.fillRect(sx - 1, sy - 5, 3, 2);
        }
        drawPixelText(c, short, sx, sy - 11, PALETTE.INK, 1, 'center', null);
      }

      this.hitboxes.push({ id: a.id, type: 'agent', x: sx * S, y: (sy + 14) * S, w: Math.max(28, tagW * S), h: 32 * S });
    }

    // 5. Flying Handoff Documents
    for (const h of this.model.handoffs) {
      const t = Math.min(h.age / h.duration, 1);
      let wx, wy;
      if (h.via) {
        if (t < 0.5) { const u = t * 2; wx = h.from.x + (h.via.x - h.from.x) * u; wy = h.from.y + (h.via.y - h.from.y) * u; }
        else { const u = (t - 0.5) * 2; wx = h.via.x + (h.to.x - h.via.x) * u; wy = h.via.y + (h.to.y - h.via.y) * u; }
      } else {
        wx = h.from.x + (h.to.x - h.from.x) * t; wy = h.from.y + (h.to.y - h.from.y) * t;
      }
      const arc = this.model.reducedMotion ? 0 : Math.sin(t * Math.PI) * 18;
      const dx = Math.round(wx - camX), dy = Math.round(wy - arc - 14 - camY);
      c.fillStyle = PALETTE.INK; c.fillRect(dx - 6, dy - 7, 12, 14);
      c.fillStyle = PALETTE.STONE_CREAM; c.fillRect(dx - 5, dy - 6, 10, 12);
      c.fillStyle = PALETTE.GOLD_MID; c.fillRect(dx - 3, dy - 4, 6, 2);
      c.fillStyle = PALETTE.SLATE_LIGHT; c.fillRect(dx - 3, dy, 6, 1); c.fillRect(dx - 3, dy + 2, 5, 1);
      const lw = h.label.length * 4 + 8;
      c.fillStyle = PALETTE.INK; c.fillRect(dx - lw / 2 - 1, dy + 8, lw + 2, 9);
      c.fillStyle = PALETTE.GOLD_MID; c.fillRect(dx - lw / 2, dy + 9, lw, 7);
      drawPixelText(c, h.label, dx, dy + 10, PALETTE.INK, 1, 'center', null);
    }
  }

  renderMinimap() {
    if (!this.minimapCanvas) this.minimapCanvas = typeof document !== 'undefined' ? document.getElementById('minimap-canvas') : null;
    if (!this.minimapCanvas) return;
    const mc = this.minimapCanvas.getContext('2d');
    const mw = this.minimapCanvas.width, mh = this.minimapCanvas.height;
    mc.imageSmoothingEnabled = false;
    mc.fillStyle = this.night ? '#1c2e1f' : PALETTE.GRASS_DARK;
    mc.fillRect(0, 0, mw, mh);

    const sx = mw / WORLD_W, sy = mh / WORLD_H;
    mc.fillStyle = PALETTE.WATER_BRIGHT;
    mc.fillRect(Math.round(71 * 16 * sx), Math.round(9 * 16 * sy), Math.round(6 * 16 * sx), Math.round(12 * 16 * sy));
    mc.fillRect(Math.round(3 * 16 * sx), Math.round(41 * 16 * sy), Math.round(7 * 16 * sx), Math.round(6 * 16 * sy));

    for (const r of ROOMS) {
      mc.fillStyle = r.color;
      mc.fillRect(Math.round(r.tx * 16 * sx), Math.round(r.ty * 16 * sy), Math.round(r.tw * 16 * sx), Math.round(r.th * 16 * sy));
    }
    for (const a of this.model.agents) {
      if (!a.enabled || a.status === 'PLACEHOLDER') continue;
      mc.fillStyle = a.id === this.selected ? PALETTE.GOLD_BRIGHT : STATUSES[a.status]?.color || '#fff';
      mc.fillRect(Math.round(a.x * sx) - 1, Math.round(a.y * sy) - 1, 3, 3);
    }

    const S = Math.max(1, Math.min(4, Math.round(this.pixelScale)));
    const iw = this.w / S, ih = this.h / S;
    const camX = this.center.x - (this.w / 2 + this.pan.x) / S;
    const camY = this.center.y - (this.viewportCenterY + this.pan.y) / S;
    mc.strokeStyle = PALETTE.STONE_CREAM; mc.lineWidth = 1;
    mc.strokeRect(Math.round(camX * sx), Math.round(camY * sy), Math.round(iw * sx), Math.round(ih * sy));
  }

  frame(now) {
    const dt = this.lastTime ? Math.min((now - this.lastTime) / 1000, 0.06) : 0.016;
    this.lastTime = now;
    if (typeof document !== 'undefined' && !document.hidden) this.model.update(dt);
    if (dt > 0) this.fps = this.fps * 0.96 + (1 / dt) * 0.04;

    if (this.followId) {
      const target = this.model.get(this.followId);
      if (target) this.focus = { x: (this.center.x - target.x) * this.scale, y: (this.center.y - target.y) * this.scale };
    }
    if (this.focus) {
      const f = this.model.reducedMotion ? 1 : 0.14;
      this.pan.x += (this.focus.x - this.pan.x) * f;
      this.pan.y += (this.focus.y - this.pan.y) * f;
    }

    const S = Math.max(1, Math.min(4, Math.round(this.pixelScale)));
    this.scale = S;
    const iw = Math.ceil(this.w / S), ih = Math.ceil(this.h / S);
    if (this.internalCanvas.width !== iw || this.internalCanvas.height !== ih) {
      this.internalCanvas.width = iw; this.internalCanvas.height = ih;
    }

    const ic = this.internalCtx;
    ic.imageSmoothingEnabled = false;
    this.renderStaticGround();

    const camX = Math.round(this.center.x - (this.w / 2 + this.pan.x) / S);
    const camY = Math.round(this.center.y - (this.viewportCenterY + this.pan.y) / S);

    // Seamless tiled pixel lawn across the entire viewport so edges never show a flat void border
    const baseGrass = this.night ? '#243d26' : PALETTE.GRASS_MID;
    const altGrass = this.night ? '#1f3621' : '#538243';
    const bladeGrass = this.night ? '#2e4e2f' : PALETTE.GRASS_LIGHT;
    ic.fillStyle = baseGrass;
    ic.fillRect(0, 0, iw, ih);
    const startTx = Math.floor(camX / 16) - 1;
    const endTx = Math.ceil((camX + iw) / 16) + 1;
    const startTy = Math.floor(camY / 16) - 1;
    const endTy = Math.ceil((camY + ih) / 16) + 1;
    for (let ty = startTy; ty <= endTy; ty++) {
      for (let tx = startTx; tx <= endTx; tx++) {
        if (tx >= 0 && tx < GRID_COLS && ty >= 0 && ty < GRID_ROWS) continue;
        const sx = tx * 16 - camX, sy = ty * 16 - camY;
        if (((tx + ty) & 1) === 0) {
          ic.fillStyle = altGrass;
          ic.fillRect(sx, sy, 16, 16);
        }
        const h = Math.abs((tx * 17 + ty * 31) % 19);
        ic.fillStyle = bladeGrass;
        ic.fillRect(sx + (h % 12) + 2, sy + ((h * 3) % 11) + 2, 2, 1);
      }
    }
    ic.drawImage(this.groundCanvas, -camX, -camY);

    if (!this.model.reducedMotion) {
      const wave = Math.floor(this.model.time * 3) % 4;
      ic.fillStyle = PALETTE.STONE_CREAM;
      for (let r = 0; r < 5; r++) ic.fillRect(72 * 16 + wave * 2 - camX, (10 + r * 2) * 16 - camY, 8, 1);
      const kx = Math.round(5 * 16 + Math.sin(this.model.time * 1.4) * 18 - camX);
      const ky = Math.round(42 * 16 + Math.cos(this.model.time * 1.1) * 10 - camY);
      ic.fillStyle = PALETTE.AMBER_MID; ic.fillRect(kx, ky, 4, 2);
      ic.fillStyle = PALETTE.STONE_CREAM; ic.fillRect(kx + 2, ky, 1, 2);
    }

    const yItems = [];
    const addY = (depth, draw) => yItems.push({ depth, draw });

    ic.save();
    ic.translate(-camX, -camY);
    this.drawKitchenAndFurniture(ic, addY);
    for (const a of this.model.agents) {
      if (!a.unassigned) addY(a.desk.y - 4, () => this.drawDesk(ic, a));
      if (a.enabled && a.status !== 'PLACEHOLDER') addY(a.y, () => this.drawCharacter(ic, a));
    }
    yItems.sort((a, b) => a.depth - b.depth).forEach(item => item.draw());
    ic.restore();

    if (this.night) {
      ic.fillStyle = 'rgba(14, 18, 38, 0.36)';
      ic.fillRect(0, 0, iw, ih);
      ic.fillStyle = 'rgba(250, 224, 107, 0.16)';
      for (const [lx, ly] of (this.lamps || [])) {
        ic.fillRect(Math.round(lx * 16 - 18 - camX), Math.round(ly * 16 - 18 - camY), 44, 34);
      }
      for (const [lx, ly, lr] of [[39 * 16, 42 * 16, 42], [33 * 16, 13 * 16, 38], [34 * 16, 25 * 16, 42], [74 * 16, 15 * 16, 44]]) {
        ic.fillRect(Math.round(lx - lr - camX), Math.round(ly - lr / 2 - camY), lr * 2, lr);
      }
    }

    this.hitboxes = [];
    this.drawPixelLabels(ic, camX, camY, S);

    const c = this.ctx;
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, this.w, this.h);
    c.drawImage(this.internalCanvas, 0, 0, iw, ih, 0, 0, iw * S, ih * S);

    this.renderMinimap();
    requestAnimationFrame(this.frame);
  }
}
