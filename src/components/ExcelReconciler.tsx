import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  parseStatementBuffer,
  reconcileDayTransactions,
  type ParsedStatementReport,
  type ReconciliationComparison
} from '../services/excelReconcilerService';
import { formatCurrency } from '../services/storageService';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Search,
  PlusCircle,
  FileCheck,
  Globe
} from 'lucide-react';

interface ExcelReconcilerProps {
  onVerifiedAmount?: (amount: number) => void;
  inlineMode?: boolean;
}

export const ExcelReconciler: React.FC<ExcelReconcilerProps> = ({
  onVerifiedAmount,
}) => {
  const { transactions, selectedDate, setSelectedDate, addTransaction, showToast, config } = useApp();

  const [statementReport, setStatementReport] = useState<ParsedStatementReport | null>(null);
  const [activeDate, setActiveDate] = useState<string>(selectedDate);
  const [comparison, setComparison] = useState<ReconciliationComparison | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'matched' | 'missing' | 'extra'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Sync activeDate with selectedDate if statement not loaded
  useEffect(() => {
    if (!statementReport) {
      setActiveDate(selectedDate);
    }
  }, [selectedDate, statementReport]);

  // Recalculate comparison when report, date, or transactions change
  useEffect(() => {
    if (statementReport) {
      const comp = reconcileDayTransactions(activeDate, statementReport, transactions);
      setComparison(comp);
    } else {
      setComparison(null);
    }
  }, [statementReport, activeDate, transactions]);

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    try {
      setIsLoading(true);
      const buffer = await file.arrayBuffer();
      const report = parseStatementBuffer(buffer, file.name);
      setStatementReport(report);

      // Auto-switch date if selectedDate is not in statement
      if (report.datesAvailable.length > 0) {
        if (!report.datesAvailable.includes(activeDate)) {
          const firstDate = report.datesAvailable[0];
          setActiveDate(firstDate);
          setSelectedDate(firstDate);
        }
      }
      showToast(`Loaded ${report.totalTransactions} transactions from ${file.name}`);
    } catch (e) {
      console.error('Error parsing excel file', e);
      alert('Could not parse Excel statement. Please ensure it is a valid .xlsx, .xls, or .csv file.');
    } finally {
      setIsLoading(false);
    }
  };

  // 1-Click Load Sample Report from public folder
  const handleLoadSample = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/Transaction_report_from0107_to3107_000737.xlsx');
      const buffer = await response.arrayBuffer();
      const report = parseStatementBuffer(buffer, 'Transaction_report_July2026.xlsx');
      setStatementReport(report);

      if (report.datesAvailable.length > 0) {
        const firstDate = report.datesAvailable[0]; // e.g. 2026-07-31
        setActiveDate(firstDate);
        setSelectedDate(firstDate);
      }
      showToast(`Loaded sample report with ${report.totalTransactions} transactions!`);
    } catch (e) {
      console.error('Failed to load sample report', e);
      alert('Could not load sample file.');
    } finally {
      setIsLoading(false);
    }
  };

  // Import missing transactions from statement into App Transaction Register
  const handleImportMissing = () => {
    if (!comparison || comparison.missingInApp.length === 0) return;

    const count = comparison.missingInApp.length;
    if (confirm(`Import ${count} missing UPI transactions (Total: ${formatCurrency(comparison.missingInApp.reduce((s, t) => s + t.amount, 0), config.currency)}) into the transaction register?`)) {
      comparison.missingInApp.forEach(sTx => {
        addTransaction({
          businessId: config.id,
          date: sTx.date,
          time: sTx.time,
          type: 'income',
          amount: sTx.amount,
          paymentMethod: 'upi',
          category: 'UPI Order / Sale',
          note: sTx.customerUpiId ? `UPI: ${sTx.customerUpiId} (RRN: ${sTx.rrn || ''})` : `Bank Statement Import (RRN: ${sTx.rrn || ''})`,
          staffName: 'UPI Auto-Reconcile',
        });
      });
      showToast(`Imported ${count} transactions into register!`);
    }
  };

  const handleApplyVerifiedAmount = () => {
    if (comparison && onVerifiedAmount) {
      onVerifiedAmount(comparison.statementOnlineAmount);
      showToast(`Applied ${formatCurrency(comparison.statementOnlineAmount, config.currency)} to Day Closing!`);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Upload Box / Header */}
      {!statementReport ? (
        <div
          className="card"
          style={{
            padding: '2rem 1.5rem',
            textAlign: 'center',
            background: '#ffffff',
            border: '2px dashed #bfdbfe',
            borderRadius: '10px',
            marginBottom: '1rem',
          }}
        >
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '12px',
              background: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto',
            }}
          >
            <FileSpreadsheet size={28} />
          </div>

          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
            Upload Bank / UPI Statement Excel File
          </h3>
          <p style={{ fontSize: '0.825rem', color: '#64748b', maxWidth: '480px', margin: '0 auto 1.25rem auto' }}>
            Upload your daily POS / Mintoak, PhonePe, Paytm, or Bank Excel (.xlsx, .xls, .csv) report to automatically match and reconcile your online cash.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.65rem 1.25rem',
                background: '#2563eb',
                color: '#ffffff',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              <Upload size={16} />
              <span>{isLoading ? 'Parsing Statement...' : 'Choose Statement File (.xlsx / .csv)'}</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                disabled={isLoading}
                onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              />
            </label>

            <button
              type="button"
              disabled={isLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.65rem 1.25rem',
                background: '#f8fafc',
                border: '1.5px solid #cbd5e1',
                color: '#0f172a',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
              }}
              onClick={handleLoadSample}
            >
              <Sparkles size={16} style={{ color: '#d97706' }} />
              <span>{isLoading ? 'Loading...' : 'Load Sample Report (July 2026)'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Statement Loaded - Reconciler Dashboard */
        <div>
          {/* Top Bar with File Details & Date Selector */}
          <div
            className="card"
            style={{
              padding: '0.75rem 1rem',
              marginBottom: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.6rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileCheck size={20} style={{ color: '#16a34a' }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
                  {statementReport.fileName}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  {statementReport.detectedFormat} • {statementReport.totalTransactions} total entries
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {/* Date Selector from Statement */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>Verify Date:</span>
                <select
                  className="form-input"
                  style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', borderRadius: '6px', fontWeight: 700, width: 'auto' }}
                  value={activeDate}
                  onChange={e => {
                    setActiveDate(e.target.value);
                    setSelectedDate(e.target.value);
                  }}
                >
                  {statementReport.datesAvailable.map(d => (
                    <option key={d} value={d}>
                      {d} ({statementReport.daysMap[d]?.totalSuccessCreditCount || 0} txns - {formatCurrency(statementReport.daysMap[d]?.totalSuccessCreditAmount || 0, config.currency)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Upload another file */}
              <label
                style={{
                  fontSize: '0.75rem',
                  padding: '0.3rem 0.65rem',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  color: '#475569',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Change File
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  style={{ display: 'none' }}
                  onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                />
              </label>
            </div>
          </div>

          {/* Comparison Cards Grid */}
          {comparison && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '0.65rem',
                marginBottom: '0.85rem',
              }}
            >
              {/* 1. Statement Online Total */}
              <div
                className="card"
                style={{
                  background: '#ffffff',
                  borderLeft: '4px solid #2563eb',
                  padding: '0.85rem 1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                  <span>Bank Statement (Excel)</span>
                  <FileSpreadsheet size={15} style={{ color: '#2563eb' }} />
                </div>
                <div className="font-mono" style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1d4ed8', margin: '0.15rem 0' }}>
                  {formatCurrency(comparison.statementOnlineAmount, config.currency)}
                </div>
                <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                  {comparison.statementOnlineCount} successful UPI payments
                </div>
              </div>

              {/* 2. App Recorded Online Total */}
              <div
                className="card"
                style={{
                  background: '#ffffff',
                  borderLeft: '4px solid #7c3aed',
                  padding: '0.85rem 1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                  <span>App Counter Register</span>
                  <Globe size={15} style={{ color: '#7c3aed' }} />
                </div>
                <div className="font-mono" style={{ fontSize: '1.45rem', fontWeight: 800, color: '#6d28d9', margin: '0.15rem 0' }}>
                  {formatCurrency(comparison.appOnlineAmount, config.currency)}
                </div>
                <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                  {comparison.appOnlineCount} entries in register
                </div>
              </div>

              {/* 3. Match Status */}
              <div
                className="card"
                style={{
                  background: comparison.isMatched ? '#f0fdf4' : '#fef2f2',
                  border: `1.5px solid ${comparison.isMatched ? '#bbf7d0' : '#fecaca'}`,
                  borderLeft: `4px solid ${comparison.isMatched ? '#16a34a' : '#dc2626'}`,
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700 }}>
                    <span>Reconciliation Status</span>
                    {comparison.isMatched ? <CheckCircle2 size={16} style={{ color: '#16a34a' }} /> : <AlertTriangle size={16} style={{ color: '#dc2626' }} />}
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: comparison.isMatched ? '#166534' : '#991b1b', margin: '0.15rem 0' }}>
                    {comparison.isMatched
                      ? '✓ 100% Online Matched'
                      : `Diff: ${formatCurrency(Math.abs(comparison.amountDifference), config.currency)}`}
                  </div>
                </div>

                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  {comparison.isMatched
                    ? 'All bank & counter transactions align'
                    : `${comparison.missingInApp.length} missing in app, ${comparison.extraInApp.length} extra`}
                </div>
              </div>
            </div>
          )}

          {/* Action Row */}
          {comparison && (
            <div
              style={{
                display: 'flex',
                gap: '0.6rem',
                marginBottom: '1rem',
                flexWrap: 'wrap',
              }}
            >
              {onVerifiedAmount && (
                <button
                  type="button"
                  className="btn-fast-income"
                  style={{ padding: '0.65rem 1.25rem', fontSize: '0.825rem', background: '#2563eb', boxShadow: 'none' }}
                  onClick={handleApplyVerifiedAmount}
                >
                  <CheckCircle2 size={15} />
                  <span>Apply Statement Total ({formatCurrency(comparison.statementOnlineAmount, config.currency)}) to Day Closing</span>
                </button>
              )}

              {comparison.missingInApp.length > 0 && (
                <button
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.65rem 1.25rem',
                    background: '#16a34a',
                    color: '#ffffff',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.825rem',
                    cursor: 'pointer',
                  }}
                  onClick={handleImportMissing}
                >
                  <PlusCircle size={15} />
                  <span>Import {comparison.missingInApp.length} Missing Transactions into Register</span>
                </button>
              )}
            </div>
          )}

          {/* Transaction List with Filter & Search */}
          {comparison && (
            <div className="card" style={{ padding: '0.85rem 1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                {/* Filter Tabs */}
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.15rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <button
                    type="button"
                    className={`nav-tab-btn ${filterTab === 'all' ? 'active' : ''}`}
                    style={{ fontSize: '0.725rem', padding: '0.25rem 0.55rem' }}
                    onClick={() => setFilterTab('all')}
                  >
                    All ({comparison.statementTransactions.length})
                  </button>
                  <button
                    type="button"
                    className={`nav-tab-btn ${filterTab === 'matched' ? 'active' : ''}`}
                    style={{ fontSize: '0.725rem', padding: '0.25rem 0.55rem' }}
                    onClick={() => setFilterTab('matched')}
                  >
                    ✓ Matched ({comparison.matchedItems.filter(i => i.appTx).length})
                  </button>
                  <button
                    type="button"
                    className={`nav-tab-btn ${filterTab === 'missing' ? 'active' : ''}`}
                    style={{ fontSize: '0.725rem', padding: '0.25rem 0.55rem' }}
                    onClick={() => setFilterTab('missing')}
                  >
                    ⚠️ Missing in App ({comparison.missingInApp.length})
                  </button>
                </div>

                {/* Search */}
                <div style={{ position: 'relative', width: '220px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '1.8rem', fontSize: '0.75rem', padding: '0.3rem 0.5rem 0.3rem 1.8rem' }}
                    placeholder="Search UPI ID, RRN, Amount..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Transactions Table */}
              <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                <table className="tx-table" style={{ width: '100%', fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Payer UPI ID / Mobile</th>
                      <th>RRN / Ref</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th style={{ textAlign: 'center' }}>App Match</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.matchedItems
                      .filter(item => {
                        if (filterTab === 'matched' && !item.appTx) return false;
                        if (filterTab === 'missing' && item.appTx) return false;
                        if (searchQuery.trim()) {
                          const q = searchQuery.toLowerCase();
                          const s = item.statementTx;
                          const matchUpi = s.customerUpiId?.toLowerCase().includes(q);
                          const matchRrn = s.rrn?.toLowerCase().includes(q);
                          const matchAmt = s.amount.toString().includes(q);
                          return matchUpi || matchRrn || matchAmt;
                        }
                        return true;
                      })
                      .map((item, idx) => {
                        const s = item.statementTx;
                        const isMatched = !!item.appTx;

                        return (
                          <tr key={s.id || idx} style={{ background: isMatched ? '#ffffff' : '#fffbeb' }}>
                            <td>
                              <div style={{ fontWeight: 700 }}>{s.time}</div>
                              <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{s.date}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>
                                {s.customerUpiId || s.customerPhone || 'UPI Customer'}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                                {s.rrn || '—'}
                              </div>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <span className="font-mono" style={{ fontWeight: 800, color: '#16a34a' }}>
                                +{formatCurrency(s.amount, config.currency)}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {isMatched ? (
                                <span className="badge badge-income" style={{ fontSize: '0.65rem' }}>
                                  ✓ Matched in App
                                </span>
                              ) : (
                                <span className="badge" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontSize: '0.65rem' }}>
                                  ⚠️ Missing in App
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
