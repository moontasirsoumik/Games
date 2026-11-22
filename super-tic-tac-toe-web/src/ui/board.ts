import { cellToTargetBoardIndex, isBoardFinished, isMoveLegal } from '@/game/rules';
import type { GameState, Move } from '@/game/types';

function prefersReducedMotion(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function boardGridEl(
  state: GameState,
  onCellTap: (move: Move) => void,
  interactive: boolean,
  perspectivePlayer?: 0 | 1,
  lastMove?: Move,
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'mega-board';
  wrap.setAttribute('role', 'grid');
  wrap.setAttribute('aria-label', 'Super tic-tac-toe board');

  const reduced = prefersReducedMotion();

  for (let mb = 0; mb < 9; mb++) {
    const mini = document.createElement('div');
    mini.className = 'mini-board';
    const metaRow = Math.floor(mb / 3);
    const metaCol = mb % 3;
    const metaVal = state.meta[metaRow][metaCol];
    if (metaVal === 0) mini.classList.add('won-x');
    else if (metaVal === 1) mini.classList.add('won-o');
    else if (metaVal === 2) mini.classList.add('won-draw');

    const required =
      state.mode === 'standard' &&
      state.activeBoard !== null &&
      !isBoardFinished(state.meta, state.activeBoard)
        ? state.activeBoard
        : null;
    const active =
      state.mode === 'standard' &&
      state.outcome === 'ongoing' &&
      (required === null || required === mb) &&
      !isBoardFinished(state.meta, mb);
    if (active) mini.classList.add('active-mini');

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'cell';
        cell.dataset.testid = 'cell';
        cell.dataset.board = String(mb);
        cell.dataset.row = String(r);
        cell.dataset.col = String(c);
        const val = state.boards[mb][r][c];
        if (val === 0) {
          cell.classList.add('mark-x');
        } else if (val === 1) {
          cell.classList.add('mark-o');
        }

        if (
          lastMove &&
          lastMove.board === mb &&
          lastMove.row === r &&
          lastMove.col === c &&
          !reduced
        ) {
          cell.classList.add('cell-pop');
        }

        const move: Move = { board: mb, row: r, col: c };
        let canTap = interactive && val === -1;
        if (perspectivePlayer !== undefined) {
          canTap =
            canTap &&
            state.currentPlayer === perspectivePlayer &&
            isMoveLegal(state, move, perspectivePlayer);
        } else if (interactive) {
          canTap = canTap && isMoveLegal(state, move);
        }

        if (!canTap) {
          cell.disabled = true;
          if (val === -1) cell.classList.add('disabled-empty');
        } else {
          cell.addEventListener('click', () => onCellTap(move));
        }
        mini.appendChild(cell);
      }
    }
    wrap.appendChild(mini);
  }
  return wrap;
}

export function activeBoardHint(state: GameState): string {
  if (state.mode === 'free') return 'Free play';
  if (state.outcome !== 'ongoing') return '';
  if (state.activeBoard === null) return 'Any open board';
  return `Board ${state.activeBoard + 1}`;
}

export function moveTargetBoard(move: Move): number {
  return cellToTargetBoardIndex(move.row, move.col);
}