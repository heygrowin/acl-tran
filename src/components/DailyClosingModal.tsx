import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { DenominationCounts } from '../types';
import {
  X,
  Printer,
  Share2,
  Banknote,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatCurrency, isRightSideEntry } from '../services/storageService';

const DENOMINATIONS = [
  { value: 500, label: '₹500 Note', isNote: true },
  { value: 200, label: '₹200 Note', isNote: true },
  { value: 100, label: '₹100 Note', isNote: true },
  { value: 50, label: '₹50 Note', isNote: true },
  { value: 20, label: '₹20 Note', isNote: true },
  { value: 10, label: '₹10 Note / Coin', isNote: true },
  { value: 5, label: '₹5 Coin / Note', isNote: false },
  { value: 2, label: '₹2 Coin', isNote: false },
  { value: 1, label: '₹1 Coin', isNote: false },
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
    '5': 0,
    '2': 0,
    '1': 0,
  });

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

  // Helper to calculate breakdown
  const calculateBreakdown = (amount: number): DenominationCounts => {
    let remaining = Math.max(0, amount);
    const newDenoms: DenominationCounts = {};
    [500, 200, 100, 50, 20, 10, 5, 2, 1].forEach(d => {
      const count = Math.floor(remaining / d);
      newDenoms[d.toString()] = count;
      remaining -= count * d;
    });
    return newDenoms;
  };

  // Prepopulate when counter changes or modal opens
  useEffect(() => {
    if (isClosingModalOpen) {
      if (existingCashInHandTx && existingCashInHandTx.amount > 0) {
        setDenoms(calculateBreakdown(existingCashInHandTx.amount));
      } else {
        setDenoms(calculateBreakdown(expectedCounterCash));
      }
    }
  }, [isClosingModalOpen, selectedCounter, expectedCounterCash, existingCashInHandTx]);

  if (!isClosingModalOpen) return null;

  // Calculate sum of physical cash from denominations
  const denomTotal = Object.entries(denoms).reduce((sum, [valStr, count]) => {
    const val = parseInt(valStr, 10);
    return sum + val * (count || 0);
  }, 0);

  const finalActualCash = denomTotal;
  const cashDiff = finalActualCash - expectedCounterCash;

  let status: 'balanced' | 'shortage' | 'excess' = 'balanced';
  if (cashDiff < 0) status = 'shortage';
  else if (cashDiff > 0) status = 'excess';

  const handleDenomChange = (valStr: string, countStr: string) => {
    const count = parseInt(countStr, 10);
    setDenoms(prev => ({
      ...prev,
      [valStr]: isNaN(count) ? 0 : Math.max(0, count),
    }));
  };

  const handleAutoFillExpected = () => {
    setDenoms(calculateBreakdown(expectedCounterCash));
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
      '5': 0,
      '2': 0,
      '1': 0,
    });
  };

  const handleFinalizeClosing = () => {
    const denomSummary = Object.entries(denoms)
      .filter(([_, count]) => (count || 0) > 0)
      .map(([val, count]) => `${val}x${count}`)
      .join(', ');

    const noteStr = denomSummary
      ? `Cash in Hand (${denomSummary})${closingNotes ? ' • ' + closingNotes : ''}`
      : (closingNotes || 'Cash in Hand (Physical drawer count)');

    // 1. Record/Update CASH IN HAND transaction
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
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
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
              <h2 style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', margin: 0, lineHeight: 1.15 }}>
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
                  <span className="font-mono" style={{ fontSize: '0.95rem', fontWeight: 900, color: '#b45309' }}>
                    {formatCurrency(expectedCounterCash, config.currency)}
                  </span>
                </div>
              </div>

              {/* Clean 3-Column Denomination Table */}
              <div
                style={{
                  borderRadius: '8px',
                  border: '1.5px solid #e2e8f0',
                  background: '#ffffff',
                  marginBottom: '0.65rem',
                  overflow: 'hidden',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #cbd5e1', fontSize: '0.725rem', fontWeight: 800, color: '#475569' }}>
                      <th style={{ padding: '0.45rem 0.75rem' }}>Note / Coin</th>
                      <th style={{ padding: '0.45rem 0.5rem', textAlign: 'center', width: '120px' }}>Count (Pcs)</th>
                      <th style={{ padding: '0.45rem 0.75rem', textAlign: 'right' }}>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DENOMINATIONS.map((d, index) => {
                      const count = denoms[d.value.toString()] || 0;
                      const total = d.value * count;
                      return (
                        <tr
                          key={d.value}
                          style={{
                            borderBottom: index < DENOMINATIONS.length - 1 ? '1px solid #f1f5f9' : 'none',
                            background: count > 0 ? '#f0fdf4' : 'transparent',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          {/* Column 1: Note / Coin */}
                          <td style={{ padding: '0.35rem 0.75rem', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span
                                style={{
                                  fontSize: '0.85rem',
                                  fontWeight: 800,
                                  color: d.isNote ? '#166534' : '#0f172a',
                                  fontFamily: 'var(--font-mono, monospace)',
                                }}
                              >
                                ₹{d.value}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  color: d.isNote ? '#15803d' : '#64748b',
                                  background: d.isNote ? '#dcfce7' : '#f1f5f9',
                                  padding: '0.1rem 0.35rem',
                                  borderRadius: '4px',
                                }}
                              >
                                {d.isNote ? 'Note' : 'Coin'}
                              </span>
                            </div>
                          </td>

                          {/* Column 2: Count / Number Input */}
                          <td style={{ padding: '0.35rem 0.5rem', textAlign: 'center', verticalAlign: 'middle' }}>
                            <input
                              type="number"
                              min="0"
                              className="form-input font-mono"
                              style={{
                                width: '80px',
                                fontSize: '0.875rem',
                                fontWeight: 800,
                                padding: '0.2rem 0.35rem',
                                textAlign: 'center',
                                background: '#ffffff',
                                border: count > 0 ? '1.5px solid #22c55e' : '1px solid #cbd5e1',
                                borderRadius: '4px',
                                margin: '0 auto',
                                display: 'block',
                              }}
                              placeholder="0"
                              value={count === 0 ? '' : count}
                              onChange={e => handleDenomChange(d.value.toString(), e.target.value)}
                              onFocus={e => e.target.select()}
                            />
                          </td>

                          {/* Column 3: Total Amount */}
                          <td style={{ padding: '0.35rem 0.75rem', textAlign: 'right', verticalAlign: 'middle' }}>
                            <span
                              style={{
                                fontSize: '0.875rem',
                                fontWeight: 800,
                                color: total > 0 ? '#166534' : '#94a3b8',
                                fontFamily: 'var(--font-mono, monospace)',
                              }}
                            >
                              {total > 0 ? `₹${total.toLocaleString()}` : '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Total Counted Cash & Match Difference Card */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.55rem 0.85rem',
                  background: '#fffbeb',
                  borderRadius: '6px',
                  border: '1.5px solid #fde68a',
                  marginBottom: '0.65rem',
                  flexWrap: 'wrap',
                  gap: '0.4rem',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.675rem', color: '#92400e', fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>
                    Total Counted Cash:
                  </span>
                  <span className="font-mono" style={{ fontSize: '1.2rem', color: '#b45309', fontWeight: 900 }}>
                    {formatCurrency(finalActualCash, config.currency)}
                  </span>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.675rem', color: '#64748b', fontWeight: 700, display: 'block' }}>
                    Status / Difference:
                  </span>
                  <span
                    className="font-mono"
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 900,
                      color: status === 'balanced' ? '#16a34a' : status === 'shortage' ? '#dc2626' : '#ea580c',
                    }}
                  >
                    {status === 'balanced'
                      ? '✓ Matched (₹0 Diff)'
                      : status === 'shortage'
                      ? `⚠️ Short: -₹${Math.abs(cashDiff).toLocaleString()}`
                      : `🟢 Excess: +₹${cashDiff.toLocaleString()}`}
                  </span>
                </div>
              </div>

              {/* Optional Remarks */}
              <div style={{ marginBottom: '0.65rem' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: '0.775rem', padding: '0.3rem 0.55rem', borderRadius: '5px' }}
                  placeholder="Optional remarks (e.g. Handed over to Owner)..."
                  value={closingNotes}
                  onChange={e => setClosingNotes(e.target.value)}
                />
              </div>

              {/* Action Buttons: Clear, Auto-fill, Save */}
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <button
                  type="button"
                  style={{
                    padding: '0.55rem 0.75rem',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    borderRadius: '5px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                  onClick={handleClearAll}
                  title="Reset all counts to 0"
                >
                  Clear All
                </button>

                <button
                  type="button"
                  style={{
                    padding: '0.55rem 0.75rem',
                    background: '#eff6ff',
                    border: '1.5px solid #bfdbfe',
                    color: '#1d4ed8',
                    borderRadius: '5px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                  onClick={handleAutoFillExpected}
                  title="Auto-fill with expected cash"
                >
                  Auto-Fill Expected
                </button>

                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '0.65rem 0.85rem',
                    background: '#000000',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    border: 'none',
                    boxShadow: '0 3px 8px rgba(0,0,0,0.2)',
                  }}
                  onClick={handleFinalizeClosing}
                >
                  <Banknote size={15} />
                  <span>Save Cash in Hand ({formatCurrency(finalActualCash, config.currency)})</span>
                </button>
              </div>
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
                  <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.15rem 0' }}>{config.businessName}</h3>
                  <p style={{ fontSize: '0.7rem', color: '#64748b', margin: 0 }}>Daily Physical Cash Closing Slip</p>
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
