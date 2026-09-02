import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { LoanRecord, LoanEntryItem } from '../types';
import {
  HandCoins,
  ArrowDownLeft,
  Phone,
  MessageCircle,
  Trash2,
  Check,
  X,
  Search,
  Banknote,
  QrCode,
  Building,
  Calendar,
  User,
  History,
  PlusCircle,
  ChevronRight,
  Edit2,
  Pencil
} from 'lucide-react';
import { formatCurrency, formatDDMMYYYY, getTodayDateString } from '../services/storageService';

export const LoanManager: React.FC = () => {
  const { loans, transactions, giveLoan, repayLoan, updateLoan, deleteLoan, updateTransaction, deleteTransaction, config, selectedDate } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  
  // Give Loan Modal State
  const [isGiveModalOpen, setIsGiveModalOpen] = useState(false);
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowerPhone, setBorrowerPhone] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanDate, setLoanDate] = useState(getTodayDateString());
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loanNote, setLoanNote] = useState('');
  const [showBorrowerSuggestions, setShowBorrowerSuggestions] = useState(false);

  // Repay Modal State
  const [selectedLoanForRepay, setSelectedLoanForRepay] = useState<LoanRecord | null>(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayDate, setRepayDate] = useState(getTodayDateString());
  const [repayMethod, setRepayMethod] = useState('cash');
  const [repayNote, setRepayNote] = useState('');

  // Detail Modal State (on clicking card)
  const [selectedLoanForDetail, setSelectedLoanForDetail] = useState<LoanRecord | null>(null);

  // Edit History Item Modal State
  const [editingHistoryItem, setEditingHistoryItem] = useState<{
    loan: LoanRecord;
    item: LoanEntryItem;
  } | null>(null);
  const [editItemType, setEditItemType] = useState<'given' | 'repayment'>('given');
  const [editItemAmount, setEditItemAmount] = useState('');
  const [editItemDate, setEditItemDate] = useState(getTodayDateString());
  const [editItemMethod, setEditItemMethod] = useState('cash');
  const [editItemNote, setEditItemNote] = useState('');

  // Edit Borrower Profile Modal State
  const [editingBorrowerProfile, setEditingBorrowerProfile] = useState<LoanRecord | null>(null);
  const [editBorrowerName, setEditBorrowerName] = useState('');
  const [editBorrowerPhone, setEditBorrowerPhone] = useState('');
  const [editBorrowerNote, setEditBorrowerNote] = useState('');

  const totalPendingLoan = loans.reduce((sum, l) => sum + (l.pendingAmount || 0), 0);
  const totalLentAll = loans.reduce((sum, l) => sum + (l.totalLent || 0), 0);
  const totalRepaidAll = loans.reduce((sum, l) => sum + (l.totalRepaid || 0), 0);

  // List of unique existing borrowers for autocomplete
  const existingBorrowers = useMemo(() => {
    const list: { name: string; phone?: string; pending: number; totalLent: number }[] = [];
    const seen = new Set<string>();
    loans.forEach(l => {
      const key = l.borrowerName.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          name: l.borrowerName.trim(),
          phone: l.borrowerPhone,
          pending: l.pendingAmount || 0,
          totalLent: l.totalLent || 0,
        });
      }
    });
    return list;
  }, [loans]);

  // Autocomplete filtered suggestions
  const borrowerSuggestions = useMemo(() => {
    if (!borrowerName.trim()) return existingBorrowers.slice(0, 5);
    const q = borrowerName.trim().toLowerCase();
    return existingBorrowers.filter(
      b => b.name.toLowerCase().includes(q) || (b.phone && b.phone.includes(q))
    );
  }, [borrowerName, existingBorrowers]);

  const filteredLoans = useMemo(() => {
    if (!searchTerm.trim()) return loans;
    const q = searchTerm.toLowerCase();
    return loans.filter(l => (
      l.borrowerName.toLowerCase().includes(q) ||
      (l.borrowerPhone && l.borrowerPhone.includes(q)) ||
      (l.notes && l.notes.toLowerCase().includes(q))
    ));
  }, [loans, searchTerm]);

  const handleOpenGive = (prefillName?: string, prefillPhone?: string) => {
    setBorrowerName(prefillName || '');
    setBorrowerPhone(prefillPhone || '');
    setLoanAmount('');
    setLoanDate(selectedDate || getTodayDateString());
    setPaymentMethod('cash');
    setLoanNote('');
    setShowBorrowerSuggestions(false);
    setIsGiveModalOpen(true);
  };

  const handleSelectBorrower = (b: { name: string; phone?: string }) => {
    setBorrowerName(b.name);
    if (b.phone) setBorrowerPhone(b.phone);
    setShowBorrowerSuggestions(false);
  };

  const handleSaveGive = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(loanAmount) || 0;
    if (!borrowerName.trim() || amt <= 0) {
      alert('Please enter borrower name and a valid amount');
      return;
    }
    giveLoan(
      borrowerName.trim(),
      borrowerPhone.trim(),
      amt,
      paymentMethod,
      loanNote.trim() || undefined,
      loanDate || getTodayDateString()
    );
    setIsGiveModalOpen(false);

    // If detail modal was open, refresh selected detail
    if (selectedLoanForDetail && selectedLoanForDetail.borrowerName.toLowerCase() === borrowerName.trim().toLowerCase()) {
      const updated = loans.find(l => l.borrowerName.toLowerCase() === borrowerName.trim().toLowerCase());
      if (updated) setSelectedLoanForDetail(updated);
    }
  };

  const handleOpenRepay = (loan: LoanRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedLoanForRepay(loan);
    setRepayAmount(loan.pendingAmount > 0 ? loan.pendingAmount.toString() : '');
    setRepayDate(selectedDate || getTodayDateString());
    setRepayMethod('cash');
    setRepayNote('');
  };

  const handleSaveRepay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanForRepay) return;
    const amt = parseFloat(repayAmount) || 0;
    if (amt <= 0) {
      alert('Please enter a valid repayment amount');
      return;
    }
    repayLoan(
      selectedLoanForRepay.id,
      amt,
      repayMethod,
      repayNote.trim() || undefined,
      repayDate || getTodayDateString()
    );
    setSelectedLoanForRepay(null);

    // If detail modal is open, refresh detail
    if (selectedLoanForDetail && selectedLoanForDetail.id === selectedLoanForRepay.id) {
      const updated = loans.find(l => l.id === selectedLoanForRepay.id);
      if (updated) setSelectedLoanForDetail(updated);
    }
  };

  const handleOpenEditItem = (loan: LoanRecord, item: LoanEntryItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingHistoryItem({ loan, item });
    setEditItemType(item.type);
    setEditItemAmount(item.amount ? item.amount.toString() : '');
    setEditItemDate(item.date || getTodayDateString());
    setEditItemMethod(item.paymentMethod || 'cash');
    setEditItemNote(item.notes || '');
  };

  const handleSaveEditItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHistoryItem) return;
    const { loan, item } = editingHistoryItem;
    const newAmt = parseFloat(editItemAmount) || 0;
    if (newAmt <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    // Ensure loan has history array
    const currentHistory = loan.history && loan.history.length > 0 ? [...loan.history] : getLoanTimeline(loan);
    const itemIndex = currentHistory.findIndex(h => h.id === item.id);

    const updatedItem: LoanEntryItem = {
      ...item,
      type: editItemType,
      amount: newAmt,
      date: editItemDate,
      paymentMethod: editItemMethod,
      notes: editItemNote.trim() || undefined,
    };

    if (itemIndex !== -1) {
      currentHistory[itemIndex] = updatedItem;
    } else {
      currentHistory.unshift(updatedItem);
    }

    const updatedLoan: LoanRecord = {
      ...loan,
      history: currentHistory,
    };

    const saved = updateLoan ? updateLoan(updatedLoan) : updatedLoan;

    // Also update any matching ledger transaction
    const matchingTx = (transactions || []).find(
      t => t && t.isLoan && (t.id === item.id || (t.loanId === loan.id && t.date === item.date && t.amount === item.amount))
    );
    if (matchingTx) {
      updateTransaction({
        ...matchingTx,
        date: editItemDate,
        amount: newAmt,
        type: editItemType === 'given' ? 'expense' : 'income',
        paymentMethod: editItemMethod,
        note: editItemNote.trim() || matchingTx.note,
      });
    }

    setSelectedLoanForDetail(saved || updatedLoan);
    setEditingHistoryItem(null);
  };

  const handleDeleteHistoryItem = (loan: LoanRecord, item: LoanEntryItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to remove this ${item.type === 'given' ? 'Loan Disbursement' : 'Repayment'} of ${formatCurrency(item.amount, config.currency)}?`)) {
      return;
    }

    const currentHistory = (loan.history && loan.history.length > 0 ? [...loan.history] : getLoanTimeline(loan)).filter(h => h.id !== item.id);

    const updatedLoan: LoanRecord = {
      ...loan,
      history: currentHistory,
    };

    const saved = updateLoan ? updateLoan(updatedLoan) : updatedLoan;

    // Also remove matching transaction if found
    const matchingTx = (transactions || []).find(
      t => t && t.isLoan && (t.id === item.id || (t.loanId === loan.id && t.date === item.date && t.amount === item.amount))
    );
    if (matchingTx) {
      deleteTransaction(matchingTx.id);
    }

    setSelectedLoanForDetail(saved || updatedLoan);
  };

  const handleOpenEditProfile = (loan: LoanRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingBorrowerProfile(loan);
    setEditBorrowerName(loan.borrowerName);
    setEditBorrowerPhone(loan.borrowerPhone || '');
    setEditBorrowerNote(loan.notes || '');
  };

  const handleSaveEditProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBorrowerProfile) return;
    if (!editBorrowerName.trim()) {
      alert('Please enter borrower name');
      return;
    }

    const updatedLoan: LoanRecord = {
      ...editingBorrowerProfile,
      borrowerName: editBorrowerName.trim(),
      borrowerPhone: editBorrowerPhone.trim() || undefined,
      notes: editBorrowerNote.trim() || undefined,
    };

    const saved = updateLoan ? updateLoan(updatedLoan) : updatedLoan;
    setSelectedLoanForDetail(saved || updatedLoan);
    setEditingBorrowerProfile(null);
  };

  const handleDelete = (loan: LoanRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm(`Delete loan record for ${loan.borrowerName}?`)) {
      deleteLoan(loan.id);
      if (selectedLoanForDetail?.id === loan.id) {
        setSelectedLoanForDetail(null);
      }
    }
  };

  const handleWhatsApp = (loan: LoanRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!loan.borrowerPhone) {
      alert('No phone number saved for this person');
      return;
    }
    const cleanPhone = loan.borrowerPhone.replace(/\D/g, '');
    const phoneWithCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const text = encodeURIComponent(
      `Hello ${loan.borrowerName}, this is a gentle reminder regarding the pending balance of ${formatCurrency(loan.pendingAmount, config.currency)} from ${config.businessName || 'our shop'}. Kindly arrange the payment when possible. Thank you!`
    );
    window.open(`https://wa.me/${phoneWithCode}?text=${text}`, '_blank');
  };

  // Compile detailed timeline history for the active loan
  const getLoanTimeline = (loan: LoanRecord): LoanEntryItem[] => {
    if (loan.history && loan.history.length > 0) {
      return [...loan.history].sort((a, b) => {
        const dateDiff = (b.date || '').localeCompare(a.date || '');
        if (dateDiff !== 0) return dateDiff;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
    }

    // Fallback synthesis from transactions if history is empty
    const matchingTxs = (transactions || []).filter(
      t => t && t.isLoan && (t.loanId === loan.id || t.borrowerName?.toLowerCase() === loan.borrowerName.toLowerCase())
    );

    if (matchingTxs.length > 0) {
      return matchingTxs.map(t => ({
        id: t.id,
        type: t.type === 'expense' ? ('given' as const) : ('repayment' as const),
        amount: t.amount,
        date: t.date,
        paymentMethod: t.paymentMethod,
        notes: t.note,
        recordedBy: t.staffName,
        createdAt: t.createdAt || Date.now(),
      })).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }

    // Initial synthetic record if no transaction found
    const synthetic: LoanEntryItem[] = [];
    if (loan.totalLent > 0) {
      synthetic.push({
        id: `synth_lent_${loan.id}`,
        type: 'given',
        amount: loan.totalLent,
        date: loan.createdAt ? new Date(loan.createdAt).toISOString().split('T')[0] : loan.lastActivityDate,
        paymentMethod: 'cash',
        notes: loan.notes || 'Loan given',
        createdAt: loan.createdAt || Date.now(),
      });
    }
    if (loan.totalRepaid > 0) {
      synthetic.push({
        id: `synth_repaid_${loan.id}`,
        type: 'repayment',
        amount: loan.totalRepaid,
        date: loan.lastActivityDate || getTodayDateString(),
        paymentMethod: 'cash',
        notes: 'Repayment received',
        createdAt: loan.updatedAt || Date.now(),
      });
    }
    return synthetic;
  };

  return (
    <div className="animate-fade-in" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      {/* 3 Top Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.65rem',
          marginBottom: '0.75rem',
        }}
      >
        <div
          className="card"
          style={{
            background: '#ffffff',
            borderLeft: '4px solid #d97706',
            padding: '0.75rem 1rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Total Pending to Receive
          </div>
          <div className="font-mono" style={{ fontSize: '1.45rem', fontWeight: 900, color: '#d97706', margin: '0.2rem 0' }}>
            {formatCurrency(totalPendingLoan, config.currency)}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
            {loans.filter(l => l.pendingAmount > 0).length} active borrowers with outstanding balance
          </div>
        </div>

        <div
          className="card"
          style={{
            background: '#ffffff',
            borderLeft: '4px solid #2563eb',
            padding: '0.75rem 1rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Total Money Lent
          </div>
          <div className="font-mono" style={{ fontSize: '1.45rem', fontWeight: 900, color: '#2563eb', margin: '0.2rem 0' }}>
            {formatCurrency(totalLentAll, config.currency)}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
            Cumulative amount of all loans disbursed
          </div>
        </div>

        <div
          className="card"
          style={{
            background: '#ffffff',
            borderLeft: '4px solid #16a34a',
            padding: '0.75rem 1rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Total Repaid / Recovered
          </div>
          <div className="font-mono" style={{ fontSize: '1.45rem', fontWeight: 900, color: '#16a34a', margin: '0.2rem 0' }}>
            {formatCurrency(totalRepaidAll, config.currency)}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
            Money returned back into treasury
          </div>
        </div>
      </div>

      {/* Action & Search Bar */}
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.75rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
          padding: '0.55rem 0.85rem',
          background: '#ffffff',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flex: 1, minWidth: '220px' }}>
          <Search size={15} style={{ color: '#94a3b8' }} />
          <input
            type="text"
            className="form-input"
            style={{ width: '100%', fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
            placeholder="Search by borrower name, phone number, note..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <button
          type="button"
          className="btn-fast-income"
          style={{
            padding: '0.45rem 0.95rem',
            fontSize: '0.8rem',
            fontWeight: 800,
            background: '#d97706',
            boxShadow: '0 2px 6px rgba(217, 119, 6, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
          onClick={() => handleOpenGive()}
        >
          <HandCoins size={15} />
          <span>+ Give Loan</span>
        </button>
      </div>

      {/* Loans Grid / Cards */}
      {filteredLoans.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b', background: '#ffffff' }}>
          <HandCoins size={36} style={{ color: '#cbd5e1', marginBottom: '0.5rem' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>No Loan Records Found</h3>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem', maxWidth: '400px', margin: '0.25rem auto 0 auto' }}>
            Click "+ Give Loan" to disburse a loan. All disbursement dates, multiple loan history, and repayments will be tracked here.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '0.75rem',
          }}
        >
          {filteredLoans.map(loan => {
            const isFullyPaid = (loan.pendingAmount || 0) <= 0;
            const historyCount = loan.history ? loan.history.length : (loan.totalRepaid > 0 ? 2 : 1);

            return (
              <div
                key={loan.id}
                className="card"
                onClick={() => setSelectedLoanForDetail(loan)}
                style={{
                  background: '#ffffff',
                  border: isFullyPaid ? '1.5px solid #e2e8f0' : '2px solid #fde68a',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.65rem',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)';
                }}
              >
                <div>
                  {/* Top Bar: Borrower Name + Phone + Repaid/Pending Status */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.4rem', gap: '0.5rem' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <User size={14} style={{ color: '#64748b', flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {loan.borrowerName}
                        </span>
                      </div>
                      {loan.borrowerPhone ? (
                        <div style={{ fontSize: '0.725rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
                          <Phone size={11} />
                          <span>{loan.borrowerPhone}</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '0.15rem' }}>
                          No phone saved
                        </div>
                      )}
                    </div>

                    <span
                      className={`badge ${isFullyPaid ? 'badge-income' : 'badge-cash'}`}
                      style={{
                        fontSize: '0.675rem',
                        padding: '0.15rem 0.45rem',
                        fontWeight: 800,
                        letterSpacing: '0.02em',
                        flexShrink: 0,
                      }}
                    >
                      {isFullyPaid ? '✓ ALL CLEAR' : 'PENDING'}
                    </span>
                  </div>

                  {loan.notes && (
                    <div style={{ fontSize: '0.725rem', color: '#475569', background: '#f8fafc', padding: '0.3rem 0.5rem', borderRadius: '5px', marginBottom: '0.45rem', border: '1px solid #f1f5f9' }}>
                      "{loan.notes}"
                    </div>
                  )}

                  {/* Amounts Breakdown Box */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.2fr 1fr',
                      gap: '0.4rem',
                      background: isFullyPaid ? '#f8fafc' : '#fffbeb',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      border: isFullyPaid ? '1px solid #e2e8f0' : '1.5px solid #fde68a',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Pending Due:</div>
                      <div className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 900, color: isFullyPaid ? '#16a34a' : '#d97706' }}>
                        {formatCurrency(loan.pendingAmount, config.currency)}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>Lent / Repaid:</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a' }}>
                        <span style={{ color: '#2563eb' }}>{formatCurrency(loan.totalLent, config.currency)}</span>
                        {' / '}
                        <span style={{ color: '#16a34a' }}>{formatCurrency(loan.totalRepaid, config.currency)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Activity Date & Timeline hint */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b', marginTop: '0.45rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Calendar size={11} /> Last: {formatDDMMYYYY(loan.lastActivityDate || getTodayDateString())}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', color: '#2563eb', fontWeight: 700 }}>
                      <History size={11} /> {historyCount} {historyCount === 1 ? 'entry' : 'entries'} • View History <ChevronRight size={11} />
                    </span>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.4rem',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '0.55rem',
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    {loan.borrowerPhone && (
                      <button
                        type="button"
                        className="icon-btn"
                        style={{ width: '28px', height: '28px', background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}
                        onClick={e => handleWhatsApp(loan, e)}
                        title="Send WhatsApp Reminder"
                      >
                        <MessageCircle size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="icon-btn"
                      style={{ width: '28px', height: '28px', color: '#dc2626' }}
                      onClick={e => handleDelete(loan, e)}
                      title="Delete Record"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      type="button"
                      style={{
                        padding: '0.32rem 0.65rem',
                        borderRadius: '6px',
                        background: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe',
                        fontSize: '0.725rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        cursor: 'pointer',
                      }}
                      onClick={e => {
                        e.stopPropagation();
                        handleOpenGive(loan.borrowerName, loan.borrowerPhone);
                      }}
                      title="Give another loan to this person"
                    >
                      <PlusCircle size={12} />
                      <span>+ Loan</span>
                    </button>

                    {!isFullyPaid && (
                      <button
                        type="button"
                        style={{
                          padding: '0.32rem 0.75rem',
                          borderRadius: '6px',
                          background: '#16a34a',
                          color: '#ffffff',
                          fontSize: '0.725rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          cursor: 'pointer',
                          border: 'none',
                          boxShadow: '0 1px 3px rgba(22, 163, 74, 0.3)',
                        }}
                        onClick={e => handleOpenRepay(loan, e)}
                      >
                        <ArrowDownLeft size={13} />
                        <span>Repay</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LOAN DETAIL & MULTI-LOAN HISTORY MODAL */}
      {selectedLoanForDetail && (
        <div className="modal-overlay" onClick={() => setSelectedLoanForDetail(null)}>
          <div
            className="modal-content animate-scale-in"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '540px', padding: '1.25rem', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={18} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                      {selectedLoanForDetail.borrowerName}
                    </h3>
                    <button
                      type="button"
                      className="icon-btn"
                      style={{ width: '22px', height: '22px', color: '#2563eb' }}
                      onClick={e => handleOpenEditProfile(selectedLoanForDetail, e)}
                      title="Edit Borrower details"
                    >
                      <Pencil size={12} />
                    </button>
                  </div>
                  <div style={{ fontSize: '0.725rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.1rem', flexWrap: 'wrap' }}>
                    {selectedLoanForDetail.borrowerPhone ? (
                      <>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Phone size={11} />
                          <span>{selectedLoanForDetail.borrowerPhone}</span>
                        </span>
                        <button
                          type="button"
                          onClick={e => handleWhatsApp(selectedLoanForDetail, e)}
                          style={{ border: 'none', background: '#f0fdf4', color: '#16a34a', padding: '0.08rem 0.35rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 800, fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                        >
                          <MessageCircle size={10} /> WhatsApp Reminder
                        </button>
                      </>
                    ) : (
                      <span style={{ fontStyle: 'italic' }}>No phone saved</span>
                    )}
                  </div>
                </div>
              </div>

              <button className="icon-btn" onClick={() => setSelectedLoanForDetail(null)}>
                <X size={17} />
              </button>
            </div>

            {/* Quick Balance Summary Bar */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.4rem',
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.65rem 0.75rem',
                marginBottom: '0.85rem',
                textAlign: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Lent</div>
                <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 900, color: '#2563eb' }}>
                  {formatCurrency(selectedLoanForDetail.totalLent, config.currency)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Repaid</div>
                <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 900, color: '#16a34a' }}>
                  {formatCurrency(selectedLoanForDetail.totalRepaid, config.currency)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Pending Balance</div>
                <div className="font-mono" style={{ fontSize: '1.05rem', fontWeight: 900, color: selectedLoanForDetail.pendingAmount <= 0 ? '#16a34a' : '#d97706' }}>
                  {formatCurrency(selectedLoanForDetail.pendingAmount, config.currency)}
                </div>
              </div>
            </div>

            {/* Timeline History Section */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
              <div style={{ fontSize: '0.825rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <History size={15} style={{ color: '#334155' }} />
                <span>History</span>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
                paddingRight: '0.2rem',
                marginBottom: '1rem',
                maxHeight: '320px',
              }}
            >
              {(() => {
                const timeline = getLoanTimeline(selectedLoanForDetail);
                if (timeline.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.78rem' }}>
                      No history recorded yet.
                    </div>
                  );
                }

                // Count disbursements to label 1st Loan, 2nd Loan, etc.
                let givenCount = 0;
                let repayCount = 0;
                // Reverse iterate to compute chronological indices
                const numberedTimeline = [...timeline].reverse().map(item => {
                  if (item.type === 'given') {
                    givenCount++;
                    return { ...item, label: `${givenCount}${getOrdinalSuffix(givenCount)} Loan Given` };
                  } else {
                    repayCount++;
                    return { ...item, label: `${repayCount}${getOrdinalSuffix(repayCount)} Repayment Received` };
                  }
                }).reverse();

                return numberedTimeline.map((item, idx) => {
                  const isGiven = item.type === 'given';
                  const methodUpper = (item.paymentMethod || 'CASH').toUpperCase();

                  return (
                    <div
                      key={item.id || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.55rem 0.75rem',
                        background: isGiven ? '#fffbeb' : '#f0fdf4',
                        border: isGiven ? '1px solid #fde68a' : '1px solid #bbf7d0',
                        borderRadius: '7px',
                        gap: '0.5rem',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '0.675rem',
                              fontWeight: 800,
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              background: isGiven ? '#fef3c7' : '#dcfce7',
                              color: isGiven ? '#92400e' : '#166534',
                            }}
                          >
                            {item.label}
                          </span>
                          <span style={{ fontSize: '0.725rem', fontWeight: 800, color: '#0f172a' }}>
                            {formatDDMMYYYY(item.date)}
                          </span>
                          <span
                            style={{
                              fontSize: '0.625rem',
                              fontWeight: 800,
                              padding: '0.08rem 0.35rem',
                              borderRadius: '3px',
                              background: '#ffffff',
                              color: '#475569',
                              border: '1px solid #cbd5e1',
                            }}
                          >
                            {methodUpper}
                          </span>
                          {item.recordedBy && (
                            <span style={{ fontSize: '0.625rem', color: '#64748b' }}>
                              by {item.recordedBy}
                            </span>
                          )}
                        </div>

                        {item.notes && (
                          <div style={{ fontSize: '0.725rem', color: '#475569', marginTop: '0.2rem', wordBreak: 'break-word' }}>
                            Note: "{item.notes}"
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
                        <div
                          className="font-mono"
                          style={{
                            fontSize: '0.95rem',
                            fontWeight: 900,
                            color: isGiven ? '#dc2626' : '#16a34a',
                          }}
                        >
                          {isGiven ? '−' : '+'}{formatCurrency(item.amount, config.currency)}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <button
                            type="button"
                            className="icon-btn"
                            style={{ width: '22px', height: '22px', color: '#2563eb' }}
                            onClick={e => handleOpenEditItem(selectedLoanForDetail, item, e)}
                            title="Edit this entry"
                          >
                            <Edit2 size={11} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn"
                            style={{ width: '22px', height: '22px', color: '#dc2626' }}
                            onClick={e => handleDeleteHistoryItem(selectedLoanForDetail, item, e)}
                            title="Delete this entry"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Bottom Actions */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '0.75rem',
                gap: '0.5rem',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                className="icon-btn"
                style={{ color: '#dc2626', fontSize: '0.75rem', padding: '0.4rem 0.65rem', width: 'auto', height: 'auto', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                onClick={() => handleDelete(selectedLoanForDetail)}
              >
                <Trash2 size={13} />
                <span>Delete Account</span>
              </button>

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '6px',
                    background: '#eff6ff',
                    border: '1.5px solid #bfdbfe',
                    color: '#1d4ed8',
                    fontWeight: 800,
                    fontSize: '0.775rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                  onClick={() => {
                    handleOpenGive(selectedLoanForDetail.borrowerName, selectedLoanForDetail.borrowerPhone);
                  }}
                >
                  <PlusCircle size={14} />
                  <span>+ Give More Loan</span>
                </button>

                {selectedLoanForDetail.pendingAmount > 0 && (
                  <button
                    type="button"
                    style={{
                      padding: '0.45rem 0.95rem',
                      borderRadius: '6px',
                      background: '#16a34a',
                      border: 'none',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.775rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)',
                    }}
                    onClick={() => handleOpenRepay(selectedLoanForDetail)}
                  >
                    <ArrowDownLeft size={14} />
                    <span>Receive Repayment</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GIVE LOAN MODAL */}
      {isGiveModalOpen && (
        <div className="modal-overlay" onClick={() => setIsGiveModalOpen(false)}>
          <div className="modal-content animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <HandCoins size={18} style={{ color: '#d97706' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Give Loan / Lend Money</h3>
              </div>
              <button className="icon-btn" onClick={() => setIsGiveModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveGive}>
              {/* Borrower Name with Autocomplete */}
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Person / Borrower Name:</span>
                  <span style={{ fontSize: '0.675rem', color: '#64748b', fontWeight: 600 }}>Type or select existing</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Ramesh Sharma, Sunil, Vendor Amit"
                  value={borrowerName}
                  onFocus={() => setShowBorrowerSuggestions(true)}
                  onChange={e => {
                    setBorrowerName(e.target.value);
                    setShowBorrowerSuggestions(true);
                  }}
                  required
                />

                {/* Autocomplete Dropdown */}
                {showBorrowerSuggestions && borrowerSuggestions.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: '#ffffff',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      zIndex: 100,
                      maxHeight: '180px',
                      overflowY: 'auto',
                      marginTop: '2px',
                    }}
                  >
                    <div style={{ padding: '0.3rem 0.55rem', fontSize: '0.65rem', fontWeight: 800, color: '#64748b', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                      EXISTING BORROWERS ({borrowerSuggestions.length})
                    </div>
                    {borrowerSuggestions.map((b, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '0.45rem 0.65rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: '1px solid #f8fafc',
                          fontSize: '0.775rem',
                          transition: 'background 0.1s ease',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                        onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                        onClick={() => handleSelectBorrower(b)}
                      >
                        <div>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{b.name}</div>
                          {b.phone && <div style={{ fontSize: '0.675rem', color: '#64748b' }}>{b.phone}</div>}
                        </div>
                        {b.pending > 0 ? (
                          <span style={{ fontSize: '0.675rem', fontWeight: 800, color: '#d97706', background: '#fef3c7', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                            Pending: {formatCurrency(b.pending, config.currency)}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.675rem', fontWeight: 700, color: '#16a34a' }}>
                            ✓ Cleared
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Mobile Number */}
              <div className="form-group">
                <label className="form-label">Mobile Number (Optional):</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="10-digit mobile number for WhatsApp reminder"
                  value={borrowerPhone}
                  onChange={e => setBorrowerPhone(e.target.value)}
                />
              </div>

              {/* Loan Amount & Date Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Loan Amount ({config.currency}):</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input font-mono"
                    style={{ fontSize: '1.15rem', fontWeight: 800 }}
                    placeholder="5000"
                    value={loanAmount}
                    onChange={e => setLoanAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Date of Loan:</label>
                  <input
                    type="date"
                    className="form-input"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.5rem', fontWeight: 700 }}
                    value={loanDate}
                    onChange={e => setLoanDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Payment Mode */}
              <div className="form-group">
                <label className="form-label">Payment Mode (Disbursement Method):</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                  <button
                    type="button"
                    className={`method-chip ${paymentMethod === 'cash' ? 'active' : ''}`}
                    style={{
                      padding: '0.55rem 0.4rem',
                      border: paymentMethod === 'cash' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                      background: paymentMethod === 'cash' ? '#f0fdf4' : '#ffffff',
                      color: paymentMethod === 'cash' ? '#16a34a' : '#475569',
                    }}
                    onClick={() => setPaymentMethod('cash')}
                  >
                    <Banknote size={16} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Cash</span>
                  </button>

                  <button
                    type="button"
                    className={`method-chip ${paymentMethod === 'upi' ? 'active' : ''}`}
                    style={{
                      padding: '0.55rem 0.4rem',
                      border: paymentMethod === 'upi' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      background: paymentMethod === 'upi' ? '#eff6ff' : '#ffffff',
                      color: paymentMethod === 'upi' ? '#2563eb' : '#475569',
                    }}
                    onClick={() => setPaymentMethod('upi')}
                  >
                    <QrCode size={16} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>UPI</span>
                  </button>

                  <button
                    type="button"
                    className={`method-chip ${paymentMethod === 'rtgs' ? 'active' : ''}`}
                    style={{
                      padding: '0.55rem 0.4rem',
                      border: paymentMethod === 'rtgs' ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                      background: paymentMethod === 'rtgs' ? '#f5f3ff' : '#ffffff',
                      color: paymentMethod === 'rtgs' ? '#7c3aed' : '#475569',
                    }}
                    onClick={() => setPaymentMethod('rtgs')}
                  >
                    <Building size={16} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>RTGS</span>
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Note / Purpose (Optional):</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Emergency advance, promised in 10 days"
                  value={loanNote}
                  onChange={e => setLoanNote(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn-fast-income"
                style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', background: '#d97706', boxShadow: '0 2px 8px rgba(217, 119, 6, 0.3)' }}
              >
                <Check size={16} />
                <span>Give Loan ({formatCurrency(parseFloat(loanAmount) || 0, config.currency)})</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* REPAY LOAN MODAL */}
      {selectedLoanForRepay && (
        <div className="modal-overlay" onClick={() => setSelectedLoanForRepay(null)}>
          <div className="modal-content animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ArrowDownLeft size={18} style={{ color: '#16a34a' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Receive Repayment: {selectedLoanForRepay.borrowerName}
                </h3>
              </div>
              <button className="icon-btn" onClick={() => setSelectedLoanForRepay(null)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '6px', marginBottom: '0.85rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: 600 }}>Current Pending Amount:</div>
              <div className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 900, color: '#d97706' }}>
                {formatCurrency(selectedLoanForRepay.pendingAmount, config.currency)}
              </div>
            </div>

            <form onSubmit={handleSaveRepay}>
              {/* Repayment Amount & Date Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Repayment Amount ({config.currency}):</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input font-mono"
                    style={{ fontSize: '1.15rem', fontWeight: 800 }}
                    value={repayAmount}
                    onChange={e => setRepayAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Date of Repayment:</label>
                  <input
                    type="date"
                    className="form-input"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.5rem', fontWeight: 700 }}
                    value={repayDate}
                    onChange={e => setRepayDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Payment Mode */}
              <div className="form-group">
                <label className="form-label">Payment Mode Received:</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                  <button
                    type="button"
                    className={`method-chip ${repayMethod === 'cash' ? 'active' : ''}`}
                    style={{
                      padding: '0.55rem 0.4rem',
                      border: repayMethod === 'cash' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                      background: repayMethod === 'cash' ? '#f0fdf4' : '#ffffff',
                      color: repayMethod === 'cash' ? '#16a34a' : '#475569',
                    }}
                    onClick={() => setRepayMethod('cash')}
                  >
                    <Banknote size={16} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Cash</span>
                  </button>

                  <button
                    type="button"
                    className={`method-chip ${repayMethod === 'upi' ? 'active' : ''}`}
                    style={{
                      padding: '0.55rem 0.4rem',
                      border: repayMethod === 'upi' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      background: repayMethod === 'upi' ? '#eff6ff' : '#ffffff',
                      color: repayMethod === 'upi' ? '#2563eb' : '#475569',
                    }}
                    onClick={() => setRepayMethod('upi')}
                  >
                    <QrCode size={16} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>UPI</span>
                  </button>

                  <button
                    type="button"
                    className={`method-chip ${repayMethod === 'rtgs' ? 'active' : ''}`}
                    style={{
                      padding: '0.55rem 0.4rem',
                      border: repayMethod === 'rtgs' ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                      background: repayMethod === 'rtgs' ? '#f5f3ff' : '#ffffff',
                      color: repayMethod === 'rtgs' ? '#7c3aed' : '#475569',
                    }}
                    onClick={() => setRepayMethod('rtgs')}
                  >
                    <Building size={16} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>RTGS</span>
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Note / Remark (Optional):</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Cash returned in full, part payment"
                  value={repayNote}
                  onChange={e => setRepayNote(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn-fast-income"
                style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', background: '#16a34a', boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)' }}
              >
                <Check size={16} />
                <span>Receive Payment ({formatCurrency(parseFloat(repayAmount) || 0, config.currency)})</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT LOAN ENTRY MODAL */}
      {editingHistoryItem && (
        <div className="modal-overlay" onClick={() => setEditingHistoryItem(null)}>
          <div className="modal-content animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Edit2 size={18} style={{ color: '#2563eb' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Edit Loan Entry: {editingHistoryItem.loan.borrowerName}
                </h3>
              </div>
              <button className="icon-btn" onClick={() => setEditingHistoryItem(null)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEditItem}>
              {/* Entry Type Switcher */}
              <div className="form-group">
                <label className="form-label">Entry Type:</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                  <button
                    type="button"
                    style={{
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: editItemType === 'given' ? '2px solid #d97706' : '1px solid #cbd5e1',
                      background: editItemType === 'given' ? '#fef3c7' : '#ffffff',
                      color: editItemType === 'given' ? '#92400e' : '#475569',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                    onClick={() => setEditItemType('given')}
                  >
                    Loan Given (Money Out)
                  </button>
                  <button
                    type="button"
                    style={{
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: editItemType === 'repayment' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                      background: editItemType === 'repayment' ? '#dcfce7' : '#ffffff',
                      color: editItemType === 'repayment' ? '#166534' : '#475569',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                    onClick={() => setEditItemType('repayment')}
                  >
                    Repayment (Money In)
                  </button>
                </div>
              </div>

              {/* Amount & Date Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Amount ({config.currency}):</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input font-mono"
                    style={{ fontSize: '1.15rem', fontWeight: 800 }}
                    value={editItemAmount}
                    onChange={e => setEditItemAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Date of Entry:</label>
                  <input
                    type="date"
                    className="form-input"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.5rem', fontWeight: 700 }}
                    value={editItemDate}
                    onChange={e => setEditItemDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Payment Mode */}
              <div className="form-group">
                <label className="form-label">Payment Mode:</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                  <button
                    type="button"
                    className={`method-chip ${editItemMethod === 'cash' ? 'active' : ''}`}
                    style={{
                      padding: '0.55rem 0.4rem',
                      border: editItemMethod === 'cash' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                      background: editItemMethod === 'cash' ? '#f0fdf4' : '#ffffff',
                      color: editItemMethod === 'cash' ? '#16a34a' : '#475569',
                    }}
                    onClick={() => setEditItemMethod('cash')}
                  >
                    <Banknote size={16} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Cash</span>
                  </button>

                  <button
                    type="button"
                    className={`method-chip ${editItemMethod === 'upi' ? 'active' : ''}`}
                    style={{
                      padding: '0.55rem 0.4rem',
                      border: editItemMethod === 'upi' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      background: editItemMethod === 'upi' ? '#eff6ff' : '#ffffff',
                      color: editItemMethod === 'upi' ? '#2563eb' : '#475569',
                    }}
                    onClick={() => setEditItemMethod('upi')}
                  >
                    <QrCode size={16} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>UPI</span>
                  </button>

                  <button
                    type="button"
                    className={`method-chip ${editItemMethod === 'rtgs' ? 'active' : ''}`}
                    style={{
                      padding: '0.55rem 0.4rem',
                      border: editItemMethod === 'rtgs' ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                      background: editItemMethod === 'rtgs' ? '#f5f3ff' : '#ffffff',
                      color: editItemMethod === 'rtgs' ? '#7c3aed' : '#475569',
                    }}
                    onClick={() => setEditItemMethod('rtgs')}
                  >
                    <Building size={16} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>RTGS</span>
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Note / Remark (Optional):</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Loan disbursement or repayment remark"
                  value={editItemNote}
                  onChange={e => setEditItemNote(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn-fast-income"
                style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', background: '#2563eb', boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)' }}
              >
                <Check size={16} />
                <span>Save Changes ({formatCurrency(parseFloat(editItemAmount) || 0, config.currency)})</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BORROWER PROFILE MODAL */}
      {editingBorrowerProfile && (
        <div className="modal-overlay" onClick={() => setEditingBorrowerProfile(null)}>
          <div className="modal-content animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Pencil size={18} style={{ color: '#2563eb' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Edit Borrower Profile
                </h3>
              </div>
              <button className="icon-btn" onClick={() => setEditingBorrowerProfile(null)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEditProfile}>
              <div className="form-group">
                <label className="form-label">Person / Borrower Name:</label>
                <input
                  type="text"
                  className="form-input"
                  value={editBorrowerName}
                  onChange={e => setEditBorrowerName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mobile Number (Optional):</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="10-digit mobile number"
                  value={editBorrowerPhone}
                  onChange={e => setEditBorrowerPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">General Note / Remark (Optional):</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="General info or notes"
                  value={editBorrowerNote}
                  onChange={e => setEditBorrowerNote(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn-fast-income"
                style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', background: '#2563eb', boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)' }}
              >
                <Check size={16} />
                <span>Save Profile</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
