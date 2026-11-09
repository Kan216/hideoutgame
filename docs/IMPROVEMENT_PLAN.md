# City Hideout — Logic & Visual Improvement Plan

_Analysis date: 2026-11-09 · based on v1.9.0 (commit 3fae3e3)_

## 1. What the game is today
- **Stack**: TypeScript + Canvas2D renderer (`src/game/pixelSprites.ts`, ~1.7k lines), React 19 HUD shell (`src/App.tsx`, ~1.9k lines), pure rules (`src/game/rules.ts`), 4 maps (`src/game/maps.ts`), Express + `ws` authoritative server at 25 Hz (`server.ts`), 10 unit tests.
- **Loop**: Hiders get a 10 s head start → hide in objects (max 15 s, protected) or hold the center beacon (3 × 15 s) → Seeker (1.2× speed) catches hiders in the open with a button press. Hiders win on beacon or 4-minute timeout.

## 2. Problems found

### 2.1 Game logic / design
| # | Issue | Where | Impact |
|---|---|---|---|
| L1 | **No vision / fog of war.** Seekers see every non-hidden hider on the whole screen; hiding only matters inside objects. | `drawPlayerSprite`, renderer | Core hide-and-seek fantasy missing |
| L2 | **Inspect does nothing useful.** Inspecting an occupied spot just logs "protected"; seeker must wait out the timer. | `attemptInspectHidingSpot` | Seeker has no meaningful search action |
| L3 | **Spot chaining exploit.** Cooldown only applies to the *same* spot (4 s); hider can hop to the next spot instantly and stay protected forever. | `attemptExitHidingSpot` | Hiders near-unbeatable |
| L4 | **Timeout favours hiders** + chaining = stalling is optimal. Docs (NEXT_ACTIONS) say seekers should win on timeout — inconsistent. | `evaluateMatchWinConditions` | Boring matches |
| L5 | **Information leak / cheating.** Server broadcasts the full `MatchState` (incl. `hidingOccupancy`, hidden player x/y) to every client; event log names who is hiding where. | `broadcastRoomState` | Trivial wall-hack for seekers |
| L6 | **No client prediction / interpolation.** Online clients replace state every 40 ms → movement jitters and input lag = full RTT. | `App.tsx` `ws.onmessage` | Feels laggy online |
| L7 | **Bots have no pathfinding.** Greedy steering + perpendicular nudge; seekers patrol spots round-robin by time. Bots get stuck on buildings. | `stepBotAI` | Weak offline mode |
| L8 | Line-of-sight samples only 16 points per ray → long rays can pass through thin walls. | `segmentIntersectsRect` | Catches through walls |
| L9 | Rules use `Date.now()` / globals (`MAPS`), `SEEKER_RELEASED` lifecycle state is never entered; bot behaviour isn't seeded. | `rules.ts` | Hard to test / simulate |
| L10 | Elimination is a manual button even at point-blank; no tag animation/telegraph. | rules + UI | Feels abrupt |
| L11 | Large monolith files (`App.tsx` 1.9k lines mixing net, input, loop, HUD). | `App.tsx` | Slows every change |

### 2.2 Visuals
| # | Issue | Impact |
|---|---|---|
| V1 | Mixed fidelity: procedural rectangles for buildings next to real 16 px sprite sheets; mismatched pixel scales (16 px sprites drawn at 48 px next to 1 px lines). | Inconsistent art style |
| V2 | No lighting/atmosphere; "streetlights" are flat circles. No day/night mood. | Flat look |
| V3 | Whole map is redrawn procedurally every frame (no cached static layer). | Wasted CPU, mobile battery |
| V4 | No roof occlusion / building interiors fade; players and roofs not y-sorted together. | Weak depth |
| V5 | Little character animation feedback (no squash/stretch, no hide/exit animation on the object itself, no catch animation). | Low "juice" |
| V6 | Hiding spots don't telegraph state (shake when occupied & seeker is near, timer warning visible to seeker as a "rustle"). | Missed tension moments |
| V7 | HUD is dense, emoji-heavy text; few icons; different fonts (JetBrains Mono vs. PixelOperator). | Readability |

## 3. Plan (phased, each phase shippable)

