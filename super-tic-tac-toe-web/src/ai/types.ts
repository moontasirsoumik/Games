import type { GameState, Move, Player } from '@/game/types';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface AiContext {
  state: GameState;
  aiPlayer: Player;
  difficulty: Difficulty;
}

export type MovePicker = (ctx: AiContext) => Move | Promise<Move>;