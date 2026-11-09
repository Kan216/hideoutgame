# AGENTS.md — Permanent Coding Agent Instructions for CITY HIDEOUT

## 1. Game Concept
**CITY HIDEOUT** is a 2D pixel-art online multiplayer hide-and-seek game set in compact urban blocks.
- **Teams**: Seekers vs. Hiders.
- **Head Start**: Hiders spawn in the city-center plaza and get an authoritative **10-second head start** while Seekers remain locked in their precinct starting zone.
- **Speed Ratio**: Hiders move at `100%` base speed (`160 px/s`). Seekers move at `108%` (`1.08x` ≈ `173 px/s`) — deliberately only a little faster (balance, v2.5).
- **Hiding System**: Data-driven hiding objects (`76` total across 4 maps: `18` in Downtown Metro & Interiors, `20` in Harbor Railway & Docks, `18` in Modern Executive Plaza, and `20` in Mystic Woods & Ancient Ruins). Single-capacity occupancy (`1 hider per object`), validated on the server. Hiders are protected from the Killer while hidden inside an object, up to a **maximum hide time of 15 seconds** (`maxHideDurationSeconds: 15`) that only counts down once the seekers are released; the object emits a `rustle` noise ping 3s before the hider is forced out. After leaving ANY spot a hider has a **3s re-hide cooldown** (`rehideCooldownSeconds`) and an **8s same-spot cooldown** (`spotReuseCooldownSeconds`).
- **Seeker Search (Inspect)**: Seekers can search any hiding object in range (`E/Space`, `inspectCooldownMs: 1100`). Searching an occupied object **flushes** the hider out (never kills inside): hider stunned `0.25s` + revealed to that seeker for `1.5s`; the seeker is busy searching for `1.1s` (`inspectRecoverySeconds`).
- **Seeker Elimination**: No shooting system. Seekers eliminate hiders via close-range direct catch in the open (`58px`, exact line-of-sight check).
- **Vision & Fog of War**: Perception is shared by renderer, bots and server (`canPerceive` in `rules.ts`): enemies are seen inside the vision radius with line of sight (seeker `250px`, hider `340px`) or heard when MOVING inside the hearing radius (seeker `110px`, hider `240px`). Teammates always see each other. The server sends each client only `filterStateForViewer(state, playerId)` — never leak occupancy or unseen positions.
- **Hider Sprint**: `Shift` / mobile ⚡ button — `1.45×` speed for `2.2s`, `8s` cooldown.
- **Edible Hider Powers (snacks)**: Snacks spawn on open streets (max `4`, one every `9s`, deterministic `state.rngSeed`, ≥300px from the seeker precinct). A hider eats one by walking over it (one held power; mines come with 2 charges) and activates it with `Q` / mobile power button (`use_power` action, server-validated, not while hidden or stunned): 👻 Ghost Candy → **Invisibility Cloak 8s** (seekers perceive only within `55px`); 🛡️ Iron Apple → **Shield 12s** (blocks one catch, pushes hider away, seeker stunned `1.3s`); 💣 Pop Rocks → **2 Mines** (`15s`, arm after `0.6s`, `30px` trigger, seeker stunned `2.5s`, never sent to seekers); 💨 Smoke Pie → **Smoke Bomb 7s** (`130px`, blocks seeker sight, not hearing); 🍩 Energy Donut → **Speed Boost 10s** (`1.25×`, max with sprint). Seekers cannot eat snacks. Logic in `rules.ts` (`stepPowerUps`, `attemptUsePower`, `POWER_INFO`), visuals in `worldFx.ts`.
- **Hider Escape Objective**: TWO escape beacons per map (central beacon + far-corner relay, `getMapObjectives(map)`). **3 global stages of 15 uninterrupted seconds** at any one beacon (`45s` total). Interruption resets only that beacon's active stage. Beacons are quiet for 6s then emit a `beacon` noise ping every 3s. On timeout, hiders win only if `≥ timeoutHiderMinStages (1)` stage was completed; otherwise seekers win.
- **Bots**: `src/game/bots.ts` (A* navigation in `src/game/navigation.ts`). Bots obey the same perception rules as players — never read hidden state. Measure balance with `npm run simulate` (target ~50–70% seeker wins for 1v4 bot-only).

