import React, { useState, useEffect } from 'react';
import { ClipboardList, ShieldCheck, Download } from 'lucide-react';

interface AppHeaderProps {
  isOnline: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ isOnline }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <header className="app-header">
      <div className="brand-wrapper">
        <div className="brand-icon">
          <ClipboardList size={20} strokeWidth={2.4} />
        </div>
        <div>
          <div className="brand-title">
            <span style={{ color: 'var(--accent-primary)', fontWeight: 900, marginRight: '4px' }}>VKU</span>
            <span>FieldSurvey</span>
            <span className="brand-badge">PWA</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="btn btn-primary btn-sm"
            style={{ padding: '4px 10px', fontSize: '0.72rem', gap: '4px', height: '28px' }}
            title="Install Standalone PWA"
          >
            <Download size={13} />
            <span>Install App</span>
          </button>
        )}
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
