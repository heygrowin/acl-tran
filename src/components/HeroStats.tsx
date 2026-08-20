import React from 'react';
import { useApp } from '../context/AppContext';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  Wallet,
  Globe,
  Sparkles
} from 'lucide-react';
import { formatCurrency } from '../services/storageService';

export const HeroStats: React.FC = () => {
  const { dayBalances, config, openClosingModal } = useApp();
  const closing = dayBalances.closing;

  // Compute status for question #3
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
    <section className="hero-stats-grid">
      {/* 1. HOW MUCH CAME IN */}
      <div className="kpi-card income">
        <div className="kpi-header">
          <div className="kpi-title-wrap">
            <span className="kpi-num-badge">1</span>
            <span className="kpi-label">How much came in today?</span>
          </div>
          <div style={{ color: 'var(--color-income)' }}>
            <TrendingUp size={20} />
          </div>
        </div>

        <div className="kpi-main-val income font-mono">
          {formatCurrency(dayBalances.totalIncome, config.currency)}
        </div>

        <div className="kpi-sub-breakdown">
          <span className="kpi-pill">
            <Wallet size={12} style={{ color: 'var(--color-cash)' }} />
            <span>Cash: {formatCurrency(dayBalances.cashIncome, config.currency)}</span>
          </span>
          <span className="kpi-pill">
            <Globe size={12} style={{ color: 'var(--color-online)' }} />
            <span>Online: {formatCurrency(dayBalances.onlineIncome, config.currency)}</span>
          </span>
        </div>
      </div>

      {/* 2. HOW MUCH WENT OUT */}
      <div className="kpi-card expense">
        <div className="kpi-header">
          <div className="kpi-title-wrap">
            <span className="kpi-num-badge">2</span>
            <span className="kpi-label">How much went out today?</span>
          </div>
          <div style={{ color: 'var(--color-expense)' }}>
            <TrendingDown size={20} />
          </div>
        </div>

        <div className="kpi-main-val expense font-mono">
          {formatCurrency(dayBalances.totalExpense, config.currency)}
        </div>

        <div className="kpi-sub-breakdown">
          <span className="kpi-pill">
            <Wallet size={12} style={{ color: 'var(--color-cash)' }} />
            <span>Cash: {formatCurrency(dayBalances.cashExpense, config.currency)}</span>
          </span>
          <span className="kpi-pill">
            <Globe size={12} style={{ color: 'var(--color-online)' }} />
            <span>Online: {formatCurrency(dayBalances.onlineExpense, config.currency)}</span>
          </span>
        </div>
      </div>

      {/* 3. DOES THE MONEY MATCH? */}
      <div className={`kpi-card match-${matchStatus}`}>
        <div className="kpi-header">
          <div className="kpi-title-wrap">
            <span className="kpi-num-badge">3</span>
            <span className="kpi-label">Does the money match?</span>
          </div>
          <div>
            {matchStatus === 'balanced' && <CheckCircle2 size={22} style={{ color: '#10b981' }} />}
            {matchStatus === 'shortage' && <AlertTriangle size={22} style={{ color: '#ef4444' }} />}
            {matchStatus === 'excess' && <Sparkles size={22} style={{ color: '#10b981' }} />}
            {matchStatus === 'pending' && <HelpCircle size={22} style={{ color: 'var(--color-accent)' }} />}
          </div>
        </div>

        <div style={{ margin: '0.2rem 0' }}>
          <div
            className={`reconcile-status-box ${matchStatus}`}
            onClick={openClosingModal}
            style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
            title="Click to perform or view End-of-Day Closing"
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>{matchMessage}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                {closing
                  ? `Closed at ${new Date(closing.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by ${closing.closedBy}`
                  : 'Counter open. Click to Reconcile & Close'}
              </div>
            </div>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.35rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.15)',
                color: 'inherit',
              }}
            >
              <span>{closing ? 'View' : 'Close Day'}</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>

        <div className="kpi-sub-breakdown" style={{ marginTop: '0.4rem' }}>
          <span>Expected Cash: <strong>{formatCurrency(dayBalances.expectedCash, config.currency)}</strong></span>
          <span>•</span>
          <span>Online: <strong>{formatCurrency(dayBalances.expectedOnline, config.currency)}</strong></span>
        </div>
      </div>
    </section>
  );
};
