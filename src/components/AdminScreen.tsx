import React from 'react';
import { useApp } from '../context/AppContext';
import { HeroStats } from './HeroStats';
import { TransactionLedger } from './TransactionLedger';
import { ItemAnalysisScreen } from './ItemAnalysisScreen';
import { LoanManager } from './LoanManager';
import { ReportsAnalytics } from './ReportsAnalytics';
import { SettingsModal } from './SettingsModal';
import { DayClosingsLog } from './DayClosingsLog';
import { PWAInstallButton } from './PWAInstallButton';
import {
  LayoutDashboard,
  HandCoins,
  BarChart3,
  Settings,
  LogOut,
  Layers,
} from 'lucide-react';

export const AdminScreen: React.FC = () => {
  const {
    adminTab,
    setAdminTab,
    logoutToLanding,
  } = useApp();

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      {/* Admin Navigation Tabs with Switch Button on the left */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem', overflowX: 'auto', paddingBottom: '0.15rem', alignItems: 'center' }}>
        <button
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.25rem 0.55rem',
            borderRadius: '6px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#475569',
            fontSize: '0.725rem',
            fontWeight: 700,
            cursor: 'pointer',
            marginRight: '0.15rem',
            flexShrink: 0,
          }}
          onClick={logoutToLanding}
          title="Switch User / Logout"
        >
          <LogOut size={12} />
          <span>Switch</span>
        </button>
        <button
          className={`nav-tab-btn ${adminTab === 'dashboard' ? 'active' : ''}`}
          style={{ fontSize: '0.725rem', padding: '0.25rem 0.6rem' }}
          onClick={() => setAdminTab('dashboard')}
        >
          <LayoutDashboard size={13} />
          <span>Daily Sheet</span>
        </button>
        <button
          className={`nav-tab-btn ${adminTab === 'summary' ? 'active' : ''}`}
          style={{ fontSize: '0.725rem', padding: '0.25rem 0.6rem' }}
          onClick={() => setAdminTab('summary')}
        >
          <BarChart3 size={13} />
          <span>Summary</span>
        </button>

        {/* Item Analysis Tab right next to Summary */}
        <button
          className={`nav-tab-btn ${adminTab === 'itemAnalysis' ? 'active' : ''}`}
          style={{ fontSize: '0.725rem', padding: '0.25rem 0.6rem' }}
          onClick={() => setAdminTab('itemAnalysis')}
        >
          <Layers size={13} />
          <span>Item Analysis</span>
        </button>

        {/* Install App button */}
        <PWAInstallButton />

        <button
          className={`nav-tab-btn ${adminTab === 'loans' ? 'active' : ''}`}
          style={{ fontSize: '0.725rem', padding: '0.25rem 0.6rem' }}
          onClick={() => setAdminTab('loans')}
        >
          <HandCoins size={13} />
          <span>Loans</span>
        </button>
        <button
          className={`nav-tab-btn ${adminTab === 'settings' ? 'active' : ''}`}
          style={{ fontSize: '0.725rem', padding: '0.25rem 0.6rem' }}
          onClick={() => setAdminTab('settings')}
        >
          <Settings size={13} />
          <span>Settings</span>
        </button>
      </div>

      {/* Admin Tab Content */}
      <div>
        {adminTab === 'dashboard' && (
          <TransactionLedger initialMode="sheet" />
        )}

        {adminTab === 'summary' && (
          <TransactionLedger initialMode="summary" />
        )}

        {adminTab === 'itemAnalysis' && (
          <ItemAnalysisScreen />
        )}

        {adminTab === 'transactions' && (
          <TransactionLedger initialMode="sheet" />
        )}

        {adminTab === 'loans' && <LoanManager />}

        {adminTab === 'closing' && (
          <div>
            <HeroStats />
            <DayClosingsLog />
          </div>
        )}

        {adminTab === 'reports' && <ReportsAnalytics />}

        {adminTab === 'settings' && <SettingsModal />}
      </div>
    </div>
  );
};
