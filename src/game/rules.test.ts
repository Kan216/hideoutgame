import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MATCH_CONFIG,
  getPlayerSpeed,
  validateGuestDisplayName,
  createInitialMatchState,
  startAuthoritativeMatch,
  resolvePlayerMovement,
  attemptEnterHidingSpot,
  attemptExitHidingSpot,
  attemptDirectElimination,
  attemptInspectHidingSpot,
  setObjectiveInteraction,
  stepAuthoritativeMatch,
  isPositionWallFree,
  findNearestCollisionFreePoint,
  worldToMinimapCoords,
  getCitySectorLabel,
  attemptSprint,
  canPerceive,
  filterStateForViewer,
  hasLineOfSight,
  getAvailableContextualActions,
} from './rules.ts';
import { MAPS, getMapObjectives } from './maps.ts';
import { findPath, isCorridorClear } from './navigation.ts';
import { stepBotAI } from './bots.ts';

function seedTwoPlayers() {
  const state = createInitialMatchState('TEST01', 'p1');
  state.players['p1'] = {
    id: 'p1',
    name: 'SeekerOne',
    role: 'seeker',
    isBot: false,
    alive: true,
    x: 100,
    y: 100,
    vx: 0,
    vy: 0,
    facing: 'down',
    hiddenInSpotId: null,
    interactingWithObjective: false,
    eliminationsCount: 0,
    inspectionsCount: 0,
    objectiveSecondsContributed: 0,
    lastInspectAt: 0,
    connected: true,
    colorIndex: 0,
  };
  state.players['p2'] = {
    id: 'p2',
    name: 'HiderTwo',
    role: 'hider',
    isBot: false,
    alive: true,
    x: 750,
    y: 520,
    vx: 0,
    vy: 0,
    facing: 'down',
    hiddenInSpotId: null,
    interactingWithObjective: false,
    eliminationsCount: 0,
    inspectionsCount: 0,
    objectiveSecondsContributed: 0,
    lastInspectAt: 0,
    connected: true,
    colorIndex: 1,
  };
  startAuthoritativeMatch(state, 'seeker');
  return state;
}

test('Movement tests: Seeker moves at 1.2x Hider speed and respects walls and head-start lock', () => {
  const hiderSpeed = getPlayerSpeed('hider', DEFAULT_MATCH_CONFIG);
  const seekerSpeed = getPlayerSpeed('seeker', DEFAULT_MATCH_CONFIG);
  assert.equal(seekerSpeed, hiderSpeed * 1.2);

  const state = seedTwoPlayers();
  const map = MAPS[state.config.mapId];

  // During 10s head start, Seeker is locked inside seekerSpawnZone
  const seeker = state.players['p1'];
  seeker.x = map.seekerSpawnZone.x + map.seekerSpawnZone.width - 14;
  const lockedMove = resolvePlayerMovement(seeker, 1, 0, 0.05, state, map);
  assert.ok(lockedMove.x <= map.seekerSpawnZone.x + map.seekerSpawnZone.width - 13);

  // Hiders can move freely during head start
  const hider = state.players['p2'];
  const startX = hider.x;
  const hiderMove = resolvePlayerMovement(hider, 1, 0, 0.05, state, map);
  assert.ok(hiderMove.x > startX);
});

test('Hiding tests: Single-capacity enforcement, movement lock while hidden, and exit behavior', () => {
  const state = seedTwoPlayers();
  state.players['p3'] = {
    ...state.players['p2'],
    id: 'p3',
    name: 'HiderThree',
  };

  const map = MAPS[state.config.mapId];
  const spot = map.hidingSpots[0]; // hs_1
  state.players['p2'].x = spot.x + spot.width / 2;
  state.players['p2'].y = spot.y + spot.height / 2 + 20;
  state.players['p3'].x = spot.x + spot.width / 2;
  state.players['p3'].y = spot.y + spot.height / 2 + 20;

  const enter1 = attemptEnterHidingSpot(state, 'p2', spot.id);
  assert.equal(enter1.ok, true);
  assert.equal(state.players['p2'].hiddenInSpotId, spot.id);
  assert.equal(state.hidingOccupancy[spot.id], 'p2');

  // Second hider cannot enter occupied single-capacity object
  const enter2 = attemptEnterHidingSpot(state, 'p3', spot.id);
  assert.equal(enter2.ok, false);

  // Hidden player cannot walk around normally
  const moveWhileHidden = resolvePlayerMovement(state.players['p2'], 1, 1, 0.05, state, map);
  assert.equal(moveWhileHidden.x, state.players['p2'].x);
  assert.equal(moveWhileHidden.y, state.players['p2'].y);

  // Exit frees occupancy
  const exitRes = attemptExitHidingSpot(state, 'p2');
  assert.equal(exitRes.ok, true);
  assert.equal(state.hidingOccupancy[spot.id], null);
});

