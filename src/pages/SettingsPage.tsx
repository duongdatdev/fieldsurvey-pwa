import React, { useState, useEffect } from 'react';
import { googleSheetsApi } from '../services/googleSheetsApi';
import { 
  Database, 
  Cloud, 
  RefreshCw, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle,
  Trash2
} from 'lucide-react';
import { getDB } from '../db/indexedDB';
import { SEED_SURVEYS, SEED_QUESTIONS } from '../db/seedData';
import { useSync } from '../context/SyncContext';

export const SettingsPage: React.FC = () => {
  const [gasUrl, setGasUrl] = useState('');
  const [mockMode, setMockMode] = useState(true);
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [mockRows, setMockRows] = useState<any[]>([]);

  const { refreshCounts } = useSync();

  useEffect(() => {
    setGasUrl(googleSheetsApi.getGasUrl());
    setMockMode(googleSheetsApi.isMockMode());
    setSimulateFailure(googleSheetsApi.isSimulateFailure());
    setMockRows(googleSheetsApi.getMockSheetRows());
  }, []);

  const handleSaveGasUrl = () => {
    googleSheetsApi.setGasUrl(gasUrl);
    setMockMode(googleSheetsApi.isMockMode());
    alert('Google Apps Script Web App URL updated.');
  };

  const handleToggleMock = (enabled: boolean) => {
    setMockMode(enabled);
    googleSheetsApi.setMockMode(enabled);
  };

  const handleToggleSimulateFailure = (enabled: boolean) => {
    setSimulateFailure(enabled);
    googleSheetsApi.setSimulateFailure(enabled);
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);

      if (mockMode) {
        await new Promise((r) => setTimeout(r, 400));
        setTestResult({
          success: true,
          message: 'Mock Google Sheets Engine is ACTIVE and ready to receive field submissions.',
        });
      } else {
        if (!gasUrl) {
          throw new Error('Please enter a Google Apps Script Web App URL first.');
        }
        const pingUrl = `${gasUrl}?action=ping`;
        const res = await fetch(pingUrl);
        const data = await res.json();
        if (data.status === 'READY' || data.success) {
          setTestResult({
            success: true,
            message: `Connected successfully to Google Apps Script! (${data.service || 'Ready'})`,
          });
        } else {
          throw new Error(data.error || 'Server reported not ready');
        }
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Connection failed: ${err.message || err}`,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleClearMockRows = () => {
    googleSheetsApi.clearMockSheetRows();
    setMockRows([]);
  };

  const handleResetDatabase = async () => {
    if (confirm('Reset local IndexedDB and re-seed with standard university surveys?')) {
      const db = await getDB();
      const tx = db.transaction(['surveys', 'questions', 'responses', 'syncQueue', 'drafts'], 'readwrite');
      await tx.objectStore('surveys').clear();
      await tx.objectStore('questions').clear();
      await tx.objectStore('responses').clear();
      await tx.objectStore('syncQueue').clear();
      await tx.objectStore('drafts').clear();

      for (const s of SEED_SURVEYS) {
        await tx.objectStore('surveys').put(s);
      }
      for (const q of SEED_QUESTIONS) {
        await tx.objectStore('questions').put(q);
      }
      await tx.done;

      googleSheetsApi.clearMockSheetRows();
      setMockRows([]);
      await refreshCounts();
      alert('IndexedDB reset and reseeded with demo surveys!');
      window.location.reload();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Banner */}
      <div className="card">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
          Platform Configuration
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Manage cloud synchronization settings, Google Apps Script integration, and demo modes.
        </p>
      </div>

      {/* Cloud Integration Mode */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Cloud size={20} color="var(--accent-primary)" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Google Sheets Backend</h3>
        </div>

        {/* Mock Mode Switch */}
        <div
          style={{
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: mockMode ? 'var(--status-syncing-bg)' : 'var(--bg-surface-muted)',
            border: `1px solid ${mockMode ? 'var(--status-syncing-border)' : 'var(--border-subtle)'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
              Simulated Google Sheets Engine
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Zero-setup local simulator for instant presentation testing without Google credentials
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={mockMode}
              onChange={(e) => handleToggleMock(e.target.checked)}
              style={{ width: '22px', height: '22px', accentColor: 'var(--accent-primary)' }}
            />
          </label>
        </div>

        {/* Live Google Apps Script Web App URL */}
        <div className="form-group" style={{ opacity: mockMode ? 0.6 : 1 }}>
          <label className="form-label">
            <span>Live Google Apps Script Web App URL</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 400 }}>
              (Ends in /exec)
            </span>
          </label>
          <input
            type="url"
            className="form-input"
            placeholder="https://script.google.com/macros/s/.../exec"
            value={gasUrl}
            onChange={(e) => setGasUrl(e.target.value)}
            disabled={mockMode}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleSaveGasUrl}
              disabled={mockMode}
            >
              Save URL
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleTestConnection}
              disabled={testing}
            >
              <RefreshCw size={14} className={testing ? 'status-dot syncing' : ''} />
              <span>{testing ? 'Testing...' : 'Test Connection'}</span>
            </button>
          </div>
        </div>

        {testResult && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: testResult.success ? 'var(--status-online-bg)' : 'var(--status-offline-bg)',
              color: testResult.success ? '#065f46' : '#9f1239',
              border: `1px solid ${testResult.success ? 'var(--status-online-border)' : 'var(--status-offline-border)'}`,
              fontSize: '0.82rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{testResult.message}</span>
          </div>
        )}
      </div>

      {/* Retry & Failure Testing Toggle (Required for Demo Scenario Step 12) */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} color="var(--status-pending)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Fault-Tolerance Demonstration</h3>
        </div>

        <div
          style={{
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: simulateFailure ? 'var(--status-offline-bg)' : 'var(--bg-surface-muted)',
            border: `1px solid ${simulateFailure ? 'var(--status-offline-border)' : 'var(--border-subtle)'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: simulateFailure ? '#9f1239' : 'var(--text-main)' }}>
              Simulate Network / Remote Cloud Failure
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Forces sync attempts to fail, demonstrating retry queue & failed status resilience
            </div>
          </div>
          <input
            type="checkbox"
            checked={simulateFailure}
            onChange={(e) => handleToggleSimulateFailure(e.target.checked)}
            style={{ width: '20px', height: '20px', accentColor: 'var(--status-offline)' }}
          />
        </div>
      </div>

      {/* Simulated Google Sheet Rows Inspector */}
      {mockMode && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileSpreadsheet size={18} color="var(--status-online)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                Simulated Google Sheet: "Responses" ({mockRows.length})
              </h3>
            </div>
            {mockRows.length > 0 && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleClearMockRows}
                style={{ color: 'var(--status-offline)' }}
              >
                <Trash2 size={14} />
                <span>Clear Sheet</span>
              </button>
            )}
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            This live inspector reflects the exact rows received by the remote mock Google Sheets API.
          </p>

          {mockRows.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '0.82rem', backgroundColor: 'var(--bg-surface-muted)', borderRadius: 'var(--radius-md)' }}>
              Sheet is currently empty. Submit a survey to see rows populate here.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: '240px' }}>
              <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-primary-800)', color: 'white' }}>
                    <th style={{ padding: '6px 8px' }}>Row</th>
                    <th style={{ padding: '6px 8px' }}>Response ID (UUID)</th>
                    <th style={{ padding: '6px 8px' }}>Survey ID</th>
                    <th style={{ padding: '6px 8px' }}>Synced At</th>
                  </tr>
                </thead>
                <tbody>
                  {mockRows.map((r, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 700 }}>#{idx + 2}</td>
                      <td className="mono" style={{ padding: '6px 8px' }}>{r.responseId.slice(0, 10)}...</td>
                      <td style={{ padding: '6px 8px' }}>{r.surveyId}</td>
                      <td style={{ padding: '6px 8px' }}>{new Date(r.syncedAt).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Database Maintenance */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={18} color="var(--text-muted)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Database Maintenance</h3>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Reset local IndexedDB storage (clears responses, queue, drafts) and reload default university demonstration surveys.
        </p>
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleResetDatabase}
          style={{ alignSelf: 'flex-start', color: 'var(--status-offline)' }}
        >
          <Trash2 size={14} />
          <span>Reset & Reseed Demo Data</span>
        </button>
      </div>
    </div>
  );
};
