import type {
  CharacterSkinId,
  HidingSpotConfig,
  MapConfig,
  MapProp,
  WallRect,
} from './maps.ts';
import type { MatchState, PlayerState } from './rules.ts';

/**
 * Zero-GC Pre-Allocated Particle Ring Buffer for Pixel-Art Juice
 */
export interface PooledParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

const MAX_PARTICLES = 64;
const particlePool: PooledParticle[] = Array.from({ length: MAX_PARTICLES }, () => ({
  active: false,
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  life: 0,
  maxLife: 1,
  size: 4,
  color: '#F59E0B',
}));
let particleCursor = 0;

export function spawnPixelBurst(
  x: number,
  y: number,
  count: number,
  color: string,
  speed: number = 95
) {
  for (let i = 0; i < count; i++) {
    const p = particlePool[particleCursor];
    particleCursor = (particleCursor + 1) % MAX_PARTICLES;
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const mag = speed * (0.45 + Math.random() * 0.75);
    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = Math.cos(angle) * mag;
    p.vy = Math.sin(angle) * mag;
    p.maxLife = 0.25 + Math.random() * 0.25;
    p.life = p.maxLife;
    p.size = Math.random() > 0.5 ? 5 : 3;
    p.color = color;
  }
}

export function stepAndDrawParticles(ctx: CanvasRenderingContext2D, dt: number) {
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const p = particlePool[i];
    if (!p.active) continue;
    p.life -= dt;
    if (p.life <= 0) {
      p.active = false;
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.92;
    p.vy *= 0.92;
    ctx.fillStyle = p.color;
    const sz = Math.max(2, Math.round(p.size * (p.life / p.maxLife)));
    ctx.fillRect(Math.round(p.x - sz / 2), Math.round(p.y - sz / 2), sz, sz);
  }
}

/**
 * Asset Pack Sprite Sheet Cache (`brackeys`, `modern_interiors`, `mystic_woods`, `top_down_basic`)
 */
type SpriteAssetKey =
  | 'knight'
  | 'slime_green'
  | 'slime_purple'
  | 'coin'
  | 'fruit'
  | 'mystic_player'
  | 'mystic_skeleton'
  | 'chest_01'
  | 'chest_02'
  | 'water_rock'
  | 'adam_idle'
  | 'adam_run'
  | 'amelia_idle'
  | 'amelia_run';

const SPRITE_ASSET_URLS: Record<SpriteAssetKey, string> = {
  knight: '/assets/packs/brackeys/brackeys_platformer_assets/sprites/knight.png',
  slime_green: '/assets/packs/brackeys/brackeys_platformer_assets/sprites/slime_green.png',
  slime_purple: '/assets/packs/brackeys/brackeys_platformer_assets/sprites/slime_purple.png',
  coin: '/assets/packs/brackeys/brackeys_platformer_assets/sprites/coin.png',
  fruit: '/assets/packs/brackeys/brackeys_platformer_assets/sprites/fruit.png',
  mystic_player: '/assets/packs/mystic_woods/sprites/characters/player.png',
  mystic_skeleton: '/assets/packs/mystic_woods/sprites/characters/skeleton.png',
  chest_01: '/assets/packs/mystic_woods/sprites/objects/chest_01.png',
  chest_02: '/assets/packs/mystic_woods/sprites/objects/chest_02.png',
  water_rock: '/assets/packs/mystic_woods/sprites/objects/rock_in_water_01.png',
  adam_idle: '/assets/packs/modern_interiors/Modern tiles_Free/Characters_free/Adam_idle_anim_16x16.png',
  adam_run: '/assets/packs/modern_interiors/Modern tiles_Free/Characters_free/Adam_run_16x16.png',
  amelia_idle: '/assets/packs/modern_interiors/Modern tiles_Free/Characters_free/Amelia_idle_anim_16x16.png',
  amelia_run: '/assets/packs/modern_interiors/Modern tiles_Free/Characters_free/Amelia_run_16x16.png',
};

const loadedSprites: Partial<Record<SpriteAssetKey, HTMLImageElement>> = {};
let spritesInitialized = false;

function getSpriteImage(key: SpriteAssetKey): HTMLImageElement | null {
  if (typeof window === 'undefined' || typeof Image === 'undefined') return null;
  if (!spritesInitialized) {
    spritesInitialized = true;
    (Object.keys(SPRITE_ASSET_URLS) as SpriteAssetKey[]).forEach((k) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = SPRITE_ASSET_URLS[k];
      img.onload = () => {
        loadedSprites[k] = img;
      };
    });
  }
  const img = loadedSprites[key];
  return img && img.complete && img.naturalWidth > 0 ? img : null;
}

