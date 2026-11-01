# Production Roadmap — CITY HIDEOUT
# From Prototype → Public Launch

> **Start**: Milestone 7 (Prototype Complete)
> **Target**: Public multiplayer browser game with free guest access

---

## Phase 1: STABILITY & SECURITY 🔴
**Duration**: 2–3 weeks | **Goal**: "The game doesn't crash or get hacked"

### M8 — Server Hardening & Crash Recovery
| Task | File(s) | Acceptance Criteria | Est. |
|------|---------|-------------------|------|
| Add `/healthz` endpoint | `server.ts` | Returns `200 OK` with uptime and room count | 1h |
| Room auto-cleanup (stale rooms) | `server.ts` | Rooms with 0 connected clients for >2 min are deleted | 2h |
| WebSocket rate limiter | `server.ts` | Max 60 msgs/sec per connection; excess → disconnect | 3h |
| Input magnitude clamping | `server.ts`, `rules.ts` | `ix`, `iy` clamped to `[-1, 1]`; speed enforced server-side | 2h |
| Action cooldown enforcement | `rules.ts` | Hide/exit: 500ms cooldown; eliminate: 300ms; inspect: 600ms (existing) | 3h |
| Room lock on match start | `server.ts` | Joining a room in `MATCH_ACTIVE` state is rejected | 1h |
| Max players per room (8) | `server.ts` | Join rejected with message when room is full | 1h |
| HTTPS redirect middleware | `server.ts` | Non-HTTPS requests redirected in production | 1h |
| Graceful shutdown handler | `server.ts` | `SIGTERM` → broadcast "server restarting" → close connections → exit | 2h |
| Structured JSON logging | `server.ts` | All match events logged with timestamps in structured format | 3h |

### M9 — Networking Optimization
| Task | File(s) | Acceptance Criteria | Est. |
|------|---------|-------------------|------|
| Delta state compression | `server.ts` | Only changed fields sent each tick (≤500 bytes avg vs ~3KB full) | 8h |
| Client-side local prediction | `App.tsx`, new `wsClient.ts` | Local player moves instantly; server reconciles on mismatch | 12h |
| Entity interpolation | `App.tsx` | Other players render smoothly between server ticks (no jitter) | 6h |
| Reconnection grace period (30s) | `server.ts` | Disconnected player has 30s to rejoin before removal | 3h |
| Connection state UI | `App.tsx` | "Connecting…", "Reconnecting…", "Connection lost" overlays | 3h |
| Ping/latency display | `server.ts`, `App.tsx` | Ping indicator in top-right HUD corner | 2h |

---

## Phase 2: PLAYER EXPERIENCE 🟠
**Duration**: 2–3 weeks | **Goal**: "New players understand and enjoy the game"

### M10 — Onboarding & Tutorial
| Task | File(s) | Acceptance Criteria | Est. |
|------|---------|-------------------|------|
| Interactive tutorial match | New `src/game/tutorial.ts` | Guided solo match: move → find hiding spot → hide → exit → hold beacon | 8h |
| First-play hiding spot callouts | `pixelSprites.ts` | Glowing outlines on hiding spots during first match | 3h |
| Beacon interaction visual guide | `pixelSprites.ts` | Pulsing circle + text when near beacon for first time | 2h |
| Loading/connecting screen | `App.tsx` | Animated pixel-art loading screen while WebSocket connects | 3h |
| Server cold-start handling | `App.tsx` | Show "Waking up server…" if connection takes >3s (Render free tier) | 2h |

### M11 — Game Balance & Match Flow
| Task | File(s) | Acceptance Criteria | Est. |
|------|---------|-------------------|------|
| Match timer (configurable, default 4 min) | `rules.ts`, `server.ts` | Auto seeker-win when timer expires | 3h |
| AFK detection (60s → spectator) | `server.ts` | No input for 60s → player moved to spectator, character despawns | 4h |
| Host migration | `server.ts` | If host disconnects permanently, next player becomes host | 3h |
| Spectator mode for eliminated players | `App.tsx`, `rules.ts` | Dead hiders can watch remaining match with free camera | 6h |
| Kill feed / event log | `App.tsx` | Bottom-center scrolling feed: "Player X eliminated Player Y" | 3h |
| End-of-match MVP screen | `GameModals.tsx` | Highlight top eliminator (Seeker) and longest survivor (Hider) | 3h |

