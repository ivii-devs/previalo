import React, { useState, useRef } from 'react';
import { 
  UserPlus, 
  Trash2, 
  Play, 
  ArrowLeft, 
  Users, 
  AlertCircle 
} from 'lucide-react';
import { usePlayerStore } from '../../application/usePlayerStore';
import { useGameSessionStore } from '../../application/useGameSessionStore';
import { CardEngine } from '../../domain/engines/CardEngine';
import { CatalogLoader } from '../../infrastructure/catalogLoader';
import { soundService } from '../../infrastructure/soundService';
import { useDragToScroll } from '../hooks/useDragToScroll';
import type { IntensityLevel } from '../../domain/types/card';
import type { BoardId } from '../../domain/types/board';

export interface SetupScreenProps {
  mode: 'category' | 'preset' | 'chaos' | 'board';
  targetId?: string;
  onStartGame: (mode: 'cards' | 'board') => void;
  onBack: () => void;
}

const INTENSITY_OPTIONS: Array<{ level: IntensityLevel | 0; label: string; icon: string; desc: string }> = [
  { level: 0, label: 'Todas', icon: '✨', desc: 'Sin filtro de intensidad' },
  { level: 1, label: 'Chill', icon: '🍹', desc: '1 trago, relajado' },
  { level: 2, label: 'Fiesta', icon: '🍻', desc: '1-2 tragos, diversión clásica' },
  { level: 3, label: 'Hot', icon: '🌶️', desc: '2-3 tragos, picante e indiscreto' },
  { level: 4, label: 'Extremo', icon: '⚡', desc: '3-5 tragos, para valientes' },
];

