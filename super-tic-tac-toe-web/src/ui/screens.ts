import type { GameMode, GameOutcome, GameState } from '@/game/types';
import type { ConnectionStatus } from '@/network/transport';
import { boardGridEl, activeBoardHint } from './board';

export type ScreenId = 'menu' | 'instructions' | 'local' | 'online-wait' | 'online-game' | 'over';

export interface AppViewModel {
  screen: ScreenId;
  state: GameState;
  connectionStatus?: ConnectionStatus;
  statusDetail?: string;
  roomCode?: string;
  shareUrl?: string;
  roleLabel?: string;
  toast?: string;
  localMode?: GameMode;
  onlineMode?: GameMode;
  waitingGuest?: boolean;
  myPlayer?: 0 | 1;
  isHost?: boolean;
}

export function renderApp(root: HTMLElement, vm: AppViewModel, handlers: AppHandlers): void {
  root.innerHTML = '';
  root.className = 'app-root';

  if (vm.screen === 'menu') {
    root.appendChild(menuScreen(handlers));
  } else if (vm.screen === 'instructions') {
    root.appendChild(instructionsScreen(handlers));
  } else if (vm.screen === 'local' || vm.screen === 'online-game') {
    root.appendChild(gameScreen(vm, handlers));
  } else if (vm.screen === 'online-wait') {
    root.appendChild(waitScreen(vm, handlers));
  }

  if (vm.toast) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = vm.toast;
    root.appendChild(t);
  }

  if (vm.state.outcome !== 'ongoing' && (vm.screen === 'local' || vm.screen === 'online-game')) {
    root.appendChild(overlayScreen(vm, handlers));
  }
}

export interface AppHandlers {
  onPlayLocal: (mode: GameMode) => void;
  onPlayOnline: (mode: GameMode) => void;
  onJoinRoom: (code: string) => void;
  onShowInstructions: () => void;
  onBackMenu: () => void;
  onCell: (move: { board: number; row: number; col: number }) => void;
  onShare: () => void;
  onCopyLink: () => void;
  onRematch: () => void;
  onRestart: () => void;
  onRetryConnection: () => void;
  onModeChange?: (mode: GameMode) => void;
}

function menuScreen(h: AppHandlers): HTMLElement {
  const frame = plumPanel();
  const title = document.createElement('h1');
  title.className = 'title';
  title.textContent = 'W E L C O M E';
  frame.appendChild(title);

  const sub = document.createElement('p');
  sub.className = 'subtitle';
  sub.textContent = 'Super Tic Tac Toe';
  frame.appendChild(sub);

  frame.appendChild(
    btn('Pass & play', () => h.onPlayLocal('standard'), 'btn-pass-play'),
  );
  frame.appendChild(
    btn('Pass & play (free)', () => h.onPlayLocal('free'), 'btn-pass-play-free'),
  );
  frame.appendChild(
    btn('New online game', () => h.onPlayOnline('standard'), 'btn-online-new'),
  );

  const joinRow = document.createElement('div');
  joinRow.className = 'join-row';
  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'text';
  input.autocomplete = 'off';
  input.placeholder = 'Room code';
  input.className = 'room-input';
  input.maxLength = 6;
  input.id = 'join-code';
  const joinBtn = btn('Join', () => {
    const code = input.value.trim().toUpperCase();
    if (code) h.onJoinRoom(code);
  }, 'btn-join');
  joinRow.append(joinBtn, input);
  frame.appendChild(joinRow);

  frame.appendChild(btn('Instructions', h.onShowInstructions));

  const modeNote = document.createElement('p');
  modeNote.className = 'hint';
  modeNote.textContent = 'Online host can choose rules on the waiting screen.';
  frame.appendChild(modeNote);

  const shell = document.createElement('div');
  shell.className = 'screen menu-screen';
  shell.appendChild(frame);
  return shell;
}

function instructionsScreen(h: AppHandlers): HTMLElement {
  const shell = document.createElement('div');
  shell.className = 'screen instructions-screen';
  const scroll = document.createElement('div');
  scroll.className = 'instructions-scroll';
  const lines = [
    'The game is played on a 3×3 grid of nine small tic-tac-toe boards.',
    'Standard rules: X opens anywhere. Each move sends the opponent to the small board in that cell position.',
    'If that board is already won or full, they may play anywhere on an unfinished board.',
    'You cannot play on a finished small board.',
    'Free play matches the classic desktop game: any empty cell, any time.',
    'Win the mega board with three claimed small boards in a row.',
  ];
  for (const text of lines) {
    const p = document.createElement('p');
    p.className = 'instr-line';
    p.textContent = text;
    scroll.appendChild(p);
  }
  shell.appendChild(scroll);
  shell.appendChild(btn('Play', h.onBackMenu));
  return shell;
}

