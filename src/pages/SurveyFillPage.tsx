import React, { useEffect, useState, useRef } from 'react';
import { Survey, Question } from '../types/survey';
import { surveyRepository } from '../db/repositories/surveyRepository';
import { useSurveyDraft } from '../hooks/useSurveyDraft';
import { DraftResumeModal } from '../components/drafts/DraftResumeModal';
import { DynamicSurveyForm } from '../components/form/DynamicSurveyForm';
import { responseService } from '../services/responseService';
import { useSync } from '../context/SyncContext';
import { CheckCircle2, CloudOff, ArrowLeft } from 'lucide-react';

interface SurveyFillPageProps {
  surveyId: string;
  onBack: () => void;
  onComplete: () => void;
}

export const SurveyFillPage: React.FC<SurveyFillPageProps> = ({
  surveyId,
  onBack,
  onComplete,
}) => {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [activeAnswers, setActiveAnswers] = useState<Record<string, any>>({});
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<{
    synced: boolean;
    responseId: string;
  } | null>(null);

  const hasCheckedDraftRef = useRef(false);

  const { isOnline, triggerSync, refreshCounts } = useSync();
  const { draft, hasDraft, loadingDraft, saveDraft, clearDraft } = useSurveyDraft(surveyId);

  // Load Survey & Questions
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const s = await surveyRepository.getSurveyById(surveyId);
        const q = await surveyRepository.getQuestionsBySurveyId(surveyId);
        setSurvey(s || null);
        setQuestions(q);
      } catch (err) {
        console.error('Failed to load survey details:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [surveyId]);

  // If draft exists, show resume dialog ONLY on initial load
  useEffect(() => {
    if (!loadingDraft) {
      if (!hasCheckedDraftRef.current) {
        hasCheckedDraftRef.current = true;
        if (hasDraft && draft && draft.answers && Object.keys(draft.answers).length > 0) {
          setShowDraftModal(true);
        }
      }
    }
  }, [loadingDraft, hasDraft, draft]);

  const handleResumeDraft = () => {
    if (draft) {
      setActiveAnswers(draft.answers || {});
      setActiveStep(draft.currentStep || 0);
    }
    setShowDraftModal(false);
  };

  const handleDiscardDraft = async () => {
    await clearDraft();
    setActiveAnswers({});
    setActiveStep(0);
    setShowDraftModal(false);
  };

  const handleSaveDraft = async (answers: Record<string, any>, currentStep: number) => {
    await saveDraft(answers, currentStep);
  };

  const handleSubmit = async (answers: Record<string, any>) => {
    try {
      setIsSubmitting(true);
      // 1. OFFLINE-FIRST: Save response to IndexedDB & enqueue
      const { response } = await responseService.submitResponse(surveyId, answers);

      // Refresh sync counters
      await refreshCounts();

      let syncedImmediately = false;

      // 2. If ONLINE, attempt immediate synchronization
      if (isOnline) {
        try {
          await triggerSync();
          syncedImmediately = true;
        } catch (syncErr) {
          console.warn('Immediate sync attempt encountered issue, kept in queue:', syncErr);
        }
      }

      setSubmissionSuccess({
        synced: syncedImmediately,
        responseId: response.id,
      });
    } catch (err) {
      console.error('Submission failed:', err);
      alert('Error submitting survey response. Data was not lost.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
        Loading survey questions...
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
        <h3>Survey Not Found</h3>
        <button className="btn btn-secondary" onClick={onBack} style={{ marginTop: '12px' }}>
          Return to Catalog
        </button>
      </div>
    );
  }

  // Submission Complete View
  if (submissionSuccess) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '36px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: submissionSuccess.synced ? 'var(--status-online-bg)' : 'var(--status-pending-bg)',
            color: submissionSuccess.synced ? 'var(--status-online)' : 'var(--status-pending)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {submissionSuccess.synced ? <CheckCircle2 size={32} /> : <CloudOff size={32} />}
        </div>

        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {submissionSuccess.synced ? 'Submission Synchronized!' : 'Response Saved Locally'}
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.5 }}>
            {submissionSuccess.synced
              ? 'Your field response has been safely transmitted to the centralized Google Sheets database.'
              : 'Device is offline. Your response is safely stored in local IndexedDB and will synchronize automatically when connection returns.'}
          </p>
        </div>

        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-surface-muted)',
            width: '100%',
            fontSize: '0.78rem',
            textAlign: 'left',
          }}
        >
          <div style={{ color: 'var(--text-muted)' }}>Response UUID:</div>
          <div className="mono" style={{ fontWeight: 600, wordBreak: 'break-all', marginTop: '2px' }}>
            {submissionSuccess.responseId}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '8px' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onBack}>
            <ArrowLeft size={16} />
            <span>Surveys</span>
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={onComplete}>
            <span>View Responses</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {showDraftModal && draft && (
        <DraftResumeModal
          draft={draft}
          totalQuestions={questions.length}
          onResume={handleResumeDraft}
          onDiscard={handleDiscardDraft}
        />
      )}

      <DynamicSurveyForm
        key={`${survey.id}-${activeStep}`}
        survey={survey}
        questions={questions}
        initialAnswers={activeAnswers}
        initialStep={activeStep}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmit}
        onCancel={onBack}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};
