import React, { useRef, useState } from 'react';
import { Question } from '../../types/survey';
import { Camera, Check, Star, X, Image as ImageIcon } from 'lucide-react';
import { compressImage } from '../../utils/imageCompression';
import { cameraService } from '../../services/cameraService';

interface QuestionRendererProps {
  question: Question;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  value,
  onChange,
  error,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);

  // Platform-aware photo capture trigger (Capacitor Native vs Web file input)
  const handleInitiatePhotoCapture = async () => {
    if (cameraService.isNative()) {
      try {
        setCompressing(true);
        const result = await cameraService.captureNativePhoto();
        if (result?.dataUrl) {
          onChange(result.dataUrl);
          return;
        }
      } catch (err) {
        console.warn('Native camera capture error, falling back to web file input:', err);
      } finally {
        setCompressing(false);
      }
    }
    // Web browser fallback
    fileInputRef.current?.click();
  };

  // Handle Web Browser Photo Capture & On-Device Compression
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCompressing(true);
      const result = await compressImage(file, 1200, 0.7);
      onChange(result.dataUrl);
    } catch (err) {
      console.error('Failed to compress image:', err);
      alert('Failed to process image. Please try again.');
    } finally {
      setCompressing(false);
    }
  };

  const handleClearPhoto = () => {
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Render question input by type
  const renderInput = () => {
    switch (question.type) {
      case 'shortText':
        return (
          <input
            type="text"
            className="form-input"
            placeholder={question.placeholder || 'Enter short answer...'}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );

      case 'longText':
        return (
          <textarea
            className="form-textarea"
            placeholder={question.placeholder || 'Enter detailed description or observations...'}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            className="form-input"
            placeholder={question.placeholder || 'Enter number...'}
            value={value !== undefined && value !== null ? value : ''}
            onChange={(e) => {
              const val = e.target.value;
              onChange(val === '' ? null : Number(val));
            }}
            min={question.min}
            max={question.max}
            step={question.step || 1}
          />
        );

      case 'singleChoice':
        return (
          <div className="options-grid">
            {(question.options || []).map((option, idx) => {
              const isSelected = value === option;
              return (
                <div
                  key={idx}
                  className={`option-chip ${isSelected ? 'selected' : ''}`}
                  onClick={() => onChange(option)}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                >
                  <div className="option-indicator">
                    {isSelected && <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'white' }} />}
                  </div>
                  <span className="option-label">{option}</span>
                </div>
              );
            })}
          </div>
        );

      case 'multipleChoice': {
        const selectedList: string[] = Array.isArray(value) ? value : [];
        const toggleOption = (option: string) => {
          if (selectedList.includes(option)) {
            onChange(selectedList.filter((item) => item !== option));
          } else {
            onChange([...selectedList, option]);
          }
        };

        return (
          <div className="options-grid">
            {(question.options || []).map((option, idx) => {
              const isSelected = selectedList.includes(option);
              return (
                <div
                  key={idx}
                  className={`option-chip ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleOption(option)}
                  role="checkbox"
                  aria-checked={isSelected}
                  tabIndex={0}
                >
                  <div className="option-indicator checkbox">
                    {isSelected && <Check size={14} strokeWidth={3} />}
                  </div>
                  <span className="option-label">{option}</span>
                </div>
              );
            })}
          </div>
        );
      }

      case 'yesNo':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {['Yes', 'No'].map((opt) => {
              const isSelected = value === opt;
              return (
                <button
                  type="button"
                  key={opt}
                  className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    minHeight: '52px',
                    fontSize: '1rem',
                    fontWeight: 700,
                  }}
                  onClick={() => onChange(opt)}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        );

      case 'rating': {
        const maxScore = question.max || 5;
        const currentScore = Number(value) || 0;
        return (
          <div className="rating-container">
            {Array.from({ length: maxScore }, (_, i) => i + 1).map((score) => {
              const isActive = score <= currentScore;
              return (
                <button
                  type="button"
                  key={score}
                  className="rating-btn"
                  onClick={() => onChange(score)}
                  title={`Rate ${score} of ${maxScore}`}
                >
                  <Star
                    size={32}
                    fill={isActive ? '#f59e0b' : 'transparent'}
                    stroke={isActive ? '#f59e0b' : 'var(--text-subtle)'}
                    strokeWidth={1.8}
                  />
                  <span className="rating-score">{score}</span>
                </button>
              );
            })}
          </div>
        );
      }

      case 'date':
        return (
          <input
            type="date"
            className="form-input"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );

      case 'time':
        return (
          <input
            type="time"
            className="form-input"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );

      case 'photo':
        return (
          <div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handlePhotoCapture}
            />

            {!value ? (
              <div
                onClick={handleInitiatePhotoCapture}
                style={{
                  border: '2px dashed var(--border-strong)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'var(--bg-surface-muted)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-primary-soft)',
                    color: 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Camera size={24} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    {compressing ? 'Compressing photo...' : 'Take Photo or Choose File'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Automatically compressed on-device for offline storage
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  position: 'relative',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'black',
                }}
              >
                <img
                  src={value}
                  alt="Captured field inspection"
                  style={{
                    width: '100%',
                    maxHeight: '260px',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
                <button
                  type="button"
                  onClick={handleClearPhoto}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'rgba(0,0,0,0.65)',
                    border: 'none',
                    color: 'white',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title="Remove Photo"
                >
                  <X size={18} />
                </button>
                <div
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '8px',
                    background: 'rgba(0,0,0,0.65)',
                    color: 'white',
                    fontSize: '0.72rem',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <ImageIcon size={12} />
                  <span>Compressed & Stored Locally</span>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return <div>Unsupported question type: {question.type}</div>;
    }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, lineHeight: 1.4, color: 'var(--text-main)' }}>
          {question.question}
          {question.required && <span className="required-badge" title="Required"> *</span>}
        </h3>
        <span
          style={{
            fontSize: '0.72rem',
            padding: '2px 8px',
            borderRadius: '9999px',
            backgroundColor: 'var(--bg-surface-muted)',
            color: 'var(--text-muted)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
          }}
        >
          {question.type}
        </span>
      </div>

      <div style={{ marginTop: '4px' }}>{renderInput()}</div>

      {error && (
        <div style={{ color: 'var(--status-offline)', fontSize: '0.8rem', fontWeight: 600 }}>
          {error}
        </div>
      )}
    </div>
  );
};
