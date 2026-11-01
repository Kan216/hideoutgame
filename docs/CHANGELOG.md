# Changelog — CITY HIDEOUT

## [1.9.0] — 2026-11-01
### Fixed & Improved
- **Universal Mobile, Web & PC UI Ergonomics & Viewport Responsiveness**:
  - **Title Screen Mobile Landscape Redesign (`src/App.tsx`)**: Re-architected title screen into a scroll-touch container (`scroll-touch`, `touch-pan-y`) with a `min-h-full flex flex-col justify-between` layout. Moved the 3 primary play CTAs ("Play as Guest", "Seeker 1.2x", "Multiplayer Room") directly underneath the emblem so they are immediately visible on short mobile landscape screens (320px–360px) without scrolling. Converted Map Arena and Character Skin pickers into compact horizontal swipe strips (`flex overflow-x-auto no-scrollbar touch-pan-x`).
  - **In-Game HUD Mobile Landscape Layout (`src/App.tsx`)**: Removed full-width row wrapping (`w-full` on Cluster 2) that caused the HUD to stack into 2-3 tall rows on mobile landscape. Unified the top perimeter into 3 non-wrapping clusters (`flex items-start justify-between gap-1.5 sm:gap-3 w-full`), keeping >85% of the canvas clear. Added compact alive indicator (`👤 4/4`), condensed countdown/beacon bars, and collapsible minimap toggle (`🗺️` button + tap-to-minimize).
  - **Touch Scrolling & Gesture Conflict Resolution (`src/index.css`, `src/components/LobbyModal.tsx`, `src/components/GameModals.tsx`)**: Resolved touch scroll blocking caused by global `body { touch-action: none; }` by implementing `.scroll-touch`, `.touch-pan-y`, and `.touch-pan-x` utility classes. Added `max-h-[95vh] overflow-y-auto scroll-touch touch-pan-y` and notch/safe-area insets (`env(safe-area-inset-*)`) to all modals (`LobbyModal`, `PauseModal`, `GameOverModal`, `HowToPlayModal`) so all buttons and forms remain scrollable and accessible on phones.
  - **Cross-Browser Fullscreen API (`src/App.tsx`)**: Added `webkitRequestFullscreen` / `webkitExitFullscreen` fallbacks for iOS Safari and mobile WebKit wrappers.
  - **Compact Mobile Controls (`src/components/MobileControls.tsx`)**: Optimized thumb reach margins (`px-3 pb-2.5 sm:px-8 sm:pb-6`) and button sizing (`min-h-[46px]` / `min-w-[140px]`) with safe area insets so joystick and action buttons align comfortably with thumbs without obscuring central gameplay.

## [1.8.0] — 2026-11-01
### Added
- **Commercial Production Polish & Quality-of-Life**:
  - **Match Round Timer & Countdown Audio (`src/App.tsx`, `src/game/rules.ts`, `src/game/sound.ts`)**: 4-minute survival countdown with `⏱️ MM:SS` display and procedural WebAudio countdown ticks (3, 2, 1, Release Gong!).
  - **Real-Time Event & Elimination Toast Feed (`src/App.tsx`)**: Dynamic toast stack displaying eliminations, beacon stage advances, and hiding timeouts.
  - **Living Spectator Mode (`src/App.tsx`)**: Eliminated players transition to a spectator banner with `[` / `]` keyboard and on-screen button cycling across living players.
  - **Proximity Tension Vignette & Heartbeat SFX (`src/App.tsx`, `src/game/sound.ts`)**: Radial red vignette and adaptive acoustic heartbeat audio that accelerates as a Seeker closes in within 280px.
  - **Zero-GC Floating World Combat Text (`src/game/pixelSprites.ts`, `src/App.tsx`)**: World-space floating text (`+1 STAGE COMPLETE!`, `🚪 HIDDEN`, `💨 OUT`, `⚠️ TIME OUT!`, `☠️ ELIMINATED!`) rendered without GC allocations.
  - **Network Latency Telemetry (`server.ts`, `src/App.tsx`)**: Real-time ping calculation and status badge (`🟢 <60ms`, `🟡 <140ms`, `🔴 >140ms`).
  - **Overhead Pixel-Art Speech Bubble Emotes & Tactical Callouts (`src/game/pixelSprites.ts`, `src/components/MobileControls.tsx`, `src/App.tsx`)**: 6 tactical callouts available via desktop keys 1–6 and mobile drawer.
  - **1-Click Multiplayer Room Deep-Linking (`src/components/LobbyModal.tsx`, `src/App.tsx`)**: 1-click "📋 Invite Link" button copying `?room=CODE` URLs with auto-join upon loading.
  - **Post-Match Shareable Scorecard (`src/components/GameModals.tsx`)**: "📋 Share Stats" button copying match result and stats to clipboard.
  - **Display Mode Fullscreen Toggle (`src/components/GameModals.tsx`)**: Quick fullscreen toggle in pause menu.
  - **Mobile Physical Haptics (`src/components/MobileControls.tsx`, `src/App.tsx`)**: Native vibration feedback (`navigator.vibrate`) on touch button presses, eliminations, and beacon progress.
  - **PWA Web App Manifest & App Icon (`public/manifest.json`, `public/icon.svg`, `index.html`)**: Web app manifest and vector icon for home screen installation and standalone display.

