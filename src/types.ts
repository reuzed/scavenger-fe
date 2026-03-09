/** Shared types for scavenger hunt app */

export type AnswerMatchType = "exact" | "case_insensitive" | "fuzzy" | "contains";

export interface AnswerValidationConfig {
  match_type: AnswerMatchType;
  allowed_answers: string[];
  max_edit_distance: number;
  min_length_hint?: string;
  wrong_answer_messages: Record<string, string>;
  default_wrong_message: string;
}

export interface LocationHint {
  text: string;
  lat?: number;
  lng?: number;
}

export interface Clue {
  id: string;
  name: string;
  room_id: string;
  text: string;
  image_keys: string[];
  dependencies: string[];
  answer_config: AnswerValidationConfig;
  location_hint?: LocationHint;
  is_room_exit: boolean;
  is_info?: boolean; // Info-only node: no answer, only incoming dependencies
}

export interface InfoBlock {
  id: string;
  name: string;
  text: string;
  image_keys: string[];
  visible_from_start: boolean;
  dependencies: string[];
}

export interface Room {
  id: string;
  name: string;
  order: number;
  exit_clue_id?: string;
  clues: string[];
}

export interface Group {
  id: string;
  name: string;
  rooms: Room[];
  clues: Record<string, Clue>;
  info_blocks: InfoBlock[];
  completed_clues: string[];
  current_room_id: string;
}

export interface Hunt {
  id: string;
  prefix: string;
  name: string;
  groups: Group[];
  created_at?: string;
  updated_at?: string;
}
