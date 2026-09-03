import React, { useState } from 'react';
import { Survey, Question } from '../../types/survey';
import { QuestionRenderer } from '../questions/QuestionRenderer';
import { ArrowLeft, ArrowRight, Save, Send, Eye } from 'lucide-react';

interface DynamicSurveyFormProps {
  survey: Survey;
  questions: Question[];
  initialAnswers?: Record<string, any>;
  initialStep?: number;
  onSaveDraft: (answers: Record<string, any>, currentStep: number) => void;
  onSubmit: (answers: Record<string, any>) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export const DynamicSurveyForm: React.FC<DynamicSurveyFormProps> = ({
  survey,
  questions,
  initialAnswers = {},
  initialStep = 0,
  onSaveDraft,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [answers, setAnswers] = useState<Record<string, any>>(initialAnswers);
  const [currentStep, setCurrentStep] = useState<number>(initialStep);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isReviewMode, setIsReviewMode] = useState<boolean>(false);

  // Sort questions by order
  const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);
  const totalQuestions = sortedQuestions.length;
  const currentQuestion = sortedQuestions[currentStep];

  const handleAnswerChange = (questionId: string, val: any) => {
    const updated = { ...answers, [questionId]: val };
    setAnswers(updated);
    if (errors[questionId]) {
      const updatedErrors = { ...errors };
      delete updatedErrors[questionId];
      setErrors(updatedErrors);
    }
  };

  // Validate a single question
  const validateQuestion = (q: Question): boolean => {
    if (!q.required) return true;
    const val = answers[q.id];
    if (val === undefined || val === null || val === '') {
      setErrors((prev) => ({ ...prev, [q.id]: 'This field is required' }));
      return false;
    }
    if (Array.isArray(val) && val.length === 0) {
      setErrors((prev) => ({ ...prev, [q.id]: 'Please select at least one option' }));
      return false;
    }
    return true;
  };

  // Step Navigation
  const handleNext = () => {
    if (currentQuestion && !validateQuestion(currentQuestion)) {
      return;
    }

    if (currentStep < totalQuestions - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      setIsReviewMode(true);
    }
  };

  const handlePrevious = () => {
    if (isReviewMode) {
      setIsReviewMode(false);
    } else if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleFinalSubmit = () => {
    // Validate all required questions
    const newErrors: Record<string, string> = {};
    for (const q of sortedQuestions) {
      if (q.required) {
        const val = answers[q.id];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          newErrors[q.id] = 'This field is required';
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsReviewMode(true);
      return;
    }

    onSubmit(answers);
  };

  const handleManualDraftSave = () => {
    onSaveDraft(answers, currentStep);
  };

  const progressPercentage = totalQuestions > 0 
    ? Math.round(((currentStep + 1) / totalQuestions) * 100)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header bar */}
      <div className="card" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <span className="badge" style={{ backgroundColor: 'var(--accent-primary-soft)', color: 'var(--accent-primary)' }}>
              {survey.topic}
            </span>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '4px', color: 'var(--text-main)' }}>
              {survey.title}
            </h2>
          </div>
          {onCancel && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
              Exit
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div style={{ marginTop: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            <span>
              {isReviewMode ? 'Reviewing Submission' : `Question ${currentStep + 1} of ${totalQuestions}`}
            </span>
            <span>{isReviewMode ? '100%' : `${progressPercentage}%`}</span>
          </div>
          <div style={{ height: '6px', backgroundColor: 'var(--border-subtle)', borderRadius: '9999px', overflow: 'hidden' }}>
            <div
              style={{
                width: isReviewMode ? '100%' : `${progressPercentage}%`,
                height: '100%',
                backgroundColor: 'var(--accent-primary)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      </div>

      {/* Main question view or review view */}
      {!isReviewMode && currentQuestion ? (
        <div>
          <QuestionRenderer
            question={currentQuestion}
            value={answers[currentQuestion.id]}
            onChange={(val) => handleAnswerChange(currentQuestion.id, val)}
            error={errors[currentQuestion.id]}
          />
        </div>
      ) : (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <Eye size={20} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Review Answers Before Submitting</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sortedQuestions.map((q, idx) => {
              const val = answers[q.id];
              const isFilled = val !== undefined && val !== null && val !== '';
              const hasError = !!errors[q.id];

              return (
                <div
                  key={q.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: hasError ? 'var(--status-offline-bg)' : 'var(--bg-surface-muted)',
                    border: `1px solid ${hasError ? 'var(--status-offline-border)' : 'var(--border-subtle)'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    <span>Q{idx + 1}: {q.question}</span>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: 700, cursor: 'pointer', fontSize: '0.78rem' }}
                      onClick={() => {
                        setCurrentStep(idx);
                        setIsReviewMode(false);
                      }}
                    >
                      Edit
                    </button>
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '0.92rem', fontWeight: 500, color: isFilled ? 'var(--text-main)' : 'var(--text-subtle)' }}>
                    {q.type === 'photo' && val ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <img src={val} alt="Attached thumbnail" style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover' }} />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>[Photo Attached]</span>
                      </div>
                    ) : Array.isArray(val) ? (
                      val.join(', ') || 'No options selected'
                    ) : (
                      String(val || '(Unanswered)')
                    )}
                  </div>
                  {hasError && (
                    <div style={{ color: 'var(--status-offline)', fontSize: '0.75rem', marginTop: '4px', fontWeight: 600 }}>
                      {errors[q.id]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation Controls (Mobile Ergonomic) */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ flex: 1 }}
          onClick={handlePrevious}
          disabled={currentStep === 0 && !isReviewMode}
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: '10px 14px' }}
          onClick={handleManualDraftSave}
          title="Save Draft Locally"
        >
          <Save size={18} />
          <span style={{ display: 'none' }}>Save</span>
        </button>

        {!isReviewMode ? (
          <button
            type="button"
            className="btn btn-primary"
            style={{ flex: 2 }}
            onClick={handleNext}
          >
            <span>{currentStep === totalQuestions - 1 ? 'Review' : 'Next'}</span>
            <ArrowRight size={18} />
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            style={{ flex: 2 }}
            onClick={handleFinalSubmit}
            disabled={isSubmitting}
          >
            <Send size={18} />
            <span>{isSubmitting ? 'Saving...' : 'Submit Response'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
