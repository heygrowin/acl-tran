import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Calendar,
  Search,
  Edit2,
  Trash2,
  FileSpreadsheet,
  FileText,
  Clock,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatCurrency, formatDDMMYYYY, getTodayDateString } from '../services/storageService';

interface ItemHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: string;
}

type PresetRange = 'today' | 'yesterday' | '7days' | 'thisMonth' | 'lastMonth' | 'all' | 'custom';

export const ItemHistoryModal: React.FC<ItemHistoryModalProps> = ({
  isOpen,
  onClose,
  category = 'TEA',
}) => {
  const {
    transactions,
    config,
    openCounterModal,
    deleteTransaction,
    showToast,
    setAdminTab,
    setSelectedAnalysisCategory,
  } = useApp();

  const [activeCategory, setActiveCategory] = useState<string>(category);
  const [selectedPreset, setSelectedPreset] = useState<PresetRange>('today');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCashier, setSelectedCashier] = useState<string>('all');
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState<boolean>(false);

  const todayStr = getTodayDateString();

  // Initialize date range based on preset
  useEffect(() => {
    if (category) {
      setActiveCategory(category);
    }
  }, [category]);

  useEffect(() => {
    const now = new Date();
    if (selectedPreset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (selectedPreset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (selectedPreset === '7days') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (selectedPreset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else if (selectedPreset === 'lastMonth') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      setStartDate(firstDayLastMonth);
      setEndDate(lastDayLastMonth);
    } else if (selectedPreset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  }, [selectedPreset, todayStr]);

  // Extract all distinct categories/heads present in transactions
  // Extract all distinct categories/heads present in transactions & config
  const allAvailableCategories = useMemo(() => {
    const catMap = new Map<string, number>();
    (config.incomeCategories || []).forEach(c => {
      const clean = c.trim().toUpperCase();
      if (clean && !catMap.has(clean)) catMap.set(clean, 0);
    });
    (config.expenseCategories || []).forEach(c => {
      const clean = c.trim().toUpperCase();
      if (clean && !catMap.has(clean)) catMap.set(clean, 0);
    });
    transactions.forEach(t => {
      if (!t) return;
      const cat = (t.category || '').trim().toUpperCase();
      if (cat && cat !== 'CASH IN HAND' && cat !== 'BANK (RTGS)' && !cat.startsWith('UPI ')) {
        catMap.set(cat, (catMap.get(cat) || 0) + 1);
      }
    });
    return Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
  }, [config.incomeCategories, config.expenseCategories, transactions]);

  // Filter transactions for the selected category and range
  const matchedTransactions = useMemo(() => {
    if (!isOpen || !activeCategory) return [];

    const targetCat = activeCategory.trim().toUpperCase();

    return transactions.filter(t => {
      if (!t) return false;
      const tCat = (t.category || '').trim().toUpperCase();

      // Exact match for category only
      if (tCat !== targetCat) return false;

      // Date filter
      const tDate = t.date || '';
      if (startDate && tDate < startDate) return false;
      if (endDate && tDate > endDate) return false;

      // Cashier filter
      if (selectedCashier !== 'all') {
        const staff = (t.staffName || 'OTHER').trim().toUpperCase();
        if (staff !== selectedCashier.toUpperCase()) return false;
      }

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchNote = (t.note || '').toLowerCase().includes(q);
        const matchStaff = (t.staffName || '').toLowerCase().includes(q);
        const matchMethod = (t.paymentMethod || '').toLowerCase().includes(q);
        const matchAmt = (t.amount || 0).toString().includes(q);
        if (!matchNote && !matchStaff && !matchMethod && !matchAmt) return false;
      }

      return true;
    }).sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      const timeA = a.time || '';
      const timeB = b.time || '';
      return timeB.localeCompare(timeA);
    });
  }, [isOpen, activeCategory, transactions, startDate, endDate, selectedCashier, searchTerm]);

  // Key Aggregations & Metrics
  const totalAmount = useMemo(() => {
    return matchedTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [matchedTransactions]);

  // Cashier Breakdown
  const cashierDistribution = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    matchedTransactions.forEach(t => {
      const staff = (t.staffName || 'OTHER').trim().toUpperCase();
      if (!map[staff]) map[staff] = { count: 0, total: 0 };
      map[staff].count += 1;
      map[staff].total += (t.amount || 0);
    });

    return Object.entries(map)
      .map(([staff, data]) => ({
        staff,
        count: data.count,
        total: data.total,
        pct: totalAmount > 0 ? Math.round((data.total / totalAmount) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [matchedTransactions, totalAmount]);

  // Export to Excel / CSV
  const handleExport = (format: 'excel' | 'csv') => {
    if (matchedTransactions.length === 0) {
      showToast('No records to export', 'info');
      return;
    }

    const exportRows = matchedTransactions.map(tx => ({
      Date: formatDDMMYYYY(tx.date),
      Time: tx.time || '',
      Item: tx.category || activeCategory,
      Type: (tx.type || 'expense').toUpperCase(),
      Amount: tx.amount,
      Payment_Mode: (tx.paymentMethod || 'CASH').toUpperCase(),
      Account: tx.paymentAccount || '',
      Cashier: tx.staffName || 'Counter',
      Remark: tx.note || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${activeCategory}_History`);

    const filename = `${activeCategory}_${startDate || 'all'}_to_${endDate || 'all'}.${format === 'excel' ? 'xlsx' : 'csv'}`;
    XLSX.writeFile(workbook, filename, { bookType: format === 'excel' ? 'xlsx' : 'csv' });
    showToast(`Exported ${filename}`, 'success');
  };

  const handleOpenFullAnalysis = () => {
    setSelectedAnalysisCategory(activeCategory);
    setAdminTab('itemAnalysis');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay animate-fade-in" style={{ zIndex: 1200 }} onClick={onClose}>
      <div
        className="modal animate-scale-in"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '850px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '16px',
          border: '1px solid #334155',
          boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
        }}
      >
        {/* Modal Top Header */}
        <div
          style={{
            background: '#0f172a',
            color: '#ffffff',
            padding: '0.85rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #334155',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.01em' }}>
              {activeCategory}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              type="button"
              onClick={handleOpenFullAnalysis}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: '#334155',
                color: '#f8fafc',
                border: '1px solid #475569',
                borderRadius: '6px',
                padding: '0.3rem 0.65rem',
                fontSize: '0.725rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Open full dedicated Item Analysis tab"
            >
              <ExternalLink size={12} />
              <span>Full Tab</span>
            </button>

            <button
              type="button"
              className="icon-btn"
              onClick={onClose}
              style={{ color: '#94a3b8', width: '32px', height: '32px', borderRadius: '50%' }}
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Controls Bar */}
        <div
          style={{
            padding: '0.75rem 1.25rem',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
          }}
        >
          {/* Row 1: Category Switcher Pills & Preset Date Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            {/* Category Quick Chips & Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.1rem' }}>
              <span style={{ fontSize: '0.725rem', fontWeight: 800, color: '#475569', whiteSpace: 'nowrap' }}>
                Item:
              </span>
              {allAvailableCategories.slice(0, 6).map(catName => {
                const isSelected = activeCategory.toUpperCase() === catName;
                return (
                  <button
                    key={catName}
                    type="button"
                    style={{
                      background: isSelected ? '#0f172a' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#334155',
                      border: isSelected ? '1.5px solid #0f172a' : '1px solid #cbd5e1',
                      borderRadius: '9999px',
                      padding: '0.2rem 0.6rem',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.12s ease',
                      boxShadow: isSelected ? '0 2px 5px rgba(0,0,0,0.15)' : 'none',
                    }}
                    onClick={() => setActiveCategory(catName)}
                  >
                    {catName}
                  </button>
                );
              })}

              {/* More Categories Dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '9999px',
                    padding: '0.2rem 0.55rem',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                  onClick={() => setIsCategoryPickerOpen(prev => !prev)}
                >
                  <span>More</span>
                  <ChevronDown size={12} />
                </button>

                {isCategoryPickerOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: '4px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                      maxHeight: '180px',
                      overflowY: 'auto',
                      zIndex: 200,
                      width: '160px',
                    }}
                  >
                    {allAvailableCategories.map(cat => (
                      <div
                        key={cat}
                        style={{
                          padding: '0.4rem 0.75rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: activeCategory === cat ? '#f1f5f9' : '#ffffff',
                          color: '#0f172a',
                        }}
                        onClick={() => {
                          setActiveCategory(cat);
                          setIsCategoryPickerOpen(false);
                        }}
                      >
                        {cat}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Date Range Presets */}
            <div style={{ display: 'flex', background: '#ffffff', padding: '0.15rem', borderRadius: '6px', border: '1px solid #cbd5e1', gap: '0.15rem' }}>
              {(['today', 'yesterday', '7days', 'thisMonth', 'lastMonth', 'all', 'custom'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  className={`nav-tab-btn ${selectedPreset === p ? 'active' : ''}`}
                  style={{ fontSize: '0.675rem', padding: '0.2rem 0.5rem', fontWeight: 700 }}
                  onClick={() => setSelectedPreset(p)}
                >
                  {p === 'today' ? 'Today' : p === 'yesterday' ? 'Yesterday' : p === '7days' ? '7 Days' : p === 'thisMonth' ? 'This Month' : p === 'lastMonth' ? 'Last Month' : p === 'all' ? 'All Time' : 'Custom'}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Custom Date Pickers, Cashier Filter, Search & Export */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
              {selectedPreset === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#ffffff', padding: '0.2rem 0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <Calendar size={13} style={{ color: '#64748b' }} />
                  <input
                    type="date"
                    style={{ border: 'none', background: 'transparent', fontSize: '0.725rem', fontWeight: 700, outline: 'none' }}
                    value={startDate}
                    onChange={e => {
                      setStartDate(e.target.value);
                      setSelectedPreset('custom');
                    }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>to</span>
                  <input
                    type="date"
                    style={{ border: 'none', background: 'transparent', fontSize: '0.725rem', fontWeight: 700, outline: 'none' }}
                    value={endDate}
                    onChange={e => {
                      setEndDate(e.target.value);
                      setSelectedPreset('custom');
                    }}
                  />
                </div>
              )}

              {/* Cashier Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>Staff:</span>
                <select
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                  value={selectedCashier}
                  onChange={e => setSelectedCashier(e.target.value)}
                >
                  <option value="all">All Staff</option>
                  {cashierDistribution.map(c => (
                    <option key={c.staff} value={c.staff}>
                      {c.staff} ({formatCurrency(c.total, config.currency)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Search input */}
              <div style={{ position: 'relative', minWidth: '150px' }}>
                <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search..."
                  style={{
                    width: '100%',
                    padding: '0.25rem 0.5rem 0.25rem 1.6rem',
                    fontSize: '0.725rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Export Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <button
                type="button"
                className="icon-btn"
                style={{
                  height: '26px',
                  padding: '0 0.5rem',
                  borderRadius: '6px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: '#15803d',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
                onClick={() => handleExport('excel')}
                title="Export to Excel"
              >
                <FileSpreadsheet size={13} />
                <span>Excel</span>
              </button>
              <button
                type="button"
                className="icon-btn"
                style={{
                  height: '26px',
                  padding: '0 0.5rem',
                  borderRadius: '6px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: '#1e40af',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
                onClick={() => handleExport('csv')}
                title="Export to CSV"
              >
                <FileText size={13} />
                <span>CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>
          {/* Total Spending in Range Card */}
          <div style={{ maxWidth: '300px', marginBottom: '1rem' }}>
            <div
              style={{
                background: '#fafafa',
                border: '1.5px solid #e2e8f0',
                borderRadius: '10px',
                padding: '0.65rem 0.85rem',
              }}
            >
              <div style={{ fontSize: '0.725rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                Total Spending in Range
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', margin: '0.2rem 0 0' }}>
                {formatCurrency(totalAmount, config.currency)}
              </div>
            </div>
          </div>

          {/* Chronological Transaction Log Table */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
              <div style={{ fontSize: '0.825rem', fontWeight: 800, color: '#0f172a' }}>
                🕒 Transaction Log ({matchedTransactions.length})
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                Click Edit to adjust or delete entries
              </div>
            </div>

            {matchedTransactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>🔍</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>No {activeCategory} transactions recorded</div>
                <div style={{ fontSize: '0.725rem', color: '#94a3b8' }}>Try expanding the date range or clearing filters</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {matchedTransactions.map(tx => {
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
                        borderRadius: '8px',
                        padding: '0.45rem 0.75rem',
                        fontSize: '0.75rem',
                        transition: 'all 0.12s ease',
                      }}
                    >
                      {/* Left: Date, Time, Cashier Badge, Note */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#64748b', fontSize: '0.72rem', fontWeight: 700 }}>
                          <Clock size={12} />
                          <span>{formatDDMMYYYY(tx.date)} {tx.time || ''}</span>
                        </div>

                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 900,
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            background: '#0f172a',
                            color: '#ffffff',
                          }}
                        >
                          {tx.staffName || 'Counter'}
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

                        {tx.note && (
                          <span style={{ color: '#475569', fontWeight: 600, fontStyle: 'italic' }}>
                            "{tx.note}"
                          </span>
                        )}

                        {tx.paymentAccount && (
                          <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                            ({tx.paymentAccount})
                          </span>
                        )}
                      </div>

                      {/* Right: Amount & Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span
                          style={{
                            fontSize: '0.925rem',
                            fontWeight: 900,
                            color: isIncome ? '#16a34a' : '#dc2626',
                          }}
                        >
                          {isIncome ? '+' : '−'}{formatCurrency(tx.amount, config.currency)}
                        </span>

                        <div style={{ display: 'flex', gap: '0.2rem' }}>
                          <button
                            type="button"
                            className="icon-btn"
                            style={{ width: '22px', height: '22px', color: '#2563eb' }}
                            onClick={() => openCounterModal(tx.type, tx, tx.staffName)}
                            title="Edit Entry"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn"
                            style={{ width: '22px', height: '22px', color: '#dc2626' }}
                            onClick={() => {
                              if (confirm(`Delete ${activeCategory} entry of ${formatCurrency(tx.amount, config.currency)} on ${formatDDMMYYYY(tx.date)}?`)) {
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
            Showing <strong>{matchedTransactions.length}</strong> {activeCategory} records • Total <strong>{formatCurrency(totalAmount, config.currency)}</strong>
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
