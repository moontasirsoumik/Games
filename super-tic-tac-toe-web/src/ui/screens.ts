import type { Difficulty } from '@/ai/types';
import type { GameMode, GameOutcome, GameState } from '@/game/types';
import type { ConnectionStatus } from '@/network/transport';
import { boardGridEl, activeBoardHint } from './board';

export type ScreenId =
  | 'home'
  | 'instructions'
  | 'local'
  | 'cpu-game'
  | 'online-wait'
  | 'online-game';

export type SheetId = 'cpu' | 'pass' | 'online' | null;

export interface AppViewModel {
  screen: ScreenId;
  sheet: SheetId;
  state: GameState;
  connectionStatus?: ConnectionStatus;
  statusDetail?: string;
  roomCode?: string;
  shareUrl?: string;
  toast?: string;
  localMode?: GameMode;
  onlineMode?: GameMode;
  waitingGuest?: boolean;
  myPlayer?: 0 | 1;
  isHost?: boolean;
  soundOn?: boolean;
  aiThinking?: boolean;
  lastMove?: { board: number; row: number; col: number };
  cpuDifficulty?: Difficulty;
  cpuHumanPlayer?: 0 | 1;
  showCelebration?: boolean;
}

export function renderApp(root: HTMLElement, vm: AppViewModel, handlers: AppHandlers): void {
  root.innerHTML = '';
  root.className = 'app-root';

  if (vm.screen === 'home') {
    root.appendChild(homeScreen(vm, handlers));
    if (vm.sheet) root.appendChild(sheetOverlay(vm, handlers));
  } else if (vm.screen === 'instructions') {
    root.appendChild(instructionsScreen(handlers));
  } else if (
    vm.screen === 'local' ||
    vm.screen === 'online-game' ||
    vm.screen === 'cpu-game'
  ) {
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

  const gameScreens: ScreenId[] = ['local', 'online-game', 'cpu-game'];
  if (vm.state.outcome !== 'ongoing' && gameScreens.includes(vm.screen)) {
    root.appendChild(overlayScreen(vm, handlers));
  }
}

export interface AppHandlers {
  onOpenSheet: (id: SheetId) => void;
  onCloseSheet: () => void;
  onPlayLocal: (mode: GameMode) => void;
  onStartCpu: (opts: { mode: GameMode; difficulty: Difficulty; human: 0 | 1 }) => void;
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
  onToggleSound: () => void;
}

function logoBlock(): HTMLElement {
  const box = document.createElement('div');
  box.className = 'logo-block';
  const mark = document.createElement('div');
  mark.className = 'logo-mark';
  mark.setAttribute('aria-hidden', 'true');
  mark.textContent = '⨂';
  const title = document.createElement('h1');
  title.className = 'game-title';
  title.textContent = 'Super TTT';
  const tag = document.createElement('p');
  tag.className = 'game-tagline';
  tag.textContent = 'Ultimate tic-tac-toe';
  box.append(mark, title, tag);
  return box;
}

function homeScreen(vm: AppViewModel, h: AppHandlers): HTMLElement {
  const shell = document.createElement('div');
  shell.className = 'screen home-screen';
  const hero = document.createElement('div');
  hero.className = 'home-hero';
  hero.appendChild(logoBlock());
  shell.appendChild(hero);

  const actions = document.createElement('div');
  actions.className = 'home-actions';

  actions.appendChild(
    actionBtn('Play vs Computer', 'primary', () => h.onOpenSheet('cpu'), 'btn-vs-cpu'),
  );
  actions.appendChild(
    actionBtn('Play Online', 'primary', () => h.onOpenSheet('online'), 'btn-play-online'),
  );
  actions.appendChild(
    actionBtn('Pass & Play', 'secondary', () => h.onOpenSheet('pass'), 'btn-pass-play'),
  );

  shell.appendChild(actions);

  const foot = document.createElement('div');
  foot.className = 'home-foot';
  foot.appendChild(
    iconBtn(vm.soundOn ? 'Sound on' : 'Sound off', () => h.onToggleSound(), 'btn-sound'),
  );
  foot.appendChild(textBtn('How to play', h.onShowInstructions));
  shell.appendChild(foot);
  return shell;
}

function sheetOverlay(vm: AppViewModel, h: AppHandlers): HTMLElement {
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) h.onCloseSheet();
  });
  const sheet = document.createElement('div');
  sheet.className = 'sheet';
  sheet.dataset.testid = vm.sheet === 'cpu' ? 'cpu-setup' : `sheet-${vm.sheet}`;
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');

  const grab = document.createElement('div');
  grab.className = 'sheet-grab';
  sheet.appendChild(grab);

  if (vm.sheet === 'cpu') {
    sheet.appendChild(cpuSheet(vm, h));
  } else if (vm.sheet === 'pass') {
    sheet.appendChild(passSheet(h));
  } else if (vm.sheet === 'online') {
    sheet.appendChild(onlineSheet(vm, h));
  }

  backdrop.appendChild(sheet);
  return backdrop;
}

