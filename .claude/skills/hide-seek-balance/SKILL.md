---
name: hide-seek-balance
description: Game-logic and balance design for City Hideout's hide-and-seek rules (rules.ts, server.ts) — hiding, inspection, vision, beacon objective, bots/pathfinding, win conditions and anti-cheat state filtering. Use when changing gameplay rules, tuning numbers, improving AI bots or fixing logic exploits.
---

# Hide & Seek Logic and Balance

Source of truth: `src/game/rules.ts` (pure, shared by client offline mode and the authoritative server `server.ts`), maps in `src/game/maps.ts`, tests in `src/game/rules.test.ts`.

## Principles
1. **Pure & deterministic**: rules take `(state, dt, nowMs)`; no `Date.now()`/`Math.random()` inside rules without injection — pass time/RNG in so tests are reproducible.
2. **Server authority**: clients send intents only. The server must **filter state per viewer** before broadcasting (seekers must not receive `hidingOccupancy` for others, hidden hider positions, or hiders outside their vision).
3. **Every rule change needs a test** in `rules.test.ts` (`npm test`).
4. Keep `AGENTS.md`/`docs/GDD.md` numbers in sync with `DEFAULT_MATCH_CONFIG`.

## Balance levers (tune one at a time, record in docs/CHANGELOG.md)
| Lever | Config | Effect |
|---|---|---|
| Seeker speed | `seekerSpeedMultiplier` | chase pressure |
| Hide limit | `maxHideDurationSeconds` | forces movement |
| Spot re-use cooldown | exit cooldown (currently hard-coded 4 s) | stops spot camping/chaining |
| Inspect | `inspectCooldownMs`, inspect outcome | seeker's search value |
| Beacon | stages × duration | hider win pace |
| Round timer & timeout winner | `survivalTimerSeconds` | stalling incentive |

## Healthy-loop targets
- Seeker win rate 45–55 % in bot-vs-bot sims across maps.
- Hiders should need to move at least every ~20 s; seekers should have a meaningful action every ~5–10 s.
- Write a headless simulation (bots only, N=200 matches/map, seeded RNG) that prints win rates and average match length before and after a change.

## Bots
- Use grid A* (cell 16–24 px) built from `map.walls` once per map; cache the nav grid. Follow path with look-ahead smoothing.
- Seekers: remember "last seen" positions and noise events; search nearby spots, not round-robin.
- Hiders: evaluate spots by distance from seekers *and* seeker LOS, rotate before the hide timer expires.
