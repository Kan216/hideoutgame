import { MAPS, getMapObjectives } from './maps.ts';
import type { MapConfig, MapId, HidingSpotConfig, WallRect, CharacterSkinId, ObjectiveConfig } from './maps.ts';

export type MatchLifecycleState =
  | 'LOBBY'
  | 'PLAYER_ASSIGNMENT'
  | 'MATCH_INITIALIZATION'
  | 'HIDER_HEAD_START'
  | 'SEEKER_RELEASED'
  | 'MATCH_ACTIVE'
  | 'MATCH_COMPLETED'
  | 'RETURN_TO_LOBBY';

export type PlayerRole = 'hider' | 'seeker';
export type FacingDirection = 'up' | 'down' | 'left' | 'right';

export interface PlayerState {
  id: string;
  name: string;
  role: PlayerRole;
  skinId?: CharacterSkinId;
  isBot: boolean;
  botPolicy?: 'stealth_hider' | 'runner_hider' | 'patrol_seeker' | 'hunter_seeker';
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: FacingDirection;
  hiddenInSpotId: string | null;
  hideTimerRemaining?: number;
  lastExitedSpotId?: string | null;
  spotCooldownRemaining?: number;
  preHideX?: number;
  preHideY?: number;
  interactingWithObjective: boolean;
  /** Which escape beacon the player is transmitting from (when interactingWithObjective). */
  objectiveId?: string | null;
  eliminationsCount: number;
  inspectionsCount: number;
  objectiveSecondsContributed: number;
  lastInspectAt: number;
  connected: boolean;
  colorIndex: number;
  activeEmote?: { text: string; expiresAt: number } | null;
  /** Global cooldown after leaving any hiding spot before the hider may hide again. */
  rehideCooldownRemaining?: number;
  /** Seconds the player is stunned (cannot move) after being flushed out of a spot. */
  stunRemaining?: number;
  /** Seconds the player stays revealed to every seeker (after being flushed out). */
  revealedRemaining?: number;
  /** Seeker who flushed this hider out (only they get the reveal). */
  revealedById?: string | null;
  /** Hider sprint burst: seconds of boosted speed left, and cooldown before the next burst. */
  sprintRemaining?: number;
  sprintCooldownRemaining?: number;
  /** Why the player is stunned (for visuals): searching an object, flushed out, hit a mine, bounced off a shield. */
  stunKind?: 'search' | 'flush' | 'mine' | 'shield' | null;
  /** Eaten snack waiting to be activated (one slot) and remaining charges (mines come in pairs). */
  heldPower?: PowerKind | null;
  heldCharges?: number;
  /** Active hider power timers (seconds). */
  cloakRemaining?: number;
  shieldRemaining?: number;
  speedBoostRemaining?: number;
  /** Set by `filterStateForViewer` when the viewer is not allowed to know this player's position. */
  masked?: boolean;
}

export interface MatchConfig {
  mapId: MapId;
  seekerCount: 1 | 2;
  hiderBaseSpeed: number; // Default 160 px/s (100%)
  seekerSpeedMultiplier: number; // Default 1.2 (120%)
  headStartSeconds: number; // Default 10s
  maxHideDurationSeconds: number; // Default 15s max hide time in a spot
  objectiveTotalStages: number; // Default 3
  objectiveStageDurationSeconds: number; // Default 15s per stage
  directEliminationRange: number; // Default 56 px
  inspectCooldownMs: number; // Default 650 ms
  survivalTimerEnabled: boolean;
  survivalTimerSeconds: number; // Default 240s (4 minutes)
  /** Hiders need at least this many beacon stages for a timeout to count as a hider win. */
  timeoutHiderMinStages: number;
  /** Global cooldown after exiting ANY spot before hiding again (stops spot-chaining). */
  rehideCooldownSeconds: number;
  /** Cooldown before the same spot can be reused by the same hider. */
  spotReuseCooldownSeconds: number;
  /** Stun applied to a hider flushed out by an inspection. */
  flushStunSeconds: number;
  /** Time a flushed hider stays visible to all seekers. */
  flushRevealSeconds: number;
  /** A seeker is busy (cannot move) for this long after searching an object. */
  inspectRecoverySeconds: number;
  /** Hider sprint burst (escape tool vs. the faster seeker). */
  hiderSprintMultiplier: number;
  hiderSprintSeconds: number;
  hiderSprintCooldownSeconds: number;
  /** Edible power-ups for hiders */
  powerUpsEnabled: boolean;
  powerUpMaxOnMap: number;
  powerUpSpawnIntervalSeconds: number;
  cloakSeconds: number;
  cloakRevealRadius: number;
  shieldSeconds: number;
  shieldBlockStunSeconds: number;
  minesPerPickup: number;
  mineSeconds: number;
  mineStunSeconds: number;
  mineTriggerRadius: number;
  smokeSeconds: number;
  smokeRadius: number;
  speedBoostSeconds: number;
  speedBoostMultiplier: number;
  /** While a beacon transmits it emits a noise ping this often (seconds). */
  beaconNoiseIntervalSeconds: number;
  /** Vision radius (line-of-sight required). */
  seekerVisionRadius: number;
  hiderVisionRadius: number;
  /** Radius at which a MOVING enemy is heard even without line of sight. */
  seekerHearingRadius: number;
  hiderHearingRadius: number;
}

/** Edible hider power-ups ("snacks"). */
export type PowerKind = 'cloak' | 'shield' | 'mines' | 'smoke' | 'speed';

export interface PowerInfo {
  kind: PowerKind;
  snack: string;
  power: string;
  icon: string;
  color: string;
  description: string;
}

export const POWER_INFO: Record<PowerKind, PowerInfo> = {
  cloak: { kind: 'cloak', snack: 'Ghost Candy', power: 'Invisibility Cloak', icon: '👻', color: '#C4B5FD', description: 'Invisible & silent to seekers for 8s (unless they bump into you)' },
  shield: { kind: 'shield', snack: 'Iron Apple', power: 'Shield', icon: '🛡️', color: '#67E8F9', description: 'Blocks one catch for 12s and stuns the seeker' },
  mines: { kind: 'mines', snack: 'Pop Rocks', power: 'Mines', icon: '💣', color: '#F87171', description: 'Drop hidden mines (15s) that stun seekers for 2.5s' },
  smoke: { kind: 'smoke', snack: 'Smoke Pie', power: 'Smoke Bomb', icon: '💨', color: '#CBD5E1', description: 'Smoke cloud for 7s that seekers cannot see through' },
  speed: { kind: 'speed', snack: 'Energy Donut', power: 'Speed Boost', icon: '🍩', color: '#FDBA74', description: '+25% speed for 10s' },
};

export const POWER_KINDS: PowerKind[] = ['cloak', 'shield', 'mines', 'smoke', 'speed'];

export interface PowerPickup {
  id: number;
  kind: PowerKind;
  x: number;
  y: number;
}

export interface MineState {
  id: number;
  ownerId: string;
  x: number;
  y: number;
  ttl: number;
  armDelay: number;
}

export interface SmokeCloud {
  id: number;
  x: number;
  y: number;
  radius: number;
  ttl: number;
  maxTtl: number;
}

export type NoisePingKind = 'exit' | 'rustle' | 'flush' | 'footstep' | 'beacon';

export interface NoisePing {
  id: number;
  kind: NoisePingKind;
  x: number;
  y: number;
  ttl: number;
  maxTtl: number;
}

export interface MatchEventLog {
  id: string;
  timestamp: number;
  type: 'info' | 'hide' | 'inspect_empty' | 'flush' | 'elimination' | 'objective_stage' | 'victory' | 'power';
  message: string;
  x?: number;
  y?: number;
  /** Translation key + parameters so clients can show the event in their own language. */
  key?: string;
  params?: Record<string, string | number>;
}

export interface MatchState {
  roomCode: string;
  hostId: string;
  lifecycle: MatchLifecycleState;
  config: MatchConfig;
  countdownRemaining: number;
  elapsedMatchSeconds: number;
  objectiveCompletedStages: number; // 0, 1, 2, or 3
  objectiveCurrentStageProgress: number; // 0 to 15
  objectiveActiveHiderIds: string[];
  /** Per-beacon progress of the current stage (seconds). `objectiveCurrentStageProgress` mirrors the max. */
  objectiveProgressById?: Record<string, number>;
  /** Beacons currently being transmitted from. */
  objectiveActiveIds?: string[];
  hidingOccupancy: Record<string, string | null>; // spotId -> playerId | null
  players: Record<string, PlayerState>;
  winner: 'hiders' | 'seekers' | null;
  winReason: string | null;
  /** Translation key (+ params) for winReason. */
  winReasonKey?: string | null;
  winReasonParams?: Record<string, string | number>;
  events: MatchEventLog[];
  /** Short-lived world-space sound cues that are visible through fog of war. */
  noisePings?: NoisePing[];
  /** Edible power-ups lying on the map, hider mines (hidden from seekers) and smoke clouds. */
  powerUps?: PowerPickup[];
  mines?: MineState[];
  smokes?: SmokeCloud[];
  powerSpawnTimer?: number;
  /** Deterministic RNG state for power-up spawns. */
  rngSeed?: number;
}