test('Hiding protection & 15s Max Hide Timer: Killer cannot kill hidden hider, and hider automatically comes out after 15s', () => {
  const state = seedTwoPlayers();
  const map = MAPS[state.config.mapId];
  const spot = map.hidingSpots[0];

  // Seeker cannot eliminate during 10s head start
  state.players['p1'].x = state.players['p2'].x;
  state.players['p1'].y = state.players['p2'].y;
  const earlyElim = attemptDirectElimination(state, 'p1');
  assert.equal(earlyElim.ok, false);

  // Advance past 10-second countdown
  for (let i = 0; i < 105; i++) {
    stepAuthoritativeMatch(state, 0.1);
  }
  assert.equal(state.lifecycle, 'MATCH_ACTIVE');

  // Hider enters hiding spot -> hideTimerRemaining starts at 15s
  state.players['p2'].x = spot.x + spot.width / 2;
  state.players['p2'].y = spot.y + spot.height / 2 + 20;
  assert.equal(attemptEnterHidingSpot(state, 'p2', spot.id).ok, true);
  assert.equal(state.players['p2'].hiddenInSpotId, spot.id);
  assert.equal(state.players['p2'].hideTimerRemaining, 15);

  // Killer cannot kill hider while hidden (direct elimination only works in the open)
  state.players['p1'].x = spot.x + spot.width / 2;
  state.players['p1'].y = spot.y + spot.height / 2 + 20;
  const directWhileHidden = attemptDirectElimination(state, 'p1');
  assert.equal(directWhileHidden.ok, false);
  assert.equal(state.players['p2'].alive, true);
  assert.equal(state.players['p2'].hiddenInSpotId, spot.id);
  // Move the seeker away so the timer test below is not affected by inspections
  state.players['p1'].x = map.seekerSpawns[0].x;
  state.players['p1'].y = map.seekerSpawns[0].y;

  // Advance 14 seconds -> Hider is still hidden with ~1s left
  for (let i = 0; i < 140; i++) {
    stepAuthoritativeMatch(state, 0.1);
  }
  assert.equal(state.players['p2'].hiddenInSpotId, spot.id);

  // Advance past 15 seconds -> Hider is automatically forced out of hiding!
  for (let i = 0; i < 15; i++) {
    stepAuthoritativeMatch(state, 0.1);
  }
  assert.equal(state.players['p2'].hiddenInSpotId, null);
  assert.equal(state.hidingOccupancy[spot.id], null);

  // Now that the hider has come out, Killer can eliminate them in the open!
  state.players['p1'].x = state.players['p2'].x;
  state.players['p1'].y = state.players['p2'].y;
  const elimInOpen = attemptDirectElimination(state, 'p1');
  assert.equal(elimInOpen.ok, true);
  assert.equal(state.players['p2'].alive, false);
  assert.equal(state.lifecycle, 'MATCH_COMPLETED');
  assert.equal(state.winner, 'seekers');
});

test('Objective tests: 3 stages x 15 uninterrupted seconds, interruption resets active stage only, Stage 3 wins', () => {
  const state = seedTwoPlayers();
  const map = MAPS[state.config.mapId];

  // Move hider to City-Center Beacon
  state.players['p2'].x = map.objective.x;
  state.players['p2'].y = map.objective.y;
  assert.equal(setObjectiveInteraction(state, 'p2', true).ok, true);

  // Hold for 15 seconds -> Stage 1 completed
  for (let i = 0; i < 155; i++) {
    stepAuthoritativeMatch(state, 0.1);
  }
  assert.equal(state.objectiveCompletedStages, 1);

  // Hold for 7 seconds into Stage 2, then interrupt -> Stage 2 resets to 0, Stage 1 stays completed
  for (let i = 0; i < 70; i++) {
    stepAuthoritativeMatch(state, 0.1);
  }
  assert.ok(state.objectiveCurrentStageProgress > 6);
  setObjectiveInteraction(state, 'p2', false);
  stepAuthoritativeMatch(state, 0.1);
  assert.equal(state.objectiveCompletedStages, 1);
  assert.equal(state.objectiveCurrentStageProgress, 0);

  // Resume and complete Stages 2 and 3 (30 seconds)
  setObjectiveInteraction(state, 'p2', true);
  for (let i = 0; i < 305; i++) {
    stepAuthoritativeMatch(state, 0.1);
  }
  assert.equal(state.objectiveCompletedStages, 3);
  assert.equal(state.lifecycle, 'MATCH_COMPLETED');
  assert.equal(state.winner, 'hiders');
});

