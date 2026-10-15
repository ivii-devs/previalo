/**
 * Previalo Domain Types: Board
 * Strictly isolated domain definition for La Guatoca boards and tiles.
 */

export type BoardId = 'guatoca_clasica' | 'guatoca_hot';

export type TileType =
  | 'start'
  | 'finish'
  | 'jump'
  | 'trap_jail'
  | 'trap_back'
  | 'trap_skull'
  | 'drink'
  | 'give_drink'
  | 'challenge'
  | 'truth'
  | 'versus'
  | 'group_event'
  | 'yo_nunca';

export interface BoardTile {
  id: number;
  board_id: BoardId;
  tile_number: number;
  tile_type: TileType;
  title: string;
  description: string;
  drinks_action: number;
  target: string;
  action_jump_to: number | null;
  turns_lost: number;
  icon: string;
}

export type TileActionType = TileType | 'none';

export interface TileActionResult {
  actionType: TileActionType;
  destination: number;
  extraRoll: boolean;
  turnsLost: number;
  drinks: number;
  modalPrompt?: string;
}
