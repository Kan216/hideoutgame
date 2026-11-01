# UI and Controls Specification — CITY HIDEOUT

## 1. Game Shell Architecture
Full-viewport 2D pixel-art canvas (`#090D16`) with state mirrored to `document.body.dataset.state`:
- `'title'`: Live pixel-art camera tour backdrop, custom inline `<svg>` CITY HIDEOUT emblem, **Play as Guest** (`data-start="true"`), **Multiplayer Room & Setup**, **Play as Seeker**, **How to Play**, and flat bottom keyboard hint bar.
- `'playing'`: Unobstructed playfield (`> 85%` clear viewport) with 3 compact perimeter HUD clusters:
  1. **Top-Left**: Active Role (`HIDER 100%` or `SEEKER 120%`), Room Code, and graphical Living Hider Pips (`X/Y`).
  2. **Top-Center**: 10s Head-Start Countdown or 3-Stage Escape Beacon Progress (`tabular-nums`) + latest match event ticker.
  3. **Top-Right**: Square `<svg>` utility buttons (`Mute [M]`, `Restart [R]`, `Pause [P]`).
- `'paused'`: Focused Pause & Settings modal (`Resume`, `Restart`, `Leave Session`, Audio toggle, Mobile Touch Controls mode, Joystick Sensitivity slider `0.6x–1.6x`).
- `'gameover'`: Focused Victory / Defeat modal with 3 `tabular-nums` stat tiles (`Beacon Stages X/3`, `Match Time`, `Eliminations / Hiders Alive`) and `Play Again` (`data-start="true"`).

## 2. Mobile Controls (`/src/components/MobileControls.tsx`)
- **Left Virtual Thumb Joystick**: Positioned away from screen edges and system gesture bars (`px-7 pb-7`), with smooth vector clamping and configurable sensitivity.
- **Right Contextual Action Buttons**:
  - Dynamically renders **only** actions that are currently valid for the player's role, position, and match state:
    - Hider near empty hiding object: `HIDE INSIDE`
    - Hider inside hiding object: `EXIT HIDING`
    - Hider near City-Center Beacon: `HOLD BEACON`
    - Seeker near visible Hider (after 10s head start): `ELIMINATE HIDER`
    - Seeker near inspectable hiding object (after 10s head start): `INSPECT OBJECT`
  - Touch hitboxes are `min-h-[56px] min-w-[164px]` (exceeding the `44×44px` minimum requirement).
