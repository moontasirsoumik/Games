export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'room_full';

export type StatusHandler = (status: ConnectionStatus, detail?: string) => void;
export type MessageHandler = (payload: unknown) => void;

export interface GameTransport {
  connect(options: Record<string, unknown>): Promise<void>;
  send(payload: unknown): void;
  onMessage(handler: MessageHandler): void;
  onStatus(handler: StatusHandler): void;
  disconnect(): void;
  readonly isHost: boolean;
}

export type WireMessage =
  | { type: 'hello'; role: 'host' | 'guest'; player: 0 | 1 }
  | { type: 'room_full' }
  | { type: 'state'; state: string; roomConfig: RoomConfig }
  | { type: 'move'; move: { board: number; row: number; col: number }; player: 0 | 1; moveNumber: number }
  | { type: 'move_reject'; reason: string; moveNumber: number }
  | { type: 'move_accept'; state: string }
  | { type: 'rematch'; startingPlayer: 0 | 1; state: string }
  | { type: 'ping' }
  | { type: 'pong' };

export interface RoomConfig {
  mode: 'standard' | 'free';
  roomCode: string;
  hostStarts: boolean;
}