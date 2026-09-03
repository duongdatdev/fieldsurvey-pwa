import { getDB } from '../indexedDB';
import { SurveyDraft } from '../../types/survey';

export const draftRepository = {
  async saveDraft(surveyId: string, answers: Record<string, any>, currentStep: number): Promise<void> {
    const db = await getDB();
    const draft: SurveyDraft = {
      surveyId,
      answers,
      currentStep,
      updatedAt: new Date().toISOString(),
    };
    await db.put('drafts', draft);
  },

  async getDraft(surveyId: string): Promise<SurveyDraft | undefined> {
    const db = await getDB();
    return db.get('drafts', surveyId);
  },

  async deleteDraft(surveyId: string): Promise<void> {
    const db = await getDB();
    await db.delete('drafts', surveyId);
  },

  async getAllDrafts(): Promise<SurveyDraft[]> {
    const db = await getDB();
    return db.getAll('drafts');
  },
};
