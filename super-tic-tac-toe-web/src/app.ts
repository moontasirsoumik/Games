import { pickAiMove, type Difficulty } from '@/ai';
import { applyMove, createInitialState, isMoveLegal } from '@/game/rules';
import type { GameMode, GameState, Move, Player } from '@/game/types';
import { hapticLight, hapticWin } from '@/fx/haptics';
import { playBoardWin, playGameWin, playPlace } from '@/fx/sound';
import { loadSettings, saveSettings } from '@/lib/settings';
import {
  OnlineSession,
  clearSession,
  loadSession,
} from '@/network/onlineSession';
import type { ConnectionStatus } from '@/network/transport';
import {
  renderApp,
  type AppViewModel,
  type ScreenId,
  type SheetId,
} from '@/ui/screens';

export function createApp(mount: HTMLElement) {
  let screen: ScreenId = 'home';
  let sheet: SheetId = null;
  let state: GameState = createInitialState('standard');
  let session: OnlineSession | null = null;
  let connectionStatus: ConnectionStatus | undefined;
  let statusDetail: string | undefined;
  let roomCode: string | undefined;
  let shareUrl: string | undefined;
  let toast: string | undefined;
  let waitingGuest = false;
  let localMode: GameMode = 'standard';
  let onlineMode: GameMode = 'standard';
  let toastTimer: ReturnType<typeof setTimeout> | null = null;
  let myPlayer: 0 | 1 | undefined;
  let isHost = false;
  let soundOn = loadSettings().sound;
  let aiThinking = false;
  let lastMove: Move | undefined;
  let cpuDifficulty: Difficulty = 'medium';
  let cpuHumanPlayer: 0 | 1 = 0;
  let showCelebration = false;
  let aiBusy = false;
  let prevMetaJson = JSON.stringify(createInitialState('standard').meta);

  const handlers = {
    onOpenSheet: (id: SheetId) => {
      sheet = id;
      draw();
    },
    onCloseSheet: () => {
      sheet = null;
      draw();
    },
    onModeChange: (mode: GameMode) => {
      onlineMode = mode;
      session?.setHostMode(mode);
      draw();
    },
    onToggleSound: () => {
      soundOn = !soundOn;
      saveSettings({ sound: soundOn });
      draw();
    },
    onPlayLocal: (mode: GameMode) => {
      localMode = mode;
      state = createInitialState(mode);
      myPlayer = undefined;
      lastMove = undefined;
      screen = 'local';
      sheet = null;
      draw();
    },
    onStartCpu: (opts: { mode: GameMode; difficulty: Difficulty; human: 0 | 1 }) => {
      cpuDifficulty = opts.difficulty;
      cpuHumanPlayer = opts.human;
      localMode = opts.mode;
      const starter: Player = 0;
      state = createInitialState(opts.mode, starter);
      myPlayer = opts.human;
      lastMove = undefined;
      screen = 'cpu-game';
      sheet = null;
      showCelebration = false;
      prevMetaJson = JSON.stringify(state.meta);
      draw();
      void maybeAiTurn();
    },
    onPlayOnline: async (mode: GameMode) => {
      onlineMode = mode;
      screen = 'online-wait';
      waitingGuest = true;
      sheet = null;
      draw();
      await startHost(mode);
    },
    onJoinRoom: async (code: string) => {
      screen = 'online-wait';
      waitingGuest = false;
      roomCode = code;
      sheet = null;
      draw();
      await joinGuest(code);
    },
    onShowInstructions: () => {
      screen = 'instructions';
      draw();
    },
    onBackMenu: () => {
      session?.disconnect();
      session = null;
      screen = 'home';
      sheet = null;
      connectionStatus = undefined;
      aiThinking = false;
      aiBusy = false;
      draw();
    },
    onCell: (move: Move) => {
      if (screen === 'local') {
        if (!isMoveLegal(state, move)) return;
        hapticLight();
        lastMove = move;
        state = applyMove(state, move);
        onAfterMove();
        draw();
        return;
      }
      if (screen === 'cpu-game') {
        if (aiThinking || aiBusy) return;
        const human = myPlayer ?? cpuHumanPlayer;
        if (!isMoveLegal(state, move, human)) return;
        hapticLight();
        lastMove = move;
        state = applyMove(state, move);
        onAfterMove();
        draw();
        void maybeAiTurn();
        return;
      }
      if (session && screen === 'online-game') {
        const player = session.getPlayer();
        if (!isMoveLegal(state, move, player)) {
          showToast('Illegal move');
          return;
        }
        session.tryLocalMove(move);
      }
    },
    onShare: async () => {
      const url = session?.shareUrl() ?? shareUrl;
      if (!url) return;
      if (navigator.share) {
        try {
          await navigator.share({ title: 'Super Tic Tac Toe', url });
          return;
        } catch {
          /* empty */
        }
      }
      await copyText(url);
      showToast('Link copied');
    },
    onCopyLink: async () => {
      const url = session?.shareUrl() ?? shareUrl;
      if (url) {
        await copyText(url);
        showToast('Link copied');
      }
    },
    onRematch: () => {
      session?.rematch();
      showCelebration = false;
    },
    onRestart: () => {
      if (session) {
        session.disconnect();
        session = null;
      }
      if (screen === 'online-game') {
        void startHost(onlineMode);
      } else if (screen === 'cpu-game') {
        handlers.onStartCpu({
          mode: localMode,
          difficulty: cpuDifficulty,
          human: cpuHumanPlayer,
        });
      } else {
        state = createInitialState(localMode);
        draw();
      }
    },
    onRetryConnection: () => {
      const persist = loadSession();
      if (persist?.role === 'host') void startHost(persist.mode);
      else if (persist?.roomCode) void joinGuest(persist.roomCode);
    },
  };

  function onAfterMove() {
    const metaJson = JSON.stringify(state.meta);
    if (metaJson !== prevMetaJson) playBoardWin();
    prevMetaJson = metaJson;
    playPlace(state.currentPlayer === 0 ? 1 : 0);
    if (state.outcome !== 'ongoing') {
      hapticWin();
      playGameWin();
      showCelebration = true;
    }
  }

  async function maybeAiTurn() {
    if (screen !== 'cpu-game' || state.outcome !== 'ongoing') return;
    const human = myPlayer ?? cpuHumanPlayer;
    const ai = (1 - human) as Player;
    if (state.currentPlayer !== ai) return;
    if (aiBusy) return;
    aiBusy = true;
    aiThinking = true;
    draw();
    try {
      const move = await pickAiMove({ state, aiPlayer: ai, difficulty: cpuDifficulty });
      if (screen !== 'cpu-game' || state.outcome !== 'ongoing' || state.currentPlayer !== ai) return;
      if (!isMoveLegal(state, move, ai)) return;
      lastMove = move;
      state = applyMove(state, move);
      onAfterMove();
    } catch {
      showToast('CPU skipped a turn');
    } finally {
      aiThinking = false;
      aiBusy = false;
      draw();
      if (state.outcome === 'ongoing' && state.currentPlayer === ai) {
        void maybeAiTurn();
      }
    }
  }

  function showToast(msg: string) {
    toast = msg;
    draw();
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast = undefined;
      draw();
    }, 2500);
  }

  function vm(): AppViewModel {
    return {
      screen,
      sheet,
      state,
      connectionStatus,
      statusDetail,
      roomCode,
      shareUrl,
      toast,
      localMode,
      onlineMode,
      waitingGuest,
      myPlayer,
      isHost,
      soundOn,
      aiThinking,
      lastMove,
      cpuDifficulty,
      cpuHumanPlayer,
      showCelebration,
    };
  }

  function draw() {
    const v = vm();
    if (screen === 'online-game' && session) {
      v.state = session.getState();
      state = v.state;
      v.myPlayer = session.getPlayer();
    }
    renderApp(mount, v, handlers);
  }

  async function startHost(mode: GameMode) {
    try {
      session?.disconnect();
      session = await OnlineSession.createHost(mode, sessionCallbacks());
      exposeE2E(session);
      roomCode = session.getRoomCode();
      shareUrl = session.shareUrl();
      onlineMode = mode;
      state = session.getState();
      myPlayer = 0;
      isHost = true;
      connectionStatus = 'connected';
      screen = 'online-wait';
      waitingGuest = true;
      draw();
    } catch {
      connectionStatus = 'error';
      statusDetail = 'timeout';
      draw();
    }
  }

  async function joinGuest(code: string) {
    try {
      session?.disconnect();
      session = await OnlineSession.joinGuest(code, sessionCallbacks());
      exposeE2E(session);
      roomCode = code;
      myPlayer = 1;
      isHost = false;
      screen = 'online-wait';
      draw();
    } catch {
      connectionStatus = 'error';
      statusDetail = 'timeout';
      draw();
    }
  }

  function sessionCallbacks() {
    return {
      onState: (s: GameState) => {
        state = s;
        if (screen !== 'online-game') {
          screen = 'online-game';
          waitingGuest = false;
        }
        draw();
      },
      onStatus: (status: ConnectionStatus, detail?: string) => {
        connectionStatus = status;
        statusDetail = detail;
        draw();
      },
      onWaitingForGuest: () => {
        waitingGuest = true;
        draw();
      },
      onGuestJoined: () => {
        waitingGuest = false;
        screen = 'online-game';
        draw();
      },
      onMoveRejected: (reason: string) => {
        showToast(reason === 'wrong_turn' ? 'Not your turn' : 'Move rejected');
      },
      onRoomFull: () => {
        showToast('Room full');
        session?.disconnect();
        screen = 'home';
        draw();
      },
    };
  }

  async function bootstrap() {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room')?.toUpperCase();
    const persist = loadSession();
    if (room) {
      await joinGuest(room);
      return;
    }
    if (persist?.roomCode) {
      try {
        session = await OnlineSession.reconnect(persist, sessionCallbacks());
        exposeE2E(session);
        roomCode = persist.roomCode;
        shareUrl = session.shareUrl();
        myPlayer = persist.player;
        isHost = persist.role === 'host';
        state = session.getState();
        screen =
          persist.role === 'host' && !persist.stateJson ? 'online-wait' : 'online-game';
        draw();
      } catch {
        clearSession();
      }
    }
    draw();
  }

  function exposeE2E(s: OnlineSession) {
    if (!new URLSearchParams(window.location.search).has('e2e')) return;
    const w = window as unknown as E2EWindow;
    w.__stttSession = s;
    w.__sendRaw = (m) => s.sendRaw(m as import('@/network/transport').WireMessage);
    w.__e2eRematch = () => s.rematch();
  }

  void bootstrap();

  return { draw, getState: () => state };
}

interface E2EWindow {
  __stttSession?: OnlineSession;
  __sendRaw?: (m: unknown) => void;
  __e2eRematch?: () => void;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}