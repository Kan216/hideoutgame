/**
 * Tiny i18n layer: English + Burmese (မြန်မာ).
 *  - `t(key, vars)` works anywhere (React or canvas code) and reads the current language.
 *  - `useLang()` re-renders a component when the language changes.
 *  - `rich(text)` renders **bold** and `key` markup used in longer help texts.
 * Proper names (maps, characters, hiding spots, player names) stay as they are.
 */
import React, { useSyncExternalStore } from 'react';
import type { ContextualActionPrompt, MatchEventLog, MatchState, PowerKind } from './game/rules';
import { MAPS } from './game/maps';

export type Lang = 'en' | 'my';

const en = {
  // language
  'lang.label': 'Language',
  'lang.switchTo': 'မြန်မာ',
  'view.label': 'Camera view',
  'view.2d': '2D',
  'view.25d': '2.5D',

  // title screen
  'title.online': 'ONLINE',
  'title.local': 'LOCAL',
  'title.bgmOn': 'BGM: ON',
  'title.bgmOff': 'BGM: OFF',
  'title.rules': 'Rules',
  'title.rotate': 'Rotate device to landscape for full view',
  'title.tagline': '4 MAPS · 76 HIDING SPOTS · 2D PIXEL ART',
  'title.desc':
    'Explore cutaway apartments, harbor docks, executive plazas and mystic forest ruins. Hide, sneak, grab snack powers and build the escape signal before the Seeker catches you!',
  'title.play': 'Play as Guest',
  'title.seeker': 'Seeker (1.08×)',
  'title.multiplayer': 'Multiplayer Room',
  'title.selectMap': 'SELECT MAP ({n} SPOTS)',
  'title.selectChar': 'SELECT CHARACTER ({name})',
  'title.swipe': 'SWIPE ◄ ►',
  'title.keys': 'WASD / Arrows Move · E / Space Hide or Search · Hold F Beacon · Shift Sprint · Q Power · Esc Pause',
  'title.mobileHint': '📱 Joystick + action buttons',
  'title.mobileSpeed': 'Seeker is slightly faster (1.08×)',
  'title.wakeup': 'Waking up the game server… this can take up to a minute.',

  // HUD
  'hud.guest': 'GUEST',
  'hud.room': 'RM {code}',
  'hud.hider': 'HIDER',
  'hud.seeker': 'SEEKER 1.08×',
  'hud.alive': 'ALIVE',
  'hud.headStart': 'HEAD START',
  'hud.beacon': 'BEACON {n}/{total}',
  'hud.perStage': '{secs}s/stage · 2 beacons',
  'hud.secsLeft': '{secs}s',
  'hud.explore': 'Explore the city and stay alert.',
  'hud.sprintReady': '⚡ [SHIFT] Sprint ready',
  'hud.sprinting': '⚡ SPRINTING!',
  'hud.sprintCd': '⚡ Sprint {secs}s',
  'hud.invisible': '👻 Invisible {secs}s',
  'hud.shield': '🛡️ Shield {secs}s',
  'hud.speed': '🍩 Speed {secs}s',
  'hud.breath': '😮‍💨 Catch your breath {secs}s',
  'hud.keyHold': 'HOLD [F]',
  'hud.keyAction': '[E / SPACE]',
  'hud.eliminated': '☠️ ELIMINATED',
  'hud.spectating': 'SPECTATING: {name}',
  'hud.teammate': 'Living Teammate',
  'hud.minimapCollapse': 'Tap to collapse minimap',
  'hud.you': 'YOU',
  'hud.beaconLegend': 'BEACON',
  'hud.hideLegend': 'HIDE',

  // contextual actions
  'act.hide': 'Hide in {spot}',
  'act.hideSub': 'Safe from the Seeker for up to {secs}s',
  'act.exit': 'Exit Hiding ({secs}s left)',
  'act.exitSub': '{spot} · auto-exits after {max}s',
  'act.holdBeacon': 'Hold Beacon (Stage {n}/{total})',
  'act.transmitting': 'Transmitting Stage {n}/{total}…',
  'act.beaconSub': '{secs}s uninterrupted',
  'act.beaconSubRelay': '{secs}s uninterrupted · Relay',
  'act.catch': 'Catch {name}',
  'act.catchSub': 'Close-range catch in the open',
  'act.search': 'Search {spot}',
  'act.searchSub': 'Flushes out any hider inside',
  // mobile button titles
  'btn.hide': 'HIDE INSIDE',
  'btn.exit': 'EXIT HIDING',
  'btn.catch': 'CATCH HIDER',
  'btn.search': 'SEARCH OBJECT',
  'btn.holdBeacon': 'HOLD BEACON',
  'btn.holding': 'HOLDING BEACON…',
  'btn.sprint': 'SPRINT',
  'btn.go': 'GO!',
  'btn.use': 'USE',
  'btn.callout': 'Callout',

  // powers
  'power.cloak.snack': 'Ghost Candy',
  'power.cloak.name': 'Invisibility Cloak',
  'power.cloak.desc': 'Seekers can’t see or hear you for 8s (unless they bump into you).',
  'power.shield.snack': 'Iron Apple',
  'power.shield.name': 'Shield',
  'power.shield.desc': 'Blocks one catch for 12s and stuns the seeker.',
  'power.mines.snack': 'Pop Rocks',
  'power.mines.name': 'Mines',
  'power.mines.desc': '2 hidden mines (15s each) that stun a seeker for 2.5s.',
  'power.smoke.snack': 'Smoke Pie',
  'power.smoke.name': 'Smoke Bomb',
  'power.smoke.desc': '7s smoke cloud that seekers can’t see through.',
  'power.speed.snack': 'Energy Donut',
  'power.speed.name': 'Speed Boost',
  'power.speed.desc': '+25% speed for 10s.',

  // world FX (canvas)
  'fx.caught': '☠️ CAUGHT!',
  'fx.flushed': '❗ FLUSHED OUT!',
  'fx.empty': 'EMPTY',
  'fx.hidden': '🚪 HIDDEN',
  'fx.out': '💨 OUT',
  'fx.tier': '⚡ TIER {n} BUILT!',
  'fx.timeout': '⚠️ TIME OUT!',
  'fx.unleashed': '🚨 SEEKERS UNLEASHED!',
  'fx.boom': '💥 BOOM!',
  'fx.blocked': '🛡️ BLOCKED!',
  'fx.ate': '+{icon} {snack}! [Q]',
  'fx.used': '{icon} {power}!',
  'fx.stunMine': 'BOOM! STUNNED',
  'fx.stunShield': 'BLOCKED!',
  'fx.searching': 'searching…',
  'fx.relay': 'RELAY',
  'fx.seekerLocked': 'SEEKER LOCKED ({secs}S)',
  'fx.seekerZone': 'SEEKER DEPLOY ZONE',
  'fx.hiddenTimer': '[HIDDEN · {secs}s]',

  // events (toasts)
  'evt.matchStarted': 'Match started on {map}! Hiders have {secs}s head start.',
  'evt.released': 'THE SEEKER IS RELEASED! Hunt begins now!',
  'evt.caught': '{seeker} caught {hider}!',
  'evt.flushed': '{seeker} flushed {hider} out of {spot}!',
  'evt.inspectEmpty': '{seeker} checked {spot} — Empty.',
  'evt.shieldBlocked': '🛡️ {hider}’s shield blocked {seeker}!',
  'evt.mineHit': '💣 {seeker} stepped on a mine!',
  'evt.hideExpired': '{hider}’s {secs}s hide timer ran out at {spot}!',
  'evt.stageDone': 'Escape stage {n}/{total} sent from {beacon}!',
  'evt.winAllCaughtEvent': 'SEEKER VICTORY — every hider was caught!',
  'evt.winEscapedEvent': 'HIDER VICTORY — escape signal fully sent ({total}/{total})!',
  'evt.winSurvivedEvent': 'HIDER VICTORY — survived the full match timer!',
  'evt.winStalledEvent': 'SEEKER VICTORY — hiders stalled and the beacon stayed dark!',

  // win reasons
  'win.winAllCaught': 'Every hider was discovered and caught!',
  'win.winEscaped': 'Hiders built all {total} tiers of the escape signal!',
  'win.winSurvived': 'Hiders survived the clock with the signal partly sent!',
  'win.winStalled': 'Time’s up! Hiders never built a beacon tier ({n} needed).',

  // pause
  'pause.title': 'GAME PAUSED',
  'pause.subtitle': 'Adjust controls or resume the match.',
  'pause.sound': 'Sound',
  'pause.muted': 'MUTED (OFF)',
  'pause.audioOn': 'AUDIO ON',
  'pause.touch': 'On-screen touch controls',
  'pause.touch.auto': 'auto',
  'pause.touch.on': 'on',
  'pause.touch.off': 'off',
  'pause.sensitivity': 'Joystick sensitivity',
  'pause.display': 'Display',
  'pause.fullscreen': '⛶ Toggle Fullscreen',
  'pause.resume': 'Resume Match',
  'pause.restart': 'Restart Round',
  'pause.leave': 'Leave Session to Main Menu',

  // game over
  'over.hidersWin': 'HIDER TEAM VICTORY',
  'over.seekersWin': 'SEEKER TEAM VICTORY',
  'over.victory': 'VICTORY — MISSION COMPLETE',
  'over.defeat': 'DEFEAT — MATCH OVER',
  'over.stages': 'BEACON TIERS',
  'over.time': 'MATCH TIME',
  'over.elims': 'CATCHES',
  'over.alive': 'HIDERS ALIVE',
  'over.again': 'Play Again',
  'over.share': '📋 Share Stats',
  'over.copied': 'Copied Stats!',
  'over.lobby': 'Lobby',
  'over.menu': 'Menu',
  'over.shareText':
    '🎮 CITY HIDEOUT match result:\n{result} as {role}!\n⏱️ Match time: {secs}s | Beacon tiers: {n}/{total}\nPlay now: {url}',
  'over.shareWin': '🏆 VICTORY',
  'over.shareLose': '💀 DEFEAT',

  // how to play
  'how.title': 'HOW TO PLAY — CITY HIDEOUT',
  'how.close': 'Close',
  'how.h1': '1. HIDER RULES (100% speed · 10s head start · 15s max hide · ⚡ Sprint)',
  'how.p1':
    'Spawn in the city center and use the **10-second countdown** to find cover. Press `E` (or tap **HIDE**) next to any hiding object. While hidden **you cannot be caught**, but you may only stay **15 seconds** once the hunt starts — the object starts **rustling** 3s before you are forced out. After leaving any spot you must **catch your breath for 3s** before hiding again. Press `SHIFT` (or tap **⚡ SPRINT**) for a short burst faster than the Seeker — use it to break line of sight.',
  'how.h2': '2. BUILD THE ESCAPE SIGNAL (2 beacons · 3 tiers × 15s)',
  'how.p2':
    'Hold `F` (or tap **HOLD BEACON**) at the **City-Center Beacon** or the far-corner **Relay**. Every **15 uninterrupted seconds** builds one tier of the signal tower — build **3 tiers** to escape. Leaving resets only the tier under construction. After 6s the antenna starts **humming**, which Seekers can hear from far away. If the clock runs out, hiders win only if at least one tier was built.',
  'how.h3': '★ HIDER SNACK POWERS (walk over to eat · `Q` / tap to use)',
  'how.p3': 'You can carry one snack at a time. New snacks appear around the city every few seconds.',
  'how.h4': '3. SEEKER RULES (108% speed · limited vision · search & catch)',
  'how.p4':
    'Released after the 10-second countdown, **slightly faster** than hiders (**1.08×**). You only see what is in your **line of sight** — watch for noise rings (doors opening, rustling objects, humming beacons). Press `E / Space` next to an object to **Search** it: anyone inside is **flushed out**, briefly stunned and revealed — but searching takes you a moment too. Catch hiders in the open with `E / Space`.',
  'how.h5': '4. GUEST PRIVACY',
  'how.p5':
    'Guest play needs no email, password or personal data. Your guest session is stored in this browser so you can reconnect to rooms. Clearing browser data or switching devices resets your guest profile.',

  // lobby
  'lobby.title': 'MATCH SETUP & CHARACTER SELECT',
  'lobby.session': 'Guest session active · ID:',
  'lobby.connected': 'Online server connected',
  'lobby.offline': 'Offline mode ready',
  'lobby.back': 'Back to Title',
  'lobby.nameLabel': 'Guest display name (2–18 characters, no password or email needed)',
  'lobby.nameUpdate': 'Update Name',
  'lobby.nameInvalid': 'Invalid display name',
  'lobby.charLabel': 'Select character',
  'lobby.onlineTitle': '01. Online Room with Friends',
  'lobby.onlineDesc': 'Create a room code or join a friend’s room — works on desktop, mobile and browser.',
  'lobby.create': 'Create Room & Generate Code',
  'lobby.joinLabel': 'Have an invite code? Enter the 6-character room code:',
  'lobby.join': 'Join Room',
  'lobby.activeCode': 'ACTIVE ROOM CODE',
  'lobby.copyCode': 'Copy Code',
  'lobby.copiedCode': 'Copied Code!',
  'lobby.inviteLink': '📋 Invite Link',
  'lobby.linkCopied': 'Link Copied!',
  'lobby.leave': 'Leave',
  'lobby.players': 'Connected Players ({n})',
  'lobby.you': '(You)',
  'lobby.host': 'Host',
  'lobby.bot': 'AI Bot',
  'lobby.ready': 'Ready',
  'lobby.disconnected': 'Disconnected',
  'lobby.launch': 'Launch Online Match Now',
  'lobby.waiting': 'Waiting for the room host to launch the match…',
  'lobby.configTitle': '02. Map & Rules',
  'lobby.mapLabel': 'Select map (4 maps · 76 hiding objects)',
  'lobby.mapMeta': '{n} spots · Rec: {seekers}',
  'lobby.seekerCount': 'Seeker count',
  'lobby.seekers1': '1 Seeker',
  'lobby.seekers2': '2 Seekers',
  'lobby.role': 'Your preferred role',
  'lobby.role.hider': 'HIDER',
  'lobby.role.seeker': 'SEEKER',
  'lobby.bots': 'AI bots (for solo practice or filling rooms: {n})',
  'lobby.bots0': '0 (Humans)',
  'lobby.botsN': '{n} Bots',
  'lobby.offlineStart': 'Start Offline Match ({role} + {n} AI Bots)',
} as const;

