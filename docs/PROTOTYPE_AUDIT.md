# Prototype Audit — CITY HIDEOUT

> **Purpose**: Honest assessment of every subsystem — what works today vs. what a publicly launched multiplayer game needs.

## Overall Verdict

| Area | Prototype Status | Production Ready? |
|------|:---:|:---:|
| Core game rules & physics | ✅ Solid | ⚠️ Mostly |
| Authoritative server | ✅ Functional | ❌ Not production-hardened |
| Guest identity system | ✅ Working | ⚠️ Needs abuse protections |
| Multiplayer networking | ✅ Room-based play works | ❌ Missing critical infra |
| Client rendering & UX | ✅ Pixel-art renders well | ⚠️ Needs polish pass |
| Mobile controls | ✅ Functional | ⚠️ Needs real-device testing |
| Audio system | ✅ Web Audio synth works | ⚠️ Limited variety |
| Testing & QA | ✅ 7 unit tests pass | ❌ Far too few for launch |
| Security & anti-cheat | ❌ Minimal | ❌ Critical gap |
| Scalability & ops | ❌ Not addressed | ❌ Critical gap |
| Analytics & monitoring | ❌ None | ❌ Critical gap |
| Content depth | ⚠️ 4 maps, 7 skins | ⚠️ Thin for retention |
| Onboarding & tutorials | ❌ None | ❌ Players will be confused |
| Accessibility | ❌ Not addressed | ⚠️ Important for public launch |
| Legal & compliance | ❌ Not addressed | ❌ Required before launch |

---

## 1. SERVER & INFRASTRUCTURE

### 1.1 Single-Process Server (CRITICAL)
**Current**: One Node.js process runs Express + WebSocket + 25Hz game loop. All state is in-memory (`Map` objects).

**Problems for production**:
- Server crash = all rooms, all sessions, all match state **gone instantly**.
- Single-threaded Node.js: one room with heavy bot AI stalls all other rooms.
- No horizontal scaling — you cannot add a second server.
- No graceful shutdown or state persistence.

**What's needed**:
- Process manager (PM2 or container orchestrator) with auto-restart.
- Redis or similar for session store + room registry (survives restarts).
- Room-to-worker assignment so one bad room doesn't crash everything.
- Health check endpoint (`/healthz`) for Render/Railway liveness probes.

### 1.2 No Rate Limiting or Input Validation Hardening
**Current**: Any WebSocket client can flood `move_input` messages at unlimited rate. Malformed JSON just `catch`-es silently.

**What's needed**:
- Per-connection message rate limiting (e.g., max 60 msgs/sec).
- Input magnitude clamping (reject `ix: 99999`).
- Action cooldown enforcement server-side (already partial for inspect).
- Connection flood protection (max connections per IP).

### 1.3 No HTTPS/WSS in Production
**Current**: Server listens on `http://0.0.0.0:3000`. Render/Railway provide TLS termination, but the app doesn't enforce it.

**What's needed**:
- Force HTTPS redirect middleware.
- `Secure` flag on any future cookies.
- CSP headers for XSS protection.

### 1.4 No Logging or Monitoring
**Current**: Only `console.log` for server start and `console.error` for message parse failures.

**What's needed**:
- Structured JSON logging (match events, player joins/leaves, errors).
- Error tracking service (Sentry free tier, or LogTail).
- Uptime monitoring (UptimeRobot free tier).

---

## 2. GAME LOGIC & BALANCE

### 2.1 Speed Ratio Inconsistency
**Current**: `AGENTS.md` says Seeker = `1.2x` (`192 px/s`). `README.md` and `GDD.md` say `1.5x` (`240 px/s`). Code must match one.

**Action**: Verify actual speed in `rules.ts`, update all docs to match.

### 2.2 No Match Timer / Round Length Cap
**Current**: Matches can last forever if hiders continuously re-hide and never touch the beacon.

**What's needed**:
- Configurable max round duration (e.g., 3–5 minutes).
- Auto seeker-win if timer expires.

### 2.3 Bot AI is Basic
**Current**: `stepBotAI` exists but bots are predictable. Fine for prototype, but players will notice quickly.

**What's needed**:
- Randomized patrol paths.
- Bots that actually use hiding spots strategically.
- Difficulty tiers (Easy/Medium/Hard).

### 2.4 No Anti-Grief Mechanics
**Current**: Host can restart matches endlessly, no vote-kick, no AFK detection.

**What's needed**:
- AFK kick timer (60s no input → spectator or kicked).
- Player reporting (even a basic flag system).
- Host migration if host leaves mid-match.

---

## 3. NETWORKING & MULTIPLAYER

### 3.1 Full State Broadcast Every Tick (CRITICAL)
**Current**: `broadcastRoomState` sends the **entire** `MatchState` JSON to **every** client on every 25Hz tick.

**Problems**:
- Huge bandwidth waste (~2–5 KB × 25 ticks/sec × N clients).
- Doesn't scale beyond ~8–10 players per room.

**What's needed**:
- Delta compression (only send what changed since last tick).
- Or binary protocol (MessagePack/FlatBuffers) for state snapshots.
- Client-side interpolation between server snapshots.

### 3.2 No Client-Side Prediction
**Current**: Client sends input, waits for next server state broadcast to see movement.

**Problems**: Noticeable input lag, especially on mobile networks (100-200ms RTT).