### M12 — Code Architecture Refactor
| Task | File(s) | Acceptance Criteria | Est. |
|------|---------|-------------------|------|
| Extract `src/network/wsClient.ts` | From `App.tsx` | All WebSocket logic in isolated module with typed events | 4h |
| Extract `src/input/inputManager.ts` | From `App.tsx` | Keyboard + touch input in unified module | 3h |
| Extract `src/renderer/gameRenderer.ts` | From `App.tsx` | Canvas drawing loop in own module | 4h |
| Extract screen components | From `App.tsx` | `TitleScreen.tsx`, `PlayingScreen.tsx`, etc. | 4h |
| Reduce `App.tsx` to <300 lines | — | Only state orchestration and component mounting | 2h |

---

## Phase 3: RETENTION & SOCIAL 🟡
**Duration**: 3–4 weeks | **Goal**: "Players come back to play again"

### M13 — Progression System (Client-Side MVP)
| Task | File(s) | Acceptance Criteria | Est. |
|------|---------|-------------------|------|
| Local stats persistence | New `src/stats/playerStats.ts` | Games played, wins, eliminations, time survived stored in localStorage | 4h |
| Profile card on title screen | New `src/components/ProfileCard.tsx` | Shows stats, selected skin, games played | 4h |
| XP system (earn XP per match) | `playerStats.ts` | XP based on match outcome, survival time, beacon progress | 4h |
| Skin unlock milestones | `playerStats.ts`, `maps.ts` | 3 skins free, 4 skins unlock at XP thresholds | 3h |
| Achievement badges (10 achievements) | `playerStats.ts` | "First Win", "Hide 50 Times", "3-Stage Beacon Master", etc. | 6h |

### M14 — Social & Communication
| Task | File(s) | Acceptance Criteria | Est. |
|------|---------|-------------------|------|
| Lobby text chat | `LobbyModal.tsx`, `server.ts` | Players can send messages in lobby (max 100 chars, basic profanity filter) | 6h |
| Quick-chat emotes (in-game) | `App.tsx`, `server.ts` | 6 preset emotes: "Help!", "Over here!", "GG", "Haha", "Nice!", "Oops" | 4h |
| Emote bubble over player head | `pixelSprites.ts` | Speech bubble with emote text fades after 2s | 3h |
| Room browser (public rooms) | `LobbyModal.tsx`, `server.ts` | List of public rooms with player count, map, and join button | 6h |
| Invite link generation | `LobbyModal.tsx` | Copy-to-clipboard link: `cityhideout.com/join/K7M9P2` | 2h |

### M15 — Enhanced Bot AI
| Task | File(s) | Acceptance Criteria | Est. |
|------|---------|-------------------|------|
| Randomized patrol waypoints | `rules.ts` | Seeker bots follow random patrol routes through the map | 4h |
| Hider bots use hiding spots | `rules.ts` | Bot hiders actively seek and enter hiding spots | 4h |
| Bot difficulty tiers | `rules.ts` | Easy (slow reaction), Medium (normal), Hard (fast + inspects) | 6h |
| Bot names with personality | `rules.ts`, `maps.ts` | Bots have themed names matching their difficulty | 1h |

---

## Phase 4: POLISH & LAUNCH 🟢
**Duration**: 2–4 weeks | **Goal**: "The game feels professional"

