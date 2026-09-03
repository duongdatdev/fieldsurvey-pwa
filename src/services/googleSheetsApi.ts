import { SurveyResponse } from '../types/survey';

export interface SyncApiResponse {
  success: boolean;
  responseId?: string;
  syncedAt?: string;
  duplicate?: boolean;
  message?: string;
  error?: string;
}

const STORAGE_KEY_GAS_URL = 'field_survey_gas_url';
const STORAGE_KEY_MOCK_ENABLED = 'field_survey_mock_enabled';
const STORAGE_KEY_SIMULATED_FAIL = 'field_survey_simulate_failure';
const STORAGE_KEY_MOCK_SHEET_DATA = 'field_survey_mock_sheet_responses';

export const googleSheetsApi = {
  /**
   * Get configured Google Apps Script Web App URL
   */
  getGasUrl(): string {
    const stored = localStorage.getItem(STORAGE_KEY_GAS_URL);
    if (stored && stored.trim() !== '') {
      return stored.trim();
    }
    const envUrl = (import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL as string) || '';
    return envUrl.trim();
  },

  /**
   * Set Google Apps Script Web App URL
   */
  setGasUrl(url: string): void {
    localStorage.setItem(STORAGE_KEY_GAS_URL, url.trim());
  },

  /**
   * Check if Mock Mode is active
   */
  isMockMode(): boolean {
    const explicitMock = localStorage.getItem(STORAGE_KEY_MOCK_ENABLED);
    if (explicitMock !== null) {
      return explicitMock === 'true';
    }
    // Default to Real Google Sheets whenever a Web App URL is configured
    const url = this.getGasUrl();
    return !url;
  },

  /**
   * Toggle Mock Mode
   */
  setMockMode(enabled: boolean): void {
    localStorage.setItem(STORAGE_KEY_MOCK_ENABLED, String(enabled));
  },

  /**
   * Toggle Failure Simulation for testing retry
   */
  setSimulateFailure(enabled: boolean): void {
    localStorage.setItem(STORAGE_KEY_SIMULATED_FAIL, String(enabled));
  },

  isSimulateFailure(): boolean {
    return localStorage.getItem(STORAGE_KEY_SIMULATED_FAIL) === 'true';
  },

  /**
   * Submit single response to Google Sheets (or Mock Engine)
   */
  async submitResponse(response: SurveyResponse): Promise<SyncApiResponse> {
    // Check if network is offline on device
    if (!navigator.onLine) {
      throw new Error('Device is offline (network unavailable)');
    }

    // Check simulated failure setting
    if (this.isSimulateFailure()) {
      await new Promise((r) => setTimeout(r, 600));
      throw new Error('Simulated network/remote server failure (Retry testing)');
    }

    const gasUrl = this.getGasUrl();
    const useMock = this.isMockMode() || !gasUrl;

    if (useMock) {
      return this.submitToMockSheets(response);
    }

    // Live Google Apps Script Web App Submission
    try {
      const payload = {
        action: 'submitResponse',
        response: {
          id: response.id,
          surveyId: response.surveyId,
          answers: response.answers,
          createdAt: response.createdAt,
        },
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

      const res = await fetch(gasUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', // Prevents unnecessary preflight OPTIONS in GAS
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Google Apps Script HTTP ${res.status}: ${res.statusText}`);
      }

      const data: SyncApiResponse = await res.json();
      return data;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Google Apps Script request timed out (12s)');
      }
      throw new Error(`Failed to submit to Google Sheets: ${err.message || err}`);
    }
  },

  /**
   * High-fidelity Local Mock Google Sheets Engine
   * Simulates remote latency, sheet row insertion, and idempotency check.
   */
  async submitToMockSheets(response: SurveyResponse): Promise<SyncApiResponse> {
    // Realistic remote latency
    await new Promise((resolve) => setTimeout(resolve, 450));

    const existingRowsStr = localStorage.getItem(STORAGE_KEY_MOCK_SHEET_DATA) || '[]';
    const rows: Array<{
      responseId: string;
      surveyId: string;
      createdAt: string;
      syncedAt: string;
      answers: Record<string, any>;
    }> = JSON.parse(existingRowsStr);

    // Idempotency check: duplicate UUID detection
    const existingIndex = rows.findIndex((r) => r.responseId === response.id);
    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      console.warn(`[Mock Google Sheets] Idempotent hit: Response ${response.id} already exists in sheet.`);
      return {
        success: true,
        duplicate: true,
        responseId: response.id,
        syncedAt: now,
        message: 'Response already recorded (idempotent)',
      };
    }

    // Add row to simulated sheet
    rows.unshift({
      responseId: response.id,
      surveyId: response.surveyId,
      createdAt: response.createdAt,
      syncedAt: now,
      answers: response.answers,
    });

    localStorage.setItem(STORAGE_KEY_MOCK_SHEET_DATA, JSON.stringify(rows));
    console.info(`[Mock Google Sheets] Appended new row for response ${response.id}. Total rows: ${rows.length}`);

    return {
      success: true,
      duplicate: false,
      responseId: response.id,
      syncedAt: now,
      message: 'Successfully recorded in simulated Google Sheet',
    };
  },

  /**
   * Get simulated sheet rows (for live demo viewer)
   */
  getMockSheetRows(): Array<any> {
    const raw = localStorage.getItem(STORAGE_KEY_MOCK_SHEET_DATA);
    return raw ? JSON.parse(raw) : [];
  },

  /**
   * Clear simulated sheet rows
   */
  clearMockSheetRows(): void {
    localStorage.removeItem(STORAGE_KEY_MOCK_SHEET_DATA);
  },
};
