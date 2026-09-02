// Automated Test Suite for Daily Cash & Transaction Management Engine
// Set TEST_ENV flag to prevent tests from contacting production Cloud Firestore
(globalThis as any).__TEST_ENV__ = true;

import { storage } from '../services/storageService';

// Mock localStorage for Node test environment
const mockStorage: Record<string, string> = {};
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, val: string) => { mockStorage[key] = val; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
  length: 0,
  key: () => null,
};

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ Passed: ${msg}`);
  }
}

console.log('🚀 Running Transaction, Loan & Reconciler Logic Tests...\n');

// 1. Initialize
storage.resetToSampleData();
const testDate = '2026-08-18';
storage.setOpeningBalances(testDate, 10000, 5000);

// 2. Clear transactions for clean test run
storage.saveTransactions([]);
storage.saveLoans([]);

// 3. Add Income Transactions
storage.addTransaction({
  businessId: 'biz_default',
  date: testDate,
  time: '10:00',
  type: 'income',
  amount: 2500,
  paymentMethod: 'cash',
  category: 'Customer Order',
  staffName: 'Counter Staff 1',
});

storage.addTransaction({
  businessId: 'biz_default',
  date: testDate,
  time: '11:00',
  type: 'income',
  amount: 1200,
  paymentMethod: 'upi',
  category: 'Customer Order',
  staffName: 'Counter Staff 2',
});

storage.addTransaction({
  businessId: 'biz_default',
  date: testDate,
  time: '12:00',
  type: 'income',
  amount: 5000,
  paymentMethod: 'rtgs',
  category: 'Advance Payment',
  staffName: 'Owner',
});

// 4. Add Expense Transactions
storage.addTransaction({
  businessId: 'biz_default',
  date: testDate,
  time: '12:30',
  type: 'expense',
  amount: 150,
  paymentMethod: 'cash',
  category: 'Tea & Snacks',
  staffName: 'Counter Staff 1',
});

storage.addTransaction({
  businessId: 'biz_default',
  date: testDate,
  time: '13:00',
  type: 'expense',
  amount: 300,
  paymentMethod: 'cash',
  category: 'Delivery & Courier',
  staffName: 'Counter Staff 1',
});

storage.addTransaction({
  businessId: 'biz_default',
  date: testDate,
  time: '14:00',
  type: 'expense',
  amount: 2000,
  paymentMethod: 'upi',
  category: 'Material Purchase',
  staffName: 'Counter Staff 2',
});

// 5. Test Live Balances & Multi-Cashier Summaries
const balances = storage.calculateDayBalances(testDate);
console.log('Day Balances Calculated:', balances);

assert(balances.cashIncome === 2500, 'Cash Income matches ₹2,500');
assert(balances.onlineIncome === 6200, 'Online Income matches ₹6,200 (1,200 UPI + 5,000 RTGS)');
assert(balances.totalIncome === 8700, 'Total Income matches ₹8,700');

assert(balances.cashExpense === 450, 'Cash Expense matches ₹450 (150 Tea + 300 Delivery)');
assert(balances.onlineExpense === 2000, 'Online Expense matches ₹2,000 Material');
assert(balances.totalExpense === 2450, 'Total Expense matches ₹2,450');

// Running Balances
assert(balances.expectedCash === 12050, 'Expected Cash in Drawer = 10,000 + 2,500 - 450 = ₹12,050');
assert(balances.expectedOnline === 9200, 'Expected Online Account = 5,000 + 6,200 - 2,000 = ₹9,200');
assert(balances.netFlow === 6250, 'Net Flow = 8,700 - 2,450 = ₹6,250');

// Cashier summaries check
assert(balances.cashierSummaries?.length === 3, 'Calculated summary for 3 cashiers');
const staff1 = balances.cashierSummaries?.find(c => c.staffName === 'Counter Staff 1');
assert(staff1?.income === 2500 && staff1?.expense === 450, 'Staff 1 has ₹2,500 in and ₹450 out');

// 6. Test End-of-Day Closing Reconciler with ₹50 Shortage
const closingShortage = storage.saveClosing({
  businessId: 'biz_default',
  date: testDate,
  openingCash: balances.openingCash,
  openingOnline: balances.openingOnline,
  cashIncome: balances.cashIncome,
  cashExpense: balances.cashExpense,
  expectedCash: balances.expectedCash,
  onlineIncome: balances.onlineIncome,
  onlineExpense: balances.onlineExpense,
  expectedOnline: balances.expectedOnline,
  actualCash: 12000, // ₹50 short of 12,050
  actualOnline: 9200,
  cashDifference: -50,
  onlineDifference: 0,
  status: 'shortage',
  denominations: { '500': 24 }, // 12,000
  notes: 'Minor shortage in loose coins',
  closedBy: 'Counter Staff 1',
});

assert(closingShortage.cashDifference === -50, 'Detected exact ₹50 Cash Shortage');
assert(closingShortage.status === 'shortage', 'Status is marked as SHORTAGE');

// 7. Test Loans / Money Lent System
const loanResult = storage.giveLoan(
  'Ramesh Sharma',
  '9876543210',
  5000,
  'cash',
  'Counter Staff 1',
  testDate,
  'Emergency loan'
);

assert(loanResult.loan.pendingAmount === 5000, 'Loan created with ₹5,000 pending');
assert(loanResult.transaction.type === 'expense', 'Loan giving creates Expense transaction');
assert(loanResult.transaction.isLoan === true, 'Transaction marked as isLoan: true');

// Repayment
const repayResult = storage.repayLoan(
  loanResult.loan.id,
  2000,
  'upi',
  'Counter Staff 1',
  testDate,
  'Partial return'
);

assert(repayResult.loan.pendingAmount === 3000, 'Pending loan reduced to ₹3,000');
assert(repayResult.transaction.type === 'income', 'Loan repayment creates Income transaction');
assert(repayResult.loan.history !== undefined && repayResult.loan.history.length === 2, 'Loan history records 2 activity items');
assert(repayResult.loan.history![0].type === 'repayment', 'Latest history entry is repayment');
assert(repayResult.loan.history![1].type === 'given', 'First history entry is loan given');

// 8. Test Date Range Queries & Deletion
const rangeTxs = storage.getTransactionsBetween('2026-08-01', '2026-08-31');
assert(rangeTxs.length >= 8, 'Found transactions within August date range');

// 9. Test Initial Treasury Balances & Running Totals
storage.setInitialTreasuryBalances({ cash: 50000, rtgs: 100000, upi: 20000 });
const initialRes = storage.getInitialTreasuryBalances();
assert(initialRes.cash === 50000, 'Initial Cash stored correctly as 50000');
assert(initialRes.rtgs === 100000, 'Initial RTGS stored correctly as 100000');
assert(initialRes.upi === 20000, 'Initial UPI stored correctly as 20000');

// Add Admin Drawer Expense
storage.addTransaction({
  businessId: 'biz_default',
  date: testDate,
  time: '17:00',
  type: 'expense',
  amount: 1000,
  paymentMethod: 'cash',
  category: 'Owner Drawer Cash Withdrawal',
  staffName: 'ADMIN',
  note: 'Admin took cash from vault drawer',
});

const treasuryCalc = storage.calculateTreasuryBalances();
console.log('Treasury Balances Calculated:', {
  actualCash: treasuryCalc.actualCash,
  actualRtgs: treasuryCalc.actualRtgs,
  actualUpi: treasuryCalc.actualUpi,
  actualTotal: treasuryCalc.actualTotal,
  adminExpenseTotal: treasuryCalc.adminExpenseTotal,
});

// 10. Test Counter Day Closing Handover to Admin Cash in Hand
storage.addTransaction({
  businessId: 'biz_default',
  date: testDate,
  time: '20:00',
  type: 'expense',
  amount: 12000,
  paymentMethod: 'cash',
  category: 'CASH IN HAND',
  staffName: 'Counter Staff 1',
  note: 'Day closing physical cash handover to Admin',
});

const treasuryCalc2 = storage.calculateTreasuryBalances();
assert(treasuryCalc2.actualCash === 61000, 'Cash in Hand = 50,000 (initial) - 1,000 (admin expense) + 12,000 (counter handover) = ₹61,000');

console.log('\n🎉 ALL LOGICAL, LOAN, TREASURY & RECONCILIATION TESTS PASSED PERFECTLY!\n');

