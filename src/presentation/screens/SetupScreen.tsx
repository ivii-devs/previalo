import React, { useState, useRef, useMemo } from 'react';
import { 
  UserPlus, 
  Trash2, 
  Play, 
  ArrowLeft, 
  Users, 
  AlertCircle,
  SlidersHorizontal,
  Flame,
  Check
} from 'lucide-react';
import { usePlayerStore } from '../../application/usePlayerStore';
import { useGameSessionStore } from '../../application/useGameSessionStore';
import { CardEngine, type CardFilterOptions } from '../../domain/engines/CardEngine';
import { CatalogLoader } from '../../infrastructure/catalogLoader';
import { soundService } from '../../infrastructure/soundService';
import { useDragToScroll } from '../hooks/useDragToScroll';
import type { IntensityLevel } from '../../domain/types/card';
import type { BoardId, HotTier } from '../../domain/types/board';

export interface SetupScreenProps {
  mode: 'category' | 'preset' | 'chaos' | 'board';
  targetId?: string;
  onStartGame: (mode: 'cards' | 'board') => void;
  onBack: () => void;
}

export interface PackOption {
  id: string;
  label: string;
  count: number;
  intensity: IntensityLevel;
}

export const CATEGORY_PACKS: Record<string, PackOption[]> = {
  yo_nunca: [
    { id: 'yn_fiesta', label: '🍻 Fiesta', count: 442, intensity: 2 },
    { id: 'yn_parejas', label: '💘 Parejas', count: 145, intensity: 2 },
    { id: 'yn_picante', label: '🌶️ Picante (+18)', count: 768, intensity: 3 },
  ],
  verdad_o_reto: [
    { id: 'vor_fiesta', label: '⚡ Fiesta', count: 286, intensity: 2 },
    { id: 'vor_parejas', label: '💘 Parejas', count: 246, intensity: 2 },
    { id: 'vor_picante', label: '🔥 Picante (+18)', count: 325, intensity: 3 },
  ],
  mesa_y_minijuegos: [
    { id: 'pack_ring_of_fire', label: '👑 Copa del Rey', count: 26, intensity: 2 },
    { id: 'pack_partybus', label: '🚌 PartyBus', count: 50, intensity: 2 },
    { id: 'pack_drink_extreme', label: '⚡ Desafíos Extremos', count: 30, intensity: 4 },
    { id: 'pack_verdad_o_verdad', label: '🤫 Verdad o Verdad', count: 30, intensity: 2 },
  ],
  confesiones: [
    { id: 'conf_fiesta', label: '🎉 Fiesta y Salseo', count: 135, intensity: 2 },
    { id: 'conf_picante', label: '🌶️ Picante (+18)', count: 51, intensity: 3 },
    { id: 'conf_deep', label: '💬 Deep Talk', count: 21, intensity: 2 },
  ],
  quien_es_mas_probable: [
    { id: 'qemp_fiesta', label: '⚡ Fiesta y Salseo', count: 131, intensity: 2 },
    { id: 'qemp_picante', label: '🔥 Picante (+18)', count: 50, intensity: 3 },
    { id: 'qemp_parejas', label: '💘 Parejas y Exs', count: 18, intensity: 2 },
  ],
  guerra_equipos: [
    { id: 'picolo_war', label: '⚔️ Por Equipos', count: 788, intensity: 2 },
    { id: 'versus', label: '🥊 Duelos Versus', count: 75, intensity: 2 },
  ],
  que_prefieres: [
    { id: 'picolo_default', label: '⚖️ Clásicos', count: 155, intensity: 1 },
    { id: 'picolo_silly', label: '🤪 Humor Absurdo', count: 69, intensity: 2 },
    { id: 'picolo_hot', label: '🌶️ Picantes', count: 36, intensity: 3 },
    { id: 'qp_guatoca', label: '🎲 Guatoca', count: 18, intensity: 2 },
    { id: 'qp_verdad_o_verdad', label: '🤫 Confesiones', count: 11, intensity: 2 },
  ],
};