export function drawPixelMap(
  ctx: CanvasRenderingContext2D,
  map: MapConfig,
  state: MatchState,
  localPlayerId: string,
  timeSec: number
) {
  // 1. Base Cobblestone & Textured Ground (World Tileset style)
  ctx.fillStyle =
    map.theme === 'mystic_woods'
      ? '#0F241D'
      : map.theme === 'modern_executive'
      ? '#161F30'
      : map.theme === 'harbor_fantasy'
      ? '#121A2A'
      : '#151C2C';
  ctx.fillRect(0, 0, map.width, map.height);

  // Pixel cobblestone / forest / marble pattern (32x32 tile accents)
  ctx.fillStyle =
    map.theme === 'mystic_woods'
      ? '#143026'
      : map.theme === 'modern_executive'
      ? '#1E293B'
      : '#1B2438';
  for (let gx = 0; gx < map.width; gx += 32) {
    ctx.fillRect(gx, 0, 2, map.height);
  }
  for (let gy = 0; gy < map.height; gy += 32) {
    ctx.fillRect(0, gy, map.width, 2);
  }
  ctx.fillStyle = '#202B42';
  for (let gx = 16; gx < map.width; gx += 64) {
    for (let gy = 16; gy < map.height; gy += 64) {
      ctx.fillRect(gx, gy, 8, 4);
      ctx.fillRect(gx + 20, gy + 24, 6, 4);
    }
  }

  // 2. Roads, Bridges, Railways, Park Grass & Cutaway Interior Floors
  for (const r of map.roads) {
    if (r.kind === 'autumn_grass') {
      ctx.fillStyle = '#3F2E1E';
      ctx.fillRect(r.x, r.y, r.width, r.height);
      ctx.fillStyle = '#78350F';
      for (let gx = r.x + 8; gx < r.x + r.width - 8; gx += 24) {
        for (let gy = r.y + 8; gy < r.y + r.height - 8; gy += 24) {
          ctx.fillRect(gx, gy, 6, 4);
          ctx.fillStyle = '#B45309';
          ctx.fillRect(gx + 10, gy + 10, 4, 4);
          ctx.fillStyle = '#78350F';
        }
      }
    } else if (r.kind === 'grass_patch') {
      ctx.fillStyle = '#14332B';
      ctx.fillRect(r.x, r.y, r.width, r.height);
      ctx.fillStyle = '#065F46';
      for (let gx = r.x + 10; gx < r.x + r.width - 10; gx += 28) {
        for (let gy = r.y + 10; gy < r.y + r.height - 10; gy += 28) {
          ctx.fillRect(gx, gy, 6, 4);
        }
      }
    } else if (r.kind === 'plaza') {
      ctx.fillStyle = '#27344D';
      ctx.fillRect(r.x, r.y, r.width, r.height);
      // Decorative mosaic tile pattern in plaza
      ctx.strokeStyle = '#3B4D6B';
      ctx.lineWidth = 2;
      for (let px = r.x + 16; px < r.x + r.width - 16; px += 32) {
        for (let py = r.y + 16; py < r.y + r.height - 16; py += 32) {
          ctx.strokeRect(px, py, 28, 28);
        }
      }
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 4;
      ctx.strokeRect(r.x + 2, r.y + 2, r.width - 4, r.height - 4);
    } else if (r.kind === 'dock_planks') {
      ctx.fillStyle = '#3B281E';
      ctx.fillRect(r.x, r.y, r.width, r.height);
      ctx.fillStyle = '#523728';
      for (let py = r.y + 6; py < r.y + r.height - 4; py += 14) {
        ctx.fillRect(r.x + 4, py, r.width - 8, 8);
      }
      ctx.strokeStyle = '#271912';
      ctx.lineWidth = 4;
      ctx.strokeRect(r.x, r.y, r.width, r.height);
    } else if (r.kind === 'bridge_h') {
      // Fantasy v2.0 Horizontal Wooden Bridge
      ctx.fillStyle = '#452719';
      ctx.fillRect(r.x, r.y, r.width, r.height);
      ctx.fillStyle = '#783F24';
      for (let bx = r.x + 6; bx < r.x + r.width - 6; bx += 14) {
        ctx.fillRect(bx, r.y + 6, 10, r.height - 12);
      }
      // Top & bottom bridge handrails
      ctx.fillStyle = '#9A5B32';
      ctx.fillRect(r.x, r.y, r.width, 6);
      ctx.fillRect(r.x, r.y + r.height - 6, r.width, 6);
    } else if (r.kind === 'bridge_v') {
      ctx.fillStyle = '#2B3548';
      ctx.fillRect(r.x, r.y, r.width, r.height);
      ctx.fillStyle = '#475569';
      for (let by = r.y + 8; by < r.y + r.height - 8; by += 24) {
        ctx.fillRect(r.x + 6, by, r.width - 12, 16);
      }
    } else if (r.kind === 'railway') {
      // Fantasy v2.0 Cave Railway Track along boulevard
      ctx.fillStyle = '#1B2232';
      ctx.fillRect(r.x, r.y, r.width, r.height);
      const railY = Math.round(r.y + r.height / 2 - 14);
      // Wooden sleepers
      ctx.fillStyle = '#5C3A21';
      for (let rx = r.x + 8; rx < r.x + r.width - 8; rx += 20) {
        ctx.fillRect(rx, railY - 4, 8, 36);
      }
      // Steel rails
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(r.x, railY, r.width, 4);
      ctx.fillRect(r.x, railY + 24, r.width, 4);
    } else if (r.kind === 'asphalt') {
      ctx.fillStyle = '#1C2434';
      ctx.fillRect(r.x, r.y, r.width, r.height);
      // Sidewalk curbs
      ctx.fillStyle = '#334155';
      if (r.width > r.height) {
        ctx.fillRect(r.x, r.y, r.width, 5);
        ctx.fillRect(r.x, r.y + r.height - 5, r.width, 5);
        const midY = Math.round(r.y + r.height / 2 - 2);
        ctx.fillStyle = '#D97706';
        for (let lx = r.x + 16; lx < r.x + r.width - 24; lx += 48) {
          ctx.fillRect(lx, midY, 22, 4);
        }
      } else {
        ctx.fillRect(r.x, r.y, 5, r.height);
        ctx.fillRect(r.x + r.width - 5, r.y, 5, r.height);
        const midX = Math.round(r.x + r.width / 2 - 2);
        ctx.fillStyle = '#D97706';
        for (let ly = r.y + 16; ly < r.y + r.height - 24; ly += 48) {
          ctx.fillRect(midX, ly, 4, 22);
        }
      }
    } else {
      ctx.fillStyle = '#161D2B';
      ctx.fillRect(r.x, r.y, r.width, r.height);
    }
  }

  // 3. Seeker Starting Zone Lock Perimeter
  const sz = map.seekerSpawnZone;
  ctx.fillStyle =
    state.lifecycle === 'HIDER_HEAD_START'
      ? 'rgba(239, 68, 68, 0.18)'
      : 'rgba(239, 68, 68, 0.06)';
  ctx.fillRect(sz.x, sz.y, sz.width, sz.height);
  ctx.strokeStyle = state.lifecycle === 'HIDER_HEAD_START' ? '#EF4444' : '#7F1D1D';
  ctx.lineWidth = 3;
  ctx.strokeRect(sz.x, sz.y, sz.width, sz.height);

  ctx.fillStyle = '#FCA5A5';
  ctx.font = 'bold 11px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    state.lifecycle === 'HIDER_HEAD_START'
      ? `SEEKER LOCKED (${Math.ceil(state.countdownRemaining)}S)`
      : 'SEEKER DEPLOY ZONE',
    sz.x + sz.width / 2,
    sz.y + 18
  );

  // 4. Cutaway PixelSpaces Buildings, Fences & Canals
  for (const w of map.walls) {
    drawWallBlock(ctx, w, map, timeSec);
  }

  // 5. Interior & Outdoor Props (PixelSpaces Furniture, Trees, Coins, Fruits)
  if (map.props) {
    for (const prop of map.props) {
      drawMapProp(ctx, prop, timeSec);
    }
  }

  // 6. City-Center Escape Beacon & Crystal Fountain Objective
  drawEscapeBeacon(ctx, map, state, timeSec);

  // 7. Data-Driven Hiding Places (18–20 PixelSpaces & Fantasy Objects)
  const localPlayer = state.players[localPlayerId];
  for (const spot of map.hidingSpots) {
    const occupantId = state.hidingOccupancy[spot.id];
    const isLocalInside = occupantId === localPlayerId;
    const isOccupiedByTeammate =
      occupantId !== null &&
      localPlayer?.role === 'hider' &&
      occupantId !== localPlayerId;

    drawHidingSpotSprite(
      ctx,
      spot,
      isLocalInside,
      isOccupiedByTeammate,
      localPlayer,
      timeSec
    );
  }

  // 8. Streetlamps & Warm Ambient Light Halos (Furniture/Light_1 & Lamp_stand_1)
  for (const light of map.streetlights) {
    const lx = Math.round(light.x);
    const ly = Math.round(light.y);
    // Lamp post
    ctx.fillStyle = '#090D16';
    ctx.fillRect(lx - 3, ly - 14, 6, 16);
    ctx.fillStyle = '#FDE047';
    ctx.fillRect(lx - 4, ly - 16, 8, 5);
    // Warm pixel light halo
    ctx.fillStyle = 'rgba(253, 224, 71, 0.07)';
    ctx.fillRect(lx - 18, ly - 18, 36, 36);
  }

  // 9. Outer Map Perimeter Boundary Walls
  ctx.fillStyle = '#090D16';
  ctx.fillRect(0, 0, map.width, 32);
  ctx.fillRect(0, map.height - 32, map.width, 32);
  ctx.fillRect(0, 0, 32, map.height);
  ctx.fillRect(map.width - 32, 0, 32, map.height);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 4;
  ctx.strokeRect(32, 32, map.width - 64, map.height - 64);
}

