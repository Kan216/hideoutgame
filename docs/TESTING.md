# Testing Plan & Verification Report — CITY HIDEOUT

## 1. Acceptance Criteria & Automated Unit Tests (`src/game/rules.test.ts`)
Executed via Node's native test runner (`node --test src/game/rules.test.ts`):
- **Movement & Speed Ratio**: Verified Seeker speed (`192 px/s`) is `1.2×` Hider speed (`160 px/s`), Seekers are locked in `seekerSpawnZone` during the 10-second `HIDER_HEAD_START`, and Hiders move freely while colliding with solid walls.
- **Hiding System & 15s Max Hide Timer**: Verified Hiders can enter valid unoccupied hiding spots within range, single-capacity spots reject a second occupant, hidden players cannot walk normally, and hidden hiders automatically exit after `15 seconds` (`maxHideDurationSeconds: 15`).
- **Hiding Protection & Open-Street Elimination**: Verified Seeker cannot eliminate during the 10s head start, cannot kill a Hider while the Hider is hidden inside an object, and eliminates the Hider in the open once the Hider exits or is forced out after 15 seconds.
- **3-Stage × 15s Escape Objective**: Verified holding the City-Center Beacon for 15 uninterrupted seconds completes Stage `1/3`, interrupting progress at `7s` into Stage `2/3` resets current stage progress to `0s` while preserving Stage `1/3`, and completing Stage `3/3` immediately awards Hider Victory.
- **Guest Display Name Validation**: Verified reserved system identities (`Admin`, `SYSTEM_HOST`) are rejected while valid guest names (`PixelRunner42`) pass.
- **Exhaustive Hiding Spot Exit Movement (All 76 Spots Across 4 Maps)**: Verified entering and exiting every hiding spot across `downtown_plaza` (18 spots), `harbor_district` (20 spots), `modern_mall` (18 spots), and `mystic_sanctuary` (20 spots) places the player in a wall-free coordinate and allows immediate movement, and verified all Hider/Seeker spawn points across all 4 maps are collision-free.
- **Minimap Relative Coordinate Projection**: Verified `worldToMinimapCoords` and `getCitySectorLabel` map world coordinates accurately onto the corner minimap (`168×118`) and sector readouts (`CENTER PLAZA`, `NW SECTOR`).
- **Input Clamping & Diagonal Normalization (Test 8)**: Verified extreme input vectors (e.g. `(100, 100)`) are normalized server-side to maximum allowable speed (`160 px/s`), and diagonal movement velocity matches cardinal velocity without diagonal speed boosting.
- **Line of Sight & Inspection Cooldown (Test 9)**: Verified Seeker cannot eliminate a Hider when blocked by solid walls, and Seeker inspect action strictly enforces a `600ms` cooldown timer.
- **Match Lifecycle Safety (Test 10)**: Verified movement physics enforce zero velocity during `LOBBY` and `MATCH_COMPLETED` phases.

### v2.0 additions (Tests 11–20)
- **Inspect flush** (hider forced out alive, stunned + revealed, seeker busy), **re-hide cooldown**, **hide clock paused during head start**, **timeout winner rule**, **two beacons** (all beacons wall-free & reachable, per-beacon progress, relay completes shared stage), **sprint**, **exact LOS through thin walls**, **perception & anti-cheat filter**, **A* reachability of all 76 hiding spots**, **bot-only match terminates**.
- Inspect cooldown is now `1100ms` (Test 9 uses `config.inspectCooldownMs`).

### Balance simulation
`npm run simulate [matchesPerMap] [seekerCount]` — headless bot-vs-bot. Latest (30/map, 1v4): Downtown 87%, Harbor 63%, Modern 83%, Mystic 67% seeker wins (≈75% overall, ≈100s matches). 2v5 bot-only is still 100% seeker — see IMPROVEMENT_PLAN follow-ups.

### v2.4.0 2.5D view
- Playwright with `ch_view=25d`: desktop 1280×720 and phone 853×393 matches at 61–62 fps, 0 console errors; raised buildings with side walls/parallax, fog dimming of unseen buildings, player standing behind Precinct HQ is occluded and the local x-ray outline shows. 2D default unchanged (61 fps).

