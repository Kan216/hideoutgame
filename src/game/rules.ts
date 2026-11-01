import { MAPS } from './maps.ts';
import type { MapConfig, MapId, HidingSpotConfig, WallRect, CharacterSkinId } from './maps.ts';

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
  eliminationsCount: number;
  inspectionsCount: number;
  objectiveSecondsContributed: number;
  lastInspectAt: number;
  connected: boolean;
  colorIndex: number;
  activeEmote?: { text: string; expiresAt: number } | null;
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
}

export interface MatchEventLog {
  id: string;
  timestamp: number;
  type: 'info' | 'hide' | 'inspect_empty' | 'elimination' | 'objective_stage' | 'victory';
  message: string;
  x?: number;
  y?: number;
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
  hidingOccupancy: Record<string, string | null>; // spotId -> playerId | null
  players: Record<string, PlayerState>;
  winner: 'hiders' | 'seekers' | null;
  winReason: string | null;
  events: MatchEventLog[];
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
  inspectCooldownMs: 600,
  survivalTimerEnabled: true,
  survivalTimerSeconds: 240,
};

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

export function getPlayerSpeed(role: PlayerRole, config: MatchConfig = DEFAULT_MATCH_CONFIG): number {
  if (role === 'seeker') {
    return config.hiderBaseSpeed * config.seekerSpeedMultiplier;
  }
  return config.hiderBaseSpeed;
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
  const steps = 16;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;
    if (px >= rect.x && px <= rect.x + rect.width && py >= rect.y && py <= rect.y + rect.height) {
      return true;
    }
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
    state.lifecycle === 'LOBBY'
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

  const speed = getPlayerSpeed(player.role, state.config);
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
  state.hidingOccupancy = hidingOccupancy;
  state.winner = null;
  state.winReason = null;
  state.events = [
    {
      id: `evt_${Date.now()}_start`,
      timestamp: Date.now(),
      type: 'info',
      message: `Match started on ${map.name}! Hiders have ${state.config.headStartSeconds}s head start.`,
    },
  ];

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
  playerId: string
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
  player.spotCooldownRemaining = 4;

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

  return { ok: true };
}

export function attemptDirectElimination(
  state: MatchState,
  seekerId: string,
  targetHiderId?: string
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

  bestTarget.alive = false;
  bestTarget.interactingWithObjective = false;
  bestTarget.vx = 0;
  bestTarget.vy = 0;
  seeker.eliminationsCount += 1;

  state.events.unshift({
    id: `evt_${Date.now()}_elim_${bestTarget.id}`,
    timestamp: Date.now(),
    type: 'elimination',
    message: `${seeker.name} caught ${bestTarget.name} in the open!`,
    x: bestTarget.x,
    y: bestTarget.y,
  });

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

  const occupantId = state.hidingOccupancy[spot.id];
  if (occupantId && state.players[occupantId] && state.players[occupantId].alive) {
    const hider = state.players[occupantId];
    const rem = Math.ceil(hider.hideTimerRemaining ?? state.config.maxHideDurationSeconds);
    state.events.unshift({
      id: `evt_${nowMs}_inspect_safe_${hider.id}`,
      timestamp: nowMs,
      type: 'info',
      message: `${hider.name} is locked inside ${spot.label} (Protected for ${rem}s)!`,
      x: spotCenterX,
      y: spotCenterY,
    });
    return {
      ok: false,
      foundPlayerId: null,
      spotLabel: spot.label,
      reason: 'Hiders cannot be killed while hidden! Wait for their 15s hide timer to expire.',
    };
  }

  state.events.unshift({
    id: `evt_${nowMs}_inspect_empty_${spot.id}`,
    timestamp: nowMs,
    type: 'inspect_empty',
    message: `${seeker.name} checked ${spot.label} — Empty.`,
    x: spotCenterX,
    y: spotCenterY,
  });

  return { ok: true, foundPlayerId: null, spotLabel: spot.label };
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
  const dist = Math.hypot(player.x - map.objective.x, player.y - map.objective.y);
  if (dist > map.objective.interactionRange) {
    player.interactingWithObjective = false;
    return { ok: false, reason: 'Too far from the City-Center Beacon.' };
  }

  player.interactingWithObjective = true;
  return { ok: true };
}

