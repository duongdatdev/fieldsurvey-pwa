import React from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export type SyncState = 'idle' | 'syncing' | 'synced' | 'pending' | 'offline';

interface NetworkStatusBarProps {
  isOnline: boolean;
  syncState: SyncState;
  pendingCount: number;
  syncingCount?: number;
  onSyncClick?: () => void;
}

export const NetworkStatusBar: React.FC<NetworkStatusBarProps> = ({
  isOnline,
  syncState,
  pendingCount,
  syncingCount = 0,
  onSyncClick,
}) => {
  // Determine display status
  let statusClass = 'online';
  let icon = <Wifi size={14} />;
  let text = 'Online • Ready to collect';

  if (!isOnline) {
    statusClass = 'offline';
    icon = <WifiOff size={14} />;
    text = pendingCount > 0 
      ? `Offline • ${pendingCount} response${pendingCount > 1 ? 's' : ''} queued locally` 
      : 'Offline • Responses will be saved to device';
  } else if (syncState === 'syncing') {
    statusClass = 'syncing';
    icon = <RefreshCw size={14} className="status-dot syncing" />;
    text = `Syncing ${syncingCount || pendingCount} response${(syncingCount || pendingCount) > 1 ? 's' : ''} to Google Sheets...`;
  } else if (pendingCount > 0) {
    statusClass = 'pending';
    icon = <AlertCircle size={14} />;
    text = `${pendingCount} response${pendingCount > 1 ? 's' : ''} waiting to synchronize`;
  } else if (syncState === 'synced') {
    statusClass = 'online';
    icon = <CheckCircle2 size={14} color="#10b981" />;
    text = 'All responses synchronized to Google Sheets';
  }

  return (
    <aside aria-label="Network and Synchronization Status" className={`network-status-bar ${statusClass}`}>
      <div className="status-indicator">
        {icon}
        <span>{text}</span>
      </div>
      {isOnline && pendingCount > 0 && syncState !== 'syncing' && (
        <button 
          className="sync-now-btn" 
          onClick={onSyncClick}
          title="Trigger immediate sync"
        >
          Sync Now
        </button>
      )}
    </aside>
  );
};