function cpuSheet(vm: AppViewModel, h: AppHandlers): DocumentFragment {
  const frag = document.createDocumentFragment();
  const h2 = document.createElement('h2');
  h2.className = 'sheet-title';
  h2.textContent = 'Vs Computer';
  frag.appendChild(h2);

  const diff = optionRow('Difficulty', ['easy', 'medium', 'hard'], vm.cpuDifficulty ?? 'medium');
  const rules = optionRow('Rules', ['standard', 'free'], vm.localMode ?? 'standard');
  const side = optionRow('You play', ['x', 'o'], vm.cpuHumanPlayer === 1 ? 'o' : 'x');

  frag.append(diff, rules, side);

  const readChip = (row: HTMLElement) =>
    (row.querySelector('.chip.on') as HTMLElement | null)?.dataset.value;

  frag.appendChild(
    actionBtn('Start match', 'primary', () => {
      const d = (readChip(diff) ?? 'medium') as Difficulty;
      const mode = (readChip(rules) ?? 'standard') as GameMode;
      const sideVal = readChip(side) ?? 'x';
      const human = (sideVal === 'o' ? 1 : 0) as 0 | 1;
      h.onStartCpu({ mode, difficulty: d, human });
    }, 'btn-start-cpu'),
  );
  return frag;
}

function passSheet(h: AppHandlers): DocumentFragment {
  const frag = document.createDocumentFragment();
  const h2 = document.createElement('h2');
  h2.className = 'sheet-title';
  h2.textContent = 'Pass & Play';
  frag.appendChild(h2);
  let mode: GameMode = 'standard';
  const rules = optionRow('Rules', ['standard', 'free'], 'standard');
  rules.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).dataset.value as GameMode;
    if (t) mode = t;
  });
  frag.appendChild(rules);
  frag.appendChild(
    actionBtn('Start', 'primary', () => {
      h.onCloseSheet();
      h.onPlayLocal(mode);
    }),
  );
  return frag;
}

function onlineSheet(vm: AppViewModel, h: AppHandlers): DocumentFragment {
  const frag = document.createDocumentFragment();
  const h2 = document.createElement('h2');
  h2.className = 'sheet-title';
  h2.textContent = 'Play Online';
  frag.appendChild(h2);

  let mode: GameMode = vm.onlineMode ?? 'standard';
  const rules = optionRow('Rules', ['standard', 'free'], mode);
  rules.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).dataset.value as GameMode;
    if (t) {
      mode = t;
      h.onModeChange?.(t);
    }
  });
  frag.appendChild(rules);

  frag.appendChild(
    actionBtn('New online game', 'primary', () => {
      h.onCloseSheet();
      h.onPlayOnline(mode);
    }, 'btn-online-new'),
  );

  const join = document.createElement('div');
  join.className = 'join-row';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Room code';
  input.className = 'field-input';
  input.maxLength = 6;
  join.appendChild(input);
  join.appendChild(
    actionBtn('Join', 'secondary', () => {
      const code = input.value.trim().toUpperCase();
      if (code) {
        h.onCloseSheet();
        h.onJoinRoom(code);
      }
    }, 'btn-join'),
  );
  frag.appendChild(join);
  return frag;
}

function optionRow(label: string, values: string[], selected: string): HTMLElement {
  const row = document.createElement('div');
  row.className = 'option-row';
  const lbl = document.createElement('span');
  lbl.className = 'option-label';
  lbl.textContent = label;
  row.appendChild(lbl);
  const opts = document.createElement('div');
  opts.className = 'option-chips';
  for (const v of values) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `chip ${v === selected ? 'on' : ''}`;
    b.dataset.value = v;
    b.textContent = v.charAt(0).toUpperCase() + v.slice(1);
    b.addEventListener('click', () => {
      opts.querySelectorAll('.chip').forEach((c) => c.classList.remove('on'));
      b.classList.add('on');
    });
    opts.appendChild(b);
  }
  row.appendChild(opts);
  return row;
}

