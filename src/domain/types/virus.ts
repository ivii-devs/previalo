import type { Player } from './player';

/**
 * Previalo Domain Types: ActiveVirus
 * Represents a temporal ongoing rule active across subsequent game rounds.
 */

export interface ActiveVirus {
  id: string;
  cardId: string | number;
  chainId?: string;
  ruleText: string;
  targetPlayerId?: string;
  targetPlayerName?: string;
  roundsRemaining: number;
  totalRounds: number;
  assignedPlayers?: Player[];
  hasResolverCard?: boolean;
}
