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

## 2. Browser, Mobile & Multi-Client Verification (`playwright-cli`)
- **Desktop Viewport (`1440×900`)**: Title screen renders live pixel-art world tour + 4-map selector + 7-skin selector + BGM toggle; clicking **Play as Guest** enters `'playing'` immediately with 10s head-start countdown, real PNG character/object sprites, WAV SFX, and unobstructed HUD + corner minimap.
- **Mobile Viewport (`390×844` & Landscape)**: Virtual thumb joystick and contextual right-side action buttons (`HIDE INSIDE`, `HOLD BEACON`, `INSPECT OBJECT`, `ELIMINATE HIDER`) render cleanly with `>=56px` touch targets.
- **Online Multiplayer Lobby**: Creating an online room over WebSocket (`/ws`) supports all 4 maps and 7 skins, generates a 6-character Room Code, and synchronizes room state.
