import React, { useState } from 'react';
import { PlayerRole } from '../game/rules';

export interface EndOfRunStatsSnapshot {
  winner: 'hiders' | 'seekers';
  winReason: string;
  localRole: PlayerRole;
  localAlive: boolean;
  elapsedSeconds: number;
  stagesCompleted: number;
  totalStages: number;
  livingHidersCount: number;
  totalHidersCount: number;
  eliminationsCount: number;
  inspectionsCount: number;
}

interface PauseModalProps {
  muted: boolean;
  touchMode: 'auto' | 'on' | 'off';
  joystickSensitivity: number;
  onToggleMute: () => void;
  onChangeTouchMode: (mode: 'auto' | 'on' | 'off') => void;
  onChangeSensitivity: (val: number) => void;
  onResume: () => void;
  onRestart: () => void;
  onExitToTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  muted,
  touchMode,
  joystickSensitivity,
  onToggleMute,
  onChangeTouchMode,
  onChangeSensitivity,
  onResume,
  onRestart,
  onExitToTitle,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto scroll-touch touch-pan-y overscroll-contain flex items-start sm:items-center justify-center p-2.5 sm:p-4 bg-[#070A12]/90"
      style={{
        paddingTop: 'max(0.6rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(0.6rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.6rem, env(safe-area-inset-right, 0px))',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-modal-title"
    >
      <div className="w-full max-w-md bg-[#111827] border-2 border-slate-700 rounded-2xl p-4 sm:p-6 shadow-2xl text-slate-100 my-2 sm:my-auto max-h-[95vh] sm:max-h-[92vh] overflow-y-auto scroll-touch touch-pan-y">
        <h2 id="pause-modal-title" className="text-2xl font-display font-extrabold text-white tracking-tight">
          GAME PAUSED
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Adjust controls or resume the urban hide-and-seek match.
        </p>

        {/* Settings Controls */}
        <div className="mt-5 space-y-4 bg-[#0B0F19] p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">Sound Synthesizer</span>
            <button
              type="button"
              onClick={onToggleMute}
              className="min-h-[44px] px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-amber-300 border border-slate-700"
            >
              {muted ? 'MUTED (OFF)' : 'AUDIO ON'}
            </button>
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-300 mb-1.5">
              Mobile On-Screen Touch Controls
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(['auto', 'on', 'off'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onChangeTouchMode(m)}
                  className={`min-h-[44px] py-2 rounded-lg font-mono text-xs font-bold uppercase border ${
                    touchMode === m
                      ? 'bg-emerald-600 text-white border-emerald-300'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="sensitivity-slider" className="flex justify-between text-xs font-medium text-slate-300 mb-1">
              <span>Joystick Sensitivity</span>
              <span className="font-mono text-amber-300">{joystickSensitivity.toFixed(1)}x</span>
            </label>
            <input
              id="sensitivity-slider"
              type="range"
              min="0.6"
              max="1.6"
              step="0.1"
              value={joystickSensitivity}
              onChange={(e) => onChangeSensitivity(parseFloat(e.target.value))}
              className="w-full accent-amber-400"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <span className="text-xs font-medium text-slate-300">Display Mode</span>
            <button
              type="button"
              onClick={() => {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch(() => {});
                } else {
                  document.exitFullscreen().catch(() => {});
                }
              }}
              className="min-h-[44px] px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-sky-300 border border-slate-700 cursor-pointer"
            >
              ⛶ Toggle Fullscreen
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full min-h-[48px] py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-sm transition-colors"
          >
            Resume Match
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full min-h-[48px] py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm transition-colors"
          >
            Restart Round
          </button>
          <button
            type="button"
            onClick={onExitToTitle}
            className="w-full min-h-[48px] py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-display font-bold text-sm transition-colors"
          >
            Leave Session to Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};

interface GameOverModalProps {
  snapshot: EndOfRunStatsSnapshot;
  onPlayAgain: () => void;
  onOpenLobby: () => void;
  onExitToTitle: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  snapshot,
  onPlayAgain,
  onOpenLobby,
  onExitToTitle,
}) => {
  const playerWon =
    (snapshot.localRole === 'hider' && snapshot.winner === 'hiders') ||
    (snapshot.localRole === 'seeker' && snapshot.winner === 'seekers');

  const [copiedStats, setCopiedStats] = useState(false);

  const handleCopyStats = () => {
    const text = `🎮 CITY HIDEOUT Match Result:\n${
      playerWon ? '🏆 VICTORY' : '💀 DEFEAT'
    } as ${snapshot.localRole.toUpperCase()}!\n⏱️ Match Time: ${Math.round(
      snapshot.elapsedSeconds
    )}s | Beacon Stages: ${snapshot.stagesCompleted}/${snapshot.totalStages}\nPlay now: ${
      typeof window !== 'undefined' ? window.location.origin : ''
    }`;
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedStats(true);
    setTimeout(() => setCopiedStats(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto scroll-touch touch-pan-y overscroll-contain flex items-start sm:items-center justify-center p-2.5 sm:p-4 bg-[#070A12]/92"
      style={{
        paddingTop: 'max(0.6rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(0.6rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.6rem, env(safe-area-inset-right, 0px))',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gameover-modal-title"
    >
      <div className="w-full max-w-lg bg-[#111827] border-2 border-slate-700 rounded-2xl p-4 sm:p-8 shadow-2xl text-slate-100 my-2 sm:my-auto max-h-[95vh] sm:max-h-[92vh] overflow-y-auto scroll-touch touch-pan-y">
        <div className="text-xs font-mono uppercase tracking-widest text-amber-400">
          {snapshot.winner === 'hiders' ? 'HIDER TEAM VICTORY' : 'SEEKER TEAM VICTORY'}
        </div>
        <h2
          id="gameover-modal-title"
          className={`text-3xl sm:text-4xl font-display font-extrabold tracking-tight mt-1 ${
            playerWon ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          {playerWon ? 'VICTORY — MISSION COMPLETE' : 'DEFEAT — MATCH OVER'}
        </h2>
        <p className="text-sm text-slate-300 mt-1.5">{snapshot.winReason}</p>

        {/* 3 Tabular-Nums Stat Tiles */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="bg-[#0B0F19] border border-slate-800 rounded-xl p-3.5">
            <div className="text-[11px] font-mono uppercase text-slate-400">BEACON STAGES</div>
            <div className="text-2xl font-mono font-bold text-emerald-400 tabular-nums mt-1">
              {snapshot.stagesCompleted}/{snapshot.totalStages}
            </div>
          </div>
          <div className="bg-[#0B0F19] border border-slate-800 rounded-xl p-3.5">
            <div className="text-[11px] font-mono uppercase text-slate-400">MATCH TIME</div>
            <div className="text-2xl font-mono font-bold text-amber-400 tabular-nums mt-1">
              {Math.round(snapshot.elapsedSeconds)}s
            </div>
          </div>
          <div className="bg-[#0B0F19] border border-slate-800 rounded-xl p-3.5">
            <div className="text-[11px] font-mono uppercase text-slate-400">
              {snapshot.localRole === 'seeker' ? 'ELIMINATIONS' : 'HIDERS ALIVE'}
            </div>
            <div className="text-2xl font-mono font-bold text-sky-400 tabular-nums mt-1">
              {snapshot.localRole === 'seeker'
                ? snapshot.eliminationsCount
                : `${snapshot.livingHidersCount}/${snapshot.totalHidersCount}`}
            </div>
          </div>
        </div>

        {/* Primary Action CTAs */}
        <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            data-start="true"
            onClick={onPlayAgain}
            className="flex-1 min-h-[48px] px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-sm transition-colors cursor-pointer"
          >
            Play Again
          </button>
          <button
            type="button"
            onClick={handleCopyStats}
            className="min-h-[48px] px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-display font-bold text-sm border border-amber-500/40 transition-colors cursor-pointer"
          >
            {copiedStats ? 'Copied Stats!' : '📋 Share Stats'}
          </button>
          <button
            type="button"
            onClick={onOpenLobby}
            className="min-h-[48px] px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-display font-bold text-sm transition-colors cursor-pointer"
          >
            Lobby
          </button>
          <button
            type="button"
            onClick={onExitToTitle}
            className="min-h-[48px] px-3.5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 font-display font-bold text-sm transition-colors cursor-pointer"
          >
            Menu
          </button>
        </div>
      </div>
    </div>
  );
};

interface HowToPlayModalProps {
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto scroll-touch touch-pan-y overscroll-contain flex items-start sm:items-center justify-center p-2.5 sm:p-4 bg-[#070A12]/92"
      style={{
        paddingTop: 'max(0.6rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(0.6rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.6rem, env(safe-area-inset-right, 0px))',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="howto-title"
    >
      <div className="w-full max-w-2xl bg-[#111827] border-2 border-slate-700 rounded-2xl p-4 sm:p-8 shadow-2xl text-slate-100 my-2 sm:my-auto max-h-[95vh] sm:max-h-[92vh] overflow-y-auto scroll-touch touch-pan-y">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h2 id="howto-title" className="text-2xl font-display font-extrabold text-white">
            HOW TO PLAY — CITY HIDEOUT
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200"
          >
            Close
          </button>
        </div>

        <div className="mt-5 space-y-4 text-sm text-slate-300 leading-relaxed">
          <div className="p-4 rounded-xl bg-[#0B0F19] border border-slate-800">
            <h3 className="font-display font-bold text-emerald-400 text-base">
              1. HIDER TEAM RULES (100% Speed · 10s Head Start · 15s Max Hide · ⚡ Sprint)
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-slate-300">
              Spawn in the City Center and use the <strong>10-second countdown</strong> to find cover. Press <span className="font-mono text-amber-300">E</span> (or tap <strong>HIDE</strong>) next to any hiding object. While hidden <strong>you cannot be caught</strong>, but you may only stay <strong>15 seconds</strong> once the hunt starts — the object starts <strong>rustling</strong> 3s before you are forced out. After leaving any spot you must <strong>catch your breath for 3s</strong> before hiding again. Press <span className="font-mono text-amber-300">SHIFT</span> (or tap <strong>⚡ SPRINT</strong>) for a short burst faster than the Seeker — use it to break line of sight.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0B0F19] border border-slate-800">
            <h3 className="font-display font-bold text-amber-400 text-base">
              2. BUILD THE ESCAPE SIGNAL (2 beacons · 3 tiers × 15s)
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-slate-300">
              Hold <span className="font-mono text-amber-300">F</span> (or tap <strong>HOLD BEACON</strong>) at the <strong>City-Center Beacon</strong> or the far-corner <strong>Relay</strong>. Every <strong>15 uninterrupted seconds</strong> builds one tier of the signal tower — build <strong>3 tiers</strong> to escape. Leaving resets only the tier under construction. After 6s the antenna starts <strong>humming</strong>, which Seekers can hear from far away. If the clock runs out, hiders win only if at least one tier was built.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0B0F19] border border-slate-800">
            <h3 className="font-display font-bold text-red-400 text-base">
              3. SEEKER TEAM RULES (120% Speed · Limited Vision · Search &amp; Catch)
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-slate-300">
              Released after the 10-second countdown at <strong>1.2× speed</strong>. You only see what is in your <strong>line of sight</strong> — watch for noise rings (doors opening, rustling objects, humming beacons). Press <span className="font-mono text-amber-300">E / Space</span> next to an object to <strong>Search</strong> it: anyone inside is <strong>flushed out</strong>, briefly stunned and revealed — but searching takes you a moment too. Catch hiders in the open with <span className="font-mono text-amber-300">E / Space</span>.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0B0F19] border border-slate-800">
            <h3 className="font-display font-bold text-sky-400 text-base">
              4. GUEST PRIVACY & PERSISTENCE GUARANTEES
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-slate-300">
              Guest play requires zero email, password, or personal data. Your guest session token and local match stats are stored in your device&apos;s browser storage so you can reconnect to active rooms. Clearing browser data, uninstalling, or switching devices will reset your local guest profile.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
