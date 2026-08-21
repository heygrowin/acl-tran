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
    <section style={{ marginBottom: '0.5rem' }}>
      {/* Sleek Apple-style 1-card 3-column balance strip */}
      <div
        className="card"
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          padding: '0.45rem 0.65rem',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '0.5rem',
          alignItems: 'center',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        {/* 1. CASH */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.675rem', fontWeight: 700, color: '#92400e' }}>
              <Banknote size={12} style={{ color: '#d97706' }} />
              <span>Cash</span>
            </div>
            {currentScreen === 'admin' && !isEditingOpening && (
              <button
                className="icon-btn"
                style={{ width: '18px', height: '18px', border: 'none', background: 'transparent' }}
                onClick={handleStartEdit}
                title="Edit Opening Cash"
              >
                <Edit2 size={9} style={{ color: '#94a3b8' }} />
              </button>
            )}
          </div>

          <div className="font-mono" style={{ fontSize: '1.05rem', fontWeight: 800, color: '#b45309', lineHeight: 1.15 }}>
            {formatCurrency(dayBalances.expectedCash, config.currency)}
          </div>

          <div style={{ fontSize: '0.6rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '0.1rem' }}>
            <span>Open {formatCurrency(dayBalances.openingCash, config.currency)}</span>
            <span style={{ color: '#16a34a', fontWeight: 700 }}> +{formatCurrency(dayBalances.cashIncome, config.currency)}</span>
            <span style={{ color: '#dc2626', fontWeight: 700 }}> −{formatCurrency(dayBalances.cashExpense, config.currency)}</span>
          </div>
        </div>

        {/* 2. ONLINE */}
        <div style={{ borderLeft: '1px solid #f1f5f9', paddingLeft: '0.5rem', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.675rem', fontWeight: 700, color: '#1e40af' }}>
              <Globe size={12} style={{ color: '#2563eb' }} />
              <span>Online</span>
            </div>
            {currentScreen === 'admin' && !isEditingOpening && (
              <button
                className="icon-btn"
                style={{ width: '18px', height: '18px', border: 'none', background: 'transparent' }}
                onClick={handleStartEdit}
                title="Edit Opening Online"
              >
                <Edit2 size={9} style={{ color: '#94a3b8' }} />
              </button>
            )}
          </div>

          <div className="font-mono" style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1d4ed8', lineHeight: 1.15 }}>
            {formatCurrency(dayBalances.expectedOnline, config.currency)}
          </div>

          <div style={{ fontSize: '0.6rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '0.1rem' }}>
            <span>Open {formatCurrency(dayBalances.openingOnline, config.currency)}</span>
            <span style={{ color: '#16a34a', fontWeight: 700 }}> +{formatCurrency(dayBalances.onlineIncome, config.currency)}</span>
            <span style={{ color: '#dc2626', fontWeight: 700 }}> −{formatCurrency(dayBalances.onlineExpense, config.currency)}</span>
          </div>
        </div>

        {/* 3. LOANS */}
        <div
          style={{
            borderLeft: '1px solid #f1f5f9',
            paddingLeft: '0.5rem',
            minWidth: 0,
            cursor: currentScreen === 'admin' ? 'pointer' : 'default',
          }}
          onClick={() => {
            if (currentScreen === 'admin') setAdminTab('loans');
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.675rem', fontWeight: 700, color: '#9a3412' }}>
              <HandCoins size={12} style={{ color: '#ea580c' }} />
              <span>Loans</span>
            </div>
            {currentScreen === 'admin' && (
              <span style={{ fontSize: '0.6rem', color: '#ea580c', fontWeight: 700 }}>View →</span>
            )}
          </div>

          <div className="font-mono" style={{ fontSize: '1.05rem', fontWeight: 800, color: '#c2410c', lineHeight: 1.15 }}>
            {formatCurrency(totalPendingLoan, config.currency)}
          </div>

          <div style={{ fontSize: '0.6rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '0.1rem' }}>
            <span>{activeBorrowersCount} active borrower{activeBorrowersCount === 1 ? '' : 's'}</span>
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
