import type { MapConfig, ObjectiveConfig, WallRect } from './maps.ts';
import type { MatchState, NoisePing, PlayerState, PowerPickup, MineState, SmokeCloud } from './rules.ts';
import { POWER_INFO } from './rules.ts';
import { t as tr } from '../i18n';

/**
 * Client-only world effects: vision polygon + fog of war, ambient lighting, noise-ping rings,
 * the beacon "construction" animation and per-player status overlays.
 * Nothing here changes game state.
 */

// ───────────────────────────── Visibility polygon ─────────────────────────────

function rayAabb(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
  w: WallRect
): number {
  // Returns distance along the (unit) ray to the box, or Infinity.
  let tmin = -Infinity;
  let tmax = Infinity;
  if (Math.abs(dx) < 1e-9) {
    if (ox < w.x || ox > w.x + w.width) return Infinity;
  } else {
    const t1 = (w.x - ox) / dx;
    const t2 = (w.x + w.width - ox) / dx;
    tmin = Math.max(tmin, Math.min(t1, t2));
    tmax = Math.min(tmax, Math.max(t1, t2));
  }
  if (Math.abs(dy) < 1e-9) {
    if (oy < w.y || oy > w.y + w.height) return Infinity;
  } else {
    const t1 = (w.y - oy) / dy;
    const t2 = (w.y + w.height - oy) / dy;
    tmin = Math.max(tmin, Math.min(t1, t2));
    tmax = Math.min(tmax, Math.max(t1, t2));
  }
  if (tmax < Math.max(0, tmin)) return Infinity;
  return tmin >= 0 ? tmin : Infinity; // origin inside box → ignore that box
}

const angleBuf: number[] = [];
const nearWalls: WallRect[] = [];

/** Visibility polygon (flat [x0,y0,x1,y1,...]) from (ox,oy) clipped to `radius`, occluded by walls. */
export function computeVisibilityPolygon(
  ox: number,
  oy: number,
  radius: number,
  walls: WallRect[],
  out: number[]
): number[] {
  out.length = 0;
  angleBuf.length = 0;
  nearWalls.length = 0;
  for (const w of walls) {
    if (
      w.x > ox + radius ||
      w.x + w.width < ox - radius ||
      w.y > oy + radius ||
      w.y + w.height < oy - radius
    ) {
      continue;
    }
    nearWalls.push(w);
    const corners = [
      w.x, w.y,
      w.x + w.width, w.y,
      w.x, w.y + w.height,
      w.x + w.width, w.y + w.height,
    ];
    for (let i = 0; i < 8; i += 2) {
      const a = Math.atan2(corners[i + 1] - oy, corners[i] - ox);
      angleBuf.push(a - 0.0008, a, a + 0.0008);
    }
  }
  const BASE_RAYS = 72;
  for (let i = 0; i < BASE_RAYS; i++) angleBuf.push(-Math.PI + (i / BASE_RAYS) * Math.PI * 2);
  angleBuf.sort((a, b) => a - b);

  for (const a of angleBuf) {
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let best = radius;
    for (const w of nearWalls) {
      const t = rayAabb(ox, oy, dx, dy, w);
      if (t < best) best = t;
    }
    out.push(ox + dx * best, oy + dy * best);
  }
  return out;
}

// ───────────────────────────── Fog of war ─────────────────────────────

let fogCanvas: HTMLCanvasElement | null = null;

export interface FogOptions {
  polygon: number[];
  originX: number;
  originY: number;
  radius: number;
  darkness: number; // 0..1
  map: MapConfig;
  objectives: ObjectiveConfig[];
  timeSec: number;
  /** 2.5D view: vertical squash of the ground layer (1 = top-down). */
  tilt?: number;
}

/**
 * Draw the fog/lighting layer in SCREEN space. `offsetX/offsetY` are the camera translation
 * used for the world (world → screen = world + offset).
 */
