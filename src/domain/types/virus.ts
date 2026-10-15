/**
 * Previalo Domain Types: ActiveVirus
 * Represents a temporal ongoing rule active across subsequent game rounds.
 */

export interface ActiveVirus {
  id: string;
  cardId: string | number;
  ruleText: string;
  targetPlayerId?: string;
  targetPlayerName?: string;
  roundsRemaining: number;
  totalRounds: number;
}