## [1.7.0] — 2026-11-01
### Added
- **Cross-Platform Mobile & PC Blueprint (`docs/CROSS_PLATFORM_MOBILE_PC.md`)**: Comprehensive specification covering dual keyboard/mouse and virtual touch controls, viewport handling, safe area insets for notches, PWA manifests, and native packaging (Capacitor & Tauri).
- **Production-Level Server Hardening (`server.ts`)**:
  - `/healthz` HTTP health and telemetry probe returning server uptime, active room count, and guest session count.
  - Per-connection rate limiting (60 msgs/sec threshold) to block socket flooding and DoS attacks.
  - Room lock on match start (`join_room` rejects join attempts if `lifecycle !== 'LOBBY'`).
  - Max player room limit (`8` players per room).
  - Server-side input clamping (`Math.max(-1, Math.min(1, input))`) preventing speed hacking.
  - Stale room auto-cleanup garbage collector removing abandoned 0-client rooms older than 2 minutes.
- **Mobile Safe Area & Viewport Enhancements (`index.html`, `src/index.css`, `MobileControls.tsx`)**:
  - Added `viewport-fit=cover`, `mobile-web-app-capable`, and `theme-color` meta tags.
  - Added `-webkit-touch-callout: none` and safe area insets to body and `MobileControls`.
- **Expanded Automated Unit Test Suite (`src/game/rules.test.ts`)**: Added 3 new tests (input clamping/diagonal normalization, line-of-sight wall checks with inspection cooldowns, match lifecycle safety), bringing total tests from 7 to 10 (all green).
### Fixed
- **Documentation Speed Consistency**: Unified Seeker speed references across `README.md`, `docs/GDD.md`, and `docs/UI_AND_CONTROLS.md` to match authoritative `1.2x` (`192 px/s`).
- **Vite Native ConfigLoader Warning**: Switched `__dirname` to `import.meta.dirname` in `vite.config.ts`.

## [1.6.0] — 2026-10-20
### Changed
- **15-Second Max Hide Timer (`maxHideDurationSeconds: 15`)**: Reduced the maximum time a Hider can stay hidden inside an object from `30s` to `15s`, after which the Hider is automatically forced out into the open. Updated the live canvas countdown bar (`[HIDDEN · 15s]`) and HUD prompts accordingly.
- **Seeker Speed Multiplier (`1.2x` / `120%`)**: Increased Killer/Seeker speed multiplier from `1.1x` (`176 px/s`) to `1.2x` (`192 px/s` vs. Hider `160 px/s`).

## [1.5.0] — 2026-10-20
### Added
- **Production Asset Pack Integration**: Extracted and integrated 4 new pixel-art & audio asset packs (`brackeys_platformer_assets`, `Modern_Interiors_Free_v2.2`, `mystic_woods_free_2.2`, and `Pixel_Art_Top_Down_-_Basic_v1.2.3`) into `/public/assets/packs/`.
- **Real WAV SFX & Optional Chiptune BGM (`src/game/sound.ts`)**: Upgraded `SoundManager` to preload and play authentic arcade WAV samples (`tap.wav`, `jump.wav`, `coin.wav`, `power_up.wav`, `explosion.wav`, `hurt.wav`) alongside low-latency WebAudio synthesis for hiding, footsteps, inspections, stage completions, and eliminations, plus a toggleable chiptune soundtrack (`time_for_adventure.mp3`).
- **2 New Maps (4 Total Arenas, 76 Total Hiding Spots)**:
  - **Modern Executive Plaza (`modern_mall`)**: 18 hiding spots across Luxury Tech Store, Executive Conference Hall, Grand Arcade Lounge, and Bistro Kitchen.
  - **Mystic Woods & Ancient Ruins (`mystic_sanctuary`)**: 20 hiding spots across Ancient Runic Temple, Mystic Ranger Lodge, Alchemist Ruins, Sacred Pond, and Enchanted Grove.
- **Real PNG Sprite Sheet Rendering (`src/game/pixelSprites.ts`)**: Added asynchronous sprite sheet loader for 7 playable character skins (`Adam`, `Amelia`, `Rowan Mystic Ranger`, `Slime Green`, `Slime Purple`, `Dark Knight`, and `Grim Skeleton Seeker`) and animated map props (`coin.png`, `fruit.png`, `chest_01.png`, `rock_in_water_01.png`), plus `PixelOperator8` pixel font registration.

## [1.4.0] — 2026-10-20
### Added
- **Transparent Corner Minimap (`src/components/Minimap.tsx`)**: Added a live translucent top-right HUD minimap during gameplay that renders the current city layout (buildings, canals, roads, seeker zone, hiding spots, and pulsing center beacon) along with the player's real-time relative position, directional facing indicator, camera viewport frame, and city sector label (`NW SECTOR`, `CENTER PLAZA`, etc.).
- **Pure Minimap Coordinate Helpers (`src/game/rules.ts`, `src/game/rules.test.ts`)**: Added `worldToMinimapCoords` and `getCitySectorLabel` with unit test verification.

## [1.3.0] — 2026-10-20
### Changed
- **Speed Ratio (`1.1x`)**: Adjusted Seeker movement speed from `1.5x` (`240 px/s`) to `1.1x` (`176 px/s`) relative to Hiders (`160 px/s`).
- **Hiding Protection & 30s Max Hide Time**: Hiders hidden inside an object cannot be killed by the Seeker (`attemptInspectHidingSpot` only reveals occupancy without eliminating). Added an authoritative `30-second` maximum hide duration (`maxHideDurationSeconds: 30`) per hiding action (`hideTimerRemaining` on `PlayerState`) with a live HUD/canvas countdown bar that automatically forces the hider out into the open after 30 seconds.

## [1.2.0] — 2026-10-20
### Fixed
- **Post-Hide Movement Bug**: Fixed `attemptExitHidingSpot` in `src/game/rules.ts` so exiting any hiding spot placed inside a cutaway building room or near a wall searches radial candidate offsets and places the player on a guaranteed collision-free tile. Added window `blur` key-clearing in `src/App.tsx` and an exhaustive unit test covering all hiding spots across all maps.
