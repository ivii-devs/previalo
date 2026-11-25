import React, { useState, useEffect, useRef } from 'react';
import { Home, Lock, Dices, Flame, Layers } from 'lucide-react';
import { useGameSessionStore } from '../../application/useGameSessionStore';
import { usePlayerStore } from '../../application/usePlayerStore';
import { BoardGrid } from '../components/BoardGrid';
import { Dice3D } from '../components/Dice3D';
import { TileModal } from '../components/TileModal';
import { GameOverModal } from '../components/GameOverModal';
import { CatalogLoader } from '../../infrastructure/catalogLoader';
import { soundService } from '../../infrastructure/soundService';
import { useDragToScroll } from '../hooks/useDragToScroll';
import type { BoardTile, BoardId } from '../../domain/types/board';
import type { Player } from '../../domain/types/player';

export interface GameBoardScreenProps {
  onVictory?: () => void;
  onPlayAgain?: () => void;
  onExitHome: () => void;
}

export const GameBoardScreen: React.FC<GameBoardScreenProps> = ({
  onVictory,
  onPlayAgain,
  onExitHome,
}) => {
  const storeModeConfig = useGameSessionStore((state) => state.modeConfig);
  const modeConfig = storeModeConfig || useGameSessionStore.getState().modeConfig;
  const boardId: BoardId = modeConfig?.boardId || 'guatoca_clasica';
  const hotTiers =
    modeConfig?.hotTiers && modeConfig.hotTiers.length > 0
      ? modeConfig.hotTiers
      : [1, 2, 3];
  const [tiles, setTiles] = useState<BoardTile[]>(modeConfig?.tiles || []);
  const [rolling, setRolling] = useState(false);
  const [activeTileModal, setActiveTileModal] = useState<{
    tile: BoardTile;
    player: Player;
    actionResult?: any;
  } | null>(null);
  const [jailAlert, setJailAlert] = useState<string | null>(null);

  const storePlayers = usePlayerStore((state) => state.players);
  const players = storePlayers.length > 0 ? storePlayers : usePlayerStore.getState().players;
  const storePositions = useGameSessionStore((state) => state.boardPositions);
  const boardPositions =
    Object.keys(storePositions).length > 0
      ? storePositions
      : useGameSessionStore.getState().boardPositions;

  const storeJails = useGameSessionStore((state) => state.boardJails);
  const boardJails = storeJails || useGameSessionStore.getState().boardJails;

  const storeTurnIndex = useGameSessionStore((state) => state.currentTurnPlayerIndex);
  const currentTurnPlayerIndex =
    storeTurnIndex !== undefined
      ? storeTurnIndex
      : useGameSessionStore.getState().currentTurnPlayerIndex;

  const storeLastRoll = useGameSessionStore((state) => state.lastDiceRoll);
  const lastDiceRoll = storeLastRoll ?? useGameSessionStore.getState().lastDiceRoll;
  const storeGameOver = useGameSessionStore((state) => state.isGameOver);
  const isGameOver = storeGameOver || useGameSessionStore.getState().isGameOver;
  const storeWinner = useGameSessionStore((state) => state.winner);
  const winner = storeWinner || useGameSessionStore.getState().winner;
  const rollBoardDice = useGameSessionStore((state) => state.rollBoardDice);
  const startBoardSession = useGameSessionStore((state) => state.startBoardSession);
  const endSession = useGameSessionStore((state) => state.endSession);
  const resetPlayerStats = usePlayerStore((state) => state.resetPlayerStats);

  const scrollRef = useRef<HTMLDivElement>(null);
  useDragToScroll(scrollRef);

  const handlePlayAgain = () => {
    soundService.playTap();
    resetPlayerStats();
    endSession();
    if (onPlayAgain) {
      onPlayAgain();
    } else if (onVictory) {
      onVictory();
    }
  };

  const handleExitHome = () => {
    soundService.playTap();
    endSession();
    onExitHome();
  };

  // Load board tiles and dynamic board cards on mount
  useEffect(() => {
    Promise.all([
      CatalogLoader.loadBoard(boardId),
      CatalogLoader.loadCategory('el_tablero').catch(() => []),
    ])
      .then(([loadedTiles, loadedCards]) => {
        setTiles(loadedTiles);
        const state = useGameSessionStore.getState();
        const activeMode = state.mode;
        const positions = state.boardPositions;
        const currentConfigBoardId = state.modeConfig?.boardId;

        if (
          activeMode !== 'board' ||
          Object.keys(positions).length === 0 ||
          (currentConfigBoardId && currentConfigBoardId !== boardId)
        ) {
          startBoardSession(
            boardId,
            loadedTiles,
            players.length >= 2
              ? players
              : [
                  { id: 'p_1', name: 'Jugador 1', color: '#ff6257', avatar: '🦁', sips: 0, timesTargeted: 0 },
                  { id: 'p_2', name: 'Jugador 2', color: '#4ade9a', avatar: '🦊', sips: 0, timesTargeted: 0 },
                ],
            loadedCards,
            state.modeConfig?.hotTiers || [1, 2, 3]
          );
        }
      })
      .catch((err) => {
        console.error('Failed to load board tiles:', err);
      });
  }, [boardId]);

  // Victory check
  useEffect(() => {
    if (isGameOver) {
      soundService.playVictory();
      if (onVictory && !onPlayAgain) {
        onVictory();
      }
    }
  }, [isGameOver, onVictory, onPlayAgain]);

  const activePlayers =
    players.length >= 2
      ? players
      : [
          { id: 'p_1', name: 'Jugador 1', color: '#ff6257', avatar: '🦁', sips: 0, timesTargeted: 0 },
          { id: 'p_2', name: 'Jugador 2', color: '#4ade9a', avatar: '🦊', sips: 0, timesTargeted: 0 },
        ];

  const currentTurnPlayer = activePlayers[currentTurnPlayerIndex % activePlayers.length];

  const handleRoll = () => {
    if (rolling || isGameOver) return;
    setRolling(true);
    setJailAlert(null);

    setTimeout(() => {
      const result = rollBoardDice();
      setRolling(false);

      if (!result) return;

      if (result.skipped) {
        const playerName = result.player?.name || currentTurnPlayer?.name || 'El jugador';
        setJailAlert(`${playerName} está en la cárcel. Pierde el turno.`);
        soundService.vibrate([80, 40]);
        return;
      }

      if (result.isVictory) {
        soundService.playVictory();
        if (onVictory && !onPlayAgain) {
          onVictory();
        }
        return;
      }

      if (result.tile) {
        const targetPlayer = result.player || currentTurnPlayer;
        if (targetPlayer) {
          setActiveTileModal({
            tile: result.tile,
            player: targetPlayer,
            actionResult: result.actionResult,
          });
        }
      }
    }, 700);
  };

  const badgeStyle =
    boardId === 'guatoca_hot'
      ? 'border-spicy-line bg-spicy-quiet text-spicy'
      : boardId === 'guatoca_todos'
      ? 'border-warning-line bg-warning-quiet text-warning'
      : 'border-success-line bg-success-quiet text-success';

  const badgeIcon =
    boardId === 'guatoca_hot' ? (
      <Flame className="w-3.5 h-3.5 shrink-0" />
    ) : boardId === 'guatoca_todos' ? (
      <Layers className="w-3.5 h-3.5 shrink-0" />
    ) : (
      <Dices className="w-3.5 h-3.5 shrink-0" />
    );

  const badgeLabel =
    boardId === 'guatoca_hot'
      ? `Hot (64) · Niveles ${hotTiers.join(', ')}`
      : boardId === 'guatoca_todos'
      ? `Todos (64) · Niveles ${hotTiers.join(', ')}`
      : 'Clásica (64)';

  return (
    <div
      className="flex-1 min-h-0 flex flex-col h-full w-full max-w-md mx-auto overflow-hidden select-none"
      data-testid="game-board-screen"
    >
      {/* Compact Top Header */}
      <div className="shrink-0 px-3 pt-3 pb-2 space-y-2 border-b border-border bg-background/95">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              soundService.playTap();
              onExitHome();
            }}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-border bg-surface text-text-secondary interactive-surface active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus transition-colors cursor-pointer shrink-0"
            aria-label="Salir al inicio"
            data-testid="exit-board-btn"
          >
            <Home className="w-4 h-4" />
          </button>

          {/* Read-only Active Board Modality Badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${badgeStyle}`}
            data-testid="active-board-badge"
          >
            {badgeIcon}
            <span>{badgeLabel}</span>
          </div>
        </div>

        {/* Compact Turn Player Banner */}
        {currentTurnPlayer && (
          <div
            style={{ borderLeftColor: currentTurnPlayer.color || 'var(--pv-action)' }}
            className="flex items-center justify-between px-3 py-2 rounded-xl border border-border border-l-4 bg-surface"
            data-testid="turn-player-banner"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl shrink-0" aria-hidden="true">
                {currentTurnPlayer.avatar || '👤'}
              </span>
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-text-muted leading-none">
                  Turno de
                </div>
                <div className="font-heading text-sm font-bold text-text truncate mt-0.5">
                  {currentTurnPlayer.name}
                </div>
              </div>
            </div>

            <div className="text-right shrink-0 pl-2">
              <div className="text-[11px] text-text-muted leading-none">Casilla actual</div>
              <div className="font-mono text-base font-bold text-success mt-0.5 tabular-nums">
                #{boardPositions[currentTurnPlayer.id] ?? 1}
              </div>
            </div>
          </div>
        )}

        {/* Jail Alert Notification */}
        {jailAlert && (
          <div className="p-2.5 rounded-xl bg-virus-quiet border border-virus-line text-virus text-xs flex items-center gap-2">
            <Lock className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{jailAlert}</span>
          </div>
        )}
      </div>

      {/* Full-Width Scrollable Serpentine Board Grid (Zero card-in-card) */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto scroll-container px-2.5 py-2.5"
      >
        {tiles.length > 0 ? (
          <BoardGrid
            tiles={tiles}
            boardPositions={boardPositions}
            boardJails={boardJails}
            players={activePlayers}
            currentTurnPlayerId={currentTurnPlayer?.id}
            onTileClick={(tile) => {
              setActiveTileModal({
                tile,
                player: currentTurnPlayer,
              });
            }}
          />
        ) : (
          <div
            className="grid grid-cols-4 gap-2 py-1"
            aria-label="Cargando tablero"
            data-testid="board-loading-skeleton"
          >
            {Array.from({ length: 16 }).map((_, idx) => (
              <div
                key={idx}
                className="min-h-[84px] rounded-xl border border-border bg-surface skeleton-shimmer"
              />
            ))}
          </div>
        )}
      </div>

      {/* Compact Horizontal Dice Dock in Thumb-Zone */}
      <div className="shrink-0 border-t border-border bg-surface px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
        <Dice3D
          rolling={rolling}
          value={lastDiceRoll}
          onRoll={handleRoll}
          disabled={rolling || isGameOver}
        />
      </div>

      {/* Tile Arrival Modal */}
      <TileModal
        isOpen={activeTileModal !== null}
        tile={activeTileModal?.tile ?? null}
        player={activeTileModal?.player ?? null}
        actionResult={activeTileModal?.actionResult}
        onClose={() => setActiveTileModal(null)}
      />

      {/* Game Over Modal */}
      <GameOverModal
        isOpen={isGameOver}
        winnerName={winner?.name}
        onPlayAgain={handlePlayAgain}
        onExitHome={handleExitHome}
      />
    </div>
  );
};

export default GameBoardScreen;