export function formatMatchTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  mapId: 'downtown_plaza',
  seekerCount: 1,
  hiderBaseSpeed: 160,
  seekerSpeedMultiplier: 1.2,
  headStartSeconds: 10,
  maxHideDurationSeconds: 15,
  objectiveTotalStages: 3,
  objectiveStageDurationSeconds: 15,
  directEliminationRange: 58,
  inspectCooldownMs: 1100,
  survivalTimerEnabled: true,
  survivalTimerSeconds: 240,
  timeoutHiderMinStages: 1,
  rehideCooldownSeconds: 3,
  spotReuseCooldownSeconds: 8,
  flushStunSeconds: 0.25,
  flushRevealSeconds: 1.5,
  inspectRecoverySeconds: 1.1,
  beaconNoiseIntervalSeconds: 3,
  hiderSprintMultiplier: 1.45,
  hiderSprintSeconds: 2.2,
  hiderSprintCooldownSeconds: 8,
  powerUpsEnabled: true,
  powerUpMaxOnMap: 4,
  powerUpSpawnIntervalSeconds: 9,
  cloakSeconds: 8,
  cloakRevealRadius: 55,
  shieldSeconds: 12,
  shieldBlockStunSeconds: 1.3,
  minesPerPickup: 2,
  mineSeconds: 15,
  mineStunSeconds: 2.5,
  mineTriggerRadius: 30,
  smokeSeconds: 7,
  smokeRadius: 130,
  speedBoostSeconds: 10,
  speedBoostMultiplier: 1.25,
  seekerVisionRadius: 250,
  hiderVisionRadius: 340,
  seekerHearingRadius: 110,
  hiderHearingRadius: 240,
};

let eventSeq = 0;

/** Push an event to the front of the bounded match event log with a unique id. */
export function pushMatchEvent(
  state: MatchState,
  type: MatchEventLog['type'],
  message: string,
  nowMs: number = Date.now(),
  x?: number,
  y?: number,
  i18n?: { key: string; params?: Record<string, string | number> }
): MatchEventLog {
  eventSeq = (eventSeq + 1) % 1_000_000;
  const evt: MatchEventLog = { id: `evt_${nowMs}_${eventSeq}_${type}`, timestamp: nowMs, type, message, x, y, ...i18n };
  state.events.unshift(evt);
  if (state.events.length > 20) state.events.length = 20;
  return evt;
}

let noiseSeq = 0;

export function emitNoisePing(
  state: MatchState,
  kind: NoisePingKind,
  x: number,
  y: number,
  ttl: number = 1.6
): void {
  if (!state.noisePings) state.noisePings = [];
  noiseSeq = (noiseSeq + 1) % 1_000_000;
  state.noisePings.push({ id: noiseSeq, kind, x, y, ttl, maxTtl: ttl });
  if (state.noisePings.length > 24) state.noisePings.splice(0, state.noisePings.length - 24);
}

const RESERVED_IDENTITIES = new Set([
  'admin',
  'administrator',
  'system',
  'server',
  'moderator',
  'mod',
  'host_system',
  'root',
  'developer',
  'official',
  'cityhideout',
]);

export function validateGuestDisplayName(rawName: string): {
  valid: boolean;
  sanitized: string;
  error?: string;
} {
  const trimmed = (rawName || '').trim().replace(/\s+/g, ' ');
  if (!trimmed) {
    return { valid: false, sanitized: '', error: 'Display name cannot be empty.' };
  }
  if (trimmed.length < 2 || trimmed.length > 18) {
    return {
      valid: false,
      sanitized: trimmed.slice(0, 18),
      error: 'Display name must be between 2 and 18 characters.',
    };
  }
  if (!/^[a-zA-Z0-9 _-]+$/.test(trimmed)) {
    return {
      valid: false,
      sanitized: trimmed.replace(/[^a-zA-Z0-9 _-]/g, ''),
      error: 'Use only letters, numbers, spaces, hyphens, or underscores.',
    };
  }
  const normalized = trimmed.toLowerCase().replace(/[\s_-]/g, '');
  for (const reserved of RESERVED_IDENTITIES) {
    if (normalized === reserved.replace(/[\s_-]/g, '') || normalized.startsWith('system') || normalized.startsWith('admin')) {
      return {
        valid: false,
        sanitized: '',
        error: 'Reserved system identity names are not permitted.',
      };
    }
  }
  return { valid: true, sanitized: trimmed };
}

export function generateGuestName(seedNumber?: number): string {
  const adjectives = ['Shadow', 'Pixel', 'Neon', 'Alley', 'Swift', 'Silent', 'Metro', 'Harbor', 'Cobble', 'Dusk'];
  const nouns = ['Fox', 'Runner', 'Phantom', 'Scout', 'Crow', 'Hopper', 'Drifter', 'Viper', 'Lynx', 'Owl'];
  const num = seedNumber ?? Math.floor(100 + Math.random() * 899);
  const adj = adjectives[num % adjectives.length];
  const noun = nouns[Math.floor(num / 10) % nouns.length];
  return `${adj}${noun}${num % 100}`;
}

export function getPlayerSpeed(
  role: PlayerRole,
  config: MatchConfig = DEFAULT_MATCH_CONFIG,
  player?: Pick<PlayerState, 'sprintRemaining' | 'speedBoostRemaining'>
): number {
  if (role === 'seeker') {
    return config.hiderBaseSpeed * config.seekerSpeedMultiplier;
  }
  let mult = 1;
  if (player && (player.sprintRemaining ?? 0) > 0) mult = Math.max(mult, config.hiderSprintMultiplier ?? 1.45);
  if (player && (player.speedBoostRemaining ?? 0) > 0) mult = Math.max(mult, config.speedBoostMultiplier ?? 1.25);
  return config.hiderBaseSpeed * mult;
}

/** Hider sprint burst. Returns ok=false while on cooldown, hidden, stunned or not a living hider. */
export function attemptSprint(state: MatchState, playerId: string): { ok: boolean; reason?: string } {
  const p = state.players[playerId];
  if (!p || p.role !== 'hider' || !p.alive) return { ok: false, reason: 'Only living hiders can sprint.' };
  if (p.hiddenInSpotId !== null) return { ok: false, reason: 'Cannot sprint while hidden.' };
  if (state.lifecycle !== 'HIDER_HEAD_START' && state.lifecycle !== 'SEEKER_RELEASED' && state.lifecycle !== 'MATCH_ACTIVE') {
    return { ok: false, reason: 'Match is not active.' };
  }
  if ((p.sprintCooldownRemaining ?? 0) > 0) return { ok: false, reason: 'Sprint is recharging.' };
  if ((p.stunRemaining ?? 0) > 0) return { ok: false, reason: 'Stunned.' };
  p.sprintRemaining = state.config.hiderSprintSeconds ?? 2.2;
  p.sprintCooldownRemaining = (state.config.hiderSprintCooldownSeconds ?? 8) + p.sprintRemaining;
  p.interactingWithObjective = false;
  return { ok: true };
}

export function circleIntersectsRect(
  cx: number,
  cy: number,
  radius: number,
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.height));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < radius * radius;
}

export function segmentIntersectsRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  // Exact Liang–Barsky / slab clip of the segment against the AABB.
  // Endpoints touching the rect boundary do not count (players stand next to walls).
  const dx = x2 - x1;
  const dy = y2 - y1;
  let t0 = 0;
  let t1 = 1;
  const clip = (p: number, q: number): boolean => {
    if (Math.abs(p) < 1e-9) return q >= 0;
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
    return true;
  };
  if (
    clip(-dx, x1 - rect.x) &&
    clip(dx, rect.x + rect.width - x1) &&
    clip(-dy, y1 - rect.y) &&
    clip(dy, rect.y + rect.height - y1)
  ) {
    // Require a real overlap inside the segment (not only grazing an endpoint).
    return t1 - t0 > 1e-6 && t0 < 1 - 1e-6 && t1 > 1e-6;
  }
  return false;
}

export function hasLineOfSight(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  walls: WallRect[]
): boolean {
  for (const wall of walls) {
    if (segmentIntersectsRect(x1, y1, x2, y2, wall)) {
      return false;
    }
  }
  return true;
}

