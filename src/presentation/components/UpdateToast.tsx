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
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm bg-[var(--bg-card)]/95 backdrop-blur-md border border-[var(--accent-primary)]/40 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3 text-left animate-in fade-in slide-in-from-top-4 duration-300"
      data-testid="update-toast"
      role="alert"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-[var(--accent-primary)]/15 flex items-center justify-center shrink-0 text-[var(--accent-primary)]">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black text-[var(--text-primary)] truncate">
            Nueva versión disponible
          </p>
          <p className="text-[11px] text-[var(--text-muted)] truncate">
            Actualiza para recibir las últimas cartas
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleUpdate}
          className="px-3 py-1.5 rounded-xl bg-[var(--accent-primary)] text-black font-extrabold text-xs flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all cursor-pointer min-h-[36px]"
          data-testid="update-reload-btn"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Actualizar</span>
        </button>
        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] active:scale-90 transition-all cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
          aria-label="Cerrar aviso"
          data-testid="update-dismiss-btn"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
