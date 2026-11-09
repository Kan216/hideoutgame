import { MAPS, getMapObjectives } from './maps.ts';
import type { HidingSpotConfig, MapConfig } from './maps.ts';
import {
  attemptDirectElimination,
  attemptEnterHidingSpot,
  attemptExitHidingSpot,
  attemptInspectHidingSpot,
  attemptSprint,
  attemptUsePower,
  canPerceive,
  getAvailableContextualActions,
  getSpotCenter,
  hasLineOfSight,
  resolvePlayerMovement,
  setObjectiveInteraction,
} from './rules.ts';
import type { MatchState, PlayerState } from './rules.ts';
import { findPath, getNavGrid } from './navigation.ts';

/**
 * Fair AI bots: they only act on what their own perception allows (same rules as players):
 * seekers do NOT read hiding-spot occupancy and only chase hiders they can see or hear.
 *
 * Policies:
 *  - stealth_hider: prefers hiding spots far from known seekers, rotates spots before the timer expires.
 *  - runner_hider: pushes the beacon whenever no seeker is perceived nearby.
 *  - patrol_seeker / hunter_seeker: chase perceived hiders, investigate noise pings and last-seen
 *    positions, guard the beacon when it is being transmitted, otherwise search hiding spots.
 */

interface BotBrain {
  path: Array<{ x: number; y: number }>;
  pathTargetX: number;
  pathTargetY: number;
  pathComputedAt: number;
  stuckSeconds: number;
  // Seeker memory
  lastSeen: { x: number; y: number; at: number } | null;
  investigate: { x: number; y: number; at: number } | null;
  searchedAt: Map<string, number>;
  handledPingIds: Set<number>;
  // Hider memory
  targetSpotId: string | null;
  knownSeekers: Map<string, { x: number; y: number; at: number }>;
  fleeTarget: { x: number; y: number; at: number } | null;
  // Seeker reaction time: when the current target was first spotted
  spottedId: string | null;
  spottedAt: number;
}

const brains = new WeakMap<PlayerState, BotBrain>();
/** Seekers need to keep a hider in view this long before a catch lands (humans need to press a button too). */
const BOT_REACTION_MS = 450;

function getBrain(bot: PlayerState): BotBrain {
  let b = brains.get(bot);
  if (!b) {
    b = {
      path: [],
      pathTargetX: NaN,
      pathTargetY: NaN,
      pathComputedAt: 0,
      stuckSeconds: 0,
      lastSeen: null,
      investigate: null,
      searchedAt: new Map(),
      handledPingIds: new Set(),
      targetSpotId: null,
      knownSeekers: new Map(),
      fleeTarget: null,
      spottedId: null,
      spottedAt: 0,
    };
    brains.set(bot, b);
  }
  return b;
}

function applyMove(
  state: MatchState,
  bot: PlayerState,
  ix: number,
  iy: number,
  dt: number,
  map: MapConfig
): number {
  const moved = resolvePlayerMovement(bot, ix, iy, dt, state, map);
  const stepDist = Math.hypot(moved.x - bot.x, moved.y - bot.y);
  bot.x = moved.x;
  bot.y = moved.y;
  bot.vx = moved.vx;
  bot.vy = moved.vy;
  bot.facing = moved.facing;
  return stepDist;
}

/** Path-follow toward a world target; recomputes the A* path when the target moves or the bot is stuck. */
function moveToward(
  state: MatchState,
  bot: PlayerState,
  tx: number,
  ty: number,
  dt: number,
  nowMs: number,
  map: MapConfig
): void {
  const brain = getBrain(bot);
  const targetMoved = Math.hypot(tx - brain.pathTargetX, ty - brain.pathTargetY) > 40 || Number.isNaN(brain.pathTargetX);
  if (targetMoved || brain.path.length === 0 || brain.stuckSeconds > 0.35 || nowMs - brain.pathComputedAt > 2500) {
    brain.path = findPath(map, bot.x, bot.y, tx, ty) ?? [{ x: tx, y: ty }];
    brain.pathTargetX = tx;
    brain.pathTargetY = ty;
    brain.pathComputedAt = nowMs;
    brain.stuckSeconds = 0;
  }
  while (brain.path.length > 1 && Math.hypot(brain.path[0].x - bot.x, brain.path[0].y - bot.y) < 12) {
    brain.path.shift();
  }
  const wp = brain.path[0];
  if (!wp) return;
  const dx = wp.x - bot.x;
  const dy = wp.y - bot.y;
  if (Math.hypot(dx, dy) < 2) return;
  const stepped = applyMove(state, bot, dx, dy, dt, map);
  if (stepped < 0.3 * (dt / 0.04)) {
    brain.stuckSeconds += dt;
  } else {
    brain.stuckSeconds = 0;
  }
}