export type I18nKey = keyof typeof en;

const my: Record<I18nKey, string> = {
  'lang.label': 'ဘာသာစကား',
  'lang.switchTo': 'English',
  'view.label': 'ကင်မရာ မြင်ကွင်း',
  'view.2d': '2D',
  'view.25d': '2.5D',

  'title.online': 'အွန်လိုင်း',
  'title.local': 'အော့ဖ်လိုင်း',
  'title.bgmOn': 'နောက်ခံတေး: ဖွင့်',
  'title.bgmOff': 'နောက်ခံတေး: ပိတ်',
  'title.rules': 'ကစားနည်း',
  'title.rotate': 'ပိုမြင်ရအောင် ဖုန်းကို အလျားလိုက် လှည့်ပါ',
  'title.tagline': 'မြေပုံ ၄ ခု · ပုန်းစရာနေရာ ၇၆ ခု · 2D PIXEL ART',
  'title.desc':
    'တိုက်ခန်းတွေ၊ ဆိပ်ကမ်းတွေ၊ ရုံးအဆောက်အအုံတွေနဲ့ တောအုပ်ထဲက အပျက်အစီးတွေကြားမှာ ပုန်းပါ၊ ချောင်းပါ၊ Power မုန့်တွေ စားပါ — ရှာသူ မဖမ်းခင် လွတ်မြောက်ရေး အချက်ပြတာဝါကို ဆောက်ပါ!',
  'title.play': 'ဧည့်သည်အဖြစ် ကစားမယ်',
  'title.seeker': 'ရှာသူ (1.08×)',
  'title.multiplayer': 'သူငယ်ချင်းတွေနဲ့ ကစားမယ်',
  'title.selectMap': 'မြေပုံ ရွေးပါ (ပုန်းစရာ {n} ခု)',
  'title.selectChar': 'ဇာတ်ကောင် ရွေးပါ ({name})',
  'title.swipe': 'ဘေးတိုက် ပွတ်ဆွဲပါ ◄ ►',
  'title.keys': 'WASD / မြှားခလုတ် ရွှေ့ · E / Space ပုန်း/ရှာ · F ဖိထား Beacon · Shift ပြေး · Q Power · Esc ခဏရပ်',
  'title.mobileHint': '📱 ဂျွိုင်စတစ် + လုပ်ဆောင်ချက် ခလုတ်များ',
  'title.mobileSpeed': 'ရှာသူက နည်းနည်း ပိုမြန်တယ် (1.08×)',
  'title.wakeup': 'Game server နိုးနေပါတယ်… တစ်မိနစ်လောက် ကြာနိုင်ပါတယ်။',

  'hud.guest': 'ဧည့်သည်',
  'hud.room': 'အခန်း {code}',
  'hud.hider': 'ပုန်းသူ',
  'hud.seeker': 'ရှာသူ 1.08×',
  'hud.alive': 'အသက်ရှင်',
  'hud.headStart': 'ကြိုတင်ချိန်',
  'hud.beacon': 'BEACON {n}/{total}',
  'hud.perStage': 'အဆင့်တစ်ခု {secs} စက္ကန့် · Beacon ၂ ခု',
  'hud.secsLeft': '{secs} စက္ကန့်',
  'hud.explore': 'မြို့ထဲ လှည့်ပတ်ပြီး သတိထားပါ။',
  'hud.sprintReady': '⚡ [SHIFT] ပြေးလို့ရပြီ',
  'hud.sprinting': '⚡ ပြေးနေတယ်!',
  'hud.sprintCd': '⚡ ပြေးရန် {secs} စက္ကန့်',
  'hud.invisible': '👻 မမြင်ရ {secs} စက္ကန့်',
  'hud.shield': '🛡️ ဒိုင်း {secs} စက္ကန့်',
  'hud.speed': '🍩 အမြန် {secs} စက္ကန့်',
  'hud.breath': '😮‍💨 အမောဖြေနေ {secs} စက္ကန့်',
  'hud.keyHold': 'ဖိထား [F]',
  'hud.keyAction': '[E / SPACE]',
  'hud.eliminated': '☠️ အဖမ်းခံရပြီ',
  'hud.spectating': 'ကြည့်နေသည်: {name}',
  'hud.teammate': 'အသက်ရှင်သော အဖွဲ့ဝင်',
  'hud.minimapCollapse': 'မြေပုံသေး ပိတ်ရန် နှိပ်ပါ',
  'hud.you': 'သင်',
  'hud.beaconLegend': 'BEACON',
  'hud.hideLegend': 'ပုန်းစရာ',

  'act.hide': '{spot} ထဲ ပုန်းမယ်',
  'act.hideSub': 'ရှာသူ မဖမ်းနိုင် — အများဆုံး {secs} စက္ကန့်',
  'act.exit': 'ပုန်းရာက ထွက်မယ် ({secs} စက္ကန့် ကျန်)',
  'act.exitSub': '{spot} · {max} စက္ကန့်ပြည့်ရင် အလိုအလျောက် ထွက်ရမယ်',
  'act.holdBeacon': 'Beacon ကို ဖိထား (အဆင့် {n}/{total})',
  'act.transmitting': 'အဆင့် {n}/{total} ပို့နေတယ်…',
  'act.beaconSub': 'မပြတ်တမ်း {secs} စက္ကန့်',
  'act.beaconSubRelay': 'မပြတ်တမ်း {secs} စက္ကန့် · Relay',
  'act.catch': '{name} ကို ဖမ်းမယ်',
  'act.catchSub': 'အနီးကပ်၊ ပွင့်လင်းရာမှာ ဖမ်းပါ',
  'act.search': '{spot} ကို ရှာမယ်',
  'act.searchSub': 'အထဲမှာ ပုန်းနေသူကို ထုတ်ပစ်တယ်',
  'btn.hide': 'ပုန်းမယ်',
  'btn.exit': 'ထွက်မယ်',
  'btn.catch': 'ဖမ်းမယ်',
  'btn.search': 'ရှာမယ်',
  'btn.holdBeacon': 'BEACON ဖိထား',
  'btn.holding': 'BEACON ဖိထားတယ်…',
  'btn.sprint': 'ပြေး',
  'btn.go': 'ပြေး!',
  'btn.use': 'သုံး',
  'btn.callout': 'အချက်ပြ',

  'power.cloak.snack': 'သရဲသကြားလုံး',
  'power.cloak.name': 'မမြင်ရအောင် ဖုံးကွယ်ခြင်း',
  'power.cloak.desc': 'ရှာသူက ၈ စက္ကန့်ကြာ မမြင်ရ၊ မကြားရ (ကိုယ်နဲ့ ထိကပ်လာမှသာ သိနိုင်)။',
  'power.shield.snack': 'သံပန်းသီး',
  'power.shield.name': 'ဒိုင်းကာ',
  'power.shield.desc': '၁၂ စက္ကန့်အတွင်း အဖမ်းခံရမှု တစ်ကြိမ်ကို ကာပေးပြီး ရှာသူကို ခဏ မူးသွားစေတယ်။',
  'power.mines.snack': 'ပေါက်ကွဲသကြား',
  'power.mines.name': 'မိုင်း',
  'power.mines.desc': 'မမြင်ရတဲ့ မိုင်း ၂ လုံး (တစ်လုံး ၁၅ စက္ကန့်) — နင်းမိရင် ရှာသူ ၂.၅ စက္ကန့် ရပ်သွားမယ်။',
  'power.smoke.snack': 'မီးခိုးပိုင်မုန့်',
  'power.smoke.name': 'မီးခိုးဗုံး',
  'power.smoke.desc': 'ရှာသူ မမြင်နိုင်တဲ့ မီးခိုးတိမ် ၇ စက္ကန့်။',
  'power.speed.snack': 'အားဖြည့်ဒိုးနတ်',
  'power.speed.name': 'အမြန်နှုန်း မြှင့်',
  'power.speed.desc': '၁၀ စက္ကန့်ကြာ ၂၅% ပိုမြန်တယ်။',

  'fx.caught': '☠️ မိသွားပြီ!',
  'fx.flushed': '❗ ထွက်ပေါ်လာပြီ!',
  'fx.empty': 'ဘာမှမရှိ',
  'fx.hidden': '🚪 ပုန်းပြီ',
  'fx.out': '💨 ထွက်ပြီ',
  'fx.tier': '⚡ အဆင့် {n} ပြီးပြီ!',
  'fx.timeout': '⚠️ အချိန်ပြည့်!',
  'fx.unleashed': '🚨 ရှာသူ လွှတ်ပြီ!',
  'fx.boom': '💥 ဗုန်း!',
  'fx.blocked': '🛡️ ကာလိုက်ပြီ!',
  'fx.ate': '+{icon} {snack}! [Q]',
  'fx.used': '{icon} {power}!',
  'fx.stunMine': 'ဗုန်း! မူးသွားပြီ',
  'fx.stunShield': 'ကာထားတယ်!',
  'fx.searching': 'ရှာနေတယ်…',
  'fx.relay': 'RELAY',
  'fx.seekerLocked': 'ရှာသူ ပိတ်ထားဆဲ ({secs})',
  'fx.seekerZone': 'ရှာသူ စခန်း',
  'fx.hiddenTimer': '[ပုန်းနေ · {secs}s]',

  'evt.matchStarted': '{map} မှာ ပွဲစပြီ! ပုန်းသူတွေမှာ ကြိုတင်ချိန် {secs} စက္ကန့် ရှိတယ်။',
  'evt.released': 'ရှာသူ လွှတ်ပြီ! အခုစပြီး ရှာပြီ!',
  'evt.caught': '{seeker} က {hider} ကို ဖမ်းမိပြီ!',
  'evt.flushed': '{seeker} က {spot} ထဲက {hider} ကို ထုတ်လိုက်ပြီ!',
  'evt.inspectEmpty': '{seeker} က {spot} ကို ရှာတယ် — ဘာမှမရှိ။',
  'evt.shieldBlocked': '🛡️ {hider} ရဲ့ ဒိုင်းက {seeker} ကို ကာလိုက်ပြီ!',
  'evt.mineHit': '💣 {seeker} မိုင်းနင်းမိပြီ!',
  'evt.hideExpired': '{spot} မှာ {hider} ရဲ့ ပုန်းချိန် {secs} စက္ကန့် ကုန်သွားပြီ!',
  'evt.stageDone': '{beacon} ကနေ လွတ်မြောက်ရေး အဆင့် {n}/{total} ပို့ပြီးပြီ!',
  'evt.winAllCaughtEvent': 'ရှာသူ အနိုင်ရ — ပုန်းသူ အားလုံး အဖမ်းခံရပြီ!',
  'evt.winEscapedEvent': 'ပုန်းသူ အနိုင်ရ — လွတ်မြောက်ရေး အချက်ပြ အပြည့်ပို့ပြီးပြီ ({total}/{total})!',
  'evt.winSurvivedEvent': 'ပုန်းသူ အနိုင်ရ — ပွဲချိန်ပြည့်အထိ ရှင်သန်နိုင်ခဲ့!',
  'evt.winStalledEvent': 'ရှာသူ အနိုင်ရ — ပုန်းသူတွေ Beacon တစ်ဆင့်မှ မဆောက်ခဲ့!',

  'win.winAllCaught': 'ပုန်းသူ အားလုံးကို ရှာတွေ့ပြီး ဖမ်းမိခဲ့ပြီ!',
  'win.winEscaped': 'ပုန်းသူတွေ လွတ်မြောက်ရေး တာဝါ {total} ဆင့်လုံး ဆောက်ပြီးပြီ!',
  'win.winSurvived': 'ပုန်းသူတွေ အချက်ပြ တစ်စိတ်တစ်ပိုင်း ပို့ပြီး ပွဲချိန်ပြည့်အထိ ရှင်သန်ခဲ့!',
  'win.winStalled': 'အချိန်ပြည့်ပြီ! ပုန်းသူတွေ Beacon အဆင့် တစ်ဆင့်မှ မဆောက်ခဲ့ ({n} ဆင့် လိုတယ်)။',

  'pause.title': 'ခဏရပ်ထားသည်',
  'pause.subtitle': 'ထိန်းချုပ်မှုတွေ ပြင်ပါ သို့မဟုတ် ဆက်ကစားပါ။',
  'pause.sound': 'အသံ',
  'pause.muted': 'အသံပိတ်',
  'pause.audioOn': 'အသံဖွင့်',
  'pause.touch': 'မျက်နှာပြင်ပေါ်က ထိန်းချုပ်ခလုတ်များ',
  'pause.touch.auto': 'အလိုအလျောက်',
  'pause.touch.on': 'ဖွင့်',
  'pause.touch.off': 'ပိတ်',
  'pause.sensitivity': 'ဂျွိုင်စတစ် အာရုံခံနိုင်မှု',
  'pause.display': 'မျက်နှာပြင်',
  'pause.fullscreen': '⛶ မျက်နှာပြင်အပြည့်',
  'pause.resume': 'ဆက်ကစားမယ်',
  'pause.restart': 'ပြန်စမယ်',
  'pause.leave': 'ပင်မမီနူးကို ပြန်သွားမယ်',

  'over.hidersWin': 'ပုန်းသူအဖွဲ့ အနိုင်ရ',
  'over.seekersWin': 'ရှာသူအဖွဲ့ အနိုင်ရ',
  'over.victory': 'အနိုင်ရပြီ!',
  'over.defeat': 'ရှုံးသွားပြီ — ပွဲပြီးပြီ',
  'over.stages': 'BEACON အဆင့်',
  'over.time': 'ပွဲကြာချိန်',
  'over.elims': 'ဖမ်းမိသူ',
  'over.alive': 'ကျန်ရှိ ပုန်းသူ',
  'over.again': 'ထပ်ကစားမယ်',
  'over.share': '📋 ရလဒ် မျှဝေမယ်',
  'over.copied': 'ကူးယူပြီးပြီ!',
  'over.lobby': 'Lobby',
  'over.menu': 'မီနူး',
  'over.shareText':
    '🎮 CITY HIDEOUT ပွဲရလဒ်:\n{role} အဖြစ် {result}!\n⏱️ ပွဲကြာချိန်: {secs} စက္ကန့် | Beacon အဆင့်: {n}/{total}\nအခုကစားကြည့်ပါ: {url}',
  'over.shareWin': '🏆 အနိုင်ရ',
  'over.shareLose': '💀 ရှုံး',

  'how.title': 'ကစားနည်း — CITY HIDEOUT',
  'how.close': 'ပိတ်မယ်',
  'how.h1': '၁။ ပုန်းသူ စည်းမျဉ်း (အမြန်နှုန်း 100% · ကြိုတင်ချိန် ၁၀ စက္ကန့် · အများဆုံးပုန်းချိန် ၁၅ စက္ကန့် · ⚡ ပြေး)',
  'how.p1':
    'မြို့လယ်မှာ စမွေးပြီး **၁၀ စက္ကန့် ကြိုတင်ချိန်** အတွင်း ပုန်းစရာ ရှာပါ။ ပုန်းစရာနားမှာ `E` နှိပ်ပါ (ဖုန်းမှာ **ပုန်းမယ်** ကို နှိပ်ပါ)။ ပုန်းနေစဉ် **ဘယ်သူမှ ဖမ်းလို့မရ** ပါဘူး၊ ဒါပေမယ့် ရှာပွဲစတာနဲ့ **၁၅ စက္ကန့်** ပဲ ပုန်းနေလို့ရတယ် — အတင်းထွက်ရမယ့် ၃ စက္ကန့်အလိုမှာ ပုန်းစရာက **လှုပ်ခါ** လာပါမယ်။ ပုန်းရာက ထွက်ပြီးရင် နောက်တစ်ခါ မပုန်းခင် **၃ စက္ကန့် အမောဖြေ** ရပါမယ်။ ရှာသူထက် ခဏ ပိုမြန်ဖို့ `SHIFT` (သို့မဟုတ် **⚡ ပြေး**) ကို သုံးပြီး မျက်စိအောက်က လွတ်အောင် ပြေးပါ။',
  'how.h2': '၂။ လွတ်မြောက်ရေး အချက်ပြ ဆောက်ပါ (Beacon ၂ ခု · ၃ ဆင့် × ၁၅ စက္ကန့်)',
  'how.p2':
    '**မြို့လယ် Beacon** သို့မဟုတ် ထောင့်ဘက်က **Relay** မှာ `F` ကို ဖိထားပါ (သို့မဟုတ် **BEACON ဖိထား** ကို နှိပ်ပါ)။ **မပြတ်တမ်း ၁၅ စက္ကန့်** တိုင်း အချက်ပြတာဝါ တစ်ဆင့် ဆောက်ပြီးပါမယ် — **၃ ဆင့်** ပြည့်ရင် လွတ်မြောက်ပါပြီ။ ထွက်သွားရင် ဆောက်လက်စ အဆင့်ပဲ ပျက်ပါမယ်။ ၆ စက္ကန့်ကြာရင် အင်တာနာက **တဝီဝီ မြည်** လာပြီး ရှာသူတွေ အဝေးကနေ ကြားနိုင်ပါတယ်။ ပွဲချိန်ကုန်သွားရင် အနည်းဆုံး တစ်ဆင့် ဆောက်ထားမှသာ ပုန်းသူ အနိုင်ရပါမယ်။',
  'how.h3': '★ ပုန်းသူ Power မုန့်များ (ဖြတ်လျှောက်ရင် စားပြီး · `Q` / နှိပ်ပြီး သုံးပါ)',
  'how.p3': 'မုန့်တစ်ခုပဲ သယ်ထားလို့ရပါတယ်။ မြို့ထဲမှာ မုန့်အသစ်တွေ စက္ကန့်အနည်းငယ်တိုင်း ပေါ်လာပါမယ်။',
  'how.h4': '၃။ ရှာသူ စည်းမျဉ်း (အမြန်နှုန်း 108% · မြင်ကွင်း ကန့်သတ် · ရှာ & ဖမ်း)',
  'how.p4':
    '၁၀ စက္ကန့် ကြိုတင်ချိန်ပြီးရင် ပုန်းသူထက် **နည်းနည်း ပိုမြန်တဲ့** (**1.08×**) အမြန်နှုန်းနဲ့ လွှတ်ပေးပါမယ်။ **မျက်စိမြင်ကွင်းထဲ** ကလူကိုပဲ မြင်ရပါတယ် — အသံလှိုင်း အဝိုင်းလေးတွေကို (တံခါးဖွင့်သံ၊ လှုပ်နေတဲ့ ပုန်းစရာ၊ မြည်နေတဲ့ Beacon) သတိထားကြည့်ပါ။ ပုန်းစရာနားမှာ `E / Space` နှိပ်ပြီး **ရှာ** ပါ — အထဲမှာ ရှိနေရင် **ထုတ်ပစ်** ပြီး ခဏ မူးကာ မြင်ရပါမယ် — ဒါပေမယ့် ရှာနေတုန်း ကိုယ်လည်း ခဏ ရပ်ရပါတယ်။ ပွင့်လင်းရာမှာ ရှိတဲ့ ပုန်းသူကို `E / Space` နဲ့ ဖမ်းပါ။',
  'how.h5': '၄။ ဧည့်သည် ကိုယ်ရေးလုံခြုံမှု',
  'how.p5':
    'ဧည့်သည်အဖြစ် ကစားရန် အီးမေးလ်၊ စကားဝှက်၊ ကိုယ်ရေးအချက်အလက် မလိုပါ။ အခန်းတွေကို ပြန်ဝင်နိုင်ဖို့ ဧည့်သည် session ကို ဒီ browser ထဲမှာ သိမ်းထားပါတယ်။ Browser data ဖျက်ရင် သို့မဟုတ် စက်ပြောင်းရင် ဧည့်သည် ပရိုဖိုင် အသစ်ပြန်စပါမယ်။',

  'lobby.title': 'ပွဲပြင်ဆင်ခြင်း & ဇာတ်ကောင်ရွေးခြင်း',
  'lobby.session': 'ဧည့်သည် session · ID:',
  'lobby.connected': 'အွန်လိုင်း server ချိတ်ပြီး',
  'lobby.offline': 'အော့ဖ်လိုင်း အသင့်',
  'lobby.back': 'ခေါင်းစဉ်သို့ ပြန်',
  'lobby.nameLabel': 'ဧည့်သည် အမည် (စာလုံး ၂–၁၈ လုံး၊ အင်္ဂလိပ်စာ/နံပါတ်၊ စကားဝှက် မလို)',
  'lobby.nameUpdate': 'အမည် ပြောင်းမယ်',
  'lobby.nameInvalid': 'အမည် မမှန်ကန်ပါ',
  'lobby.charLabel': 'ဇာတ်ကောင် ရွေးပါ',
  'lobby.onlineTitle': '၀၁။ သူငယ်ချင်းတွေနဲ့ အွန်လိုင်းအခန်း',
  'lobby.onlineDesc': 'အခန်းကုဒ် ဖန်တီးပါ သို့မဟုတ် သူငယ်ချင်းရဲ့ အခန်းကို ဝင်ပါ — ကွန်ပျူတာ၊ ဖုန်း၊ browser အားလုံးမှာ ရပါတယ်။',
  'lobby.create': 'အခန်းဖန်တီးပြီး ကုဒ်ယူမယ်',
  'lobby.joinLabel': 'ဖိတ်ကုဒ် ရှိလား? အခန်းကုဒ် ၆ လုံး ထည့်ပါ:',
  'lobby.join': 'အခန်းဝင်မယ်',
  'lobby.activeCode': 'အခန်းကုဒ်',
  'lobby.copyCode': 'ကုဒ်ကူးမယ်',
  'lobby.copiedCode': 'ကူးပြီးပြီ!',
  'lobby.inviteLink': '📋 ဖိတ်ခေါ်လင့်ခ်',
  'lobby.linkCopied': 'လင့်ခ် ကူးပြီးပြီ!',
  'lobby.leave': 'ထွက်မယ်',
  'lobby.players': 'ချိတ်ဆက်ထားသူများ ({n})',
  'lobby.you': '(သင်)',
  'lobby.host': 'အခန်းရှင်',
  'lobby.bot': 'AI Bot',
  'lobby.ready': 'အသင့်',
  'lobby.disconnected': 'ချိတ်ဆက်မှုပြတ်',
  'lobby.launch': 'အွန်လိုင်းပွဲ အခုစမယ်',
  'lobby.waiting': 'အခန်းရှင်က ပွဲစတာကို စောင့်နေတယ်…',
  'lobby.configTitle': '၀၂။ မြေပုံ & စည်းမျဉ်း',
  'lobby.mapLabel': 'မြေပုံ ရွေးပါ (မြေပုံ ၄ ခု · ပုန်းစရာ ၇၆ ခု)',
  'lobby.mapMeta': 'ပုန်းစရာ {n} ခု · အကြံပြု: {seekers}',
  'lobby.seekerCount': 'ရှာသူ အရေအတွက်',
  'lobby.seekers1': 'ရှာသူ ၁ ယောက်',
  'lobby.seekers2': 'ရှာသူ ၂ ယောက်',
  'lobby.role': 'ကစားချင်တဲ့ အခန်းကဏ္ဍ',
  'lobby.role.hider': 'ပုန်းသူ',
  'lobby.role.seeker': 'ရှာသူ',
  'lobby.bots': 'AI Bot (တစ်ယောက်တည်း လေ့ကျင့်ရန် သို့မဟုတ် အခန်းဖြည့်ရန်: {n})',
  'lobby.bots0': '0 (လူသာ)',
  'lobby.botsN': 'Bot {n}',
  'lobby.offlineStart': 'အော့ဖ်လိုင်းပွဲ စမယ် ({role} + AI Bot {n})',
};

