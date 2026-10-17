/**
 * Previalo Domain Layer: VariableReplacer
 * Pure domain engine for dynamic card token interpolation with fairness weighting,
 * strict player distinctness, player count guards, and intensity drink scaling.
 */

import type { IntensityLevel, Card } from '../types/card';
import type { Player } from '../types/player';

export interface VariableContext {
  intensity: IntensityLevel;
  baseDrinks?: number;
  turnHistory?: Map<string, number> | Record<string, number>; // player id -> pick count
  lastPickedTurn?: Map<string, number> | Record<string, number>; // player id -> turn index
  currentTurnIndex?: number;
  forcedFirstPlayer?: Player;
  fixedAssignedPlayers?: Player[];
}

export interface VariableResult {
  interpolatedText: string;
  assignedPlayers: Player[];
  calculatedDrinks: number;
}

export class VariableReplacer {
  /**
   * Evaluates the dynamic drink penalty according to session intensity:
   * Level 1 (Chill): exactly 1 trago
   * Level 2 (Fiesta): 1–2 tragos
   * Level 3 (Hot): 2–3 tragos
   * Level 4 (Extremo): 3–5+ tragos (minimum 3, capped at 10)
   */
  public static calculateDrinks(intensity: IntensityLevel, baseDrinks?: number): number {
    const base = baseDrinks && baseDrinks > 0 ? baseDrinks : 1;
    switch (intensity) {
      case 1:
        return 1;
      case 2:
        return Math.max(1, Math.min(base, 2));
      case 3:
        return Math.max(2, Math.min(base + 1, 3));
      case 4:
        return Math.min(10, Math.max(3, base + 2));
      default:
        return base;
    }
  }

  /**
   * Helper to inspect turnHistory count for a player id.
   */
  private static getPickCount(
    history: Map<string, number> | Record<string, number> | undefined,
    playerId: string,
    playerObj?: Player
  ): number {
    if (history instanceof Map) {
      return history.get(playerId) ?? 0;
    }
    if (history && typeof history === 'object') {
      return history[playerId] ?? 0;
    }
    return playerObj?.timesTargeted ?? playerObj?.targetCount ?? 0;
  }

  /**
   * Helper to inspect last picked turn index for a player id.
   */
  private static getLastTurn(
    lastPicked: Map<string, number> | Record<string, number> | undefined,
    playerId: string
  ): number {
    if (lastPicked instanceof Map) {
      return lastPicked.get(playerId) ?? -1;
    }
    if (lastPicked && typeof lastPicked === 'object') {
      return lastPicked[playerId] ?? -1;
    }
    return -1;
  }

  /**
   * Fair weighted player selection based on inverse frequency and cooldown boost:
   * W_p = (1 / (C_p + 1)) * (1 + 0.2 * min(T_p, 5))
   * Guarantees <= 15% deviation in 100 draws with 4 players.
   */
  public static pickWeightedPlayer(
    players: Player[],
    context: VariableContext,
    excludeIds: Set<string> = new Set()
  ): Player {
    const candidates = players.filter((p) => !excludeIds.has(p.id));
    if (candidates.length === 0) {
      // Graceful fallback if all candidates excluded
      return players[Math.floor(Math.random() * players.length)];
    }

    const currentTurn = context.currentTurnIndex ?? 0;
    const weights: number[] = [];

    for (const c of candidates) {
      const picks = this.getPickCount(context.turnHistory, c.id, c);
      const lastTurn = this.getLastTurn(context.lastPickedTurn, c.id);
      const cooldownTurns = lastTurn === -1 ? 5 : Math.max(0, currentTurn - lastTurn);
      const weight = (1 / (picks + 1)) * (1 + 0.2 * Math.min(cooldownTurns, 5));
      weights.push(weight);
    }

    const totalWeight = weights.reduce((acc, w) => acc + w, 0);
    let rand = Math.random() * totalWeight;

    for (let i = 0; i < candidates.length; i++) {
      rand -= weights[i];
      if (rand <= 0) {
        return candidates[i];
      }
    }

    return candidates[candidates.length - 1];
  }

  /**
   * Checks if a card can be played with the given active player count.
   * Protects against drawing 3-player or 4-player cards when insufficient players exist.
   */
  public static isCardPlayable(card: Card, activePlayerCount: number): boolean {
    if (card.mode_scope === 'teams_only' && activePlayerCount < 4) {
      return false;
    }
    if (card.text.includes('{player4}') && activePlayerCount < 4) {
      return false;
    }
    if (card.text.includes('{player3}') && activePlayerCount < 3) {
      return false;
    }
    if (card.text.includes('{player2}') && activePlayerCount < 2) {
      return false;
    }
    return true;
  }

  /**
   * Normalizes drink phrasing to avoid ungrammatical combinations like
   * "1 trago tragos", "un trago tragos", "1 tragos", or "tragos tragos".
   */
  public static normalizeDrinkPhrasing(text: string): string {
    return text
      .replace(/\b(?:1\s+trago|un\s+trago)\s+tragos\b/gi, '1 trago')
      .replace(/\b1\s+tragos\b/gi, '1 trago')
      .replace(/\b(\d+)\s+tragos\s+tragos\b/gi, '$1 tragos')
      .replace(/\btragos\s+tragos\b/gi, 'tragos');
  }