export function isPositionWallFree(
  x: number,
  y: number,
  radius: number,
  map: MapConfig
): boolean {
  const minX = 36;
  const maxX = map.width - 36;
  const minY = 36;
  const maxY = map.height - 36;
  if (x < minX || x > maxX || y < minY || y > maxY) {
    return false;
  }
  for (const wall of map.walls) {
    if (circleIntersectsRect(x, y, radius, wall)) {
      return false;
    }
  }
  return true;
}

export function findNearestCollisionFreePoint(
  startX: number,
  startY: number,
  map: MapConfig,
  radius: number = 14
): { x: number; y: number } {
  const minX = 36;
  const maxX = map.width - 36;
  const minY = 36;
  const maxY = map.height - 36;
  const clampedX = Math.max(minX, Math.min(maxX, startX));
  const clampedY = Math.max(minY, Math.min(maxY, startY));

  if (isPositionWallFree(clampedX, clampedY, radius, map)) {
    return { x: clampedX, y: clampedY };
  }

  for (let dist = 4; dist <= 96; dist += 4) {
    const steps = 16;
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const cx = Math.max(minX, Math.min(maxX, clampedX + Math.cos(angle) * dist));
      const cy = Math.max(minY, Math.min(maxY, clampedY + Math.sin(angle) * dist));
      if (isPositionWallFree(cx, cy, radius, map)) {
        return { x: cx, y: cy };
      }
    }
  }

  return { x: clampedX, y: clampedY };
}

export function worldToMinimapCoords(
  worldX: number,
  worldY: number,
  mapWidth: number,
  mapHeight: number,
  minimapWidth: number,
  minimapHeight: number
): { x: number; y: number; normX: number; normY: number } {
  const safeW = Math.max(1, mapWidth);
  const safeH = Math.max(1, mapHeight);
  const normX = Math.max(0, Math.min(1, worldX / safeW));
  const normY = Math.max(0, Math.min(1, worldY / safeH));
  return {
    x: Math.round(normX * minimapWidth),
    y: Math.round(normY * minimapHeight),
    normX,
    normY,
  };
}

export function getCitySectorLabel(
  worldX: number,
  worldY: number,
  mapWidth: number,
  mapHeight: number
): string {
  const nx = worldX / Math.max(1, mapWidth);
  const ny = worldY / Math.max(1, mapHeight);
  if (nx >= 0.35 && nx <= 0.65 && ny >= 0.35 && ny <= 0.65) {
    return 'CENTER PLAZA';
  }
  const v = ny < 0.38 ? 'N' : ny > 0.62 ? 'S' : 'MID';
  const h = nx < 0.38 ? 'W' : nx > 0.62 ? 'E' : 'CENTER';
  if (v === 'MID' && h === 'CENTER') return 'CENTER PLAZA';
  if (v === 'MID') return `${h} AVENUE`;
  if (h === 'CENTER') return `${v} BOULEVARD`;
  return `${v}${h} SECTOR`;
}

export function resolvePlayerMovement(
  player: PlayerState,
  inputX: number,
  inputY: number,
  dt: number,
  state: MatchState,
  map: MapConfig
): { x: number; y: number; vx: number; vy: number; facing: FacingDirection } {
  const clampedDt = Math.min(Math.max(dt, 0), 0.05);

  if (
    !player.alive ||
    player.hiddenInSpotId !== null ||
    state.lifecycle === 'MATCH_COMPLETED' ||
    state.lifecycle === 'LOBBY' ||
    (player.stunRemaining ?? 0) > 0
  ) {
    return { x: player.x, y: player.y, vx: 0, vy: 0, facing: player.facing };
  }

  // Seekers are locked inside the starting area during the 10-second HIDER_HEAD_START
  const isSeekerLocked =
    player.role === 'seeker' &&
    (state.lifecycle === 'HIDER_HEAD_START' ||
      state.lifecycle === 'MATCH_INITIALIZATION' ||
      state.lifecycle === 'PLAYER_ASSIGNMENT');

  const mag = Math.hypot(inputX, inputY);
  const normX = mag > 1e-4 ? inputX / Math.max(1, mag) : 0;
  const normY = mag > 1e-4 ? inputY / Math.max(1, mag) : 0;

  const speed = getPlayerSpeed(player.role, state.config, player);
  const vx = normX * speed;
  const vy = normY * speed;

  let facing: FacingDirection = player.facing;
  if (Math.abs(vx) > Math.abs(vy) && Math.abs(vx) > 1) {
    facing = vx > 0 ? 'right' : 'left';
  } else if (Math.abs(vy) > 1) {
    facing = vy > 0 ? 'down' : 'up';
  }

  const playerRadius = 13;

  // Map outer boundary clamp
  const minX = 36;
  const maxX = map.width - 36;
  const minY = 36;
  const maxY = map.height - 36;

  if (isSeekerLocked) {
    let nextX = player.x + vx * clampedDt;
    let nextY = player.y + vy * clampedDt;
    const zone = map.seekerSpawnZone;
    nextX = Math.max(zone.x + playerRadius, Math.min(zone.x + zone.width - playerRadius, nextX));
    nextY = Math.max(zone.y + playerRadius, Math.min(zone.y + zone.height - playerRadius, nextY));
    return { x: nextX, y: nextY, vx, vy, facing };
  }

  // Depenetrate if starting position ever overlaps a wall so player can never get stuck
  const safeBase = isPositionWallFree(player.x, player.y, playerRadius, map)
    ? { x: player.x, y: player.y }
    : findNearestCollisionFreePoint(player.x, player.y, map, playerRadius + 1);

  const nextX = safeBase.x + vx * clampedDt;
  const nextY = safeBase.y + vy * clampedDt;

  // Slide collision X then Y against walls
  let candidateX = Math.max(minX, Math.min(maxX, nextX));
  for (const wall of map.walls) {
    if (circleIntersectsRect(candidateX, safeBase.y, playerRadius, wall)) {
      candidateX = safeBase.x;
      break;
    }
  }

  let candidateY = Math.max(minY, Math.min(maxY, nextY));
  for (const wall of map.walls) {
    if (circleIntersectsRect(candidateX, candidateY, playerRadius, wall)) {
      candidateY = safeBase.y;
      break;
    }
  }

  return { x: candidateX, y: candidateY, vx, vy, facing };
}

export function createInitialMatchState(
  roomCode: string,
  hostId: string,
  config: Partial<MatchConfig> = {}
): MatchState {
  const mergedConfig: MatchConfig = { ...DEFAULT_MATCH_CONFIG, ...config };
  const map = MAPS[mergedConfig.mapId];
  const hidingOccupancy: Record<string, string | null> = {};
  for (const spot of map.hidingSpots) {
    hidingOccupancy[spot.id] = null;
  }

  return {
    roomCode,
    hostId,
    lifecycle: 'LOBBY',
    config: mergedConfig,
    countdownRemaining: mergedConfig.headStartSeconds,
    elapsedMatchSeconds: 0,
    objectiveCompletedStages: 0,
    objectiveCurrentStageProgress: 0,
    objectiveActiveHiderIds: [],
    hidingOccupancy,
    players: {},
    winner: null,
    winReason: null,
    events: [],
    noisePings: [],
    objectiveProgressById: {},
    objectiveActiveIds: [],
  };
}

