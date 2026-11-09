---
name: pixel-canvas-rendering
description: Canvas2D pixel-art rendering techniques for City Hideout — lighting/darkness layers, fog of war, vision cones, y-sorting, sprite animation, tile autotiling, offscreen caching and performance. Use when improving visuals, adding lighting, fog, day/night, or optimizing the renderer.
---

# Pixel-Art Canvas2D Rendering

Renderer: `src/game/pixelSprites.ts` (`drawPixelMap`, `drawPlayerSprite`, `drawHidingSpotSprite`, `drawCityMinimap`), called from the RAF loop in `src/App.tsx`.

## Non-negotiables
- `ctx.imageSmoothingEnabled = false`; camera offsets `Math.round`-ed; sprite positions integers.
- Pick ONE integer render scale (e.g. 2× or 3× of 16 px tiles) and render to a low-res offscreen canvas, then upscale — avoids mixed pixel sizes.
- No allocation inside the frame loop (reuse arrays, pooled particles).

## Performance
- **Cache static layers**: ground, roads, building bodies → draw once to an `OffscreenCanvas`/canvas per map, blit with viewport culling. Only animated props/water/players redrawn per frame.
- Cull anything outside camera rect + margin.
- Avoid `shadowBlur` and per-frame gradients in hot loops; pre-render glow sprites.

## Lighting / darkness layer
1. Draw world normally.
2. Fill a separate `light` canvas with ambient darkness (e.g. `rgba(8,10,25,0.75)` at night).
3. `globalCompositeOperation = 'destination-out'` and draw pre-rendered radial light sprites (streetlights, beacon, player torch).
4. Composite `light` canvas over world. Optionally `'lighter'` pass for warm color tints.

## Fog of war / vision (hide-and-seek critical)
- Compute a visibility polygon from the viewer by casting rays to wall-rect corners (±0.0001 rad), sort by angle, clip to vision radius (and optional cone for seekers).
- Draw darkness everywhere, cut the polygon out. Hide enemy sprites not inside the polygon (seekers must not see hiders outside LOS).
- Visibility for gameplay must also be enforced server-side (do not send hidden info) — see `hide-seek-balance` skill.

## Sprites & animation
- Use sheet rows per direction, 4–6 frames, ~8–10 fps walking, 2–4 fps idle breathing.
- Y-sort players and tall props together (by foot y), draw roofs after players for occlusion, fade roofs when the local player is inside a building.
- Outline local player (1 px) and add team color ring under feet.
