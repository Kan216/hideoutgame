# Cross-Platform Architecture: Mobile & PC Playability — CITY HIDEOUT

> **Target**: Ensure CITY HIDEOUT delivers a smooth 60 FPS, responsive, and intuitive multiplayer experience across **Desktop Browsers (PC / Mac / Linux)** and **Mobile Devices (iOS Safari / Android Chrome / PWA / Native Wrappers)** with zero friction.

---

## 1. Executive Summary & Input Dual-Support

CITY HIDEOUT is designed with an **adaptive input and viewport architecture**. A single codebase serves both desktop keyboard/mouse power users and mobile touch-screen players in the same multiplayer matches.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CITY HIDEOUT ENGINE                             │
├───────────────────────────────────┬────────────────────────────────────┤
│         PC / Desktop Input        │       Mobile / Tablet Input        │
├───────────────────────────────────┼────────────────────────────────────┤
│ • WASD / Arrow Keys (Movement)    │ • Left Virtual Thumb Joystick      │
│ • [E] or [Space] (Context Action) │ • Right Contextual Action Buttons  │
│ • [F] (Hold Signal Beacon)        │ • Touch & Hold Beacon Button       │
│ • [M] (Mute), [P] (Pause)         │ • Top-right HUD Utility Buttons    │
│ • Mouse Hover / Click for Menus   │ • Large Touch Targets (≥ 56px)     │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 2. Desktop (PC) Specification & Controls

### 2.1 Control Mapping
| Action | Primary Key | Secondary Key | Description |
|--------|:-----------:|:-------------:|-------------|
| **Move Up** | `W` | `ArrowUp` | Move north (160 px/s Hider, 192 px/s Seeker) |
| **Move Left** | `A` | `ArrowLeft` | Move west |
| **Move Down** | `S` | `ArrowDown` | Move south |
| **Move Right** | `D` | `ArrowRight` | Move east |
| **Context Action** | `E` | `Space` | Hide in spot / Exit spot / Inspect / Eliminate |
| **Hold Beacon** | `F` | Hold `Space` | Progress the 3-stage City-Center Signal Beacon |
| **Pause / Menu** | `Escape` | `P` | Open Settings, Audio, and Sensitivity modal |
| **Mute Audio** | `M` | — | Instant toggle for master audio |
| **Restart Match** | `R` | — | Host restart in lobby or end-of-match |

### 2.2 Desktop UX & Display
- **Resolution & Aspect Ratio**: Canvas scales to fill window with `image-rendering: pixelated` / `crisp-edges`. Camera translates on rounded integer coordinates (`Math.round(camX)`) to prevent pixel shimmering.
- **Camera Viewport**: Orthographic top-down camera centered on local player with boundary clamping at map edges.
- **HUD Clutter**: Kept below 15% viewport coverage. Transparent dark glassmorphic panels (`#090D16/85`) anchored to corners.

---

## 3. Mobile (Touch) Specification & Controls

### 3.1 Touch Control Layout
```
┌──────────────────────────────────────────────────────────────────┐
│ [Living Hiders 4/5]        [Beacon: Stage 2 08.4s]     [M][R][P] │
│                                                                  │
│                                                                  │
│                         GAMEPLAY CANVAS                          │
│                                                                  │
│                                                                  │
│                                           ┌────────────────────┐ │
│   ┌──────────────┐                        │    HOLD BEACON     │ │
│   │   (  ●  )    │                        │  or ELIMINATE /    │ │
│   │ Virtual Stick│                        │  HIDE INSIDE       │ │
│   └──────────────┘                        └────────────────────┘ │
│  px-7 pb-7 safe-area                     px-7 pb-7 safe-area     │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Virtual Thumb Joystick (`src/components/MobileControls.tsx`)
- **Position**: Bottom-left corner, positioned with safe-area insets (`env(safe-area-inset-left)`, `env(safe-area-inset-bottom)`).
- **Physical Dimensions**: 112px × 112px (mobile) to 128px × 128px (tablet) outer boundary, 48px knob.
- **Physics & Math**:
  - Distance clamped to maximum radius `44px`.
  - Direction vector computed via `atan2(dy, dx)`.
  - Normalized vector `(kx / 44, ky / 44)` passed directly into movement physics.
  - Configurable sensitivity slider (`0.6×` to `1.6×`) persisted to `localStorage`.
- **Touch Isolation**: `touch-none select-none pointer-events-auto` with `setPointerCapture` prevents event leaking to page scroll.

### 3.3 Contextual Action Buttons
- **Thumb Zone**: Anchored bottom-right within thumb sweep radius.
- **Size**: Minimum touch target `min-h-[56px] min-w-[164px]` (exceeds Apple & Google 48px guidelines).
- **Smart Filtering**: Displays **only** actions available based on player's current role and proximity:
  - If near empty hiding spot: `HIDE INSIDE`
  - If inside spot: `EXIT HIDING`
  - If near Beacon: `HOLD BEACON` (toggle or press-and-hold support)
  - If Seeker near hider: `ELIMINATE HIDER` (red accent)
  - If Seeker near hiding spot: `INSPECT OBJECT` (amber accent)
- **Haptic Feedback**: Optional vibration (`navigator.vibrate?.([15])`) on successful button tap.

---

## 4. Mobile Browser Quirks & Hardening Solutions

### 4.1 Viewport & Zoom Prevention
- **Issue**: iOS Safari and Android Chrome double-tap or pinch zooms into the canvas, breaking layout and coordinates.
- **Solution**:
  1. `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />`
  2. CSS `touch-action: none` on `canvas` and `#root`.
  3. Window-level event listener: `e.preventDefault()` on `gesturestart`, `gesturechange`, and non-input `dblclick`.

