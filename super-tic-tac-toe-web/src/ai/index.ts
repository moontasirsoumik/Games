import { listLegalMoves } from '@/game/rules';
import type { Move } from '@/game/types';
import { pickEasy } from './easy';
import { pickHardAsync } from './hardClient';
import { pickMedium } from './medium';
import type { AiContext, Difficulty } from './types';

export type { AiContext, Difficulty };

export async function pickAiMove(ctx: AiContext): Promise<Move> {
  const legal = listLegalMoves(ctx.state);
  if (!legal.length) throw new Error('no legal moves');
  if (ctx.state.currentPlayer !== ctx.aiPlayer) throw new Error('not ai turn');
  switch (ctx.difficulty) {
    case 'easy':
      return pickEasy(ctx);
    case 'medium':
      return pickMedium(ctx);
    case 'hard':
      return pickHardAsync(ctx.state, ctx.aiPlayer);
    default:
      return pickEasy(ctx);
  }
}

/** Sync hard pick for unit tests (no worker) */
export { pickMCTS } from './mcts';