export function startAuthoritativeMatch(
  state: MatchState,
  preferredHostRole?: PlayerRole
): MatchState {
  const map = MAPS[state.config.mapId];
  const playerIds = Object.keys(state.players);
  if (playerIds.length < 2) {
    throw new Error('At least 2 players are required to start a match.');
  }

  // Reset hiding occupancy
  const hidingOccupancy: Record<string, string | null> = {};
  for (const spot of map.hidingSpots) {
    hidingOccupancy[spot.id] = null;
  }

  const desiredSeekers = Math.min(state.config.seekerCount, Math.max(1, playerIds.length - 1));
  const seekerIds = new Set<string>();

  if (preferredHostRole === 'seeker' && state.players[state.hostId]) {
    seekerIds.add(state.hostId);
  }

  // Prefer human or non-host players to fill seeker count deterministically or pseudo-randomly
  const candidates = playerIds.filter((id) => {
    if (seekerIds.has(id)) return false;
    if (preferredHostRole === 'hider' && id === state.hostId && playerIds.length > desiredSeekers) {
      return false;
    }
    return true;
  });

  let idx = 0;
  while (seekerIds.size < desiredSeekers && idx < candidates.length) {
    seekerIds.add(candidates[idx]);
    idx++;
  }

  let seekerIdx = 0;
  let hiderIdx = 0;

  for (const id of playerIds) {
    const p = state.players[id];
    const isSeeker = seekerIds.has(id);
    p.role = isSeeker ? 'seeker' : 'hider';
    p.alive = true;
    p.hiddenInSpotId = null;
    p.hideTimerRemaining = 0;
    p.lastExitedSpotId = null;
    p.spotCooldownRemaining = 0;
    p.rehideCooldownRemaining = 0;
    p.stunRemaining = 0;
    p.revealedRemaining = 0;
    p.sprintRemaining = 0;
    p.sprintCooldownRemaining = 0;
    p.stunKind = null;
    p.heldPower = null;
    p.heldCharges = 0;
    p.cloakRemaining = 0;
    p.shieldRemaining = 0;
    p.speedBoostRemaining = 0;
    p.interactingWithObjective = false;
    p.eliminationsCount = 0;
    p.inspectionsCount = 0;
    p.objectiveSecondsContributed = 0;
    p.lastInspectAt = 0;
    p.vx = 0;
    p.vy = 0;
    p.facing = 'down';

    if (p.isBot) {
      if (isSeeker) {
        p.botPolicy = seekerIdx % 2 === 0 ? 'patrol_seeker' : 'hunter_seeker';
        p.skinId = seekerIdx % 2 === 0 ? 'dark_knight' : 'skeleton_stalker';
      } else {
        p.botPolicy = hiderIdx % 2 === 0 ? 'stealth_hider' : 'runner_hider';
        const hiderSkins: CharacterSkinId[] = [
          'male_scout',
          'female_runner',
          'mystic_ranger',
          'toxic_slime',
          'void_slime',
        ];
        p.skinId = hiderSkins[hiderIdx % hiderSkins.length];
      }
    } else if (!p.skinId) {
      p.skinId = isSeeker ? 'dark_knight' : 'male_scout';
    }

    if (isSeeker) {
      const spawn = map.seekerSpawns[seekerIdx % map.seekerSpawns.length];
      p.x = spawn.x + (seekerIdx >= map.seekerSpawns.length ? 24 : 0);
      p.y = spawn.y;
      seekerIdx++;
    } else {
      const spawn = map.hiderSpawns[hiderIdx % map.hiderSpawns.length];
      p.x = spawn.x + (hiderIdx >= map.hiderSpawns.length ? (hiderIdx % 3) * 22 : 0);
      p.y = spawn.y;
      hiderIdx++;
    }
  }

  state.lifecycle = 'HIDER_HEAD_START';
  state.countdownRemaining = state.config.headStartSeconds;
  state.elapsedMatchSeconds = 0;
  state.objectiveCompletedStages = 0;
  state.objectiveCurrentStageProgress = 0;
  state.objectiveActiveHiderIds = [];
  state.objectiveProgressById = {};
  state.objectiveActiveIds = [];
  state.hidingOccupancy = hidingOccupancy;
  state.winner = null;
  state.winReason = null;
  state.events = [];
  state.noisePings = [];
  state.powerUps = [];
  state.mines = [];
  state.smokes = [];
  state.powerSpawnTimer = state.config.powerUpSpawnIntervalSeconds ?? 9;
  state.rngSeed = (state.rngSeed ?? hashString(`${state.roomCode}:${Date.now()}`)) || 1;
  if (state.config.powerUpsEnabled !== false) {
    // A couple of snacks are on the street from the start
    spawnPowerUp(state, map);
    spawnPowerUp(state, map);
  }
  pushMatchEvent(
    state,
    'info',
    `Match started on ${map.name}! Hiders have ${state.config.headStartSeconds}s head start.`,
    Date.now(),
    undefined,
    undefined,
    { key: 'matchStarted', params: { map: map.name, secs: state.config.headStartSeconds } }
  );

  return state;
}

export function attemptEnterHidingSpot(
  state: MatchState,
  playerId: string,
  spotId: string
): { ok: boolean; reason?: string } {
  const player = state.players[playerId];
  if (!player) return { ok: false, reason: 'Player not found.' };
  if (player.role !== 'hider') return { ok: false, reason: 'Only hiders can enter hiding places.' };
  if (!player.alive) return { ok: false, reason: 'Eliminated players cannot hide.' };
  if (
    state.lifecycle !== 'HIDER_HEAD_START' &&
    state.lifecycle !== 'SEEKER_RELEASED' &&
    state.lifecycle !== 'MATCH_ACTIVE'
  ) {
    return { ok: false, reason: 'Match is not active.' };
  }
  if (player.hiddenInSpotId !== null) {
    return { ok: false, reason: 'Already hidden in an object.' };
  }

  const map = MAPS[state.config.mapId];
  const spot = map.hidingSpots.find((s) => s.id === spotId);
  if (!spot) return { ok: false, reason: 'Invalid hiding spot.' };

  const currentOccupant = state.hidingOccupancy[spot.id];
  if (currentOccupant !== null && currentOccupant !== undefined) {
    return { ok: false, reason: 'This hiding place is already occupied!' };
  }

  if ((player.rehideCooldownRemaining ?? 0) > 0) {
    return {
      ok: false,
      reason: `Catch your breath! You can hide again in ${Math.ceil(player.rehideCooldownRemaining ?? 0)}s.`,
    };
  }

  if (
    player.lastExitedSpotId === spot.id &&
    player.spotCooldownRemaining &&
    player.spotCooldownRemaining > 0
  ) {
    return {
      ok: false,
      reason: `Wait ${Math.ceil(player.spotCooldownRemaining)}s before hiding in this same spot again!`,
    };
  }

  const spotCenterX = spot.x + spot.width / 2;
  const spotCenterY = spot.y + spot.height / 2;
  const dist = Math.hypot(player.x - spotCenterX, player.y - spotCenterY);
  if (dist > spot.interactionRange) {
    return { ok: false, reason: 'Too far from hiding place.' };
  }

  if (!hasLineOfSight(player.x, player.y, spotCenterX, spotCenterY, map.walls)) {
    return { ok: false, reason: 'Blocked by a wall.' };
  }

  state.hidingOccupancy[spot.id] = player.id;
  player.preHideX = player.x;
  player.preHideY = player.y;
  player.hiddenInSpotId = spot.id;
  player.hideTimerRemaining = state.config.maxHideDurationSeconds ?? 15;
  player.interactingWithObjective = false;
  player.vx = 0;
  player.vy = 0;
  player.x = spotCenterX;
  player.y = spotCenterY;

  return { ok: true };
}

export function attemptExitHidingSpot(
  state: MatchState,
  playerId: string,
  options: { emitNoise?: boolean } = {}
): { ok: boolean; reason?: string } {
  const player = state.players[playerId];
  if (!player) return { ok: false, reason: 'Player not found.' };
  if (!player.alive) return { ok: false, reason: 'Eliminated players cannot exit.' };
  if (!player.hiddenInSpotId) return { ok: false, reason: 'Player is not currently hidden.' };

  const spotId = player.hiddenInSpotId;
  if (state.hidingOccupancy[spotId] === player.id) {
    state.hidingOccupancy[spotId] = null;
  }
  player.hiddenInSpotId = null;
  player.hideTimerRemaining = 0;
  player.lastExitedSpotId = spotId;
  player.spotCooldownRemaining = state.config.spotReuseCooldownSeconds ?? 8;
  player.rehideCooldownRemaining = state.config.rehideCooldownSeconds ?? 3;

  const map = MAPS[state.config.mapId];
  const targetX =
    typeof player.preHideX === 'number' && Math.hypot(player.preHideX - player.x, (player.preHideY ?? player.y) - player.y) <= 96
      ? player.preHideX
      : player.x;
  const targetY =
    typeof player.preHideY === 'number' && Math.hypot((player.preHideX ?? player.x) - player.x, player.preHideY - player.y) <= 96
      ? player.preHideY
      : player.y;

  const safeExit = findNearestCollisionFreePoint(targetX, targetY, map, 14);
  player.x = safeExit.x;
  player.y = safeExit.y;
  player.preHideX = undefined;
  player.preHideY = undefined;

  if (options.emitNoise !== false) {
    emitNoisePing(state, 'exit', player.x, player.y, 1.4);
  }

  return { ok: true };
}

