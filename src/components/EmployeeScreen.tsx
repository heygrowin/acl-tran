import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LoanManager } from './LoanManager';
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
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  LogOut,
  Search,
  Zap,
  Clock,
  Columns,
  List,
  HandCoins
} from 'lucide-react';
import { formatCurrency } from '../services/storageService';

export const EmployeeScreen: React.FC = () => {
  const {
    config,
    selectedMember,
    logoutToLanding,
    dayBalances,
    todayTransactions,
    openCounterModal,
    openClosingModal,
    deleteTransaction,
    loans,
  } = useApp();

  const [employeeTab, setEmployeeTab] = useState<'counter' | 'loans'>('counter');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState<'all' | 'cash' | 'upi' | 'rtgs'>('all');
  const [viewMode, setViewMode] = useState<'split' | 'list'>('split');

  const closing = dayBalances.closing;
  const pendingLoansCount = loans.filter(l => l.pendingAmount > 0).length;

  // Filter today's transactions
  const filteredTxs = todayTransactions.filter(t => {
    if (filterMethod !== 'all' && t.paymentMethod.toLowerCase() !== filterMethod.toLowerCase()) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchCat = t.category.toLowerCase().includes(q);
      const matchNote = t.note?.toLowerCase().includes(q);
      const matchCust = t.customerName?.toLowerCase().includes(q) || t.borrowerName?.toLowerCase().includes(q);
      const matchAmt = t.amount.toString().includes(q);
      return matchCat || matchNote || matchCust || matchAmt;
    }
    return true;
  });

  // Income FIRST (Left), Expense SECOND (Right)
  const incomeTxs = filteredTxs.filter(t => t.type === 'income');
  const expenseTxs = filteredTxs.filter(t => t.type === 'expense');

  const totalFilteredIncome = incomeTxs.reduce((sum, t) => sum + t.amount, 0);
  const totalFilteredExpense = expenseTxs.reduce((sum, t) => sum + t.amount, 0);

  const handleDelete = (id: string, amt: number) => {
    if (confirm(`Remove this entry of ₹${amt.toLocaleString()}?`)) {
      deleteTransaction(id);
    }
  };

  const handleEdit = (tx: (typeof todayTransactions)[0]) => {
    openCounterModal(tx.type, tx);
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
          <span style={{ fontSize: '1.25rem' }}>🏬</span>
          <div>
            <h1 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {config.businessName || 'ACL Counter Manage'}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.1rem' }}>
              <span className="badge badge-online" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}>
                👤 {selectedMember}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Navigation Tabs */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.15rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <button
              type="button"
              className={`nav-tab-btn ${employeeTab === 'counter' ? 'active' : ''}`}
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
              onClick={() => setEmployeeTab('counter')}
            >
              ⚡ Counter Register
            </button>
            <button
              type="button"
              className={`nav-tab-btn ${employeeTab === 'loans' ? 'active' : ''}`}
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              onClick={() => setEmployeeTab('loans')}
            >
              <HandCoins size={13} />
              <span>Loans</span>
              {pendingLoansCount > 0 && (
                <span className="badge" style={{ background: '#ea580c', color: '#fff', fontSize: '0.6rem', padding: '0 0.3rem', borderRadius: '10px' }}>
                  {pendingLoansCount}
                </span>
              )}
            </button>
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

      {employeeTab === 'loans' ? (
        <LoanManager />
      ) : (
        <>
          {/* Summary Metrics Bar: Income First, Expense Second */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '0.5rem',
              marginBottom: '0.75rem',
            }}
          >
            {/* 1. Income (First) */}
            <div
              className="card"
              style={{
                background: '#ffffff',
                borderLeft: '3.5px solid #16a34a',
                padding: '0.6rem 0.85rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.725rem', color: '#64748b', fontWeight: 600 }}>
                <span>Income (+)</span>
                <TrendingUp size={14} style={{ color: '#16a34a' }} />
              </div>
              <div className="font-mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#16a34a', margin: '0.15rem 0' }}>
                {formatCurrency(dayBalances.totalIncome, config.currency)}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', gap: '0.4rem' }}>
                <span>Cash: {formatCurrency(dayBalances.cashIncome, config.currency)}</span>
                <span>•</span>
                <span>Online: {formatCurrency(dayBalances.onlineIncome, config.currency)}</span>
              </div>
            </div>

            {/* 2. Expense (Second) */}
            <div
              className="card"
              style={{
                background: '#ffffff',
                borderLeft: '3.5px solid #dc2626',
                padding: '0.6rem 0.85rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.725rem', color: '#64748b', fontWeight: 600 }}>
                <span>Expense (-)</span>
                <TrendingDown size={14} style={{ color: '#dc2626' }} />
              </div>
              <div className="font-mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#dc2626', margin: '0.15rem 0' }}>
                {formatCurrency(dayBalances.totalExpense, config.currency)}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', gap: '0.4rem' }}>
                <span>Cash: {formatCurrency(dayBalances.cashExpense, config.currency)}</span>
                <span>•</span>
                <span>Online: {formatCurrency(dayBalances.onlineExpense, config.currency)}</span>
              </div>
            </div>

            {/* 3. Cash in Hand */}
            <div
              className="card"
              style={{
                background: '#ffffff',
                borderLeft: '3.5px solid #d97706',
                padding: '0.6rem 0.85rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.725rem', color: '#64748b', fontWeight: 600 }}>
                <span>Cash in Hand (Drawer)</span>
                <Wallet size={14} style={{ color: '#d97706' }} />
              </div>
              <div className="font-mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#d97706', margin: '0.15rem 0' }}>
                {formatCurrency(dayBalances.expectedCash, config.currency)}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                Live running drawer balance
              </div>
            </div>

            {/* 4. UPI Total */}
            <div
              className="card"
              style={{
                background: '#ffffff',
                borderLeft: '3.5px solid #2563eb',
                padding: '0.6rem 0.85rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.725rem', color: '#64748b', fontWeight: 600 }}>
                <span>Online / Bank Total</span>
                <Globe size={14} style={{ color: '#2563eb' }} />
              </div>
              <div className="font-mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#2563eb', margin: '0.15rem 0' }}>
                {formatCurrency(dayBalances.expectedOnline, config.currency)}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                Live UPI / RTGS balance
              </div>
            </div>

            {/* 5. Cash Match Status */}
            <div
              className="card"
              style={{
                background: closing ? (closing.status === 'balanced' ? '#f0fdf4' : '#fef2f2') : '#eff6ff',
                border: `1.5px solid ${closing ? (closing.status === 'balanced' ? '#bbf7d0' : '#fecaca') : '#bfdbfe'}`,
                padding: '0.6rem 0.85rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
              onClick={openClosingModal}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.725rem', fontWeight: 700 }}>
                <span>Match Status</span>
                {closing ? (
                  closing.status === 'balanced' ? <CheckCircle2 size={14} style={{ color: '#16a34a' }} /> : <AlertTriangle size={14} style={{ color: '#dc2626' }} />
                ) : (
                  <Lock size={14} style={{ color: '#2563eb' }} />
                )}
              </div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: closing ? (closing.status === 'balanced' ? '#166534' : '#991b1b') : '#1e40af', margin: '0.2rem 0' }}>
                {closing
                  ? closing.status === 'balanced'
                    ? '✓ Money Matched'
                    : `⚠️ Shortage: ${formatCurrency(Math.abs(closing.cashDifference), config.currency)}`
                  : 'Not Closed Yet'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <span>{closing ? 'View slip' : 'Close Day'}</span>
                <ArrowRight size={10} />
              </div>
            </div>
          </div>

          {/* Dual Big Action Buttons: + Income (First) & − Expense (Second) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.6rem',
              marginBottom: '0.75rem',
            }}
          >
            <button
              type="button"
              className="btn-fast-income"
              onClick={() => openCounterModal('income')}
              style={{ padding: '0.85rem', fontSize: '1rem', background: '#16a34a', boxShadow: 'none' }}
            >
              <PlusCircle size={20} />
              <span>+ Income</span>
            </button>

            <button
              type="button"
              className="btn-fast-expense"
              onClick={() => openCounterModal('expense')}
              style={{ padding: '0.85rem', fontSize: '1rem', background: '#dc2626', boxShadow: 'none' }}
            >
              <MinusCircle size={20} />
              <span>− Expense</span>
            </button>
          </div>

          {/* Today's Transactions Log (Two-Column Split View: Left = Income, Right = Expense) */}
          <div className="card" style={{ padding: '0.75rem 1rem' }}>
            {/* Controls Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.65rem',
                flexWrap: 'wrap',
                gap: '0.4rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Zap size={16} style={{ color: '#2563eb' }} />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Today's Entries</h3>
                <span className="badge" style={{ background: '#f1f5f9', color: '#475569' }}>
                  {filteredTxs.length}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* View Mode Toggle */}
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.15rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <button
                    type="button"
                    className={`nav-tab-btn ${viewMode === 'split' ? 'active' : ''}`}
                    style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    onClick={() => setViewMode('split')}
                    title="Split View: Left Income | Right Expense"
                  >
                    <Columns size={12} />
                    <span>Split View</span>
                  </button>
                  <button
                    type="button"
                    className={`nav-tab-btn ${viewMode === 'list' ? 'active' : ''}`}
                    style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    onClick={() => setViewMode('list')}
                    title="List View"
                  >
                    <List size={12} />
                    <span>List</span>
                  </button>
                </div>

                {/* Payment Method Filter */}
                <select
                  className="form-input"
                  style={{ padding: '0.2rem 0.45rem', fontSize: '0.725rem', borderRadius: '6px', width: 'auto' }}
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
            <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.2rem', width: '100%', fontSize: '0.8rem', padding: '0.45rem 0.65rem 0.45rem 2.2rem' }}
                placeholder="Search note, category, person, amount..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {/* TWO-COLUMN SPLIT VIEW: Left = Income, Right = Expense */}
            {viewMode === 'split' ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '0.75rem',
                }}
              >
                {/* LEFT COLUMN: INCOME (+) */}
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1.5px solid #bbf7d0',
                    borderRadius: '8px',
                    padding: '0.65rem',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingBottom: '0.5rem',
                      borderBottom: '1px solid #bbf7d0',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <TrendingUp size={16} style={{ color: '#16a34a' }} />
                      <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#166534' }}>
                        Income (+) ({incomeTxs.length})
                      </span>
                    </div>
                    <span className="font-mono" style={{ fontWeight: 800, fontSize: '0.9rem', color: '#16a34a' }}>
                      +{formatCurrency(totalFilteredIncome, config.currency)}
                    </span>
                  </div>

                  {incomeTxs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.25rem 0.5rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                      No income entries
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '340px', overflowY: 'auto' }}>
                      {incomeTxs.map(tx => {
                        const method = tx.paymentMethod.toUpperCase();
                        return (
                          <div
                            key={tx.id}
                            style={{
                              padding: '0.5rem 0.65rem',
                              borderRadius: '6px',
                              background: '#ffffff',
                              border: tx.isLoan ? '1.5px solid #fed7aa' : '1px solid #bbf7d0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '0.4rem',
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.825rem', color: '#0f172a' }}>{tx.category}</span>
                                <span className="badge badge-income" style={{ fontSize: '0.6rem', padding: '0.1rem 0.35rem' }}>
                                  {method}
                                </span>
                                {tx.isLoan && (
                                  <span className="badge" style={{ background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', fontSize: '0.6rem', fontWeight: 700 }}>
                                    🤝 Loan Repaid
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <span>{tx.time}</span>
                                {(tx.customerName || tx.borrowerName) && <span> • {tx.customerName || tx.borrowerName}</span>}
                                {tx.note && <span> • "{tx.note}"</span>}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                              <div className="font-mono" style={{ fontSize: '0.95rem', fontWeight: 800, color: '#16a34a' }}>
                                +{formatCurrency(tx.amount, config.currency)}
                              </div>
                              <div style={{ display: 'flex', gap: '0.15rem' }}>
                                <button
                                  type="button"
                                  className="icon-btn"
                                  style={{ width: '24px', height: '24px' }}
                                  onClick={() => handleEdit(tx)}
                                  title="Edit"
                                >
                                  <Edit2 size={11} />
                                </button>
                                <button
                                  type="button"
                                  className="icon-btn"
                                  style={{ width: '24px', height: '24px', color: '#dc2626' }}
                                  onClick={() => handleDelete(tx.id, tx.amount)}
                                  title="Delete"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: EXPENSE (-) */}
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1.5px solid #fecaca',
                    borderRadius: '8px',
                    padding: '0.65rem',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingBottom: '0.5rem',
                      borderBottom: '1px solid #fecaca',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <TrendingDown size={16} style={{ color: '#dc2626' }} />
                      <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#991b1b' }}>
                        Expense (-) ({expenseTxs.length})
                      </span>
                    </div>
                    <span className="font-mono" style={{ fontWeight: 800, fontSize: '0.9rem', color: '#dc2626' }}>
                      -{formatCurrency(totalFilteredExpense, config.currency)}
                    </span>
                  </div>

                  {expenseTxs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.25rem 0.5rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                      No expense entries
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '340px', overflowY: 'auto' }}>
                      {expenseTxs.map(tx => {
                        const method = tx.paymentMethod.toUpperCase();
                        return (
                          <div
                            key={tx.id}
                            style={{
                              padding: '0.5rem 0.65rem',
                              borderRadius: '6px',
                              background: '#ffffff',
                              border: tx.isLoan ? '1.5px solid #fed7aa' : '1px solid #fecaca',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '0.4rem',
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.825rem', color: '#0f172a' }}>{tx.category}</span>
                                <span className="badge badge-expense" style={{ fontSize: '0.6rem', padding: '0.1rem 0.35rem' }}>
                                  {method}
                                </span>
                                {tx.isLoan && (
                                  <span className="badge" style={{ background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', fontSize: '0.6rem', fontWeight: 700 }}>
                                    🤝 Loan Given
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <span>{tx.time}</span>
                                {(tx.customerName || tx.borrowerName) && <span> • {tx.customerName || tx.borrowerName}</span>}
                                {tx.note && <span> • "{tx.note}"</span>}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                              <div className="font-mono" style={{ fontSize: '0.95rem', fontWeight: 800, color: '#dc2626' }}>
                                -{formatCurrency(tx.amount, config.currency)}
                              </div>
                              <div style={{ display: 'flex', gap: '0.15rem' }}>
                                <button
                                  type="button"
                                  className="icon-btn"
                                  style={{ width: '24px', height: '24px' }}
                                  onClick={() => handleEdit(tx)}
                                  title="Edit"
                                >
                                  <Edit2 size={11} />
                                </button>
                                <button
                                  type="button"
                                  className="icon-btn"
                                  style={{ width: '24px', height: '24px', color: '#dc2626' }}
                                  onClick={() => handleDelete(tx.id, tx.amount)}
                                  title="Delete"
                                >
                                  <Trash2 size={11} />
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
              /* SINGLE LIST VIEW FALLBACK */
              filteredTxs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: '#64748b' }}>
                  <Clock size={24} style={{ color: '#94a3b8', marginBottom: '0.25rem' }} />
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>No entries found.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '340px', overflowY: 'auto' }}>
                  {filteredTxs.map(tx => {
                    const isIncome = tx.type === 'income';
                    const method = tx.paymentMethod.toUpperCase();
                    return (
                      <div
                        key={tx.id}
                        style={{
                          padding: '0.55rem 0.75rem',
                          borderRadius: '6px',
                          background: '#f8fafc',
                          border: tx.isLoan ? '1.5px solid #fed7aa' : '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '4px',
                              background: isIncome ? '#f0fdf4' : '#fef2f2',
                              color: isIncome ? '#16a34a' : '#dc2626',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.85rem',
                              flexShrink: 0,
                            }}
                          >
                            {isIncome ? '+' : '−'}
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>{tx.category}</span>
                              <span className={`badge badge-${isIncome ? 'income' : 'expense'}`} style={{ fontSize: '0.625rem', padding: '0.1rem 0.35rem' }}>
                                {method}
                              </span>
                              {tx.isLoan && (
                                <span className="badge" style={{ background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', fontSize: '0.6rem', fontWeight: 700 }}>
                                  🤝 {tx.loanType === 'given' ? 'Loan Given' : 'Loan Repaid'}
                                </span>
                              )}
                            </div>

                            <div style={{ fontSize: '0.725rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <span>{tx.time}</span>
                              {(tx.customerName || tx.borrowerName) && <span> • {tx.customerName || tx.borrowerName}</span>}
                              {tx.note && <span> • "{tx.note}"</span>}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                          <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 800, color: isIncome ? '#16a34a' : '#dc2626' }}>
                            {isIncome ? '+' : '-'}{formatCurrency(tx.amount, config.currency)}
                          </div>

                          <div style={{ display: 'flex', gap: '0.2rem' }}>
                            <button
                              type="button"
                              className="icon-btn"
                              style={{ width: '26px', height: '26px' }}
                              onClick={() => handleEdit(tx)}
                              title="Edit"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn"
                              style={{ width: '26px', height: '26px', color: '#dc2626' }}
                              onClick={() => handleDelete(tx.id, tx.amount)}
                              title="Delete"
                            >
                              <Trash2 size={12} />
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
          <div style={{ marginTop: '0.75rem' }}>
            <button
              type="button"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                background: '#eff6ff',
                border: '1.5px solid #bfdbfe',
                color: '#1e40af',
                fontWeight: 700,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
              }}
              onClick={openClosingModal}
            >
              <Lock size={16} />
              <span>🔒 Close Day & Count Cash</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
