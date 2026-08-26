import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { DenominationCounts } from '../types';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Share2,
  Sparkles,
  Banknote,
  RotateCcw,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatCurrency, isRightSideEntry } from '../services/storageService';

const DENOMINATIONS = [
  { value: 500, label: '₹500 Notes', bg: '#f0fdf4', border: '#86efac', color: '#166534' },
  { value: 200, label: '₹200 Notes', bg: '#fffbeb', border: '#fde68a', color: '#b45309' },
  { value: 100, label: '₹100 Notes', bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af' },
  { value: 50, label: '₹50 Notes', bg: '#fdf2f8', border: '#fbcfe8', color: '#9d174d' },
  { value: 20, label: '₹20 Notes', bg: '#fff7ed', border: '#fed7aa', color: '#c2410c' },
  { value: 10, label: '₹10 Notes', bg: '#f8fafc', border: '#cbd5e1', color: '#334155' },
  { value: 1, label: 'Coins / Small Change', bg: '#f1f5f9', border: '#cbd5e1', color: '#475569' },
];

export const DailyClosingModal: React.FC = () => {
  const {
    isClosingModalOpen,
    closingTargetStaff,
    closeClosingModal,
    dayBalances,
    config,
    counters,
    selectedDate,
    transactions,
    addTransaction,
    updateTransaction,
    saveClosing,
    showToast,
  } = useApp();

  // Determine available counters list
  const availableCounters = [
    ...(counters || []).map(c => c.name.toUpperCase()),
    ...(config.staffMembers || []).map(s => s.toUpperCase()),
    'KRISHNA',
    'NAVIN',
    'OTHER',
  ].filter((name, idx, self) => !['ADMIN / OWNER', 'ADMIN', 'OWNER'].includes(name) && self.indexOf(name) === idx);

  const [selectedCounter, setSelectedCounter] = useState<string>('KRISHNA');

  const [denoms, setDenoms] = useState<DenominationCounts>({
    '500': 0,
    '200': 0,
    '100': 0,
    '50': 0,
    '20': 0,
    '10': 0,
    '1': 0,
  });

  const [manualCashInput, setManualCashInput] = useState<string>('');
  const [useDenominationCalculator, setUseDenominationCalculator] = useState<boolean>(true);
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [closedBy, setClosedBy] = useState<string>('Counter Staff');
  const [showSlip, setShowSlip] = useState<boolean>(false);

  // Initialize selected counter from props or defaults
  useEffect(() => {
    if (isClosingModalOpen) {
      const initialStaff = closingTargetStaff
        ? closingTargetStaff.toUpperCase()
        : (availableCounters[0] || 'KRISHNA');
      setSelectedCounter(initialStaff);
      setClosedBy(initialStaff);
      setShowSlip(false);
    }
  }, [isClosingModalOpen, closingTargetStaff, availableCounters]);

  // Calculate expected cash in drawer for the currently selected counter
  const dateTransactions = transactions.filter(t => t.date === selectedDate);
  const counterTxs = dateTransactions.filter(
    t => (t.staffName || 'OTHER').trim().toUpperCase() === selectedCounter.trim().toUpperCase()
  );

  // Incomes in Cash (excluding right-side logs)
  const cashIncomes = counterTxs
    .filter(t => t.type === 'income' && !isRightSideEntry(t) && (t.paymentMethod || 'cash').toLowerCase() === 'cash')
    .reduce((sum, t) => sum + t.amount, 0);

  // Outflows in Cash (excluding CASH IN HAND)
  const cashExpenses = counterTxs
    .filter(t => t.type === 'expense' && (t.category || '').trim().toUpperCase() !== 'CASH IN HAND' && (t.paymentMethod || 'cash').toLowerCase() === 'cash')
    .reduce((sum, t) => sum + t.amount, 0);

  const expectedCounterCash = Math.max(0, cashIncomes - cashExpenses);

  // Check if existing Cash In Hand entry already exists for this counter & date
  const existingCashInHandTx = counterTxs.find(
    t => (t.category || '').trim().toUpperCase() === 'CASH IN HAND'
  );

  // Prepopulate when counter changes or modal opens
  useEffect(() => {
    if (isClosingModalOpen) {
      if (existingCashInHandTx && existingCashInHandTx.amount > 0) {
        setManualCashInput(existingCashInHandTx.amount.toString());
        // Try parsing denomination breakdown if stored in note, or auto-fill
        let remaining = existingCashInHandTx.amount;
        const newDenoms: DenominationCounts = {};
        [500, 200, 100, 50, 20, 10].forEach(d => {
          const count = Math.floor(remaining / d);
          newDenoms[d.toString()] = count;
          remaining -= count * d;
        });
        newDenoms['1'] = remaining;
        setDenoms(newDenoms);
      } else {
        // Auto populate with expected cash initially
        let remaining = expectedCounterCash;
        const newDenoms: DenominationCounts = {};
        [500, 200, 100, 50, 20, 10].forEach(d => {
          const count = Math.floor(remaining / d);
          newDenoms[d.toString()] = count;
          remaining -= count * d;
        });
        newDenoms['1'] = remaining;
        setDenoms(newDenoms);
        setManualCashInput(expectedCounterCash.toString());
      }
    }
  }, [isClosingModalOpen, selectedCounter, expectedCounterCash, existingCashInHandTx?.id, existingCashInHandTx?.amount]);

  if (!isClosingModalOpen) return null;

  // Calculate sum of physical cash from denominations
  const denomTotal = Object.entries(denoms).reduce((sum, [valStr, count]) => {
    const val = parseInt(valStr, 10);
    return sum + val * (count || 0);
  }, 0);

  const finalActualCash = useDenominationCalculator
    ? denomTotal
    : (parseFloat(manualCashInput) || 0);

  const cashDiff = finalActualCash - expectedCounterCash;

  let status: 'balanced' | 'shortage' | 'excess' = 'balanced';
  if (cashDiff < 0) status = 'shortage';
  else if (cashDiff > 0) status = 'excess';

  const handleDenomChange = (valStr: string, countStr: string) => {
    const count = parseInt(countStr, 10) || 0;
    setDenoms(prev => ({
      ...prev,
      [valStr]: Math.max(0, count),
    }));
  };

  const handleQuickAdd = (valStr: string, amountToAdd: number) => {
    setDenoms(prev => ({
      ...prev,
      [valStr]: Math.max(0, (prev[valStr] || 0) + amountToAdd),
    }));
  };

  const handleAutoFillExpected = () => {
    let remaining = expectedCounterCash;
    const newDenoms: DenominationCounts = {};

    [500, 200, 100, 50, 20, 10].forEach(d => {
      const count = Math.floor(remaining / d);
      newDenoms[d.toString()] = count;
      remaining -= count * d;
    });
    newDenoms['1'] = remaining;

    setDenoms(newDenoms);
    setManualCashInput(expectedCounterCash.toString());
    showToast(`Auto-filled with ${formatCurrency(expectedCounterCash, config.currency)} expected cash`);
  };

  const handleClearAll = () => {
    setDenoms({
      '500': 0,
      '200': 0,
      '100': 0,
      '50': 0,
      '20': 0,
      '10': 0,
      '1': 0,
    });
    setManualCashInput('0');
  };

  const handleFinalizeClosing = () => {
    const denomSummary = useDenominationCalculator
      ? Object.entries(denoms)
          .filter(([_, count]) => (count || 0) > 0)
          .map(([val, count]) => `${val}x${count}`)
          .join(', ')
      : '';

    const noteStr = denomSummary
      ? `Cash in Hand (${denomSummary})${closingNotes ? ' • ' + closingNotes : ''}`
      : (closingNotes || 'Cash in Hand (Physical drawer count)');

    // 1. Record/Update CASH IN HAND transaction as Expense on the right side
    if (existingCashInHandTx) {
      updateTransaction({
        ...existingCashInHandTx,
        amount: finalActualCash,
        type: 'expense',
        paymentMethod: 'cash',
        category: 'CASH IN HAND',
        staffName: selectedCounter,
        note: noteStr,
        updatedAt: Date.now(),
      });
    } else if (finalActualCash >= 0) {
      addTransaction({
        businessId: config.id,
        date: selectedDate,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        type: 'expense',
        amount: finalActualCash,
        paymentMethod: 'cash',
        category: 'CASH IN HAND',
        staffName: selectedCounter,
        note: noteStr,
      });
    }

    // 2. Save Daily Closing Audit record
    saveClosing({
      businessId: config.id,
      date: selectedDate,
      openingCash: dayBalances.openingCash,
      openingOnline: dayBalances.openingOnline,
      cashIncome: cashIncomes,
      cashExpense: cashExpenses + finalActualCash,
      expectedCash: expectedCounterCash,
      onlineIncome: dayBalances.onlineIncome,
      onlineExpense: dayBalances.onlineExpense,
      expectedOnline: dayBalances.expectedOnline,
      actualCash: finalActualCash,
      actualOnline: dayBalances.expectedOnline,
      cashDifference: cashDiff,
      onlineDifference: 0,
      status,
      denominations: denoms,
      notes: closingNotes,
      closedBy: closedBy || selectedCounter,
    });

    if (status === 'balanced') {
      confetti({
        particleCount: 70,
        spread: 65,
        origin: { y: 0.6 },
      });
    }

    showToast(`✓ Day Closed: ${formatCurrency(finalActualCash, config.currency)} recorded as Cash in Hand for ${selectedCounter}`, 'success');
    setShowSlip(true);
  };

  const generateWhatsAppSummary = () => {
    const denomDetails = Object.entries(denoms)
      .filter(([_, count]) => (count || 0) > 0)
      .map(([val, count]) => `• ₹${val} × ${count} = ₹${(parseInt(val, 10) * count).toLocaleString()}`)
      .join('\n');

    const text = `📊 *DAILY COUNTER CASH CLOSING SLIP*
🏬 *${config.businessName}*
📅 *Date:* ${selectedDate}
👤 *Counter / Staff:* ${selectedCounter}
━━━━━━━━━━━━━━━━━━━━
💰 *PHYSICAL CASH IN DRAWER:*
• Cash Received: +${formatCurrency(cashIncomes, config.currency)}
• Cash Expenses: -${formatCurrency(cashExpenses, config.currency)}
👉 *Expected in Drawer:* ${formatCurrency(expectedCounterCash, config.currency)}
👉 *Actual Counted Cash:* ${formatCurrency(finalActualCash, config.currency)}
${cashDiff === 0 ? '✅ *Drawer Matched (₹0 Diff)*' : cashDiff < 0 ? `⚠️ *Cash Shortage: ${formatCurrency(cashDiff, config.currency)}*` : `🟢 *Cash Excess: +${formatCurrency(cashDiff, config.currency)}*`}

💵 *NOTE BREAKDOWN:*
${denomDetails || '• Direct Cash Entry'}

━━━━━━━━━━━━━━━━━━━━
✅ *Status:* Recorded as "Cash in Hand" (Handed over to Shop Owner)
${closingNotes ? `📝 Note: ${closingNotes}` : ''}`;

    navigator.clipboard.writeText(text);
    showToast('Closing summary copied to clipboard for WhatsApp!', 'success');
  };

  return (
    <div className="modal-overlay" onClick={closeClosingModal}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.65rem 0.85rem',
            borderBottom: '1px solid #e2e8f0',
            background: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <div style={{ padding: '0.3rem', borderRadius: '6px', background: '#eff6ff', color: '#2563eb' }}>
              <Banknote size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.15 }}>
                Cash in Hand
              </h2>
            </div>
          </div>
          <button className="icon-btn" style={{ width: '26px', height: '26px' }} onClick={closeClosingModal}>
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '0.75rem 0.85rem' }}>
          {!showSlip ? (
            <>
              {/* Counter Selection Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.45rem 0.65rem',
                  background: '#f8fafc',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '0.65rem',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155' }}>Counter:</span>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {availableCounters.map(cName => (
                      <button
                        key={cName}
                        type="button"
                        style={{
                          fontSize: '0.725rem',
                          fontWeight: 800,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '4px',
                          border: selectedCounter === cName ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                          background: selectedCounter === cName ? '#eff6ff' : '#ffffff',
                          color: selectedCounter === cName ? '#1d4ed8' : '#475569',
                          cursor: 'pointer',
                        }}
                        onClick={() => setSelectedCounter(cName)}
                      >
                        {cName}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Expected Drawer Cash Display */}
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Expected in Drawer:</span>
                  <span className="font-mono" style={{ fontSize: '1rem', fontWeight: 900, color: '#b45309' }}>
                    {formatCurrency(expectedCounterCash, config.currency)}
                  </span>
                </div>
              </div>

              {/* Denomination Note Calculator */}
              <div style={{ marginBottom: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Banknote size={14} style={{ color: '#16a34a' }} />
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      Note Count:
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.15rem' }}
                      onClick={handleAutoFillExpected}
                      title="Auto-fill note breakdown with expected amount"
                    >
                      <Sparkles size={11} /> Auto-fill
                    </button>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <button
                      type="button"
                      style={{ fontSize: '0.7rem', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}
                      onClick={handleClearAll}
                      title="Reset counts to zero"
                    >
                      <RotateCcw size={11} style={{ display: 'inline', marginRight: '0.15rem' }} /> Clear
                    </button>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <button
                      type="button"
                      style={{ fontSize: '0.7rem', color: '#475569', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
                      onClick={() => setUseDenominationCalculator(!useDenominationCalculator)}
                    >
                      {useDenominationCalculator ? 'Direct Total' : 'Note Calculator'}
                    </button>
                  </div>
                </div>

                {useDenominationCalculator ? (
                  <div>
                    {/* Denomination Grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                        gap: '0.35rem',
                        marginBottom: '0.45rem',
                      }}
                    >
                      {DENOMINATIONS.map(d => {
                        const count = denoms[d.value.toString()] || 0;
                        const subTotal = d.value * count;
                        return (
                          <div
                            key={d.value}
                            style={{
                              background: d.bg,
                              border: `1.5px solid ${count > 0 ? d.border : '#e2e8f0'}`,
                              borderRadius: '6px',
                              padding: '0.35rem 0.45rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.2rem',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.675rem', fontWeight: 800, color: d.color }}>
                              <span>{d.label}</span>
                              <span style={{ opacity: 0.6 }}>×</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <input
                                type="number"
                                min="0"
                                className="form-input font-mono"
                                style={{
                                  fontSize: '0.85rem',
                                  fontWeight: 800,
                                  padding: '0.2rem 0.35rem',
                                  textAlign: 'center',
                                  background: '#ffffff',
                                }}
                                placeholder="0"
                                value={count || ''}
                                onChange={e => handleDenomChange(d.value.toString(), e.target.value)}
                              />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', gap: '0.15rem' }}>
                                <button
                                  type="button"
                                  style={{ fontSize: '0.6rem', padding: '0.05rem 0.25rem', background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 700 }}
                                  onClick={() => handleQuickAdd(d.value.toString(), 1)}
                                >
                                  +1
                                </button>
                                <button
                                  type="button"
                                  style={{ fontSize: '0.6rem', padding: '0.05rem 0.25rem', background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 700 }}
                                  onClick={() => handleQuickAdd(d.value.toString(), 5)}
                                >
                                  +5
                                </button>
                              </div>
                              <span className="font-mono" style={{ fontSize: '0.675rem', fontWeight: 800, color: subTotal > 0 ? d.color : '#94a3b8' }}>
                                {subTotal > 0 ? formatCurrency(subTotal, config.currency) : '—'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Total Drawer Cash Bar */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.45rem 0.65rem',
                        background: '#fffbeb',
                        borderRadius: '6px',
                        border: '1.5px solid #fde68a',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                      }}
                    >
                      <span style={{ color: '#92400e' }}>Total Counted Cash:</span>
                      <span className="font-mono" style={{ fontSize: '1.15rem', color: '#b45309', fontWeight: 900 }}>
                        {formatCurrency(denomTotal, config.currency)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      type="number"
                      className="form-input font-mono"
                      style={{ fontSize: '1.2rem', fontWeight: 800, padding: '0.45rem 0.65rem' }}
                      placeholder="Enter counted cash..."
                      value={manualCashInput}
                      onChange={e => setManualCashInput(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Real-time Match Status & Difference Banner */}
              <div
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  background: status === 'balanced' ? '#f0fdf4' : status === 'shortage' ? '#fef2f2' : '#fff7ed',
                  border: `1.5px solid ${status === 'balanced' ? '#86efac' : status === 'shortage' ? '#fca5a5' : '#fed7aa'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.65rem',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  {status === 'balanced' ? (
                    <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                  ) : (
                    <AlertTriangle size={18} style={{ color: status === 'shortage' ? '#dc2626' : '#ea580c', flexShrink: 0 }} />
                  )}
                  <div>
                    <div style={{ fontSize: '0.825rem', fontWeight: 800, color: status === 'balanced' ? '#166534' : status === 'shortage' ? '#991b1b' : '#9a3412' }}>
                      {status === 'balanced'
                        ? '✓ Matched (0 Difference)'
                        : status === 'shortage'
                        ? `⚠️ Cash Shortage: ${formatCurrency(Math.abs(cashDiff), config.currency)}`
                        : `🟢 Cash Excess: +${formatCurrency(cashDiff, config.currency)}`}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, display: 'block' }}>Difference:</span>
                  <span className="font-mono" style={{ fontSize: '0.95rem', fontWeight: 900, color: status === 'balanced' ? '#16a34a' : '#dc2626' }}>
                    {cashDiff === 0 ? '₹0' : formatCurrency(cashDiff, config.currency)}
                  </span>
                </div>
              </div>

              {/* Notes & Closed By */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.45rem', marginBottom: '0.65rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.725rem', marginBottom: '0.15rem' }}>Remarks (Optional):</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '0.775rem', padding: '0.3rem 0.5rem' }}
                    placeholder="e.g. Handed over to Owner"
                    value={closingNotes}
                    onChange={e => setClosingNotes(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.725rem', marginBottom: '0.15rem' }}>Recorded By:</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '0.775rem', padding: '0.3rem 0.5rem' }}
                    value={closedBy}
                    onChange={e => setClosedBy(e.target.value)}
                  />
                </div>
              </div>

              {/* Main Finalize Action Button */}
              <button
                type="button"
                className="btn-fast-income"
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  background: '#000000',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  border: 'none',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.18)',
                }}
                onClick={handleFinalizeClosing}
              >
                <Banknote size={15} />
                <span>Save Cash in Hand ({formatCurrency(finalActualCash, config.currency)})</span>
              </button>
            </>
          ) : (
            /* Closing Slip / Receipt View */
            <div className="animate-scale-in">
              <div
                id="closing-slip"
                style={{
                  background: '#ffffff',
                  padding: '0.85rem',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '0.65rem',
                }}
              >
                <div style={{ textAlign: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>{config.businessName}</h3>
                  <p style={{ fontSize: '0.7rem', color: '#64748b' }}>Daily Physical Cash Closing Slip</p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.15rem', fontSize: '0.7rem', fontWeight: 700, color: '#475569' }}>
                    <span>Date: {selectedDate}</span>
                    <span>•</span>
                    <span>Counter: {selectedCounter}</span>
                    <span>•</span>
                    <span>By: {closedBy}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div style={{ background: '#f8fafc', padding: '0.4rem 0.5rem', borderRadius: '5px' }}>
                    <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Expected in Drawer:</div>
                    <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 800, color: '#64748b' }}>
                      {formatCurrency(expectedCounterCash, config.currency)}
                    </div>
                  </div>
                  <div style={{ background: '#fffbeb', padding: '0.4rem 0.5rem', borderRadius: '5px', border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: '0.65rem', color: '#92400e' }}>Actual Cash Count:</div>
                    <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 900, color: '#b45309' }}>
                      {formatCurrency(finalActualCash, config.currency)}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: '0.45rem 0.65rem',
                    borderRadius: '5px',
                    background: status === 'balanced' ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${status === 'balanced' ? '#bbf7d0' : '#fecaca'}`,
                    marginBottom: '0.5rem',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.8rem', color: status === 'balanced' ? '#166534' : '#991b1b' }}>
                    {status === 'balanced' ? '✓ Perfectly Balanced (₹0 Diff)' : `⚠️ Cash Difference: ${formatCurrency(cashDiff, config.currency)}`}
                  </div>
                </div>

                {/* Note Breakdown in Slip */}
                <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.35rem', marginBottom: '0.35rem', fontSize: '0.7rem' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.15rem' }}>Note Breakdown:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', color: '#475569' }}>
                    {Object.entries(denoms)
                      .filter(([_, count]) => (count || 0) > 0)
                      .map(([val, count]) => (
                        <span key={val} style={{ background: '#f1f5f9', padding: '0.1rem 0.35rem', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>
                          ₹{val} × {count} = ₹{(parseInt(val, 10) * count).toLocaleString()}
                        </span>
                      ))}
                  </div>
                </div>

                <div style={{ fontSize: '0.725rem', color: '#166534', fontWeight: 700, background: '#f0fdf4', padding: '0.3rem 0.5rem', borderRadius: '4px', marginTop: '0.35rem' }}>
                  ✓ Recorded as "CASH IN HAND" expense for {selectedCounter} (Handed to Shop Owner).
                </div>
              </div>

              {/* Share & Print Actions */}
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.3rem',
                    padding: '0.55rem',
                    background: '#25D366',
                    color: '#fff',
                    borderRadius: '5px',
                    fontWeight: 700,
                    fontSize: '0.775rem',
                    cursor: 'pointer',
                    border: 'none',
                  }}
                  onClick={generateWhatsAppSummary}
                >
                  <Share2 size={14} />
                  <span>Copy WhatsApp Slip</span>
                </button>

                <button
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.3rem',
                    padding: '0.55rem 0.75rem',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    borderRadius: '5px',
                    fontWeight: 600,
                    fontSize: '0.775rem',
                    cursor: 'pointer',
                  }}
                  onClick={() => window.print()}
                >
                  <Printer size={14} />
                  <span>Print</span>
                </button>

                <button
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.55rem 0.85rem',
                    background: '#000000',
                    color: '#fff',
                    borderRadius: '5px',
                    fontWeight: 700,
                    fontSize: '0.775rem',
                    cursor: 'pointer',
                    border: 'none',
                  }}
                  onClick={closeClosingModal}
                >
                  <Check size={14} style={{ marginRight: '0.2rem' }} />
                  <span>Done</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
