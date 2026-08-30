import React, { useEffect } from 'react';
import { X, Keyboard, ArrowRight, CornerDownLeft, Sparkles } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const kbdStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '22px',
    padding: '0.15rem 0.45rem',
    fontSize: '0.75rem',
    fontWeight: 800,
    color: '#0f172a',
    background: '#f8fafc',
    border: '1.5px solid #cbd5e1',
    borderRadius: '5px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.15rem',
            borderBottom: '1px solid #f1f5f9',
            background: '#f8fafc',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                background: '#e0e7ff',
                color: '#4338ca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Keyboard size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Keyboard Shortcuts & Workflow Guide
              </h2>
              <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '0.1rem 0 0 0' }}>
                Fast, mouse-free entry and navigation instructions
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '6px',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
            }}
            title="Close (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1rem 1.15rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Section 1: Global Page Shortcuts */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.04em' }}>
                1. Global Shortcuts (Anywhere on Ledger)
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: '#f8fafc', padding: '0.65rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: '#1e293b', fontWeight: 600 }}>Open Add Receive Entry</span>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  <kbd style={kbdStyle}>R</kbd>
                  <span style={{ color: '#94a3b8', fontSize: '0.75rem', alignSelf: 'center' }}>or</span>
                  <kbd style={kbdStyle}>+</kbd>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: '#1e293b', fontWeight: 600 }}>Open Add Expense Entry</span>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  <kbd style={kbdStyle}>E</kbd>
                  <span style={{ color: '#94a3b8', fontSize: '0.75rem', alignSelf: 'center' }}>or</span>
                  <kbd style={kbdStyle}>-</kbd>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: '#1e293b', fontWeight: 600 }}>Navigate Previous / Next Date</span>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  <kbd style={kbdStyle}>←</kbd>
                  <kbd style={kbdStyle}>→</kbd>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: '#1e293b', fontWeight: 600 }}>Jump to Today</span>
                <kbd style={kbdStyle}>T</kbd>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: '#1e293b', fontWeight: 600 }}>Close Popup / Suggestions</span>
                <kbd style={kbdStyle}>Esc</kbd>
              </div>
            </div>
          </div>

          {/* Section 2: Fast 3-Step Modal Entry */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
              <Sparkles size={14} style={{ color: '#d97706' }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.04em' }}>
                2. Rapid 3-Step Keyboard Entry (No Mouse Required)
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', background: '#fffbeb', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fef3c7' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.78rem', color: '#92400e' }}>
                <span style={{ background: '#f59e0b', color: '#ffffff', borderRadius: '9999px', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.68rem', flexShrink: 0 }}>1</span>
                <div>
                  <strong>Head:</strong> Type category name or press <kbd style={kbdStyle}>↓</kbd> <kbd style={kbdStyle}>↑</kbd> to navigate list. Press <kbd style={kbdStyle}>Enter <CornerDownLeft size={10} style={{ display: 'inline' }} /></kbd> to select and auto-advance to Amount.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.78rem', color: '#92400e' }}>
                <span style={{ background: '#f59e0b', color: '#ffffff', borderRadius: '9999px', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.68rem', flexShrink: 0 }}>2</span>
                <div>
                  <strong>AMOUNT:</strong> Type the amount. Press <kbd style={kbdStyle}>Enter <CornerDownLeft size={10} style={{ display: 'inline' }} /></kbd> to auto-advance to Remark (or <kbd style={kbdStyle}>↑</kbd> to return to Head).
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.78rem', color: '#92400e' }}>
                <span style={{ background: '#f59e0b', color: '#ffffff', borderRadius: '9999px', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.68rem', flexShrink: 0 }}>3</span>
                <div>
                  <strong>REMARK:</strong> Type note/phone (optional). Press <kbd style={kbdStyle}>Enter <CornerDownLeft size={10} style={{ display: 'inline' }} /></kbd> to <strong>Save Immediately</strong> and instantly start the next entry!
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Smart Features */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.04em' }}>
                3. Smart Auto-Detection & Collapsible Daily Sheet
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: '#f8fafc', padding: '0.65rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#334155' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ArrowRight size={13} style={{ color: '#2563eb', flexShrink: 0 }} />
                <span>
                  <strong>Auto Payment Detection:</strong> Typing or choosing a Head like <code>LAB WORK - RTGS</code> or <code>UPI</code> automatically sets the payment method.
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ArrowRight size={13} style={{ color: '#2563eb', flexShrink: 0 }} />
                <span>
                  <strong>Collapsible Duplicate Heads:</strong> Multiple entries with the same Head collapse into one summary row with total sum. Click the <strong>▼</strong> arrow to view individual remarks and Edit/Delete them.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '0.75rem 1.15rem',
            borderTop: '1px solid #f1f5f9',
            background: '#f8fafc',
            borderBottomLeftRadius: '12px',
            borderBottomRightRadius: '12px',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '0.35rem 1rem', fontSize: '0.8rem', fontWeight: 700 }}
            onClick={onClose}
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