**What's needed**:
- Client predicts local player movement immediately.
- Server corrections reconcile on mismatch.
- Entity interpolation for other players (smoothed rendering).

### 3.3 No Reconnection Grace Period
**Current**: Disconnect sets `connected: false` and stops movement. Player data persists in room, but there's no timeout.

**What's needed**:
- 30-second reconnection window before removing player from match.
- Visual indicator showing "Player X reconnecting…".
- Proper state restoration on reconnect.

### 3.4 No Room Cleanup
**Current**: Empty rooms stay in the `rooms` Map forever until server restart.

**What's needed**:
- Periodic cleanup of rooms with 0 connected clients (e.g., every 60s).
- Match result archival before cleanup.

---

## 4. CLIENT & USER EXPERIENCE

### 4.1 No Tutorial or Onboarding
**Current**: "How to Play" modal exists but new players don't know what hiding spots look like, how the beacon works, or what the minimap shows.

**What's needed**:
- Interactive 30-second tutorial match (guided by text prompts).
- Visual callouts highlighting hiding spots on first play.
- Animated beacon indicator during objective.

### 4.2 No Loading Screen or Connection Feedback
**Current**: WebSocket connects silently. If server is cold-starting on Render (30s), the player stares at nothing.

**What's needed**:
- "Connecting to server…" loading screen with spinner.
- Connection error state with retry button.
- Server status indicator in lobby.

### 4.3 No Sound Settings Granularity
**Current**: Global mute toggle only.

**What's needed**:
- Separate SFX / Music volume sliders.
- Volume persistence in localStorage.

### 4.4 App.tsx is a 1,463-Line Monolith
**Current**: All game logic, rendering, input handling, WebSocket management, and UI in one file.

**What's needed**:
- Extract WebSocket client into `src/network/wsClient.ts`.
- Extract input manager into `src/input/inputManager.ts`.
- Extract canvas renderer into `src/renderer/gameRenderer.ts`.
- Extract game screens into separate components.

---

## 5. SECURITY & ANTI-CHEAT

### 5.1 No Server-Side Speed Validation
**Current**: Server applies client-provided input vectors to `resolvePlayerMovement`, but doesn't validate that the client isn't modifying the movement speed constant.

**What's needed**:
- Server defines and enforces max movement speed per role.
- Reject/clamp positions that exceed server-calculated maximums.

### 5.2 No Action Spam Protection
**Current**: A client can send `hide` → `exit_hide` → `hide` → `exit_hide` 100 times per second.

**What's needed**:
- Server-side cooldown on hide/exit actions (e.g., 500ms).
- Rate-limit all action types.

### 5.3 No Room Access Controls
**Current**: Anyone with a room code can join, even if the match is in progress.

**What's needed**:
- Room lock (auto-lock when match starts).
- Max player limit per room (e.g., 8).
- Optional room password.

---

## 6. CONTENT & RETENTION

### 6.1 No Progression System
**Current**: Every match is standalone. No stats, no unlocks, no reason to come back.

**What's needed for retention**:
- Per-session stats tracking (games played, wins, eliminations).
- Unlockable skins/colors (even cosmetic-only).
- Daily/weekly challenges.

### 6.2 Only 2 Core Map Layouts
**Current**: 4 maps exist, but Downtown Plaza and Harbor District are the primary designed ones. Modern Mall and Mystic Sanctuary may be less polished.

**What's needed**: Verify all 4 maps are equal quality, or clearly mark 2 as "Beta".

### 6.3 No Social Features
**Current**: Room codes work, but there's no friend list, no chat, no emotes.

**Minimum viable social features**:
- In-game text chat (lobby only, with profanity filter).
- Quick-chat emotes during gameplay ("Help!", "Over here!", "GG").

---

## 7. LEGAL & COMPLIANCE

### 7.1 Asset Licensing Audit Required
**Current**: 4 asset packs integrated. Free versions from itch.io often have specific license terms (credit required, no commercial use, etc.).

**Action**: Verify license for each pack:
- `Pixel_16_interiors_v2_free`
- `PixelSpaces Free Pack`
- `fantasy_ [version 2.0]`
- `sprites / music / sounds` pack

### 7.2 No Privacy Policy or Terms of Service
**Current**: Guest tokens are stored. No disclosure to users about what data is collected.

**Action**: Create basic privacy policy and ToS pages (required for app stores, good practice for web).

### 7.3 No COPPA / Age Gate Considerations
**Current**: Game targets a broad audience. If under-13 players use it, COPPA regulations may apply.

**Action**: Add age disclaimer or ensure no personal data is collected.

---

## Priority Matrix

| Priority | Items | Effort |
|:---:|---|:---:|
| 🔴 **P0 — Must fix before public launch** | Server crash recovery, rate limiting, room cleanup, loading states, asset license audit, full-state broadcast optimization | 2–3 weeks |
| 🟠 **P1 — Should fix for good experience** | Client-side prediction, tutorial, reconnection grace period, App.tsx refactor, match timer, anti-cheat basics | 2–3 weeks |
| 🟡 **P2 — Important for retention** | Progression system, social features, bot AI improvements, sound settings, analytics | 3–4 weeks |
| 🟢 **P3 — Polish for professional launch** | Privacy policy, accessibility, more maps/skins, leaderboards, mobile app store wrappers | 2–4 weeks |

> **Estimated total**: 10–14 weeks of focused development to go from prototype → production-ready public game.
