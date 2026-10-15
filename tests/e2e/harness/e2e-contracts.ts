/**
 * Opaque-box E2E Domain Contracts & Schemas
 * Derived from PROJECT.md Interface Contracts and data/03_production Schemas
 */

export type IntensityLevel = 1 | 2 | 3 | 4;

export type ThemeId = 'cyber-neon' | 'electric-purple' | 'acid-lime' | 'sunset-hot' | 'day-mode';

export interface VirusChain {
  chain_id: string;
  chain_type: 'timed_virus' | 'immediate_sequence';
  role: 'trigger' | 'resolver';
  virus_scope?: 'individual' | 'global';
  min_delay_cards?: number;
  max_delay_cards?: number;
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
  target?: string;
  language?: string;
  tags?: string[];
  chain?: VirusChain;
  board_modes?: string[];
  sub_type?: string;
  tier?: number;
  action_type?: string;
  mode_scope?: string;
  exclude_from_chaos?: boolean;
}

export interface Player {
  id: string;
  name: string;
  color?: string;
  sipCount: number;
  targetCount: number;
  jailTurns?: number;
  boardPosition?: number;
}

export interface ActiveVirus {
  id: string;
  cardId: string | number;
  ruleText: string;
  targetPlayerId?: string;
  targetPlayerName?: string;
  roundsRemaining: number;
  totalRounds: number;
}

export interface BoardTile {
  id: number;
  board_id: 'guatoca_clasica' | 'guatoca_hot';
  tile_number: number;
  tile_type: 'start' | 'finish' | 'jump' | 'trap_jail' | 'trap_back' | 'trap_skull' | 'drink' | 'give_drink' | 'challenge' | 'truth' | 'versus' | 'group_event' | 'yo_nunca';
  title: string;
  description: string;
  drinks_action: number;
  target: string;
  action_jump_to: number | null;
  turns_lost: number;
  icon: string;
}

export interface CatalogCategoryMeta {
  category_id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  card_count: number;
  file: string;
  sha256: string;
  packs: Array<{
    pack_id: string;
    name: string;
    card_count: number;
  }>;
}

export interface CatalogPresetMeta {
  preset_id: string;
  name: string;
  description: string;
  icon: string;
  card_count: number;
  file: string;
  sha256: string;
}

export interface CatalogManifest {
  manifest_version: string;
  app_name: string;
  generated_at: string;
  license: string;
  global_stats: {
    total_categories: number;
    total_cards: number;
    total_unique_card_ids: number;
    total_presets: number;
    card_counts_by_intensity: Record<string, number>;
    token_system: string[];
    sources_integrated: string[];
  };
  categories: CatalogCategoryMeta[];
  presets: CatalogPresetMeta[];
}

export interface CardTransitionResult {
  card: Card;
  rawText: string;
  interpolatedText: string;
  assignedPlayers: Player[];
  calculatedDrinks: number;
  activeViruses: ActiveVirus[];
  expiredViruses: ActiveVirus[];
}

export interface BoardMoveResult {
  player: Player;
  roll: number;
  startPosition: number;
  calculatedDestination: number;
  finalPosition: number;
  actionType: string;
  turnsLost: number;
  drinks: number;
  extraRoll: boolean;
  isVictory: boolean;
}