test('Guest identity validation: Rejects reserved system identities and accepts valid guest names', () => {
  assert.equal(validateGuestDisplayName('Admin').valid, false);
  assert.equal(validateGuestDisplayName('SYSTEM_HOST').valid, false);
  assert.equal(validateGuestDisplayName('PixelRunner42').valid, true);
});

test('Exhaustive Hiding Spot Exit Movement test: All 76 hiding spots across all 4 maps allow free movement after exiting', () => {
  for (const mapId of [
    'downtown_plaza',
    'harbor_district',
    'modern_mall',
    'mystic_sanctuary',
  ] as const) {
    const state = seedTwoPlayers();
    state.config.mapId = mapId;
    const map = MAPS[mapId];
    const hider = state.players['p2'];

    for (const spawn of [...map.hiderSpawns, ...map.seekerSpawns]) {
      assert.equal(
        isPositionWallFree(spawn.x, spawn.y, 13, map),
        true,
        `Spawn point (${spawn.x}, ${spawn.y}) overlaps a wall on ${mapId}`
      );
    }

    for (const spot of map.hidingSpots) {
      const centerX = spot.x + spot.width / 2;
      const centerY = spot.y + spot.height / 2;
      const entry = findNearestCollisionFreePoint(centerX, centerY + 20, map, 14);
      hider.x = entry.x;
      hider.y = entry.y;
      hider.hiddenInSpotId = null;
      hider.rehideCooldownRemaining = 0;
      hider.lastExitedSpotId = null;
      state.hidingOccupancy[spot.id] = null;

      const enterRes = attemptEnterHidingSpot(state, 'p2', spot.id);
      assert.equal(enterRes.ok, true, `Failed to enter ${spot.id} on ${mapId}: ${enterRes.reason}`);

      const exitRes = attemptExitHidingSpot(state, 'p2');
      assert.equal(exitRes.ok, true, `Failed to exit ${spot.id} on ${mapId}`);
      assert.equal(
        isPositionWallFree(hider.x, hider.y, 13, map),
        true,
        `Player stuck in wall after exiting ${spot.id} on ${mapId} at (${hider.x}, ${hider.y})`
      );

      // Verify player can move in at least one cardinal direction after exiting
      const dirs = [
        { ix: 1, iy: 0 },
        { ix: -1, iy: 0 },
        { ix: 0, iy: 1 },
        { ix: 0, iy: -1 },
      ];
      let movedDist = 0;
      for (const d of dirs) {
        const moved = resolvePlayerMovement(hider, d.ix, d.iy, 0.05, state, map);
        movedDist = Math.max(movedDist, Math.hypot(moved.x - hider.x, moved.y - hider.y));
      }
      assert.ok(movedDist > 4, `Player unable to move after exiting ${spot.id} on ${mapId}`);
    }
  }
});

test('Minimap projection tests: Maps world coordinates accurately to relative minimap coordinates and sector labels', () => {
  const map = MAPS['downtown_plaza'];
  const center = worldToMinimapCoords(map.width / 2, map.height / 2, map.width, map.height, 168, 118);
  assert.equal(center.x, 84);
  assert.equal(center.y, 59);
  assert.equal(getCitySectorLabel(map.width / 2, map.height / 2, map.width, map.height), 'CENTER PLAZA');
  assert.equal(getCitySectorLabel(136, 140, map.width, map.height), 'NW SECTOR');
});