export function attemptDirectElimination(
  state: MatchState,
  seekerId: string,
  targetHiderId?: string,
  nowMs: number = Date.now()
): { ok: boolean; eliminatedPlayerId?: string; reason?: string } {
  const seeker = state.players[seekerId];
  if (!seeker || seeker.role !== 'seeker' || !seeker.alive) {
    return { ok: false, reason: 'Only an active seeker can eliminate hiders.' };
  }
  if (state.lifecycle !== 'SEEKER_RELEASED' && state.lifecycle !== 'MATCH_ACTIVE') {
    return { ok: false, reason: 'Seeker is still locked during countdown.' };
  }

  const map = MAPS[state.config.mapId];
  let bestTarget: PlayerState | null = null;
  let bestDist = Infinity;

  for (const candidate of Object.values(state.players)) {
    if (candidate.role !== 'hider' || !candidate.alive || candidate.hiddenInSpotId !== null) {
      continue;
    }
    if (targetHiderId && candidate.id !== targetHiderId) {
      continue;
    }
    const dist = Math.hypot(seeker.x - candidate.x, seeker.y - candidate.y);
    if (dist <= state.config.directEliminationRange && dist < bestDist) {
      if (hasLineOfSight(seeker.x, seeker.y, candidate.x, candidate.y, map.walls)) {
        bestTarget = candidate;
        bestDist = dist;
      }
    }
  }

  if (!bestTarget) {
    return { ok: false, reason: 'No visible hider within elimination range.' };
  }

  // 🛡️ Shield: blocks this catch once, bounces the hider away and stuns the seeker
  if ((bestTarget.shieldRemaining ?? 0) > 0) {
    bestTarget.shieldRemaining = 0;
    seeker.stunRemaining = state.config.shieldBlockStunSeconds ?? 1.3;
    seeker.stunKind = 'shield';
    const d = Math.max(1, Math.hypot(bestTarget.x - seeker.x, bestTarget.y - seeker.y));
    const pushX = bestTarget.x + ((bestTarget.x - seeker.x) / d) * 36;
    const pushY = bestTarget.y + ((bestTarget.y - seeker.y) / d) * 36;
    if (isPositionWallFree(pushX, pushY, 13, map)) {
      bestTarget.x = pushX;
      bestTarget.y = pushY;
    }
    emitNoisePing(state, 'flush', bestTarget.x, bestTarget.y, 1.2);
    pushMatchEvent(state, 'power', `🛡️ ${bestTarget.name}'s shield blocked ${seeker.name}!`, nowMs, bestTarget.x, bestTarget.y, {
      key: 'shieldBlocked',
      params: { hider: bestTarget.name, seeker: seeker.name },
    });
    return { ok: false, reason: 'Shield blocked the catch!' };
  }

  bestTarget.alive = false;
  bestTarget.interactingWithObjective = false;
  bestTarget.vx = 0;
  bestTarget.vy = 0;
  bestTarget.stunRemaining = 0;
  bestTarget.revealedRemaining = 0;
  seeker.eliminationsCount += 1;

  pushMatchEvent(
    state,
    'elimination',
    `${seeker.name} caught ${bestTarget.name}!`,
    nowMs,
    bestTarget.x,
    bestTarget.y,
    { key: 'caught', params: { seeker: seeker.name, hider: bestTarget.name } }
  );

  evaluateMatchWinConditions(state);
  return { ok: true, eliminatedPlayerId: bestTarget.id };
}

export function attemptInspectHidingSpot(
  state: MatchState,
  seekerId: string,
  spotId: string,
  nowMs: number = Date.now()
): {
  ok: boolean;
  foundPlayerId?: string | null;
  spotLabel?: string;
  reason?: string;
} {
  const seeker = state.players[seekerId];
  if (!seeker || seeker.role !== 'seeker' || !seeker.alive) {
    return { ok: false, reason: 'Only an active seeker can inspect hiding spots.' };
  }
  if (state.lifecycle !== 'SEEKER_RELEASED' && state.lifecycle !== 'MATCH_ACTIVE') {
    return { ok: false, reason: 'Seeker cannot inspect during the head-start countdown.' };
  }
  if (nowMs - seeker.lastInspectAt < state.config.inspectCooldownMs) {
    return { ok: false, reason: 'Inspection on cooldown.' };
  }

  const map = MAPS[state.config.mapId];
  const spot = map.hidingSpots.find((s) => s.id === spotId);
  if (!spot || !spot.canInspect) {
    return { ok: false, reason: 'Object cannot be inspected.' };
  }

  const spotCenterX = spot.x + spot.width / 2;
  const spotCenterY = spot.y + spot.height / 2;
  const dist = Math.hypot(seeker.x - spotCenterX, seeker.y - spotCenterY);
  if (dist > spot.interactionRange) {
    return { ok: false, reason: 'Too far to inspect this object.' };
  }
  if (!hasLineOfSight(seeker.x, seeker.y, spotCenterX, spotCenterY, map.walls)) {
    return { ok: false, reason: 'Cannot inspect through walls.' };
  }

  seeker.lastInspectAt = nowMs;
  seeker.inspectionsCount += 1;
  // Opening an object takes time: the seeker is rooted while searching.
  seeker.stunRemaining = state.config.inspectRecoverySeconds ?? 0.9;
  seeker.stunKind = 'search';

  const occupantId = state.hidingOccupancy[spot.id];
  if (occupantId && state.players[occupantId] && state.players[occupantId].alive) {
    // FLUSH: the hider is dragged out into the open, briefly stunned and revealed.
    // Hiders are still never eliminated *inside* an object — the seeker must catch them.
    const hider = state.players[occupantId];
    attemptExitHidingSpot(state, hider.id, { emitNoise: false });
    hider.stunRemaining = state.config.flushStunSeconds ?? 0.6;
    hider.stunKind = 'flush';
    hider.cloakRemaining = 0;
    hider.revealedRemaining = state.config.flushRevealSeconds ?? 3;
    hider.revealedById = seeker.id;
    emitNoisePing(state, 'flush', hider.x, hider.y, 1.8);
    pushMatchEvent(
      state,
      'flush',
      `${seeker.name} flushed ${hider.name} out of ${spot.label}!`,
      nowMs,
      hider.x,
      hider.y,
      { key: 'flushed', params: { seeker: seeker.name, hider: hider.name, spot: spot.label } }
    );
    return { ok: true, foundPlayerId: hider.id, spotLabel: spot.label };
  }

  pushMatchEvent(state, 'inspect_empty', `${seeker.name} checked ${spot.label} — Empty.`, nowMs, spotCenterX, spotCenterY, {
    key: 'inspectEmpty',
    params: { seeker: seeker.name, spot: spot.label },
  });

  return { ok: true, foundPlayerId: null, spotLabel: spot.label };
}

/** Nearest escape beacon to a point, with its distance. */
export function getNearestObjective(
  map: MapConfig,
  x: number,
  y: number
): { objective: ObjectiveConfig; dist: number } {
  let best = map.objective;
  let bestDist = Math.hypot(x - best.x, y - best.y);
  for (const obj of getMapObjectives(map)) {
    const d = Math.hypot(x - obj.x, y - obj.y);
    if (d < bestDist) {
      best = obj;
      bestDist = d;
    }
  }
  return { objective: best, dist: bestDist };
}

export function setObjectiveInteraction(
  state: MatchState,
  playerId: string,
  active: boolean
): { ok: boolean; reason?: string } {
  const player = state.players[playerId];
  if (!player) return { ok: false, reason: 'Player not found.' };
  if (!active) {
    player.interactingWithObjective = false;
    player.objectiveId = null;
    return { ok: true };
  }
  if (player.role !== 'hider' || !player.alive || player.hiddenInSpotId !== null) {
    player.interactingWithObjective = false;
    return { ok: false, reason: 'Only unhidden living hiders can activate the objective.' };
  }
  if (
    state.lifecycle !== 'HIDER_HEAD_START' &&
    state.lifecycle !== 'SEEKER_RELEASED' &&
    state.lifecycle !== 'MATCH_ACTIVE'
  ) {
    player.interactingWithObjective = false;
    return { ok: false, reason: 'Match is not active.' };
  }

  const map = MAPS[state.config.mapId];
  const { objective, dist } = getNearestObjective(map, player.x, player.y);
  if (dist > objective.interactionRange) {
    player.interactingWithObjective = false;
    player.objectiveId = null;
    return { ok: false, reason: 'Too far from an Escape Beacon.' };
  }

  player.interactingWithObjective = true;
  player.objectiveId = objective.id;
  return { ok: true };
}

