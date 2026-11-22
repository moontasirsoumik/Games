export function hapticLight(): void {
  try {
    navigator.vibrate?.(12);
  } catch {
    /* unsupported */
  }
}

export function hapticMedium(): void {
  try {
    navigator.vibrate?.([18, 40, 18]);
  } catch {
    /* unsupported */
  }
}

export function hapticWin(): void {
  try {
    navigator.vibrate?.([30, 50, 30, 50, 60]);
  } catch {
    /* unsupported */
  }
}