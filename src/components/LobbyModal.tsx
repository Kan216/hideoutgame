import React, { useState } from 'react';
import { CHARACTER_SKINS, CharacterSkinId, MapId, MAPS } from '../game/maps';
import { MatchState, PlayerRole, validateGuestDisplayName } from '../game/rules';
import { soundFX } from '../game/sound';

interface LobbyModalProps {
  guestId: string;
  guestName: string;
  selectedSkin: CharacterSkinId;
  wsConnected: boolean;
  onlineRoomState: MatchState | null;
  errorBanner: string | null;
  onSelectSkin: (skin: CharacterSkinId) => void;
  onUpdateGuestName: (newName: string) => void;
  onCreateOnlineRoom: (
    mapId: MapId,
    seekerCount: 1 | 2,
    botCount: number
  ) => void;
  onJoinOnlineRoom: (roomCode: string) => void;
  onLeaveOnlineRoom: () => void;
  onConfigureOnlineRoom: (
    mapId: MapId,
    seekerCount: 1 | 2,
    botCount: number
  ) => void;
  onStartOnlineMatch: (preferredRole?: PlayerRole) => void;
  onStartLocalMatch: (
    mapId: MapId,
    seekerCount: 1 | 2,
    botCount: number,
    preferredRole: PlayerRole
  ) => void;
  onCloseToTitle: () => void;
}