export function evaluateMatchWinConditions(state: MatchState): void {
  if (state.lifecycle === 'MATCH_COMPLETED' || state.lifecycle === 'LOBBY') {
    return;
  }

  const hiders = Object.values(state.players).filter((p) => p.role === 'hider');
  const livingHiders = hiders.filter((p) => p.alive);

  // 1. If all hiders are eliminated, seekers win immediately
  if (hiders.length > 0 && livingHiders.length === 0) {
    state.lifecycle = 'MATCH_COMPLETED';
    state.winner = 'seekers';
    state.winReason = 'Every hider was discovered and eliminated!';
    state.objectiveCurrentStageProgress = 0;
    state.objectiveActiveHiderIds = [];
    state.events.unshift({
      id: `evt_${Date.now()}_win_seekers`,
      timestamp: Date.now(),
      type: 'victory',
      message: 'SEEKER VICTORY — All hiders have been eliminated!',
    });
    return;
  }

  // 2. If all 3 objective stages are completed and at least 1 hider is alive, hiders win
  if (
    livingHiders.length > 0 &&
    state.objectiveCompletedStages >= state.config.objectiveTotalStages
  ) {
    state.lifecycle = 'MATCH_COMPLETED';
    state.winner = 'hiders';
    state.winReason = `Hiders completed all ${state.config.objectiveTotalStages} City-Center Beacon stages!`;
    state.objectiveCurrentStageProgress = 0;
    state.objectiveActiveHiderIds = [];
    state.events.unshift({
      id: `evt_${Date.now()}_win_hiders_obj`,
      timestamp: Date.now(),
      type: 'victory',
      message: 'HIDER VICTORY — Escape Beacon fully transmitted (3/3 Stages)!',
    });
    return;
  }

  // 3. Optional survival timer if explicitly enabled in match config
  if (
    state.config.survivalTimerEnabled &&
    livingHiders.length > 0 &&
    state.elapsedMatchSeconds >= state.config.survivalTimerSeconds
  ) {
    state.lifecycle = 'MATCH_COMPLETED';
    state.winner = 'hiders';
    state.winReason = 'Hiders survived until the match timer expired!';
    state.events.unshift({
      id: `evt_${Date.now()}_win_hiders_time`,
      timestamp: Date.now(),
      type: 'victory',
      message: 'HIDER VICTORY — Survived the full match timer!',
    });
  }
}

