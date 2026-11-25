import React, { useEffect, useRef } from 'react';
import { RotateCcw, Home, ArrowRight } from 'lucide-react';
import { useGameSessionStore } from '../../application/useGameSessionStore';
import { usePlayerStore } from '../../application/usePlayerStore';
import { SwipeableCard } from '../components/SwipeableCard';
import { CardDeck } from '../components/CardDeck';
import { VirusHUD } from '../components/VirusHUD';
import { VirusExpiredModal } from '../components/VirusExpiredModal';
import { GameOverModal } from '../components/GameOverModal';
import { soundService } from '../../infrastructure/soundService';
import { useDragToScroll } from '../hooks/useDragToScroll';

export interface GameCardsScreenProps {
  onGameOver?: () => void;
  onPlayAgain?: () => void;
  onExitHome: () => void;
}

export const GameCardsScreen: React.FC<GameCardsScreenProps> = ({
  onGameOver,
  onPlayAgain,
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
  const assignedPlayers =
    storeAssigned.length > 0 ? storeAssigned : useGameSessionStore.getState().assignedPlayers;

  const storeDrinks = useGameSessionStore((state) => state.calculatedDrinks);
  const calculatedDrinks =
    storeDrinks > 0 ? storeDrinks : useGameSessionStore.getState().calculatedDrinks;

  const storeViruses = useGameSessionStore((state) => state.activeViruses);
  const activeViruses =
    storeViruses.length > 0 ? storeViruses : useGameSessionStore.getState().activeViruses;

  const storeExpired = useGameSessionStore((state) => state.expiredVirusesQueue);
  const expiredVirusesQueue =
    storeExpired.length > 0 ? storeExpired : useGameSessionStore.getState().expiredVirusesQueue;

  const storeGameOver = useGameSessionStore((state) => state.isGameOver);
  const isGameOver = storeGameOver || useGameSessionStore.getState().isGameOver;
  const nextCard = useGameSessionStore((state) => state.nextCard);
  const previousCard = useGameSessionStore((state) => state.previousCard);
  const dismissExpiredVirus = useGameSessionStore((state) => state.dismissExpiredVirus);

  const storePlayers = usePlayerStore((state) => state.players);
  const players = storePlayers.length > 0 ? storePlayers : usePlayerStore.getState().players;
  const resetPlayerStats = usePlayerStore((state) => state.resetPlayerStats);
  const endSession = useGameSessionStore((state) => state.endSession);

  // Backward compatibility: trigger onGameOver if provided by legacy tests without onPlayAgain
  useEffect(() => {
    if (onGameOver && !onPlayAgain && (isGameOver || (deck.length > 0 && currentIndex >= deck.length))) {
      onGameOver();
    }
  }, [isGameOver, currentIndex, deck.length, onGameOver, onPlayAgain]);

  const handleNext = () => {
    if (currentIndex >= deck.length - 1) {
      useGameSessionStore.setState({ isGameOver: true });
      if (onGameOver && !onPlayAgain) {
        onGameOver();
      }
    } else {
      nextCard(players);
    }
  };

  const handleUndo = () => {
    soundService.playTap();
    soundService.vibrate(12);
    previousCard();
  };

  const handlePlayAgain = () => {
    soundService.playTap();
    resetPlayerStats();
    endSession();
    if (onPlayAgain) {
      onPlayAgain();
    } else if (onGameOver) {
      onGameOver();
    }
  };

  const handleExitHome = () => {
    soundService.playTap();
    endSession();
    onExitHome();
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
  const progressPercent =
    deck.length > 0 ? Math.min(100, Math.round(((currentIndex + 1) / deck.length) * 100)) : 0;

  if (!currentCard && !isGameOver) {
    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <p className="text-text-secondary text-sm">No hay ninguna carta activa en esta sesión.</p>
        <button
          type="button"
          onClick={onExitHome}
          className="px-5 min-h-[44px] rounded-xl bg-action text-action-ink text-xs font-bold interactive-action active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus transition-all cursor-pointer"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex-1 min-h-0 h-full flex flex-col w-full max-w-md mx-auto select-none overflow-hidden"
      data-testid="game-cards-screen"
    >
      {/* Compact Top Bar */}
      <div className="shrink-0 px-4 pt-3 pb-2 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Home Exit Button */}
          <button
            type="button"
            onClick={() => {
              soundService.playTap();
              onExitHome();
            }}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-border bg-surface text-text-secondary interactive-surface active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus transition-colors cursor-pointer shrink-0"
            aria-label="Salir al inicio"
            data-testid="exit-cards-btn"
          >
            <Home className="w-4 h-4" />
          </button>

          {/* Current Turn Player Capsule */}
          {activeTurnPlayer && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-surface min-w-0">
              <span className="text-sm shrink-0" aria-hidden="true">
                {activeTurnPlayer.avatar || '👤'}
              </span>
              <span className="text-xs font-semibold text-text truncate">
                Turno: {activeTurnPlayer.name}
              </span>
            </div>
          )}

          {/* Tabular Card Counter Badge */}
          <div className="px-3 py-1.5 rounded-full text-xs font-mono font-semibold text-text-muted bg-surface border border-border tabular-nums shrink-0">
            {currentIndex + 1} / {deck.length}
          </div>
        </div>

        {/* Flat 3px Progress Bar */}
        <div className="w-full h-[3px] rounded-full bg-surface-muted overflow-hidden">
          <div
            style={{ width: `${progressPercent}%` }}
            className="h-full bg-action transition-all duration-300"
          />
        </div>
      </div>

      {/* Center Scrollable Area: Card Deck + Active Virus HUD */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto scroll-container px-4 py-3 space-y-4"
      >
        <div className="flex items-center justify-center py-1">
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

        {/* Active Virus HUD */}
        <VirusHUD activeViruses={activeViruses} />
      </div>

      {/* Fixed Thumb-Zone Action Footer */}
      <div className="shrink-0 border-t border-border bg-background/95 px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
        <div className="flex items-center gap-2.5">
          {/* Undo Button */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={currentIndex <= 0}
            className="flex-1 min-h-[48px] py-3 px-3 rounded-2xl border border-border bg-surface text-xs font-bold text-text interactive-surface active:scale-[0.98] disabled:opacity-35 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus transition-all cursor-pointer flex items-center justify-center gap-1.5"
            data-testid="undo-card-btn"
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span>Deshacer</span>
          </button>

          {/* Advance Card Button */}
          <button
            type="button"
            onClick={handleNext}
            className="flex-[2] min-h-[48px] py-3 px-4 rounded-2xl bg-action text-action-ink font-heading font-extrabold text-sm tracking-tight interactive-action active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all cursor-pointer flex items-center justify-center gap-2"
            data-testid="next-card-btn"
          >
            <span>Siguiente carta</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        </div>
      </div>

      {/* Expired Virus Modal Notification */}
      <VirusExpiredModal
        expiredViruses={expiredVirusesQueue}
        onDismiss={dismissExpiredVirus}
      />

      {/* Game Over Modal */}
      <GameOverModal
        isOpen={isGameOver || (deck.length > 0 && currentIndex >= deck.length)}
        onPlayAgain={handlePlayAgain}
        onExitHome={handleExitHome}
      />
    </div>
  );
};

export default GameCardsScreen;
