# Next Actions Checklist — CITY HIDEOUT
# Immediate tasks to start moving from prototype to production

> **How to use**: Work through this list top-to-bottom. Each item is a standalone task.
> Check the box when done. Reference the full [PRODUCTION_ROADMAP.md](./PRODUCTION_ROADMAP.md) for context.

---

## 🔴 Week 1 — Critical Server Fixes (Do These First)

- [x] **Fix speed ratio inconsistency across docs**
  - `AGENTS.md` says `1.2x` (192 px/s), `README.md` says `1.5x` (240 px/s)
  - Verified `rules.ts` uses `1.2x` (`160` vs `192` px/s). Updated `README.md`, `GDD.md`, `UI_AND_CONTROLS.md`.
  - Files: `AGENTS.md`, `README.md`, `GDD.md`, `UI_AND_CONTROLS.md`, `PROJECT_STATE.md`

- [x] **Add health check endpoint**
  - Added `/healthz` endpoint returning status, uptime, room count, and active guest sessions count in `server.ts`.

- [x] **Add stale room cleanup**
  - Added 60s garbage collection loop deleting rooms with 0 connected clients older than 2 minutes in `server.ts`.

- [x] **Add WebSocket rate limiting**
  - Added per-connection message rate limiter in `server.ts` enforcing a 60 msgs/sec threshold.

- [x] **Clamp input values server-side**
  - Added `Math.max(-1, Math.min(1, rawVal))` in `server.ts` and automated unit test in `src/game/rules.test.ts`.

- [x] **Lock rooms when match starts**
  - Added check in `join_room` rejecting connections if `room.state.lifecycle !== 'LOBBY'`.

- [x] **Add max player limit (8)**
  - Added check in `join_room` rejecting join attempts if `Object.keys(room.state.players).length >= 8`.

---

## 🟠 Week 2 — Player Experience Essentials

- [ ] **Add "Connecting to server…" loading screen**
  - Show animated spinner while WebSocket is connecting
  - Show "Waking up server…" if connection takes >3 seconds
  - File: `src/App.tsx`

- [ ] **Add match timer (default 4 minutes)**
  - Add `matchTimerSeconds` to `MatchConfig`
  - Count down in `stepAuthoritativeMatch`
  - Auto seeker-win when timer expires
  - Files: `src/game/rules.ts`, `server.ts`

- [ ] **Add reconnection grace period**
  - On disconnect, start 30-second timer
  - If player reconnects within 30s, restore their state
  - If timer expires, remove player
  - Show "Player X reconnecting…" to other players
  - File: `server.ts`

- [ ] **Add kill feed / event log**
  - Bottom-center scrolling text: elimination events, beacon progress
  - Auto-fade after 3 seconds
  - File: `src/App.tsx`

---

## 🟡 Week 3 — Testing & Safety Net

- [ ] **Expand unit test suite to 20+ tests**
  - Add tests for: room cleanup, rate limiting, input clamping, match timer
  - Add tests for: room lock, max players, reconnection
  - File: `src/game/rules.test.ts`

- [ ] **Add error tracking (Sentry)**
  - Sign up at sentry.io (free)
  - Add `@sentry/node` to server, `@sentry/browser` to client
  - Files: `server.ts`, `src/App.tsx`, `package.json`

- [ ] **Add privacy policy page**
  - Disclose: localStorage usage, no PII collected, no cookies
  - File: new `public/privacy.html`, link from title screen

- [ ] **Verify asset licenses**
  - Check each pack's license file/itch.io page
  - Document license type and attribution requirements
  - File: new `docs/LICENSES.md`

---

## 📋 Pre-Launch Final Checklist

- [ ] `npm run build` succeeds with 0 errors
- [ ] `npm test` passes all tests (target: 20+)
- [ ] All 4 maps playable with correct hiding spot counts
- [ ] Guest login works on fresh browser (no prior localStorage)
- [ ] Multiplayer room creation + join works with 2 real browsers
- [ ] Mobile touch controls work on real Android/iOS device
- [ ] Server recovers from single client sending malformed JSON
- [ ] Stale rooms are cleaned up automatically
- [ ] Loading screen shows while connecting
- [ ] Privacy policy is linked and accessible
- [ ] Asset licenses are documented and compliant
- [ ] `render.yaml` or deploy config is committed
- [ ] README updated with live game URL

---

## Quick Reference: Key Files to Modify

| File | What to change |
|------|---------------|
| [server.ts](../server.ts) | Health check, rate limiting, room cleanup, room lock, max players, reconnection |
| [src/game/rules.ts](../src/game/rules.ts) | Match timer, action cooldowns, speed enforcement |
| [src/App.tsx](../src/App.tsx) | Loading screen, kill feed, connection state UI |
| [src/game/rules.test.ts](../src/game/rules.test.ts) | New tests for all server hardening features |
| [package.json](../package.json) | Sentry dependencies, new scripts |
| [index.html](../index.html) | OG meta tags, privacy policy link |
