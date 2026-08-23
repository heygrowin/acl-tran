import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Transaction } from '../types';
import {
  Search,
  Trash2,
  Edit2,
  Clock,
  Columns,
  Table,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import { formatCurrency, getTodayDateString } from '../services/storageService';

export const TransactionLedger: React.FC = () => {
  const {
    transactions,
    selectedDate,
    config,
    deleteTransaction,
    openCounterModal,
  } = useApp();

  const todayStr = getTodayDateString();

  // Local Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState<'all' | 'cash' | 'upi' | 'rtgs'>('all');
  const [dateMode, setDateMode] = useState<'selected' | 'range' | 'all'>('selected');
  const [startDate, setStartDate] = useState(selectedDate);
  const [endDate, setEndDate] = useState(selectedDate);
  const [viewMode, setViewMode] = useState<'split' | 'table'>('split');

  // Quick Range Presets
  const setPresetRange = (preset: 'today' | 'yesterday' | '7days' | 'thisMonth' | 'lastMonth') => {
    const now = new Date();
    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === '7days') {
      const d7 = new Date();
      d7.setDate(d7.getDate() - 6);
      setStartDate(d7.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else if (preset === 'lastMonth') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      setStartDate(firstDayLastMonth);
      setEndDate(lastDayLastMonth);
    }
  };

  // Filter Transactions
  const filteredTransactions = transactions.filter(t => {
    // 1. Date Scope Filter
    if (dateMode === 'selected') {
      if (t.date !== selectedDate) return false;
    } else if (dateMode === 'range') {
      if (t.date < startDate || t.date > endDate) return false;
    }

    // 2. Payment Method Filter
    if (filterMethod !== 'all') {
      if (t.paymentMethod.toLowerCase() !== filterMethod.toLowerCase()) {
        return false;
      }
    }

    // 3. Search Query Filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchCat = t.category?.toLowerCase().includes(q);
      const matchNote = t.note?.toLowerCase().includes(q);
      const matchPhone = t.customerPhone?.toLowerCase().includes(q) || t.borrowerPhone?.toLowerCase().includes(q);
      const matchStaff = t.staffName?.toLowerCase().includes(q);
      const matchAccount = t.paymentAccount?.toLowerCase().includes(q);
      const matchAmt = t.amount.toString().includes(q);
      return matchCat || matchNote || matchPhone || matchStaff || matchAccount || matchAmt;
    }

    return true;
  });

  // Split: Receive (Left) vs Expense (Right)
  const incomeTxs = filteredTransactions.filter(t => t.type === 'income');
  const expenseTxs = filteredTransactions.filter(t => t.type === 'expense');

  const totalIncome = incomeTxs.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenseTxs.reduce((sum, t) => sum + t.amount, 0);

  const handleDelete = (tx: Transaction) => {
    if (confirm(`Delete ${tx.type.toUpperCase()} entry of ₹${tx.amount.toLocaleString()}?`)) {
      deleteTransaction(tx.id);
    }
  };

  const handleEdit = (tx: Transaction) => {
    openCounterModal(tx.type, tx);
  };

  return (
    <div className="animate-fade-in">
      {/* Controls Bar */}
      <div
        className="card"
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          padding: '0.5rem 0.65rem',
          marginBottom: '0.45rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        {/* Main Controls Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.4rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 180px', minWidth: '140px' }}>
            <Search size={13} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '1.9rem', width: '100%', fontSize: '0.775rem', padding: '0.3rem 0.55rem 0.3rem 1.9rem' }}
              placeholder="Search note, head, phone, amount..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Date Scope Filter */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.12rem', borderRadius: '6px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`nav-tab-btn ${dateMode === 'selected' ? 'active' : ''}`}
              style={{ fontSize: '0.7rem', padding: '0.18rem 0.45rem' }}
              onClick={() => setDateMode('selected')}
            >
              📅 {selectedDate}
            </button>
            <button
              type="button"
              className={`nav-tab-btn ${dateMode === 'range' ? 'active' : ''}`}
              style={{ fontSize: '0.7rem', padding: '0.18rem 0.45rem' }}
              onClick={() => setDateMode('range')}
            >
              📆 Custom
            </button>
            <button
              type="button"
              className={`nav-tab-btn ${dateMode === 'all' ? 'active' : ''}`}
              style={{ fontSize: '0.7rem', padding: '0.18rem 0.45rem' }}
              onClick={() => setDateMode('all')}
            >
              All
            </button>
          </div>

          {/* Payment Method Filter */}
          <select
            className="form-input"
            style={{ width: 'auto', fontSize: '0.7rem', padding: '0.18rem 0.45rem', borderRadius: '6px' }}
            value={filterMethod}
            onChange={e => setFilterMethod(e.target.value as 'all' | 'cash' | 'upi' | 'rtgs')}
          >
            <option value="all">All Modes</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="rtgs">RTGS</option>
          </select>

          {/* View Mode Toggle */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.12rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <button
              type="button"
              className={`nav-tab-btn ${viewMode === 'split' ? 'active' : ''}`}
              style={{ fontSize: '0.7rem', padding: '0.18rem 0.45rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
              onClick={() => setViewMode('split')}
              title="Split View: Left Receive | Right Expense"
            >
              <Columns size={11} />
              <span>Split</span>
            </button>
            <button
              type="button"
              className={`nav-tab-btn ${viewMode === 'table' ? 'active' : ''}`}
              style={{ fontSize: '0.7rem', padding: '0.18rem 0.45rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <Table size={11} />
              <span>Table</span>
            </button>
          </div>
        </div>

        {/* Custom Date Duration Row with Quick Presets */}
        {dateMode === 'range' && (
          <div
            className="animate-scale-in"
            style={{
              background: '#eff6ff',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #bfdbfe',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
            }}
          >
            {/* Quick Presets Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.7rem', color: '#1e40af', fontWeight: 700 }}>Quick:</span>
              <button
                type="button"
                style={{ fontSize: '0.675rem', padding: '0.15rem 0.4rem', background: '#ffffff', border: '1px solid #bfdbfe', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, color: '#1d4ed8' }}
                onClick={() => setPresetRange('today')}
              >
                Today
              </button>
              <button
                type="button"
                style={{ fontSize: '0.675rem', padding: '0.15rem 0.4rem', background: '#ffffff', border: '1px solid #bfdbfe', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, color: '#1d4ed8' }}
                onClick={() => setPresetRange('yesterday')}
              >
                Yesterday
              </button>
              <button
                type="button"
                style={{ fontSize: '0.675rem', padding: '0.15rem 0.4rem', background: '#ffffff', border: '1px solid #bfdbfe', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, color: '#1d4ed8' }}
                onClick={() => setPresetRange('7days')}
              >
                7 Days
              </button>
              <button
                type="button"
                style={{ fontSize: '0.675rem', padding: '0.15rem 0.4rem', background: '#ffffff', border: '1px solid #bfdbfe', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, color: '#1d4ed8' }}
                onClick={() => setPresetRange('thisMonth')}
              >
                This Month
              </button>
              <button
                type="button"
                style={{ fontSize: '0.675rem', padding: '0.15rem 0.4rem', background: '#ffffff', border: '1px solid #bfdbfe', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, color: '#1d4ed8' }}
                onClick={() => setPresetRange('lastMonth')}
              >
                Last Month
              </button>
            </div>

            {/* Date Pickers */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 600 }}>From:</span>
                <input
                  type="date"
                  className="form-input"
                  style={{ padding: '0.2rem 0.4rem', fontSize: '0.725rem', width: 'auto', fontWeight: 700 }}
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 600 }}>To:</span>
                <input
                  type="date"
                  className="form-input"
                  style={{ padding: '0.2rem 0.4rem', fontSize: '0.725rem', width: 'auto', fontWeight: 700 }}
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>

              <div style={{ fontSize: '0.725rem', color: '#1e40af', fontWeight: 700, marginLeft: 'auto' }}>
                {filteredTransactions.length} entries ({formatCurrency(totalIncome - totalExpense, config.currency)} net)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TWO-COLUMN SPLIT VIEW: Left = Receive, Right = Expense */}
      {viewMode === 'split' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '0.55rem',
          }}
        >
          {/* LEFT COLUMN: RECEIVE */}
          <div
            className="card"
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              padding: '0.55rem 0.65rem',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '0.35rem',
                borderBottom: '1px solid #bbf7d0',
                marginBottom: '0.45rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <TrendingUp size={15} style={{ color: '#16a34a' }} />
                <span className="badge badge-income" style={{ fontSize: '0.675rem', padding: '0.05rem 0.4rem', fontWeight: 800 }}>
                  +{incomeTxs.length}
                </span>
              </div>
              <span className="font-mono" style={{ fontWeight: 800, fontSize: '0.9rem', color: '#16a34a' }}>
                +{formatCurrency(totalIncome, config.currency)}
              </span>
            </div>

            {incomeTxs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                No receive transactions
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '480px', overflowY: 'auto' }}>
                {incomeTxs.map(tx => {
                  const isUpi = tx.paymentMethod.toLowerCase() === 'upi';
                  const displayMethod = isUpi
                    ? (tx.paymentAccount ? `UPI (${tx.paymentAccount})` : 'UPI')
                    : tx.paymentMethod.toUpperCase();

                  return (
                    <div
                      key={tx.id}
                      style={{
                        padding: '0.45rem 0.6rem',
                        borderRadius: '5px',
                        background: '#ffffff',
                        border: tx.isLoan ? '1px solid #fed7aa' : '1px solid #dcfce7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.4rem',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        {/* Primary: Head */}
                        <div style={{ fontWeight: 800, fontSize: '0.825rem', color: '#0f172a', lineHeight: 1.25 }}>
                          {tx.category || 'Receive'}
                        </div>

                        {/* Subtitle: Made by + Payment Mode + Note + Phone */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.15rem', fontSize: '0.675rem', color: '#475569' }}>
                          <span style={{ fontWeight: 700, color: '#1e293b' }}>
                            👤 {tx.staffName || 'Counter'}
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

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                        <div className="font-mono" style={{ fontSize: '0.9rem', fontWeight: 800, color: '#16a34a' }}>
                          +{formatCurrency(tx.amount, config.currency)}
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
                            onClick={() => handleDelete(tx)}
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
            className="card"
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              padding: '0.55rem 0.65rem',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '0.35rem',
                borderBottom: '1px solid #fecaca',
                marginBottom: '0.45rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <TrendingDown size={15} style={{ color: '#dc2626' }} />
                <span className="badge badge-expense" style={{ fontSize: '0.675rem', padding: '0.05rem 0.4rem', fontWeight: 800 }}>
                  −{expenseTxs.length}
                </span>
              </div>
              <span className="font-mono" style={{ fontWeight: 800, fontSize: '0.9rem', color: '#dc2626' }}>
                -{formatCurrency(totalExpense, config.currency)}
              </span>
            </div>

            {expenseTxs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                No expense transactions
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '480px', overflowY: 'auto' }}>
                {expenseTxs.map(tx => {
                  const isUpi = tx.paymentMethod.toLowerCase() === 'upi';
                  const displayMethod = isUpi
                    ? (tx.paymentAccount ? `UPI (${tx.paymentAccount})` : 'UPI')
                    : tx.paymentMethod.toUpperCase();

                  return (
                    <div
                      key={tx.id}
                      style={{
                        padding: '0.45rem 0.6rem',
                        borderRadius: '5px',
                        background: '#ffffff',
                        border: tx.isLoan ? '1px solid #fed7aa' : '1px solid #fee2e2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.4rem',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        {/* Primary: Head */}
                        <div style={{ fontWeight: 800, fontSize: '0.825rem', color: '#0f172a', lineHeight: 1.25 }}>
                          {tx.category || 'Expense'}
                        </div>

                        {/* Subtitle: Made by + Payment Mode + Note + Phone */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.15rem', fontSize: '0.675rem', color: '#475569' }}>
                          <span style={{ fontWeight: 700, color: '#1e293b' }}>
                            👤 {tx.staffName || 'Counter'}
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

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                        <div className="font-mono" style={{ fontSize: '0.9rem', fontWeight: 800, color: '#dc2626' }}>
                          -{formatCurrency(tx.amount, config.currency)}
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
                            onClick={() => handleDelete(tx)}
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
        /* TABLE VIEW */
        <div className="card" style={{ padding: '0.85rem 1rem' }}>
          {filteredTransactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b' }}>
              <Clock size={28} style={{ color: '#94a3b8', marginBottom: '0.35rem' }} />
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>No transactions found for the selected filter.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="tx-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Time / Date</th>
                    <th>Type</th>
                    <th>Head</th>
                    <th>Phone Number</th>
                    <th>Note</th>
                    <th>Mode & Account</th>
                    <th>Staff / Made By</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map(tx => {
                    const isIncome = tx.type === 'income';
                    const isUpi = tx.paymentMethod.toLowerCase() === 'upi';
                    const methodDisplay = isUpi
                      ? (tx.paymentAccount ? `UPI (${tx.paymentAccount})` : 'UPI')
                      : tx.paymentMethod.toUpperCase();

                    return (
                      <tr key={tx.id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{tx.time}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{tx.date}</div>
                        </td>
                        <td>
                          <span className={`badge badge-${isIncome ? 'income' : 'expense'}`} style={{ fontSize: '0.7rem' }}>
                            {isIncome ? 'Receive' : 'Expense'}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700 }}>{tx.category}</div>
                          {tx.isLoan && (
                            <span className="badge" style={{ background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', fontSize: '0.6rem', fontWeight: 700 }}>
                              🤝 {tx.loanType === 'given' ? 'Loan Given' : 'Loan Repaid'}
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>
                            {tx.customerPhone || tx.borrowerPhone || '—'}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.75rem', color: '#475569', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {tx.note || '—'}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${tx.paymentMethod === 'cash' ? 'badge-cash' : 'badge-online'}`} style={{ fontSize: '0.7rem' }}>
                            {methodDisplay}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.75rem', color: '#1e293b', fontWeight: 600 }}>👤 {tx.staffName}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="font-mono" style={{ fontWeight: 800, color: isIncome ? '#16a34a' : '#dc2626' }}>
                            {isIncome ? '+' : '-'}{formatCurrency(tx.amount, config.currency)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem' }}>
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
                              onClick={() => handleDelete(tx)}
                              title="Delete"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
