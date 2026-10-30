/**
 * Previalo Domain Types: Card
 * Strictly isolated domain definition for playing cards and event chains.
 */

import type { Player } from './player';

export type IntensityLevel = 1 | 2 | 3 | 4;

export type CardTarget =
  | 'all'
  | 'active_player'
  | 'pair'
  | 'majority'
  | 'team'
  | 'distributed'
  | 'board'
  | string;

export interface VirusChain {
  chain_id: string;
  chain_type: 'timed_virus' | 'immediate_sequence' | 'champion_battle';
  role: 'trigger' | 'resolver' | 'step';
  step?: number;
  total_steps?: number;
  virus_scope?: 'individual' | 'global';
  min_delay_cards?: number;
  max_delay_cards?: number;
  delay_cards?: number;
  resolver_ids?: string[];
  trigger_id?: string;
}

export interface Card {
  id: string | number;
  game_id?: string;
  category_id?: string;
  pack_id?: string;
  type: string;
  text: string;
  intensity: IntensityLevel;
  drinks_penalty?: number;
  target?: CardTarget;
  language?: string;
  source?: string;
  origin_type?: string;
  tags?: string[];
  chain?: VirusChain;
  board_modes?: string[];
  sub_type?: string;
  tier?: number;
  hot_tier?: number;
  action_type?: string;
  mode_scope?: string;
  exclude_from_chaos?: boolean;
  duration_rounds?: number;
  option_a?: string | null;
  option_b?: string | null;
  fixedAssignedPlayers?: Player[];
}

export interface VariableContext {
  intensity?: IntensityLevel;
  baseDrinks?: number;
  turnHistory?: Map<string, number> | Record<string, number>;
  lastPickedTurn?: Map<string, number> | Record<string, number>;
  currentTurnIndex?: number;
  forcedFirstPlayer?: Player;
  fixedAssignedPlayers?: Player[];
  isVirus?: boolean;
}