export function evaluateMatchWinConditions(state: MatchState, nowMs: number = Date.now()): void {
  if (state.lifecycle === 'MATCH_COMPLETED' || state.lifecycle === 'LOBBY') {
    return;
  }

  const hiders = Object.values(state.players).filter((p) => p.role === 'hider');
  const livingHiders = hiders.filter((p) => p.alive);

  const finish = (
    winner: 'hiders' | 'seekers',
    reason: string,
    eventMessage: string,
    key: string,
    params: Record<string, string | number> = {}
  ) => {
    state.lifecycle = 'MATCH_COMPLETED';
    state.winner = winner;
    state.winReason = reason;
    state.winReasonKey = key;
    state.winReasonParams = params;
    state.objectiveCurrentStageProgress = 0;
    state.objectiveActiveHiderIds = [];
    pushMatchEvent(state, 'victory', eventMessage, nowMs, undefined, undefined, { key: `${key}Event`, params });
  };

  // 1. If all hiders are eliminated, seekers win immediately
  if (hiders.length > 0 && livingHiders.length === 0) {
    finish('seekers', 'Every hider was discovered and eliminated!', 'SEEKER VICTORY — All hiders have been eliminated!', 'winAllCaught');
    return;
  }

  // 2. If all objective stages are completed and at least 1 hider is alive, hiders win
  if (livingHiders.length > 0 && state.objectiveCompletedStages >= state.config.objectiveTotalStages) {
    finish(
      'hiders',
      `Hiders completed all ${state.config.objectiveTotalStages} City-Center Beacon stages!`,
      `HIDER VICTORY — Escape Beacon fully transmitted (${state.config.objectiveTotalStages}/${state.config.objectiveTotalStages} Stages)!`,
      'winEscaped',
      { total: state.config.objectiveTotalStages }
    );
    return;
  }

  // 3. Round timer: hiders must have made beacon progress to win on time (no pure stalling).
  if (
    state.config.survivalTimerEnabled &&
    livingHiders.length > 0 &&
    state.elapsedMatchSeconds >= state.config.survivalTimerSeconds
  ) {
    const minStages = state.config.timeoutHiderMinStages ?? 0;
    if (state.objectiveCompletedStages >= minStages) {
      finish('hiders', 'Hiders survived the clock with the beacon signal partly sent!', 'HIDER VICTORY — Survived the full match timer!', 'winSurvived');
    } else {
      finish(
        'seekers',
        `Time's up! Hiders never transmitted a beacon stage (${minStages} needed).`,
        'SEEKER VICTORY — Hiders stalled and the beacon stayed dark!',
        'winStalled',
        { n: minStages }
      );
    }
  }
}

export function stepAuthoritativeMatch(
  state: MatchState,
  dt: number,
  nowMs: number = Date.now()
): void {
  const clampedDt = Math.min(Math.max(dt, 0), 0.1);
  if (
    state.lifecycle !== 'HIDER_HEAD_START' &&
    state.lifecycle !== 'SEEKER_RELEASED' &&
    state.lifecycle !== 'MATCH_ACTIVE'
  ) {
    return;
  }

  const map = MAPS[state.config.mapId];

  // Update head start countdown
  if (state.lifecycle === 'HIDER_HEAD_START') {
    state.countdownRemaining = Math.max(0, state.countdownRemaining - clampedDt);
    if (state.countdownRemaining <= 0) {
      state.countdownRemaining = 0;
      state.lifecycle = 'MATCH_ACTIVE';
      pushMatchEvent(state, 'info', 'THE SEEKER IS RELEASED! Hunt begins now!', nowMs, undefined, undefined, { key: 'released' });
    }
  } else {
    state.elapsedMatchSeconds += clampedDt;
  }

  // Decay world noise pings
  if (state.noisePings && state.noisePings.length > 0) {
    for (const ping of state.noisePings) ping.ttl -= clampedDt;
    state.noisePings = state.noisePings.filter((pg) => pg.ttl > 0);
  }

  // Tick player timers: cooldowns, stun, reveal and the max-hide timer
  const maxHideSecs = state.config.maxHideDurationSeconds ?? 15;
  for (const player of Object.values(state.players)) {
    if (player.spotCooldownRemaining && player.spotCooldownRemaining > 0) {
      player.spotCooldownRemaining = Math.max(0, player.spotCooldownRemaining - clampedDt);
      if (player.spotCooldownRemaining <= 0) {
        player.lastExitedSpotId = null;
      }
    }
    if (player.rehideCooldownRemaining && player.rehideCooldownRemaining > 0) {
      player.rehideCooldownRemaining = Math.max(0, player.rehideCooldownRemaining - clampedDt);
    }
    if (player.stunRemaining && player.stunRemaining > 0) {
      player.stunRemaining = Math.max(0, player.stunRemaining - clampedDt);
    }
    if (player.stunRemaining !== undefined && player.stunRemaining <= 0) player.stunKind = null;
    if (player.cloakRemaining && player.cloakRemaining > 0) {
      player.cloakRemaining = Math.max(0, player.cloakRemaining - clampedDt);
    }
    if (player.shieldRemaining && player.shieldRemaining > 0) {
      player.shieldRemaining = Math.max(0, player.shieldRemaining - clampedDt);
    }
    if (player.speedBoostRemaining && player.speedBoostRemaining > 0) {
      player.speedBoostRemaining = Math.max(0, player.speedBoostRemaining - clampedDt);
    }
    if (player.sprintRemaining && player.sprintRemaining > 0) {
      player.sprintRemaining = Math.max(0, player.sprintRemaining - clampedDt);
    }
    if (player.sprintCooldownRemaining && player.sprintCooldownRemaining > 0) {
      player.sprintCooldownRemaining = Math.max(0, player.sprintCooldownRemaining - clampedDt);
    }
    if (player.revealedRemaining && player.revealedRemaining > 0) {
      player.revealedRemaining = Math.max(0, player.revealedRemaining - clampedDt);
    }

    // The max-hide clock only runs once the seekers are hunting (hiding during the head start is free).
    if (
      player.alive &&
      player.role === 'hider' &&
      player.hiddenInSpotId !== null &&
      state.lifecycle !== 'HIDER_HEAD_START'
    ) {
      const prevRem =
        typeof player.hideTimerRemaining === 'number' ? player.hideTimerRemaining : maxHideSecs;
      const nextRem = Math.max(0, prevRem - clampedDt);
      player.hideTimerRemaining = nextRem;

      // The hiding object starts rustling 3s before the hider is forced out — an audible tell.
      if (prevRem > 3 && nextRem <= 3) {
        emitNoisePing(state, 'rustle', player.x, player.y, 3);
      }

      if (nextRem <= 0) {
        const expiredSpotId = player.hiddenInSpotId;
        const spotObj = map.hidingSpots.find((s) => s.id === expiredSpotId);
        attemptExitHidingSpot(state, player.id);
        pushMatchEvent(
          state,
          'hide',
          `${player.name}'s ${maxHideSecs}s hide timer expired at ${spotObj?.label || 'hiding spot'}!`,
          nowMs,
          player.x,
          player.y,
          { key: 'hideExpired', params: { hider: player.name, secs: maxHideSecs, spot: spotObj?.label || '' } }
        );
      }
    }
  }

  stepPowerUps(state, clampedDt, nowMs, map);

  // Validate objective interaction for all living hiders (per beacon)
  const objectives = getMapObjectives(map);
  const holdersByObjective: Record<string, string[]> = {};
  const activeHolders: string[] = [];
  for (const player of Object.values(state.players)) {
    if (!player.interactingWithObjective) continue;
    const obj = objectives.find((o) => o.id === player.objectiveId) ?? getNearestObjective(map, player.x, player.y).objective;
    const dist = Math.hypot(player.x - obj.x, player.y - obj.y);
    if (
      player.role !== 'hider' ||
      !player.alive ||
      player.hiddenInSpotId !== null ||
      dist > obj.interactionRange
    ) {
      player.interactingWithObjective = false;
      player.objectiveId = null;
    } else {
      player.objectiveId = obj.id;
      (holdersByObjective[obj.id] ??= []).push(player.id);
      activeHolders.push(player.id);
      player.objectiveSecondsContributed += clampedDt;
    }
  }

  state.objectiveActiveHiderIds = activeHolders;
  state.objectiveActiveIds = Object.keys(holdersByObjective);
  const progress = (state.objectiveProgressById ??= {});

  // Objective progress: N global stages; each stage needs uninterrupted seconds at ONE beacon.
  if (state.objectiveCompletedStages < state.config.objectiveTotalStages) {
    let completedAt: ObjectiveConfig | null = null;
    for (const obj of objectives) {
      if (holdersByObjective[obj.id]) {
        const before = progress[obj.id] ?? 0;
        progress[obj.id] = before + clampedDt;
        // Quiet for the first `interval * 2` seconds, then the antenna hums loudly every `interval`.
        const interval = state.config.beaconNoiseIntervalSeconds ?? 3;
        if (
          progress[obj.id] >= interval * 2 &&
          Math.floor(before / interval) !== Math.floor(progress[obj.id] / interval)
        ) {
          emitNoisePing(state, 'beacon', obj.x, obj.y, 2.2);
        }
        if (!completedAt && progress[obj.id] >= state.config.objectiveStageDurationSeconds) {
          completedAt = obj;
        }
      } else {
        // Interruption resets this beacon's current stage, completed stages are kept
        progress[obj.id] = 0;
      }
    }
    if (completedAt) {
      state.objectiveCompletedStages += 1;
      for (const obj of objectives) progress[obj.id] = 0;
      pushMatchEvent(
        state,
        'objective_stage',
        `Escape Stage ${state.objectiveCompletedStages}/${state.config.objectiveTotalStages} sent from ${completedAt.label}!`,
        nowMs,
        completedAt.x,
        completedAt.y,
        {
          key: 'stageDone',
          params: { n: state.objectiveCompletedStages, total: state.config.objectiveTotalStages, beacon: completedAt.label },
        }
      );
    }
  }
  let maxProgress = 0;
  for (const v of Object.values(progress)) maxProgress = Math.max(maxProgress, v);
  state.objectiveCurrentStageProgress = maxProgress;

  evaluateMatchWinConditions(state, nowMs);
}

