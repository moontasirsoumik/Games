import {
  createInitialState,
  deserializeState,
  serializeState,
  validateRemoteMove,
} from '@/game/rules';
import type { GameMode, GameState, Move, Player } from '@/game/types';
import type { ConnectionStatus, GameTransport, RoomConfig, WireMessage } from './transport';
import { createPeerTransport, peerServerOptionsFromEnv } from './peerTransport';

export type Role = 'host' | 'guest';

export interface SessionPersist {
  roomCode: string;
  role: Role;
  player: Player;
  mode: GameMode;
  stateJson?: string;
  hostStarts: boolean;
}

const STORAGE_KEY = 'sttt_session';

export function saveSession(data: SessionPersist): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadSession(): SessionPersist | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionPersist;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export interface OnlineSessionCallbacks {
  onState(state: GameState): void;
  onStatus(status: ConnectionStatus, detail?: string): void;
  onWaitingForGuest(): void;
  onGuestJoined(): void;
  onMoveRejected(reason: string): void;
  onRoomFull(): void;
}

export class OnlineSession {
  private transport: GameTransport;
  private state: GameState;
  private role: Role;
  private player: Player;
  private roomConfig: RoomConfig;
  private callbacks: OnlineSessionCallbacks;
  private guestJoined = false;

  constructor(
    transport: GameTransport,
    role: Role,
    player: Player,
    mode: GameMode,
    roomCode: string,
    hostStarts: boolean,
    callbacks: OnlineSessionCallbacks,
    restoredState?: GameState,
  ) {
    this.transport = transport;
    this.role = role;
    this.player = player;
    this.roomConfig = { mode, roomCode, hostStarts };
    this.callbacks = callbacks;
    this.state =
      restoredState ??
      createInitialState(mode, hostStarts ? 0 : 1);
    if (role === 'guest') {
      this.state = createInitialState(mode, hostStarts ? 0 : 1);
    }
    if (role === 'host' && restoredState) {
      this.state = restoredState;
    }

    this.transport.onMessage((msg) => this.handleMessage(msg as WireMessage));
    this.transport.onStatus((status, detail) => {
      this.callbacks.onStatus(status, detail);
      if (status === 'room_full') this.callbacks.onRoomFull();
    });
  }

  static async createHost(
    mode: GameMode,
    callbacks: OnlineSessionCallbacks,
    hostStarts = true,
  ): Promise<OnlineSession> {
    const roomCode = generateRoomCode();
    const transport = createPeerTransport({
      roomCode,
      role: 'host',
      ...peerServerOptionsFromEnv(),
    });
    const session = new OnlineSession(
      transport,
      'host',
      0,
      mode,
      roomCode,
      hostStarts,
      callbacks,
    );
    await transport.connect({ roomCode });
    saveSession({
      roomCode,
      role: 'host',
      player: 0,
      mode,
      stateJson: serializeState(session.state),
      hostStarts,
    });
    callbacks.onWaitingForGuest();
    return session;
  }

  static async joinGuest(
    roomCode: string,
    callbacks: OnlineSessionCallbacks,
  ): Promise<OnlineSession> {
    const transport = createPeerTransport({
      roomCode,
      role: 'guest',
      ...peerServerOptionsFromEnv(),
    });
    const session = new OnlineSession(
      transport,
      'guest',
      1,
      'standard',
      roomCode,
      true,
      callbacks,
    );
    await transport.connect({ roomCode });
    transport.send({ type: 'hello', role: 'guest', player: 1 } satisfies WireMessage);
    saveSession({
      roomCode,
      role: 'guest',
      player: 1,
      mode: session.state.mode,
      hostStarts: true,
    });
    return session;
  }

  static async reconnect(
    persist: SessionPersist,
    callbacks: OnlineSessionCallbacks,
  ): Promise<OnlineSession> {
    const restored = persist.stateJson
      ? deserializeState(persist.stateJson)
      : undefined;
    const transport = createPeerTransport({
      roomCode: persist.roomCode,
      role: persist.role,
      ...peerServerOptionsFromEnv(),
    });
    const session = new OnlineSession(
      transport,
      persist.role,
      persist.player,
      persist.mode,
      persist.roomCode,
      persist.hostStarts,
      callbacks,
      restored,
    );
    await transport.connect({ roomCode: persist.roomCode });
    if (persist.role === 'guest') {
      transport.send({ type: 'hello', role: 'guest', player: 1 } satisfies WireMessage);
    } else if (restored) {
      transport.send({
        type: 'state',
        state: serializeState(restored),
        roomConfig: session.roomConfig,
      } satisfies WireMessage);
    }
    return session;
  }

