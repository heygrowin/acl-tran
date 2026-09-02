import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { Transaction } from '../types';
import {
  Search,
  Trash2,
  Edit2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  Sliders,
  Wallet,
  Banknote,
  Building,
  QrCode,
} from 'lucide-react';
import { formatCurrency, getTodayDateString, formatDDMMYYYY, storage, isCashInHandTransaction } from '../services/storageService';
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
  if (isCashInHandTransaction(t)) return true;
  const cUpper = (t.category || '').trim().toUpperCase();
  if (cUpper === 'BANK (RTGS)') return true;
  if (cUpper.startsWith('UPI ') && !cUpper.includes('LAB WORK') && !cUpper.includes('GOODS')) return true;
  return false;
};

export interface SheetGroupItem {
  key: string;
  title: string;
  totalAmount: number;
  count: number;
  type?: 'income' | 'expense';
  entries: {
    id?: string;
    title: string;
    subtitle?: string;
    amount: number;
    type?: 'income' | 'expense';
    originalTx?: Transaction;
    paymentMethod?: string;
  }[];
}

export const groupSheetItems = (items: {
  id?: string;
  title: string;
  subtitle?: string;
  amount: number;
  type?: 'income' | 'expense';
  originalTx?: Transaction;
  paymentMethod?: string;
}[]): SheetGroupItem[] => {
  const groupsMap = new Map<string, SheetGroupItem>();

  items.forEach(item => {
    const normTitle = (item.title || '').trim().toUpperCase();
    if (!groupsMap.has(normTitle)) {
      groupsMap.set(normTitle, {
        key: normTitle,
        title: item.title,
        totalAmount: 0,
        count: 0,
        type: item.type,
        entries: [],
      });
    }
    const grp = groupsMap.get(normTitle)!;
    grp.totalAmount += item.amount || 0;
    grp.count += 1;
    grp.entries.push(item);
  });

  return Array.from(groupsMap.values());
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
    deleteTransaction,
    openCounterModal,
    openClosingModal,
    updateInitialBalances,
    openItemHistoryModal,
    showToast,
    currentScreen,
    selectedMember,
  } = useApp();

  const todayStr = getTodayDateString();
  const dateInputRef = useRef<HTMLInputElement>(null);

  const isEmployee = currentScreen === 'employee' || (selectedMember && selectedMember !== 'Admin / Owner');

  // Date restrictions: Employees cannot see more than 3 days in the past or future
  const minAllowedDate = isEmployee
    ? (() => {
        const d = new Date();
        d.setDate(d.getDate() - 3);
        return d.toISOString().split('T')[0];
      })()
    : undefined;

  const maxAllowedDate = isEmployee ? todayStr : undefined;

  // Local View and Filter States
  const viewMode = initialMode;
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState<'all' | 'cash' | 'upi' | 'rtgs'>('all');
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
  const [showAdminSplitView, setShowAdminSplitView] = useState(false);
  const [initCashInput, setInitCashInput] = useState('');
  const [initRtgsInput, setInitRtgsInput] = useState('');
  const [initUpiInput, setInitUpiInput] = useState('');

  // Expandable Head Groups on Daily Sheet (Collapse same heads into total with arrow)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

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

  // Date Range for Summary Mode (Defaults to Today)
  const [summaryStartDate, setSummaryStartDate] = useState(todayStr);
  const [summaryEndDate, setSummaryEndDate] = useState(todayStr);
  const [treasuryTxScope, setTreasuryTxScope] = useState<'admin' | 'employee' | 'all'>('admin');

  const isToday = selectedDate === todayStr;

  // Single Day Navigation Handlers
  const handleToday = () => {
    setSelectedDate(todayStr);
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    const newDateStr = d.toISOString().split('T')[0];
    if (minAllowedDate && newDateStr < minAllowedDate) {
      showToast('You can view records up to 3 days in the past', 'info');
      return;
    }
    setSelectedDate(newDateStr);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    const newDateStr = d.toISOString().split('T')[0];
    if (maxAllowedDate && newDateStr > maxAllowedDate) {
      return;
    }
    setSelectedDate(newDateStr);
  };

  // Summary Date Navigation Handlers (Step Day by Day)
  const handleSummaryPrevDay = () => {
    if (summaryStartDate === summaryEndDate) {
      const d = new Date(summaryStartDate);
      d.setDate(d.getDate() - 1);
      const s = d.toISOString().split('T')[0];
      setSummaryStartDate(s);
      setSummaryEndDate(s);
    } else {
      const d1 = new Date(summaryStartDate);
      const d2 = new Date(summaryEndDate);
      d1.setDate(d1.getDate() - 1);
      d2.setDate(d2.getDate() - 1);
      setSummaryStartDate(d1.toISOString().split('T')[0]);
      setSummaryEndDate(d2.toISOString().split('T')[0]);
    }
  };

  const handleSummaryNextDay = () => {
    if (summaryStartDate === summaryEndDate) {
      const d = new Date(summaryEndDate);
      d.setDate(d.getDate() + 1);
      const s = d.toISOString().split('T')[0];
      setSummaryStartDate(s);
      setSummaryEndDate(s);
    } else {
      const d1 = new Date(summaryStartDate);
      const d2 = new Date(summaryEndDate);
      d1.setDate(d1.getDate() + 1);
      d2.setDate(d2.getDate() + 1);
      setSummaryStartDate(d1.toISOString().split('T')[0]);
      setSummaryEndDate(d2.toISOString().split('T')[0]);
    }
  };

  // Global Keyboard Navigation (r = Add Receive, e = Add Expense, Left/Right = Date navigation, t = Today)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Never intercept browser system keys (Cmd/Ctrl/Alt combinations e.g. Cmd+R / Ctrl+R refresh)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'r' || e.key === 'R' || e.key === '+') {
        e.preventDefault();
        openCounterModal('income', undefined, isEmployee ? selectedMember : undefined);
      } else if (e.key === 'e' || e.key === 'E' || e.key === '-') {
        e.preventDefault();
        openCounterModal('expense', undefined, isEmployee ? selectedMember : undefined);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (viewMode === 'summary') {
          handleSummaryPrevDay();
        } else {
          handlePrevDay();
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (viewMode === 'summary') {
          handleSummaryNextDay();
        } else {
          handleNextDay();
        }
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        handleToday();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedDate, isEmployee, selectedMember, minAllowedDate, maxAllowedDate]);

  // Active Transactions for Current Scope
  const scopedTransactions = transactions.filter(t => {
    if (viewMode === 'summary') {
      if (t.date < summaryStartDate || t.date > summaryEndDate) return false;
    } else {
      if (t.date !== selectedDate) return false;
    }

    // If Employee / Counter is logged in, show ONLY their own counter transactions!
    if (isEmployee && selectedMember) {
      if ((t.staffName || '').trim().toUpperCase() !== selectedMember.trim().toUpperCase()) {
        return false;
      }
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

  // Helper to determine right side items for a counter (excluding CASH IN HAND)
  const getCounterRightItems = (cTxs: Transaction[]) => {
    const expenseTxs = cTxs.filter(t => t.type === 'expense' && !isCashInHandTransaction(t));
    const incomeTxs = cTxs.filter(t => t.type === 'income' && !isCashInHandTransaction(t));

    // Check if there are explicit breakdown income logs (e.g. BANK RTGS, UPI accounts)
    const explicitBreakdownIncomes = incomeTxs.filter(t => {
      const cUpper = (t.category || '').trim().toUpperCase();
      return cUpper === 'BANK (RTGS)' ||
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

    // 2. Add explicit breakdown incomes (Green / Transferred)
    if (explicitBreakdownIncomes.length > 0) {
      explicitBreakdownIncomes.forEach(t => {
        const cat = (t.category || '').toUpperCase();
        let subtitle = t.note || '';
        if (t.paymentAccount) {
          subtitle = `Account: ${t.paymentAccount}${t.note ? ` * ${t.note}` : ''}`;
        }
        rightItems.push({
          id: t.id,
          title: cat,
          subtitle: subtitle || undefined,
          amount: t.amount,
          type: 'income',
          originalTx: t,
          paymentMethod: (t.paymentMethod || '').toLowerCase(),
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

  // Handle Edit / Delete Actions
  const handleDelete = (tx: Transaction) => {
    const isCashInHand = isCashInHandTransaction(tx);
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
           isCashInHandTransaction(t)
    );
    if (existingTx) {
      if (confirm(`Delete Cash in Hand entry of ${formatCurrency(existingTx.amount, config.currency)} for ${counterName}?`)) {
        deleteTransaction(existingTx.id);
        showToast(`Cash in Hand entry deleted for ${counterName}`);
      }
    }
  };

  // Counter Profiles List (exclude Admin / Owner so no duplicate administrative counter is rendered)
  const allCounterNames: string[] = isEmployee && selectedMember
    ? [selectedMember.toUpperCase()]
    : (() => {
        const defined = [
          ...(counters || []).map(c => c.name.toUpperCase()),
          ...(config.staffMembers || []).map(s => s.toUpperCase()),
          'KRISHNA',
          'NAVIN',
          'OTHER',
        ].filter(name => !['ADMIN / OWNER', 'ADMIN', 'OWNER'].includes(name));

        const names: string[] = [];
        defined.forEach(name => {
          if (!names.includes(name)) names.push(name);
        });

        // Include any custom counter present in scoped transactions (excluding Admin / Owner)
        scopedTransactions.forEach(t => {
          const sName = (t.staffName || 'OTHER').trim().toUpperCase();
          if (!['ADMIN / OWNER', 'ADMIN', 'OWNER'].includes(sName) && !names.includes(sName)) {
            names.push(sName);
          }
        });
        return names;
      })();

  // Calculate Overall Grand Totals across all counters
  let grandTotalReceive = 0;
  let grandTotalRight = 0;
  let grandTotalCashInHand = 0;

  allCounterNames.forEach(counterName => {
    const cTxs = scopedTransactions.filter(
      t => (t.staffName || 'OTHER').trim().toUpperCase() === counterName
    );
    const rTxs = cTxs.filter(t => !isRightSideEntry(t));
    const subReceive = rTxs.reduce((sum, t) => sum + t.amount, 0);
    const rItems = getCounterRightItems(cTxs);
    const subRight = rItems.reduce((sum, item) => sum + item.amount, 0);
    const cCashInHand = cTxs.find(t => isCashInHandTransaction(t))?.amount || 0;

    grandTotalReceive += subReceive;
    grandTotalRight += subRight;
    grandTotalCashInHand += cCashInHand;
  });

  // Include any other Cash In Hand logged in scoped transactions (e.g. general / Admin)
  scopedTransactions.forEach(t => {
    if (isCashInHandTransaction(t)) {
      const sName = (t.staffName || 'OTHER').trim().toUpperCase();
      if (!allCounterNames.includes(sName)) {
        grandTotalCashInHand += t.amount;
      }
    }
  });

  const grandDifference = (grandTotalRight + grandTotalCashInHand) - grandTotalReceive;

  return (
    <div className="demo-pack-container animate-fade-in">
      {/* Primary Top Header: Store Title + Search & Mode Filter */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.65rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <h1 className="demo-sheet-title" style={{ margin: 0, textAlign: 'left' }}>
          {config.businessName || 'DEMOSTRATION PACK'}
        </h1>

        {/* Search & Mode Filter right in primary header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', minWidth: '220px', flex: '0 1 auto' }}>
          <div style={{ position: 'relative', minWidth: '150px', maxWidth: '240px', flex: 1 }}>
            <Search size={13} style={{ position: 'absolute', left: '0.55rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              className="form-input"
              style={{
                paddingLeft: '1.75rem',
                paddingRight: searchTerm ? '1.5rem' : '0.5rem',
                paddingTop: '0.25rem',
                paddingBottom: '0.25rem',
                fontSize: '0.75rem',
                borderRadius: '6px',
                width: '100%',
              }}
              placeholder="Search entry, note, phone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                style={{
                  position: 'absolute',
                  right: '0.4rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  padding: 0,
                  lineHeight: 1,
                }}
                onClick={() => setSearchTerm('')}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <select
            className="form-input"
            style={{
              width: 'auto',
              fontSize: '0.725rem',
              padding: '0.25rem 0.45rem',
              borderRadius: '6px',
            }}
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

      {/* =========================================================================
         VIEW 1: DAILY OVERVIEW SHEET (IMAGE 2)
         ========================================================================= */}
      {(isEmployee || viewMode === 'sheet') && (
        <div>

          {/* Interactive Date Row */}
          <div className="demo-sheet-date-row">
            <button
              type="button"
              className="icon-btn"
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: '#f1f5f9',
                opacity: minAllowedDate && selectedDate <= minAllowedDate ? 0.4 : 1,
                cursor: minAllowedDate && selectedDate <= minAllowedDate ? 'not-allowed' : 'pointer',
              }}
              onClick={handlePrevDay}
              disabled={!!(minAllowedDate && selectedDate <= minAllowedDate)}
              title="Previous Day"
            >
              <ChevronLeft size={16} />
            </button>

            <div
              className="demo-sheet-date-text"
              onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.focus()}
              title="Click to select date"
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
                min={minAllowedDate}
                max={maxAllowedDate}
                value={selectedDate}
                onChange={e => {
                  if (e.target.value) {
                    if (minAllowedDate && e.target.value < minAllowedDate) {
                      showToast('Employees can only view records up to 3 days in the past', 'info');
                      setSelectedDate(minAllowedDate);
                      return;
                    }
                    if (maxAllowedDate && e.target.value > maxAllowedDate) {
                      setSelectedDate(maxAllowedDate);
                      return;
                    }
                    setSelectedDate(e.target.value);
                  }
                }}
              />
            </div>

            <button
              type="button"
              className="icon-btn"
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: '#f1f5f9',
                opacity: maxAllowedDate && selectedDate >= maxAllowedDate ? 0.4 : 1,
                cursor: maxAllowedDate && selectedDate >= maxAllowedDate ? 'not-allowed' : 'pointer',
              }}
              onClick={handleNextDay}
              disabled={!!(maxAllowedDate && selectedDate >= maxAllowedDate)}
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
              onClick={() => openCounterModal('income', undefined, isEmployee ? selectedMember : undefined)}
            >
              <span className="pill-sub">ADD</span>
              <span className="pill-main">Receive Entry</span>
            </button>

            <button
              type="button"
              className="btn-black-pill"
              onClick={() => openCounterModal('expense', undefined, isEmployee ? selectedMember : undefined)}
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

              const counterCashInHandTx = counterTxs.find(
                t => isCashInHandTransaction(t)
              );
              const counterCashInHand = counterCashInHandTx ? counterCashInHandTx.amount : 0;

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
              const counterDiff = (subtotalRight + counterCashInHand) - subtotalReceive;

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
                    {/* Left: Receive Entries (Grouped duplicate heads with collapsible chevron + sum) */}
                    <div className="counter-col-entries">
                      {(() => {
                        const receiveGroups = groupSheetItems(receiveItems);
                        if (receiveGroups.length === 0) {
                          return (
                            <div style={{ color: '#94a3b8', fontSize: '0.775rem', fontStyle: 'italic', padding: '0.2rem 0' }}>
                              —
                            </div>
                          );
                        }

                        return receiveGroups.map(grp => {
                          const groupKey = `${counterName}_left_${grp.key}`;
                          const isExpanded = !!expandedGroups[groupKey];
                          const isMultiple = grp.entries.length > 1;

                          if (!isMultiple) {
                            const item = grp.entries[0];
                            return (
                              <div key={item.id || grp.key} className="ledger-item-row">
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
                                  ) : null}
                                </div>
                              </div>
                            );
                          }

                          // Multiple entries with the same Head
                          return (
                            <div key={grp.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                              <div
                                className="ledger-item-row"
                                style={{
                                  background: isExpanded ? '#f1f5f9' : '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '5px',
                                  cursor: 'pointer',
                                  padding: '0.25rem 0.4rem',
                                  userSelect: 'none',
                                }}
                                onClick={() => toggleGroup(groupKey)}
                              >
                                <div className="ledger-item-left" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <button
                                    type="button"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      padding: 0,
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      color: '#1e293b',
                                    }}
                                    title={isExpanded ? 'Collapse entries' : 'Expand entries'}
                                  >
                                    {isExpanded ? <ChevronDown size={14} strokeWidth={2.5} /> : <ChevronRight size={14} strokeWidth={2.5} />}
                                  </button>
                                  <span
                                    className="ledger-item-title item-clickable-title"
                                    style={{ cursor: 'pointer', fontWeight: 800 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openItemHistoryModal(grp.entries[0]?.originalTx?.category || grp.title);
                                    }}
                                    title={`Click to view ${grp.title} history`}
                                  >
                                    {grp.title}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: '0.65rem',
                                      fontWeight: 800,
                                      background: '#e2e8f0',
                                      color: '#334155',
                                      padding: '0.05rem 0.35rem',
                                      borderRadius: '9999px',
                                    }}
                                  >
                                    {grp.entries.length}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <span className="ledger-item-amount" style={{ color: '#000000', fontWeight: 900 }}>
                                    {grp.totalAmount.toLocaleString()}
                                  </span>
                                </div>
                              </div>

                              {isExpanded && (
                                <div
                                  style={{
                                    paddingLeft: '1rem',
                                    marginLeft: '0.5rem',
                                    borderLeft: '2px solid #cbd5e1',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.15rem',
                                    marginTop: '0.1rem',
                                    marginBottom: '0.2rem',
                                  }}
                                >
                                  {grp.entries.map((childItem, cIdx) => (
                                    <div key={childItem.id || `child-${cIdx}`} className="ledger-item-row" style={{ padding: '0.15rem 0.25rem', background: '#ffffff', borderRadius: '4px' }}>
                                      <div className="ledger-item-left">
                                        <div className="ledger-item-subtitle" style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1e293b' }}>
                                          <span>👤</span>
                                          <span>{childItem.subtitle || 'Entry'}</span>
                                        </div>
                                      </div>

                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <span className="ledger-item-amount" style={{ color: '#334155', fontWeight: 800, fontSize: '0.825rem' }}>
                                          {childItem.amount.toLocaleString()}
                                        </span>
                                        {childItem.originalTx ? (
                                          <div className="ledger-item-actions">
                                            <button
                                              type="button"
                                              className="icon-btn"
                                              style={{ width: '18px', height: '18px' }}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleEdit(childItem.originalTx!);
                                              }}
                                              title="Edit"
                                            >
                                              <Edit2 size={10} />
                                            </button>
                                            <button
                                              type="button"
                                              className="icon-btn"
                                              style={{ width: '18px', height: '18px', color: '#dc2626' }}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(childItem.originalTx!);
                                              }}
                                              title="Delete"
                                            >
                                              <Trash2 size={10} />
                                            </button>
                                          </div>
                                        ) : null}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>

                    {/* Right: Detailed Logs (Grouped duplicate heads with collapsible chevron + sum) */}
                    <div className="counter-col-entries">
                      {(() => {
                        const rightGroups = groupSheetItems(rightItems);
                        if (rightGroups.length === 0) {
                          return (
                            <div style={{ color: '#94a3b8', fontSize: '0.775rem', fontStyle: 'italic', padding: '0.2rem 0' }}>
                              —
                            </div>
                          );
                        }

                        return rightGroups.map(grp => {
                          const groupKey = `${counterName}_right_${grp.key}`;
                          const isExpanded = !!expandedGroups[groupKey];
                          const isMultiple = grp.entries.length > 1;
                          const isExpense = grp.type === 'expense';
                          const amountColor = isExpense ? '#dc2626' : '#16a34a';

                          if (!isMultiple) {
                            const item = grp.entries[0];
                            const itemIsExpense = item.type === 'expense';
                            const itemAmountColor = itemIsExpense ? '#dc2626' : '#16a34a';

                            return (
                              <div key={item.id || grp.key} className="ledger-item-row">
                                <div className="ledger-item-left">
                                  <div
                                    className="ledger-item-title item-clickable-title"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => {
                                      if (item.originalTx) {
                                        openItemHistoryModal(item.originalTx.category || item.title);
                                      } else if (item.title) {
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
                                  <span className="ledger-item-amount" style={{ color: itemAmountColor, fontWeight: 800 }}>
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
                                  ) : null}
                                </div>
                              </div>
                            );
                          }

                          // Multiple entries with the same Head
                          return (
                            <div key={grp.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                              <div
                                className="ledger-item-row"
                                style={{
                                  background: isExpanded ? '#f1f5f9' : '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '5px',
                                  cursor: 'pointer',
                                  padding: '0.25rem 0.4rem',
                                  userSelect: 'none',
                                }}
                                onClick={() => toggleGroup(groupKey)}
                              >
                                <div className="ledger-item-left" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <button
                                    type="button"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      padding: 0,
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      color: '#1e293b',
                                    }}
                                    title={isExpanded ? 'Collapse entries' : 'Expand entries'}
                                  >
                                    {isExpanded ? <ChevronDown size={14} strokeWidth={2.5} /> : <ChevronRight size={14} strokeWidth={2.5} />}
                                  </button>
                                  <span
                                    className="ledger-item-title item-clickable-title"
                                    style={{ cursor: 'pointer', fontWeight: 800 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openItemHistoryModal(grp.entries[0]?.originalTx?.category || grp.title);
                                    }}
                                    title={`Click to view ${grp.title} history`}
                                  >
                                    {grp.title}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: '0.65rem',
                                      fontWeight: 800,
                                      background: '#e2e8f0',
                                      color: '#334155',
                                      padding: '0.05rem 0.35rem',
                                      borderRadius: '9999px',
                                    }}
                                  >
                                    {grp.entries.length}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <span className="ledger-item-amount" style={{ color: amountColor, fontWeight: 900 }}>
                                    {grp.totalAmount.toLocaleString()}
                                  </span>
                                </div>
                              </div>

                              {isExpanded && (
                                <div
                                  style={{
                                    paddingLeft: '1rem',
                                    marginLeft: '0.5rem',
                                    borderLeft: '2px solid #cbd5e1',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.15rem',
                                    marginTop: '0.1rem',
                                    marginBottom: '0.2rem',
                                  }}
                                >
                                  {grp.entries.map((childItem, cIdx) => {
                                    const childIsExpense = childItem.type === 'expense';
                                    const childColor = childIsExpense ? '#dc2626' : '#16a34a';
                                    return (
                                      <div key={childItem.id || `child-${cIdx}`} className="ledger-item-row" style={{ padding: '0.15rem 0.25rem', background: '#ffffff', borderRadius: '4px' }}>
                                        <div className="ledger-item-left">
                                          <div className="ledger-item-subtitle" style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1e293b' }}>
                                            <span>👤</span>
                                            <span>{childItem.subtitle || 'Entry'}</span>
                                          </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                          <span className="ledger-item-amount" style={{ color: childColor, fontWeight: 800, fontSize: '0.825rem' }}>
                                            {childItem.amount.toLocaleString()}
                                          </span>
                                          {childItem.originalTx ? (
                                            <div className="ledger-item-actions">
                                              <button
                                                type="button"
                                                className="icon-btn"
                                                style={{ width: '18px', height: '18px' }}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleEdit(childItem.originalTx!);
                                                }}
                                                title="Edit"
                                              >
                                                <Edit2 size={10} />
                                              </button>
                                              <button
                                                type="button"
                                                className="icon-btn"
                                                style={{ width: '18px', height: '18px', color: '#dc2626' }}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDelete(childItem.originalTx!);
                                                }}
                                                title="Delete"
                                              >
                                                <Trash2 size={10} />
                                              </button>
                                            </div>
                                          ) : null}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Pink Subtotal Bar */}
                  <div className="subtotal-pink-bar">
                    <div className="subtotal-pink-left">
                      <span>SUB TOTAL ({counterName})</span>
                      <span style={{ fontSize: '0.95rem' }}>{subtotalReceive.toLocaleString()}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <div className="cash-diff-badge-wrap">
                        <div className="cash-diff-label">{counterDiff !== 0 ? 'CASH DIFF.' : 'CASH'}</div>
                        <div className={`cash-diff-val ${counterDiff < 0 ? 'negative' : counterDiff > 0 ? 'positive' : ''}`}>
                          {counterDiff === 0 ? '0' : counterDiff}
                        </div>
                      </div>

                      {/* Cash in Hand button positioned right to Cash Difference */}
                      <button
                        type="button"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          background: '#0f172a',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '0.3rem 0.55rem',
                          fontSize: '0.725rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          transition: 'all 0.15s ease',
                        }}
                        onClick={() => openClosingModal(counterName)}
                        title={`Record Cash in Hand for ${counterName}`}
                      >
                        <Banknote size={11} />
                        <span>Cash in Hand</span>
                      </button>

                      {/* Cash in Hand Amount shown right to button */}
                      {counterCashInHand > 0 && (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            background: '#ffffff',
                            color: '#15803d',
                            border: '1.5px solid #86efac',
                            borderRadius: '4px',
                            padding: '0.15rem 0.45rem',
                            fontSize: '0.75rem',
                            fontWeight: 900,
                            boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <span
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleEditCashInHand(counterName, counterCashInHand, counterCashInHandTx)}
                            title="Click to edit Cash in Hand amount"
                          >
                            {counterCashInHand.toLocaleString()}
                          </span>
                          <button
                            type="button"
                            className="icon-btn"
                            style={{ width: '14px', height: '14px', color: '#dc2626', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCashInHandForCounter(counterName);
                            }}
                            title="Delete / Clear Cash in Hand"
                          >
                            <Trash2 size={9} />
                          </button>
                        </div>
                      )}
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <div className="grand-diff-badge-wrap">
                <span style={{ color: grandDifference < 0 ? '#dc2626' : grandDifference > 0 ? '#16a34a' : '#000000' }}>
                  {grandDifference === 0 ? '0' : grandDifference}
                </span>
              </div>

              {/* Cash in Hand button positioned right to Grand Difference */}
              <button
                type="button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  background: '#000000',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.775rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.25)',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => openClosingModal()}
                title="Record Cash in Hand (Physical count)"
              >
                <Banknote size={12} />
                <span>Cash in Hand</span>
              </button>

              {/* Grand Total Cash in Hand Amount shown right to button */}
              {grandTotalCashInHand > 0 && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    background: '#ffffff',
                    color: '#15803d',
                    border: '2px solid #16a34a',
                    borderRadius: '4px',
                    padding: '0.2rem 0.55rem',
                    fontSize: '0.85rem',
                    fontWeight: 900,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span
                    style={{ cursor: 'pointer' }}
                    onClick={() => openClosingModal()}
                    title="Click to edit Cash in Hand"
                  >
                    {grandTotalCashInHand.toLocaleString()}
                  </span>
                </div>
              )}
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
      {!isEmployee && viewMode === 'summary' && (
        <div className="animate-fade-in">
          {/* Summary Header Title */}
          <h1 className="demo-sheet-title" style={{ color: '#1a1a9e', letterSpacing: '0.04em' }}>
            SUMMARY
          </h1>

          {/* Date Range Subtitle with Left & Right Navigation Arrows */}
          <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.65rem' }}>
              <button
                type="button"
                className="icon-btn"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#f1f5f9',
                  border: '1.5px solid #cbd5e1',
                  color: '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
                onClick={handleSummaryPrevDay}
                title="Previous Day (Left Arrow)"
              >
                <ChevronLeft size={18} />
              </button>

              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#1a1a9e', letterSpacing: '0.02em' }}>
                {summaryStartDate === summaryEndDate
                  ? formatDDMMYYYY(summaryStartDate)
                  : `${formatDDMMYYYY(summaryStartDate)} TO ${formatDDMMYYYY(summaryEndDate)}`}
              </div>

              <button
                type="button"
                className="icon-btn"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#f1f5f9',
                  border: '1.5px solid #cbd5e1',
                  color: '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
                onClick={handleSummaryNextDay}
                title="Next Day (Right Arrow)"
              >
                <ChevronRight size={18} />
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

          {/* Grouped Payment Methods Summary - Clean ACTUAL CASH, RTGS, UPI, TOTAL EXPENSE & GRAND TOTAL */}
          {(() => {
            const allReceiveTxs = scopedTransactions.filter(
              t => t && t.type === 'income' && !isRightSideEntry(t) && !['ADMIN', 'ADMIN / OWNER', 'OWNER'].includes((t.staffName || '').trim().toUpperCase())
            );
            const receiveCashTxs = allReceiveTxs.filter(t => (t.paymentMethod || 'cash').toString().toLowerCase() === 'cash');
            const receiveRtgsTxs = allReceiveTxs.filter(t => (t.paymentMethod || '').toString().toLowerCase() === 'rtgs');
            const receiveUpiTxs = allReceiveTxs.filter(t => (t.paymentMethod || '').toString().toLowerCase() === 'upi');

            const allExpenseTxs = scopedTransactions.filter(
              t => t && t.type === 'expense' && !isCashInHandTransaction(t) && !['ADMIN', 'ADMIN / OWNER', 'OWNER'].includes((t.staffName || '').trim().toUpperCase())
            );
            const expenseCashTxs = allExpenseTxs.filter(t => (t.paymentMethod || 'cash').toString().toLowerCase() === 'cash');

            const receiveCash = receiveCashTxs.reduce((sum, t) => sum + (t?.amount || 0), 0);
            const receiveRtgs = receiveRtgsTxs.reduce((sum, t) => sum + (t?.amount || 0), 0);
            const receiveUpi = receiveUpiTxs.reduce((sum, t) => sum + (t?.amount || 0), 0);
            const expenseCash = expenseCashTxs.reduce((sum, t) => sum + (t?.amount || 0), 0);

            // Actual Cash = Cash Daily Received − Cash Expense
            const actualCash = receiveCash - expenseCash;
            const grandTotal = actualCash + receiveRtgs + receiveUpi;

            return (
              <div style={{ maxWidth: '640px', margin: '0.85rem auto 1.25rem auto', padding: '0 0.5rem', textAlign: 'left' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', textAlign: 'left' }}>
                  {/* ACTUAL CASH */}
                  <div
                    className="summary-method-row"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      textAlign: 'left',
                      padding: '0.65rem 0.95rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: '#f8fafc',
                      border: '1.5px solid #e2e8f0',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    }}
                    onClick={() => handleOpenDrilldown('receive', 'cash')}
                    title="Click to view all Cash Receive transactions"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 900, color: '#0f172a' }}>ACTUAL CASH</span>
                      <span style={{ fontSize: '0.675rem', padding: '0.1rem 0.45rem', borderRadius: '4px', background: '#e2e8f0', color: '#475569', fontWeight: 800 }}>
                        {receiveCashTxs.length}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ color: actualCash < 0 ? '#dc2626' : '#16a34a', fontSize: '1.15rem', fontWeight: 900 }}>
                        {actualCash.toLocaleString()}
                      </span>
                      <span style={{ color: '#94a3b8', fontSize: '1rem' }}>›</span>
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
                      fontSize: '0.95rem',
                      textAlign: 'left',
                      padding: '0.65rem 0.95rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: '#f8fafc',
                      border: '1.5px solid #e2e8f0',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    }}
                    onClick={() => handleOpenDrilldown('receive', 'rtgs')}
                    title="Click to view all RTGS transactions"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 900, color: '#0f172a' }}>RTGS</span>
                      <span style={{ fontSize: '0.675rem', padding: '0.1rem 0.45rem', borderRadius: '4px', background: '#e2e8f0', color: '#475569', fontWeight: 800 }}>
                        {receiveRtgsTxs.length}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ color: '#16a34a', fontSize: '1.15rem', fontWeight: 900 }}>{receiveRtgs.toLocaleString()}</span>
                      <span style={{ color: '#94a3b8', fontSize: '1rem' }}>›</span>
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
                      fontSize: '0.95rem',
                      textAlign: 'left',
                      padding: '0.65rem 0.95rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: '#f8fafc',
                      border: '1.5px solid #e2e8f0',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    }}
                    onClick={() => handleOpenDrilldown('receive', 'upi')}
                    title="Click to view all UPI transactions"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 900, color: '#0f172a' }}>UPI</span>
                      <span style={{ fontSize: '0.675rem', padding: '0.1rem 0.45rem', borderRadius: '4px', background: '#e2e8f0', color: '#475569', fontWeight: 800 }}>
                        {receiveUpiTxs.length}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ color: '#16a34a', fontSize: '1.15rem', fontWeight: 900 }}>{receiveUpi.toLocaleString()}</span>
                      <span style={{ color: '#94a3b8', fontSize: '1rem' }}>›</span>
                    </div>
                  </div>

                  {/* TOTAL EXPENSE (Deducted from Cash) */}
                  <div
                    className="summary-method-row"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      textAlign: 'left',
                      padding: '0.65rem 0.95rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: '#fff1f2',
                      border: '1.5px solid #fecdd3',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    }}
                    onClick={() => handleOpenDrilldown('expense', 'cash')}
                    title="Click to view all Cash Expense transactions"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 900, color: '#9f1239' }}>TOTAL EXPENSE</span>
                      <span style={{ fontSize: '0.675rem', padding: '0.1rem 0.45rem', borderRadius: '4px', background: '#ffe4e6', color: '#be123c', fontWeight: 800 }}>
                        {expenseCashTxs.length}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ color: '#e11d48', fontSize: '1.15rem', fontWeight: 900 }}>{expenseCash.toLocaleString()}</span>
                      <span style={{ color: '#fda4af', fontSize: '1rem' }}>›</span>
                    </div>
                  </div>
                </div>

                {/* Green Grand Total Bar */}
                <div
                  className="grand-total-green-bar"
                  style={{
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1.25rem',
                    marginTop: '0.75rem',
                    boxShadow: '0 3px 8px rgba(98, 216, 98, 0.35)',
                  }}
                >
                  <span style={{ fontSize: '1.15rem', fontWeight: 900, letterSpacing: '0.02em' }}>GRAND TOTAL</span>
                  <span style={{ fontSize: '1.45rem', fontWeight: 900 }}>{grandTotal.toLocaleString()}</span>
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
            const asOfDate = summaryEndDate || summaryStartDate || selectedDate;
            const treasury = storage.calculateTreasuryBalances(transactions, asOfDate);
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
                {/* Treasury Header (With 2-Column Toggle & Set Initial Balance) */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.65rem',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                  }}
                >
                  {/* 2-Column Split View Checkbox/Toggle */}
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: showAdminSplitView ? '#1e40af' : '#475569',
                      cursor: 'pointer',
                      background: showAdminSplitView ? '#eff6ff' : '#f8fafc',
                      border: showAdminSplitView ? '1.5px solid #93c5fd' : '1.5px solid #cbd5e1',
                      borderRadius: '9999px',
                      padding: '0.25rem 0.65rem',
                      userSelect: 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={showAdminSplitView}
                      onChange={e => setShowAdminSplitView(e.target.checked)}
                      style={{ cursor: 'pointer', accentColor: '#2563eb' }}
                    />
                    <span>2-Column Split View</span>
                  </label>

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

                {/* CASH IN HAND Stat Card (Date-Aware) */}
                <div style={{ maxWidth: '420px', margin: '0 auto' }}>
                  <div
                    style={{
                      background: '#f0fdf4',
                      border: '1.5px solid #86efac',
                      borderRadius: '8px',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.3rem',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                        <Banknote size={16} /> CASH IN HAND
                      </span>
                      {asOfDate && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '0.1rem 0.45rem', borderRadius: '9999px', border: '1px solid #bbf7d0' }}>
                          As of {formatDDMMYYYY(asOfDate)}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 900, color: treasury.actualCash < 0 ? '#dc2626' : '#166534', textAlign: 'center' }}>
                      {formatCurrency(treasury.actualCash, config.currency)}
                    </div>
                  </div>
                </div>

                {/* Dedicated Transactions Log Panel with Scope Selector (Admin | Employee | All) */}
                {(() => {
                  const dateFilteredTxs = transactions.filter(
                    tx => (!summaryStartDate || tx.date >= summaryStartDate) && (!summaryEndDate || tx.date <= summaryEndDate)
                  );

                  const txsInScope = dateFilteredTxs.filter(tx => {
                    if (!tx) return false;
                    const sName = (tx.staffName || '').trim().toUpperCase();
                    const isAdmin = sName === 'ADMIN' || sName === 'ADMIN / OWNER' || sName === 'OWNER';
                    if (treasuryTxScope === 'admin') return isAdmin;
                    if (treasuryTxScope === 'employee') return !isAdmin;
                    return true; // 'all'
                  });

                  // Sort newest first
                  txsInScope.sort((a, b) => {
                    const dateDiff = (b.date || '').localeCompare(a.date || '');
                    if (dateDiff !== 0) return dateDiff;
                    return (b.time || '').localeCompare(a.time || '');
                  });

                  const incomeTxs = txsInScope.filter(tx => tx.type === 'income');
                  const expenseTxs = txsInScope.filter(tx => tx.type === 'expense');
                  const incomeInScope = incomeTxs.reduce((sum, tx) => sum + (tx.amount || 0), 0);
                  const expenseInScope = expenseTxs.reduce((sum, tx) => sum + (tx.amount || 0), 0);

                  const scopeTitle = treasuryTxScope === 'admin'
                    ? '🏛️ Admin Transactions Log'
                    : treasuryTxScope === 'employee'
                    ? '👥 Employee Transactions Log'
                    : '📊 All Transactions Log';

                  return (
                    <>
                      <div
                        style={{
                          marginTop: '1rem',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '0.65rem 0.85rem',
                        }}
                      >
                        {/* Header: Title + Scope Filter + Add Buttons */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '0.6rem',
                            flexWrap: 'wrap',
                            gap: '0.45rem',
                          }}
                        >
                          {/* Title & Count */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                              {scopeTitle}
                            </span>
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.1rem 0.45rem', borderRadius: '9999px', background: '#e2e8f0', color: '#475569' }}>
                              {txsInScope.length}
                            </span>
                          </div>

                          {/* Scope Segmented Buttons: [ Admin | Employee | All ] */}
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              background: '#e2e8f0',
                              padding: '0.18rem',
                              borderRadius: '8px',
                              gap: '0.2rem',
                            }}
                          >
                            {(['admin', 'employee', 'all'] as const).map(tabKey => {
                              const isActive = treasuryTxScope === tabKey;
                              const label = tabKey === 'admin' ? 'Admin' : tabKey === 'employee' ? 'Employee' : 'All';
                              return (
                                <button
                                  key={tabKey}
                                  type="button"
                                  onClick={() => setTreasuryTxScope(tabKey)}
                                  style={{
                                    border: 'none',
                                    background: isActive ? '#0f172a' : 'transparent',
                                    color: isActive ? '#ffffff' : '#334155',
                                    fontWeight: 800,
                                    fontSize: '0.72rem',
                                    padding: '0.22rem 0.65rem',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.12)' : 'none',
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>

                          {/* Action Buttons for Adding Admin Entries */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              style={{
                                fontSize: '0.76rem',
                                fontWeight: 800,
                                padding: '0.3rem 0.7rem',
                                borderRadius: '6px',
                                background: '#ecfdf5',
                                border: '1.5px solid #86efac',
                                cursor: 'pointer',
                                color: '#166534',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                transition: 'all 0.15s ease',
                              }}
                              onClick={() => openCounterModal('income', null, 'ADMIN')}
                              title="Add Admin Deposit / Receive entry"
                            >
                              + Receive
                            </button>
                            <button
                              type="button"
                              style={{
                                fontSize: '0.76rem',
                                fontWeight: 800,
                                padding: '0.3rem 0.7rem',
                                borderRadius: '6px',
                                background: '#fef2f2',
                                border: '1.5px solid #fca5a5',
                                cursor: 'pointer',
                                color: '#991b1b',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                transition: 'all 0.15s ease',
                              }}
                              onClick={() => openCounterModal('expense', null, 'ADMIN')}
                              title="Add Admin Withdrawal / Expense entry"
                            >
                              + Expense
                            </button>
                          </div>
                        </div>

                        {txsInScope.length === 0 ? (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', padding: '0.6rem 0' }}>
                            No {treasuryTxScope === 'all' ? '' : treasuryTxScope} transactions recorded for this period.
                          </div>
                        ) : showAdminSplitView ? (
                          /* 2-COLUMN SPLIT VIEW (Left: Receive, Right: Expense) */
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem', marginTop: '0.4rem' }}>
                            {/* Left Column: Receive / Income */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: 0 }}>
                              <div style={{ fontSize: '0.725rem', fontWeight: 800, color: '#166534', background: '#dcfce7', border: '1px solid #86efac', padding: '0.25rem 0.5rem', borderRadius: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>RECEIVE / INCOME ({incomeTxs.length})</span>
                                <span>+{formatCurrency(incomeInScope, config.currency)}</span>
                              </div>
                              {incomeTxs.length === 0 ? (
                                <div style={{ fontSize: '0.725rem', color: '#94a3b8', fontStyle: 'italic', padding: '0.3rem 0' }}>
                                  No receive entries
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '250px', overflowY: 'auto' }}>
                                  {incomeTxs.map(tx => {
                                    const methodUpper = (tx.paymentMethod || 'CASH').toUpperCase();
                                    const sNameUpper = (tx.staffName || '').trim().toUpperCase();
                                    const isTxAdmin = sNameUpper === 'ADMIN' || sNameUpper === 'ADMIN / OWNER' || sNameUpper === 'OWNER';
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
                                          padding: '0.35rem 0.55rem',
                                          fontSize: '0.775rem',
                                          gap: '0.35rem',
                                          minWidth: 0,
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0, flex: 1, flexWrap: 'wrap' }}>
                                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap' }}>
                                            {formatDDMMYYYY(tx.date)}
                                          </span>
                                          {tx.staffName && (
                                            <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '0.08rem 0.35rem', borderRadius: '3px', background: isTxAdmin ? '#e0e7ff' : '#ecfdf5', color: isTxAdmin ? '#3730a3' : '#166534', border: `1px solid ${isTxAdmin ? '#c7d2fe' : '#bbf7d0'}` }}>
                                              {tx.staffName}
                                            </span>
                                          )}
                                          <span style={{ fontSize: '0.775rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                                            {tx.category || 'Deposit'}
                                          </span>
                                          {tx.note && (
                                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#334155', wordBreak: 'break-word' }}>
                                              ({tx.note})
                                            </span>
                                          )}
                                          <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '0.1rem 0.35rem', borderRadius: '3px', background: '#f1f5f9', color: '#334155' }}>
                                            {methodUpper}
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                                          <span style={{ fontWeight: 900, fontSize: '0.85rem', color: '#16a34a', whiteSpace: 'nowrap' }}>
                                            +{formatCurrency(tx.amount, config.currency)}
                                          </span>
                                          <div style={{ display: 'flex', gap: '0.15rem' }}>
                                            <button
                                              type="button"
                                              className="icon-btn"
                                              style={{ width: '20px', height: '20px', color: '#2563eb' }}
                                              onClick={() => openCounterModal(tx.type, tx, tx.staffName || 'ADMIN')}
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

                            {/* Right Column: Withdrawal / Expense */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: 0 }}>
                              <div style={{ fontSize: '0.725rem', fontWeight: 800, color: '#991b1b', background: '#fee2e2', border: '1px solid #fca5a5', padding: '0.25rem 0.5rem', borderRadius: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>WITHDRAWAL / EXPENSE ({expenseTxs.length})</span>
                                <span>−{formatCurrency(expenseInScope, config.currency)}</span>
                              </div>
                              {expenseTxs.length === 0 ? (
                                <div style={{ fontSize: '0.725rem', color: '#94a3b8', fontStyle: 'italic', padding: '0.3rem 0' }}>
                                  No withdrawal entries
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '250px', overflowY: 'auto' }}>
                                  {expenseTxs.map(tx => {
                                    const methodUpper = (tx.paymentMethod || 'CASH').toUpperCase();
                                    const sNameUpper = (tx.staffName || '').trim().toUpperCase();
                                    const isTxAdmin = sNameUpper === 'ADMIN' || sNameUpper === 'ADMIN / OWNER' || sNameUpper === 'OWNER';
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
                                          padding: '0.35rem 0.55rem',
                                          fontSize: '0.775rem',
                                          gap: '0.35rem',
                                          minWidth: 0,
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0, flex: 1, flexWrap: 'wrap' }}>
                                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap' }}>
                                            {formatDDMMYYYY(tx.date)}
                                          </span>
                                          {tx.staffName && (
                                            <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '0.08rem 0.35rem', borderRadius: '3px', background: isTxAdmin ? '#e0e7ff' : '#ecfdf5', color: isTxAdmin ? '#3730a3' : '#166534', border: `1px solid ${isTxAdmin ? '#c7d2fe' : '#bbf7d0'}` }}>
                                              {tx.staffName}
                                            </span>
                                          )}
                                          <span style={{ fontSize: '0.775rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                                            {tx.category || 'Withdrawal'}
                                          </span>
                                          {tx.note && (
                                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#334155', wordBreak: 'break-word' }}>
                                              ({tx.note})
                                            </span>
                                          )}
                                          <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '0.1rem 0.35rem', borderRadius: '3px', background: '#f1f5f9', color: '#334155' }}>
                                            {methodUpper}
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                                          <span style={{ fontWeight: 900, fontSize: '0.85rem', color: '#dc2626', whiteSpace: 'nowrap' }}>
                                            −{formatCurrency(tx.amount, config.currency)}
                                          </span>
                                          <div style={{ display: 'flex', gap: '0.15rem' }}>
                                            <button
                                              type="button"
                                              className="icon-btn"
                                              style={{ width: '20px', height: '20px', color: '#2563eb' }}
                                              onClick={() => openCounterModal(tx.type, tx, tx.staffName || 'ADMIN')}
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
                          </div>
                        ) : (
                          /* UNIFIED SINGLE-COLUMN VIEW (Default) */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '240px', overflowY: 'auto' }}>
                            {txsInScope.map(tx => {
                              const isIncome = tx.type === 'income';
                              const methodUpper = (tx.paymentMethod || 'CASH').toUpperCase();
                              const sNameUpper = (tx.staffName || '').trim().toUpperCase();
                              const isTxAdmin = sNameUpper === 'ADMIN' || sNameUpper === 'ADMIN / OWNER' || sNameUpper === 'OWNER';
                              return (
                                <div
                                  key={tx.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: '#ffffff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '7px',
                                    padding: '0.45rem 0.75rem',
                                    fontSize: '0.8rem',
                                    gap: '0.5rem',
                                    minWidth: 0,
                                  }}
                                >
                                  {/* Left: Date -> Staff Badge -> Head -> Remark -> Payment Method */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0, flex: 1, flexWrap: 'wrap' }}>
                                    {/* 1. Date First */}
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap' }}>
                                      {formatDDMMYYYY(tx.date)}{methodUpper !== 'CASH' && tx.time ? ` • ${tx.time}` : ''}
                                    </span>

                                    {/* Staff Badge */}
                                    {tx.staffName && (
                                      <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '0.1rem 0.4rem', borderRadius: '3px', background: isTxAdmin ? '#e0e7ff' : '#ecfdf5', color: isTxAdmin ? '#3730a3' : '#166534', border: `1px solid ${isTxAdmin ? '#c7d2fe' : '#bbf7d0'}` }}>
                                        {tx.staffName}
                                      </span>
                                    )}

                                    {/* 2. Head (Category) */}
                                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                                      {tx.category || (isIncome ? 'Deposit' : 'Withdrawal')}
                                    </span>

                                    {/* 3. Remark */}
                                    {tx.note && (
                                      <span style={{ fontSize: '0.775rem', fontWeight: 600, color: '#334155', wordBreak: 'break-word' }}>
                                        ({tx.note})
                                      </span>
                                    )}

                                    {/* 4. Payment Method */}
                                    <span
                                      style={{
                                        fontSize: '0.675rem',
                                        fontWeight: 800,
                                        padding: '0.12rem 0.45rem',
                                        borderRadius: '4px',
                                        background: methodUpper === 'CASH' ? '#f1f5f9' : '#e0e7ff',
                                        color: methodUpper === 'CASH' ? '#334155' : '#3730a3',
                                        border: methodUpper === 'CASH' ? '1px solid #cbd5e1' : '1px solid #c7d2fe',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {methodUpper}
                                    </span>
                                  </div>

                                  {/* Right: Amount & Action Buttons */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                    <span style={{ fontWeight: 900, fontSize: '0.9rem', color: isIncome ? '#16a34a' : '#dc2626', whiteSpace: 'nowrap' }}>
                                      {isIncome ? '+' : '−'}{formatCurrency(tx.amount, config.currency)}
                                    </span>

                                    <div style={{ display: 'flex', gap: '0.2rem' }}>
                                      <button
                                        type="button"
                                        className="icon-btn"
                                        style={{ width: '22px', height: '22px', color: '#2563eb' }}
                                        onClick={() => openCounterModal(tx.type, tx, tx.staffName || 'ADMIN')}
                                        title="Edit Entry"
                                      >
                                        <Edit2 size={12} />
                                      </button>
                                      <button
                                        type="button"
                                        className="icon-btn"
                                        style={{ width: '22px', height: '22px', color: '#dc2626' }}
                                        onClick={() => {
                                          if (confirm(`Delete entry of ${formatCurrency(tx.amount, config.currency)}?`)) {
                                            deleteTransaction(tx.id);
                                            showToast('Entry deleted', 'info');
                                          }
                                        }}
                                        title="Delete Entry"
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

                      {/* Income and Withdrawal Summary: Income on Left Corner, Withdrawal on Right Corner */}
                      <div
                        style={{
                          marginTop: '0.65rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.6rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#166534', background: '#dcfce7', border: '1.5px solid #86efac', padding: '0.35rem 0.8rem', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                          Income: +{formatCurrency(incomeInScope, config.currency)}
                        </span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#991b1b', background: '#fee2e2', border: '1.5px solid #fca5a5', padding: '0.35rem 0.8rem', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                          Expense: −{formatCurrency(expenseInScope, config.currency)}
                        </span>
                      </div>
                    </>
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
