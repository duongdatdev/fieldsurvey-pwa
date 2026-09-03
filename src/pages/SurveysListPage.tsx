import React, { useEffect, useState } from 'react';
import { Survey } from '../types/survey';
import { surveyRepository } from '../db/repositories/surveyRepository';
import { draftRepository } from '../db/repositories/draftRepository';
import { ClipboardList, ArrowRight, Clock, PlusCircle } from 'lucide-react';

interface SurveysListPageProps {
  onSelectSurvey: (surveyId: string) => void;
  onGoToBuilder: () => void;
}

export const SurveysListPage: React.FC<SurveysListPageProps> = ({
  onSelectSurvey,
  onGoToBuilder,
}) => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [draftMap, setDraftMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const loadSurveys = async () => {
    try {
      setLoading(true);
      const list = await surveyRepository.getAllSurveys();
      setSurveys(list);

      // Check drafts
      const drafts = await draftRepository.getAllDrafts();
      const map: Record<string, boolean> = {};
      drafts.forEach((d) => {
        if (d.answers && Object.keys(d.answers).length > 0) {
          map[d.surveyId] = true;
        }
      });
      setDraftMap(map);
    } catch (err) {
      console.error('Failed to load surveys:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSurveys();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
        Loading offline field surveys...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, var(--color-primary-900), var(--color-primary-800))', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary-300)' }}>
            Offline Survey Catalog
          </span>
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.3, marginBottom: '6px' }}>
          Field Investigations
        </h2>
        <p style={{ fontSize: '0.86rem', color: 'var(--color-primary-100)', lineHeight: 1.5 }}>
          Pre-cached on this device. You can open and complete these forms anywhere without Internet access.
        </p>
      </div>

      {/* Survey Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {surveys.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
            <ClipboardList size={36} color="var(--text-subtle)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>No Surveys Available</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '6px 0 16px' }}>
              Create your first question-driven survey in the builder.
            </p>
            <button className="btn btn-primary" onClick={onGoToBuilder}>
              <PlusCircle size={18} />
              <span>Create New Survey</span>
            </button>
          </div>
        ) : (
          surveys.map((survey) => {
            const hasDraft = !!draftMap[survey.id];
            return (
              <div
                key={survey.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  cursor: 'pointer',
                  border: hasDraft ? '1.5px solid var(--status-pending)' : '1px solid var(--border-subtle)',
                }}
                onClick={() => onSelectSurvey(survey.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        backgroundColor: 'var(--accent-primary-soft)',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      {survey.topic}
                    </span>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '6px', color: 'var(--text-main)' }}>
                      {survey.title}
                    </h3>
                  </div>
                  {hasDraft && (
                    <span className="badge badge-pending" title="Unfinished draft stored on device">
                      <Clock size={12} />
                      <span>Draft Saved</span>
                    </span>
                  )}
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {survey.description}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                    Ready for offline field collection
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: 'var(--accent-primary)',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                    }}
                  >
                    <span>{hasDraft ? 'Resume Form' : 'Start Form'}</span>
                    <ArrowRight size={16} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
