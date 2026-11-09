import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { StatsTracker } from './statsTracker.ts';

const live = (o: Partial<{ online: number; inOnlineMatch: number; rooms: number; activeRooms: number }> = {}) => ({
  online: 0,
  inOnlineMatch: 0,
  rooms: 0,
  activeRooms: 0,
  ...o,
});

test('Stats: counts unique players, online & local matches, wins and average length', () => {
  const t0 = Date.UTC(2026, 10, 9, 12);
  const s = new StatsTracker(null, t0);
  s.guestSeen('a', t0);
  s.guestSeen('a', t0);
  s.guestSeen('b', t0);
  s.matchStarted('online', 'downtown_plaza', t0);
  s.matchFinished('seekers', 100, t0);
  s.localMatchStarted('a', 'harbor_district', t0);
  let snap = s.snapshot(live({ online: 3, inOnlineMatch: 2 }), t0);
  assert.equal(snap.live.playing, 3, '2 online + 1 local');
  assert.equal(snap.today.uniquePlayers, 2);
  s.localMatchEnded('a', 'hiders', 200, t0);
  s.localMatchEnded('a', 'hiders', 200, t0); // duplicate end ignored
  snap = s.snapshot(live(), t0);
  assert.equal(snap.allTime.matchesStarted, 2);
  assert.equal(snap.allTime.matchesCompleted, 2);
  assert.equal(snap.allTime.hiderWinRate, 0.5);
  assert.equal(snap.allTime.avgMatchSec, 150);
  assert.deepEqual(snap.allTime.matchesByMap, { downtown_plaza: 1, harbor_district: 1 });
  assert.equal(snap.allTime.peakPlaying, 3);
});

test('Stats: abandoned local matches (disconnect, restart, timeout) are not counted as wins', () => {
  const t0 = Date.UTC(2026, 10, 9, 12);
  const s = new StatsTracker(null, t0);
  s.localMatchStarted('x', 'modern_mall', t0);
  s.localMatchStarted('x', 'modern_mall', t0 + 5000); // restart → previous abandoned
  s.connectionGone('x', t0 + 9000);
  s.localMatchStarted('y', 'modern_mall', t0);
  const snap = s.snapshot(live(), t0 + 9 * 60_000); // y expires after 8 min of silence
  assert.equal(snap.allTime.abandoned, 3);
  assert.equal(snap.allTime.matchesCompleted, 0);
  assert.equal(snap.live.inLocalMatch, 0);
});

test('Stats: timeline keeps 24h of minute samples and totals persist to disk', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ch-stats-'));
  const file = path.join(dir, 'stats.json');
  const t0 = Date.UTC(2026, 10, 9);
  const s = new StatsTracker(file, t0);
  for (let i = 0; i < 1500; i++) s.sample(live({ online: i % 5 }), t0 + i * 60_000);
  s.guestSeen('p1', t0);
  s.matchStarted('online', 'mystic_sanctuary', t0);
  s.save();
  const snap = s.snapshot(live(), t0 + 1500 * 60_000);
  assert.equal(snap.timeline.length, 24 * 60);
  const reloaded = new StatsTracker(file, t0 + 2_000_000_000);
  const r = reloaded.snapshot(live(), t0 + 1500 * 60_000);
  assert.equal(r.allTime.matchesStarted, 1);
  assert.equal(r.allTime.uniquePlayers, 1);
  assert.equal(r.timeline.length, 24 * 60);
  fs.rmSync(dir, { recursive: true, force: true });
});