  getState(): GameState {
    return this.state;
  }

  getRoomCode(): string {
    return this.roomConfig.roomCode;
  }

  getRole(): Role {
    return this.role;
  }

  getPlayer(): Player {
    return this.player;
  }

  getMode(): GameMode {
    return this.roomConfig.mode;
  }

  setHostMode(mode: GameMode) {
    if (this.role !== 'host' || this.guestJoined) return;
    this.roomConfig.mode = mode;
    const starter = this.roomConfig.hostStarts ? 0 : 1;
    this.state = createInitialState(mode, starter as Player);
    this.persist();
    this.callbacks.onState(this.state);
  }

  isMyTurn(): boolean {
    return this.state.currentPlayer === this.player;
  }

  tryLocalMove(move: Move): boolean {
    if (this.state.currentPlayer !== this.player) return false;
    const v = validateRemoteMove(this.state, move, this.player);
    if (!v.ok) {
      this.callbacks.onMoveRejected(v.reason);
      return false;
    }
    if (this.role === 'host') {
      this.state = v.next;
      this.persist();
      this.callbacks.onState(this.state);
      this.transport.send({
        type: 'move_accept',
        state: serializeState(this.state),
      } satisfies WireMessage);
      return true;
    }
    this.transport.send({
      type: 'move',
      move,
      player: this.player,
      moveNumber: this.state.moveNumber,
    } satisfies WireMessage);
    return true;
  }

  rematch() {
    if (this.role !== 'host') return;
    const prevStarter = this.roomConfig.hostStarts ? 0 : 1;
    const newStarter = (1 - prevStarter) as Player;
    this.roomConfig.hostStarts = newStarter === 0;
    this.state = createInitialState(this.roomConfig.mode, newStarter);
    this.persist();
    this.callbacks.onState(this.state);
    this.transport.send({
      type: 'rematch',
      startingPlayer: newStarter,
      state: serializeState(this.state),
    } satisfies WireMessage);
  }

  requestRematchAsGuest() {
    this.transport.send({ type: 'ping' } satisfies WireMessage);
  }

  private persist() {
    saveSession({
      roomCode: this.roomConfig.roomCode,
      role: this.role,
      player: this.player,
      mode: this.roomConfig.mode,
      stateJson: serializeState(this.state),
      hostStarts: this.roomConfig.hostStarts,
    });
  }

  private handleMessage(msg: WireMessage) {
    switch (msg.type) {
      case 'hello':
        if (this.role === 'host' && !this.guestJoined) {
          this.guestJoined = true;
          this.callbacks.onGuestJoined();
          this.transport.send({
            type: 'state',
            state: serializeState(this.state),
            roomConfig: this.roomConfig,
          } satisfies WireMessage);
        }
        break;
      case 'state':
        this.roomConfig = msg.roomConfig;
        this.state = deserializeState(msg.state);
        this.persist();
        this.callbacks.onState(this.state);
        if (this.role === 'guest') this.guestJoined = true;
        break;
      case 'move':
        if (this.role !== 'host') break;
        const v = validateRemoteMove(
          this.state,
          msg.move,
          msg.player,
        );
        if (!v.ok || msg.moveNumber !== this.state.moveNumber) {
          this.transport.send({
            type: 'move_reject',
            reason: v.ok ? 'stale' : v.reason,
            moveNumber: this.state.moveNumber,
          } satisfies WireMessage);
          break;
        }
        this.state = v.next;
        this.persist();
        this.callbacks.onState(this.state);
        this.transport.send({
          type: 'move_accept',
          state: serializeState(this.state),
        } satisfies WireMessage);
        break;
      case 'move_reject':
        this.callbacks.onMoveRejected(msg.reason);
        break;
      case 'move_accept':
        this.state = deserializeState(msg.state);
        this.persist();
        this.callbacks.onState(this.state);
        break;
      case 'rematch':
        this.state = deserializeState(msg.state);
        this.roomConfig.hostStarts = msg.startingPlayer === 0;
        this.persist();
        this.callbacks.onState(this.state);
        break;
      default:
        break;
    }
  }

  disconnect() {
    this.transport.disconnect();
  }

  /** Test-only: send wire message without validation */
  sendRaw(msg: WireMessage) {
    this.transport.send(msg);
  }

  shareUrl(): string {
    const base = import.meta.env.BASE_URL;
    const path = base.endsWith('/') ? base : `${base}/`;
    const url = new URL(path, window.location.origin);
    url.searchParams.set('room', this.roomConfig.roomCode);
    return url.href;
  }
}