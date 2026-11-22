import { loadSettings } from '@/lib/settings';

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (!loadSettings().sound) return null;
  try {
    ctx ??= new AudioContext();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, ms: number, vol = 0.08): void {
  const c = getCtx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.value = freq;
  o.type = 'sine';
  g.gain.value = vol;
  o.connect(g);
  g.connect(c.destination);
  o.start();
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + ms / 1000);
  o.stop(c.currentTime + ms / 1000);
}

export function playPlace(player: 0 | 1): void {
  tone(player === 0 ? 520 : 420, 90);
}

export function playBoardWin(): void {
  tone(660, 80);
  setTimeout(() => tone(880, 120), 90);
}

export function playGameWin(): void {
  [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 140, 0.1), i * 120));
}