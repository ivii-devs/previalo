import React from 'react';
import { WifiOff, RefreshCw, Home } from 'lucide-react';
import { soundService } from '../../infrastructure/soundService';

interface OfflineFallbackProps {
  onRetry?: () => void;
  onBack?: () => void;
  title?: string;
  message?: string;
}

export const OfflineFallback: React.FC<OfflineFallbackProps> = ({
  onRetry,
  onBack,
  title = 'Sin conexión a internet',
  message = 'Esta categoría o modo aún no ha sido descargado en tu dispositivo. Conéctate a internet para precargarlo y jugar siempre offline.',
}) => {
  const handleRetry = () => {
    soundService.playTap();
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleBack = () => {
    soundService.playTap();
    if (onBack) {
      onBack();
    }
  };

  return (
    <div
      className="flex-1 min-h-0 flex flex-col items-center justify-center p-6 text-center select-none"
      data-testid="offline-fallback"
    >
      <div className="w-16 h-16 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center mb-5 text-[var(--accent-primary)] shadow-lg">
        <WifiOff className="w-8 h-8 opacity-90" />
      </div>

      <h2 className="text-xl font-black tracking-tight text-[var(--text-primary)] mb-2">
        {title}
      </h2>

      <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-xs mb-6">
        {message}
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={handleRetry}
          className="w-full py-3 px-5 rounded-2xl bg-[var(--accent-primary)] text-black font-extrabold text-sm flex items-center justify-center gap-2 hover:opacity-95 active:scale-98 transition-all cursor-pointer shadow-md min-h-[44px]"
          data-testid="offline-retry-btn"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reintentar conexión</span>
        </button>

        {onBack && (
          <button
            onClick={handleBack}
            className="w-full py-3 px-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] font-bold text-sm flex items-center justify-center gap-2 hover:bg-[var(--bg-secondary)] active:scale-98 transition-all cursor-pointer min-h-[44px]"
            data-testid="offline-back-btn"
          >
            <Home className="w-4 h-4 text-[var(--text-muted)]" />
            <span>Volver al inicio</span>
          </button>
        )}
      </div>
    </div>
  );
};
