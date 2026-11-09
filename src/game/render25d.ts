import type { MapConfig, WallRect } from './maps.ts';
import { drawWallBlock } from './pixelSprites.ts';

/**
 * 2.5D view helpers ("tilted camera"):
 *  - the ground layer is drawn with a vertical squash (TILT) so the camera appears to look down at an angle;
 *  - solid walls become raised blocks: the top-down roof is lifted by the wall height and a front facade is drawn;
 *  - characters stay upright and are depth-sorted with the buildings (so they can walk behind them).
 * World → screen: (x, y) → (x, y * TILT), and something `h` px tall is drawn `h` px higher.
 */
export const TILT = 0.68;
/** How strongly roofs lean away from the camera centre (perspective parallax). */
const PARALLAX = 1 / 640;

export function wallHeight(w: WallRect): number {
  switch (w.kind) {
    case 'building':
      return 58;
    case 'interior_wall':
      return 30;
    case 'hedge_wall':
      return 20;
    case 'fence':
    case 'brick_wall':
      return 14;
    default:
      return 0;
  }
}

/** Ground shadow cast toward the south-east (drawn inside the squashed ground layer). */
export function drawWallShadow25D(ctx: CanvasRenderingContext2D, w: WallRect): void {
  const h = wallHeight(w);
  if (h <= 0) return;
  const reach = (h * 0.9) / TILT; // ground-space length of the shadow
  ctx.save();
  ctx.fillStyle = 'rgba(2, 4, 10, 0.42)';
  ctx.beginPath();
  ctx.moveTo(w.x + w.width, w.y);
  ctx.lineTo(w.x + w.width + reach * 0.45, w.y + reach * 0.35);
  ctx.lineTo(w.x + w.width + reach * 0.45, w.y + w.height + reach);
  ctx.lineTo(w.x + reach * 0.15, w.y + w.height + reach);
  ctx.lineTo(w.x, w.y + w.height);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function hash01(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function shade(hex: string, amt: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const v = parseInt(m[1], 16);
  const c = (s: number) => Math.max(0, Math.min(255, Math.round(s + amt * 255)));
  const r = c((v >> 16) & 255);
  const g = c((v >> 8) & 255);
  const b = c(v & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Draw one raised wall block in screen space (camera-translated, NOT squashed).
 * `dim` 0..1 darkens it when it is outside the viewer's sight (fog of war).
 */
export function drawWall25D(
  ctx: CanvasRenderingContext2D,
  w: WallRect,
  map: MapConfig,
  timeSec: number,
  dim: number,
  camX: number = w.x + w.width / 2
): void {
  const H = wallHeight(w);
  if (H <= 0) return;
  const isBuilding = w.kind === 'building' || w.kind === 'interior_wall';
  // Buildings: the top-down art's own 24px facade band becomes the real front wall.
  const band = isBuilding ? Math.min(24, w.height * 0.35) : 0;
  const x = Math.round(w.x);
  const topY = Math.round(w.y * TILT);
  const footY = Math.round((w.y + w.height) * TILT);
  // Perspective parallax: the roof leans away from the camera centre, revealing a side wall
  const lean = Math.max(-H * 0.85, Math.min(H * 0.85, (w.x + w.width / 2 - camX) * H * PARALLAX));
  const dx = Math.round(lean);
  const roofTopY = topY - H;
  const roofBottomY = Math.round((w.y + w.height - band) * TILT - H);

  const base =
    w.kind === 'hedge_wall'
      ? '#166534'
      : w.kind === 'fence' || w.kind === 'brick_wall'
      ? '#78350F'
      : w.wallColor || '#334155';

  // 0. Side wall (left side visible when the roof leans right, and vice versa)
  if (Math.abs(dx) >= 1) {
    const sx = dx > 0 ? x : x + w.width;
    ctx.fillStyle = shade(base, -0.22);
    ctx.beginPath();
    ctx.moveTo(sx, topY);
    ctx.lineTo(sx, footY);
    ctx.lineTo(sx + dx, roofBottomY);
    ctx.lineTo(sx + dx, roofTopY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#090D16';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // 1. Roof: original top-down art, squashed, lifted by the wall height and leaning with parallax
  ctx.save();
  ctx.translate(dx, -H);
  ctx.scale(1, TILT);
  ctx.beginPath();
  ctx.rect(w.x - 3, w.y - 3, w.width + 6, w.height - band + 3);
  ctx.clip();
  drawWallBlock(ctx, w, map, timeSec);
  ctx.restore();

  // 2. Front facade (sheared so its top follows the leaning roof and its bottom stays on the ground)
  const faceH = footY - roofBottomY;
  if (faceH > 0) {
    ctx.save();
    // local (u, v): u along the wall, v down from the roof edge
    ctx.transform(1, 0, -dx / faceH, 1, x + dx, roofBottomY);
    ctx.fillStyle = '#090D16';
    ctx.fillRect(-2, -1, w.width + 4, faceH + 2);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w.width, faceH);
    ctx.fillStyle = shade(base, 0.12);
    ctx.fillRect(0, 0, w.width, 2);
    ctx.fillStyle = shade(base, -0.16);
    ctx.fillRect(0, faceH - 5, w.width, 5);

    if (w.kind === 'fence' || w.kind === 'brick_wall') {
      ctx.fillStyle = '#92400E';
      for (let fx = 3; fx < w.width - 4; fx += 14) ctx.fillRect(fx, 2, 6, faceH - 3);
    } else if (w.kind === 'hedge_wall') {
      ctx.fillStyle = '#15803D';
      for (let fx = 2; fx < w.width - 4; fx += 10) ctx.fillRect(fx, 3 + ((fx / 10) % 2) * 3, 7, 5);
    } else {
      const doorW = 16;
      const doorH = Math.min(26, faceH - 6);
      const doorX = Math.round(w.width / 2 - doorW / 2);
      const rows = Math.max(1, Math.floor((faceH - doorH - 6) / 18) + 1);
      for (let r = 0; r < rows; r++) {
        const wy = 7 + r * 18;
        const lastRow = wy + 12 > faceH - doorH - 2;
        for (let wx = 10; wx < w.width - 18; wx += 24) {
          if (lastRow && Math.abs(wx + 6 - (doorX + doorW / 2)) < 18) continue;
          if (wy + 12 > faceH - 6) continue;
          const lit = hash01(wx * 7 + wy * 13 + w.x) > 0.35;
          const flicker = lit && hash01(Math.floor(timeSec * 0.5) + wx) > 0.97 ? 0.6 : 1;
          ctx.fillStyle = '#090D16';
          ctx.fillRect(wx - 1, wy - 1, 14, 12);
          ctx.fillStyle = lit ? `rgba(254, 240, 138, ${flicker})` : '#1E293B';
          ctx.fillRect(wx, wy, 12, 10);
          ctx.fillStyle = shade(base, -0.25);
          ctx.fillRect(wx + 5, wy, 2, 10);
        }
      }
      ctx.fillStyle = '#451A03';
      ctx.fillRect(doorX, faceH - doorH, doorW, doorH);
      ctx.fillStyle = '#78350F';
      ctx.fillRect(doorX + 2, faceH - doorH + 2, doorW - 4, doorH - 2);
      ctx.fillStyle = '#FBBF24';
      ctx.fillRect(doorX + doorW - 5, faceH - doorH / 2, 2, 2);
    }
    ctx.restore();
  }

  // 3. Fog of war: darken blocks the viewer cannot see
  if (dim > 0) {
    ctx.fillStyle = `rgba(4, 7, 18, ${dim})`;
    const left = Math.min(x, x + dx) - 3;
    const right = Math.max(x + w.width, x + w.width + dx) + 3;
    ctx.fillRect(left, roofTopY - 3, right - left, footY - roofTopY + 6);
  }
}
