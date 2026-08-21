import React, { useRef } from 'react';
import { useApp } from '../context/AppContext';
import { HeroStats } from './HeroStats';
import { RunningBalanceBar } from './RunningBalanceBar';
import { TransactionLedger } from './TransactionLedger';
import { LoanManager } from './LoanManager';
import { ReportsAnalytics } from './ReportsAnalytics';
import { SettingsModal } from './SettingsModal';
import { PWAInstallButton } from './PWAInstallButton';
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
  LogOut,
  PlusCircle,
  MinusCircle
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
    openCounterModal,
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
          padding: '0.45rem 0.75rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          marginBottom: '0.5rem',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          flexWrap: 'wrap',
          gap: '0.4rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: '#2563eb',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={16} />
          </div>
          <div>
            <h1 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.15 }}>
              ACL Counter Manage
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.1rem' }}>
              <span className="badge badge-online" style={{ fontSize: '0.625rem', padding: '0.05rem 0.35rem' }}>
                Admin / Owner
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
          {/* Interactive Date Picker & Navigator */}
          <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', borderRadius: '6px', padding: '0.12rem 0.3rem', border: '1px solid #cbd5e1', position: 'relative' }}>
            <button className="icon-btn" style={{ width: '22px', height: '22px' }} onClick={handlePrevDay} title="Previous Day">
              <ChevronLeft size={13} />
            </button>

            {/* Clickable Date Label + Native Calendar Trigger */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0 0.35rem',
                fontSize: '0.725rem',
                fontWeight: 600,
                color: '#0f172a',
                cursor: 'pointer',
                position: 'relative',
              }}
              onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.focus()}
              title="Click to pick any date from calendar"
            >
              <Calendar size={12} style={{ color: '#2563eb' }} />
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

            <button className="icon-btn" style={{ width: '22px', height: '22px' }} onClick={handleNextDay} title="Next Day">
              <ChevronRight size={13} />
            </button>

            {!isToday && (
              <button
                style={{ marginLeft: '0.2rem', fontSize: '0.625rem', padding: '0.1rem 0.35rem', background: '#2563eb', color: '#fff', borderRadius: '4px', fontWeight: 700, cursor: 'pointer' }}
                onClick={() => setSelectedDate(todayStr)}
              >
                Today
              </button>
            )}
          </div>

          <PWAInstallButton />

          <button
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.25rem 0.55rem',
              borderRadius: '6px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#475569',
              fontSize: '0.725rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onClick={logoutToLanding}
            title="Switch User / Logout"
          >
            <LogOut size={12} />
            <span>Switch</span>
          </button>
        </div>
      </div>

      {/* Admin Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem', overflowX: 'auto', paddingBottom: '0.15rem' }}>
        <button
          className={`nav-tab-btn ${adminTab === 'dashboard' ? 'active' : ''}`}
          style={{ fontSize: '0.725rem', padding: '0.25rem 0.6rem' }}
          onClick={() => setAdminTab('dashboard')}
        >
          <LayoutDashboard size={13} />
          <span>Overview</span>
        </button>
        <button
          className={`nav-tab-btn ${adminTab === 'transactions' ? 'active' : ''}`}
          style={{ fontSize: '0.725rem', padding: '0.25rem 0.6rem' }}
          onClick={() => setAdminTab('transactions')}
        >
          <Receipt size={13} />
          <span>Transactions</span>
        </button>
        <button
          className={`nav-tab-btn ${adminTab === 'loans' ? 'active' : ''}`}
          style={{ fontSize: '0.725rem', padding: '0.25rem 0.6rem' }}
          onClick={() => setAdminTab('loans')}
        >
          <HandCoins size={13} />
          <span>Loans</span>
        </button>
        <button
          className={`nav-tab-btn ${adminTab === 'closing' ? 'active' : ''}`}
          style={{ fontSize: '0.725rem', padding: '0.25rem 0.6rem' }}
          onClick={() => setAdminTab('closing')}
        >
          <Lock size={13} />
          <span>Day Closings</span>
        </button>
        <button
          className={`nav-tab-btn ${adminTab === 'reports' ? 'active' : ''}`}
          style={{ fontSize: '0.725rem', padding: '0.25rem 0.6rem' }}
          onClick={() => setAdminTab('reports')}
        >
          <BarChart3 size={13} />
          <span>Reports</span>
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
          <div>
            <HeroStats />
            <RunningBalanceBar />

            {/* Dual Fast Action Buttons: Left = + Income, Right = − Expense */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.45rem',
                margin: '0.45rem 0',
              }}
            >
              <button
                type="button"
                className="btn-fast-income"
                onClick={() => openCounterModal('income')}
                style={{ padding: '0.55rem', fontSize: '0.85rem', background: '#16a34a', boxShadow: 'none' }}
              >
                <PlusCircle size={16} />
                <span>+ Income</span>
              </button>

              <button
                type="button"
                className="btn-fast-expense"
                onClick={() => openCounterModal('expense')}
                style={{ padding: '0.55rem', fontSize: '0.85rem', background: '#dc2626', boxShadow: 'none' }}
              >
                <MinusCircle size={16} />
                <span>− Expense</span>
              </button>
            </div>

            <div style={{ marginTop: '0.35rem' }}>
              <TransactionLedger />
            </div>
          </div>
        )}

        {adminTab === 'transactions' && (
          <div>
            {/* Dual Fast Action Buttons: Left = + Income, Right = − Expense */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.45rem',
                marginBottom: '0.45rem',
              }}
            >
              <button
                type="button"
                className="btn-fast-income"
                onClick={() => openCounterModal('income')}
                style={{ padding: '0.55rem', fontSize: '0.85rem', background: '#16a34a', boxShadow: 'none' }}
              >
                <PlusCircle size={16} />
                <span>+ Income</span>
              </button>

              <button
                type="button"
                className="btn-fast-expense"
                onClick={() => openCounterModal('expense')}
                style={{ padding: '0.55rem', fontSize: '0.85rem', background: '#dc2626', boxShadow: 'none' }}
              >
                <MinusCircle size={16} />
                <span>− Expense</span>
              </button>
            </div>

            <TransactionLedger />
          </div>
        )}

        {adminTab === 'loans' && <LoanManager />}

        {adminTab === 'closing' && (
          <div>
            <HeroStats />
            <div style={{ marginTop: '0.5rem', textAlign: 'center', padding: '1rem', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <Lock size={24} style={{ color: '#2563eb', marginBottom: '0.25rem' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>End-of-Day Closing & Cash Verification</h3>
              <p style={{ fontSize: '0.75rem', color: '#64748b', maxWidth: '420px', margin: '0.25rem auto 0.75rem auto' }}>
                Verify physical drawer cash notes and online statement balances to record daily match status.
              </p>
              <button
                type="button"
                className="btn-fast-income"
                style={{ display: 'inline-flex', padding: '0.5rem 1.25rem', fontSize: '0.8rem' }}
                onClick={openClosingModal}
              >
                <Lock size={14} />
                <span>Open Day Closing Window</span>
              </button>
            </div>
            <div style={{ marginTop: '0.5rem' }}>
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