function drawWallBlock(
  ctx: CanvasRenderingContext2D,
  w: WallRect,
  map: MapConfig,
  timeSec: number
) {
  const x = Math.round(w.x);
  const y = Math.round(w.y);

  if (w.kind === 'water_canal') {
    ctx.fillStyle = '#083344';
    ctx.fillRect(x, y, w.width, w.height);
    // Animated water ripples (cave_ [bridgeAnimatedTiles] / puddle_)
    const waveShift = Math.round(Math.sin(timeSec * 3) * 6);
    ctx.fillStyle = '#0284C7';
    for (let wy = y + 14; wy < y + w.height - 12; wy += 22) {
      ctx.fillRect(x + 14 + waveShift, wy, w.width - 32, 4);
    }
    ctx.fillStyle = '#38BDF8';
    for (let wy = y + 24; wy < y + w.height - 16; wy += 22) {
      ctx.fillRect(x + 24 - waveShift, wy, w.width - 52, 2);
    }
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, w.width, w.height);
    if (w.label) {
      ctx.fillStyle = '#BAE6FD';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(w.label, x + w.width / 2, y + w.height / 2 + 4);
    }
    return;
  }

  if (w.kind === 'fence' || w.kind === 'brick_wall') {
    // Fantasy v2.0 Wooden & Stone Fence Posts
    ctx.fillStyle = '#090D16';
    ctx.fillRect(x - 2, y - 2, w.width + 4, w.height + 4);
    ctx.fillStyle = '#78350F';
    ctx.fillRect(x, y + 6, w.width, 8);
    ctx.fillRect(x, y + 18, w.width, 6);
    for (let fx = x + 4; fx < x + w.width - 6; fx += 18) {
      ctx.fillStyle = '#92400E';
      ctx.fillRect(fx, y, 8, w.height);
      ctx.fillStyle = '#B45309';
      ctx.fillRect(fx + 1, y + 1, 6, 6);
    }
    return;
  }

  // Cutaway Pixel_16_interiors_v2_free + PixelSpaces Building!
  const facadeHeight = 24;
  // Drop shadow
  ctx.fillStyle = 'rgba(5, 8, 15, 0.65)';
  ctx.fillRect(x + 6, y + 6, w.width, w.height);

  // Outer dark pixel outline
  ctx.fillStyle = '#090D16';
  ctx.fillRect(x - 2, y - 2, w.width + 4, w.height + 4);

  // Check if this building has an interior floor style in map.roads
  const matchingFloor = map.roads.find(
    (r) =>
      Math.abs(r.x - w.x) < 10 &&
      Math.abs(r.y - w.y) < 10 &&
      (r.kind === 'wood_floor' ||
        r.kind === 'kitchen_tile' ||
        r.kind === 'carpet_blue' ||
        r.kind === 'carpet_red')
  );

  // Cutaway Interior Room Floor
  const innerX = x + 8;
  const innerY = y + 20;
  const innerW = w.width - 16;
  const innerH = w.height - facadeHeight - 24;

  // Roof header trim (top cutaway wall)
  ctx.fillStyle = w.roofColor || '#1E293B';
  ctx.fillRect(x, y, w.width, w.height - facadeHeight);

  if (innerW > 24 && innerH > 24) {
    if (matchingFloor?.kind === 'kitchen_tile') {
      // Checkerboard kitchen floor from Pixel_16_interiors_v2_free
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(innerX, innerY, innerW, innerH);
      ctx.fillStyle = '#64748B';
      for (let tx = innerX; tx < innerX + innerW; tx += 16) {
        for (let ty = innerY; ty < innerY + innerH; ty += 16) {
          if (((tx - innerX) / 16 + (ty - innerY) / 16) % 2 === 0) {
            ctx.fillRect(tx, ty, Math.min(16, innerX + innerW - tx), Math.min(16, innerY + innerH - ty));
          }
        }
      }
    } else if (matchingFloor?.kind === 'carpet_blue') {
      ctx.fillStyle = '#1E3A8A';
      ctx.fillRect(innerX, innerY, innerW, innerH);
      ctx.fillStyle = '#2563EB';
      ctx.fillRect(innerX + 6, innerY + 6, innerW - 12, innerH - 12);
    } else if (matchingFloor?.kind === 'carpet_red') {
      ctx.fillStyle = '#7F1D1D';
      ctx.fillRect(innerX, innerY, innerW, innerH);
      ctx.fillStyle = '#B91C1C';
      ctx.fillRect(innerX + 6, innerY + 6, innerW - 12, innerH - 12);
    } else {
      // Warm Oak Wood Planks (PixelSpaces Bedroom/Living Room)
      ctx.fillStyle = '#78350F';
      ctx.fillRect(innerX, innerY, innerW, innerH);
      ctx.fillStyle = '#92400E';
      for (let py = innerY + 4; py < innerY + innerH - 4; py += 10) {
        ctx.fillRect(innerX + 2, py, innerW - 4, 6);
      }
    }
    // Interior wall Wainscoting border
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.strokeRect(innerX, innerY, innerW, innerH);
  }

  // South Wall Facade (with Windows & PixelSpaces Door_opened)
  ctx.fillStyle = w.wallColor || '#334155';
  ctx.fillRect(x, y + w.height - facadeHeight, w.width, facadeHeight);

  // Pixel Windows (`Window_square.png`) & Center Doorway (`Door_closed.png`)
  const doorX = Math.round(x + w.width / 2 - 9);
  const doorY = y + w.height - facadeHeight + 4;
  ctx.fillStyle = '#451A03';
  ctx.fillRect(doorX, doorY, 18, facadeHeight - 4);
  ctx.fillStyle = '#78350F';
  ctx.fillRect(doorX + 2, doorY + 2, 14, facadeHeight - 6);
  ctx.fillStyle = '#FBBF24';
  ctx.fillRect(doorX + 12, doorY + 10, 3, 3); // brass doorknob

  // Lit pixel windows on left and right of door
  for (let wx = x + 12; wx < x + w.width - 22; wx += 28) {
    if (Math.abs(wx - doorX) < 18) continue;
    ctx.fillStyle = '#090D16';
    ctx.fillRect(wx - 1, y + w.height - facadeHeight + 5, 14, 12);
    ctx.fillStyle = '#FEF08A';
    ctx.fillRect(wx, y + w.height - facadeHeight + 6, 12, 10);
    // Window crossbars
    ctx.fillStyle = '#92400E';
    ctx.fillRect(wx + 5, y + w.height - facadeHeight + 6, 2, 10);
    ctx.fillRect(wx, y + w.height - facadeHeight + 10, 12, 2);
  }

  // Building Top Banner Label
  if (w.label) {
    ctx.fillStyle = '#090D16';
    ctx.fillRect(x + 8, y + 3, w.width - 16, 14);
    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(w.label, x + w.width / 2, y + 13);
  }
}

