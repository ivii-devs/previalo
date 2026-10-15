import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Download, Settings, Play } from 'lucide-react';
import { PWAHelper } from '../../infrastructure/registerSW';
import { useGameSessionStore } from '../../application/useGameSessionStore';
import { soundService } from '../../infrastructure/soundService';

export interface TopHeaderProps {
  currentScreen?: string;
  onNavigate?: (screen: 'home' | 'setup' | 'game-cards' | 'game-board' | 'podium') => void;
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

  const showResumeBanner = hasActive && currentScreen !== 'game-cards' && currentScreen !== 'game-board' && currentScreen !== 'podium';

  return (
    <header className="w-full border-b theme-border bg-[var(--bg-surface)] shrink-0 z-30 select-none pt-safe">
      <div className="flex items-center justify-between px-4 py-2 max-w-md mx-auto min-h-[48px]">
        {/* Brand Logo & Name */}
        <button
          onClick={handleLogoClick}
          className="flex items-center space-x-2 focus:outline-none group text-left cursor-pointer min-h-[44px] py-1"
          data-testid="header-logo-btn"
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-lg bg-gradient-to-tr from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white shadow-[var(--glow-shadow)] group-hover:scale-105 transition-transform">
            P
          </div>
          <span className="font-black text-xl tracking-wider theme-text-primary">
            PREVIALO
          </span>
        </button>

        {/* Status Indicators & Actions */}
        <div className="flex items-center space-x-2">
          {/* PWA Install Button */}
          {canInstall && (
            <button
              onClick={handleInstall}
              className="flex items-center space-x-1 px-2.5 py-1 min-h-[36px] rounded-full text-xs font-bold bg-[var(--accent-primary)] text-white shadow-[var(--glow-shadow)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              title="Instalar App Previalo"
              data-testid="install-pwa-btn"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Instalar</span>
            </button>
          )}

          {/* Offline / Online Badge */}
          <div
            className="flex items-center space-x-1 px-2 py-1 rounded-full text-[11px] font-semibold border theme-border bg-[var(--bg-elevated)]"
            data-testid="network-status-badge"
          >
            {isOffline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span className="text-amber-400 font-bold">Offline</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Online</span>
              </>
            )}
          </div>

          {/* Settings Gear Button (44x44px touch target) */}
          <button
            onClick={() => {
              soundService.playTap();
              onOpenSettings?.();
            }}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl border theme-border bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-white hover:border-[var(--accent-primary)] transition-all cursor-pointer"
            aria-label="Configuración"
            data-testid="settings-btn"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Conditional Active Session Resume Banner */}
      {showResumeBanner && (
        <div
          onClick={handleResume}
          className="bg-gradient-to-r from-[var(--accent-primary)]/20 via-[var(--accent-secondary)]/20 to-[var(--accent-primary)]/20 border-t border-b border-[var(--accent-primary)]/30 px-4 py-1.5 flex items-center justify-between cursor-pointer hover:opacity-95 transition-opacity"
          data-testid="resume-session-banner"
        >
          <div className="flex items-center space-x-2 text-xs font-bold theme-text-primary">
            <span className="text-[var(--accent-primary)] animate-pulse">⚡</span>
            <span>Partida activa en curso</span>
          </div>
          <button className="flex items-center space-x-1 text-xs font-black theme-accent-primary uppercase tracking-wider">
            <span>Reanudar</span>
            <Play className="w-3 h-3 fill-current" />
          </button>
        </div>
      )}
    </header>
  );
};

export default TopHeader;
