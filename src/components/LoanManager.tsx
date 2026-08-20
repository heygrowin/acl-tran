import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { LoanRecord } from '../types';
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
  Building
} from 'lucide-react';
import { formatCurrency } from '../services/storageService';

export const LoanManager: React.FC = () => {
  const { loans, giveLoan, repayLoan, deleteLoan, config } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  
  // Give Loan Modal State
  const [isGiveModalOpen, setIsGiveModalOpen] = useState(false);
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowerPhone, setBorrowerPhone] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loanNote, setLoanNote] = useState('');

  // Repay Modal State
  const [selectedLoanForRepay, setSelectedLoanForRepay] = useState<LoanRecord | null>(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayMethod, setRepayMethod] = useState('cash');
  const [repayNote, setRepayNote] = useState('');

  const totalPendingLoan = loans.reduce((sum, l) => sum + (l.pendingAmount || 0), 0);
  const totalLentAll = loans.reduce((sum, l) => sum + (l.totalLent || 0), 0);
  const totalRepaidAll = loans.reduce((sum, l) => sum + (l.totalRepaid || 0), 0);

  const filteredLoans = loans.filter(l => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      l.borrowerName.toLowerCase().includes(q) ||
      (l.borrowerPhone && l.borrowerPhone.includes(q)) ||
      (l.notes && l.notes.toLowerCase().includes(q))
    );
  });

  const handleOpenGive = () => {
    setBorrowerName('');
    setBorrowerPhone('');
    setLoanAmount('');
    setPaymentMethod('cash');
    setLoanNote('');
    setIsGiveModalOpen(true);
  };

  const handleSaveGive = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(loanAmount) || 0;
    if (!borrowerName.trim() || amt <= 0) {
      alert('Please enter borrower name and a valid amount');
      return;
    }
    giveLoan(borrowerName.trim(), borrowerPhone.trim(), amt, paymentMethod, loanNote.trim() || undefined);
    setIsGiveModalOpen(false);
  };

  const handleOpenRepay = (loan: LoanRecord) => {
    setSelectedLoanForRepay(loan);
    setRepayAmount(loan.pendingAmount.toString());
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
    repayLoan(selectedLoanForRepay.id, amt, repayMethod, repayNote.trim() || undefined);
    setSelectedLoanForRepay(null);
  };

  const handleDelete = (loan: LoanRecord) => {
    if (confirm(`Delete loan record for ${loan.borrowerName}?`)) {
      deleteLoan(loan.id);
    }
  };

  const handleWhatsApp = (loan: LoanRecord) => {
    if (!loan.borrowerPhone) {
      alert('No phone number saved for this person');
      return;
    }
    const cleanPhone = loan.borrowerPhone.replace(/\D/g, '');
    const phoneWithCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const text = encodeURIComponent(
      `Hello ${loan.borrowerName}, this is a gentle reminder regarding the pending amount of ${formatCurrency(loan.pendingAmount, config.currency)} from ${config.businessName || 'our shop'}. Kindly arrange the payment when possible. Thank you!`
    );
    window.open(`https://wa.me/${phoneWithCode}?text=${text}`, '_blank');
  };

  return (
    <div className="animate-fade-in">
      {/* Top Summary Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.65rem',
          marginBottom: '1rem',
        }}
      >
        <div
          className="card"
          style={{
            background: '#ffffff',
            borderLeft: '3.5px solid #d97706',
            padding: '0.75rem 1rem',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Total Pending to Receive</div>
          <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#d97706', margin: '0.2rem 0' }}>
            {formatCurrency(totalPendingLoan, config.currency)}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
            {loans.filter(l => l.pendingAmount > 0).length} active borrowers
          </div>
        </div>

        <div
          className="card"
          style={{
            background: '#ffffff',
            borderLeft: '3.5px solid #2563eb',
            padding: '0.75rem 1rem',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Total Money Lent</div>
          <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563eb', margin: '0.2rem 0' }}>
            {formatCurrency(totalLentAll, config.currency)}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
            Total loans given out
          </div>
        </div>

        <div
          className="card"
          style={{
            background: '#ffffff',
            borderLeft: '3.5px solid #16a34a',
            padding: '0.75rem 1rem',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Total Repaid / Received</div>
          <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16a34a', margin: '0.2rem 0' }}>
            {formatCurrency(totalRepaidAll, config.currency)}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
            Money returned back
          </div>
        </div>
      </div>

      {/* Header & Actions */}
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.85rem',
          flexWrap: 'wrap',
          gap: '0.6rem',
          padding: '0.75rem 1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '200px' }}>
          <Search size={15} style={{ color: '#94a3b8' }} />
          <input
            type="text"
            className="form-input"
            style={{ width: '100%', fontSize: '0.825rem', padding: '0.4rem 0.65rem' }}
            placeholder="Search borrower name, phone, notes..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <button
          type="button"
          className="btn-fast-income"
          style={{ padding: '0.55rem 1rem', fontSize: '0.825rem', background: '#d97706', boxShadow: 'none' }}
          onClick={handleOpenGive}
        >
          <HandCoins size={16} />
          <span>+ Give Loan / Lend Money</span>
        </button>
      </div>

      {/* Loans List */}
      {filteredLoans.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b' }}>
          <HandCoins size={36} style={{ color: '#cbd5e1', marginBottom: '0.5rem' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>No Loan Records</h3>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
            Give a loan to someone to track outstanding amounts and repayments.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '0.75rem',
          }}
        >
          {filteredLoans.map(loan => {
            const isFullyPaid = loan.pendingAmount <= 0;

            return (
              <div
                key={loan.id}
                className="card"
                style={{
                  background: '#ffffff',
                  border: isFullyPaid ? '1px solid #e2e8f0' : '1.5px solid #fde68a',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                        {loan.borrowerName}
                      </div>
                      {loan.borrowerPhone && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.1rem' }}>
                          <Phone size={11} />
                          <span>{loan.borrowerPhone}</span>
                        </div>
                      )}
                    </div>

                    <span
                      className={`badge ${isFullyPaid ? 'badge-income' : 'badge-cash'}`}
                      style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}
                    >
                      {isFullyPaid ? '✓ Fully Repaid' : 'Pending'}
                    </span>
                  </div>

                  {loan.notes && (
                    <div style={{ fontSize: '0.75rem', color: '#64748b', background: '#f8fafc', padding: '0.35rem 0.5rem', borderRadius: '4px', marginBottom: '0.6rem' }}>
                      "{loan.notes}"
                    </div>
                  )}

                  {/* Amounts Breakdown */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.4rem',
                      background: isFullyPaid ? '#f8fafc' : '#fffbeb',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      border: isFullyPaid ? '1px solid #e2e8f0' : '1px solid #fde68a',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.675rem', color: '#64748b' }}>Pending Due:</div>
                      <div className="font-mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: isFullyPaid ? '#16a34a' : '#d97706' }}>
                        {formatCurrency(loan.pendingAmount, config.currency)}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.675rem', color: '#64748b' }}>Lent / Repaid:</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>
                        {formatCurrency(loan.totalLent, config.currency)} / {formatCurrency(loan.totalRepaid, config.currency)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.65rem' }}>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    {loan.borrowerPhone && (
                      <button
                        type="button"
                        className="icon-btn"
                        style={{ width: '28px', height: '28px', background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}
                        onClick={() => handleWhatsApp(loan)}
                        title="Send WhatsApp Reminder"
                      >
                        <MessageCircle size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="icon-btn"
                      style={{ width: '28px', height: '28px', color: '#dc2626' }}
                      onClick={() => handleDelete(loan)}
                      title="Delete Record"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {!isFullyPaid ? (
                    <button
                      type="button"
                      style={{
                        padding: '0.4rem 0.8rem',
                        borderRadius: '6px',
                        background: '#16a34a',
                        color: '#ffffff',
                        fontSize: '0.775rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        cursor: 'pointer',
                      }}
                      onClick={() => handleOpenRepay(loan)}
                    >
                      <ArrowDownLeft size={14} />
                      <span>Receive Repayment</span>
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.725rem', color: '#16a34a', fontWeight: 700 }}>
                      ✓ All Clear
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* GIVE LOAN MODAL */}
      {isGiveModalOpen && (
        <div className="modal-overlay" onClick={() => setIsGiveModalOpen(false)}>
          <div className="modal-content animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <HandCoins size={18} style={{ color: '#d97706' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Give Loan / Lend Money</h3>
              </div>
              <button className="icon-btn" onClick={() => setIsGiveModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveGive}>
              <div className="form-group">
                <label className="form-label">Borrower / Person Name:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Ramesh Sharma, Sunil, Vendor Amit"
                  value={borrowerName}
                  onChange={e => setBorrowerName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mobile Number (Optional):</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="10-digit mobile for WhatsApp reminders"
                  value={borrowerPhone}
                  onChange={e => setBorrowerPhone(e.target.value)}
                />
              </div>

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

              {/* Payment Mode */}
              <div className="form-group">
                <label className="form-label">Payment Mode:</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                  <button
                    type="button"
                    className={`method-chip ${paymentMethod === 'cash' ? 'active' : ''}`}
                    style={{
                      padding: '0.6rem 0.4rem',
                      border: paymentMethod === 'cash' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                      background: paymentMethod === 'cash' ? '#f0fdf4' : '#ffffff',
                      color: paymentMethod === 'cash' ? '#16a34a' : '#475569',
                    }}
                    onClick={() => setPaymentMethod('cash')}
                  >
                    <Banknote size={18} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Cash</span>
                  </button>

                  <button
                    type="button"
                    className={`method-chip ${paymentMethod === 'upi' ? 'active' : ''}`}
                    style={{
                      padding: '0.6rem 0.4rem',
                      border: paymentMethod === 'upi' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      background: paymentMethod === 'upi' ? '#eff6ff' : '#ffffff',
                      color: paymentMethod === 'upi' ? '#2563eb' : '#475569',
                    }}
                    onClick={() => setPaymentMethod('upi')}
                  >
                    <QrCode size={18} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>UPI</span>
                  </button>

                  <button
                    type="button"
                    className={`method-chip ${paymentMethod === 'rtgs' ? 'active' : ''}`}
                    style={{
                      padding: '0.6rem 0.4rem',
                      border: paymentMethod === 'rtgs' ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                      background: paymentMethod === 'rtgs' ? '#f5f3ff' : '#ffffff',
                      color: paymentMethod === 'rtgs' ? '#7c3aed' : '#475569',
                    }}
                    onClick={() => setPaymentMethod('rtgs')}
                  >
                    <Building size={18} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>RTGS</span>
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Note / Purpose (Optional):</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Emergency loan, promised to return in 10 days"
                  value={loanNote}
                  onChange={e => setLoanNote(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn-fast-income"
                style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', background: '#d97706', boxShadow: 'none' }}
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
          <div className="modal-content animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ArrowDownLeft size={18} style={{ color: '#16a34a' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  Receive Repayment: {selectedLoanForRepay.borrowerName}
                </h3>
              </div>
              <button className="icon-btn" onClick={() => setSelectedLoanForRepay(null)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '6px', marginBottom: '0.85rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Current Pending Amount:</div>
              <div className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#d97706' }}>
                {formatCurrency(selectedLoanForRepay.pendingAmount, config.currency)}
              </div>
            </div>

            <form onSubmit={handleSaveRepay}>
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

              {/* Payment Mode */}
              <div className="form-group">
                <label className="form-label">Payment Mode:</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                  <button
                    type="button"
                    className={`method-chip ${repayMethod === 'cash' ? 'active' : ''}`}
                    style={{
                      padding: '0.6rem 0.4rem',
                      border: repayMethod === 'cash' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                      background: repayMethod === 'cash' ? '#f0fdf4' : '#ffffff',
                      color: repayMethod === 'cash' ? '#16a34a' : '#475569',
                    }}
                    onClick={() => setRepayMethod('cash')}
                  >
                    <Banknote size={18} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Cash</span>
                  </button>

                  <button
                    type="button"
                    className={`method-chip ${repayMethod === 'upi' ? 'active' : ''}`}
                    style={{
                      padding: '0.6rem 0.4rem',
                      border: repayMethod === 'upi' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      background: repayMethod === 'upi' ? '#eff6ff' : '#ffffff',
                      color: repayMethod === 'upi' ? '#2563eb' : '#475569',
                    }}
                    onClick={() => setRepayMethod('upi')}
                  >
                    <QrCode size={18} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>UPI</span>
                  </button>

                  <button
                    type="button"
                    className={`method-chip ${repayMethod === 'rtgs' ? 'active' : ''}`}
                    style={{
                      padding: '0.6rem 0.4rem',
                      border: repayMethod === 'rtgs' ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                      background: repayMethod === 'rtgs' ? '#f5f3ff' : '#ffffff',
                      color: repayMethod === 'rtgs' ? '#7c3aed' : '#475569',
                    }}
                    onClick={() => setRepayMethod('rtgs')}
                  >
                    <Building size={18} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>RTGS</span>
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Note (Optional):</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Part payment, cash returned"
                  value={repayNote}
                  onChange={e => setRepayNote(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn-fast-income"
                style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', background: '#16a34a', boxShadow: 'none' }}
              >
                <Check size={16} />
                <span>Receive Payment ({formatCurrency(parseFloat(repayAmount) || 0, config.currency)})</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