/** Center point of a hiding spot. */
export function getSpotCenter(spot: HidingSpotConfig): { x: number; y: number } {
  return { x: spot.x + spot.width / 2, y: spot.y + spot.height / 2 };
}

/**
 * Perception model shared by the renderer, the bots and the server's anti-cheat filter.
 * - Teammates always know where each other are.
 * - Hidden enemies are never perceived.
 * - Revealed (flushed) hiders are perceived by every seeker.
 * - Otherwise: inside vision radius with clear line-of-sight, or a MOVING enemy inside hearing radius.
 */
export function canPerceive(
  state: MatchState,
  viewer: PlayerState,
  target: PlayerState,
  map: MapConfig = MAPS[state.config.mapId]
): boolean {
  if (viewer.id === target.id) return true;
  if (viewer.role === target.role) return true;
  if (!target.alive) return true;
  if (target.hiddenInSpotId !== null) return false;
  if (
    target.role === 'hider' &&
    (target.revealedRemaining ?? 0) > 0 &&
    (!target.revealedById || target.revealedById === viewer.id)
  ) {
    return true;
  }
  // During the head start everyone knows the seekers are locked in the precinct.
  if (target.role === 'seeker' && state.lifecycle === 'HIDER_HEAD_START') return true;

  const cfg = state.config;
  const vision = viewer.role === 'seeker' ? cfg.seekerVisionRadius ?? 300 : cfg.hiderVisionRadius ?? 340;
  const hearing = viewer.role === 'seeker' ? cfg.seekerHearingRadius ?? 130 : cfg.hiderHearingRadius ?? 240;
  const dist = Math.hypot(viewer.x - target.x, viewer.y - target.y);

  // 👻 Cloaked hiders are invisible and silent unless the seeker is right on top of them
  if (target.role === 'hider' && (target.cloakRemaining ?? 0) > 0) {
    return dist <= (cfg.cloakRevealRadius ?? 55) && hasLineOfSight(viewer.x, viewer.y, target.x, target.y, map.walls);
  }

  // 💨 Smoke blocks seekers' sight (not their hearing)
  const smokeBlocked =
    viewer.role === 'seeker' && isSightBlockedBySmoke(state, viewer.x, viewer.y, target.x, target.y);

  if (!smokeBlocked && dist <= vision && hasLineOfSight(viewer.x, viewer.y, target.x, target.y, map.walls)) {
    return true;
  }
  const moving = Math.hypot(target.vx, target.vy) > 1;
  return moving && dist <= hearing;
}

/**
 * Anti-cheat: build the state a specific client is allowed to receive.
 * Seekers never learn hiding-spot occupancy or the position of hiders they cannot perceive;
 * hiders never learn the position of seekers they cannot perceive. Eliminated players spectate with full info.
 */
export function filterStateForViewer(state: MatchState, viewerId: string): MatchState {
  const viewer = state.players[viewerId];
  const active =
    state.lifecycle === 'HIDER_HEAD_START' ||
    state.lifecycle === 'SEEKER_RELEASED' ||
    state.lifecycle === 'MATCH_ACTIVE';
  if (!viewer || !viewer.alive || !active) {
    return state;
  }

  const map = MAPS[state.config.mapId];
  const players: Record<string, PlayerState> = {};
  for (const [id, p] of Object.entries(state.players)) {
    if (canPerceive(state, viewer, p, map)) {
      players[id] = p;
    } else {
      players[id] = {
        ...p,
        x: -10000,
        y: -10000,
        vx: 0,
        vy: 0,
        hiddenInSpotId: null,
        hideTimerRemaining: 0,
        preHideX: undefined,
        preHideY: undefined,
        interactingWithObjective: false,
        masked: true,
      };
    }
  }

  let hidingOccupancy = state.hidingOccupancy;
  if (viewer.role === 'seeker') {
    hidingOccupancy = {};
    for (const spotId of Object.keys(state.hidingOccupancy)) hidingOccupancy[spotId] = null;
  }

  // Mines are secret hider traps
  const mines = viewer.role === 'seeker' ? [] : state.mines;

  return { ...state, players, hidingOccupancy, mines };
}

/**
 * Contextual interaction helper for UI and Mobile Controls:
 * Returns ONLY the valid contextual actions for the player's current role, distance, and state.
 */
export interface ContextualActionPrompt {
  action: 'hide' | 'exit_hide' | 'objective' | 'inspect' | 'eliminate';
  label: string;
  sublabel: string;
  targetId?: string;
}

export function getAvailableContextualActions(
  state: MatchState,
  playerId: string,
  nowMs: number = Date.now()
): ContextualActionPrompt[] {
  const player = state.players[playerId];
  if (!player || !player.alive || player.masked) return [];
  if (
    state.lifecycle !== 'HIDER_HEAD_START' &&
    state.lifecycle !== 'SEEKER_RELEASED' &&
    state.lifecycle !== 'MATCH_ACTIVE'
  ) {
    return [];
  }

  const map = MAPS[state.config.mapId];
  const actions: ContextualActionPrompt[] = [];

  if (player.role === 'hider') {
    if (player.hiddenInSpotId) {
      const spot = map.hidingSpots.find((s) => s.id === player.hiddenInSpotId);
      const maxHide = state.config.maxHideDurationSeconds ?? 15;
      const remSec = Math.ceil(player.hideTimerRemaining ?? maxHide);
      actions.push({
        action: 'exit_hide',
        label: `Exit Hiding (${remSec}s left)`,
        sublabel: spot
          ? `${spot.label} · Auto-exits after ${maxHide}s`
          : `Safe while hidden · Auto-exits after ${maxHide}s`,
        targetId: player.hiddenInSpotId,
      });
      return actions;
    }

    // Check nearest available hiding spot (none while catching breath after leaving a spot)
    let nearestSpot: HidingSpotConfig | null = null;
    let nearestSpotDist = Infinity;
    const canHideNow = (player.rehideCooldownRemaining ?? 0) <= 0 && (player.stunRemaining ?? 0) <= 0;
    for (const spot of canHideNow ? map.hidingSpots : []) {
      if (state.hidingOccupancy[spot.id] !== null) continue;
      if (
        player.lastExitedSpotId === spot.id &&
        player.spotCooldownRemaining &&
        player.spotCooldownRemaining > 0
      ) {
        continue;
      }
      const cx = spot.x + spot.width / 2;
      const cy = spot.y + spot.height / 2;
      const dist = Math.hypot(player.x - cx, player.y - cy);
      if (
        dist <= spot.interactionRange &&
        dist < nearestSpotDist &&
        hasLineOfSight(player.x, player.y, cx, cy, map.walls)
      ) {
        nearestSpot = spot;
        nearestSpotDist = dist;
      }
    }
    if (nearestSpot) {
      actions.push({
        action: 'hide',
        label: `Hide in ${nearestSpot.label}`,
        sublabel: `Safe from Killer for up to ${state.config.maxHideDurationSeconds ?? 15}s`,
        targetId: nearestSpot.id,
      });
    }

    // Check distance to the nearest Escape Beacon
    const { objective: nearObj, dist: objDist } = getNearestObjective(map, player.x, player.y);
    if (
      objDist <= nearObj.interactionRange &&
      state.objectiveCompletedStages < state.config.objectiveTotalStages
    ) {
      const nextStage = state.objectiveCompletedStages + 1;
      const prog = state.objectiveProgressById?.[nearObj.id] ?? 0;
      actions.push({
        action: 'objective',
        label: player.interactingWithObjective
          ? `Transmitting Stage ${nextStage}/${state.config.objectiveTotalStages}...`
          : `Hold Beacon (Stage ${nextStage}/${state.config.objectiveTotalStages})`,
        sublabel: `${Math.ceil(state.config.objectiveStageDurationSeconds - prog)}s uninterrupted${
          nearObj.id === map.objective.id ? '' : ' · Relay'
        }`,
        targetId: nearObj.id,
      });
    }
  } else if (player.role === 'seeker') {
    if (state.lifecycle === 'HIDER_HEAD_START') {
      return [];
    }

    // Check for living visible (unhidden) hider in direct elimination range
    let nearestHider: PlayerState | null = null;
    let nearestHiderDist = Infinity;
    for (const other of Object.values(state.players)) {
      if (other.role !== 'hider' || !other.alive || other.hiddenInSpotId !== null) continue;
      const dist = Math.hypot(player.x - other.x, player.y - other.y);
      if (
        dist <= state.config.directEliminationRange &&
        dist < nearestHiderDist &&
        hasLineOfSight(player.x, player.y, other.x, other.y, map.walls)
      ) {
        nearestHider = other;
        nearestHiderDist = dist;
      }
    }
    if (nearestHider) {
      actions.push({
        action: 'eliminate',
        label: `Catch ${nearestHider.name}`,
        sublabel: 'Direct close-range catch in the open',
        targetId: nearestHider.id,
      });
    }

    // Inspect the nearest hiding object (flushes out anyone inside)
    if (nowMs - player.lastInspectAt >= state.config.inspectCooldownMs) {
      let nearestSpot: HidingSpotConfig | null = null;
      let nearestSpotDist = Infinity;
      for (const spot of map.hidingSpots) {
        if (!spot.canInspect) continue;
        const c = getSpotCenter(spot);
        const dist = Math.hypot(player.x - c.x, player.y - c.y);
        if (
          dist <= spot.interactionRange &&
          dist < nearestSpotDist &&
          hasLineOfSight(player.x, player.y, c.x, c.y, map.walls)
        ) {
          nearestSpot = spot;
          nearestSpotDist = dist;
        }
      }
      if (nearestSpot) {
        actions.push({
          action: 'inspect',
          label: `Search ${nearestSpot.label}`,
          sublabel: 'Flushes out any hider inside',
          targetId: nearestSpot.id,
        });
      }
    }
  }

  return actions;
}


