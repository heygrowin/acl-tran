import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import type { TransactionType } from '../types';
import {
  X,
  PlusCircle,
  MinusCircle,
  Banknote,
  QrCode,
  Building,
  Check,
  Plus,
  ChevronDown
} from 'lucide-react';
import { getTodayDateString, getCurrentTimeString, formatCurrency } from '../services/storageService';

interface CounterTerminalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: TransactionType;
}

export const CounterTerminal: React.FC<CounterTerminalProps> = ({
  isOpen,
  onClose,
  initialType = 'income',
}) => {
  const { config, addTransaction, updateTransaction, editingTransaction, selectedDate, addCategory } = useApp();

  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [category, setCategory] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [staffName, setStaffName] = useState<string>(config.activeStaffName || 'Counter Employee');

  // Customer details (Optional)
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');

  // Category auto-suggest dropdown state
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryContainerRef = useRef<HTMLDivElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Sync state on open or when editing
  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(editingTransaction.amount.toString());
      setPaymentMethod(editingTransaction.paymentMethod || 'cash');
      setCategory(editingTransaction.category || '');
      setNote(editingTransaction.note || '');
      setStaffName(editingTransaction.staffName || 'Counter Employee');
      setCustomerName(editingTransaction.customerName || editingTransaction.borrowerName || '');
      setCustomerPhone(editingTransaction.customerPhone || editingTransaction.borrowerPhone || '');
    } else {
      setType(initialType);
      setAmount('');
      setPaymentMethod('cash');
      setCategory('');
      setNote('');
      setCustomerName('');
      setCustomerPhone('');
    }
    setIsCategoryDropdownOpen(false);
  }, [isOpen, initialType, editingTransaction, config]);

  // Focus amount input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 60);
    }
  }, [isOpen, type]);

  // Close category dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (categoryContainerRef.current && !categoryContainerRef.current.contains(e.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    setCategory('');
  };

  const handleAddPreset = (val: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + val).toString());
  };

  // Keyboard shortcut listener
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

  const existingCategories = type === 'income' ? config.incomeCategories : config.expenseCategories;
  const filteredCategories = existingCategories.filter(c =>
    c.toLowerCase().includes(category.trim().toLowerCase())
  );
  const isExactCategoryMatch = existingCategories.some(
    c => c.toLowerCase() === category.trim().toLowerCase()
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = parseFloat(amount) || 0;

    if (finalAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const finalCategory = category.trim() || (type === 'income' ? 'Income' : 'Expense');

    // Auto-save new category into config list if new
    if (finalCategory) {
      addCategory(type, finalCategory);
    }

    if (editingTransaction) {
      updateTransaction({
        ...editingTransaction,
        type,
        amount: finalAmount,
        paymentMethod,
        category: finalCategory,
        note: note.trim() || undefined,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        staffName: staffName || 'Counter Employee',
      });
    } else {
      addTransaction({
        businessId: config.id,
        date: selectedDate || getTodayDateString(),
        time: getCurrentTimeString(),
        type,
        amount: finalAmount,
        paymentMethod,
        category: finalCategory,
        note: note.trim() || undefined,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        staffName: staffName || 'Counter Employee',
      });
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>{type === 'income' ? '🟢' : '🔴'}</span>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              {editingTransaction ? 'Edit Entry' : type === 'income' ? '+ Income' : '− Expense'}
            </h2>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={17} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.15rem' }}>
          {/* 1. Type Switcher: Income (First) vs Expense (Second) */}
          <div className="entry-type-toggle" style={{ marginBottom: '0.85rem' }}>
            <button
              type="button"
              className={`type-toggle-btn income ${type === 'income' ? 'active' : ''}`}
              onClick={() => handleTypeChange('income')}
            >
              <PlusCircle size={17} />
              <span>+ Income</span>
            </button>
            <button
              type="button"
              className={`type-toggle-btn expense ${type === 'expense' ? 'active' : ''}`}
              onClick={() => handleTypeChange('expense')}
            >
              <MinusCircle size={17} />
              <span>− Expense</span>
            </button>
          </div>

          {/* 2. Customer Name, Mobile Number & Note (TOP) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.85rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Customer / Party Name (Optional)"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
              />
              <input
                type="tel"
                className="form-input"
                placeholder="Mobile Number (Optional)"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
              />
            </div>

            <input
              type="text"
              className="form-input"
              placeholder="Note / Description (e.g. Tea, Courier, Order #101)"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          {/* 3. Amount Input */}
          <div style={{ marginBottom: '0.85rem' }}>
            <div className="giant-amount-wrap">
              <span className="giant-currency-symbol">{config.currency}</span>
              <input
                ref={amountInputRef}
                type="number"
                step="any"
                placeholder="0"
                className="giant-amount-input"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
              />
              {amount && (
                <button
                  type="button"
                  style={{ color: 'var(--text-muted)', padding: '0.25rem' }}
                  onClick={() => setAmount('')}
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Quick Amount Presets */}
            <div className="amount-presets-row">
              {[100, 200, 500, 1000, 2000, 5000].map(preset => (
                <button
                  key={preset}
                  type="button"
                  className="preset-chip"
                  onClick={() => handleAddPreset(preset)}
                >
                  +{formatCurrency(preset, config.currency)}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Payment Method Options: Cash, UPI, RTGS */}
          <div style={{ marginBottom: '0.85rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              <button
                key="cash"
                type="button"
                className={`method-chip ${paymentMethod === 'cash' ? 'active' : ''}`}
                style={{
                  padding: '0.75rem 0.5rem',
                  border: paymentMethod === 'cash' ? '2px solid #16a34a' : '1.5px solid #e2e8f0',
                  background: paymentMethod === 'cash' ? '#f0fdf4' : '#ffffff',
                  color: paymentMethod === 'cash' ? '#16a34a' : '#475569',
                }}
                onClick={() => setPaymentMethod('cash')}
              >
                <Banknote size={22} style={{ color: '#16a34a' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>Cash</span>
              </button>

              <button
                key="upi"
                type="button"
                className={`method-chip ${paymentMethod === 'upi' ? 'active' : ''}`}
                style={{
                  padding: '0.75rem 0.5rem',
                  border: paymentMethod === 'upi' ? '2px solid #2563eb' : '1.5px solid #e2e8f0',
                  background: paymentMethod === 'upi' ? '#eff6ff' : '#ffffff',
                  color: paymentMethod === 'upi' ? '#2563eb' : '#475569',
                }}
                onClick={() => setPaymentMethod('upi')}
              >
                <QrCode size={22} style={{ color: '#2563eb' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>UPI</span>
              </button>

              <button
                key="rtgs"
                type="button"
                className={`method-chip ${paymentMethod === 'rtgs' ? 'active' : ''}`}
                style={{
                  padding: '0.75rem 0.5rem',
                  border: paymentMethod === 'rtgs' ? '2px solid #7c3aed' : '1.5px solid #e2e8f0',
                  background: paymentMethod === 'rtgs' ? '#f5f3ff' : '#ffffff',
                  color: paymentMethod === 'rtgs' ? '#7c3aed' : '#475569',
                }}
                onClick={() => setPaymentMethod('rtgs')}
              >
                <Building size={22} style={{ color: '#7c3aed' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>RTGS</span>
              </button>
            </div>
          </div>

          {/* 5. Dynamic Auto-Suggest Category Box */}
          <div ref={categoryContainerRef} style={{ position: 'relative', marginBottom: '1.15rem' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Category (type or select e.g. Tea, Order, Fuel)"
                value={category}
                onChange={e => {
                  setCategory(e.target.value);
                  setIsCategoryDropdownOpen(true);
                }}
                onFocus={() => setIsCategoryDropdownOpen(true)}
              />
              <button
                type="button"
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                }}
                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
              >
                <ChevronDown size={16} />
              </button>
            </div>

            {/* Category Auto-suggest Dropdown */}
            {isCategoryDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '0.25rem',
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  zIndex: 50,
                  maxHeight: '180px',
                  overflowY: 'auto',
                }}
              >
                {filteredCategories.map(cat => (
                  <div
                    key={cat}
                    style={{
                      padding: '0.55rem 0.85rem',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f1f5f9',
                      background: category.toLowerCase() === cat.toLowerCase() ? '#eff6ff' : 'transparent',
                    }}
                    onClick={() => {
                      setCategory(cat);
                      setIsCategoryDropdownOpen(false);
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = category.toLowerCase() === cat.toLowerCase() ? '#eff6ff' : 'transparent')}
                  >
                    {cat}
                  </div>
                ))}

                {category.trim() && !isExactCategoryMatch && (
                  <div
                    style={{
                      padding: '0.55rem 0.85rem',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#2563eb',
                      cursor: 'pointer',
                      background: '#eff6ff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                    onClick={() => {
                      setIsCategoryDropdownOpen(false);
                    }}
                  >
                    <Plus size={14} />
                    <span>Create new category "{category.trim()}"</span>
                  </div>
                )}

                {filteredCategories.length === 0 && !category.trim() && (
                  <div style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
                    Type to add or search category
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 6. Big Save Button */}
          <button
            type="submit"
            className={`btn-save-transaction ${type}`}
            style={{
              width: '100%',
              padding: '0.85rem',
              fontSize: '1rem',
              fontWeight: 800,
              background: type === 'income' ? '#16a34a' : '#dc2626',
              boxShadow: 'none',
            }}
          >
            <Check size={18} />
            <span>SAVE ({formatCurrency(parseFloat(amount) || 0, config.currency)})</span>
          </button>
        </form>
      </div>
    </div>
  );
};
