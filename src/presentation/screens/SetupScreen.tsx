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
  Check,
  Sparkles,
  Coffee,
  Wine,
  Zap,
  Dices,
  Layers,
} from 'lucide-react';
import { usePlayerStore } from '../../application/usePlayerStore';
import { useGameSessionStore } from '../../application/useGameSessionStore';
import { CardEngine, type CardFilterOptions } from '../../domain/engines/CardEngine';
import { CatalogLoader } from '../../infrastructure/catalogLoader';
import { soundService } from '../../infrastructure/soundService';
import { PWAHelper } from '../../infrastructure/registerSW';
import { OfflineFallback } from '../components/OfflineFallback';
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
  intensity?: IntensityLevel;
  intensities?: IntensityLevel[];
}

export const CATEGORY_PACKS: Record<string, PackOption[]> = {
  yo_nunca: [
    { id: 'yn_fiesta', label: 'Fiesta', count: 442, intensity: 2, intensities: [2] },
    { id: 'yn_parejas', label: 'Parejas', count: 145, intensity: 2, intensities: [2] },
    { id: 'yn_picante', label: 'Picante (+18)', count: 768, intensity: 3, intensities: [3] },
  ],
  verdad_o_reto: [
    { id: 'vor_fiesta', label: 'Fiesta', count: 286, intensity: 2, intensities: [2] },
    { id: 'vor_parejas', label: 'Parejas', count: 246, intensity: 2, intensities: [2] },
    { id: 'vor_picante', label: 'Picante (+18)', count: 325, intensity: 3, intensities: [3] },
  ],
  mesa_y_minijuegos: [
    { id: 'pack_ring_of_fire', label: 'Copa del Rey', count: 26, intensity: 2, intensities: [2, 3] },
    { id: 'pack_partybus', label: 'PartyBus', count: 50, intensity: 2, intensities: [1, 2, 3] },
    { id: 'pack_drink_extreme', label: 'Desafíos Extremos', count: 30, intensity: 4, intensities: [4] },
    { id: 'pack_verdad_o_verdad', label: 'Verdad o Verdad', count: 30, intensity: 2, intensities: [1, 2, 3] },
  ],
  confesiones: [
    { id: 'conf_fiesta', label: 'Fiesta y Salseo', count: 135, intensity: 2, intensities: [2] },
    { id: 'conf_picante', label: 'Picante (+18)', count: 51, intensity: 3, intensities: [3] },
    { id: 'conf_deep', label: 'Deep Talk', count: 21, intensity: 2, intensities: [2] },
  ],
  quien_es_mas_probable: [
    { id: 'qemp_fiesta', label: 'Fiesta y Salseo', count: 131, intensity: 2, intensities: [2] },
    { id: 'qemp_picante', label: 'Picante (+18)', count: 50, intensity: 3, intensities: [3] },
    { id: 'qemp_parejas', label: 'Parejas y Exs', count: 18, intensity: 2, intensities: [2] },
  ],
  guerra_equipos: [
    { id: 'picolo_war', label: 'Por Equipos', count: 788, intensity: 2, intensities: [2] },
    { id: 'versus', label: 'Duelos Versus', count: 75, intensity: 2, intensities: [2] },
  ],
  que_prefieres: [
    { id: 'picolo_default', label: 'Clásicos', count: 155, intensity: 1, intensities: [1] },
    { id: 'picolo_silly', label: 'Humor Absurdo', count: 69, intensity: 2, intensities: [2] },
    { id: 'picolo_hot', label: 'Picantes', count: 36, intensity: 3, intensities: [3] },
    { id: 'qp_guatoca', label: 'Guatoca', count: 18, intensity: 2, intensities: [2, 3] },
    { id: 'qp_verdad_o_verdad', label: 'Confesiones', count: 11, intensity: 2, intensities: [2, 3] },
  ],
};

