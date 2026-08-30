import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TransactionLedger } from './TransactionLedger';
import { LoanManager } from './LoanManager';
import { PWAInstallButton } from './PWAInstallButton';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import {
  LayoutDashboard,
  HandCoins,
  LogOut,
  Keyboard,
} from 'lucide-react';

export const EmployeeScreen: React.FC = () => {
  const {
    config,
    selectedMember,
    logoutToLanding,
    loans,
    isCloudConnected,
  } = useApp();

  const [employeeTab, setEmployeeTab] = useState<'sheet' | 'loans'>('sheet');
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const pendingLoansCount = loans.filter(l => l.pendingAmount > 0).length;

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff',
          padding: '0.45rem 0.75rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          marginBottom: '0.65rem',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          flexWrap: 'wrap',
          gap: '0.4rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.15rem' }}>🏬</span>
          <div>
            <h1 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.15 }}>
              {config.businessName || 'ACL Counter Manage'}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.1rem' }}>
              <span className="badge badge-online" style={{ fontSize: '0.675rem', padding: '0.1rem 0.4rem', fontWeight: 800 }}>
                👤 {selectedMember}
              </span>
              <span
                style={{
                  background: isCloudConnected ? '#dcfce7' : '#fee2e2',
                  border: `1px solid ${isCloudConnected ? '#86efac' : '#fecaca'}`,
                  color: isCloudConnected ? '#15803d' : '#991b1b',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  padding: '0.05rem 0.35rem',
                  borderRadius: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                }}
                title={isCloudConnected ? 'Connected to Firebase Cloud' : 'Cloud Setup Required'}
              >
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: isCloudConnected ? '#16a34a' : '#dc2626' }} />
                <span>{isCloudConnected ? 'Cloud Synced' : 'Offline'}</span>
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
          {/* Navigation Tabs: Daily Sheet and Loans */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.12rem', borderRadius: '6px', border: '1px solid #e2e8f0', gap: '0.15rem' }}>
            <button
              type="button"
              className={`nav-tab-btn ${employeeTab === 'sheet' ? 'active' : ''}`}
              style={{ fontSize: '0.725rem', padding: '0.25rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              onClick={() => setEmployeeTab('sheet')}
            >
              <LayoutDashboard size={13} />
              <span>Daily Sheet</span>
            </button>
            <button
              type="button"
              className={`nav-tab-btn ${employeeTab === 'loans' ? 'active' : ''}`}
              style={{ fontSize: '0.725rem', padding: '0.25rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              onClick={() => setEmployeeTab('loans')}
            >
              <HandCoins size={13} />
              <span>Loans</span>
              {pendingLoansCount > 0 && (
                <span className="badge" style={{ background: '#ea580c', color: '#fff', fontSize: '0.55rem', padding: '0 0.25rem', borderRadius: '8px' }}>
                  {pendingLoansCount}
                </span>
              )}
            </button>
          </div>

          {/* Shortcuts Button */}
          <button
            type="button"
            className="nav-tab-btn"
            style={{
              fontSize: '0.725rem',
              padding: '0.25rem 0.6rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#1e293b',
              cursor: 'pointer',
            }}
            onClick={() => setIsShortcutsModalOpen(true)}
            title="Keyboard Shortcuts & Workflow Guide"
          >
            <Keyboard size={13} />
            <span>Shortcuts</span>
          </button>

          <PWAInstallButton />

          {/* Switch Account Button */}
          <button
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.25rem 0.6rem',
              borderRadius: '6px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#334155',
              fontSize: '0.725rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            onClick={logoutToLanding}
            title="Switch Account / Logout"
          >
            <LogOut size={12} />
            <span>Switch Account</span>
          </button>
        </div>
      </div>

      {employeeTab === 'loans' ? (
        <LoanManager />
      ) : (
        <TransactionLedger initialMode="sheet" />
      )}

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
};
