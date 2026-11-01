# Changelog — CITY HIDEOUT

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