function stopMoving(bot: PlayerState) {
  bot.vx = 0;
  bot.vy = 0;
}

export function stepBotAI(state: MatchState, bot: PlayerState, dt: number, nowMs: number): void {
  if (!bot.isBot || !bot.alive) return;
  if (
    state.lifecycle !== 'HIDER_HEAD_START' &&
    state.lifecycle !== 'SEEKER_RELEASED' &&
    state.lifecycle !== 'MATCH_ACTIVE'
  ) {
    return;
  }
  const map = MAPS[state.config.mapId];
  if ((bot.stunRemaining ?? 0) > 0) {
    stopMoving(bot);
    return;
  }
  if (bot.role === 'hider') {
    stepHiderBot(state, bot, dt, nowMs, map);
  } else {
    stepSeekerBot(state, bot, dt, nowMs, map);
  }
}

// ───────────────────────────── Hider bots ─────────────────────────────

function hashUnit(str: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

function scoreSpotForHider(
  state: MatchState,
  spot: HidingSpotConfig,
  bot: PlayerState,
  threats: Array<{ x: number; y: number }>,
  map: MapConfig
): number {
  const c = getSpotCenter(spot);
  let score = Math.hypot(bot.x - c.x, bot.y - c.y) * 0.55;
  for (const t of threats) {
    const d = Math.hypot(t.x - c.x, t.y - c.y);
    // Strongly avoid spots near a known seeker, and spots that require running toward one.
    score += Math.max(0, 420 - d) * 1.4;
  }
  // Spread out: avoid spots next to teammates (one sweep should not find everyone)
  for (const mate of Object.values(state.players)) {
    if (mate.id === bot.id || mate.role !== 'hider' || !mate.alive) continue;
    const mateTarget = brains.get(mate)?.targetSpotId;
    const mateSpot = mate.hiddenInSpotId ?? mateTarget;
    if (!mateSpot) continue;
    const ms = map.hidingSpots.find((s) => s.id === mateSpot);
    if (!ms) continue;
    const mc = getSpotCenter(ms);
    score += Math.max(0, 300 - Math.hypot(mc.x - c.x, mc.y - c.y)) * 0.9;
  }
  // Busy centre plaza is where seekers sweep first
  score += Math.max(0, 260 - Math.hypot(map.objective.x - c.x, map.objective.y - c.y)) * 0.5;
  // Personal preference so bots do not all pick the same spot
  score += hashUnit(spot.id, bot.colorIndex * 7919 + bot.id.length) * 260;
  return score;
}

function pickHidingSpot(state: MatchState, bot: PlayerState, map: MapConfig, threats: Array<{ x: number; y: number }>) {
  let best: HidingSpotConfig | null = null;
  let bestScore = Infinity;
  for (const spot of map.hidingSpots) {
    if (state.hidingOccupancy[spot.id] !== null) continue;
    if (bot.lastExitedSpotId === spot.id && (bot.spotCooldownRemaining ?? 0) > 0) continue;
    const s = scoreSpotForHider(state, spot, bot, threats, map);
    if (s < bestScore) {
      bestScore = s;
      best = spot;
    }
  }
  return best;
}

function stepHiderBot(state: MatchState, bot: PlayerState, dt: number, nowMs: number, map: MapConfig) {
  const brain = getBrain(bot);

  // Update knowledge of seekers from own perception (fair: no wall-hacks)
  for (const s of Object.values(state.players)) {
    if (s.role !== 'seeker' || !s.alive) continue;
    if (canPerceive(state, bot, s, map)) {
      brain.knownSeekers.set(s.id, { x: s.x, y: s.y, at: nowMs });
    }
  }
  const threats: Array<{ x: number; y: number; age: number }> = [];
  for (const [id, k] of brain.knownSeekers) {
    const age = nowMs - k.at;
    if (age > 9000) brain.knownSeekers.delete(id);
    else threats.push({ x: k.x, y: k.y, age });
  }
  let nearestThreat = Infinity;
  let nearestThreatPos: { x: number; y: number } | null = null;
  for (const t of threats) {
    const d = Math.hypot(t.x - bot.x, t.y - bot.y);
    if (d < nearestThreat) {
      nearestThreat = d;
      nearestThreatPos = t;
    }
  }
  const freshThreatNear = threats.some((t) => t.age < 1500 && Math.hypot(t.x - bot.x, t.y - bot.y) < 320);
  const active = state.lifecycle === 'MATCH_ACTIVE';

  // While hidden: stay put if a seeker is close, rotate early when the coast is clear
  if (bot.hiddenInSpotId) {
    const timer = bot.hideTimerRemaining ?? 15;
    const wantsBeacon =
      (bot.botPolicy === 'runner_hider' || state.elapsedMatchSeconds > 30) &&
      state.objectiveActiveHiderIds.length === 0 &&
      state.objectiveCompletedStages < state.config.objectiveTotalStages;
    if (!freshThreatNear && (timer < 2.5 || (wantsBeacon && active && nearestThreat > 420))) {
      attemptExitHidingSpot(state, bot.id);
      brain.targetSpotId = null;
    }
    return;
  }

  // Under pressure: flee to the safest reachable spot (or simply away from the seeker)
  if (active && freshThreatNear && nearestThreatPos) {
    // Pop the eaten snack when a seeker closes in
    if (bot.heldPower && nearestThreat < (bot.heldPower === 'mines' ? 280 : 220)) {
      attemptUsePower(state, bot.id, nowMs);
    }
    setObjectiveInteraction(state, bot.id, false);
    if (nearestThreat < 230 && (bot.sprintCooldownRemaining ?? 0) <= 0) {
      attemptSprint(state, bot.id);
    }
    const canHide = (bot.rehideCooldownRemaining ?? 0) <= 0;
    if (canHide) {
      const spot = pickHidingSpot(state, bot, map, [nearestThreatPos]);
      if (spot && tryReachAndHide(state, bot, spot, dt, nowMs, map)) return;
    }
    if (!brain.fleeTarget || nowMs - brain.fleeTarget.at > 1200) {
      const pt = pickFleePoint(bot, nearestThreatPos, map);
      brain.fleeTarget = { x: pt.x, y: pt.y, at: nowMs };
    }
    moveToward(state, bot, brain.fleeTarget.x, brain.fleeTarget.y, dt, nowMs, map);
    return;
  }

  // Snack run: grab a nearby power-up when the coast is clear
  if (!bot.heldPower && (state.powerUps?.length ?? 0) > 0 && nearestThreat > 300) {
    let best: { x: number; y: number } | null = null;
    let bestD = 280;
    for (const pu of state.powerUps ?? []) {
      const d = Math.hypot(pu.x - bot.x, pu.y - bot.y);
      if (d < bestD) {
        bestD = d;
        best = pu;
      }
    }
    if (best) {
      setObjectiveInteraction(state, bot.id, false);
      moveToward(state, bot, best.x, best.y, dt, nowMs, map);
      return;
    }
  }

  // Beacon duty
  const beaconTimePressure =
    state.config.survivalTimerEnabled &&
    state.config.survivalTimerSeconds - state.elapsedMatchSeconds < 110 &&
    state.objectiveCompletedStages < (state.config.timeoutHiderMinStages ?? 0);
  const goBeacon =
    active &&
    state.objectiveCompletedStages < state.config.objectiveTotalStages &&
    (bot.botPolicy === 'runner_hider' || state.elapsedMatchSeconds > 30 || beaconTimePressure) &&
    nearestThreat > 380;
  if (goBeacon) {
    // Choose the beacon that is closest while far from known seekers; join teammates already transmitting.
    let best = map.objective;
    let bestScore = Infinity;
    for (const obj of getMapObjectives(map)) {
      let score = Math.hypot(bot.x - obj.x, bot.y - obj.y);
      for (const t of threats) score += Math.max(0, 500 - Math.hypot(t.x - obj.x, t.y - obj.y)) * 2;
      if (state.objectiveActiveIds?.includes(obj.id)) score -= 250;
      if (score < bestScore) {
        bestScore = score;
        best = obj;
      }
    }
    const distObj = Math.hypot(bot.x - best.x, bot.y - best.y);
    if (distObj <= best.interactionRange - 12) {
      stopMoving(bot);
      setObjectiveInteraction(state, bot.id, true);
    } else {
      setObjectiveInteraction(state, bot.id, false);
      moveToward(state, bot, best.x, best.y, dt, nowMs, map);
    }
    return;
  }

  setObjectiveInteraction(state, bot.id, false);

  if ((bot.rehideCooldownRemaining ?? 0) > 0) {
    // Catching breath: drift away from the last spot toward cover
    const spot = brain.targetSpotId ? map.hidingSpots.find((s) => s.id === brain.targetSpotId) : null;
    if (spot) {
      const c = getSpotCenter(spot);
      moveToward(state, bot, c.x, c.y, dt, nowMs, map);
    } else {
      const next = pickHidingSpot(state, bot, map, threats);
      brain.targetSpotId = next?.id ?? null;
    }
    return;
  }

  let spot = brain.targetSpotId ? map.hidingSpots.find((s) => s.id === brain.targetSpotId) ?? null : null;
  if (!spot || state.hidingOccupancy[spot.id] !== null) {
    spot = pickHidingSpot(state, bot, map, threats);
    brain.targetSpotId = spot?.id ?? null;
  }
  if (spot) tryReachAndHide(state, bot, spot, dt, nowMs, map);
}

/** Pick a nearby walkable point that breaks line of sight from the threat and opens distance. */
function pickFleePoint(bot: PlayerState, threat: { x: number; y: number }, map: MapConfig) {
  const grid = getNavGrid(map);
  let best = { x: bot.x + (bot.x - threat.x), y: bot.y + (bot.y - threat.y) };
  let bestScore = -Infinity;
  const r0 = Math.floor(bot.y / grid.cell);
  const c0 = Math.floor(bot.x / grid.cell);
  for (let dr = -9; dr <= 9; dr += 1) {
    for (let dc = -9; dc <= 9; dc += 1) {
      const r = r0 + dr;
      const c = c0 + dc;
      if (r < 0 || c < 0 || r >= grid.rows || c >= grid.cols) continue;
      if (!grid.walkable[r * grid.cols + c]) continue;
      const x = c * grid.cell + grid.cell / 2;
      const y = r * grid.cell + grid.cell / 2;
      const dBot = Math.hypot(x - bot.x, y - bot.y);
      if (dBot < 60 || dBot > 230) continue;
      const dThreat = Math.hypot(x - threat.x, y - threat.y);
      // Never run toward the seeker
      if (dThreat < Math.hypot(bot.x - threat.x, bot.y - threat.y)) continue;
      const hidden = !hasLineOfSight(threat.x, threat.y, x, y, map.walls);
      const score = dThreat * 0.6 - dBot * 0.3 + (hidden ? 260 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = { x, y };
      }
    }
  }
  return {
    x: Math.max(50, Math.min(map.width - 50, best.x)),
    y: Math.max(50, Math.min(map.height - 50, best.y)),
  };
}

function tryReachAndHide(
  state: MatchState,
  bot: PlayerState,
  spot: HidingSpotConfig,
  dt: number,
  nowMs: number,
  map: MapConfig
): boolean {
  const brain = getBrain(bot);
  brain.targetSpotId = spot.id;
  const c = getSpotCenter(spot);
  const dist = Math.hypot(bot.x - c.x, bot.y - c.y);
  if (dist <= spot.interactionRange - 6 && hasLineOfSight(bot.x, bot.y, c.x, c.y, map.walls)) {
    const res = attemptEnterHidingSpot(state, bot.id, spot.id);
    if (res.ok) {
      brain.targetSpotId = null;
      return true;
    }
    if (state.hidingOccupancy[spot.id] !== null) {
      brain.targetSpotId = null;
      return false;
    }
  }
  moveToward(state, bot, c.x, c.y, dt, nowMs, map);
  return true;
}

// ───────────────────────────── Seeker bots ─────────────────────────────

function stepSeekerBot(state: MatchState, bot: PlayerState, dt: number, nowMs: number, map: MapConfig) {
  if (state.lifecycle === 'HIDER_HEAD_START') {
    stopMoving(bot);
    return;
  }
  const brain = getBrain(bot);

  // 1. Catch anyone in reach (after a human-like reaction delay since first spotting them)
  const actions = getAvailableContextualActions(state, bot.id, nowMs);
  const elimAction = actions.find((a) => a.action === 'eliminate');
  if (elimAction) {
    if (brain.spottedId !== elimAction.targetId) {
      brain.spottedId = elimAction.targetId ?? null;
      brain.spottedAt = nowMs;
    }
    if (nowMs - brain.spottedAt >= BOT_REACTION_MS) {
      attemptDirectElimination(state, bot.id, elimAction.targetId, nowMs);
      return;
    }
  }

  // 2. Chase the nearest perceived hider
  let target: PlayerState | null = null;
  let targetDist = Infinity;
  for (const h of Object.values(state.players)) {
    if (h.role !== 'hider' || !h.alive || h.hiddenInSpotId !== null) continue;
    if (!canPerceive(state, bot, h, map)) continue;
    const d = Math.hypot(bot.x - h.x, bot.y - h.y);
    if (d < targetDist) {
      target = h;
      targetDist = d;
    }
  }
  if (target) {
    if (brain.spottedId !== target.id) {
      brain.spottedId = target.id;
      brain.spottedAt = nowMs;
    }
    brain.lastSeen = { x: target.x, y: target.y, at: nowMs };
    // Lead the target slightly so we cut corners instead of trailing behind.
    const lead = Math.min(0.35, targetDist / 600);
    moveToward(state, bot, target.x + target.vx * lead, target.y + target.vy * lead, dt, nowMs, map);
    return;
  }

  // 3. React to fresh noise pings (exits, rustling objects, flushes)
  for (const ping of state.noisePings ?? []) {
    if (brain.handledPingIds.has(ping.id)) continue;
    brain.handledPingIds.add(ping.id);
    const d = Math.hypot(ping.x - bot.x, ping.y - bot.y);
    const hearRange = ping.kind === 'beacon' ? 900 : 650;
    if (d < hearRange && (!brain.investigate || nowMs - brain.investigate.at > 1500 || ping.kind === 'beacon')) {
      brain.investigate = { x: ping.x, y: ping.y, at: nowMs };
    }
  }
  if (brain.handledPingIds.size > 200) brain.handledPingIds.clear();

  // 4. Defend the beacon while it is being transmitted (holders are public knowledge via the HUD)
  // Beacon pings are loud: a seeker hearing one goes to that beacon.
  if (brain.investigate && nowMs - brain.investigate.at < 6000) {
    const nearBeacon = getMapObjectives(map).find(
      (o) => Math.hypot(o.x - brain.investigate!.x, o.y - brain.investigate!.y) < 20
    );
    if (nearBeacon) {
      if (Math.hypot(bot.x - nearBeacon.x, bot.y - nearBeacon.y) > 40) {
        moveToward(state, bot, nearBeacon.x, nearBeacon.y, dt, nowMs, map);
        return;
      }
      brain.investigate = null;
    }
  }

  // 5. Search around a lead (noise or last-seen) or patrol unsearched spots
  const lead =
    brain.investigate && nowMs - brain.investigate.at < 9000
      ? brain.investigate
      : brain.lastSeen && nowMs - brain.lastSeen.at < 10000
      ? brain.lastSeen
      : null;

  let bestSpot: HidingSpotConfig | null = null;
  let bestScore = Infinity;
  for (const spot of map.hidingSpots) {
    if (!spot.canInspect) continue;
    const searched = brain.searchedAt.get(spot.id) ?? -Infinity;
    const recency = nowMs - searched;
    if (recency < 12000) continue;
    const c = getSpotCenter(spot);
    let score = Math.hypot(bot.x - c.x, bot.y - c.y);
    if (lead) score += Math.hypot(lead.x - c.x, lead.y - c.y) * 2.2;
    // hunter seekers favour spots around the beacon, patrol seekers spread out by colour index
    if (bot.botPolicy === 'hunter_seeker') {
      score += Math.hypot(map.objective.x - c.x, map.objective.y - c.y) * 0.35;
    } else {
      score += ((spot.id.length * 37 + bot.colorIndex * 101) % 97) * 1.5;
    }
    if (score < bestScore) {
      bestScore = score;
      bestSpot = spot;
    }
  }

  if (!bestSpot) {
    brain.searchedAt.clear();
    brain.investigate = null;
    moveToward(state, bot, map.objective.x, map.objective.y, dt, nowMs, map);
    return;
  }

  const c = getSpotCenter(bestSpot);
  const dist = Math.hypot(bot.x - c.x, bot.y - c.y);
  if (dist <= bestSpot.interactionRange - 6 && hasLineOfSight(bot.x, bot.y, c.x, c.y, map.walls)) {
    stopMoving(bot);
    if (nowMs - bot.lastInspectAt >= state.config.inspectCooldownMs + 250) {
      const res = attemptInspectHidingSpot(state, bot.id, bestSpot.id, nowMs);
      if (res.ok || res.reason) brain.searchedAt.set(bestSpot.id, nowMs);
      if (lead && Math.hypot(lead.x - c.x, lead.y - c.y) < 160 && !res.foundPlayerId) {
        // Lead exhausted once the closest spots have been checked.
        const remainingNear = map.hidingSpots.some(
          (s) =>
            s.canInspect &&
            nowMs - (brain.searchedAt.get(s.id) ?? -Infinity) >= 12000 &&
            Math.hypot(getSpotCenter(s).x - lead.x, getSpotCenter(s).y - lead.y) < 200
        );
        if (!remainingNear) {
          brain.investigate = null;
          brain.lastSeen = null;
        }
      }
    }
    return;
  }
  moveToward(state, bot, c.x, c.y, dt, nowMs, map);
}
