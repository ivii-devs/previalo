/**
 * Previalo Domain Layer: CardEngine
 * Pure domain engine responsible for shuffling, mode deck construction,
 * category interleaving constraints, and undo/history stack management.
 */

import type { Card, IntensityLevel } from '../types/card';
import type { HistorySnapshot } from '../types/session';
import type { Player } from '../types/player';
import type { ActiveVirus } from '../types/virus';

export interface CardFilterOptions {
  intensity?: IntensityLevel;
  packIds?: string[];
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

  /**
   * Builds a playable deck from a single category with optional pack and intensity filtering.
   */
  public buildCategoryDeck(cards: Card[], filter?: CardFilterOptions): Card[] {
    let filtered = [...cards];

    if (filter?.intensity !== undefined) {
      filtered = filtered.filter((c) => c.intensity === filter.intensity);
    }

    if (filter?.packIds && filter.packIds.length > 0) {
      const allowedPacks = new Set(filter.packIds);
      filtered = filtered.filter((c) => c.pack_id && allowedPacks.has(c.pack_id));
    }

    return CardEngine.shuffle(filtered);
  }

  /**
   * Builds a playable deck from a curated preset (e.g. modo_caliente, modo_parejas).
   */
  public buildPresetDeck(cards: Card[], filter?: { intensity?: IntensityLevel }): Card[] {
    let filtered = [...cards];

    if (filter?.intensity !== undefined) {
      filtered = filtered.filter((c) => c.intensity === filter.intensity);
    }

    return CardEngine.shuffle(filtered);
  }

  /**
   * Builds a chaos mix deck from multiple categories with strict interleaving:
   * guarantees no more than 3 consecutive cards belong to the same category.
   * Excludes 'guerra_equipos' and any card flagged with exclude_from_chaos: true.
   */
  public buildChaosDeck(
    categoriesCards: Record<string, Card[]>,
    filter?: { intensity?: IntensityLevel }
  ): Card[] {
    const pools: Record<string, Card[]> = {};

    for (const [catId, cards] of Object.entries(categoriesCards)) {
      if (catId === 'guerra_equipos') continue;
      let filtered = cards.filter((c) => !c.exclude_from_chaos);
      if (filter?.intensity !== undefined) {
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
    };
  }
}
