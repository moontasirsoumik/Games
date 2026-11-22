import { applyMove, listLegalMoves } from '@/game/rules';
import type { GameState, Move, Player } from '@/game/types';

function outcomeScore(state: GameState, forPlayer: Player): number {
  if (state.outcome === 'ongoing') return 0;
  if (state.outcome === 'draw') return 0.5;
  if (state.outcome === 'x') return forPlayer === 0 ? 1 : 0;
  return forPlayer === 1 ? 1 : 0;
}

function moveKey(m: Move): string {
  return `${m.board}:${m.row}:${m.col}`;
}

export function pickMCTS(
  state: GameState,
  player: Player,
  budgetMs = 750,
  maxRolloutDepth = 50,
): Move {
  const moves = listLegalMoves(state);
  if (!moves.length) throw new Error('no legal moves');
  if (moves.length === 1) return moves[0];

  const totals = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const m of moves) {
    totals.set(moveKey(m), 0);
    counts.set(moveKey(m), 0);
  }

  const deadline = performance.now() + budgetMs;
  while (performance.now() < deadline) {
    for (const first of moves) {
      if (performance.now() >= deadline) break;
      let s = applyMove(state, first);
      let depth = 0;
      while (s.outcome === 'ongoing' && depth < maxRolloutDepth) {
        const legal = listLegalMoves(s);
        if (!legal.length) break;
        const pick = legal[Math.floor(Math.random() * legal.length)];
        s = applyMove(s, pick);
        depth++;
      }
      const key = moveKey(first);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      totals.set(key, (totals.get(key) ?? 0) + outcomeScore(s, player));
    }
  }

  let best = moves[0];
  let bestAvg = -1;
  for (const m of moves) {
    const key = moveKey(m);
    const c = counts.get(key) ?? 0;
    if (c === 0) continue;
    const avg = (totals.get(key) ?? 0) / c;
    if (avg > bestAvg) {
      bestAvg = avg;
      best = m;
    }
  }
  return best;
}