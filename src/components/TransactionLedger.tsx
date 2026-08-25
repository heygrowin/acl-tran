import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import type { Transaction } from '../types';
import {
  Search,
  Trash2,
  Edit2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  BarChart2,
  FileSpreadsheet,
  FileText,
  Sliders,
  Wallet,
  Banknote,
  Building,
  QrCode,
} from 'lucide-react';
import { formatCurrency, getTodayDateString, formatDDMMYYYY, storage } from '../services/storageService';
import { PWAInstallButton } from './PWAInstallButton';
import { ExportModal } from './ExportModal';
import { SummaryDrilldownModal } from './SummaryDrilldownModal';

// Top-level helpers to avoid closure reference errors
export const formatExpenseTitle = (tx: Transaction) => {
  const cat = (tx.category || '').toUpperCase();
  const method = (tx.paymentMethod || 'CASH').toUpperCase();
  if (cat) return cat;
  if (method === 'rtgs' || method === 'RTGS') {
    return 'BANK (RTGS)';
  }
  if (tx.note) return tx.note.toUpperCase();
  return `EXPENSE - ${method}`;
};

export const isRightSideEntry = (t: Transaction) => {
  if (t.type === 'expense') return true;
  const cUpper = (t.category || '').trim().toUpperCase();
  if (cUpper === 'CASH IN HAND' || cUpper === 'BANK (RTGS)') return true;
  if (cUpper.startsWith('UPI ') && !cUpper.includes('LAB WORK') && !cUpper.includes('GOODS')) return true;
  return false;
};

interface TransactionLedgerProps {
  initialMode?: 'sheet' | 'summary' | 'table';
}

