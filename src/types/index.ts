export type TransactionType = 'income' | 'expense';

export type PaymentMethodType = 'cash' | 'upi' | 'rtgs' | 'credit';

export interface PaymentMethodConfig {
  id: string;
  name: string;
  type: 'cash' | 'online' | 'credit';
  enabled: boolean;
  color?: string;
  iconName?: string;
}

export interface CounterProfile {
  id: string;
  name: string;
  color?: string;
  bg?: string;
  border?: string;
  password?: string; // Optional custom password for this counter, falls back to config.employeePassword
}

export interface Transaction {
  id: string;
  businessId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  type: TransactionType;
  amount: number;
  paymentMethod: string; // 'cash' | 'upi' | 'rtgs'
  category: string;
  note?: string;
  
  // Loan / Money Lent tagging
  isLoan?: boolean;
  loanType?: 'given' | 'repaid'; // 'given' = Expense (lent out), 'repaid' = Income (received back)
  borrowerName?: string;
  borrowerPhone?: string;
  loanId?: string;

  // General Customer (if any)
  customerName?: string;
  customerPhone?: string;
  orderRef?: string;
  staffName: string;
  paymentAccount?: string; // e.g. 'Shop GPay', 'HDFC QR', 'PhonePe', etc.

  createdAt: number;
  updatedAt: number;
}

export interface DenominationCounts {
  [key: string]: number; // '500': 10, '200': 5, etc.
}

export interface CashierSummary {
  staffName: string;
  income: number;
  expense: number;
  cashIncome: number;
  cashExpense: number;
  onlineIncome: number;
  onlineExpense: number;
  transactionCount: number;
}

export interface DailyClosing {
  id: string;
  businessId: string;
  date: string; // YYYY-MM-DD
  openingCash: number;
  openingOnline: number;
  cashIncome: number;
  cashExpense: number;
  expectedCash: number;
  onlineIncome: number;
  onlineExpense: number;
  expectedOnline: number;
  actualCash: number;
  actualOnline: number;
  cashDifference: number; // actualCash - expectedCash (Negative = Shortage, Positive = Excess)
  onlineDifference: number; // actualOnline - expectedOnline
  status: 'balanced' | 'shortage' | 'excess';
  denominations: DenominationCounts;
  cashierSummaries?: CashierSummary[]; // Multi-cashier breakdown
  notes?: string;
  closedBy: string;
  closedAt: number;
}

export interface LoanRecord {
  id: string;
  businessId: string;
  borrowerName: string;
  borrowerPhone?: string;
  totalLent: number;       // total money given
  totalRepaid: number;     // total money repaid
  pendingAmount: number;   // totalLent - totalRepaid
  notes?: string;
  lastActivityDate: string;
  createdAt: number;
  updatedAt: number;
}

export interface BusinessConfig {
  id: string;
  businessName: string;
  tagline?: string;
  phone?: string;
  currency: string;
  adminPassword: string; // 'admin@123'
  employeePassword: string; // 'P@counter'
  activeStaffName: string;
  staffMembers: string[];
  counters: CounterProfile[]; // dynamic list of counters managed by Admin
  defaultOpeningCash: number;
  defaultOpeningOnline: number;
  // Treasury Initial Balances (Cash in Drawer/Safe, Bank RTGS, Online UPI)
  initialCash?: number;
  initialRtgs?: number;
  initialUpi?: number;
  incomeCategories: string[];
  expenseCategories: string[];
  upiAccounts: string[]; // Dynamic list of UPI Accounts / QRs (e.g. 'Shop QR', 'GPay', etc.)
  paymentMethods: PaymentMethodConfig[];
  theme: 'light' | 'dark';
  soundEnabled: boolean;
  storageMode: 'local' | 'firebase';
}

export type CurrentScreen = 'landing' | 'employee' | 'admin';

export type AdminTab = 'dashboard' | 'summary' | 'itemAnalysis' | 'transactions' | 'loans' | 'closing' | 'reports' | 'settings';

export interface DayBalances {
  date: string;
  openingCash: number;
  openingOnline: number;
  cashIncome: number;
  cashExpense: number;
  onlineIncome: number;
  onlineExpense: number;
  expectedCash: number;
  expectedOnline: number;
  totalIncome: number;
  totalExpense: number;
  netFlow: number;
  totalTransactionsCount: number;
  cashierSummaries?: CashierSummary[];
  closing?: DailyClosing;
}
