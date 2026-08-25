import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { Transaction } from '../types';
import {
  X,
  Search,
  Edit2,
  Trash2,
  Calendar,
  FileSpreadsheet,
  FileText,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatCurrency, formatDDMMYYYY, getTodayDateString, isRightSideEntry } from '../services/storageService';

interface SummaryDrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType: 'receive' | 'expense' | 'all';
  initialMethod: 'cash' | 'rtgs' | 'upi' | 'all';
  startDate: string;
  endDate: string;
  onDateRangeChange?: (start: string, end: string) => void;
}

type PresetDateRange = 'today' | 'yesterday' | '7days' | 'thisMonth' | 'lastMonth' | 'custom';

export const SummaryDrilldownModal: React.FC<SummaryDrilldownModalProps> = ({
  isOpen,
  onClose,
  initialType,
  initialMethod,
  startDate,
  endDate,
  onDateRangeChange,
}) => {
  const {
    transactions,
    config,
    counters,
    openCounterModal,
    deleteTransaction,
    showToast,
  } = useApp();

  const [activeType, setActiveType] = useState<'receive' | 'expense' | 'all'>(initialType);
  const [activeMethod, setActiveMethod] = useState<'cash' | 'rtgs' | 'upi' | 'all'>(initialMethod);
  const [currentStartDate, setCurrentStartDate] = useState<string>(startDate);
  const [currentEndDate, setCurrentEndDate] = useState<string>(endDate);
  const [selectedPreset, setSelectedPreset] = useState<PresetDateRange>('custom');
  const [selectedStaff, setSelectedStaff] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Sync with prop changes when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setActiveType(initialType);
      setActiveMethod(initialMethod);
      setCurrentStartDate(startDate);
      setCurrentEndDate(endDate);
      setSearchTerm('');
      setSelectedStaff('all');
    }
  }, [isOpen, initialType, initialMethod, startDate, endDate]);

  // Filter transactions (Hook must always run before any return)
  const filteredTransactions = useMemo(() => {
    if (!isOpen || !Array.isArray(transactions)) return [];

    return transactions.filter(t => {
      if (!t) return false;
      const tDate = t.date || '';

      // 1. Date Range
      if (currentStartDate && tDate < currentStartDate) {
        return false;
      }
      if (currentEndDate && tDate > currentEndDate) {
        return false;
      }

      // 2. Type (Receive vs Expense) & Payment Method
      const isRight = isRightSideEntry(t);
      const pMethod = (t.paymentMethod || 'cash').toString().toLowerCase();
      const catUpper = (t.category || '').trim().toUpperCase();

      if (activeType === 'receive') {
        if (t.type !== 'income' || isRight) return false;
        if (activeMethod !== 'all' && pMethod !== activeMethod.toLowerCase()) return false;
      } else if (activeType === 'expense') {
        if (activeMethod === 'cash') {
          const isCashExp = t.type === 'expense' && pMethod === 'cash';
          const isCashInHand = catUpper === 'CASH IN HAND';
          if (!isCashExp && !isCashInHand) return false;
        } else if (activeMethod === 'rtgs') {
          const isRtgsExp = t.type === 'expense' && pMethod === 'rtgs';
          const isBankRtgs = catUpper === 'BANK (RTGS)' || catUpper.includes('RTGS');
          const isRtgsSale = t.type === 'income' && pMethod === 'rtgs';
          if (!isRtgsExp && !isBankRtgs && !isRtgsSale) return false;
        } else if (activeMethod === 'upi') {
          const isUpiExp = t.type === 'expense' && pMethod === 'upi';
          const isUpiBreakdown = catUpper.startsWith('UPI');
          const isUpiSale = t.type === 'income' && pMethod === 'upi';
          if (!isUpiExp && !isUpiBreakdown && !isUpiSale) return false;
        } else {
          if (!isRight && (t.type === 'income' && pMethod === 'cash')) return false;
        }
      } else {
        if (activeMethod !== 'all' && pMethod !== activeMethod.toLowerCase()) return false;
      }

      // 4. Staff / Counter
      const sName = (t.staffName || 'OTHER').toString().trim().toUpperCase();
      const isAdmin = ['ADMIN', 'ADMIN / OWNER', 'OWNER'].includes(sName);

      if (selectedStaff !== 'all') {
        if (sName !== selectedStaff.toUpperCase()) {
          return false;
        }
      } else {
        // Exclude admin transactions from store sales / counter drilldowns so totals match summary cards
        if (isAdmin) {
          return false;
        }
      }

      // 5. Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchCat = (t.category || '').toString().toLowerCase().includes(q);
        const matchNote = (t.note || '').toString().toLowerCase().includes(q);
        const matchPhone = (t.customerPhone || '').toString().toLowerCase().includes(q);
        const matchStaff = (t.staffName || '').toString().toLowerCase().includes(q);
        const matchAccount = (t.paymentAccount || '').toString().toLowerCase().includes(q);
        const matchAmt = (t.amount ?? 0).toString().includes(q);
        return matchCat || matchNote || matchPhone || matchStaff || matchAccount || matchAmt;
      }

      return true;
    }).sort((a, b) => {
      const dateA = a?.date || '';
      const dateB = b?.date || '';
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      const timeA = a?.time || '';
      const timeB = b?.time || '';
      return timeB.localeCompare(timeA);
    });
  }, [isOpen, transactions, currentStartDate, currentEndDate, activeType, activeMethod, selectedStaff, searchTerm]);

  // Available staff / counters for filter (Hook must always run before any return)
  const staffList = useMemo(() => {
    const names = new Set<string>();
    (counters || []).forEach(c => {
      if (c && c.name) names.add(c.name.trim().toUpperCase());
    });
    (config?.staffMembers || []).forEach(s => {
      if (s) names.add(s.trim().toUpperCase());
    });
    names.add('KRISHNA');
    names.add('NAVIN');
    names.add('OTHER');

    return Array.from(names).filter(
      name => !['ADMIN / OWNER', 'ADMIN', 'OWNER'].includes(name)
    );
  }, [counters, config?.staffMembers]);

  // Don't render modal DOM if not open (placed AFTER all hooks)
  if (!isOpen) return null;

  const todayStr = getTodayDateString();

  const handleApplyPreset = (preset: PresetDateRange) => {
    setSelectedPreset(preset);
    const now = new Date();
    let s = todayStr;
    let e = todayStr;

    if (preset === 'today') {
      s = todayStr;
      e = todayStr;
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      s = yStr;
      e = yStr;
    } else if (preset === '7days') {
      const d7 = new Date();
      d7.setDate(d7.getDate() - 6);
      s = d7.toISOString().split('T')[0];
      e = todayStr;
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      s = firstDay;
      e = todayStr;
    } else if (preset === 'lastMonth') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      s = firstDayLastMonth;
      e = lastDayLastMonth;
    }

    setCurrentStartDate(s);
    setCurrentEndDate(e);
    if (onDateRangeChange) {
      onDateRangeChange(s, e);
    }
  };

  const handleStartDateChange = (val: string) => {
    setCurrentStartDate(val);
    setSelectedPreset('custom');
    if (onDateRangeChange) {
      onDateRangeChange(val, currentEndDate);
    }
  };

  const handleEndDateChange = (val: string) => {
    setCurrentEndDate(val);
    setSelectedPreset('custom');
    if (onDateRangeChange) {
      onDateRangeChange(currentStartDate, val);
    }
  };

  const totalAmount = filteredTransactions.reduce((sum, t) => sum + (t?.amount || 0), 0);

  const handleEdit = (tx: Transaction) => {
    if (!tx) return;
    openCounterModal(tx.type || 'income', tx, tx.staffName);
  };

  const handleDelete = (tx: Transaction) => {
    if (!tx || !tx.id) return;
    const isCashInHand = (tx.category || '').toString().trim().toUpperCase() === 'CASH IN HAND';
    const label = isCashInHand ? 'Cash in Hand entry' : `${(tx.type || '').toUpperCase()} entry`;
    if (confirm(`Delete ${label} of ${formatCurrency(tx.amount || 0, config?.currency || '₹')} for ${tx.staffName || 'Counter'}?`)) {
      deleteTransaction(tx.id);
      showToast(`${label} deleted`);
    }
  };

  const handleExportFiltered = (format: 'excel' | 'csv') => {
    if (filteredTransactions.length === 0) {
      showToast('No transactions to export', 'error');
      return;
    }

    const data = filteredTransactions.map((t, idx) => ({
      '#': idx + 1,
      'Date': t.date,
      'Time': (activeMethod === 'cash' || (t.paymentMethod || '').toLowerCase() === 'cash') ? '' : (t.time || ''),
      'Counter / Staff': t.staffName || 'OTHER',
      'Type': isRightSideEntry(t) ? 'EXPENSE / SETTLEMENT' : 'RECEIVE',
      'Head / Category': t.category || '',
      'Mode': (t.paymentMethod || 'CASH').toUpperCase(),
      'Online Account': t.paymentAccount || '',
      'Amount (₹)': t.amount,
      'Note / Customer': t.note || t.customerPhone || '',
    }));

    const typeName = activeType === 'receive' ? 'Receive' : activeType === 'expense' ? 'Expense' : 'All';
    const methodName = activeMethod.toUpperCase();
    const fileName = `${typeName}_${methodName}_${currentStartDate}_to_${currentEndDate}`;

    if (format === 'excel') {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Summary Transactions');
      XLSX.writeFile(wb, `${fileName}.xlsx`);
      showToast('Excel report downloaded!');
    } else {
      const ws = XLSX.utils.json_to_sheet(data);
      const csvOutput = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `${fileName}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('CSV report downloaded!');
    }
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }} onClick={onClose}>
      <div
        className="modal-content animate-fade-in"
        style={{
          maxWidth: '920px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            background: '#1e1b87',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {activeType === 'receive' ? <ArrowDownLeft size={18} color="#4ade80" /> : <ArrowUpRight size={18} color="#f87171" />}
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, letterSpacing: '0.02em' }}>
                {activeType === 'receive' ? 'Receive Transactions' : activeType === 'expense' ? 'Expense / Settlement Transactions' : 'All Transactions'}
                {activeMethod !== 'all' && ` • ${activeMethod.toUpperCase()}`}
              </h2>
              <div style={{ fontSize: '0.725rem', color: '#bfdbfe', marginTop: '0.1rem', fontWeight: 600 }}>
                {formatDDMMYYYY(currentStartDate)} {currentStartDate !== currentEndDate ? `TO ${formatDDMMYYYY(currentEndDate)}` : ''}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '6px',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Filter Toolbar */}
        <div style={{ background: '#f8fafc', padding: '0.75rem 1.25rem', borderBottom: '1px solid #e2e8f0' }}>
          {/* Row 1: Date Range Presets and Pickers */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
            {/* Quick Presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', marginRight: '0.2rem' }}>
                <Calendar size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '3px' }} />
                RANGE:
              </span>
              {(['today', 'yesterday', '7days', 'thisMonth', 'lastMonth'] as PresetDateRange[]).map(preset => (
                <button
                  key={preset}
                  type="button"
                  style={{
                    fontSize: '0.675rem',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '4px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: selectedPreset === preset ? '#1e1b87' : '#ffffff',
                    color: selectedPreset === preset ? '#ffffff' : '#334155',
                    border: `1px solid ${selectedPreset === preset ? '#1e1b87' : '#cbd5e1'}`,
                  }}
                  onClick={() => handleApplyPreset(preset)}
                >
                  {preset === 'today' ? 'Today' : preset === 'yesterday' ? 'Yesterday' : preset === '7days' ? '7 Days' : preset === 'thisMonth' ? 'This Month' : 'Last Month'}
                </button>
              ))}
            </div>

            {/* Custom Date Inputs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.725rem', fontWeight: 700 }}>
                <span>From:</span>
                <input
                  type="date"
                  className="form-input"
                  style={{ padding: '0.18rem 0.4rem', fontSize: '0.725rem', width: 'auto', fontWeight: 700 }}
                  value={currentStartDate}
                  onChange={e => handleStartDateChange(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.725rem', fontWeight: 700 }}>
                <span>To:</span>
                <input
                  type="date"
                  className="form-input"
                  style={{ padding: '0.18rem 0.4rem', fontSize: '0.725rem', width: 'auto', fontWeight: 700 }}
                  value={currentEndDate}
                  onChange={e => handleEndDateChange(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Row 2: Type, Mode, Staff and Search Filters */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {/* Type Switcher */}
              <div style={{ display: 'flex', background: '#e2e8f0', padding: '0.15rem', borderRadius: '6px', gap: '0.15rem' }}>
                <button
                  type="button"
                  style={{
                    fontSize: '0.675rem',
                    padding: '0.18rem 0.5rem',
                    borderRadius: '4px',
                    fontWeight: 800,
                    border: 'none',
                    cursor: 'pointer',
                    background: activeType === 'all' ? '#ffffff' : 'transparent',
                    color: activeType === 'all' ? '#0f172a' : '#64748b',
                    boxShadow: activeType === 'all' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  }}
                  onClick={() => setActiveType('all')}
                >
                  All
                </button>
                <button
                  type="button"
                  style={{
                    fontSize: '0.675rem',
                    padding: '0.18rem 0.5rem',
                    borderRadius: '4px',
                    fontWeight: 800,
                    border: 'none',
                    cursor: 'pointer',
                    background: activeType === 'receive' ? '#16a34a' : 'transparent',
                    color: activeType === 'receive' ? '#ffffff' : '#64748b',
                  }}
                  onClick={() => setActiveType('receive')}
                >
                  Receive
                </button>
                <button
                  type="button"
                  style={{
                    fontSize: '0.675rem',
                    padding: '0.18rem 0.5rem',
                    borderRadius: '4px',
                    fontWeight: 800,
                    border: 'none',
                    cursor: 'pointer',
                    background: activeType === 'expense' ? '#dc2626' : 'transparent',
                    color: activeType === 'expense' ? '#ffffff' : '#64748b',
                  }}
                  onClick={() => setActiveType('expense')}
                >
                  Expense
                </button>
              </div>

              {/* Mode Switcher */}
              <div style={{ display: 'flex', background: '#e2e8f0', padding: '0.15rem', borderRadius: '6px', gap: '0.15rem' }}>
                {(['all', 'cash', 'rtgs', 'upi'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    style={{
                      fontSize: '0.675rem',
                      padding: '0.18rem 0.5rem',
                      borderRadius: '4px',
                      fontWeight: 800,
                      border: 'none',
                      cursor: 'pointer',
                      background: activeMethod === m ? '#1e1b87' : 'transparent',
                      color: activeMethod === m ? '#ffffff' : '#64748b',
                      textTransform: 'uppercase',
                    }}
                    onClick={() => setActiveMethod(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* Staff / Counter Filter */}
              <select
                className="form-input"
                style={{ padding: '0.2rem 0.45rem', fontSize: '0.725rem', width: 'auto', fontWeight: 700 }}
                value={selectedStaff}
                onChange={e => setSelectedStaff(e.target.value)}
              >
                <option value="all">All Counters</option>
                {staffList.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '220px' }}>
              <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search notes, staff, amount..."
                className="form-input"
                style={{ padding: '0.22rem 0.5rem 0.22rem 1.65rem', fontSize: '0.725rem', width: '100%' }}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.7rem' }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results Stats Bar */}
        <div
          style={{
            padding: '0.45rem 1.25rem',
            background: '#ffffff',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.775rem',
            fontWeight: 800,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#475569' }}>
              Found <strong style={{ color: '#0f172a' }}>{filteredTransactions.length}</strong> {filteredTransactions.length === 1 ? 'transaction' : 'transactions'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ color: '#64748b' }}>TOTAL AMOUNT:</span>
              <span style={{ fontSize: '0.95rem', color: activeType === 'expense' ? '#dc2626' : '#16a34a', fontWeight: 900 }}>
                {formatCurrency(totalAmount, config.currency)}
              </span>
            </div>

            {/* Export Buttons for Filtered View */}
            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', marginLeft: '0.5rem' }}>
              <button
                type="button"
                className="icon-btn"
                style={{ width: 'auto', height: '24px', padding: '0.15rem 0.45rem', fontSize: '0.675rem', fontWeight: 800, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}
                onClick={() => handleExportFiltered('excel')}
                title="Export this drilldown to Excel"
              >
                <FileSpreadsheet size={12} />
                <span>Excel</span>
              </button>
              <button
                type="button"
                className="icon-btn"
                style={{ width: 'auto', height: '24px', padding: '0.15rem 0.45rem', fontSize: '0.675rem', fontWeight: 800, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}
                onClick={() => handleExportFiltered('csv')}
                title="Export this drilldown to CSV"
              >
                <FileText size={12} />
                <span>CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Transaction List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1.25rem', background: '#ffffff', minHeight: '260px' }}>
          {filteredTransactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
              <Filter size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#64748b' }}>No transactions match this filter</div>
              <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Try adjusting the date range, payment mode, or search keyword</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {filteredTransactions.map(tx => {
                const isExpense = isRightSideEntry(tx);
                const methodUpper = (tx.paymentMethod || 'CASH').toUpperCase();
                const amountColor = isExpense ? '#dc2626' : '#16a34a';

                return (
                  <div
                    key={tx.id}
                    className="ledger-item-row"
                    style={{
                      padding: '0.5rem 0.75rem',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {/* Left Meta Information */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                      {/* Counter Badge */}
                      <span
                        style={{
                          fontSize: '0.675rem',
                          fontWeight: 800,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          background: '#e0e7ff',
                          color: '#3730a3',
                          letterSpacing: '0.02em',
                        }}
                      >
                        {tx.staffName || 'OTHER'}
                      </span>

                      {/* Head & Subtitle */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#0f172a' }}>
                            {tx.category || (isExpense ? 'EXPENSE' : 'LAB WORK')}
                          </span>

                          <span
                            style={{
                              fontSize: '0.625rem',
                              fontWeight: 800,
                              padding: '0.08rem 0.35rem',
                              borderRadius: '4px',
                              background: methodUpper === 'CASH' ? '#dcfce7' : methodUpper === 'RTGS' ? '#e0f2fe' : '#ede9fe',
                              color: methodUpper === 'CASH' ? '#15803d' : methodUpper === 'RTGS' ? '#0369a1' : '#6d28d9',
                            }}
                          >
                            {methodUpper}
                          </span>
                        </div>

                        {/* Note & Account Meta */}
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span>📅 {formatDDMMYYYY(tx.date)}{methodUpper !== 'CASH' && activeMethod !== 'cash' && tx.time ? ` • ⏰ ${tx.time}` : ''}</span>
                          {tx.paymentAccount && (
                            <span style={{ color: '#4338ca', fontWeight: 700 }}>
                              🏦 UPI({tx.paymentAccount})
                            </span>
                          )}
                          {tx.note && (
                            <span style={{ color: '#0f172a', fontWeight: 600 }}>
                              💬 {tx.note}
                            </span>
                          )}
                          {tx.customerPhone && (
                            <span>📞 {tx.customerPhone}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Amount & Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span style={{ fontSize: '0.975rem', fontWeight: 900, color: amountColor, whiteSpace: 'nowrap' }}>
                        {isExpense ? '−' : '+'}{formatCurrency(tx.amount, config.currency)}
                      </span>

                      <div className="ledger-item-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          style={{ width: '22px', height: '22px', color: '#2563eb' }}
                          onClick={() => handleEdit(tx)}
                          title="Edit transaction"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          style={{ width: '22px', height: '22px', color: '#dc2626' }}
                          onClick={() => handleDelete(tx)}
                          title="Delete transaction"
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

        {/* Modal Footer */}
        <div
          style={{
            padding: '0.65rem 1.25rem',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
            Tip: Click any transaction's ✏️ Edit or 🗑️ Delete button to adjust entries directly.
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.9rem', fontSize: '0.75rem', fontWeight: 700 }}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