export function stepAuthoritativeMatch(state: MatchState, dt: number): void {
  const clampedDt = Math.min(Math.max(dt, 0), 0.1);
  if (
    state.lifecycle !== 'HIDER_HEAD_START' &&
    state.lifecycle !== 'SEEKER_RELEASED' &&
    state.lifecycle !== 'MATCH_ACTIVE'
  ) {
    return;
  }

  const map = MAPS[state.config.mapId];

  // Update 10-second head start countdown
  if (state.lifecycle === 'HIDER_HEAD_START') {
    state.countdownRemaining = Math.max(0, state.countdownRemaining - clampedDt);
    if (state.countdownRemaining <= 0) {
      state.countdownRemaining = 0;
      state.lifecycle = 'MATCH_ACTIVE';
      state.events.unshift({
        id: `evt_${Date.now()}_seeker_released`,
        timestamp: Date.now(),
        type: 'info',
        message: 'THE SEEKER IS RELEASED! Hunt begins now!',
      });
    }
  } else {
    state.elapsedMatchSeconds += clampedDt;
  }

  // Enforce 15-second max hiding duration for hidden hiders & tick spot cooldowns
  const maxHideSecs = state.config.maxHideDurationSeconds ?? 15;
  for (const player of Object.values(state.players)) {
    if (player.spotCooldownRemaining && player.spotCooldownRemaining > 0) {
      player.spotCooldownRemaining = Math.max(0, player.spotCooldownRemaining - clampedDt);
      if (player.spotCooldownRemaining <= 0) {
        player.lastExitedSpotId = null;
      }
    }

    if (player.alive && player.role === 'hider' && player.hiddenInSpotId !== null) {
      const prevRem =
        typeof player.hideTimerRemaining === 'number' ? player.hideTimerRemaining : maxHideSecs;
      const nextRem = Math.max(0, prevRem - clampedDt);
      player.hideTimerRemaining = nextRem;

      if (nextRem <= 0) {
        const expiredSpotId = player.hiddenInSpotId;
        const spotObj = map.hidingSpots.find((s) => s.id === expiredSpotId);
        attemptExitHidingSpot(state, player.id);
        state.events.unshift({
          id: `evt_${Date.now()}_hide_expired_${player.id}`,
          timestamp: Date.now(),
          type: 'hide',
          message: `${player.name}'s ${maxHideSecs}s hide timer expired at ${spotObj?.label || 'hiding spot'}!`,
          x: player.x,
          y: player.y,
        });
      }
    }
  }

  // Validate objective interaction for all living hiders
  const activeHolders: string[] = [];
  for (const player of Object.values(state.players)) {
    if (player.interactingWithObjective) {
      const dist = Math.hypot(player.x - map.objective.x, player.y - map.objective.y);
      if (
        player.role !== 'hider' ||
        !player.alive ||
        player.hiddenInSpotId !== null ||
        dist > map.objective.interactionRange
      ) {
        player.interactingWithObjective = false;
      } else {
        activeHolders.push(player.id);
        player.objectiveSecondsContributed += clampedDt;
      }
    }
  }

  state.objectiveActiveHiderIds = activeHolders;

  // Objective progress: 3 separate stages of 15 uninterrupted seconds each
  if (state.objectiveCompletedStages < state.config.objectiveTotalStages) {
    if (activeHolders.length > 0) {
      state.objectiveCurrentStageProgress += clampedDt;
      if (state.objectiveCurrentStageProgress >= state.config.objectiveStageDurationSeconds) {
        state.objectiveCompletedStages += 1;
        state.objectiveCurrentStageProgress = 0;

        state.events.unshift({
          id: `evt_${Date.now()}_stage_${state.objectiveCompletedStages}`,
          timestamp: Date.now(),
          type: 'objective_stage',
          message: `Escape Beacon Stage ${state.objectiveCompletedStages}/${state.config.objectiveTotalStages} Completed!`,
          x: map.objective.x,
          y: map.objective.y,
        });
      }
    } else {
      // Interruption resets current stage progress to 0 while preserving completed stages
      if (state.objectiveCurrentStageProgress > 0) {
        state.objectiveCurrentStageProgress = 0;
      }
    }
  }

  // Keep event log bounded
  if (state.events.length > 20) {
    state.events.length = 20;
  }

  evaluateMatchWinConditions(state);
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
  playerId: string
): ContextualActionPrompt[] {
  const player = state.players[playerId];
  if (!player || !player.alive) return [];
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

    // Check nearest available hiding spot
    let nearestSpot: HidingSpotConfig | null = null;
    let nearestSpotDist = Infinity;
    for (const spot of map.hidingSpots) {
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

    // Check distance to City-Center Escape Beacon
    const objDist = Math.hypot(player.x - map.objective.x, player.y - map.objective.y);
    if (
      objDist <= map.objective.interactionRange &&
      state.objectiveCompletedStages < state.config.objectiveTotalStages
    ) {
      const nextStage = state.objectiveCompletedStages + 1;
      actions.push({
        action: 'objective',
        label: player.interactingWithObjective
          ? `Transmitting Stage ${nextStage}/${state.config.objectiveTotalStages}...`
          : `Hold Objective (Stage ${nextStage}/${state.config.objectiveTotalStages})`,
        sublabel: `${Math.ceil(
          state.config.objectiveStageDurationSeconds - state.objectiveCurrentStageProgress
        )}s uninterrupted needed`,
        targetId: map.objective.id,
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
        label: `Eliminate ${nearestHider.name}`,
        sublabel: 'Direct close-range catch in the open',
        targetId: nearestHider.id,
      });
    }
  }

  return actions;
}

