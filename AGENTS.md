# AGENTS.md — Permanent Coding Agent Instructions for CITY HIDEOUT

## 1. Game Concept
**CITY HIDEOUT** is a 2D pixel-art online multiplayer hide-and-seek game set in compact urban blocks.
- **Teams**: Seekers vs. Hiders.
- **Head Start**: Hiders spawn in the city-center plaza and get an authoritative **10-second head start** while Seekers remain locked in their precinct starting zone.
- **Speed Ratio**: Hiders move at `100%` base speed (`160 px/s`). Seekers move at `120%` (`1.2x` = `192 px/s`).
- **Hiding System**: Data-driven hiding objects (`76` total across 4 maps: `18` in Downtown Metro & Interiors, `20` in Harbor Railway & Docks, `18` in Modern Executive Plaza, and `20` in Mystic Woods & Ancient Ruins). Single-capacity occupancy (`1 hider per object`), validated on the server. Hiders are protected from the Killer while hidden inside an object, up to a **maximum hide time of 15 seconds** (`maxHideDurationSeconds: 15`), after which the hider is automatically forced out.
- **Seeker Elimination**: No shooting system. Seekers cannot kill hiders while they are hidden inside an object; Seekers eliminate hiders via close-range direct elimination in the open (with line-of-sight check) when hiders move between spots, hold the beacon, or are forced out after 15 seconds.
- **Hider Escape Objective**: City-Center Signal Beacon requiring **3 separate stages of 15 uninterrupted seconds each** (`45s` total across 3 stages). Interruption resets only the active stage.

## 2. Technical Stack & Cross-Platform Targets
- **Runtime & Engine**: TypeScript + HTML5 `Canvas2D` (`imageSmoothingEnabled = false`, integer camera translation) + React 19 UI Shell + Express + `ws` (WebSocket) Authoritative Server on Port `3000`.
- **Supported Targets**:
  1. Browser (Desktop & Mobile Web).
  2. Windows Desktop (via Electron/Tauri or PWA wrapper).
  3. Android Mobile (via Capacitor / Trusted Web Activity / WebView wrapper).
  4. iOS Mobile (via Capacitor WKWebView wrapper).

## 3. Architecture & Networking Rules
- **Decoupled Pure Logic**: All movement physics, collision checks, line-of-sight rays, hiding occupancy, inspections, eliminations, and 3-stage objective timers live in `/src/game/rules.ts` and `/src/game/maps.ts`.
- **Server Authority**: `/server.ts` runs the authoritative 25Hz tick loop (`stepAuthoritativeMatch`) and validates all client actions (`move_input`, `hide`, `exit_hide`, `inspect`, `eliminate`, `hold_objective`). Never allow clients to claim arbitrary eliminations or instant objective completions.
- **Guest Play & Identity**: Prominent **Play as Guest** flow requiring zero email, password, or third-party login. Guest display names are validated against reserved system identities (`admin`, `system`, `server`, `moderator`, etc.). Server issues cryptographic guest session tokens (`ch_guest_token`).

## 4. Mobile Controls & UX Rules
- Virtual thumb joystick on the bottom-left and contextual interaction button(s) on the bottom-right (`/src/components/MobileControls.tsx`).
- Show **only** actions currently valid for the player's role, distance, and state (`Hide`, `Exit Hiding`, `Hold Beacon`, `Inspect`, `Eliminate`).

## 5. Testing & How to Resume Work
1. Read `/AGENTS.md` and `/docs/PROJECT_STATE.md`.
2. Run unit tests first: `node --test src/game/rules.test.ts`.
3. Verify compilation: `npm run lint` and `npm run build`.
4. Verify live browser & two-client multiplayer behavior via `playwright-cli`.
5. Update `/docs/PROJECT_STATE.md`, `/docs/TESTING.md`, and `/docs/CHANGELOG.md` after every task.
