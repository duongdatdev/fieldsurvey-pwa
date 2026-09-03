import { getDB } from '../indexedDB';
import { SurveyResponse, ResponseStatus } from '../../types/survey';

export const responseRepository = {
  async getAllResponses(): Promise<SurveyResponse[]> {
    const db = await getDB();
    const responses = await db.getAll('responses');
    return responses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getResponseById(id: string): Promise<SurveyResponse | undefined> {
    const db = await getDB();
    return db.get('responses', id);
  },

  async getResponsesBySurveyId(surveyId: string): Promise<SurveyResponse[]> {
    const db = await getDB();
    return db.getAllFromIndex('responses', 'by-surveyId', surveyId);
  },

  async getResponsesByStatus(status: ResponseStatus): Promise<SurveyResponse[]> {
    const db = await getDB();
    return db.getAllFromIndex('responses', 'by-status', status);
  },

  async saveResponse(response: SurveyResponse): Promise<void> {
    const db = await getDB();
    await db.put('responses', response);
  },

  async updateResponseStatus(
    id: string,
    status: ResponseStatus,
    syncedAt?: string,
    lastError?: string
  ): Promise<void> {
    const db = await getDB();
    const existing = await db.get('responses', id);
    if (!existing) return;

    existing.status = status;
    existing.updatedAt = new Date().toISOString();
    if (syncedAt) existing.syncedAt = syncedAt;
    if (lastError !== undefined) existing.lastError = lastError;
    if (status === 'failed') existing.retryCount = (existing.retryCount || 0) + 1;

    await db.put('responses', existing);
  },

  async deleteResponse(id: string): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(['responses', 'syncQueue'], 'readwrite');
    await tx.objectStore('responses').delete(id);
    const queueKeys = await tx.objectStore('syncQueue').index('by-responseId').getAllKeys(id);
    for (const key of queueKeys) {
      await tx.objectStore('syncQueue').delete(key);
    }
    await tx.done;
  },

  async getMetrics() {
    const db = await getDB();
    const surveys = await db.getAll('surveys');
    const responses = await db.getAll('responses');
    const pending = responses.filter((r) => r.status === 'pending' || r.status === 'syncing').length;
    const synced = responses.filter((r) => r.status === 'synced').length;
    const failed = responses.filter((r) => r.status === 'failed').length;

    return {
      totalSurveys: surveys.length,
      activeSurveys: surveys.filter((s) => s.status === 'active').length,
      totalResponses: responses.length,
      pendingSync: pending,
      syncedResponses: synced,
      failedResponses: failed,
    };
  },
};