export const ALL_INTENSITY_OPTIONS: Array<{
  level: IntensityLevel;
  label: string;
  desc: string;
}> = [
  { level: 1, label: 'Chill', desc: '1 trago, relajado' },
  { level: 2, label: 'Fiesta', desc: '1-2 tragos, diversión clásica' },
  { level: 3, label: 'Hot', desc: '2-3 tragos, picante e indiscreto' },
  { level: 4, label: 'Extremo', desc: '3-5 tragos, para valientes' },
];

export const HOT_TIER_OPTIONS: Array<{
  tier: HotTier;
  label: string;
  desc: string;
}> = [
  { tier: 1, label: 'Nivel 1', desc: 'Verdades picantes (118)' },
  { tier: 2, label: 'Nivel 2', desc: 'Contacto y prendas (61)' },
  { tier: 3, label: 'Nivel 3', desc: 'Retos sin censura (57)' },
];

const renderIntensityIcon = (level: IntensityLevel) => {
  switch (level) {
    case 1:
      return <Coffee className="w-4 h-4 mx-auto" />;
    case 2:
      return <Wine className="w-4 h-4 mx-auto" />;
    case 3:
      return <Flame className="w-4 h-4 mx-auto" />;
    case 4:
      return <Zap className="w-4 h-4 mx-auto" />;
  }
};

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