function drawMapProp(ctx: CanvasRenderingContext2D, prop: MapProp, timeSec: number) {
  const x = Math.round(prop.x);
  const y = Math.round(prop.y);

  switch (prop.type) {
    case 'couch_blue':
    case 'couch_red': {
      const mainCol = prop.type === 'couch_blue' ? '#2563EB' : '#DC2626';
      const darkCol = prop.type === 'couch_blue' ? '#1E40AF' : '#991B1B';
      ctx.fillStyle = '#090D16';
      ctx.fillRect(x - 1, y - 1, 42, 22);
      ctx.fillStyle = darkCol;
      ctx.fillRect(x, y, 40, 20);
      ctx.fillStyle = mainCol;
      ctx.fillRect(x + 4, y + 6, 15, 12);
      ctx.fillRect(x + 21, y + 6, 15, 12);
      break;
    }
    case 'coffee_table': {
      ctx.fillStyle = '#451A03';
      ctx.fillRect(x, y, 28, 16);
      ctx.fillStyle = '#B45309';
      ctx.fillRect(x + 2, y + 2, 24, 12);
      // Little book & mug on coffee table (`Books_outside_1.png`, `Glass_water.png`)
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(x + 6, y + 5, 5, 5);
      ctx.fillStyle = '#F43F5E';
      ctx.fillRect(x + 15, y + 4, 7, 6);
      break;
    }
    case 'bookshelf': {
      ctx.fillStyle = '#451A03';
      ctx.fillRect(x, y, 36, 18);
      // Colorful pixel book spines (`Books_inside_1.png`)
      const bookCols = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#A855F7'];
      for (let bx = 0; bx < 5; bx++) {
        ctx.fillStyle = bookCols[bx % bookCols.length];
        ctx.fillRect(x + 4 + bx * 6, y + 3, 4, 5);
        ctx.fillStyle = bookCols[(bx + 2) % bookCols.length];
        ctx.fillRect(x + 4 + bx * 6, y + 10, 4, 5);
      }
      break;
    }
    case 'bed_red':
    case 'bed_yellow': {
      const sheetCol = prop.type === 'bed_red' ? '#EF4444' : '#FACC15';
      ctx.fillStyle = '#451A03';
      ctx.fillRect(x, y, 32, 42);
      // Pillow
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(x + 4, y + 4, 24, 10);
      // Blanket (`Bed_red.png` / `Bed_yellow.png`)
      ctx.fillStyle = sheetCol;
      ctx.fillRect(x + 3, y + 15, 26, 24);
      break;
    }
    case 'bunkbed_green': {
      ctx.fillStyle = '#064E3B';
      ctx.fillRect(x, y, 34, 44);
      ctx.fillStyle = '#10B981';
      ctx.fillRect(x + 3, y + 12, 28, 28);
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(x + 5, y + 4, 24, 7);
      break;
    }
    case 'kitchen_counter':
    case 'kitchen_sink': {
      ctx.fillStyle = '#334155';
      ctx.fillRect(x, y, 42, 18);
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(x + 2, y + 2, 38, 14);
      if (prop.type === 'kitchen_sink') {
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(x + 12, y + 4, 18, 10);
      } else {
        // Blender / Cooking Pan (`Blender_orange.png`)
        ctx.fillStyle = '#F97316';
        ctx.fillRect(x + 8, y + 4, 7, 9);
      }
      break;
    }
    case 'fridge_white': {
      ctx.fillStyle = '#64748B';
      ctx.fillRect(x, y, 22, 26);
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(x + 2, y + 2, 18, 22);
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(x + 2, y + 11, 18, 2);
      break;
    }
    case 'bathtub': {
      ctx.fillStyle = '#475569';
      ctx.fillRect(x, y, 40, 22);
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(x + 2, y + 2, 36, 18);
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(x + 5, y + 5, 30, 12);
      break;
    }
    case 'toilet': {
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(x, y, 16, 20);
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(x + 4, y + 8, 8, 8);
      break;
    }
    case 'laptop_desk': {
      ctx.fillStyle = '#78350F';
      ctx.fillRect(x, y, 30, 18);
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(x + 9, y + 4, 12, 9);
      break;
    }
    case 'stairs': {
      ctx.fillStyle = '#451A03';
      ctx.fillRect(x, y, 32, 38);
      ctx.fillStyle = '#92400E';
      for (let sy = y + 4; sy < y + 36; sy += 7) {
        ctx.fillRect(x + 3, sy, 26, 4);
      }
      break;
    }
    case 'skateboard': {
      ctx.fillStyle = '#10B981';
      ctx.fillRect(x, y, 22, 8);
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(x + 3, y - 2, 4, 2);
      ctx.fillRect(x + 15, y - 2, 4, 2);
      break;
    }
    case 'trophy': {
      ctx.fillStyle = '#B45309';
      ctx.fillRect(x, y + 10, 14, 6);
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(x + 2, y, 10, 10);
      break;
    }
    case 'flowerpot': {
      ctx.fillStyle = '#B45309';
      ctx.fillRect(x + 2, y + 8, 12, 10);
      ctx.fillStyle = '#10B981';
      ctx.fillRect(x, y, 16, 9);
      ctx.fillStyle = '#F43F5E';
      ctx.fillRect(x + 5, y + 2, 5, 4);
      break;
    }
    case 'tree_green':
    case 'tree_autumn': {
      // PixelSpaces Tree_medium.png & autumn_fantasy_tileset.png
      const leafOuter = prop.type === 'tree_autumn' ? '#9A3412' : '#065F46';
      const leafMid = prop.type === 'tree_autumn' ? '#EA580C' : '#059669';
      const leafHigh = prop.type === 'tree_autumn' ? '#FBBF24' : '#34D399';
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(x + 4, y + 28, 28, 10);
      // Trunk
      ctx.fillStyle = '#451A03';
      ctx.fillRect(x + 12, y + 20, 12, 16);
      // Layered pixel foliage crown
      ctx.fillStyle = '#090D16';
      ctx.fillRect(x - 2, y - 2, 40, 28);
      ctx.fillStyle = leafOuter;
      ctx.fillRect(x, y, 36, 24);
      ctx.fillStyle = leafMid;
      ctx.fillRect(x + 4, y + 3, 28, 18);
      ctx.fillStyle = leafHigh;
      ctx.fillRect(x + 8, y + 5, 14, 8);
      break;
    }
    case 'shiny_coin': {
      // Animated spinning coin (`brackeys_platformer_assets/sprites/coin.png` 12 frames of 16x16)
      const bob = Math.round(Math.sin(timeSec * 5 + x) * 2);
      const coinImg = getSpriteImage('coin');
      if (coinImg) {
        const frame = Math.floor(timeSec * 10 + x * 0.1) % 12;
        ctx.drawImage(coinImg, frame * 16, 0, 16, 16, x - 4, y - 4 + bob, 22, 22);
      } else {
        const widthPhase = Math.max(4, Math.round(Math.abs(Math.cos(timeSec * 4 + x)) * 12));
        const cx = x + 6;
        const cy = y + 6 + bob;
        ctx.fillStyle = '#090D16';
        ctx.fillRect(cx - widthPhase / 2 - 1, cy - 7, widthPhase + 2, 14);
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(cx - widthPhase / 2, cy - 6, widthPhase, 12);
        ctx.fillStyle = '#FEF08A';
        ctx.fillRect(cx - Math.max(1, widthPhase / 4), cy - 4, 2, 8);
      }
      break;
    }
    case 'exotic_fruit': {
      // Mystic Exotic Fruit (`brackeys_platformer_assets/sprites/fruit.png` 16x16 grid)
      const bob = Math.round(Math.cos(timeSec * 4 + y) * 2);
      const fruitImg = getSpriteImage('fruit');
      if (fruitImg) {
        const col = Math.abs(Math.round(x + y)) % 4;
        ctx.drawImage(fruitImg, col * 16, 0, 16, 16, x - 4, y - 4 + bob, 24, 24);
      } else {
        ctx.fillStyle = '#090D16';
        ctx.fillRect(x - 1, y - 1 + bob, 16, 16);
        ctx.fillStyle = '#EC4899';
        ctx.fillRect(x, y + 2 + bob, 14, 12);
        ctx.fillStyle = '#F472B6';
        ctx.fillRect(x + 3, y + 4 + bob, 6, 6);
        ctx.fillStyle = '#10B981';
        ctx.fillRect(x + 5, y - 2 + bob, 5, 4);
      }
      break;
    }
    case 'treasure_chest': {
      const chestImg = getSpriteImage('chest_01');
      if (chestImg) {
        ctx.drawImage(chestImg, 0, 0, 16, 16, x, y, 28, 28);
      } else {
        ctx.fillStyle = '#78350F';
        ctx.fillRect(x, y, 26, 20);
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(x + 2, y + 8, 22, 4);
      }
      break;
    }
    case 'stone_shrine': {
      ctx.fillStyle = '#090D16';
      ctx.fillRect(x - 2, y - 2, 32, 38);
      ctx.fillStyle = '#475569';
      ctx.fillRect(x, y, 28, 34);
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(x + 4, y + 4, 20, 24);
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(x + 10, y + 10, 8, 10);
      break;
    }
    case 'water_rock': {
      const rockImg = getSpriteImage('water_rock');
      if (rockImg) {
        ctx.drawImage(rockImg, 0, 0, 16, 16, x, y, 28, 28);
      } else {
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(x - 2, y + 10, 28, 10);
        ctx.fillStyle = '#64748B';
        ctx.fillRect(x + 2, y, 20, 18);
      }
      break;
    }
    default:
      break;
  }
}

