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
  title = '¡Partida Terminada!',
  description,
  winnerName,
  onPlayAgain,
  onExitHome,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none"
      data-testid="game-over-modal"
    >
      <div className="w-full max-w-sm rounded-3xl border theme-border bg-[var(--bg-surface)] p-6 space-y-5 shadow-2xl text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] flex items-center justify-center">
          {winnerName ? <Trophy className="w-7 h-7" /> : <Sparkles className="w-7 h-7" />}
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-black theme-text-primary">
            {winnerName ? `¡Ganó ${winnerName}!` : title}
          </h2>
          <p className="text-xs theme-text-muted leading-relaxed">
            {description ||
              (winnerName
                ? '¡Ha alcanzado la meta del tablero!'
                : 'Se han completado todas las cartas de la previa.')}
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <button
            onClick={() => {
              soundService.playTap();
              onPlayAgain();
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white font-black text-xs uppercase tracking-wider shadow-[var(--glow-shadow)] hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center justify-center space-x-2 min-h-[44px]"
            data-testid="game-over-play-again-btn"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Jugar de nuevo</span>
          </button>

          <button
            onClick={() => {
              soundService.playTap();
              onExitHome();
            }}
            className="w-full py-3 px-4 rounded-2xl border theme-border bg-[var(--bg-elevated)] theme-text-muted hover:text-white font-bold text-xs uppercase tracking-wider hover:border-[var(--accent-primary)] transition-all cursor-pointer flex items-center justify-center space-x-1.5 min-h-[44px]"
            data-testid="game-over-exit-home-btn"
          >
            <Home className="w-4 h-4" />
            <span>Volver al inicio</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverModal;
