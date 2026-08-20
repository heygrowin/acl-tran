import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Banknote,
  Globe,
  HandCoins,
  Edit2,
  Check,
  X
} from 'lucide-react';
import { formatCurrency, storage } from '../services/storageService';

export const RunningBalanceBar: React.FC = () => {
  const { dayBalances, config, selectedDate, refreshData, currentScreen, showToast, loans, setAdminTab } = useApp();
  const [isEditingOpening, setIsEditingOpening] = useState(false);
  const [editCash, setEditCash] = useState(dayBalances.openingCash.toString());
  const [editOnline, setEditOnline] = useState(dayBalances.openingOnline.toString());

  const totalPendingLoan = loans.reduce((sum, l) => sum + (l.pendingAmount || 0), 0);
  const activeBorrowersCount = loans.filter(l => l.pendingAmount > 0).length;

  const handleStartEdit = () => {
    if (currentScreen === 'admin') {
      setEditCash(dayBalances.openingCash.toString());
      setEditOnline(dayBalances.openingOnline.toString());
      setIsEditingOpening(true);
    }
  };

  const handleSaveOpening = () => {
    const cashNum = parseFloat(editCash) || 0;
    const onlineNum = parseFloat(editOnline) || 0;
    storage.setOpeningBalances(selectedDate, cashNum, onlineNum);
    refreshData();
    setIsEditingOpening(false);
    showToast('Opening balance updated!');
  };

  return (
    <section style={{ marginBottom: '0.85rem' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '0.65rem',
        }}
      >
        {/* 1. CASH IN DRAWER */}
        <div
          className="card"
          style={{
            background: '#ffffff',
            border: '1.5px solid #fde68a',
            borderLeft: '4px solid #d97706',
            padding: '0.85rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', fontWeight: 700, color: '#92400e' }}>
                <Banknote size={16} style={{ color: '#d97706' }} />
                <span>Cash in Hand (Live Drawer)</span>
              </div>
              {currentScreen === 'admin' && !isEditingOpening && (
                <button
                  className="icon-btn"
                  style={{ width: '24px', height: '24px' }}
                  onClick={handleStartEdit}
                  title="Edit Opening Cash"
                >
                  <Edit2 size={12} />
                </button>
              )}
            </div>

            <div className="font-mono" style={{ fontSize: '1.45rem', fontWeight: 800, color: '#b45309', margin: '0.15rem 0' }}>
              {formatCurrency(dayBalances.expectedCash, config.currency)}
            </div>
          </div>

          <div style={{ fontSize: '0.7rem', color: '#64748b', background: '#fffbeb', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #fef3c7', marginTop: '0.4rem' }}>
            <span>Opening: {formatCurrency(dayBalances.openingCash, config.currency)}</span>
            <span style={{ color: '#16a34a', fontWeight: 700 }}> +{formatCurrency(dayBalances.cashIncome, config.currency)}</span>
            <span style={{ color: '#dc2626', fontWeight: 700 }}> -{formatCurrency(dayBalances.cashExpense, config.currency)}</span>
          </div>
        </div>

        {/* 2. ONLINE / BANK ACCOUNT (UPI / RTGS) */}
        <div
          className="card"
          style={{
            background: '#ffffff',
            border: '1.5px solid #bfdbfe',
            borderLeft: '4px solid #2563eb',
            padding: '0.85rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', fontWeight: 700, color: '#1e40af' }}>
                <Globe size={16} style={{ color: '#2563eb' }} />
                <span>Online / Bank (UPI & RTGS)</span>
              </div>
              {currentScreen === 'admin' && !isEditingOpening && (
                <button
                  className="icon-btn"
                  style={{ width: '24px', height: '24px' }}
                  onClick={handleStartEdit}
                  title="Edit Opening Online"
                >
                  <Edit2 size={12} />
                </button>
              )}
            </div>

            <div className="font-mono" style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1d4ed8', margin: '0.15rem 0' }}>
              {formatCurrency(dayBalances.expectedOnline, config.currency)}
            </div>
          </div>

          <div style={{ fontSize: '0.7rem', color: '#64748b', background: '#eff6ff', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #dbeafe', marginTop: '0.4rem' }}>
            <span>Opening: {formatCurrency(dayBalances.openingOnline, config.currency)}</span>
            <span style={{ color: '#16a34a', fontWeight: 700 }}> +{formatCurrency(dayBalances.onlineIncome, config.currency)}</span>
            <span style={{ color: '#dc2626', fontWeight: 700 }}> -{formatCurrency(dayBalances.onlineExpense, config.currency)}</span>
          </div>
        </div>

        {/* 3. LOANS / MONEY LENT PENDING */}
        <div
          className="card"
          style={{
            background: '#ffffff',
            border: '1.5px solid #fed7aa',
            borderLeft: '4px solid #ea580c',
            padding: '0.85rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            cursor: currentScreen === 'admin' ? 'pointer' : 'default',
          }}
          onClick={() => {
            if (currentScreen === 'admin') setAdminTab('loans');
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', fontWeight: 700, color: '#9a3412' }}>
                <HandCoins size={16} style={{ color: '#ea580c' }} />
                <span>Loans / Money Lent (To Recover)</span>
              </div>
            </div>

            <div className="font-mono" style={{ fontSize: '1.45rem', fontWeight: 800, color: '#c2410c', margin: '0.15rem 0' }}>
              {formatCurrency(totalPendingLoan, config.currency)}
            </div>
          </div>

          <div style={{ fontSize: '0.7rem', color: '#64748b', background: '#fff7ed', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #ffedd5', marginTop: '0.4rem' }}>
            <span>{activeBorrowersCount} active borrower{activeBorrowersCount === 1 ? '' : 's'}</span>
            {currentScreen === 'admin' && <span style={{ float: 'right', color: '#ea580c', fontWeight: 700 }}>View Loans →</span>}
          </div>
        </div>
      </div>

      {/* Inline Opening Balance Editor */}
      {isEditingOpening && (
        <div
          className="card animate-scale-in"
          style={{
            background: '#eff6ff',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1.5px solid #bfdbfe',
            marginTop: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e40af' }}>
            Edit Opening Balances ({selectedDate}):
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>Cash:</span>
            <input
              type="number"
              className="form-input font-mono"
              style={{ width: '100px', padding: '0.3rem 0.5rem', fontSize: '0.85rem' }}
              value={editCash}
              onChange={e => setEditCash(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>Online:</span>
            <input
              type="number"
              className="form-input font-mono"
              style={{ width: '100px', padding: '0.3rem 0.5rem', fontSize: '0.85rem' }}
              value={editOnline}
              onChange={e => setEditOnline(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button
              type="button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.35rem 0.65rem',
                background: '#16a34a',
                color: '#fff',
                borderRadius: '5px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              onClick={handleSaveOpening}
            >
              <Check size={13} />
              <span>Save</span>
            </button>
            <button
              type="button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.35rem 0.65rem',
                background: '#ffffff',
                color: '#64748b',
                border: '1px solid #cbd5e1',
                borderRadius: '5px',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
              onClick={() => setIsEditingOpening(false)}
            >
              <X size={13} />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
