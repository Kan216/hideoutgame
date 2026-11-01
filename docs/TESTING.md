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
