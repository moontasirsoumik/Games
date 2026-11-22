import type {
  Cell,
  GameMode,
  GameOutcome,
  GameState,
  MetaCell,
  Move,
  Player,
} from './types';
import { EMPTY_CELL, EMPTY_META } from './types';

function emptyBoard(): Cell[][] {
  return [
    [-1, -1, -1],
    [-1, -1, -1],
    [-1, -1, -1],
  ];
}

function emptyMeta(): MetaCell[][] {
  return [
    [-1, -1, -1],
    [-1, -1, -1],
    [-1, -1, -1],
  ];
}

export function createInitialState(mode: GameMode, startingPlayer: Player = 0): GameState {
  const boards: Cell[][][] = [];
  for (let i = 0; i < 9; i++) boards.push(emptyBoard());
  return {
    meta: emptyMeta(),
    boards,
    currentPlayer: startingPlayer,
    activeBoard: null,
    mode,
    outcome: 'ongoing',
    moveNumber: 0,
  };
}

export function checkLine<T>(cells: T[], winner: T): boolean {
  return cells.length === 3 && cells.every((c) => c === winner);
}

export function getSmallBoardWinner(board: Cell[][]): MetaCell {
  for (let r = 0; r < 3; r++) {
    if (checkLine(board[r], 0 as Cell)) return 0;
    if (checkLine(board[r], 1 as Cell)) return 1;
  }
  for (let c = 0; c < 3; c++) {
    const col = [board[0][c], board[1][c], board[2][c]];
    if (checkLine(col, 0 as Cell)) return 0;
    if (checkLine(col, 1 as Cell)) return 1;
  }
  const d1 = [board[0][0], board[1][1], board[2][2]];
  const d2 = [board[0][2], board[1][1], board[2][0]];
  if (checkLine(d1, 0 as Cell)) return 0;
  if (checkLine(d1, 1 as Cell)) return 1;
  if (checkLine(d2, 0 as Cell)) return 0;
  if (checkLine(d2, 1 as Cell)) return 1;

  const full = board.every((row) => row.every((cell) => cell !== EMPTY_CELL));
  if (full) return 2;
  return EMPTY_META;
}

export function getMetaWinner(meta: MetaCell[][]): GameOutcome {
  for (let r = 0; r < 3; r++) {
    if (checkLine(meta[r], 0 as MetaCell)) return 'x';
    if (checkLine(meta[r], 1 as MetaCell)) return 'o';
  }
  for (let c = 0; c < 3; c++) {
    const col = [meta[0][c], meta[1][c], meta[2][c]];
    if (checkLine(col, 0 as MetaCell)) return 'x';
    if (checkLine(col, 1 as MetaCell)) return 'o';
  }
  const d1 = [meta[0][0], meta[1][1], meta[2][2]];
  const d2 = [meta[0][2], meta[1][1], meta[2][0]];
  if (checkLine(d1, 0 as MetaCell)) return 'x';
  if (checkLine(d1, 1 as MetaCell)) return 'o';
  if (checkLine(d2, 0 as MetaCell)) return 'x';
  if (checkLine(d2, 1 as MetaCell)) return 'o';

  const decided = meta.every((row) => row.every((m) => m !== EMPTY_META));
  if (decided) return 'draw';
  return 'ongoing';
}

/** Map small-board index (0–8) to coordinates on the meta grid */
export function smallBoardIndexToMeta(boardIndex: number): [number, number] {
  return [Math.floor(boardIndex / 3), boardIndex % 3];
}

export function metaToBoardIndex(metaRow: number, metaCol: number): number {
  return metaRow * 3 + metaCol;
}

export function cellToTargetBoardIndex(row: number, col: number): number {
  return row * 3 + col;
}

export function isBoardFinished(meta: MetaCell[][], boardIndex: number): boolean {
  const [mr, mc] = smallBoardIndexToMeta(boardIndex);
  return meta[mr][mc] !== EMPTY_META;
}

