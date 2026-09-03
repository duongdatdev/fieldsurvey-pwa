import { useState, useEffect } from 'react';
import { SyncProvider, useSync } from './context/SyncContext';
import { AppHeader } from './components/layout/AppHeader';
import { NetworkStatusBar } from './components/layout/NetworkStatusBar';
import { BottomNav, NavTab } from './components/layout/BottomNav';
import { SurveysListPage } from './pages/SurveysListPage';
import { SurveyFillPage } from './pages/SurveyFillPage';
import { ResponsesPage } from './pages/ResponsesPage';
import { SurveyBuilderPage } from './pages/SurveyBuilderPage';
import { SettingsPage } from './pages/SettingsPage';
import { DashboardPage } from './pages/DashboardPage';
import { registerServiceWorker } from './services/serviceWorkerRegistration';
import { LayoutDashboard } from 'lucide-react';

function AppContent() {
  const [currentTab, setCurrentTab] = useState<NavTab>('surveys');
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  const [showDashboard, setShowDashboard] = useState<boolean>(false);

  const {
    isOnline,
    syncState,
    pendingCount,
    triggerSync,
  } = useSync();

  useEffect(() => {
    // Register Service Worker for PWA offline capabilities
    registerServiceWorker();
  }, []);

  const handleSelectSurvey = (surveyId: string) => {
    setSelectedSurveyId(surveyId);
    setShowDashboard(false);
  };

  const handleTabChange = (tab: NavTab) => {
    setSelectedSurveyId(null);
    setShowDashboard(false);
    setCurrentTab(tab);
  };

  const handleSurveyPublished = (surveyId: string) => {
    setSelectedSurveyId(surveyId);
  };

  return (
    <div className="app-container">
      <AppHeader isOnline={isOnline} />

      {/* Global Real-Time Network & Sync Status Ribbon */}
      <NetworkStatusBar
        isOnline={isOnline}
        syncState={syncState}
        pendingCount={pendingCount}
        onSyncClick={triggerSync}
      />

      {/* Mode Switcher Banner (Surveys View vs Field Operations Dashboard) */}
      {!selectedSurveyId && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 16px 0' }}>
          <button
            onClick={() => setShowDashboard(!showDashboard)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <LayoutDashboard size={14} />
            <span>{showDashboard ? 'Back to Tab' : 'Admin Metrics'}</span>
          </button>
        </div>
      )}

      {/* Main Active Page View */}
      <main className="page-content">
        {selectedSurveyId ? (
          <SurveyFillPage
            surveyId={selectedSurveyId}
            onBack={() => setSelectedSurveyId(null)}
            onComplete={() => {
              setSelectedSurveyId(null);
              setCurrentTab('responses');
            }}
          />
        ) : showDashboard ? (
          <DashboardPage
            onNavigateTab={(tab) => {
              setShowDashboard(false);
              setCurrentTab(tab);
            }}
            onOpenSurvey={handleSelectSurvey}
          />
        ) : currentTab === 'surveys' ? (
          <SurveysListPage
            onSelectSurvey={handleSelectSurvey}
            onGoToBuilder={() => setCurrentTab('builder')}
          />
        ) : currentTab === 'responses' ? (
          <ResponsesPage />
        ) : currentTab === 'builder' ? (
          <SurveyBuilderPage onSurveyPublished={handleSurveyPublished} />
        ) : (
          <SettingsPage />
        )}
      </main>

      {/* Bottom Sticky Mobile Navigation Bar */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={handleTabChange}
        pendingCount={pendingCount}
      />
    </div>
  );
}

export default function App() {
  return (
    <SyncProvider>
      <AppContent />
    </SyncProvider>
  );
}
