import React from 'react';
import { Sparkles, RefreshCw, X } from 'lucide-react';
import { soundService } from '../../infrastructure/soundService';

interface UpdateToastProps {
  isVisible: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
}

export const UpdateToast: React.FC<UpdateToastProps> = ({
  isVisible,
  onUpdate,
  onDismiss,
}) => {
  if (!isVisible) return null;

  const handleUpdate = () => {
    soundService.playTap();
    onUpdate();
  };

  const handleDismiss = () => {
    soundService.playTap();
    onDismiss();
  };

  return (
    <div
      className="fixed top-[calc(0.75rem+env(safe-area-inset-top,0px))] left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm bg-surface border border-border-strong rounded-2xl p-3 shadow-modal flex items-center justify-between gap-2 text-left"
      data-testid="update-toast"
      role="alert"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-selected border border-action/30 flex items-center justify-center shrink-0 text-action">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="font-heading text-xs font-bold text-text truncate">
            Nueva versión disponible
          </p>
          <p className="text-[11px] text-text-muted truncate">
            Actualiza para recibir las últimas cartas
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={handleUpdate}
          className="px-3 rounded-xl bg-action text-action-ink font-bold text-xs flex items-center gap-1.5 interactive-action active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus transition-all cursor-pointer min-h-[44px]"
          data-testid="update-reload-btn"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Actualizar</span>
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-xl text-text-muted hover:text-text active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus transition-all cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Cerrar aviso"
          data-testid="update-dismiss-btn"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default UpdateToast;