### v2.3.0 Burmese language
- Playwright with `ch_lang=my`: title, how-to-play, in-game HUD + action prompt + toasts, pause menu (language toggle), phone landscape controls — Burmese renders with Noto Sans Myanmar, no layout overflow, 0 console errors; English default unchanged.

### v2.2.0 stats
- `src/server/statsTracker.test.ts` (3): counting & win rate & averages, abandoned matches (restart/disconnect/8-min timeout), 24h timeline cap + save/reload.
- E2E against the dev server with `STATS_KEY`: 401 without key; `?autostart=1` local match counted live (report queued until WS ready); quitting → "quit early"; forced finish → seeker win with duration; online room match counted. Dashboard rendered at 1280×900 (light) and 390×844 (dark) with real and sample data: no horizontal overflow, 0 console errors.

### v2.1.0 power-ups (Tests 21–26)
- Snack spawning (capped, wall-free) & eating (hiders only), cloak perception + expiry, shield block + seeker stun, mines (2 charges, arming delay, hidden from seekers, stun), smoke blocks sight + fades, speed boost & empty-slot / seeker rejection.
- Playwright desktop 1280×720 + phone 853×393: eat a snack → HUD chip / mobile power button; `Q` / tap activates shield; 0 console errors. Render harness screenshot of all snack/power visuals.
- WebSocket: snacks present in both clients' state; empty `use_power` safely rejected.

### v2.0.1 mobile landscape HUD check
- Playwright Android landscape 853×393 (touch, DPR 2): seeker after release, callout bar open, hider during head start — HUD occupies only the top strip + corners; desktop 1280×720 unchanged; 0 console errors.

### v2.0 browser verification (Playwright, headless Chromium)
- Desktop 1280×720 offline match: 60 fps, 0 console errors, fog of war, relay beacon, noise rings, sprint HUD.
- iPhone 13 landscape: sprint button + shortened HOLD BEACON button.
- Online: node WS host + browser guest via `?room=CODE`: seeker client receives masked hiders and all-null occupancy; hider client receives masked out-of-sight seeker; sprint action works; browser renders bot transmitting beacon with construction animation.

## 2. Browser, Mobile & Multi-Client Verification (`playwright-cli`)
- **Desktop Viewport (`1440×900`)**: Title screen renders live pixel-art world tour + 4-map selector + 7-skin selector + BGM toggle; clicking **Play as Guest** enters `'playing'` immediately with 10s head-start countdown, real PNG character/object sprites, WAV SFX, unobstructed HUD + corner minimap, real-time toast feed, round timer, zero-GC floating world combat feedback text, and spectator mode target cycling.
- **Mobile Viewport (`390×844` Portrait & `667×375` / `740×360` Landscape)**:
  - Title screen displays primary action buttons ("Play as Guest", "Seeker 1.2x", "Multiplayer Room") immediately below emblem without scrolling.
  - Horizontal swipe strips for Map Arena and Character Skin selection allow rapid browsing in 34px vertical height.
  - In-game HUD keeps >85% canvas area completely clear with a 3-cluster single-line top perimeter and collapsible minimap.
  - Virtual thumb joystick and contextual action buttons render cleanly with thumb-reachable margins, notch/safe-area insets (`env(safe-area-inset-*)`), and physical vibration feedback (`navigator.vibrate`).
  - All modals (`LobbyModal`, `PauseModal`, `GameOverModal`, `HowToPlayModal`) feature smooth touch-scrolling (`scroll-touch`, `touch-pan-y`) with `max-h-[95vh]` constraint preventing overflow clipping.
- **Online Multiplayer Lobby & Invite Links**: Creating an online room over WebSocket (`/ws`) supports all 4 maps and 7 skins, generates a 6-character Room Code, provides 1-click "📋 Invite Link" deep-linking (`?room=CODE`), and auto-joins rooms upon loading.
- **PWA & Offline Capability**: PWA manifest (`public/manifest.json`) and vector favicon icon (`public/icon.svg`) verified with standalone display capability and WebKit fullscreen toggle.
