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
      const rowIndex = Math.floor(i / cols);
      if (rowIndex % 2 === 1) {
        row.reverse();
      }
      result.push(row);
    }
    return result;
  }, [tiles]);

  // 4 unified semantic tile families:
  // 1) Start & Finish (success / warning)
  // 2) Drinks & Jumps (warning / info)
  // 3) Traps (danger / virus)
  // 4) Action & Dynamics (clean neutral matte surface)
  const getTileStyle = (tile: BoardTile) => {
    switch (tile.tile_type) {
      case 'start':
        return 'border-success-line bg-success-quiet text-text';
      case 'finish':
        return 'border-warning bg-warning-quiet text-text';
      case 'jump':
        return 'border-info-line bg-info-quiet text-text';
      case 'drink':
      case 'give_drink':
        return 'border-warning-line bg-warning-quiet text-text';
      case 'trap_jail':
        return 'border-virus-line bg-virus-quiet text-text';
      case 'trap_skull':
      case 'trap_back':
        return 'border-danger-line bg-danger-quiet text-text';
      default:
        return 'border-border bg-surface text-text interactive-card';
    }
  };

  const renderTileIcon = (tile: BoardTile) => {
    switch (tile.tile_type) {
      case 'start':
        return <Flag className="w-3.5 h-3.5 text-success shrink-0" />;
      case 'finish':
        return <Trophy className="w-3.5 h-3.5 text-warning shrink-0" />;
      case 'jump':
        return <ArrowUpRight className="w-3.5 h-3.5 text-info shrink-0" />;
      case 'trap_jail':
        return <Lock className="w-3.5 h-3.5 text-virus shrink-0" />;
      case 'trap_skull':
        return <Skull className="w-3.5 h-3.5 text-danger shrink-0" />;
      case 'trap_back':
        return <RotateCcw className="w-3.5 h-3.5 text-danger shrink-0" />;
      case 'drink':
        return <Beer className="w-3.5 h-3.5 text-warning shrink-0" />;
      case 'give_drink':
        return <Gift className="w-3.5 h-3.5 text-warning shrink-0" />;
      case 'truth':
        return <Eye className="w-3 h-3 text-text-muted shrink-0" />;
      case 'versus':
        return <Swords className="w-3 h-3 text-text-muted shrink-0" />;
      case 'group_event':
        return <Users className="w-3 h-3 text-text-muted shrink-0" />;
      case 'yo_nunca':
        return <Hand className="w-3 h-3 text-text-muted shrink-0" />;
      case 'challenge':
        return <Sparkles className="w-3 h-3 text-text-muted shrink-0" />;
      default:
        return null;
    }
  };

  return (
    <div
      className="w-full max-w-md mx-auto space-y-2 py-1 select-none"
      data-testid="board-grid"
    >
      {rows.map((row, rIdx) => (
        <div key={rIdx} className="grid grid-cols-4 gap-1.5 min-[380px]:gap-2">
          {row.map((tile) => {
            const pawnsOnTile = playersByTile.get(tile.tile_number) || [];
            const hasTurnPlayer = pawnsOnTile.some((p) => p.id === currentTurnPlayerId);

            return (
              <button
                key={tile.tile_number}
                type="button"
                onClick={() => onTileClick?.(tile)}
                className={`relative min-h-[84px] rounded-xl border px-1 py-1.5 flex flex-col justify-between items-center transition-all cursor-pointer active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${getTileStyle(
                  tile
                )} ${
                  hasTurnPlayer
                    ? 'ring-2 ring-action ring-offset-1 ring-offset-background'
                    : ''
                }`}
                title={`${tile.tile_number}. ${tile.title || tile.description}`}
                data-testid={`board-tile-${tile.tile_number}`}
              >
                {/* Top Tile Number & Semantic Icon */}
                <div className="w-full flex items-center justify-between text-[11px] font-mono font-bold leading-none text-text-muted px-0.5">
                  <span>{tile.tile_number}</span>
                  {renderTileIcon(tile)}
                </div>

                {/* Tile Title (clean Spanish syllable legibility, zero truncation) */}
                <span className="text-[9.5px] font-semibold text-center line-clamp-3 w-full leading-[1.15] tracking-[-0.02em] break-words hyphens-auto my-0.5 text-text">
                  {tile.title || tile.tile_type}
                </span>

                {/* Player Pawns on this tile */}
                <div className="flex flex-wrap items-center justify-center -space-x-1 min-h-[20px]">
                  {pawnsOnTile.map((p) => {
                    const isTurn = p.id === currentTurnPlayerId;
                    const inJail = (boardJails[p.id] ?? 0) > 0;

                    return (
                      <div
                        key={p.id}
                        style={{
                          borderColor: p.color || 'var(--pv-action)',
                        }}
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border-2 bg-background text-text relative ${
                          isTurn ? 'scale-110 z-20 ring-1 ring-action' : 'z-10'
                        }`}
                        title={`${p.name}${inJail ? ' (Cárcel)' : ''}`}
                        data-testid={`pawn-${p.id}`}
                      >
                        <span aria-hidden="true">{p.avatar || '👤'}</span>
                        {inJail && (
                          <div
                            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-virus text-virus-ink flex items-center justify-center"
                            aria-label="En la cárcel"
                          >
                            <Lock className="w-2 h-2" />
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
