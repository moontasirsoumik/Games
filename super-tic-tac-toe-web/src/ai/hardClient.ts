import { serializeState } from '@/game/rules';
import type { GameState, Move, Player } from '@/game/types';

let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./hardWorker.ts', import.meta.url), { type: 'module' });
  }
  return worker;
}

export function pickHardAsync(state: GameState, aiPlayer: Player, budgetMs = 750): Promise<Move> {
  return new Promise((resolve, reject) => {
    const w = getWorker();
    const onMessage = (ev: MessageEvent<{ move: Move }>) => {
      w.removeEventListener('message', onMessage);
      w.removeEventListener('error', onError);
      resolve(ev.data.move);
    };
    const onError = (e: ErrorEvent) => {
      w.removeEventListener('message', onMessage);
      w.removeEventListener('error', onError);
      reject(e.error ?? e.message);
    };
    w.addEventListener('message', onMessage);
    w.addEventListener('error', onError);
    w.postMessage({
      stateJson: serializeState(state),
      aiPlayer,
      budgetMs,
    });
  });
}