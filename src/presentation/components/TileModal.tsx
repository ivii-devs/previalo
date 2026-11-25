import React from 'react';
import {
  Beer,
  Skull,
  Lock,
  ArrowUpRight,
  Trophy,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  Flame,
} from 'lucide-react';
import type { BoardTile } from '../../domain/types/board';
import type { Player } from '../../domain/types/player';
import { soundService } from '../../infrastructure/soundService';

export interface TileModalProps {
  isOpen: boolean;
  tile: BoardTile | null;
  player: Player | null;
  actionResult?: any;
  onClose: () => void;
}

export const TileModal: React.FC<TileModalProps> = ({
  isOpen,
  tile,
  player,
  actionResult,
  onClose,
}) => {
  if (!isOpen || !tile) return null;

  const handleClose = () => {
    soundService.playTap();
    onClose();
  };

  const renderIcon = () => {
    switch (tile.tile_type) {
      case 'jump':
        return <ArrowUpRight className="w-7 h-7 text-info" />;
      case 'trap_jail':
        return <Lock className="w-7 h-7 text-virus" />;
      case 'trap_skull':
        return <Skull className="w-7 h-7 text-danger" />;
      case 'trap_back':
        return <RotateCcw className="w-7 h-7 text-danger" />;
      case 'finish':
        return <Trophy className="w-7 h-7 text-warning" />;
      case 'drink':
      case 'give_drink':
        return <Beer className="w-7 h-7 text-warning" />;
      default:
        return <Sparkles className="w-7 h-7 text-action" />;
    }
  };

  const drawnCard = actionResult?.drawnCard;
  const dynamicPrompt: string | undefined =
    actionResult?.interpolatedPrompt || drawnCard?.text;
  const hotTier: number | undefined = drawnCard?.tier;

  const drinks =
    drawnCard?.drinks_penalty ?? actionResult?.drinks ?? tile.drinks_action ?? 0;
  const isJump = tile.tile_type === 'jump' || actionResult?.actionType === 'jump';
  const isJail = tile.tile_type === 'trap_jail' || actionResult?.actionType === 'trap_jail';
  const isSkull = tile.tile_type === 'trap_skull' || actionResult?.actionType === 'trap_skull';
  const isBack = tile.tile_type === 'trap_back' || actionResult?.actionType === 'trap_back';
  const isFinish = tile.tile_type === 'finish' || actionResult?.actionType === 'finish';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-[calc(1rem+env(safe-area-inset-bottom,0px))] bg-black/75 select-none"
      data-testid="tile-modal"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-[20px] border border-border-strong bg-surface p-6 shadow-modal flex flex-col items-center text-center space-y-4 max-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-2rem)] overflow-y-auto scroll-container">
        {/* Header Icon */}
        <div className="w-14 h-14 rounded-2xl bg-surface-muted border border-border flex items-center justify-center">
          {renderIcon()}
        </div>

        {/* Tile Title & Number */}
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-mono font-bold text-action">
              Casilla #{tile.tile_number}
            </span>
            {hotTier && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-spicy-quiet border border-spicy-line text-spicy"
                data-testid="tile-hot-tier-badge"
              >
                <Flame className="w-3 h-3" />
                Nivel {hotTier}
              </span>
            )}
          </div>
          <h3 className="font-heading text-xl font-bold text-text">
            {tile.title || 'Evento de tablero'}
          </h3>
        </div>

        {/* Player Name Banner (keeping avatar emoji) */}
        {player && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-surface-muted border border-border text-text">
            <span aria-hidden="true">{player.avatar || '👤'}</span>
            <span>{player.name}</span>
          </div>
        )}

        {/* Dynamic Card & Tile Effect Box */}
        <div className="w-full p-4 rounded-2xl border border-border bg-surface-muted space-y-2.5">
          {dynamicPrompt ? (
            <p
              className="text-sm font-semibold text-text leading-relaxed selectable"
              data-testid="tile-dynamic-card"
            >
              {dynamicPrompt}
            </p>
          ) : (
            <p className="text-sm font-medium text-text leading-relaxed selectable">
              {tile.description}
            </p>
          )}

          {/* Special Action Callouts (vector icons, zero emojis) */}
          {isJump && (
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-info pt-1">
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
              <span>
                De bar en bar: salta a la casilla {actionResult?.destination ?? tile.action_jump_to} y vuelve a tirar.
              </span>
            </div>
          )}

          {isJail && (
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-virus pt-1">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>
                A la cárcel: pierdes {actionResult?.turnsLost ?? tile.turns_lost ?? 1}{' '}
                {(actionResult?.turnsLost ?? tile.turns_lost ?? 1) === 1 ? 'turno' : 'turnos'}.
              </span>
            </div>
          )}

          {isSkull && (
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-danger pt-1">
              <Skull className="w-3.5 h-3.5 shrink-0" />
              <span>Muerte súbita: vuelves al inicio (casilla 1).</span>
            </div>
          )}

          {isBack && (
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-danger pt-1">
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>
                Retroceso: vuelves a la casilla {actionResult?.destination ?? tile.action_jump_to}.
              </span>
            </div>
          )}

          {isFinish && (
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-warning pt-1">
              <Trophy className="w-3.5 h-3.5 shrink-0" />
              <span>Llegada a la meta. Victoria absoluta.</span>
            </div>
          )}

          {drinks > 0 && (
            <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-xl bg-warning-quiet border border-warning-line text-xs font-bold text-warning mt-1">
              <Beer className="w-3.5 h-3.5 shrink-0" />
              <span>
                Castigo: toma {drinks} {drinks === 1 ? 'trago' : 'tragos'}
              </span>
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={handleClose}
          className="w-full min-h-[48px] py-3 px-4 rounded-2xl bg-action text-action-ink font-heading font-extrabold text-sm interactive-action active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus transition-all cursor-pointer flex items-center justify-center gap-2"
          data-testid="close-tile-modal-btn"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Continuar</span>
        </button>
      </div>
    </div>
  );
};

export default TileModal;
