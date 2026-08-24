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
  ChevronDown,
  Trash2,
} from 'lucide-react';
import { getTodayDateString, getCurrentTimeString, formatCurrency } from '../services/storageService';

interface CounterTerminalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: TransactionType;
  initialStaff?: string;
}

export const CounterTerminal: React.FC<CounterTerminalProps> = ({
  isOpen,
  onClose,
  initialType = 'income',
  initialStaff,
}) => {
  const {
    config,
    counters,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    showToast,
    editingTransaction,
    selectedDate,
    addCategory,
    addUpiAccount,
    selectedMember,
  } = useApp();

  const availableStaff = Array.from(
    new Set([
      ...(counters || []).map(c => c.name),
      ...(config.staffMembers || []).filter(s => s !== 'Admin / Owner'),
      'KRISHNA',
      'NAVIN',
      'OTHER',
    ])
  ).filter(s => s !== 'Admin / Owner' && s !== 'ADMIN / OWNER');

  const defaultStaff = initialStaff || (selectedMember && selectedMember !== 'Admin / Owner' ? selectedMember : (availableStaff[0] || 'KRISHNA'));

  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [upiAccount, setUpiAccount] = useState<string>('');
  const [category, setCategory] = useState<string>(''); // Head in UI
  const [note, setNote] = useState<string>('');
  const [staffName, setStaffName] = useState<string>(defaultStaff);
  const [customerPhone, setCustomerPhone] = useState<string>('');

  // Dropdown states
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isUpiDropdownOpen, setIsUpiDropdownOpen] = useState(false);

  const categoryContainerRef = useRef<HTMLDivElement>(null);
  const upiContainerRef = useRef<HTMLDivElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const existingCategories = type === 'income' ? config.incomeCategories : config.expenseCategories;
  const existingUpiAccounts = (config.upiAccounts || []).filter(
    (a: string) => !['Shop QR', 'PhonePe QR', 'Paytm QR', 'Bank QR', 'Bank UPI'].includes(a)
  );

  // Sync state on open or when editing
  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(editingTransaction.amount.toString());
      setPaymentMethod(editingTransaction.paymentMethod || 'cash');
      setUpiAccount(editingTransaction.paymentAccount || '');
      setCategory(editingTransaction.category || '');
      setNote(editingTransaction.note || '');
      setStaffName(editingTransaction.staffName || defaultStaff);
      setCustomerPhone(editingTransaction.customerPhone || editingTransaction.borrowerPhone || '');
    } else {
      setType(initialType);
      setAmount('');
      setPaymentMethod('cash');
      setUpiAccount('');
      setCategory('');
      setNote('');
      setStaffName(initialStaff || (selectedMember && selectedMember !== 'Admin / Owner' ? selectedMember : (availableStaff[0] || 'KRISHNA')));
      setCustomerPhone('');
    }
    setIsCategoryDropdownOpen(false);
    setIsUpiDropdownOpen(false);
  }, [isOpen, initialType, initialStaff, editingTransaction, config, selectedMember]);

  // Focus amount input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 60);
    }
  }, [isOpen, type]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (categoryContainerRef.current && !categoryContainerRef.current.contains(e.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
      if (upiContainerRef.current && !upiContainerRef.current.contains(e.target as Node)) {
        setIsUpiDropdownOpen(false);
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

  const filteredCategories = existingCategories.filter(c =>
    c.toLowerCase().includes(category.trim().toLowerCase())
  );
  const isExactCategoryMatch = existingCategories.some(
    c => c.toLowerCase() === category.trim().toLowerCase()
  );

  const filteredUpiAccounts = existingUpiAccounts.filter(a =>
    a.toLowerCase().includes(upiAccount.trim().toLowerCase())
  );
  const isExactUpiMatch = existingUpiAccounts.some(
    a => a.toLowerCase() === upiAccount.trim().toLowerCase()
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = parseFloat(amount) || 0;

    if (finalAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const typedCategory = category.trim();
    const finalCategory = typedCategory || (type === 'income' ? 'Receive' : 'Expense');

    if (typedCategory && typedCategory.toLowerCase() !== 'receive' && typedCategory.toLowerCase() !== 'income' && typedCategory.toLowerCase() !== 'expense') {
      addCategory(type, typedCategory);
    }

    const finalPaymentAccount = paymentMethod === 'upi' ? upiAccount.trim() : undefined;
    if (paymentMethod === 'upi' && finalPaymentAccount) {
      addUpiAccount(finalPaymentAccount);
    }

    const sanitizedStaff = staffName.trim();
    const effectiveStaffName = (sanitizedStaff && sanitizedStaff !== 'Admin / Owner')
      ? sanitizedStaff
      : (selectedMember && selectedMember !== 'Admin / Owner' ? selectedMember : (availableStaff[0] || 'KRISHNA'));

    if (editingTransaction && editingTransaction.id) {
      updateTransaction({
        ...editingTransaction,
        type,
        amount: finalAmount,
        paymentMethod,
        paymentAccount: finalPaymentAccount || undefined,
        category: finalCategory,
        note: note.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        staffName: effectiveStaffName,
      });
    } else {
      addTransaction({
        businessId: config.id,
        date: selectedDate || getTodayDateString(),
        time: getCurrentTimeString(),
        type,
        amount: finalAmount,
        paymentMethod,
        paymentAccount: finalPaymentAccount || undefined,
        category: finalCategory,
        note: note.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        staffName: effectiveStaffName,
      });
    }

    onClose();
  };

  const handleDeleteCurrent = () => {
    if (editingTransaction && editingTransaction.id) {
      const isCashInHand = (editingTransaction.category || '').trim().toUpperCase() === 'CASH IN HAND';
      const label = isCashInHand ? 'Cash in Hand entry' : `${type.toUpperCase()} entry`;
      if (confirm(`Delete this ${label} of ${formatCurrency(editingTransaction.amount, config.currency)}?`)) {
        deleteTransaction(editingTransaction.id);
        showToast(`${label} deleted`);
        onClose();
      }
    } else {
      onClose();
      showToast('Cancelled');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.65rem 0.85rem',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '1.1rem' }}>{type === 'income' ? '🟢' : '🔴'}</span>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
              {editingTransaction && editingTransaction.id ? 'Edit Entry' : editingTransaction ? 'Edit Cash in Hand' : type === 'income' ? '+ Receive Entry' : '− Expense Entry'}
            </h2>
          </div>
          <button className="icon-btn" style={{ width: '26px', height: '26px' }} onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: '0.75rem 0.85rem' }}>
          {/* 1. Type Switcher: Receive vs Expense */}
          <div className="entry-type-toggle" style={{ marginBottom: '0.55rem', padding: '0.2rem' }}>
            <button
              type="button"
              className={`type-toggle-btn income ${type === 'income' ? 'active' : ''}`}
              style={{ padding: '0.5rem', fontSize: '0.85rem' }}
              onClick={() => handleTypeChange('income')}
            >
              <PlusCircle size={15} />
              <span>+ Receive</span>
            </button>
            <button
              type="button"
              className={`type-toggle-btn expense ${type === 'expense' ? 'active' : ''}`}
              style={{ padding: '0.5rem', fontSize: '0.85rem' }}
              onClick={() => handleTypeChange('expense')}
            >
              <MinusCircle size={15} />
              <span>− Expense</span>
            </button>
          </div>

          {/* Counter / Staff Selector */}
          <div style={{ marginBottom: '0.55rem' }}>
            <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
              Counter / Staff:
            </label>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {availableStaff.map(cName => {
                const isSelected = staffName.toLowerCase() === cName.toLowerCase();
                return (
                  <button
                    key={cName}
                    type="button"
                    style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      background: isSelected ? '#1e1b87' : '#f1f5f9',
                      color: isSelected ? '#ffffff' : '#334155',
                      border: isSelected ? '1.5px solid #1e1b87' : '1px solid #cbd5e1',
                      cursor: 'pointer',
                      transition: 'all 0.12s ease'
                    }}
                    onClick={() => setStaffName(cName)}
                  >
                    {cName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. HEAD SELECTOR (Positioned above phone & note, with dropdown on click/focus) */}
          <div ref={categoryContainerRef} style={{ position: 'relative', marginBottom: '0.55rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
              <label style={{ fontSize: '0.725rem', fontWeight: 700, color: '#334155' }}>
                Head:
              </label>
              <span style={{ fontSize: '0.625rem', color: '#64748b' }}>Select or type new</span>
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                style={{ fontSize: '0.825rem', padding: '0.4rem 2rem 0.4rem 0.65rem', fontWeight: 600 }}
                placeholder={type === 'income' ? 'Head (e.g. LAB WORK, GOODS, CASH IN HAND)' : 'Head (e.g. FOOD, TEA, CASH IN HAND)'}
                value={category}
                onChange={e => {
                  const val = e.target.value;
                  setCategory(val);
                  if (val.trim().toUpperCase() === 'CASH IN HAND') {
                    setPaymentMethod('cash');
                  }
                  setIsCategoryDropdownOpen(true);
                }}
                onFocus={() => setIsCategoryDropdownOpen(true)}
              />
              <button
                type="button"
                style={{
                  position: 'absolute',
                  right: '0.65rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
              >
                <ChevronDown size={14} />
              </button>
            </div>

            {/* Quick Head Chips */}
            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
              {(type === 'income'
                ? ['LAB WORK', 'GOODS', 'CASH IN HAND', 'BANK (RTGS)', 'Advance', 'Sale']
                : ['FOOD', 'TEA', 'TRANSPORTING', 'PARSAL', 'BANK (RTGS)', 'CASH IN HAND', 'UPI AP', 'UPI RUPA']
              ).map(catName => (
                <button
                  key={catName}
                  type="button"
                  style={{
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                    fontSize: '0.675rem',
                    fontWeight: 700,
                    background: category.toLowerCase() === catName.toLowerCase() ? (type === 'income' ? '#dcfce7' : '#fee2e2') : '#f1f5f9',
                    color: category.toLowerCase() === catName.toLowerCase() ? (type === 'income' ? '#166534' : '#991b1b') : '#475569',
                    border: `1px solid ${category.toLowerCase() === catName.toLowerCase() ? (type === 'income' ? '#86efac' : '#fecaca') : '#e2e8f0'}`,
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setCategory(catName);
                    if (catName.toUpperCase() === 'CASH IN HAND') {
                      setPaymentMethod('cash');
                    }
                    setIsCategoryDropdownOpen(false);
                  }}
                >
                  {catName}
                </button>
              ))}
            </div>

            {/* Head Auto-suggest Dropdown */}
            {isCategoryDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '0.2rem',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
                  zIndex: 60,
                  maxHeight: '170px',
                  overflowY: 'auto',
                }}
              >
                {filteredCategories.map(cat => (
                  <div
                    key={cat}
                    style={{
                      padding: '0.45rem 0.75rem',
                      fontSize: '0.8rem',
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
                  >
                    {cat}
                  </div>
                ))}

                {category.trim() && !isExactCategoryMatch && (
                  <div
                    style={{
                      padding: '0.45rem 0.75rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: '#2563eb',
                      cursor: 'pointer',
                      background: '#eff6ff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                    onClick={() => {
                      setIsCategoryDropdownOpen(false);
                    }}
                  >
                    <Plus size={13} />
                    <span>Create new "{category.trim()}"</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Phone Number & Note (Party Name completely removed) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '0.55rem' }}>
            <input
              type="tel"
              className="form-input"
              style={{ fontSize: '0.775rem', padding: '0.35rem 0.55rem' }}
              placeholder="Phone Number (Optional)"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
            />
            <input
              type="text"
              className="form-input"
              style={{ fontSize: '0.775rem', padding: '0.35rem 0.55rem' }}
              placeholder="Note / Description (Optional)"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          {/* 4. Amount Input */}
          <div style={{ marginBottom: '0.55rem' }}>
            <div className="giant-amount-wrap" style={{ padding: '0.3rem 0.65rem', marginBottom: '0.35rem' }}>
              <span className="giant-currency-symbol" style={{ fontSize: '1.4rem' }}>{config.currency}</span>
              <input
                ref={amountInputRef}
                type="number"
                step="any"
                placeholder="0"
                className="giant-amount-input"
                style={{ fontSize: '1.6rem' }}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
              />
              {amount && (
                <button
                  type="button"
                  style={{ color: 'var(--text-muted)', padding: '0.2rem' }}
                  onClick={() => setAmount('')}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Quick Amount Presets */}
            <div className="amount-presets-row" style={{ marginBottom: '0.5rem' }}>
              {[100, 200, 500, 1000, 2000, 5000].map(preset => (
                <button
                  key={preset}
                  type="button"
                  className="preset-chip"
                  style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
                  onClick={() => handleAddPreset(preset)}
                >
                  +{formatCurrency(preset, config.currency)}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Payment Method Options: Cash, UPI, RTGS */}
          <div style={{ marginBottom: '0.55rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem' }}>
              <button
                key="cash"
                type="button"
                className={`method-chip ${paymentMethod === 'cash' ? 'active' : ''}`}
                style={{
                  padding: '0.45rem 0.35rem',
                  border: paymentMethod === 'cash' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                  background: paymentMethod === 'cash' ? '#f0fdf4' : '#ffffff',
                  color: paymentMethod === 'cash' ? '#16a34a' : '#475569',
                }}
                onClick={() => setPaymentMethod('cash')}
              >
                <Banknote size={17} style={{ color: '#16a34a' }} />
                <span style={{ fontSize: '0.775rem', fontWeight: 800 }}>Cash</span>
              </button>

              <button
                key="upi"
                type="button"
                className={`method-chip ${paymentMethod === 'upi' ? 'active' : ''}`}
                style={{
                  padding: '0.45rem 0.35rem',
                  border: paymentMethod === 'upi' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  background: paymentMethod === 'upi' ? '#eff6ff' : '#ffffff',
                  color: paymentMethod === 'upi' ? '#2563eb' : '#475569',
                }}
                onClick={() => setPaymentMethod('upi')}
              >
                <QrCode size={17} style={{ color: '#2563eb' }} />
                <span style={{ fontSize: '0.775rem', fontWeight: 800 }}>UPI</span>
              </button>

              <button
                key="rtgs"
                type="button"
                className={`method-chip ${paymentMethod === 'rtgs' ? 'active' : ''}`}
                style={{
                  padding: '0.45rem 0.35rem',
                  border: paymentMethod === 'rtgs' ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                  background: paymentMethod === 'rtgs' ? '#f5f3ff' : '#ffffff',
                  color: paymentMethod === 'rtgs' ? '#7c3aed' : '#475569',
                }}
                onClick={() => setPaymentMethod('rtgs')}
              >
                <Building size={17} style={{ color: '#7c3aed' }} />
                <span style={{ fontSize: '0.775rem', fontWeight: 800 }}>RTGS</span>
              </button>
            </div>
          </div>

          {/* 6. UPI / ONLINE ACCOUNT (Appears cleanly when UPI is selected) */}
          {paymentMethod === 'upi' && (
            <div ref={upiContainerRef} style={{ position: 'relative', marginBottom: '0.55rem' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 2rem 0.4rem 0.65rem', fontWeight: 600, background: '#eff6ff', border: '1px solid #bfdbfe' }}
                  placeholder="Which UPI Account? (e.g. name@iob, axis@upi)"
                  value={upiAccount}
                  onChange={e => {
                    setUpiAccount(e.target.value);
                    setIsUpiDropdownOpen(true);
                  }}
                  onFocus={() => setIsUpiDropdownOpen(true)}
                />
                <button
                  type="button"
                  style={{
                    position: 'absolute',
                    right: '0.65rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#3b82f6',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onClick={() => setIsUpiDropdownOpen(!isUpiDropdownOpen)}
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              {/* UPI Dropdown */}
              {isUpiDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '0.2rem',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
                    zIndex: 70,
                    maxHeight: '160px',
                    overflowY: 'auto',
                  }}
                >
                  {filteredUpiAccounts.map(acc => (
                    <div
                      key={acc}
                      style={{
                        padding: '0.45rem 0.75rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#0f172a',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f1f5f9',
                        background: upiAccount.toLowerCase() === acc.toLowerCase() ? '#eff6ff' : 'transparent',
                      }}
                      onClick={() => {
                        setUpiAccount(acc);
                        setIsUpiDropdownOpen(false);
                      }}
                    >
                      {acc}
                    </div>
                  ))}

                  {upiAccount.trim() && !isExactUpiMatch && (
                    <div
                      style={{
                        padding: '0.45rem 0.75rem',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: '#2563eb',
                        cursor: 'pointer',
                        background: '#eff6ff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                      onClick={() => {
                        setIsUpiDropdownOpen(false);
                      }}
                    >
                      <Plus size={13} />
                      <span>Add new "{upiAccount.trim()}"</span>
                    </div>
                  )}

                  {filteredUpiAccounts.length === 0 && !upiAccount.trim() && (
                    <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                      Type account or UPI ID to save it
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 7. Action Buttons: Delete (if editing) & Save */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.4rem' }}>
            {editingTransaction && (
              <button
                type="button"
                style={{
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  borderRadius: '8px',
                  border: '1px solid #fecaca',
                  background: '#fef2f2',
                  color: '#dc2626',
                  cursor: 'pointer',
                }}
                onClick={handleDeleteCurrent}
                title="Delete this entry"
              >
                <Trash2 size={15} />
                <span>Delete</span>
              </button>
            )}

            <button
              type="submit"
              className={`btn-save-transaction ${type}`}
              style={{
                flex: 1,
                padding: '0.65rem',
                fontSize: '0.925rem',
                fontWeight: 800,
                background: type === 'income' ? '#16a34a' : '#dc2626',
                boxShadow: 'none',
              }}
            >
              <Check size={16} />
              <span>SAVE ({formatCurrency(parseFloat(amount) || 0, config.currency)})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
