# Project State — CITY HIDEOUT

## 1. Current Milestone
**Milestone 9 (Complete)**: Universal Mobile, Web & PC UI Ergonomics & Viewport Responsiveness — Redesigned Title screen with instant play CTAs above the fold on mobile landscape, horizontal swipe strips for maps and skins, non-wrapping 3-cluster in-game HUD with collapsible minimap, touch-scrollable modals (`scroll-touch`, `touch-pan-y`, `max-h-[95vh]`), notch/safe-area insets (`env(safe-area-inset-*)`), WebKit fullscreen fallbacks, and thumb-ergonomic virtual joystick and action buttons.

## 2. Completed Subsystems
- **Pure Authoritative Game Logic (`/src/game/rules.ts`, `/src/game/maps.ts`)**:
  - 4 playable maps (`downtown_plaza` with 18 hiding spots, `harbor_district` with 20 hiding spots, `modern_mall` with 18 hiding spots, and `mystic_sanctuary` with 20 hiding spots — `76` total hiding spots).
  - 7 playable character sprite archetypes (`male_scout`, `female_runner`, `mystic_ranger`, `toxic_slime`, `void_slime`, `dark_knight`, `skeleton_stalker`) backed by real PNG sprite sheets (`Adam_run_16x16.png`, `Amelia_run_16x16.png`, `player.png`, `slime_green.png`, `slime_purple.png`, `knight.png`, `skeleton.png`).
  - 10s Hider head-start countdown with Seeker starting-zone lock.
  - Movement & collision engine with `1.0x` Hider speed (`160 px/s`) and authoritative `1.2x` Seeker speed (`192 px/s`).
  - Hiding occupancy (`1 hider per object`), safe unobstructed exit placement across all 76 spots, **complete protection from the Killer while hidden inside an object**, and an authoritative **15-second max hide timer** (`maxHideDurationSeconds: 15`) that forces the hider out when expired.
  - Seeker close-range open-street elimination (`58px`, line-of-sight verified through walls).
  - 3-stage × 15s (`45s` total) City-Center Escape Beacon objective.
  - 4-minute (`240s`) match survival round timer (`formatMatchTime`, timeout win for living hiders).
  - Pure minimap coordinate projection (`worldToMinimapCoords`) and city sector readout (`getCitySectorLabel`).
- **Production Audio Engine (`/src/game/sound.ts`)**:
  - Real WAV SFX samples (`tap.wav`, `jump.wav`, `coin.wav`, `power_up.wav`, `explosion.wav`, `hurt.wav`) and optional chiptune MP3 background music (`time_for_adventure.mp3`) from `brackeys_platformer_assets`.
  - Procedural WebAudio synthesis for countdown beeps (3, 2, 1, Seeker Gong!), heartbeat tension pulse (<280px proximity), forced hide exit alarm, and stage completion chimes.
- **Authoritative Multiplayer Server (`/server.ts`)**:
  - Express + `ws` server on Port `3000` supporting all 4 maps and 7 character skins.
  - `/healthz` liveness and telemetry endpoint (`status`, `uptime`, `roomsCount`, `sessionsCount`).
  - Stale room auto-cleanup garbage collector removing abandoned rooms after 2 minutes.
  - Per-connection rate limiting (60 msgs/second threshold) preventing socket spamming.
  - Input magnitude clamping (`[-1, 1]`) and room locking during active matches (`max 8 players`).
  - Echo `ping`/`pong` latency calculation and broadcast `send_emote` support.
- **Canvas2D Pixel-Art Renderer & React 19 UI Shell (`/src/App.tsx`, `/src/game/pixelSprites.ts`, `/src/components/MobileControls.tsx`, `/src/components/GameModals.tsx`, `/src/components/LobbyModal.tsx`)**:
  - Full-viewport Canvas2D (`imageSmoothingEnabled = false`), Title Screen 4-map live world selector & 7-character selector, BGM & Mute controls, and transparent corner minimap.
  - Zero-GC floating world combat feedback text and overhead pixel-art speech bubbles.
  - Living Spectator Mode with camera tracking and living player cycling (`[` / `]`).
  - Adaptive Mobile Touch Controls: Left Virtual Joystick with vector clamping & configurable sensitivity + Right contextual role action buttons with notch and gesture bar safe-area insets (`env(safe-area-inset-*)`).
  - Mobile physical haptics (`navigator.vibrate`), fullscreen toggle, 1-click room invite link deep linking (`?room=CODE`), and post-match scorecard sharing.
  - Web App Manifest (`public/manifest.json`) and vector PWA app icon (`public/icon.svg`).

## 3. Verification Status
- `node --test src/game/rules.test.ts`: **10/10 unit tests passing** (movement physics, speed ratios, hiding protection, 15s timer, 76 hiding spot exits, guest identity validation, minimap projections, input magnitude clamping, line-of-sight wall checks, inspect cooldowns, and match lifecycle safety).
- `npm run lint`: **Passing with 0 errors**.
- `npm run build`: **Passing with 0 errors (Vite production bundle built cleanly)**.

