# Project State — CITY HIDEOUT

## 1. Current Milestone
**Milestone 6 (Complete)**: Production-Level Asset Pack Expansion (`brackeys_platformer_assets`, `Modern_Interiors_Free_v2.2`, `mystic_woods_free_2.2`, `Pixel_Art_Top_Down_-_Basic_v1.2.3`), Real WAV SFX & MP3 BGM Audio Engine (`src/game/sound.ts`), 4 Playable Maps (`76` Total Hiding Spots), 7 Playable Character Sprite Archetypes, Transparent Corner Minimap (`src/components/Minimap.tsx`), `1.2x` Seeker Speed (`192 px/s`), and **15-Second Max Hide Timer** (`maxHideDurationSeconds: 15`).

## 2. Completed Subsystems
- **Pure Authoritative Game Logic (`/src/game/rules.ts`, `/src/game/maps.ts`)**:
  - 4 playable maps (`downtown_plaza` with 18 hiding spots, `harbor_district` with 20 hiding spots, `modern_mall` with 18 hiding spots, and `mystic_sanctuary` with 20 hiding spots — `76` total hiding spots).
  - 7 playable character sprite archetypes (`male_scout`, `female_runner`, `mystic_ranger`, `toxic_slime`, `void_slime`, `dark_knight`, `skeleton_stalker`) backed by real PNG sprite sheets (`Adam_run_16x16.png`, `Amelia_run_16x16.png`, `player.png`, `slime_green.png`, `slime_purple.png`, `knight.png`, `skeleton.png`).
  - 10s Hider head-start countdown with Seeker starting-zone lock.
  - Movement & collision engine with `1.0x` Hider speed (`160 px/s`) and `1.2x` Seeker speed (`192 px/s`).
  - Hiding occupancy (`1 hider per object`), safe unobstructed exit placement across all 76 spots, **complete protection from the Killer while hidden inside an object**, and an authoritative **15-second max hide timer** (`maxHideDurationSeconds: 15`) that forces the hider out when expired.
  - Seeker close-range open-street elimination (`58px`, line-of-sight verified).
  - 3-stage × 15s (`45s` total) City-Center Escape Beacon objective.
  - Pure minimap coordinate projection (`worldToMinimapCoords`) and city sector readout (`getCitySectorLabel`).
- **Production Audio Engine (`/src/game/sound.ts`)**:
  - Preloads and plays real WAV SFX samples (`tap.wav`, `jump.wav`, `coin.wav`, `power_up.wav`, `explosion.wav`, `hurt.wav`) and optional chiptune MP3 background music (`time_for_adventure.mp3`) from `brackeys_platformer_assets`, layered with zero-latency WebAudio synthesis.
- **Authoritative Multiplayer Server (`/server.ts`)**:
  - Express + `ws` server on Port `3000` supporting all 4 maps and 7 character skins.
- **Canvas2D Pixel-Art Renderer & React 19 UI Shell (`/src/App.tsx`, `/src/game/pixelSprites.ts`, `/src/components/Minimap.tsx`)**:
  - Full-viewport Canvas2D (`imageSmoothingEnabled = false`), Title Screen 4-map live world selector & 7-character selector, BGM & Mute controls, and transparent corner minimap.

## 3. Verification Status
- `node --test src/game/rules.test.ts`: **7/7 unit tests passing** (including `1.2x` Seeker speed, `15s` max hide timer, and exhaustive verification of all 76 hiding spots and all spawn points across all 4 maps).
- `npm run lint` & `npm run build`: **Passing with 0 errors**.
- Live browser & mobile viewport inspection via `playwright-cli`: **Verified with 0 console/page/network errors**.
