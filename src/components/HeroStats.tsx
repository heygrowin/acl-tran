import React from 'react';
import { useApp } from '../context/AppContext';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { formatCurrency } from '../services/storageService';

export const HeroStats: React.FC = () => {
  const { dayBalances, config, openClosingModal } = useApp();
  const closing = dayBalances.closing;

  // Compute status for closing & reconciliation
  let matchStatus: 'balanced' | 'shortage' | 'excess' | 'pending' = 'pending';
  let matchMessage = 'Closing Pending';
  let diffAmount = 0;

  if (closing) {
    diffAmount = closing.cashDifference + closing.onlineDifference;
    if (closing.status === 'balanced' || diffAmount === 0) {
      matchStatus = 'balanced';
      matchMessage = '✓ Money Matched';
    } else if (diffAmount < 0) {
      matchStatus = 'shortage';
      matchMessage = `⚠️ Shortage: ${formatCurrency(Math.abs(diffAmount), config.currency)}`;
    } else {
      matchStatus = 'excess';
      matchMessage = `🟢 Excess: +${formatCurrency(diffAmount, config.currency)}`;
    }
  }

  return (
    <section className="hero-compact-section" style={{ marginBottom: '0.5rem' }}>
      {/* Sleek Apple-style 2-Column Unified Card: Left = Income, Right = Expense */}
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
        {/* LEFT: INCOME (+) */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#166534' }}>
              + Income
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0 }}>
          {matchStatus === 'balanced' && <CheckCircle2 size={14} style={{ color: '#16a34a', flexShrink: 0 }} />}
          {matchStatus === 'shortage' && <AlertTriangle size={14} style={{ color: '#dc2626', flexShrink: 0 }} />}
          {matchStatus === 'excess' && <Sparkles size={14} style={{ color: '#16a34a', flexShrink: 0 }} />}
          {matchStatus === 'pending' && <HelpCircle size={14} style={{ color: '#2563eb', flexShrink: 0 }} />}

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: '0.725rem',
                  color: closing
                    ? (closing.status === 'balanced' ? '#166534' : '#991b1b')
                    : '#1e40af',
                }}
              >
                {matchMessage}
              </span>
              <span style={{ fontSize: '0.625rem', color: '#64748b' }}>
                (Drawer: <strong>{formatCurrency(dayBalances.expectedCash, config.currency)}</strong> • Online: <strong>{formatCurrency(dayBalances.expectedOnline, config.currency)}</strong>)
              </span>
            </div>
          </div>
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
          <span>{closing ? 'View' : 'Close Day'}</span>
          <ArrowRight size={10} />
        </button>
      </div>
    </section>
  );
};

