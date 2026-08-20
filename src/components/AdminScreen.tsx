import React, { useRef } from 'react';
import { useApp } from '../context/AppContext';
import { HeroStats } from './HeroStats';
import { RunningBalanceBar } from './RunningBalanceBar';
import { TransactionLedger } from './TransactionLedger';
import { LoanManager } from './LoanManager';
import { ReportsAnalytics } from './ReportsAnalytics';
import { SettingsModal } from './SettingsModal';
import {
  LayoutDashboard,
  Receipt,
  HandCoins,
  Lock,
  BarChart3,
  Settings,
  ShieldCheck,
  Calendar,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { getTodayDateString } from '../services/storageService';

export const AdminScreen: React.FC = () => {
  const {
    adminTab,
    setAdminTab,
    selectedDate,
    setSelectedDate,
    logoutToLanding,
    openClosingModal,
  } = useApp();

  const dateInputRef = useRef<HTMLInputElement>(null);

  const todayStr = getTodayDateString();
  const isToday = selectedDate === todayStr;

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const formattedDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff',
          padding: '0.65rem 1rem',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          marginBottom: '0.75rem',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: '#2563eb',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={18} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              ACL Counter Manage
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.1rem' }}>
              <span className="badge badge-online" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                Admin / Owner
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Interactive Date Picker & Navigator */}
          <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', borderRadius: '6px', padding: '0.15rem 0.35rem', border: '1px solid #cbd5e1', position: 'relative' }}>
            <button className="icon-btn" style={{ width: '24px', height: '24px' }} onClick={handlePrevDay} title="Previous Day">
              <ChevronLeft size={14} />
            </button>

            {/* Clickable Date Label + Native Calendar Trigger */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0 0.4rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#0f172a',
                cursor: 'pointer',
                position: 'relative',
              }}
              onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.focus()}
              title="Click to pick any date from calendar"
            >
              <Calendar size={13} style={{ color: '#2563eb' }} />
              <span>{isToday ? `Today (${formattedDate})` : formattedDate}</span>

              {/* Hidden native date input triggered on click */}
              <input
                ref={dateInputRef}
                type="date"
                style={{
                  position: 'absolute',
                  opacity: 0,
                  width: '100%',
                  height: '100%',
                  top: 0,
                  left: 0,
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                }}
                value={selectedDate}
                onChange={e => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value);
                  }
                }}
              />
            </div>

            <button className="icon-btn" style={{ width: '24px', height: '24px' }} onClick={handleNextDay} title="Next Day">
              <ChevronRight size={14} />
            </button>

            {!isToday && (
              <button
                style={{ marginLeft: '0.25rem', fontSize: '0.65rem', padding: '0.15rem 0.4rem', background: '#2563eb', color: '#fff', borderRadius: '4px', fontWeight: 700, cursor: 'pointer' }}
                onClick={() => setSelectedDate(todayStr)}
              >
                Today
              </button>
            )}
          </div>

          <button
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#475569',
              fontSize: '0.775rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onClick={logoutToLanding}
            title="Switch User / Logout"
          >
            <LogOut size={13} />
            <span>Switch User</span>
          </button>
        </div>
      </div>

      {/* Admin Tabs */}
      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.75rem', overflowX: 'auto', paddingBottom: '0.15rem' }}>
        <button
          className={`nav-tab-btn ${adminTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setAdminTab('dashboard')}
        >
          <LayoutDashboard size={14} />
          <span>Overview</span>
        </button>
        <button
          className={`nav-tab-btn ${adminTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setAdminTab('transactions')}
        >
          <Receipt size={14} />
          <span>Transaction Log</span>
        </button>
        <button
          className={`nav-tab-btn ${adminTab === 'loans' ? 'active' : ''}`}
          onClick={() => setAdminTab('loans')}
        >
          <HandCoins size={14} />
          <span>Loans & Money Lent</span>
        </button>
        <button
          className={`nav-tab-btn ${adminTab === 'closing' ? 'active' : ''}`}
          onClick={() => setAdminTab('closing')}
        >
          <Lock size={14} />
          <span>Day Closings</span>
        </button>
        <button
          className={`nav-tab-btn ${adminTab === 'reports' ? 'active' : ''}`}
          onClick={() => setAdminTab('reports')}
        >
          <BarChart3 size={14} />
          <span>Reports</span>
        </button>
        <button
          className={`nav-tab-btn ${adminTab === 'settings' ? 'active' : ''}`}
          onClick={() => setAdminTab('settings')}
        >
          <Settings size={14} />
          <span>Settings & Data</span>
        </button>
      </div>

      {/* Admin Tab Content */}
      <div>
        {adminTab === 'dashboard' && (
          <div>
            <HeroStats />
            <RunningBalanceBar />
            <div style={{ marginTop: '0.75rem' }}>
              <TransactionLedger />
            </div>
          </div>
        )}

        {adminTab === 'transactions' && (
          <div>
            <TransactionLedger />
          </div>
        )}

        {adminTab === 'loans' && <LoanManager />}

        {adminTab === 'closing' && (
          <div>
            <HeroStats />
            <div style={{ marginTop: '0.75rem', textAlign: 'center', padding: '1.25rem', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <Lock size={28} style={{ color: '#2563eb', marginBottom: '0.35rem' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>End-of-Day Closing & Cash Verification</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '440px', margin: '0.35rem auto 1rem auto' }}>
                Verify physical drawer cash notes and online statement balances to record daily match status.
              </p>
              <button
                type="button"
                className="btn-fast-income"
                style={{ display: 'inline-flex', padding: '0.65rem 1.5rem', fontSize: '0.85rem' }}
                onClick={openClosingModal}
              >
                <Lock size={15} />
                <span>Open Day Closing Window</span>
              </button>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <ReportsAnalytics />
            </div>
          </div>
        )}

        {adminTab === 'reports' && <ReportsAnalytics />}

        {adminTab === 'settings' && <SettingsModal />}
      </div>
    </div>
  );
};
