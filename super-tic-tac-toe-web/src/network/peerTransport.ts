import Peer, { type DataConnection } from 'peerjs';
import type { ConnectionStatus, GameTransport, MessageHandler, StatusHandler, WireMessage } from './transport';

const PUBLIC_PEER_HOST = '0.peerjs.com';
const CONNECT_TIMEOUT_MS = 15_000;

const defaultIceServers: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export interface PeerTransportOptions {
  roomCode: string;
  role: 'host' | 'guest';
  peerHost?: string;
  peerPort?: number;
  path?: string;
  secure?: boolean;
}

export function createPeerTransport(options: PeerTransportOptions): GameTransport {
  let peer: Peer | null = null;
  let conn: DataConnection | null = null;
  let messageHandler: MessageHandler = () => {};
  let statusHandler: StatusHandler = () => {};
  let connectTimer: ReturnType<typeof setTimeout> | null = null;
  const isHost = options.role === 'host';

  function setStatus(status: ConnectionStatus, detail?: string) {
    statusHandler(status, detail);
  }

  function clearTimer() {
    if (connectTimer) {
      clearTimeout(connectTimer);
      connectTimer = null;
    }
  }

  function wireConnection(connection: DataConnection) {
    conn = connection;
    connection.on('open', () => {
      clearTimer();
      setStatus('connected');
    });
    connection.on('data', (data) => {
      const payload = data as WireMessage;
      if (payload?.type === 'room_full') {
        setStatus('room_full');
      }
      messageHandler(payload);
    });
    connection.on('close', () => {
      setStatus('disconnected');
      conn = null;
    });
    connection.on('error', () => {
      setStatus('error', 'connection_error');
    });
  }

  return {
    isHost,

    async connect(overrides: Record<string, unknown>): Promise<void> {
      const opts = { ...options, ...overrides } as PeerTransportOptions;
      const id = isHost ? `sttt-${opts.roomCode}` : undefined;
      const peerConfig: ConstructorParameters<typeof Peer>[1] = {
        host: opts.peerHost ?? PUBLIC_PEER_HOST,
        port: opts.peerPort ?? 443,
        path: opts.path ?? '/',
        secure: opts.secure ?? true,
        config: { iceServers: defaultIceServers },
      };

      setStatus('connecting');
      connectTimer = setTimeout(() => {
        if (!conn?.open) {
          setStatus('error', 'timeout');
        }
      }, CONNECT_TIMEOUT_MS);

      await new Promise<void>((resolve, reject) => {
        peer = id ? new Peer(id, peerConfig) : new Peer(peerConfig);
        peer.on('open', () => {
          if (isHost) {
            peer!.on('connection', (incoming) => {
              if (conn?.open) {
                incoming.on('open', () => {
                  incoming.send({ type: 'room_full' } satisfies WireMessage);
                  incoming.close();
                });
                return;
              }
              wireConnection(incoming);
            });
            clearTimer();
            setStatus('connected');
            resolve();
          } else {
            const hostId = `sttt-${opts.roomCode}`;
            const c = peer!.connect(hostId, { reliable: true });
            wireConnection(c);
            c.on('open', () => resolve());
            c.on('error', (err) => {
              clearTimer();
              reject(err);
            });
          }
        });
        peer.on('error', (err) => {
          clearTimer();
          const msg = String(err);
          if (msg.includes('taken') || msg.includes('unavailable')) {
            setStatus('error', 'id_taken');
          } else {
            setStatus('error', msg);
          }
          reject(err);
        });
      });
    },

    send(payload: unknown) {
      if (conn?.open) conn.send(payload);
    },

    onMessage(handler: MessageHandler) {
      messageHandler = handler;
    },

    onStatus(handler: StatusHandler) {
      statusHandler = handler;
    },

    disconnect() {
      clearTimer();
      conn?.close();
      conn = null;
      peer?.destroy();
      peer = null;
      setStatus('disconnected');
    },
  };
}

/** Local PeerServer for CI / dev when PEER_E2E or env points here */
export function peerServerOptionsFromEnv(): Partial<PeerTransportOptions> | undefined {
  const host = import.meta.env.VITE_PEER_HOST as string | undefined;
  if (!host) return undefined;
  return {
    peerHost: host,
    peerPort: Number(import.meta.env.VITE_PEER_PORT ?? 9000),
    path: '/peerjs',
    secure: false,
  };
}