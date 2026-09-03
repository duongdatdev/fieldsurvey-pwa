import { getDB } from '../indexedDB';
import { Survey, Question } from '../../types/survey';

export const surveyRepository = {
  async getAllSurveys(): Promise<Survey[]> {
    const db = await getDB();
    return db.getAll('surveys');
  },

  async getSurveyById(id: string): Promise<Survey | undefined> {
    const db = await getDB();
    return db.get('surveys', id);
  },

  async getQuestionsBySurveyId(surveyId: string): Promise<Question[]> {
    const db = await getDB();
    const questions = await db.getAllFromIndex('questions', 'by-surveyId', surveyId);
    return questions.sort((a, b) => a.order - b.order);
  },

  async saveSurvey(survey: Survey, questions: Question[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(['surveys', 'questions'], 'readwrite');
    await tx.objectStore('surveys').put(survey);

    // Remove existing questions for this survey to avoid orphans
    const existing = await tx.objectStore('questions').index('by-surveyId').getAllKeys(survey.id);
    for (const key of existing) {
      await tx.objectStore('questions').delete(key);
    }

    for (const q of questions) {
      await tx.objectStore('questions').put(q);
    }
    await tx.done;
  },

  async deleteSurvey(id: string): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(['surveys', 'questions'], 'readwrite');
    await tx.objectStore('surveys').delete(id);
    const existingQuestions = await tx.objectStore('questions').index('by-surveyId').getAllKeys(id);
    for (const key of existingQuestions) {
      await tx.objectStore('questions').delete(key);
    }
    await tx.done;
  },
};
