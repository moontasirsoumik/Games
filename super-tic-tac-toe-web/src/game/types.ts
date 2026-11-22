/** Cell on a small board: empty, X, or O */
export type Cell = -1 | 0 | 1;

/** Meta cell: empty, X won, O won, or draw */
export type MetaCell = -1 | 0 | 1 | 2;

export type Player = 0 | 1; // 0 = X, 1 = O

export type GameMode = 'standard' | 'free';

export type GameOutcome = 'ongoing' | 'x' | 'o' | 'draw';

export interface GameState {
  /** Meta board 3×3 (index 0 = top-left small-board slot) */
  meta: MetaCell[][];
  /** Small boards 1–9; each is 3×3 of Cell */
  boards: Cell[][][];
  /** Whose turn (0 = X, 1 = O) */
  currentPlayer: Player;
  /** Index 0–8 of small board that must be played, or null = any unfinished board */
  activeBoard: number | null;
  mode: GameMode;
  outcome: GameOutcome;
  /** Move count for rematch / sync */
  moveNumber: number;
}

export interface Move {
  board: number; // 0–8
  row: number;
  col: number;
}

export const EMPTY_CELL: Cell = -1;
export const EMPTY_META: MetaCell = -1;