/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CHARACTER_SKINS, CharacterSkinId, MapId, MAPS, getMapObjectives } from './game/maps';
import {
  MatchState,
  PlayerRole,
  ContextualActionPrompt,
  createInitialMatchState,
  startAuthoritativeMatch,
  resolvePlayerMovement,
  attemptEnterHidingSpot,
  attemptExitHidingSpot,
  attemptDirectElimination,
  attemptInspectHidingSpot,
  setObjectiveInteraction,
  stepAuthoritativeMatch,
  getAvailableContextualActions,
  generateGuestName,
  getCitySectorLabel,
  formatMatchTime,
  MatchEventLog,
  PlayerState,
  attemptSprint,
  filterStateForViewer,
} from './game/rules';
import {
  computeVisibilityPolygon,
  drawFogOfWar,
  drawNoisePings,
  drawPlayerStatusFx,
  drawScreenFlash,
  drawTransmitLinks,
} from './game/worldFx';
import {
  drawPixelMap,
  drawPlayerSprite,
  drawCityMinimap,
  spawnPixelBurst,
  stepAndDrawParticles,
  spawnFloatingWorldText,
  stepAndDrawFloatingTexts,
} from './game/pixelSprites';
import { soundFX } from './game/sound';
import { stepBotAI } from './game/bots';
import { MobileControls } from './components/MobileControls';
import { LobbyModal } from './components/LobbyModal';
import {
  PauseModal,
  GameOverModal,
  HowToPlayModal,
  EndOfRunStatsSnapshot,
} from './components/GameModals';

type ShellScreenState = 'title' | 'playing' | 'paused' | 'gameover';

export const QUICK_EMOTES = ['👋 Hey!', '👀 Spotted!', '🏃 Run!', '🆘 Help!', '🏆 GG', '🤫 Shh!'];

interface HudSnapshot {
  role: PlayerRole;
  alive: boolean;
  hiddenInSpotId: string | null;
  lifecycle: MatchState['lifecycle'];
  countdown: number;
  elapsedSeconds: number;
  matchTimerRemaining: number;
  stagesCompleted: number;
  totalStages: number;
  stageProgress: number;
  stageDuration: number;
  isHoldingObjective: boolean;
  livingHiders: number;
  totalHiders: number;
  seekerCount: number;
  roomCode: string;
  isOnline: boolean;
  latestEvent: string;
  playerX: number;
  playerY: number;
  sectorLabel: string;
  contextualActions: ContextualActionPrompt[];
  proximityDanger: number;
  pingMs: number | null;
  spectatingPlayerName: string | null;
  spectatingRole: PlayerRole | null;
  activeEvents: MatchEventLog[];
  sprintCooldown: number;
  sprinting: boolean;
  rehideCooldown: number;
}

