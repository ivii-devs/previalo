import React, { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Beer, Target, RotateCcw, Home } from 'lucide-react';
import { useGameSessionStore } from '../../application/useGameSessionStore';
import { usePlayerStore } from '../../application/usePlayerStore';
import { soundService } from '../../infrastructure/soundService';
import { useDragToScroll } from '../hooks/useDragToScroll';

export interface PodiumScreenProps {
  onPlayAgain: () => void;
  onExitHome: () => void;
}

export const PodiumScreen: React.FC<PodiumScreenProps> = ({
  onPlayAgain,
  onExitHome,
}) => {
  const storeWinner = useGameSessionStore((state) => state.winner);
  const winner = storeWinner || useGameSessionStore.getState().winner;
  const endSession = useGameSessionStore((state) => state.endSession);
  const storePlayers = usePlayerStore((state) => state.players);
  const players = storePlayers.length > 0 ? storePlayers : usePlayerStore.getState().players;
  const resetPlayerStats = usePlayerStore((state) => state.resetPlayerStats);

  // Trigger celebration confetti & victory fanfare
  useEffect(() => {
    soundService.playVictory();

    // First confetti blast
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#ec4899', '#06b6d4', '#8b5cf6', '#f59e0b', '#10b981'],
      });

      // Second burst after 400ms
      const timer = setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 100,
          origin: { y: 0.5 },
          colors: ['#ec4899', '#06b6d4', '#8b5cf6', '#f59e0b', '#10b981'],
        });
      }, 400);

      return () => clearTimeout(timer);
    } catch {
      // Confetti fallback for non-canvas environments
    }
  }, []);

  // Compute stats: Más Bebedor (max sips) & Más Buscado (max targeted)
  const sortedBySips = [...players].sort((a, b) => (b.sips ?? 0) - (a.sips ?? 0));
  const maxDrinker = sortedBySips[0];

  const sortedByTargeted = [...players].sort(
    (a, b) => (b.timesTargeted ?? b.targetCount ?? 0) - (a.timesTargeted ?? a.targetCount ?? 0)
  );
  const mostTargeted = sortedByTargeted[0];

  const handlePlayAgain = () => {
    soundService.playTap();
    resetPlayerStats();
    endSession();
    onPlayAgain();
  };

  const handleHome = () => {
    soundService.playTap();
    endSession();
    onExitHome();
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  useDragToScroll(scrollRef);

  return (
    <div
      ref={scrollRef}
      className="flex-1 min-h-0 h-full flex flex-col w-full max-w-md mx-auto justify-between px-4 pt-4 pb-[calc(3rem+env(safe-area-inset-bottom,20px))] space-y-4 overflow-y-auto select-none scroll-container"
      data-testid="podium-screen"
    >
      {/* Top Banner Celebration */}
      <div className="flex flex-col items-center text-center space-y-2 shrink-0 pt-2">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-yellow-400 to-amber-500 text-slate-950 flex items-center justify-center shadow-[0_0_25px_rgba(250,204,21,0.5)] animate-bounce">
          <Trophy className="w-9 h-9" />
        </div>

        <div className="space-y-0.5">
          <span className="text-xs font-black uppercase tracking-wider text-yellow-400">
            ¡FIN DE LA PREVIA!
          </span>
          <h1 className="text-2xl font-black theme-text-primary">
            {winner ? `¡Ganó ${winner.name}!` : 'Podio de la Previa'}
          </h1>
          <p className="text-xs theme-text-muted">
            Estadísticas y resumen de tragos del grupo
          </p>
        </div>
      </div>

      {/* Highlights: Más Bebedor & Más Buscado */}
      <div className="grid grid-cols-2 gap-3 shrink-0">
        {/* Más Bebedor */}
        <div className="p-3.5 rounded-2xl border-2 border-amber-500/50 bg-amber-950/20 text-center space-y-1 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
          <div className="flex items-center justify-center space-x-1 text-amber-400 text-xs font-black uppercase">
            <Beer className="w-4 h-4" />
            <span>Más Bebedor</span>
          </div>
          <div className="text-2xl pt-0.5">{maxDrinker?.avatar || '🦁'}</div>
          <div className="text-sm font-black text-white truncate px-1">
            {maxDrinker?.name || 'Nadie'}
          </div>
          <div className="text-xs font-black text-amber-400">
            {maxDrinker?.sips ?? 0} tragos
          </div>
        </div>

        {/* Más Buscado */}
        <div className="p-3.5 rounded-2xl border-2 border-purple-500/50 bg-purple-950/20 text-center space-y-1 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
          <div className="flex items-center justify-center space-x-1 text-purple-400 text-xs font-black uppercase">
            <Target className="w-4 h-4" />
            <span>Más Buscado</span>
          </div>
          <div className="text-2xl pt-0.5">{mostTargeted?.avatar || '🎯'}</div>
          <div className="text-sm font-black text-white truncate px-1">
            {mostTargeted?.name || 'Nadie'}
          </div>
          <div className="text-xs font-black text-purple-400">
            {mostTargeted?.timesTargeted ?? mostTargeted?.targetCount ?? 0} veces
          </div>
        </div>
      </div>

      {/* Full Scoreboard Table */}
      <div className="flex-1 p-3.5 rounded-2xl border theme-border bg-[var(--bg-surface)] space-y-2 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-[var(--text-muted)] border-b theme-border pb-2 px-1">
          <span>Ranking de Jugadores</span>
          <span>Tragos / Retos</span>
        </div>

        <div className="space-y-1.5 overflow-y-auto pr-1" data-testid="scoreboard-list">
          {sortedBySips.map((player, index) => (
            <div
              key={player.id}
              style={{ borderColor: player.color || '#ec4899' }}
              className="flex items-center justify-between p-2.5 rounded-xl border bg-[var(--bg-elevated)] text-xs font-bold"
              data-testid={`podium-row-${player.id}`}
            >
              <div className="flex items-center space-x-2">
                <span className="w-5 text-center font-black text-sm text-[var(--accent-primary)]">
                  #{index + 1}
                </span>
                <span className="text-base">{player.avatar || '👤'}</span>
                <span className="theme-text-primary font-black text-sm">{player.name}</span>
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-amber-400 font-black text-sm">
                  🍺 {player.sips ?? 0}
                </span>
                <span className="theme-text-muted text-[11px]">
                  🎯 {player.timesTargeted ?? player.targetCount ?? 0}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 shrink-0 pt-2">
        {/* Play Again */}
        <button
          onClick={handlePlayAgain}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white font-black text-sm uppercase tracking-wider shadow-[var(--glow-shadow)] hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center justify-center space-x-2"
          data-testid="play-again-btn"
        >
          <RotateCcw className="w-4 h-4" />
          <span>JUGAR DE NUEVO</span>
        </button>

        {/* Exit Home */}
        <button
          onClick={handleHome}
          className="w-full py-3 px-4 rounded-2xl border theme-border bg-[var(--bg-elevated)] theme-text-muted hover:text-white font-bold text-xs uppercase tracking-wider hover:border-[var(--accent-primary)] transition-all cursor-pointer flex items-center justify-center space-x-1.5"
          data-testid="exit-home-btn"
        >
          <Home className="w-4 h-4" />
          <span>Volver al Inicio</span>
        </button>
      </div>
    </div>
  );
};

export default PodiumScreen;
