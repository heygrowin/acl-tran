import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import type { TransactionType } from '../types';
import {
  X,
  Check,
  Trash2,
  ChevronDown,
  Plus,
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
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    showToast,
    editingTransaction,
    selectedDate,
    addCategory,
    addUpiAccount,
    selectedMember,
    currentScreen,
  } = useApp();

  const isEmployeeUser = currentScreen === 'employee' || (selectedMember && selectedMember !== 'Admin / Owner');

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
  );

  // Check if this modal is for Admin entry (e.g. opened from Summary / Admin Transaction Log or editing an Admin transaction)
  const isAdminEntry =
    !isEmployeeUser &&
    ((editingTransaction && ['ADMIN', 'ADMIN / OWNER', 'OWNER'].includes((editingTransaction.staffName || '').trim().toUpperCase())) ||
      (initialStaff && ['ADMIN', 'ADMIN / OWNER', 'OWNER'].includes(initialStaff.trim().toUpperCase())) ||
      initialStaff === 'ADMIN');

  const defaultStaff = isEmployeeUser
    ? (selectedMember || 'KRISHNA')
    : (isAdminEntry ? 'ADMIN' : (initialStaff || 'KRISHNA'));

  // Modal type is locked to Receive (income) or Expense (expense) without internal switching
  const entryType: TransactionType = editingTransaction ? editingTransaction.type : initialType;
  const isReceive = entryType === 'income';

  const [staffName, setStaffName] = useState<string>(defaultStaff);
  const [category, setCategory] = useState<string>(''); // Head in UI
  const [note, setNote] = useState<string>(''); // Remark in UI
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [upiAccount, setUpiAccount] = useState<string>('');

  // Dropdown / Autosuggest state for Head & Account
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);

  // In-modal Animated Success Popup State
  const [successInfo, setSuccessInfo] = useState<{
    show: boolean;
    amount: number;
    staff: string;
    head: string;
    method: string;
  } | null>(null);

  const categoryContainerRef = useRef<HTMLDivElement>(null);
  const accountContainerRef = useRef<HTMLDivElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const remarkInputRef = useRef<HTMLInputElement>(null);
  const headInputRef = useRef<HTMLInputElement>(null);
  const accountInputRef = useRef<HTMLInputElement>(null);

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

  // Custom and existing Bank / UPI Accounts (dynamic from config and transaction history)
  const transactionAccounts = (transactions || [])
    .map(t => (t.paymentAccount || '').trim())
    .filter(a => a && !['Shop QR', 'PhonePe QR', 'Paytm QR', 'Bank QR', 'Bank UPI', 'PhonePe', 'GPay', 'Paytm', 'RUPAY'].includes(a));

  const configAccounts = (config.upiAccounts || []).filter(
    (a: string) => !['Shop QR', 'PhonePe QR', 'Paytm QR', 'Bank QR', 'Bank UPI', 'PhonePe', 'GPay', 'Paytm', 'RUPAY'].includes(a)
  );

  const existingAccounts = Array.from(new Set([...configAccounts, ...transactionAccounts]));

  const filteredAccounts = existingAccounts.filter(acc =>
    acc.toLowerCase().includes(upiAccount.trim().toLowerCase())
  );

  const isExactAccountMatch = existingAccounts.some(
    acc => acc.toLowerCase() === upiAccount.trim().toLowerCase()
  );

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
    setIsAccountDropdownOpen(false);
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
      if (accountContainerRef.current && !accountContainerRef.current.contains(e.target as Node)) {
        setIsAccountDropdownOpen(false);
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
    const upper = headName.toUpperCase();
    if (upper.includes('CASH IN HAND')) {
      setPaymentMethod('cash');
    } else if (upper.includes('RTGS') || upper.includes('BANK')) {
      setPaymentMethod('rtgs');
    } else if (upper.startsWith('UPI')) {
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
    if (method === 'cash') {
      setIsAccountDropdownOpen(false);
    } else {
      setTimeout(() => {
        accountInputRef.current?.focus();
        setIsAccountDropdownOpen(true);
      }, 50);
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
    if (paymentMethod === 'upi' || paymentMethod === 'rtgs') {
      const cleanAcc = upiAccount.trim();
      if (cleanAcc) {
        finalPaymentAccount = cleanAcc;
        addUpiAccount(cleanAcc);
      }
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
        method: finalPaymentAccount ? `${paymentMethod.toUpperCase()} (${finalPaymentAccount})` : paymentMethod.toUpperCase(),
      });

      // Auto-hide success popup after 2.6 seconds
      setTimeout(() => {
        setSuccessInfo(prev => (prev?.amount === finalAmount ? null : prev));
      }, 2600);

      // RESET FORM FOR CONTINUOUS FAST ENTRY WITHOUT CLOSING MODAL
      setAmount('');
      setNote('');
      setCategory('');
      setIsCategoryDropdownOpen(false);
      setIsAccountDropdownOpen(false);

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
          {/* 2. USRE / Staff Member Selection Row */}
          {isEmployeeUser ? (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '0.4rem 0.65rem',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#334155' }}>USER :</span>
                <span
                  style={{
                    background: themeColor,
                    color: '#000000',
                    fontWeight: 900,
                    fontSize: '0.775rem',
                    padding: '0.15rem 0.55rem',
                    borderRadius: '4px',
                    border: '1.5px solid #000000',
                  }}
                >
                  {selectedMember.toUpperCase()}
                </span>
              </div>
              <span style={{ fontSize: '0.675rem', color: '#64748b', fontWeight: 600 }}>Active Counter</span>
            </div>
          ) : isAdminEntry ? (
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

            {/* Account / UPI / Bank Selection Row (Visible for UPI & RTGS) */}
            {paymentMethod !== 'cash' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div ref={accountContainerRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                    Account:
                  </div>

                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      ref={accountInputRef}
                      type="text"
                      style={{
                        width: '100%',
                        padding: '0.45rem 2rem 0.45rem 1rem',
                        borderRadius: '9999px',
                        border: '1.8px solid #000000',
                        background: '#ffffff',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: '#000000',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                      placeholder={paymentMethod === 'rtgs' ? 'Bank A/c (e.g. ansh@iob, SBI 4012)' : 'Account / UPI (e.g. ansh@iob, @IOB)'}
                      value={upiAccount}
                      onChange={e => {
                        setUpiAccount(e.target.value);
                        setIsAccountDropdownOpen(true);
                      }}
                      onFocus={() => setIsAccountDropdownOpen(true)}
                    />

                    <button
                      type="button"
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#000000',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                    >
                      <ChevronDown size={15} strokeWidth={2.5} />
                    </button>

                    {/* Auto-suggest Dropdown */}
                    {isAccountDropdownOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          marginTop: '4px',
                          background: '#ffffff',
                          border: '1.8px solid #000000',
                          borderRadius: '8px',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                          zIndex: 90,
                          maxHeight: '160px',
                          overflowY: 'auto',
                        }}
                      >
                        {filteredAccounts.map(acc => (
                          <div
                            key={acc}
                            style={{
                              padding: '0.45rem 0.75rem',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              borderBottom: '1px solid #f1f5f9',
                              background: upiAccount.toLowerCase() === acc.toLowerCase() ? '#e2e8f0' : '#ffffff',
                              color: '#000000',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                            onClick={() => {
                              setUpiAccount(acc);
                              setIsAccountDropdownOpen(false);
                            }}
                          >
                            <span>{acc}</span>
                            {upiAccount.toLowerCase() === acc.toLowerCase() && (
                              <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 900 }}>✓ Selected</span>
                            )}
                          </div>
                        ))}

                        {upiAccount.trim() && !isExactAccountMatch && (
                          <div
                            style={{
                              padding: '0.45rem 0.75rem',
                              fontSize: '0.8rem',
                              fontWeight: 800,
                              color: '#1d4ed8',
                              cursor: 'pointer',
                              background: '#eff6ff',
                              borderTop: '1px solid #bfdbfe',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}
                            onClick={() => {
                              setIsAccountDropdownOpen(false);
                            }}
                          >
                            <Plus size={14} strokeWidth={2.5} />
                            <span>Add new "{upiAccount.trim()}"</span>
                          </div>
                        )}

                        {filteredAccounts.length === 0 && !upiAccount.trim() && (
                          <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                            Type account code or UPI ID (e.g. ansh@iob) to save it
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Account Chips */}
                {existingAccounts.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.25rem',
                      flexWrap: 'wrap',
                      paddingLeft: '79px',
                      marginTop: '0.1rem',
                    }}
                  >
                    {existingAccounts.map(accName => {
                      const isSelected = upiAccount.trim().toLowerCase() === accName.trim().toLowerCase();
                      return (
                        <button
                          key={accName}
                          type="button"
                          style={{
                            background: isSelected ? '#000000' : '#e2e8f0',
                            color: isSelected ? '#ffffff' : '#0f172a',
                            border: isSelected ? '1.5px solid #000000' : '1px solid #cbd5e1',
                            borderRadius: '9999px',
                            padding: '0.15rem 0.55rem',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'all 0.12s ease',
                          }}
                          onClick={() => {
                            setUpiAccount(accName);
                            setIsAccountDropdownOpen(false);
                          }}
                        >
                          {accName}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
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
                }}
              >
                <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#000000', textTransform: 'uppercase' }}>
                  CASH MODE ACTIVE
                </div>
              </div>
            )}
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
