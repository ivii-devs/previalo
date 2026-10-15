import React from 'react';
import { Beer, Skull, Lock, ArrowUpRight, Trophy, Sparkles, CheckCircle2 } from 'lucide-react';
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
        return <ArrowUpRight className="w-8 h-8 text-cyan-400" />;
      case 'trap_jail':
        return <Lock className="w-8 h-8 text-purple-400" />;
      case 'trap_skull':
        return <Skull className="w-8 h-8 text-rose-400" />;
      case 'finish':
        return <Trophy className="w-8 h-8 text-yellow-400" />;
      case 'drink':
        return <Beer className="w-8 h-8 text-amber-400" />;
      default:
        return <Sparkles className="w-8 h-8 text-[var(--accent-primary)]" />;
    }
  };

  const drinks = actionResult?.drinks ?? tile.drinks_action ?? 0;
  const isJump = tile.tile_type === 'jump' || actionResult?.actionType === 'jump';
  const isJail = tile.tile_type === 'trap_jail' || actionResult?.actionType === 'trap_jail';
  const isSkull = tile.tile_type === 'trap_skull' || actionResult?.actionType === 'trap_skull';
  const isFinish = tile.tile_type === 'finish' || actionResult?.actionType === 'finish';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none animate-in fade-in duration-200"
      data-testid="tile-modal"
    >
      <div className="w-full max-w-sm rounded-3xl border-2 theme-border bg-[var(--bg-surface)] p-6 shadow-[var(--glow-shadow)] flex flex-col items-center text-center space-y-4">
        {/* Header Icon */}
        <div className="w-16 h-16 rounded-2xl bg-[var(--bg-elevated)] border theme-border flex items-center justify-center shadow-inner">
          {renderIcon()}
        </div>

        {/* Tile Title & Number */}
        <div className="space-y-1">
          <div className="text-xs font-black uppercase tracking-wider text-[var(--accent-primary)]">
            Casilla #{tile.tile_number}
          </div>
          <h3 className="text-xl font-black theme-text-primary">
            {tile.title || '¡Evento de Tablero!'}
          </h3>
        </div>

        {/* Player Name Banner */}
        {player && (
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[var(--bg-elevated)] border theme-border">
            <span>{player.avatar || '👤'}</span>
            <span className="theme-text-primary">{player.name}</span>
          </div>
        )}

        {/* Tile Description */}
        <div className="w-full p-4 rounded-2xl border theme-border bg-[var(--bg-elevated)] space-y-2">
          <p className="text-sm font-semibold theme-text-primary leading-relaxed">
            {tile.description}
          </p>

          {/* Special Action Callouts */}
          {isJump && (
            <div className="text-xs font-black text-cyan-300">
              ¡De oca a oca! Salta a la casilla {actionResult?.destination ?? tile.action_jump_to} y vuelve a tirar.
            </div>
          )}

          {isJail && (
            <div className="text-xs font-black text-purple-300">
              🔒 ¡A la Cárcel! Pierdes {actionResult?.turnsLost ?? tile.turns_lost ?? 1} turnos.
            </div>
          )}

          {isSkull && (
            <div className="text-xs font-black text-rose-300">
              💀 ¡Muerte súbita! Vuelves al inicio (casilla 1).
            </div>
          )}

          {isFinish && (
            <div className="text-xs font-black text-yellow-300 animate-pulse">
              🏆 ¡Llegada a la Meta! ¡Victoria absoluta!
            </div>
          )}

          {drinks > 0 && (
            <div className="flex items-center justify-center space-x-1 text-xs font-black text-amber-400 pt-1">
              <Beer className="w-3.5 h-3.5" />
              <span>Castigo: toma {drinks} {drinks === 1 ? 'trago' : 'tragos'}</span>
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          onClick={handleClose}
          className="w-full py-3 px-4 rounded-2xl bg-[var(--accent-primary)] hover:brightness-110 active:scale-95 text-white font-black text-sm tracking-wide shadow-[var(--glow-shadow)] transition-all cursor-pointer flex items-center justify-center space-x-2"
          data-testid="close-tile-modal-btn"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>CONTINUAR</span>
        </button>
      </div>
    </div>
  );
};

export default TileModal;
