import React, { useState, useEffect } from 'react';
import { WifiOff, Download, Settings, Play } from 'lucide-react';
import { PWAHelper } from '../../infrastructure/registerSW';
import { useGameSessionStore } from '../../application/useGameSessionStore';
import { soundService } from '../../infrastructure/soundService';

export interface TopHeaderProps {
  currentScreen?: string;
  onNavigate?: (screen: 'home' | 'setup' | 'game-cards' | 'game-board') => void;
  onOpenSettings?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentScreen = 'home',
  onNavigate,
  onOpenSettings,
}) => {
  const [isOffline, setIsOffline] = useState<boolean>(PWAHelper.isOffline());
  const [canInstall, setCanInstall] = useState<boolean>(PWAHelper.isInstallable());
  const storeHasActive = useGameSessionStore((state) => state.hasActiveSession());
  const hasActive = storeHasActive || useGameSessionStore.getState().hasActiveSession();
  const resumeSession = useGameSessionStore((state) => state.resumeSession);

  useEffect(() => {
    PWAHelper.init();
    setIsOffline(PWAHelper.isOffline());
    setCanInstall(PWAHelper.isInstallable());

    const unsubNetwork = PWAHelper.onNetworkChange((isOnline) => {
      setIsOffline(!isOnline);
    });

    const unsubInstall = PWAHelper.onInstallableChange((installable) => {
      setCanInstall(installable);
    });

    return () => {
      unsubNetwork();
      unsubInstall();
    };
  }, []);

  const handleInstall = async () => {
    soundService.playTap();
    await PWAHelper.promptInstall();
    setCanInstall(PWAHelper.isInstallable());
  };

  const handleResume = () => {
    soundService.playTap();
    const success = resumeSession();
    if (success && onNavigate) {
      const activeMode = useGameSessionStore.getState().mode;
      if (activeMode === 'board') {
        onNavigate('game-board');
      } else {
        onNavigate('game-cards');
      }
    }
  };

  const handleLogoClick = () => {
    soundService.playTap();
    if (onNavigate) {
      onNavigate('home');
    }
  };

  const showResumeBanner = hasActive && currentScreen !== 'game-cards' && currentScreen !== 'game-board';

  return (
    <header className="w-full border-b border-border bg-background/95 shrink-0 z-30 select-none pt-safe">
      <div className="flex items-center justify-between gap-1.5 px-3 min-[360px]:px-4 py-2 max-w-md mx-auto min-h-[56px]">
        {/* Brand Logo & Name */}
        <button
          type="button"
          onClick={handleLogoClick}
          className="flex items-center gap-2 min-[360px]:gap-2.5 rounded-xl pr-1 min-[360px]:pr-2 min-h-[44px] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus active:scale-[0.98] transition-transform cursor-pointer text-left"
          data-testid="header-logo-btn"
        >
          <img
            src="/favicon.svg"
            alt="Previalo"
            className="w-7 h-7 rounded-lg object-contain shrink-0"
          />
          <span className="font-heading font-extrabold text-base min-[360px]:text-lg tracking-tight text-text whitespace-nowrap">
            PREVIALO
          </span>
        </button>

        {/* Status Indicators & Actions */}
        <div className="flex items-center gap-1.5 min-[360px]:gap-2 shrink-0">
          {/* PWA Install Button */}
          {canInstall && (
            <button
              type="button"
              onClick={handleInstall}
              className="flex items-center justify-center gap-1.5 px-2.5 min-[360px]:px-3 min-w-[44px] min-h-[44px] rounded-xl text-xs font-bold bg-action text-action-ink interactive-action active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus transition-colors cursor-pointer"
              title="Instalar Previalo"
              aria-label="Instalar Previalo"
              data-testid="install-pwa-btn"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Instalar</span>
            </button>
          )}

          {/* Offline / Online Badge */}
          <div
            className={`flex items-center gap-1.5 px-2 min-[360px]:px-2.5 py-1.5 rounded-full text-[11px] min-[360px]:text-xs font-medium border whitespace-nowrap ${
              isOffline
                ? 'bg-warning-quiet border-warning-line text-warning'
                : 'bg-surface border-border text-text-muted'
            }`}
            data-testid="network-status-badge"
          >
            {isOffline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 shrink-0" />
                <span className="font-semibold">Offline</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-success shrink-0" aria-hidden="true" />
                <span>Online</span>
              </>
            )}
          </div>

          {/* Settings Button (44x44px touch target) */}
          <button
            type="button"
            onClick={() => {
              soundService.playTap();
              onOpenSettings?.();
            }}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-border bg-surface text-text-secondary interactive-surface active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus transition-colors cursor-pointer"
            aria-label="Configuración"
            data-testid="settings-btn"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Conditional Active Session Resume Banner */}
      {showResumeBanner && (
        <button
          type="button"
          onClick={handleResume}
          className="w-full bg-surface border-t border-border border-l-4 border-l-action px-4 py-2 min-h-[44px] flex items-center justify-between cursor-pointer interactive-surface active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus transition-colors text-left"
          data-testid="resume-session-banner"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-text">
            <span className="w-2 h-2 rounded-full bg-action shrink-0" aria-hidden="true" />
            <span>Partida activa en curso</span>
          </div>
          <span className="flex items-center gap-1 text-xs font-bold text-action shrink-0">
            <span>Reanudar</span>
            <Play className="w-3.5 h-3.5 fill-current" />
          </span>
        </button>
      )}
    </header>
  );
};

export default TopHeader;
