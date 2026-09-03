import { responseRepository } from '../db/repositories/responseRepository';
import { syncQueueRepository } from '../db/repositories/syncQueueRepository';
import { draftRepository } from '../db/repositories/draftRepository';
import { SurveyResponse, SyncQueueItem } from '../types/survey';

/**
 * Generate standard UUID v4
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback RFC4122 v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const responseService = {
  /**
   * Submit a field survey response.
   * OFFLINE-FIRST: Always persists to IndexedDB first, enqueues to syncQueue,
   * then caller attempts network synchronization if online.
   */
  async submitResponse(
    surveyId: string,
    answers: Record<string, any>
  ): Promise<{ response: SurveyResponse; queueItem: SyncQueueItem }> {
    const now = new Date().toISOString();
    const responseId = generateUUID();
    const queueItemId = generateUUID();

    const response: SurveyResponse = {
      id: responseId,
      surveyId,
      answers,
      createdAt: now,
      updatedAt: now,
      status: 'pending',
      retryCount: 0,
    };

    const queueItem: SyncQueueItem = {
      id: queueItemId,
      responseId,
      surveyId,
      operation: 'create',
      createdAt: now,
      retryCount: 0,
      status: 'pending',
    };

    // 1. Persist response locally to IndexedDB
    await responseRepository.saveResponse(response);

    // 2. Persist queue operation to IndexedDB
    await syncQueueRepository.addToQueue(queueItem);

    // 3. Clear completed draft for this survey
    await draftRepository.deleteDraft(surveyId);

    console.info(`[ResponseService] Response ${responseId} saved locally and queued for synchronization.`);

    return { response, queueItem };
  },

  /**
   * Retry failed or pending response synchronization
   */
  async retryResponse(responseId: string): Promise<void> {
    const response = await responseRepository.getResponseById(responseId);
    if (!response) {
      throw new Error(`Response ${responseId} not found`);
    }

    // Set status back to pending
    await responseRepository.updateResponseStatus(responseId, 'pending', undefined, undefined);

    // Ensure queue has a pending item for this response
    const existingItems = await syncQueueRepository.getAllQueueItems();
    const existingQueueItem = existingItems.find((item) => item.responseId === responseId);

    if (existingQueueItem) {
      await syncQueueRepository.updateItemStatus(existingQueueItem.id, 'pending', undefined);
    } else {
      const queueItem: SyncQueueItem = {
        id: generateUUID(),
        responseId,
        surveyId: response.surveyId,
        operation: 'create',
        createdAt: new Date().toISOString(),
        retryCount: 0,
        status: 'pending',
      };
      await syncQueueRepository.addToQueue(queueItem);
    }
  },

  /**
   * Delete response from device
   */
  async deleteResponse(responseId: string): Promise<void> {
    await responseRepository.deleteResponse(responseId);
  },

  /**
   * Get all responses
   */
  async getResponses(): Promise<SurveyResponse[]> {
    return responseRepository.getAllResponses();
  },

  /**
   * Get single response by ID
   */
  async getResponse(responseId: string): Promise<SurveyResponse | undefined> {
    return responseRepository.getResponseById(responseId);
  },
};