const DICTS: Record<Lang, Record<I18nKey, string>> = { en, my };

function detectLang(): Lang {
  try {
    const saved = localStorage.getItem('ch_lang');
    if (saved === 'en' || saved === 'my') return saved;
  } catch {
    /* storage unavailable */
  }
  if (typeof navigator !== 'undefined' && /^my\b/i.test(navigator.language || '')) return 'my';
  return 'en';
}

let current: Lang = typeof window === 'undefined' ? 'en' : detectLang();
const listeners = new Set<() => void>();

function applyDocumentLang(lang: Lang) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang === 'my' ? 'my' : 'en';
  document.documentElement.classList.toggle('lang-my', lang === 'my');
}
applyDocumentLang(current);

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  try {
    localStorage.setItem('ch_lang', lang);
  } catch {
    /* ignore */
  }
  applyDocumentLang(lang);
  for (const fn of listeners) fn();
}

export function useLang(): Lang {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => 'en'
  );
}

/** Translate with {var} substitution; falls back to English, then to the key itself. */
export function t(key: I18nKey | string, vars?: Record<string, string | number>): string {
  const dict = DICTS[current] as Record<string, string>;
  let s = dict[key] ?? (en as Record<string, string>)[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  }
  return s;
}

export function hasKey(key: string): boolean {
  return key in en;
}

