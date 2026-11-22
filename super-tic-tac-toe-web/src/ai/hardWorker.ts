import { deserializeState } from '@/game/rules';
import type { Move, Player } from '@/game/types';
import { pickMCTS } from './mcts';

export interface HardRequest {
  stateJson: string;
  aiPlayer: Player;
  budgetMs?: number;
}

export interface HardResponse {
  move: Move;
}

self.onmessage = (ev: MessageEvent<HardRequest>) => {
  const { stateJson, aiPlayer, budgetMs } = ev.data;
  const state = deserializeState(stateJson);
  const move = pickMCTS(state, aiPlayer, budgetMs ?? 750);
  const msg: HardResponse = { move };
  self.postMessage(msg);
};