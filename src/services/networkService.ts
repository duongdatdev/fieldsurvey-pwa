import { Capacitor } from '@capacitor/core';
import { Network, ConnectionStatus } from '@capacitor/network';

export type NetworkChangeCallback = (connected: boolean) => void;

export const networkService = {
  /**
   * Get current network connectivity status across both Web and Native platforms
   */
  async isOnline(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        const status: ConnectionStatus = await Network.getStatus();
        return status.connected;
      } catch (err) {
        console.warn('[NetworkService] Failed to get Capacitor network status:', err);
        return navigator.onLine;
      }
    }
    return navigator.onLine;
  },

  /**
   * Subscribe to network changes across both Web and Native Capacitor platforms.
   * Both feed into the SAME handler.
   */
  subscribe(callback: NetworkChangeCallback): () => void {
    let nativeListenerHandle: any = null;

    // 1. Native Capacitor Network Listener
    if (Capacitor.isNativePlatform()) {
      Network.addListener('networkStatusChange', (status) => {
        console.info('[NetworkService:Native] Network status changed:', status.connected);
        callback(status.connected);
      }).then((handle) => {
        nativeListenerHandle = handle;
      }).catch((err) => {
        console.warn('[NetworkService] Could not attach Capacitor network listener:', err);
      });
    }

    // 2. Standard Web Browser Online/Offline Listeners
    const handleOnline = () => {
      console.info('[NetworkService:Web] online event fired');
      callback(true);
    };

    const handleOffline = () => {
      console.info('[NetworkService:Web] offline event fired');
      callback(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Return unified unsubscription cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if (nativeListenerHandle) {
        nativeListenerHandle.remove();
      }
    };
  },
};
