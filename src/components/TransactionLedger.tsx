import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Transaction } from '../types';
import * as XLSX from 'xlsx';
import {
  Search,
  Trash2,
  Edit2,
  Clock,
  FileSpreadsheet,
  Columns,
  Table,
  TrendingDown,
  TrendingUp,
  FileText
} from 'lucide-react';
import { formatCurrency, getTodayDateString } from '../services/storageService';

export const TransactionLedger: React.FC = () => {
  const {
    transactions,
    selectedDate,
    config,
    deleteTransaction,
    openCounterModal,
    showToast,
  } = useApp();

  const todayStr = getTodayDateString();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState<'all' | 'cash' | 'upi' | 'rtgs'>('all');
  const [dateMode, setDateMode] = useState<'selected' | 'range' | 'all'>('selected');
  const [viewMode, setViewMode] = useState<'split' | 'table'>('split');

  // Custom date range state
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Preset handlers
  const setPresetRange = (preset: 'today' | 'yesterday' | '7days' | 'thisMonth' | 'lastMonth') => {
    setDateMode('range');
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
      d7.setDate(d7.getDate() - 7);
      setStartDate(d7.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'thisMonth') {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const start = `${year}-${month}-01`;
      setStartDate(start);
      setEndDate(todayStr);
    } else if (preset === 'lastMonth') {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      const y = prevMonth.getFullYear();
      const m = String(prevMonth.getMonth() + 1).padStart(2, '0');
      const d = String(lastDay.getDate()).padStart(2, '0');
      setStartDate(`${y}-${m}-01`);
      setEndDate(`${y}-${m}-${d}`);
    }
  };

  // Filter logic
  const filteredTransactions = transactions.filter(t => {
    if (dateMode === 'selected' && t.date !== selectedDate) return false;
    if (dateMode === 'range') {
      if (t.date < startDate || t.date > endDate) return false;
    }
    if (filterMethod !== 'all' && t.paymentMethod.toLowerCase() !== filterMethod.toLowerCase()) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchNote = t.note?.toLowerCase().includes(q);
      const matchCat = t.category.toLowerCase().includes(q);
      const matchCust = t.customerName?.toLowerCase().includes(q) || t.borrowerName?.toLowerCase().includes(q);
      const matchStaff = t.staffName.toLowerCase().includes(q);
      const matchAmt = t.amount.toString().includes(q);
      return matchNote || matchCat || matchCust || matchStaff || matchAmt;
    }

    return true;
  });

  // Income FIRST (Left), Expense SECOND (Right)
  const incomeTxs = filteredTransactions.filter(t => t.type === 'income');
  const expenseTxs = filteredTransactions.filter(t => t.type === 'expense');

  const totalIncome = incomeTxs.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenseTxs.reduce((sum, t) => sum + t.amount, 0);

  const handleDelete = (tx: Transaction) => {
    if (confirm(`Are you sure you want to delete this entry of ₹${tx.amount.toLocaleString()}?`)) {
      deleteTransaction(tx.id);
    }
  };

  const handleEdit = (tx: Transaction) => {
    openCounterModal(tx.type, tx);
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    const data = filteredTransactions.map(t => ({
      'ID': t.id,
      'Date': t.date,
      'Time': t.time,
      'Type': t.type === 'income' ? 'INCOME' : 'EXPENSE',
      'Amount': t.amount,
      'Payment Mode': t.paymentMethod.toUpperCase(),
      'Category': t.category,
      'Customer / Borrower': t.customerName || t.borrowerName || '',
      'Staff': t.staffName,
      'Note': t.note || '',
      'Is Loan': t.isLoan ? 'YES' : 'NO',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    const fileName = dateMode === 'selected'
      ? `transactions_${selectedDate}.xlsx`
      : dateMode === 'range'
      ? `transactions_${startDate}_to_${endDate}.xlsx`
      : `transactions_all_history.xlsx`;
    XLSX.writeFile(wb, fileName);
    showToast(`Downloaded Excel file: ${fileName}`);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Date', 'Time', 'Type', 'Amount', 'PaymentMode', 'Category', 'Customer/Borrower', 'Staff', 'Note', 'IsLoan'];
    const rows = filteredTransactions.map(t => [
      t.id,
      t.date,
      t.time,
      t.type === 'income' ? 'INCOME' : 'EXPENSE',
      t.amount,
      t.paymentMethod.toUpperCase(),
      `"${(t.category || '').replace(/"/g, '""')}"`,
      `"${(t.customerName || t.borrowerName || '').replace(/"/g, '""')}"`,
      `"${(t.staffName || '').replace(/"/g, '""')}"`,
      `"${(t.note || '').replace(/"/g, '""')}"`,
      t.isLoan ? 'YES' : 'NO',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const fileName = dateMode === 'selected'
      ? `transactions_${selectedDate}.csv`
      : dateMode === 'range'
      ? `transactions_${startDate}_to_${endDate}.csv`
      : `transactions_all_history.csv`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Downloaded CSV: ${fileName}`);
  };

  return (
    <div className="animate-fade-in">
      {/* Controls Bar */}
      <div
        className="card"
        style={{
          marginBottom: '0.85rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
          padding: '0.75rem 1rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.2rem', width: '100%', fontSize: '0.8rem', padding: '0.4rem 0.65rem 0.4rem 2.2rem' }}
              placeholder="Search note, category, staff, amount..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Date Scope Filter */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.15rem', borderRadius: '6px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`nav-tab-btn ${dateMode === 'selected' ? 'active' : ''}`}
              style={{ fontSize: '0.725rem', padding: '0.25rem 0.55rem' }}
              onClick={() => setDateMode('selected')}
            >
              📅 {selectedDate}
            </button>
            <button
              type="button"
              className={`nav-tab-btn ${dateMode === 'range' ? 'active' : ''}`}
              style={{ fontSize: '0.725rem', padding: '0.25rem 0.55rem' }}
              onClick={() => setDateMode('range')}
            >
              📆 Custom Duration
            </button>
            <button
              type="button"
              className={`nav-tab-btn ${dateMode === 'all' ? 'active' : ''}`}
              style={{ fontSize: '0.725rem', padding: '0.25rem 0.55rem' }}
              onClick={() => setDateMode('all')}
            >
              All History
            </button>
          </div>

          {/* Payment Method Filter */}
          <select
            className="form-input"
            style={{ width: 'auto', fontSize: '0.725rem', padding: '0.25rem 0.55rem', borderRadius: '6px' }}
            value={filterMethod}
            onChange={e => setFilterMethod(e.target.value as 'all' | 'cash' | 'upi' | 'rtgs')}
          >
            <option value="all">All Modes</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="rtgs">RTGS</option>
          </select>

          {/* View Mode Toggle */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.15rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <button
              type="button"
              className={`nav-tab-btn ${viewMode === 'split' ? 'active' : ''}`}
              style={{ fontSize: '0.725rem', padding: '0.25rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              onClick={() => setViewMode('split')}
              title="Split View: Left Income | Right Expense"
            >
              <Columns size={12} />
              <span>Split View</span>
            </button>
            <button
              type="button"
              className={`nav-tab-btn ${viewMode === 'table' ? 'active' : ''}`}
              style={{ fontSize: '0.725rem', padding: '0.25rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <Table size={12} />
              <span>Table</span>
            </button>
          </div>

          {/* Export Buttons: Excel & CSV */}
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button
              type="button"
              className="icon-btn"
              style={{ padding: '0.3rem 0.6rem', width: 'auto', borderRadius: '6px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontSize: '0.725rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              onClick={handleExportExcel}
              title="Export to Excel (.xlsx)"
            >
              <FileSpreadsheet size={14} />
              <span>Excel</span>
            </button>
            <button
              type="button"
              className="icon-btn"
              style={{ padding: '0.3rem 0.6rem', width: 'auto', borderRadius: '6px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontSize: '0.725rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              onClick={handleExportCSV}
              title="Export to CSV"
            >
              <FileText size={14} />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Enhanced Custom Date Duration Row with Quick Presets */}
        {dateMode === 'range' && (
          <div
            className="animate-scale-in"
            style={{
              background: '#eff6ff',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #bfdbfe',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            {/* Quick Presets Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.725rem', color: '#1e40af', fontWeight: 700 }}>Quick Select:</span>
              <button
                type="button"
                style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: '#ffffff', border: '1px solid #bfdbfe', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, color: '#1d4ed8' }}
                onClick={() => setPresetRange('today')}
              >
                Today
              </button>
              <button
                type="button"
                style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: '#ffffff', border: '1px solid #bfdbfe', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, color: '#1d4ed8' }}
                onClick={() => setPresetRange('yesterday')}
              >
                Yesterday
              </button>
              <button
                type="button"
                style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: '#ffffff', border: '1px solid #bfdbfe', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, color: '#1d4ed8' }}
                onClick={() => setPresetRange('7days')}
              >
                Last 7 Days
              </button>
              <button
                type="button"
                style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: '#ffffff', border: '1px solid #bfdbfe', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, color: '#1d4ed8' }}
                onClick={() => setPresetRange('thisMonth')}
              >
                This Month
              </button>
              <button
                type="button"
                style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: '#ffffff', border: '1px solid #bfdbfe', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, color: '#1d4ed8' }}
                onClick={() => setPresetRange('lastMonth')}
              >
                Last Month
              </button>
            </div>

            {/* Date Pickers */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.725rem', color: '#475569', fontWeight: 600 }}>From Date:</span>
                <input
                  type="date"
                  className="form-input"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', width: 'auto', fontWeight: 700 }}
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.725rem', color: '#475569', fontWeight: 600 }}>To Date:</span>
                <input
                  type="date"
                  className="form-input"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', width: 'auto', fontWeight: 700 }}
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>

              <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 700, marginLeft: 'auto' }}>
                Showing {filteredTransactions.length} entries ({formatCurrency(totalIncome - totalExpense, config.currency)} net)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TWO-COLUMN SPLIT VIEW: Left = Income, Right = Expense */}
      {viewMode === 'split' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '0.85rem',
          }}
        >
          {/* LEFT COLUMN: INCOME (+) */}
          <div
            className="card"
            style={{
              background: '#f0fdf4',
              border: '1.5px solid #bbf7d0',
              padding: '0.75rem',
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
                marginBottom: '0.6rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <TrendingUp size={17} style={{ color: '#16a34a' }} />
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#166534' }}>
                  Income (+) ({incomeTxs.length})
                </span>
              </div>
              <span className="font-mono" style={{ fontWeight: 800, fontSize: '0.95rem', color: '#16a34a' }}>
                +{formatCurrency(totalIncome, config.currency)}
              </span>
            </div>

            {incomeTxs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                No income transactions found
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '480px', overflowY: 'auto' }}>
                {incomeTxs.map(tx => {
                  const method = tx.paymentMethod.toUpperCase();
                  return (
                    <div
                      key={tx.id}
                      style={{
                        padding: '0.55rem 0.75rem',
                        borderRadius: '6px',
                        background: '#ffffff',
                        border: tx.isLoan ? '1.5px solid #fed7aa' : '1px solid #bbf7d0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>{tx.category}</span>
                          <span className="badge badge-income" style={{ fontSize: '0.625rem', padding: '0.1rem 0.35rem' }}>
                            {method}
                          </span>
                          {tx.isLoan && (
                            <span className="badge" style={{ background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', fontSize: '0.6rem', fontWeight: 700 }}>
                              🤝 Loan Repaid
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span>{tx.time} ({tx.date})</span>
                          {(tx.customerName || tx.borrowerName) && <span> • {tx.customerName || tx.borrowerName}</span>}
                          {tx.note && <span> • "{tx.note}"</span>}
                          <span style={{ opacity: 0.7 }}> • By {tx.staffName}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                        <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 800, color: '#16a34a' }}>
                          +{formatCurrency(tx.amount, config.currency)}
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
                            onClick={() => handleDelete(tx)}
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
            )}
          </div>

          {/* RIGHT COLUMN: EXPENSE (-) */}
          <div
            className="card"
            style={{
              background: '#fef2f2',
              border: '1.5px solid #fecaca',
              padding: '0.75rem',
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
                marginBottom: '0.6rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <TrendingDown size={17} style={{ color: '#dc2626' }} />
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#991b1b' }}>
                  Expense (-) ({expenseTxs.length})
                </span>
              </div>
              <span className="font-mono" style={{ fontWeight: 800, fontSize: '0.95rem', color: '#dc2626' }}>
                -{formatCurrency(totalExpense, config.currency)}
              </span>
            </div>

            {expenseTxs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                No expense transactions found
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '480px', overflowY: 'auto' }}>
                {expenseTxs.map(tx => {
                  const method = tx.paymentMethod.toUpperCase();
                  return (
                    <div
                      key={tx.id}
                      style={{
                        padding: '0.55rem 0.75rem',
                        borderRadius: '6px',
                        background: '#ffffff',
                        border: tx.isLoan ? '1.5px solid #fed7aa' : '1px solid #fecaca',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>{tx.category}</span>
                          <span className="badge badge-expense" style={{ fontSize: '0.625rem', padding: '0.1rem 0.35rem' }}>
                            {method}
                          </span>
                          {tx.isLoan && (
                            <span className="badge" style={{ background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', fontSize: '0.6rem', fontWeight: 700 }}>
                              🤝 Loan Given
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span>{tx.time} ({tx.date})</span>
                          {(tx.customerName || tx.borrowerName) && <span> • {tx.customerName || tx.borrowerName}</span>}
                          {tx.note && <span> • "{tx.note}"</span>}
                          <span style={{ opacity: 0.7 }}> • By {tx.staffName}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                        <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 800, color: '#dc2626' }}>
                          -{formatCurrency(tx.amount, config.currency)}
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
                            onClick={() => handleDelete(tx)}
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
                    <th>Category</th>
                    <th>Party / Borrower</th>
                    <th>Note</th>
                    <th>Mode</th>
                    <th>Staff</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map(tx => {
                    const isIncome = tx.type === 'income';
                    const method = tx.paymentMethod.toUpperCase();

                    return (
                      <tr key={tx.id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{tx.time}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{tx.date}</div>
                        </td>
                        <td>
                          <span className={`badge badge-${isIncome ? 'income' : 'expense'}`} style={{ fontSize: '0.7rem' }}>
                            {isIncome ? 'Income' : 'Expense'}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{tx.category}</div>
                          {tx.isLoan && (
                            <span className="badge" style={{ background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', fontSize: '0.6rem', fontWeight: 700 }}>
                              🤝 {tx.loanType === 'given' ? 'Loan Given' : 'Loan Repaid'}
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>
                            {tx.customerName || tx.borrowerName || '—'}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.75rem', color: '#475569', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {tx.note || '—'}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${method === 'CASH' ? 'badge-cash' : 'badge-online'}`} style={{ fontSize: '0.7rem' }}>
                            {method}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{tx.staffName}</span>
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