// ───────────────────────────── Edible power-ups ─────────────────────────────

export function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic RNG stored in the match state (mulberry32) so spawns are reproducible in tests/sims. */
export function nextRandom(state: MatchState): number {
  let t = ((state.rngSeed ?? 1) + 0x6d2b79f5) >>> 0;
  state.rngSeed = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

let pickupSeq = 0;

/** Drop one random snack on an open street tile away from the seeker precinct and other snacks. */
export function spawnPowerUp(state: MatchState, map: MapConfig = MAPS[state.config.mapId]): PowerPickup | null {
  const list = (state.powerUps ??= []);
  if (list.length >= (state.config.powerUpMaxOnMap ?? 4)) return null;
  const zone = map.seekerSpawnZone;
  const zoneX = zone.x + zone.width / 2;
  const zoneY = zone.y + zone.height / 2;
  for (let attempt = 0; attempt < 60; attempt++) {
    const x = 60 + nextRandom(state) * (map.width - 120);
    const y = 60 + nextRandom(state) * (map.height - 120);
    if (!isPositionWallFree(x, y, 20, map)) continue;
    if (Math.hypot(x - zoneX, y - zoneY) < 300) continue;
    if (list.some((p) => Math.hypot(p.x - x, p.y - y) < 260)) continue;
    if (map.hidingSpots.some((sp) => Math.hypot(sp.x + sp.width / 2 - x, sp.y + sp.height / 2 - y) < 50)) continue;
    const kind = POWER_KINDS[Math.floor(nextRandom(state) * POWER_KINDS.length) % POWER_KINDS.length];
    pickupSeq = (pickupSeq + 1) % 1_000_000;
    const pickup: PowerPickup = { id: pickupSeq, kind, x: Math.round(x), y: Math.round(y) };
    list.push(pickup);
    return pickup;
  }
  return null;
}

export function isSightBlockedBySmoke(state: MatchState, x1: number, y1: number, x2: number, y2: number): boolean {
  for (const s of state.smokes ?? []) {
    const r = s.radius;
    // point inside the cloud
    if (Math.hypot(x2 - s.x, y2 - s.y) <= r || Math.hypot(x1 - s.x, y1 - s.y) <= r * 0.5) return true;
    // segment passes through the cloud
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((s.x - x1) * dx + (s.y - y1) * dy) / len2));
    if (Math.hypot(x1 + dx * t - s.x, y1 + dy * t - s.y) <= r) return true;
  }
  return false;
}

let mineSeq = 0;
let smokeSeq = 0;

/** Advance snack spawning, eating, mines and smoke. Called from `stepAuthoritativeMatch`. */
export function stepPowerUps(state: MatchState, dt: number, nowMs: number, map: MapConfig): void {
  const cfg = state.config;
  if (cfg.powerUpsEnabled === false) return;

  // Spawn new snacks over time
  state.powerSpawnTimer = (state.powerSpawnTimer ?? cfg.powerUpSpawnIntervalSeconds) - dt;
  if (state.powerSpawnTimer <= 0) {
    state.powerSpawnTimer = cfg.powerUpSpawnIntervalSeconds ?? 9;
    spawnPowerUp(state, map);
  }

  // Hiders eat snacks they walk over (one held power at a time)
  const pickups = state.powerUps ?? [];
  for (let i = pickups.length - 1; i >= 0; i--) {
    const pu = pickups[i];
    for (const p of Object.values(state.players)) {
      if (p.role !== 'hider' || !p.alive || p.hiddenInSpotId || p.heldPower) continue;
      if (Math.hypot(p.x - pu.x, p.y - pu.y) <= 26) {
        p.heldPower = pu.kind;
        p.heldCharges = pu.kind === 'mines' ? cfg.minesPerPickup ?? 2 : 1;
        pickups.splice(i, 1);
        break;
      }
    }
  }

  // Mines: arm, expire, and trigger on seekers
  const mines = (state.mines ??= []);
  for (let i = mines.length - 1; i >= 0; i--) {
    const m = mines[i];
    m.ttl -= dt;
    m.armDelay = Math.max(0, m.armDelay - dt);
    if (m.ttl <= 0) {
      mines.splice(i, 1);
      continue;
    }
    if (m.armDelay > 0) continue;
    for (const s of Object.values(state.players)) {
      if (s.role !== 'seeker' || !s.alive) continue;
      if (Math.hypot(s.x - m.x, s.y - m.y) <= (cfg.mineTriggerRadius ?? 30)) {
        s.stunRemaining = Math.max(s.stunRemaining ?? 0, cfg.mineStunSeconds ?? 2.5);
        s.stunKind = 'mine';
        s.vx = 0;
        s.vy = 0;
        mines.splice(i, 1);
        emitNoisePing(state, 'flush', m.x, m.y, 1.5);
        pushMatchEvent(state, 'power', `💣 ${s.name} stepped on a mine!`, nowMs, m.x, m.y, {
          key: 'mineHit',
          params: { seeker: s.name },
        });
        break;
      }
    }
  }

  // Smoke clouds fade
  const smokes = (state.smokes ??= []);
  for (let i = smokes.length - 1; i >= 0; i--) {
    smokes[i].ttl -= dt;
    if (smokes[i].ttl <= 0) smokes.splice(i, 1);
  }
}

/** Activate the eaten snack. Server-validated; the client only sends the intent. */
export function attemptUsePower(
  state: MatchState,
  playerId: string,
  _nowMs: number = Date.now()
): { ok: boolean; kind?: PowerKind; reason?: string } {
  const p = state.players[playerId];
  if (!p || p.role !== 'hider' || !p.alive) return { ok: false, reason: 'Only living hiders can use powers.' };
  if (state.lifecycle !== 'HIDER_HEAD_START' && state.lifecycle !== 'SEEKER_RELEASED' && state.lifecycle !== 'MATCH_ACTIVE') {
    return { ok: false, reason: 'Match is not active.' };
  }
  const kind = p.heldPower;
  if (!kind) return { ok: false, reason: 'No power to use — eat a snack first!' };
  if (p.hiddenInSpotId) return { ok: false, reason: 'Leave your hiding spot first.' };
  if ((p.stunRemaining ?? 0) > 0) return { ok: false, reason: 'Stunned.' };
  const cfg = state.config;

  switch (kind) {
    case 'cloak':
      p.cloakRemaining = cfg.cloakSeconds ?? 8;
      p.revealedRemaining = 0;
      break;
    case 'shield':
      p.shieldRemaining = cfg.shieldSeconds ?? 12;
      break;
    case 'speed':
      p.speedBoostRemaining = cfg.speedBoostSeconds ?? 10;
      break;
    case 'smoke': {
      smokeSeq = (smokeSeq + 1) % 1_000_000;
      const ttl = cfg.smokeSeconds ?? 7;
      (state.smokes ??= []).push({ id: smokeSeq, x: p.x, y: p.y, radius: cfg.smokeRadius ?? 130, ttl, maxTtl: ttl });
      break;
    }
    case 'mines': {
      mineSeq = (mineSeq + 1) % 1_000_000;
      (state.mines ??= []).push({ id: mineSeq, ownerId: p.id, x: p.x, y: p.y + 6, ttl: cfg.mineSeconds ?? 15, armDelay: 0.6 });
      break;
    }
  }

  p.heldCharges = Math.max(0, (p.heldCharges ?? 1) - 1);
  if (p.heldCharges <= 0) {
    p.heldPower = null;
    p.heldCharges = 0;
  }
  return { ok: true, kind };
}
