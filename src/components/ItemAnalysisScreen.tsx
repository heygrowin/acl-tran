import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Calendar,
  Search,
  FileSpreadsheet,
  FileText,
  Clock,
  Plus,
  Edit2,
  Trash2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatCurrency, formatDDMMYYYY, getTodayDateString } from '../services/storageService';

type PresetRange = 'today' | 'yesterday' | '7days' | 'thisMonth' | 'lastMonth' | 'all' | 'custom';

export const ItemAnalysisScreen: React.FC = () => {
  const {
    transactions,
    config,
    selectedAnalysisCategory,
    setSelectedAnalysisCategory,
    openCounterModal,
    deleteTransaction,
    showToast,
  } = useApp();

  const [selectedPreset, setSelectedPreset] = useState<PresetRange>('7days');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>(selectedAnalysisCategory || 'TEA');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [selectedCashier, setSelectedCashier] = useState<string>('all');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const todayStr = getTodayDateString();

  // Sync activeCategory when context changes
  useEffect(() => {
    if (selectedAnalysisCategory) {
      setActiveCategory(selectedAnalysisCategory);
    }
  }, [selectedAnalysisCategory]);

  // Handle Preset Date Ranges
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

  // 1. Extract All Categories & Heads across the system with stats
  const categoryStatsList = useMemo(() => {
    const map = new Map<string, { name: string; count: number; total: number; type: 'income' | 'expense' }>();

    transactions.forEach(t => {
      if (!t) return;
      const rawCat = (t.category || '').trim().toUpperCase();
      if (!rawCat || rawCat === 'CASH IN HAND' || rawCat === 'BANK (RTGS)' || rawCat.startsWith('UPI ')) {
        return;
      }

      if (!map.has(rawCat)) {
        map.set(rawCat, {
          name: rawCat,
          count: 0,
          total: 0,
          type: t.type || 'expense',
        });
      }

      const current = map.get(rawCat)!;
      current.count += 1;
      current.total += (t.amount || 0);
    });

    // Ensure default common heads exist
    ['TEA', 'TEATRANSPORT', 'FOOD', 'PARSAL', 'LAB WORK', 'GOODS', 'ID CARD', 'PETROL'].forEach(c => {
      if (!map.has(c)) {
        map.set(c, {
          name: c,
          count: 0,
          total: 0,
          type: ['LAB WORK', 'GOODS', 'ID CARD'].includes(c) ? 'income' : 'expense',
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [transactions]);

  // Filtered categories for chips
  const filteredCategoryChips = useMemo(() => {
    return categoryStatsList.filter(c => {
      if (filterType === 'expense' && c.type !== 'expense') return false;
      if (filterType === 'income' && c.type !== 'income') return false;
      return true;
    });
  }, [categoryStatsList, filterType]);

  // 2. Transactions Matched for the Selected Category & Filter Scope
  const activeCategoryTxs = useMemo(() => {
    const targetCat = activeCategory.trim().toUpperCase();

    return transactions.filter(t => {
      if (!t) return false;
      const tCat = (t.category || '').trim().toUpperCase();
      const tNote = (t.note || '').trim().toUpperCase();

      let matchesCategory = false;
      if (tCat === targetCat) {
        matchesCategory = true;
      } else if (targetCat === 'TEA' && (tCat.includes('TEA') || tCat.includes('CHAI') || tNote.includes('TEA') || tNote.includes('CHAI'))) {
        matchesCategory = true;
      } else if (targetCat === 'FOOD' && (tCat.includes('FOOD') || tCat.includes('LUNCH') || tCat.includes('DINNER') || tCat.includes('NASHTA'))) {
        matchesCategory = true;
      } else if (tCat.includes(targetCat) || targetCat.includes(tCat)) {
        matchesCategory = true;
      }

      if (!matchesCategory) return false;

      // Date Range
      const tDate = t.date || '';
      if (startDate && tDate < startDate) return false;
      if (endDate && tDate > endDate) return false;

      // Cashier
      if (selectedCashier !== 'all') {
        const staff = (t.staffName || 'OTHER').trim().toUpperCase();
        if (staff !== selectedCashier.toUpperCase()) return false;
      }

      // Method
      if (selectedMethod !== 'all') {
        const pMethod = (t.paymentMethod || 'cash').toString().toLowerCase();
        if (pMethod !== selectedMethod.toLowerCase()) return false;
      }

      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchNote = (t.note || '').toLowerCase().includes(q);
        const matchStaff = (t.staffName || '').toLowerCase().includes(q);
        const matchAccount = (t.paymentAccount || '').toLowerCase().includes(q);
        const matchAmt = (t.amount || 0).toString().includes(q);
        if (!matchNote && !matchStaff && !matchAccount && !matchAmt) return false;
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
  }, [activeCategory, transactions, startDate, endDate, selectedCashier, selectedMethod, searchTerm]);

  // Aggregated Metrics for Active Category
  const totalAmount = useMemo(() => {
    return activeCategoryTxs.reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [activeCategoryTxs]);

  const entryCount = activeCategoryTxs.length;
  const avgPerEntry = entryCount > 0 ? Math.round(totalAmount / entryCount) : 0;

  const distinctDaysCount = useMemo(() => {
    return new Set(activeCategoryTxs.map(t => t.date)).size || 1;
  }, [activeCategoryTxs]);

  const avgDailySpend = Math.round(totalAmount / distinctDaysCount);

  // Cashier Breakdown
  const cashierBreakdown = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    activeCategoryTxs.forEach(t => {
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
  }, [activeCategoryTxs, totalAmount]);

  // Payment Method Breakdown
  const methodBreakdown = useMemo(() => {
    const map: Record<string, number> = { cash: 0, upi: 0, rtgs: 0 };
    activeCategoryTxs.forEach(t => {
      const m = (t.paymentMethod || 'cash').toLowerCase();
      map[m] = (map[m] || 0) + (t.amount || 0);
    });
    return map;
  }, [activeCategoryTxs]);

  // Daily Spending Timeline Grouping for Bar Visualizer
  const dailySpendTimeline = useMemo(() => {
    const map: Record<string, number> = {};
    activeCategoryTxs.forEach(t => {
      const d = t.date || '';
      map[d] = (map[d] || 0) + (t.amount || 0);
    });

    const dates = Object.keys(map).sort((a, b) => a.localeCompare(b));
    const maxVal = Math.max(...Object.values(map), 1);

    return dates.map(d => ({
      date: d,
      amount: map[d],
      pct: Math.round((map[d] / maxVal) * 100),
    }));
  }, [activeCategoryTxs]);

  // Export to Excel / CSV
  const handleExport = (format: 'excel' | 'csv') => {
    if (activeCategoryTxs.length === 0) {
      showToast('No records to export', 'info');
      return;
    }

    const exportRows = activeCategoryTxs.map(tx => ({
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
    XLSX.utils.book_append_sheet(workbook, worksheet, `${activeCategory}_Data`);

    const filename = `${activeCategory}_Analytics_${startDate || 'all'}_to_${endDate || 'all'}.${format === 'excel' ? 'xlsx' : 'csv'}`;
    XLSX.writeFile(workbook, filename, { bookType: format === 'excel' ? 'xlsx' : 'csv' });
    showToast(`Exported ${filename}`, 'success');
  };

  const handleSelectCategory = (catName: string) => {
    setActiveCategory(catName);
    setSelectedAnalysisCategory(catName);
  };

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      {/* Top Header & Range Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.85rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
          background: '#ffffff',
          padding: '0.75rem 1rem',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              boxShadow: '0 4px 10px rgba(59, 130, 246, 0.3)',
            }}
          >
            📊
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Item Specific Expense & Revenue Intelligence
            </h1>
            <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              Deep-dive into recurring expenses (Tea, Food, Parsal, etc.), detect anomalies, and track cashier spend patterns
            </p>
          </div>
        </div>

        {/* Date Range Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.2rem', borderRadius: '8px', gap: '0.15rem' }}>
            {(['today', 'yesterday', '7days', 'thisMonth', 'lastMonth', 'all', 'custom'] as const).map(p => (
              <button
                key={p}
                type="button"
                className={`nav-tab-btn ${selectedPreset === p ? 'active' : ''}`}
                style={{ fontSize: '0.725rem', padding: '0.25rem 0.6rem', fontWeight: 700 }}
                onClick={() => setSelectedPreset(p)}
              >
                {p === 'today' ? 'Today' : p === 'yesterday' ? 'Yesterday' : p === '7days' ? '7 Days' : p === 'thisMonth' ? 'This Month' : p === 'lastMonth' ? 'Last Month' : p === 'all' ? 'All' : 'Custom'}
              </button>
            ))}
          </div>

          {selectedPreset === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#ffffff', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <Calendar size={13} style={{ color: '#64748b' }} />
              <input
                type="date"
                style={{ border: 'none', background: 'transparent', fontSize: '0.75rem', fontWeight: 700, outline: 'none' }}
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
              <span style={{ fontSize: '0.725rem', color: '#94a3b8' }}>to</span>
              <input
                type="date"
                style={{ border: 'none', background: 'transparent', fontSize: '0.75rem', fontWeight: 700, outline: 'none' }}
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* CATEGORY SELECTOR & QUICK ITEM CHIPS */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '0.85rem 1rem',
          marginBottom: '1rem',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#0f172a' }}>
              Select Item / Category:
            </span>
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.15rem', borderRadius: '6px', gap: '0.15rem' }}>
              {(['all', 'expense', 'income'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  className={`nav-tab-btn ${filterType === t ? 'active' : ''}`}
                  style={{ fontSize: '0.675rem', padding: '0.15rem 0.5rem', fontWeight: 700 }}
                  onClick={() => setFilterType(t)}
                >
                  {t === 'all' ? 'All Items' : t === 'expense' ? 'Expenses' : 'Revenue'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
            Active Item: <strong style={{ color: '#0f172a' }}>{activeCategory}</strong>
          </div>
        </div>

        {/* Scrollable Quick Category Chips */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', maxHeight: '110px', overflowY: 'auto', padding: '0.1rem 0' }}>
          {filteredCategoryChips.map(c => {
            const isSelected = activeCategory.toUpperCase() === c.name;
            return (
              <button
                key={c.name}
                type="button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: isSelected ? '#0f172a' : '#f8fafc',
                  color: isSelected ? '#ffffff' : '#1e293b',
                  border: isSelected ? '1.8px solid #0f172a' : '1px solid #cbd5e1',
                  borderRadius: '9999px',
                  padding: '0.3rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.2)' : 'none',
                  transition: 'all 0.12s ease',
                  transform: isSelected ? 'scale(1.02)' : 'none',
                }}
                onClick={() => handleSelectCategory(c.name)}
              >
                <span>{c.name}</span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    padding: '0.05rem 0.35rem',
                    borderRadius: '9999px',
                    background: isSelected ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                    color: isSelected ? '#ffffff' : '#475569',
                  }}
                >
                  {formatCurrency(c.total, config.currency)} ({c.count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 📊 SELECTED ITEM DEEP-DIVE INTELLIGENCE */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1.5px solid #0f172a',
          padding: '1rem 1.25rem',
          marginBottom: '1rem',
          boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
        }}
      >
        {/* Item Header Banner */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.3rem' }}>☕</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                  {activeCategory} Intelligence Breakdown
                </h2>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '4px', background: '#e2e8f0', color: '#334155' }}>
                  Scope: {selectedPreset.toUpperCase()}
                </span>
              </div>
              <p style={{ margin: '0.1rem 0 0', fontSize: '0.725rem', color: '#64748b' }}>
                Auditing all records across cashiers, dates, and payment methods
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              type="button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.3rem 0.75rem',
                borderRadius: '6px',
                background: '#0f172a',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: 800,
                cursor: 'pointer',
                border: 'none',
              }}
              onClick={() => openCounterModal('expense', null, 'ADMIN')}
            >
              <Plus size={13} />
              <span>+ Add Entry</span>
            </button>
          </div>
        </div>

        {/* 4 Metric Summary Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}
        >
          {/* 1. Total Spend */}
          <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem 0.9rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Total Spend in Range
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', margin: '0.2rem 0 0.1rem' }}>
              {formatCurrency(totalAmount, config.currency)}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
              Over {distinctDaysCount} distinct day(s)
            </div>
          </div>

          {/* 2. Frequency & Count */}
          <div style={{ background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: '10px', padding: '0.75rem 0.9rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>
              Entry Frequency
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#1e3a8a', margin: '0.2rem 0 0.1rem' }}>
              {entryCount} <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>entries</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#2563eb' }}>
              ~{(entryCount / (distinctDaysCount || 1)).toFixed(1)} times per active day
            </div>
          </div>

          {/* 3. Daily Average */}
          <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '10px', padding: '0.75rem 0.9rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
              Daily Average Spend
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#15803d', margin: '0.2rem 0 0.1rem' }}>
              {formatCurrency(avgDailySpend, config.currency)}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#16a34a' }}>
              Avg per entry: {formatCurrency(avgPerEntry, config.currency)}
            </div>
          </div>

          {/* 4. Top Cashier */}
          <div style={{ background: '#faf5ff', border: '1.5px solid #d8b4fe', borderRadius: '10px', padding: '0.75rem 0.9rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6b21a8', textTransform: 'uppercase' }}>
              Primary Spender Cashier
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#581c87', margin: '0.2rem 0 0.1rem' }}>
              {cashierBreakdown[0]?.staff || 'None'}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#7e22ce' }}>
              {cashierBreakdown[0] ? `${formatCurrency(cashierBreakdown[0].total, config.currency)} (${cashierBreakdown[0].pct}%)` : 'No data'}
            </div>
          </div>
        </div>

        {/* 2-Column Split: Left = Cashier & Method Breakdown, Right = Spending Timeline */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          {/* Left: Cashier Breakdown & Method Split */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem 1rem' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
              👥 Cashier & Counter Distribution:
            </div>
            {cashierBreakdown.length === 0 ? (
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>No cashier records found</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {cashierBreakdown.map(item => (
                  <div key={item.staff} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                    <div style={{ width: '85px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.staff}
                    </div>
                    <div style={{ flex: 1, background: '#e2e8f0', height: '12px', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${item.pct}%`,
                          background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)',
                          borderRadius: '9999px',
                        }}
                      />
                    </div>
                    <div style={{ width: '130px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>
                      <strong>{formatCurrency(item.total, config.currency)}</strong> ({item.pct}% • {item.count}x)
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Payment Method Split */}
            <div style={{ marginTop: '0.75rem', paddingTop: '0.65rem', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.725rem', fontWeight: 800, color: '#64748b' }}>Payment Mode:</span>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, background: '#ecfdf5', color: '#166534', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                  Cash: {formatCurrency(methodBreakdown.cash, config.currency)}
                </span>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, background: '#faf5ff', color: '#6b21a8', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                  UPI: {formatCurrency(methodBreakdown.upi, config.currency)}
                </span>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, background: '#eff6ff', color: '#1e40af', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                  RTGS: {formatCurrency(methodBreakdown.rtgs, config.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Daily Spend Timeline Bar Visualizer */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem 1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>
                📈 Day-by-Day Timeline Spend:
              </span>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                {dailySpendTimeline.length} active day(s)
              </span>
            </div>

            {dailySpendTimeline.length === 0 ? (
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', padding: '1rem 0', textAlign: 'center' }}>
                No daily timeline data available for this range
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '150px', overflowY: 'auto' }}>
                {dailySpendTimeline.map(item => (
                  <div key={item.date} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.725rem' }}>
                    <span style={{ width: '80px', color: '#475569', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {formatDDMMYYYY(item.date)}
                    </span>
                    <div style={{ flex: 1, background: '#e2e8f0', height: '10px', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${item.pct}%`,
                          background: item.amount > avgDailySpend * 1.5 ? '#ef4444' : '#10b981',
                          borderRadius: '9999px',
                        }}
                      />
                    </div>
                    <span style={{ width: '85px', textAlign: 'right', fontWeight: 800, color: item.amount > avgDailySpend * 1.5 ? '#dc2626' : '#0f172a' }}>
                      {formatCurrency(item.amount, config.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 📑 DETAILED TRANSACTION RECORDS TABLE */}
        <div style={{ marginTop: '1rem' }}>
          {/* Table Filter Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.55rem', flexWrap: 'wrap', gap: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>
                🕒 Transaction Ledger ({activeCategoryTxs.length})
              </span>

              {/* Cashier Filter Dropdown */}
              <select
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  outline: 'none',
                }}
                value={selectedCashier}
                onChange={e => setSelectedCashier(e.target.value)}
              >
                <option value="all">All Cashiers</option>
                {cashierBreakdown.map(c => (
                  <option key={c.staff} value={c.staff}>{c.staff}</option>
                ))}
              </select>

              {/* Payment Mode Filter */}
              <select
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  outline: 'none',
                }}
                value={selectedMethod}
                onChange={e => setSelectedMethod(e.target.value)}
              >
                <option value="all">All Modes</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="rtgs">RTGS</option>
              </select>

              {/* Search text */}
              <div style={{ position: 'relative', width: '150px' }}>
                <Search size={11} style={{ position: 'absolute', left: '7px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Filter remarks..."
                  style={{
                    width: '100%',
                    padding: '0.2rem 0.4rem 0.2rem 1.5rem',
                    fontSize: '0.72rem',
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
                  height: '24px',
                  padding: '0 0.45rem',
                  borderRadius: '6px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.675rem',
                  fontWeight: 700,
                  color: '#15803d',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                }}
                onClick={() => handleExport('excel')}
                title="Export filtered records to Excel"
              >
                <FileSpreadsheet size={12} />
                <span>Excel</span>
              </button>
              <button
                type="button"
                className="icon-btn"
                style={{
                  height: '24px',
                  padding: '0 0.45rem',
                  borderRadius: '6px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.675rem',
                  fontWeight: 700,
                  color: '#1e40af',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                }}
                onClick={() => handleExport('csv')}
                title="Export filtered records to CSV"
              >
                <FileText size={12} />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* Table list */}
          {activeCategoryTxs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>🔍</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>No {activeCategory} entries found for this filter</div>
              <div style={{ fontSize: '0.725rem', color: '#94a3b8' }}>Try changing the date range or clearing cashier filters</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '350px', overflowY: 'auto' }}>
              {activeCategoryTxs.map(tx => {
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
                    {/* Left Details */}
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
                          fontSize: '0.95rem',
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
    </div>
  );
};
