import React from 'react';
import { FileText, Inbox, PlusCircle, Settings } from 'lucide-react';

export type NavTab = 'surveys' | 'responses' | 'builder' | 'settings';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  pendingCount,
}) => {
  return (
    <nav className="bottom-nav" aria-label="Main Navigation">
      <button
        type="button"
        className={`nav-item ${currentTab === 'surveys' ? 'active' : ''}`}
        onClick={() => onSelectTab('surveys')}
      >
        <div className="nav-icon-wrapper">
          <FileText size={20} />
        </div>
        <span>Surveys</span>
      </button>

      <button
        type="button"
        className={`nav-item ${currentTab === 'responses' ? 'active' : ''}`}
        onClick={() => onSelectTab('responses')}
      >
        <div className="nav-icon-wrapper">
          <Inbox size={20} />
          {pendingCount > 0 && (
            <span className="nav-badge">{pendingCount}</span>
          )}
        </div>
        <span>Responses</span>
      </button>

      <button
        type="button"
        className={`nav-item ${currentTab === 'builder' ? 'active' : ''}`}
        onClick={() => onSelectTab('builder')}
      >
        <div className="nav-icon-wrapper">
          <PlusCircle size={20} />
        </div>
        <span>Builder</span>
      </button>

      <button
        type="button"
        className={`nav-item ${currentTab === 'settings' ? 'active' : ''}`}
        onClick={() => onSelectTab('settings')}
      >
        <div className="nav-icon-wrapper">
          <Settings size={20} />
        </div>
        <span>Config</span>
      </button>
    </nav>
  );
};
