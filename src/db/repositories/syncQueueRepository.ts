import { getDB } from '../indexedDB';
import { SyncQueueItem, QueueItemStatus } from '../../types/survey';

export const syncQueueRepository = {
  async addToQueue(item: SyncQueueItem): Promise<void> {
    const db = await getDB();
    await db.put('syncQueue', item);
  },

  async getAllQueueItems(): Promise<SyncQueueItem[]> {
    const db = await getDB();
    return db.getAll('syncQueue');
  },

  async getPendingQueueItems(): Promise<SyncQueueItem[]> {
    const db = await getDB();
    const all = await db.getAll('syncQueue');
    return all.filter((item) => item.status === 'pending' || item.status === 'failed');
  },

  async updateItemStatus(
    id: string,
    status: QueueItemStatus,
    errorMessage?: string
  ): Promise<void> {
    const db = await getDB();
    const existing = await db.get('syncQueue', id);
    if (!existing) return;

    existing.status = status;
    existing.lastAttemptAt = new Date().toISOString();
    if (errorMessage !== undefined) existing.errorMessage = errorMessage;
    if (status === 'failed') existing.retryCount = (existing.retryCount || 0) + 1;

    await db.put('syncQueue', existing);
  },

  async removeItem(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('syncQueue', id);
  },

  async removeByResponseId(responseId: string): Promise<void> {
    const db = await getDB();
    const keys = await db.getAllKeysFromIndex('syncQueue', 'by-responseId', responseId);
    for (const k of keys) {
      await db.delete('syncQueue', k);
    }
  },

  async getPendingCount(): Promise<number> {
    const items = await this.getPendingQueueItems();
    return items.length;
  },
};
