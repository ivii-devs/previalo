import React, { useState, useEffect } from 'react';
import { useSettingsStore, type Theme } from './application/useSettingsStore';
import { useGameSessionStore } from './application/useGameSessionStore';
import { usePlayerStore } from './application/usePlayerStore';
import { TopHeader } from './presentation/components/TopHeader';
import { SettingsModal } from './presentation/components/SettingsModal';
import { HomeScreen } from './presentation/screens/HomeScreen';
import { SetupScreen } from './presentation/screens/SetupScreen';
import { GameCardsScreen } from './presentation/screens/GameCardsScreen';
import { GameBoardScreen } from './presentation/screens/GameBoardScreen';
import { soundService } from './infrastructure/soundService';
import { PWAHelper } from './infrastructure/registerSW';
import { PWAInstallPrompt } from './presentation/components/PWAInstallPrompt';
import { UpdateToast } from './presentation/components/UpdateToast';
import './presentation/styles/themes.css';

export type ScreenId = 'home' | 'setup' | 'game-cards' | 'game-board';

export interface ShortcutConfig {
  screen: ScreenId;
  mode: 'category' | 'preset' | 'chaos' | 'board';
  targetId?: string;
}

export const parseShortcutQuery = (search: string): ShortcutConfig | null => {
  if (!search) return null;
  try {
    const params = new URLSearchParams(search);
    const mode = params.get('mode');
    const category = params.get('category');

    if (mode === 'chaos') {
      return { screen: 'setup', mode: 'chaos' };
    }
    if (mode === 'spicy') {
      return { screen: 'setup', mode: 'preset', targetId: 'modo_caliente' };
    }
    if (mode === 'board') {
      return { screen: 'setup', mode: 'board' };
    }
    if (category) {
      if (category === 'el_tablero') {
        return { screen: 'setup', mode: 'board' };
      }
      return { screen: 'setup', mode: 'category', targetId: category };
    }
  } catch {
    // Ignored
  }
  return null;
};

export const App: React.FC = () => {
  const initialShortcut = React.useMemo(() => {
    if (typeof window === 'undefined' || !window.location?.search) return null;
    return parseShortcutQuery(window.location.search);
  }, []);

  const [currentScreen, setCurrentScreen] = useState<ScreenId>(
    () => initialShortcut?.screen ?? 'home'
  );
  const [setupMode, setSetupMode] = useState<'category' | 'preset' | 'chaos' | 'board'>(
    () => initialShortcut?.mode ?? 'chaos'
  );
  const [setupTargetId, setSetupTargetId] = useState<string | undefined>(
    () => initialShortcut?.targetId
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);

  const theme = useSettingsStore((state) => state.theme);

  // Expose screen router and stores for automation / testing arneses
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__setScreen = (s: ScreenId) => setCurrentScreen(s);
      (window as any).__gameSessionStore = useGameSessionStore;
      (window as any).__playerStore = usePlayerStore;
    }
  }, []);

  // Sync theme to root element and meta theme-color
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const themeColors: Record<Theme, string> = {
        'coral-night': '#121113',
        'indigo-obsidian': '#101118',
        'emerald-forest': '#0f1412',
        'amber-dusk': '#14110f',
        'warm-day': '#f7f4ef',
      };
      metaThemeColor.setAttribute('content', themeColors[theme] || '#121113');
    }
  }, [theme]);

  // Service Worker registration with update notification hook
  useEffect(() => {
    PWAHelper.registerServiceWorker({
      onUpdate: () => setIsUpdateAvailable(true),
    });
  }, []);

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

  // Shortcuts handling via URL search query
  useEffect(() => {
    if (typeof window === 'undefined' || !window.location?.search) return;
    const shortcut = parseShortcutQuery(window.location.search);
    if (shortcut) {
      setSetupMode(shortcut.mode);
      setSetupTargetId(shortcut.targetId);
      setCurrentScreen(shortcut.screen);
    }
  }, []);

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
      className="fixed inset-0 flex flex-col w-full max-w-md mx-auto select-none overflow-hidden bg-background text-text font-body"
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

      {/* PWA Floating Update Banner */}
      <UpdateToast
        isVisible={isUpdateAvailable}
        onUpdate={() => window.location.reload()}
        onDismiss={() => setIsUpdateAvailable(false)}
      />

      {/* PWA Guided Install Prompt (Home screen only, never obstructs active game controls) */}
      {currentScreen === 'home' && <PWAInstallPrompt />}

      {/* Global Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default App;