export function isMoveLegal(state: GameState, move: Move, forPlayer?: Player): boolean {
  if (state.outcome !== 'ongoing') return false;
  if (forPlayer !== undefined && forPlayer !== state.currentPlayer) return false;

  const { board, row, col } = move;
  if (board < 0 || board > 8 || row < 0 || row > 2 || col < 0 || col > 2) return false;

  if (state.mode === 'standard') {
    if (isBoardFinished(state.meta, board)) return false;
  const requiredBoard =
    state.activeBoard !== null && !isBoardFinished(state.meta, state.activeBoard)
      ? state.activeBoard
      : null;
    if (requiredBoard !== null && requiredBoard !== board) return false;
  } else {
    // free play: old behavior — any cell on any board, even finished boards
    const cell = state.boards[board][row][col];
    return cell === EMPTY_CELL;
  }

  const cell = state.boards[board][row][col];
  if (cell !== EMPTY_CELL) return false;
  return true;
}

export function listLegalMoves(state: GameState): Move[] {
  if (state.outcome !== 'ongoing') return [];
  const moves: Move[] = [];
  const requiredBoard =
    state.mode === 'standard' &&
    state.activeBoard !== null &&
    !isBoardFinished(state.meta, state.activeBoard)
      ? state.activeBoard
      : null;
  const boardsToScan =
    requiredBoard !== null
      ? [requiredBoard]
      : [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((b) =>
          state.mode === 'standard' ? !isBoardFinished(state.meta, b) : true,
        );

  for (const board of boardsToScan) {
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const m = { board, row, col };
        if (isMoveLegal(state, m)) moves.push(m);
      }
    }
  }
  return moves;
}

function nextActiveBoard(
  state: GameState,
  sentTo: number,
): number | null {
  if (state.mode === 'free') return null;
  if (isBoardFinished(state.meta, sentTo)) return null;
  return sentTo;
}

export function applyMove(state: GameState, move: Move): GameState {
  if (!isMoveLegal(state, move)) {
    throw new Error('Illegal move');
  }
  const player = state.currentPlayer;
  const boards = state.boards.map((b, bi) =>
    bi === move.board
      ? b.map((row, ri) =>
          ri === move.row ? row.map((cell, ci) => (ci === move.col ? (player as Cell) : cell)) : row,
        )
      : b.map((row) => [...row]),
  );
  const meta = state.meta.map((row) => [...row]);

  const smallResult = getSmallBoardWinner(boards[move.board]);
  if (smallResult !== EMPTY_META) {
    const [mr, mc] = smallBoardIndexToMeta(move.board);
    meta[mr][mc] = smallResult;
  }

  let outcome = getMetaWinner(meta);
  if (outcome === 'ongoing' && listLegalMovesOnBoards(meta, boards, state.mode, null).length === 0) {
    outcome = 'draw';
  }

  const sentTo = cellToTargetBoardIndex(move.row, move.col);
  const activeBoard =
    outcome === 'ongoing' ? nextActiveBoard({ ...state, meta, boards }, sentTo) : null;

  return {
    meta,
    boards,
    currentPlayer: (1 - player) as Player,
    activeBoard,
    mode: state.mode,
    outcome,
    moveNumber: state.moveNumber + 1,
  };
}

function listLegalMovesOnBoards(
  meta: MetaCell[][],
  boards: Cell[][][],
  mode: GameMode,
  activeBoard: number | null,
): Move[] {
  const stub: GameState = {
    meta,
    boards,
    currentPlayer: 0,
    activeBoard,
    mode,
    outcome: 'ongoing',
    moveNumber: 0,
  };
  return listLegalMoves(stub);
}

export function validateRemoteMove(
  state: GameState,
  move: Move,
  claimedPlayer: Player,
): { ok: true; next: GameState } | { ok: false; reason: string } {
  if (claimedPlayer !== state.currentPlayer) {
    return { ok: false, reason: 'wrong_turn' };
  }
  if (!isMoveLegal(state, move, claimedPlayer)) {
    return { ok: false, reason: 'illegal_move' };
  }
  try {
    const next = applyMove(state, move);
    return { ok: true, next };
  } catch {
    return { ok: false, reason: 'illegal_move' };
  }
}

export function serializeState(state: GameState): string {
  return JSON.stringify(state);
}

export function deserializeState(json: string): GameState {
  return JSON.parse(json) as GameState;
}