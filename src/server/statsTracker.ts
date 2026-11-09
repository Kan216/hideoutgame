/**
 * Server-side player & match statistics (no personal data: only counts and anonymous ids for de-duplication).
 *
 *  - live:      connections online, players in online / local matches, rooms
 *  - today:     unique players, matches started / finished, wins per side (UTC day, last 7 days kept)
 *  - all time:  totals since the stats file was created (persisted to disk when a path is given)
 *  - timeline:  one sample per minute for the last 24h (online + playing)
 */
import fs from 'fs';
import path from 'path';

export type MatchMode = 'online' | 'local';
export type Winner = 'hiders' | 'seekers' | null;

export interface LiveCounts {
  /** Open WebSocket connections (every open game tab, including the title screen). */
  online: number;
  /** Human players inside an online room whose match is running. */
  inOnlineMatch: number;
  rooms: number;
  activeRooms: number;
}

interface DayCounters {
  uniqueGuests: Set<string>;
  matchesStarted: number;
  matchesCompleted: number;
  onlineMatches: number;
  localMatches: number;
  hiderWins: number;
  seekerWins: number;
  abandoned: number;
  durationSum: number;
  peakOnline: number;
  peakPlaying: number;
}

interface Totals {
  since: number;
  matchesStarted: number;
  matchesCompleted: number;
  onlineMatches: number;
  localMatches: number;
  hiderWins: number;
  seekerWins: number;
  abandoned: number;
  durationSum: number;
  peakOnline: number;
  peakOnlineAt: number;
  peakPlaying: number;
  peakPlayingAt: number;
  byMap: Record<string, number>;
  uniqueGuestsAllTime: number;
}

export interface TimelinePoint {
  t: number;
  online: number;
  playing: number;
}

const DAY_KEEP = 7;
const TIMELINE_KEEP = 24 * 60; // 1 sample / minute
const LOCAL_MATCH_TTL_MS = 8 * 60_000; // a local match with no further report is considered over

function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function emptyDay(): DayCounters {
  return {
    uniqueGuests: new Set(),
    matchesStarted: 0,
    matchesCompleted: 0,
    onlineMatches: 0,
    localMatches: 0,
    hiderWins: 0,
    seekerWins: 0,
    abandoned: 0,
    durationSum: 0,
    peakOnline: 0,
    peakPlaying: 0,
  };
}

export class StatsTracker {
  private days = new Map<string, DayCounters>();
  private totals: Totals;
  private timeline: TimelinePoint[] = [];
  private localMatches = new Map<string, { startedAt: number; lastSeen: number; mapId: string }>();
  private allTimeGuests = new Set<string>();
  private startedAt: number;
  private dirty = false;

  private readonly filePath: string | null;

  constructor(filePath: string | null = null, now: number = Date.now()) {
    this.filePath = filePath;
    this.startedAt = now;
    this.totals = {
      since: now,
      matchesStarted: 0,
      matchesCompleted: 0,
      onlineMatches: 0,
      localMatches: 0,
      hiderWins: 0,
      seekerWins: 0,
      abandoned: 0,
      durationSum: 0,
      peakOnline: 0,
      peakOnlineAt: now,
      peakPlaying: 0,
      peakPlayingAt: now,
      byMap: {},
      uniqueGuestsAllTime: 0,
    };
    if (filePath) this.load();
  }

  private day(now: number): DayCounters {
    const key = dayKey(now);
    let d = this.days.get(key);
    if (!d) {
      d = emptyDay();
      this.days.set(key, d);
      const keys = [...this.days.keys()].sort();
      while (keys.length > DAY_KEEP) this.days.delete(keys.shift()!);
    }
    return d;
  }

