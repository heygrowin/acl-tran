import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  PieChart,
  Wallet,
  Clock
} from 'lucide-react';
import { formatCurrency, getTodayDateString } from '../services/storageService';

export const ReportsAnalytics: React.FC = () => {
  const { transactions, closings, config } = useApp();
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days' | 'all'>('7days');

  const today = getTodayDateString();

  // Filter transactions by time range
  const filteredTxs = transactions.filter(t => {
    if (timeRange === 'today') return t.date === today;
    if (timeRange === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return t.date >= d.toISOString().split('T')[0];
    }
    if (timeRange === '30days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return t.date >= d.toISOString().split('T')[0];
    }
    return true;
  });

  const totalIncome = filteredTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filteredTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const netFlow = totalIncome - totalExpense;

  // Expense by category
  const expenseByCategory: Record<string, number> = {};
  filteredTxs.filter(t => t.type === 'expense').forEach(t => {
    expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
  });
  const sortedExpenses = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]);

  // Payment Method Breakdown
  const methodTotals: Record<string, { income: number; expense: number }> = {};
  filteredTxs.forEach(t => {
    const m = t.paymentMethod.toUpperCase();
    if (!methodTotals[m]) methodTotals[m] = { income: 0, expense: 0 };
    if (t.type === 'income') methodTotals[m].income += t.amount;
    else methodTotals[m].expense += t.amount;
  });

  return (
    <div className="animate-fade-in">
      {/* Time Range Selector */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.65rem',
          flexWrap: 'wrap',
          gap: '0.45rem',
        }}
      >
        <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Business Reports & Analytics</h2>
        <div style={{ display: 'flex', background: 'var(--bg-input)', padding: '0.15rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          {(['today', '7days', '30days', 'all'] as const).map(range => (
            <button
              key={range}
              className={`nav-tab-btn ${timeRange === range ? 'active' : ''}`}
              style={{ fontSize: '0.725rem', padding: '0.25rem 0.55rem' }}
              onClick={() => setTimeRange(range)}
            >
              {range === 'today' ? 'Today' : range === '7days' ? '7 Days' : range === '30days' ? '30 Days' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Top Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.45rem',
          marginBottom: '0.65rem',
        }}
      >
        <div className="card" style={{ borderLeft: '3.5px solid var(--color-income)', padding: '0.55rem 0.75rem' }}>
          <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Inflow (Income)
          </div>
          <div className="font-mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-income)', margin: '0.15rem 0' }}>
            {formatCurrency(totalIncome, config.currency)}
          </div>
          <div style={{ fontSize: '0.675rem', color: 'var(--text-secondary)' }}>
            {filteredTxs.filter(t => t.type === 'income').length} income txns
          </div>
        </div>

        <div className="card" style={{ borderLeft: '3.5px solid var(--color-expense)', padding: '0.55rem 0.75rem' }}>
          <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Outflow (Expense)
          </div>
          <div className="font-mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-expense)', margin: '0.15rem 0' }}>
            {formatCurrency(totalExpense, config.currency)}
          </div>
          <div style={{ fontSize: '0.675rem', color: 'var(--text-secondary)' }}>
            {filteredTxs.filter(t => t.type === 'expense').length} expense txns
          </div>
        </div>

        <div className="card" style={{ borderLeft: `3.5px solid ${netFlow >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}`, padding: '0.55rem 0.75rem' }}>
          <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Net Cash Flow
          </div>
          <div
            className="font-mono"
            style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              color: netFlow >= 0 ? 'var(--color-income)' : 'var(--color-expense)',
              margin: '0.15rem 0',
            }}
          >
            {formatCurrency(netFlow, config.currency)}
          </div>
          <div style={{ fontSize: '0.675rem', color: 'var(--text-secondary)' }}>
            {netFlow >= 0 ? '✓ Net Positive' : '⚠️ Net Negative'}
          </div>
        </div>
      </div>

      {/* Breakdowns Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.55rem', marginBottom: '0.65rem' }}>
        {/* Category Expense Breakdown */}
        <div className="card" style={{ padding: '0.65rem 0.85rem' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.55rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <PieChart size={14} style={{ color: 'var(--color-expense)' }} />
            <span>Expense by Category</span>
          </h3>

          {sortedExpenses.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No expenses recorded in this period.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {sortedExpenses.map(([cat, amt]) => {
                const pct = totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0;
                return (
                  <div key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.15rem' }}>
                      <span style={{ fontWeight: 600 }}>{cat}</span>
                      <span className="font-mono" style={{ fontWeight: 700 }}>
                        {formatCurrency(amt, config.currency)} ({pct}%)
                      </span>
                    </div>
                    <div style={{ height: '5px', background: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-expense)', borderRadius: '3px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payment Method Distribution */}
        <div className="card" style={{ padding: '0.65rem 0.85rem' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.55rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Wallet size={14} style={{ color: 'var(--color-accent)' }} />
            <span>Movement by Mode</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {Object.entries(methodTotals).map(([method, vals]) => (
              <div
                key={method}
                style={{
                  padding: '0.45rem 0.65rem',
                  background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.775rem' }}>{method}</div>
                <div style={{ display: 'flex', gap: '0.65rem', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--color-income)' }} className="font-mono">
                    +{formatCurrency(vals.income, config.currency)}
                  </span>
                  <span style={{ color: 'var(--color-expense)' }} className="font-mono">
                    -{formatCurrency(vals.expense, config.currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Closings Audit Log */}
      <div className="card" style={{ padding: '0.65rem 0.85rem' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.55rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Clock size={14} style={{ color: 'var(--color-online)' }} />
          <span>Historical Closings & Reconciliation Log</span>
        </h3>

        {closings.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            No daily closings recorded yet. Perform a Day Closing to see mismatch audits.
          </div>
        ) : (
          <div className="tx-table-container">
            <table className="tx-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Closed By</th>
                  <th style={{ textAlign: 'right' }}>Expected Cash</th>
                  <th style={{ textAlign: 'right' }}>Actual Cash</th>
                  <th style={{ textAlign: 'right' }}>Variance</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {closings.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.date}</td>
                    <td>{c.closedBy}</td>
                    <td style={{ textAlign: 'right' }} className="font-mono">{formatCurrency(c.expectedCash, config.currency)}</td>
                    <td style={{ textAlign: 'right' }} className="font-mono">{formatCurrency(c.actualCash, config.currency)}</td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: 700,
                        color: c.cashDifference === 0 ? 'var(--color-income)' : c.cashDifference < 0 ? 'var(--color-danger)' : 'var(--color-income)',
                      }}
                      className="font-mono"
                    >
                      {formatCurrency(c.cashDifference, config.currency)}
                    </td>
                    <td>
                      <span className={`badge ${c.status === 'balanced' ? 'badge-income' : 'badge-expense'}`}>
                        {c.status === 'balanced' ? '✓ Matched' : c.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{c.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
