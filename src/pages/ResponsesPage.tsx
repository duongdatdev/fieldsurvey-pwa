import React, { useEffect, useState, useMemo } from 'react';
import { SurveyResponse, Survey, ResponseStatus } from '../types/survey';
import { responseRepository } from '../db/repositories/responseRepository';
import { surveyRepository } from '../db/repositories/surveyRepository';
import { responseService } from '../services/responseService';
import { useSync } from '../context/SyncContext';
import { 
  Inbox, 
  RotateCw, 
  Trash2, 
  Download, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  X
} from 'lucide-react';

export const ResponsesPage: React.FC = () => {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [surveys, setSurveys] = useState<Record<string, Survey>>({});
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedResponse, setSelectedResponse] = useState<SurveyResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const { triggerSync, refreshCounts, isOnline, syncState } = useSync();

  const loadData = async () => {
    try {
      setLoading(true);
      const respList = await responseRepository.getAllResponses();
      const surveyList = await surveyRepository.getAllSurveys();

      const sMap: Record<string, Survey> = {};
      surveyList.forEach((s) => {
        sMap[s.id] = s;
      });

      setResponses(respList);
      setSurveys(sMap);
    } catch (err) {
      console.error('Failed to load responses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRetry = async (responseId: string) => {
    try {
      await responseService.retryResponse(responseId);
      await refreshCounts();
      await loadData();
      if (isOnline) {
        await triggerSync();
        await loadData();
      }
    } catch (err) {
      console.error('Retry failed:', err);
    }
  };

  const handleDelete = async (responseId: string) => {
    if (confirm('Are you sure you want to delete this response from local device?')) {
      await responseService.deleteResponse(responseId);
      await refreshCounts();
      await loadData();
      if (selectedResponse?.id === responseId) {
        setSelectedResponse(null);
      }
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (responses.length === 0) {
      alert('No responses to export.');
      return;
    }

    const headers = ['Response ID', 'Survey ID', 'Survey Title', 'Status', 'Created At', 'Synced At', 'Answers JSON'];
    const rows = responses.map((r) => [
      `"${r.id}"`,
      `"${r.surveyId}"`,
      `"${surveys[r.surveyId]?.title || r.surveyId}"`,
      `"${r.status}"`,
      `"${r.createdAt}"`,
      `"${r.syncedAt || ''}"`,
      `"${JSON.stringify(r.answers).replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `field-survey-responses-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered responses
  const filteredResponses = useMemo(() => {
    if (filterStatus === 'all') return responses;
    return responses.filter((r) => r.status === filterStatus);
  }, [responses, filterStatus]);

  // Aggregate status counts
  const counts = useMemo(() => {
    return {
      total: responses.length,
      synced: responses.filter((r) => r.status === 'synced').length,
      pending: responses.filter((r) => r.status === 'pending' || r.status === 'syncing').length,
      failed: responses.filter((r) => r.status === 'failed').length,
    };
  }, [responses]);

  const renderStatusBadge = (status: ResponseStatus) => {
    switch (status) {
      case 'synced':
        return (
          <span className="badge badge-synced">
            <CheckCircle2 size={12} />
            <span>Synced</span>
          </span>
        );
      case 'pending':
      case 'syncing':
        return (
          <span className="badge badge-pending">
            <Clock size={12} />
            <span>{status === 'syncing' ? 'Syncing...' : 'Pending'}</span>
          </span>
        );
      case 'failed':
        return (
          <span className="badge badge-failed">
            <AlertCircle size={12} />
            <span>Failed</span>
          </span>
        );
      default:
        return <span className="badge badge-draft">{status}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header and Summary stats */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Response Management
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              IndexedDB local store with cloud sync
            </span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleExportCSV}
              title="Export to CSV"
            >
              <Download size={15} />
              <span>CSV</span>
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={triggerSync}
              disabled={syncState === 'syncing' || !isOnline}
              title="Trigger Sync"
            >
              <RotateCw size={14} className={syncState === 'syncing' ? 'status-dot syncing' : ''} />
              <span>Sync</span>
            </button>
          </div>
        </div>

        {/* Status Metrics Ribbon */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
          <div style={{ padding: '8px 4px', backgroundColor: 'var(--bg-surface-muted)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{counts.total}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL</div>
          </div>
          <div style={{ padding: '8px 4px', backgroundColor: 'var(--status-online-bg)', color: '#065f46', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{counts.synced}</div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700 }}>SYNCED</div>
          </div>
          <div style={{ padding: '8px 4px', backgroundColor: 'var(--status-pending-bg)', color: '#92400e', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{counts.pending}</div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700 }}>PENDING</div>
          </div>
          <div style={{ padding: '8px 4px', backgroundColor: 'var(--status-offline-bg)', color: '#9f1239', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{counts.failed}</div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700 }}>FAILED</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
        {['all', 'pending', 'synced', 'failed'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`btn btn-sm ${filterStatus === st ? 'btn-primary' : 'btn-secondary'}`}
            style={{ textTransform: 'capitalize', fontSize: '0.78rem' }}
          >
            {st} {st !== 'all' && `(${counts[st as keyof typeof counts]})`}
          </button>
        ))}
      </div>

      {/* Response List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
          Loading saved responses...
        </div>
      ) : filteredResponses.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '36px 16px' }}>
          <Inbox size={36} color="var(--text-subtle)" style={{ margin: '0 auto 8px' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>No Responses Found</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {filterStatus === 'all'
              ? 'Complete a field survey to view responses here.'
              : `No responses with status "${filterStatus}".`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredResponses.map((res) => {
            const survey = surveys[res.surveyId];
            const answerCount = Object.keys(res.answers || {}).length;

            return (
              <div
                key={res.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {survey?.title || res.surveyId}
                    </span>
                    <div className="mono" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      UUID: {res.id.slice(0, 8)}...{res.id.slice(-4)}
                    </div>
                  </div>
                  <div>{renderStatusBadge(res.status)}</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-subtle)' }}>
                  <span>{new Date(res.createdAt).toLocaleString()}</span>
                  <span>{answerCount} answers recorded</span>
                </div>

                {res.lastError && (
                  <div style={{ fontSize: '0.74rem', color: 'var(--status-offline)', backgroundColor: 'var(--status-offline-bg)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
                    Error: {res.lastError}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSelectedResponse(res)}
                    title="View Details"
                  >
                    <Eye size={14} />
                    <span>View</span>
                  </button>

                  {res.status === 'failed' && (
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleRetry(res.id)}
                      title="Retry Sync"
                    >
                      <RotateCw size={14} />
                      <span>Retry</span>
                    </button>
                  )}

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleDelete(res.id)}
                    title="Delete locally"
                    style={{ color: 'var(--status-offline)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Response Detail Modal */}
      {selectedResponse && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
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
              maxWidth: '520px',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-xl)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Response Inspection</h3>
                <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {selectedResponse.id}
                </span>
              </div>
              <button
                onClick={() => setSelectedResponse(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Status: </span>
                {renderStatusBadge(selectedResponse.status)}
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Created: </span>
                <span>{new Date(selectedResponse.createdAt).toLocaleTimeString()}</span>
              </div>
            </div>

            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
              Field Answers:
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(selectedResponse.answers || {}).map(([key, val]) => (
                <div
                  key={key}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-surface-muted)',
                  }}
                >
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Question ID: {key}
                  </div>
                  <div style={{ marginTop: '2px', fontSize: '0.88rem' }}>
                    {typeof val === 'string' && val.startsWith('data:image') ? (
                      <div style={{ marginTop: '4px' }}>
                        <img
                          src={val}
                          alt="Inspection"
                          style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: 8, objectFit: 'contain' }}
                        />
                      </div>
                    ) : Array.isArray(val) ? (
                      val.join(', ')
                    ) : (
                      String(val)
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedResponse(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
