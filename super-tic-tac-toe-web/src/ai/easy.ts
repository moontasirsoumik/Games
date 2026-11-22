import { listLegalMoves } from '@/game/rules';
import type { AiContext } from './types';

export function pickEasy(ctx: AiContext) {
  const moves = listLegalMoves(ctx.state);
  if (!moves.length) throw new Error('no legal moves');
  return moves[Math.floor(Math.random() * moves.length)];
}