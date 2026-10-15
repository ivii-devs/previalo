import React from 'react';
import { ShieldAlert } from 'lucide-react';
import type { ActiveVirus } from '../../domain/types/virus';

export interface VirusHUDProps {
  activeViruses: ActiveVirus[];
}

export const VirusHUD: React.FC<VirusHUDProps> = ({ activeViruses }) => {
  if (!activeViruses || activeViruses.length === 0) {
    return null;
  }

  return (
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
          const isUrgent = virus.roundsRemaining === 1;

          return (
            <div
              key={virus.id}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-2xl border text-xs font-bold transition-all shadow-md ${
                isUrgent
                  ? 'bg-purple-950/60 border-purple-500 text-purple-200 animate-pulse shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                  : 'bg-[var(--bg-elevated)] border-purple-500/40 text-purple-300'
              }`}
            >
              <span className="text-base">🦠</span>

              <div className="flex flex-col text-left">
                <div className="flex items-center space-x-1">
                  <span className="text-[11px] font-black text-white">
                    {virus.targetPlayerName || 'Todos'}
                  </span>
                  <span className="text-[10px] theme-text-muted">
                    ({virus.roundsRemaining} {virus.roundsRemaining === 1 ? 'ronda' : 'rondas'})
                  </span>
                </div>
                <span className="text-[10px] theme-text-muted line-clamp-1 max-w-[170px]">
                  {virus.ruleText}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VirusHUD;
