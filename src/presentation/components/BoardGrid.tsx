import React, { useMemo } from 'react';
import {
  Skull,
  Lock,
  ArrowUpRight,
  Trophy,
  Beer,
  Sparkles,
  Flag,
  RotateCcw,
  Gift,
  Eye,
  Swords,
  Users,
  Hand,
} from 'lucide-react';
import type { BoardTile } from '../../domain/types/board';
import type { Player } from '../../domain/types/player';

export interface BoardGridProps {
  tiles: BoardTile[];
  boardPositions: Record<string, number>;
  boardJails?: Record<string, number>;
  players: Player[];
  currentTurnPlayerId?: string;
  onTileClick?: (tile: BoardTile) => void;
}

export const BoardGrid: React.FC<BoardGridProps> = ({
  tiles,
  boardPositions,
  boardJails = {},
  players,
  currentTurnPlayerId,
  onTileClick,
}) => {
  // Map tile numbers to players present on that tile
  const playersByTile = useMemo(() => {
    const map = new Map<number, Player[]>();
    for (const player of players) {
      const pos = boardPositions[player.id] ?? 1;
      const list = map.get(pos) || [];
      list.push(player);
      map.set(pos, list);
    }
    return map;
  }, [players, boardPositions]);

  // Group tiles into rows of 4 for serpentine layout
  const rows = useMemo(() => {
    const result: BoardTile[][] = [];
    const sorted = [...tiles].sort((a, b) => a.tile_number - b.tile_number);
    const cols = 4;
    for (let i = 0; i < sorted.length; i += cols) {
      const row = sorted.slice(i, i + cols);
      // Alternate direction every row (serpentine)
      const rowIndex = Math.floor(i / cols);
      if (rowIndex % 2 === 1) {
        row.reverse();
      }
      result.push(row);
    }
    return result;
  }, [tiles]);

  const getTileStyle = (tile: BoardTile) => {
    switch (tile.tile_type) {
      case 'start':
        return 'border-emerald-500 bg-emerald-950/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]';
      case 'finish':
        return 'border-yellow-400 bg-yellow-950/50 text-yellow-300 shadow-[0_0_16px_rgba(250,204,21,0.5)] animate-pulse';
      case 'jump':
        return 'border-cyan-400 bg-cyan-950/40 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.35)]';
      case 'trap_jail':
        return 'border-purple-500 bg-purple-950/40 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.35)]';
      case 'trap_skull':
        return 'border-rose-500 bg-rose-950/50 text-rose-300 shadow-[0_0_14px_rgba(244,63,94,0.4)]';
      case 'trap_back':
        return 'border-orange-500/80 bg-orange-950/40 text-orange-300';
      case 'drink':
      case 'give_drink':
        return 'border-amber-500/80 bg-amber-950/30 text-amber-300';
      case 'truth':
        return 'border-pink-500/80 bg-pink-950/30 text-pink-300';
      case 'versus':
        return 'border-sky-500/80 bg-sky-950/30 text-sky-300';
      case 'group_event':
      case 'yo_nunca':
        return 'border-teal-500/80 bg-teal-950/30 text-teal-300';
      case 'challenge':
        return 'border-indigo-500/80 bg-indigo-950/30 text-indigo-300';
      default:
        return 'theme-border bg-[var(--bg-elevated)] text-[var(--text-primary)]';
    }
  };

  const renderTileIcon = (tile: BoardTile) => {
    switch (tile.tile_type) {
      case 'start':
        return <Flag className="w-3.5 h-3.5 text-emerald-400" />;
      case 'finish':
        return <Trophy className="w-4 h-4 text-yellow-400" />;
      case 'jump':
        return <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />;
      case 'trap_jail':
        return <Lock className="w-3.5 h-3.5 text-purple-400" />;
      case 'trap_skull':
        return <Skull className="w-3.5 h-3.5 text-rose-400" />;
      case 'trap_back':
        return <RotateCcw className="w-3.5 h-3.5 text-orange-400" />;
      case 'drink':
        return <Beer className="w-3 h-3 text-amber-400" />;
      case 'give_drink':
        return <Gift className="w-3 h-3 text-amber-400" />;
      case 'truth':
        return <Eye className="w-3 h-3 text-pink-400" />;
      case 'versus':
        return <Swords className="w-3 h-3 text-sky-400" />;
      case 'group_event':
        return <Users className="w-3 h-3 text-teal-400" />;
      case 'yo_nunca':
        return <Hand className="w-3 h-3 text-teal-400" />;
      case 'challenge':
        return <Sparkles className="w-3 h-3 text-indigo-400" />;
      default:
        return null;
    }
  };

  return (
    <div
      className="w-full max-w-md mx-auto space-y-2 p-2 select-none overflow-y-auto"
      data-testid="board-grid"
    >
      {rows.map((row, rIdx) => (
        <div key={rIdx} className="grid grid-cols-4 gap-2">
          {row.map((tile) => {
            const pawnsOnTile = playersByTile.get(tile.tile_number) || [];
            const hasTurnPlayer = pawnsOnTile.some((p) => p.id === currentTurnPlayerId);

            return (
              <button
                key={tile.tile_number}
                onClick={() => onTileClick?.(tile)}
                className={`relative aspect-square rounded-2xl border-2 p-1.5 flex flex-col justify-between items-center transition-all cursor-pointer hover:scale-105 active:scale-95 ${getTileStyle(
                  tile
                )} ${hasTurnPlayer ? 'ring-2 ring-[var(--accent-primary)] ring-offset-1 ring-offset-black' : ''}`}
                title={`${tile.tile_number}. ${tile.title || tile.description}`}
                data-testid={`board-tile-${tile.tile_number}`}
              >
                {/* Top Tile Number & Icon */}
                <div className="w-full flex items-center justify-between text-[10px] font-black leading-none">
                  <span>{tile.tile_number}</span>
                  {renderTileIcon(tile)}
                </div>

                {/* Tile Title Snippet */}
                <span className="text-[9px] font-bold text-center line-clamp-1 w-full opacity-90 px-0.5">
                  {tile.title || tile.tile_type}
                </span>

                {/* Pawns on this tile */}
                <div className="flex flex-wrap items-center justify-center -space-x-1 min-h-[18px]">
                  {pawnsOnTile.map((p) => {
                    const isTurn = p.id === currentTurnPlayerId;
                    const inJail = (boardJails[p.id] ?? 0) > 0;

                    return (
                      <div
                        key={p.id}
                        style={{
                          borderColor: p.color || '#ec4899',
                          boxShadow: isTurn ? `0 0 8px ${p.color || '#ec4899'}` : 'none',
                        }}
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border-2 bg-black text-white relative ${
                          isTurn ? 'scale-110 z-20 animate-pulse' : 'z-10'
                        }`}
                        title={`${p.name}${inJail ? ' (Cárcel)' : ''}`}
                        data-testid={`pawn-${p.id}`}
                      >
                        <span>{p.avatar || '👤'}</span>
                        {inJail && (
                          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-purple-600 flex items-center justify-center text-[7px]">
                            🔒
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default BoardGrid;
