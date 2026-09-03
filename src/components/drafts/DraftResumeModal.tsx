import React from 'react';
import { History, PlayCircle, Trash2 } from 'lucide-react';
import { SurveyDraft } from '../../types/survey';

interface DraftResumeModalProps {
  draft: SurveyDraft;
  totalQuestions: number;
  onResume: () => void;
  onDiscard: () => void;
}

export const DraftResumeModal: React.FC<DraftResumeModalProps> = ({
  draft,
  totalQuestions,
  onResume,
  onDiscard,
}) => {
  const answeredCount = Object.keys(draft.answers || {}).length;
  const formattedDate = new Date(draft.updatedAt).toLocaleString();

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '440px',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border-strong)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: 'var(--status-pending-bg)',
              color: 'var(--status-pending)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <History size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
              In-Progress Draft Detected
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Saved locally on {formattedDate}
            </span>
          </div>
        </div>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          You have an unfinished offline response for this survey.
          You previously completed <strong>{answeredCount} of {totalQuestions}</strong> questions.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={onResume}
            style={{ minHeight: '48px', fontSize: '0.95rem' }}
          >
            <PlayCircle size={18} />
            <span>Resume Where You Left Off</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={onDiscard}
            style={{ minHeight: '44px', color: 'var(--status-offline)' }}
          >
            <Trash2 size={16} />
            <span>Discard Draft & Start Fresh</span>
          </button>
        </div>
      </div>
    </div>
  );
};