export const ALL_INTENSITY_OPTIONS: Array<{
  level: IntensityLevel;
  label: string;
  icon: string;
  desc: string;
}> = [
  { level: 1, label: 'Chill', icon: '🍹', desc: '1 trago, relajado' },
  { level: 2, label: 'Fiesta', icon: '🍻', desc: '1-2 tragos, diversión clásica' },
  { level: 3, label: 'Hot', icon: '🌶️', desc: '2-3 tragos, picante e indiscreto' },
  { level: 4, label: 'Extremo', icon: '⚡', desc: '3-5 tragos, para valientes' },
];

export const HOT_TIER_OPTIONS: Array<{ tier: HotTier; label: string; flames: string; desc: string }> = [
  { tier: 1, label: 'Nivel 1', flames: '🔥', desc: 'Verdades picantes (118)' },
  { tier: 2, label: 'Nivel 2', flames: '🔥🔥', desc: 'Contacto y prendas (61)' },
  { tier: 3, label: 'Nivel 3', flames: '🔥🔥🔥', desc: 'Retos sin censura (57)' },
];

export const getAvailableIntensities = (
  mode: 'category' | 'preset' | 'chaos' | 'board',
  targetId?: string
): IntensityLevel[] => {
  if (mode === 'chaos') {
    return [1, 2, 3, 4];
  }
  if (mode === 'preset') {
    if (targetId === 'modo_caliente') return [3];
    if (targetId === 'modo_parejas') return [2, 3];
    return [1, 2, 3, 4];
  }
  if (mode === 'category') {
    switch (targetId) {
      case 'yo_nunca':
      case 'quien_es_mas_probable':
      case 'verdad_o_reto':
      case 'confesiones':
        return [2, 3];
      case 'que_prefieres':
        return [1, 2, 3];
      case 'retos_y_virus':
      case 'mesa_y_minijuegos':
        return [1, 2, 3, 4];
      case 'guerra_equipos':
        return [2];
      default:
        return [1, 2, 3, 4];
    }
  }
  return [1, 2, 3, 4];
};

export const getIntensityCounts = (
  mode: 'category' | 'preset' | 'chaos' | 'board',
  targetId?: string
): Record<IntensityLevel, number> => {
  if (mode === 'chaos') {
    return { 1: 1522, 2: 3429, 3: 1942, 4: 44 };
  }
  if (mode === 'preset') {
    if (targetId === 'modo_caliente') return { 1: 0, 2: 0, 3: 1661, 4: 0 };
    if (targetId === 'modo_parejas') return { 1: 0, 2: 387, 3: 8, 4: 0 };
    return { 1: 0, 2: 0, 3: 0, 4: 0 };
  }
  switch (targetId) {
    case 'yo_nunca':
      return { 1: 0, 2: 587, 3: 768, 4: 0 };
    case 'que_prefieres':
      return { 1: 155, 2: 90, 3: 44, 4: 0 };
    case 'retos_y_virus':
      return { 1: 1347, 2: 571, 3: 378, 4: 14 };
    case 'quien_es_mas_probable':
      return { 1: 0, 2: 149, 3: 50, 4: 0 };
    case 'verdad_o_reto':
      return { 1: 0, 2: 532, 3: 325, 4: 0 };
    case 'mesa_y_minijuegos':
      return { 1: 20, 2: 43, 3: 43, 4: 30 };
    case 'guerra_equipos':
      return { 1: 0, 2: 863, 3: 0, 4: 0 };
    case 'confesiones':
      return { 1: 0, 2: 156, 3: 51, 4: 0 };
    default:
      return { 1: 0, 2: 0, 3: 0, 4: 0 };
  }
};

