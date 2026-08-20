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
    <div className="card" style={{ padding: '1rem 1.25rem' }}>
      {/* Settings Sub-Tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem', marginBottom: '1.25rem', overflowX: 'auto' }}>
        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'counters' ? 'active' : ''}`}
          onClick={() => setActiveTab('counters')}
        >
          <UserCheck size={14} />
          <span>Manage Counters</span>
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          <Store size={14} />
          <span>Store Profile</span>
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          <Users size={14} />
          <span>Categories</span>
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'passwords' ? 'active' : ''}`}
          onClick={() => setActiveTab('passwords')}
        >
          <Key size={14} />
          <span>Passwords & Security</span>
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'storage' ? 'active' : ''}`}
          onClick={() => setActiveTab('storage')}
        >
          <Database size={14} />
          <span>Data, Backup & Purge</span>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Store / Counter Name:</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.businessName}
                  onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                  placeholder="My Store Counter"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Currency Symbol:</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.currency}
                  onChange={e => setFormData({ ...formData, currency: e.target.value })}
                  placeholder="₹"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number:</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.phone || ''}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Default Opening Cash ({formData.currency}):</label>
                <input
                  type="number"
                  className="form-input font-mono"
                  value={formData.defaultOpeningCash}
                  onChange={e => setFormData({ ...formData, defaultOpeningCash: parseFloat(e.target.value) || 0 })}
                  placeholder="10000"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Default Opening Online ({formData.currency}):</label>
                <input
                  type="number"
                  className="form-input font-mono"
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
              style={{ padding: '0.65rem 1.25rem', background: '#2563eb', boxShadow: 'none' }}
            >
              <Check size={16} />
              <span>Save Store Profile</span>
            </button>
          </form>
        )}

        {/* 3. CATEGORIES TAB */}
        {activeTab === 'categories' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {/* Income Categories */}
              <div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 800, color: '#16a34a', marginBottom: '0.5rem' }}>
                  + Income Categories ({formData.incomeCategories.length})
                </h4>
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.65rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="New category..."
                    value={newIncomeCat}
                    onChange={e => setNewIncomeCat(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddIncomeCategory())}
                  />
                  <button type="button" className="btn-fast-income" style={{ padding: '0.45rem 0.75rem' }} onClick={handleAddIncomeCategory}>
                    <Plus size={16} />
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {formData.incomeCategories.map(cat => (
                    <span key={cat} className="badge badge-income" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                      {cat}
                      <button type="button" onClick={() => handleRemoveIncomeCategory(cat)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#166534', padding: 0 }}>
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Expense Categories */}
              <div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 800, color: '#dc2626', marginBottom: '0.5rem' }}>
                  − Expense Categories ({formData.expenseCategories.length})
                </h4>
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.65rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="New category..."
                    value={newExpenseCat}
                    onChange={e => setNewExpenseCat(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddExpenseCategory())}
                  />
                  <button type="button" className="btn-fast-expense" style={{ padding: '0.45rem 0.75rem' }} onClick={handleAddExpenseCategory}>
                    <Plus size={16} />
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {formData.expenseCategories.map(cat => (
                    <span key={cat} className="badge badge-expense" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                      {cat}
                      <button type="button" onClick={() => handleRemoveExpenseCategory(cat)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', padding: 0 }}>
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
          <form onSubmit={handleSavePasswords} style={{ maxWidth: '420px' }}>
            <div className="form-group">
              <label className="form-label">Admin / Owner Password:</label>
              <input
                type="text"
                className="form-input font-mono"
                value={formData.adminPassword}
                onChange={e => setFormData({ ...formData, adminPassword: e.target.value })}
                required
              />
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Default: admin@123</span>
            </div>

            <div className="form-group">
              <label className="form-label">Counter Staff Default Password:</label>
              <input
                type="text"
                className="form-input font-mono"
                value={formData.employeePassword}
                onChange={e => setFormData({ ...formData, employeePassword: e.target.value })}
                required
              />
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Default: P@counter</span>
            </div>

            <button
              type="submit"
              className="btn-fast-income"
              style={{ padding: '0.65rem 1.25rem', background: '#2563eb', boxShadow: 'none' }}
            >
              <Check size={16} />
              <span>Update Passwords</span>
            </button>
          </form>
        )}

        {/* 5. DATA, BACKUP & PURGE */}
        {activeTab === 'storage' && (
          <div>
            {/* Storage Mode Info */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  padding: '0.85rem',
                  borderRadius: '8px',
                  border: '1.5px solid #2563eb',
                  background: '#eff6ff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: '#1e40af', marginBottom: '0.25rem', fontSize: '0.85rem' }}>
                  <HardDrive size={16} />
                  <span>Local Browser Storage (Active)</span>
                </div>
                <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                  Ultra-fast offline operation. All records safely stored in your browser.
                </div>
              </div>

              <div
                style={{
                  padding: '0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: '#1e40af', marginBottom: '0.25rem', fontSize: '0.85rem' }}>
                  <Flame size={16} style={{ color: '#d97706' }} />
                  <span>Cloud Sync (Firebase Ready)</span>
                </div>
                <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                  Easily connect Firestore for multi-device live sync whenever you wish.
                </div>
              </div>
            </div>

            {/* BACKUP & EXPORT CENTER (NEW) */}
            <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, fontSize: '0.9rem', color: '#166534', marginBottom: '0.35rem' }}>
                <FileSpreadsheet size={17} />
                <span>Backup & Export Data (.xlsx / .csv)</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#14532d', marginBottom: '0.85rem' }}>
                Download your transaction records anytime by custom date duration, month, or complete history.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem' }}>
                {/* 1. Export by Range */}
                <div style={{ background: '#ffffff', padding: '0.85rem', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0f172a', marginBottom: '0.4rem' }}>
                    📅 Backup by Date Range:
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.6rem' }}>
                    <input
                      type="date"
                      className="form-input"
                      style={{ fontSize: '0.75rem', padding: '0.3rem' }}
                      value={exportStartDate}
                      onChange={e => setExportStartDate(e.target.value)}
                    />
                    <input
                      type="date"
                      className="form-input"
                      style={{ fontSize: '0.75rem', padding: '0.3rem' }}
                      value={exportEndDate}
                      onChange={e => setExportEndDate(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      style={{
                        flex: 1,
                        padding: '0.45rem',
                        borderRadius: '5px',
                        background: '#16a34a',
                        color: '#fff',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.3rem',
                        cursor: 'pointer',
                      }}
                      onClick={handleExportRangeExcel}
                    >
                      <FileSpreadsheet size={13} />
                      <span>Excel (.xlsx)</span>
                    </button>
                    <button
                      type="button"
                      style={{
                        flex: 1,
                        padding: '0.45rem',
                        borderRadius: '5px',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        color: '#0f172a',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.3rem',
                        cursor: 'pointer',
                      }}
                      onClick={handleExportRangeCSV}
                    >
                      <FileText size={13} />
                      <span>CSV</span>
                    </button>
                  </div>
                </div>

                {/* 2. Export by Month */}
                <div style={{ background: '#ffffff', padding: '0.85rem', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0f172a', marginBottom: '0.4rem' }}>
                    📆 Backup by Specific Month:
                  </div>
                  <div style={{ marginBottom: '0.6rem' }}>
                    <input
                      type="month"
                      className="form-input"
                      style={{ fontSize: '0.75rem', padding: '0.3rem' }}
                      value={exportMonth}
                      onChange={e => setExportMonth(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      style={{
                        flex: 1,
                        padding: '0.45rem',
                        borderRadius: '5px',
                        background: '#16a34a',
                        color: '#fff',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.3rem',
                        cursor: 'pointer',
                      }}
                      onClick={handleExportMonthExcel}
                    >
                      <FileSpreadsheet size={13} />
                      <span>Excel (.xlsx)</span>
                    </button>
                    <button
                      type="button"
                      style={{
                        flex: 1,
                        padding: '0.45rem',
                        borderRadius: '5px',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        color: '#0f172a',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.3rem',
                        cursor: 'pointer',
                      }}
                      onClick={handleExportMonthCSV}
                    >
                      <FileText size={13} />
                      <span>CSV</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* JSON Full System Backup Bar */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px dashed #bbf7d0' }}>
                <button
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 0.85rem',
                    borderRadius: '6px',
                    background: '#2563eb',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.775rem',
                    cursor: 'pointer',
                  }}
                  onClick={handleExportBackup}
                >
                  <Download size={14} />
                  <span>Full System JSON Backup</span>
                </button>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 0.85rem',
                    borderRadius: '6px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: '0.775rem',
                    cursor: 'pointer',
                  }}
                >
                  <Upload size={14} />
                  <span>Restore from JSON</span>
                  <input type="file" accept=".json" onChange={handleImportBackup} style={{ display: 'none' }} />
                </label>

                <button
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 0.85rem',
                    borderRadius: '6px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    fontWeight: 600,
                    fontSize: '0.775rem',
                    cursor: 'pointer',
                    marginLeft: 'auto',
                  }}
                  onClick={handleResetDemoData}
                >
                  <RefreshCw size={14} />
                  <span>Reset Demo Data</span>
                </button>
              </div>
            </div>

            {/* DATA CLEANUP & PURGE TOOLS */}
            <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: '8px', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, fontSize: '0.9rem', color: '#c2410c', marginBottom: '0.35rem' }}>
                <AlertTriangle size={17} />
                <span>Data Cleanup & Purge Tools</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#7c2d12', marginBottom: '0.85rem' }}>
                Select a custom duration or specific month to permanently delete old transactions.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem' }}>
                {/* 1. Delete by Range */}
                <div style={{ background: '#ffffff', padding: '0.85rem', borderRadius: '6px', border: '1px solid #fed7aa' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0f172a', marginBottom: '0.4rem' }}>
                    Delete by Date Range:
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.6rem' }}>
                    <input
                      type="date"
                      className="form-input"
                      style={{ fontSize: '0.75rem', padding: '0.3rem' }}
                      value={purgeStartDate}
                      onChange={e => setPurgeStartDate(e.target.value)}
                    />
                    <input
                      type="date"
                      className="form-input"
                      style={{ fontSize: '0.75rem', padding: '0.3rem' }}
                      value={purgeEndDate}
                      onChange={e => setPurgeEndDate(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    style={{
                      width: '100%',
                      padding: '0.45rem',
                      borderRadius: '5px',
                      background: '#dc2626',
                      color: '#fff',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.3rem',
                      cursor: 'pointer',
                    }}
                    onClick={handleDeleteByRange}
                  >
                    <Trash2 size={12} />
                    <span>Delete Range Data</span>
                  </button>
                </div>

                {/* 2. Delete by Month */}
                <div style={{ background: '#ffffff', padding: '0.85rem', borderRadius: '6px', border: '1px solid #fed7aa' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0f172a', marginBottom: '0.4rem' }}>
                    Delete by Specific Month:
                  </div>
                  <div style={{ marginBottom: '0.6rem' }}>
                    <input
                      type="month"
                      className="form-input"
                      style={{ fontSize: '0.75rem', padding: '0.3rem' }}
                      value={purgeMonth}
                      onChange={e => setPurgeMonth(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    style={{
                      width: '100%',
                      padding: '0.45rem',
                      borderRadius: '5px',
                      background: '#dc2626',
                      color: '#fff',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.3rem',
                      cursor: 'pointer',
                    }}
                    onClick={handleDeleteByMonth}
                  >
                    <Trash2 size={12} />
                    <span>Delete Month Data</span>
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
