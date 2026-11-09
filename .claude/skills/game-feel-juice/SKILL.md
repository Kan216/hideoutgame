---
name: game-feel-juice
description: Add "game feel" / juice to City Hideout — screen shake, hit-stop, squash & stretch, particles, easing, sound layering, UI feedback. Use when asked to make the game feel better, more responsive, more satisfying, or more polished.
---

# Game Feel & Juice (City Hideout)

Goal: every player action gets immediate, layered, readable feedback **without changing game rules**.

## Where things live
- Particles / floating text: `src/game/pixelSprites.ts` (`spawnPixelBurst`, `spawnFloatingWorldText`, pooled — keep zero-GC, never allocate per frame).
- Camera + shake: render loop in `src/App.tsx` (`cameraShakeRef`).
- Audio: `src/game/sound.ts` (`soundFX.*`).
- Feedback is client-only. Never put juice in `rules.ts` (it runs on the server too).

## Checklist per action
For each action (move, hide, exit, inspect, eliminate, beacon stage, timeout):
1. **Anticipation** – 1–3 frame pose / squash before the effect.
2. **Impact** – particles + sound + (for big events) 40–80 ms hit-stop and shake.
3. **Follow-through** – floating text, decaying glow, UI pulse.
4. **Readability** – effect must not hide players/hiding spots; keep under ~250 ms for frequent actions.

## Rules of thumb
- Shake: trauma model (`shake = trauma²`), decay ~1.5–2/s, cap amplitude ≈ 8 px, round camera to integers.
- Easing: use `easeOutCubic`/`easeOutBack` for UI and sprite pops; never linear for UI.
- Movement: smooth velocity (accel ~ 1800 px/s², friction ~ 2200 px/s²) **only visually** unless the server rule changes too.
- Footstep dust every ~14 px walked; seekers heavier/darker.
- Respect `prefers-reduced-motion` and a settings toggle: disable shake/flash.
- Haptics on mobile via `navigator.vibrate` (short: 10–20 ms, big events: 40–60 ms).

## Verify
Run the `game-playtest` skill to capture before/after screenshots.