/**
 * Autonomous AI bot controller with 4 distinct behavior policies:
 * 1. stealth_hider: Finds an unoccupied hiding spot away from the seeker; exits if seeker passes far away to help objective.
 * 2. runner_hider: Pushes the 3-stage City-Center Beacon when seeker is > 280px away, ducks into nearby cover when threatened.
 * 3. patrol_seeker: Systematically visits and inspects hiding spots across street blocks and checks the central beacon.
 * 4. hunter_seeker: Sweeps high-traffic avenues, chases visible hiders, and inspects hiding spots near the beacon.
 */
export function stepBotAI(
  state: MatchState,
  bot: PlayerState,
  dt: number,
  nowMs: number
): void {
  if (!bot.isBot || !bot.alive) return;
  if (
    state.lifecycle !== 'HIDER_HEAD_START' &&
    state.lifecycle !== 'SEEKER_RELEASED' &&
    state.lifecycle !== 'MATCH_ACTIVE'
  ) {
    return;
  }

  const map = MAPS[state.config.mapId];
  const seekers = Object.values(state.players).filter((p) => p.role === 'seeker' && p.alive);
  const hiders = Object.values(state.players).filter((p) => p.role === 'hider' && p.alive);

  if (bot.role === 'hider') {
    const nearestSeeker = seekers.reduce<{ p: PlayerState | null; dist: number }>(
      (acc, s) => {
        const d = Math.hypot(bot.x - s.x, bot.y - s.y);
        return d < acc.dist ? { p: s, dist: d } : acc;
      },
      { p: null, dist: Infinity }
    );

    const seekerDanger =
      state.lifecycle === 'MATCH_ACTIVE' && nearestSeeker.dist < 250;

    // If hidden: stay hidden if seeker is near or if stealth policy during early hunt
    if (bot.hiddenInSpotId) {
      const shouldExitToHelpObjective =
        !seekerDanger &&
        nearestSeeker.dist > 400 &&
        state.objectiveActiveHiderIds.length === 0 &&
        (bot.botPolicy === 'runner_hider' || state.elapsedMatchSeconds > 20);
      if (shouldExitToHelpObjective) {
        attemptExitHidingSpot(state, bot.id);
      }
      return;
    }

    // If runner_hider and safe after head start, head to objective and hold it
    if (
      (bot.botPolicy === 'runner_hider' || state.elapsedMatchSeconds > 28) &&
      !seekerDanger &&
      state.lifecycle === 'MATCH_ACTIVE'
    ) {
      const distObj = Math.hypot(bot.x - map.objective.x, bot.y - map.objective.y);
      if (distObj <= map.objective.interactionRange - 12) {
        setObjectiveInteraction(state, bot.id, true);
        return;
      } else {
        setObjectiveInteraction(state, bot.id, false);
        const dx = map.objective.x - bot.x;
        const dy = map.objective.y - bot.y;
        const moved = resolvePlayerMovement(bot, dx, dy, dt, state, map);
        bot.x = moved.x;
        bot.y = moved.y;
        bot.vx = moved.vx;
        bot.vy = moved.vy;
        bot.facing = moved.facing;
        return;
      }
    }

    setObjectiveInteraction(state, bot.id, false);

    // Find best unoccupied hiding spot (skipping recently exited spot on cooldown)
    let targetSpot: HidingSpotConfig | null = null;
    let bestScore = Infinity;
    for (const spot of map.hidingSpots) {
      if (state.hidingOccupancy[spot.id] !== null) continue;
      if (
        bot.lastExitedSpotId === spot.id &&
        bot.spotCooldownRemaining &&
        bot.spotCooldownRemaining > 0
      ) {
        continue;
      }
      const cx = spot.x + spot.width / 2;
      const cy = spot.y + spot.height / 2;
      const distFromBot = Math.hypot(bot.x - cx, bot.y - cy);
      const distFromSeeker = nearestSeeker.p
        ? Math.hypot(nearestSeeker.p.x - cx, nearestSeeker.p.y - cy)
        : 500;
      const score = distFromBot - distFromSeeker * 0.35;
      if (score < bestScore) {
        bestScore = score;
        targetSpot = spot;
      }
    }

    if (targetSpot) {
      const cx = targetSpot.x + targetSpot.width / 2;
      const cy = targetSpot.y + targetSpot.height / 2;
      const dist = Math.hypot(bot.x - cx, bot.y - cy);
      if (dist <= targetSpot.interactionRange - 10 && hasLineOfSight(bot.x, bot.y, cx, cy, map.walls)) {
        attemptEnterHidingSpot(state, bot.id, targetSpot.id);
        return;
      }
      const moved = resolvePlayerMovement(bot, cx - bot.x, cy - bot.y, dt, state, map);
      bot.x = moved.x;
      bot.y = moved.y;
      bot.vx = moved.vx;
      bot.vy = moved.vy;
      bot.facing = moved.facing;
    }
  } else {
    // Seeker Bot AI
    if (state.lifecycle === 'HIDER_HEAD_START') {
      return;
    }

    // 1. Check direct elimination if any visible hider is in range
    const actions = getAvailableContextualActions(state, bot.id);
    const elimAction = actions.find((a) => a.action === 'eliminate');
    if (elimAction) {
      attemptDirectElimination(state, bot.id, elimAction.targetId);
      return;
    }

    // 2. Chase visible unhidden hiders within 380px
    let visibleTarget: PlayerState | null = null;
    let visibleDist = Infinity;
    for (const h of hiders) {
      if (h.hiddenInSpotId !== null) continue;
      const d = Math.hypot(bot.x - h.x, bot.y - h.y);
      if (d < 380 && d < visibleDist && hasLineOfSight(bot.x, bot.y, h.x, h.y, map.walls)) {
        visibleTarget = h;
        visibleDist = d;
      }
    }

    if (visibleTarget) {
      const moved = resolvePlayerMovement(
        bot,
        visibleTarget.x - bot.x,
        visibleTarget.y - bot.y,
        dt,
        state,
        map
      );
      bot.x = moved.x;
      bot.y = moved.y;
      bot.vx = moved.vx;
      bot.vy = moved.vy;
      bot.facing = moved.facing;
      return;
    }

    // 3. If objective is actively being held, rush to the City-Center Beacon!
    if (state.objectiveCurrentStageProgress > 2.5) {
      const moved = resolvePlayerMovement(
        bot,
        map.objective.x - bot.x,
        map.objective.y - bot.y,
        dt,
        state,
        map
      );
      bot.x = moved.x;
      bot.y = moved.y;
      bot.vx = moved.vx;
      bot.vy = moved.vy;
      bot.facing = moved.facing;
      return;
    }

    // 4. Patrol & inspect hiding spots systematically
    const spotIndex =
      Math.floor(state.elapsedMatchSeconds / 4.5 + bot.colorIndex * 3) % map.hidingSpots.length;
    const targetSpot = map.hidingSpots[spotIndex];
    const cx = targetSpot.x + targetSpot.width / 2;
    const cy = targetSpot.y + targetSpot.height / 2;
    const dist = Math.hypot(bot.x - cx, bot.y - cy);

    if (
      dist <= targetSpot.interactionRange - 8 &&
      nowMs - bot.lastInspectAt >= state.config.inspectCooldownMs + 900 &&
      hasLineOfSight(bot.x, bot.y, cx, cy, map.walls)
    ) {
      attemptInspectHidingSpot(state, bot.id, targetSpot.id, nowMs);
      return;
    }

    // Navigate along roads if blocked
    let dirX = cx - bot.x;
    let dirY = cy - bot.y;
    const moved = resolvePlayerMovement(bot, dirX, dirY, dt, state, map);
    if (Math.hypot(moved.x - bot.x, moved.y - bot.y) < 0.3) {
      // Unstick around building corners by steering perpendicular
      const altMoved = resolvePlayerMovement(bot, -dirY, dirX, dt, state, map);
      bot.x = altMoved.x;
      bot.y = altMoved.y;
      bot.vx = altMoved.vx;
      bot.vy = altMoved.vy;
      bot.facing = altMoved.facing;
    } else {
      bot.x = moved.x;
      bot.y = moved.y;
      bot.vx = moved.vx;
      bot.vy = moved.vy;
      bot.facing = moved.facing;
    }
  }
}