function playerBar(vm: AppViewModel): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'player-bar';
  const x = playerCard('X', 0, vm);
  const o = playerCard('O', 1, vm);
  bar.append(x, o);
  const turn = document.createElement('span');
  turn.className = 'sr-turn';
  turn.dataset.testid = 'turn-indicator';
  if (vm.state.outcome === 'ongoing') {
    turn.textContent = `${vm.state.currentPlayer === 0 ? 'X' : 'O'} to play`;
  } else {
    turn.textContent = outcomeText(vm.state.outcome);
  }
  bar.appendChild(turn);
  return bar;
}

function playerCard(label: string, player: 0 | 1, vm: AppViewModel): HTMLElement {
  const card = document.createElement('div');
  card.className = `player-card p${player}`;
  const active = vm.state.outcome === 'ongoing' && vm.state.currentPlayer === player;
  if (active && !vm.aiThinking) card.classList.add('active');
  if (vm.aiThinking && vm.screen === 'cpu-game') {
    const human = vm.myPlayer ?? vm.cpuHumanPlayer ?? 0;
    if (player !== human) card.classList.add('active', 'thinking');
  }
  const name = document.createElement('span');
  name.className = 'player-name';
  name.textContent = label;
  const tag = document.createElement('span');
  tag.className = 'player-tag';
  if (vm.screen === 'cpu-game') {
    const human = vm.myPlayer ?? vm.cpuHumanPlayer ?? 0;
    tag.textContent = player === human ? 'You' : 'CPU';
  } else if (vm.screen === 'online-game' && vm.myPlayer === player) {
    tag.textContent = 'You';
  } else if (vm.screen === 'local') {
    tag.textContent = player === 0 ? 'P1' : 'P2';
  } else {
    tag.textContent = player === 0 ? 'X' : 'O';
  }
  card.append(name, tag);
  return card;
}

function gameScreen(vm: AppViewModel, h: AppHandlers): HTMLElement {
  const shell = document.createElement('div');
  shell.className = 'screen game-screen';

  const top = document.createElement('header');
  top.className = 'game-top';
  top.appendChild(playerBar(vm));

  const banner = document.createElement('div');
  banner.className = 'status-banner';
  const hint = document.createElement('span');
  hint.dataset.testid = 'board-hint';
  hint.textContent = activeBoardHint(vm.state);
  banner.appendChild(hint);
  if (vm.connectionStatus) {
    const dot = document.createElement('span');
    dot.className = 'conn-dot';
    dot.dataset.status = vm.connectionStatus;
    banner.appendChild(dot);
  }
  top.appendChild(banner);
  shell.appendChild(top);

  const boardHost = document.createElement('div');
  boardHost.className = 'board-host';
  boardHost.dataset.testid = 'game-board';
  const interactive = vm.state.outcome === 'ongoing' && !vm.aiThinking;
  const perspective =
    vm.screen === 'online-game'
      ? vm.myPlayer
      : vm.screen === 'cpu-game'
        ? vm.myPlayer ?? vm.cpuHumanPlayer
        : undefined;
  boardHost.appendChild(
    boardGridEl(vm.state, (m) => h.onCell(m), interactive, perspective, vm.lastMove),
  );
  shell.appendChild(boardHost);

  const dock = document.createElement('nav');
  dock.className = 'game-dock';
  dock.setAttribute('aria-label', 'Game actions');
  dock.appendChild(actionBtn('Restart', 'secondary', h.onRestart, 'btn-restart'));
  dock.appendChild(actionBtn('Home', 'secondary', h.onBackMenu, 'btn-menu'));
  shell.appendChild(dock);
  return shell;
}

