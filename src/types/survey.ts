// FieldSurvey PWA Domain Models

export type QuestionType =
  | 'shortText'
  | 'longText'
  | 'number'
  | 'singleChoice'
  | 'multipleChoice'
  | 'yesNo'
  | 'rating'
  | 'date'
  | 'time'
  | 'photo';

export interface Question {
  id: string;
  surveyId: string;
  order: number;
  question: string;
  type: QuestionType;
  required: boolean;
  options?: string[]; // For singleChoice, multipleChoice
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

export type SurveyStatus = 'draft' | 'active' | 'archived';

export interface Survey {
  id: string;
  title: string;
  description: string;
  topic: string;
  status: SurveyStatus;
  createdAt: string;
  updatedAt: string;
  questions?: Question[];
}

export type ResponseStatus =
  | 'draft'
  | 'pending'
  | 'syncing'
  | 'synced'
  | 'failed';

export interface SurveyResponse {
  id: string; // UUID v4 for idempotency
  surveyId: string;
  answers: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  status: ResponseStatus;
  retryCount: number;
  syncedAt?: string;
  lastError?: string;
}

export type QueueOperation = 'create' | 'update';

export type QueueItemStatus = 'pending' | 'processing' | 'failed' | 'synced';

export interface SyncQueueItem {
  id: string;
  responseId: string;
  surveyId: string;
  operation: QueueOperation;
  createdAt: string;
  retryCount: number;
  status: QueueItemStatus;
  lastAttemptAt?: string;
  errorMessage?: string;
}

export interface SurveyDraft {
  surveyId: string;
  currentStep: number;
  answers: Record<string, any>;
  updatedAt: string;
}