## 2. Technical Stack & Cross-Platform Targets
- **Views**: classic top-down 2D (default) and an optional 2.5D tilted camera (`src/game/render25d.ts`, toggled by `ch_view`). 2.5D is rendering-only: world coordinates, rules and server stay 2D. Draw ground in a `scale(1, TILT)` pass, then depth-sort raised walls / characters / snacks by world `y`.
- **Runtime & Engine**: TypeScript + HTML5 `Canvas2D` (`imageSmoothingEnabled = false`, integer camera translation) + React 19 UI Shell + Express + `ws` (WebSocket) Authoritative Server on Port `3000`.
- **Supported Targets**:
  1. Browser (Desktop & Mobile Web).
  2. Windows Desktop (via Electron/Tauri or PWA wrapper).
  3. Android Mobile (via Capacitor / Trusted Web Activity / WebView wrapper).
  4. iOS Mobile (via Capacitor WKWebView wrapper).

## 3. Architecture & Networking Rules
- **Decoupled Pure Logic**: All movement physics, collision checks, line-of-sight rays, hiding occupancy, inspections, eliminations, perception and objective timers live in `/src/game/rules.ts` and `/src/game/maps.ts`; bots in `/src/game/bots.ts` + `/src/game/navigation.ts`. Rules accept an injected `nowMs`. Client-only visuals (fog, beacon construction animation, noise rings, status FX) live in `/src/game/worldFx.ts`.
- **Server Authority**: `/server.ts` runs the authoritative 25Hz tick loop (`stepAuthoritativeMatch`) and validates all client actions (`move_input`, `hide`, `exit_hide`, `inspect`, `eliminate`, `hold_objective`, `sprint`, `use_power`). Never allow clients to claim arbitrary eliminations or instant objective completions.
- **Guest Play & Identity**: Prominent **Play as Guest** flow requiring zero email, password, or third-party login. Guest display names are validated against reserved system identities (`admin`, `system`, `server`, `moderator`, etc.). Server issues cryptographic guest session tokens (`ch_guest_token`).

## 3b. Stats & Monitoring
- `src/server/statsTracker.ts` (`StatsTracker`): live counts, per-day (UTC, 7 days) and all-time totals, 24h per-minute timeline. Counts only — never store names or other personal data.
- Server hooks: WS connect/close, `auth_guest` (anonymous unique players), online `start_match` / finish (`recordRoomMatchIfFinished`, exactly once; abandoned when the room is restarted/emptied/returned to lobby), and the client-reported `report_local_match` (`start`/`end`) for single-player games.
- `GET /api/stats` (JSON) and `GET /stats` (dashboard, `src/server/statsPage.ts`). Protected by `?key=` when the `STATS_KEY` env var is set. `STATS_FILE` sets the persistence path (default `data/stats.json`, git-ignored).

## 4. Mobile Controls & UX Rules
- Virtual thumb joystick on the bottom-left and contextual interaction button(s) on the bottom-right (`/src/components/MobileControls.tsx`).
- Phones in landscape match `sm:` width breakpoints but are short: every HUD/mobile-control size set with `sm:` must also get a compact `short:*!` override (variant defined in `src/index.css`, `max-height: 520px`).
- Show **only** actions currently valid for the player's role, distance, and state (`Hide`, `Exit Hiding`, `Hold Beacon`, `Inspect`, `Eliminate`).

## 4b. Localization (English / Burmese)
- All player-facing text goes through `t('key')` from `src/i18n.tsx`; add every new string to BOTH the `en` and `my` dictionaries (TypeScript enforces that `my` has every `en` key).
- Server-side text (events, win reasons) must also pass a translation `key` + `params` (see `pushMatchEvent`'s `i18n` argument); keep the English `message` as a fallback.
- Proper names (maps, characters, hiding spots, players) are not translated.

## 5. Testing & How to Resume Work
1. Read `/AGENTS.md` and `/docs/PROJECT_STATE.md`.
2. Run unit tests first: `node --test src/game/rules.test.ts` (29 tests incl. `src/server/statsTracker.test.ts`; run all with `npm test`). For balance changes also run `npm run simulate`.
3. Verify compilation: `npm run lint` and `npm run build`.
4. Verify live browser & two-client multiplayer behavior via `playwright-cli`.
5. Update `/docs/PROJECT_STATE.md`, `/docs/TESTING.md`, and `/docs/CHANGELOG.md` after every task.
