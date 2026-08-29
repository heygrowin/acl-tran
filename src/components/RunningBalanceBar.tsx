import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Banknote,
  Globe,
  HandCoins,
  Edit2,
  Check,
  X,
  Trash2,
} from 'lucide-react';
import { formatCurrency, storage, isCashInHandTransaction } from '../services/storageService';

export const RunningBalanceBar: React.FC = () => {
  const {
    dayBalances,
    config,
    updateConfig,
    selectedDate,
    refreshData,
    currentScreen,
    showToast,
    loans,
    setAdminTab,
    todayTransactions,
    deleteTransaction,
    openClosingModal,
    selectedMember,
  } = useApp();

  const [isEditingOpening, setIsEditingOpening] = useState(false);
  const [editCash, setEditCash] = useState(dayBalances.openingCash.toString());
  const [editOnline, setEditOnline] = useState(dayBalances.openingOnline.toString());
  const [setAsDefault, setSetAsDefault] = useState(true);

  const totalPendingLoan = loans.reduce((sum, l) => sum + (l.pendingAmount || 0), 0);
  const activeBorrowersCount = loans.filter(l => l.pendingAmount > 0).length;

  const handleEditCashInHandEntry = () => {
    openClosingModal(selectedMember);
  };

  const handleDeleteCashInHandEntry = () => {
    const existingCashInHand = todayTransactions.find(
      t => isCashInHandTransaction(t)
    );
    if (existingCashInHand) {
      if (confirm(`Delete Cash in Hand entry of ${formatCurrency(existingCashInHand.amount, config.currency)}?`)) {
        deleteTransaction(existingCashInHand.id);
        showToast('Cash in Hand entry deleted');
      }
    }
  };

  // Calculate breakdown per UPI account from today's transactions
  const upiBreakdown = todayTransactions
    .filter(t => t.paymentMethod.toLowerCase() === 'upi' && t.paymentAccount)
    .reduce<Record<string, number>>((acc, t) => {
      const acct = t.paymentAccount!;
      const diff = t.type === 'income' ? t.amount : -t.amount;
      acc[acct] = (acc[acct] || 0) + diff;
      return acc;
    }, {});

  const upiEntries = Object.entries(upiBreakdown);

  const handleStartEdit = () => {
    setEditCash(dayBalances.openingCash.toString());
    setEditOnline(dayBalances.openingOnline.toString());
    setSetAsDefault(true);
    setIsEditingOpening(true);
  };

  const handleSaveOpening = () => {
    const cashNum = parseFloat(editCash) || 0;
    const onlineNum = parseFloat(editOnline) || 0;

    // Save for selected date
    storage.setOpeningBalances(selectedDate, cashNum, onlineNum);

    // If set as default, save into business config so all future days inherit it
    if (setAsDefault) {
      updateConfig({
        ...config,
        defaultOpeningCash: cashNum,
        defaultOpeningOnline: onlineNum,
      });
    }

    refreshData();
    setIsEditingOpening(false);
    showToast(setAsDefault ? 'Saved for today & set as default opening balance!' : 'Saved for selected date!');
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
        <div style={{ minWidth: 0, textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.675rem', fontWeight: 700, color: '#92400e' }}>
              <Banknote size={12} style={{ color: '#d97706' }} />
              <span>Cash in Hand</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <button
                className="icon-btn"
                style={{ width: '18px', height: '18px', border: 'none', background: 'transparent', color: '#b45309' }}
                onClick={handleEditCashInHandEntry}
                title="Edit / Record Cash in Hand"
              >
                <Edit2 size={9} />
              </button>
              <button
                className="icon-btn"
                style={{ width: '18px', height: '18px', border: 'none', background: 'transparent', color: '#dc2626' }}
                onClick={handleDeleteCashInHandEntry}
                title="Delete / Clear Cash in Hand"
              >
                <Trash2 size={9} />
              </button>
              {!isEditingOpening && (
                <button
                  className="icon-btn"
                  style={{ width: '18px', height: '18px', border: 'none', background: 'transparent' }}
                  onClick={handleStartEdit}
                  title="Edit Opening Balances"
                >
                  <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>⚙️</span>
                </button>
              )}
            </div>
          </div>

          <div
            className="font-mono"
            style={{ fontSize: '1.05rem', fontWeight: 800, color: '#b45309', lineHeight: 1.15, cursor: 'pointer' }}
            onClick={handleEditCashInHandEntry}
            title="Click to edit Cash in Hand"
          >
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
            {!isEditingOpening && (
              <button
                className="icon-btn"
                style={{ width: '18px', height: '18px', border: 'none', background: 'transparent' }}
                onClick={handleStartEdit}
                title="Edit Opening Balances"
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

          {/* UPI Accounts specific breakdown row */}
          {upiEntries.length > 0 && (
            <div style={{ fontSize: '0.575rem', color: '#2563eb', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '0.15rem' }}>
              💳 {upiEntries.map(([acc, amt]) => `${acc}: ${formatCurrency(amt, config.currency)}`).join(' • ')}
            </div>
          )}
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

      {/* Inline Opening Balance Editor with Set As Default */}
      {isEditingOpening && (
        <div
          className="card animate-scale-in"
          style={{
            background: '#eff6ff',
            padding: '0.65rem 0.85rem',
            borderRadius: '8px',
            border: '1.5px solid #bfdbfe',
            marginTop: '0.45rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '0.775rem', fontWeight: 800, color: '#1e40af' }}>
            Opening Balance ({selectedDate}):
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.725rem', color: '#475569', fontWeight: 600 }}>Cash:</span>
            <input
              type="number"
              className="form-input font-mono"
              style={{ width: '90px', padding: '0.25rem 0.45rem', fontSize: '0.8rem' }}
              value={editCash}
              onChange={e => setEditCash(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.725rem', color: '#475569', fontWeight: 600 }}>Online:</span>
            <input
              type="number"
              className="form-input font-mono"
              style={{ width: '90px', padding: '0.25rem 0.45rem', fontSize: '0.8rem' }}
              value={editOnline}
              onChange={e => setEditOnline(e.target.value)}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: '#1e40af', fontWeight: 600, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={setAsDefault}
              onChange={e => setSetAsDefault(e.target.checked)}
            />
            <span>Set as default for all days</span>
          </label>

          <div style={{ display: 'flex', gap: '0.25rem', marginLeft: 'auto' }}>
            <button
              type="button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem',
                padding: '0.3rem 0.6rem',
                background: '#16a34a',
                color: '#fff',
                borderRadius: '5px',
                fontSize: '0.725rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
              }}
              onClick={handleSaveOpening}
            >
              <Check size={12} />
              <span>Save</span>
            </button>
            <button
              type="button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem',
                padding: '0.3rem 0.6rem',
                background: '#ffffff',
                color: '#64748b',
                border: '1px solid #cbd5e1',
                borderRadius: '5px',
                fontSize: '0.725rem',
                cursor: 'pointer',
              }}
              onClick={() => setIsEditingOpening(false)}
            >
              <X size={12} />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