  /** A guest session connected (anonymous id, used only to count unique players). */
  guestSeen(playerId: string, now: number = Date.now()): void {
    this.day(now).uniqueGuests.add(playerId);
    if (!this.allTimeGuests.has(playerId)) {
      this.allTimeGuests.add(playerId);
      this.totals.uniqueGuestsAllTime += 1;
      // keep memory bounded; the counter keeps counting even after the set is trimmed
      if (this.allTimeGuests.size > 50_000) this.allTimeGuests.clear();
    }
    this.dirty = true;
  }

  matchStarted(mode: MatchMode, mapId: string, now: number = Date.now()): void {
    const d = this.day(now);
    d.matchesStarted += 1;
    this.totals.matchesStarted += 1;
    if (mode === 'online') {
      d.onlineMatches += 1;
      this.totals.onlineMatches += 1;
    } else {
      d.localMatches += 1;
      this.totals.localMatches += 1;
    }
    this.totals.byMap[mapId] = (this.totals.byMap[mapId] ?? 0) + 1;
    this.dirty = true;
  }

  matchFinished(winner: Winner, durationSec: number, now: number = Date.now()): void {
    const d = this.day(now);
    const dur = Math.max(0, Math.min(1800, Number(durationSec) || 0));
    if (winner === null) {
      d.abandoned += 1;
      this.totals.abandoned += 1;
    } else {
      d.matchesCompleted += 1;
      this.totals.matchesCompleted += 1;
      d.durationSum += dur;
      this.totals.durationSum += dur;
      if (winner === 'hiders') {
        d.hiderWins += 1;
        this.totals.hiderWins += 1;
      } else {
        d.seekerWins += 1;
        this.totals.seekerWins += 1;
      }
    }
    this.dirty = true;
  }

  /** Single-player (bots) match reported by a client. `key` identifies the reporting connection. */
  localMatchStarted(key: string, mapId: string, now: number = Date.now()): void {
    const prev = this.localMatches.get(key);
    if (prev) this.matchFinished(null, (now - prev.startedAt) / 1000, now); // restarted without finishing
    this.localMatches.set(key, { startedAt: now, lastSeen: now, mapId });
    this.matchStarted('local', mapId, now);
  }

  localMatchEnded(key: string, winner: Winner, durationSec: number, now: number = Date.now()): void {
    if (!this.localMatches.has(key)) return; // ignore ends without a start (no double counting)
    this.localMatches.delete(key);
    this.matchFinished(winner, durationSec, now);
  }

  /** The connection that was playing locally went away. */
  connectionGone(key: string, now: number = Date.now()): void {
    const m = this.localMatches.get(key);
    if (m) {
      this.localMatches.delete(key);
      this.matchFinished(null, (now - m.startedAt) / 1000, now);
    }
  }

  private expireLocal(now: number): void {
    for (const [key, m] of this.localMatches) {
      if (now - m.lastSeen > LOCAL_MATCH_TTL_MS) {
        this.localMatches.delete(key);
        this.matchFinished(null, (now - m.startedAt) / 1000, now);
      }
    }
  }

  private playingNow(live: LiveCounts): number {
    return live.inOnlineMatch + this.localMatches.size;
  }

  private trackPeaks(live: LiveCounts, now: number): void {
    const playing = this.playingNow(live);
    const d = this.day(now);
    d.peakOnline = Math.max(d.peakOnline, live.online);
    d.peakPlaying = Math.max(d.peakPlaying, playing);
    if (live.online > this.totals.peakOnline) {
      this.totals.peakOnline = live.online;
      this.totals.peakOnlineAt = now;
      this.dirty = true;
    }
    if (playing > this.totals.peakPlaying) {
      this.totals.peakPlaying = playing;
      this.totals.peakPlayingAt = now;
      this.dirty = true;
    }
  }

  /** Call about once a minute: records the timeline point and peaks. */
  sample(live: LiveCounts, now: number = Date.now()): void {
    this.expireLocal(now);
    this.trackPeaks(live, now);
    this.timeline.push({ t: now, online: live.online, playing: this.playingNow(live) });
    if (this.timeline.length > TIMELINE_KEEP) this.timeline.splice(0, this.timeline.length - TIMELINE_KEEP);
    this.dirty = true;
  }

