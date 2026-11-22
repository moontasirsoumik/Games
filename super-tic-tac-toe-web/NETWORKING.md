# Networking

Online play uses a small transport abstraction so the signaling layer can be replaced without rewriting game logic.

## Transport interface

See `src/network/transport.ts`:

- `connect(options)` — open signaling / data channel
- `send(payload)` — send a JSON-serializable wire message
- `onMessage(handler)` — incoming messages
- `onStatus(handler)` — `idle | connecting | connected | disconnected | error | room_full`
- `disconnect()`
- `isHost` — whether this peer created the room

Wire message shapes live in the same file (`WireMessage`).

## Current adapter: PeerJS

`src/network/peerTransport.ts` implements `GameTransport` with [PeerJS](https://peerjs.com/) and the public PeerServer at `0.peerjs.com`. WebRTC data channels carry game messages after signaling. ICE uses public Google STUN servers only.

Environment overrides for CI or self-hosted signaling:

- `VITE_PEER_HOST`
- `VITE_PEER_PORT` (default `9000` when host is set)
- Path is `/peerjs`, `secure: false` for local PeerServer

## Swapping in WebSockets (e.g. Cloudflare Durable Objects)

1. Implement `GameTransport` in a new file, e.g. `src/network/wsTransport.ts`, pointing at your worker URL.
2. Relay the same `WireMessage` payloads as JSON over the socket; the worker forwards between the two room members and enforces “room full” for a third connection.
3. In `onlineSession.ts`, replace `createPeerTransport(...)` with a factory that picks PeerJS vs WebSocket from config:

```ts
export function createTransport(opts: RoomOptions): GameTransport {
  if (import.meta.env.VITE_WS_URL) return createWsTransport(opts);
  return createPeerTransport(opts);
}
```

4. Keep **host-authoritative** validation in `OnlineSession` unchanged — only the pipe changes.

## NAT and TURN

STUN is enough for many home/mobile networks. Symmetric NAT or strict firewalls can prevent a direct WebRTC path; symptoms match the 15s connection timeout in the UI. Adding a TURN server (with credentials) to `iceServers` in `peerTransport.ts` fixes most of those cases. A WebSocket-only transport avoids WebRTC entirely but needs your server in the middle for all traffic.

## Room identity

Today the host Peer ID is `sttt-{ROOM_CODE}`. A WebSocket design can use the same room code as a Durable Object id or channel name so links and UI stay the same.