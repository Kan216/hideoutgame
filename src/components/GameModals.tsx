import React, { useState } from 'react';
import { PlayerRole, POWER_INFO, POWER_KINDS } from '../game/rules';
import { t, rich, useLang, setLang, powerSnack, powerName, powerDesc } from '../i18n';

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
  const lang = useLang();
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
          {t('pause.title')}
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          {t('pause.subtitle')}
        </p>

        {/* Settings Controls */}
        <div className="mt-5 space-y-4 bg-[#0B0F19] p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">{t('pause.sound')}</span>
            <button
              type="button"
              onClick={onToggleMute}
              className="min-h-[44px] px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-amber-300 border border-slate-700"
            >
              {muted ? t('pause.muted') : t('pause.audioOn')}
            </button>
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-300 mb-1.5">
              {t('pause.touch')}
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
                  {t(`pause.touch.${m}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="sensitivity-slider" className="flex justify-between text-xs font-medium text-slate-300 mb-1">
              <span>{t('pause.sensitivity')}</span>
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
            <span className="text-xs font-medium text-slate-300">{t('pause.display')}</span>
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
              {t('pause.fullscreen')}
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <span className="text-xs font-medium text-slate-300">🌐 {t('lang.label')}</span>
            <div className="flex gap-1.5">
              {(['en', 'my'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-bold border cursor-pointer ${
                    lang === l
                      ? 'bg-violet-600 text-white border-violet-300'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  {l === 'en' ? 'English' : 'မြန်မာ'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full min-h-[48px] py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-sm transition-colors"
          >
            {t('pause.resume')}
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full min-h-[48px] py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm transition-colors"
          >
            {t('pause.restart')}
          </button>
          <button
            type="button"
            onClick={onExitToTitle}
            className="w-full min-h-[48px] py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-display font-bold text-sm transition-colors"
          >
            {t('pause.leave')}
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
    const text = t('over.shareText', {
      result: playerWon ? t('over.shareWin') : t('over.shareLose'),
      role: snapshot.localRole === 'seeker' ? t('hud.seeker') : t('hud.hider'),
      secs: Math.round(snapshot.elapsedSeconds),
      n: snapshot.stagesCompleted,
      total: snapshot.totalStages,
      url: typeof window !== 'undefined' ? window.location.origin : '',
    });
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
          {snapshot.winner === 'hiders' ? t('over.hidersWin') : t('over.seekersWin')}
        </div>
        <h2
          id="gameover-modal-title"
          className={`text-3xl sm:text-4xl font-display font-extrabold tracking-tight mt-1 ${
            playerWon ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          {playerWon ? t('over.victory') : t('over.defeat')}
        </h2>
        <p className="text-sm text-slate-300 mt-1.5">{snapshot.winReason}</p>

        {/* 3 Tabular-Nums Stat Tiles */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="bg-[#0B0F19] border border-slate-800 rounded-xl p-3.5">
            <div className="text-[11px] font-mono uppercase text-slate-400">{t('over.stages')}</div>
            <div className="text-2xl font-mono font-bold text-emerald-400 tabular-nums mt-1">
              {snapshot.stagesCompleted}/{snapshot.totalStages}
            </div>
          </div>
          <div className="bg-[#0B0F19] border border-slate-800 rounded-xl p-3.5">
            <div className="text-[11px] font-mono uppercase text-slate-400">{t('over.time')}</div>
            <div className="text-2xl font-mono font-bold text-amber-400 tabular-nums mt-1">
              {Math.round(snapshot.elapsedSeconds)}s
            </div>
          </div>
          <div className="bg-[#0B0F19] border border-slate-800 rounded-xl p-3.5">
            <div className="text-[11px] font-mono uppercase text-slate-400">
              {snapshot.localRole === 'seeker' ? t('over.elims') : t('over.alive')}
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
            {t('over.again')}
          </button>
          <button
            type="button"
            onClick={handleCopyStats}
            className="min-h-[48px] px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-display font-bold text-sm border border-amber-500/40 transition-colors cursor-pointer"
          >
            {copiedStats ? t('over.copied') : t('over.share')}
          </button>
          <button
            type="button"
            onClick={onOpenLobby}
            className="min-h-[48px] px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-display font-bold text-sm transition-colors cursor-pointer"
          >
            {t('over.lobby')}
          </button>
          <button
            type="button"
            onClick={onExitToTitle}
            className="min-h-[48px] px-3.5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 font-display font-bold text-sm transition-colors cursor-pointer"
          >
            {t('over.menu')}
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
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <h2 id="howto-title" className="text-xl sm:text-2xl font-display font-extrabold text-white">
            {t('how.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 shrink-0"
          >
            {t('how.close')}
          </button>
        </div>

        <div className="mt-5 space-y-4 text-sm text-slate-300 leading-relaxed">
          <div className="p-4 rounded-xl bg-[#0B0F19] border border-slate-800">
            <h3 className="font-display font-bold text-emerald-400 text-base">{t('how.h1')}</h3>
            <p className="mt-1 text-xs sm:text-sm text-slate-300">{rich(t('how.p1'))}</p>
          </div>

          <div className="p-4 rounded-xl bg-[#0B0F19] border border-slate-800">
            <h3 className="font-display font-bold text-amber-400 text-base">{t('how.h2')}</h3>
            <p className="mt-1 text-xs sm:text-sm text-slate-300">{rich(t('how.p2'))}</p>
          </div>

          <div className="p-4 rounded-xl bg-[#0B0F19] border border-slate-800">
            <h3 className="font-display font-bold text-violet-300 text-base">{rich(t('how.h3'))}</h3>
            <ul className="mt-1 text-xs sm:text-sm text-slate-300 space-y-0.5">
              {POWER_KINDS.map((k) => (
                <li key={k}>
                  {POWER_INFO[k].icon} <strong>{powerSnack(k)}</strong> — {powerName(k)}: {powerDesc(k)}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-[11px] text-slate-400">{t('how.p3')}</p>
          </div>

          <div className="p-4 rounded-xl bg-[#0B0F19] border border-slate-800">
            <h3 className="font-display font-bold text-red-400 text-base">{t('how.h4')}</h3>
            <p className="mt-1 text-xs sm:text-sm text-slate-300">{rich(t('how.p4'))}</p>
          </div>

          <div className="p-4 rounded-xl bg-[#0B0F19] border border-slate-800">
            <h3 className="font-display font-bold text-sky-400 text-base">{t('how.h5')}</h3>
            <p className="mt-1 text-xs sm:text-sm text-slate-300">{t('how.p5')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