export const isPackCompatibleWithIntensities = (
  pack: PackOption,
  selectedIntensities: Set<IntensityLevel>
): boolean => {
  const packIntensities =
    pack.intensities ?? (pack.intensity !== undefined ? [pack.intensity] : [1, 2, 3, 4]);
  return packIntensities.some((lvl) => selectedIntensities.has(lvl));
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
  const [isOfflineError, setIsOfflineError] = useState(false);

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

  // All packs defined for active category
  const allCategoryPacks = useMemo(
    () => CATEGORY_PACKS[targetId || ''] || [],
    [targetId]
  );

  // Available packs filtered reactively by current selected intensities
  const availablePacks = useMemo(() => {
    return allCategoryPacks.filter((p) =>
      isPackCompatibleWithIntensities(p, selectedIntensities)
    );
  }, [allCategoryPacks, selectedIntensities]);

  const [selectedPacks, setSelectedPacks] = useState<string[]>(() =>
    allCategoryPacks.map((p) => p.id)
  );

  const toggleIntensity = (level: IntensityLevel) => {
    soundService.playTap();
    setSelectedIntensities((prev) => {
      const next = new Set(prev);
      if (next.has(level)) {
        if (next.size <= 1) {
          soundService.vibrate([30, 30]);
          return prev;
        }
        next.delete(level);
      } else {
        next.add(level);
      }

      // Synchronize selectedPacks with new intensities
      setSelectedPacks((prevPacks) => {
        const nextAvailable = allCategoryPacks.filter((p) =>
          isPackCompatibleWithIntensities(p, next)
        );
        const nextAvailableIds = new Set(nextAvailable.map((p) => p.id));

        let updated: string[];
        if (next.has(level)) {
          const packsWithThisLevel = allCategoryPacks
            .filter((p) => {
              const lvls = p.intensities ?? (p.intensity !== undefined ? [p.intensity] : []);
              return lvls.includes(level);
            })
            .map((p) => p.id);
          updated = Array.from(new Set([...prevPacks, ...packsWithThisLevel])).filter((id) =>
            nextAvailableIds.has(id)
          );
        } else {
          updated = prevPacks.filter((id) => nextAvailableIds.has(id));
        }

        if (updated.length === 0 && nextAvailable.length > 0) {
          updated = [nextAvailable[0].id];
        }
        return updated;
      });

      return next;
    });
  };

  const handleSelectAllIntensities = () => {
    soundService.playTap();
    const allLevels = new Set(availableLevels);
    setSelectedIntensities(allLevels);
    setSelectedPacks(allCategoryPacks.map((p) => p.id));
  };

  const togglePack = (packId: string) => {
    soundService.playTap();
    setSelectedPacks((prev) => {
      const activeAvailablePacks = prev.filter((id) =>
        availablePacks.some((p) => p.id === id)
      );
      if (prev.includes(packId)) {
        if (activeAvailablePacks.length <= 1) {
          soundService.vibrate([30, 30]);
          return prev;
        }
        return prev.filter((p) => p !== packId);
      }
      return [...prev, packId];
    });
  };

  const [yoNuncaSubGroup, setYoNuncaSubGroup] = useState<'all' | 'suave' | 'extremo_18'>('all');
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
  const historicalPlayers =
    storeHistorical.length > 0 ? storeHistorical : usePlayerStore.getState().historicalPlayers;
  const addPlayer = usePlayerStore((state) => state.addPlayer);
  const quickAddPlayer = usePlayerStore((state) => state.quickAddPlayer);
  const removePlayer = usePlayerStore((state) => state.removePlayer);

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
        const activeSelectedPacks = selectedPacks.filter((id) =>
          availablePacks.some((p) => p.id === id)
        );

        if (packsForCat.length > 0 && activeSelectedPacks.length < packsForCat.length) {
          filterOptions.packIds = activeSelectedPacks;
        }

        if (
          catId === 'yo_nunca' &&
          selectedIntensities.has(3) &&
          activeSelectedPacks.includes('yn_picante') &&
          yoNuncaSubGroup !== 'all'
        ) {
          filterOptions.yoNuncaSubGroup = yoNuncaSubGroup;
        }

        if (catId === 'verdad_o_reto') {
          if (selectedTypes.length > 0 && selectedTypes.length < 2) {
            filterOptions.types = selectedTypes;
          }
          if (
            selectedIntensities.has(3) &&
            activeSelectedPacks.includes('vor_picante') &&
            selectedHotTiers.length > 0 &&
            selectedHotTiers.length < 3
          ) {
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
      const errMsg = (err as Error)?.message || '';
      const isNetwork =
        PWAHelper.isOffline() ||
        errMsg.toLowerCase().includes('failed to fetch') ||
        errMsg.toLowerCase().includes('network') ||
        errMsg.toLowerCase().includes('offline');

      if (isNetwork) {
        setIsOfflineError(true);
      } else {
        setErrorMsg(`Error al cargar las cartas: ${errMsg}`);
      }
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

  const activePacks = availablePacks;

  if (isOfflineError) {
    return (
      <OfflineFallback
        onRetry={() => {
          setIsOfflineError(false);
          handleStart();
        }}
        onBack={() => {
          setIsOfflineError(false);
          onBack();
        }}
      />
    );
  }

  return (
    <div
      className="flex-1 min-h-0 h-full flex flex-col w-full max-w-md mx-auto select-none overflow-hidden"
      data-testid="setup-screen"
    >
      {/* Fixed Sub-Header Navigation */}
      <div className="shrink-0 flex items-center justify-between border-b border-border bg-background/95 px-4 py-2 min-h-[52px]">
        <button
          type="button"
          onClick={() => {
            soundService.playTap();
            onBack();
          }}
          className="min-h-[44px] -ml-2 px-2.5 rounded-xl flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus active:scale-[0.97] transition-colors cursor-pointer"
          data-testid="setup-back-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>

        <h1 className="font-heading text-base font-bold text-text truncate px-2">
          {getModeTitle()}
        </h1>

        <div className="min-w-[44px] flex items-center justify-end gap-1 text-xs font-mono font-bold text-action">
          <span>{players.length}</span>
          <Users className="w-3.5 h-3.5" aria-hidden="true" />
        </div>
      </div>

      {/* Scrollable Configuration Body (Flat sections with hairline dividers, zero card-in-card) */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto scroll-container px-4 py-4 space-y-5"
      >
        {/* Error Notice */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-danger-quiet border border-danger-line text-danger text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Board Selector if Mode is Board */}
        {mode === 'board' && (
          <section className="space-y-3">
            <label className="font-heading text-xs font-bold text-text block">
              Selecciona el tablero (64 casillas)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  soundService.playTap();
                  setBoardId('guatoca_clasica');
                }}
                className={`p-3 min-h-[72px] rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus active:scale-[0.98] ${
                  boardId === 'guatoca_clasica'
                    ? 'border-success bg-success-quiet text-text'
                    : 'border-border bg-surface text-text-secondary interactive-card'
                }`}
                data-testid="board-select-clasica"
              >
                <div className="flex items-center justify-between">
                  <span className="font-heading font-bold text-xs">Clásica</span>
                  <Dices
                    className={`w-3.5 h-3.5 ${
                      boardId === 'guatoca_clasica' ? 'text-success' : 'text-text-muted'
                    }`}
                  />
                </div>
                <div className="text-[11px] text-text-muted mt-1">64 casillas</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundService.playTap();
                  setBoardId('guatoca_hot');
                }}
                className={`p-3 min-h-[72px] rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus active:scale-[0.98] ${
                  boardId === 'guatoca_hot'
                    ? 'border-spicy bg-spicy-quiet text-text'
                    : 'border-border bg-surface text-text-secondary interactive-card'
                }`}
                data-testid="board-select-hot"
              >
                <div className="flex items-center justify-between">
                  <span className="font-heading font-bold text-xs">Hot</span>
                  <Flame
                    className={`w-3.5 h-3.5 ${
                      boardId === 'guatoca_hot' ? 'text-spicy' : 'text-text-muted'
                    }`}
                  />
                </div>
                <div className="text-[11px] text-text-muted mt-1">64 · +18</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundService.playTap();
                  setBoardId('guatoca_todos');
                }}
                className={`p-3 min-h-[72px] rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus active:scale-[0.98] ${
                  boardId === 'guatoca_todos'
                    ? 'border-warning bg-warning-quiet text-text'
                    : 'border-border bg-surface text-text-secondary interactive-card'
                }`}
                data-testid="board-select-todos"
              >
                <div className="flex items-center justify-between">
                  <span className="font-heading font-bold text-xs">Todos</span>
                  <Layers
                    className={`w-3.5 h-3.5 ${
                      boardId === 'guatoca_todos' ? 'text-warning' : 'text-text-muted'
                    }`}
                  />
                </div>
                <div className="text-[11px] text-text-muted mt-1">721 cartas</div>
              </button>
            </div>

            {/* Progressive Hot Tier Selector when Hot or Todos is active */}
            {(boardId === 'guatoca_hot' || boardId === 'guatoca_todos') && (
              <div className="pt-3 border-t border-border space-y-2.5" data-testid="hot-tiers-selector">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-spicy">
                    Niveles picantes (Hot)
                  </span>
                  <span className="text-[11px] text-text-muted">
                    Progresión por tramos
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
                        className={`p-2.5 min-h-[60px] rounded-xl border text-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus active:scale-[0.98] ${
                          isSelected
                            ? 'border-spicy bg-spicy-quiet text-text font-bold'
                            : 'border-border bg-surface text-text-muted'
                        }`}
                        data-testid={`hot-tier-btn-${opt.tier}`}
                      >
                        <div className="flex flex-col items-center justify-center gap-0.5 text-xs font-bold">
                          <span className="whitespace-nowrap">{opt.label}</span>
                          <span className="inline-flex text-spicy" aria-hidden="true">
                            {Array.from({ length: opt.tier }).map((_, i) => (
                              <Flame key={i} className="w-3 h-3 fill-current" />
                            ))}
                          </span>
                        </div>
                        <div className="text-[10px] text-text-secondary mt-1 leading-tight">
                          {opt.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Multi-Selection Intensity Section (for card sessions) */}
        {mode !== 'board' && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-heading text-xs font-bold text-text flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-action" />
                <span>Filtro de intensidad</span>
              </label>
              <span className="text-xs font-mono text-text-muted">
                {selectedIntensities.size > 1 ? `${selectedIntensities.size} activas` : '1 activa'}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {/* Quick action: "Todas" button */}
              <button
                type="button"
                onClick={handleSelectAllIntensities}
                className={`py-2 px-1 min-h-[64px] rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus active:scale-[0.97] ${
                  isAllIntensitiesActive
                    ? 'border-action bg-selected text-action font-bold'
                    : 'border-border bg-surface text-text-secondary font-medium interactive-card'
                }`}
                data-testid="intensity-opt-0"
              >
                <Sparkles className="w-4 h-4" />
                <div className="text-[11px] truncate">Todas</div>
              </button>

              {/* Individual intensity buttons */}
              {ALL_INTENSITY_OPTIONS.map((opt) => {
                const isAvailable = availableLevels.includes(opt.level);
                const isActive = selectedIntensities.has(opt.level);
                const count = intensityCounts[opt.level];

                if (!isAvailable) {
                  return (
                    <button
                      key={opt.level}
                      type="button"
                      disabled
                      className="py-2 px-1 min-h-[64px] rounded-xl border border-dashed border-border bg-surface/40 opacity-35 text-text-muted text-center cursor-not-allowed flex flex-col items-center justify-center gap-1"
                      data-testid={`intensity-opt-${opt.level}`}
                    >
                      {renderIntensityIcon(opt.level)}
                      <div className="text-[11px] truncate">{opt.label}</div>
                    </button>
                  );
                }

                return (
                  <button
                    key={opt.level}
                    type="button"
                    onClick={() => toggleIntensity(opt.level)}
                    className={`py-2 px-1 min-h-[64px] rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus active:scale-[0.97] ${
                      isActive
                        ? 'border-action bg-selected text-action font-bold'
                        : 'border-border bg-surface text-text-secondary font-medium interactive-card'
                    }`}
                    data-testid={`intensity-opt-${opt.level}`}
                  >
                    {renderIntensityIcon(opt.level)}
                    <div className="text-[11px] truncate">{opt.label}</div>
                    {count > 0 && (
                      <div className="text-[10px] text-text-muted font-mono leading-none">
                        {count}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Sub-Filters: Category Packs */}
        {mode === 'category' && activePacks.length > 0 && (
          <section className="pt-4 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-heading text-xs font-bold text-text">
                Packs y temáticas
              </span>
              <span className="text-xs font-mono text-text-muted">
                {selectedPacks.filter((id) => availablePacks.some((p) => p.id === id)).length} de{' '}
                {activePacks.length}
              </span>
            </div>

            <div className="flex flex-wrap gap-2" data-testid="packs-selector">
              {activePacks.map((pack) => {
                const isSelected = selectedPacks.includes(pack.id);
                return (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => togglePack(pack.id)}
                    className={`px-3 py-2 min-h-[44px] rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus active:scale-[0.98] ${
                      isSelected
                        ? 'border-action bg-selected text-text font-bold'
                        : 'border-border bg-surface text-text-muted interactive-card'
                    }`}
                    data-testid={`pack-chip-${pack.id}`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-action shrink-0" />}
                    <span>{pack.label}</span>
                    <span className="text-[11px] text-text-muted font-mono">({pack.count})</span>
                  </button>
                );
              })}
            </div>

            {/* Special Sub-filter for Yo Nunca Picante */}
            {targetId === 'yo_nunca' &&
              selectedIntensities.has(3) &&
              selectedPacks.includes('yn_picante') && (
                <div className="pt-3 border-t border-border space-y-2" data-testid="yn-picante-subgroup">
                  <span className="text-xs font-bold text-spicy flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5" />
                    <span>Nivel picante en Yo Nunca</span>
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setYoNuncaSubGroup('all')}
                      className={`py-2 px-2 min-h-[44px] rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                        yoNuncaSubGroup === 'all'
                          ? 'border-spicy bg-spicy-quiet text-text font-bold'
                          : 'border-border bg-surface text-text-muted interactive-card'
                      }`}
                      data-testid="yn-subgroup-all"
                    >
                      Todas (768)
                    </button>
                    <button
                      type="button"
                      onClick={() => setYoNuncaSubGroup('suave')}
                      className={`py-2 px-2 min-h-[44px] rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                        yoNuncaSubGroup === 'suave'
                          ? 'border-spicy bg-spicy-quiet text-text font-bold'
                          : 'border-border bg-surface text-text-muted interactive-card'
                      }`}
                      data-testid="yn-subgroup-suave"
                    >
                      Suave (554)
                    </button>
                    <button
                      type="button"
                      onClick={() => setYoNuncaSubGroup('extremo_18')}
                      className={`py-2 px-2 min-h-[44px] rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                        yoNuncaSubGroup === 'extremo_18'
                          ? 'border-spicy bg-spicy-quiet text-text font-bold'
                          : 'border-border bg-surface text-text-muted interactive-card'
                      }`}
                      data-testid="yn-subgroup-extremo"
                    >
                      Picante +18 (214)
                    </button>
                  </div>
                </div>
              )}

            {/* Special Sub-filter for Verdad o Reto: Types */}
            {targetId === 'verdad_o_reto' && (
              <div className="pt-3 border-t border-border space-y-2" data-testid="vor-types-selector">
                <span className="text-xs font-bold text-warning block">
                  Tipo de prueba
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => toggleType('truth')}
                    className={`py-2 px-3 min-h-[44px] rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                      selectedTypes.includes('truth')
                        ? 'border-warning bg-warning-quiet text-text font-bold'
                        : 'border-border bg-surface text-text-muted interactive-card'
                    }`}
                    data-testid="vor-type-truth"
                  >
                    {selectedTypes.includes('truth') && <Check className="w-3.5 h-3.5 text-warning" />}
                    <span>Verdades (480)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleType('dare')}
                    className={`py-2 px-3 min-h-[44px] rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                      selectedTypes.includes('dare')
                        ? 'border-warning bg-warning-quiet text-text font-bold'
                        : 'border-border bg-surface text-text-muted interactive-card'
                    }`}
                    data-testid="vor-type-dare"
                  >
                    {selectedTypes.includes('dare') && <Check className="w-3.5 h-3.5 text-warning" />}
                    <span>Retos (377)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Special Sub-filter for Verdad o Reto: Hot Tiers */}
            {targetId === 'verdad_o_reto' &&
              selectedIntensities.has(3) &&
              selectedPacks.includes('vor_picante') && (
                <div className="pt-3 border-t border-border space-y-2" data-testid="vor-hot-tiers">
                  <span className="text-xs font-bold text-spicy block">
                    Niveles picantes en Verdad o Reto
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {HOT_TIER_OPTIONS.map((opt) => {
                      const isSelected = selectedHotTiers.includes(opt.tier);
                      return (
                        <button
                          key={opt.tier}
                          type="button"
                          onClick={() => toggleHotTier(opt.tier)}
                          className={`p-2.5 min-h-[60px] rounded-xl border text-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                            isSelected
                              ? 'border-spicy bg-spicy-quiet text-text font-bold'
                              : 'border-border bg-surface text-text-muted interactive-card'
                          }`}
                          data-testid={`vor-hot-tier-${opt.tier}`}
                        >
                          <div className="flex flex-col items-center justify-center gap-0.5 text-xs font-bold">
                            <span className="whitespace-nowrap">{opt.label}</span>
                            <span className="inline-flex text-spicy" aria-hidden="true">
                              {Array.from({ length: opt.tier }).map((_, i) => (
                                <Flame key={i} className="w-3 h-3 fill-current" />
                              ))}
                            </span>
                          </div>
                          <div className="text-[10px] text-text-secondary mt-1 leading-tight">
                            {opt.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
          </section>
        )}

        {/* Preset Sub-Filters (Modo Spicy Hot Tiers) */}
        {mode === 'preset' && targetId === 'modo_caliente' && (
          <section className="pt-4 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-heading text-xs font-bold text-spicy flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" />
                <span>Niveles picantes (Hot)</span>
              </span>
              <span className="text-xs font-mono text-text-muted">1.661 cartas</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {HOT_TIER_OPTIONS.map((opt) => {
                const isSelected = selectedHotTiers.includes(opt.tier);
                return (
                  <button
                    key={opt.tier}
                    type="button"
                    onClick={() => toggleHotTier(opt.tier)}
                    className={`p-2.5 min-h-[60px] rounded-xl border text-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                      isSelected
                        ? 'border-spicy bg-spicy-quiet text-text font-bold'
                        : 'border-border bg-surface text-text-muted interactive-card'
                    }`}
                    data-testid={`spicy-hot-tier-${opt.tier}`}
                  >
                    <div className="flex flex-col items-center justify-center gap-0.5 text-xs font-bold">
                      <span className="whitespace-nowrap">{opt.label}</span>
                      <span className="inline-flex text-spicy" aria-hidden="true">
                        {Array.from({ length: opt.tier }).map((_, i) => (
                          <Flame key={i} className="w-3 h-3 fill-current" />
                        ))}
                      </span>
                    </div>
                    <div className="text-[10px] text-text-secondary mt-1 leading-tight">
                      {opt.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Player Management Section */}
        <section className="pt-4 border-t border-border space-y-3 pb-2">
          <div className="flex items-center justify-between">
            <label className="font-heading text-xs font-bold text-text flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-action" />
              <span>Jugadores ({players.length})</span>
            </label>
            <span className="text-xs text-text-muted">Mínimo 2 jugadores</span>
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
              className="flex-1 min-w-0 w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-border bg-surface text-text placeholder:text-text-muted text-base focus:outline-none focus:border-action focus:ring-1 focus:ring-focus"
              data-testid="player-name-input"
            />
            <button
              type="submit"
              disabled={!playerName.trim()}
              className="px-4 min-h-[44px] rounded-xl bg-action text-action-ink font-bold text-xs interactive-action active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              data-testid="add-player-btn"
            >
              <UserPlus className="w-4 h-4" />
              <span>Añadir</span>
            </button>
          </form>

          {/* 1-Tap Quick Add Chips */}
          {availableQuickAdds.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-xs font-medium text-text-muted block">
                Añadir rápido
              </span>
              <div className="flex flex-wrap gap-2" data-testid="quick-add-chips">
                {availableQuickAdds.slice(0, 6).map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleQuickAdd(name)}
                    className="px-3.5 min-h-[44px] rounded-full text-xs font-semibold border border-border bg-surface text-text interactive-surface active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus transition-all cursor-pointer flex items-center gap-1"
                    data-testid={`quick-add-${name}`}
                  >
                    <span className="text-action font-bold">+</span>
                    <span>{name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active Player Roster List (Player avatars are the ONLY emojis kept) */}
          <div className="space-y-2 pt-1" data-testid="player-roster">
            {players.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-border-strong bg-surface/50 text-center text-xs text-text-secondary">
                Añade al menos 2 jugadores para empezar la previa.
              </div>
            ) : (
              players.map((p, index) => (
                <div
                  key={p.id}
                  style={{ borderLeftColor: p.color || 'var(--pv-action)' }}
                  className="flex items-center justify-between pl-3 pr-1.5 py-1.5 min-h-[52px] rounded-xl border border-border border-l-4 bg-surface text-sm"
                  data-testid={`player-item-${p.id}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg shrink-0" aria-hidden="true">
                      {p.avatar || '👤'}
                    </span>
                    <span className="font-semibold text-text truncate">{p.name}</span>
                    {index === 0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-success-quiet border border-success-line text-success font-semibold shrink-0">
                        Inicia
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemove(p.id)}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-danger hover:bg-danger-quiet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus active:scale-[0.95] transition-colors cursor-pointer shrink-0"
                    aria-label={`Eliminar a ${p.name}`}
                    data-testid={`remove-player-${p.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Sticky Thumb-Zone Footer CTA */}
      <div className="shrink-0 border-t border-border bg-background/95 px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
        <button
          type="button"
          onClick={handleStart}
          disabled={players.length < 2 || isLoading}
          className="w-full min-h-[48px] py-3.5 px-4 rounded-2xl bg-action text-action-ink font-heading font-extrabold text-sm tracking-tight interactive-action active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all cursor-pointer flex items-center justify-center gap-2"
          data-testid="start-game-btn"
        >
          {isLoading ? (
            <span>Preparando partida...</span>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Empezar previa</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SetupScreen;
