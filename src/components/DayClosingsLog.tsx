import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Lock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Calendar,
  Printer,
  Edit3,
  ChevronRight
} from 'lucide-react';
import { formatCurrency, storage } from '../services/storageService';
import type { DailyClosing } from '../types';

export const DayClosingsLog: React.FC = () => {
  const { config, openClosingModal, setSelectedDate, selectedDate } = useApp();
  const [viewingClosing, setViewingClosing] = useState<DailyClosing | null>(null);

  const closings = storage.getClosings().sort((a, b) => b.date.localeCompare(a.date));

  const totalClosings = closings.length;
  const balancedClosings = closings.filter(c => c.status === 'balanced').length;
  const shortageClosings = closings.filter(c => c.status === 'shortage').length;
  const excessClosings = closings.filter(c => c.status === 'excess').length;

  const handleReevaluateClosing = (date: string) => {
    setSelectedDate(date);
    setViewingClosing(null);
    openClosingModal();
  };

  return (
    <div className="animate-fade-in">
      {/* Top Summary Bar & Action */}
      <div
        className="card"
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          padding: '0.65rem 0.85rem',
          marginBottom: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Lock size={15} style={{ color: '#2563eb' }} />
            <span>Day Closings History</span>
          </h2>
          <div style={{ fontSize: '0.675rem', color: '#64748b', marginTop: '0.15rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span>Total Closed: <strong>{totalClosings}</strong></span>
            <span>•</span>
            <span style={{ color: '#16a34a' }}>✓ Matched: <strong>{balancedClosings}</strong></span>
            {shortageClosings > 0 && (
              <>
                <span>•</span>
                <span style={{ color: '#dc2626' }}>⚠️ Shortages: <strong>{shortageClosings}</strong></span>
              </>
            )}
            {excessClosings > 0 && (
              <>
                <span>•</span>
                <span style={{ color: '#ea580c' }}>🟢 Excess: <strong>{excessClosings}</strong></span>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          className="btn-fast-income"
          style={{ padding: '0.4rem 0.85rem', fontSize: '0.775rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          onClick={() => openClosingModal()}
        >
          <Lock size={13} />
          <span>Close Day ({selectedDate})</span>
        </button>
      </div>

      {/* Day Closings Interactive Cards Grid */}
      {closings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '1.75rem 1rem', color: '#94a3b8', background: '#ffffff', border: '1px solid #e2e8f0' }}>
          <Lock size={32} style={{ opacity: 0.3, marginBottom: '0.4rem' }} />
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>No Day Closings recorded yet</p>
          <p style={{ fontSize: '0.725rem', marginTop: '0.2rem', color: '#94a3b8' }}>
            Perform End-of-Day Closing at the end of each day to verify cash drawer count and online totals.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.5rem' }}>
          {closings.map(c => {
            const totalDiff = (c.cashDifference || 0) + (c.onlineDifference || 0);
            const isBalanced = c.status === 'balanced' || totalDiff === 0;
            const isShortage = totalDiff < 0;

            return (
              <div
                key={c.id || c.date}
                className="card"
                style={{
                  background: '#ffffff',
                  border: isBalanced ? '1px solid #bbf7d0' : isShortage ? '1px solid #fecaca' : '1px solid #fed7aa',
                  borderRadius: '8px',
                  padding: '0.65rem 0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}
                onClick={() => setViewingClosing(c)}
                title="Tap to view and re-evaluate this day closing"
              >
                {/* Card Header: Date & Status Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Calendar size={13} style={{ color: '#2563eb' }} />
                    <span style={{ fontWeight: 800, fontSize: '0.825rem', color: '#0f172a' }}>
                      {c.date}
                    </span>
                  </div>

                  {isBalanced && (
                    <span className="badge badge-income" style={{ fontSize: '0.625rem', padding: '0.08rem 0.35rem', fontWeight: 800 }}>
                      <CheckCircle2 size={10} style={{ marginRight: '0.2rem' }} /> Verified / Matched
                    </span>
                  )}
                  {isShortage && (
                    <span className="badge badge-expense" style={{ fontSize: '0.625rem', padding: '0.08rem 0.35rem', fontWeight: 800 }}>
                      <AlertTriangle size={10} style={{ marginRight: '0.2rem' }} /> Shortage ({formatCurrency(Math.abs(totalDiff), config.currency)})
                    </span>
                  )}
                  {!isBalanced && !isShortage && (
                    <span className="badge" style={{ background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', fontSize: '0.625rem', padding: '0.08rem 0.35rem', fontWeight: 800 }}>
                      <Sparkles size={10} style={{ marginRight: '0.2rem' }} /> Excess (+{formatCurrency(totalDiff, config.currency)})
                    </span>
                  )}
                </div>

                {/* Card Financial Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', fontSize: '0.725rem', marginBottom: '0.45rem' }}>
                  <div style={{ background: '#f8fafc', padding: '0.35rem 0.5rem', borderRadius: '5px' }}>
                    <span style={{ color: '#64748b', fontSize: '0.65rem', display: 'block' }}>Drawer Cash:</span>
                    <strong className="font-mono" style={{ color: '#b45309', fontSize: '0.85rem' }}>
                      {formatCurrency(c.actualCash, config.currency)}
                    </strong>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '0.35rem 0.5rem', borderRadius: '5px' }}>
                    <span style={{ color: '#64748b', fontSize: '0.65rem', display: 'block' }}>Online Verified:</span>
                    <strong className="font-mono" style={{ color: '#1d4ed8', fontSize: '0.85rem' }}>
                      {formatCurrency(c.actualOnline, config.currency)}
                    </strong>
                  </div>
                </div>

                {/* Card Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.675rem', color: '#64748b', paddingTop: '0.25rem' }}>
                  <span>👤 Closed by: <strong>{c.closedBy || 'Staff'}</strong></span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', color: '#2563eb', fontWeight: 700 }}>
                    <span>Tap to view / edit</span>
                    <ChevronRight size={12} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slip / Re-evaluate Modal Popup */}
      {viewingClosing && (
        <div className="modal-overlay" onClick={() => setViewingClosing(null)}>
          <div className="modal-content animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', padding: '1rem' }}>
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: '0.65rem', marginBottom: '0.65rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{config.businessName || 'Day Closing Slip'}</h3>
              <p style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '0.15rem' }}>
                📅 Date: <strong>{viewingClosing.date}</strong> • Closed By: <strong>{viewingClosing.closedBy}</strong>
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.775rem', marginBottom: '0.65rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Expected Drawer Cash:</span>
                <strong className="font-mono">{formatCurrency(viewingClosing.expectedCash, config.currency)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Actual Counted Cash:</span>
                <strong className="font-mono" style={{ color: '#b45309' }}>{formatCurrency(viewingClosing.actualCash, config.currency)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Expected Online:</span>
                <strong className="font-mono">{formatCurrency(viewingClosing.expectedOnline, config.currency)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Actual Verified Online:</span>
                <strong className="font-mono" style={{ color: '#1d4ed8' }}>{formatCurrency(viewingClosing.actualOnline, config.currency)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '0.35rem' }}>
                <span style={{ fontWeight: 700 }}>Closing Status:</span>
                <strong style={{ color: viewingClosing.status === 'balanced' ? '#16a34a' : '#dc2626' }}>
                  {viewingClosing.status === 'balanced' ? '✓ Exact Match / Verified' : viewingClosing.status.toUpperCase()}
                </strong>
              </div>
            </div>

            {/* Denomination breakdown */}
            {viewingClosing.denominations && Object.keys(viewingClosing.denominations).length > 0 && (
              <div style={{ background: '#f8fafc', padding: '0.5rem 0.65rem', borderRadius: '6px', fontSize: '0.725rem', marginBottom: '0.65rem' }}>
                <strong style={{ display: 'block', marginBottom: '0.3rem', color: '#334155' }}>Denomination Breakdown:</strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
                  {Object.entries(viewingClosing.denominations).map(([note, count]) => {
                    if (!count) return null;
                    const n = parseInt(note, 10);
                    return (
                      <span key={note}>
                        ₹{n} × {count} = <strong>₹{(n * count).toLocaleString()}</strong>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-fast-income"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', background: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                onClick={() => handleReevaluateClosing(viewingClosing.date)}
              >
                <Edit3 size={13} />
                <span>Re-evaluate / Edit</span>
              </button>
              <button
                type="button"
                className="btn-fast-income"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                onClick={() => window.print()}
              >
                <Printer size={13} />
                <span>Print Slip</span>
              </button>
              <button
                type="button"
                className="icon-btn"
                style={{ padding: '0.4rem 0.75rem', width: 'auto', fontSize: '0.75rem' }}
                onClick={() => setViewingClosing(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
