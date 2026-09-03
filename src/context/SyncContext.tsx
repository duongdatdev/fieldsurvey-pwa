import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SyncState } from '../components/layout/NetworkStatusBar';
import { syncManager, SyncProgressEvent } from '../services/syncManager';
import { syncQueueRepository } from '../db/repositories/syncQueueRepository';
import { requestBackgroundSync } from '../services/serviceWorkerRegistration';
import { networkService } from '../services/networkService';

interface SyncContextType {
  isOnline: boolean;
  syncState: SyncState;
  pendingCount: number;
  syncProgress: SyncProgressEvent | null;
  toastMessage: string | null;
  triggerSync: () => Promise<void>;
  refreshCounts: () => Promise<void>;
  dismissToast: () => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [syncState, setSyncState] = useState<SyncState>(navigator.onLine ? 'idle' : 'offline');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncProgress, setSyncProgress] = useState<SyncProgressEvent | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string, durationMs: number = 4000) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, durationMs);
  };

  const refreshCounts = useCallback(async () => {
    try {
      const count = await syncQueueRepository.getPendingCount();
      setPendingCount(count);
      if (count === 0 && syncState !== 'syncing' && navigator.onLine) {
        setSyncState('synced');
      } else if (count > 0 && syncState !== 'syncing' && navigator.onLine) {
        setSyncState('pending');
      }
    } catch (err) {
      console.error('Failed to refresh pending counts:', err);
    }
  }, [syncState]);

  const triggerSync = useCallback(async () => {
    if (!navigator.onLine) {
      showToast('Cannot sync while offline. Responses remain safe on device.');
      return;
    }

    try {
      setSyncState('syncing');
      const { syncedCount, failedCount } = await syncManager.syncPendingResponses();
      await refreshCounts();

      if (syncedCount > 0 && failedCount === 0) {
        showToast(`✓ Synchronization completed: ${syncedCount} response${syncedCount > 1 ? 's' : ''} sent to Google Sheets`);
      } else if (failedCount > 0) {
        showToast(`⚠ ${failedCount} response(s) failed to sync. Kept in queue for retry.`);
      }
    } catch (err) {
      console.error('Sync failed:', err);
      showToast('Synchronization error occurred.');
    }
  }, [refreshCounts]);

  // Subscribe to SyncManager events
  useEffect(() => {
    const unsubscribe = syncManager.subscribe((state, progress) => {
      setSyncState(state);
      if (progress) {
        setSyncProgress(progress);
      }
      refreshCounts();
    });
    return unsubscribe;
  }, [refreshCounts]);

  // Automatic Network Listeners (Unified Web & Native Capacitor)
  useEffect(() => {
    // Initial status check across Web/Native
    networkService.isOnline().then((online) => {
      setIsOnline(online);
      if (!online) setSyncState('offline');
    });

    // Unified subscription across Web & Native Capacitor
    const unsubscribeNetwork = networkService.subscribe(async (connected) => {
      if (connected) {
        setIsOnline(true);
        showToast('🟢 Connection restored. Synchronizing pending responses...', 4500);
        requestBackgroundSync();
        await triggerSync();
      } else {
        setIsOnline(false);
        setSyncState('offline');
        showToast('🔴 Connection lost. Offline mode active - responses will save locally.', 4500);
      }
    });

    // Listen for Service Worker background sync triggers
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'TRIGGER_BACKGROUND_SYNC') {
          console.info('[PWA] Received SW TRIGGER_BACKGROUND_SYNC event.');
          triggerSync();
        }
      });
    }

    // Initial check
    refreshCounts();

    return () => {
      unsubscribeNetwork();
    };
  }, [triggerSync, refreshCounts]);

  return (
    <SyncContext.Provider
      value={{
        isOnline,
        syncState,
        pendingCount,
        syncProgress,
        toastMessage,
        triggerSync,
        refreshCounts,
        dismissToast: () => setToastMessage(null),
      }}
    >
      {children}
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: '70px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 999,
            backgroundColor: 'var(--color-slate-900)',
            color: 'white',
            padding: '10px 18px',
            borderRadius: '9999px',
            boxShadow: 'var(--shadow-xl)',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            maxWidth: '90vw',
            border: '1px solid var(--border-strong)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-subtle)',
              cursor: 'pointer',
              marginLeft: '4px',
              fontSize: '1rem',
              fontWeight: 800,
            }}
          >
            ×
          </button>
        </div>
      )}
    </SyncContext.Provider>
  );
};

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