export function drawFogOfWar(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  offsetX: number,
  offsetY: number,
  opts: FogOptions
) {
  if (!fogCanvas) fogCanvas = document.createElement('canvas');
  if (fogCanvas.width !== width || fogCanvas.height !== height) {
    fogCanvas.width = width;
    fogCanvas.height = height;
  }
  const f = fogCanvas.getContext('2d');
  if (!f) return;

  f.globalCompositeOperation = 'source-over';
  f.clearRect(0, 0, width, height);
  f.fillStyle = `rgba(4, 7, 18, ${opts.darkness})`;
  f.fillRect(0, 0, width, height);

  f.globalCompositeOperation = 'destination-out';
  f.save();
  f.translate(offsetX, offsetY);
  const tilt = opts.tilt ?? 1;
  if (tilt !== 1) f.scale(1, tilt);

  // 1. Line-of-sight cut-out with a soft radial falloff
  const poly = opts.polygon;
  if (poly.length >= 6) {
    const g = f.createRadialGradient(opts.originX, opts.originY, opts.radius * 0.25, opts.originX, opts.originY, opts.radius);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.7, 'rgba(0,0,0,0.92)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    f.fillStyle = g;
    f.beginPath();
    f.moveTo(poly[0], poly[1]);
    for (let i = 2; i < poly.length; i += 2) f.lineTo(poly[i], poly[i + 1]);
    f.closePath();
    f.fill();
  }

  // 2. Small personal glow so the area right around the player is never pitch black
  const pg = f.createRadialGradient(opts.originX, opts.originY, 0, opts.originX, opts.originY, 70);
  pg.addColorStop(0, 'rgba(0,0,0,0.6)');
  pg.addColorStop(1, 'rgba(0,0,0,0)');
  f.fillStyle = pg;
  f.fillRect(opts.originX - 70, opts.originY - 70, 140, 140);

  // 3. Streetlight pools (ambient light, reveals the ground but players are still perception-gated)
  const left = -offsetX - 120;
  const top = (-offsetY - 120) / tilt;
  const right = -offsetX + width + 120;
  const bottom = (-offsetY + height + 120) / tilt;
  for (const l of opts.map.streetlights) {
    if (l.x < left || l.x > right || l.y < top || l.y > bottom) continue;
    const flicker = 0.42 + 0.04 * Math.sin(opts.timeSec * 7 + l.x * 0.13);
    const lg = f.createRadialGradient(l.x, l.y, 4, l.x, l.y, 92);
    lg.addColorStop(0, `rgba(0,0,0,${flicker})`);
    lg.addColorStop(1, 'rgba(0,0,0,0)');
    f.fillStyle = lg;
    f.fillRect(l.x - 92, l.y - 92, 184, 184);
  }

  // 4. Beacons always glow
  for (const o of opts.objectives) {
    const r = 120 + Math.sin(opts.timeSec * 2.5) * 6;
    const bg = f.createRadialGradient(o.x, o.y, 8, o.x, o.y, r);
    bg.addColorStop(0, 'rgba(0,0,0,0.7)');
    bg.addColorStop(1, 'rgba(0,0,0,0)');
    f.fillStyle = bg;
    f.fillRect(o.x - r, o.y - r, r * 2, r * 2);
  }
  f.restore();

  // Warm/cool tint on top of the darkness
  f.globalCompositeOperation = 'source-atop';
  f.fillStyle = 'rgba(30, 27, 75, 0.25)';
  f.fillRect(0, 0, width, height);
  f.globalCompositeOperation = 'source-over';

  ctx.drawImage(fogCanvas, 0, 0);
}

// ───────────────────────────── Noise pings ─────────────────────────────

const PING_STYLE: Record<NoisePing['kind'], { color: string; radius: number; label: string }> = {
  exit: { color: '226, 232, 240', radius: 46, label: '' },
  rustle: { color: '251, 191, 36', radius: 38, label: '?' },
  flush: { color: '239, 68, 68', radius: 64, label: '!' },
  footstep: { color: '148, 163, 184', radius: 24, label: '' },
  beacon: { color: '34, 211, 238', radius: 150, label: '📡' },
};

/** World-space expanding rings for noise pings (drawn above the fog so they read in the dark). */
export function drawNoisePings(ctx: CanvasRenderingContext2D, pings: NoisePing[] | undefined, timeSec: number) {
  if (!pings) return;
  ctx.save();
  for (const p of pings) {
    const style = PING_STYLE[p.kind];
    const life = 1 - p.ttl / p.maxTtl; // 0 → 1
    for (let ring = 0; ring < 2; ring++) {
      const t = (life * 1.6 + ring * 0.35) % 1;
      const r = 8 + t * style.radius;
      ctx.strokeStyle = `rgba(${style.color}, ${(1 - t) * 0.85 * (p.ttl / p.maxTtl + 0.2)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(Math.round(p.x), Math.round(p.y), r, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (style.label) {
      const bob = Math.round(Math.sin(timeSec * 10) * 2);
      ctx.font = 'bold 14px "PixelOperator8", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(${style.color}, ${Math.min(1, p.ttl / p.maxTtl + 0.3)})`;
      ctx.fillText(style.label, Math.round(p.x), Math.round(p.y) - 26 + bob);
    }
  }
  ctx.restore();
}

