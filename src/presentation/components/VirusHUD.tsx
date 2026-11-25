import React, { useState, useEffect } from 'react';
import { ShieldAlert, X, Clock } from 'lucide-react';
import type { ActiveVirus } from '../../domain/types/virus';
import { VariableReplacer } from '../../domain/engines/VariableReplacer';
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
    return VariableReplacer.formatPlayerConjunction(virus.assignedPlayers);
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
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center px-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-[calc(1rem+env(safe-area-inset-bottom,0px))] select-none"
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
      <div className="bg-surface border border-virus-line rounded-[20px] p-5 max-w-sm w-full max-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-2rem)] flex flex-col shadow-modal space-y-4 text-left relative overflow-hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 text-virus">
            <div className="w-9 h-9 rounded-xl bg-virus-quiet border border-virus-line flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h3 id="virus-modal-title" className="font-heading text-base font-bold text-text">
              Virus activo
            </h3>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="min-w-[44px] min-h-[44px] -mr-1 flex items-center justify-center rounded-xl border border-border bg-surface-muted text-text-secondary interactive-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus active:scale-[0.95] transition-colors cursor-pointer"
            aria-label="Cerrar detalle de virus"
            data-testid="close-virus-detail"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-text-muted">
          <span>Afecta a: </span>
          <span className="font-bold text-text text-sm" data-testid="virus-modal-target">
            {affectedLabel}
          </span>
        </div>

        <div
          className="text-sm font-medium text-text leading-relaxed bg-surface-muted p-4 rounded-2xl border border-border whitespace-pre-wrap max-h-60 overflow-y-auto scroll-container selectable"
          data-testid="virus-modal-text"
        >
          {virus.ruleText}
        </div>

        <div className="flex items-start gap-2 text-xs text-virus font-medium bg-virus-quiet border border-virus-line px-3 py-2.5 rounded-xl shrink-0">
          <Clock className="w-4 h-4 shrink-0 mt-0.5" />
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
          className="w-full min-h-[44px] py-3 rounded-2xl font-heading font-bold text-sm bg-virus text-virus-ink hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus active:scale-[0.98] transition-all cursor-pointer shrink-0"
          data-testid="dismiss-virus-detail"
        >
          Entendido
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
        className="w-full max-w-sm mx-auto space-y-2 select-none"
        data-testid="virus-hud"
      >
        <div className="flex items-center gap-1.5 text-xs font-bold text-virus">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span>Virus activos ({activeViruses.length})</span>
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
                className={`flex items-center gap-2.5 px-3 py-2 rounded-2xl border text-xs transition-all cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus text-left min-h-[48px] w-full ${
                  isUrgent
                    ? 'bg-virus-quiet border-virus text-text'
                    : 'bg-surface border-virus-line text-text interactive-card'
                }`}
                data-testid={`virus-pill-${virus.id}`}
                data-urgent={isUrgent ? 'true' : 'false'}
                aria-label={`Ver regla completa de virus para ${affectedLabel}`}
              >
                <div className="w-8 h-8 rounded-xl bg-virus-quiet border border-virus-line text-virus flex items-center justify-center shrink-0 relative">
                  <ShieldAlert className="w-4 h-4" />
                  {isUrgent && (
                    <span
                      className="w-2 h-2 rounded-full bg-virus absolute -top-0.5 -right-0.5"
                      aria-hidden="true"
                    />
                  )}
                </div>

                <div className="flex flex-col text-left min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-text truncate">
                      {affectedLabel}
                    </span>
                    <span className="text-[11px] font-mono text-virus shrink-0">
                      {durationLabel}
                    </span>
                  </div>
                  <span className="text-[11px] text-text-secondary line-clamp-1">
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