function drawEscapeBeacon(
  ctx: CanvasRenderingContext2D,
  map: MapConfig,
  state: MatchState,
  timeSec: number
) {
  const { x, y, interactionRange } = map.objective;
  const isBeingHeld = state.objectiveActiveHiderIds.length > 0;
  const pulse = 0.5 + 0.5 * Math.sin(timeSec * (isBeingHeld ? 8 : 3));

  // Interaction perimeter ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, interactionRange, 0, Math.PI * 2);
  ctx.fillStyle = isBeingHeld
    ? `rgba(16, 185, 129, ${0.14 + pulse * 0.1})`
    : 'rgba(245, 158, 11, 0.08)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = isBeingHeld ? '#10B981' : 'rgba(245, 158, 11, 0.45)';
  ctx.setLineDash([6, 6]);
  ctx.stroke();
  ctx.restore();

  // Ornate Pixel Fountain & Signal Spire Base (`cave_ [fountain].png` + Signal Tower)
  const bx = Math.round(x - 32);
  const by = Math.round(y - 32);
  ctx.fillStyle = '#090D16';
  ctx.fillRect(bx - 2, by - 2, 68, 68);
  ctx.fillStyle = '#334155';
  ctx.fillRect(bx, by, 64, 64);
  // Crystal water basin inside fountain
  ctx.fillStyle = '#0284C7';
  ctx.fillRect(bx + 6, by + 6, 52, 42);
  ctx.fillStyle = '#38BDF8';
  const ripple = Math.round(Math.sin(timeSec * 6) * 3);
  ctx.fillRect(bx + 12 + ripple, by + 14, 14, 4);
  ctx.fillRect(bx + 34 - ripple, by + 28, 14, 4);

  // 3 Stage Indicator Pips on Beacon Base
  for (let s = 0; s < 3; s++) {
    const completed = state.objectiveCompletedStages > s;
    const activeStage = state.objectiveCompletedStages === s && isBeingHeld;
    ctx.fillStyle = completed ? '#10B981' : activeStage ? '#F59E0B' : '#0F172A';
    ctx.fillRect(bx + 8 + s * 17, by + 52, 14, 8);
  }

  // Central Spire Mast
  ctx.fillStyle = '#64748B';
  ctx.fillRect(Math.round(x - 8), Math.round(y - 24), 16, 34);
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(Math.round(x - 4), Math.round(y - 38), 8, 26);

  // Glowing Crystal Orb at top of Spire
  ctx.fillStyle =
    state.objectiveCompletedStages >= 3
      ? '#10B981'
      : isBeingHeld
      ? '#34D399'
      : '#F59E0B';
  ctx.fillRect(Math.round(x - 7), Math.round(y - 44), 14, 14);
  ctx.fillStyle = '#FEF08A';
  ctx.fillRect(Math.round(x - 3), Math.round(y - 41), 5, 5);

  // Progress Arc when actively held
  if (state.objectiveCurrentStageProgress > 0) {
    const ratio =
      state.objectiveCurrentStageProgress / state.config.objectiveStageDurationSeconds;
    ctx.beginPath();
    ctx.arc(x, y, 46, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 5;
    ctx.stroke();
  }
}

function drawHidingSpotSprite(
  ctx: CanvasRenderingContext2D,
  spot: HidingSpotConfig,
  isLocalInside: boolean,
  isOccupiedByTeammate: boolean,
  localPlayer: PlayerState | undefined,
  timeSec: number
) {
  const x = Math.round(spot.x);
  const y = Math.round(spot.y);
  const w = Math.round(spot.width);
  const h = Math.round(spot.height);
  const cx = x + w / 2;
  const cy = y + h / 2;

  const inRange =
    localPlayer &&
    localPlayer.alive &&
    Math.hypot(localPlayer.x - cx, localPlayer.y - cy) <= spot.interactionRange;

  if (inRange || isLocalInside) {
    ctx.fillStyle = isLocalInside
      ? 'rgba(16, 185, 129, 0.35)'
      : localPlayer?.role === 'seeker'
      ? 'rgba(245, 158, 11, 0.28)'
      : 'rgba(56, 189, 248, 0.28)';
    ctx.fillRect(x - 5, y - 5, w + 10, h + 10);
  }

  // Dark pixel silhouette border
  ctx.fillStyle = '#090D16';
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);

  switch (spot.type) {
    case 'cabinet_wardrobe': {
      // Furniture/Bedroom/Cabinet_1.png
      ctx.fillStyle = '#78350F';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#92400E';
      ctx.fillRect(x + 3, y + 3, w / 2 - 4, h - 6);
      ctx.fillRect(x + w / 2 + 1, y + 3, w / 2 - 4, h - 6);
      // Brass handles
      ctx.fillStyle = '#FBBF24';
      ctx.fillRect(x + w / 2 - 4, y + h / 2 - 2, 2, 5);
      ctx.fillRect(x + w / 2 + 2, y + h / 2 - 2, 2, 5);
      break;
    }
    case 'elevator_shaft': {
      // Furniture/Elevator_closed.png
      ctx.fillStyle = '#475569';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(x + 3, y + 6, w / 2 - 4, h - 8);
      ctx.fillRect(x + w / 2 + 1, y + 6, w / 2 - 4, h - 8);
      // Floor indicator LED above elevator
      ctx.fillStyle = '#090D16';
      ctx.fillRect(x + 8, y + 1, w - 16, 4);
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(x + w / 2 - 2, y + 2, 4, 2);
      break;
    }
    case 'curtain_alcove': {
      // Furniture/Living Room/Curtain_medium_red_closed.png
      ctx.fillStyle = '#7F1D1D';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#FBBF24';
      ctx.fillRect(x, y, w, 4); // Curtain rail
      ctx.fillStyle = '#DC2626';
      for (let cxp = x + 3; cxp < x + w - 4; cxp += 7) {
        ctx.fillRect(cxp, y + 4, 4, h - 6);
      }
      break;
    }
    case 'refrigerator_box': {
      // Furniture/Kitchen/Refrigerator_large_white.png
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(x + 2, y + 2, w - 4, h / 3 - 2);
      ctx.fillRect(x + 2, y + h / 3 + 2, w - 4, (h * 2) / 3 - 4);
      // Sticky notes (`Refrigerator_sticky_notes_1.png`)
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(x + 6, y + 6, 5, 5);
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(x + 14, y + 16, 5, 5);
      break;
    }
    case 'couch_fort': {
      // Furniture/Living Room/Couch_large_2_blue.png
      ctx.fillStyle = '#1E3A8A';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#3B82F6';
      ctx.fillRect(x + 3, y + 8, w / 2 - 4, h - 11);
      ctx.fillRect(x + w / 2 + 1, y + 8, w / 2 - 4, h - 11);
      ctx.fillStyle = '#60A5FA';
      ctx.fillRect(x + 4, y + 3, w - 8, 5);
      break;
    }
    case 'moving_package': {
      // Objects/Bedroom/Moving_package_large.png
      ctx.fillStyle = '#B45309';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#D97706';
      ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
      // Packing tape strip & fragile label
      ctx.fillStyle = '#FDE68A';
      ctx.fillRect(x + 2, y + h / 2 - 2, w - 4, 4);
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(x + w - 12, y + 6, 6, 5);
      break;
    }
    case 'fountain_basin': {
      // fantasy_ [version 2.0] / cave_ [fountain].png
      ctx.fillStyle = '#475569';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#0284C7';
      ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
      ctx.fillStyle = '#7DD3FC';
      ctx.fillRect(x + w / 2 - 4, y + h / 2 - 4, 8, 8);
      break;
    }
    case 'trash_bin': {
      ctx.fillStyle = '#1D4ED8';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#3B82F6';
      ctx.fillRect(x + 2, y + 2, w - 4, 8);
      ctx.fillStyle = '#1E3A8A';
      ctx.fillRect(x + 4, y + 14, w - 8, 4);
      break;
    }
    case 'large_crate': {
      ctx.fillStyle = '#92400E';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#B45309';
      ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
      ctx.fillStyle = '#78350F';
      ctx.fillRect(x + 3, y + h / 2 - 2, w - 6, 4);
      break;
    }
    case 'storage_container': {
      ctx.fillStyle = '#991B1B';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#DC2626';
      for (let rx = x + 4; rx < x + w - 4; rx += 8) {
        ctx.fillRect(rx, y + 2, 4, h - 4);
      }
      break;
    }
    case 'bush': {
      ctx.fillStyle = '#065F46';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#10B981';
      ctx.fillRect(x + 4, y + 3, w - 8, h - 8);
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(x + 8, y + 6, 5, 5);
      ctx.fillRect(x + w - 12, y + 14, 5, 5);
      break;
    }
    case 'drainage_entrance': {
      ctx.fillStyle = '#334155';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#0F172A';
      for (let gx = x + 5; gx < x + w - 4; gx += 6) {
        ctx.fillRect(gx, y + 5, 3, h - 10);
      }
      break;
    }
    case 'water_tunnel': {
      ctx.fillStyle = '#475569';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#0284C7';
      ctx.fillRect(x + 5, y + 8, w - 10, h - 10);
      break;
    }
    case 'treasure_chest_spot': {
      // Mystic Woods `chest_01.png` (4 frames of 16x16)
      const chestImg = getSpriteImage('chest_01');
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(x, y, w, h);
      if (chestImg) {
        const frame = isLocalInside || isOccupiedByTeammate ? 1 : 0;
        ctx.drawImage(chestImg, frame * 16, 0, 16, 16, x + 2, y + 2, w - 4, h - 4);
      } else {
        ctx.fillStyle = '#78350F';
        ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(x + 2, y + Math.round(h / 2) - 2, w - 4, 4);
      }
      break;
    }
    case 'ancient_shrine': {
      // Pixel Art Top Down Basic `TX Struct.png` Runic Monolith
      ctx.fillStyle = '#334155';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#64748B';
      ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(x + Math.round(w / 2) - 4, y + 7, 8, h - 14);
      ctx.fillStyle = '#BAE6FD';
      ctx.fillRect(x + Math.round(w / 2) - 2, y + 10, 4, 8);
      break;
    }
    case 'kiosk':
    default: {
      ctx.fillStyle = '#6D28D9';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#FDE047';
      ctx.fillRect(x + 4, y + 4, w - 8, 8);
      ctx.fillStyle = '#DDD6FE';
      ctx.fillRect(x + 6, y + 14, w - 12, 10);
      break;
    }
  }

  // If local player or fellow hider is hidden inside, show pixel eye peephole indicator (NEVER shown to seekers!)
  if (isLocalInside || isOccupiedByTeammate) {
    const blink = Math.sin(timeSec * 5) > -0.8;
    if (blink) {
      ctx.fillStyle = isLocalInside ? '#FEF08A' : '#38BDF8';
      ctx.fillRect(Math.round(cx - 5), Math.round(cy - 2), 3, 3);
      ctx.fillRect(Math.round(cx + 2), Math.round(cy - 2), 3, 3);
    }
  }
}

