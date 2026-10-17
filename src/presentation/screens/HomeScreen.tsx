import React, { useState, useEffect, useRef } from 'react';
import { 
  Flame, 
  Heart, 
  Shuffle, 
  Dices, 
  Sparkles, 
  Beer, 
  Layers
} from 'lucide-react';
import { CatalogLoader } from '../../infrastructure/catalogLoader';
import { soundService } from '../../infrastructure/soundService';
import { useDragToScroll } from '../hooks/useDragToScroll';

export interface HomeScreenProps {
  onSelectMode: (mode: 'category' | 'preset' | 'chaos' | 'board', targetId?: string) => void;
  onResumeSession?: () => void;
}

export const cleanCategoryName = (rawName: string, categoryId?: string): string => {
  if (categoryId === 'el_tablero') return 'El Tablero';
  return (
    rawName
      .replace(/^[\p{Extended_Pictographic}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0E}-\u{FE0F}\u{200D}\s]+/u, '')
      .replace(/\s*\(\s*La Guatoca\s*\)/i, '')
      .trim() || rawName
  );
};

const DEFAULT_CATEGORIES: Array<{
  category_id: string;
  name: string;
  description: string;
  icon: string;
  card_count: number;
  color: string;
}> = [
  { category_id: 'yo_nunca', name: 'Yo Nunca', description: 'Confesiones y tragos', icon: '🍺', card_count: 1355, color: '#ec4899' },
  { category_id: 'retos_y_virus', name: 'Retos y Virus', description: 'Desafíos atrevidos y virus grupales', icon: '⚡', card_count: 2310, color: '#f43f5e' },
  { category_id: 'que_prefieres', name: '¿Qué Prefieres?', description: 'Dilemas extremos sin escape', icon: '⚖️', card_count: 289, color: '#06b6d4' },
  { category_id: 'verdad_o_reto', name: 'Verdad o Reto', description: 'Secretos íntimos y pruebas de fuego', icon: '🔥', card_count: 857, color: '#eab308' },
  { category_id: 'quien_es_mas_probable', name: '¿Quién es Más Probable?', description: 'Votación sin filtros', icon: '🎯', card_count: 199, color: '#8b5cf6' },
  { category_id: 'confesiones', name: 'Confesiones', description: 'Preguntas íntimas y anécdotas', icon: '🤫', card_count: 207, color: '#a855f7' },
  { category_id: 'mesa_y_minijuegos', name: 'Mesa y Minijuegos', description: 'Copa del Rey y dinámicas de mesa', icon: '🍾', card_count: 136, color: '#10b981' },
  { category_id: 'guerra_equipos', name: 'Guerra de Equipos', description: 'Duelos por bandos y campeones', icon: '⚔️', card_count: 863, color: '#3b82f6' },
  { category_id: 'el_tablero', name: 'El Tablero', description: 'Eventos para El Tablero', icon: '🎲', card_count: 721, color: '#f97316' },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectMode }) => {
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [totalCards, setTotalCards] = useState<number>(6937);
  const [spicyCardsCount, setSpicyCardsCount] = useState<number>(1661);
  const [parejasCardsCount, setParejasCardsCount] = useState<number>(395);

  useEffect(() => {
    CatalogLoader.loadManifest()
      .then((manifest) => {
        if (manifest.categories && manifest.categories.length > 0) {
          const CATEGORY_ICONS: Record<string, string> = {
            yo_nunca: '🍺',
            retos_y_virus: '⚡',
            que_prefieres: '⚖️',
            verdad_o_reto: '🔥',
            quien_es_mas_probable: '🎯',
            confesiones: '🤫',
            mesa_y_minijuegos: '🍾',
            guerra_equipos: '⚔️',
            el_tablero: '🎲',
          };
          const merged = manifest.categories.map((c, i) => ({
            category_id: c.category_id,
            name: cleanCategoryName(c.name, c.category_id),
            description: c.description || DEFAULT_CATEGORIES[i]?.description || '',
            icon: CATEGORY_ICONS[c.category_id] || DEFAULT_CATEGORIES[i]?.icon || '🃏',
            card_count: c.card_count || DEFAULT_CATEGORIES[i]?.card_count || 500,
            color: DEFAULT_CATEGORIES[i]?.color || '#ec4899',
          }));
          setCategories(merged);
        }
        if (manifest.global_stats?.total_cards) {
          setTotalCards(manifest.global_stats.total_cards);
        }
        if (manifest.presets && manifest.presets.length > 0) {
          const spicyPreset = manifest.presets.find((p) => p.preset_id === 'modo_caliente');
          if (spicyPreset?.card_count) setSpicyCardsCount(spicyPreset.card_count);
          const parejasPreset = manifest.presets.find((p) => p.preset_id === 'modo_parejas');
          if (parejasPreset?.card_count) setParejasCardsCount(parejasPreset.card_count);
        }
      })
      .catch(() => {
        // Fallback default state
      });
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  useDragToScroll(scrollRef);

  const handleHeroClick = (mode: 'category' | 'preset' | 'chaos' | 'board', targetId?: string) => {
    soundService.playTap();
    soundService.vibrate(10);
    onSelectMode(mode, targetId);
  };

  return (
    <div
      ref={scrollRef}
      className="flex-1 min-h-0 h-full flex flex-col w-full max-w-md mx-auto px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] space-y-5 overflow-y-auto select-none scroll-container"
      data-testid="home-screen"
    >
      {/* Hero Fast-Start Modes Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 theme-accent-primary" />
            <span>Modos Rápidos de Fiesta</span>
          </h2>
          <span className="text-[10px] theme-text-muted font-mono font-bold flex items-center gap-1">
            <Layers className="w-3 h-3" />
            {totalCards.toLocaleString()} Cartas
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {/* Hero 1: Modo Caos */}
          <button
            onClick={() => handleHeroClick('chaos')}
            className="w-full p-4 rounded-2xl bg-gradient-to-r from-[#ec4899] to-[#8b5cf6] text-white shadow-[0_0_20px_rgba(236,72,153,0.35)] flex items-center justify-between text-left hover:scale-[1.01] active:scale-98 transition-all cursor-pointer relative overflow-hidden group"
            data-testid="hero-mode-chaos"
          >
            <div className="absolute right-0 top-0 -mt-2 -mr-2 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
            <div>
              <div className="flex items-center space-x-1.5 font-black text-lg">
                <span>🔥 Modo Caos</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 uppercase">Top</span>
              </div>
              <p className="text-xs text-white/90 mt-0.5">
                Mezcla intercalada de todas las categorías sin repeticiones.
              </p>
            </div>
            <Shuffle className="w-6 h-6 text-white shrink-0 ml-2" />
          </button>

          {/* 2-column Hero Grid for Presets */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Modo Spicy */}
            <button
              onClick={() => handleHeroClick('preset', 'modo_caliente')}
              className="p-3.5 rounded-2xl bg-gradient-to-br from-[#f43f5e] to-[#f97316] text-white shadow-[0_0_15px_rgba(244,63,94,0.3)] flex flex-col justify-between text-left hover:scale-[1.02] active:scale-98 transition-all cursor-pointer relative overflow-hidden"
              data-testid="hero-mode-caliente"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">🌶️</span>
                <Flame className="w-4 h-4 text-white/80" />
              </div>
              <div>
                <div className="font-black text-sm">Modo Spicy</div>
                <div className="text-[10px] text-white/80">{spicyCardsCount.toLocaleString()} cartas</div>
              </div>
            </button>

            {/* Modo Parejas */}
            <button
              onClick={() => handleHeroClick('preset', 'modo_parejas')}
              className="p-3.5 rounded-2xl bg-gradient-to-br from-[#a855f7] to-[#ec4899] text-white shadow-[0_0_15px_rgba(168,85,247,0.3)] flex flex-col justify-between text-left hover:scale-[1.02] active:scale-98 transition-all cursor-pointer relative overflow-hidden"
              data-testid="hero-mode-parejas"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">❤️</span>
                <Heart className="w-4 h-4 text-white/80" />
              </div>
              <div>
                <div className="font-black text-sm">Modo Parejas</div>
                <div className="text-[10px] text-white/80">{parejasCardsCount.toLocaleString()} cartas</div>
              </div>
            </button>
          </div>

          {/* El Tablero CTA */}
          <button
            onClick={() => handleHeroClick('board')}
            className="w-full p-3.5 rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-r from-emerald-950/30 to-[var(--bg-surface)] hover:border-emerald-400 text-left flex items-center justify-between shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:scale-[1.01] active:scale-98 transition-all cursor-pointer"
            data-testid="hero-mode-board"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg">
                🎲
              </div>
              <div>
                <div className="font-black text-sm text-emerald-300">
                  El Tablero
                </div>
                <div className="text-[11px] theme-text-muted">
                  64 casillas con 721 cartas de retos, bares y niveles Hot.
                </div>
              </div>
            </div>
            <Dices className="w-5 h-5 text-emerald-400 shrink-0" />
          </button>
        </div>
      </div>

      {/* Touch Grid of 9 Categories */}
      <div className="space-y-2.5 pb-6">
        <h2 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
          <Beer className="w-3.5 h-3.5 text-amber-400" />
          <span>Explorar por Categoría</span>
        </h2>

        <div className="grid grid-cols-3 gap-2.5" data-testid="categories-grid">
          {categories.map((cat) => (
            <button
              key={cat.category_id}
              onClick={() =>
                cat.category_id === 'el_tablero'
                  ? handleHeroClick('board')
                  : handleHeroClick('category', cat.category_id)
              }
              className="min-h-[110px] p-2 rounded-2xl border theme-border bg-[var(--bg-surface)] hover:border-[var(--accent-primary)] hover:scale-[1.03] active:scale-95 transition-all flex flex-col justify-between items-center text-center cursor-pointer shadow-sm group"
              data-testid={`cat-btn-${cat.category_id}`}
            >
              <span className="text-2xl mt-0.5 group-hover:scale-110 transition-transform shrink-0">
                {cat.icon}
              </span>
              <div className="w-full flex-1 flex flex-col justify-center items-center my-0.5">
                <p className="text-[11px] font-black theme-text-primary leading-[1.15] text-center break-words">
                  {cat.name}
                </p>
              </div>
              <span className="text-[10px] theme-text-muted font-semibold shrink-0">
                {cat.card_count} cartas
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