test('Input clamping & Diagonal normalization: Prevents speed hacking beyond base speed', () => {
  const state = seedTwoPlayers();
  state.lifecycle = 'MATCH_ACTIVE';
  const map = MAPS[state.config.mapId];
  const hider = state.players['p2'];

  // Test 1: Excessive input magnitude (e.g. 100, 100) must be normalized to speed (160 px/s)
  const dt = 0.05;
  const hackedMove = resolvePlayerMovement(hider, 100, 100, dt, state, map);
  const actualDist = Math.hypot(hackedMove.vx, hackedMove.vy);
  const expectedMaxSpeed = getPlayerSpeed('hider', state.config);
  assert.ok(Math.abs(actualDist - expectedMaxSpeed) < 0.01, `Hacked speed was ${actualDist}, expected ${expectedMaxSpeed}`);

  // Test 2: Diagonal movement magnitude should match cardinal movement speed exactly
  const cardinalMove = resolvePlayerMovement(hider, 1, 0, dt, state, map);
  const diagonalMove = resolvePlayerMovement(hider, 1, 1, dt, state, map);
  const cardinalSpeed = Math.hypot(cardinalMove.vx, cardinalMove.vy);
  const diagonalSpeed = Math.hypot(diagonalMove.vx, diagonalMove.vy);
  assert.ok(Math.abs(cardinalSpeed - diagonalSpeed) < 0.01, `Diagonal speed ${diagonalSpeed} != cardinal speed ${cardinalSpeed}`);
});

test('Line of sight & Inspection cooldown: Seeker cannot eliminate through walls and inspect has strict cooldown', () => {
  const state = seedTwoPlayers();
  state.lifecycle = 'MATCH_ACTIVE';
  const map = MAPS[state.config.mapId];

  // Pick a wall from the map to place between Seeker and Hider
  const wall = map.walls[0];
  const seeker = state.players['p1'];
  const hider = state.players['p2'];

  // Position seeker on one side of wall, hider on opposite side within elimination distance
  seeker.x = wall.x - 10;
  seeker.y = wall.y + wall.height / 2;
  hider.x = wall.x + wall.width + 10;
  hider.y = wall.y + wall.height / 2;

  // Attempt elimination across wall
  const crossWallElim = attemptDirectElimination(state, 'p1', 'p2');
  assert.equal(crossWallElim.ok, false, 'Seeker should NOT be able to eliminate hider through a wall');
  assert.equal(hider.alive, true, 'Hider should remain alive when protected by wall');

  // Test inspection cooldown
  const spot = map.hidingSpots[0];
  seeker.x = spot.x + spot.width / 2;
  seeker.y = spot.y + spot.height / 2 + 10;
  const now = Date.now();
  const firstInspect = attemptInspectHidingSpot(state, 'p1', spot.id, now);
  // May succeed or report empty
  assert.ok(firstInspect.reason !== 'Inspection on cooldown.');

  // Immediate second inspect within cooldown MUST fail with cooldown reason
  const rapidInspect = attemptInspectHidingSpot(state, 'p1', spot.id, now + 100);
  assert.equal(rapidInspect.ok, false);
  assert.equal(rapidInspect.reason, 'Inspection on cooldown.');

  // Inspect after cooldown should be permitted
  const validInspect = attemptInspectHidingSpot(state, 'p1', spot.id, now + state.config.inspectCooldownMs + 50);
  assert.ok(validInspect.reason !== 'Inspection on cooldown.');
});

test('Match lifecycle safety: Rejects movement and actions in LOBBY or MATCH_COMPLETED state', () => {
  const state = seedTwoPlayers();
  const map = MAPS[state.config.mapId];
  const hider = state.players['p2'];

  // In LOBBY state, movement returns zero velocity
  state.lifecycle = 'LOBBY';
  const lobbyMove = resolvePlayerMovement(hider, 1, 0, 0.05, state, map);
  assert.equal(lobbyMove.vx, 0);
  assert.equal(lobbyMove.vy, 0);

  // In MATCH_COMPLETED state, movement returns zero velocity
  state.lifecycle = 'MATCH_COMPLETED';
  const completedMove = resolvePlayerMovement(hider, 1, 0, 0.05, state, map);
  assert.equal(completedMove.vx, 0);
  assert.equal(completedMove.vy, 0);
});


// ───────────────────────── v2.0 gameplay rules ─────────────────────────

function activeMatch() {
  const state = seedTwoPlayers();
  state.lifecycle = 'MATCH_ACTIVE';
  state.countdownRemaining = 0;
  return state;
}

function standNextToSpot(state: ReturnType<typeof seedTwoPlayers>, playerId: string, spotIndex = 0) {
  const map = MAPS[state.config.mapId];
  const spot = map.hidingSpots[spotIndex];
  const entry = findNearestCollisionFreePoint(spot.x + spot.width / 2, spot.y + spot.height / 2 + 20, map, 14);
  state.players[playerId].x = entry.x;
  state.players[playerId].y = entry.y;
  return spot;
}