/**
 * Detailed Pixel-Art Character Sprite Renderer supporting the 7 Asset Pack Archetypes
 */
export function drawPlayerSprite(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
  isLocal: boolean,
  viewerRole: 'hider' | 'seeker',
  distWalked: number
) {
  if (player.hiddenInSpotId !== null) {
    if (isLocal || viewerRole === 'hider') {
      const remSec = Math.ceil(player.hideTimerRemaining ?? 15);
      const ratio = Math.max(0, Math.min(1, (player.hideTimerRemaining ?? 15) / 15));
      const px = Math.round(player.x);
      const py = Math.round(player.y);

      ctx.save();
      // Countdown bar background
      ctx.fillStyle = '#090D16';
      ctx.fillRect(px - 22, py - 34, 44, 6);
      ctx.fillStyle = remSec <= 4 ? '#EF4444' : isLocal ? '#10B981' : '#38BDF8';
      ctx.fillRect(px - 21, py - 33, Math.round(42 * ratio), 4);

      ctx.fillStyle = remSec <= 4 ? '#FCA5A5' : isLocal ? '#10B981' : '#38BDF8';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        isLocal ? `[HIDDEN · ${remSec}s]` : `[${player.name} · ${remSec}s]`,
        px,
        py - 38
      );
      ctx.restore();
    }
    return;
  }

  const x = Math.round(player.x);
  const y = Math.round(player.y);

  if (!player.alive) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#64748B';
    ctx.fillRect(x - 10, y - 10, 20, 20);
    ctx.fillStyle = '#EF4444';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`KO: ${player.name}`, x, y - 14);
    ctx.restore();
    return;
  }

  const isMoving = Math.hypot(player.vx, player.vy) > 5;
  const bobY = isMoving ? Math.round(Math.sin(distWalked * 0.2) * 2) : 0;
  const legOffset = isMoving ? Math.round(Math.sin(distWalked * 0.28) * 3) : 0;

  const skin: CharacterSkinId =
    player.role === 'seeker'
      ? player.skinId === 'void_slime' || player.skinId === 'skeleton_stalker'
        ? player.skinId
        : 'dark_knight'
      : player.skinId ||
        (['male_scout', 'female_runner', 'mystic_ranger', 'toxic_slime', 'void_slime'][
          player.colorIndex % 5
        ] as CharacterSkinId);

  // Ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(x - 12, y + 10, 24, 6);

  // Local player selection ring
  if (isLocal) {
    ctx.strokeStyle = player.role === 'seeker' ? '#EF4444' : '#10B981';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 17, y - 20 + bobY, 34, 36);
  }

  const eyeShift =
    player.facing === 'left' ? -3 : player.facing === 'right' ? 3 : 0;

  if (skin === 'dark_knight') {
    const knightImg = getSpriteImage('knight');
    if (knightImg) {
      const frame = isMoving ? Math.floor(distWalked * 0.12) % 8 : Math.floor(distWalked * 0.04) % 4;
      const row = isMoving ? 2 : 0;
      ctx.save();
      if (player.facing === 'left') {
        ctx.translate(x, y);
        ctx.scale(-1, 1);
        ctx.drawImage(knightImg, frame * 32, row * 32, 32, 32, -24, -26 + bobY, 48, 48);
      } else {
        ctx.drawImage(knightImg, frame * 32, row * 32, 32, 32, x - 24, y - 26 + bobY, 48, 48);
      }
      ctx.restore();
    } else {
      const sx = x - 14;
      const sy = y - 16 + bobY;
      ctx.fillStyle = '#991B1B';
      ctx.fillRect(sx - 2, sy + 8, 28, 16);
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(x - 4, sy - 6, 8, 6);
      ctx.fillStyle = '#090D16';
      ctx.fillRect(sx, sy, 28, 26);
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(sx - 3, sy + 1, 4, 5);
      ctx.fillRect(sx + 27, sy + 1, 4, 5);
      ctx.fillStyle = '#334155';
      ctx.fillRect(sx + 2, sy + 2, 24, 11);
      ctx.fillStyle = '#475569';
      ctx.fillRect(sx + 3, sy + 13, 22, 11);
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(x - 6 + eyeShift, sy + 6, 12, 3);
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(sx + 26, sy + 2 + legOffset, 4, 18);
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(sx + 24, sy + 14 + legOffset, 8, 3);
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(sx + 5, y + 9 + legOffset, 7, 5);
      ctx.fillRect(sx + 16, y + 9 - legOffset, 7, 5);
    }
  } else if (skin === 'skeleton_stalker') {
    const skelImg = getSpriteImage('mystic_skeleton');
    if (skelImg) {
      const frame = Math.floor(distWalked * 0.12) % 6;
      const dirRow = player.facing === 'up' ? 2 : player.facing === 'down' ? 0 : 1;
      const row = (isMoving ? 3 : 0) + dirRow;
      ctx.save();
      if (player.facing === 'left') {
        ctx.translate(x, y);
        ctx.scale(-1, 1);
        ctx.drawImage(skelImg, frame * 48, row * 48, 48, 48, -28, -32 + bobY, 56, 56);
      } else {
        ctx.drawImage(skelImg, frame * 48, row * 48, 48, 48, x - 28, y - 32 + bobY, 56, 56);
      }
      ctx.restore();
    } else {
      const sx = x - 13;
      const sy = y - 16 + bobY;
      ctx.fillStyle = '#090D16';
      ctx.fillRect(sx, sy, 26, 26);
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(sx + 3, sy + 2, 20, 11);
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(sx + 4, sy + 13, 18, 11);
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(x - 5 + eyeShift, sy + 6, 3, 3);
      ctx.fillRect(x + 2 + eyeShift, sy + 6, 3, 3);
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(sx + 25, sy + 2 + legOffset, 4, 18);
    }
  } else if (skin === 'mystic_ranger') {
    const rangerImg = getSpriteImage('mystic_player');
    if (rangerImg) {
      const frame = Math.floor(distWalked * 0.12) % 6;
      const dirRow = player.facing === 'up' ? 2 : player.facing === 'down' ? 0 : 1;
      const row = (isMoving ? 3 : 0) + dirRow;
      ctx.save();
      if (player.facing === 'left') {
        ctx.translate(x, y);
        ctx.scale(-1, 1);
        ctx.drawImage(rangerImg, frame * 48, row * 48, 48, 48, -28, -32 + bobY, 56, 56);
      } else {
        ctx.drawImage(rangerImg, frame * 48, row * 48, 48, 48, x - 28, y - 32 + bobY, 56, 56);
      }
      ctx.restore();
    } else {
      const sx = x - 12;
      const sy = y - 16 + bobY;
      ctx.fillStyle = '#090D16';
      ctx.fillRect(sx, sy, 24, 26);
      ctx.fillStyle = '#B45309';
      ctx.fillRect(sx + 2, sy + 2, 20, 6);
      ctx.fillStyle = '#FDE68A';
      ctx.fillRect(sx + 3, sy + 7, 18, 6);
      ctx.fillStyle = '#15803D';
      ctx.fillRect(sx + 2, sy + 13, 20, 11);
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(sx + 9, sy + 13, 6, 11);
    }
  } else if (skin === 'toxic_slime' || skin === 'void_slime') {
    const isVoid = skin === 'void_slime';
    const slimeImg = getSpriteImage(isVoid ? 'slime_purple' : 'slime_green');
    if (slimeImg) {
      const frame = Math.floor(distWalked * 0.12) % 4;
      ctx.drawImage(slimeImg, frame * 24, 24, 24, 24, x - 18, y - 20 + bobY, 36, 36);
    } else {
      const bounce = Math.round(Math.sin(distWalked * 0.25 + x * 0.1) * 2);
      const sx = x - 14 - bounce;
      const sy = y - 12 + bounce + bobY;
      const w = 28 + bounce * 2;
      const h = 24 - bounce;

      ctx.fillStyle = '#090D16';
      ctx.fillRect(sx - 2, sy - 2, w + 4, h + 4);
      ctx.fillStyle = isVoid ? '#581C87' : '#065F46';
      ctx.fillRect(sx, sy, w, h);
      ctx.fillStyle = isVoid ? '#9333EA' : '#10B981';
      ctx.fillRect(sx + 2, sy + 2, w - 4, h - 5);
      ctx.fillStyle = isVoid ? '#E9D5FF' : '#A7F3D0';
      ctx.fillRect(sx + 4, sy + 4, 5, 4);
      ctx.fillStyle = '#090D16';
      ctx.fillRect(x - 6 + eyeShift, sy + 9, 4, 5);
      ctx.fillRect(x + 2 + eyeShift, sy + 9, 4, 5);
      ctx.fillStyle = player.role === 'seeker' ? '#EF4444' : '#FEF08A';
      ctx.fillRect(x - 5 + eyeShift, sy + 10, 2, 2);
      ctx.fillRect(x + 3 + eyeShift, sy + 10, 2, 2);
    }
  } else if (skin === 'female_runner') {
    const ameliaImg = getSpriteImage(isMoving ? 'amelia_run' : 'amelia_idle');
    if (ameliaImg) {
      const dirBlock =
        player.facing === 'right'
          ? 0
          : player.facing === 'up'
          ? 6
          : player.facing === 'left'
          ? 12
          : 18;
      const frame = dirBlock + (Math.floor(distWalked * 0.12) % 6);
      ctx.drawImage(ameliaImg, frame * 16, 0, 16, 32, x - 13, y - 24 + bobY, 26, 40);
    } else {
      const sx = x - 12;
      const sy = y - 16 + bobY;
      ctx.fillStyle = '#10B981';
      ctx.fillRect(sx - 3, sy + 10, 4, 14);
      ctx.fillStyle = '#78350F';
      ctx.fillRect(sx + 19, sy + 2, 6, 9);
      ctx.fillStyle = '#F43F5E';
      ctx.fillRect(sx + 18, sy + 2, 4, 4);
      ctx.fillStyle = '#090D16';
      ctx.fillRect(sx, sy, 24, 26);
      ctx.fillStyle = '#92400E';
      ctx.fillRect(sx + 2, sy + 2, 20, 6);
      ctx.fillStyle = '#FDE68A';
      ctx.fillRect(sx + 3, sy + 6, 18, 7);
      ctx.fillStyle = '#090D16';
      ctx.fillRect(x - 5 + eyeShift, sy + 8, 3, 3);
      ctx.fillRect(x + 2 + eyeShift, sy + 8, 3, 3);
      ctx.fillStyle = '#E11D48';
      ctx.fillRect(sx + 2, sy + 13, 20, 11);
      ctx.fillStyle = '#FBBF24';
      ctx.fillRect(sx + 9, sy + 13, 6, 11);
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(sx + 4, y + 9 + legOffset, 6, 5);
      ctx.fillRect(sx + 14, y + 9 - legOffset, 6, 5);
    }
  } else {
    const adamImg = getSpriteImage(isMoving ? 'adam_run' : 'adam_idle');
    if (adamImg) {
      const dirBlock =
        player.facing === 'right'
          ? 0
          : player.facing === 'up'
          ? 6
          : player.facing === 'left'
          ? 12
          : 18;
      const frame = dirBlock + (Math.floor(distWalked * 0.12) % 6);
      ctx.drawImage(adamImg, frame * 16, 0, 16, 32, x - 13, y - 24 + bobY, 26, 40);
    } else {
      const sx = x - 12;
      const sy = y - 16 + bobY;
      ctx.fillStyle = '#1D4ED8';
      ctx.fillRect(sx - 4, sy + 11, 5, 12);
      ctx.fillStyle = '#090D16';
      ctx.fillRect(sx, sy, 24, 26);
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(sx + 2, sy + 2, 20, 5);
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(sx + 2, sy + 5, 20, 2);
      ctx.fillStyle = '#FDE68A';
      ctx.fillRect(sx + 3, sy + 7, 18, 6);
      ctx.fillStyle = '#090D16';
      ctx.fillRect(x - 5 + eyeShift, sy + 9, 3, 3);
      ctx.fillRect(x + 2 + eyeShift, sy + 9, 3, 3);
      ctx.fillStyle = '#0284C7';
      ctx.fillRect(sx + 2, sy + 13, 20, 11);
      ctx.fillStyle = '#E0F2FE';
      ctx.fillRect(sx + 9, sy + 13, 6, 11);
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(sx + 4, y + 9 + legOffset, 6, 5);
      ctx.fillRect(sx + 14, y + 9 - legOffset, 6, 5);
    }
  }

  // Player Nameplate
  ctx.font = 'bold 11px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#090D16';
  ctx.fillText(player.name, x + 1, y - 22 + bobY);
  ctx.fillStyle =
    player.role === 'seeker' ? '#FCA5A5' : isLocal ? '#6EE7B7' : '#E2E8F0';
  ctx.fillText(player.name, x, y - 23 + bobY);
}

