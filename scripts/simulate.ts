/**
 * Headless bot-vs-bot balance simulation.
 *
 *   npm run simulate                 # 40 matches per map, 1 seeker vs 4 hiders
 *   npm run simulate -- 100 2        # 100 matches per map, 2 seekers vs 5 hiders
 *
 * Prints win rates, win reasons and average match length per map so balance changes can be measured.
 */
import { MAPS } from '../src/game/maps.ts';
import type { MapId } from '../src/game/maps.ts';
import { createInitialMatchState, startAuthoritativeMatch, stepAuthoritativeMatch } from '../src/game/rules.ts';
import type { PlayerState } from '../src/game/rules.ts';
import { stepBotAI } from '../src/game/bots.ts';

const matchesPerMap = Number(process.argv[2] ?? 40);
const seekerCount = (Number(process.argv[3] ?? 1) === 2 ? 2 : 1) as 1 | 2;
const hiderCount = seekerCount === 2 ? 5 : 4;
const DT = 1 / 25;

function makeBot(id: string, i: number, x: number, y: number): PlayerState {
  return {
    id,
    name: id,
    role: 'hider',
    isBot: true,
    alive: true,
    x,
    y,
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
    colorIndex: i,
  };
}

let grandSeekerWins = 0;
let grandTotal = 0;
const started = Date.now();

for (const mapId of Object.keys(MAPS) as MapId[]) {
  const map = MAPS[mapId];
  let seekerWins = 0;
  let totalSeconds = 0;
  const reasons: Record<string, number> = {};
  let stagesSum = 0;
  let flushes = 0;
  let eliminations = 0;

  for (let m = 0; m < matchesPerMap; m++) {
    const state = createInitialMatchState(`SIM${m}`, 'b0', { mapId, seekerCount, ...(process.env.SIM_SPEED ? { seekerSpeedMultiplier: Number(process.env.SIM_SPEED) } : {}) });
    for (let i = 0; i < seekerCount + hiderCount; i++) {
      const spawn = map.hiderSpawns[i % map.hiderSpawns.length];
      // Jitter spawns slightly per match so runs differ deterministically.
      state.players[`b${i}`] = makeBot(`b${i}`, i + m, spawn.x + ((m * 7 + i * 13) % 9) - 4, spawn.y);
    }
    // Rotate who becomes seeker so policies vary.
    state.hostId = `b${m % (seekerCount + hiderCount)}`;
    startAuthoritativeMatch(state, 'seeker');

    let nowMs = 1_000_000 + m * 10_000_000;
    let guard = 0;
    while (state.lifecycle !== 'MATCH_COMPLETED' && guard < 25 * 60 * 8) {
      nowMs += DT * 1000;
      for (const p of Object.values(state.players)) stepBotAI(state, p, DT, nowMs);
      stepAuthoritativeMatch(state, DT, nowMs);
      for (const e of state.events) {
        if (e.timestamp === nowMs && e.type === 'flush') flushes++;
        if (e.timestamp === nowMs && e.type === 'elimination') eliminations++;
      }
      guard++;
    }
    if (state.winner === 'seekers') seekerWins++;
    totalSeconds += state.elapsedMatchSeconds;
    stagesSum += state.objectiveCompletedStages;
    const key = `${state.winner}: ${state.winReason}`;
    reasons[key] = (reasons[key] ?? 0) + 1;
  }

  grandSeekerWins += seekerWins;
  grandTotal += matchesPerMap;
  console.log(`\n=== ${map.name} (${mapId}) — ${seekerCount}v${hiderCount}, ${matchesPerMap} matches ===`);
  console.log(`  Seeker win rate : ${((seekerWins / matchesPerMap) * 100).toFixed(1)}%`);
  console.log(`  Avg match length: ${(totalSeconds / matchesPerMap).toFixed(1)}s   avg beacon stages: ${(stagesSum / matchesPerMap).toFixed(2)}`);
  console.log(`  Avg flushes/elims per match: ${(flushes / matchesPerMap).toFixed(2)} / ${(eliminations / matchesPerMap).toFixed(2)}`);
  for (const [r, n] of Object.entries(reasons).sort((a, b) => b[1] - a[1])) console.log(`    ${n.toString().padStart(4)} × ${r}`);
}

console.log(
  `\nOVERALL seeker win rate: ${((grandSeekerWins / grandTotal) * 100).toFixed(1)}% over ${grandTotal} matches (${((Date.now() - started) / 1000).toFixed(1)}s)`
);
