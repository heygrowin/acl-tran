import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { BusinessConfig, Transaction } from '../types';
import { CounterManager } from './CounterManager';
import * as XLSX from 'xlsx';
import {
  Store,
  Key,
  Users,
  Database,
  Download,
  Upload,
  RefreshCw,
  Plus,
  Trash2,
  Check,
  Flame,
  HardDrive,
  UserCheck,
  AlertTriangle,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { storage, getTodayDateString } from '../services/storageService';

export const SettingsModal: React.FC = () => {
  const {
    config,
    updateConfig,
    refreshData,
    showToast,
    transactions,
    deleteTransactionsBetween,
    deleteTransactionsByMonth
  } = useApp();

  const [formData, setFormData] = useState<BusinessConfig>(config);
  const [newIncomeCat, setNewIncomeCat] = useState('');
  const [newExpenseCat, setNewExpenseCat] = useState('');
  const [activeTab, setActiveTab] = useState<'counters' | 'general' | 'categories' | 'passwords' | 'storage'>('counters');

  // Purge state
  const [purgeStartDate, setPurgeStartDate] = useState('');
  const [purgeEndDate, setPurgeEndDate] = useState('');
  const [purgeMonth, setPurgeMonth] = useState(() => getTodayDateString().substring(0, 7));

  // Backup / Export state
  const [exportStartDate, setExportStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [exportEndDate, setExportEndDate] = useState(() => getTodayDateString());
  const [exportMonth, setExportMonth] = useState(() => getTodayDateString().substring(0, 7));

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig(formData);
    showToast('Store settings updated successfully');
  };

  const handleSavePasswords = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig(formData);
    showToast('Passwords saved successfully');
  };

  const handleAddIncomeCategory = () => {
    if (!newIncomeCat.trim()) return;
    if (formData.incomeCategories.includes(newIncomeCat.trim())) return;
    const updated = {
      ...formData,
      incomeCategories: [...formData.incomeCategories, newIncomeCat.trim()],
    };
    setFormData(updated);
    updateConfig(updated);
    setNewIncomeCat('');
  };

  const handleRemoveIncomeCategory = (cat: string) => {
    const updated = {
      ...formData,
      incomeCategories: formData.incomeCategories.filter(c => c !== cat),
    };
    setFormData(updated);
    updateConfig(updated);
  };

  const handleAddExpenseCategory = () => {
    if (!newExpenseCat.trim()) return;
    if (formData.expenseCategories.includes(newExpenseCat.trim())) return;
    const updated = {
      ...formData,
      expenseCategories: [...formData.expenseCategories, newExpenseCat.trim()],
    };
    setFormData(updated);
    updateConfig(updated);
    setNewExpenseCat('');
  };

  const handleRemoveExpenseCategory = (cat: string) => {
    const updated = {
      ...formData,
      expenseCategories: formData.expenseCategories.filter(c => c !== cat),
    };
    setFormData(updated);
    updateConfig(updated);
  };

  const exportTransactionsToExcel = (txList: Transaction[], fileName: string) => {
    const data = txList.map(t => ({
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
    XLSX.writeFile(wb, fileName);
    showToast(`Downloaded Excel file: ${fileName}`);
  };

  const exportTransactionsToCSV = (txList: Transaction[], fileName: string) => {
    const headers = ['ID', 'Date', 'Time', 'Type', 'Amount', 'PaymentMode', 'Category', 'Customer/Borrower', 'Staff', 'Note', 'IsLoan'];
    const rows = txList.map(t => [
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
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Downloaded CSV file: ${fileName}`);
  };

  const handleExportRangeExcel = () => {
    if (!exportStartDate || !exportEndDate) {
      alert('Please select both From and To dates');
      return;
    }
    const list = transactions.filter(t => t.date >= exportStartDate && t.date <= exportEndDate);
    exportTransactionsToExcel(list, `backup_${exportStartDate}_to_${exportEndDate}.xlsx`);
  };

  const handleExportRangeCSV = () => {
    if (!exportStartDate || !exportEndDate) {
      alert('Please select both From and To dates');
      return;
    }
    const list = transactions.filter(t => t.date >= exportStartDate && t.date <= exportEndDate);
    exportTransactionsToCSV(list, `backup_${exportStartDate}_to_${exportEndDate}.csv`);
  };

  const handleExportMonthExcel = () => {
    if (!exportMonth) {
      alert('Please select a month');
      return;
    }
    const list = transactions.filter(t => t.date.startsWith(exportMonth));
    exportTransactionsToExcel(list, `backup_month_${exportMonth}.xlsx`);
  };

  const handleExportMonthCSV = () => {
    if (!exportMonth) {
      alert('Please select a month');
      return;
    }
    const list = transactions.filter(t => t.date.startsWith(exportMonth));
    exportTransactionsToCSV(list, `backup_month_${exportMonth}.csv`);
  };

  const handleExportBackup = () => {
    const jsonStr = storage.exportFullBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `acl-counter-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSON Backup downloaded successfully!');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      if (text) {
        const ok = storage.importFullBackup(text);
        if (ok) {
          refreshData();
          showToast('Data restored successfully!', 'success');
        } else {
          alert('Invalid backup file format');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleResetDemoData = () => {
    if (confirm('Reset all transactions and settings to clean demo state? This will clear current local data.')) {
      storage.resetToSampleData();
      refreshData();
      showToast('Reset to demo state');
    }
  };

  const handleDeleteByRange = () => {
    if (!purgeStartDate || !purgeEndDate) {
      alert('Please select both From and To dates');
      return;
    }
    if (confirm(`Are you sure you want to permanently delete all transactions between ${purgeStartDate} and ${purgeEndDate}?`)) {
      deleteTransactionsBetween(purgeStartDate, purgeEndDate);
    }
  };

  const handleDeleteByMonth = () => {
    if (!purgeMonth) {
      alert('Please select a month');
      return;
    }
    if (confirm(`Are you sure you want to permanently delete all transactions for ${purgeMonth}?`)) {
      deleteTransactionsByMonth(purgeMonth);
    }
  };

  return (
    <div className="card" style={{ padding: '0.65rem 0.85rem', border: '1px solid #e2e8f0', background: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
      {/* Settings Sub-Tabs (Apple Segmented Style) */}
      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem', marginBottom: '0.85rem', overflowX: 'auto' }}>
        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'counters' ? 'active' : ''}`}
          style={{ fontSize: '0.725rem', padding: '0.25rem 0.55rem' }}
          onClick={() => setActiveTab('counters')}
        >
          <UserCheck size={13} />
          <span>Counters</span>
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'general' ? 'active' : ''}`}
          style={{ fontSize: '0.725rem', padding: '0.25rem 0.55rem' }}
          onClick={() => setActiveTab('general')}
        >
          <Store size={13} />
          <span>Store</span>
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
          style={{ fontSize: '0.725rem', padding: '0.25rem 0.55rem' }}
          onClick={() => setActiveTab('categories')}
        >
          <Users size={13} />
          <span>Categories</span>
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'passwords' ? 'active' : ''}`}
          style={{ fontSize: '0.725rem', padding: '0.25rem 0.55rem' }}
          onClick={() => setActiveTab('passwords')}
        >
          <Key size={13} />
          <span>Security</span>
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'storage' ? 'active' : ''}`}
          style={{ fontSize: '0.725rem', padding: '0.25rem 0.55rem' }}
          onClick={() => setActiveTab('storage')}
        >
          <Database size={13} />
          <span>Backup & Purge</span>
        </button>
      </div>

      <div>
        {/* 1. COUNTER MANAGEMENT TAB */}
        {activeTab === 'counters' && (
          <div>
            <CounterManager />
          </div>
        )}

        {/* 2. GENERAL TAB */}
        {activeTab === 'general' && (
          <form onSubmit={handleSaveGeneral}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem', marginBottom: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Store / Business Name:</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: '0.825rem', padding: '0.45rem 0.65rem' }}
                  value={formData.businessName}
                  onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                  placeholder="My Store Counter"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Currency Symbol:</label>
                <input
                  type="text"
                  className="form-input font-mono"
                  style={{ fontSize: '0.825rem', padding: '0.45rem 0.65rem' }}
                  value={formData.currency}
                  onChange={e => setFormData({ ...formData, currency: e.target.value })}
                  placeholder="₹"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Phone Number:</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: '0.825rem', padding: '0.45rem 0.65rem' }}
                  value={formData.phone || ''}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Default Opening Cash ({formData.currency}):</label>
                <input
                  type="number"
                  className="form-input font-mono"
                  style={{ fontSize: '0.825rem', padding: '0.45rem 0.65rem' }}
                  value={formData.defaultOpeningCash}
                  onChange={e => setFormData({ ...formData, defaultOpeningCash: parseFloat(e.target.value) || 0 })}
                  placeholder="10000"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Default Opening Online ({formData.currency}):</label>
                <input
                  type="number"
                  className="form-input font-mono"
                  style={{ fontSize: '0.825rem', padding: '0.45rem 0.65rem' }}
                  value={formData.defaultOpeningOnline}
                  onChange={e => setFormData({ ...formData, defaultOpeningOnline: parseFloat(e.target.value) || 0 })}
                  placeholder="5000"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-fast-income"
              style={{ padding: '0.45rem 1rem', fontSize: '0.775rem', background: '#2563eb', boxShadow: 'none' }}
            >
              <Check size={14} />
              <span>Save Store Profile</span>
            </button>
          </form>
        )}

        {/* 3. CATEGORIES TAB */}
        {activeTab === 'categories' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
              {/* Income Categories */}
              <div style={{ background: '#f8fafc', padding: '0.65rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#166534' }}>
                    + Income Categories ({formData.incomeCategories.length})
                  </h4>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.55rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '0.775rem', padding: '0.35rem 0.55rem' }}
                    placeholder="New category..."
                    value={newIncomeCat}
                    onChange={e => setNewIncomeCat(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddIncomeCategory())}
                  />
                  <button
                    type="button"
                    className="btn-fast-income"
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', flexShrink: 0 }}
                    onClick={handleAddIncomeCategory}
                  >
                    <Plus size={14} />
                    <span>Add</span>
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', maxHeight: '180px', overflowY: 'auto' }}>
                  {formData.incomeCategories.map(cat => (
                    <span
                      key={cat}
                      className="badge badge-income"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.2rem 0.45rem',
                        fontSize: '0.7rem',
                        borderRadius: '6px',
                        background: '#ffffff',
                      }}
                    >
                      {cat}
                      <button
                        type="button"
                        onClick={() => handleRemoveIncomeCategory(cat)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 0, fontWeight: 800, fontSize: '0.85rem', lineHeight: 1 }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Expense Categories */}
              <div style={{ background: '#f8fafc', padding: '0.65rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#991b1b' }}>
                    − Expense Categories ({formData.expenseCategories.length})
                  </h4>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.55rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '0.775rem', padding: '0.35rem 0.55rem' }}
                    placeholder="New category..."
                    value={newExpenseCat}
                    onChange={e => setNewExpenseCat(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddExpenseCategory())}
                  />
                  <button
                    type="button"
                    className="btn-fast-expense"
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', flexShrink: 0 }}
                    onClick={handleAddExpenseCategory}
                  >
                    <Plus size={14} />
                    <span>Add</span>
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', maxHeight: '180px', overflowY: 'auto' }}>
                  {formData.expenseCategories.map(cat => (
                    <span
                      key={cat}
                      className="badge badge-expense"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.2rem 0.45rem',
                        fontSize: '0.7rem',
                        borderRadius: '6px',
                        background: '#ffffff',
                      }}
                    >
                      {cat}
                      <button
                        type="button"
                        onClick={() => handleRemoveExpenseCategory(cat)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 0, fontWeight: 800, fontSize: '0.85rem', lineHeight: 1 }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. PASSWORDS & SECURITY */}
        {activeTab === 'passwords' && (
          <form onSubmit={handleSavePasswords} style={{ maxWidth: '440px' }}>
            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '0.75rem' }}>
              <div className="form-group" style={{ marginBottom: '0.65rem' }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Admin / Owner Password:</label>
                <input
                  type="text"
                  className="form-input font-mono"
                  style={{ fontSize: '0.825rem', padding: '0.45rem 0.65rem' }}
                  value={formData.adminPassword}
                  onChange={e => setFormData({ ...formData, adminPassword: e.target.value })}
                  required
                />
                <span style={{ fontSize: '0.675rem', color: '#64748b' }}>Default: <code>admin@123</code></span>
              </div>

              <div className="form-group" style={{ marginBottom: '0.25rem' }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Counter Staff Default Password:</label>
                <input
                  type="text"
                  className="form-input font-mono"
                  style={{ fontSize: '0.825rem', padding: '0.45rem 0.65rem' }}
                  value={formData.employeePassword}
                  onChange={e => setFormData({ ...formData, employeePassword: e.target.value })}
                  required
                />
                <span style={{ fontSize: '0.675rem', color: '#64748b' }}>Default: <code>P@counter</code></span>
              </div>
            </div>

            <button
              type="submit"
              className="btn-fast-income"
              style={{ padding: '0.45rem 1rem', fontSize: '0.775rem', background: '#2563eb', boxShadow: 'none' }}
            >
              <Check size={14} />
              <span>Update Passwords</span>
            </button>
          </form>
        )}

        {/* 5. DATA, BACKUP & PURGE */}
        {activeTab === 'storage' && (
          <div>
            {/* Storage Mode Status */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                marginBottom: '0.75rem',
                flexWrap: 'wrap',
                gap: '0.35rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <HardDrive size={15} style={{ color: '#2563eb' }} />
                <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0f172a' }}>Local Storage Active</span>
                <span className="badge badge-income" style={{ fontSize: '0.6rem', padding: '0.1rem 0.35rem' }}>✓ Fast Offline</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: '#64748b' }}>
                <Flame size={13} style={{ color: '#d97706' }} />
                <span>Cloud Sync (Firebase Ready)</span>
              </div>
            </div>

            {/* BACKUP & EXPORT SECTION */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 800, fontSize: '0.825rem', color: '#0f172a', marginBottom: '0.2rem' }}>
                <FileSpreadsheet size={15} style={{ color: '#16a34a' }} />
                <span>Backup & Export (.xlsx / .csv)</span>
              </div>
              <p style={{ fontSize: '0.675rem', color: '#64748b', marginBottom: '0.65rem' }}>
                Download transaction records by custom duration or month.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.55rem' }}>
                {/* 1. Export by Range */}
                <div style={{ background: '#ffffff', padding: '0.65rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.725rem', color: '#0f172a', marginBottom: '0.35rem' }}>
                    📅 Date Duration:
                  </div>
                  <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.45rem' }}>
                    <input
                      type="date"
                      className="form-input"
                      style={{ fontSize: '0.7rem', padding: '0.25rem' }}
                      value={exportStartDate}
                      onChange={e => setExportStartDate(e.target.value)}
                    />
                    <input
                      type="date"
                      className="form-input"
                      style={{ fontSize: '0.7rem', padding: '0.25rem' }}
                      value={exportEndDate}
                      onChange={e => setExportEndDate(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button
                      type="button"
                      style={{
                        flex: 1,
                        padding: '0.35rem',
                        borderRadius: '5px',
                        background: '#16a34a',
                        color: '#fff',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.25rem',
                        cursor: 'pointer',
                      }}
                      onClick={handleExportRangeExcel}
                    >
                      <FileSpreadsheet size={12} />
                      <span>Excel</span>
                    </button>
                    <button
                      type="button"
                      style={{
                        flex: 1,
                        padding: '0.35rem',
                        borderRadius: '5px',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        color: '#0f172a',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.25rem',
                        cursor: 'pointer',
                      }}
                      onClick={handleExportRangeCSV}
                    >
                      <FileText size={12} />
                      <span>CSV</span>
                    </button>
                  </div>
                </div>

                {/* 2. Export by Month */}
                <div style={{ background: '#ffffff', padding: '0.65rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.725rem', color: '#0f172a', marginBottom: '0.35rem' }}>
                    📆 Specific Month:
                  </div>
                  <div style={{ marginBottom: '0.45rem' }}>
                    <input
                      type="month"
                      className="form-input"
                      style={{ fontSize: '0.7rem', padding: '0.25rem' }}
                      value={exportMonth}
                      onChange={e => setExportMonth(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button
                      type="button"
                      style={{
                        flex: 1,
                        padding: '0.35rem',
                        borderRadius: '5px',
                        background: '#16a34a',
                        color: '#fff',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.25rem',
                        cursor: 'pointer',
                      }}
                      onClick={handleExportMonthExcel}
                    >
                      <FileSpreadsheet size={12} />
                      <span>Excel</span>
                    </button>
                    <button
                      type="button"
                      style={{
                        flex: 1,
                        padding: '0.35rem',
                        borderRadius: '5px',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        color: '#0f172a',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.25rem',
                        cursor: 'pointer',
                      }}
                      onClick={handleExportMonthCSV}
                    >
                      <FileText size={12} />
                      <span>CSV</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* JSON System Backup Bar */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.65rem', paddingTop: '0.65rem', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '5px',
                    background: '#2563eb',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.725rem',
                    cursor: 'pointer',
                  }}
                  onClick={handleExportBackup}
                >
                  <Download size={12} />
                  <span>Backup JSON</span>
                </button>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '5px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: '0.725rem',
                    cursor: 'pointer',
                  }}
                >
                  <Upload size={12} />
                  <span>Restore JSON</span>
                  <input type="file" accept=".json" onChange={handleImportBackup} style={{ display: 'none' }} />
                </label>

                <button
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '5px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    fontWeight: 600,
                    fontSize: '0.725rem',
                    cursor: 'pointer',
                    marginLeft: 'auto',
                  }}
                  onClick={handleResetDemoData}
                >
                  <RefreshCw size={12} />
                  <span>Reset Demo</span>
                </button>
              </div>
            </div>

            {/* DATA CLEANUP & PURGE TOOLS */}
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 800, fontSize: '0.825rem', color: '#c2410c', marginBottom: '0.2rem' }}>
                <AlertTriangle size={15} />
                <span>Data Cleanup & Purge</span>
              </div>
              <p style={{ fontSize: '0.675rem', color: '#7c2d12', marginBottom: '0.65rem' }}>
                Permanently delete old transactions by date duration or month.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.55rem' }}>
                {/* 1. Delete by Range */}
                <div style={{ background: '#ffffff', padding: '0.65rem', borderRadius: '6px', border: '1px solid #fed7aa' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.725rem', color: '#0f172a', marginBottom: '0.35rem' }}>
                    Delete by Duration:
                  </div>
                  <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.45rem' }}>
                    <input
                      type="date"
                      className="form-input"
                      style={{ fontSize: '0.7rem', padding: '0.25rem' }}
                      value={purgeStartDate}
                      onChange={e => setPurgeStartDate(e.target.value)}
                    />
                    <input
                      type="date"
                      className="form-input"
                      style={{ fontSize: '0.7rem', padding: '0.25rem' }}
                      value={purgeEndDate}
                      onChange={e => setPurgeEndDate(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    style={{
                      width: '100%',
                      padding: '0.35rem',
                      borderRadius: '5px',
                      background: '#dc2626',
                      color: '#fff',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem',
                      cursor: 'pointer',
                    }}
                    onClick={handleDeleteByRange}
                  >
                    <Trash2 size={12} />
                    <span>Purge Range Data</span>
                  </button>
                </div>

                {/* 2. Delete by Month */}
                <div style={{ background: '#ffffff', padding: '0.65rem', borderRadius: '6px', border: '1px solid #fed7aa' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.725rem', color: '#0f172a', marginBottom: '0.35rem' }}>
                    Delete by Month:
                  </div>
                  <div style={{ marginBottom: '0.45rem' }}>
                    <input
                      type="month"
                      className="form-input"
                      style={{ fontSize: '0.7rem', padding: '0.25rem' }}
                      value={purgeMonth}
                      onChange={e => setPurgeMonth(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    style={{
                      width: '100%',
                      padding: '0.35rem',
                      borderRadius: '5px',
                      background: '#dc2626',
                      color: '#fff',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem',
                      cursor: 'pointer',
                    }}
                    onClick={handleDeleteByMonth}
                  >
                    <Trash2 size={12} />
                    <span>Purge Month Data</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
