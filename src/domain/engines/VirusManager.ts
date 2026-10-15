/**
 * Previalo Domain Layer: VirusManager
 * Pure domain engine managing the lifecycle of ongoing temporal rules (viruses),
 * round decrements on card transitions, and expiration detection.
 */

import type { Card } from '../types/card';
import type { Player } from '../types/player';
import type { ActiveVirus } from '../types/virus';

export interface VirusTickResult {
  updatedViruses: ActiveVirus[];
  expiredViruses: ActiveVirus[];
}

export class VirusManager {
  private static virusCounter = 0;

  /**
   * Generates a collision-resistant unique ID for an active virus instance.
   */
  private static generateVirusId(): string {
    this.virusCounter++;
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      try {
        return crypto.randomUUID();
      } catch {
        // Fallback if crypto fails in restricted runtime
      }
    }
    return `virus_${Date.now()}_${this.virusCounter}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Determines the duration in rounds for a virus card.
   * Prioritizes card.duration_rounds, then chain.min_delay_cards, falling back to 3 rounds.
   */
  public static calculateDuration(card: Card): number {
    if (card.duration_rounds && card.duration_rounds > 0) {
      return card.duration_rounds;
    }
    if (card.chain?.min_delay_cards && card.chain.min_delay_cards > 0) {
      return card.chain.min_delay_cards;
    }
    return 3;
  }

  /**
   * Checks whether a card qualifies as an active temporal virus.
   */
  public static isVirusCard(card: Card): boolean {
    return card.type === 'virus' || card.chain?.chain_type === 'timed_virus';
  }

  /**
   * Creates and registers a new ActiveVirus instance from a drawn card.
   */
  public static createVirus(card: Card, targetPlayer?: Player): ActiveVirus {
    const duration = this.calculateDuration(card);
    return {
      id: this.generateVirusId(),
      cardId: card.id,
      ruleText: card.text,
      targetPlayerId: targetPlayer?.id,
      targetPlayerName: targetPlayer?.name,
      roundsRemaining: duration,
      totalRounds: duration,
    };
  }

  /**
   * Decrements roundsRemaining by 1 for all active viruses.
   * Separates viruses that reach 0 into expiredViruses and retains unexpired in updatedViruses.
   */
  public static tickRound(viruses: ActiveVirus[]): VirusTickResult {
    const updatedViruses: ActiveVirus[] = [];
    const expiredViruses: ActiveVirus[] = [];

    for (const virus of viruses) {
      const nextRounds = virus.roundsRemaining - 1;
      if (nextRounds <= 0) {
        expiredViruses.push({
          ...virus,
          roundsRemaining: 0,
        });
      } else {
        updatedViruses.push({
          ...virus,
          roundsRemaining: nextRounds,
        });
      }
    }

    return { updatedViruses, expiredViruses };
  }

  /**
   * Instance alias for createVirus.
   */
  public createVirus(card: Card, targetPlayer?: Player): ActiveVirus {
    return VirusManager.createVirus(card, targetPlayer);
  }

  /**
   * Instance alias for tickRound.
   */
  public tickRound(viruses: ActiveVirus[]): VirusTickResult {
    return VirusManager.tickRound(viruses);
  }

  /**
   * Interface contract alias for tick (PROJECT.md compatibility).
   */
  public tick(activeViruses: ActiveVirus[]): VirusTickResult {
    return VirusManager.tickRound(activeViruses);
  }
}
