import React from 'react';
import { Layers, Dices, Users } from 'lucide-react';
import { soundService } from '../../infrastructure/soundService';
import { useGameSessionStore } from '../../application/useGameSessionStore';

/**
 * @deprecated BottomNav has been eliminated in favor of unified "Mesa" homepage navigation.
 * Do not use or re-import in App.tsx.
 */
export interface BottomNavProps {
  currentScreen: 'home' | 'setup' | 'game-cards' | 'game-board';
  onNavigate: (screen: 'home' | 'setup' | 'game-cards' | 'game-board') => void;
}

/**
 * @deprecated Eliminated in navigation unification redesign.
 */
export const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate }) => {
  const hasActive = useGameSessionStore((state) => state.hasActiveSession());
  const mode = useGameSessionStore((state) => state.mode);

  const handleTabClick = (tab: 'cards' | 'board' | 'table') => {
    soundService.playTap();
    soundService.vibrate(8);

    if (tab === 'cards') {
      if (currentScreen === 'game-cards') return;
      if (hasActive && mode !== 'board') {
        onNavigate('game-cards');
      } else {
        onNavigate('setup');
      }
    } else if (tab === 'board') {
      if (currentScreen === 'game-board') return;
      onNavigate('game-board');
    } else if (tab === 'table') {
      if (currentScreen === 'home') return;
      onNavigate('home');
    }
  };

  const isCardsActive = currentScreen === 'game-cards' || (currentScreen === 'setup' && mode !== 'board');
  const isBoardActive = currentScreen === 'game-board';
  const isTableActive = currentScreen === 'home';

  return (
    <nav
      className="w-full border-t theme-border bg-[var(--bg-surface)] shrink-0 mt-auto z-30 select-none pb-safe"
      data-testid="bottom-nav"
    >
      <div className="grid grid-cols-3 max-w-md mx-auto h-12 min-h-[44px]">
        {/* Tab 1: Cartas */}
        <button
          onClick={() => handleTabClick('cards')}
          className={`flex flex-col items-center justify-center space-y-0.5 h-full min-h-[44px] transition-all cursor-pointer ${
            isCardsActive
              ? 'theme-accent-primary font-black scale-105'
              : 'text-[var(--text-muted)] hover:text-white'
          }`}
          data-testid="nav-tab-cards"
        >
          <Layers className="w-5 h-5" />
          <span className="text-[11px] tracking-wide">🃏 Cartas</span>
          {isCardsActive && (
            <div className="w-6 h-0.5 rounded-full bg-[var(--accent-primary)] shadow-[var(--glow-shadow)]" />
          )}
        </button>

        {/* Tab 2: Tableros */}
        <button
          onClick={() => handleTabClick('board')}
          className={`flex flex-col items-center justify-center space-y-0.5 h-full min-h-[44px] transition-all cursor-pointer ${
            isBoardActive
              ? 'theme-accent-primary font-black scale-105'
              : 'text-[var(--text-muted)] hover:text-white'
          }`}
          data-testid="nav-tab-board"
        >
          <Dices className="w-5 h-5" />
          <span className="text-[11px] tracking-wide">🎲 Tableros</span>
          {isBoardActive && (
            <div className="w-6 h-0.5 rounded-full bg-[var(--accent-primary)] shadow-[var(--glow-shadow)]" />
          )}
        </button>

        {/* Tab 3: Mesa */}
        <button
          onClick={() => handleTabClick('table')}
          className={`flex flex-col items-center justify-center space-y-0.5 h-full min-h-[44px] transition-all cursor-pointer ${
            isTableActive
              ? 'theme-accent-primary font-black scale-105'
              : 'text-[var(--text-muted)] hover:text-white'
          }`}
          data-testid="nav-tab-table"
        >
          <Users className="w-5 h-5" />
          <span className="text-[11px] tracking-wide">🍾 Mesa</span>
          {isTableActive && (
            <div className="w-6 h-0.5 rounded-full bg-[var(--accent-primary)] shadow-[var(--glow-shadow)]" />
          )}
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
