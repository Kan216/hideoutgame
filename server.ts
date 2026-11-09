import express from 'express';
import http from 'http';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import type { MatchState, PlayerState, MatchConfig } from './src/game/rules.ts';
import {
  validateGuestDisplayName,
  generateGuestName,
  createInitialMatchState,
  startAuthoritativeMatch,
  resolvePlayerMovement,
  attemptEnterHidingSpot,
  attemptExitHidingSpot,
  attemptDirectElimination,
  attemptInspectHidingSpot,
  setObjectiveInteraction,
  stepAuthoritativeMatch,
  attemptSprint,
  filterStateForViewer,
} from './src/game/rules.ts';
import { MAPS } from './src/game/maps.ts';
import { stepBotAI } from './src/game/bots.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface GuestSession {
  playerId: string;
  token: string;
  displayName: string;
  createdAt: number;
  lastSeenAt: number;
  currentRoomCode: string | null;
}

interface RoomInstance {
  state: MatchState;
  clients: Map<string, WebSocket>; // playerId -> ws
  inputs: Map<string, { ix: number; iy: number }>;
  lastUpdatedAt: number;
}

const guestSessionsByToken = new Map<string, GuestSession>();
const guestSessionsById = new Map<string, GuestSession>();
const rooms = new Map<string, RoomInstance>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function createOrResumeGuestSession(requestedToken?: string, requestedName?: string): GuestSession {
  if (requestedToken && guestSessionsByToken.has(requestedToken)) {
    const existing = guestSessionsByToken.get(requestedToken)!;
    existing.lastSeenAt = Date.now();
    if (requestedName) {
      const check = validateGuestDisplayName(requestedName);
      if (check.valid) {
        existing.displayName = check.sanitized;
      }
    }
    return existing;
  }

  const playerId = `guest_${crypto.randomBytes(5).toString('hex')}`;
  const token = crypto.randomBytes(18).toString('hex');
  let displayName = generateGuestName();
  if (requestedName) {
    const check = validateGuestDisplayName(requestedName);
    if (check.valid) {
      displayName = check.sanitized;
    }
  }

  const session: GuestSession = {
    playerId,
    token,
    displayName,
    createdAt: Date.now(),
    lastSeenAt: Date.now(),
    currentRoomCode: null,
  };
  guestSessionsByToken.set(token, session);
  guestSessionsById.set(playerId, session);
  return session;
}

/**
 * Anti-cheat broadcast: every client receives only what its player is allowed to know
 * (no hiding-spot occupancy or unseen hider positions for seekers, no unseen seekers for hiders).
 */
function broadcastRoomState(room: RoomInstance) {
  let sharedPayload: string | null = null;
  const now = Date.now();
  for (const [playerId, ws] of room.clients.entries()) {
    if (ws.readyState !== WebSocket.OPEN) continue;
    const viewState = filterStateForViewer(room.state, playerId);
    if (viewState === room.state) {
      sharedPayload ??= JSON.stringify({ type: 'room_state', state: room.state, serverTime: now });
      ws.send(sharedPayload);
    } else {
      ws.send(JSON.stringify({ type: 'room_state', state: viewState, serverTime: now }));
    }
  }
}

function addPlayerToRoom(room: RoomInstance, session: GuestSession, ws: WebSocket) {
  room.clients.set(session.playerId, ws);
  session.currentRoomCode = room.state.roomCode;

  if (!room.state.players[session.playerId]) {
    const existingCount = Object.keys(room.state.players).length;
    const map = MAPS[room.state.config.mapId];
    const spawn = map.hiderSpawns[existingCount % map.hiderSpawns.length];
    room.state.players[session.playerId] = {
      id: session.playerId,
      name: session.displayName,
      role: 'hider',
      isBot: false,
      alive: room.state.lifecycle === 'LOBBY',
      x: spawn.x,
      y: spawn.y,
      vx: 0,
      vy: 0,
      facing: 'down',
      hiddenInSpotId: null,
      interactingWithObjective: false,
      eliminationsCount: 0,
      inspectionsCount: 0,
      objectiveSecondsContributed: 0,
      lastInspectAt: 0,
      connected: true,
      colorIndex: existingCount,
    };
  } else {
    room.state.players[session.playerId].connected = true;
    room.state.players[session.playerId].name = session.displayName;
  }
  room.lastUpdatedAt = Date.now();
}