// ───────────────────────────── Beacon construction ─────────────────────────────

/** Relay beacon base pad (secondary escape points). */
export function drawRelayBase(ctx: CanvasRenderingContext2D, o: ObjectiveConfig, held: boolean, timeSec: number) {
  const x = Math.round(o.x);
  const y = Math.round(o.y);
  const pulse = 0.5 + 0.5 * Math.sin(timeSec * (held ? 8 : 3));
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, o.interactionRange, 0, Math.PI * 2);
  ctx.fillStyle = held ? `rgba(34, 211, 238, ${0.12 + pulse * 0.1})` : 'rgba(34, 211, 238, 0.06)';
  ctx.fill();
  ctx.setLineDash([5, 7]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = held ? '#22D3EE' : 'rgba(34, 211, 238, 0.45)';
  ctx.stroke();
  ctx.restore();

  // Concrete pad with hazard stripes
  ctx.fillStyle = '#090D16';
  ctx.fillRect(x - 28, y - 18, 56, 40);
  ctx.fillStyle = '#475569';
  ctx.fillRect(x - 26, y - 16, 52, 36);
  ctx.fillStyle = '#334155';
  ctx.fillRect(x - 22, y - 12, 44, 28);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#FACC15' : '#090D16';
    ctx.fillRect(x - 26 + i * 9, y + 16, 9, 4);
  }
  // Generator box with blinking LED
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(x + 10, y - 4, 12, 14);
  ctx.fillStyle = held ? (pulse > 0.5 ? '#22D3EE' : '#0E7490') : '#EF4444';
  ctx.fillRect(x + 14, y - 1, 4, 3);
  // Label
  ctx.font = 'bold 9px "PixelOperator8", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#090D16';
  ctx.fillText(tr('fx.relay'), x + 1, y + 35);
  ctx.fillStyle = '#67E8F9';
  ctx.fillText(tr('fx.relay'), x, y + 34);
}

const BLOCKS_PER_TIER = 8;

/**
 * The "something is being built" animation the user asked for: a signal tower assembles
 * block by block while hiders transmit. Each completed stage leaves a finished tier; the current
 * stage adds blocks as progress grows, with a swinging crane, welding sparks, and a sky beam that
 * strengthens with progress. Interrupting the transmission makes the unfinished tier collapse.
 */
