import React, { useState, useEffect } from 'react';
import { ShieldAlert, X, Clock } from 'lucide-react';
import type { ActiveVirus } from '../../domain/types/virus';
import { soundService } from '../../infrastructure/soundService';

export interface VirusHUDProps {
  activeViruses: ActiveVirus[];
}

export interface ActiveVirusDetailModalProps {
  virus: ActiveVirus;
  onClose: () => void;
}

export const getAffectedPlayersLabel = (virus: ActiveVirus): string => {
  if (virus.assignedPlayers && virus.assignedPlayers.length > 1) {
    return virus.assignedPlayers.map((p) => p.name).join(' y ');
  }
  return virus.targetPlayerName || 'Todos';
};

export const getVirusDurationLabel = (virus: ActiveVirus): string => {
  if (virus.hasResolverCard) {
    return virus.roundsRemaining > 0
      ? `(${virus.roundsRemaining} ${virus.roundsRemaining === 1 ? 'ronda' : 'rondas'})`
      : '(hasta cura)';
  }
  return `(${virus.roundsRemaining} ${virus.roundsRemaining === 1 ? 'ronda' : 'rondas'})`;
};

export const ActiveVirusDetailModal: React.FC<ActiveVirusDetailModalProps> = ({
  virus,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleDismiss = () => {
    soundService.playTap();
    onClose();
  };

  const affectedLabel = getAffectedPlayersLabel(virus);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleDismiss();
        }
      }}
      data-testid="virus-detail-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="virus-modal-title"
    >
      <div className="bg-[var(--bg-surface)] border border-purple-500/50 rounded-3xl p-6 max-w-sm w-full max-h-[85vh] flex flex-col shadow-[0_0_30px_rgba(168,85,247,0.3)] space-y-4 text-left relative animate-in fade-in zoom-in duration-150 overflow-hidden">
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-white/10 theme-text-muted hover:text-white transition-colors cursor-pointer active:scale-95"
          aria-label="Cerrar detalle de virus"
          data-testid="close-virus-detail"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 text-purple-400">
          <span className="text-2xl">🦠</span>
          <h3 id="virus-modal-title" className="text-base font-black uppercase tracking-wider">
            Virus Activo
          </h3>
        </div>

        <div className="text-xs theme-text-muted">
          <span>Afecta a: </span>
          <span className="font-bold text-white text-sm" data-testid="virus-modal-target">
            {affectedLabel}
          </span>
        </div>

        <div
          className="text-sm font-semibold theme-text-primary leading-relaxed bg-[var(--bg-elevated)] p-4 rounded-2xl border theme-border whitespace-pre-wrap max-h-60 overflow-y-auto scroll-container"
          data-testid="virus-modal-text"
        >
          {virus.ruleText}
        </div>

        <div className="flex items-center space-x-2 text-xs text-purple-300 font-medium bg-purple-950/40 border border-purple-500/30 px-3 py-2 rounded-xl shrink-0">
          <Clock className="w-4 h-4 text-purple-400 shrink-0" />
          <span data-testid="virus-modal-duration">
            {virus.hasResolverCard
              ? virus.roundsRemaining > 0
                ? `Permanece activo hasta que aparezca su carta de cura en la partida (${virus.roundsRemaining} ${
                    virus.roundsRemaining === 1 ? 'ronda restante' : 'rondas restantes'
                  })`
                : 'Permanece activo hasta que aparezca su carta de cura en la partida'
              : `Rondas restantes: ${virus.roundsRemaining} ${
                  virus.roundsRemaining === 1 ? 'ronda' : 'rondas'
                }`}
          </span>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="w-full py-3 rounded-2xl font-black text-sm bg-purple-600 hover:bg-purple-500 text-white transition-colors shadow-lg shadow-purple-600/30 cursor-pointer active:scale-98 min-h-[44px] shrink-0"
          data-testid="dismiss-virus-detail"
        >
          ¡Entendido!
        </button>
      </div>
    </div>
  );
};

export const VirusHUD: React.FC<VirusHUDProps> = ({ activeViruses }) => {
  const [selectedVirus, setSelectedVirus] = useState<ActiveVirus | null>(null);

  if (!activeViruses || activeViruses.length === 0) {
    return null;
  }

  return (
    <>
      <div
        className="w-full max-w-sm mx-auto px-1 py-1.5 space-y-1.5 select-none"
        data-testid="virus-hud"
      >
        <div className="flex items-center space-x-1.5 text-xs font-black uppercase tracking-wider text-purple-400">
          <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
          <span>Virus Activos ({activeViruses.length})</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {activeViruses.map((virus) => {
            const isUrgent = !virus.hasResolverCard && virus.roundsRemaining === 1;
            const affectedLabel = getAffectedPlayersLabel(virus);
            const durationLabel = getVirusDurationLabel(virus);

            return (
              <button
                key={virus.id}
                type="button"
                onClick={() => {
                  soundService.playTap();
                  setSelectedVirus(virus);
                }}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-2xl border text-xs font-bold transition-all shadow-md cursor-pointer active:scale-95 text-left min-h-[44px] ${
                  isUrgent
                    ? 'bg-purple-950/60 border-purple-500 text-purple-200 animate-pulse shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                    : 'bg-[var(--bg-elevated)] border-purple-500/40 text-purple-300 hover:border-purple-500/70'
                }`}
                data-testid={`virus-pill-${virus.id}`}
                aria-label={`Ver regla completa de virus para ${affectedLabel}`}
              >
                <span className="text-base shrink-0">🦠</span>

                <div className="flex flex-col text-left min-w-0">
                  <div className="flex items-center space-x-1">
                    <span className="text-[11px] font-black text-white truncate max-w-[120px]">
                      {affectedLabel}
                    </span>
                    <span className="text-[10px] theme-text-muted shrink-0">
                      {durationLabel}
                    </span>
                  </div>
                  <span className="text-[10px] theme-text-muted line-clamp-1 max-w-[170px]">
                    {virus.ruleText}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Full Virus Detail Modal */}
      {selectedVirus && (
        <ActiveVirusDetailModal
          virus={selectedVirus}
          onClose={() => setSelectedVirus(null)}
        />
      )}
    </>
  );
};

export default VirusHUD;
