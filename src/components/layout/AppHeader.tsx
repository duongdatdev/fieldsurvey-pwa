import React from 'react';
import { ClipboardList, ShieldCheck } from 'lucide-react';

interface AppHeaderProps {
  isOnline: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ isOnline }) => {
  return (
    <header className="app-header">
      <div className="brand-wrapper">
        <div className="brand-icon">
          <ClipboardList size={20} strokeWidth={2.4} />
        </div>
        <div>
          <div className="brand-title">
            <span>FieldSurvey</span>
            <span className="brand-badge">PWA</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            fontSize: '0.75rem', 
            fontWeight: 600,
            padding: '4px 8px',
            borderRadius: '9999px',
            backgroundColor: isOnline ? 'var(--status-online-bg)' : 'var(--status-offline-bg)',
            color: isOnline ? '#065f46' : '#9f1239',
            border: `1px solid ${isOnline ? 'var(--status-online-border)' : 'var(--status-offline-border)'}`
          }}
        >
          <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>
        <div 
          title="Protected Offline Storage"
          style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
        >
          <ShieldCheck size={18} />
        </div>
      </div>
    </header>
  );
};