export function drawBeaconConstruction(
  ctx: CanvasRenderingContext2D,
  o: ObjectiveConfig,
  state: MatchState,
  timeSec: number,
  isMain: boolean
) {
  const total = state.config.objectiveTotalStages;
  const done = Math.min(total, state.objectiveCompletedStages);
  const progress = state.objectiveProgressById?.[o.id] ?? 0;
  const ratio = Math.max(0, Math.min(1, progress / state.config.objectiveStageDurationSeconds));
  const held = state.objectiveActiveIds?.includes(o.id) ?? false;
  const allDone = done >= total;

  const baseX = Math.round(o.x) + (isMain ? 0 : -6);
  const baseY = Math.round(o.y) + (isMain ? -28 : 4);
  const tierH = 20;
  const tierW = (tier: number) => 30 - tier * 7;
  const accent = isMain ? '#34D399' : '#22D3EE';

  ctx.save();

  // Finished tiers (shared network progress)
  for (let t = 0; t < done; t++) {
    const w = tierW(t);
    const y = baseY - (t + 1) * tierH;
    ctx.fillStyle = '#090D16';
    ctx.fillRect(baseX - w / 2 - 1, y - 1, w + 2, tierH + 2);
    ctx.fillStyle = '#64748B';
    ctx.fillRect(baseX - w / 2, y, w, tierH);
    // lattice cross-bracing
    ctx.fillStyle = '#94A3B8';
    for (let k = 0; k < w; k += 4) ctx.fillRect(baseX - w / 2 + k, y + ((k / 4) % 2 === 0 ? 3 : 11), 3, 3);
    // tier lights
    ctx.fillStyle = Math.floor(timeSec * 2 + t) % 2 === 0 ? '#FDE68A' : '#F59E0B';
    ctx.fillRect(baseX - w / 2 - 2, y + 2, 2, 2);
    ctx.fillRect(baseX + w / 2, y + 2, 2, 2);
    ctx.fillStyle = accent;
    ctx.fillRect(baseX - w / 2, y + tierH - 2, w, 2);
  }

  // Current tier under construction
  if (!allDone && ratio > 0) {
    const t = done;
    const w = tierW(t);
    const y = baseY - (t + 1) * tierH;
    const blocks = Math.floor(ratio * BLOCKS_PER_TIER + 1e-6);
    const cols = 2;
    const bw = Math.max(3, Math.floor(w / cols));
    const bh = Math.floor(tierH / (BLOCKS_PER_TIER / cols));
    for (let b = 0; b < blocks; b++) {
      const col = b % cols;
      const row = Math.floor(b / cols);
      const bx = baseX - w / 2 + col * bw;
      const by = y + tierH - (row + 1) * bh;
      ctx.fillStyle = '#090D16';
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = b === blocks - 1 ? '#FDE68A' : '#94A3B8';
      ctx.fillRect(bx + 1, by + 1, bw - 2, bh - 1);
    }
    // Next block being lowered by the crane
    const nextCol = blocks % cols;
    const nextRow = Math.floor(blocks / cols);
    const targetX = baseX - w / 2 + nextCol * bw + bw / 2;
    const targetY = y + tierH - (nextRow + 1) * bh;
    const frac = (ratio * BLOCKS_PER_TIER) % 1;
    const craneTopY = baseY - (total + 1) * tierH - 10;
    const swing = Math.sin(timeSec * 3) * 3;
    const hookY = craneTopY + (targetY - craneTopY) * frac;
    // Crane mast and jib
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(baseX + 22, craneTopY, 3, baseY - craneTopY);
    ctx.fillRect(targetX - 4 + swing, craneTopY, baseX + 25 - (targetX - 4 + swing), 3);
    ctx.fillStyle = '#B45309';
    for (let cy = craneTopY + 6; cy < baseY; cy += 8) ctx.fillRect(baseX + 22, cy, 3, 1);
    // cable + hanging block
    ctx.fillStyle = '#CBD5E1';
    ctx.fillRect(Math.round(targetX + swing), craneTopY + 3, 1, Math.max(0, Math.round(hookY - craneTopY - 3)));
    if (held) {
      ctx.fillStyle = '#FDE68A';
      ctx.fillRect(Math.round(targetX + swing - bw / 2 + 1), Math.round(hookY), bw - 2, bh - 1);
    }
    // Welding sparks at the newest block
    if (held && Math.floor(timeSec * 20) % 2 === 0) {
      ctx.fillStyle = '#FEF08A';
      const sx = Math.round(targetX + Math.sin(timeSec * 37) * 5);
      const sy = Math.round(targetY + bh + Math.cos(timeSec * 29) * 3);
      ctx.fillRect(sx, sy, 2, 2);
      ctx.fillRect(sx + 3, sy - 2, 1, 1);
      ctx.fillRect(sx - 3, sy + 1, 1, 1);
    }
  }

  // Antenna / dish on top of the tallest finished part
  const topY = baseY - Math.max(done, ratio > 0 ? done + ratio : done) * tierH;
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(baseX - 1, Math.round(topY) - 10, 2, 10);
  const dishPhase = Math.sin(timeSec * (held ? 4 : 1));
  ctx.fillStyle = held || allDone ? accent : '#64748B';
  ctx.fillRect(baseX - 4 + Math.round(dishPhase * 2), Math.round(topY) - 14, 8, 4);

  // Sky beam strengthens with progress (and completed stages)
  const beamStrength = allDone ? 1 : Math.min(1, done / total * 0.6 + (held ? ratio * 0.5 : 0));
  if (beamStrength > 0.02) {
    const flick = 0.75 + 0.25 * Math.sin(timeSec * 12);
    const bwid = 3 + Math.round(beamStrength * 5);
    const grad = ctx.createLinearGradient(0, topY - 14, 0, topY - 200);
    grad.addColorStop(0, `rgba(${isMain ? '52, 211, 153' : '34, 211, 238'}, ${0.55 * beamStrength * flick})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(baseX - Math.floor(bwid / 2), Math.round(topY) - 200, bwid, 186);
  }

  // Progress ring + percentage while transmitting
  if (ratio > 0 && !allDone) {
    ctx.beginPath();
    ctx.arc(o.x, o.y, isMain ? 54 : 40, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
    ctx.strokeStyle = held ? accent : 'rgba(148,163,184,0.7)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.font = 'bold 10px "PixelOperator8", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#090D16';
    ctx.fillText(`${Math.floor(ratio * 100)}%`, baseX + 1, Math.round(topY) - 21);
    ctx.fillStyle = '#FDE68A';
    ctx.fillText(`${Math.floor(ratio * 100)}%`, baseX, Math.round(topY) - 22);
  }
  ctx.restore();
}

/** Energy link lines from every transmitting hider to their beacon. */
export function drawTransmitLinks(
  ctx: CanvasRenderingContext2D,
  state: MatchState,
  objectives: ObjectiveConfig[],
  positionOf: (p: PlayerState) => { x: number; y: number },
  timeSec: number
) {
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.lineDashOffset = -timeSec * 30;
  ctx.lineWidth = 2;
  for (const id of state.objectiveActiveHiderIds) {
    const p = state.players[id];
    if (!p || p.masked) continue;
    const o = objectives.find((ob) => ob.id === p.objectiveId);
    if (!o) continue;
    const pos = positionOf(p);
    ctx.strokeStyle = `rgba(52, 211, 153, ${0.55 + 0.3 * Math.sin(timeSec * 9)})`;
    ctx.beginPath();
    ctx.moveTo(Math.round(pos.x), Math.round(pos.y) - 6);
    ctx.lineTo(Math.round(o.x), Math.round(o.y) - 20);
    ctx.stroke();
  }
  ctx.restore();
}

// ───────────────────────────── Player status overlays ─────────────────────────────

export function drawPlayerStatusFx(
  ctx: CanvasRenderingContext2D,
  p: PlayerState,
  x: number,
  y: number,
  timeSec: number
) {
  if (!p.alive || p.hiddenInSpotId) return;
  const px = Math.round(x);
  const py = Math.round(y);
  ctx.save();
  // Stunned (flushed hider) → orbiting stars; seeker searching → rotating magnifier dots
  if ((p.stunRemaining ?? 0) > 0) {
    const isSeeker = p.role === 'seeker';
    for (let i = 0; i < 3; i++) {
      const a = timeSec * (isSeeker ? 6 : 9) + (i * Math.PI * 2) / 3;
      const sx = px + Math.round(Math.cos(a) * 12);
      const sy = py - 30 + Math.round(Math.sin(a) * 4);
      ctx.fillStyle = isSeeker ? '#CBD5E1' : '#FDE047';
      ctx.fillRect(sx - 1, sy - 1, 3, 3);
    }
    const label =
      p.stunKind === 'mine' ? tr('fx.stunMine') : p.stunKind === 'shield' ? tr('fx.stunShield') : isSeeker ? tr('fx.searching') : '';
    if (label) {
      ctx.font = 'bold 9px "PixelOperator8", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = p.stunKind === 'mine' ? '#FCA5A5' : p.stunKind === 'shield' ? '#67E8F9' : '#E2E8F0';
      ctx.fillText(label, px, py - 40);
    }
  }
  // Revealed after a flush → pulsing red marker
  if ((p.revealedRemaining ?? 0) > 0) {
    const s = 1 + Math.round(Math.abs(Math.sin(timeSec * 10)) * 2);
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2;
    ctx.strokeRect(px - 16 - s, py - 22 - s, 32 + s * 2, 38 + s * 2);
    ctx.fillStyle = '#EF4444';
    ctx.font = 'bold 14px "PixelOperator8", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('!', px, py - 32);
  }
  // Shield → shimmering bubble
  if ((p.shieldRemaining ?? 0) > 0) {
    const wob = Math.sin(timeSec * 6) * 1.5;
    const fading = (p.shieldRemaining ?? 0) < 2 && Math.floor(timeSec * 8) % 2 === 0;
    if (!fading) {
      ctx.beginPath();
      ctx.arc(px, py - 4, 22 + wob, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(103, 232, 249, 0.14)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(103, 232, 249, 0.85)';
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(px - 12, py - 20, 4, 2);
    }
  }
  // Sprinting / speed boost → speed streaks behind the runner
  if ((p.sprintRemaining ?? 0) > 0 || (p.speedBoostRemaining ?? 0) > 0) {
    const streak = (p.sprintRemaining ?? 0) > 0 ? '125, 211, 252' : '253, 186, 116';
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > 1) {
      const nx = -p.vx / sp;
      const ny = -p.vy / sp;
      for (let i = 1; i <= 4; i++) {
        ctx.fillStyle = `rgba(${streak}, ${0.55 - i * 0.12})`;
        const jitter = ((i * 7 + Math.floor(timeSec * 30)) % 5) - 2;
        ctx.fillRect(
          px + Math.round(nx * (10 + i * 7)) + Math.round(-ny * jitter * 2),
          py + Math.round(ny * (10 + i * 7)) + Math.round(nx * jitter * 2) - 4,
          Math.max(2, 7 - i),
          2
        );
      }
    }
  }
  ctx.restore();
}

/** Full-screen flash overlay (screen space). */
export function drawScreenFlash(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, color: string) {
  if (amount <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(0.6, amount);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// ───────────────────────────── Power-ups ─────────────────────────────

/** Edible snacks lying on the street: bobbing icon on a glowing plate. */
export function drawPowerUps(ctx: CanvasRenderingContext2D, pickups: PowerPickup[] | undefined, timeSec: number) {
  if (!pickups) return;
  ctx.save();
  for (const pu of pickups) {
    const info = POWER_INFO[pu.kind];
    const x = Math.round(pu.x);
    const y = Math.round(pu.y);
    const bob = Math.round(Math.sin(timeSec * 3 + pu.id) * 3);
    const pulse = 0.5 + 0.5 * Math.sin(timeSec * 4 + pu.id);
    // ground glow + shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(x - 9, y + 9, 18, 4);
    ctx.beginPath();
    ctx.arc(x, y, 15 + pulse * 3, 0, Math.PI * 2);
    ctx.fillStyle = `${info.color}33`;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = info.color;
    ctx.stroke();
    // solid plate so the snack reads on any ground
    ctx.beginPath();
    ctx.arc(x, y - 2 + bob, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#0F172A';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = info.color;
    ctx.stroke();
    // icon
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '15px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(info.icon, x, y - 2 + bob);
    // sparkle
    if (Math.floor(timeSec * 3 + pu.id) % 3 === 0) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x + 10, y - 14 + bob, 2, 2);
      ctx.fillRect(x - 13, y - 6 + bob, 1, 1);
    }
  }
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

/** Hider mines (only present in the state hiders receive). */
export function drawMines(ctx: CanvasRenderingContext2D, mines: MineState[] | undefined, timeSec: number) {
  if (!mines) return;
  ctx.save();
  for (const m of mines) {
    const x = Math.round(m.x);
    const y = Math.round(m.y);
    const armed = m.armDelay <= 0;
    const blinkFast = m.ttl < 3;
    const on = Math.floor(timeSec * (blinkFast ? 8 : 3) + m.id) % 2 === 0;
    ctx.fillStyle = '#090D16';
    ctx.fillRect(x - 7, y - 4, 14, 8);
    ctx.fillStyle = '#475569';
    ctx.fillRect(x - 6, y - 3, 12, 6);
    ctx.fillStyle = armed ? (on ? '#EF4444' : '#7F1D1D') : '#FBBF24';
    ctx.fillRect(x - 2, y - 2, 4, 3);
    // trigger radius hint for teammates
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(248, 113, 113, 0.25)';
    ctx.setLineDash([3, 4]);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

/** Billowing smoke clouds (drawn above the fog so everyone sees the cloud itself). */
export function drawSmokes(ctx: CanvasRenderingContext2D, smokes: SmokeCloud[] | undefined, timeSec: number) {
  if (!smokes) return;
  ctx.save();
  for (const s of smokes) {
    const life = s.ttl / s.maxTtl;
    const grow = Math.min(1, (1 - life) * 6); // puff out quickly
    const alpha = Math.min(0.85, life * 1.4) * 0.8;
    const r = s.radius * (0.55 + 0.45 * grow);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + timeSec * 0.25 + s.id;
      const d = r * (i % 2 === 0 ? 0.45 : 0.62);
      const pr = r * (0.42 + 0.08 * Math.sin(timeSec * 1.7 + i));
      const cx = s.x + Math.cos(a) * d;
      const cy = s.y + Math.sin(a) * d * 0.8;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, pr);
      g.addColorStop(0, `rgba(203, 213, 225, ${alpha})`);
      g.addColorStop(1, 'rgba(148, 163, 184, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - pr, cy - pr, pr * 2, pr * 2);
    }
    const core = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 0.7);
    core.addColorStop(0, `rgba(226, 232, 240, ${alpha})`);
    core.addColorStop(1, 'rgba(226, 232, 240, 0)');
    ctx.fillStyle = core;
    ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
  }
  ctx.restore();
}
