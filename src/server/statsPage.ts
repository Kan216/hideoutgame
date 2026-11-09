/**
 * Self-contained live stats dashboard served at /stats (no build step, no external scripts).
 * It polls /api/stats every 15s, forwarding the ?key= from its own URL.
 */
import { MAPS } from '../game/maps.ts';

export function renderStatsPage(): string {
  const mapNames: Record<string, string> = {};
  for (const m of Object.values(MAPS)) mapNames[m.id] = m.name;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>City Hideout Stats</title>
<style>
  :root {
    color-scheme: light;
    --surface-0: #f4f4f2;
    --surface-1: #fcfcfb;
    --border: #e2e1dc;
    --grid: #ecebe7;
    --text-primary: #0b0b0b;
    --text-secondary: #52514e;
    --text-muted: #7a7974;
    --series-1: #2a78d6;
    --series-2: #eb6834;
    --good: #0f7b3f;
  }
  @media (prefers-color-scheme: dark) {
    :root:where(:not([data-theme="light"])) {
      color-scheme: dark;
      --surface-0: #111110;
      --surface-1: #1a1a19;
      --border: #2e2d2b;
      --grid: #262624;
      --text-primary: #f0efec;
      --text-secondary: #c3c2b7;
      --text-muted: #8f8e86;
      --series-1: #3987e5;
      --series-2: #d95926;
      --good: #4ade80;
    }
  }
  :root[data-theme="dark"] {
    color-scheme: dark;
    --surface-0: #111110;
    --surface-1: #1a1a19;
    --border: #2e2d2b;
    --grid: #262624;
    --text-primary: #f0efec;
    --text-secondary: #c3c2b7;
    --text-muted: #8f8e86;
    --series-1: #3987e5;
    --series-2: #d95926;
    --good: #4ade80;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--surface-0);
    color: var(--text-primary);
    font: 14px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  .wrap { max-width: 1100px; margin: 0 auto; padding: 20px 16px 40px; }
  header { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 8px 16px; margin-bottom: 16px; }
  h1 { font-size: 20px; margin: 0; letter-spacing: -0.01em; }
  .status { color: var(--text-secondary); font-size: 12px; display: flex; align-items: center; gap: 6px; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--good); display: inline-block; }
  .dot.stale { background: var(--text-muted); }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); margin: 24px 0 8px; font-weight: 600; }
  .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
  .tile { background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; min-width: 0; }
  .tile .label { color: var(--text-secondary); font-size: 12px; }
  .tile .value { font-size: 28px; font-weight: 650; font-variant-numeric: tabular-nums; line-height: 1.15; margin-top: 2px; }
  .tile .sub { color: var(--text-muted); font-size: 12px; margin-top: 2px; overflow-wrap: anywhere; }
  .card { background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; padding: 14px; position: relative; }
  .legend { display: flex; flex-wrap: wrap; gap: 6px 16px; color: var(--text-secondary); font-size: 12px; margin-bottom: 6px; }
  .legend i { display: inline-block; width: 12px; height: 3px; border-radius: 2px; vertical-align: middle; margin-right: 6px; }
  svg { display: block; width: 100%; overflow: visible; }
  .axis text { fill: var(--text-muted); font-size: 11px; }
  .grid line { stroke: var(--grid); }
  .empty { color: var(--text-muted); font-size: 13px; padding: 24px 0; text-align: center; }
  .tip {
    position: absolute; pointer-events: none; background: var(--surface-1); border: 1px solid var(--border);
    border-radius: 8px; padding: 6px 8px; font-size: 12px; box-shadow: 0 4px 16px rgba(0,0,0,.15); display: none;
    white-space: nowrap; z-index: 2;
  }
  .tip b { font-variant-numeric: tabular-nums; }
  .tip .k { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 6px; }
  .two { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; }
  @media (min-width: 760px) { .two { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }
  table { width: 100%; border-collapse: collapse; font-size: 13px; font-variant-numeric: tabular-nums; }
  th, td { text-align: right; padding: 6px 8px; border-bottom: 1px solid var(--border); white-space: nowrap; }
  th:first-child, td:first-child { text-align: left; }
  th { color: var(--text-secondary); font-weight: 600; font-size: 12px; }
  .scroll-x { overflow-x: auto; }
  @media (max-width: 480px) { th, td { padding: 6px 4px; font-size: 12px; } .tile .value { font-size: 24px; } }
  details summary { cursor: pointer; color: var(--text-secondary); font-size: 12px; margin-top: 8px; }
  .note { color: var(--text-muted); font-size: 12px; margin-top: 18px; }
  .err { color: #e34948; font-size: 13px; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>City Hideout · Live Stats</h1>
    <div class="status"><span class="dot stale" id="dot"></span><span id="status">Loading…</span></div>
  </header>
  <div id="error" class="err" hidden></div>

  <h2>Right now</h2>
  <div class="tiles" id="liveTiles"></div>

  <h2>Players over the last 24 hours</h2>
  <div class="card" id="tlCard">
    <div class="legend" id="tlLegend">
      <span><i style="background:var(--series-1)"></i>Online (game open)</span>
      <span><i style="background:var(--series-2)"></i>Playing a match</span>
    </div>
    <div id="tlChart"></div>
    <div class="tip" id="tlTip" role="status"></div>
    <details><summary>Show as table</summary><div class="scroll-x" id="tlTable"></div></details>
  </div>

  <h2>Today (UTC)</h2>
  <div class="tiles" id="todayTiles"></div>

  <h2>All time</h2>
  <div class="tiles" id="allTiles"></div>

  <div class="two" style="margin-top:10px">
    <div class="card">
      <div class="legend"><span>Matches started per map</span></div>
      <div id="mapChart"></div>
      <div class="tip" id="mapTip" role="status"></div>
    </div>
    <div class="card">
      <div class="legend"><span>Last 7 days</span></div>
      <div class="scroll-x" id="daysTable"></div>
    </div>
  </div>

  <p class="note">
    Counts only — no names or personal data are stored. “Online” = open game tabs (including the title screen);
    “Playing” = players in an online match plus single-player matches in progress. Stats reset if the server's disk
    is wiped (e.g. on a new deploy on Render's free plan). Auto-refreshes every 15 seconds.
  </p>
</div>

<script>
const MAP_NAMES = ${JSON.stringify(mapNames)};
const key = new URLSearchParams(location.search).get('key');
const api = '/api/stats' + (key ? '?key=' + encodeURIComponent(key) : '');
const $ = (id) => document.getElementById(id);
const fmt = (n) => (n ?? 0).toLocaleString();
const dur = (s) => { s = Math.round(s || 0); const m = Math.floor(s / 60); return m ? m + 'm ' + String(s % 60).padStart(2, '0') + 's' : s + 's'; };
const when = (ms) => new Date(ms).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const hhmm = (ms) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const plural = (n, one, many) => fmt(n) + ' ' + (n === 1 ? one : many);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function tiles(el, items) {
  el.innerHTML = items.map((t) =>
    '<div class="tile"><div class="label">' + esc(t.label) + '</div><div class="value">' + esc(t.value) +
    '</div>' + (t.sub ? '<div class="sub">' + esc(t.sub) + '</div>' : '') + '</div>').join('');
}

// Whole-number y-axis: 4 gridlines with an integer step (people are whole)
function niceMax(v) {
  const raw = Math.max(1, v) / 4;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 5, 10]) if (Math.max(1, Math.ceil(m * p)) >= raw) return Math.max(1, Math.ceil(m * p)) * 4;
  return Math.ceil(raw) * 4;
}
const uptime = (s) => { const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return d ? d + 'd ' + h + 'h' : h ? h + 'h ' + m + 'm' : m + 'm'; };

let lastData = null;

function drawTimeline(points) {
  const host = $('tlChart');
  if (points.length < 3) { host.innerHTML = '<div class="empty">Collecting data… one point is recorded every minute, so the chart appears after a few minutes.</div>'; $('tlTable').innerHTML = ''; return; }
  // 5-minute buckets (max within bucket) keep the line readable
  const buckets = [];
  for (const p of points) {
    const b = Math.floor(p.t / 300000) * 300000;
    const last = buckets[buckets.length - 1];
    if (last && last.t === b) { last.online = Math.max(last.online, p.online); last.playing = Math.max(last.playing, p.playing); }
    else buckets.push({ t: b, online: p.online, playing: p.playing });
  }
  const W = Math.max(280, host.clientWidth), H = 220, L = 34, R = 74, T = 10, B = 26;
  const t0 = buckets[0].t, t1 = Math.max(buckets[buckets.length - 1].t, t0 + 300000);
  const yMax = niceMax(Math.max(1, ...buckets.map((b) => Math.max(b.online, b.playing))));
  const x = (t) => L + ((t - t0) / (t1 - t0)) * (W - L - R);
  const y = (v) => T + (1 - v / yMax) * (H - T - B);
  const path = (k) => buckets.map((b, i) => (i ? 'L' : 'M') + x(b.t).toFixed(1) + ' ' + y(b[k]).toFixed(1)).join(' ');
  let grid = '', yl = '';
  for (let i = 0; i <= 4; i++) {
    const v = (yMax / 4) * i, yy = y(v).toFixed(1);
    grid += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '" />';
    yl += '<text x="' + (L - 6) + '" y="' + (+yy + 4) + '" text-anchor="end">' + (Number.isInteger(v) ? v : v.toFixed(1)) + '</text>';
  }
  let xl = '', prevLabel = '';
  const ticks = Math.min(6, Math.max(2, Math.floor((W - L - R) / 90)));
  for (let i = 0; i <= ticks; i++) {
    const t = t0 + ((t1 - t0) * i) / ticks;
    const label = hhmm(t);
    if (label === prevLabel) continue;
    prevLabel = label;
    xl += '<text x="' + x(t).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="' + (i === 0 ? 'start' : i === ticks ? 'end' : 'middle') + '">' + label + '</text>';
  }
  const lastB = buckets[buckets.length - 1];
  const yOn = y(lastB.online), yPl = y(lastB.playing);
  const sep = Math.abs(yOn - yPl) < 14 ? 7 : 0;
  host.innerHTML =
    '<svg viewBox="0 0 ' + W + ' ' + H + '" height="' + H + '" role="img" aria-label="Players online and playing over the last 24 hours">' +
    '<g class="grid">' + grid + '</g><g class="axis">' + yl + xl + '</g>' +
    '<path d="' + path('online') + '" fill="none" stroke="var(--series-1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
    '<path d="' + path('playing') + '" fill="none" stroke="var(--series-2)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
    '<circle cx="' + x(lastB.t) + '" cy="' + yOn + '" r="4" fill="var(--series-1)" stroke="var(--surface-1)" stroke-width="2"/>' +
    '<circle cx="' + x(lastB.t) + '" cy="' + yPl + '" r="4" fill="var(--series-2)" stroke="var(--surface-1)" stroke-width="2"/>' +
    '<g class="axis"><text x="' + (x(lastB.t) + 8) + '" y="' + (yOn + 4 - sep) + '" style="fill:var(--text-secondary)">' + lastB.online + ' online</text>' +
    '<text x="' + (x(lastB.t) + 8) + '" y="' + (yPl + 4 + sep) + '" style="fill:var(--text-secondary)">' + lastB.playing + ' playing</text></g>' +
    '<line id="xh" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--text-muted)" stroke-dasharray="3 3" visibility="hidden"/>' +
    '<rect x="' + L + '" y="0" width="' + (W - L - R) + '" height="' + H + '" fill="transparent" id="hit"/></svg>';

  const svg = host.querySelector('svg'), tip = $('tlTip'), xh = host.querySelector('#xh');
  const show = (clientX) => {
    const r = svg.getBoundingClientRect();
    const sx = ((clientX - r.left) / r.width) * W;
    let best = buckets[0], bd = Infinity;
    for (const b of buckets) { const d = Math.abs(x(b.t) - sx); if (d < bd) { bd = d; best = b; } }
    const px = x(best.t);
    xh.setAttribute('x1', px); xh.setAttribute('x2', px); xh.setAttribute('visibility', 'visible');
    tip.innerHTML = '<div style="color:var(--text-secondary)">' + hhmm(best.t) + '</div>' +
      '<div><span class="k" style="background:var(--series-1)"></span>Online <b>' + best.online + '</b></div>' +
      '<div><span class="k" style="background:var(--series-2)"></span>Playing <b>' + best.playing + '</b></div>';
    tip.style.display = 'block';
    const card = $('tlCard').getBoundingClientRect();
    let left = r.left - card.left + (px / W) * r.width + 12;
    if (left + tip.offsetWidth > card.width - 8) left -= tip.offsetWidth + 24;
    tip.style.left = left + 'px';
    tip.style.top = (r.top - card.top + 8) + 'px';
  };
  const hide = () => { tip.style.display = 'none'; xh.setAttribute('visibility', 'hidden'); };
  const hit = host.querySelector('#hit');
  hit.addEventListener('pointermove', (e) => show(e.clientX));
  hit.addEventListener('pointerdown', (e) => show(e.clientX));
  hit.addEventListener('pointerleave', hide);

  const rows = buckets.slice(-48).reverse().map((b) => '<tr><td>' + hhmm(b.t) + '</td><td>' + b.online + '</td><td>' + b.playing + '</td></tr>').join('');
  $('tlTable').innerHTML = '<table><thead><tr><th>Time (last 4h, 5-min max)</th><th>Online</th><th>Playing</th></tr></thead><tbody>' + rows + '</tbody></table>';
}

function drawMaps(byMap) {
  const host = $('mapChart');
  const rows = Object.keys(MAP_NAMES).map((id) => ({ id, name: MAP_NAMES[id], v: byMap[id] || 0 })).sort((a, b) => b.v - a.v);
  const max = Math.max(1, ...rows.map((r) => r.v));
  if (rows.every((r) => r.v === 0)) { host.innerHTML = '<div class="empty">No matches yet.</div>'; return; }
  const W = Math.max(260, host.clientWidth), rowH = 40, H = rows.length * rowH, valW = 44;
  let g = '';
  rows.forEach((r, i) => {
    const y = i * rowH;
    const w = r.v ? Math.max(6, ((W - valW) * r.v) / max) : 0;
    g += '<text x="0" y="' + (y + 12) + '" style="fill:var(--text-secondary);font-size:12px">' + esc(r.name) + '</text>' +
      (w ? '<path data-i="' + i + '" d="M0 ' + (y + 18) + ' h' + (w - 4) + ' a4 4 0 0 1 4 4 v6 a4 4 0 0 1 -4 4 h-' + (w - 4) + ' z" fill="var(--series-1)"/>' : '') +
      '<text x="' + (w + 6) + '" y="' + (y + 31) + '" style="fill:var(--text-primary);font-size:12px;font-variant-numeric:tabular-nums">' + fmt(r.v) + '</text>' +
      '<rect data-i="' + i + '" x="0" y="' + y + '" width="' + W + '" height="' + rowH + '" fill="transparent"/>';
  });
  host.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" height="' + H + '" role="img" aria-label="Matches started per map">' + g + '</svg>';
  const tip = $('mapTip'), svg = host.querySelector('svg');
  const total = rows.reduce((a, r) => a + r.v, 0) || 1;
  svg.querySelectorAll('rect').forEach((el) => {
    const r = rows[+el.dataset.i];
    const show = () => {
      tip.innerHTML = '<b>' + esc(r.name) + '</b><br>' + fmt(r.v) + ' matches · ' + Math.round((r.v / total) * 100) + '%';
      tip.style.display = 'block';
      const card = host.parentElement.getBoundingClientRect(), b = el.getBoundingClientRect();
      tip.style.left = Math.min(b.left - card.left + 8, card.width - tip.offsetWidth - 8) + 'px';
      tip.style.top = (b.top - card.top - tip.offsetHeight + 4) + 'px';
    };
    el.addEventListener('pointerenter', show); el.addEventListener('pointerdown', show);
    el.addEventListener('pointerleave', () => (tip.style.display = 'none'));
  });
}

function render(d) {
  lastData = d;
  const L = d.live, T = d.today, A = d.allTime;
  tiles($('liveTiles'), [
    { label: 'Online now', value: fmt(L.online), sub: 'open game tabs' },
    { label: 'Playing now', value: fmt(L.playing), sub: fmt(L.inOnlineMatch) + ' online · ' + fmt(L.inLocalMatch) + ' vs bots' },
    { label: 'Active rooms', value: fmt(L.activeRooms), sub: plural(L.rooms, 'room', 'rooms') + ' open' },
    { label: 'Server uptime', value: uptime(d.serverUptimeSec), sub: 'since last restart' },
  ]);
  const todayDone = T.hiderWins + T.seekerWins;
  tiles($('todayTiles'), [
    { label: 'Unique players', value: fmt(T.uniquePlayers) },
    { label: 'Matches started', value: fmt(T.matchesStarted), sub: fmt(T.onlineMatches) + ' online · ' + fmt(T.localMatches) + ' vs bots' },
    { label: 'Matches finished', value: fmt(T.matchesCompleted), sub: fmt(T.abandoned) + ' quit early' },
    { label: 'Hider wins', value: todayDone ? Math.round((T.hiderWins / todayDone) * 100) + '%' : '—', sub: plural(T.hiderWins, 'hider win', 'hider wins') + ' · ' + plural(T.seekerWins, 'seeker win', 'seeker wins') },
    { label: 'Avg match', value: T.avgMatchSec ? dur(T.avgMatchSec) : '—' },
    { label: 'Peak today', value: fmt(T.peakPlaying), sub: 'playing · ' + fmt(T.peakOnline) + ' online' },
  ]);
  tiles($('allTiles'), [
    { label: 'Unique players', value: fmt(A.uniquePlayers), sub: 'since ' + when(A.since) },
    { label: 'Matches played', value: fmt(A.matchesStarted), sub: fmt(A.onlineMatches) + ' online · ' + fmt(A.localMatches) + ' vs bots' },
    { label: 'Hider win rate', value: A.hiderWinRate == null ? '—' : Math.round(A.hiderWinRate * 100) + '%', sub: plural(A.hiderWins, 'hider win', 'hider wins') + ' · ' + plural(A.seekerWins, 'seeker win', 'seeker wins') },
    { label: 'Avg match', value: A.avgMatchSec ? dur(A.avgMatchSec) : '—', sub: fmt(A.abandoned) + ' quit early' },
    { label: 'Most playing at once', value: fmt(A.peakPlaying), sub: A.peakPlaying ? when(A.peakPlayingAt) : '' },
    { label: 'Most online at once', value: fmt(A.peakOnline), sub: A.peakOnline ? when(A.peakOnlineAt) : '' },
  ]);
  drawTimeline(d.timeline || []);
  drawMaps(A.matchesByMap || {});
  const rows = (d.days || []).slice().reverse().map((x) =>
    '<tr><td>' + x.date + '</td><td>' + fmt(x.uniquePlayers) + '</td><td>' + fmt(x.matchesStarted) + '</td><td>' + fmt(x.hiderWins) + ' / ' + fmt(x.seekerWins) + '</td><td>' + fmt(x.peakPlaying) + '</td></tr>').join('');
  $('daysTable').innerHTML = rows
    ? '<table><thead><tr><th>Day</th><th>Players</th><th>Matches</th><th>Wins H / S</th><th>Peak</th></tr></thead><tbody>' + rows + '</tbody></table>'
    : '<div class="empty">No days recorded yet.</div>';
  $('status').textContent = 'Updated ' + hhmm(d.generatedAt);
  $('dot').classList.remove('stale');
}

async function load() {
  try {
    const res = await fetch(api, { cache: 'no-store' });
    if (res.status === 401) throw new Error('This page needs the stats key: add ?key=YOUR_STATS_KEY to the URL.');
    if (!res.ok) throw new Error('Server answered ' + res.status);
    render(await res.json());
    $('error').hidden = true;
  } catch (e) {
    $('error').textContent = e.message || String(e);
    $('error').hidden = false;
    $('status').textContent = 'Offline — retrying';
    $('dot').classList.add('stale');
  }
}
load();
setInterval(load, 15000);
let rz;
addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => lastData && render(lastData), 150); });
</script>
</body>
</html>`;
}
