import React from 'react';
import { RotateCcw, Home, Trophy, Sparkles } from 'lucide-react';
import { soundService } from '../../infrastructure/soundService';

export interface GameOverModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  winnerName?: string;
  onPlayAgain: () => void;
  onExitHome: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  title = '¡Partida terminada!',
  description,
  winnerName,
  onPlayAgain,
  onExitHome,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-[calc(1rem+env(safe-area-inset-bottom,0px))] bg-black/75 select-none"
      data-testid="game-over-modal"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-[20px] border border-border-strong bg-surface p-6 space-y-5 shadow-modal text-center max-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-2rem)] overflow-y-auto scroll-container">
        <div
          className={`w-14 h-14 mx-auto rounded-2xl border flex items-center justify-center ${
            winnerName
              ? 'bg-warning-quiet border-warning-line text-warning'
              : 'bg-selected border-action/30 text-action'
          }`}
        >
          {winnerName ? <Trophy className="w-7 h-7" /> : <Sparkles className="w-7 h-7" />}
        </div>

        <div className="space-y-1.5">
          <h2 className="font-heading text-xl font-extrabold text-text">
            {winnerName ? `¡Ganó ${winnerName}!` : title}
          </h2>
          <p className="text-xs text-text-secondary leading-relaxed selectable">
            {description ||
              (winnerName
                ? '¡Ha alcanzado la meta del tablero!'
                : 'Se han completado todas las cartas de la previa.')}
          </p>
        </div>

        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={() => {
              soundService.playTap();
              onPlayAgain();
            }}
            className="w-full min-h-[48px] py-3 px-4 rounded-2xl bg-action text-action-ink font-heading font-extrabold text-sm interactive-action active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus transition-all cursor-pointer flex items-center justify-center gap-2"
            data-testid="game-over-play-again-btn"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Jugar de nuevo</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundService.playTap();
              onExitHome();
            }}
            className="w-full min-h-[44px] py-3 px-4 rounded-2xl border border-border bg-surface-muted text-text font-semibold text-xs interactive-surface active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus transition-all cursor-pointer flex items-center justify-center gap-1.5"
            data-testid="game-over-exit-home-btn"
          >
            <Home className="w-4 h-4 text-text-muted" />
            <span>Volver al inicio</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverModal;
