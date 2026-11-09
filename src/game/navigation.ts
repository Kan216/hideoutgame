import type { MapConfig } from './maps.ts';
import { isPositionWallFree, circleIntersectsRect } from './rules.ts';

/**
 * Grid navigation for bots: a walkable-cell grid built once per map, A* search with
 * 8-way movement (no corner cutting) and string-pulling path smoothing.
 */

export interface NavGrid {
  cell: number;
  cols: number;
  rows: number;
  walkable: Uint8Array;
}

const NAV_CELL = 24;
const NAV_RADIUS = 15; // slightly larger than the 13px player radius so paths keep clearance
const gridCache = new Map<string, NavGrid>();

export function getNavGrid(map: MapConfig): NavGrid {
  const cached = gridCache.get(map.id);
  if (cached) return cached;
  const cols = Math.ceil(map.width / NAV_CELL);
  const rows = Math.ceil(map.height / NAV_CELL);
  const walkable = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * NAV_CELL + NAV_CELL / 2;
      const y = r * NAV_CELL + NAV_CELL / 2;
      walkable[r * cols + c] = isPositionWallFree(x, y, NAV_RADIUS, map) ? 1 : 0;
    }
  }
  const grid: NavGrid = { cell: NAV_CELL, cols, rows, walkable };
  gridCache.set(map.id, grid);
  return grid;
}

function nearestWalkableCell(grid: NavGrid, x: number, y: number): number {
  const c0 = Math.max(0, Math.min(grid.cols - 1, Math.floor(x / grid.cell)));
  const r0 = Math.max(0, Math.min(grid.rows - 1, Math.floor(y / grid.cell)));
  if (grid.walkable[r0 * grid.cols + c0]) return r0 * grid.cols + c0;
  for (let rad = 1; rad < 8; rad++) {
    let best = -1;
    let bestD = Infinity;
    for (let dr = -rad; dr <= rad; dr++) {
      for (let dc = -rad; dc <= rad; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== rad) continue;
        const r = r0 + dr;
        const c = c0 + dc;
        if (r < 0 || c < 0 || r >= grid.rows || c >= grid.cols) continue;
        const idx = r * grid.cols + c;
        if (!grid.walkable[idx]) continue;
        const cx = c * grid.cell + grid.cell / 2;
        const cy = r * grid.cell + grid.cell / 2;
        const d = (cx - x) ** 2 + (cy - y) ** 2;
        if (d < bestD) {
          bestD = d;
          best = idx;
        }
      }
    }
    if (best >= 0) return best;
  }
  return -1;
}

/** True when a circle of NAV_RADIUS can sweep from a to b without touching a wall. */
export function isCorridorClear(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  map: MapConfig,
  radius: number = 13
): boolean {
  const dist = Math.hypot(bx - ax, by - ay);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    for (const wall of map.walls) {
      if (circleIntersectsRect(x, y, radius, wall)) return false;
    }
  }
  return true;
}

// Binary min-heap keyed on f-score (reused buffers keep A* allocation-light).
class MinHeap {
  private items: number[] = [];
  private scores: number[] = [];
  get size() {
    return this.items.length;
  }
  push(item: number, score: number) {
    this.items.push(item);
    this.scores.push(score);
    let i = this.items.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.scores[p] <= this.scores[i]) break;
      [this.items[p], this.items[i]] = [this.items[i], this.items[p]];
      [this.scores[p], this.scores[i]] = [this.scores[i], this.scores[p]];
      i = p;
    }
  }
  pop(): number {
    const top = this.items[0];
    const lastItem = this.items.pop()!;
    const lastScore = this.scores.pop()!;
    if (this.items.length > 0) {
      this.items[0] = lastItem;
      this.scores[0] = lastScore;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < this.items.length && this.scores[l] < this.scores[m]) m = l;
        if (r < this.items.length && this.scores[r] < this.scores[m]) m = r;
        if (m === i) break;
        [this.items[m], this.items[i]] = [this.items[i], this.items[m]];
        [this.scores[m], this.scores[i]] = [this.scores[i], this.scores[m]];
        i = m;
      }
    }
    return top;
  }
}

/**
 * Find a smoothed world-space path (list of waypoints, excluding the start) from (sx,sy) to (tx,ty).
 * Returns null when the target is unreachable.
 */
export function findPath(
  map: MapConfig,
  sx: number,
  sy: number,
  tx: number,
  ty: number
): Array<{ x: number; y: number }> | null {
  if (isCorridorClear(sx, sy, tx, ty, map)) {
    return [{ x: tx, y: ty }];
  }
  const grid = getNavGrid(map);
  const start = nearestWalkableCell(grid, sx, sy);
  const goal = nearestWalkableCell(grid, tx, ty);
  if (start < 0 || goal < 0) return null;

  const n = grid.cols * grid.rows;
  const g = new Float32Array(n).fill(Infinity);
  const came = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const heap = new MinHeap();
  const gc = goal % grid.cols;
  const gr = Math.floor(goal / grid.cols);
  const h = (idx: number) => {
    const dc = Math.abs((idx % grid.cols) - gc);
    const dr = Math.abs(Math.floor(idx / grid.cols) - gr);
    return Math.max(dc, dr) + 0.4142 * Math.min(dc, dr);
  };
  g[start] = 0;
  heap.push(start, h(start));
  let found = false;
  let expansions = 0;

  while (heap.size > 0 && expansions < 6000) {
    const cur = heap.pop();
    if (closed[cur]) continue;
    closed[cur] = 1;
    expansions++;
    if (cur === goal) {
      found = true;
      break;
    }
    const cc = cur % grid.cols;
    const cr = Math.floor(cur / grid.cols);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nc = cc + dc;
        const nr = cr + dr;
        if (nc < 0 || nr < 0 || nc >= grid.cols || nr >= grid.rows) continue;
        const ni = nr * grid.cols + nc;
        if (!grid.walkable[ni] || closed[ni]) continue;
        // No corner cutting on diagonals
        if (dr !== 0 && dc !== 0) {
          if (!grid.walkable[cr * grid.cols + nc] || !grid.walkable[nr * grid.cols + cc]) continue;
        }
        const cost = g[cur] + (dr !== 0 && dc !== 0 ? 1.4142 : 1);
        if (cost < g[ni]) {
          g[ni] = cost;
          came[ni] = cur;
          heap.push(ni, cost + h(ni));
        }
      }
    }
  }
  if (!found) return null;

  const cells: Array<{ x: number; y: number }> = [];
  for (let at = goal; at !== -1; at = came[at]) {
    cells.push({
      x: (at % grid.cols) * grid.cell + grid.cell / 2,
      y: Math.floor(at / grid.cols) * grid.cell + grid.cell / 2,
    });
    if (at === start) break;
  }
  cells.reverse();
  cells.push({ x: tx, y: ty });

  // String-pull: greedily skip waypoints that have a clear corridor.
  const smoothed: Array<{ x: number; y: number }> = [];
  let ax = sx;
  let ay = sy;
  let i = 0;
  while (i < cells.length) {
    let j = cells.length - 1;
    while (j > i && !isCorridorClear(ax, ay, cells[j].x, cells[j].y, map)) j--;
    smoothed.push(cells[j]);
    ax = cells[j].x;
    ay = cells[j].y;
    i = j + 1;
  }
  return smoothed;
}