### M16 — Audio & Visual Polish
| Task | File(s) | Acceptance Criteria | Est. |
|------|---------|-------------------|------|
| SFX/Music separate volume sliders | `sound.ts`, `GameModals.tsx` | Independent sliders saved to localStorage | 3h |
| New SFX: hide enter/exit, beacon hold, elimination | `sound.ts` | Distinct audio cues for each major action | 4h |
| Screen shake on elimination | `App.tsx` or `gameRenderer.ts` | Brief camera shake when player is eliminated nearby | 2h |
| Smooth camera follow (lerp) | `gameRenderer.ts` | Camera smoothly tracks player instead of hard-locking | 2h |
| Day/night cycle per map (cosmetic) | `pixelSprites.ts` | Canvas overlay tint shifts subtly during match | 4h |
| Victory/defeat animations | `pixelSprites.ts` | Confetti burst on win, screen desaturation on loss | 3h |

### M17 — Accessibility & Compliance
| Task | File(s) | Acceptance Criteria | Est. |
|------|---------|-------------------|------|
| Colorblind-friendly indicators | `pixelSprites.ts` | Hider/Seeker roles distinguishable by shape, not just color | 4h |
| Keyboard-navigable menus | All modal components | Tab/Enter/Escape navigation through all menus | 4h |
| ARIA labels on all buttons | All components | Screen readers can navigate lobby and settings | 3h |
| Privacy Policy page | New `privacy.html` | Discloses localStorage usage, no PII collected | 3h |
| Terms of Service page | New `terms.html` | Basic usage terms for a free game | 2h |
| Asset license compliance | `docs/LICENSES.md` | All 4 asset packs verified, attributed per their license terms | 4h |
| Cookie/storage consent banner | `App.tsx` | Non-blocking banner on first visit | 2h |

### M18 — Launch Infrastructure
| Task | File(s) | Acceptance Criteria | Est. |
|------|---------|-------------------|------|
| Custom domain setup | Render dashboard | `cityhideout.com` or similar pointing to Render service | 1h |
| Error tracking (Sentry free tier) | `server.ts`, `App.tsx` | Unhandled errors reported with stack traces | 3h |
| Uptime monitoring (UptimeRobot) | External | Alerts on downtime, public status page | 1h |
| Analytics (privacy-respecting) | `App.tsx` | Plausible/Umami free tier for page views and match starts | 3h |
| Social media preview cards (OG tags) | `index.html` | Rich preview when sharing link on Discord/Twitter | 2h |
| Production `render.yaml` | New `render.yaml` | Auto-deploy config with build/start commands and env vars | 1h |
| Launch landing page | `index.html` or separate | Screenshots, how to play, play button | 6h |

---

## Testing Milestones (Continuous)

| Milestone | New Tests Required | Target |
|-----------|-------------------|--------|
| M8 | Rate limiter, room cleanup, action cooldown | 15+ tests |
| M9 | Delta compression accuracy, reconnection | 10+ tests |
| M11 | Match timer, AFK, host migration | 10+ tests |
| M13 | XP calculation, unlock logic | 8+ tests |
| M14 | Chat profanity filter, emote broadcast | 6+ tests |
| **Launch** | **Total: 60+ automated tests** | All green |

---

## Timeline Summary

```
Week  1–3  ████████████ Phase 1: Stability & Security
Week  4–6  ████████████ Phase 2: Player Experience
Week  7–10 ████████████████ Phase 3: Retention & Social
Week 11–14 ████████████████ Phase 4: Polish & Launch
           ─────────────────────────────────────────────
                        🚀 PUBLIC LAUNCH
```

---

## Free-Tier Infrastructure Budget

| Service | Purpose | Monthly Cost |
|---------|---------|:---:|
| Render (Web Service) | Backend + WebSocket server | **$0** |
| Render (Static Site) | Landing page (optional) | **$0** |
| GitHub | Source code hosting | **$0** |
| Sentry | Error tracking (5K events/mo) | **$0** |
| UptimeRobot | Uptime monitoring (50 monitors) | **$0** |
| Plausible Cloud / Umami | Analytics (10K pageviews/mo) | **$0** |
| Freenom / .tk domain | Custom domain (optional) | **$0** |
| **Total** | | **$0/month** |

> [!NOTE]
> If the game grows beyond ~50 concurrent players, you'll want to upgrade Render to a paid plan ($7/mo) for persistent uptime without cold starts.
