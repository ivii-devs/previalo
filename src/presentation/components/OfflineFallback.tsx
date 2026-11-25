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
      <div className="w-16 h-16 rounded-2xl bg-warning-quiet border border-warning-line flex items-center justify-center mb-5 text-warning">
        <WifiOff className="w-8 h-8" />
      </div>

      <h2 className="font-heading text-xl font-extrabold tracking-tight text-text mb-2">
        {title}
      </h2>

      <p className="text-sm text-text-secondary leading-relaxed max-w-xs mb-6">
        {message}
      </p>

      <div className="flex flex-col gap-2.5 w-full max-w-xs">
        <button
          type="button"
          onClick={handleRetry}
          className="w-full min-h-[48px] py-3 px-5 rounded-2xl bg-action text-action-ink font-heading font-extrabold text-sm flex items-center justify-center gap-2 interactive-action active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus transition-all cursor-pointer"
          data-testid="offline-retry-btn"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reintentar conexión</span>
        </button>

        {onBack && (
          <button
            type="button"
            onClick={handleBack}
            className="w-full min-h-[44px] py-3 px-5 rounded-2xl bg-surface border border-border text-text font-semibold text-sm flex items-center justify-center gap-2 interactive-surface active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus transition-all cursor-pointer"
            data-testid="offline-back-btn"
          >
            <Home className="w-4 h-4 text-text-muted" />
            <span>Volver al inicio</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default OfflineFallback;
