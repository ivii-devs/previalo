import React, { useState, useEffect } from 'react';
import { Home, Lock } from 'lucide-react';
import { useGameSessionStore } from '../../application/useGameSessionStore';
import { usePlayerStore } from '../../application/usePlayerStore';
import { BoardGrid } from '../components/BoardGrid';
import { Dice3D } from '../components/Dice3D';
import { TileModal } from '../components/TileModal';
import { CatalogLoader } from '../../infrastructure/catalogLoader';
import { soundService } from '../../infrastructure/soundService';
import type { BoardTile, BoardId } from '../../domain/types/board';
import type { Player } from '../../domain/types/player';

export interface GameBoardScreenProps {
  onVictory: () => void;
  onExitHome: () => void;
}

export const GameBoardScreen: React.FC<GameBoardScreenProps> = ({
  onVictory,
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
  const boardPositions = Object.keys(storePositions).length > 0 ? storePositions : useGameSessionStore.getState().boardPositions;

  const storeJails = useGameSessionStore((state) => state.boardJails);
  const boardJails = storeJails || useGameSessionStore.getState().boardJails;

  const storeTurnIndex = useGameSessionStore((state) => state.currentTurnPlayerIndex);
  const currentTurnPlayerIndex = storeTurnIndex !== undefined ? storeTurnIndex : useGameSessionStore.getState().currentTurnPlayerIndex;

  const storeLastRoll = useGameSessionStore((state) => state.lastDiceRoll);
  const lastDiceRoll = storeLastRoll ?? useGameSessionStore.getState().lastDiceRoll;
  const isGameOver = useGameSessionStore((state) => state.isGameOver);
  const rollBoardDice = useGameSessionStore((state) => state.rollBoardDice);
  const startBoardSession = useGameSessionStore((state) => state.startBoardSession);

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
                  { id: 'p_1', name: 'Jugador 1', color: '#ec4899', avatar: '🦁', sips: 0, timesTargeted: 0 },
                  { id: 'p_2', name: 'Jugador 2', color: '#06b6d4', avatar: '🦊', sips: 0, timesTargeted: 0 },
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
      onVictory();
    }
  }, [isGameOver, onVictory]);

  const activePlayers = players.length >= 2 ? players : [
    { id: 'p_1', name: 'Jugador 1', color: '#ec4899', avatar: '🦁', sips: 0, timesTargeted: 0 },
    { id: 'p_2', name: 'Jugador 2', color: '#06b6d4', avatar: '🦊', sips: 0, timesTargeted: 0 },
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
        setJailAlert(`${playerName} está en la cárcel. ¡Pierde el turno!`);
        soundService.vibrate([80, 40]);
        return;
      }

      // Check victory
      if (result.isVictory) {
        onVictory();
        return;
      }

      // Open landing tile modal for special actions or rules
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
      ? 'border-rose-500/40 bg-rose-500/15 text-rose-300'
      : boardId === 'guatoca_todos'
      ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
      : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300';

  const badgeLabel =
    boardId === 'guatoca_hot'
      ? `🌶️ Hot (64) · Niveles ${hotTiers.join(', ')}`
      : boardId === 'guatoca_todos'
      ? `🎲 Todos (64) · Niveles ${hotTiers.join(', ')}`
      : '🍻 Clásica (64)';

  return (
    <div
      className="flex flex-col h-full w-full max-w-md mx-auto justify-between px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] overflow-hidden select-none"
      data-testid="game-board-screen"
    >
      {/* Top Header */}
      <div className="space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              soundService.playTap();
              onExitHome();
            }}
            className="p-2 rounded-xl border theme-border bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
            aria-label="Salir al inicio"
            data-testid="exit-board-btn"
          >
            <Home className="w-4 h-4" />
          </button>

          {/* Read-only Active Board Modality Badge */}
          <div
            className={`px-3 py-1 rounded-full border text-xs font-black tracking-wide ${badgeStyle}`}
            data-testid="active-board-badge"
          >
            {badgeLabel}
          </div>
        </div>

        {/* Current Turn Player Banner */}
        {currentTurnPlayer && (
          <div
            style={{ borderColor: currentTurnPlayer.color || '#ec4899' }}
            className="flex items-center justify-between p-2.5 rounded-2xl border-2 bg-[var(--bg-surface)] shadow-sm"
            data-testid="turn-player-banner"
          >
            <div className="flex items-center space-x-2">
              <span className="text-xl">{currentTurnPlayer.avatar || '👤'}</span>
              <div>
                <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">
                  Turno de
                </div>
                <div className="text-sm font-black theme-text-primary">
                  {currentTurnPlayer.name}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] theme-text-muted">Casilla actual</div>
              <div className="text-base font-black text-emerald-400">
                #{boardPositions[currentTurnPlayer.id] ?? 1}
              </div>
            </div>
          </div>
        )}

        {/* Jail Alert Notification */}
        {jailAlert && (
          <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-200 text-xs flex items-center space-x-2 animate-pulse">
            <Lock className="w-4 h-4 shrink-0 text-purple-400" />
            <span className="font-bold">{jailAlert}</span>
          </div>
        )}
      </div>

      {/* Main Center Area: Serpentine Board Grid */}
      <div className="flex-1 overflow-y-auto my-2 rounded-2xl border theme-border bg-[var(--bg-surface)] p-2">
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
          <div className="flex items-center justify-center h-full text-xs theme-text-muted">
            Cargando tablero...
          </div>
        )}
      </div>

      {/* Bottom Dice Rolling Zone */}
      <div className="pt-2 shrink-0 border-t theme-border bg-[var(--bg-surface)] p-3 rounded-2xl shadow-lg">
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
    </div>
  );
};

export default GameBoardScreen;
