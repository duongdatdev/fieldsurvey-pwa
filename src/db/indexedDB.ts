import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Survey, Question, SurveyResponse, SyncQueueItem, SurveyDraft } from '../types/survey';
import { SEED_SURVEYS, SEED_QUESTIONS } from './seedData';

export interface FieldSurveyDB extends DBSchema {
  surveys: {
    key: string;
    value: Survey;
    indexes: {
      'by-topic': string;
      'by-status': string;
      'by-updatedAt': string;
    };
  };
  questions: {
    key: string;
    value: Question;
    indexes: {
      'by-surveyId': string;
    };
  };
  responses: {
    key: string;
    value: SurveyResponse;
    indexes: {
      'by-surveyId': string;
      'by-status': string;
      'by-createdAt': string;
    };
  };
  syncQueue: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      'by-responseId': string;
      'by-status': string;
      'by-createdAt': string;
    };
  };
  drafts: {
    key: string; // surveyId
    value: SurveyDraft;
    indexes: {
      'by-updatedAt': string;
    };
  };
}

const DB_NAME = 'field-survey-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<FieldSurveyDB>> | null = null;

export async function getDB(): Promise<IDBPDatabase<FieldSurveyDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FieldSurveyDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // 1. Surveys store
        if (!db.objectStoreNames.contains('surveys')) {
          const surveyStore = db.createObjectStore('surveys', { keyPath: 'id' });
          surveyStore.createIndex('by-topic', 'topic');
          surveyStore.createIndex('by-status', 'status');
          surveyStore.createIndex('by-updatedAt', 'updatedAt');
        }

        // 2. Questions store
        if (!db.objectStoreNames.contains('questions')) {
          const questionStore = db.createObjectStore('questions', { keyPath: 'id' });
          questionStore.createIndex('by-surveyId', 'surveyId');
        }

        // 3. Responses store
        if (!db.objectStoreNames.contains('responses')) {
          const responseStore = db.createObjectStore('responses', { keyPath: 'id' });
          responseStore.createIndex('by-surveyId', 'surveyId');
          responseStore.createIndex('by-status', 'status');
          responseStore.createIndex('by-createdAt', 'createdAt');
        }

        // 4. Sync Queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const queueStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          queueStore.createIndex('by-responseId', 'responseId');
          queueStore.createIndex('by-status', 'status');
          queueStore.createIndex('by-createdAt', 'createdAt');
        }

        // 5. Drafts store
        if (!db.objectStoreNames.contains('drafts')) {
          const draftStore = db.createObjectStore('drafts', { keyPath: 'surveyId' });
          draftStore.createIndex('by-updatedAt', 'updatedAt');
        }
      },
    });

    // Seed initial demo data if newly initialized or update questions if upgraded
    const db = await dbPromise;
    const count = await db.count('surveys');
    if (count === 0) {
      const tx = db.transaction(['surveys', 'questions'], 'readwrite');
      for (const survey of SEED_SURVEYS) {
        await tx.objectStore('surveys').put(survey);
      }
      for (const question of SEED_QUESTIONS) {
        await tx.objectStore('questions').put(question);
      }
      await tx.done;
      console.info('[IndexedDB] Seeded demo surveys and questions into field-survey-db');
    } else {
      // Ensure campus facility survey questions match latest VKU requirements
      const checkQ = await db.get('questions', 'q-fac-2');
      if (!checkQ || checkQ.question !== 'Floor') {
        const tx = db.transaction(['questions'], 'readwrite');
        const qStore = tx.objectStore('questions');
        for (const question of SEED_QUESTIONS) {
          if (question.surveyId === 'survey-campus-facility-inspection') {
            await qStore.put(question);
          }
        }
        await tx.done;
        console.info('[IndexedDB] Synchronized VKU Campus Facility questions');
      }
    }
  }

  return dbPromise;
}