function waitScreen(vm: AppViewModel, h: AppHandlers): HTMLElement {
  const shell = document.createElement('div');
  shell.className = 'screen wait-screen';
  const panel = plumPanel();

  const h2 = document.createElement('h2');
  h2.textContent = vm.waitingGuest ? 'Waiting for friend…' : 'Connecting…';
  panel.appendChild(h2);

  if (vm.roomCode) {
    const code = document.createElement('p');
    code.className = 'room-code';
    code.dataset.testid = 'room-code';
    code.textContent = `Code: ${vm.roomCode}`;
    panel.appendChild(code);
  }

  if (vm.shareUrl) {
    const link = document.createElement('p');
    link.className = 'share-link';
    link.dataset.testid = 'share-link';
    link.textContent = vm.shareUrl;
    panel.appendChild(link);

    const actions = document.createElement('div');
    actions.className = 'row-actions';
    actions.appendChild(btn('Share', h.onShare, 'btn-share'));
    actions.appendChild(btn('Copy link', h.onCopyLink, 'btn-copy'));
    panel.appendChild(actions);
  }

  if (vm.isHost && vm.waitingGuest) {
    const modeRow = document.createElement('div');
    modeRow.className = 'mode-row';
    for (const m of ['standard', 'free'] as GameMode[]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `btn mode-btn ${vm.onlineMode === m ? 'selected' : ''}`;
      b.dataset.testid = `mode-${m}`;
      b.textContent = m === 'standard' ? 'Standard rules' : 'Free play';
      b.addEventListener('click', () => h.onModeChange?.(m));
      modeRow.appendChild(b);
    }
    panel.appendChild(modeRow);
  } else {
    const mode = document.createElement('p');
    mode.className = 'hint';
    mode.textContent = `Rules: ${vm.onlineMode ?? vm.state.mode}`;
    panel.appendChild(mode);
  }

  if (vm.connectionStatus === 'error') {
    const err = document.createElement('p');
    err.className = 'error';
    err.dataset.testid = 'connect-error';
    err.textContent =
      vm.statusDetail === 'timeout'
        ? 'Could not connect within 15 seconds. Check network or try again.'
        : `Connection error: ${vm.statusDetail ?? 'unknown'}`;
    panel.appendChild(err);
    panel.appendChild(btn('Retry', h.onRetryConnection, 'btn-retry'));
  } else {
    const st = document.createElement('p');
    st.className = 'status-pill';
    st.dataset.testid = 'conn-status';
    st.textContent = statusLabel(vm.connectionStatus);
    panel.appendChild(st);
  }

  panel.appendChild(btn('Back', h.onBackMenu));
  shell.appendChild(panel);
  return shell;
}

function gameScreen(vm: AppViewModel, h: AppHandlers): HTMLElement {
  const shell = document.createElement('div');
  shell.className = 'screen game-screen';

  const header = document.createElement('header');
  header.className = 'game-header';
  const turn = document.createElement('span');
  turn.dataset.testid = 'turn-indicator';
  turn.textContent =
    vm.state.outcome === 'ongoing'
      ? `${vm.state.currentPlayer === 0 ? 'X' : 'O'} to play`
      : outcomeText(vm.state.outcome);
  header.appendChild(turn);

  const hint = document.createElement('span');
  hint.className = 'board-hint';
  hint.dataset.testid = 'board-hint';
  hint.textContent = activeBoardHint(vm.state);
  header.appendChild(hint);

  if (vm.connectionStatus) {
    const conn = document.createElement('span');
    conn.className = 'conn-dot';
    conn.dataset.testid = 'conn-dot';
    conn.title = statusLabel(vm.connectionStatus);
    conn.dataset.status = vm.connectionStatus;
    header.appendChild(conn);
  }
  if (vm.roleLabel) {
    const role = document.createElement('span');
    role.className = 'role-label';
    role.textContent = vm.roleLabel;
    header.appendChild(role);
  }

  shell.appendChild(header);

  const interactive = vm.state.outcome === 'ongoing';
  const boardHost = document.createElement('div');
  boardHost.className = 'board-host';
  boardHost.dataset.testid = 'game-board';
  boardHost.appendChild(
    boardGridEl(vm.state, (move) => h.onCell(move), interactive, vm.myPlayer),
  );
  shell.appendChild(boardHost);

  shell.appendChild(btn('Menu', h.onBackMenu, 'btn-menu'));
  return shell;
}

function overlayScreen(vm: AppViewModel, h: AppHandlers): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.dataset.testid = 'game-over';
  const card = plumPanel();
  const label = document.createElement('h2');
  label.textContent = outcomeHeadline(vm.state.outcome);
  card.appendChild(label);
  if (vm.screen === 'online-game') {
    card.appendChild(btn('Rematch', h.onRematch, 'btn-rematch'));
  }
  card.appendChild(btn('Restart', h.onRestart));
  overlay.appendChild(card);
  return overlay;
}

function plumPanel(): HTMLElement {
  const f = document.createElement('div');
  f.className = 'plum-panel';
  return f;
}

function btn(label: string, onClick: () => void, className = ''): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `btn ${className}`.trim();
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function outcomeText(o: GameOutcome): string {
  if (o === 'x') return 'X wins';
  if (o === 'o') return 'O wins';
  if (o === 'draw') return 'Draw';
  return '';
}

function outcomeHeadline(o: GameOutcome): string {
  if (o === 'x') return 'X wins';
  if (o === 'o') return 'O wins';
  if (o === 'draw') return 'Match draw';
  return 'Game over';
}

function statusLabel(s?: ConnectionStatus): string {
  switch (s) {
    case 'connected':
      return 'Connected';
    case 'connecting':
      return 'Connecting…';
    case 'disconnected':
      return 'Disconnected';
    case 'error':
      return 'Error';
    case 'room_full':
      return 'Room full';
    default:
      return 'Offline';
  }
}