export const SetupScreen: React.FC<SetupScreenProps> = ({
  mode,
  targetId,
  onStartGame,
  onBack,
}) => {
  const [playerName, setPlayerName] = useState('');
  const [intensity, setIntensity] = useState<IntensityLevel | 0>(0);
  const [boardId, setBoardId] = useState<BoardId>('guatoca_clasica');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const storePlayers = usePlayerStore((state) => state.players);
  const storeHistorical = usePlayerStore((state) => state.historicalPlayers);
  const players = storePlayers.length > 0 ? storePlayers : usePlayerStore.getState().players;
  const historicalPlayers = storeHistorical.length > 0 ? storeHistorical : usePlayerStore.getState().historicalPlayers;
  const addPlayer = usePlayerStore((state) => state.addPlayer);
  const quickAddPlayer = usePlayerStore((state) => state.quickAddPlayer);
  const removePlayer = usePlayerStore((state) => state.removePlayer);

  // Filter available quick add chips (exclude currently active players)
  const activePlayerNames = new Set(players.map((p) => p.name.trim().toLowerCase()));
  const availableQuickAdds = historicalPlayers.filter(
    (name) => !activePlayerNames.has(name.trim().toLowerCase())
  );

  const handleAddPlayer = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = playerName.trim();
    if (!trimmed) return;

    soundService.playTap();
    soundService.vibrate(10);
    const created = addPlayer(trimmed);
    if (created) {
      setPlayerName('');
      setErrorMsg(null);
    }
  };

  const handleQuickAdd = (name: string) => {
    soundService.playTap();
    soundService.vibrate(10);
    quickAddPlayer(name);
    setErrorMsg(null);
  };

  const handleRemove = (id: string) => {
    soundService.playTap();
    removePlayer(id);
  };

  const handleStart = async () => {
    if (players.length < 2) {
      setErrorMsg('Se necesitan al menos 2 jugadores para jugar.');
      soundService.vibrate([40, 40]);
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (mode === 'board') {
        // Load board tiles
        const tiles = await CatalogLoader.loadBoard(boardId);
        useGameSessionStore.getState().startBoardSession(boardId, tiles, players);
        soundService.playVictory();
        onStartGame('board');
        return;
      }

      // Card modes: category, preset, or chaos
      const engine = new CardEngine();
      let deck: any[] = [];
      const intensityFilter = intensity > 0 ? { intensity: intensity as IntensityLevel } : undefined;

      if (mode === 'category') {
        const catId = targetId || 'yo_nunca';
        const cards = await CatalogLoader.loadCategory(catId);
        deck = engine.buildCategoryDeck(cards, intensityFilter);
      } else if (mode === 'preset') {
        const presetId = targetId || 'modo_caliente';
        const cards = await CatalogLoader.loadPreset(presetId);
        deck = engine.buildPresetDeck(cards, intensityFilter);
      } else {
        // Chaos mode
        const manifest = await CatalogLoader.loadManifest();
        const categoriesCards: Record<string, any[]> = {};
        for (const cat of manifest.categories.slice(0, 9)) {
          if (cat.category_id === 'guerra_equipos') continue;
          try {
            const cards = await CatalogLoader.loadCategory(cat.category_id);
            categoriesCards[cat.category_id] = cards;
          } catch {
            // continue
          }
        }
        deck = engine.buildChaosDeck(categoriesCards, intensityFilter);
      }

      if (deck.length === 0) {
        setErrorMsg('No hay cartas disponibles con la intensidad seleccionada.');
        setIsLoading(false);
        return;
      }

      useGameSessionStore.getState().startCardSession(
        deck,
        mode,
        { intensity: intensity > 0 ? (intensity as IntensityLevel) : 2, targetId },
        players
      );

      soundService.playSwipe();
      onStartGame('cards');
    } catch (err) {
      setErrorMsg(`Error al cargar las cartas: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getModeTitle = () => {
    switch (mode) {
      case 'chaos':
        return 'Modo Caos';
      case 'preset':
        return targetId === 'modo_caliente' ? 'Modo Spicy' : 'Modo Parejas';
      case 'board':
        return 'El Tablero';
      default: {
        const CATEGORY_TITLES: Record<string, string> = {
          yo_nunca: 'Yo Nunca',
          retos_y_virus: 'Retos y Virus',
          que_prefieres: '¿Qué Prefieres?',
          verdad_o_reto: 'Verdad o Reto',
          quien_es_mas_probable: '¿Quién es Más Probable?',
          confesiones: 'Confesiones',
          mesa_y_minijuegos: 'Mesa y Minijuegos',
          guerra_equipos: 'Guerra de Equipos',
          el_tablero: 'El Tablero',
        };
        return (targetId && CATEGORY_TITLES[targetId]) || 'Modo Categoría';
      }
    }
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  useDragToScroll(scrollRef);

  return (
    <div
      ref={scrollRef}
      className="flex-1 min-h-0 h-full flex flex-col w-full max-w-md mx-auto px-4 pt-4 pb-[calc(3rem+env(safe-area-inset-bottom,20px))] space-y-4 overflow-y-auto select-none scroll-container"
      data-testid="setup-screen"
    >
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between border-b theme-border pb-3">
        <button
          onClick={() => {
            soundService.playTap();
            onBack();
          }}
          className="flex items-center space-x-1 text-xs font-bold theme-text-muted hover:text-white transition-colors cursor-pointer"
          data-testid="setup-back-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>

        <h1 className="text-base font-black uppercase tracking-wider theme-text-primary">
          {getModeTitle()}
        </h1>

        <div className="w-12 text-right text-xs font-black theme-accent-primary">
          {players.length} 👥
        </div>
      </div>

      {/* Error Notice */}
      {errorMsg && (
        <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Board Selector if Mode is Board */}
      {mode === 'board' && (
        <div className="p-4 rounded-2xl border theme-border bg-[var(--bg-surface)] space-y-2.5">
          <label className="text-xs font-black uppercase tracking-wider theme-text-muted">
            Selecciona el Tablero
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                soundService.playTap();
                setBoardId('guatoca_clasica');
              }}
              className={`p-3 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                boardId === 'guatoca_clasica'
                  ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 ring-1 ring-emerald-500'
                  : 'theme-border bg-[var(--bg-elevated)] text-[var(--text-muted)]'
              }`}
              data-testid="board-select-clasica"
            >
              <div className="font-black text-sm">Clásica 🍻</div>
              <div className="text-[10px] opacity-80">45 casillas de pura previa</div>
            </button>

            <button
              onClick={() => {
                soundService.playTap();
                setBoardId('guatoca_hot');
              }}
              className={`p-3 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                boardId === 'guatoca_hot'
                  ? 'border-rose-500 bg-rose-950/40 text-rose-300 ring-1 ring-rose-500'
                  : 'theme-border bg-[var(--bg-elevated)] text-[var(--text-muted)]'
              }`}
              data-testid="board-select-hot"
            >
              <div className="font-black text-sm">Hot 🌶️</div>
              <div className="text-[10px] opacity-80">40 casillas picantes</div>
            </button>
          </div>
        </div>
      )}

      {/* Intensity Selector (for card sessions) */}
      {mode !== 'board' && (
        <div className="p-4 rounded-2xl border theme-border bg-[var(--bg-surface)] space-y-2.5">
          <label className="text-xs font-black uppercase tracking-wider theme-text-muted flex items-center justify-between">
            <span>Filtro de Intensidad</span>
            <span className="text-[10px] lowercase font-normal">
              {INTENSITY_OPTIONS.find((o) => o.level === intensity)?.desc}
            </span>
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {INTENSITY_OPTIONS.map((opt) => {
              const active = intensity === opt.level;
              return (
                <button
                  key={opt.level}
                  onClick={() => {
                    soundService.playTap();
                    setIntensity(opt.level);
                  }}
                  className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer ${
                    active
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/20 theme-accent-primary font-black shadow-sm'
                      : 'theme-border bg-[var(--bg-elevated)] theme-text-muted font-bold hover:text-white'
                  }`}
                  data-testid={`intensity-opt-${opt.level}`}
                >
                  <div className="text-sm">{opt.icon}</div>
                  <div className="text-[10px] mt-0.5 truncate">{opt.label}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Player Management Section */}
      <div className="p-4 rounded-2xl border theme-border bg-[var(--bg-surface)] space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase tracking-wider theme-text-muted flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 theme-accent-primary" />
            <span>Jugadores ({players.length})</span>
          </label>
          <span className="text-[10px] theme-text-muted">Mínimo 2 jugadores</span>
        </div>

        {/* Add Player Input Form */}
        <form onSubmit={handleAddPlayer} className="flex gap-2">
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Nombre del jugador..."
            maxLength={18}
            inputMode="text"
            enterKeyHint="done"
            autoCapitalize="words"
            autoCorrect="off"
            spellCheck="false"
            className="flex-1 px-3 py-2.5 rounded-xl border theme-border bg-[var(--bg-elevated)] theme-text-primary text-base focus:outline-none focus:border-[var(--accent-primary)]"
            data-testid="player-name-input"
          />
          <button
            type="submit"
            disabled={!playerName.trim()}
            className="px-4 py-2.5 min-h-[44px] rounded-xl bg-[var(--accent-primary)] text-white font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
            data-testid="add-player-btn"
          >
            <UserPlus className="w-4 h-4" />
            <span>Agregar</span>
          </button>
        </form>

        {/* 1-Tap Quick Add Chips */}
        {availableQuickAdds.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-bold theme-text-muted uppercase tracking-wider">
              Agregar Rápido:
            </span>
            <div className="flex flex-wrap gap-1.5" data-testid="quick-add-chips">
              {availableQuickAdds.slice(0, 6).map((name) => (
                <button
                  key={name}
                  onClick={() => handleQuickAdd(name)}
                  className="px-2.5 py-1 min-h-[36px] rounded-full text-xs font-bold border theme-border bg-[var(--bg-elevated)] hover:border-[var(--accent-primary)] text-white/90 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                  data-testid={`quick-add-${name}`}
                >
                  <span>+</span>
                  <span>{name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active Player Roster List */}
        <div className="space-y-2 pt-2" data-testid="player-roster">
          {players.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed theme-border text-center text-xs theme-text-muted">
              Agrega al menos 2 jugadores para empezar la previa.
            </div>
          ) : (
            players.map((p, index) => (
              <div
                key={p.id}
                style={{ borderColor: p.color || '#ec4899' }}
                className="flex items-center justify-between p-2.5 rounded-xl border bg-[var(--bg-elevated)] text-sm shadow-xs"
                data-testid={`player-item-${p.id}`}
              >
                <div className="flex items-center space-x-2.5">
                  <span className="text-lg">{p.avatar || '👤'}</span>
                  <span className="font-bold theme-text-primary">{p.name}</span>
                  {index === 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold uppercase">
                      Inicia
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleRemove(p.id)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                  aria-label={`Eliminar a ${p.name}`}
                  data-testid={`remove-player-${p.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Start Button CTA */}
      <div className="pt-2">
        <button
          onClick={handleStart}
          disabled={players.length < 2 || isLoading}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white font-black text-base uppercase tracking-wider shadow-[var(--glow-shadow)] hover:brightness-110 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center space-x-2"
          data-testid="start-game-btn"
        >
          {isLoading ? (
            <span>Cargando cartas...</span>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              <span>¡EMPEZAR PREVIA!</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SetupScreen;