/**
 * Transparent Corner Minimap Renderer:
 * Shows the current city layout (roads, canals, buildings, hiding spots, central beacon),
 * camera viewport box, and the player's live relative position and facing direction.
 */
export function drawCityMinimap(
  ctx: CanvasRenderingContext2D,
  minimapW: number,
  minimapH: number,
  map: MapConfig,
  state: MatchState,
  localPlayerId: string,
  timeSec: number,
  viewportWorldW: number,
  viewportWorldH: number
) {
  ctx.clearRect(0, 0, minimapW, minimapH);
  ctx.imageSmoothingEnabled = false;

  // Translucent dark radar backing
  ctx.fillStyle = 'rgba(9, 13, 22, 0.42)';
  ctx.fillRect(0, 0, minimapW, minimapH);

  const scaleX = minimapW / map.width;
  const scaleY = minimapH / map.height;

  // Subtle tactical grid lines
  ctx.fillStyle = 'rgba(148, 163, 184, 0.08)';
  for (let gx = 28; gx < minimapW; gx += 28) {
    ctx.fillRect(gx, 0, 1, minimapH);
  }
  for (let gy = 24; gy < minimapH; gy += 24) {
    ctx.fillRect(0, gy, minimapW, 1);
  }

  // 1. Roads, Plazas, Bridges & Railways
  for (const r of map.roads) {
    const rx = Math.round(r.x * scaleX);
    const ry = Math.round(r.y * scaleY);
    const rw = Math.max(1, Math.round(r.width * scaleX));
    const rh = Math.max(1, Math.round(r.height * scaleY));

    if (r.kind === 'asphalt' || r.kind === 'alley') {
      ctx.fillStyle = 'rgba(51, 65, 85, 0.55)';
    } else if (r.kind === 'plaza' || r.kind === 'dock_planks') {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.28)';
    } else if (r.kind === 'bridge_h' || r.kind === 'bridge_v' || r.kind === 'railway') {
      ctx.fillStyle = 'rgba(217, 119, 6, 0.48)';
    } else if (r.kind === 'grass_patch' || r.kind === 'autumn_grass') {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
    } else {
      ctx.fillStyle = 'rgba(71, 85, 105, 0.35)';
    }
    ctx.fillRect(rx, ry, rw, rh);
  }

  // 2. Seeker Precinct Spawn Zone outline
  const sz = map.seekerSpawnZone;
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
  ctx.lineWidth = 1;
  ctx.strokeRect(
    Math.round(sz.x * scaleX),
    Math.round(sz.y * scaleY),
    Math.round(sz.width * scaleX),
    Math.round(sz.height * scaleY)
  );

  // 3. City Buildings, Fences & Water Canals
  for (const w of map.walls) {
    const wx = Math.round(w.x * scaleX);
    const wy = Math.round(w.y * scaleY);
    const ww = Math.max(2, Math.round(w.width * scaleX));
    const wh = Math.max(2, Math.round(w.height * scaleY));

    if (w.kind === 'water_canal') {
      ctx.fillStyle = 'rgba(2, 132, 199, 0.65)';
      ctx.fillRect(wx, wy, ww, wh);
    } else if (w.kind === 'fence') {
      ctx.fillStyle = 'rgba(217, 119, 6, 0.65)';
      ctx.fillRect(wx, wy, ww, wh);
    } else {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
      ctx.fillRect(wx - 1, wy - 1, ww + 2, wh + 2);
      ctx.fillStyle = w.roofColor || '#334155';
      ctx.globalAlpha = 0.78;
      ctx.fillRect(wx, wy, ww, wh);
      ctx.globalAlpha = 1.0;
    }
  }

  const localPlayer = state.players[localPlayerId] || Object.values(state.players)[0];
  const viewerRole = localPlayer?.role || 'hider';

  // 4. Hiding Spots (Cyan pips, or Emerald if occupied by teammate when viewing as Hider)
  for (const spot of map.hidingSpots) {
    const sx = Math.round((spot.x + spot.width / 2) * scaleX);
    const sy = Math.round((spot.y + spot.height / 2) * scaleY);
    const occupantId = state.hidingOccupancy[spot.id];
    const isOccupiedByTeammate =
      viewerRole === 'hider' && occupantId !== null && occupantId !== localPlayerId;

    ctx.fillStyle = isOccupiedByTeammate
      ? '#34D399'
      : 'rgba(56, 189, 248, 0.78)';
    ctx.fillRect(sx - 1, sy - 1, 3, 3);
  }

  // 5. City-Center Escape Beacon Objective
  const ox = Math.round(map.objective.x * scaleX);
  const oy = Math.round(map.objective.y * scaleY);
  const beaconActive = state.objectiveActiveHiderIds.length > 0;
  const beaconPulse = 3 + Math.round(Math.abs(Math.sin(timeSec * (beaconActive ? 7 : 3))) * 3);

  ctx.strokeStyle = beaconActive ? '#10B981' : 'rgba(245, 158, 11, 0.8)';
  ctx.lineWidth = 1;
  ctx.strokeRect(ox - beaconPulse, oy - beaconPulse, beaconPulse * 2, beaconPulse * 2);
  ctx.fillStyle = '#090D16';
  ctx.fillRect(ox - 3, oy - 3, 6, 6);
  ctx.fillStyle = beaconActive ? '#10B981' : '#F59E0B';
  ctx.fillRect(ox - 2, oy - 2, 4, 4);

  // 6. Teammate Hiders (visible to Hiders) & Seeker during head start
  for (const p of Object.values(state.players)) {
    if (!p.alive || p.id === localPlayer?.id) continue;
    const px = Math.round(p.x * scaleX);
    const py = Math.round(p.y * scaleY);

    if (viewerRole === 'hider' && p.role === 'hider') {
      ctx.fillStyle = '#090D16';
      ctx.fillRect(px - 2, py - 2, 5, 5);
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(px - 1, py - 1, 3, 3);
    } else if (
      p.role === 'seeker' &&
      (state.lifecycle === 'HIDER_HEAD_START' ||
        (localPlayer && Math.hypot(localPlayer.x - p.x, localPlayer.y - p.y) <= 360))
    ) {
      // Show Seeker blip when locked in Precinct during countdown or nearby
      ctx.fillStyle = '#090D16';
      ctx.fillRect(px - 3, py - 3, 6, 6);
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(px - 2, py - 2, 4, 4);
    } else if (
      viewerRole === 'seeker' &&
      p.role === 'hider' &&
      p.hiddenInSpotId === null &&
      localPlayer &&
      Math.hypot(localPlayer.x - p.x, localPlayer.y - p.y) <= 340
    ) {
      ctx.fillStyle = '#090D16';
      ctx.fillRect(px - 2, py - 2, 5, 5);
      ctx.fillStyle = '#FBBF24';
      ctx.fillRect(px - 1, py - 1, 3, 3);
    }
  }

  // 7. Camera Viewport Box & Local Player Relative Position Marker
  if (localPlayer) {
    const lpx = Math.round(localPlayer.x * scaleX);
    const lpy = Math.round(localPlayer.y * scaleY);

    // Camera viewport frame
    const vw = Math.min(minimapW, Math.max(18, Math.round(viewportWorldW * scaleX)));
    const vh = Math.min(minimapH, Math.max(14, Math.round(viewportWorldH * scaleY)));
    const vx = Math.max(0, Math.min(minimapW - vw, Math.round(lpx - vw / 2)));
    const vy = Math.max(0, Math.min(minimapH - vh, Math.round(lpy - vh / 2)));
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.32)';
    ctx.lineWidth = 1;
    ctx.strokeRect(vx, vy, vw, vh);

    // Pulsing radar ring around local player
    const ringRadius = 4 + Math.round(((timeSec * 2.2) % 1) * 6);
    ctx.strokeStyle =
      localPlayer.role === 'seeker'
        ? 'rgba(239, 68, 68, 0.75)'
        : 'rgba(16, 185, 129, 0.8)';
    ctx.strokeRect(
      lpx - ringRadius,
      lpy - ringRadius,
      ringRadius * 2 + 1,
      ringRadius * 2 + 1
    );

    // Directional facing indicator pip
    const dirDx =
      localPlayer.facing === 'left' ? -4 : localPlayer.facing === 'right' ? 4 : 0;
    const dirDy =
      localPlayer.facing === 'up' ? -4 : localPlayer.facing === 'down' ? 4 : 0;
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(lpx + dirDx - 1, lpy + dirDy - 1, 3, 3);

    // High-contrast Local Player Blip
    ctx.fillStyle = '#090D16';
    ctx.fillRect(lpx - 3, lpy - 3, 7, 7);
    ctx.fillStyle = localPlayer.role === 'seeker' ? '#EF4444' : '#10B981';
    ctx.fillRect(lpx - 2, lpy - 2, 5, 5);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(lpx - 1, lpy - 1, 3, 3);
  }
}

