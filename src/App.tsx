import React, { useState, useEffect } from 'react';
import { useSettingsStore, type Theme } from './application/useSettingsStore';
import { useGameSessionStore } from './application/useGameSessionStore';
import { TopHeader } from './presentation/components/TopHeader';
import { SettingsModal } from './presentation/components/SettingsModal';
import { HomeScreen } from './presentation/screens/HomeScreen';
import { SetupScreen } from './presentation/screens/SetupScreen';
import { GameCardsScreen } from './presentation/screens/GameCardsScreen';
import { GameBoardScreen } from './presentation/screens/GameBoardScreen';
import { soundService } from './infrastructure/soundService';
import { PWAHelper } from './infrastructure/registerSW';
import './presentation/styles/themes.css';

export type ScreenId = 'home' | 'setup' | 'game-cards' | 'game-board';

export const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('home');
  const [setupMode, setSetupMode] = useState<'category' | 'preset' | 'chaos' | 'board'>('chaos');
  const [setupTargetId, setSetupTargetId] = useState<string | undefined>(undefined);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const theme = useSettingsStore((state) => state.theme);

  // Sync theme to root element and meta theme-color
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const themeColors: Record<Theme, string> = {
        'cyber-neon': '#0b0f19',
        'electric-purple': '#0d0b1a',
        'acid-lime': '#08100c',
        'sunset-hot': '#160b0e',
        'day-mode': '#f8fafc',
      };
      metaThemeColor.setAttribute('content', themeColors[theme] || '#0b0f19');
    }
  }, [theme]);

  // WebKit iOS background/foreground resilience
  useEffect(() => {
    const handleResume = () => {
      soundService.resume().catch(() => {});
      PWAHelper.refreshNetworkStatus();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleResume();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pageshow', handleResume);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pageshow', handleResume);
    };
  }, []);

  // Global desktop & tablet wheel forwarding: allow scrolling when cursor is on margins or headers
  useEffect(() => {
    const handleGlobalWheel = (e: WheelEvent) => {
      const scrollable = document.querySelector('.scroll-container') as HTMLElement | null;
      if (!scrollable) return;
      const target = e.target as HTMLElement | null;
      if (scrollable.contains(target)) return;

      scrollable.scrollTop += e.deltaY;
    };

    window.addEventListener('wheel', handleGlobalWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleGlobalWheel);
  }, []);

  // Navigate to setup with specific mode
  const handleSelectMode = (
    mode: 'category' | 'preset' | 'chaos' | 'board',
    targetId?: string
  ) => {
    if (mode === 'board' || (mode === 'category' && targetId === 'el_tablero')) {
      setSetupMode('board');
      setSetupTargetId(undefined);
      setCurrentScreen('setup');
      return;
    }
    setSetupMode(mode);
    setSetupTargetId(targetId);
    setCurrentScreen('setup');
  };

  const handleStartGame = (mode: 'cards' | 'board') => {
    if (mode === 'board') {
      setCurrentScreen('game-board');
    } else {
      setCurrentScreen('game-cards');
    }
  };

  const handleResumeSession = () => {
    const success = useGameSessionStore.getState().resumeSession();
    if (success) {
      const mode = useGameSessionStore.getState().mode;
      if (mode === 'board') {
        setCurrentScreen('game-board');
      } else {
        setCurrentScreen('game-cards');
      }
    }
  };

  return (
    <div
      className="fixed inset-0 bottom-[calc(-1*env(safe-area-inset-top,0px))] flex flex-col w-full max-w-md mx-auto select-none overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)]"
      style={{
        bottom: 0,
        overscrollBehaviorY: 'none',
        touchAction: 'manipulation',
      }}
      data-testid="app-root"
    >
      {/* Top Header */}
      <TopHeader
        currentScreen={currentScreen}
        onNavigate={(screen) => setCurrentScreen(screen)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Screen Viewport Router */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
        {currentScreen === 'home' && (
          <HomeScreen
            onSelectMode={handleSelectMode}
            onResumeSession={handleResumeSession}
          />
        )}

        {currentScreen === 'setup' && (
          <SetupScreen
            mode={setupMode}
            targetId={setupTargetId}
            onStartGame={handleStartGame}
            onBack={() => setCurrentScreen('home')}
          />
        )}

        {currentScreen === 'game-cards' && (
          <GameCardsScreen
            onPlayAgain={() => {
              setCurrentScreen('setup');
            }}
            onExitHome={() => setCurrentScreen('home')}
          />
        )}

        {currentScreen === 'game-board' && (
          <GameBoardScreen
            onPlayAgain={() => {
              setSetupMode('board');
              setCurrentScreen('setup');
            }}
            onExitHome={() => setCurrentScreen('home')}
          />
        )}
      </main>

      {/* Global Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default App;