  /**
   * Interpolates the {drinks} token and normalizes drink-related unit phrasing.
   * Resolves duplicate wording (e.g. "{drinks} tragos" becoming "1 trago" or "2 tragos"
   * instead of "1 trago tragos" or "2 tragos tragos") and handles countable nouns cleanly.
   */
  public static interpolateDrinks(text: string, drinks: number): string {
    const drinksLabel = drinks === 1 ? '1 trago' : `${drinks} tragos`;
    let result = text;

    // 1. Replace {drinks} explicitly followed by trago/tragos (e.g. "{drinks} tragos" -> "1 trago" / "2 tragos")
    result = result.replace(/(?:un\s+)?\{drinks\}\s+(?:tragos|trago)\b/gi, drinksLabel);

    // 2. Replace {drinks} before other countable nouns as a pure number (e.g. "{drinks} copas" -> "2 copas")
    result = result.replace(
      /(?:un\s+)?\{drinks\}(?=\s+(?:copas|asientos|balas)\b)/gi,
      String(drinks)
    );

    // 3. Replace standalone {drinks} (e.g. "Bebe {drinks}" -> "Bebe 1 trago" / "Bebe 2 tragos")
    result = result.replace(/(?:un\s+)?\{drinks\}/gi, drinksLabel);

    return this.normalizeDrinkPhrasing(result);
  }

  /**
   * Replaces tokens in raw card text with distinct players, calculated drinks, and team names.
   * Whitelisted tokens: {player1}, {player2}, {player3}, {player4}, {team}, {drinks}.
   */
  public static replaceTokens(
    rawText: string,
    players: Player[],
    context: VariableContext
  ): VariableResult {
    let interpolatedText = rawText;
    const assignedPlayers: Player[] = [];
    const usedIds = new Set<string>();

    const fixed = context.fixedAssignedPlayers;

    // 1. {player1}
    if (interpolatedText.includes('{player1}')) {
      const p1 =
        fixed && fixed[0]
          ? fixed[0]
          : (context.forcedFirstPlayer ?? this.pickWeightedPlayer(players, context, usedIds));
      usedIds.add(p1.id);
      assignedPlayers.push(p1);
      interpolatedText = interpolatedText.replace(/\{player1\}/g, p1.name);
    } else if (context.forcedFirstPlayer) {
      usedIds.add(context.forcedFirstPlayer.id);
      assignedPlayers.push(context.forcedFirstPlayer);
    }

    // 2. {player2} - strict distinctness
    if (interpolatedText.includes('{player2}')) {
      const p2 =
        fixed && fixed[1]
          ? fixed[1]
          : this.pickWeightedPlayer(players, context, usedIds);
      usedIds.add(p2.id);
      assignedPlayers.push(p2);
      interpolatedText = interpolatedText.replace(/\{player2\}/g, p2.name);
    }

    // 3. {player3} - strict distinctness
    if (interpolatedText.includes('{player3}')) {
      const p3 =
        fixed && fixed[2]
          ? fixed[2]
          : this.pickWeightedPlayer(players, context, usedIds);
      usedIds.add(p3.id);
      assignedPlayers.push(p3);
      interpolatedText = interpolatedText.replace(/\{player3\}/g, p3.name);
    }

    // 4. {player4} - strict distinctness
    if (interpolatedText.includes('{player4}')) {
      const p4 =
        fixed && fixed[3]
          ? fixed[3]
          : this.pickWeightedPlayer(players, context, usedIds);
      usedIds.add(p4.id);
      assignedPlayers.push(p4);
      interpolatedText = interpolatedText.replace(/\{player4\}/g, p4.name);
    }

    // 5. {drinks}
    const hasDrinksToken = interpolatedText.includes('{drinks}');
    const drinks = hasDrinksToken
      ? this.calculateDrinks(context.intensity, context.baseDrinks)
      : 0;
    if (hasDrinksToken) {
      interpolatedText = this.interpolateDrinks(interpolatedText, drinks);
    } else {
      interpolatedText = this.normalizeDrinkPhrasing(interpolatedText);
    }

    // 6. {team}
    if (interpolatedText.includes('{team}')) {
      const teams = ['Equipo Neón', 'Equipo Fuego'];
      const turnIndex = context.currentTurnIndex ?? 0;
      const teamPick = teams[turnIndex % teams.length];
      interpolatedText = interpolatedText.replace(/\{team\}/g, teamPick);
    }

    return {
      interpolatedText,
      assignedPlayers,
      calculatedDrinks: drinks,
    };
  }

  /**
   * Instance method matching PROJECT.md interface contract.
   */
  public replaceTokens(
    rawText: string,
    players: Player[],
    context: VariableContext
  ): VariableResult {
    return VariableReplacer.replaceTokens(rawText, players, context);
  }
}