function waitScreen(vm: AppViewModel, h: AppHandlers): HTMLElement {
  const shell = document.createElement('div');
  shell.className = 'screen wait-screen';
  const inner = document.createElement('div');
  inner.className = 'wait-card';

  const h2 = document.createElement('h2');
  h2.textContent = vm.waitingGuest ? 'Waiting for friend' : 'Connecting…';
  inner.appendChild(h2);

  if (vm.roomCode) {
    const code = document.createElement('p');
    code.className = 'room-code';
    code.dataset.testid = 'room-code';
    code.textContent = `Code ${vm.roomCode}`;
    inner.appendChild(code);
  }
  if (vm.shareUrl) {
    const link = document.createElement('p');
    link.className = 'share-link';
    link.dataset.testid = 'share-link';
    link.textContent = vm.shareUrl;
    inner.appendChild(link);
    const row = document.createElement('div');
    row.className = 'row-actions';
    row.append(actionBtn('Share', 'primary', h.onShare), actionBtn('Copy link', 'secondary', h.onCopyLink));
    inner.appendChild(row);
  }

  if (vm.isHost && vm.waitingGuest) {
    const modeRow = optionRow('Rules', ['standard', 'free'], vm.onlineMode ?? 'standard');
    modeRow.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const t = (chip as HTMLElement).dataset.value as GameMode;
        h.onModeChange?.(t);
      });
    });
    inner.appendChild(modeRow);
  }

  if (vm.connectionStatus === 'error') {
    const err = document.createElement('p');
    err.className = 'error';
    err.dataset.testid = 'connect-error';
    inner.appendChild(err);
    inner.appendChild(actionBtn('Retry', 'primary', h.onRetryConnection));
  } else {
    const st = document.createElement('p');
    st.dataset.testid = 'conn-status';
    st.textContent = statusLabel(vm.connectionStatus);
    inner.appendChild(st);
  }

  inner.appendChild(textBtn('Cancel', h.onBackMenu));
  shell.appendChild(inner);
  return shell;
}

function overlayScreen(vm: AppViewModel, h: AppHandlers): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = `overlay ${vm.showCelebration ? 'celebrate' : ''}`;
  overlay.dataset.testid = 'game-over';
  const card = document.createElement('div');
  card.className = 'result-card';
  const label = document.createElement('h2');
  label.textContent = outcomeHeadline(vm.state.outcome, vm);
  card.appendChild(label);
  if (vm.screen === 'online-game') {
    card.appendChild(actionBtn('Rematch', 'primary', h.onRematch));
  } else if (vm.screen === 'cpu-game') {
    card.appendChild(actionBtn('Play again', 'primary', h.onRestart));
  }
  card.appendChild(actionBtn('Home', 'secondary', h.onBackMenu));
  overlay.appendChild(card);
  return overlay;
}

function instructionsScreen(h: AppHandlers): HTMLElement {
  const shell = document.createElement('div');
  shell.className = 'screen instructions-screen';
  const scroll = document.createElement('div');
  scroll.className = 'instructions-scroll';
  const lines = [
    'Nine small boards on a 3×3 grid. Win a board to claim that cell on the mega board.',
    'Standard: each move sends the opponent to the matching small board; if it is closed, they play anywhere.',
    'Free play: any empty cell, any time (like the classic desktop game).',
    'CPU: Easy is random; Medium uses tactics; Hard uses deeper search in a background worker.',
  ];
  for (const text of lines) {
    const p = document.createElement('p');
    p.className = 'instr-line';
    p.textContent = text;
    scroll.appendChild(p);
  }
  shell.appendChild(scroll);
  shell.appendChild(actionBtn('Back', 'primary', h.onBackMenu));
  return shell;
}

function actionBtn(
  label: string,
  variant: 'primary' | 'secondary',
  onClick: () => void,
  className = '',
): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `btn-action ${variant} ${className}`.trim();
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function textBtn(label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn-text';
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function iconBtn(label: string, onClick: () => void, className = ''): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `btn-icon ${className}`.trim();
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

function outcomeHeadline(o: GameOutcome, vm: AppViewModel): string {
  if (o === 'draw') return 'Draw game';
  if (vm.screen === 'cpu-game') {
    const human = vm.myPlayer ?? vm.cpuHumanPlayer ?? 0;
    const humanWon = (o === 'x' && human === 0) || (o === 'o' && human === 1);
    return humanWon ? 'You win!' : 'CPU wins';
  }
  if (o === 'x') return 'X wins!';
  if (o === 'o') return 'O wins!';
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
      return 'Connection issue';
    case 'room_full':
      return 'Room full';
    default:
      return 'Offline';
  }
}