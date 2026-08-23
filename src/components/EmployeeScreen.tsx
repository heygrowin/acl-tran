import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LoanManager } from './LoanManager';
import { PWAInstallButton } from './PWAInstallButton';
import {
  PlusCircle,
  MinusCircle,
  Lock,
  Wallet,
  Globe,
  Trash2,
  Edit2,
  TrendingUp,
  TrendingDown,
  LogOut,
  Search,
  Zap,
  Columns,
  List,
  HandCoins,
  Check,
  X
} from 'lucide-react';
import { formatCurrency, storage } from '../services/storageService';

export const EmployeeScreen: React.FC = () => {
  const {
    config,
    updateConfig,
    selectedMember,
    logoutToLanding,
    dayBalances,
    todayTransactions,
    openCounterModal,
    openClosingModal,
    deleteTransaction,
    loans,
    isCloudConnected,
    selectedDate,
    refreshData,
    showToast,
  } = useApp();

  const [employeeTab, setEmployeeTab] = useState<'counter' | 'loans'>('counter');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState<'all' | 'cash' | 'upi' | 'rtgs'>('all');
  const [viewMode, setViewMode] = useState<'split' | 'list'>('split');

  // Inline Opening Balance state
  const [isEditingOpening, setIsEditingOpening] = useState(false);
  const [editCash, setEditCash] = useState(dayBalances.openingCash.toString());
  const [editOnline, setEditOnline] = useState(dayBalances.openingOnline.toString());
  const [setAsDefault, setSetAsDefault] = useState(true);

  const pendingLoansCount = loans.filter(l => l.pendingAmount > 0).length;

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

  // Filter today's transactions
  const filteredTxs = todayTransactions.filter(t => {
    if (filterMethod !== 'all' && t.paymentMethod.toLowerCase() !== filterMethod.toLowerCase()) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchCat = t.category.toLowerCase().includes(q);
      const matchNote = t.note?.toLowerCase().includes(q);
      const matchPhone = t.customerPhone?.toLowerCase().includes(q) || t.borrowerPhone?.toLowerCase().includes(q);
      const matchAmt = t.amount.toString().includes(q);
      return matchCat || matchNote || matchPhone || matchAmt;
    }
    return true;
  });

  // Receive FIRST (Left), Expense SECOND (Right)
  const incomeTxs = filteredTxs.filter(t => t.type === 'income');
  const expenseTxs = filteredTxs.filter(t => t.type === 'expense');

  const handleDelete = (id: string, amt: number) => {
    if (confirm(`Remove this entry of ₹${amt.toLocaleString()}?`)) {
      deleteTransaction(id);
    }
  };

  const handleEdit = (tx: (typeof todayTransactions)[0]) => {
    openCounterModal(tx.type, tx);
  };

  const handleStartEditOpening = () => {
    setEditCash(dayBalances.openingCash.toString());
    setEditOnline(dayBalances.openingOnline.toString());
    setSetAsDefault(true);
    setIsEditingOpening(true);
  };

  const handleSaveOpening = () => {
    const cashNum = parseFloat(editCash) || 0;
    const onlineNum = parseFloat(editOnline) || 0;

    storage.setOpeningBalances(selectedDate, cashNum, onlineNum);

    if (setAsDefault) {
      updateConfig({
        ...config,
        defaultOpeningCash: cashNum,
        defaultOpeningOnline: onlineNum,
      });
    }

    refreshData();
    setIsEditingOpening(false);
    showToast(setAsDefault ? 'Opening balances saved and set as default!' : 'Opening balances saved for today!');
  };

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
          marginBottom: '0.5rem',
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
              <span className="badge badge-online" style={{ fontSize: '0.625rem', padding: '0.1rem 0.35rem' }}>
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
                <span>{isCloudConnected ? 'Cloud Synced' : 'Offline / Local'}</span>
              </span>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
          {/* Navigation Tabs */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.12rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <button
              type="button"
              className={`nav-tab-btn ${employeeTab === 'counter' ? 'active' : ''}`}
              style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
              onClick={() => setEmployeeTab('counter')}
            >
              ⚡ Counter
            </button>
            <button
              type="button"
              className={`nav-tab-btn ${employeeTab === 'loans' ? 'active' : ''}`}
              style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
              onClick={() => setEmployeeTab('loans')}
            >
              <HandCoins size={12} />
              <span>Loans</span>
              {pendingLoansCount > 0 && (
                <span className="badge" style={{ background: '#ea580c', color: '#fff', fontSize: '0.55rem', padding: '0 0.25rem', borderRadius: '8px' }}>
                  {pendingLoansCount}
                </span>
              )}
            </button>
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

      {employeeTab === 'loans' ? (
        <LoanManager />
      ) : (
        <>
          {/* Sleek 2-Column Summary: Row 1 Flow (Receive vs Expense), Row 2 Balances (Cash vs Online) */}
          <div
            className="card"
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              padding: '0.55rem 0.75rem',
              marginBottom: '0.45rem',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            }}
          >
            {/* ROW 1: RECEIVE (+) LEFT vs EXPENSE (−) RIGHT */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.65rem',
                paddingBottom: '0.45rem',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              {/* Left: Receive */}
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.1rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#166534' }}>+ Receive</span>
                  <TrendingUp size={12} style={{ color: '#16a34a' }} />
                </div>
                <div className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#16a34a', lineHeight: 1.15, margin: '0.1rem 0' }}>
                  {formatCurrency(dayBalances.totalIncome, config.currency)}
                </div>
                <div style={{ fontSize: '0.625rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <span>Cash {formatCurrency(dayBalances.cashIncome, config.currency)}</span>
                  <span> • </span>
                  <span>Online {formatCurrency(dayBalances.onlineIncome, config.currency)}</span>
                </div>
              </div>

              {/* Right: Expense */}
              <div style={{ borderLeft: '1px solid #f1f5f9', paddingLeft: '0.65rem', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.1rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#991b1b' }}>− Expense</span>
                  <TrendingDown size={12} style={{ color: '#dc2626' }} />
                </div>
                <div className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#dc2626', lineHeight: 1.15, margin: '0.1rem 0' }}>
                  {formatCurrency(dayBalances.totalExpense, config.currency)}
                </div>
                <div style={{ fontSize: '0.625rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <span>Cash {formatCurrency(dayBalances.cashExpense, config.currency)}</span>
                  <span> • </span>
                  <span>Online {formatCurrency(dayBalances.onlineExpense, config.currency)}</span>
                </div>
              </div>
            </div>

            {/* ROW 2: CASH (LEFT) vs ONLINE (RIGHT) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.65rem',
                paddingTop: '0.45rem',
              }}
            >
              {/* Left: Cash */}
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.675rem', fontWeight: 700, color: '#92400e' }}>
                    <Wallet size={12} style={{ color: '#d97706' }} />
                    <span>Cash</span>
                  </div>
                  {!isEditingOpening && (
                    <button
                      className="icon-btn"
                      style={{ width: '18px', height: '18px', border: 'none', background: 'transparent' }}
                      onClick={handleStartEditOpening}
                      title="Edit Opening Balances"
                    >
                      <Edit2 size={9} style={{ color: '#94a3b8' }} />
                    </button>
                  )}
                </div>
                <div className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#b45309', lineHeight: 1.15 }}>
                  {formatCurrency(dayBalances.expectedCash, config.currency)}
                </div>
                <div style={{ fontSize: '0.6rem', color: '#64748b' }}>
                  Drawer live cash
                </div>
              </div>

              {/* Right: Online */}
              <div style={{ borderLeft: '1px solid #f1f5f9', paddingLeft: '0.65rem', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.675rem', fontWeight: 700, color: '#1e40af' }}>
                    <Globe size={12} style={{ color: '#2563eb' }} />
                    <span>Online</span>
                  </div>
                  {!isEditingOpening && (
                    <button
                      className="icon-btn"
                      style={{ width: '18px', height: '18px', border: 'none', background: 'transparent' }}
                      onClick={handleStartEditOpening}
                      title="Edit Opening Balances"
                    >
                      <Edit2 size={9} style={{ color: '#94a3b8' }} />
                    </button>
                  )}
                </div>
                <div className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1d4ed8', lineHeight: 1.15 }}>
                  {formatCurrency(dayBalances.expectedOnline, config.currency)}
                </div>
                <div style={{ fontSize: '0.6rem', color: '#64748b' }}>
                  UPI & Bank total
                </div>

                {/* Specific UPI Account Breakdown Row */}
                {upiEntries.length > 0 && (
                  <div style={{ fontSize: '0.575rem', color: '#2563eb', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '0.15rem' }}>
                    💳 {upiEntries.map(([acc, amt]) => `${acc}: ${formatCurrency(amt, config.currency)}`).join(' • ')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Inline Opening Balance Editor in Employee View */}
          {isEditingOpening && (
            <div
              className="card animate-scale-in"
              style={{
                background: '#eff6ff',
                padding: '0.6rem 0.75rem',
                borderRadius: '6px',
                border: '1.5px solid #bfdbfe',
                marginBottom: '0.45rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.55rem',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e40af' }}>
                Set Opening Balances:
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 600 }}>Cash:</span>
                <input
                  type="number"
                  className="form-input font-mono"
                  style={{ width: '85px', padding: '0.2rem 0.4rem', fontSize: '0.775rem' }}
                  value={editCash}
                  onChange={e => setEditCash(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 600 }}>Online:</span>
                <input
                  type="number"
                  className="form-input font-mono"
                  style={{ width: '85px', padding: '0.2rem 0.4rem', fontSize: '0.775rem' }}
                  value={editOnline}
                  onChange={e => setEditOnline(e.target.value)}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.675rem', color: '#1e40af', fontWeight: 600, cursor: 'pointer' }}>
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
                    padding: '0.25rem 0.55rem',
                    background: '#16a34a',
                    color: '#fff',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: 'none',
                  }}
                  onClick={handleSaveOpening}
                >
                  <Check size={11} />
                  <span>Save</span>
                </button>
                <button
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                    padding: '0.25rem 0.55rem',
                    background: '#ffffff',
                    color: '#64748b',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                  }}
                  onClick={() => setIsEditingOpening(false)}
                >
                  <X size={11} />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          )}

          {/* Dual Action Buttons: + Receive (Left) & − Expense (Right) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.45rem',
              marginBottom: '0.5rem',
            }}
          >
            <button
              type="button"
              className="btn-fast-income"
              onClick={() => openCounterModal('income')}
              style={{ padding: '0.65rem', fontSize: '0.925rem', background: '#16a34a', boxShadow: 'none' }}
            >
              <PlusCircle size={18} />
              <span>+ Receive</span>
            </button>

            <button
              type="button"
              className="btn-fast-expense"
              onClick={() => openCounterModal('expense')}
              style={{ padding: '0.65rem', fontSize: '0.925rem', background: '#dc2626', boxShadow: 'none' }}
            >
              <MinusCircle size={18} />
              <span>− Expense</span>
            </button>
          </div>

          {/* Today's Transactions Log (Two-Column Split View: Left = Receive, Right = Expense) */}
          <div className="card" style={{ padding: '0.55rem 0.75rem' }}>
            {/* Controls Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.45rem',
                flexWrap: 'wrap',
                gap: '0.35rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Zap size={14} style={{ color: '#2563eb' }} />
                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>Today's Entries</h3>
                <span className="badge" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                  {filteredTxs.length}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* View Mode Toggle */}
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.12rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <button
                    type="button"
                    className={`nav-tab-btn ${viewMode === 'split' ? 'active' : ''}`}
                    style={{ fontSize: '0.675rem', padding: '0.15rem 0.45rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                    onClick={() => setViewMode('split')}
                    title="Split View: Left Receive | Right Expense"
                  >
                    <Columns size={11} />
                    <span>Split</span>
                  </button>
                  <button
                    type="button"
                    className={`nav-tab-btn ${viewMode === 'list' ? 'active' : ''}`}
                    style={{ fontSize: '0.675rem', padding: '0.15rem 0.45rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                    onClick={() => setViewMode('list')}
                    title="List View"
                  >
                    <List size={11} />
                    <span>List</span>
                  </button>
                </div>

                {/* Payment Method Filter */}
                <select
                  className="form-input"
                  style={{ padding: '0.18rem 0.35rem', fontSize: '0.7rem', borderRadius: '6px', width: 'auto' }}
                  value={filterMethod}
                  onChange={e => setFilterMethod(e.target.value as 'all' | 'cash' | 'upi' | 'rtgs')}
                >
                  <option value="all">All Modes</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="rtgs">RTGS</option>
                </select>
              </div>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
              <Search size={13} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '1.9rem', width: '100%', fontSize: '0.775rem', padding: '0.35rem 0.55rem 0.35rem 1.9rem' }}
                placeholder="Search note, head, phone, amount..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {/* TWO-COLUMN SPLIT VIEW: Left = Receive, Right = Expense */}
            {viewMode === 'split' ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '0.45rem',
                }}
              >
                {/* LEFT COLUMN: RECEIVE */}
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    padding: '0.45rem',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingBottom: '0.3rem',
                      borderBottom: '1px solid #bbf7d0',
                      marginBottom: '0.4rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <TrendingUp size={14} style={{ color: '#16a34a' }} />
                      <span className="badge badge-income" style={{ fontSize: '0.65rem', padding: '0.05rem 0.35rem', fontWeight: 800 }}>
                        +{incomeTxs.length}
                      </span>
                    </div>
                    <div className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 800, color: '#16a34a' }}>
                      +{formatCurrency(incomeTxs.reduce((s, t) => s + t.amount, 0), config.currency)}
                    </div>
                  </div>

                  {incomeTxs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.25rem 0.5rem', color: '#86efac', fontSize: '0.75rem' }}>
                      No receive entries yet
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '420px', overflowY: 'auto' }}>
                      {incomeTxs.map(tx => {
                        const isUpi = tx.paymentMethod.toLowerCase() === 'upi';
                        const displayMethod = isUpi
                          ? (tx.paymentAccount ? `UPI (${tx.paymentAccount})` : 'UPI')
                          : tx.paymentMethod.toUpperCase();

                        return (
                          <div
                            key={tx.id}
                            style={{
                              padding: '0.4rem 0.55rem',
                              borderRadius: '5px',
                              background: '#ffffff',
                              border: tx.isLoan ? '1px solid #fed7aa' : '1px solid #dcfce7',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '0.35rem',
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              {/* Primary: Head Name */}
                              <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#0f172a', lineHeight: 1.25 }}>
                                {tx.category || 'Receive'}
                              </div>

                              {/* Details: Made by + Payment Method + Note + Phone */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.15rem', fontSize: '0.675rem', color: '#475569' }}>
                                <span style={{ fontWeight: 700, color: '#1e293b' }}>
                                  👤 {tx.staffName || selectedMember || 'Counter 1'}
                                </span>
                                <span>•</span>
                                <span className="badge badge-income" style={{ fontSize: '0.575rem', padding: '0.05rem 0.3rem', fontWeight: 700 }}>
                                  {displayMethod}
                                </span>
                                {tx.isLoan && (
                                  <span className="badge" style={{ background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', fontSize: '0.55rem', fontWeight: 700 }}>
                                    🤝 Repaid
                                  </span>
                                )}
                                {tx.note && <span style={{ color: '#64748b' }}>• "{tx.note}"</span>}
                                {(tx.customerPhone || tx.borrowerPhone) && <span style={{ color: '#64748b' }}>• 📞 {tx.customerPhone || tx.borrowerPhone}</span>}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
                              <div className="font-mono" style={{ fontSize: '0.875rem', fontWeight: 800, color: '#16a34a' }}>
                                +{formatCurrency(tx.amount, config.currency)}
                              </div>
                              <div style={{ display: 'flex', gap: '0.1rem' }}>
                                <button
                                  type="button"
                                  className="icon-btn"
                                  style={{ width: '22px', height: '22px' }}
                                  onClick={() => handleEdit(tx)}
                                  title="Edit"
                                >
                                  <Edit2 size={10} />
                                </button>
                                <button
                                  type="button"
                                  className="icon-btn"
                                  style={{ width: '22px', height: '22px', color: '#dc2626' }}
                                  onClick={() => handleDelete(tx.id, tx.amount)}
                                  title="Delete"
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: EXPENSE */}
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    padding: '0.45rem',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingBottom: '0.3rem',
                      borderBottom: '1px solid #fecaca',
                      marginBottom: '0.4rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <TrendingDown size={14} style={{ color: '#dc2626' }} />
                      <span className="badge badge-expense" style={{ fontSize: '0.65rem', padding: '0.05rem 0.35rem', fontWeight: 800 }}>
                        -{expenseTxs.length}
                      </span>
                    </div>
                    <div className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 800, color: '#dc2626' }}>
                      -{formatCurrency(expenseTxs.reduce((s, t) => s + t.amount, 0), config.currency)}
                    </div>
                  </div>

                  {expenseTxs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.25rem 0.5rem', color: '#fca5a5', fontSize: '0.75rem' }}>
                      No expense entries yet
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '420px', overflowY: 'auto' }}>
                      {expenseTxs.map(tx => {
                        const isUpi = tx.paymentMethod.toLowerCase() === 'upi';
                        const displayMethod = isUpi
                          ? (tx.paymentAccount ? `UPI (${tx.paymentAccount})` : 'UPI')
                          : tx.paymentMethod.toUpperCase();

                        return (
                          <div
                            key={tx.id}
                            style={{
                              padding: '0.4rem 0.55rem',
                              borderRadius: '5px',
                              background: '#ffffff',
                              border: tx.isLoan ? '1px solid #fed7aa' : '1px solid #fee2e2',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '0.35rem',
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              {/* Primary: Head Name */}
                              <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#0f172a', lineHeight: 1.25 }}>
                                {tx.category || 'Expense'}
                              </div>

                              {/* Details: Made by + Payment Method + Note + Phone */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.15rem', fontSize: '0.675rem', color: '#475569' }}>
                                <span style={{ fontWeight: 700, color: '#1e293b' }}>
                                  👤 {tx.staffName || selectedMember || 'Counter 1'}
                                </span>
                                <span>•</span>
                                <span className="badge badge-expense" style={{ fontSize: '0.575rem', padding: '0.05rem 0.3rem', fontWeight: 700 }}>
                                  {displayMethod}
                                </span>
                                {tx.isLoan && (
                                  <span className="badge" style={{ background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', fontSize: '0.55rem', fontWeight: 700 }}>
                                    🤝 Given
                                  </span>
                                )}
                                {tx.note && <span style={{ color: '#64748b' }}>• "{tx.note}"</span>}
                                {(tx.customerPhone || tx.borrowerPhone) && <span style={{ color: '#64748b' }}>• 📞 {tx.customerPhone || tx.borrowerPhone}</span>}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
                              <div className="font-mono" style={{ fontSize: '0.875rem', fontWeight: 800, color: '#dc2626' }}>
                                -{formatCurrency(tx.amount, config.currency)}
                              </div>
                              <div style={{ display: 'flex', gap: '0.1rem' }}>
                                <button
                                  type="button"
                                  className="icon-btn"
                                  style={{ width: '22px', height: '22px' }}
                                  onClick={() => handleEdit(tx)}
                                  title="Edit"
                                >
                                  <Edit2 size={10} />
                                </button>
                                <button
                                  type="button"
                                  className="icon-btn"
                                  style={{ width: '22px', height: '22px', color: '#dc2626' }}
                                  onClick={() => handleDelete(tx.id, tx.amount)}
                                  title="Delete"
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Single List View Mode */
              filteredTxs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  No transactions recorded for today yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '420px', overflowY: 'auto' }}>
                  {filteredTxs.map(tx => {
                    const isIncome = tx.type === 'income';
                    const isUpi = tx.paymentMethod.toLowerCase() === 'upi';
                    const displayMethod = isUpi
                      ? (tx.paymentAccount ? `UPI (${tx.paymentAccount})` : 'UPI')
                      : tx.paymentMethod.toUpperCase();

                    return (
                      <div
                        key={tx.id}
                        style={{
                          padding: '0.45rem 0.6rem',
                          borderRadius: '6px',
                          background: isIncome ? '#f0fdf4' : '#fef2f2',
                          border: `1px solid ${isIncome ? '#bbf7d0' : '#fecaca'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.35rem',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#0f172a' }}>
                            {tx.category || (isIncome ? 'Receive' : 'Expense')}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.15rem', fontSize: '0.675rem', color: '#475569' }}>
                            <span style={{ fontWeight: 700 }}>👤 {tx.staffName || 'Staff'}</span>
                            <span>•</span>
                            <span className={`badge badge-${tx.type}`} style={{ fontSize: '0.575rem', padding: '0.05rem 0.3rem', fontWeight: 700 }}>
                              {displayMethod}
                            </span>
                            {tx.note && <span>• "{tx.note}"</span>}
                            {(tx.customerPhone || tx.borrowerPhone) && <span>• 📞 {tx.customerPhone || tx.borrowerPhone}</span>}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                          <div className="font-mono" style={{ fontSize: '0.9rem', fontWeight: 800, color: isIncome ? '#16a34a' : '#dc2626' }}>
                            {isIncome ? '+' : '-'}{formatCurrency(tx.amount, config.currency)}
                          </div>

                          <div style={{ display: 'flex', gap: '0.15rem' }}>
                            <button
                              type="button"
                              className="icon-btn"
                              style={{ width: '22px', height: '22px' }}
                              onClick={() => handleEdit(tx)}
                              title="Edit"
                            >
                              <Edit2 size={10} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn"
                              style={{ width: '22px', height: '22px', color: '#dc2626' }}
                              onClick={() => handleDelete(tx.id, tx.amount)}
                              title="Delete"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>

          {/* Bottom Quick Closing Button */}
          <div style={{ marginTop: '0.5rem' }}>
            <button
              type="button"
              style={{
                width: '100%',
                padding: '0.6rem',
                borderRadius: '6px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1e40af',
                fontWeight: 700,
                fontSize: '0.825rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                cursor: 'pointer',
              }}
              onClick={openClosingModal}
            >
              <Lock size={14} />
              <span>🔒 Close Day & Count Cash</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
