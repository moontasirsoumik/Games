# Super Tic Tac Toe (Web)

Mobile-friendly ultimate tic-tac-toe: online (PeerJS WebRTC) or pass-and-play. Plum menu, seagreen X/O styling, and icons ported from the PyQt edition in `../Super Tic Tac Toe/`.

## Develop

```bash
npm install
npm run dev
```

## Test

```bash
npm test
npm run test:e2e
```

## Build

```bash
VITE_BASE_PATH=/Games/super-tic-tac-toe-web/ npm run build
npm run preview   # serves with production base path
```

See [NETWORKING.md](./NETWORKING.md) for replacing PeerJS with WebSockets.

## Deploy

Pushing to `main` triggers `.github/workflows/deploy-super-tic-tac-toe-web.yml` when this folder changes. Requires GitHub Pages source set to **GitHub Actions** (see parent repo notes).