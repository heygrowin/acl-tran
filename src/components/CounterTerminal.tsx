import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import type { TransactionType } from '../types';
import {
  X,
  Check,
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

  // All available counter staff members (counters strictly for cashiers/counters)
  const defaultStaffList = ['KRISHNA', 'NAVIN', 'SUNIL', 'ANAY', 'SONAM', 'OTHER'];
  const configStaff = (config.staffMembers || []).filter(
    s => s !== 'Admin / Owner' && s !== 'ADMIN / OWNER' && s !== 'ADMIN' && s !== 'Owner' && s !== 'OWNER'
  );
  const counterStaff = (counters || []).map(c => c.name).filter(
    s => s !== 'Admin / Owner' && s !== 'ADMIN / OWNER' && s !== 'ADMIN' && s !== 'Owner' && s !== 'OWNER'
  );
  
  const allStaffOptions = Array.from(
    new Set([...defaultStaffList, ...configStaff, ...counterStaff])
  ).filter(s => s && s.trim() !== '');

  // Check if this modal is for Admin entry (e.g. opened from Summary / Admin Transaction Log or editing an Admin transaction)
  const isAdminEntry =
    (editingTransaction && ['ADMIN', 'ADMIN / OWNER', 'OWNER'].includes((editingTransaction.staffName || '').trim().toUpperCase())) ||
    (initialStaff && ['ADMIN', 'ADMIN / OWNER', 'OWNER'].includes(initialStaff.trim().toUpperCase())) ||
    initialStaff === 'ADMIN';

  const defaultStaff = isAdminEntry
    ? 'ADMIN'
    : (initialStaff || (selectedMember && selectedMember !== 'Admin / Owner' ? selectedMember : 'KRISHNA'));

  // Modal type is locked to Receive (income) or Expense (expense) without internal switching
  const entryType: TransactionType = editingTransaction ? editingTransaction.type : initialType;
  const isReceive = entryType === 'income';

  const [staffName, setStaffName] = useState<string>(defaultStaff);
  const [category, setCategory] = useState<string>(''); // Head in UI
  const [note, setNote] = useState<string>(''); // Remark in UI
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [upiAccount, setUpiAccount] = useState<string>('');

  // Dropdown / Autosuggest state for Head
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  // In-modal Animated Success Popup State
  const [successInfo, setSuccessInfo] = useState<{
    show: boolean;
    amount: number;
    staff: string;
    head: string;
    method: string;
  } | null>(null);

  const categoryContainerRef = useRef<HTMLDivElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const remarkInputRef = useRef<HTMLInputElement>(null);
  const headInputRef = useRef<HTMLInputElement>(null);

  // Default Quick Chips from Mockups
  const counterReceiveQuickHeads = ['LAB WORK', 'GOODS', 'ID CARD', 'OTHER )', 'CASH IN HAND'];
  const counterExpenseQuickHeads = ['TEATRANSPORT', 'FOOD', 'PARSAL', 'BANK (RTGS)', 'CASH IN HAND'];

  const adminReceiveQuickHeads = ['DEPOSIT', 'CAPITAL', 'LOAN RETURN', 'BANK TRANSFER', 'CASH IN HAND', 'OTHER'];
  const adminExpenseQuickHeads = ['WITHDRAWAL', 'PERSONAL EXPENSE', 'OFFICE EXPENSE', 'SALARY', 'BANK (RTGS)', 'CASH IN HAND'];

  const quickHeadChips = isAdminEntry
    ? (isReceive ? adminReceiveQuickHeads : adminExpenseQuickHeads)
    : (isReceive ? counterReceiveQuickHeads : counterExpenseQuickHeads);

  // Custom and existing categories
  const allCategories = isAdminEntry
    ? (isReceive
        ? Array.from(new Set([...adminReceiveQuickHeads, ...(config.incomeCategories || [])]))
        : Array.from(new Set([...adminExpenseQuickHeads, ...(config.expenseCategories || [])])))
    : (isReceive
        ? Array.from(new Set([...counterReceiveQuickHeads, ...(config.incomeCategories || [])]))
        : Array.from(new Set([...counterExpenseQuickHeads, ...(config.expenseCategories || [])])));

  const filteredCategories = allCategories.filter(c =>
    c.toLowerCase().includes(category.trim().toLowerCase())
  );

  const existingUpiAccounts = (config.upiAccounts || []).filter(
    (a: string) => !['Shop QR', 'PhonePe QR', 'Paytm QR', 'Bank QR', 'Bank UPI'].includes(a)
  );

  // Preset UPI accounts
  const defaultUpiOptions = ['Shop QR', 'PhonePe', 'GPay', 'Paytm', 'RUPAY', ...existingUpiAccounts];

  // Sync state on open or when editing
  useEffect(() => {
    if (editingTransaction) {
      setStaffName(editingTransaction.staffName || (isAdminEntry ? 'ADMIN' : defaultStaff));
      setCategory(editingTransaction.category || '');
      setNote(editingTransaction.note || '');
      setAmount(editingTransaction.amount ? editingTransaction.amount.toString() : '');
      setPaymentMethod(editingTransaction.paymentMethod || 'cash');
      setUpiAccount(editingTransaction.paymentAccount || '');
    } else {
      setStaffName(isAdminEntry ? 'ADMIN' : (initialStaff || (selectedMember && selectedMember !== 'Admin / Owner' ? selectedMember : 'KRISHNA')));
      setCategory('');
      setNote('');
      setAmount('');
      setPaymentMethod('cash');
      setUpiAccount('');
    }
    setIsCategoryDropdownOpen(false);
    setSuccessInfo(null);
  }, [isOpen, initialType, initialStaff, editingTransaction, config, selectedMember, isAdminEntry]);

  // Focus amount input on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        amountInputRef.current?.focus();
      }, 70);
      return () => clearTimeout(timer);
    }
  }, [isOpen, entryType]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (categoryContainerRef.current && !categoryContainerRef.current.contains(e.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

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

  const handleHeadChipClick = (headName: string) => {
    setCategory(headName);
    if (headName.toUpperCase().includes('CASH IN HAND')) {
      setPaymentMethod('cash');
    } else if (headName.toUpperCase().includes('RTGS')) {
      setPaymentMethod('rtgs');
    } else if (headName.toUpperCase().startsWith('UPI')) {
      setPaymentMethod('upi');
    }
    setIsCategoryDropdownOpen(false);
    // Move focus to amount if empty
    if (!amount) {
      amountInputRef.current?.focus();
    }
  };

  const handlePaymentMethodSelect = (method: string) => {
    setPaymentMethod(method);
    if (method === 'upi' && !upiAccount) {
      setUpiAccount('Shop QR');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = parseFloat(amount) || 0;

    if (finalAmount <= 0) {
      alert('Please enter a valid amount');
      amountInputRef.current?.focus();
      return;
    }

    const typedCategory = category.trim();
    const finalCategory = typedCategory || (isAdminEntry ? (isReceive ? 'Deposit' : 'Withdrawal') : (isReceive ? 'Receive' : 'Expense'));

    if (
      typedCategory &&
      !['receive', 'income', 'expense', 'deposit', 'withdrawal'].includes(typedCategory.toLowerCase())
    ) {
      addCategory(entryType, typedCategory);
    }

    let finalPaymentAccount: string | undefined = undefined;
    if (paymentMethod === 'upi') {
      finalPaymentAccount = upiAccount.trim() || 'UPI';
      addUpiAccount(finalPaymentAccount);
    }

    const sanitizedStaff = isAdminEntry ? 'ADMIN' : (staffName.trim() || 'KRISHNA');

    if (editingTransaction && editingTransaction.id) {
      // Update existing transaction
      updateTransaction({
        ...editingTransaction,
        type: entryType,
        amount: finalAmount,
        paymentMethod,
        paymentAccount: finalPaymentAccount,
        category: finalCategory,
        note: note.trim() || undefined,
        staffName: sanitizedStaff,
      });

      showToast(`✓ Updated ${isAdminEntry ? 'Admin ' : ''}${isReceive ? 'Receive' : 'Expense'}: ${formatCurrency(finalAmount, config.currency)}`);
      onClose();
    } else {
      // Add new transaction
      addTransaction({
        businessId: config.id,
        date: selectedDate || getTodayDateString(),
        time: getCurrentTimeString(),
        type: entryType,
        amount: finalAmount,
        paymentMethod,
        paymentAccount: finalPaymentAccount,
        category: finalCategory,
        note: note.trim() || undefined,
        staffName: sanitizedStaff,
      });

      // Show animated success feedback inside the modal
      setSuccessInfo({
        show: true,
        amount: finalAmount,
        staff: isAdminEntry ? 'Admin (Logged to Admin Log)' : sanitizedStaff,
        head: finalCategory,
        method: paymentMethod.toUpperCase(),
      });

      // Auto-hide success popup after 2.6 seconds
      setTimeout(() => {
        setSuccessInfo(prev => (prev?.amount === finalAmount ? null : prev));
      }, 2600);

      // RESET FORM FOR CONTINUOUS FAST ENTRY WITHOUT CLOSING MODAL
      setAmount('');
      setNote('');
      setCategory('');

      // Auto re-focus amount input so user can type next entry immediately
      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 50);
    }
  };

  const handleDeleteCurrent = () => {
    if (editingTransaction && editingTransaction.id) {
      const isCashInHand = (editingTransaction.category || '').trim().toUpperCase() === 'CASH IN HAND';
      const label = isCashInHand ? 'Cash in Hand entry' : `${entryType.toUpperCase()} entry`;
      if (confirm(`Delete this ${label} of ${formatCurrency(editingTransaction.amount, config.currency)}?`)) {
        deleteTransaction(editingTransaction.id);
        showToast(`${label} deleted`);
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  // Theme colors matching mockups
  const themeColor = isReceive ? '#59d646' : '#ff6358'; // Bright green vs coral red
  const themeBorder = isReceive ? '#42bf30' : '#ea4e43';

  return (
    <div className="modal-overlay custom-entry-modal-overlay" onClick={onClose}>
      <div
        className="custom-entry-modal animate-scale-in"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '430px',
          background: '#ffffff',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.22), 0 2px 8px rgba(0, 0, 0, 0.1)',
          border: `2px solid ${themeBorder}`,
          position: 'relative',
        }}
      >
        {/* Animated In-Modal Success Indicator Popup */}
        {successInfo && successInfo.show && (
          <div
            className="entry-success-banner animate-bounce-in"
            style={{
              position: 'absolute',
              top: '56px',
              left: '12px',
              right: '12px',
              zIndex: 100,
              background: '#0f172a',
              color: '#ffffff',
              borderRadius: '12px',
              padding: '0.65rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
              border: `2px solid ${themeColor}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: themeColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#000000',
                }}
              >
                <Check size={18} strokeWidth={3} />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff' }}>
                  ✓ Entry Saved Successfully!
                </div>
                <div style={{ fontSize: '0.725rem', color: '#94a3b8' }}>
                  <span style={{ color: themeColor, fontWeight: 700 }}>
                    {formatCurrency(successInfo.amount, config.currency)}
                  </span>
                  {' • '}{successInfo.staff}{' • '}{successInfo.head} ({successInfo.method})
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSuccessInfo(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '0.2rem',
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* 1. Header Banner (Receive Entry in Green vs Expense Entry in Coral Red) */}
        <div
          style={{
            background: themeColor,
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: '1.45rem',
              fontWeight: 900,
              color: '#000000',
              letterSpacing: '-0.02em',
              textAlign: 'center',
              textTransform: 'none',
            }}
          >
            {editingTransaction
              ? `Edit ${isReceive ? 'Receive' : 'Expense'}${isAdminEntry ? ' (Admin)' : ''}`
              : isAdminEntry
                ? `Admin ${isReceive ? 'Receive / Deposit' : 'Expense / Withdrawal'}`
                : isReceive
                  ? 'Receive Entry'
                  : 'Expense Entry'}
          </h1>

          {/* Close X Button in top right */}
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: 'rgba(0, 0, 0, 0.15)',
              border: 'none',
              color: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Close (Esc)"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '0.9rem 1rem 1rem' }}>
          {/* 2. USRE / Staff Member Selection Row (HIDDEN for Admin entries) */}
          {isAdminEntry ? (
            <div
              style={{
                background: isReceive ? '#ecfdf5' : '#fef2f2',
                border: `1.5px solid ${isReceive ? '#10b981' : '#ef4444'}`,
                borderRadius: '8px',
                padding: '0.45rem 0.75rem',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span
                  style={{
                    background: isReceive ? '#10b981' : '#ef4444',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '0.72rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    letterSpacing: '0.02em',
                  }}
                >
                  ADMIN ENTRY
                </span>
                <span style={{ fontSize: '0.76rem', fontWeight: 800, color: isReceive ? '#065f46' : '#991b1b' }}>
                  {isReceive ? 'Treasury / Personal Deposit' : 'Drawer / Personal Withdrawal'}
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  color: '#475569',
                  background: '#ffffff',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '4px',
                  border: '1px solid #e2e8f0',
                }}
              >
                Admin Log
              </span>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
                marginBottom: '0.75rem',
              }}
            >
              {/* USRE Label Pill */}
              <div
                style={{
                  background: themeColor,
                  color: '#000000',
                  fontWeight: 900,
                  fontSize: '0.78rem',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  minWidth: '64px',
                  textAlign: 'center',
                  letterSpacing: '0.02em',
                }}
              >
                USRE :
              </div>

              {/* Staff Grid Buttons */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '0.35rem',
                  flex: 1,
                }}
              >
                {allStaffOptions.map(sName => {
                  const isSelected = staffName.trim().toLowerCase() === sName.trim().toLowerCase();
                  return (
                    <button
                      key={sName}
                      type="button"
                      style={{
                        background: themeColor,
                        color: '#000000',
                        border: isSelected ? '2.5px solid #000000' : '1px solid rgba(0,0,0,0.15)',
                        borderRadius: '4px',
                        padding: '0.35rem 0.2rem',
                        fontSize: '0.725rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        textAlign: 'center',
                        boxShadow: isSelected ? '0 2px 5px rgba(0,0,0,0.25)' : 'none',
                        transform: isSelected ? 'scale(1.02)' : 'none',
                        transition: 'all 0.12s ease',
                        outline: 'none',
                      }}
                      onClick={() => setStaffName(sName)}
                    >
                      {sName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Quick Head Chips (Gray capsules matching mockup) */}
          <div
            style={{
              display: 'flex',
              gap: '0.35rem',
              flexWrap: 'wrap',
              justifyContent: 'center',
              marginBottom: '0.85rem',
              padding: '0.1rem 0',
            }}
          >
            {quickHeadChips.map(chipName => {
              const isSelected = category.trim().toLowerCase() === chipName.trim().toLowerCase();
              return (
                <button
                  key={chipName}
                  type="button"
                  style={{
                    background: isSelected ? '#1e293b' : '#d6d9dc',
                    color: isSelected ? '#ffffff' : '#000000',
                    border: isSelected ? '1.5px solid #000000' : '1px solid #cbd5e1',
                    borderRadius: '9999px',
                    padding: '0.3rem 0.75rem',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                    transition: 'all 0.12s ease',
                  }}
                  onClick={() => handleHeadChipClick(chipName)}
                >
                  {chipName}
                </button>
              );
            })}
          </div>

          {/* 4. Form Fields: Head, REMARK, AMOUNT (Pill label on left + Stadium input on right) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '0.85rem' }}>
            {/* ROW 1: Head: */}
            <div ref={categoryContainerRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  background: themeColor,
                  color: '#000000',
                  fontWeight: 900,
                  fontSize: '0.78rem',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '9999px',
                  width: '74px',
                  textAlign: 'center',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  flexShrink: 0,
                }}
              >
                Head:
              </div>

              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  ref={headInputRef}
                  type="text"
                  style={{
                    width: '100%',
                    padding: '0.45rem 1rem',
                    borderRadius: '9999px',
                    border: '1.8px solid #000000',
                    background: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#000000',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  placeholder={
                    isAdminEntry
                      ? (isReceive ? 'Head (e.g. DEPOSIT, CAPITAL)' : 'Head (e.g. WITHDRAWAL, PERSONAL)')
                      : (isReceive ? 'Head (e.g. LAB WORK, GOODS)' : 'Head (e.g. TEATRANSPORT, FOOD)')
                  }
                  value={category}
                  onChange={e => {
                    setCategory(e.target.value);
                    setIsCategoryDropdownOpen(true);
                  }}
                  onFocus={() => setIsCategoryDropdownOpen(true)}
                />

                {/* Dropdown Suggestions */}
                {isCategoryDropdownOpen && filteredCategories.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      background: '#ffffff',
                      border: '1.5px solid #000000',
                      borderRadius: '8px',
                      boxShadow: '0 10px 20px rgba(0,0,0,0.15)',
                      zIndex: 80,
                      maxHeight: '140px',
                      overflowY: 'auto',
                    }}
                  >
                    {filteredCategories.map(cat => (
                      <div
                        key={cat}
                        style={{
                          padding: '0.4rem 0.75rem',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          borderBottom: '1px solid #f1f5f9',
                          background: category.toLowerCase() === cat.toLowerCase() ? '#e2e8f0' : 'transparent',
                        }}
                        onClick={() => {
                          handleHeadChipClick(cat);
                          setIsCategoryDropdownOpen(false);
                        }}
                      >
                        {cat}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ROW 2: REMARK */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  background: themeColor,
                  color: '#000000',
                  fontWeight: 900,
                  fontSize: '0.78rem',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '9999px',
                  width: '74px',
                  textAlign: 'center',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  flexShrink: 0,
                }}
              >
                REMARK
              </div>

              <input
                ref={remarkInputRef}
                type="text"
                style={{
                  width: '100%',
                  padding: '0.45rem 1rem',
                  borderRadius: '9999px',
                  border: '1.8px solid #000000',
                  background: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#000000',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                placeholder="Remark / Description / Phone (Optional)"
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>

            {/* ROW 3: AMOUNT */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  background: themeColor,
                  color: '#000000',
                  fontWeight: 900,
                  fontSize: '0.78rem',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '9999px',
                  width: '74px',
                  textAlign: 'center',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  flexShrink: 0,
                }}
              >
                AMOUNT
              </div>

              <div style={{ position: 'relative', flex: 1 }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '1.1rem',
                    fontWeight: 900,
                    color: '#000000',
                    pointerEvents: 'none',
                  }}
                >
                  ₹
                </span>
                <input
                  ref={amountInputRef}
                  type="number"
                  step="any"
                  style={{
                    width: '100%',
                    padding: '0.45rem 1rem 0.45rem 2.2rem',
                    borderRadius: '9999px',
                    border: '1.8px solid #000000',
                    background: '#ffffff',
                    fontSize: '1.25rem',
                    fontWeight: 900,
                    color: '#000000',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  placeholder="0"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* 5. Payment Methods (CASH, RTGS, UPI rounded pill/circle buttons) */}
          <div style={{ marginBottom: '0.65rem' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.5rem',
                marginBottom: '0.5rem',
              }}
            >
              {[
                { id: 'cash', label: 'CASH' },
                { id: 'rtgs', label: 'RTGS' },
                { id: 'upi', label: 'UPI' },
              ].map(m => {
                const isSelected = paymentMethod.toLowerCase() === m.id.toLowerCase();
                return (
                  <button
                    key={m.id}
                    type="button"
                    style={{
                      background: themeColor,
                      color: '#000000',
                      border: isSelected ? '2.5px solid #000000' : '1px solid rgba(0,0,0,0.15)',
                      borderRadius: '9999px',
                      padding: '0.55rem 0.2rem',
                      fontSize: '0.82rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 3px 6px rgba(0,0,0,0.25)' : '0 1px 2px rgba(0,0,0,0.06)',
                      transform: isSelected ? 'scale(1.04)' : 'none',
                      transition: 'all 0.12s ease',
                      textAlign: 'center',
                    }}
                    onClick={() => handlePaymentMethodSelect(m.id)}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>

            {/* Horizontal Stadium Bar matching mockup (Expands when UPI is selected) */}
            <div
              style={{
                background: themeColor,
                borderRadius: '9999px',
                minHeight: '26px',
                padding: '0.2rem 0.65rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                marginBottom: '0.65rem',
              }}
            >
              {paymentMethod === 'upi' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', width: '100%', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#000000' }}>UPI:</span>
                  <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto', padding: '0.1rem 0' }}>
                    {defaultUpiOptions.slice(0, 4).map(uName => (
                      <button
                        key={uName}
                        type="button"
                        style={{
                          background: upiAccount === uName ? '#000000' : '#ffffff',
                          color: upiAccount === uName ? '#ffffff' : '#000000',
                          border: 'none',
                          borderRadius: '9999px',
                          padding: '0.15rem 0.5rem',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                        onClick={() => setUpiAccount(uName)}
                      >
                        {uName}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#000000', textTransform: 'uppercase' }}>
                  {paymentMethod} MODE ACTIVE
                </div>
              )}
            </div>
          </div>

          {/* 6. Action Buttons: Delete (if editing) & Big Red SAVE Button */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.35rem' }}>
            {editingTransaction && (
              <button
                type="button"
                style={{
                  padding: '0.75rem 1rem',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  borderRadius: '9999px',
                  border: '1.5px solid #dc2626',
                  background: '#fef2f2',
                  color: '#dc2626',
                  cursor: 'pointer',
                }}
                onClick={handleDeleteCurrent}
                title="Delete this entry"
              >
                <Trash2 size={16} />
                <span>Delete</span>
              </button>
            )}

            <button
              type="submit"
              style={{
                flex: 1,
                background: '#ff2c2c',
                color: '#ffffff',
                border: 'none',
                borderRadius: '9999px',
                padding: '0.8rem',
                fontSize: '1.35rem',
                fontWeight: 900,
                letterSpacing: '0.03em',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(255, 44, 44, 0.35), 0 2px 4px rgba(0,0,0,0.1)',
                transition: 'all 0.12s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
              }}
              className="btn-custom-save-red"
            >
              <span>SAVE</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
