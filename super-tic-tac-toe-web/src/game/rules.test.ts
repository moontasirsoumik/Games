import { describe, it, expect } from 'vitest';
import {
  applyMove,
  createInitialState,
  getSmallBoardWinner,
  getMetaWinner,
  isMoveLegal,
  listLegalMoves,
  validateRemoteMove,
} from './rules';
import type { Cell, MetaCell } from './types';

describe('getSmallBoardWinner', () => {
  it('detects row win for X', () => {
    const board: Cell[][] = [
      [0, 0, 0],
      [-1, 1, -1],
      [-1, -1, 1],
    ];
    expect(getSmallBoardWinner(board)).toBe(0);
  });

  it('detects draw when full', () => {
    const board: Cell[][] = [
      [0, 1, 0],
      [1, 0, 1],
      [1, 0, 1],
    ];
    expect(getSmallBoardWinner(board)).toBe(2);
  });
});

describe('standard rules', () => {
  it('first move can be anywhere', () => {
    const s = createInitialState('standard');
    expect(isMoveLegal(s, { board: 4, row: 1, col: 1 })).toBe(true);
    expect(listLegalMoves(s).length).toBe(81);
  });

  it('send rule: opponent must play on board matching cell position', () => {
    let s = createInitialState('standard');
    s = applyMove(s, { board: 0, row: 2, col: 1 });
    expect(s.activeBoard).toBe(7); // bottom-middle small board
    expect(isMoveLegal(s, { board: 0, row: 0, col: 0 })).toBe(false);
    expect(isMoveLegal(s, { board: 7, row: 0, col: 0 })).toBe(true);
  });

  it('cannot play on finished small board', () => {
    const s = createInitialState('standard');
    s.boards[0] = [
      [0, 0, 0],
      [1, 1, -1],
      [-1, -1, -1],
    ];
    s.meta[0][0] = 0;
    s.activeBoard = null;
    s.currentPlayer = 1;
    expect(isMoveLegal(s, { board: 0, row: 2, col: 2 })).toBe(false);
    expect(isMoveLegal(s, { board: 5, row: 1, col: 1 })).toBe(true);
  });

  it('sending to finished board frees target (play anywhere)', () => {
    const s = createInitialState('standard');
    s.boards[2] = [
      [0, 0, 0],
      [-1, 1, -1],
      [-1, -1, 1],
    ];
    s.meta[0][2] = 0;
    s.activeBoard = 2;
    s.currentPlayer = 1;
    expect(isMoveLegal(s, { board: 2, row: 1, col: 0 })).toBe(false);
    expect(isMoveLegal(s, { board: 8, row: 0, col: 0 })).toBe(true);
  });

  it('rejects wrong turn', () => {
    const s = createInitialState('standard');
    const r = validateRemoteMove(s, { board: 0, row: 0, col: 0 }, 1);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('wrong_turn');
  });

  it('meta win ends game', () => {
    const meta: MetaCell[][] = [
      [0, 0, 0],
      [-1, -1, -1],
      [-1, -1, -1],
    ];
    expect(getMetaWinner(meta)).toBe('x');
  });
});

describe('free play', () => {
  it('allows any empty cell on any board', () => {
    let s = createInitialState('free');
    s = applyMove(s, { board: 3, row: 1, col: 1 });
    expect(s.activeBoard).toBe(null);
    expect(isMoveLegal(s, { board: 3, row: 0, col: 0 })).toBe(true);
    expect(isMoveLegal(s, { board: 8, row: 2, col: 2 })).toBe(true);
  });
});