export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const { registerSW } = await import('virtual:pwa-register');
    registerSW({
      immediate: true,
      onRegisteredSW(_url, registration) {
        if (registration) {
          registration.update();
        }
      },
    });
  } catch {
    // PWA optional in dev
  }
}