export default function App() {
  // 1. Guest Session Persistence (Offline & Online)
  const [guestId, setGuestId] = useState<string>(() => {
    return localStorage.getItem('ch_guest_id') || `guest_${Math.random().toString(36).slice(2, 9)}`;
  });
  const [, setGuestToken] = useState<string>(() => {
    return localStorage.getItem('ch_guest_token') || '';
  });
  const [guestName, setGuestName] = useState<string>(() => {
    return localStorage.getItem('ch_guest_name') || generateGuestName();
  });
  const [selectedSkin, setSelectedSkin] = useState<CharacterSkinId>(() => {
    return (localStorage.getItem('ch_guest_skin') as CharacterSkinId) || 'male_scout';
  });
  const [selectedTitleMap, setSelectedTitleMap] = useState<MapId>('downtown_plaza');

  // 2. Game Shell State Machine mirrored to document.body.dataset.state
  const [shellState, setShellState] = useState<ShellScreenState>('title');
  const [showLobbyModal, setShowLobbyModal] = useState(false);
  const [showHowToModal, setShowHowToModal] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [serverWakeupNotice, setServerWakeupNotice] = useState(false);
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [spectatedId, setSpectatedId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [onlineRoomState, setOnlineRoomState] = useState<MatchState | null>(null);
  const [endOfRunSnapshot, setEndOfRunSnapshot] = useState<EndOfRunStatsSnapshot | null>(null);

  // 3. Mobile & Audio Preferences
  const [muted, setMuted] = useState(false);
  const [bgmEnabled, setBgmEnabled] = useState(false);
  const [touchMode, setTouchMode] = useState<'auto' | 'on' | 'off'>('auto');
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [isShortViewport, setIsShortViewport] = useState(false);
  const [minimapVisible, setMinimapVisible] = useState(true);
  const [joystickSensitivity, setJoystickSensitivity] = useState<number>(() => {
    const saved = localStorage.getItem('ch_joy_sens');
    return saved ? parseFloat(saved) : 1.0;
  });

  const toggleFullscreen = useCallback(() => {
    const doc = document as any;
    const docEl = document.documentElement as any;
    if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      }
    } else {
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      }
    }
  }, []);

  // 4. Live HUD Snapshot (throttled updates so React never re-renders at 60Hz)
  const [hud, setHud] = useState<HudSnapshot>({
    role: 'hider',
    alive: true,
    hiddenInSpotId: null,
    lifecycle: 'LOBBY',
    countdown: 10,
    elapsedSeconds: 0,
    matchTimerRemaining: 240,
    stagesCompleted: 0,
    totalStages: 3,
    stageProgress: 0,
    stageDuration: 15,
    isHoldingObjective: false,
    livingHiders: 4,
    totalHiders: 4,
    seekerCount: 1,
    roomCode: 'LOCAL',
    isOnline: false,
    latestEvent: 'Find a hiding place or complete 3 City-Center Beacon stages!',
    playerX: 745,
    playerY: 515,
    sectorLabel: 'CENTER PLAZA',
    contextualActions: [],
    proximityDanger: 0,
    pingMs: null,
    spectatingPlayerName: null,
    spectatingRole: null,
    activeEvents: [],
    sprintCooldown: 0,
    sprinting: false,
    rehideCooldown: 0,
  });

  // Refs for Decoupled 60 FPS Canvas Simulation
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const shellStateRef = useRef<ShellScreenState>('title');
  const isOnlineMatchRef = useRef<boolean>(false);
  const guestIdRef = useRef<string>(guestId);
  const guestNameRef = useRef<string>(guestName);
  const selectedSkinRef = useRef<CharacterSkinId>(selectedSkin);
  const matchStateRef = useRef<MatchState>(createInitialMatchState('LOCAL', guestId));
  const keysPressedRef = useRef<Set<string>>(new Set());
  const joystickVecRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const distWalkedMapRef = useRef<Record<string, number>>({});
  const lastEventIdRef = useRef<string>('');
  const cameraShakeRef = useRef<number>(0);
  const pingMsRef = useRef<number | null>(null);
  const spectatedIdRef = useRef<string | null>(null);
  const lastCountdownSecRef = useRef<number>(-1);
  // Juice / rendering refs
  const renderPosRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const hitStopRef = useRef<number>(0);
  const flashRef = useRef<{ amount: number; color: string }>({ amount: 0, color: '#FFFFFF' });
  const reducedMotionRef = useRef<boolean>(
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
  const cameraRef = useRef<{ x: number; y: number } | null>(null);
  const fogPolyRef = useRef<number[]>([]);
  /** Client-side first-seen time per event id (server clocks may differ), used to auto-hide toasts. */
  const eventSeenAtRef = useRef<Map<string, number>>(new Map());

  /** Fire sound/particles/shake for every match event we have not seen yet (online + offline). */
  const processNewMatchEventsRef = useRef<(st: MatchState) => void>(() => {});
  processNewMatchEventsRef.current = (st: MatchState) => {
    const events = st.events || [];
    if (events.length === 0 || events[0].id === lastEventIdRef.current) return;
    const fresh: MatchEventLog[] = [];
    for (const e of events) {
      if (e.id === lastEventIdRef.current) break;
      fresh.push(e);
    }
    // Unknown last id (joined mid-match): only replay the most recent few
    const lastKnown = events.some((e) => e.id === lastEventIdRef.current);
    const toPlay = (lastKnown ? fresh : fresh.slice(0, 2)).reverse();
    lastEventIdRef.current = events[0].id;
    const calm = reducedMotionRef.current;
    const myId = guestIdRef.current;

    for (const evt of toPlay) {
      const x = evt.x ?? 0;
      const y = evt.y ?? 0;
      switch (evt.type) {
        case 'elimination': {
          soundFX.playElimination();
          spawnPixelBurst(x, y, 28, '#EF4444', 160);
          spawnPixelBurst(x, y, 10, '#FDE68A', 90);
          spawnFloatingWorldText(x, y, '☠️ CAUGHT!', '#EF4444');
          if (!calm) {
            cameraShakeRef.current = Math.max(cameraShakeRef.current, 0.5);
            flashRef.current = { amount: 0.35, color: '#FCA5A5' };
          }
          hitStopRef.current = 0.09;
          navigator.vibrate?.([60, 40, 60]);
          break;
        }
        case 'flush': {
          soundFX.playForcedExitWarning();
          spawnPixelBurst(x, y, 18, '#F59E0B', 120);
          spawnFloatingWorldText(x, y, '❗ FLUSHED OUT!', '#FBBF24');
          if (!calm) cameraShakeRef.current = Math.max(cameraShakeRef.current, 0.28);
          navigator.vibrate?.(35);
          break;
        }
        case 'inspect_empty': {
          soundFX.playInspectEmpty();
          spawnPixelBurst(x, y, 6, '#94A3B8', 55);
          spawnFloatingWorldText(x, y, 'EMPTY', '#94A3B8');
          break;
        }
        case 'objective_stage': {
          soundFX.playObjectiveStageComplete(st.objectiveCompletedStages);
          spawnPixelBurst(x, y - 30, 40, '#34D399', 190);
          spawnPixelBurst(x, y - 30, 16, '#FDE68A', 120);
          spawnFloatingWorldText(x, y - 40, `⚡ TIER ${st.objectiveCompletedStages} BUILT!`, '#34D399');
          if (!calm) {
            cameraShakeRef.current = Math.max(cameraShakeRef.current, 0.22);
            flashRef.current = { amount: 0.22, color: '#A7F3D0' };
          }
          navigator.vibrate?.([40, 40, 100]);
          break;
        }
        case 'hide': {
          soundFX.playForcedExitWarning();
          spawnPixelBurst(x, y, 14, '#F59E0B', 95);
          spawnFloatingWorldText(x, y, '⚠️ TIME OUT!', '#F59E0B');
          break;
        }
        case 'info': {
          if (evt.message.includes('SEEKER IS RELEASED')) {
            soundFX.playSeekerReleased();
            const m = MAPS[st.config.mapId];
            if (m) {
              spawnFloatingWorldText(
                m.seekerSpawns[0]?.x ?? m.width / 2,
                m.seekerSpawns[0]?.y ?? m.height / 2,
                '🚨 SEEKERS UNLEASHED!',
                '#EF4444'
              );
            }
          }
          break;
        }
        default:
          break;
      }
    }
    void myId;
  };

  useEffect(() => {
    guestIdRef.current = guestId;
    localStorage.setItem('ch_guest_id', guestId);
  }, [guestId]);

  useEffect(() => {
    guestNameRef.current = guestName;
    localStorage.setItem('ch_guest_name', guestName);
  }, [guestName]);

  useEffect(() => {
    selectedSkinRef.current = selectedSkin;
    localStorage.setItem('ch_guest_skin', selectedSkin);
  }, [selectedSkin]);

  useEffect(() => {
    pingMsRef.current = pingMs;
  }, [pingMs]);

  useEffect(() => {
    spectatedIdRef.current = spectatedId;
  }, [spectatedId]);

  const sendEmote = useCallback((text: string) => {
    const myId = guestIdRef.current;
    if (isOnlineMatchRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'send_emote', text }));
    } else {
      const p = matchStateRef.current.players[myId];
      if (p) {
        p.activeEmote = { text, expiresAt: Date.now() + 3000 };
      }
    }
    soundFX.playEmoteBubble();
  }, []);

  const cycleSpectatorTarget = useCallback((direction: 1 | -1) => {
    const st = matchStateRef.current;
    const living = Object.values(st.players).filter((p) => p.alive);
    if (living.length === 0) return;
    const currentIdx = living.findIndex((p) => p.id === spectatedIdRef.current);
    const nextIdx =
      currentIdx === -1
        ? 0
        : (currentIdx + direction + living.length) % living.length;
    const nextPlayer = living[nextIdx];
    spectatedIdRef.current = nextPlayer.id;
    setSpectatedId(nextPlayer.id);
  }, []);

  useEffect(() => {
    document.body.dataset.state = shellState;
    shellStateRef.current = shellState;
  }, [shellState]);

  // Seed Title Screen Live World Showcase with all 5 Asset Pack Characters wandering/posing
  useEffect(() => {
    const st = matchStateRef.current;
    if (Object.keys(st.players).length === 0) {
      const showcaseActors: Array<{ id: string; name: string; role: PlayerRole; skin: CharacterSkinId; x: number; y: number }> = [
        { id: 'demo_1', name: 'Leo (Scout)', role: 'hider', skin: 'male_scout', x: 745, y: 515 },
        { id: 'demo_2', name: 'Maya (Runner)', role: 'hider', skin: 'female_runner', x: 855, y: 520 },
        { id: 'demo_3', name: 'Bloop (Slime)', role: 'hider', skin: 'toxic_slime', x: 740, y: 615 },
        { id: 'demo_4', name: 'Nyx (Void)', role: 'hider', skin: 'void_slime', x: 860, y: 615 },
        { id: 'demo_5', name: 'Vanguard (Seeker)', role: 'seeker', skin: 'dark_knight', x: 640, y: 500 },
      ];
      showcaseActors.forEach((a, i) => {
        st.players[a.id] = {
          id: a.id,
          name: a.name,
          role: a.role,
          skinId: a.skin,
          isBot: false,
          alive: true,
          x: a.x,
          y: a.y,
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
          colorIndex: i,
        };
      });
    }
  }, []);

  // Detect mobile viewport / coarse pointer & orientation for adaptive controls
  useEffect(() => {
    const checkViewport = () => {
      const coarse = window.matchMedia?.('(pointer: coarse)').matches;
      const isMobile = coarse || window.innerWidth <= 920;
      setIsMobileViewport(isMobile);
      setIsPortrait(window.innerHeight > window.innerWidth && isMobile);
      setIsShortViewport(window.innerHeight <= 520);
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    window.addEventListener('orientationchange', checkViewport);
    return () => {
      window.removeEventListener('resize', checkViewport);
      window.removeEventListener('orientationchange', checkViewport);
    };
  }, []);

  // Connect to Authoritative WebSocket Server for Guest Session & Multiplayer Rooms
  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let unmounted = false;

    const connectWs = () => {
      if (unmounted) return;
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const wakeupTimer: ReturnType<typeof setTimeout> = setTimeout(() => {
        if (!unmounted && ws.readyState !== WebSocket.OPEN) {
          setServerWakeupNotice(true);
        }
      }, 2500);

      ws.onopen = () => {
        if (unmounted) return;
        clearTimeout(wakeupTimer);
        setServerWakeupNotice(false);
        setWsConnected(true);
        ws.send(
          JSON.stringify({
            type: 'auth_guest',
            token: localStorage.getItem('ch_guest_token') || undefined,
            displayName: guestNameRef.current,
          })
        );
      };

      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data.type === 'pong') {
            const rtt = Math.max(1, Date.now() - Number(data.t));
            setPingMs(rtt);
            pingMsRef.current = rtt;
            return;
          } else if (data.type === 'guest_authenticated') {
            const oldId = guestIdRef.current;
            const newId = data.playerId;
            if (
              oldId !== newId &&
              !isOnlineMatchRef.current &&
              matchStateRef.current.players[oldId]
            ) {
              const p = matchStateRef.current.players[oldId];
              delete matchStateRef.current.players[oldId];
              p.id = newId;
              p.name = data.displayName;
              matchStateRef.current.players[newId] = p;
              if (matchStateRef.current.hostId === oldId) {
                matchStateRef.current.hostId = newId;
              }
            }
            guestIdRef.current = newId;
            guestNameRef.current = data.displayName;
            setGuestId(newId);
            setGuestToken(data.token);
            setGuestName(data.displayName);
            localStorage.setItem('ch_guest_id', newId);
            localStorage.setItem('ch_guest_token', data.token);
            localStorage.setItem('ch_guest_name', data.displayName);
          } else if (data.type === 'error') {
            setErrorBanner(data.message);
            setTimeout(() => setErrorBanner(null), 4500);
          } else if (data.type === 'room_state') {
            const incoming: MatchState = data.state;
            setOnlineRoomState(incoming);

            // Keep the locally predicted position for our own player when the server agrees closely
            const myId = guestIdRef.current;
            const prevLocal = matchStateRef.current.players[myId];
            const incLocal = incoming.players[myId];
            if (
              isOnlineMatchRef.current &&
              prevLocal &&
              incLocal &&
              incLocal.alive &&
              !incLocal.hiddenInSpotId &&
              !prevLocal.hiddenInSpotId &&
              (incLocal.stunRemaining ?? 0) <= 0
            ) {
              const err = Math.hypot(prevLocal.x - incLocal.x, prevLocal.y - incLocal.y);
              if (err < 72) {
                // Soft reconcile: drift toward the authoritative position only when noticeably off
                const k = err > 20 ? 0.18 : 0;
                incLocal.x = prevLocal.x + (incLocal.x - prevLocal.x) * k;
                incLocal.y = prevLocal.y + (incLocal.y - prevLocal.y) * k;
              }
            }

            processNewMatchEventsRef.current(incoming);

            if (
              incoming.lifecycle === 'HIDER_HEAD_START' ||
              incoming.lifecycle === 'SEEKER_RELEASED' ||
              incoming.lifecycle === 'MATCH_ACTIVE'
            ) {
              isOnlineMatchRef.current = true;
              matchStateRef.current = incoming;
              if (shellStateRef.current === 'title') {
                setShowLobbyModal(false);
                setShellState('playing');
              }
            } else if (incoming.lifecycle === 'MATCH_COMPLETED' && isOnlineMatchRef.current) {
              matchStateRef.current = incoming;
              triggerGameOverFromState(incoming);
            }
          }
        } catch {
          // ignore malformed packet
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        if (!unmounted) {
          reconnectTimer = setTimeout(connectWs, 2500);
        }
      };
    };

    connectWs();

    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping', t: Date.now() }));
      }
    }, 2000);

    return () => {
      unmounted = true;
      clearInterval(pingInterval);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, []);

  const triggerGameOverFromState = useCallback((st: MatchState) => {
    if (shellStateRef.current === 'gameover') return;
    const localP = st.players[guestIdRef.current] || Object.values(st.players)[0];
    const hiders = Object.values(st.players).filter((p) => p.role === 'hider');
    const livingHiders = hiders.filter((p) => p.alive);
    const winner = st.winner || 'seekers';
    const playerWon =
      (localP?.role === 'hider' && winner === 'hiders') ||
      (localP?.role === 'seeker' && winner === 'seekers');

    soundFX.playMatchResult(playerWon);
    setEndOfRunSnapshot({
      winner,
      winReason: st.winReason || 'Match concluded.',
      localRole: localP?.role || 'hider',
      localAlive: localP?.alive ?? false,
      elapsedSeconds: st.elapsedMatchSeconds,
      stagesCompleted: st.objectiveCompletedStages,
      totalStages: st.config.objectiveTotalStages,
      livingHidersCount: livingHiders.length,
      totalHidersCount: hiders.length,
      eliminationsCount: localP?.eliminationsCount || 0,
      inspectionsCount: localP?.inspectionsCount || 0,
    });
    keysPressedRef.current.clear();
    joystickVecRef.current = { x: 0, y: 0 };
    setShellState('gameover');
  }, []);

  // Start a Local Play-As-Guest Match Immediately
  const startLocalGuestMatch = useCallback(
    (
      mapId: MapId = 'downtown_plaza',
      seekerCount: 1 | 2 = 1,
      botCount: number = 4,
      preferredRole: PlayerRole = 'hider'
    ) => {
      soundFX.initPreload();
      isOnlineMatchRef.current = false;
      const myId = guestIdRef.current;
      const st = createInitialMatchState('LOCAL', myId, {
        mapId,
        seekerCount,
      });

      const map = MAPS[mapId];
      st.players[myId] = {
        id: myId,
        name: guestNameRef.current,
        role: preferredRole,
        skinId:
          preferredRole === 'seeker' &&
          selectedSkinRef.current !== 'void_slime' &&
          selectedSkinRef.current !== 'skeleton_stalker'
            ? 'dark_knight'
            : selectedSkinRef.current,
        isBot: false,
        alive: true,
        x: map.hiderSpawns[0].x,
        y: map.hiderSpawns[0].y,
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
        colorIndex: 0,
      };

      const botNames = ['MayaRunner', 'BloopSlime', 'NyxVoid', 'LeoScout', 'VanguardKnight'];
      for (let i = 0; i < botCount; i++) {
        const bId = `bot_${i + 1}`;
        st.players[bId] = {
          id: bId,
          name: botNames[i % botNames.length],
          role: 'hider',
          isBot: true,
          alive: true,
          x: map.hiderSpawns[(i + 1) % map.hiderSpawns.length].x,
          y: map.hiderSpawns[(i + 1) % map.hiderSpawns.length].y,
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
          colorIndex: i + 1,
        };
      }

      startAuthoritativeMatch(st, preferredRole);
      matchStateRef.current = st;
      lastEventIdRef.current = st.events[0]?.id || '';
      keysPressedRef.current.clear();
      joystickVecRef.current = { x: 0, y: 0 };
      setShowLobbyModal(false);
      setShowHowToModal(false);
      setShellState('playing');
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    },
    []
  );

  // Support ?autostart=1 and ?room=CODE invite query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      startLocalGuestMatch('downtown_plaza', 1, 4, 'hider');
      return;
    }
    const roomParam = params.get('room');
    if (roomParam && roomParam.trim().length >= 4) {
      const targetRoom = roomParam.trim().toUpperCase();
      setShowLobbyModal(true);
      const pollWs = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          clearInterval(pollWs);
          wsRef.current.send(JSON.stringify({ type: 'join_room', roomCode: targetRoom }));
        }
      }, 200);
      return () => clearInterval(pollWs);
    }
  }, [startLocalGuestMatch]);

  // Execute Contextual Action (Keyboard E/Space or Mobile Action Tap)
  const executeContextualAction = useCallback((act?: ContextualActionPrompt) => {
    const st = matchStateRef.current;
    const myId = guestIdRef.current;
    const available = act ? [act] : getAvailableContextualActions(st, myId);
    if (available.length === 0) return;
    const chosen = available[0];

    if (isOnlineMatchRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
      if (chosen.action === 'objective') {
        const myPlayer = st.players[myId];
        wsRef.current.send(
          JSON.stringify({
            type: 'action',
            action: 'hold_objective',
            active: !myPlayer?.interactingWithObjective,
          })
        );
      } else {
        wsRef.current.send(
          JSON.stringify({
            type: 'action',
            action: chosen.action,
            targetId: chosen.targetId,
          })
        );
      }
      return;
    }

    // Local Authoritative Action
    if (chosen.action === 'hide' && chosen.targetId) {
      const res = attemptEnterHidingSpot(st, myId, chosen.targetId);
      if (res.ok) {
        soundFX.playHide(true);
        navigator.vibrate?.(20);
        const p = st.players[myId];
        if (p) {
          spawnPixelBurst(p.x, p.y, 10, '#10B981', 75);
          spawnFloatingWorldText(p.x, p.y, '🚪 HIDDEN', '#34D399');
        }
      }
    } else if (chosen.action === 'exit_hide') {
      const res = attemptExitHidingSpot(st, myId);
      if (res.ok) {
        soundFX.playHide(false);
        navigator.vibrate?.(15);
        const p = st.players[myId];
        if (p) {
          spawnPixelBurst(p.x, p.y, 8, '#38BDF8', 65);
          spawnFloatingWorldText(p.x, p.y, '💨 OUT', '#94A3B8');
        }
      }
    } else if (chosen.action === 'eliminate') {
      attemptDirectElimination(st, myId, chosen.targetId, Date.now());
    } else if (chosen.action === 'inspect' && chosen.targetId) {
      attemptInspectHidingSpot(st, myId, chosen.targetId, Date.now());
    } else if (chosen.action === 'objective') {
      const p = st.players[myId];
      navigator.vibrate?.(15);
      setObjectiveInteraction(st, myId, !p?.interactingWithObjective);
    }
  }, []);

  const setHoldingObjectiveState = useCallback((holding: boolean) => {
    const st = matchStateRef.current;
    const myId = guestIdRef.current;
    if (isOnlineMatchRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'action',
          action: 'hold_objective',
          active: holding,
        })
      );
      return;
    }
    setObjectiveInteraction(st, myId, holding);
  }, []);

  const triggerSprint = useCallback(() => {
    const st = matchStateRef.current;
    const myId = guestIdRef.current;
    if (isOnlineMatchRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'action', action: 'sprint' }));
      const p = st.players[myId];
      // optimistic local prediction so movement feels instant
      if (p) attemptSprint(st, myId);
      return;
    }
    const res = attemptSprint(st, myId);
    if (res.ok) {
      const p = st.players[myId];
      if (p) spawnPixelBurst(p.x, p.y + 10, 8, '#7DD3FC', 60);
      navigator.vibrate?.(12);
    }
  }, []);

  // Global Keyboard Listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const key = e.key.toLowerCase();

      if (shellStateRef.current === 'title' && !showLobbyModal && !showHowToModal) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          startLocalGuestMatch('downtown_plaza', 1, 4, 'hider');
          return;
        }
      }

      if (e.key === 'Escape' || key === 'p') {
        if (shellStateRef.current === 'playing') {
          e.preventDefault();
          keysPressedRef.current.clear();
          setShellState('paused');
          return;
        } else if (shellStateRef.current === 'paused') {
          e.preventDefault();
          setShellState('playing');
          return;
        }
      }

      if (key === 'm' && (shellStateRef.current === 'playing' || shellStateRef.current === 'paused')) {
        soundFX.muted = !soundFX.muted;
        setMuted(soundFX.muted);
        return;
      }

      if (key === 'r' && shellStateRef.current === 'playing' && !isOnlineMatchRef.current) {
        const cfg = matchStateRef.current.config;
        const myP = matchStateRef.current.players[guestIdRef.current];
        startLocalGuestMatch(cfg.mapId, cfg.seekerCount, 4, myP?.role || 'hider');
        return;
      }

      if (shellStateRef.current !== 'playing') return;

      const num = parseInt(key, 10);
      if (num >= 1 && num <= 6) {
        e.preventDefault();
        sendEmote(QUICK_EMOTES[num - 1]);
        return;
      }

      const localPlayer = matchStateRef.current.players[guestIdRef.current];
      if (localPlayer && !localPlayer.alive) {
        if (key === '[' || key === 'arrowleft') {
          cycleSpectatorTarget(-1);
          return;
        }
        if (key === ']' || key === 'arrowright') {
          cycleSpectatorTarget(1);
          return;
        }
      }

      if (!e.repeat && (key === 'e' || e.key === ' ')) {
        e.preventDefault();
        executeContextualAction();
      }

      if (!e.repeat && key === 'f') {
        e.preventDefault();
        setHoldingObjectiveState(true);
      }

      if (!e.repeat && key === 'shift') {
        e.preventDefault();
        triggerSprint();
      }

      keysPressedRef.current.add(key);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressedRef.current.delete(key);
      if (key === 'f' && shellStateRef.current === 'playing') {
        setHoldingObjectiveState(false);
      }
    };

    const clearKeys = () => {
      keysPressedRef.current.clear();
      joystickVecRef.current = { x: 0, y: 0 };
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearKeys);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearKeys);
    };
  }, [
    showLobbyModal,
    showHowToModal,
    startLocalGuestMatch,
    executeContextualAction,
    setHoldingObjectiveState,
    sendEmote,
    cycleSpectatorTarget,
    triggerSprint,
  ]);

  // Mount Isolated 60 FPS Canvas2D Simulation & Renderer Once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isHeadless =
      navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);

    const handleResize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    let rafId = 0;
    let lastTime = performance.now();
    let lastHudSync = 0;
    let lastWsInputSent = 0;

    const loop = (now: number) => {
      rafId = requestAnimationFrame(loop);

      if (isHeadless && now - lastTime < 62) {
        return;
      }

      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
      const timeSec = now / 1000;

      const st = matchStateRef.current;
      const map = MAPS[st.config.mapId];
      const myId = guestIdRef.current;

      // 1. Advance simulation when in 'playing'
      if (shellStateRef.current === 'playing') {
        let ix = joystickVecRef.current.x;
        let iy = joystickVecRef.current.y;
        const keys = keysPressedRef.current;
        if (keys.has('w') || keys.has('arrowup')) iy -= 1;
        if (keys.has('s') || keys.has('arrowdown')) iy += 1;
        if (keys.has('a') || keys.has('arrowleft')) ix -= 1;
        if (keys.has('d') || keys.has('arrowright')) ix += 1;

        if (isOnlineMatchRef.current) {
          if (
            now - lastWsInputSent > 40 &&
            wsRef.current?.readyState === WebSocket.OPEN
          ) {
            lastWsInputSent = now;
            wsRef.current.send(JSON.stringify({ type: 'move_input', ix, iy }));
          }
          const localP = st.players[myId];
          if (localP && localP.alive) {
            const moved = resolvePlayerMovement(localP, ix, iy, dt, st, map);
            localP.x = moved.x;
            localP.y = moved.y;
            localP.vx = moved.vx;
            localP.vy = moved.vy;
            localP.facing = moved.facing;
          }
        } else {
          // Hit-stop: freeze the simulation for a few frames on big impacts (render keeps going)
          const frozen = hitStopRef.current > 0;
          if (frozen) hitStopRef.current = Math.max(0, hitStopRef.current - dt);

          for (const player of frozen ? [] : Object.values(st.players)) {
            if (player.id === myId) {
              const moved = resolvePlayerMovement(player, ix, iy, dt, st, map);
              const stepDist = Math.hypot(moved.x - player.x, moved.y - player.y);
              if (stepDist > 0.2) {
                distWalkedMapRef.current[player.id] =
                  (distWalkedMapRef.current[player.id] || 0) + stepDist;
                soundFX.playFootstep(player.role === 'seeker');
              }
              player.x = moved.x;
              player.y = moved.y;
              player.vx = moved.vx;
              player.vy = moved.vy;
              player.facing = moved.facing;
            } else if (player.isBot) {
              const oldX = player.x;
              const oldY = player.y;
              stepBotAI(st, player, dt, Date.now());
              const stepDist = Math.hypot(player.x - oldX, player.y - oldY);
              if (stepDist > 0.2) {
                distWalkedMapRef.current[player.id] =
                  (distWalkedMapRef.current[player.id] || 0) + stepDist;
              }
            }
          }

          stepAuthoritativeMatch(st, dt, Date.now());
          processNewMatchEventsRef.current(st);

          if (st.lifecycle === 'HIDER_HEAD_START') {
            const currentSec = Math.ceil(st.countdownRemaining);
            if (currentSec !== lastCountdownSecRef.current && currentSec > 0) {
              lastCountdownSecRef.current = currentSec;
              soundFX.playCountdownTick(currentSec);
            }
          }

          if (st.objectiveActiveHiderIds.includes(myId) && st.objectiveCurrentStageProgress > 0) {
            soundFX.playBeaconProgressTick(
              st.objectiveCurrentStageProgress / st.config.objectiveStageDurationSeconds
            );
          }

          if (st.lifecycle === 'MATCH_COMPLETED') {
            triggerGameOverFromState(st);
          }
        }

        // Calculate proximity tension for living hiders
        let currentTension = 0;
        const localPlayer = st.players[myId] || Object.values(st.players)[0];
        if (localPlayer && localPlayer.alive && localPlayer.role === 'hider' && st.lifecycle === 'MATCH_ACTIVE') {
          let minSeekerDist = Infinity;
          for (const p of Object.values(st.players)) {
            if (p.role === 'seeker' && p.alive) {
              const d = Math.hypot(p.x - localPlayer.x, p.y - localPlayer.y);
              if (d < minSeekerDist) minSeekerDist = d;
            }
          }
          if (minSeekerDist < 280) {
            currentTension = Math.max(0, 1 - minSeekerDist / 280);
            soundFX.playHeartbeat(currentTension);
          }
        }

        // Sync HUD snapshot at ~10Hz
        if (now - lastHudSync > 95) {
          lastHudSync = now;
          const localP = st.players[myId] || Object.values(st.players)[0];
          const allPlayers = Object.values(st.players);
          const hiders = allPlayers.filter((p) => p.role === 'hider');
          const livingHiders = hiders.filter((p) => p.alive);
          const seekers = allPlayers.filter((p) => p.role === 'seeker');
          const actions = getAvailableContextualActions(st, myId);
          const specTarget = spectatedIdRef.current ? st.players[spectatedIdRef.current] : null;

          setHud({
            role: localP?.role || 'hider',
            alive: localP?.alive ?? true,
            hiddenInSpotId: localP?.hiddenInSpotId ?? null,
            lifecycle: st.lifecycle,
            countdown: st.countdownRemaining,
            elapsedSeconds: st.elapsedMatchSeconds,
            matchTimerRemaining: Math.max(0, (st.config.survivalTimerSeconds ?? 240) - st.elapsedMatchSeconds),
            stagesCompleted: st.objectiveCompletedStages,
            totalStages: st.config.objectiveTotalStages,
            stageProgress: st.objectiveCurrentStageProgress,
            stageDuration: st.config.objectiveStageDurationSeconds,
            isHoldingObjective: localP?.interactingWithObjective ?? false,
            livingHiders: livingHiders.length,
            totalHiders: Math.max(1, hiders.length),
            seekerCount: Math.max(1, seekers.length),
            roomCode: st.roomCode,
            isOnline: isOnlineMatchRef.current,
            latestEvent: st.events[0]?.message || 'Explore the city and stay alert.',
            playerX: Math.round(localP?.x ?? map.width / 2),
            playerY: Math.round(localP?.y ?? map.height / 2),
            sectorLabel: getCitySectorLabel(
              localP?.x ?? map.width / 2,
              localP?.y ?? map.height / 2,
              map.width,
              map.height
            ),
            contextualActions: actions,
            proximityDanger: currentTension,
            pingMs: pingMsRef.current,
            spectatingPlayerName: specTarget ? specTarget.name : null,
            spectatingRole: specTarget ? specTarget.role : null,
            activeEvents: (() => {
              // Toast feed: only meaningful events, each visible for ~4.5s after it first appears
              const nowMs = Date.now();
              const seen = eventSeenAtRef.current;
              const out: MatchEventLog[] = [];
              for (const e of st.events) {
                if (!seen.has(e.id)) seen.set(e.id, nowMs);
                if (e.type === 'inspect_empty') continue;
                if (nowMs - (seen.get(e.id) ?? nowMs) > 4500) continue;
                out.push(e);
                if (out.length >= 3) break;
              }
              if (seen.size > 200) {
                const keep = new Set(st.events.map((e) => e.id));
                for (const id of seen.keys()) if (!keep.has(id)) seen.delete(id);
              }
              return out;
            })(),
            sprintCooldown: localP?.sprintCooldownRemaining ?? 0,
            sprinting: (localP?.sprintRemaining ?? 0) > 0,
            rehideCooldown: localP?.rehideCooldownRemaining ?? 0,
          });
        }
      } else if (shellStateRef.current === 'title') {
        // Animate Title Screen Showcase Characters
        for (const p of Object.values(st.players)) {
          distWalkedMapRef.current[p.id] = (distWalkedMapRef.current[p.id] || 0) + dt * 65;
        }
      }

      // 2. Render Crisp Pixel-Art World
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#090D16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const inMatch =
        shellStateRef.current !== 'title' &&
        (st.lifecycle === 'HIDER_HEAD_START' ||
          st.lifecycle === 'SEEKER_RELEASED' ||
          st.lifecycle === 'MATCH_ACTIVE');
      // Perception: online the server already filtered; offline apply the same rule locally.
      const viewState =
        shellStateRef.current === 'title' || isOnlineMatchRef.current ? st : filterStateForViewer(st, myId);

      // Smoothed render positions (interpolates 25Hz network snapshots for remote players)
      const smoothK = 1 - Math.exp(-dt * 16);
      const renderPos = renderPosRef.current;
      const posOf = (p: PlayerState) => {
        if (!isOnlineMatchRef.current || p.id === myId) return p;
        let rp = renderPos.get(p.id);
        if (!rp || Math.hypot(rp.x - p.x, rp.y - p.y) > 160) {
          rp = { x: p.x, y: p.y };
          renderPos.set(p.id, rp);
        }
        return rp;
      };
      for (const p of Object.values(viewState.players)) {
        if (p.masked) {
          renderPos.delete(p.id);
          continue;
        }
        const rp = renderPos.get(p.id);
        if (rp) {
          rp.x += (p.x - rp.x) * smoothK;
          rp.y += (p.y - rp.y) * smoothK;
        }
      }

      ctx.save();

      let camX = map.width / 2;
      let camY = map.height / 2;
      let followTarget: PlayerState | null = null;

      if (shellStateRef.current === 'title') {
        camX = map.width / 2 + Math.cos(timeSec * 0.2) * 180;
        camY = map.height / 2 + Math.sin(timeSec * 0.16) * 140;
        cameraRef.current = null;
      } else {
        let targetP = st.players[myId];
        if (targetP && !targetP.alive) {
          const living = Object.values(st.players).filter((p) => p.alive && !p.masked);
          if (living.length > 0) {
            let specP = spectatedIdRef.current ? st.players[spectatedIdRef.current] : null;
            if (!specP || !specP.alive || specP.masked) {
              specP = living[0];
              spectatedIdRef.current = specP.id;
            }
            targetP = specP;
          }
        }
        if (targetP) {
          followTarget = targetP;
          const tp = posOf(targetP);
          // Smooth follow with a little look-ahead in the movement direction
          const lookX = tp.x + targetP.vx * 0.18;
          const lookY = tp.y + targetP.vy * 0.18;
          if (!cameraRef.current) cameraRef.current = { x: lookX, y: lookY };
          const ck = 1 - Math.exp(-dt * 9);
          cameraRef.current.x += (lookX - cameraRef.current.x) * ck;
          cameraRef.current.y += (lookY - cameraRef.current.y) * ck;
          camX = cameraRef.current.x;
          camY = cameraRef.current.y;
        }
      }

      if (cameraShakeRef.current > 0) {
        const shake = reducedMotionRef.current ? 0 : cameraShakeRef.current * cameraShakeRef.current * 18;
        camX += (Math.random() - 0.5) * shake;
        camY += (Math.random() - 0.5) * shake;
        cameraShakeRef.current = Math.max(0, cameraShakeRef.current - dt * 1.8);
      }

      const offsetX = Math.round(canvas.width / 2 - camX);
      const offsetY = Math.round(canvas.height / 2 - camY);
      ctx.translate(offsetX, offsetY);

      // Hiding objects wobble when something rustles or bursts out of them
      const wobbleSpotIds = new Set<string>();
      for (const ping of viewState.noisePings ?? []) {
        if (ping.kind !== 'rustle' && ping.kind !== 'flush') continue;
        for (const spot of map.hidingSpots) {
          const cx = spot.x + spot.width / 2;
          const cy = spot.y + spot.height / 2;
          if (Math.hypot(cx - ping.x, cy - ping.y) < 70) {
            wobbleSpotIds.add(spot.id);
            break;
          }
        }
      }

      drawPixelMap(ctx, map, viewState, myId, timeSec, { wobbleSpotIds });
      const objectives = getMapObjectives(map);
      drawTransmitLinks(ctx, viewState, objectives, posOf, timeSec);

      const localP = viewState.players[myId];
      const viewerRole = localP?.role || 'hider';
      const sortedPlayers = Object.values(viewState.players)
        .filter((p) => !p.masked)
        .sort((a, b) => posOf(a).y - posOf(b).y);
      for (const p of sortedPlayers) {
        const pos = posOf(p);
        const drawP = pos === p ? p : { ...p, x: pos.x, y: pos.y };
        drawPlayerSprite(ctx, drawP, p.id === myId, viewerRole, distWalkedMapRef.current[p.id] || 0);
        drawPlayerStatusFx(ctx, p, pos.x, pos.y, timeSec);

        // Footstep dust puffs while moving
        if (inMatch && p.alive && !p.hiddenInSpotId && Math.hypot(p.vx, p.vy) > 40) {
          const walked = distWalkedMapRef.current[p.id] || 0;
          const stepKey = `__dust_${p.id}`;
          const lastDust = (distWalkedMapRef.current[stepKey] as number | undefined) ?? 0;
          if (walked - lastDust > 26) {
            distWalkedMapRef.current[stepKey] = walked;
            spawnPixelBurst(pos.x, pos.y + 12, 2, p.role === 'seeker' ? '#475569' : '#94A3B8', 22);
          }
        }
      }
      // Track walking distance for remote players too (online), so their animation plays
      if (isOnlineMatchRef.current) {
        for (const p of sortedPlayers) {
          if (p.id === myId) continue;
          const sp = Math.hypot(p.vx, p.vy);
          if (sp > 1) distWalkedMapRef.current[p.id] = (distWalkedMapRef.current[p.id] || 0) + sp * dt;
        }
      }

      stepAndDrawParticles(ctx, dt);
      ctx.restore();

      // 2b. Fog of war: only living players in an active match see through their own eyes
      const viewer = st.players[myId];
      if (inMatch && viewer && viewer.alive && followTarget && followTarget.id === myId) {
        const vp = posOf(viewer);
        const radius =
          viewer.role === 'seeker' ? st.config.seekerVisionRadius ?? 250 : st.config.hiderVisionRadius ?? 340;
        const poly = computeVisibilityPolygon(vp.x, vp.y, radius, map.walls, fogPolyRef.current);
        drawFogOfWar(ctx, canvas.width, canvas.height, offsetX, offsetY, {
          polygon: poly,
          originX: vp.x,
          originY: vp.y,
          radius,
          darkness: viewer.hiddenInSpotId ? 0.84 : 0.74,
          map,
          objectives,
          timeSec,
        });
      }

      // 2c. World-space overlays that must read through the darkness
      ctx.save();
      ctx.translate(offsetX, offsetY);
      if (inMatch) drawNoisePings(ctx, viewState.noisePings, timeSec);
      stepAndDrawFloatingTexts(ctx, dt);
      ctx.restore();

      if (flashRef.current.amount > 0) {
        drawScreenFlash(ctx, canvas.width, canvas.height, flashRef.current.amount, flashRef.current.color);
        flashRef.current.amount = Math.max(0, flashRef.current.amount - dt * 2.2);
      }

      // 3. Render Transparent Corner Minimap when in gameplay
      const miniCanvas = minimapCanvasRef.current;
      if (miniCanvas && shellStateRef.current !== 'title') {
        const mCtx = miniCanvas.getContext('2d');
        if (mCtx) {
          drawCityMinimap(
            mCtx,
            miniCanvas.width,
            miniCanvas.height,
            map,
            viewState,
            myId,
            timeSec,
            canvas.width,
            canvas.height
          );
        }
      }
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, [triggerGameOverFromState]);

  const showMobileControls =
    shellState === 'playing' &&
    (touchMode === 'on' || (touchMode === 'auto' && isMobileViewport));

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#090D16] select-none">
      {/* Persistent Full-Viewport Pixel-Art Canvas */}
      <canvas
        ref={canvasRef}
        data-testid="game-canvas"
        className="block w-full h-full pixelated"
      />

      {/* =====================================================================
          STATE 1: TITLE SCREEN (Diegetic Live World Tour + Custom SVG Lockup)
          ===================================================================== */}
      {shellState === 'title' && (
        <div
          className="fixed inset-0 z-20 overflow-y-auto scroll-touch touch-pan-y overscroll-contain p-3 sm:p-6 md:p-8 bg-gradient-to-t from-[#070A12]/95 via-[#070A12]/60 to-[#070A12]/85"
          style={{
            paddingTop: 'max(0.6rem, env(safe-area-inset-top, 0px))',
            paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom, 0px))',
            paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
            paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
          }}
        >
          <div className="min-h-full flex flex-col justify-between w-full">
            {/* Top Bar: Guest Identity Readout + Audio, Fullscreen & Rules */}
          <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="text-[11px] sm:text-xs font-mono text-slate-300 flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-amber-300 font-bold">
                👤 {guestName}
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-emerald-300 hidden sm:inline">
                {CHARACTER_SKINS.find((s) => s.id === selectedSkin)?.name}
              </span>
              <span className="text-slate-500 hidden sm:inline">·</span>
              <span className="text-sky-300 hidden md:inline">{MAPS[selectedTitleMap].name}</span>
              <span className="text-slate-500 hidden md:inline">·</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                  wsConnected
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                {wsConnected ? 'ONLINE' : 'LOCAL'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={toggleFullscreen}
                aria-label="Toggle Fullscreen"
                className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg sm:rounded-xl bg-slate-900/90 hover:bg-slate-800 text-sky-300 border border-slate-700 font-mono text-xs font-bold transition-colors cursor-pointer"
              >
                ⛶
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = soundFX.toggleBgm();
                  setBgmEnabled(next);
                }}
                className={`h-8 sm:h-9 px-2.5 sm:px-3 rounded-lg sm:rounded-xl border font-mono font-bold text-xs transition-colors cursor-pointer ${
                  bgmEnabled
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                    : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {bgmEnabled ? 'BGM: ON' : 'BGM: OFF'}
              </button>
              <button
                type="button"
                onClick={() => {
                  soundFX.playUiTap();
                  setShowHowToModal(true);
                }}
                className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-lg sm:rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 font-display font-bold text-xs transition-colors cursor-pointer"
              >
                Rules
              </button>
            </div>
          </div>

          {/* Portrait Device Gentle Floating Tip */}
          {isPortrait && (
            <div className="my-1 py-1 px-3 rounded-lg bg-amber-500/15 border border-amber-500/40 text-[11px] font-mono text-amber-300 text-center flex items-center justify-center gap-1.5">
              <span>🔄</span>
              <span>Rotate device to landscape for full view</span>
            </div>
          )}

          {/* Center Focal Anchor: Emblem + IMMEDIATE PLAY ACTIONS + Horizontal Selectors */}
          <div className="my-auto max-w-2xl w-full py-1 sm:py-2">
            {/* Responsive Title Logo SVG */}
            <div className="flex items-center gap-2.5">
              <svg
                viewBox="0 0 640 130"
                className="w-full max-w-[280px] sm:max-w-[420px] md:max-w-[500px] h-auto drop-shadow-[0_4px_0_#090D16]"
                role="img"
                aria-label="CITY HIDEOUT Pixel-Art Emblem"
              >
                <rect x="4" y="14" width="84" height="84" rx="12" fill="#090D16" stroke="#F59E0B" strokeWidth="4" />
                <rect x="16" y="26" width="60" height="60" fill="#1E293B" />
                <rect x="22" y="54" width="14" height="32" fill="#334155" />
                <rect x="56" y="48" width="14" height="38" fill="#334155" />
                <rect x="42" y="34" width="8" height="52" fill="#10B981" />
                <rect x="38" y="28" width="16" height="12" fill="#F59E0B" />
                <text
                  x="106"
                  y="62"
                  fill="#F8FAFC"
                  fontFamily="Outfit, sans-serif"
                  fontWeight="800"
                  fontSize="52"
                  letterSpacing="2"
                >
                  CITY HIDEOUT
                </text>
                <text
                  x="108"
                  y="92"
                  fill="#F59E0B"
                  fontFamily="Outfit, sans-serif"
                  fontWeight="800"
                  fontSize="14"
                  letterSpacing="2.2"
                >
                  4 MAPS · 76 HIDING SPOTS · 2D PIXEL ART
                </text>
              </svg>
            </div>

            {/* Description (Visible on tablets & desktops, compact to save mobile vertical height) */}
            <p className="hidden md:block mt-1.5 text-xs text-slate-300 max-w-xl leading-relaxed">
              Explore cutaway furnished apartments, harbor railway docks, modern executive suites, and mystic forest ruins. Hide up to 15s per object or complete 3 Beacon stages to escape!
            </p>

            {/* PRIMARY PLAY CTAs (Immediately below the title — Always visible on phones without scrolling!) */}
            <div className="mt-2.5 sm:mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                data-start="true"
                onClick={() => {
                  soundFX.playUiTap();
                  startLocalGuestMatch(
                    selectedTitleMap,
                    MAPS[selectedTitleMap].recommendedSeekers,
                    4,
                    'hider'
                  );
                }}
                className="flex-1 min-w-[140px] sm:flex-none min-h-[44px] sm:min-h-[50px] px-5 sm:px-7 py-2.5 sm:py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-display font-extrabold text-sm sm:text-base tracking-wide shadow-[0_4px_0_#065F46] sm:shadow-[0_6px_0_#065F46] transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>▶</span>
                <span>Play as Guest</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundFX.playUiTap();
                  startLocalGuestMatch(selectedTitleMap, 1, 4, 'seeker');
                }}
                className="min-h-[44px] sm:min-h-[50px] px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-slate-900/95 hover:bg-slate-800 active:scale-95 text-red-300 border-2 border-red-500/50 font-display font-bold text-xs sm:text-sm tracking-wide transition-colors cursor-pointer"
              >
                Seeker (1.2×)
              </button>

              <button
                type="button"
                onClick={() => {
                  soundFX.playUiTap();
                  setShowLobbyModal(true);
                }}
                className="min-h-[44px] sm:min-h-[50px] px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-display font-extrabold text-xs sm:text-sm tracking-wide shadow-[0_4px_0_#92400E] sm:shadow-[0_6px_0_#92400E] transition-all cursor-pointer"
              >
                Multiplayer Room
              </button>
            </div>

            {/* Compact Horizontal Map Arena Selector Strip */}
            <div className="mt-2.5 sm:mt-3">
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-amber-300/90 mb-1">
                <span>SELECT MAP ({MAPS[selectedTitleMap].hidingSpots.length} SPOTS)</span>
                <span className="text-slate-400 text-[9px] hidden sm:inline">SWIPE ◄ ►</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 touch-pan-x">
                {(
                  [
                    'downtown_plaza',
                    'harbor_district',
                    'modern_mall',
                    'mystic_sanctuary',
                  ] as const
                ).map((mId) => {
                  const m = MAPS[mId];
                  const isSelected = selectedTitleMap === mId;
                  return (
                    <button
                      key={mId}
                      type="button"
                      onClick={() => {
                        soundFX.playUiTap();
                        setSelectedTitleMap(mId);
                        matchStateRef.current.config.mapId = mId;
                      }}
                      className={`min-h-[34px] sm:min-h-[38px] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-mono text-[11px] sm:text-xs font-bold border transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                        isSelected
                          ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                          : 'bg-[#090D16]/85 border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {m.name} ({m.hidingSpots.length})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Compact Horizontal Character Sprite Selector Strip */}
            <div className="mt-2 sm:mt-2.5">
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-emerald-300/90 mb-1">
                <span>SELECT CHARACTER ({CHARACTER_SKINS.find((s) => s.id === selectedSkin)?.name})</span>
                <span className="text-slate-400 text-[9px] hidden sm:inline">SWIPE ◄ ►</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 touch-pan-x">
                {CHARACTER_SKINS.map((sk) => {
                  const isSelected = selectedSkin === sk.id;
                  return (
                    <button
                      key={sk.id}
                      type="button"
                      onClick={() => {
                        soundFX.playUiTap();
                        setSelectedSkin(sk.id);
                      }}
                      className={`min-h-[32px] sm:min-h-[36px] px-2 sm:px-2.5 py-1 rounded-lg font-mono text-[11px] sm:text-xs font-bold border transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                        isSelected
                          ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                          : 'bg-[#090D16]/85 border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {sk.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Row / Safe Margins */}
          <div className="shrink-0 pt-1">
            <div className="hidden sm:block text-xs font-mono text-slate-400 tracking-wide">
              WASD / Arrows Move · E / Space Hide or Inspect · Hold F Beacon Objective · Esc Pause
            </div>
            <div className="sm:hidden text-[10px] font-mono text-slate-400 flex items-center justify-between">
              <span>📱 Virtual Joystick + Action buttons active</span>
              <span>100% Base Speed (Seeker 1.2×)</span>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* =====================================================================
          STATE 2: PLAYING HUD (<= 3 Compact Perimeter Clusters, >85% Clear View)
          ===================================================================== */}
      {shellState === 'playing' && (
        <div
          className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-2 sm:p-5 short:p-1.5!"
          style={{
            paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))',
            paddingLeft: 'max(0.5rem, env(safe-area-inset-left, 0px))',
            paddingRight: 'max(0.5rem, env(safe-area-inset-right, 0px))',
            paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))',
          }}
        >
          {/* Top Perimeter Row: 3 Non-wrapping Clusters with high visual clarity */}
          <div className="flex items-start justify-between gap-1.5 sm:gap-3 short:gap-1.5! w-full">
            {/* Cluster 1 (Top-Left): Role Emblem + Living Hiders + Ping */}
            <div className="order-1 pointer-events-auto bg-[#090D16]/90 border border-slate-700 sm:border-2 rounded-lg sm:rounded-xl px-2 py-1 sm:px-3.5 sm:py-2.5 short:border! short:rounded-lg! short:px-2! short:py-1! short:gap-1.5! shadow-lg flex items-center gap-1.5 sm:gap-3.5 shrink-0">
              <div>
                <div className="text-[8px] sm:text-[10px] short:text-[8px]! font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1 sm:gap-1.5">
                  <span className="hidden xs:inline">ROLE · </span>
                  <span>{hud.isOnline ? `RM ${hud.roomCode}` : 'GUEST'}</span>
                  <span className="px-1 py-0.2 rounded bg-slate-900 border border-slate-700 text-[8px] sm:text-[9px] font-mono text-slate-300">
                    {hud.isOnline
                      ? hud.pingMs !== null
                        ? `${hud.pingMs < 60 ? '🟢' : hud.pingMs < 140 ? '🟡' : '🔴'}${hud.pingMs}ms`
                        : '⚪'
                      : '⚡'}
                  </span>
                </div>
                <div
                  data-testid="hud-role"
                  className={`text-xs sm:text-xl short:text-sm! font-display font-extrabold tracking-wide uppercase ${
                    hud.role === 'seeker' ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {hud.role === 'seeker' ? 'SEEKER 1.2×' : 'HIDER'}
                </div>
              </div>

              <div className="pl-1.5 sm:pl-3 short:pl-1.5! border-l border-slate-800">
                <div className="text-[8px] sm:text-[10px] font-mono uppercase text-slate-400 hidden xs:block short:hidden!">
                  ALIVE
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5 sm:mt-1">
                  <div className="hidden sm:flex short:hidden! items-center gap-1">
                    {Array.from({ length: hud.totalHiders }).map((_, idx) => {
                      const isAlive = idx < hud.livingHiders;
                      return (
                        <svg
                          key={idx}
                          viewBox="0 0 24 24"
                          className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                          aria-hidden="true"
                        >
                          <rect
                            x="2"
                            y="2"
                            width="20"
                            height="20"
                            rx="4"
                            fill={isAlive ? '#10B981' : '#1E293B'}
                            stroke="#090D16"
                            strokeWidth="2.5"
                          />
                          {isAlive && (
                            <rect x="6" y="5" width="12" height="5" fill="#A7F3D0" />
                          )}
                        </svg>
                      );
                    })}
                  </div>
                  <span className="text-xs sm:text-sm font-mono font-bold text-white tabular-nums flex items-center gap-1">
                    <span className="sm:hidden short:inline! text-emerald-400">👤</span>
                    <span>{hud.livingHiders}/{hud.totalHiders}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Cluster 2 (Top-Center): Authoritative Countdown, Round Timer, & 3-Stage Escape Beacon */}
            <div className="order-2 pointer-events-auto bg-[#090D16]/90 border border-slate-700 sm:border-2 rounded-lg sm:rounded-xl px-2 py-1 sm:px-4 sm:py-2.5 short:border! short:rounded-lg! short:px-2! short:py-1! short:min-w-[190px]! short:max-w-[240px]! shadow-lg text-center shrink min-w-0 max-w-[220px] sm:max-w-none sm:min-w-[280px]">
              {hud.lifecycle === 'HIDER_HEAD_START' ? (
                <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                  <div className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-amber-400">
                    HEAD START
                  </div>
                  <div
                    data-testid="hud-countdown"
                    className="text-base sm:text-2xl short:text-base! font-mono font-extrabold text-white tabular-nums"
                  >
                    {Math.ceil(hud.countdown)}s
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between text-[9px] sm:text-[10px] short:text-[9px]! font-mono uppercase text-slate-300 mb-0.5 sm:mb-1 short:mb-0.5! gap-1.5">
                    <span>BEACON {hud.stagesCompleted}/{hud.totalStages}</span>
                    <span className="text-amber-300 font-bold tabular-nums">
                      ⏱️ {formatMatchTime(hud.matchTimerRemaining)}
                    </span>
                    <span className="text-slate-400 tabular-nums hidden xs:inline short:hidden!">
                      {hud.stageProgress > 0
                        ? `${Math.ceil(hud.stageDuration - hud.stageProgress)}s`
                        : `${hud.stageDuration}s/stg · 2 beacons`}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
                    {Array.from({ length: hud.totalStages }).map((_, sIdx) => {
                      const pct =
                        sIdx < hud.stagesCompleted
                          ? 100
                          : sIdx === hud.stagesCompleted
                          ? Math.min(100, Math.round((hud.stageProgress / hud.stageDuration) * 100))
                          : 0;
                      return (
                        <div
                          key={sIdx}
                          className="h-1.5 sm:h-2.5 short:h-1.5! rounded bg-slate-800 border border-slate-700 overflow-hidden"
                        >
                          <div
                            style={{ transform: `scaleX(${pct / 100})` }}
                            className="h-full w-full origin-left bg-emerald-400 transition-transform duration-75"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="mt-0.5 text-[9px] sm:text-[11px] text-slate-300 truncate max-w-[200px] sm:max-w-[280px] mx-auto hidden sm:block short:hidden!">
                {hud.latestEvent}
              </div>
            </div>

            {/* Cluster 3 (Top-Right): Compact Controls + Minimap (collapsible on mobile) */}
            <div className="order-3 pointer-events-auto flex flex-col items-end gap-1 sm:gap-2 short:gap-1! shrink-0">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Toggle Fullscreen"
                  onClick={toggleFullscreen}
                  className="w-7 h-7 sm:w-11 sm:h-11 short:w-7! short:h-7! short:border! rounded-lg sm:rounded-xl short:rounded-lg! bg-[#090D16]/90 hover:bg-slate-800 border border-slate-700 sm:border-2 text-sky-300 font-mono text-[10px] sm:text-sm font-bold flex items-center justify-center shadow-lg cursor-pointer"
                >
                  ⛶
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Toggle Minimap"
                  onClick={() => setMinimapVisible((v) => !v)}
                  className={`w-7 h-7 sm:w-11 sm:h-11 short:w-7! short:h-7! short:border! rounded-lg sm:rounded-xl short:rounded-lg! border border-slate-700 sm:border-2 text-[10px] sm:text-xs font-bold flex items-center justify-center shadow-lg cursor-pointer ${
                    minimapVisible
                      ? 'bg-amber-950/80 border-amber-500/60 text-amber-300'
                      : 'bg-[#090D16]/90 hover:bg-slate-800 text-slate-400'
                  }`}
                >
                  🗺️
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={bgmEnabled ? 'Disable background music' : 'Enable background music'}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    const next = soundFX.toggleBgm();
                    setBgmEnabled(next);
                  }}
                  className={`h-7 px-1.5 sm:h-11 sm:px-2.5 short:h-7! short:px-1.5! short:text-[8px]! short:border! rounded-lg sm:rounded-xl short:rounded-lg! border border-slate-700 sm:border-2 font-mono text-[8px] sm:text-[10px] font-bold flex items-center justify-center shadow-lg ${
                    bgmEnabled
                      ? 'bg-emerald-950/90 border-emerald-400 text-emerald-300'
                      : 'bg-[#090D16]/90 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  BGM
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    const next = soundFX.toggleMute();
                    setMuted(next);
                  }}
                  className="w-7 h-7 sm:w-11 sm:h-11 short:w-7! short:h-7! short:border! rounded-lg sm:rounded-xl short:rounded-lg! bg-[#090D16]/90 hover:bg-slate-800 border border-slate-700 sm:border-2 flex items-center justify-center text-slate-200 shadow-lg cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 sm:w-5 sm:h-5 short:w-3.5! short:h-3.5!" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 5L6 9H2v6h4l5 4V5z" />
                    {muted ? (
                      <path d="M23 9l-6 6M17 9l6 6" stroke="#EF4444" />
                    ) : (
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
                    )}
                  </svg>
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Pause game"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    keysPressedRef.current.clear();
                    setShellState('paused');
                  }}
                  className="w-7 h-7 sm:w-11 sm:h-11 short:w-7! short:h-7! short:border! rounded-lg sm:rounded-xl short:rounded-lg! bg-[#090D16]/90 hover:bg-slate-800 border border-slate-700 sm:border-2 flex items-center justify-center text-slate-200 shadow-lg cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 sm:w-5 sm:h-5 short:w-3.5! short:h-3.5!" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                </button>
              </div>

              {/* Transparent Minimap Canvas (Collapsible on mobile via minimapVisible state) */}
              {minimapVisible && (
                <div
                  data-testid="minimap-hud"
                  onClick={() => {
                    if (isMobileViewport) setMinimapVisible(false);
                  }}
                  className="bg-[#090D16]/65 backdrop-blur-[2px] border border-slate-600/60 rounded-lg sm:rounded-xl short:rounded-lg! p-0.5 sm:p-1.5 short:p-0.5! shadow-lg cursor-pointer"
                  title="Click to collapse minimap on mobile"
                >
                  <div className="flex items-center justify-between gap-1.5 px-0.5 mb-0.5 text-[7px] sm:text-[9px] short:text-[7px]! font-mono tracking-wider text-slate-200">
                    <span className="font-bold text-amber-300 truncate max-w-[60px] sm:max-w-none">{hud.sectorLabel}</span>
                    <span className="text-slate-300 tabular-nums short:hidden!">
                      {hud.playerX},{hud.playerY}
                    </span>
                  </div>
                  <canvas
                    ref={minimapCanvasRef}
                    width={168}
                    height={118}
                    data-testid="minimap-canvas"
                    aria-label="City layout minimap showing player position"
                    className="block w-[86px] h-[60px] sm:w-[168px] sm:h-[118px] short:w-[100px]! short:h-[70px]! rounded border border-slate-700/60 pixelated"
                  />
                  <div className="mt-0.5 px-0.5 flex items-center justify-between text-[6px] sm:text-[8px] font-mono text-slate-300 short:hidden!">
                    <span className="flex items-center gap-0.5">
                      <span
                        className={`inline-block w-1.5 h-1.5 rounded-xs ${
                          hud.role === 'seeker' ? 'bg-red-500' : 'bg-emerald-400'
                        }`}
                      />
                      YOU
                    </span>
                    <span className="flex items-center gap-0.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-xs bg-amber-400" />
                      BEACON
                    </span>
                    <span className="flex items-center gap-0.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-xs bg-sky-400" />
                      HIDE
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Hider ability strip (Desktop): sprint + catch-breath cooldown */}
          {!showMobileControls && hud.alive && hud.role === 'hider' && !hud.hiddenInSpotId && (
            <div className="pointer-events-none mx-auto mb-1.5 flex items-center gap-2 text-[11px] font-mono">
              <span
                className={`px-2.5 py-1 rounded-lg border shadow ${
                  hud.sprinting
                    ? 'bg-sky-400 text-slate-950 border-sky-100'
                    : hud.sprintCooldown > 0
                    ? 'bg-slate-900/90 text-slate-400 border-slate-700'
                    : 'bg-sky-700/90 text-white border-sky-400'
                }`}
              >
                ⚡ [SHIFT] {hud.sprinting ? 'SPRINTING!' : hud.sprintCooldown > 0 ? `Sprint ${Math.ceil(hud.sprintCooldown)}s` : 'Sprint ready'}
              </span>
              {hud.rehideCooldown > 0 && (
                <span className="px-2.5 py-1 rounded-lg border bg-amber-950/90 text-amber-200 border-amber-600/60 shadow">
                  😮‍💨 Catch your breath {Math.ceil(hud.rehideCooldown)}s
                </span>
              )}
            </div>
          )}

          {/* Bottom Contextual Prompt Banner (Desktop & Keyboard Prompt) */}
          {!showMobileControls && hud.contextualActions.length > 0 && (
            <div className="pointer-events-auto mx-auto mb-2 flex items-center gap-3 bg-[#090D16]/95 border-2 border-amber-400/80 rounded-xl px-5 py-2.5 shadow-xl">
              {hud.contextualActions.map((act) => (
                <button
                  key={`${act.action}_${act.targetId || ''}`}
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    executeContextualAction(act);
                  }}
                  className="flex items-center gap-2.5 text-left cursor-pointer"
                >
                  <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-mono font-bold text-xs">
                    {act.action === 'objective' ? 'HOLD [F]' : '[E / SPACE]'}
                  </span>
                  <div>
                    <div className="text-xs sm:text-sm font-display font-bold text-white">
                      {act.label}
                    </div>
                    <div className="text-[11px] text-slate-400">{act.sublabel}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Spectator Mode Top Banner (When local player is eliminated) */}
          {!hud.alive && (
            <div className="pointer-events-auto mx-auto mb-2 flex items-center gap-2.5 sm:gap-4 bg-red-950/90 border-2 border-red-500/80 rounded-2xl px-4 py-2 sm:px-6 sm:py-2.5 shadow-2xl backdrop-blur-md">
              <span className="text-[11px] sm:text-xs font-mono font-bold text-red-300 animate-pulse">
                ☠️ ELIMINATED
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-xs sm:text-sm font-display font-bold text-white">
                SPECTATING: {hud.spectatingPlayerName || 'Living Teammate'}
              </span>
              <div className="flex items-center gap-1.5 ml-1">
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => cycleSpectatorTarget(-1)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-mono font-bold text-slate-200 border border-slate-700 cursor-pointer"
                >
                  ◀ [
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => cycleSpectatorTarget(1)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-mono font-bold text-slate-200 border border-slate-700 cursor-pointer"
                >
                  ] ▶
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Real-time Elimination & Event Feed Toast Stack */}
      {shellState === 'playing' && hud.activeEvents.length > 0 && (
        <div className="fixed top-24 left-3 sm:left-5 short:top-[60px]! short:left-2! short:gap-1! short:max-w-[220px]! z-25 pointer-events-none flex flex-col gap-1.5 max-w-[260px] sm:max-w-[340px]">
          {hud.activeEvents.slice(0, isShortViewport ? 2 : 3).map((evt) => {
            const isElim = evt.type === 'elimination';
            const isObj = evt.type === 'objective_stage';
            const isHide = evt.type === 'hide' || evt.type === 'flush';
            const isVic = evt.type === 'victory';
            return (
              <div
                key={evt.id}
                className={`px-2.5 py-1.5 short:px-1.5! short:py-0.5! short:text-[9px]! short:gap-1! rounded-lg text-[11px] font-mono border shadow-md backdrop-blur-md flex items-center gap-2 transition-all duration-300 ${
                  isElim
                    ? 'bg-red-950/85 border-red-500/60 text-red-200'
                    : isObj
                    ? 'bg-emerald-950/85 border-emerald-500/60 text-emerald-200'
                    : isHide
                    ? 'bg-amber-950/85 border-amber-500/60 text-amber-200'
                    : isVic
                    ? 'bg-purple-950/85 border-purple-500/60 text-purple-200'
                    : 'bg-slate-900/80 border-slate-700/60 text-slate-300'
                }`}
              >
                <span>{isElim ? '🔴' : isObj ? '⚡' : isHide ? '🚪' : isVic ? '🏆' : 'ℹ️'}</span>
                <span className="truncate">{evt.message}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Suspense Proximity Vignette when Seeker is near living Hider */}
      {shellState === 'playing' && hud.proximityDanger > 0.05 && (
        <div
          className="fixed inset-0 pointer-events-none z-15 transition-opacity duration-300"
          style={{
            opacity: Math.min(0.85, hud.proximityDanger * 0.95),
            background:
              'radial-gradient(circle at center, transparent 42%, rgba(220, 38, 38, 0.4) 80%, rgba(153, 27, 27, 0.75) 100%)',
          }}
        />
      )}

      {/* Quick Tactical Callouts Dock (Desktop Keyboard 1-6) */}
      {!showMobileControls && shellState === 'playing' && (
        <div className="fixed bottom-3 right-4 sm:right-6 z-25 pointer-events-auto flex items-center gap-1.5 bg-[#090D16]/90 border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-xl backdrop-blur-md">
          <span className="text-[10px] font-mono text-slate-400 mr-1 hidden sm:inline">CALLOUTS:</span>
          {QUICK_EMOTES.map((em, idx) => (
            <button
              key={em}
              type="button"
              tabIndex={-1}
              onClick={() => sendEmote(em)}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-mono text-slate-200 border border-slate-700/60 cursor-pointer"
            >
              <span className="text-amber-400 font-bold mr-1">[{idx + 1}]</span>
              {em.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      {/* Adaptive Mobile Touch Controls (Joystick + Contextual Action Buttons + Quick Callouts) */}
      <MobileControls
        visible={showMobileControls}
        role={hud.role}
        sensitivity={joystickSensitivity}
        contextualActions={hud.contextualActions}
        isHoldingObjective={hud.isHoldingObjective}
        onJoystickMove={(jx, jy) => {
          joystickVecRef.current = { x: jx, y: jy };
        }}
        onTriggerAction={(act) => executeContextualAction(act)}
        onHoldObjectiveChange={(holding) => setHoldingObjectiveState(holding)}
        onSendEmote={sendEmote}
        showSprint={hud.role === 'hider' && hud.alive && !hud.hiddenInSpotId && hud.lifecycle !== 'LOBBY'}
        sprintCooldown={hud.sprintCooldown}
        sprinting={hud.sprinting}
        onSprint={triggerSprint}
      />

      {/* Online Multiplayer & Match Setup Lobby Modal */}
      {showLobbyModal && (
        <LobbyModal
          guestId={guestId}
          guestName={guestName}
          selectedSkin={selectedSkin}
          wsConnected={wsConnected}
          onlineRoomState={onlineRoomState}
          errorBanner={errorBanner}
          onSelectSkin={(sk) => setSelectedSkin(sk)}
          onUpdateGuestName={(newName) => {
            setGuestName(newName);
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'update_name', displayName: newName }));
            }
          }}
          onCreateOnlineRoom={(mapId, seekerCount, botCount) => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(
                JSON.stringify({ type: 'create_room', mapId, seekerCount, botCount })
              );
            } else {
              setErrorBanner('WebSocket connecting—starting local room.');
            }
          }}
          onJoinOnlineRoom={(roomCode) => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'join_room', roomCode }));
            }
          }}
          onLeaveOnlineRoom={() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'leave_room' }));
            }
            setOnlineRoomState(null);
            isOnlineMatchRef.current = false;
          }}
          onConfigureOnlineRoom={(mapId, seekerCount, botCount) => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(
                JSON.stringify({ type: 'configure_room', mapId, seekerCount, botCount })
              );
            }
          }}
          onStartOnlineMatch={(preferredRole) => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(
                JSON.stringify({ type: 'start_match', preferredHostRole: preferredRole })
              );
            }
          }}
          onStartLocalMatch={(mapId, seekerCount, botCount, preferredRole) => {
            startLocalGuestMatch(mapId, seekerCount, botCount, preferredRole);
          }}
          onCloseToTitle={() => setShowLobbyModal(false)}
        />
      )}

      {/* How to Play Modal */}
      {showHowToModal && <HowToPlayModal onClose={() => setShowHowToModal(false)} />}

      {/* Pause Modal ('paused') */}
      {shellState === 'paused' && (
        <PauseModal
          muted={muted}
          touchMode={touchMode}
          joystickSensitivity={joystickSensitivity}
          onToggleMute={() => {
            soundFX.muted = !soundFX.muted;
            setMuted(soundFX.muted);
          }}
          onChangeTouchMode={(m) => setTouchMode(m)}
          onChangeSensitivity={(val) => {
            setJoystickSensitivity(val);
            localStorage.setItem('ch_joy_sens', String(val));
          }}
          onResume={() => setShellState('playing')}
          onRestart={() => {
            const cfg = matchStateRef.current.config;
            startLocalGuestMatch(cfg.mapId, cfg.seekerCount, 4, hud.role);
          }}
          onExitToTitle={() => {
            if (isOnlineMatchRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'leave_room' }));
            }
            isOnlineMatchRef.current = false;
            setOnlineRoomState(null);
            setShellState('title');
          }}
        />
      )}

      {/* Victory / Game Over Modal ('gameover') */}
      {shellState === 'gameover' && endOfRunSnapshot && (
        <GameOverModal
          snapshot={endOfRunSnapshot}
          onPlayAgain={() => {
            if (isOnlineMatchRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(
                JSON.stringify({
                  type: 'start_match',
                  preferredHostRole: endOfRunSnapshot.localRole === 'seeker' ? 'hider' : 'seeker',
                })
              );
            } else {
              const cfg = matchStateRef.current.config;
              startLocalGuestMatch(cfg.mapId, cfg.seekerCount, 4, endOfRunSnapshot.localRole);
            }
          }}
          onOpenLobby={() => {
            setShellState('title');
            setShowLobbyModal(true);
          }}
          onExitToTitle={() => {
            setShellState('title');
          }}
        />
      )}
    </main>
  );
}
