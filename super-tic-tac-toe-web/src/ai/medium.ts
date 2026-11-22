import {
  applyMove,
  cellToTargetBoardIndex,
  getSmallBoardWinner,
  isBoardFinished,
  listLegalMoves,
  smallBoardIndexToMeta,
} from '@/game/rules';
import type { GameState, Move, Player } from '@/game/types';
import type { AiContext } from './types';

function outcomeForPlayer(state: GameState, player: Player): boolean {
  if (player === 0) return state.outcome === 'x';
  return state.outcome === 'o';
}

function opponentWinsSmallNext(state: GameState, boardIndex: number, opp: Player): boolean {
  if (isBoardFinished(state.meta, boardIndex)) return false;
  const moves = listLegalMoves({
    ...state,
    currentPlayer: opp,
    activeBoard:
      state.mode === 'standard' && state.activeBoard === boardIndex ? boardIndex : state.activeBoard,
  }).filter((m) => m.board === boardIndex);
  for (const m of moves) {
    const board = state.boards[boardIndex].map((row) => [...row]);
    board[m.row][m.col] = opp;
    if (getSmallBoardWinner(board) === opp) return true;
  }
  return false;
}

function scoreMove(state: GameState, move: Move, player: Player): number {
  const next = applyMove(state, move);
  let score = 0;
  if (outcomeForPlayer(next, player)) score += 50_000;
  const [mr, mc] = smallBoardIndexToMeta(move.board);
  if (state.meta[mr][mc] === -1 && next.meta[mr][mc] === player) score += 800;
  if (next.meta[mr][mc] === 2) score -= 120;
  const sentTo = cellToTargetBoardIndex(move.row, move.col);
  const opp = (1 - player) as Player;
  if (!isBoardFinished(next.meta, sentTo) && opponentWinsSmallNext(next, sentTo, opp)) {
    score -= 600;
  }
  if (move.row === 1 && move.col === 1) score += 40;
  if (sentTo === 4) score += 15;
  score += Math.random() * 8;
  return score;
}

export function pickMedium(ctx: AiContext): Move {
  const moves = listLegalMoves(ctx.state);
  if (!moves.length) throw new Error('no legal moves');
  let best = moves[0];
  let bestScore = -Infinity;
  for (const m of moves) {
    const s = scoreMove(ctx.state, m, ctx.aiPlayer);
    if (s > bestScore) {
      bestScore = s;
      best = m;
    }
  }
  return best;
}