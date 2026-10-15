/**
 * Previalo Domain Types: Player
 * Represents an active participant in Pass-and-Play sessions.
 */

export interface Player {
  id: string;
  name: string;
  color?: string;
  avatar?: string;
  sips?: number;
  sipCount?: number;
  timesTargeted?: number;
  targetCount?: number;
  jailTurns?: number;
  boardPosition?: number;
}
