---
name: game-playtest
description: Run and playtest City Hideout in a headless browser — start the dev server, open the game with Playwright, play an offline bot match, take screenshots, check console errors and FPS. Use after any visual or gameplay change to verify it actually works.
---

# Playtest City Hideout

## Setup
```bash
npm install
npm test          # rules unit tests
npm run lint      # tsc --noEmit
npm run dev       # Express + WS + Vite on :3000 (run in background)
```

## Browser check (Playwright is pre-installed: `require('playwright')`)
Write a script in the scratchpad (not the repo), e.g.:
```js
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = []; p.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await p.goto('http://localhost:3000');
  await p.screenshot({ path: 'title.png' });
  await p.getByText(/Play as Guest/i).first().click();
  await p.waitForTimeout(3000);
  for (const k of ['d','s','a','w']) { await p.keyboard.down(k); await p.waitForTimeout(600); await p.keyboard.up(k); }
  await p.screenshot({ path: 'ingame.png' });
  const fps = await p.evaluate(() => new Promise(r => { let n=0; const t=performance.now(); const f=()=>{ n++; performance.now()-t<1000 ? requestAnimationFrame(f) : r(n); }; requestAnimationFrame(f); }));
  console.log({ fps, errors }); await b.close();
})();
```
Also test mobile: `devices['iPhone 13 landscape']`.

## Multiplayer check
Open two pages, create a room in one (`Multiplayer Room`), join with the code in the other, start, and verify both see movement. A seeker client must NOT be able to read hidden hiders from the received `room_state` (inspect WS frames via `page.on('websocket')`).

## Report
Screenshots before/after, console errors, FPS, and any rule that behaved unexpectedly.