### 4.2 Safe Area Insets (iPhone Notches & Gesture Bars)
- **Issue**: Modern phones have bottom home indicator bars, dynamic islands, and curved screen corners that clip buttons.
- **Solution**:
  ```css
  /* Applied to HUD and MobileControls containers */
  padding-bottom: max(1.75rem, env(safe-area-inset-bottom));
  padding-left: max(1.75rem, env(safe-area-inset-left));
  padding-right: max(1.75rem, env(safe-area-inset-right));
  padding-top: max(1.5rem, env(safe-area-inset-top));
  ```

### 4.3 Web Audio Autoplay Policy on Mobile
- **Issue**: Mobile browsers mute Web Audio contexts until an explicit user interaction (touch/click).
- **Solution**: `SoundController.resume()` is triggered on the first `pointerdown` or `Play as Guest` button click.

### 4.4 Screen Orientation Guidance
- **Issue**: Portrait mode on mobile compresses the urban map view, making visibility unfairly narrow.
- **Solution**:
  - Recommend landscape mode via dynamic visual overlay when `window.innerHeight > window.innerWidth`.
  - Fullscreen API button (`document.documentElement.requestFullscreen()`) on Android devices.

---

## 5. PWA (Progressive Web App) & Native Packaging

To give mobile and PC players an app-store-grade experience:

### 5.1 Progressive Web App (PWA)
- Add `manifest.json`:
  ```json
  {
    "name": "CITY HIDEOUT",
    "short_name": "HideOut",
    "start_url": "/",
    "display": "standalone",
    "orientation": "landscape",
    "background_color": "#090D16",
    "theme_color": "#090D16",
    "icons": [
      { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
      { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
    ]
  }
  ```
- Result: Players can tap "Add to Home Screen" on iOS/Android to run full-screen without URL bars.

### 5.2 Mobile Wrapper (Capacitor for Android & iOS)
- Capacitor allows wrapping the existing Vite bundle into native Android APK / iOS IPA with zero rewrite:
  ```bash
  npm i @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
  npx cap init "CITY HIDEOUT" "com.cityhideout.game" --web-dir dist
  npx cap add android
  npx cap add ios
  ```

### 5.3 Desktop Wrapper (Electron or Tauri for Windows/Mac)
- Tauri can wrap the `dist/` web output into a tiny (~10MB) native Windows `.exe` with native performance.

---

## 6. Cross-Platform QA Checklist

Before shipping any release, verify:
- [ ] Desktop Chrome/Firefox/Edge: WASD movement, E interaction, F beacon hold.
- [ ] Desktop Safari (macOS): Retina canvas rendering without blurring.
- [ ] Mobile iOS Safari (iPhone): No bounce scroll, joystick stays pinned, no gesture zoom.
- [ ] Mobile Android Chrome: Virtual joystick fluid motion, contextual action buttons respond cleanly.
- [ ] Orientation shift: Rotating between landscape and portrait does not freeze the canvas loop.
- [ ] Audio resumes properly after phone sleep / screen lock wakeup.
- [ ] Window resize: Canvas automatically resizes buffer dimensions (`width = innerWidth * dpr`).