function populateBotsInRoom(room: RoomInstance, targetBotCount: number) {
  // Remove existing bots first
  for (const [pid, p] of Object.entries(room.state.players)) {
    if (p.isBot) {
      delete room.state.players[pid];
    }
  }
  const botNames = ['PixelFox', 'CobbleScout', 'NeonDrifter', 'AlleyHopper', 'DuskRunner'];
  const map = MAPS[room.state.config.mapId];
  for (let i = 0; i < targetBotCount; i++) {
    const botId = `bot_${i + 1}`;
    const spawn = map.hiderSpawns[(i + 1) % map.hiderSpawns.length];
    room.state.players[botId] = {
      id: botId,
      name: `${botNames[i % botNames.length]}`,
      role: 'hider',
      isBot: true,
      alive: true,
      x: spawn.x,
      y: spawn.y,
      vx: 0,
      vy: 0,
      facing: 'down',
      hiddenInSpotId: null,
      interactingWithObjective: false,
      eliminationsCount: 0,
      inspectionsCount: 0,
      objectiveSecondsContributed: 0,
      lastInspectAt: 0,
      connected: true,
      colorIndex: i + 2,
    };
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // REST API for Guest Identity & Room Discovery
  app.post('/api/guest/session', (req, res) => {
    const { token, displayName } = req.body || {};
    if (displayName) {
      const check = validateGuestDisplayName(displayName);
      if (!check.valid) {
        res.status(400).json({ error: check.error });
        return;
      }
    }
    const session = createOrResumeGuestSession(token, displayName);
    res.json({
      playerId: session.playerId,
      token: session.token,
      displayName: session.displayName,
      currentRoomCode: session.currentRoomCode,
    });
  });

  app.get('/api/rooms/:code', (req, res) => {
    const code = (req.params.code || '').toUpperCase().trim();
    const room = rooms.get(code);
    if (!room) {
      res.status(404).json({ error: 'Room not found.' });
      return;
    }
    res.json({
      roomCode: room.state.roomCode,
      lifecycle: room.state.lifecycle,
      playerCount: Object.keys(room.state.players).length,
      mapId: room.state.config.mapId,
    });
  });

  app.get('/healthz', (_req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      roomsCount: rooms.size,
      sessionsCount: guestSessionsByToken.size,
      timestamp: Date.now(),
    });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    let boundSession: GuestSession | null = null;
    let messageCountInWindow = 0;
    let currentSecondWindow = Math.floor(Date.now() / 1000);

    ws.on('message', (raw) => {
      try {
        const nowSec = Math.floor(Date.now() / 1000);
        if (nowSec !== currentSecondWindow) {
          currentSecondWindow = nowSec;
          messageCountInWindow = 0;
        }
        messageCountInWindow++;
        if (messageCountInWindow > 60) {
          ws.send(JSON.stringify({ type: 'error', message: 'Rate limit exceeded (max 60 msgs/sec).' }));
          ws.close(1008, 'Rate limit exceeded');
          return;
        }

        const msg = JSON.parse(raw.toString());

        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', t: msg.t }));
          return;
        }

        if (msg.type === 'send_emote') {
          const text = String(msg.text || '').slice(0, 16).trim();
          if (text && boundSession && boundSession.currentRoomCode) {
            const room = rooms.get(boundSession.currentRoomCode);
            if (room && room.state.players[boundSession.playerId]) {
              const p = room.state.players[boundSession.playerId];
              p.activeEmote = {
                text,
                expiresAt: Date.now() + 3000,
              };
              broadcastRoomState(room);
            }
          }
          return;
        }

        if (msg.type === 'auth_guest') {
          boundSession = createOrResumeGuestSession(msg.token, msg.displayName);
          ws.send(
            JSON.stringify({
              type: 'guest_authenticated',
              playerId: boundSession.playerId,
              token: boundSession.token,
              displayName: boundSession.displayName,
              currentRoomCode: boundSession.currentRoomCode,
            })
          );

          // Auto-rejoin previous active room on reconnect if it still exists
          if (boundSession.currentRoomCode && rooms.has(boundSession.currentRoomCode)) {
            const room = rooms.get(boundSession.currentRoomCode)!;
            addPlayerToRoom(room, boundSession, ws);
            broadcastRoomState(room);
          }
          return;
        }

        if (!boundSession) {
          boundSession = createOrResumeGuestSession();
        }

        if (msg.type === 'update_name') {
          const check = validateGuestDisplayName(msg.displayName || '');
          if (!check.valid) {
            ws.send(JSON.stringify({ type: 'error', message: check.error }));
            return;
          }
          boundSession.displayName = check.sanitized;
          if (boundSession.currentRoomCode && rooms.has(boundSession.currentRoomCode)) {
            const room = rooms.get(boundSession.currentRoomCode)!;
            if (room.state.players[boundSession.playerId]) {
              room.state.players[boundSession.playerId].name = check.sanitized;
              broadcastRoomState(room);
            }
          }
          ws.send(
            JSON.stringify({
              type: 'guest_authenticated',
              playerId: boundSession.playerId,
              token: boundSession.token,
              displayName: boundSession.displayName,
              currentRoomCode: boundSession.currentRoomCode,
            })
          );
          return;
        }

        if (msg.type === 'create_room') {
          const code = generateRoomCode();
          const requestedMapId =
            msg.mapId && msg.mapId in MAPS
              ? (msg.mapId as MatchConfig['mapId'])
              : 'downtown_plaza';
          const config: Partial<MatchConfig> = {
            mapId: requestedMapId,
            seekerCount: msg.seekerCount === 2 ? 2 : 1,
          };
          const state = createInitialMatchState(code, boundSession.playerId, config);
          const room: RoomInstance = {
            state,
            clients: new Map(),
            inputs: new Map(),
            lastUpdatedAt: Date.now(),
          };
          rooms.set(code, room);
          addPlayerToRoom(room, boundSession, ws);
          if (typeof msg.botCount === 'number' && msg.botCount > 0) {
            populateBotsInRoom(room, Math.min(5, msg.botCount));
          }
          broadcastRoomState(room);
          return;
        }

        if (msg.type === 'join_room') {
          const code = String(msg.roomCode || '').toUpperCase().trim();
          const room = rooms.get(code);
          if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: `Room "${code}" not found.` }));
            return;
          }
          if (room.state.lifecycle !== 'LOBBY') {
            ws.send(JSON.stringify({ type: 'error', message: `Room "${code}" is already in an active match.` }));
            return;
          }
          if (Object.keys(room.state.players).length >= 8) {
            ws.send(JSON.stringify({ type: 'error', message: `Room "${code}" is full (maximum 8 players).` }));
            return;
          }
          addPlayerToRoom(room, boundSession, ws);
          broadcastRoomState(room);
          return;
        }

        if (msg.type === 'leave_room') {
          if (boundSession.currentRoomCode && rooms.has(boundSession.currentRoomCode)) {
            const room = rooms.get(boundSession.currentRoomCode)!;
            room.clients.delete(boundSession.playerId);
            delete room.state.players[boundSession.playerId];
            boundSession.currentRoomCode = null;
            if (room.clients.size === 0) {
              rooms.delete(room.state.roomCode);
            } else {
              if (room.state.hostId === boundSession.playerId) {
                const nextHost = Array.from(room.clients.keys())[0];
                if (nextHost) room.state.hostId = nextHost;
              }
              broadcastRoomState(room);
            }
          }
          return;
        }

        const roomCode = boundSession.currentRoomCode;
        if (!roomCode || !rooms.has(roomCode)) return;
        const room = rooms.get(roomCode)!;
        const state = room.state;

        if (msg.type === 'configure_room') {
          if (state.hostId !== boundSession.playerId) return;
          if (msg.mapId && msg.mapId in MAPS) {
            state.config.mapId = msg.mapId as MatchConfig['mapId'];
          }
          if (msg.seekerCount === 1 || msg.seekerCount === 2) {
            state.config.seekerCount = msg.seekerCount;
          }
          if (typeof msg.botCount === 'number') {
            populateBotsInRoom(room, Math.max(0, Math.min(5, msg.botCount)));
          }
          broadcastRoomState(room);
          return;
        }

        if (msg.type === 'start_match') {
          if (state.hostId !== boundSession.playerId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Only the room host can start the match.' }));
            return;
          }
          if (Object.keys(state.players).length < 2) {
            ws.send(
              JSON.stringify({
                type: 'error',
                message: 'Need at least 2 players (invite a friend or add AI bots) to start.',
              })
            );
            return;
          }
          startAuthoritativeMatch(state, msg.preferredHostRole);
          broadcastRoomState(room);
          return;
        }

        if (msg.type === 'return_to_lobby') {
          if (state.hostId !== boundSession.playerId) return;
          state.lifecycle = 'LOBBY';
          state.winner = null;
          state.winReason = null;
          state.objectiveCompletedStages = 0;
          state.objectiveCurrentStageProgress = 0;
          state.objectiveProgressById = {};
          state.objectiveActiveIds = [];
          state.noisePings = [];
          broadcastRoomState(room);
          return;
        }

        if (msg.type === 'move_input') {
          const rawIx = Number(msg.ix) || 0;
          const rawIy = Number(msg.iy) || 0;
          const ix = Math.max(-1, Math.min(1, rawIx));
          const iy = Math.max(-1, Math.min(1, rawIy));
          room.inputs.set(boundSession.playerId, { ix, iy });
          return;
        }

        if (msg.type === 'action') {
          const action = msg.action;
          if (action === 'hide' && msg.targetId) {
            attemptEnterHidingSpot(state, boundSession.playerId, String(msg.targetId));
          } else if (action === 'exit_hide') {
            attemptExitHidingSpot(state, boundSession.playerId);
          } else if (action === 'eliminate') {
            attemptDirectElimination(
              state,
              boundSession.playerId,
              msg.targetId ? String(msg.targetId) : undefined,
              Date.now()
            );
          } else if (action === 'inspect' && msg.targetId) {
            attemptInspectHidingSpot(state, boundSession.playerId, String(msg.targetId), Date.now());
          } else if (action === 'hold_objective') {
            setObjectiveInteraction(state, boundSession.playerId, Boolean(msg.active));
          } else if (action === 'sprint') {
            attemptSprint(state, boundSession.playerId);
          }
          broadcastRoomState(room);
        }
      } catch (err) {
        console.error('WS message error:', err);
      }
    });

    ws.on('close', () => {
      if (boundSession && boundSession.currentRoomCode) {
        const room = rooms.get(boundSession.currentRoomCode);
        if (room) {
          room.clients.delete(boundSession.playerId);
          const p: PlayerState | undefined = room.state.players[boundSession.playerId];
          if (p) {
            p.connected = false;
            p.interactingWithObjective = false;
            p.vx = 0;
            p.vy = 0;
          }
          broadcastRoomState(room);
        }
      }
    });
  });

  // Authoritative 25Hz Server Game Loop
  const TICK_MS = 40;
  setInterval(() => {
    const dt = TICK_MS / 1000;
    const now = Date.now();
    for (const [, room] of rooms.entries()) {
      const { state } = room;
      if (
        state.lifecycle === 'HIDER_HEAD_START' ||
        state.lifecycle === 'SEEKER_RELEASED' ||
        state.lifecycle === 'MATCH_ACTIVE'
      ) {
        const map = MAPS[state.config.mapId];
        for (const player of Object.values(state.players)) {
          if (player.activeEmote && now > player.activeEmote.expiresAt) {
            player.activeEmote = null;
          }
          if (player.isBot) {
            stepBotAI(state, player, dt, now);
          } else {
            const inp = room.inputs.get(player.id) || { ix: 0, iy: 0 };
            const moved = resolvePlayerMovement(player, inp.ix, inp.iy, dt, state, map);
            player.x = moved.x;
            player.y = moved.y;
            player.vx = moved.vx;
            player.vy = moved.vy;
            player.facing = moved.facing;
          }
        }
        stepAuthoritativeMatch(state, dt, now);
        broadcastRoomState(room);
      }
    }
  }, TICK_MS);

  // Stale room auto-cleanup (every 60s, deletes rooms with 0 connected clients older than 2 minutes)
  setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms.entries()) {
      if (room.clients.size === 0 && now - room.lastUpdatedAt > 120_000) {
        rooms.delete(code);
      }
    }
  }, 60_000);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Hosting platforms (Render, Railway, Fly…) inject PORT; default to 3000 locally.
  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`CITY HIDEOUT authoritative server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