export const SetupScreen: React.FC<SetupScreenProps> = ({
  mode,
  targetId,
  onStartGame,
  onBack,
}) => {
  const [playerName, setPlayerName] = useState('');
  const [boardId, setBoardId] = useState<BoardId>('guatoca_clasica');
  const [selectedBoardHotTiers, setSelectedBoardHotTiers] = useState<HotTier[]>([1, 2, 3]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Available intensities for this active mode/category
  const availableLevels = useMemo(
    () => getAvailableIntensities(mode, targetId),
    [mode, targetId]
  );
  const intensityCounts = useMemo(
    () => getIntensityCounts(mode, targetId),
    [mode, targetId]
  );

  // Multi-selection set of intensities (default: all available intensities active)
  const [selectedIntensities, setSelectedIntensities] = useState<Set<IntensityLevel>>(
    () => new Set(getAvailableIntensities(mode, targetId))
  );

  const isAllIntensitiesActive = availableLevels.every((l) => selectedIntensities.has(l));

  const toggleIntensity = (level: IntensityLevel) => {
    soundService.playTap();
    setSelectedIntensities((prev) => {
      const next = new Set(prev);
      if (next.has(level)) {
        if (next.size <= 1) {
          // Invariant: Do not allow unchecking the last active intensity
          soundService.vibrate([30, 30]);
          return prev;
        }
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  };

  const handleSelectAllIntensities = () => {
    soundService.playTap();
    setSelectedIntensities(new Set(availableLevels));
  };

  // Sub-filter: Packs (for categories)
  const initialPacks = useMemo(() => {
    const packs = CATEGORY_PACKS[targetId || ''] || [];
    return packs.map((p) => p.id);
  }, [targetId]);

  const [selectedPacks, setSelectedPacks] = useState<string[]>(initialPacks);

  const togglePack = (packId: string) => {
    soundService.playTap();
    setSelectedPacks((prev) => {
      if (prev.includes(packId)) {
        if (prev.length <= 1) {
          soundService.vibrate([30, 30]);
          return prev;
        }
        return prev.filter((p) => p !== packId);
      }
      return [...prev, packId];
    });
  };

  // Sub-filter: Yo Nunca sub-chips (Picante Suave vs Picante +18)
  const [yoNuncaSubGroup, setYoNuncaSubGroup] = useState<'all' | 'suave' | 'extremo_18'>('all');

  // Sub-filter: Verdad o Reto (Verdades vs Retos)
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['truth', 'dare']);

  const toggleType = (t: string) => {
    soundService.playTap();
    setSelectedTypes((prev) => {
      if (prev.includes(t)) {
        if (prev.length <= 1) {
          soundService.vibrate([30, 30]);
          return prev;
        }
        return prev.filter((x) => x !== t);
      }
      return [...prev, t];
    });
  };

  // Sub-filter: Verdad o Reto Hot Tiers & Modo Spicy Hot Tiers
  const [selectedHotTiers, setSelectedHotTiers] = useState<HotTier[]>([1, 2, 3]);

  const toggleHotTier = (tier: HotTier) => {
    soundService.playTap();
    setSelectedHotTiers((prev) => {
      if (prev.includes(tier)) {
        if (prev.length <= 1) {
          soundService.vibrate([30, 30]);
          return prev;
        }
        return prev.filter((t) => t !== tier);
      }
      return [...prev, tier].sort() as HotTier[];
    });
  };

  const toggleBoardHotTier = (tier: HotTier) => {
    soundService.playTap();
    setSelectedBoardHotTiers((prev) => {
      if (prev.includes(tier)) {
        if (prev.length <= 1) {
          soundService.vibrate([30, 30]);
          return prev;
        }
        return prev.filter((t) => t !== tier);
      }
      return [...prev, tier].sort() as HotTier[];
    });
  };

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
        const [tiles, boardCards] = await Promise.all([
          CatalogLoader.loadBoard(boardId),
          CatalogLoader.loadCategory('el_tablero').catch(() => []),
        ]);
        useGameSessionStore
          .getState()
          .startBoardSession(boardId, tiles, players, boardCards, selectedBoardHotTiers);
        soundService.playVictory();
        onStartGame('board');
        return;
      }

      // Card modes: category, preset, or chaos
      const engine = new CardEngine();
      let deck: any[] = [];

      const activeIntensitiesArray = Array.from(selectedIntensities);
      const isAllActive = activeIntensitiesArray.length === availableLevels.length;

      const filterOptions: CardFilterOptions = {
        intensities: isAllActive ? undefined : activeIntensitiesArray,
        intensity: activeIntensitiesArray.length === 1 ? activeIntensitiesArray[0] : undefined,
      };

      let resolversPool: Map<string, any[]> = new Map();

      if (mode === 'category') {
        const catId = targetId || 'yo_nunca';
        const packsForCat = CATEGORY_PACKS[catId] || [];

        if (packsForCat.length > 0 && selectedPacks.length < packsForCat.length) {
          filterOptions.packIds = selectedPacks;
        }

        if (catId === 'yo_nunca' && yoNuncaSubGroup !== 'all') {
          filterOptions.yoNuncaSubGroup = yoNuncaSubGroup;
        }

        if (catId === 'verdad_o_reto') {
          if (selectedTypes.length > 0 && selectedTypes.length < 2) {
            filterOptions.types = selectedTypes;
          }
          if (selectedHotTiers.length > 0 && selectedHotTiers.length < 3) {
            filterOptions.hotTiers = selectedHotTiers;
          }
        }

        const cards = await CatalogLoader.loadCategory(catId);
        resolversPool = CardEngine.extractResolvers(cards);
        deck = engine.buildCategoryDeck(cards, filterOptions);
      } else if (mode === 'preset') {
        const presetId = targetId || 'modo_caliente';
        if (presetId === 'modo_caliente' && selectedHotTiers.length < 3) {
          filterOptions.hotTiers = selectedHotTiers;
        }
        const cards = await CatalogLoader.loadPreset(presetId);
        resolversPool = CardEngine.extractResolvers(cards);
        deck = engine.buildPresetDeck(cards, filterOptions);
      } else {
        // Chaos mode
        const manifest = await CatalogLoader.loadManifest();
        const categoriesCards: Record<string, any[]> = {};
        const allChaosCards: any[] = [];
        for (const cat of manifest.categories.slice(0, 9)) {
          if (cat.category_id === 'guerra_equipos' || cat.category_id === 'el_tablero') continue;
          try {
            const cards = await CatalogLoader.loadCategory(cat.category_id);
            categoriesCards[cat.category_id] = cards;
            allChaosCards.push(...cards);
          } catch {
            // continue
          }
        }
        resolversPool = CardEngine.extractResolvers(allChaosCards);
        deck = engine.buildChaosDeck(categoriesCards, filterOptions);
      }

      if (deck.length === 0) {
        setErrorMsg('No hay cartas disponibles con la combinación de filtros seleccionada.');
        setIsLoading(false);
        return;
      }

      useGameSessionStore.getState().startCardSession(
        deck,
        mode,
        {
          intensities: activeIntensitiesArray,
          intensity: activeIntensitiesArray[0] ?? 2,
          targetId,
        },
        players,
        resolversPool
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

  // Available packs for active category
  const activePacks = CATEGORY_PACKS[targetId || ''] || [];

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
        <div className="p-4 rounded-2xl border theme-border bg-[var(--bg-surface)] space-y-3">
          <label className="text-xs font-black uppercase tracking-wider theme-text-muted block">
            Selecciona el Tablero (64 Casillas)
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                soundService.playTap();
                setBoardId('guatoca_clasica');
              }}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                boardId === 'guatoca_clasica'
                  ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 ring-1 ring-emerald-500'
                  : 'theme-border bg-[var(--bg-elevated)] text-[var(--text-muted)]'
              }`}
              data-testid="board-select-clasica"
            >
              <div className="font-black text-xs">Clásica 🍻</div>
              <div className="text-[10px] opacity-80 mt-0.5">64 casillas · Previa</div>
            </button>

            <button
              onClick={() => {
                soundService.playTap();
                setBoardId('guatoca_hot');
              }}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                boardId === 'guatoca_hot'
                  ? 'border-rose-500 bg-rose-950/40 text-rose-300 ring-1 ring-rose-500'
                  : 'theme-border bg-[var(--bg-elevated)] text-[var(--text-muted)]'
              }`}
              data-testid="board-select-hot"
            >
              <div className="font-black text-xs">Hot 🌶️</div>
              <div className="text-[10px] opacity-80 mt-0.5">64 casillas · +18</div>
            </button>

            <button
              onClick={() => {
                soundService.playTap();
                setBoardId('guatoca_todos');
              }}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                boardId === 'guatoca_todos'
                  ? 'border-amber-500 bg-amber-950/40 text-amber-300 ring-1 ring-amber-500'
                  : 'theme-border bg-[var(--bg-elevated)] text-[var(--text-muted)]'
              }`}
              data-testid="board-select-todos"
            >
              <div className="font-black text-xs">Todos 🎲</div>
              <div className="text-[10px] opacity-80 mt-0.5">721 cartas mix</div>
            </button>
          </div>

          {/* Progressive Hot Tier Selector when Hot or Todos is active */}
          {(boardId === 'guatoca_hot' || boardId === 'guatoca_todos') && (
            <div
              className="pt-2 border-t theme-border space-y-2"
              data-testid="hot-tiers-selector"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-rose-400">
                  Niveles Picantes (Hot)
                </span>
                <span className="text-[10px] theme-text-muted">
                  Progresión por tramos del tablero
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {HOT_TIER_OPTIONS.map((opt) => {
                  const isSelected = selectedBoardHotTiers.includes(opt.tier);
                  return (
                    <button
                      key={opt.tier}
                      type="button"
                      onClick={() => toggleBoardHotTier(opt.tier)}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-rose-500 bg-rose-500/20 text-rose-200 font-black ring-1 ring-rose-500/60'
                          : 'theme-border bg-[var(--bg-elevated)] theme-text-muted opacity-60'
                      }`}
                      data-testid={`hot-tier-btn-${opt.tier}`}
                    >
                      <div className="text-xs font-black">
                        {opt.label} {opt.flames}
                      </div>
                      <div className="text-[9px] opacity-85 mt-0.5 leading-tight">
                        {opt.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Multi-Selection Intensity Section (for card sessions) */}
      {mode !== 'board' && (
        <div className="p-4 rounded-2xl border theme-border bg-[var(--bg-surface)] space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase tracking-wider theme-text-muted flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 theme-accent-primary" />
              <span>Filtro de Intensidad</span>
            </label>
            <span className="text-[10px] font-bold theme-text-muted">
              {selectedIntensities.size > 1 ? `${selectedIntensities.size} activas` : '1 activa'}
            </span>
          </div>

          {/* Toggle buttons grid */}
          <div className="grid grid-cols-5 gap-1.5">
            {/* Quick action: "Todas" button */}
            <button
              type="button"
              onClick={handleSelectAllIntensities}
              className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer ${
                isAllIntensitiesActive
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/20 theme-accent-primary font-black shadow-sm'
                  : 'theme-border bg-[var(--bg-elevated)] theme-text-muted font-bold hover:text-white'
              }`}
              data-testid="intensity-opt-0"
            >
              <div className="text-sm">✨</div>
              <div className="text-[10px] mt-0.5 truncate font-black">Todas</div>
            </button>

            {/* Individual intensity buttons */}
            {ALL_INTENSITY_OPTIONS.map((opt) => {
              const isAvailable = availableLevels.includes(opt.level);
              const isActive = selectedIntensities.has(opt.level);
              const count = intensityCounts[opt.level];

              if (!isAvailable) {
                // If not in mode, render disabled/hidden state for full 5-column grid or render disabled
                return (
                  <button
                    key={opt.level}
                    type="button"
                    disabled
                    className="py-2 px-1 rounded-xl border border-dashed border-white/10 bg-white/5 opacity-30 text-center cursor-not-allowed"
                    data-testid={`intensity-opt-${opt.level}`}
                  >
                    <div className="text-sm grayscale">{opt.icon}</div>
                    <div className="text-[10px] mt-0.5 truncate">{opt.label}</div>
                  </button>
                );
              }

              return (
                <button
                  key={opt.level}
                  type="button"
                  onClick={() => toggleIntensity(opt.level)}
                  className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer relative ${
                    isActive
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/20 theme-accent-primary font-black shadow-sm'
                      : 'theme-border bg-[var(--bg-elevated)] theme-text-muted font-bold hover:text-white'
                  }`}
                  data-testid={`intensity-opt-${opt.level}`}
                >
                  <div className="text-sm">{opt.icon}</div>
                  <div className="text-[10px] mt-0.5 truncate font-bold">{opt.label}</div>
                  {count > 0 && (
                    <div className="text-[8px] opacity-70 mt-0.5 font-mono">
                      {count}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-Filters: Category Packs Always Visible as Chips */}
      {mode === 'category' && activePacks.length > 0 && (
        <div className="p-4 rounded-2xl border theme-border bg-[var(--bg-surface)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider theme-text-muted">
              Packs y Temáticas
            </span>
            <span className="text-[10px] theme-text-muted font-bold">
              {selectedPacks.length} de {activePacks.length}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5" data-testid="packs-selector">
            {activePacks.map((pack) => {
              const isSelected = selectedPacks.includes(pack.id);
              return (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => togglePack(pack.id)}
                  className={`px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/20 theme-accent-primary font-black ring-1 ring-[var(--accent-primary)]/50'
                      : 'theme-border bg-[var(--bg-elevated)] theme-text-muted opacity-70'
                  }`}
                  data-testid={`pack-chip-${pack.id}`}
                >
                  {isSelected && <Check className="w-3 h-3 theme-accent-primary" />}
                  <span>{pack.label}</span>
                  <span className="text-[10px] opacity-75 font-mono">({pack.count})</span>
                </button>
              );
            })}
          </div>

          {/* Special Sub-filter for Yo Nunca Picante: Suave vs +18 */}
          {targetId === 'yo_nunca' && selectedPacks.includes('yn_picante') && (
            <div className="pt-2 border-t theme-border space-y-2" data-testid="yn-picante-subgroup">
              <span className="text-[11px] font-black uppercase tracking-wider text-rose-400 block">
                🌶️ Nivel Picante en Yo Nunca:
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setYoNuncaSubGroup('all')}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer ${
                    yoNuncaSubGroup === 'all'
                      ? 'border-rose-500 bg-rose-500/20 text-rose-200 font-black'
                      : 'theme-border bg-[var(--bg-elevated)] theme-text-muted'
                  }`}
                  data-testid="yn-subgroup-all"
                >
                  Todas (768)
                </button>
                <button
                  type="button"
                  onClick={() => setYoNuncaSubGroup('suave')}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer ${
                    yoNuncaSubGroup === 'suave'
                      ? 'border-rose-500 bg-rose-500/20 text-rose-200 font-black'
                      : 'theme-border bg-[var(--bg-elevated)] theme-text-muted'
                  }`}
                  data-testid="yn-subgroup-suave"
                >
                  Suave (554)
                </button>
                <button
                  type="button"
                  onClick={() => setYoNuncaSubGroup('extremo_18')}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer ${
                    yoNuncaSubGroup === 'extremo_18'
                      ? 'border-rose-500 bg-rose-500/20 text-rose-200 font-black'
                      : 'theme-border bg-[var(--bg-elevated)] theme-text-muted'
                  }`}
                  data-testid="yn-subgroup-extremo"
                >
                  Picante +18 (214)
                </button>
              </div>
            </div>
          )}

          {/* Special Sub-filter for Verdad o Reto: Tipo de dinámica (Verdad vs Reto) */}
          {targetId === 'verdad_o_reto' && (
            <div className="pt-2 border-t theme-border space-y-2" data-testid="vor-types-selector">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 block">
                Tipo de Prueba:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => toggleType('truth')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    selectedTypes.includes('truth')
                      ? 'border-amber-500 bg-amber-500/20 text-amber-200 font-black'
                      : 'theme-border bg-[var(--bg-elevated)] theme-text-muted opacity-60'
                  }`}
                  data-testid="vor-type-truth"
                >
                  {selectedTypes.includes('truth') && <Check className="w-3.5 h-3.5" />}
                  <span>Verdades (480)</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleType('dare')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    selectedTypes.includes('dare')
                      ? 'border-amber-500 bg-amber-500/20 text-amber-200 font-black'
                      : 'theme-border bg-[var(--bg-elevated)] theme-text-muted opacity-60'
                  }`}
                  data-testid="vor-type-dare"
                >
                  {selectedTypes.includes('dare') && <Check className="w-3.5 h-3.5" />}
                  <span>Retos (377)</span>
                </button>
              </div>
            </div>
          )}

          {/* Special Sub-filter for Verdad o Reto: Niveles Hot (cuando vor_picante o Hot está activo) */}
          {targetId === 'verdad_o_reto' && (selectedPacks.includes('vor_picante') || selectedIntensities.has(3)) && (
            <div className="pt-2 border-t theme-border space-y-2" data-testid="vor-hot-tiers">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-rose-400">
                  Niveles Picantes en Verdad o Reto:
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {HOT_TIER_OPTIONS.map((opt) => {
                  const isSelected = selectedHotTiers.includes(opt.tier);
                  return (
                    <button
                      key={opt.tier}
                      type="button"
                      onClick={() => toggleHotTier(opt.tier)}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-rose-500 bg-rose-500/20 text-rose-200 font-black ring-1 ring-rose-500/60'
                          : 'theme-border bg-[var(--bg-elevated)] theme-text-muted opacity-60'
                      }`}
                      data-testid={`vor-hot-tier-${opt.tier}`}
                    >
                      <div className="text-xs font-black">
                        {opt.label} {opt.flames}
                      </div>
                      <div className="text-[9px] opacity-80 mt-0.5 leading-tight">
                        {opt.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preset Sub-Filters (Modo Spicy Hot Tiers) */}
      {mode === 'preset' && targetId === 'modo_caliente' && (
        <div className="p-4 rounded-2xl border theme-border bg-[var(--bg-surface)] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>Niveles Picantes (Hot)</span>
            </span>
            <span className="text-[10px] theme-text-muted">1.661 cartas</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {HOT_TIER_OPTIONS.map((opt) => {
              const isSelected = selectedHotTiers.includes(opt.tier);
              return (
                <button
                  key={opt.tier}
                  type="button"
                  onClick={() => toggleHotTier(opt.tier)}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'border-rose-500 bg-rose-500/20 text-rose-200 font-black ring-1 ring-rose-500/60'
                      : 'theme-border bg-[var(--bg-elevated)] theme-text-muted opacity-60'
                  }`}
                  data-testid={`spicy-hot-tier-${opt.tier}`}
                >
                  <div className="text-xs font-black">
                    {opt.label} {opt.flames}
                  </div>
                  <div className="text-[9px] opacity-80 mt-0.5 leading-tight">
                    {opt.desc}
                  </div>
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