/** Render **bold** and `key` markup from translated help texts. */
export function rich(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) out.push(<strong key={i++}>{tok.slice(2, -2)}</strong>);
    else out.push(<span key={i++} className="font-mono text-amber-300">{tok.slice(1, -1)}</span>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// ───────── game-specific helpers ─────────

export function powerName(kind: PowerKind): string {
  return t(`power.${kind}.name`);
}
export function powerSnack(kind: PowerKind): string {
  return t(`power.${kind}.snack`);
}
export function powerDesc(kind: PowerKind): string {
  return t(`power.${kind}.desc`);
}

/** Event text in the viewer's language (server events carry a key + params). */
export function eventText(evt: MatchEventLog): string {
  if (evt.key && hasKey(`evt.${evt.key}`)) return t(`evt.${evt.key}`, evt.params);
  return evt.message;
}

export function winReasonText(state: Pick<MatchState, 'winReason' | 'winReasonKey' | 'winReasonParams'>): string {
  if (state.winReasonKey && hasKey(`win.${state.winReasonKey}`)) return t(`win.${state.winReasonKey}`, state.winReasonParams);
  return state.winReason || '';
}

/** Rebuild the rules' English action prompts in the current language. */
export function localizeActions(
  acts: ContextualActionPrompt[],
  state: MatchState,
  playerId: string
): ContextualActionPrompt[] {
  const map = MAPS[state.config.mapId];
  const me = state.players[playerId];
  const maxHide = state.config.maxHideDurationSeconds ?? 15;
  return acts.map((a) => {
    const spot = map.hidingSpots.find((s) => s.id === a.targetId);
    switch (a.action) {
      case 'hide':
        return { ...a, label: t('act.hide', { spot: spot?.label ?? '' }), sublabel: t('act.hideSub', { secs: maxHide }) };
      case 'exit_hide':
        return {
          ...a,
          label: t('act.exit', { secs: Math.ceil(me?.hideTimerRemaining ?? maxHide) }),
          sublabel: t('act.exitSub', { spot: spot?.label ?? '', max: maxHide }),
        };
      case 'objective': {
        const n = state.objectiveCompletedStages + 1;
        const total = state.config.objectiveTotalStages;
        const prog = (a.targetId && state.objectiveProgressById?.[a.targetId]) || 0;
        const secs = Math.ceil(state.config.objectiveStageDurationSeconds - prog);
        const isRelay = a.targetId !== map.objective.id;
        return {
          ...a,
          label: me?.interactingWithObjective ? t('act.transmitting', { n, total }) : t('act.holdBeacon', { n, total }),
          sublabel: t(isRelay ? 'act.beaconSubRelay' : 'act.beaconSub', { secs }),
        };
      }
      case 'eliminate':
        return {
          ...a,
          label: t('act.catch', { name: (a.targetId && state.players[a.targetId]?.name) || '' }),
          sublabel: t('act.catchSub'),
        };
      case 'inspect':
        return { ...a, label: t('act.search', { spot: spot?.label ?? '' }), sublabel: t('act.searchSub') };
      default:
        return a;
    }
  });
}