### Phase 0 — Foundations (½ day)
- [ ] Install deps, confirm `npm test`, `npm run lint`, `npm run build` pass; capture baseline screenshots with the `game-playtest` skill.
- [ ] Inject time/RNG into rules (`nowMs`, `rng`) so behaviour is deterministic; remove direct `Date.now()` in `rules.ts`.
- [ ] Add a headless **bot-vs-bot simulation script** (`scripts/simulate.ts`) printing win-rate and match length per map → balance baseline.
- [ ] Split `App.tsx`: `net/client.ts` (WS), `game/loop.ts` (RAF + sim), `input/keyboard.ts`, `hud/*` components.

### Phase 1 — Core logic fixes (1–2 days)
- [ ] **L3** Global re-hide cooldown (e.g. 3 s after any exit) + per-spot cooldown 8 s.
- [ ] **L2** Inspect rework: inspecting an occupied spot **flushes** the hider out (stunned 0.6 s, no protection) *or* reveals them with a 3 s "marked" outline — pick via config, sim both.
- [ ] **L4** Decide timeout winner (recommend: seekers win on timeout if beacon < 2 stages; else hiders) and sync docs.
- [ ] **L8** Exact segment–AABB (slab) intersection for LOS.
- [ ] Use the `SEEKER_RELEASED` state for a 1 s "release" phase or remove it.
- [ ] Tests for each change; run simulation, target 45–55 % seeker win rate.

### Phase 2 — Vision & fair multiplayer (2–3 days)
- [ ] **L1** Visibility polygon (raycast to wall corners) per player; seekers: 360° radius ~260 px + forward cone ~420 px; hiders: radius ~300 px.
- [ ] Render fog-of-war darkness outside vision; hide enemies outside LOS; show "last seen" ghost markers.
- [ ] **L5** Per-viewer state filtering in `server.ts` (strip occupancy, hidden positions, out-of-vision hiders, sanitized event text for seekers).
- [ ] Noise mechanic: running near seekers / exiting a spot emits a ripple visible to seekers through fog (gives seekers clues, rewards careful hiders). Optional sneak (slow-walk, silent).
- [ ] **L6** Client-side prediction for the local player with server reconciliation; 100 ms interpolation buffer for remote players; send input sequence numbers.

### Phase 3 — Smarter bots (1–2 days)
- [ ] **L7** Nav grid + A* per map (cached), path smoothing.
- [ ] Seeker memory: last-seen position, noise events, inspect spots near those; difficulty levels (Easy/Normal/Hard).
- [ ] Hider bots rotate spots before timer expires, avoid seeker vision, coordinate beacon holding.

### Phase 4 — Visual overhaul (3–4 days)
- [ ] **V3** Pre-render static map layers to offscreen canvas; viewport culling (perf budget: 60 fps on mid phones).
- [ ] **V1** Unified pixel scale: render at 1× to a low-res buffer (e.g. 480×270 × integer scale), use real tilesets (Modern Interiors / Mystic Woods / Pixel Art Top Down) for floors, walls, roofs instead of flat rects.
- [ ] **V2** Lighting pass: ambient darkness + light sprites for streetlights, beacon, windows; dusk/night variants per map. Combine with fog of war (Phase 2).
- [ ] **V4** Roof occlusion fade when inside buildings; y-sort players with tall props.
- [ ] **V5/V6** Juice pass (see `game-feel-juice` skill): squash/stretch, dust trails, hide/exit object wobble, hit-stop + flash on catch, beacon stage shockwave, occupied-spot rustle when timer < 4 s.
- [ ] **V7** HUD redesign: single pixel font, icon set, clearer role banner, beacon progress ring around the beacon in-world.
- [ ] Settings: reduced motion, screen shake toggle, colour-blind safe team colours.

### Phase 5 — Content & retention (later)
- Power-ups (decoy, smoke bomb, flashlight, radar ping), round rotation (swap roles), XP/cosmetic unlocks, map hazards (moving cars, doors), more maps built with a Tiled JSON import.

## 4. Recommended order
1. Phase 0 → 1 (fix what makes matches broken: L3, L2, L4).
2. Phase 2 vision + state filtering (biggest gameplay upgrade and fixes cheating).
3. Phase 4 visuals in parallel with Phase 3 bots.

## 5. Claude skills added for this project (`.claude/skills/`)
| Skill | Use for |
|---|---|
| `hide-seek-balance` | rule changes, balance tuning, bots, server state filtering |
| `pixel-canvas-rendering` | lighting, fog of war, caching, sprite animation |
| `game-feel-juice` | feedback/polish pass |
| `game-playtest` | run the game, Playwright screenshots, FPS, multiplayer checks |
