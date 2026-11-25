import React, { useEffect } from 'react';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import type { ActiveVirus } from '../../domain/types/virus';
import { soundService } from '../../infrastructure/soundService';

export interface VirusExpiredModalProps {
  expiredViruses: ActiveVirus[];
  onDismiss: (virusId: string) => void;
}

export const VirusExpiredModal: React.FC<VirusExpiredModalProps> = ({
  expiredViruses,
  onDismiss,
}) => {
  const currentExpired = expiredViruses && expiredViruses.length > 0 ? expiredViruses[0] : null;

  useEffect(() => {
    if (currentExpired) {
      soundService.playVirusExpired();
      soundService.vibrate([100, 50, 100]);
    }
  }, [currentExpired?.id]);

  if (!currentExpired) return null;

  const handleDismiss = () => {
    soundService.playTap();
    onDismiss(currentExpired.id);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-[calc(1rem+env(safe-area-inset-bottom,0px))] bg-black/75 select-none"
      data-testid="virus-expired-modal"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-[20px] border border-success-line bg-surface p-6 shadow-modal flex flex-col items-center text-center space-y-4 max-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-2rem)] overflow-y-auto scroll-container">
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-success-quiet text-success flex items-center justify-center border border-success-line">
          <ShieldCheck className="w-7 h-7" />
        </div>

        {/* Title */}
        <div className="space-y-1">
          <span className="text-xs font-bold text-success">
            Regla concluida
          </span>
          <h3 className="font-heading text-xl font-bold text-text">
            Virus expirado
          </h3>
        </div>

        {/* Target Player and Expired Rule */}
        <div className="w-full p-4 rounded-2xl border border-border bg-surface-muted space-y-2 text-left">
          {currentExpired.targetPlayerName && (
            <div className="text-xs font-medium text-success">
              Liberado: <span className="text-text font-bold">{currentExpired.targetPlayerName}</span>
            </div>
          )}
          <p className="text-sm font-semibold text-text leading-snug selectable">
            "{currentExpired.ruleText}"
          </p>
          <p className="text-xs text-text-muted">
            El efecto temporal ha finalizado. Vuelve a jugar con normalidad.
          </p>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="w-full min-h-[44px] py-3 px-4 rounded-2xl bg-success text-success-ink font-heading font-bold text-sm hover:opacity-95 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus transition-all cursor-pointer flex items-center justify-center gap-2"
          data-testid="dismiss-virus-btn"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Entendido</span>
        </button>
      </div>
    </div>
  );
};

export default VirusExpiredModal;