test('Inspect flush: searching an occupied object forces the hider out, stunned and revealed — but alive', () => {
  const state = activeMatch();
  const spot = standNextToSpot(state, 'p2');
  assert.equal(attemptEnterHidingSpot(state, 'p2', spot.id).ok, true);
  standNextToSpot(state, 'p1');

  // Seeker gets a "Search" contextual action at the object
  const acts = getAvailableContextualActions(state, 'p1', 50_000);
  assert.ok(acts.some((a) => a.action === 'inspect' && a.targetId === spot.id));

  const res = attemptInspectHidingSpot(state, 'p1', spot.id, 50_000);
  assert.equal(res.ok, true);
  assert.equal(res.foundPlayerId, 'p2');
  const hider = state.players['p2'];
  assert.equal(hider.alive, true, 'hiders are never killed inside an object');
  assert.equal(hider.hiddenInSpotId, null);
  assert.equal(state.hidingOccupancy[spot.id], null);
  assert.ok((hider.stunRemaining ?? 0) > 0);
  assert.ok((hider.revealedRemaining ?? 0) > 0);
  assert.ok((state.players['p1'].stunRemaining ?? 0) > 0, 'seeker is busy searching');
  assert.equal(state.events[0].type, 'flush');

  // Stunned players cannot move
  const moved = resolvePlayerMovement(hider, 1, 0, 0.05, state, MAPS[state.config.mapId]);
  assert.equal(moved.x, hider.x);
});

test('Anti spot-chaining: global re-hide cooldown after leaving ANY spot', () => {
  const state = activeMatch();
  const spot = standNextToSpot(state, 'p2', 0);
  assert.equal(attemptEnterHidingSpot(state, 'p2', spot.id).ok, true);
  assert.equal(attemptExitHidingSpot(state, 'p2').ok, true);
  const other = standNextToSpot(state, 'p2', 1);
  const blocked = attemptEnterHidingSpot(state, 'p2', other.id);
  assert.equal(blocked.ok, false);
  assert.match(blocked.reason ?? '', /Catch your breath/);
  for (let i = 0; i < 35; i++) stepAuthoritativeMatch(state, 0.1, 1000 + i * 100);
  standNextToSpot(state, 'p2', 1);
  assert.equal(attemptEnterHidingSpot(state, 'p2', other.id).ok, true);
});

test('Hide clock does not run during the head start', () => {
  const state = seedTwoPlayers();
  assert.equal(state.lifecycle, 'HIDER_HEAD_START');
  const spot = standNextToSpot(state, 'p2');
  assert.equal(attemptEnterHidingSpot(state, 'p2', spot.id).ok, true);
  for (let i = 0; i < 50; i++) stepAuthoritativeMatch(state, 0.1, 1000 + i * 100);
  assert.equal(state.players['p2'].hideTimerRemaining, state.config.maxHideDurationSeconds);
});

test('Timeout: hiders who never sent a beacon stage lose; one stage is enough to win on time', () => {
  const stalled = activeMatch();
  stalled.elapsedMatchSeconds = stalled.config.survivalTimerSeconds;
  stepAuthoritativeMatch(stalled, 0.01, 1);
  assert.equal(stalled.winner, 'seekers');

  const progressed = activeMatch();
  progressed.objectiveCompletedStages = 1;
  progressed.elapsedMatchSeconds = progressed.config.survivalTimerSeconds;
  stepAuthoritativeMatch(progressed, 0.01, 1);
  assert.equal(progressed.winner, 'hiders');
});

test('Two escape beacons: progress is tracked per beacon and any beacon advances the shared stages', () => {
  const state = activeMatch();
  const map = MAPS[state.config.mapId];
  const objectives = getMapObjectives(map);
  assert.equal(objectives.length, 2, 'every map has a central beacon plus a relay');
  for (const m of Object.values(MAPS)) {
    for (const o of getMapObjectives(m)) {
      assert.ok(isPositionWallFree(o.x, o.y, 30, m), `${o.id} must stand in the open`);
      assert.ok(findPath(m, m.hiderSpawns[0].x, m.hiderSpawns[0].y, o.x, o.y), `${o.id} reachable`);
    }
  }
  const relay = objectives[1];
  const hider = state.players['p2'];
  hider.x = relay.x;
  hider.y = relay.y + 20;
  assert.equal(setObjectiveInteraction(state, 'p2', true).ok, true);
  assert.equal(hider.objectiveId, relay.id);
  for (let i = 0; i < 151; i++) stepAuthoritativeMatch(state, 0.1, 1000 + i * 100);
  assert.equal(state.objectiveCompletedStages, 1);
  assert.equal(state.objectiveProgressById?.[map.objective.id] ?? 0, 0);
  assert.ok(state.events.some((e) => e.type === 'objective_stage' && e.message.includes(relay.label)));
});