export const LobbyModal: React.FC<LobbyModalProps> = ({
  guestId,
  guestName,
  selectedSkin,
  wsConnected,
  onlineRoomState,
  errorBanner,
  onSelectSkin,
  onUpdateGuestName,
  onCreateOnlineRoom,
  onJoinOnlineRoom,
  onLeaveOnlineRoom,
  onConfigureOnlineRoom,
  onStartOnlineMatch,
  onStartLocalMatch,
  onCloseToTitle,
}) => {
  const [nameInput, setNameInput] = useState(guestName);
  const [nameError, setNameError] = useState<string | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [selectedMap, setSelectedMap] = useState<MapId>(
    onlineRoomState?.config.mapId || 'downtown_plaza'
  );
  const [selectedSeekers, setSelectedSeekers] = useState<1 | 2>(
    onlineRoomState?.config.seekerCount || 1
  );
  const [botCount, setBotCount] = useState<number>(3);
  const [preferredRole, setPreferredRole] = useState<PlayerRole>('hider');

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const res = validateGuestDisplayName(nameInput);
    if (!res.valid) {
      setNameError(res.error || 'Invalid display name');
      return;
    }
    setNameError(null);
    onUpdateGuestName(res.sanitized);
  };

  const handleCopyRoomCode = () => {
    if (!onlineRoomState) return;
    navigator.clipboard?.writeText(onlineRoomState.roomCode).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyInviteLink = () => {
    if (!onlineRoomState) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${onlineRoomState.roomCode}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const isHost = onlineRoomState ? onlineRoomState.hostId === guestId : true;
  const playersList = onlineRoomState ? Object.values(onlineRoomState.players) : [];

  return (
    <div
      className="fixed inset-0 z-40 overflow-y-auto scroll-touch touch-pan-y overscroll-contain flex items-start sm:items-center justify-center p-2.5 sm:p-4 bg-[#070A12]/92"
      style={{
        paddingTop: 'max(0.6rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(0.6rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.6rem, env(safe-area-inset-right, 0px))',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lobby-heading"
    >
      <div className="w-full max-w-4xl bg-[#111827] border-2 border-slate-700 rounded-2xl p-4 sm:p-8 shadow-2xl text-slate-100 my-2 sm:my-auto max-h-[95vh] sm:max-h-[92vh] overflow-y-auto scroll-touch touch-pan-y">
        {/* Top Row: Title + Guest Identity Status + Back Button */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <h2 id="lobby-heading" className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-white">
              MATCH STAGING &amp; CHARACTER SELECT
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Guest Session Active · ID: <span className="font-mono text-slate-300">{guestId}</span> ·{' '}
              <span className={wsConnected ? 'text-emerald-400' : 'text-amber-400'}>
                {wsConnected ? 'Online Server Connected' : 'Offline Mode Ready'}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onCloseToTitle}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors whitespace-nowrap shrink-0"
          >
            Back to Title
          </button>
        </div>

        {(errorBanner || nameError) && (
          <div
            role="alert"
            className="mt-4 px-4 py-3 rounded-xl bg-red-950/90 border border-red-500/60 text-red-200 text-sm"
          >
            {nameError || errorBanner}
          </div>
        )}

        {/* Guest Profile Bar + Character Archetype Picker */}
        <div className="mt-5 bg-[#0B0F19] p-4 rounded-xl border border-slate-800 space-y-4">
          <form onSubmit={handleSaveName} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="guest-display-name" className="block text-xs font-medium text-slate-400 mb-1">
                Guest Display Name (2–18 chars, no password or email required)
              </label>
              <input
                id="guest-display-name"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={18}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
            <button
              type="submit"
              className="min-h-[44px] px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-medium text-sm border border-slate-700 transition-colors whitespace-nowrap shrink-0"
            >
              Update Name
            </button>
          </form>

          <div>
            <span className="block text-xs font-medium text-slate-400 mb-1.5">
              Select Character Sprite (Modern Interiors · Mystic Woods · Brackeys Knights &amp; Slimes)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {CHARACTER_SKINS.map((sk) => {
                const active = selectedSkin === sk.id;
                return (
                  <button
                    key={sk.id}
                    type="button"
                    onClick={() => {
                      soundFX.playUiTap();
                      onSelectSkin(sk.id);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-colors ${
                      active
                        ? 'bg-slate-800 border-emerald-400 text-white'
                        : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-display font-bold text-xs truncate">{sk.name}</div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">{sk.roleHint}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main 2-Column Split: Online Room vs Match Configuration */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column 1: Online Room With Friends */}
          <div className="bg-[#0B0F19] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-display font-bold text-white">
                01. Online Room with Friends
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Create an authoritative room code or join a friend&apos;s room across desktop, mobile, or browser.
              </p>

              {!onlineRoomState ? (
                <div className="mt-5 space-y-4">
                  <button
                    type="button"
                    onClick={() => onCreateOnlineRoom(selectedMap, selectedSeekers, botCount)}
                    className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm transition-colors"
                  >
                    Create Room &amp; Generate Code
                  </button>

                  <div className="pt-3 border-t border-slate-800">
                    <label htmlFor="join-room-code-input" className="block text-xs font-medium text-slate-400 mb-1.5">
                      Have an Invite Code? Enter 6-Character Room Code:
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="join-room-code-input"
                        type="text"
                        placeholder="e.g. K7M9P2"
                        value={joinCodeInput}
                        onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                        maxLength={6}
                        className="flex-1 min-h-[44px] px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono uppercase tracking-widest text-sm focus:outline-none focus:border-emerald-400"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (joinCodeInput.trim().length >= 4) {
                            onJoinOnlineRoom(joinCodeInput.trim());
                          }
                        }}
                        className="min-h-[44px] px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-display font-bold text-sm transition-colors whitespace-nowrap shrink-0"
                      >
                        Join Room
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {/* Active Room Code Banner */}
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-amber-500/40 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block">ACTIVE ROOM CODE</span>
                      <span
                        data-testid="active-room-code"
                        className="text-2xl font-mono font-bold tracking-widest text-amber-400"
                      >
                        {onlineRoomState.roomCode}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyRoomCode}
                        className="min-h-[44px] px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 cursor-pointer"
                      >
                        {copiedCode ? 'Copied Code!' : 'Copy Code'}
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyInviteLink}
                        className="min-h-[44px] px-3.5 py-2 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-xs font-medium text-emerald-200 border border-emerald-700/60 cursor-pointer"
                      >
                        {copiedLink ? 'Link Copied!' : '📋 Invite Link'}
                      </button>
                      <button
                        type="button"
                        onClick={onLeaveOnlineRoom}
                        className="min-h-[44px] px-3 py-2 rounded-lg bg-red-950/80 hover:bg-red-900 text-xs font-medium text-red-200 border border-red-800/60 cursor-pointer"
                      >
                        Leave
                      </button>
                    </div>
                  </div>

                  {/* Connected Players Roster */}
                  <div>
                    <div className="text-xs font-medium text-slate-400 mb-2">
                      Connected Players ({playersList.length})
                    </div>
                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {playersList.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-800 text-xs"
                        >
                          <span className="font-mono font-medium text-slate-200 truncate">
                            {p.name} {p.id === guestId ? '(You)' : ''}
                          </span>
                          <span className="text-slate-400">
                            {p.id === onlineRoomState.hostId
                              ? 'Host'
                              : p.isBot
                              ? 'AI Bot'
                              : p.connected
                              ? 'Ready'
                              : 'Disconnected'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {isHost ? (
                    <button
                      type="button"
                      onClick={() => onStartOnlineMatch(preferredRole)}
                      className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-base transition-colors"
                    >
                      Launch Online Match Now
                    </button>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-900 text-center text-xs text-amber-300">
                      Waiting for Room Host to launch the match...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Map, Seeker Count & Role Settings */}
          <div className="bg-[#0B0F19] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-lg font-display font-bold text-white">
                02. Map &amp; Ruleset Configuration
              </h3>

              {/* Map Selection */}
              <div>
                <span className="block text-xs font-medium text-slate-400 mb-1.5">
                  Select Playable Map (4 Maps · 76 Total Hiding Objects)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(
                    [
                      'downtown_plaza',
                      'harbor_district',
                      'modern_mall',
                      'mystic_sanctuary',
                    ] as const
                  ).map((mId) => {
                    const m = MAPS[mId];
                    const active =
                      (onlineRoomState ? onlineRoomState.config.mapId : selectedMap) === mId;
                    return (
                      <button
                        key={mId}
                        type="button"
                        disabled={!isHost}
                        onClick={() => {
                          soundFX.playUiTap();
                          setSelectedMap(mId);
                          if (onlineRoomState && isHost) {
                            onConfigureOnlineRoom(mId, selectedSeekers, botCount);
                          }
                        }}
                        className={`p-3 rounded-xl border text-left transition-colors ${
                          active
                            ? 'bg-slate-800/90 border-amber-400 text-white'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="font-display font-bold text-xs sm:text-sm truncate">{m.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                          {m.hidingSpots.length} Spots · Rec: {m.recommendedSeekers}{' '}
                          {m.recommendedSeekers === 1 ? 'Seeker' : 'Seekers'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seeker Count (1 vs 2 Seekers) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-xs font-medium text-slate-400 mb-1.5">
                    Seeker Count
                  </span>
                  <div className="flex gap-2">
                    {([1, 2] as const).map((cnt) => {
                      const active =
                        (onlineRoomState ? onlineRoomState.config.seekerCount : selectedSeekers) ===
                        cnt;
                      return (
                        <button
                          key={cnt}
                          type="button"
                          disabled={!isHost}
                          onClick={() => {
                            setSelectedSeekers(cnt);
                            if (onlineRoomState && isHost) {
                              onConfigureOnlineRoom(selectedMap, cnt, botCount);
                            }
                          }}
                          className={`flex-1 min-h-[44px] py-2 rounded-lg font-mono text-xs font-bold border transition-colors ${
                            active
                              ? 'bg-red-600/90 border-red-300 text-white'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          {cnt} {cnt === 1 ? 'Seeker' : 'Seekers'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Preferred Role */}
                <div>
                  <span className="block text-xs font-medium text-slate-400 mb-1.5">
                    Your Preferred Role
                  </span>
                  <div className="flex gap-2">
                    {(['hider', 'seeker'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setPreferredRole(r)}
                        className={`flex-1 min-h-[44px] py-2 rounded-lg font-mono text-xs font-bold uppercase border transition-colors ${
                          preferredRole === r
                            ? r === 'seeker'
                              ? 'bg-red-600/90 border-red-300 text-white'
                              : 'bg-emerald-600/90 border-emerald-300 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Companion / Opponent Bots Count */}
              <div>
                <span className="block text-xs font-medium text-slate-400 mb-1.5">
                  AI Squad Bots (For solo practice or filling rooms: {botCount} bots)
                </span>
                <div className="flex gap-2">
                  {[0, 1, 3, 5].map((b) => (
                    <button
                      key={b}
                      type="button"
                      disabled={!isHost}
                      onClick={() => {
                        setBotCount(b);
                        if (onlineRoomState && isHost) {
                          onConfigureOnlineRoom(selectedMap, selectedSeekers, b);
                        }
                      }}
                      className={`flex-1 min-h-[44px] py-2 rounded-lg font-mono text-xs font-bold border ${
                        botCount === b
                          ? 'bg-amber-500 text-slate-950 border-amber-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      {b === 0 ? '0 (Humans)' : `${b} Bots`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Instant Local Play CTA */}
            <div className="mt-5 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() =>
                  onStartLocalMatch(
                    selectedMap,
                    selectedSeekers,
                    Math.max(1, botCount),
                    preferredRole
                  )
                }
                className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 font-display font-bold text-sm transition-colors"
              >
                Start Instant Offline Match ({preferredRole.toUpperCase()} + {Math.max(1, botCount)} AI Bots)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
