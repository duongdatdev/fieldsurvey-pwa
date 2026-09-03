/**
 * Service Worker Registration and Lifecycle Manager
 */

export function registerServiceWorker(onUpdate?: (registration: ServiceWorkerRegistration) => void) {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log('[PWA] Service Worker successfully registered with scope:', registration.scope);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New update available. Prompting reload.');
                if (onUpdate) onUpdate(registration);
              }
            });
          }
        });
      } catch (error) {
        console.error('[PWA] Service Worker registration failed:', error);
      }
    });
  }
}

/**
 * Register Background Sync Tag if supported by browser
 */
export async function requestBackgroundSync(): Promise<boolean> {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      // @ts-expect-error - SyncManager is standard in Chrome PWA
      await reg.sync.register('sync-field-responses');
      console.log('[PWA] Background Sync tag registered: sync-field-responses');
      return true;
    } catch (err) {
      console.warn('[PWA] Background Sync registration error:', err);
      return false;
    }
  }
  return false;
}
