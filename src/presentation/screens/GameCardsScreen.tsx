import React, { useEffect, useRef } from 'react';
import { RotateCcw, Home, Plus, Minus, ArrowRight, Beer } from 'lucide-react';
import { useGameSessionStore } from '../../application/useGameSessionStore';
import { usePlayerStore } from '../../application/usePlayerStore';
import { SwipeableCard } from '../components/SwipeableCard';
import { CardDeck } from '../components/CardDeck';
import { VirusHUD } from '../components/VirusHUD';
import { VirusExpiredModal } from '../components/VirusExpiredModal';
import { soundService } from '../../infrastructure/soundService';
import { useDragToScroll } from '../hooks/useDragToScroll';

export interface GameCardsScreenProps {
  onGameOver: () => void;
  onExitHome: () => void;
}

export const GameCardsScreen: React.FC<GameCardsScreenProps> = ({
  onGameOver,
  onExitHome,
}) => {
  const storeDeck = useGameSessionStore((state) => state.deck);
  const deck = storeDeck.length > 0 ? storeDeck : useGameSessionStore.getState().deck;

  const storeIndex = useGameSessionStore((state) => state.currentIndex);
  const currentIndex = storeIndex >= 0 ? storeIndex : useGameSessionStore.getState().currentIndex;

  const storeCard = useGameSessionStore((state) => state.currentCard);
  const currentCard = storeCard || useGameSessionStore.getState().currentCard;

  const storeText = useGameSessionStore((state) => state.interpolatedText);
  const interpolatedText = storeText || useGameSessionStore.getState().interpolatedText;

  const storeAssigned = useGameSessionStore((state) => state.assignedPlayers);
  const assignedPlayers = storeAssigned.length > 0 ? storeAssigned : useGameSessionStore.getState().assignedPlayers;

  const storeDrinks = useGameSessionStore((state) => state.calculatedDrinks);
  const calculatedDrinks = storeDrinks > 0 ? storeDrinks : useGameSessionStore.getState().calculatedDrinks;

  const storeViruses = useGameSessionStore((state) => state.activeViruses);
  const activeViruses = storeViruses.length > 0 ? storeViruses : useGameSessionStore.getState().activeViruses;

  const expiredVirusesQueue = useGameSessionStore((state) => state.expiredVirusesQueue);
  const isGameOver = useGameSessionStore((state) => state.isGameOver);
  const nextCard = useGameSessionStore((state) => state.nextCard);
  const previousCard = useGameSessionStore((state) => state.previousCard);
  const dismissExpiredVirus = useGameSessionStore((state) => state.dismissExpiredVirus);

  const storePlayers = usePlayerStore((state) => state.players);
  const players = storePlayers.length > 0 ? storePlayers : usePlayerStore.getState().players;
  const addSips = usePlayerStore((state) => state.addSips);

  // Detect game over and route to podium
  useEffect(() => {
    if (isGameOver || (deck.length > 0 && currentIndex >= deck.length)) {
      onGameOver();
    }
  }, [isGameOver, currentIndex, deck.length, onGameOver]);

  const handleNext = () => {
    if (currentIndex >= deck.length - 1) {
      onGameOver();
    } else {
      nextCard(players);
    }
  };

  const handleUndo = () => {
    soundService.playTap();
    soundService.vibrate(12);
    previousCard();
  };

  const handleManualSip = (playerId: string, delta: number) => {
    soundService.playTap();
    soundService.vibrate(8);
    addSips(playerId, delta);
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  useDragToScroll(scrollRef);

  // Reset scroll to top on card advance
  useEffect(() => {
    if (scrollRef.current) {
      if (typeof scrollRef.current.scrollTo === 'function') {
        scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        scrollRef.current.scrollTop = 0;
      }
    }
  }, [currentIndex]);

  const activeTurnPlayer = assignedPlayers[0] || players[0];
  const progressPercent = deck.length > 0 ? Math.min(100, Math.round(((currentIndex + 1) / deck.length) * 100)) : 0;

  if (!currentCard && !isGameOver) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4">
        <p className="theme-text-muted text-sm">No hay carta activa en la sesión.</p>
        <button
          onClick={onExitHome}
          className="px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-white text-xs font-bold"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 min-h-0 h-full flex flex-col w-full max-w-md mx-auto px-3 pt-3 pb-[calc(2rem+env(safe-area-inset-bottom,20px))] space-y-4 overflow-y-auto select-none scroll-container"
      data-testid="game-cards-screen"
    >
      {/* Top Header Bar */}
      <div className="space-y-1.5 shrink-0">
        <div className="flex items-center justify-between">
          {/* Home Exit Button */}
          <button
            onClick={() => {
              soundService.playTap();
              onExitHome();
            }}
            className="p-2 rounded-xl border theme-border bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
            aria-label="Salir al inicio"
            data-testid="exit-cards-btn"
          >
            <Home className="w-4 h-4" />
          </button>

          {/* Current Turn Player Indicator */}
          {activeTurnPlayer && (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full border theme-border bg-[var(--bg-elevated)]">
              <span className="text-sm">{activeTurnPlayer.avatar || '👤'}</span>
              <span className="text-xs font-black theme-text-primary">
                Turno: {activeTurnPlayer.name}
              </span>
            </div>
          )}

          {/* Card Counter Badge */}
          <div className="px-2.5 py-1 rounded-full text-xs font-bold theme-text-muted bg-[var(--bg-elevated)] border theme-border">
            {currentIndex + 1} / {deck.length}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
          <div
            style={{ width: `${progressPercent}%` }}
            className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] transition-all duration-300"
          />
        </div>
      </div>

      {/* Center Main Card Zone */}
      <div className="py-2 shrink-0 flex items-center justify-center">
        {currentCard && (
          <CardDeck remainingCount={deck.length - currentIndex}>
            <SwipeableCard
              card={currentCard}
              interpolatedText={interpolatedText}
              calculatedDrinks={calculatedDrinks}
              assignedPlayers={assignedPlayers}
              onSwipeNext={handleNext}
            />
          </CardDeck>
        )}
      </div>

      {/* Bottom Controls Zone */}
      <div className="space-y-2 shrink-0 pt-1">
        {/* Active Virus HUD */}
        <VirusHUD activeViruses={activeViruses} />

        {/* Manual Sip Counters Bar per player */}
        <div className="p-2 rounded-2xl border theme-border bg-[var(--bg-surface)] space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider theme-text-muted px-1">
            <span className="flex items-center gap-1">
              <Beer className="w-3 h-3 text-amber-400" />
              <span>Tragos Acumulados</span>
            </span>
            <span>Ajuste Rápido</span>
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto pb-1" data-testid="player-sips-bar">
            {players.map((p) => (
              <div
                key={p.id}
                className="shrink-0 flex items-center space-x-1 px-2 py-1 rounded-xl border theme-border bg-[var(--bg-elevated)] text-xs font-bold"
              >
                <span>{p.avatar || '👤'}</span>
                <span className="theme-text-primary text-[11px] truncate max-w-[65px]">{p.name}</span>
                <span className="font-black text-amber-400 mx-0.5">{p.sips ?? 0}</span>

                <button
                  onClick={() => handleManualSip(p.id, -1)}
                  className="min-w-[32px] min-h-[32px] rounded-lg bg-[var(--bg-surface)] hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white cursor-pointer active:scale-95 transition-transform"
                  title="Restar 1 trago"
                  data-testid={`minus-sip-${p.id}`}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleManualSip(p.id, 1)}
                  className="min-w-[32px] min-h-[32px] rounded-lg bg-[var(--accent-primary)]/20 hover:bg-[var(--accent-primary)]/40 flex items-center justify-center theme-accent-primary cursor-pointer active:scale-95 transition-transform"
                  title="Sumar 1 trago"
                  data-testid={`plus-sip-${p.id}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Action Controls: Undo and Next */}
        <div className="flex items-center space-x-2">
          {/* Undo Button */}
          <button
            onClick={handleUndo}
            disabled={currentIndex <= 0}
            className="flex-1 py-3 px-3 rounded-2xl border theme-border bg-[var(--bg-elevated)] text-xs font-black uppercase tracking-wider theme-text-primary hover:border-[var(--accent-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center space-x-1.5"
            data-testid="undo-card-btn"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Deshacer</span>
          </button>

          {/* Advance Card Button */}
          <button
            onClick={handleNext}
            className="flex-[2] py-3 px-4 rounded-2xl bg-[var(--accent-primary)] text-white text-xs font-black uppercase tracking-wider shadow-[var(--glow-shadow)] hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
            data-testid="next-card-btn"
          >
            <span>Siguiente Carta</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expired Virus Modal Notification */}
      <VirusExpiredModal
        expiredViruses={expiredVirusesQueue}
        onDismiss={dismissExpiredVirus}
      />
    </div>
  );
};

export default GameCardsScreen;