export const TransactionLedger: React.FC<TransactionLedgerProps> = ({ initialMode = 'sheet' }) => {
  const {
    transactions,
    selectedDate,
    setSelectedDate,
    config,
    counters,
    addTransaction,
    deleteTransaction,
    openCounterModal,
    updateInitialBalances,
    openItemHistoryModal,
    showToast,
  } = useApp();

  const todayStr = getTodayDateString();
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Local View and Filter States
  const [viewMode, setViewMode] = useState<'sheet' | 'summary' | 'table'>(initialMode);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState<'all' | 'cash' | 'upi' | 'rtgs'>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportDefaultFormat, setExportDefaultFormat] = useState<'excel' | 'csv'>('excel');

  // Summary Drilldown Popup States
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false);
  const [drilldownType, setDrilldownType] = useState<'receive' | 'expense' | 'all'>('all');
  const [drilldownMethod, setDrilldownMethod] = useState<'cash' | 'rtgs' | 'upi' | 'all'>('all');

  const handleOpenDrilldown = (type: 'receive' | 'expense' | 'all', method: 'cash' | 'rtgs' | 'upi' | 'all') => {
    setDrilldownType(type);
    setDrilldownMethod(method);
    setIsDrilldownOpen(true);
  };

  // Initial Balances Modal State
  const [isInitialBalanceModalOpen, setIsInitialBalanceModalOpen] = useState(false);
  const [initCashInput, setInitCashInput] = useState('');
  const [initRtgsInput, setInitRtgsInput] = useState('');
  const [initUpiInput, setInitUpiInput] = useState('');

  const handleOpenInitialBalanceModal = () => {
    setInitCashInput((config.initialCash || 0).toString());
    setInitRtgsInput((config.initialRtgs || 0).toString());
    setInitUpiInput((config.initialUpi || 0).toString());
    setIsInitialBalanceModalOpen(true);
  };

  const handleSaveInitialBalances = (e: React.FormEvent) => {
    e.preventDefault();
    const cashVal = parseFloat(initCashInput) || 0;
    const rtgsVal = parseFloat(initRtgsInput) || 0;
    const upiVal = parseFloat(initUpiInput) || 0;
    updateInitialBalances({ cash: cashVal, rtgs: rtgsVal, upi: upiVal });
    setIsInitialBalanceModalOpen(false);
  };

  // Date Range for Summary Mode
  const [summaryStartDate, setSummaryStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]; // 1st of month
  });
  const [summaryEndDate, setSummaryEndDate] = useState(todayStr);

  const isToday = selectedDate === todayStr;

  // Single Day Navigation Handlers
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Quick Preset Handlers for Summary Range
  const setPresetRange = (preset: 'today' | 'yesterday' | '7days' | 'thisMonth' | 'lastMonth') => {
    const now = new Date();
    if (preset === 'today') {
      setSummaryStartDate(todayStr);
      setSummaryEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setSummaryStartDate(yStr);
      setSummaryEndDate(yStr);
    } else if (preset === '7days') {
      const d7 = new Date();
      d7.setDate(d7.getDate() - 6);
      setSummaryStartDate(d7.toISOString().split('T')[0]);
      setSummaryEndDate(todayStr);
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      setSummaryStartDate(firstDay);
      setSummaryEndDate(todayStr);
    } else if (preset === 'lastMonth') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      setSummaryStartDate(firstDayLastMonth);
      setSummaryEndDate(lastDayLastMonth);
    }
  };

  // Active Transactions for Current Scope
  const scopedTransactions = transactions.filter(t => {
    if (viewMode === 'summary') {
      if (t.date < summaryStartDate || t.date > summaryEndDate) return false;
    } else {
      if (t.date !== selectedDate) return false;
    }

    if (filterMethod !== 'all') {
      if (t.paymentMethod.toLowerCase() !== filterMethod.toLowerCase()) return false;
    }

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

  // Helper to determine right side items for a counter
  const getCounterRightItems = (cTxs: Transaction[]) => {
    const expenseTxs = cTxs.filter(t => t.type === 'expense');
    const incomeTxs = cTxs.filter(t => t.type === 'income');

    // Check if there are explicit breakdown income logs (e.g. BANK RTGS, UPI accounts, CASH IN HAND)
    const explicitBreakdownIncomes = incomeTxs.filter(t => {
      const cUpper = (t.category || '').trim().toUpperCase();
      return cUpper === 'CASH IN HAND' ||
             cUpper === 'BANK (RTGS)' ||
             (cUpper.startsWith('UPI ') && !cUpper.includes('LAB WORK') && !cUpper.includes('GOODS'));
    });

    const generalSalesIncomes = incomeTxs.filter(t => !explicitBreakdownIncomes.includes(t));

    const rightItems: {
      id?: string;
      title: string;
      subtitle?: string;
      amount: number;
      type: 'income' | 'expense';
      originalTx?: Transaction;
      paymentMethod?: string;
      isAuto?: boolean;
    }[] = [];

    // 1. Add all expense logs (Red)
    expenseTxs.forEach(t => {
      rightItems.push({
        id: t.id,
        title: formatExpenseTitle(t),
        subtitle: t.paymentAccount ? `UPI(${t.paymentAccount})` + (t.note ? ` * ${t.note}` : '') : t.note || t.customerPhone || undefined,
        amount: t.amount,
        type: 'expense',
        originalTx: t,
        paymentMethod: (t.paymentMethod || 'cash').toLowerCase(),
      });
    });

    // 2. Add explicit breakdown incomes (Green / Transferred / Explicit Cash in Hand)
    if (explicitBreakdownIncomes.length > 0) {
      explicitBreakdownIncomes.forEach(t => {
        const cUpper = (t.category || '').trim().toUpperCase();
        let method = (t.paymentMethod || 'cash').toLowerCase();
        if (cUpper === 'BANK (RTGS)' || cUpper.includes('RTGS')) method = 'rtgs';
        else if (cUpper.startsWith('UPI')) method = 'upi';
        else if (cUpper === 'CASH IN HAND') method = 'cash';

        rightItems.push({
          id: t.id,
          title: formatExpenseTitle(t),
          subtitle: t.paymentAccount ? `UPI(${t.paymentAccount})` + (t.note ? ` * ${t.note}` : '') : t.note || t.customerPhone || undefined,
          amount: t.amount,
          type: 'income',
          originalTx: t,
          paymentMethod: method,
        });
      });
    } else {
      // 3. Otherwise add general non-cash sales incomes (RTGS & UPI)
      generalSalesIncomes
        .filter(t => (t.paymentMethod || 'cash').toLowerCase() !== 'cash')
        .forEach(t => {
          const cat = (t.category || 'LAB WORK').toUpperCase();
          const method = (t.paymentMethod || 'cash').toLowerCase();
          rightItems.push({
            id: t.id,
            title: cat.includes(method.toUpperCase()) ? cat : `${cat} - ${method.toUpperCase()}`,
            subtitle: t.paymentAccount ? `UPI(${t.paymentAccount})` + (t.note ? ` * ${t.note}` : '') : t.note || t.customerPhone || undefined,
            amount: t.amount,
            type: 'income',
            originalTx: t,
            paymentMethod: method,
          });
        });
    }

    return rightItems;
  };

  // Helper to load exact sample data from image if empty or requested
  const handleLoadSampleData = () => {
    if (confirm('Load demo sheet entries matching the reference sheet for ' + selectedDate + '?')) {
      const sampleTxs: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>[] = [
        // KRISHNA
        { businessId: config.id, date: selectedDate, time: '10:00', type: 'income', amount: 4000, paymentMethod: 'cash', category: 'LAB WORK', staffName: 'KRISHNA' },
        { businessId: config.id, date: selectedDate, time: '10:15', type: 'income', amount: 1200, paymentMethod: 'rtgs', category: 'LAB WORK', staffName: 'KRISHNA' },
        { businessId: config.id, date: selectedDate, time: '10:30', type: 'income', amount: 5000, paymentMethod: 'upi', category: 'LAB WORK', note: 'STORYBY DEEPAK', paymentAccount: 'RUPAY', staffName: 'KRISHNA' },
        { businessId: config.id, date: selectedDate, time: '11:00', type: 'expense', amount: 300, paymentMethod: 'cash', category: 'FOOD', staffName: 'KRISHNA' },
        { businessId: config.id, date: selectedDate, time: '11:15', type: 'expense', amount: 80, paymentMethod: 'cash', category: 'TEA', staffName: 'KRISHNA' },
        { businessId: config.id, date: selectedDate, time: '11:30', type: 'expense', amount: 1200, paymentMethod: 'cash', category: 'TRANSPORTING', staffName: 'KRISHNA' },
        { businessId: config.id, date: selectedDate, time: '12:00', type: 'expense', amount: 420, paymentMethod: 'cash', category: 'PARSAL', staffName: 'KRISHNA' },
        { businessId: config.id, date: selectedDate, time: '12:30', type: 'income', amount: 1200, paymentMethod: 'rtgs', category: 'BANK (RTGS)', staffName: 'KRISHNA' },
        { businessId: config.id, date: selectedDate, time: '13:00', type: 'income', amount: 1200, paymentMethod: 'upi', category: 'UPI AVC RAM )', staffName: 'KRISHNA' },
        { businessId: config.id, date: selectedDate, time: '13:15', type: 'income', amount: 800, paymentMethod: 'upi', category: 'UPI AP (APSARA)', staffName: 'KRISHNA' },
        { businessId: config.id, date: selectedDate, time: '13:30', type: 'income', amount: 2000, paymentMethod: 'upi', category: 'UPI RUPA (RAJA )', staffName: 'KRISHNA' },
        { businessId: config.id, date: selectedDate, time: '13:45', type: 'income', amount: 1000, paymentMethod: 'upi', category: 'UPI RAJ (RAM STU)', staffName: 'KRISHNA' },
        { businessId: config.id, date: selectedDate, time: '14:00', type: 'income', amount: 2000, paymentMethod: 'cash', category: 'CASH IN HAND', staffName: 'KRISHNA' },

        // NAVIN
        { businessId: config.id, date: selectedDate, time: '10:00', type: 'income', amount: 1000, paymentMethod: 'cash', category: 'LAB WORK', staffName: 'NAVIN' },
        { businessId: config.id, date: selectedDate, time: '10:15', type: 'income', amount: 300, paymentMethod: 'rtgs', category: 'LAB WORK', staffName: 'NAVIN' },
        { businessId: config.id, date: selectedDate, time: '10:30', type: 'income', amount: 2000, paymentMethod: 'upi', category: 'LAB WORK', note: 'S. RAJA', paymentAccount: 'RUPAI', staffName: 'NAVIN' },
        { businessId: config.id, date: selectedDate, time: '11:00', type: 'income', amount: 300, paymentMethod: 'rtgs', category: 'BANK (RTGS)', staffName: 'NAVIN' },
        { businessId: config.id, date: selectedDate, time: '11:30', type: 'income', amount: 2000, paymentMethod: 'upi', category: 'UPI AP', staffName: 'NAVIN' },
        { businessId: config.id, date: selectedDate, time: '12:00', type: 'income', amount: 950, paymentMethod: 'cash', category: 'CASH IN HAND', staffName: 'NAVIN' },

        // OTHER
        { businessId: config.id, date: selectedDate, time: '10:00', type: 'income', amount: 50, paymentMethod: 'cash', category: 'GOODS', staffName: 'OTHER' },
        { businessId: config.id, date: selectedDate, time: '10:15', type: 'income', amount: 100, paymentMethod: 'upi', category: 'GOODS', staffName: 'OTHER' },
        { businessId: config.id, date: selectedDate, time: '11:00', type: 'income', amount: 100, paymentMethod: 'upi', category: 'UPI ANSH RAJPUT', staffName: 'OTHER' },
        { businessId: config.id, date: selectedDate, time: '11:30', type: 'income', amount: 50, paymentMethod: 'cash', category: 'CASH IN HAND', staffName: 'OTHER' },
      ];
      sampleTxs.forEach(t => addTransaction(t));
    }
  };

  // Handle Edit / Delete Actions
  const handleDelete = (tx: Transaction) => {
    const isCashInHand = (tx.category || '').trim().toUpperCase() === 'CASH IN HAND';
    const label = isCashInHand ? 'Cash in Hand entry' : `${tx.type.toUpperCase()} entry`;
    if (confirm(`Delete ${label} of ${formatCurrency(tx.amount, config.currency)}?`)) {
      deleteTransaction(tx.id);
      showToast(`${label} deleted`);
    }
  };

  const handleEdit = (tx: Transaction) => {
    openCounterModal(tx.type, tx, tx.staffName);
  };

  const handleEditCashInHand = (counterName: string, currentAmount: number, existingTx?: Transaction) => {
    if (existingTx) {
      openCounterModal(existingTx.type, existingTx, existingTx.staffName || counterName);
    } else {
      const syntheticTx: Transaction = {
        id: '',
        businessId: config.id,
        date: selectedDate,
        time: '12:00',
        type: 'income',
        amount: currentAmount || 0,
        paymentMethod: 'cash',
        category: 'CASH IN HAND',
        staffName: counterName,
        note: 'Cash in Hand',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      openCounterModal('income', syntheticTx, counterName);
    }
  };

  const handleDeleteCashInHandForCounter = (counterName: string) => {
    const existingTx = scopedTransactions.find(
      t => (t.staffName || 'OTHER').trim().toUpperCase() === counterName &&
           (t.category || '').trim().toUpperCase() === 'CASH IN HAND'
    );
    if (existingTx) {
      if (confirm(`Delete Cash in Hand entry of ${formatCurrency(existingTx.amount, config.currency)} for ${counterName}?`)) {
        deleteTransaction(existingTx.id);
        showToast(`Cash in Hand entry deleted for ${counterName}`);
      }
    }
  };

  // Counter Profiles List (exclude Admin / Owner so no duplicate administrative counter is rendered)
  const definedCounterNames = [
    ...(counters || []).map(c => c.name.toUpperCase()),
    ...(config.staffMembers || []).map(s => s.toUpperCase()),
    'KRISHNA',
    'NAVIN',
    'OTHER',
  ].filter(name => !['ADMIN / OWNER', 'ADMIN', 'OWNER'].includes(name));

  // Distinct Counter Names (preserves order)
  const allCounterNames: string[] = [];
  definedCounterNames.forEach(name => {
    if (!allCounterNames.includes(name)) allCounterNames.push(name);
  });

  // Include any custom counter present in scoped transactions (excluding Admin / Owner)
  scopedTransactions.forEach(t => {
    const sName = (t.staffName || 'OTHER').trim().toUpperCase();
    if (!['ADMIN / OWNER', 'ADMIN', 'OWNER'].includes(sName) && !allCounterNames.includes(sName)) {
      allCounterNames.push(sName);
    }
  });

  // Calculate Overall Grand Totals across all counters
  let grandTotalReceive = 0;
  let grandTotalRight = 0;

  allCounterNames.forEach(counterName => {
    const cTxs = scopedTransactions.filter(
      t => (t.staffName || 'OTHER').trim().toUpperCase() === counterName
    );
    const rTxs = cTxs.filter(t => !isRightSideEntry(t));
    const subReceive = rTxs.reduce((sum, t) => sum + t.amount, 0);
    const rItems = getCounterRightItems(cTxs);
    const subRight = rItems.reduce((sum, item) => sum + item.amount, 0);

    grandTotalReceive += subReceive;
    grandTotalRight += subRight;
  });

  const grandDifference = grandTotalRight - grandTotalReceive;

  return (
    <div className="demo-pack-container animate-fade-in">
      {/* Top Utility & View Mode Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.75rem',
          paddingBottom: '0.4rem',
          borderBottom: '1px solid #f1f5f9',
          flexWrap: 'wrap',
          gap: '0.4rem',
        }}
      >
        {/* Mode Selector Tabs + Install App right to Summary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.15rem', borderRadius: '6px', gap: '0.2rem' }}>
            <button
              type="button"
              className={`nav-tab-btn ${viewMode === 'sheet' ? 'active' : ''}`}
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem', fontWeight: 800 }}
              onClick={() => setViewMode('sheet')}
            >
              <Layers size={13} />
              <span>Daily Sheet</span>
            </button>
            <button
              type="button"
              className={`nav-tab-btn ${viewMode === 'summary' ? 'active' : ''}`}
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem', fontWeight: 800 }}
              onClick={() => setViewMode('summary')}
            >
              <BarChart2 size={13} />
              <span>Summary</span>
            </button>
          </div>

          {/* Install App button just right to Summary */}
          <PWAInstallButton />
        </div>

        {/* Quick Demo Data & Search / Filter Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {scopedTransactions.length === 0 && (
            <button
              type="button"
              style={{
                fontSize: '0.7rem',
                padding: '0.25rem 0.55rem',
                borderRadius: '6px',
                background: '#f0fdf4',
                color: '#15803d',
                border: '1px solid #bbf7d0',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              onClick={handleLoadSampleData}
              title="Load demo sheet entries matching reference mockup"
            >
              + Load Demo Data
            </button>
          )}

          <button
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.25rem 0.55rem',
              borderRadius: '6px',
              background: isFilterOpen ? '#eff6ff' : '#f8fafc',
              border: `1px solid ${isFilterOpen ? '#bfdbfe' : '#cbd5e1'}`,
              color: isFilterOpen ? '#1d4ed8' : '#475569',
              fontSize: '0.725rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <Filter size={12} />
            <span>Filter / Search</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Collapsible Box */}
      {isFilterOpen && (
        <div
          className="animate-scale-in"
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '0.5rem 0.75rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ position: 'relative', flex: '1 1 180px', minWidth: '150px' }}>
            <Search size={13} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '1.9rem', fontSize: '0.775rem', padding: '0.3rem 0.55rem 0.3rem 1.9rem', width: '100%' }}
              placeholder="Search head, note, amount, phone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="form-input"
            style={{ width: 'auto', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
            value={filterMethod}
            onChange={e => setFilterMethod(e.target.value as 'all' | 'cash' | 'upi' | 'rtgs')}
          >
            <option value="all">All Modes</option>
            <option value="cash">Cash Only</option>
            <option value="upi">UPI Only</option>
            <option value="rtgs">RTGS Only</option>
          </select>

          {searchTerm && (
            <button
              type="button"
              style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 700, cursor: 'pointer', background: 'none', border: 'none' }}
              onClick={() => setSearchTerm('')}
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* =========================================================================
         VIEW 1: DAILY OVERVIEW SHEET (IMAGE 2)
         ========================================================================= */}
      {viewMode === 'sheet' && (
        <div>
          {/* Main Sheet Title */}
          <h1 className="demo-sheet-title">{config.businessName || 'DEMOSTRATION PACK'}</h1>

          {/* Interactive Date Row */}
          <div className="demo-sheet-date-row">
            <button
              type="button"
              className="icon-btn"
              style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#f1f5f9' }}
              onClick={handlePrevDay}
              title="Previous Day"
            >
              <ChevronLeft size={16} />
            </button>

            <div
              className="demo-sheet-date-text"
              onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.focus()}
              title="Click to select any date"
            >
              <Calendar size={17} style={{ color: '#1a1a9e' }} />
              <span>{formatDDMMYYYY(selectedDate)}</span>

              {/* Hidden native date picker */}
              <input
                ref={dateInputRef}
                type="date"
                style={{
                  position: 'absolute',
                  opacity: 0,
                  width: 0,
                  height: 0,
                  pointerEvents: 'none',
                }}
                value={selectedDate}
                onChange={e => {
                  if (e.target.value) setSelectedDate(e.target.value);
                }}
              />
            </div>

            <button
              type="button"
              className="icon-btn"
              style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#f1f5f9' }}
              onClick={handleNextDay}
              title="Next Day"
            >
              <ChevronRight size={16} />
            </button>

            {!isToday && (
              <button
                type="button"
                style={{
                  fontSize: '0.65rem',
                  padding: '0.12rem 0.45rem',
                  background: '#1a1a9e',
                  color: '#ffffff',
                  borderRadius: '4px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  marginLeft: '0.25rem',
                }}
                onClick={() => setSelectedDate(todayStr)}
              >
                Today
              </button>
            )}
          </div>

          {/* Dual Rounded Black Pill Action Buttons */}
          <div className="demo-action-pills-row">
            <button
              type="button"
              className="btn-black-pill"
              onClick={() => openCounterModal('income')}
            >
              <span className="pill-sub">ADD</span>
              <span className="pill-main">Receive Entry</span>
            </button>

            <button
              type="button"
              className="btn-black-pill"
              onClick={() => openCounterModal('expense')}
            >
              <span className="pill-sub">ADD</span>
              <span className="pill-main">Expence entry</span>
            </button>
          </div>

          {/* Per-Counter 2-Column Ledger Sections */}
          <div style={{ marginTop: '1.25rem' }}>
            {allCounterNames.map(counterName => {
              const counterTxs = scopedTransactions.filter(
                t => (t.staffName || 'OTHER').trim().toUpperCase() === counterName
              );

              const receiveTxs = counterTxs.filter(t => !isRightSideEntry(t));
              const rightItems = getCounterRightItems(counterTxs);

              // Individual Receive Items for Left Column
              const receiveItems = receiveTxs.map(tx => {
                const cat = (tx.category || 'LAB WORK').toUpperCase().trim();
                const method = (tx.paymentMethod || 'CASH').toUpperCase().trim();
                let title = '';
                if (cat.includes(method)) {
                  title = cat;
                } else {
                  title = `${cat} - ${method}`;
                }
                let sub = '';
                if (tx.paymentAccount) {
                  sub = `UPI(${tx.paymentAccount})`;
                  if (tx.note) sub += ` * ${tx.note}`;
                } else if (tx.note) {
                  sub = tx.note;
                } else if (tx.customerPhone) {
                  sub = tx.customerPhone;
                }
                return {
                  id: tx.id,
                  title,
                  subtitle: sub || undefined,
                  amount: tx.amount,
                  originalTx: tx,
                };
              });

              const subtotalReceive = receiveTxs.reduce((sum, t) => sum + t.amount, 0);
              const subtotalRight = rightItems.reduce((sum, item) => sum + item.amount, 0);
              const counterDiff = subtotalRight - subtotalReceive;

              // Do not render empty custom counter if none exist unless it's KRISHNA, NAVIN, or OTHER
              const isDefaultCounter = ['KRISHNA', 'NAVIN', 'OTHER'].includes(counterName);
              if (!isDefaultCounter && counterTxs.length === 0) {
                return null;
              }

              return (
                <div key={counterName} className="counter-sheet-section">
                  {/* Counter Heading (Clean, without small buttons) */}
                  <div className="counter-sheet-title">
                    <span>{counterName}</span>
                  </div>

                  {/* 2-Column Grid: Left = Receive Items with Edit/Delete, Right = Expense/Settlement Logs */}
                  <div className="counter-sheet-grid">
                    {/* Left: Receive Entries with Edit & Delete actions */}
                    <div className="counter-col-entries">
                      {receiveItems.length === 0 ? (
                        <div style={{ color: '#94a3b8', fontSize: '0.775rem', fontStyle: 'italic', padding: '0.2rem 0' }}>
                          —
                        </div>
                      ) : (
                        receiveItems.map((item) => (
                          <div key={item.id} className="ledger-item-row">
                            <div className="ledger-item-left">
                              <div
                                className="ledger-item-title item-clickable-title"
                                style={{ cursor: 'pointer' }}
                                onClick={() => openItemHistoryModal(item.originalTx?.category || item.title)}
                                title={`Click to view ${item.originalTx?.category || item.title} history & trends`}
                              >
                                {item.title}
                              </div>
                              {item.subtitle && (
                                <div className="ledger-item-subtitle">
                                  <span>👤</span>
                                  <span>{item.subtitle}</span>
                                </div>
                              )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <span className="ledger-item-amount" style={{ color: '#000000', fontWeight: 800 }}>
                                {item.amount.toLocaleString()}
                              </span>
                              <div className="ledger-item-actions">
                                <button
                                  type="button"
                                  className="icon-btn"
                                  style={{ width: '18px', height: '18px' }}
                                  onClick={() => handleEdit(item.originalTx)}
                                  title="Edit"
                                >
                                  <Edit2 size={10} />
                                </button>
                                <button
                                  type="button"
                                  className="icon-btn"
                                  style={{ width: '18px', height: '18px', color: '#dc2626' }}
                                  onClick={() => handleDelete(item.originalTx)}
                                  title="Delete"
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Right: Detailed Logs (Every entry with Red for Expense, Green for Receive/Settlement) */}
                    <div className="counter-col-entries">
                      {rightItems.length === 0 ? (
                        <div style={{ color: '#94a3b8', fontSize: '0.775rem', fontStyle: 'italic', padding: '0.2rem 0' }}>
                          —
                        </div>
                      ) : (
                        rightItems.map((item, iIdx) => {
                          const isExpense = item.type === 'expense';
                          const amountColor = isExpense ? '#dc2626' : '#16a34a';

                          return (
                            <div key={item.id || `auto-${iIdx}`} className="ledger-item-row">
                              <div className="ledger-item-left">
                                <div
                                  className="ledger-item-title item-clickable-title"
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => {
                                    if (item.originalTx) {
                                      openItemHistoryModal(item.originalTx.category || item.title);
                                    } else if (item.title && item.title !== 'CASH IN HAND') {
                                      openItemHistoryModal(item.title);
                                    }
                                  }}
                                  title={`Click to view ${item.originalTx?.category || item.title} history & trends`}
                                >
                                  {item.title}
                                </div>
                                {item.subtitle && (
                                  <div className="ledger-item-subtitle">
                                    <span>👤</span>
                                    <span>{item.subtitle}</span>
                                  </div>
                                )}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <span className="ledger-item-amount" style={{ color: amountColor, fontWeight: 800 }}>
                                  {item.amount.toLocaleString()}
                                </span>
                                {item.originalTx ? (
                                  <div className="ledger-item-actions">
                                    <button
                                      type="button"
                                      className="icon-btn"
                                      style={{ width: '18px', height: '18px' }}
                                      onClick={() => handleEdit(item.originalTx!)}
                                      title="Edit"
                                    >
                                      <Edit2 size={10} />
                                    </button>
                                    <button
                                      type="button"
                                      className="icon-btn"
                                      style={{ width: '18px', height: '18px', color: '#dc2626' }}
                                      onClick={() => handleDelete(item.originalTx!)}
                                      title="Delete"
                                    >
                                      <Trash2 size={10} />
                                    </button>
                                  </div>
                                ) : item.title === 'CASH IN HAND' ? (
                                  <div className="ledger-item-actions">
                                    <button
                                      type="button"
                                      className="icon-btn"
                                      style={{ width: '18px', height: '18px', color: '#2563eb' }}
                                      onClick={() => handleEditCashInHand(counterName, item.amount)}
                                      title="Edit Cash in Hand"
                                    >
                                      <Edit2 size={10} />
                                    </button>
                                    <button
                                      type="button"
                                      className="icon-btn"
                                      style={{ width: '18px', height: '18px', color: '#dc2626' }}
                                      onClick={() => handleDeleteCashInHandForCounter(counterName)}
                                      title="Delete / Clear Cash in Hand"
                                    >
                                      <Trash2 size={10} />
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Pink Subtotal Bar */}
                  <div className="subtotal-pink-bar">
                    <div className="subtotal-pink-left">
                      <span>SUB TOTAL ({counterName})</span>
                      <span style={{ fontSize: '0.95rem' }}>{subtotalReceive.toLocaleString()}</span>
                    </div>

                    <div className="cash-diff-badge-wrap">
                      <div className="cash-diff-label">{counterDiff !== 0 ? 'CASH DIFF.' : 'CASH'}</div>
                      <div className={`cash-diff-val ${counterDiff < 0 ? 'negative' : counterDiff > 0 ? 'positive' : ''}`}>
                        {counterDiff === 0 ? '0' : counterDiff}
                      </div>
                    </div>

                    <div className="subtotal-pink-right">
                      <span style={{ fontSize: '0.95rem' }}>{subtotalRight.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Green Grand Total Bar */}
          <div className="grand-total-green-bar">
            <div className="grand-total-left">
              <span>GRANT TOTAL</span>
              <span style={{ fontSize: '1.35rem' }}>{grandTotalReceive.toLocaleString()}</span>
            </div>

            <div className="grand-diff-badge-wrap">
              <span style={{ color: grandDifference < 0 ? '#dc2626' : grandDifference > 0 ? '#16a34a' : '#000000' }}>
                {grandDifference === 0 ? '0' : grandDifference}
              </span>
            </div>

            <div className="grand-total-right">
              <span style={{ fontSize: '1.35rem' }}>{grandTotalRight.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         VIEW 2: DATE-RANGE SUMMARY VIEW (IMAGE 1)
         ========================================================================= */}
      {viewMode === 'summary' && (
        <div className="animate-fade-in">
          {/* Summary Header Title */}
          <h1 className="demo-sheet-title" style={{ color: '#1a1a9e', letterSpacing: '0.04em' }}>
            SUNMMRY
          </h1>

          {/* Date Range Subtitle */}
          <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#1a1a9e' }}>
              {formatDDMMYYYY(summaryStartDate)} TO {formatDDMMYYYY(summaryEndDate)}
            </div>

            {/* Quick Range Presets */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                style={{ fontSize: '0.675rem', padding: '0.15rem 0.5rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 700, cursor: 'pointer' }}
                onClick={() => setPresetRange('today')}
              >
                Today
              </button>
              <button
                type="button"
                style={{ fontSize: '0.675rem', padding: '0.15rem 0.5rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 700, cursor: 'pointer' }}
                onClick={() => setPresetRange('yesterday')}
              >
                Yesterday
              </button>
              <button
                type="button"
                style={{ fontSize: '0.675rem', padding: '0.15rem 0.5rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 700, cursor: 'pointer' }}
                onClick={() => setPresetRange('7days')}
              >
                7 Days
              </button>
              <button
                type="button"
                style={{ fontSize: '0.675rem', padding: '0.15rem 0.5rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 700, cursor: 'pointer' }}
                onClick={() => setPresetRange('thisMonth')}
              >
                This Month
              </button>
              <button
                type="button"
                style={{ fontSize: '0.675rem', padding: '0.15rem 0.5rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 700, cursor: 'pointer' }}
                onClick={() => setPresetRange('lastMonth')}
              >
                Last Month
              </button>
            </div>

            {/* Custom Date Pickers & Export Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 700 }}>
                <span>From:</span>
                <input
                  type="date"
                  className="form-input"
                  style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem', width: 'auto', fontWeight: 700 }}
                  value={summaryStartDate}
                  onChange={e => setSummaryStartDate(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 700 }}>
                <span>To:</span>
                <input
                  type="date"
                  className="form-input"
                  style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem', width: 'auto', fontWeight: 700 }}
                  value={summaryEndDate}
                  onChange={e => setSummaryEndDate(e.target.value)}
                />
              </div>

              {/* Quick Excel & CSV Export Buttons */}
              <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', marginLeft: '0.25rem' }}>
                <button
                  type="button"
                  className="icon-btn"
                  style={{
                    padding: '0.22rem 0.55rem',
                    width: 'auto',
                    height: '26px',
                    borderRadius: '5px',
                    background: '#f0fdf4',
                    color: '#16a34a',
                    border: '1px solid #bbf7d0',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setExportDefaultFormat('excel');
                    setIsExportOpen(true);
                  }}
                  title="Export Transactions to Excel (.xlsx)"
                >
                  <FileSpreadsheet size={13} />
                  <span>Excel</span>
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  style={{
                    padding: '0.22rem 0.55rem',
                    width: 'auto',
                    height: '26px',
                    borderRadius: '5px',
                    background: '#eff6ff',
                    color: '#2563eb',
                    border: '1px solid #bfdbfe',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setExportDefaultFormat('csv');
                    setIsExportOpen(true);
                  }}
                  title="Export Transactions to CSV"
                >
                  <FileText size={13} />
                  <span>CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* Dark Blue Capsule Header Bar */}
          <div className="summary-dark-blue-capsule">
            <span className="col-title">Receive</span>
            <span className="col-title">EXPENSE / BREAKDOWN</span>
          </div>

          {/* Grouped Payment Methods Summary */}
          {(() => {
            // 1. Group Receive by payment method (excluding admin entries which belong to Treasury)
            const allReceiveTxs = scopedTransactions.filter(
              t => t && t.type === 'income' && !isRightSideEntry(t) && !['ADMIN', 'ADMIN / OWNER', 'OWNER'].includes((t.staffName || '').trim().toUpperCase())
            );
            const receiveCashTxs = allReceiveTxs.filter(t => (t.paymentMethod || 'cash').toString().toLowerCase() === 'cash');
            const receiveRtgsTxs = allReceiveTxs.filter(t => (t.paymentMethod || '').toString().toLowerCase() === 'rtgs');
            const receiveUpiTxs = allReceiveTxs.filter(t => (t.paymentMethod || '').toString().toLowerCase() === 'upi');

            const receiveCash = receiveCashTxs.reduce((sum, t) => sum + (t?.amount || 0), 0);
            const receiveRtgs = receiveRtgsTxs.reduce((sum, t) => sum + (t?.amount || 0), 0);
            const receiveUpi = receiveUpiTxs.reduce((sum, t) => sum + (t?.amount || 0), 0);

            // 2. Group all Expenses across the scoped transactions
            const allExpenseTxs = scopedTransactions.filter(
              t => t && t.type === 'expense' && !['ADMIN', 'ADMIN / OWNER', 'OWNER'].includes((t.staffName || '').trim().toUpperCase())
            );
            const totalExpense = allExpenseTxs.reduce((sum, t) => sum + (t?.amount || 0), 0);

            return (
              <div style={{ padding: '0 0.5rem', minHeight: '180px', textAlign: 'left' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', textAlign: 'left' }}>
                  {/* Left Column: Receive Modes (Clickable) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left' }}>
                    {/* CASH */}
                    <div
                      className="summary-method-row"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontWeight: 800,
                        fontSize: '0.925rem',
                        textAlign: 'left',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => handleOpenDrilldown('receive', 'cash')}
                      title="Click to view all Receive CASH transactions"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>CASH</span>
                        <span style={{ fontSize: '0.65rem', padding: '0.05rem 0.35rem', borderRadius: '4px', background: '#e2e8f0', color: '#475569', fontWeight: 700 }}>
                          {receiveCashTxs.length}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span style={{ color: '#16a34a' }}>{receiveCash.toLocaleString()}</span>
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>›</span>
                      </div>
                    </div>

                    {/* RTGS */}
                    <div
                      className="summary-method-row"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontWeight: 800,
                        fontSize: '0.925rem',
                        textAlign: 'left',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => handleOpenDrilldown('receive', 'rtgs')}
                      title="Click to view all Receive RTGS transactions"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>RTGS</span>
                        <span style={{ fontSize: '0.65rem', padding: '0.05rem 0.35rem', borderRadius: '4px', background: '#e2e8f0', color: '#475569', fontWeight: 700 }}>
                          {receiveRtgsTxs.length}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span style={{ color: '#16a34a' }}>{receiveRtgs.toLocaleString()}</span>
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>›</span>
                      </div>
                    </div>

                    {/* UPI */}
                    <div
                      className="summary-method-row"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontWeight: 800,
                        fontSize: '0.925rem',
                        textAlign: 'left',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => handleOpenDrilldown('receive', 'upi')}
                      title="Click to view all Receive UPI transactions"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>UPI</span>
                        <span style={{ fontSize: '0.65rem', padding: '0.05rem 0.35rem', borderRadius: '4px', background: '#e2e8f0', color: '#475569', fontWeight: 700 }}>
                          {receiveUpiTxs.length}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span style={{ color: '#16a34a' }}>{receiveUpi.toLocaleString()}</span>
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>›</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Breakdown & Expense Modes (Clickable) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left' }}>
                    {/* CASH */}
                    <div
                      className="summary-method-row"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontWeight: 800,
                        fontSize: '0.925rem',
                        textAlign: 'left',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => handleOpenDrilldown('expense', 'cash')}
                      title="Click to view Cash transactions"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>CASH</span>
                        <span style={{ fontSize: '0.65rem', padding: '0.05rem 0.35rem', borderRadius: '4px', background: '#e2e8f0', color: '#475569', fontWeight: 700 }}>
                          {receiveCashTxs.length}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span style={{ color: '#0f172a' }}>{receiveCash.toLocaleString()}</span>
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>›</span>
                      </div>
                    </div>

                    {/* RTGS */}
                    <div
                      className="summary-method-row"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontWeight: 800,
                        fontSize: '0.925rem',
                        textAlign: 'left',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => handleOpenDrilldown('expense', 'rtgs')}
                      title="Click to view RTGS transactions"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>RTGS</span>
                        <span style={{ fontSize: '0.65rem', padding: '0.05rem 0.35rem', borderRadius: '4px', background: '#e2e8f0', color: '#475569', fontWeight: 700 }}>
                          {receiveRtgsTxs.length}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span style={{ color: '#0f172a' }}>{receiveRtgs.toLocaleString()}</span>
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>›</span>
                      </div>
                    </div>

                    {/* UPI */}
                    <div
                      className="summary-method-row"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontWeight: 800,
                        fontSize: '0.925rem',
                        textAlign: 'left',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => handleOpenDrilldown('expense', 'upi')}
                      title="Click to view UPI transactions"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>UPI</span>
                        <span style={{ fontSize: '0.65rem', padding: '0.05rem 0.35rem', borderRadius: '4px', background: '#e2e8f0', color: '#475569', fontWeight: 700 }}>
                          {receiveUpiTxs.length}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span style={{ color: '#0f172a' }}>{receiveUpi.toLocaleString()}</span>
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>›</span>
                      </div>
                    </div>

                    {/* OVERALL EXPENSE DEDUCTION (RED) */}
                    {totalExpense > 0 && (
                      <div
                        className="summary-method-row"
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          textAlign: 'left',
                          padding: '0.35rem 0.65rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          background: '#fef2f2',
                          border: '1px dashed #fca5a5',
                          transition: 'all 0.15s ease',
                        }}
                        onClick={() => handleOpenDrilldown('expense', 'all')}
                        title="Click to view all Expense transactions"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ color: '#991b1b' }}>LESS: EXPENSE</span>
                          <span style={{ fontSize: '0.65rem', padding: '0.05rem 0.35rem', borderRadius: '4px', background: '#fee2e2', color: '#dc2626', fontWeight: 700 }}>
                            {allExpenseTxs.length}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <span style={{ color: '#dc2626' }}>−{totalExpense.toLocaleString()}</span>
                          <span style={{ color: '#f87171', fontSize: '0.85rem' }}>›</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Green Grand Total Bar (Reconciled with 0 Discrepancy) */}
          {(() => {
            const allReceiveTxs = scopedTransactions.filter(
              t => t && t.type === 'income' && !isRightSideEntry(t) && !['ADMIN', 'ADMIN / OWNER', 'OWNER'].includes((t.staffName || '').trim().toUpperCase())
            );
            const totalReceive = allReceiveTxs.reduce((sum, t) => sum + (t?.amount || 0), 0);

            return (
              <div className="grand-total-green-bar">
                <div className="grand-total-left">
                  <span>GRANT TOTAL</span>
                  <span style={{ fontSize: '1.35rem' }}>{totalReceive.toLocaleString()}</span>
                </div>

                <div className="grand-diff-badge-wrap">
                  <span style={{ color: '#000000', fontWeight: 900 }}>0</span>
                </div>

                <div className="grand-total-right">
                  <span style={{ fontSize: '1.35rem' }}>{totalReceive.toLocaleString()}</span>
                </div>
              </div>
            );
          })()}

          {/* Dual Rounded Black Pill Action Buttons (Exact UI as Daily Sheet - Logs to Admin) */}
          <div className="demo-action-pills-row" style={{ marginTop: '1.25rem', marginBottom: '0.75rem' }}>
            <button
              type="button"
              className="btn-black-pill"
              onClick={() => openCounterModal('income', null, 'ADMIN')}
              title="Add Admin Deposit / Receive entry"
            >
              <span className="pill-sub">ADD</span>
              <span className="pill-main">Receive Entry</span>
            </button>

            <button
              type="button"
              className="btn-black-pill"
              onClick={() => openCounterModal('expense', null, 'ADMIN')}
              title="Add Admin Withdrawal / Expense entry"
            >
              <span className="pill-sub">ADD</span>
              <span className="pill-main">Expence entry</span>
            </button>
          </div>

          {/* TREASURY STATS & CARDS */}
          {(() => {
            const treasury = storage.calculateTreasuryBalances(transactions);
            return (
              <div
                style={{
                  marginTop: '0.75rem',
                  background: '#ffffff',
                  border: '2px solid #0f172a',
                  borderRadius: '12px',
                  padding: '0.85rem 1rem',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                  textAlign: 'left',
                }}
              >
                {/* Treasury Header (Clean with Set Initial Balance) */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    marginBottom: '0.65rem',
                    gap: '0.5rem',
                  }}
                >
                  {/* Set Initial Balance Button */}
                  <button
                    type="button"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: '#f8fafc',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '9999px',
                      padding: '0.3rem 0.75rem',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      color: '#334155',
                      transition: 'all 0.15s ease',
                    }}
                    onClick={handleOpenInitialBalanceModal}
                    title="Set or update Baseline Balances (Cash, Bank RTGS, UPI)"
                  >
                    <Sliders size={13} />
                    <span>Set Initial Balance</span>
                  </button>
                </div>

                {/* 4-Stat Cards Grid (Clean, Without Formula Clutter) */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '0.75rem',
                  }}
                >
                  {/* 1. CASH IN HAND */}
                  <div
                    style={{
                      background: '#f0fdf4',
                      border: '1.5px solid #86efac',
                      borderRadius: '8px',
                      padding: '0.65rem 0.8rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Banknote size={14} /> CASH IN HAND
                      </span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                        Drawer / Safe
                      </span>
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: treasury.actualCash < 0 ? '#dc2626' : '#166534' }}>
                      {formatCurrency(treasury.actualCash, config.currency)}
                    </div>
                  </div>

                  {/* 2. RTGS (No "Bank") */}
                  <div
                    style={{
                      background: '#eff6ff',
                      border: '1.5px solid #93c5fd',
                      borderRadius: '8px',
                      padding: '0.65rem 0.8rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Building size={14} /> RTGS
                      </span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                        Bank Balance
                      </span>
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: treasury.actualRtgs < 0 ? '#dc2626' : '#1e40af' }}>
                      {formatCurrency(treasury.actualRtgs, config.currency)}
                    </div>
                  </div>

                  {/* 3. UPI */}
                  <div
                    style={{
                      background: '#faf5ff',
                      border: '1.5px solid #d8b4fe',
                      borderRadius: '8px',
                      padding: '0.65rem 0.8rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#6b21a8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <QrCode size={14} /> UPI
                      </span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#7e22ce', background: '#f3e8ff', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                        Online / QR
                      </span>
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: treasury.actualUpi < 0 ? '#dc2626' : '#6b21a8' }}>
                      {formatCurrency(treasury.actualUpi, config.currency)}
                    </div>
                  </div>

                  {/* 4. TOTAL ACTUAL MONEY */}
                  <div
                    style={{
                      background: '#fffbeb',
                      border: '2px solid #f59e0b',
                      borderRadius: '8px',
                      padding: '0.65rem 0.8rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                      boxShadow: '0 2px 6px rgba(245, 158, 11, 0.15)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        💎 TOTAL ACTUAL MONEY
                      </span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#b45309', background: '#fef3c7', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                        Grand Total Liquid
                      </span>
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: treasury.actualTotal < 0 ? '#dc2626' : '#000000' }}>
                      {formatCurrency(treasury.actualTotal, config.currency)}
                    </div>
                  </div>
                </div>

                {/* Dedicated Admin Transactions Log Panel */}
                {(() => {
                  const adminTxsInScope = treasury.adminTransactions.filter(
                    tx => (!summaryStartDate || tx.date >= summaryStartDate) && (!summaryEndDate || tx.date <= summaryEndDate)
                  );
                  const adminIncomeInScope = adminTxsInScope
                    .filter(tx => tx.type === 'income')
                    .reduce((sum, tx) => sum + (tx.amount || 0), 0);
                  const adminExpenseInScope = adminTxsInScope
                    .filter(tx => tx.type === 'expense')
                    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

                  return (
                    <div
                      style={{
                        marginTop: '1rem',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '0.65rem 0.85rem',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '0.5rem',
                          flexWrap: 'wrap',
                          gap: '0.4rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>
                            🏛️ Admin Transactions Log
                          </span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '0.1rem 0.4rem', borderRadius: '9999px', background: '#e2e8f0', color: '#475569' }}>
                            {adminTxsInScope.length}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {adminIncomeInScope > 0 && (
                            <span style={{ fontSize: '0.675rem', fontWeight: 800, color: '#16a34a', background: '#dcfce7', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                              Income: +{formatCurrency(adminIncomeInScope, config.currency)}
                            </span>
                          )}
                          {adminExpenseInScope > 0 && (
                            <span style={{ fontSize: '0.675rem', fontWeight: 800, color: '#dc2626', background: '#fee2e2', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                              Withdrawal: −{formatCurrency(adminExpenseInScope, config.currency)}
                            </span>
                          )}
                          <button
                            type="button"
                            style={{
                              fontSize: '0.675rem',
                              fontWeight: 800,
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                              background: '#ecfdf5',
                              border: '1px solid #86efac',
                              cursor: 'pointer',
                              color: '#166534',
                            }}
                            onClick={() => openCounterModal('income', null, 'ADMIN')}
                            title="Add Admin Deposit / Receive entry"
                          >
                            + Receive
                          </button>
                          <button
                            type="button"
                            style={{
                              fontSize: '0.675rem',
                              fontWeight: 800,
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                              background: '#fef2f2',
                              border: '1px solid #fca5a5',
                              cursor: 'pointer',
                              color: '#991b1b',
                            }}
                            onClick={() => openCounterModal('expense', null, 'ADMIN')}
                            title="Add Admin Withdrawal / Expense entry"
                          >
                            + Expense
                          </button>
                        </div>
                      </div>

                      {adminTxsInScope.length === 0 ? (
                        <div style={{ fontSize: '0.725rem', color: '#94a3b8', fontStyle: 'italic', padding: '0.4rem 0' }}>
                          No Admin personal withdrawals or deposit logs recorded yet.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '200px', overflowY: 'auto' }}>
                          {adminTxsInScope.map(tx => {
                            const isIncome = tx.type === 'income';
                            const methodUpper = (tx.paymentMethod || 'CASH').toUpperCase();
                            return (
                              <div
                                key={tx.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  background: '#ffffff',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '6px',
                                  padding: '0.35rem 0.6rem',
                                  fontSize: '0.75rem',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                                  <span
                                    style={{
                                      fontSize: '0.625rem',
                                      fontWeight: 900,
                                      padding: '0.1rem 0.35rem',
                                      borderRadius: '4px',
                                      background: isIncome ? '#dcfce7' : '#fee2e2',
                                      color: isIncome ? '#166534' : '#991b1b',
                                    }}
                                  >
                                    {isIncome ? '+ RECEIVE' : '− EXPENSE'}
                                  </span>

                                  <span
                                    style={{
                                      fontSize: '0.625rem',
                                      fontWeight: 800,
                                      padding: '0.1rem 0.35rem',
                                      borderRadius: '4px',
                                      background: '#f1f5f9',
                                      color: '#334155',
                                    }}
                                  >
                                    {methodUpper}
                                  </span>

                                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    <strong style={{ color: '#0f172a' }}>{tx.category || (isIncome ? 'Deposit' : 'Withdrawal')}</strong>
                                    {tx.note && <span style={{ color: '#64748b', marginLeft: '0.35rem' }}>({tx.note})</span>}
                                  </div>

                                  <span style={{ fontSize: '0.675rem', color: '#94a3b8', marginLeft: '0.2rem' }}>
                                    {formatDDMMYYYY(tx.date)}{methodUpper !== 'CASH' && tx.time ? ` • ${tx.time}` : ''}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                  <span style={{ fontWeight: 900, color: isIncome ? '#16a34a' : '#dc2626' }}>
                                    {isIncome ? '+' : '−'}{formatCurrency(tx.amount, config.currency)}
                                  </span>

                                  <div style={{ display: 'flex', gap: '0.2rem' }}>
                                    <button
                                      type="button"
                                      className="icon-btn"
                                      style={{ width: '20px', height: '20px', color: '#2563eb' }}
                                      onClick={() => openCounterModal(tx.type, tx, 'ADMIN')}
                                      title="Edit Entry"
                                    >
                                      <Edit2 size={11} />
                                    </button>
                                    <button
                                      type="button"
                                      className="icon-btn"
                                      style={{ width: '20px', height: '20px', color: '#dc2626' }}
                                      onClick={() => {
                                        if (confirm(`Delete entry of ${formatCurrency(tx.amount, config.currency)}?`)) {
                                          deleteTransaction(tx.id);
                                          showToast('Entry deleted', 'info');
                                        }
                                      }}
                                      title="Delete Entry"
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
                  );
                })()}
              </div>
            );
          })()}
        </div>
      )}

      {/* Excel / CSV Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        defaultFormat={exportDefaultFormat}
      />

      {/* Summary Category & Payment Mode Drilldown Popup */}
      <SummaryDrilldownModal
        isOpen={isDrilldownOpen}
        onClose={() => setIsDrilldownOpen(false)}
        initialType={drilldownType}
        initialMethod={drilldownMethod}
        startDate={summaryStartDate}
        endDate={summaryEndDate}
        onDateRangeChange={(s, e) => {
          setSummaryStartDate(s);
          setSummaryEndDate(e);
        }}
      />

      {/* Set Initial Treasury Balances Modal */}
      {isInitialBalanceModalOpen && (
        <div className="modal-backdrop animate-fade-in" style={{ zIndex: 100 }}>
          <div
            className="modal-container animate-scale-up"
            style={{
              maxWidth: '420px',
              width: '92%',
              background: '#ffffff',
              borderRadius: '12px',
              border: '2px solid #000000',
              padding: '1.25rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              textAlign: 'left',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Wallet size={18} color="#0f172a" />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>
                  Set Initial / Baseline Balances
                </h3>
              </div>
              <button
                type="button"
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '9999px',
                  width: '26px',
                  height: '26px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onClick={() => setIsInitialBalanceModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveInitialBalances} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                Enter the baseline money already in your drawer, bank account, and UPI accounts before starting daily transaction logs.
              </p>

              {/* Initial Cash */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', fontWeight: 800, color: '#166534', marginBottom: '0.3rem' }}>
                  <Banknote size={14} /> Initial Cash In Hand (Drawer/Safe) (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    border: '1.5px solid #000000',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  placeholder="0"
                  value={initCashInput}
                  onChange={e => setInitCashInput(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Initial RTGS */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', fontWeight: 800, color: '#1e40af', marginBottom: '0.3rem' }}>
                  <Building size={14} /> Initial Bank Balance (RTGS) (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    border: '1.5px solid #000000',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  placeholder="0"
                  value={initRtgsInput}
                  onChange={e => setInitRtgsInput(e.target.value)}
                />
              </div>

              {/* Initial UPI */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', fontWeight: 800, color: '#6b21a8', marginBottom: '0.3rem' }}>
                  <QrCode size={14} /> Initial Online Balance (UPI) (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    border: '1.5px solid #000000',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  placeholder="0"
                  value={initUpiInput}
                  onChange={e => setInitUpiInput(e.target.value)}
                />
              </div>

              {/* Live Sum Preview */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '0.5rem 0.75rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                }}
              >
                <span>Total Initial Baseline:</span>
                <span style={{ color: '#0f172a', fontSize: '1rem' }}>
                  {formatCurrency((parseFloat(initCashInput) || 0) + (parseFloat(initRtgsInput) || 0) + (parseFloat(initUpiInput) || 0), config.currency)}
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '0.55rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f1f5f9',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                  onClick={() => setIsInitialBalanceModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1.5,
                    padding: '0.55rem',
                    borderRadius: '8px',
                    border: '1.5px solid #000000',
                    background: '#16a34a',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                  }}
                >
                  Save Initial Balances
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
