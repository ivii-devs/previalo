import React, { useState, useEffect, useRef } from 'react';
import {
  Flame,
  Heart,
  Shuffle,
  Dices,
  Wine,
  ShieldAlert,
  Scale,
  Target,
  MessageCircle,
  Crown,
  Swords,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { CatalogLoader } from '../../infrastructure/catalogLoader';
import { soundService } from '../../infrastructure/soundService';
import { useDragToScroll } from '../hooks/useDragToScroll';
import { LegalModal } from '../components/LegalModal';

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

interface CategoryItem {
  category_id: string;
  name: string;
  description: string;
  card_count: number;
}

const DEFAULT_CATEGORIES: CategoryItem[] = [
  { category_id: 'yo_nunca', name: 'Yo Nunca', description: 'Confesiones y tragos', card_count: 1355 },
  { category_id: 'retos_y_virus', name: 'Retos y Virus', description: 'Desafíos atrevidos y virus grupales', card_count: 2310 },
  { category_id: 'que_prefieres', name: '¿Qué Prefieres?', description: 'Dilemas extremos sin escape', card_count: 289 },
  { category_id: 'verdad_o_reto', name: 'Verdad o Reto', description: 'Secretos íntimos y pruebas de fuego', card_count: 857 },
  { category_id: 'quien_es_mas_probable', name: '¿Quién es Más Probable?', description: 'Votación sin filtros', card_count: 199 },
  { category_id: 'confesiones', name: 'Confesiones', description: 'Preguntas íntimas y anécdotas', card_count: 207 },
  { category_id: 'mesa_y_minijuegos', name: 'Mesa y Minijuegos', description: 'Copa del Rey y dinámicas de mesa', card_count: 136 },
  { category_id: 'guerra_equipos', name: 'Guerra de Equipos', description: 'Duelos por bandos y campeones', card_count: 863 },
];

const renderCategoryIcon = (categoryId: string): { icon: React.ReactNode; badgeClass: string } => {
  switch (categoryId) {
    case 'yo_nunca':
      return {
        icon: <Wine className="w-4 h-4" />,
        badgeClass: 'bg-selected border border-action/30 text-action',
      };
    case 'retos_y_virus':
      return {
        icon: <ShieldAlert className="w-4 h-4" />,
        badgeClass: 'bg-virus-quiet border border-virus-line text-virus',
      };
    case 'que_prefieres':
      return {
        icon: <Scale className="w-4 h-4" />,
        badgeClass: 'bg-info-quiet border border-info-line text-info',
      };
    case 'verdad_o_reto':
      return {
        icon: <Flame className="w-4 h-4" />,
        badgeClass: 'bg-spicy-quiet border border-spicy-line text-spicy',
      };
    case 'quien_es_mas_probable':
      return {
        icon: <Target className="w-4 h-4" />,
        badgeClass: 'bg-warning-quiet border border-warning-line text-warning',
      };
    case 'confesiones':
      return {
        icon: <MessageCircle className="w-4 h-4" />,
        badgeClass: 'bg-virus-quiet border border-virus-line text-virus',
      };
    case 'mesa_y_minijuegos':
      return {
        icon: <Crown className="w-4 h-4" />,
        badgeClass: 'bg-success-quiet border border-success-line text-success',
      };
    case 'guerra_equipos':
      return {
        icon: <Swords className="w-4 h-4" />,
        badgeClass: 'bg-info-quiet border border-info-line text-info',
      };
    default:
      return {
        icon: <Layers className="w-4 h-4" />,
        badgeClass: 'bg-surface-muted border border-border text-text-secondary',
      };
  }
};

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectMode }) => {
  const [categories, setCategories] = useState<CategoryItem[]>(DEFAULT_CATEGORIES);
  const [totalCards, setTotalCards] = useState<number>(6937);
  const [spicyCardsCount, setSpicyCardsCount] = useState<number>(1661);
  const [parejasCardsCount, setParejasCardsCount] = useState<number>(395);
  const [boardCardsCount, setBoardCardsCount] = useState<number>(721);
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'terms' | 'privacy' | 'storage'>('terms');

  useEffect(() => {
    CatalogLoader.loadManifest()
      .then((manifest) => {
        if (manifest.categories && manifest.categories.length > 0) {
          const boardCat = manifest.categories.find((c) => c.category_id === 'el_tablero');
          if (boardCat?.card_count) {
            setBoardCardsCount(boardCat.card_count);
          }

          const cardCategories = manifest.categories
            .filter((c) => c.category_id !== 'el_tablero')
            .map((c) => {
              const fallback = DEFAULT_CATEGORIES.find((d) => d.category_id === c.category_id);
              return {
                category_id: c.category_id,
                name: cleanCategoryName(c.name, c.category_id),
                description: c.description || fallback?.description || '',
                card_count: c.card_count || fallback?.card_count || 500,
              };
            });

          if (cardCategories.length > 0) {
            setCategories(cardCategories);
          }
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
      className="flex-1 min-h-0 h-full flex flex-col w-full max-w-md mx-auto px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] space-y-6 overflow-y-auto select-none scroll-container"
      data-testid="home-screen"
    >
      {/* Fast-Start Modes Section */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-heading text-sm font-bold text-text">
            Modos rápidos
          </h2>
          <span className="text-xs text-text-muted font-mono font-medium">
            {totalCards.toLocaleString()} cartas
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {/* Primary Filled CTA: Modo Caos */}
          <button
            type="button"
            onClick={() => handleHeroClick('chaos')}
            className="w-full p-4 rounded-2xl bg-action text-action-ink interactive-action active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all flex items-center justify-between gap-3 text-left cursor-pointer min-h-[84px]"
            data-testid="hero-mode-chaos"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-heading font-extrabold text-lg leading-tight">
                  Modo Caos
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-action-ink/15 text-action-ink">
                  Destacado
                </span>
              </div>
              <p className="text-xs text-action-ink/85 leading-snug">
                Mezcla intercalada de todas las categorías sin repeticiones.
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-action-ink/12 flex items-center justify-center shrink-0">
              <Shuffle className="w-5 h-5" />
            </div>
          </button>

          {/* 2-Column Presets Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Modo Spicy */}
            <button
              type="button"
              onClick={() => handleHeroClick('preset', 'modo_caliente')}
              className="p-3.5 rounded-2xl border border-border bg-surface interactive-card active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus transition-all flex flex-col justify-between gap-3 text-left cursor-pointer min-h-[104px]"
              data-testid="hero-mode-caliente"
            >
              <div className="w-9 h-9 rounded-xl bg-spicy-quiet border border-spicy-line text-spicy flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <div className="font-heading font-bold text-sm text-text leading-tight">
                  Modo Spicy
                </div>
                <div className="text-xs font-mono text-text-muted mt-0.5">
                  {spicyCardsCount.toLocaleString()} cartas
                </div>
              </div>
            </button>

            {/* Modo Parejas */}
            <button
              type="button"
              onClick={() => handleHeroClick('preset', 'modo_parejas')}
              className="p-3.5 rounded-2xl border border-border bg-surface interactive-card active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus transition-all flex flex-col justify-between gap-3 text-left cursor-pointer min-h-[104px]"
              data-testid="hero-mode-parejas"
            >
              <div className="w-9 h-9 rounded-xl bg-spicy-quiet border border-spicy-line text-spicy flex items-center justify-center">
                <Heart className="w-4 h-4" />
              </div>
              <div>
                <div className="font-heading font-bold text-sm text-text leading-tight">
                  Modo Parejas
                </div>
                <div className="text-xs font-mono text-text-muted mt-0.5">
                  {parejasCardsCount.toLocaleString()} cartas
                </div>
              </div>
            </button>
          </div>

          {/* El Tablero Dedicated Entry */}
          <button
            type="button"
            onClick={() => handleHeroClick('board')}
            className="w-full p-3.5 rounded-2xl border border-border bg-surface interactive-card active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus transition-all text-left flex items-center justify-between gap-3 cursor-pointer min-h-[72px]"
            data-testid="hero-mode-board"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-success-quiet border border-success-line text-success flex items-center justify-center shrink-0">
                <Dices className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-heading font-bold text-sm text-text leading-tight">
                  El Tablero
                </div>
                <div className="text-xs text-text-secondary mt-0.5 leading-snug">
                  64 casillas con {boardCardsCount} cartas de retos, bares y niveles Hot.
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
          </button>
        </div>
      </section>

      {/* 8 Card Categories Grid (2 columns x 4 rows, no duplicate El Tablero) */}
      <section className="space-y-3 pb-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-heading text-sm font-bold text-text">
            Categorías de cartas
          </h2>
          <span className="text-xs text-text-muted font-mono">
            {categories.length} mazos
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5" data-testid="categories-grid">
          {categories.map((cat) => {
            const { icon, badgeClass } = renderCategoryIcon(cat.category_id);
            return (
              <button
                key={cat.category_id}
                type="button"
                onClick={() => handleHeroClick('category', cat.category_id)}
                className="min-h-[76px] p-3 rounded-2xl border border-border bg-surface interactive-card active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus transition-all flex items-center gap-2.5 text-left cursor-pointer"
                data-testid={`cat-btn-${cat.category_id}`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${badgeClass}`}
                  aria-hidden="true"
                >
                  {icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-heading text-xs font-bold text-text leading-[1.2] break-words">
                    {cat.name}
                  </p>
                  <span className="text-[11px] font-mono text-text-muted mt-0.5 block">
                    {cat.card_count} cartas
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Legal & Info Footer (pb-20 ensures legal links remain accessible above any floating install prompt) */}
      <footer className="pt-3 pb-20 border-t border-border flex flex-col items-center text-center space-y-1 text-xs text-text-muted">
        <div className="flex items-center gap-1 font-medium">
          <button
            type="button"
            onClick={() => {
              soundService.playTap();
              setLegalTab('terms');
              setIsLegalOpen(true);
            }}
            className="min-h-[44px] px-2.5 rounded-lg hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus transition-colors cursor-pointer"
            data-testid="home-legal-terms-btn"
          >
            Términos (+18)
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => {
              soundService.playTap();
              setLegalTab('privacy');
              setIsLegalOpen(true);
            }}
            className="min-h-[44px] px-2.5 rounded-lg hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus transition-colors cursor-pointer"
            data-testid="home-legal-privacy-btn"
          >
            Privacidad
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => {
              soundService.playTap();
              setLegalTab('storage');
              setIsLegalOpen(true);
            }}
            className="min-h-[44px] px-2.5 rounded-lg hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus transition-colors cursor-pointer"
            data-testid="home-legal-storage-btn"
          >
            Almacenamiento
          </button>
        </div>
        <p className="text-[11px] text-text-muted pb-2">
          Previalo v1.0.0 · 100% offline · Sin anuncios
        </p>
      </footer>

      <LegalModal
        isOpen={isLegalOpen}
        onClose={() => setIsLegalOpen(false)}
        defaultTab={legalTab}
      />
    </div>
  );
};

export default HomeScreen;
