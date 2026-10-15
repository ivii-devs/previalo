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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none animate-in fade-in duration-200"
      data-testid="virus-expired-modal"
    >
      <div className="w-full max-w-sm rounded-3xl border-2 border-emerald-500 bg-[var(--bg-surface)] p-6 shadow-[0_0_30px_rgba(16,185,129,0.35)] flex flex-col items-center text-center space-y-4">
        {/* Animated Celebration Icon */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40 shadow-inner animate-pulse">
          <ShieldCheck className="w-9 h-9" />
        </div>

        {/* Title */}
        <div className="space-y-1">
          <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
            ¡Regla Concluida!
          </span>
          <h3 className="text-xl font-black theme-text-primary">
            Virus Expirado
          </h3>
        </div>

        {/* Target Player and Expired Rule */}
        <div className="w-full p-4 rounded-2xl border theme-border bg-[var(--bg-elevated)] space-y-2">
          {currentExpired.targetPlayerName && (
            <div className="text-xs font-bold text-emerald-300">
              Liberado: <span className="text-white font-black">{currentExpired.targetPlayerName}</span>
            </div>
          )}
          <p className="text-sm font-semibold theme-text-primary leading-snug">
            "{currentExpired.ruleText}"
          </p>
          <p className="text-[11px] theme-text-muted italic">
            El efecto temporal ha finalizado. ¡El jugador vuelve a jugar normalmente!
          </p>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={handleDismiss}
          className="w-full py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-sm tracking-wide shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all cursor-pointer flex items-center justify-center space-x-2"
          data-testid="dismiss-virus-btn"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>¡ENTENDIDO!</span>
        </button>
      </div>
    </div>
  );
};

export default VirusExpiredModal;
