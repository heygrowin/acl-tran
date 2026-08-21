import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { DenominationCounts } from '../types';
import { ExcelReconciler } from './ExcelReconciler';
import {
  X,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Share2,
  Users
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatCurrency } from '../services/storageService';

const DENOMINATIONS = [
  { value: 500, label: '₹500 Notes' },
  { value: 200, label: '₹200 Notes' },
  { value: 100, label: '₹100 Notes' },
  { value: 50, label: '₹50 Notes' },
  { value: 20, label: '₹20 Notes' },
  { value: 10, label: '₹10 Notes' },
  { value: 1, label: 'Coins / Small Change' },
];

export const DailyClosingModal: React.FC = () => {
  const {
    isClosingModalOpen,
    closeClosingModal,
    dayBalances,
    config,
    selectedDate,
    saveClosing,
    showToast,
  } = useApp();

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

  const [actualOnline, setActualOnline] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [closedBy, setClosedBy] = useState<string>(config.activeStaffName || 'Counter Staff');
  const [showSlip, setShowSlip] = useState<boolean>(false);

  // Load existing closing if day already closed
  useEffect(() => {
    if (dayBalances.closing) {
      setActualOnline(dayBalances.closing.actualOnline.toString());
      setManualCashInput(dayBalances.closing.actualCash.toString());
      setClosingNotes(dayBalances.closing.notes || '');
      setClosedBy(dayBalances.closing.closedBy);
      if (dayBalances.closing.denominations) {
        setDenoms(dayBalances.closing.denominations);
      }
    } else {
      setActualOnline(dayBalances.expectedOnline.toString());
    }
  }, [dayBalances, isClosingModalOpen]);

  if (!isClosingModalOpen) return null;

  // Calculate sum of physical cash from denominations
  const denomTotal = Object.entries(denoms).reduce((sum, [valStr, count]) => {
    const val = parseInt(valStr, 10);
    return sum + val * (count || 0);
  }, 0);

  const finalActualCash = useDenominationCalculator
    ? denomTotal
    : (parseFloat(manualCashInput) || 0);

  const finalActualOnline = parseFloat(actualOnline) || 0;

  const cashDiff = finalActualCash - dayBalances.expectedCash;
  const onlineDiff = finalActualOnline - dayBalances.expectedOnline;
  const totalDiff = cashDiff + onlineDiff;

  let status: 'balanced' | 'shortage' | 'excess' = 'balanced';
  if (totalDiff < 0) status = 'shortage';
  else if (totalDiff > 0) status = 'excess';

  const handleDenomChange = (valStr: string, countStr: string) => {
    const count = parseInt(countStr, 10) || 0;
    setDenoms(prev => ({
      ...prev,
      [valStr]: Math.max(0, count),
    }));
  };

  const handleAutoFillExpected = () => {
    let remaining = dayBalances.expectedCash;
    const newDenoms: DenominationCounts = {};

    [500, 200, 100, 50, 20, 10].forEach(d => {
      const count = Math.floor(remaining / d);
      newDenoms[d.toString()] = count;
      remaining -= count * d;
    });
    newDenoms['1'] = remaining;

    setDenoms(newDenoms);
    setActualOnline(dayBalances.expectedOnline.toString());
    showToast('Auto-filled with expected count');
  };

  const handleFinalizeClosing = () => {
    saveClosing({
      businessId: config.id,
      date: selectedDate,
      openingCash: dayBalances.openingCash,
      openingOnline: dayBalances.openingOnline,
      cashIncome: dayBalances.cashIncome,
      cashExpense: dayBalances.cashExpense,
      expectedCash: dayBalances.expectedCash,
      onlineIncome: dayBalances.onlineIncome,
      onlineExpense: dayBalances.onlineExpense,
      expectedOnline: dayBalances.expectedOnline,
      actualCash: finalActualCash,
      actualOnline: finalActualOnline,
      cashDifference: cashDiff,
      onlineDifference: onlineDiff,
      status,
      denominations: denoms,
      cashierSummaries: dayBalances.cashierSummaries,
      notes: closingNotes,
      closedBy,
    });

    if (status === 'balanced') {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }

    setShowSlip(true);
  };

  const cashierList = dayBalances.cashierSummaries || [];

  const generateWhatsAppSummary = () => {
    let cashierText = '';
    if (cashierList.length > 0) {
      cashierText = '\n👥 *CASHIER BREAKDOWN:*\n' + cashierList.map(c => 
        `• *${c.staffName}*: In: +${formatCurrency(c.income, config.currency)} | Out: -${formatCurrency(c.expense, config.currency)} (${c.transactionCount} txns)`
      ).join('\n') + '\n';
    }

    const text = `📊 *DAILY COUNTER CLOSING SLIP*
🏬 *${config.businessName}*
📅 *Date:* ${selectedDate}
👤 *Closed By:* ${closedBy}

━━━━━━━━━━━━━━━━━━━━
💰 *CASH IN DRAWER:*
• Opening: ${formatCurrency(dayBalances.openingCash, config.currency)}
• Income: +${formatCurrency(dayBalances.cashIncome, config.currency)}
• Expenses: -${formatCurrency(dayBalances.cashExpense, config.currency)}
👉 *Expected Cash:* ${formatCurrency(dayBalances.expectedCash, config.currency)}
👉 *Actual Cash Count:* ${formatCurrency(finalActualCash, config.currency)}
${cashDiff === 0 ? '✅ *Cash Matched*' : cashDiff < 0 ? `⚠️ *Cash Shortage: ${formatCurrency(cashDiff, config.currency)}*` : `🟢 *Cash Excess: +${formatCurrency(cashDiff, config.currency)}*`}

━━━━━━━━━━━━━━━━━━━━
🌐 *ONLINE / BANK:*
• Expected: ${formatCurrency(dayBalances.expectedOnline, config.currency)}
• Actual: ${formatCurrency(finalActualOnline, config.currency)}
${onlineDiff === 0 ? '✅ *Online Matched*' : `⚠️ *Diff: ${formatCurrency(onlineDiff, config.currency)}*`}

━━━━━━━━━━━━━━━━━━━━
📈 *TOTAL BUSINESS TODAY:*
• Total Income: ${formatCurrency(dayBalances.totalIncome, config.currency)}
• Total Expenses: ${formatCurrency(dayBalances.totalExpense, config.currency)}
• Net Cashflow: ${formatCurrency(dayBalances.netFlow, config.currency)}
${cashierText}
${closingNotes ? `📝 Note: ${closingNotes}` : ''}`;

    navigator.clipboard.writeText(text);
    showToast('Closing Summary copied to clipboard for WhatsApp!', 'success');
  };

  return (
    <div className="modal-overlay" onClick={closeClosingModal}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ padding: '0.25rem', borderRadius: '5px', background: '#eff6ff', color: '#2563eb' }}>
              <Lock size={16} />
            </div>
            <div>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.15 }}>
                End-of-Day Closing & Cash Verification
              </h2>
              <p style={{ fontSize: '0.7rem', color: '#64748b' }}>
                Verify drawer cash & online bank balance for {selectedDate}
              </p>
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
              {/* Top Quick Reconcile Preview */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.45rem',
                  padding: '0.55rem 0.75rem',
                  background: '#f8fafc',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '0.65rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.675rem', color: '#64748b' }}>Expected Cash:</div>
                  <div className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#d97706' }}>
                    {formatCurrency(dayBalances.expectedCash, config.currency)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.675rem', color: '#64748b' }}>Expected Online:</div>
                  <div className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2563eb' }}>
                    {formatCurrency(dayBalances.expectedOnline, config.currency)}
                  </div>
                </div>
              </div>

              {/* Multi-Cashier Breakdown Section */}
              {cashierList.length > 0 && (
                <div style={{ marginBottom: '0.65rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', padding: '0.55rem 0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700, fontSize: '0.75rem', color: '#0f172a', marginBottom: '0.35rem' }}>
                    <Users size={13} style={{ color: '#2563eb' }} />
                    <span>Cashier Breakdown ({cashierList.length}):</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {cashierList.map(c => (
                      <div
                        key={c.staffName}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#ffffff',
                          padding: '0.35rem 0.55rem',
                          borderRadius: '5px',
                          border: '1px solid #e2e8f0',
                          fontSize: '0.725rem',
                        }}
                      >
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          👤 {c.staffName}
                          <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 400, marginLeft: '0.3rem' }}>
                            ({c.transactionCount} entries)
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                          <span style={{ color: '#16a34a', fontWeight: 700 }}>
                            +{formatCurrency(c.income, config.currency)}
                          </span>
                          <span style={{ color: '#dc2626', fontWeight: 700 }}>
                            −{formatCurrency(c.expense, config.currency)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 1: Physical Cash Count */}
              <div style={{ marginBottom: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: 0 }}>
                    💵 Physical Cash Count in Drawer:
                  </label>
                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      style={{ fontSize: '0.7rem', color: '#2563eb', textDecoration: 'underline', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                      onClick={handleAutoFillExpected}
                    >
                      Auto-fill
                    </button>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <button
                      type="button"
                      style={{ fontSize: '0.7rem', color: '#64748b', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
                      onClick={() => setUseDenominationCalculator(!useDenominationCalculator)}
                    >
                      {useDenominationCalculator ? 'Simple Total' : 'Note Calculator'}
                    </button>
                  </div>
                </div>

                {useDenominationCalculator ? (
                  <div>
                    <div className="denom-grid" style={{ gap: '0.35rem', marginBottom: '0.35rem' }}>
                      {DENOMINATIONS.map(d => {
                        const count = denoms[d.value.toString()] || 0;
                        const subTotal = d.value * count;
                        return (
                          <div key={d.value} className="denom-box" style={{ padding: '0.35rem' }}>
                            <div className="denom-label-row" style={{ fontSize: '0.7rem' }}>
                              <span>{d.label}</span>
                              <span style={{ opacity: 0.6 }}>×</span>
                            </div>
                            <div className="denom-input-row">
                              <input
                                type="number"
                                min="0"
                                className="denom-input"
                                style={{ fontSize: '0.8rem', padding: '0.2rem' }}
                                placeholder="0"
                                value={count || ''}
                                onChange={e => handleDenomChange(d.value.toString(), e.target.value)}
                              />
                            </div>
                            <div className="denom-total-sub font-mono" style={{ fontSize: '0.675rem' }}>
                              {subTotal > 0 ? formatCurrency(subTotal, config.currency) : '—'}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.45rem 0.65rem',
                        background: '#fffbeb',
                        borderRadius: '5px',
                        border: '1px solid #fde68a',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                      }}
                    >
                      <span>Physical Cash Total:</span>
                      <span className="font-mono" style={{ fontSize: '1.05rem', color: '#d97706', fontWeight: 800 }}>
                        {formatCurrency(denomTotal, config.currency)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      type="number"
                      className="form-input font-mono"
                      style={{ fontSize: '1.15rem', fontWeight: 800, padding: '0.45rem 0.65rem' }}
                      placeholder="Enter counted physical cash..."
                      value={manualCashInput}
                      onChange={e => setManualCashInput(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Step 2: Online Bank Statement Balance & Excel Auto-Reconcile */}
              <div style={{ marginBottom: '0.65rem' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.3rem' }}>
                  📱 Online / UPI Statement Total ({selectedDate}):
                </label>

                <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.45rem' }}>
                  <input
                    type="number"
                    step="any"
                    className="form-input font-mono"
                    style={{ fontSize: '1rem', fontWeight: 800, flex: 1, padding: '0.35rem 0.55rem' }}
                    placeholder="Enter or upload statement..."
                    value={actualOnline}
                    onChange={e => setActualOnline(e.target.value)}
                  />
                  {actualOnline && (
                    <button
                      type="button"
                      style={{ fontSize: '0.7rem', color: '#64748b', padding: '0 0.4rem', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
                      onClick={() => setActualOnline('')}
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Excel Reconciler & Verifier Box */}
                <div style={{ background: '#f8fafc', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <ExcelReconciler
                    onVerifiedAmount={amt => {
                      setActualOnline(amt.toString());
                    }}
                  />
                </div>
              </div>

              {/* Step 3: Comparison & Match Status */}
              <div style={{ marginBottom: '0.65rem' }}>
                <table className="reconcile-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.775rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '0.35rem 0.55rem', borderBottom: '1px solid #e2e8f0' }}>Account</th>
                      <th style={{ textAlign: 'right', padding: '0.35rem 0.55rem', borderBottom: '1px solid #e2e8f0' }}>Expected</th>
                      <th style={{ textAlign: 'right', padding: '0.35rem 0.55rem', borderBottom: '1px solid #e2e8f0' }}>Actual Count</th>
                      <th style={{ textAlign: 'right', padding: '0.35rem 0.55rem', borderBottom: '1px solid #e2e8f0' }}>Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '0.35rem 0.55rem', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>💵 Cash Drawer</td>
                      <td style={{ textAlign: 'right', padding: '0.35rem 0.55rem', borderBottom: '1px solid #e2e8f0' }} className="font-mono">{formatCurrency(dayBalances.expectedCash, config.currency)}</td>
                      <td style={{ textAlign: 'right', padding: '0.35rem 0.55rem', borderBottom: '1px solid #e2e8f0' }} className="font-mono">{formatCurrency(finalActualCash, config.currency)}</td>
                      <td
                        style={{
                          textAlign: 'right',
                          padding: '0.35rem 0.55rem',
                          borderBottom: '1px solid #e2e8f0',
                          fontWeight: 800,
                          color: cashDiff === 0 ? '#16a34a' : '#dc2626',
                        }}
                        className="font-mono"
                      >
                        {cashDiff === 0 ? '₹0 (✓ Matched)' : formatCurrency(cashDiff, config.currency)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.35rem 0.55rem', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>📱 Online / Bank</td>
                      <td style={{ textAlign: 'right', padding: '0.35rem 0.55rem', borderBottom: '1px solid #e2e8f0' }} className="font-mono">{formatCurrency(dayBalances.expectedOnline, config.currency)}</td>
                      <td style={{ textAlign: 'right', padding: '0.35rem 0.55rem', borderBottom: '1px solid #e2e8f0' }} className="font-mono">{formatCurrency(finalActualOnline, config.currency)}</td>
                      <td
                        style={{
                          textAlign: 'right',
                          padding: '0.35rem 0.55rem',
                          borderBottom: '1px solid #e2e8f0',
                          fontWeight: 800,
                          color: onlineDiff === 0 ? '#16a34a' : '#dc2626',
                        }}
                        className="font-mono"
                      >
                        {onlineDiff === 0 ? '₹0 (✓ Matched)' : formatCurrency(onlineDiff, config.currency)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Match Status Banner */}
                <div
                  style={{
                    padding: '0.55rem 0.75rem',
                    borderRadius: '6px',
                    background: status === 'balanced' ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${status === 'balanced' ? '#bbf7d0' : '#fecaca'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    marginTop: '0.35rem',
                  }}
                >
                  {status === 'balanced' ? (
                    <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                  ) : (
                    <AlertTriangle size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
                  )}
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: status === 'balanced' ? '#166534' : '#991b1b' }}>
                      {status === 'balanced'
                        ? '✓ Register Matched Perfectly!'
                        : status === 'shortage'
                        ? `⚠️ Shortage: ${formatCurrency(Math.abs(cashDiff), config.currency)}`
                        : `🟢 Cash Excess: +${formatCurrency(cashDiff, config.currency)}`}
                    </div>
                    <div style={{ fontSize: '0.675rem', color: '#64748b' }}>
                      {status === 'balanced'
                        ? 'Zero mismatch found. All cash & online balances match.'
                        : 'Mismatch will be recorded in closing audit slip.'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4: Notes & Staff */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.45rem', marginBottom: '0.65rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.725rem', marginBottom: '0.15rem' }}>Closing Notes:</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '0.775rem', padding: '0.3rem 0.5rem' }}
                    placeholder="e.g. ₹50 loose coins in drawer"
                    value={closingNotes}
                    onChange={e => setClosingNotes(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.725rem', marginBottom: '0.15rem' }}>Closed By:</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '0.775rem', padding: '0.3rem 0.5rem' }}
                    value={closedBy}
                    onChange={e => setClosedBy(e.target.value)}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <button
                type="button"
                className="btn-fast-income"
                style={{ width: '100%', padding: '0.65rem', background: '#2563eb', fontSize: '0.85rem', boxShadow: 'none' }}
                onClick={handleFinalizeClosing}
              >
                <Lock size={15} />
                <span>Lock & Finalize Day Closing</span>
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
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{config.businessName}</h3>
                  <p style={{ fontSize: '0.7rem', color: '#64748b' }}>Daily Counter Closing Slip</p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.15rem', fontSize: '0.7rem', fontWeight: 600, color: '#475569' }}>
                    <span>Date: {selectedDate}</span>
                    <span>•</span>
                    <span>By: {closedBy}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Actual Physical Cash:</div>
                    <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 800, color: '#d97706' }}>
                      {formatCurrency(finalActualCash, config.currency)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Actual Online/Bank:</div>
                    <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 800, color: '#2563eb' }}>
                      {formatCurrency(finalActualOnline, config.currency)}
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
                    {status === 'balanced' ? '✓ Perfectly Balanced (₹0 diff)' : `⚠️ Cash Shortage: ${formatCurrency(cashDiff, config.currency)}`}
                  </div>
                </div>

                {/* Cashier breakdown in slip */}
                {cashierList.length > 0 && (
                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.35rem', marginBottom: '0.35rem', fontSize: '0.7rem' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.15rem' }}>Cashiers:</div>
                    {cashierList.map(c => (
                      <div key={c.staffName} style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                        <span>👤 {c.staffName} ({c.transactionCount} txns):</span>
                        <span className="font-mono">+{formatCurrency(c.income, config.currency)} / -{formatCurrency(c.expense, config.currency)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.15rem', borderTop: '1px dashed #cbd5e1', paddingTop: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Income Today:</span>
                    <span className="font-mono" style={{ fontWeight: 700, color: '#16a34a' }}>+{formatCurrency(dayBalances.totalIncome, config.currency)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Expense Today:</span>
                    <span className="font-mono" style={{ fontWeight: 700, color: '#dc2626' }}>−{formatCurrency(dayBalances.totalExpense, config.currency)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                    <span>Net Movement:</span>
                    <span className="font-mono">{formatCurrency(dayBalances.netFlow, config.currency)}</span>
                  </div>
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
                    background: '#2563eb',
                    color: '#fff',
                    borderRadius: '5px',
                    fontWeight: 700,
                    fontSize: '0.775rem',
                    cursor: 'pointer',
                    border: 'none',
                  }}
                  onClick={closeClosingModal}
                >
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
