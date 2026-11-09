# Cross-Platform Export & Deployment Guide — CITY HIDEOUT

## 1. Browser & Cloud Run Deployment (Primary Online Host)
The full-stack authoritative server (`server.ts`) serves both the static Vite bundle (`dist/`) and the WebSocket multiplayer endpoint (`/ws`) on Port `3000`.
```bash
# Build production frontend bundle
npm run build

# Start production Express + WebSocket server on port 3000
npm start
```

## 2. Android Mobile Build (APK / AAB via Capacitor)
Because CITY HIDEOUT uses standard HTML5 `Canvas2D`, pointer events, and WebSockets (`wss://`), it packages cleanly into a native Android WebView app:
1. Run `npm run build` to generate `dist/`.
2. Initialize Capacitor: `npx cap init "City Hideout" com.cityhideout.game --web-dir=dist`.
3. Add Android target: `npx cap add android && npx cap sync android`.
4. Configure `AndroidManifest.xml` with `android:screenOrientation="sensorLandscape"` for default landscape gameplay.
5. Build signed APK/AAB in Android Studio or via `./gradlew assembleDebug` and test on an Android device or emulator.

## 3. iOS Mobile Build (Xcode / WKWebView via Capacitor)
1. On macOS with Xcode installed, run `npx cap add ios && npx cap sync ios`.
2. In `Info.plist`, set supported interface orientations to `UIInterfaceOrientationLandscapeLeft` and `UIInterfaceOrientationLandscapeRight`.
3. Ensure `NSAppTransportSecurity` uses `wss://` connected to the hosted multiplayer backend URL.

## 4. Windows Desktop Build (Electron / Tauri)
1. Point Electron `BrowserWindow` or Tauri `tauri.conf.json` (`distDir: "../dist"`) at the built web bundle, or connect directly to the hosted multiplayer instance.
2. Full keyboard (`WASD`, `Arrows`, `E`, `F`, `Space`, `Esc`) and mouse controls work out of the box.

## Render (Web Service)
- **Build command**: `bun install --frozen-lockfile && bun run build` (or `npm ci && npm run build`)
- **Start command**: `bun run start` (or `npm start`) — runs with `NODE_ENV=production`, serving `dist/` + `/ws`.
- **Port**: the server listens on `process.env.PORT` (Render injects it), defaulting to `3000` locally.
- **Health check path**: `/healthz`
- Keep `bun.lock` and `package-lock.json` in sync with `package.json` (run `bun install` / `npm install` after changing dependencies), otherwise frozen installs fail with *"lockfile had changes, but lockfile is frozen"*.

