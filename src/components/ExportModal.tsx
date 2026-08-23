import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  FileSpreadsheet,
  FileText,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatCurrency, storage, getTodayDateString } from '../services/storageService';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFormat?: 'excel' | 'csv';
}

type PresetDateRange = 'today' | 'yesterday' | '7days' | 'thisMonth' | 'lastMonth' | 'all' | 'custom';

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  defaultFormat = 'excel',
}) => {
  const { config, showToast } = useApp();
  const [format, setFormat] = useState<'excel' | 'csv'>(defaultFormat);
  const [rangePreset, setRangePreset] = useState<PresetDateRange>('today');
  const [startDate, setStartDate] = useState<string>(getTodayDateString());
  const [endDate, setEndDate] = useState<string>(getTodayDateString());

  if (!isOpen) return null;

  const todayStr = getTodayDateString();

  const handleSelectPreset = (preset: PresetDateRange) => {
    setRangePreset(preset);
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
    } else if (preset === 'all') {
      setStartDate('2020-01-01');
      setEndDate('2099-12-31');
    }
  };

  const allTxs = storage.getTransactions();

  const filtered = allTxs.filter(t => {
    if (rangePreset === 'all') return true;
    return t.date >= startDate && t.date <= endDate;
  });

  const totalReceive = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const netFlow = totalReceive - totalExpense;

  const handleDownload = () => {
    if (filtered.length === 0) {
      showToast('No transactions found in this date range', 'error');
      return;
    }

    const rangeLabel = rangePreset === 'today'
      ? `today_${startDate}`
      : rangePreset === 'all'
      ? 'all_history'
      : `${startDate}_to_${endDate}`;

    if (format === 'excel') {
      const data = filtered.map(t => ({
        'ID': t.id,
        'Date': t.date,
        'Time': t.time,
        'Type': t.type === 'income' ? 'RECEIVE' : 'EXPENSE',
        'Amount': t.amount,
        'Payment Mode': t.paymentMethod.toUpperCase(),
        'UPI / Online Account': t.paymentAccount || '',
        'Head': t.category,
        'Phone Number': t.customerPhone || t.borrowerPhone || '',
        'Staff': t.staffName,
        'Note / Description': t.note || '',
        'Is Loan': t.isLoan ? 'YES' : 'NO',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
      const fileName = `transactions_${rangeLabel}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showToast(`✓ Downloaded Excel: ${fileName}`);
    } else {
      const headers = ['ID', 'Date', 'Time', 'Type', 'Amount', 'PaymentMode', 'UpiAccount', 'Head', 'Phone', 'Staff', 'Note', 'IsLoan'];
      const rows = filtered.map(t => [
        t.id,
        t.date,
        t.time,
        t.type === 'income' ? 'RECEIVE' : 'EXPENSE',
        t.amount,
        t.paymentMethod.toUpperCase(),
        `"${(t.paymentAccount || '').replace(/"/g, '""')}"`,
        `"${(t.category || '').replace(/"/g, '""')}"`,
        `"${(t.customerPhone || t.borrowerPhone || '').replace(/"/g, '""')}"`,
        `"${(t.staffName || '').replace(/"/g, '""')}"`,
        `"${(t.note || '').replace(/"/g, '""')}"`,
        t.isLoan ? 'YES' : 'NO',
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      const fileName = `transactions_${rangeLabel}.csv`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`✓ Downloaded CSV: ${fileName}`);
    }

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.65rem 0.85rem',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Download size={16} style={{ color: '#2563eb' }} />
            <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
              Export Transactions
            </h2>
          </div>
          <button className="icon-btn" style={{ width: '26px', height: '26px' }} onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '0.75rem 0.85rem' }}>
          {/* Format Selection: Excel vs CSV */}
          <div style={{ marginBottom: '0.65rem' }}>
            <label style={{ fontSize: '0.725rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
              Export Format:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
              <button
                type="button"
                className={`method-chip ${format === 'excel' ? 'active' : ''}`}
                style={{
                  padding: '0.45rem',
                  border: format === 'excel' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                  background: format === 'excel' ? '#f0fdf4' : '#ffffff',
                  color: format === 'excel' ? '#16a34a' : '#475569',
                  justifyContent: 'center',
                }}
                onClick={() => setFormat('excel')}
              >
                <FileSpreadsheet size={16} />
                <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                className={`method-chip ${format === 'csv' ? 'active' : ''}`}
                style={{
                  padding: '0.45rem',
                  border: format === 'csv' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  background: format === 'csv' ? '#eff6ff' : '#ffffff',
                  color: format === 'csv' ? '#2563eb' : '#475569',
                  justifyContent: 'center',
                }}
                onClick={() => setFormat('csv')}
              >
                <FileText size={16} />
                <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>CSV (.csv)</span>
              </button>
            </div>
          </div>

          {/* Quick Date Range Presets */}
          <div style={{ marginBottom: '0.65rem' }}>
            <label style={{ fontSize: '0.725rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
              Select Date Duration:
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
              {[
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: '7days', label: 'Last 7 Days' },
                { id: 'thisMonth', label: 'This Month' },
                { id: 'lastMonth', label: 'Last Month' },
                { id: 'all', label: 'All History' },
                { id: 'custom', label: 'Custom Range' },
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  style={{
                    fontSize: '0.725rem',
                    padding: '0.25rem 0.55rem',
                    borderRadius: '5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: rangePreset === p.id ? '#2563eb' : '#f1f5f9',
                    color: rangePreset === p.id ? '#ffffff' : '#475569',
                    border: rangePreset === p.id ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  }}
                  onClick={() => handleSelectPreset(p.id as PresetDateRange)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Pickers (Custom / Range) */}
          {rangePreset !== 'all' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem', marginBottom: '0.65rem' }}>
              <div>
                <label style={{ fontSize: '0.675rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '0.15rem' }}>
                  From Date:
                </label>
                <input
                  type="date"
                  className="form-input"
                  style={{ fontSize: '0.775rem', padding: '0.35rem 0.5rem', width: '100%', fontWeight: 700 }}
                  value={startDate}
                  onChange={e => {
                    setStartDate(e.target.value);
                    setRangePreset('custom');
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.675rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '0.15rem' }}>
                  To Date:
                </label>
                <input
                  type="date"
                  className="form-input"
                  style={{ fontSize: '0.775rem', padding: '0.35rem 0.5rem', width: '100%', fontWeight: 700 }}
                  value={endDate}
                  onChange={e => {
                    setEndDate(e.target.value);
                    setRangePreset('custom');
                  }}
                />
              </div>
            </div>
          )}

          {/* Export Summary Box */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '0.55rem 0.75rem',
              marginBottom: '0.75rem',
              fontSize: '0.725rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
              <span style={{ color: '#64748b' }}>Total Entries:</span>
              <strong style={{ color: '#0f172a' }}>{filtered.length} entries</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
              <span style={{ color: '#64748b' }}>Total Receive (+):</span>
              <strong className="font-mono" style={{ color: '#16a34a' }}>+{formatCurrency(totalReceive, config.currency)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
              <span style={{ color: '#64748b' }}>Total Expense (−):</span>
              <strong className="font-mono" style={{ color: '#dc2626' }}>-{formatCurrency(totalExpense, config.currency)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '0.25rem', marginTop: '0.25rem' }}>
              <span style={{ fontWeight: 700 }}>Net Flow:</span>
              <strong className="font-mono" style={{ color: netFlow >= 0 ? '#16a34a' : '#dc2626' }}>
                {netFlow >= 0 ? '+' : ''}{formatCurrency(netFlow, config.currency)}
              </strong>
            </div>
          </div>

          {/* Download Action Button */}
          <button
            type="button"
            className="btn-fast-income"
            style={{
              width: '100%',
              padding: '0.65rem',
              fontSize: '0.9rem',
              fontWeight: 800,
              background: format === 'excel' ? '#16a34a' : '#2563eb',
              boxShadow: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
            }}
            onClick={handleDownload}
          >
            <Download size={16} />
            <span>Download {format === 'excel' ? 'Excel (.xlsx)' : 'CSV (.csv)'} ({filtered.length} entries)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