  snapshot(live: LiveCounts, now: number = Date.now()) {
    this.expireLocal(now);
    this.trackPeaks(live, now);
    const today = this.day(now);
    const days = [...this.days.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, d]) => ({
        date,
        uniquePlayers: d.uniqueGuests.size,
        matchesStarted: d.matchesStarted,
        matchesCompleted: d.matchesCompleted,
        hiderWins: d.hiderWins,
        seekerWins: d.seekerWins,
        peakOnline: d.peakOnline,
        peakPlaying: d.peakPlaying,
      }));
    const completed = this.totals.matchesCompleted;
    return {
      generatedAt: now,
      serverUptimeSec: Math.round((now - this.startedAt) / 1000),
      live: {
        online: live.online,
        playing: this.playingNow(live),
        inOnlineMatch: live.inOnlineMatch,
        inLocalMatch: this.localMatches.size,
        rooms: live.rooms,
        activeRooms: live.activeRooms,
      },
      today: {
        date: dayKey(now),
        uniquePlayers: today.uniqueGuests.size,
        matchesStarted: today.matchesStarted,
        matchesCompleted: today.matchesCompleted,
        onlineMatches: today.onlineMatches,
        localMatches: today.localMatches,
        hiderWins: today.hiderWins,
        seekerWins: today.seekerWins,
        abandoned: today.abandoned,
        avgMatchSec: today.matchesCompleted ? Math.round(today.durationSum / today.matchesCompleted) : 0,
        peakOnline: today.peakOnline,
        peakPlaying: today.peakPlaying,
      },
      allTime: {
        since: this.totals.since,
        uniquePlayers: this.totals.uniqueGuestsAllTime,
        matchesStarted: this.totals.matchesStarted,
        matchesCompleted: completed,
        onlineMatches: this.totals.onlineMatches,
        localMatches: this.totals.localMatches,
        hiderWins: this.totals.hiderWins,
        seekerWins: this.totals.seekerWins,
        hiderWinRate: completed ? this.totals.hiderWins / completed : null,
        abandoned: this.totals.abandoned,
        avgMatchSec: completed ? Math.round(this.totals.durationSum / completed) : 0,
        peakOnline: this.totals.peakOnline,
        peakOnlineAt: this.totals.peakOnlineAt,
        peakPlaying: this.totals.peakPlaying,
        peakPlayingAt: this.totals.peakPlayingAt,
        matchesByMap: { ...this.totals.byMap },
      },
      days,
      timeline: this.timeline,
    };
  }

  // ───────── persistence (best effort; the host's disk may be wiped on redeploy) ─────────

  save(): void {
    if (!this.filePath || !this.dirty) return;
    try {
      const data = {
        version: 1,
        totals: this.totals,
        days: [...this.days.entries()].map(([k, d]) => [k, { ...d, uniqueGuests: [...d.uniqueGuests] }]),
        timeline: this.timeline,
      };
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      const tmp = `${this.filePath}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(data));
      fs.renameSync(tmp, this.filePath);
      this.dirty = false;
    } catch (err) {
      console.warn('[stats] could not save stats file:', (err as Error).message);
    }
  }

  private load(): void {
    if (!this.filePath || !fs.existsSync(this.filePath)) return;
    try {
      const data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      if (data?.version !== 1) return;
      this.totals = { ...this.totals, ...data.totals, byMap: { ...(data.totals?.byMap ?? {}) } };
      for (const [k, d] of data.days ?? []) {
        this.days.set(k, { ...emptyDay(), ...d, uniqueGuests: new Set(d.uniqueGuests ?? []) });
      }
      this.timeline = Array.isArray(data.timeline) ? data.timeline.slice(-TIMELINE_KEEP) : [];
    } catch (err) {
      console.warn('[stats] could not read stats file, starting fresh:', (err as Error).message);
    }
  }
}
