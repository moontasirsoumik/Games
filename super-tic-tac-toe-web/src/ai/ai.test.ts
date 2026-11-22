import { describe, it, expect } from 'vitest';
import { applyMove, createInitialState, isMoveLegal, listLegalMoves } from '@/game/rules';
import type { Player } from '@/game/types';
import { pickEasy } from './easy';
import { pickMedium } from './medium';
import { pickMCTS } from './mcts';

function playGame(
  pick0: (s: ReturnType<typeof createInitialState>) => ReturnType<typeof listLegalMoves>[0],
  pick1: (s: ReturnType<typeof createInitialState>) => ReturnType<typeof listLegalMoves>[0],
  mode: 'standard' | 'free' = 'standard',
  maxMoves = 120,
) {
  let s = createInitialState(mode);
  let moves = 0;
  while (s.outcome === 'ongoing' && moves < maxMoves) {
    const p = s.currentPlayer;
    const legal = listLegalMoves(s);
    if (!legal.length) break;
    const move = p === 0 ? pick0(s) : pick1(s);
    expect(isMoveLegal(s, move, p)).toBe(true);
    s = applyMove(s, move);
    moves++;
  }
  return s;
}

describe('AI legal moves', () => {
  const difficulties = [
    (s: ReturnType<typeof createInitialState>, ai: Player) =>
      pickEasy({ state: s, aiPlayer: ai, difficulty: 'easy' }),
    (s: ReturnType<typeof createInitialState>, ai: Player) =>
      pickMedium({ state: s, aiPlayer: ai, difficulty: 'medium' }),
    (s: ReturnType<typeof createInitialState>, ai: Player) => pickMCTS(s, ai, 80, 30),
  ];

  it.each(['standard', 'free'] as const)('always picks legal in %s', (mode) => {
    for (let i = 0; i < 25; i++) {
      let s = createInitialState(mode);
      for (let t = 0; t < 15 && s.outcome === 'ongoing'; t++) {
        const ai = s.currentPlayer;
        const pick = difficulties[t % 3];
        const m = pick(s, ai);
        expect(isMoveLegal(s, m, ai)).toBe(true);
        s = applyMove(s, m);
      }
    }
  });
});

describe('Hard vs Easy', () => {
  it('Hard wins most games vs Easy in simulation', () => {
    let hardWins = 0;
    const games = 12;
    for (let g = 0; g < games; g++) {
      const hardIsX = g % 2 === 0;
      const s = playGame(
        (st) =>
          hardIsX
            ? pickMCTS(st, 0, 120, 25)
            : pickEasy({ state: st, aiPlayer: 0, difficulty: 'easy' }),
        (st) =>
          hardIsX
            ? pickEasy({ state: st, aiPlayer: 1, difficulty: 'easy' })
            : pickMCTS(st, 1, 120, 25),
        'standard',
        100,
      );
      const hardPlayer = hardIsX ? 0 : 1;
      const won =
        (hardPlayer === 0 && s.outcome === 'x') || (hardPlayer === 1 && s.outcome === 'o');
      if (won) hardWins++;
    }
    expect(hardWins).toBeGreaterThanOrEqual(7);
  });
});