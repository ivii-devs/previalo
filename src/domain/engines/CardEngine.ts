/**
 * Previalo Domain Layer: CardEngine
 * Pure domain engine responsible for shuffling, mode deck construction,
 * category interleaving constraints, and undo/history stack management.
 */

import type { Card, IntensityLevel } from '../types/card';
import type { BoardId, HotTier } from '../types/board';
import type { HistorySnapshot } from '../types/session';
import type { Player } from '../types/player';
import type { ActiveVirus } from '../types/virus';

export interface CardFilterOptions {
  intensity?: IntensityLevel;
  intensities?: IntensityLevel[];
  packIds?: string[];
  hotTiers?: HotTier[];
  types?: string[];
  yoNuncaSubGroup?: 'all' | 'suave' | 'extremo_18';
}

export class CardEngine {
  private historyStack: HistorySnapshot[] = [];

  /**
   * Pure, strict Fisher-Yates (O(N)) uniform array shuffler.
   * Returns a newly allocated shuffled array without mutating the source.
   */
  public static shuffle<T>(array: readonly T[] | T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  /**
   * Instance alias for shuffle.
   */
  public shuffle<T>(array: readonly T[] | T[]): T[] {
    return CardEngine.shuffle(array);
  }

  private static readonly LEGACY_RESOLVER_IDS = new Set<number>([
    3120, 3121, 3483, 3484, 3485, 3625, 3626, 3627, 6248, 6249, 6250, 6253, 6254, 6255,
  ]);

  /**
   * Identifies whether a card represents a resolver (cure/closure/continuation) card.
   * Checks explicit chain role 'resolver' as well as defensive fallback
   * patterns for residual or cached orphan cures to prevent initial deck contamination.
   */
  public static isResolverOrCure(card: Card): boolean {
    if (card.chain?.role === 'resolver') {
      return true;
    }
    if (this.LEGACY_RESOLVER_IDS.has(Number(card.id))) {
      return true;
    }
    // Defensive check: if card has virus type or chain (even if a stale cache marked role: 'trigger')
    // and matches explicit cure wording patterns
    if (card.type === 'virus' || Boolean(card.chain)) {
      return /(?:^(?:¡?\{player\d+\}(?:\s+y\s+\{player\d+\})?,?\s+|¡)?(?:ya\s+|ya\s+no\b|deja\s+de\b|deja\s+ya\b|dejad\s+|fin\s+de(?:l)?\b|recuperar\b|recuperamos\b|se\s+divorcian\b|se\s+separan\b|puedes\s+dejar\b|puedes\s+volver\b|puedes\s+levantarte\b|puede\s+dejar\b|puede\s+volver\b|puede\s+liberar\b|puede\s+retirar\b|pueden\s+dejar\b|pueden\s+recuperar\b|podéis\s+dejar\b|podéis\s+volver\b|podemos\s+dejar\b|podemos\s+volver\b|ya\s+puedes\b|ya\s+puede\b|ya\s+pueden\b|ya\s+podemos\b|ya\s+habéis|ya\s+no\s+es\b|ya\s+no\s+eres\b|ya\s+no\s+estás|ya\s+has\b|vuelve\s+a\s+|vuelven\s+a\s+la\s+civilización|por\s+fin\s+has\s+recuperado\b|has\s+perdido\s+tu\b|tus\s+piojos\s+han\s+desaparecido\b|pierde\s+su\s+poder\b|se\s+acabó)|\b(?:ya\s+no\b|ya\s+puedes\s+volver\b|puedes\s+recuperar\s+tu\b|puedes\s+dejar\s+de\b|puede\s+dejar\s+de\b|puede\s+volver\s+a\b|pueden\s+dejar\s+de\b|pueden\s+recuperar\b|podéis\s+dejar\b|podemos\s+dejar\s+de\b|podemos\s+volver\s+a\b|se\s+puede\s+volver\s+a\b|pueden\s+volver\s+a\b|ya\s+puede\s+dejar\s+de\b|ya\s+pueden\b|ya\s+podemos\b|ya\s+habéis\s+trabajado\b|ya\s+habéis\s+terminado\b|fin\s+de\s+la\s+regla\b|deja\s+ya\s+el\b|dejad\s+ya\b|dejad\s+de\b|dejemos\s+de\b|dejémonos\s+de\b|se\s+acabó\s+tu\s+reinado\b|se\s+acabó\s+hacer\b|se\s+acabaron\s+las\b|ha\s+acabado\b|se\s+ha\s+acabado\b|ha\s+terminado\b|se\s+ha\s+curado\b|deja\s+de\s+existir\b|pierde\s+su\s+poder\b|vuelve\s+a\s+ser\s+libre\b|vuelve\s+a\s+ser\s+aceptado\b|se\s+divorcian\b|se\s+separan\b|recuperamos\s+nuestros\b|recupera\s+su\s+copa\b|recupera\s+su\s+ropa\b|terminará\s+el\s+vaso\s+del\s+medio\b|pudiste\s+mostrar\s+tus\s+talentos\b))/i.test(
        card.text
      );
    }
    return false;
  }

  /**
   * Instance alias for isResolverOrCure.
   */
  public isResolverOrCure(card: Card): boolean {
    return CardEngine.isResolverOrCure(card);
  }

  /**
   * Builds a playable deck from a single category with optional pack, intensity, hotTier, and type filtering.
   */
  public buildCategoryDeck(cards: Card[], filter?: CardFilterOptions): Card[] {
    let filtered = cards.filter((c) => !CardEngine.isResolverOrCure(c));

    // 1. Intensity filter (prefer multi-intensity array, fallback to single intensity)
    if (filter?.intensities && filter.intensities.length > 0) {
      const allowed = new Set(filter.intensities);
      filtered = filtered.filter((c) => allowed.has(c.intensity));
    } else if (filter?.intensity !== undefined) {
      filtered = filtered.filter((c) => c.intensity === filter.intensity);
    }

    // 2. Pack filtering
    if (filter?.packIds && filter.packIds.length > 0) {
      const allowedPacks = new Set(filter.packIds);
      filtered = filtered.filter((c) => c.pack_id && allowedPacks.has(c.pack_id));
    }

    // 3. Hot tier filtering (for cards having hot_tier or tier)
    if (filter?.hotTiers && filter.hotTiers.length > 0) {
      const allowedHotTiers = new Set<number>(filter.hotTiers);
      filtered = filtered.filter((c) => {
        const tier = (c.hot_tier ?? c.tier) as number | undefined;
        return tier === undefined || allowedHotTiers.has(tier);
      });
    }

    // 4. Type filtering (e.g. truth vs dare in Verdad o Reto)
    if (filter?.types && filter.types.length > 0) {
      const allowedTypes = new Set(filter.types);
      filtered = filtered.filter((c) => allowedTypes.has(c.type));
    }

    // 5. Yo Nunca sub-group filtering
    if (filter?.yoNuncaSubGroup && filter.yoNuncaSubGroup !== 'all') {
      if (filter.yoNuncaSubGroup === 'suave') {
        filtered = filtered.filter(
          (c) => c.pack_id !== 'yn_picante' || c.drinks_penalty === 1 || c.source === 'open_source'
        );
      } else if (filter.yoNuncaSubGroup === 'extremo_18') {
        filtered = filtered.filter(
          (c) => c.pack_id !== 'yn_picante' || c.drinks_penalty === 2 || c.source === 'guatoca_official_es'
        );
      }
    }

    return CardEngine.shuffle(filtered);
  }

  /**
   * Builds a playable deck from a curated preset (e.g. modo_caliente, modo_parejas).
   */
  public buildPresetDeck(cards: Card[], filter?: CardFilterOptions): Card[] {
    let filtered = cards.filter((c) => !CardEngine.isResolverOrCure(c));

    if (filter?.intensities && filter.intensities.length > 0) {
      const allowed = new Set(filter.intensities);
      filtered = filtered.filter((c) => allowed.has(c.intensity));
    } else if (filter?.intensity !== undefined) {
      filtered = filtered.filter((c) => c.intensity === filter.intensity);
    }

    if (filter?.hotTiers && filter.hotTiers.length > 0) {
      const allowedHotTiers = new Set<number>(filter.hotTiers);
      filtered = filtered.filter((c) => {
        const tier = (c.hot_tier ?? c.tier) as number | undefined;
        return tier === undefined || allowedHotTiers.has(tier);
      });
    }

    return CardEngine.shuffle(filtered);
  }

  /**
   * Builds a dynamic card deck exclusively for El Tablero (La Guatoca)
   * filtered by board modality ('guatoca_clasica', 'guatoca_hot', 'guatoca_todos')
   * and selected Hot tiers (1, 2, 3).
   */
  public static buildBoardDeck(
    cards: readonly Card[] | Card[],
    boardId: BoardId,
    hotTiers: readonly HotTier[] = [1, 2, 3]
  ): Card[] {
    const activeTiers = new Set<HotTier>(
      hotTiers && hotTiers.length > 0 ? hotTiers : [1, 2, 3]
    );

    const filtered = cards.filter((c) => {
      if (boardId === 'guatoca_clasica') {
        if (c.type === 'hot_event' || c.sub_type === 'hot') {
          return false;
        }
        return (
          c.board_modes?.includes('classic') ||
          c.board_modes?.includes('hammered') ||
          c.board_modes?.includes('couple') ||
          c.sub_type === 'fiesta_general' ||
          c.sub_type === 'dice_or_tile_specific' ||
          c.sub_type === 'couple' ||
          !c.board_modes
        );
      }

      if (boardId === 'guatoca_hot') {
        if (c.type === 'hot_event') {
          const tier = (c.tier as HotTier) ?? 1;
          return activeTiers.has(tier);
        }
        return c.sub_type === 'hot' || Boolean(c.board_modes?.includes('hot'));
      }

      // 'guatoca_todos'
      if (c.type === 'hot_event') {
        const tier = (c.tier as HotTier) ?? 1;
        return activeTiers.has(tier);
      }
      return true;
    });

    return CardEngine.shuffle(filtered);
  }

  /**
   * Instance alias for buildBoardDeck.
   */
  public buildBoardDeck(
    cards: readonly Card[] | Card[],
    boardId: BoardId,
    hotTiers: readonly HotTier[] = [1, 2, 3]
  ): Card[] {
    return CardEngine.buildBoardDeck(cards, boardId, hotTiers);
  }

  /**
   * Builds a chaos mix deck from multiple categories with strict interleaving:
   * guarantees no more than 3 consecutive cards belong to the same category.
   * Excludes 'guerra_equipos', 'el_tablero', and any card flagged with exclude_from_chaos: true.
   */
  public buildChaosDeck(
    categoriesCards: Record<string, Card[]>,
    filter?: CardFilterOptions
  ): Card[] {
    const pools: Record<string, Card[]> = {};

    for (const [catId, cards] of Object.entries(categoriesCards)) {
      if (catId === 'guerra_equipos' || catId === 'el_tablero') continue;
      let filtered = cards.filter(
        (c) =>
          !CardEngine.isResolverOrCure(c) &&
          !c.exclude_from_chaos &&
          c.category_id !== 'el_tablero' &&
          c.category_id !== 'tablero_drink' &&
          c.category_id !== 'tablero_event' &&
          c.category_id !== 'tablero_hot'
      );
      if (filter?.intensities && filter.intensities.length > 0) {
        const allowed = new Set(filter.intensities);
        filtered = filtered.filter((c) => allowed.has(c.intensity));
      } else if (filter?.intensity !== undefined) {
        filtered = filtered.filter((c) => c.intensity === filter.intensity);
      }
      if (filtered.length > 0) {
        pools[catId] = CardEngine.shuffle(filtered);
      }
    }

    const categoryKeys = Object.keys(pools);
    if (categoryKeys.length === 0) return [];

    const chaosDeck: Card[] = [];
    const poolIndices: Record<string, number> = {};
    categoryKeys.forEach((k) => (poolIndices[k] = 0));

    let consecutiveCategoryCount = 0;
    let lastCategoryId = '';

    const maxCards = Object.values(pools).reduce((acc, p) => acc + p.length, 0);
    let safety = 0;

    while (chaosDeck.length < maxCards && safety < maxCards * 2) {
      safety++;
      const otherCategories = categoryKeys.filter(
        (k) => k !== lastCategoryId && poolIndices[k] < pools[k].length
      );

      let pickedCat: string;
      if (consecutiveCategoryCount >= 2 && otherCategories.length > 0) {
        // Bias towards category switch when at 2 or more consecutive, weighted by remaining cards
        const totalRem = otherCategories.reduce((acc, k) => acc + (pools[k].length - poolIndices[k]), 0);
        let r = Math.random() * totalRem;
        pickedCat = otherCategories[0];
        for (const k of otherCategories) {
          r -= (pools[k].length - poolIndices[k]);
          if (r <= 0) {
            pickedCat = k;
            break;
          }
        }
      } else {
        const available = categoryKeys.filter(
          (k) => poolIndices[k] < pools[k].length && (k !== lastCategoryId || consecutiveCategoryCount < 3)
        );
        if (available.length === 0) {
          // If only lastCategoryId remains and it has reached 3 consecutive, break to uphold invariant
          break;
        }
        const totalRem = available.reduce((acc, k) => acc + (pools[k].length - poolIndices[k]), 0);
        let r = Math.random() * totalRem;
        pickedCat = available[0];
        for (const k of available) {
          r -= (pools[k].length - poolIndices[k]);
          if (r <= 0) {
            pickedCat = k;
            break;
          }
        }
      }

      const card = { ...pools[pickedCat][poolIndices[pickedCat]++] };
      card.category_id = card.category_id || pickedCat;
      chaosDeck.push(card);

      if (pickedCat === lastCategoryId) {
        consecutiveCategoryCount++;
      } else {
        lastCategoryId = pickedCat;
        consecutiveCategoryCount = 1;
      }
    }

    return chaosDeck;
  }

  // --- Undo & History Stack Management ---

  /**
   * Pushes a state snapshot onto the history stack.
   */
  public pushSnapshot(snapshot: HistorySnapshot): void {
    this.historyStack.push(snapshot);
  }

  /**
   * Pops and returns the most recent snapshot from the history stack, or null if empty.
   */
  public popSnapshot(): HistorySnapshot | null {
    return this.historyStack.pop() ?? null;
  }

  /**
   * Checks whether an undo operation is possible (stack is not empty).
   */
  public canUndo(): boolean {
    return this.historyStack.length > 0;
  }

  /**
   * Returns current history stack length.
   */
  public getHistoryLength(): number {
    return this.historyStack.length;
  }

  /**
   * Clears the undo history stack.
   */
  public clearHistory(): void {
    this.historyStack = [];
  }

  /**
   * Pure domain helper to extract and index all chain resolver (cure) cards grouped by chain_id.
   */
  public static extractResolvers(cards: Card[]): Map<string, Card[]> {
    const map = new Map<string, Card[]>();
    for (const card of cards) {
      if (CardEngine.isResolverOrCure(card) && card.chain?.chain_id) {
        const normalizedCard: Card =
          card.chain.role === 'resolver'
            ? card
            : { ...card, chain: { ...card.chain, role: 'resolver' } };
        const existing = map.get(card.chain.chain_id);
        if (existing) {
          existing.push(normalizedCard);
        } else {
          map.set(card.chain.chain_id, [normalizedCard]);
        }
      }
    }
    return map;
  }

  /**
   * Instance alias for extractResolvers.
   */
  public extractResolvers(cards: Card[]): Map<string, Card[]> {
    return CardEngine.extractResolvers(cards);
  }

  /**
   * Pure domain engine scheduling a matching resolver (cure/continuation) card into the remaining deck
   * at an offset D dictated by delay_cards or min_delay_cards / max_delay_cards.
   * Attaches fixedAssignedPlayers to the resolver card when the trigger targeted specific players,
   * while allowing fresh player picks for group-round starters or global triggers (e.g. 6247).
   */
  public static scheduleResolverInDeck(
    deck: Card[],
    currentIndex: number,
    triggerCard: Card,
    resolversPool: Card[] | Map<string, Card[]>,
    assignedPlayers?: Player[]
  ): { updatedDeck: Card[]; scheduledResolver: Card | null; scheduledDelay: number } {
    if (
      triggerCard.chain?.role !== 'trigger' ||
      !triggerCard.chain.chain_id ||
      CardEngine.isResolverOrCure(triggerCard)
    ) {
      return { updatedDeck: [...deck], scheduledResolver: null, scheduledDelay: 0 };
    }

    const chainId = triggerCard.chain.chain_id;
    let candidates: Card[] = [];
    if (resolversPool instanceof Map) {
      candidates = resolversPool.get(chainId) ?? [];
    } else if (Array.isArray(resolversPool)) {
      candidates = resolversPool.filter(
        (c) => c.chain?.chain_id === chainId && CardEngine.isResolverOrCure(c)
      );
    }

    if (candidates.length === 0) {
      return { updatedDeck: [...deck], scheduledResolver: null, scheduledDelay: 0 };
    }

    // Pick 1 candidate resolver uniformly at random if multiple exist
    const selected = candidates[Math.floor(Math.random() * candidates.length)];

    const isGroupStarterPrompt =
      triggerCard.chain.chain_type === 'immediate_sequence' &&
      (/(\bempieza\s+\{player1\}|\{player1\},?\s+empiezas)/i.test(triggerCard.text) ||
        !triggerCard.text.includes('{player1}'));

    const shouldFixPlayers = Boolean(
      assignedPlayers && assignedPlayers.length > 0 && !isGroupStarterPrompt
    );

    const scheduledResolver: Card = {
      ...selected,
      chain: selected.chain ? { ...selected.chain, role: 'resolver' } : undefined,
      fixedAssignedPlayers: shouldFixPlayers && assignedPlayers ? [...assignedPlayers] : undefined,
    };

    // Calculate delay D
    let delay: number;
    if (triggerCard.chain.delay_cards !== undefined) {
      delay = triggerCard.chain.delay_cards;
    } else if (triggerCard.chain.min_delay_cards !== undefined) {
      const min = triggerCard.chain.min_delay_cards;
      const max =
        triggerCard.chain.max_delay_cards !== undefined
          ? Math.max(min, triggerCard.chain.max_delay_cards)
          : min;
      delay = Math.floor(Math.random() * (max - min + 1)) + min;
    } else if (triggerCard.chain.chain_type === 'immediate_sequence') {
      delay = 1;
    } else {
      delay = 3;
    }

    // Clamp target insertion position: at least currentIndex + 1, at most deck.length
    const minIndex = currentIndex + 1;
    const desiredIndex = currentIndex + delay;
    const targetIndex = Math.max(minIndex, Math.min(desiredIndex, deck.length));
    const scheduledDelay = targetIndex - currentIndex;

    const updatedDeck = [...deck];
    updatedDeck.splice(targetIndex, 0, scheduledResolver);

    return { updatedDeck, scheduledResolver, scheduledDelay };
  }

  /**
   * Instance alias for scheduleResolverInDeck.
   */
  public scheduleResolverInDeck(
    deck: Card[],
    currentIndex: number,
    triggerCard: Card,
    resolversPool: Card[] | Map<string, Card[]>,
    assignedPlayers?: Player[]
  ): { updatedDeck: Card[]; scheduledResolver: Card | null; scheduledDelay: number } {
    return CardEngine.scheduleResolverInDeck(
      deck,
      currentIndex,
      triggerCard,
      resolversPool,
      assignedPlayers
    );
  }

  /**
   * Reverses state changes from a popped snapshot: restores players' prior sip counts
   * and restores previous active virus states.
   */
  public static restoreSnapshotState(
    snapshot: HistorySnapshot,
    currentPlayers: Player[]
  ): {
    restoredCard: Card;
    restoredText: string;
    restoredPlayers: Player[];
    restoredViruses: ActiveVirus[];
    restoredDeck?: Card[];
  } {
    // Clone players and deduct awarded sips if tracked
    const restoredPlayers = currentPlayers.map((p) => {
      let sipsToDeduct = 0;
      if (snapshot.sipsAwarded instanceof Map) {
        sipsToDeduct = snapshot.sipsAwarded.get(p.id) ?? 0;
      } else if (snapshot.sipsAwarded && typeof snapshot.sipsAwarded === 'object') {
        sipsToDeduct = (snapshot.sipsAwarded as Record<string, number>)[p.id] ?? 0;
      }

      const updatedSips = Math.max(0, (p.sips ?? p.sipCount ?? 0) - sipsToDeduct);
      return {
        ...p,
        sips: updatedSips,
        sipCount: updatedSips,
      };
    });

    return {
      restoredCard: snapshot.card,
      restoredText: snapshot.interpolatedText,
      restoredPlayers,
      restoredViruses: snapshot.previousViruses,
      restoredDeck: snapshot.deck ? [...snapshot.deck] : undefined,
    };
  }
}