test('Sprint burst: faster than the seeker for a moment, then on cooldown', () => {
  const state = activeMatch();
  const hider = state.players['p2'];
  const base = getPlayerSpeed('hider', state.config, hider);
  assert.equal(attemptSprint(state, 'p2').ok, true);
  const boosted = getPlayerSpeed('hider', state.config, hider);
  assert.ok(boosted > getPlayerSpeed('seeker', state.config));
  assert.ok(boosted > base);
  assert.equal(attemptSprint(state, 'p2').ok, false);
  assert.equal(attemptSprint(state, 'p1').ok, false, 'seekers cannot sprint');
});

test('Exact line of sight: thin walls block long rays', () => {
  const wall = { id: 'w', x: 500, y: 0, width: 2, height: 1000, kind: 'brick_wall' as const };
  assert.equal(hasLineOfSight(0, 500, 1000, 503, [wall]), false);
  assert.equal(hasLineOfSight(0, 500, 400, 500, [wall]), true);
});

test('Perception & anti-cheat filter: seekers never receive hidden or unseen hiders, nor occupancy', () => {
  const state = activeMatch();
  const map = MAPS[state.config.mapId];
  const spot = standNextToSpot(state, 'p2');
  assert.equal(attemptEnterHidingSpot(state, 'p2', spot.id).ok, true);
  const seekerView = filterStateForViewer(state, 'p1');
  assert.equal(seekerView.players['p2'].masked, true);
  assert.equal(seekerView.players['p2'].x, -10000);
  assert.ok(Object.values(seekerView.hidingOccupancy).every((v) => v === null));
  // The authoritative state is untouched
  assert.equal(state.players['p2'].hiddenInSpotId, spot.id);

  // Hider out in the open, far away and not moving → unseen
  attemptExitHidingSpot(state, 'p2');
  state.players['p1'].x = map.seekerSpawns[0].x;
  state.players['p1'].y = map.seekerSpawns[0].y;
  state.players['p2'].x = map.width - 120;
  state.players['p2'].y = map.height - 120;
  state.players['p2'].vx = 0;
  state.players['p2'].vy = 0;
  assert.equal(canPerceive(state, state.players['p1'], state.players['p2']), false);
  // Right next to the seeker in the open → seen
  state.players['p2'].x = state.players['p1'].x + 40;
  state.players['p2'].y = state.players['p1'].y;
  assert.equal(canPerceive(state, state.players['p1'], state.players['p2']), true);
  // Eliminated viewers spectate with full information
  state.players['p1'].alive = false;
  assert.equal(filterStateForViewer(state, 'p1'), state);
});

test('Navigation: bots can path from the hider spawn to every hiding spot on every map', () => {
  for (const map of Object.values(MAPS)) {
    const start = map.hiderSpawns[0];
    for (const spot of map.hidingSpots) {
      const path = findPath(map, start.x, start.y, spot.x + spot.width / 2, spot.y + spot.height / 2 + 20);
      assert.ok(path && path.length > 0, `no path to ${spot.id} on ${map.id}`);
    }
    assert.equal(isCorridorClear(start.x, start.y, start.x + 1, start.y, map), true);
  }
});

test('Bots: a full bot-only match always terminates with a winner', () => {
  const state = seedTwoPlayers();
  for (const p of Object.values(state.players)) p.isBot = true;
  for (let i = 0; i < 3; i++) {
    const sp = MAPS[state.config.mapId].hiderSpawns[i + 1];
    state.players[`b${i}`] = { ...state.players['p2'], id: `b${i}`, name: `b${i}`, x: sp.x, y: sp.y, colorIndex: i + 2 };
  }
  startAuthoritativeMatch(state, 'seeker');
  let now = 1_000_000;
  for (let t = 0; t < 25 * 300 && state.lifecycle !== 'MATCH_COMPLETED'; t++) {
    now += 40;
    for (const p of Object.values(state.players)) stepBotAI(state, p, 0.04, now);
    stepAuthoritativeMatch(state, 0.04, now);
  }
  assert.equal(state.lifecycle, 'MATCH_COMPLETED');
  assert.ok(state.winner === 'hiders' || state.winner === 'seekers');
});
