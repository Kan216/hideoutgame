import React, { useEffect, useRef, useState } from 'react';
import { ContextualActionPrompt, POWER_INFO, PowerKind } from '../game/rules';

interface MobileControlsProps {
  visible: boolean;
  role: 'hider' | 'seeker';
  sensitivity: number;
  contextualActions: ContextualActionPrompt[];
  isHoldingObjective: boolean;
  onJoystickMove: (x: number, y: number) => void;
  onTriggerAction: (action: ContextualActionPrompt) => void;
  onHoldObjectiveChange: (holding: boolean) => void;
  onSendEmote?: (text: string) => void;
  /** Hider sprint burst */
  showSprint?: boolean;
  sprintCooldown?: number;
  sprinting?: boolean;
  onSprint?: () => void;
  /** Eaten snack power */
  heldPower?: PowerKind | null;
  heldCharges?: number;
  activePowerLabel?: string | null;
  onUsePower?: () => void;
}

const QUICK_EMOTES = ['👋 Hey!', '👀 Spotted!', '🏃 Run!', '🆘 Help!', '🏆 GG', '🤫 Shh!'];

export const MobileControls: React.FC<MobileControlsProps> = ({
  visible,
  role,
  sensitivity,
  contextualActions,
  isHoldingObjective,
  onJoystickMove,
  onTriggerAction,
  onHoldObjectiveChange,
  onSendEmote,
  showSprint = false,
  sprintCooldown = 0,
  sprinting = false,
  onSprint,
  heldPower = null,
  heldCharges = 0,
  activePowerLabel = null,
  onUsePower,
}) => {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [showEmotes, setShowEmotes] = useState(false);

  // The callout bar closes itself so it never stays over the game
  useEffect(() => {
    if (!showEmotes) return;
    const t = setTimeout(() => setShowEmotes(false), 4000);
    return () => clearTimeout(t);
  }, [showEmotes]);

  if (!visible) return null;

  const maxRadius = 44;

  const updateVectorFromClientXY = (clientX: number, clientY: number) => {
    if (!baseRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = (clientX - centerX) * sensitivity;
    const dy = (clientY - centerY) * sensitivity;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const kx = dist > 2 ? Math.cos(angle) * clampedDist : 0;
    const ky = dist > 2 ? Math.sin(angle) * clampedDist : 0;
    setKnobOffset({ x: kx, y: ky });
    onJoystickMove(kx / maxRadius, ky / maxRadius);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    updateVectorFromClientXY(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    e.stopPropagation();
    updateVectorFromClientXY(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setDragging(false);
    setKnobOffset({ x: 0, y: 0 });
    onJoystickMove(0, 0);
  };

  return (
    <div
      className="fixed inset-0 pointer-events-none z-30 flex items-end justify-between px-3 pb-2.5 sm:px-8 sm:pb-6"
      style={{
        paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
      }}
      aria-label="Mobile touch controls"
    >
      {/* Left Side: Virtual Thumb Joystick */}
      <div
        ref={baseRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        role="slider"
        aria-label="Virtual movement joystick"
        aria-valuetext={`${Math.round((knobOffset.x / maxRadius) * 100)}% X, ${Math.round(
          (knobOffset.y / maxRadius) * 100
        )}% Y`}
        tabIndex={-1}
        className="pointer-events-auto relative w-24 h-24 sm:w-28 sm:h-28 short:w-[88px]! short:h-[88px]! rounded-full bg-[#090D16]/85 border-2 border-slate-600/80 shadow-[0_8px_24px_rgba(0,0,0,0.65)] flex items-center justify-center touch-none select-none"
      >
        {/* Crosshair directional ticks */}
        <div className="w-16 h-0.5 bg-slate-700/50 absolute pointer-events-none" />
        <div className="h-16 w-0.5 bg-slate-700/50 absolute pointer-events-none" />
        {/* Thumb Knob */}
        <div
          style={{
            transform: `translate3d(${knobOffset.x}px, ${knobOffset.y}px, 0)`,
          }}
          className={`w-10 h-10 sm:w-12 sm:h-12 short:w-9! short:h-9! rounded-full border-2 shadow-md transition-transform duration-75 pointer-events-none ${
            role === 'seeker'
              ? 'bg-red-600/90 border-red-300'
              : 'bg-emerald-600/90 border-emerald-300'
          }`}
        />
      </div>

      {/* Right Side: Quick Emotes Drawer & Contextual Role Action Buttons */}
      <div className="pointer-events-auto flex flex-col items-end gap-1.5 sm:gap-2.5 short:gap-1.5!">
        {/* Quick Emote Drawer */}
        {showEmotes && onSendEmote && (
          <div className="bg-[#090D16]/90 border border-slate-700 rounded-xl p-1 shadow-xl flex items-center gap-1">
            {QUICK_EMOTES.map((em) => (
              <button
                key={em}
                type="button"
                aria-label={em}
                title={em}
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.vibrate?.(12);
                  onSendEmote(em);
                  setShowEmotes(false);
                }}
                className="w-9 h-9 rounded-lg bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-base border border-slate-700 flex items-center justify-center"
              >
                {em.split(' ')[0]}
              </button>
            ))}
          </div>
        )}

        {/* Emote Drawer Toggle Button */}
        {onSendEmote && (
          <button
            type="button"
            aria-label="Quick Callouts"
            onClick={(e) => {
              e.stopPropagation();
              setShowEmotes(!showEmotes);
            }}
            className="h-8 sm:h-10 short:h-8! px-2.5 sm:px-3 short:px-2! rounded-lg sm:rounded-xl short:rounded-lg! bg-[#090D16]/90 border border-slate-700 hover:bg-slate-800 text-[11px] sm:text-xs font-mono font-bold text-amber-300 shadow flex items-center gap-1.5"
          >
            <span>💬</span>
            <span className="text-[10px] sm:text-[11px] font-sans short:hidden">Callout</span>
          </button>
        )}

        {(heldPower || activePowerLabel) && (
          <div className="flex items-center gap-1.5">
            {activePowerLabel && (
              <span className="px-2 py-1 rounded-lg bg-[#090D16]/90 border border-violet-400/60 text-[11px] font-mono font-bold text-violet-100 shadow">
                {activePowerLabel}
              </span>
            )}
            {heldPower && (
              <button
                type="button"
                aria-label={`Use ${POWER_INFO[heldPower].power}`}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onUsePower?.();
                }}
                className="relative w-[58px] h-[58px] sm:w-[64px] sm:h-[64px] short:w-[50px]! short:h-[50px]! rounded-2xl border-2 shadow-xl flex flex-col items-center justify-center active:scale-95 transition-transform bg-violet-700/95 border-violet-200 text-white animate-pulse"
              >
                <span className="text-2xl short:text-xl leading-none">{POWER_INFO[heldPower].icon}</span>
                <span className="text-[9px] font-display font-bold leading-tight short:hidden">USE</span>
                {heldCharges > 1 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold flex items-center justify-center border border-slate-900">
                    {heldCharges}
                  </span>
                )}
              </button>
            )}
          </div>
        )}

        {showSprint && (
          <button
            type="button"
            aria-label="Sprint"
            disabled={sprintCooldown > 0 && !sprinting}
            onPointerDown={(e) => {
              e.stopPropagation();
              navigator.vibrate?.(15);
              onSprint?.();
            }}
            className={`relative w-[58px] h-[58px] sm:w-[68px] sm:h-[68px] short:w-[50px]! short:h-[50px]! short:text-[9px]! rounded-full border-2 shadow-xl font-display font-bold text-[11px] flex flex-col items-center justify-center active:scale-95 transition-transform overflow-hidden ${
              sprinting
                ? 'bg-sky-400 text-slate-950 border-sky-100'
                : sprintCooldown > 0
                ? 'bg-slate-800/90 text-slate-400 border-slate-600'
                : 'bg-sky-600 text-white border-sky-300'
            }`}
          >
            <span className="text-lg leading-none">⚡</span>
            <span>{sprinting ? 'GO!' : sprintCooldown > 0 ? `${Math.ceil(sprintCooldown)}s` : 'SPRINT'}</span>
          </button>
        )}

        {contextualActions.map((act) => {
          const isObj = act.action === 'objective';
          const isElim = act.action === 'eliminate';
          const isInspect = act.action === 'inspect';

          if (isObj) {
            return (
              <button
                key={act.action}
                type="button"
                aria-label={act.label}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  navigator.vibrate?.(20);
                  onHoldObjectiveChange(true);
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  onHoldObjectiveChange(false);
                }}
                onPointerLeave={() => {
                  if (isHoldingObjective) onHoldObjectiveChange(false);
                }}
                onClick={() => {
                  navigator.vibrate?.(20);
                  onHoldObjectiveChange(!isHoldingObjective);
                }}
                className={`min-h-[46px] sm:min-h-[56px] min-w-[140px] sm:min-w-[168px] px-4 sm:px-5 py-2 sm:py-3 short:min-h-[40px]! short:min-w-[120px]! short:px-3! short:py-1.5! short:text-xs! short:rounded-xl! rounded-xl sm:rounded-2xl font-display font-bold text-xs sm:text-sm tracking-wide border-2 shadow-xl active:scale-95 transition-transform flex flex-col items-center justify-center ${
                  isHoldingObjective
                    ? 'bg-emerald-500 text-slate-950 border-emerald-200'
                    : 'bg-amber-500 text-slate-950 border-amber-200'
                }`}
              >
                <span>{isHoldingObjective ? 'HOLDING BEACON...' : 'HOLD BEACON'}</span>
                <span className="text-[10px] sm:text-[11px] font-mono opacity-90 short:hidden">{act.sublabel}</span>
              </button>
            );
          }

          return (
            <button
              key={`${act.action}_${act.targetId || ''}`}
              type="button"
              aria-label={act.label}
              onClick={(e) => {
                e.stopPropagation();
                navigator.vibrate?.(25);
                onTriggerAction(act);
              }}
              className={`min-h-[46px] sm:min-h-[56px] min-w-[140px] sm:min-w-[164px] px-4 sm:px-5 py-2 sm:py-3 short:min-h-[40px]! short:min-w-[120px]! short:px-3! short:py-1.5! short:text-xs! short:rounded-xl! rounded-xl sm:rounded-2xl font-display font-bold text-xs sm:text-sm tracking-wide border-2 shadow-xl active:scale-95 transition-transform flex flex-col items-center justify-center ${
                isElim
                  ? 'bg-red-600 text-white border-red-300'
                  : isInspect
                  ? 'bg-amber-500 text-slate-950 border-amber-200'
                  : 'bg-emerald-600 text-white border-emerald-300'
              }`}
            >
              <span>
                {act.action === 'hide'
                  ? 'HIDE INSIDE'
                  : act.action === 'exit_hide'
                  ? 'EXIT HIDING'
                  : act.action === 'eliminate'
                  ? 'CATCH HIDER'
                  : 'SEARCH OBJECT'}
              </span>
              <span className="text-[10px] sm:text-[11px] font-sans font-medium opacity-90 truncate max-w-[160px] short:hidden">
                {act.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
