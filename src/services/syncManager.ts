import { syncQueueRepository } from '../db/repositories/syncQueueRepository';
import { responseRepository } from '../db/repositories/responseRepository';
import { googleSheetsApi } from './googleSheetsApi';
import { SyncState } from '../components/layout/NetworkStatusBar';

export interface SyncProgressEvent {
  total: number;
  current: number;
  synced: number;
  failed: number;
}

type SyncListener = (state: SyncState, progress?: SyncProgressEvent) => void;

class SyncManager {
  private isSyncing = false;
  private listeners: Set<SyncListener> = new Set();
  private maxRetries = 5;

  /**
   * Subscribe to sync state changes
   */
  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(state: SyncState, progress?: SyncProgressEvent) {
    this.listeners.forEach((l) => {
      try {
        l(state, progress);
      } catch (err) {
        console.error('Error in sync listener:', err);
      }
    });
  }

  /**
   * Check if sync is currently in progress
   */
  public getIsSyncing(): boolean {
    return this.isSyncing;
  }

  /**
   * Process all pending items in the offline syncQueue
   */
  public async syncPendingResponses(): Promise<{ syncedCount: number; failedCount: number }> {
    // Prevent overlapping sync executions
    if (this.isSyncing) {
      console.warn('[SyncManager] Synchronization already active, skipping trigger.');
      return { syncedCount: 0, failedCount: 0 };
    }

    if (!navigator.onLine) {
      console.info('[SyncManager] Device is offline. Deferring sync.');
      this.notify('offline');
      return { syncedCount: 0, failedCount: 0 };
    }

    const pendingQueueItems = await syncQueueRepository.getPendingQueueItems();
    if (pendingQueueItems.length === 0) {
      this.notify('synced');
      return { syncedCount: 0, failedCount: 0 };
    }

    this.isSyncing = true;
    let syncedCount = 0;
    let failedCount = 0;
    const total = pendingQueueItems.length;

    this.notify('syncing', { total, current: 0, synced: 0, failed: 0 });

    try {
      for (let i = 0; i < pendingQueueItems.length; i++) {
        const queueItem = pendingQueueItems[i];

        this.notify('syncing', {
          total,
          current: i + 1,
          synced: syncedCount,
          failed: failedCount,
        });

        // 1. Fetch the full response from IndexedDB
        const response = await responseRepository.getResponseById(queueItem.responseId);
        if (!response) {
          // Orphan queue item
          await syncQueueRepository.removeItem(queueItem.id);
          continue;
        }

        // Set response local status to syncing
        await responseRepository.updateResponseStatus(response.id, 'syncing');
        await syncQueueRepository.updateItemStatus(queueItem.id, 'processing');

        try {
          // 2. Submit to Google Apps Script / Sheets API
          const apiResult = await googleSheetsApi.submitResponse(response);

          if (apiResult.success) {
            // SUCCESS FLOW
            const syncedTimestamp = apiResult.syncedAt || new Date().toISOString();

            // Mark response as synced
            await responseRepository.updateResponseStatus(
              response.id,
              'synced',
              syncedTimestamp,
              undefined
            );

            // Remove from syncQueue
            await syncQueueRepository.removeItem(queueItem.id);
            syncedCount++;
            console.info(`[SyncManager] Successfully synced response: ${response.id}`);
          } else {
            throw new Error(apiResult.error || 'Unknown remote rejection');
          }
        } catch (err: any) {
          // FAILURE FLOW
          failedCount++;
          const errorMsg = err.message || String(err);
          console.warn(`[SyncManager] Sync failed for response ${response.id}:`, errorMsg);

          const newRetryCount = (queueItem.retryCount || 0) + 1;
          const isExceeded = newRetryCount >= this.maxRetries;

          // Update response status to failed
          await responseRepository.updateResponseStatus(
            response.id,
            'failed',
            undefined,
            errorMsg
          );

          // Update queue item
          await syncQueueRepository.updateItemStatus(
            queueItem.id,
            isExceeded ? 'failed' : 'pending',
            errorMsg
          );
        }
      }
    } finally {
      this.isSyncing = false;
      const remainingPending = await syncQueueRepository.getPendingCount();

      if (remainingPending > 0) {
        this.notify('pending');
      } else {
        this.notify('synced');
      }
    }

    return { syncedCount, failedCount };
  }
}

export const syncManager = new SyncManager();
