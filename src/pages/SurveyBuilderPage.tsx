import React, { useState } from 'react';
import { Survey, Question, QuestionType } from '../types/survey';
import { surveyRepository } from '../db/repositories/surveyRepository';
import { generateUUID } from '../services/responseService';
import { QuestionRenderer } from '../components/questions/QuestionRenderer';
import { 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  Eye
} from 'lucide-react';

const QUESTION_TYPES: { type: QuestionType; label: string }[] = [
  { type: 'shortText', label: 'Short Text' },
  { type: 'longText', label: 'Long Text' },
  { type: 'number', label: 'Number' },
  { type: 'singleChoice', label: 'Single Choice' },
  { type: 'multipleChoice', label: 'Multiple Choice' },
  { type: 'yesNo', label: 'Yes / No' },
  { type: 'rating', label: 'Rating (1-5)' },
  { type: 'date', label: 'Date' },
  { type: 'time', label: 'Time' },
  { type: 'photo', label: 'Photo Upload' },
];

interface SurveyBuilderPageProps {
  onSurveyPublished: (surveyId: string) => void;
}

export const SurveyBuilderPage: React.FC<SurveyBuilderPageProps> = ({ onSurveyPublished }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topic, setTopic] = useState('Field Research');
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: generateUUID(),
      surveyId: '',
      order: 1,
      question: 'Investigator Name / ID',
      type: 'shortText',
      required: true,
      placeholder: 'Enter your ID or name',
    },
  ]);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, any>>({});
  const [isPublishing, setIsPublishing] = useState(false);

  // Add Question
  const handleAddQuestion = () => {
    const newQ: Question = {
      id: generateUUID(),
      surveyId: '',
      order: questions.length + 1,
      question: `New Question ${questions.length + 1}`,
      type: 'singleChoice',
      required: true,
      options: ['Option 1', 'Option 2', 'Option 3'],
    };
    setQuestions([...questions, newQ]);
  };

  // Delete Question
  const handleDeleteQuestion = (index: number) => {
    if (questions.length <= 1) {
      alert('Survey must contain at least one question.');
      return;
    }
    const updated = questions.filter((_, idx) => idx !== index).map((q, idx) => ({ ...q, order: idx + 1 }));
    setQuestions(updated);
  };

  // Move Question Up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const items = [...questions];
    const temp = items[index - 1];
    items[index - 1] = items[index];
    items[index] = temp;
    const reordered = items.map((q, idx) => ({ ...q, order: idx + 1 }));
    setQuestions(reordered);
  };

  // Move Question Down
  const handleMoveDown = (index: number) => {
    if (index === questions.length - 1) return;
    const items = [...questions];
    const temp = items[index + 1];
    items[index + 1] = items[index];
    items[index] = temp;
    const reordered = items.map((q, idx) => ({ ...q, order: idx + 1 }));
    setQuestions(reordered);
  };

  // Update Question Field
  const handleUpdateQuestion = (index: number, updates: Partial<Question>) => {
    const items = [...questions];
    items[index] = { ...items[index], ...updates };
    setQuestions(items);
  };

  // Update Question Options (for single/multiple choice)
  const handleOptionChange = (qIndex: number, optIndex: number, newVal: string) => {
    const q = questions[qIndex];
    const opts = [...(q.options || [])];
    opts[optIndex] = newVal;
    handleUpdateQuestion(qIndex, { options: opts });
  };

  const handleAddOption = (qIndex: number) => {
    const q = questions[qIndex];
    const opts = [...(q.options || []), `Option ${(q.options?.length || 0) + 1}`];
    handleUpdateQuestion(qIndex, { options: opts });
  };

  const handleRemoveOption = (qIndex: number, optIndex: number) => {
    const q = questions[qIndex];
    const opts = (q.options || []).filter((_, idx) => idx !== optIndex);
    handleUpdateQuestion(qIndex, { options: opts });
  };

  // Publish Survey
  const handlePublish = async () => {
    if (!title.trim()) {
      alert('Please enter a survey title.');
      return;
    }

    try {
      setIsPublishing(true);
      const surveyId = `survey-${generateUUID().slice(0, 8)}`;
      const now = new Date().toISOString();

      const newSurvey: Survey = {
        id: surveyId,
        title: title.trim(),
        description: description.trim() || 'Custom field survey created via builder.',
        topic: topic.trim() || 'General Investigation',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };

      const finalQuestions = questions.map((q, idx) => ({
        ...q,
        surveyId,
        order: idx + 1,
      }));

      await surveyRepository.saveSurvey(newSurvey, finalQuestions);
      alert(`Survey "${newSurvey.title}" published successfully to local offline database!`);
      onSurveyPublished(surveyId);
    } catch (err) {
      console.error('Failed to publish survey:', err);
      alert('Error saving survey.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Banner */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Survey Builder
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Define question-driven field forms
            </span>
          </div>
          <button
            className={`btn btn-sm ${previewMode ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye size={15} />
            <span>{previewMode ? 'Edit Mode' : 'Preview'}</span>
          </button>
        </div>

        {/* Survey Basic Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
          <div className="form-group">
            <label className="form-label">Survey Title *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Environmental Noise Audit"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={previewMode}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">Topic / Domain</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Environmental"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={previewMode}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <input
                type="text"
                className="form-input"
                value="Active (Offline Ready)"
                disabled
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description / Instructions</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Provide instructions for field investigators..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={previewMode}
            />
          </div>
        </div>
      </div>

      {/* Preview Mode */}
      {previewMode ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ padding: '8px 12px', backgroundColor: 'var(--accent-primary-soft)', color: 'var(--accent-primary)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', fontWeight: 600 }}>
            Live Interactive Preview - Showing {questions.length} questions
          </div>
          {questions.map((q) => (
            <QuestionRenderer
              key={q.id}
              question={q}
              value={previewAnswers[q.id]}
              onChange={(v) => setPreviewAnswers({ ...previewAnswers, [q.id]: v })}
            />
          ))}
        </div>
      ) : (
        /* Edit Mode: Questions List */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
              Questions ({questions.length})
            </h3>
            <button className="btn btn-secondary btn-sm" onClick={handleAddQuestion}>
              <Plus size={15} />
              <span>Add Question</span>
            </button>
          </div>

          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                borderLeft: '4px solid var(--accent-primary)',
              }}
            >
              {/* Question Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                  #{idx + 1}
                </span>

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 8px' }}
                    onClick={() => handleMoveUp(idx)}
                    disabled={idx === 0}
                    title="Move Up"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 8px' }}
                    onClick={() => handleMoveDown(idx)}
                    disabled={idx === questions.length - 1}
                    title="Move Down"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 8px', color: 'var(--status-offline)' }}
                    onClick={() => handleDeleteQuestion(idx)}
                    title="Delete Question"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Question Text & Type */}
              <div className="form-group">
                <label className="form-label">Question Text</label>
                <input
                  type="text"
                  className="form-input"
                  value={q.question}
                  onChange={(e) => handleUpdateQuestion(idx, { question: e.target.value })}
                  placeholder="Enter the question..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Question Type</label>
                  <select
                    className="form-select"
                    value={q.type}
                    onChange={(e) => {
                      const newType = e.target.value as QuestionType;
                      const updates: Partial<Question> = { type: newType };
                      if ((newType === 'singleChoice' || newType === 'multipleChoice') && (!q.options || q.options.length === 0)) {
                        updates.options = ['Option 1', 'Option 2'];
                      }
                      handleUpdateQuestion(idx, updates);
                    }}
                  >
                    {QUESTION_TYPES.map((t) => (
                      <option key={t.type} value={t.type}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ justifyContent: 'center' }}>
                  <label className="form-label">Settings</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', height: '44px' }}>
                    <input
                      type="checkbox"
                      checked={q.required}
                      onChange={(e) => handleUpdateQuestion(idx, { required: e.target.checked })}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
                    />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Required</span>
                  </label>
                </div>
              </div>

              {/* Options Editor for Choice Questions */}
              {(q.type === 'singleChoice' || q.type === 'multipleChoice') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  <label className="form-label">Options</label>
                  {(q.options || []).map((opt, oIdx) => (
                    <div key={oIdx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-input"
                        value={opt}
                        onChange={(e) => handleOptionChange(idx, oIdx, e.target.value)}
                        placeholder={`Option ${oIdx + 1}`}
                      />
                      {(q.options || []).length > 2 && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleRemoveOption(idx, oIdx)}
                          style={{ color: 'var(--status-offline)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ alignSelf: 'flex-start', marginTop: '2px' }}
                    onClick={() => handleAddOption(idx)}
                  >
                    <Plus size={14} />
                    <span>Add Option</span>
                  </button>
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleAddQuestion}
            style={{ borderStyle: 'dashed', minHeight: '48px' }}
          >
            <Plus size={18} />
            <span>Add Another Question</span>
          </button>
        </div>
      )}

      {/* Publish Bar */}
      <div style={{ marginTop: '8px' }}>
        <button
          type="button"
          className="btn btn-primary btn-block"
          style={{ minHeight: '50px', fontSize: '1rem' }}
          onClick={handlePublish}
          disabled={isPublishing}
        >
          <Check size={20} />
          <span>{isPublishing ? 'Publishing...' : 'Publish Survey to Device'}</span>
        </button>
      </div>
    </div>
  );
};
