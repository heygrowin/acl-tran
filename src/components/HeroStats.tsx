import React from 'react';
import { useApp } from '../context/AppContext';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Calendar
} from 'lucide-react';
import { formatCurrency } from '../services/storageService';

export const HeroStats: React.FC = () => {
  const { dayBalances, config, openClosingModal, selectedDate } = useApp();
  const closing = dayBalances.closing;

  // Compute status for closing & reconciliation
  let matchStatus: 'balanced' | 'shortage' | 'excess' | 'pending' = 'pending';
  let statusLabel = 'Pending';
  let diffAmount = 0;

  if (closing) {
    diffAmount = closing.cashDifference + closing.onlineDifference;
    if (closing.status === 'balanced' || diffAmount === 0) {
      matchStatus = 'balanced';
      statusLabel = 'Verified';
    } else if (diffAmount < 0) {
      matchStatus = 'shortage';
      statusLabel = `Shortage (${formatCurrency(Math.abs(diffAmount), config.currency)})`;
    } else {
      matchStatus = 'excess';
      statusLabel = `Excess (+${formatCurrency(diffAmount), config.currency})`;
    }
  }

  const formattedDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <section className="hero-compact-section" style={{ marginBottom: '0.5rem' }}>
      {/* Sleek 2-Column Card: Left = Receive (+), Right = Expense (−) */}
      <div
        className="card"
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          padding: '0.55rem 0.75rem',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.65rem',
          marginBottom: '0.4rem',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        {/* LEFT: RECEIVE (+) */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#166534' }}>
              + Receive
            </span>
            <TrendingUp size={13} style={{ color: '#16a34a' }} />
          </div>

          <div
            className="font-mono"
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#16a34a',
              lineHeight: 1.15,
              margin: '0.1rem 0',
            }}
          >
            {formatCurrency(dayBalances.totalIncome, config.currency)}
          </div>

          <div
            style={{
              fontSize: '0.625rem',
              color: '#64748b',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            <span>Cash: <strong style={{ color: '#0f172a' }}>{formatCurrency(dayBalances.cashIncome, config.currency)}</strong></span>
            <span> • </span>
            <span>Online: <strong style={{ color: '#0f172a' }}>{formatCurrency(dayBalances.onlineIncome, config.currency)}</strong></span>
          </div>
        </div>

        {/* RIGHT: EXPENSE (−) */}
        <div style={{ borderLeft: '1px solid #f1f5f9', paddingLeft: '0.65rem', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#991b1b' }}>
              − Expense
            </span>
            <TrendingDown size={13} style={{ color: '#dc2626' }} />
          </div>

          <div
            className="font-mono"
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#dc2626',
              lineHeight: 1.15,
              margin: '0.1rem 0',
            }}
          >
            {formatCurrency(dayBalances.totalExpense, config.currency)}
          </div>

          <div
            style={{
              fontSize: '0.625rem',
              color: '#64748b',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            <span>Cash: <strong style={{ color: '#0f172a' }}>{formatCurrency(dayBalances.cashExpense, config.currency)}</strong></span>
            <span> • </span>
            <span>Online: <strong style={{ color: '#0f172a' }}>{formatCurrency(dayBalances.onlineExpense, config.currency)}</strong></span>
          </div>
        </div>
      </div>

      {/* COMPACT RECONCILIATION & CLOSING STRIP */}
      <div
        className="card hero-closing-strip"
        style={{
          background: closing
            ? (closing.status === 'balanced' ? '#f0fdf4' : '#fef2f2')
            : '#f8fafc',
          border: `1px solid ${
            closing
              ? (closing.status === 'balanced' ? '#bbf7d0' : '#fecaca')
              : '#e2e8f0'
          }`,
          padding: '0.35rem 0.65rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.4rem',
          cursor: 'pointer',
        }}
        onClick={openClosingModal}
        title="Click to perform or view End-of-Day Closing"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0, flexWrap: 'wrap' }}>
          {/* Date Label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.725rem', fontWeight: 700, color: '#334155' }}>
            <Calendar size={12} style={{ color: '#2563eb' }} />
            <span>{formattedDate}:</span>
          </div>

          {/* Status Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            {matchStatus === 'balanced' && (
              <span className="badge badge-income" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', fontWeight: 800 }}>
                <CheckCircle2 size={11} style={{ marginRight: '0.2rem' }} /> Verified
              </span>
            )}
            {matchStatus === 'shortage' && (
              <span className="badge badge-expense" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', fontWeight: 800 }}>
                <AlertTriangle size={11} style={{ marginRight: '0.2rem' }} /> {statusLabel}
              </span>
            )}
            {matchStatus === 'excess' && (
              <span className="badge" style={{ background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', fontSize: '0.65rem', padding: '0.1rem 0.4rem', fontWeight: 800 }}>
                <Sparkles size={11} style={{ marginRight: '0.2rem' }} /> {statusLabel}
              </span>
            )}
            {matchStatus === 'pending' && (
              <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', fontWeight: 800 }}>
                <HelpCircle size={11} style={{ marginRight: '0.2rem' }} /> Pending
              </span>
            )}
          </div>

          {/* Live Drawer Cash & Online Summary */}
          <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
            (Drawer: <strong>{formatCurrency(dayBalances.expectedCash, config.currency)}</strong> • Online: <strong>{formatCurrency(dayBalances.expectedOnline, config.currency)}</strong>)
          </span>
        </div>

        <button
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.2rem',
            fontSize: '0.675rem',
            fontWeight: 700,
            padding: '0.2rem 0.45rem',
            borderRadius: '4px',
            background: closing ? 'rgba(0, 0, 0, 0.05)' : '#2563eb',
            color: closing ? '#0f172a' : '#ffffff',
            flexShrink: 0,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <span>{closing ? 'View Slip' : 'Close Day'}</span>
          <ArrowRight size={10} />
        </button>
      </div>
    </section>
  );
};
