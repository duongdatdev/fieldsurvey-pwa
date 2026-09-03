import React, { useEffect, useState } from 'react';
import { responseRepository } from '../db/repositories/responseRepository';
import { useSync } from '../context/SyncContext';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  PlusCircle, 
  ArrowRight,
  RefreshCw,
  Database,
  Cloud
} from 'lucide-react';
import { googleSheetsApi } from '../services/googleSheetsApi';

interface DashboardPageProps {
  onNavigateTab: (tab: 'surveys' | 'responses' | 'builder' | 'settings') => void;
  onOpenSurvey: (surveyId: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateTab,
}) => {
  const [metrics, setMetrics] = useState({
    totalSurveys: 0,
    activeSurveys: 0,
    totalResponses: 0,
    pendingSync: 0,
    syncedResponses: 0,
    failedResponses: 0,
  });

  const { isOnline, syncState, triggerSync } = useSync();
  const isMock = googleSheetsApi.isMockMode();

  const loadMetrics = async () => {
    try {
      const data = await responseRepository.getMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load metrics:', err);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [syncState]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Hero Welcome Card */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, var(--color-primary-950), var(--color-primary-800))',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary-300)' }}>
              Field Operations Console
            </span>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '4px', letterSpacing: '-0.02em' }}>
              FieldSurvey Dashboard
            </h1>
          </div>
          <div
            style={{
              padding: '4px 10px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              fontSize: '0.72rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Cloud size={12} />
            <span>{isMock ? 'Mock Sheets' : 'Live Sheets'}</span>
          </div>
        </div>

        <p style={{ fontSize: '0.86rem', color: 'var(--color-primary-100)', marginTop: '8px', lineHeight: 1.5 }}>
          Local-first offline survey engine. Responses persist to IndexedDB and automatically sync to Google Sheets.
        </p>

        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button
            className="btn"
            style={{ backgroundColor: 'white', color: 'var(--color-primary-900)', fontSize: '0.85rem', padding: '8px 14px' }}
            onClick={() => onNavigateTab('surveys')}
          >
            <FileText size={16} />
            <span>Collect Data</span>
          </button>
          <button
            className="btn"
            style={{ backgroundColor: 'rgba(255,255,255,0.18)', color: 'white', fontSize: '0.85rem', padding: '8px 14px' }}
            onClick={() => onNavigateTab('builder')}
          >
            <PlusCircle size={16} />
            <span>New Survey</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>SURVEYS</span>
            <FileText size={18} color="var(--accent-primary)" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {metrics.totalSurveys}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--status-online)', fontWeight: 600 }}>
            {metrics.activeSurveys} Active on Device
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>TOTAL RESPONSES</span>
            <Database size={18} color="var(--accent-primary)" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {metrics.totalResponses}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Stored in IndexedDB
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '4px solid var(--status-pending)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>PENDING SYNC</span>
            <Clock size={18} color="var(--status-pending)" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {metrics.pendingSync}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Queued in syncQueue
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '4px solid var(--status-online)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>SYNCED</span>
            <CheckCircle2 size={18} color="var(--status-online)" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {metrics.syncedResponses}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--status-online)', fontWeight: 600 }}>
            Confirmed in Sheets
          </div>
        </div>
      </div>

      {metrics.failedResponses > 0 && (
        <div
          className="card"
          style={{
            backgroundColor: 'var(--status-offline-bg)',
            borderColor: 'var(--status-offline-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={22} color="var(--status-offline)" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#9f1239' }}>
                {metrics.failedResponses} Sync Failure(s) Detected
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Responses remain safely on device. Tap to retry.
              </div>
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => onNavigateTab('responses')}>
            Review
          </button>
        </div>
      )}

      {/* Quick Action Navigation Links */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
          Quick Navigation
        </h3>

        <div
          onClick={() => onNavigateTab('surveys')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-surface-muted)',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={18} color="var(--accent-primary)" />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Open Field Surveys</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Answer questions & save drafts offline</div>
            </div>
          </div>
          <ArrowRight size={18} color="var(--text-muted)" />
        </div>

        <div
          onClick={() => onNavigateTab('responses')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-surface-muted)',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={18} color="var(--status-online)" />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Review Responses & Export</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Inspect answers, retry sync, export CSV</div>
            </div>
          </div>
          <ArrowRight size={18} color="var(--text-muted)" />
        </div>

        <div
          onClick={() => onNavigateTab('settings')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-surface-muted)',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <RefreshCw size={18} color="var(--text-muted)" />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Configure Google Sheets API</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Set Apps Script URL or use Mock Engine</div>
            </div>
          </div>
          <ArrowRight size={18} color="var(--text-muted)" />
        </div>
      </div>

      {/* Manual Sync Trigger */}
      {metrics.pendingSync > 0 && isOnline && (
        <button
          className="btn btn-primary btn-block"
          onClick={triggerSync}
          disabled={syncState === 'syncing'}
          style={{ minHeight: '48px' }}
        >
          <RefreshCw size={18} className={syncState === 'syncing' ? 'status-dot syncing' : ''} />
          <span>{syncState === 'syncing' ? 'Synchronizing Responses...' : `Sync ${metrics.pendingSync} Queued Response(s) Now`}</span>
        </button>
      )}
    </div>
  );
};
