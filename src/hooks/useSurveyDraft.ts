import { useState, useEffect, useCallback } from 'react';
import { draftRepository } from '../db/repositories/draftRepository';
import { SurveyDraft } from '../types/survey';

export function useSurveyDraft(surveyId: string) {
  const [draft, setDraft] = useState<SurveyDraft | null>(null);
  const [hasDraft, setHasDraft] = useState<boolean>(false);
  const [loadingDraft, setLoadingDraft] = useState<boolean>(true);

  // Load draft on mount or surveyId change
  const checkDraft = useCallback(async () => {
    try {
      setLoadingDraft(true);
      const existing = await draftRepository.getDraft(surveyId);
      if (existing && existing.answers && Object.keys(existing.answers).length > 0) {
        setDraft(existing);
        setHasDraft(true);
      } else {
        setDraft(null);
        setHasDraft(false);
      }
    } catch (err) {
      console.error('Failed to load draft:', err);
    } finally {
      setLoadingDraft(false);
    }
  }, [surveyId]);

  useEffect(() => {
    checkDraft();
  }, [checkDraft]);

  // Save draft
  const saveDraft = useCallback(
    async (answers: Record<string, any>, currentStep: number) => {
      try {
        await draftRepository.saveDraft(surveyId, answers, currentStep);
        setHasDraft(true);
        setDraft({
          surveyId,
          answers,
          currentStep,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Failed to save draft:', err);
      }
    },
    [surveyId]
  );

  // Clear draft
  const clearDraft = useCallback(async () => {
    try {
      await draftRepository.deleteDraft(surveyId);
      setDraft(null);
      setHasDraft(false);
    } catch (err) {
      console.error('Failed to clear draft:', err);
    }
  }, [surveyId]);

  return {
    draft,
    hasDraft,
    loadingDraft,
    saveDraft,
    clearDraft,
    refreshDraft: checkDraft,
  };
}
