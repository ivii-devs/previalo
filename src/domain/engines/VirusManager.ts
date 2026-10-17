/**
 * Previalo Domain Layer: VirusManager
 * Pure domain engine managing the lifecycle of ongoing temporal rules (viruses),
 * round decrements on card transitions, and expiration detection.
 */

import type { Card } from '../types/card';
import type { Player } from '../types/player';
import type { ActiveVirus } from '../types/virus';
import { CardEngine } from './CardEngine';

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
   * Resolvers (cure cards) never qualify as new virus triggers.
   */
  public static isVirusCard(card: Card): boolean {
    if (card.chain?.role === 'resolver' || CardEngine.isResolverOrCure(card)) {
      return false;
    }
    return card.type === 'virus' || card.chain?.chain_type === 'timed_virus';
  }

  /**
   * Creates and registers a new ActiveVirus instance from a drawn card.
   */
  public static createVirus(
    card: Card,
    targetPlayer?: Player,
    assignedPlayers?: Player[],
    hasResolverCard?: boolean,
    interpolatedRuleText?: string,
    scheduledDelay?: number
  ): ActiveVirus {
    const duration =
      scheduledDelay !== undefined && scheduledDelay > 0
        ? scheduledDelay
        : this.calculateDuration(card);
    const hasResolver =
      hasResolverCard !== undefined
        ? hasResolverCard
        : Boolean(card.chain?.role === 'trigger' && card.chain.chain_id);

    return {
      id: this.generateVirusId(),
      cardId: card.id,
      chainId: card.chain?.chain_id,
      ruleText: interpolatedRuleText || card.text,
      targetPlayerId: targetPlayer?.id ?? assignedPlayers?.[0]?.id,
      targetPlayerName: targetPlayer?.name ?? assignedPlayers?.[0]?.name,
      roundsRemaining: duration,
      totalRounds: duration,
      assignedPlayers: assignedPlayers ? [...assignedPlayers] : undefined,
      hasResolverCard: hasResolver,
    };
  }

  /**
   * Synchronizes roundsRemaining of active resolver-backed viruses with the actual
   * index distance (resolverIndex - currentIndex) of their cure card in the deck.
   */
  public static syncResolverDistances(
    viruses: ActiveVirus[],
    deck: readonly Card[] | Card[],
    currentIndex: number
  ): ActiveVirus[] {
    if (viruses.length === 0 || deck.length === 0) {
      return viruses;
    }

    return viruses.map((virus) => {
      if (!virus.hasResolverCard || !virus.chainId) {
        return virus;
      }
      for (let idx = currentIndex + 1; idx < deck.length; idx++) {
        const card = deck[idx];
        if (card.chain?.role === 'resolver' && card.chain.chain_id === virus.chainId) {
          const exactDistance = idx - currentIndex;
          return {
            ...virus,
            roundsRemaining: exactDistance,
            totalRounds: Math.max(virus.totalRounds, exactDistance),
          };
        }
      }
      return virus;
    });
  }

  /**
   * Decrements roundsRemaining by 1 for all active viruses.
   * Viruses with hasResolverCard: true decrement roundsRemaining for HUD visibility,
   * but never enter expiredViruses; they remain until resolved by drawing their cure card.
   * Viruses with hasResolverCard: false (standalone timed viruses) expire into expiredViruses at 0.
   */
  public static tickRound(viruses: ActiveVirus[]): VirusTickResult {
    const updatedViruses: ActiveVirus[] = [];
    const expiredViruses: ActiveVirus[] = [];

    for (const virus of viruses) {
      if (virus.hasResolverCard) {
        const nextRounds = Math.max(0, virus.roundsRemaining - 1);
        updatedViruses.push({
          ...virus,
          roundsRemaining: nextRounds,
        });
      } else {
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
    }

    return { updatedViruses, expiredViruses };
  }

  /**
   * Pure domain helper to resolve and remove active viruses matching a chainId upon drawing a cure card.
   */
  public static resolveVirus(viruses: ActiveVirus[], chainId: string): ActiveVirus[] {
    return viruses.filter((v) => v.chainId !== chainId);
  }

  /**
   * Instance alias for createVirus.
   */
  public createVirus(
    card: Card,
    targetPlayer?: Player,
    assignedPlayers?: Player[],
    hasResolverCard?: boolean,
    interpolatedRuleText?: string,
    scheduledDelay?: number
  ): ActiveVirus {
    return VirusManager.createVirus(
      card,
      targetPlayer,
      assignedPlayers,
      hasResolverCard,
      interpolatedRuleText,
      scheduledDelay
    );
  }

  /**
   * Instance alias for resolveVirus.
   */
  public resolveVirus(viruses: ActiveVirus[], chainId: string): ActiveVirus[] {
    return VirusManager.resolveVirus(viruses, chainId);
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
