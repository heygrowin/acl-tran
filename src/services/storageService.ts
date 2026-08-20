import type {
  BusinessConfig,
  Transaction,
  DailyClosing,
  LoanRecord,
  CashierSummary,
  DayBalances,
  PaymentMethodConfig,
  CounterProfile
} from '../types';

const STORAGE_KEYS = {
  CONFIG: 'acl_counter_config_v4',
  TRANSACTIONS: 'acl_counter_transactions_v4',
  CLOSINGS: 'acl_counter_closings_v4',
  LOANS: 'acl_counter_loans_v4',
  OPENING_BALANCES: 'acl_counter_opening_balances_v4',
  CURRENT_ROLE: 'acl_counter_current_role_v4',
};

// Payment methods: Cash, UPI, RTGS
export const DEFAULT_PAYMENT_METHODS: PaymentMethodConfig[] = [
  { id: 'cash', name: 'Cash', type: 'cash', enabled: true, color: '#10b981', iconName: 'Banknote' },
  { id: 'upi', name: 'UPI', type: 'online', enabled: true, color: '#6366f1', iconName: 'QrCode' },
  { id: 'rtgs', name: 'RTGS', type: 'online', enabled: true, color: '#2563eb', iconName: 'Building' },
];

export const DEFAULT_COUNTERS: CounterProfile[] = [
  { id: 'counter_1', name: 'Counter Member 1', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { id: 'counter_2', name: 'Counter Member 2', color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
  { id: 'counter_3', name: 'Counter Member 3', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { id: 'counter_4', name: 'Counter Member 4', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
];

export const DEFAULT_INCOME_CATEGORIES = [
  'Customer Order',
  'Advance Payment',
  'Product Sale',
  'Service Charge',
  'Other Income'
];

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Tea & Snacks',
  'Delivery & Auto/Fuel',
  'Material / Goods Purchase',
  'Staff Wages / Salary',
  'Shop Expenses / Bills',
  'Other Expense'
];

export const DEFAULT_CONFIG: BusinessConfig = {
  id: 'biz_default',
  businessName: 'My Store Counter',
  tagline: 'Daily Cash & Transaction Manager',
  phone: '+91 98765 43210',
  currency: '₹',
  adminPassword: 'admin@123',
  employeePassword: 'P@counter',
  activeStaffName: 'Counter Member 1',
  staffMembers: ['Counter Member 1', 'Counter Member 2', 'Counter Member 3', 'Counter Member 4', 'Admin / Owner'],
  counters: DEFAULT_COUNTERS,
  defaultOpeningCash: 10000,
  defaultOpeningOnline: 5000,
  incomeCategories: DEFAULT_INCOME_CATEGORIES,
  expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
  paymentMethods: DEFAULT_PAYMENT_METHODS,
  theme: 'light',
  soundEnabled: true,
  storageMode: 'local',
};

// Helper: Format Date to YYYY-MM-DD
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentTimeString(): string {
  const d = new Date();
  return d.toTimeString().split(' ')[0].substring(0, 5); // HH:mm
}

export function formatCurrency(amount: number, currency = '₹'): string {
  const isNeg = amount < 0;
  const absVal = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(absVal);
  return `${isNeg ? '-' : ''}${currency}${formatted}`;
}

// Initial seed demo data
function seedInitialData(): {
  config: BusinessConfig;
  transactions: Transaction[];
  closings: DailyClosing[];
  loans: LoanRecord[];
} {
  const today = getTodayDateString();
  const now = Date.now();

  const transactions: Transaction[] = [
    {
      id: 'tx_demo_1',
      businessId: 'biz_default',
      date: today,
      time: '10:15',
      type: 'income',
      amount: 2500,
      paymentMethod: 'cash',
      category: 'Customer Order',
      note: 'Customer Order #101',
      staffName: 'Counter Member 1',
      createdAt: now - 3600000 * 6,
      updatedAt: now - 3600000 * 6,
    },
    {
      id: 'tx_demo_2',
      businessId: 'biz_default',
      date: today,
      time: '11:30',
      type: 'income',
      amount: 1200,
      paymentMethod: 'upi',
      category: 'Customer Order',
      note: 'Online UPI payment',
      staffName: 'Counter Member 2',
      createdAt: now - 3600000 * 5,
      updatedAt: now - 3600000 * 5,
    },
    {
      id: 'tx_demo_3',
      businessId: 'biz_default',
      date: today,
      time: '12:10',
      type: 'expense',
      amount: 150,
      paymentMethod: 'cash',
      category: 'Tea & Snacks',
      note: 'Morning tea and snacks',
      staffName: 'Counter Member 1',
      createdAt: now - 3600000 * 4,
      updatedAt: now - 3600000 * 4,
    },
    {
      id: 'tx_demo_4',
      businessId: 'biz_default',
      date: today,
      time: '13:45',
      type: 'income',
      amount: 5000,
      paymentMethod: 'upi',
      category: 'Advance Payment',
      note: 'Advance payment via UPI',
      staffName: 'Counter Member 3',
      createdAt: now - 3600000 * 3,
      updatedAt: now - 3600000 * 3,
    },
    {
      id: 'tx_demo_5',
      businessId: 'biz_default',
      date: today,
      time: '14:20',
      type: 'expense',
      amount: 300,
      paymentMethod: 'cash',
      category: 'Delivery & Auto/Fuel',
      note: 'Parcel delivery charge',
      staffName: 'Counter Member 1',
      createdAt: now - 3600000 * 2.5,
      updatedAt: now - 3600000 * 2.5,
    },
    {
      id: 'tx_demo_6',
      businessId: 'biz_default',
      date: today,
      time: '15:10',
      type: 'expense',
      amount: 2000,
      paymentMethod: 'rtgs',
      category: 'Material / Goods Purchase',
      note: 'Stock goods purchase via RTGS',
      staffName: 'Counter Member 4',
      createdAt: now - 3600000 * 2,
      updatedAt: now - 3600000 * 2,
    },
    {
      id: 'tx_demo_7',
      businessId: 'biz_default',
      date: today,
      time: '16:00',
      type: 'expense',
      amount: 10000,
      paymentMethod: 'cash',
      category: 'Loan Given',
      note: 'Lent money to Ramesh for medical emergency',
      isLoan: true,
      loanType: 'given',
      borrowerName: 'Ramesh Sharma',
      borrowerPhone: '9876543210',
      loanId: 'loan_demo_1',
      staffName: 'Counter Member 1',
      createdAt: now - 3600000,
      updatedAt: now - 3600000,
    }
  ];

  const loans: LoanRecord[] = [
    {
      id: 'loan_demo_1',
      businessId: 'biz_default',
      borrowerName: 'Ramesh Sharma',
      borrowerPhone: '9876543210',
      totalLent: 10000,
      totalRepaid: 0,
      pendingAmount: 10000,
      notes: 'Medical emergency loan',
      lastActivityDate: today,
      createdAt: now - 3600000,
      updatedAt: now - 3600000,
    }
  ];

  return {
    config: DEFAULT_CONFIG,
    transactions,
    closings: [],
    loans,
  };
}

export class StorageService {
  private static instance: StorageService;

  private constructor() {
    this.ensureInitialized();
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private ensureInitialized() {
    if (typeof window === 'undefined') return;
    const existingConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (!existingConfig) {
      const initial = seedInitialData();
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(initial.config));
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(initial.transactions));
      localStorage.setItem(STORAGE_KEYS.CLOSINGS, JSON.stringify(initial.closings));
      localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(initial.loans));
    }
  }

  // --- CONFIG ---
  public getConfig(): BusinessConfig {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          counters: (parsed.counters && parsed.counters.length > 0) ? parsed.counters : DEFAULT_COUNTERS,
        };
      }
    } catch (e) {
      console.error('Failed to load config', e);
    }
    return DEFAULT_CONFIG;
  }

  public saveConfig(config: BusinessConfig): void {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  }

  // --- COUNTERS MANAGEMENT ---
  public getCounters(): CounterProfile[] {
    const cfg = this.getConfig();
    return cfg.counters || DEFAULT_COUNTERS;
  }

  public addCounter(name: string, password?: string, color = '#2563eb'): CounterProfile {
    const cfg = this.getConfig();
    const cleanName = name.trim();
    const id = `counter_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    
    const newCounter: CounterProfile = {
      id,
      name: cleanName,
      color,
      bg: '#eff6ff',
      border: '#bfdbfe',
      password: password?.trim() || undefined,
    };

    const updatedCounters = [...(cfg.counters || DEFAULT_COUNTERS), newCounter];
    const updatedStaff = Array.from(new Set([...cfg.staffMembers, cleanName]));

    this.saveConfig({
      ...cfg,
      counters: updatedCounters,
      staffMembers: updatedStaff,
    });

    return newCounter;
  }

  public updateCounter(id: string, name: string, password?: string, color?: string): void {
    const cfg = this.getConfig();
    const cleanName = name.trim();
    const counters = (cfg.counters || DEFAULT_COUNTERS).map(c => {
      if (c.id === id) {
        return {
          ...c,
          name: cleanName,
          color: color || c.color,
          password: password !== undefined ? (password.trim() || undefined) : c.password,
        };
      }
      return c;
    });

    this.saveConfig({
      ...cfg,
      counters,
    });
  }

  public deleteCounter(id: string): boolean {
    const cfg = this.getConfig();
    const counters = cfg.counters || DEFAULT_COUNTERS;
    if (counters.length <= 1) {
      return false; // keep at least 1 counter
    }

    const counterToDelete = counters.find(c => c.id === id);
    const updatedCounters = counters.filter(c => c.id !== id);

    this.saveConfig({
      ...cfg,
      counters: updatedCounters,
      staffMembers: counterToDelete ? cfg.staffMembers.filter(s => s !== counterToDelete.name) : cfg.staffMembers,
    });

    return true;
  }

  // --- AUTO-SAVE CATEGORY ---
  public addCategory(type: 'income' | 'expense', cat: string): void {
    const cleanCat = cat.trim();
    if (!cleanCat) return;
    const cfg = this.getConfig();
    if (type === 'income') {
      if (!cfg.incomeCategories.some(c => c.toLowerCase() === cleanCat.toLowerCase())) {
        this.saveConfig({
          ...cfg,
          incomeCategories: [cleanCat, ...cfg.incomeCategories],
        });
      }
    } else {
      if (!cfg.expenseCategories.some(c => c.toLowerCase() === cleanCat.toLowerCase())) {
        this.saveConfig({
          ...cfg,
          expenseCategories: [cleanCat, ...cfg.expenseCategories],
        });
      }
    }
  }

  // --- OPENING BALANCES PER DATE ---
  public getOpeningBalances(date: string): { cash: number; online: number } {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.OPENING_BALANCES);
      const map = raw ? JSON.parse(raw) : {};
      if (map[date]) {
        return map[date];
      }
    } catch (e) {
      console.error('Error fetching opening balances', e);
    }

    const closings = this.getClosings();
    const prevDayClosing = closings
      .filter(c => c.date < date)
      .sort((a, b) => b.date.localeCompare(a.date))[0];

    if (prevDayClosing) {
      return {
        cash: prevDayClosing.actualCash,
        online: prevDayClosing.actualOnline,
      };
    }

    const config = this.getConfig();
    return {
      cash: config.defaultOpeningCash,
      online: config.defaultOpeningOnline,
    };
  }

  public setOpeningBalances(date: string, cash: number, online: number): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.OPENING_BALANCES);
      const map = raw ? JSON.parse(raw) : {};
      map[date] = { cash, online };
      localStorage.setItem(STORAGE_KEYS.OPENING_BALANCES, JSON.stringify(map));
    } catch (e) {
      console.error('Error saving opening balances', e);
    }
  }

  // --- TRANSACTIONS ---
  public getTransactions(): Transaction[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Failed to parse transactions', e);
    }
    return [];
  }

  public saveTransactions(txs: Transaction[]): void {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
  }

  public addTransaction(tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Transaction {
    const transactions = this.getTransactions();
    const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();
    const newTx: Transaction = {
      ...tx,
      id,
      createdAt: now,
      updatedAt: now,
    };

    transactions.unshift(newTx);
    this.saveTransactions(transactions);
    return newTx;
  }

  public updateTransaction(updatedTx: Transaction): void {
    const transactions = this.getTransactions();
    const idx = transactions.findIndex(t => t.id === updatedTx.id);
    if (idx !== -1) {
      transactions[idx] = { ...updatedTx, updatedAt: Date.now() };
      this.saveTransactions(transactions);
    }
  }

  public deleteTransaction(id: string): void {
    const transactions = this.getTransactions().filter(t => t.id !== id);
    this.saveTransactions(transactions);
  }

  // --- DATE RANGE TRANSACTIONS QUERY & PURGE ---
  public getTransactionsBetween(startDate: string, endDate: string): Transaction[] {
    return this.getTransactions().filter(t => t.date >= startDate && t.date <= endDate);
  }

  public deleteTransactionsBetween(startDate: string, endDate: string): number {
    const transactions = this.getTransactions();
    const toKeep = transactions.filter(t => t.date < startDate || t.date > endDate);
    const deletedCount = transactions.length - toKeep.length;
    this.saveTransactions(toKeep);
    return deletedCount;
  }

  public deleteTransactionsByMonth(yearMonth: string): number {
    const transactions = this.getTransactions();
    const toKeep = transactions.filter(t => !t.date.startsWith(yearMonth));
    const deletedCount = transactions.length - toKeep.length;
    this.saveTransactions(toKeep);
    return deletedCount;
  }

  public deleteAllTransactions(): number {
    const count = this.getTransactions().length;
    this.saveTransactions([]);
    return count;
  }

  // --- DAILY BALANCES & RECONCILIATION ---
  public calculateDayBalances(date: string): DayBalances {
    const txs = this.getTransactions().filter(t => t.date === date);
    const opening = this.getOpeningBalances(date);

    let cashIncome = 0;
    let cashExpense = 0;
    let onlineIncome = 0;
    let onlineExpense = 0;

    // Multi-cashier breakdown map
    const cashierMap: Record<string, CashierSummary> = {};

    txs.forEach(t => {
      const isCash = t.paymentMethod.toLowerCase() === 'cash';
      const staff = t.staffName || 'Counter Staff';

      if (!cashierMap[staff]) {
        cashierMap[staff] = {
          staffName: staff,
          income: 0,
          expense: 0,
          cashIncome: 0,
          cashExpense: 0,
          onlineIncome: 0,
          onlineExpense: 0,
          transactionCount: 0,
        };
      }

      cashierMap[staff].transactionCount += 1;

      if (t.type === 'income') {
        cashierMap[staff].income += t.amount;
        if (isCash) {
          cashIncome += t.amount;
          cashierMap[staff].cashIncome += t.amount;
        } else {
          onlineIncome += t.amount;
          cashierMap[staff].onlineIncome += t.amount;
        }
      } else if (t.type === 'expense') {
        cashierMap[staff].expense += t.amount;
        if (isCash) {
          cashExpense += t.amount;
          cashierMap[staff].cashExpense += t.amount;
        } else {
          onlineExpense += t.amount;
          cashierMap[staff].onlineExpense += t.amount;
        }
      }
    });

    const expectedCash = opening.cash + cashIncome - cashExpense;
    const expectedOnline = opening.online + onlineIncome - onlineExpense;
    const totalIncome = cashIncome + onlineIncome;
    const totalExpense = cashExpense + onlineExpense;
    const netFlow = totalIncome - totalExpense;

    const closing = this.getClosingForDate(date);
    const cashierSummaries = Object.values(cashierMap);

    return {
      date,
      openingCash: opening.cash,
      openingOnline: opening.online,
      cashIncome,
      cashExpense,
      onlineIncome,
      onlineExpense,
      expectedCash,
      expectedOnline,
      totalIncome,
      totalExpense,
      netFlow,
      totalTransactionsCount: txs.length,
      cashierSummaries,
      closing,
    };
  }

  // --- DAILY CLOSINGS ---
  public getClosings(): DailyClosing[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CLOSINGS);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse closings', e);
    }
    return [];
  }

  public getClosingForDate(date: string): DailyClosing | undefined {
    const closings = this.getClosings();
    return closings.find(c => c.date === date);
  }

  public saveClosing(closing: Omit<DailyClosing, 'id' | 'closedAt'>): DailyClosing {
    const closings = this.getClosings().filter(c => c.date !== closing.date);
    const id = `closing_${closing.date}`;
    
    // Automatically attach cashier breakdown for report
    const balances = this.calculateDayBalances(closing.date);

    const newClosing: DailyClosing = {
      ...closing,
      id,
      cashierSummaries: closing.cashierSummaries || balances.cashierSummaries,
      closedAt: Date.now(),
    };
    closings.unshift(newClosing);
    localStorage.setItem(STORAGE_KEYS.CLOSINGS, JSON.stringify(closings));

    // Prefill tomorrow's opening balance
    const nextDate = new Date(closing.date);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateStr = nextDate.toISOString().split('T')[0];
    this.setOpeningBalances(nextDateStr, closing.actualCash, closing.actualOnline);

    return newClosing;
  }

  // --- LOANS & MONEY LENT (Lending / Borrowing) ---
  public getLoans(): LoanRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.LOANS);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse loans', e);
    }
    return [];
  }

  public saveLoans(loans: LoanRecord[]): void {
    localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(loans));
  }

  public giveLoan(
    borrowerName: string,
    borrowerPhone: string,
    amount: number,
    paymentMethod: string,
    staffName: string,
    date = getTodayDateString(),
    notes?: string
  ): { loan: LoanRecord; transaction: Transaction } {
    const loans = this.getLoans();
    const cleanName = borrowerName.trim();
    const cleanPhone = borrowerPhone.trim();
    const now = Date.now();

    let loan = loans.find(l => (cleanPhone && l.borrowerPhone === cleanPhone) || l.borrowerName.toLowerCase() === cleanName.toLowerCase());

    if (loan) {
      loan.totalLent += amount;
      loan.pendingAmount += amount;
      loan.lastActivityDate = date;
      if (notes) loan.notes = notes;
      loan.updatedAt = now;
    } else {
      loan = {
        id: `loan_${now}_${Math.random().toString(36).substring(2, 6)}`,
        businessId: 'biz_default',
        borrowerName: cleanName,
        borrowerPhone: cleanPhone,
        totalLent: amount,
        totalRepaid: 0,
        pendingAmount: amount,
        notes: notes || 'Loan given',
        lastActivityDate: date,
        createdAt: now,
        updatedAt: now,
      };
      loans.unshift(loan);
    }

    this.saveLoans(loans);

    // Auto-create Expense (Money Out) transaction
    const tx = this.addTransaction({
      businessId: 'biz_default',
      date,
      time: getCurrentTimeString(),
      type: 'expense',
      amount,
      paymentMethod,
      category: 'Loan Given',
      note: notes ? `Loan given to ${loan.borrowerName}: ${notes}` : `Loan given to ${loan.borrowerName}`,
      isLoan: true,
      loanType: 'given',
      borrowerName: loan.borrowerName,
      borrowerPhone: loan.borrowerPhone,
      loanId: loan.id,
      staffName,
    });

    return { loan, transaction: tx };
  }

  public repayLoan(
    loanId: string,
    amount: number,
    paymentMethod: string,
    staffName: string,
    date = getTodayDateString(),
    notes?: string
  ): { loan: LoanRecord; transaction: Transaction } {
    const loans = this.getLoans();
    const loan = loans.find(l => l.id === loanId);
    if (!loan) throw new Error('Loan account not found');

    const now = Date.now();
    loan.totalRepaid += amount;
    loan.pendingAmount = Math.max(0, loan.pendingAmount - amount);
    loan.lastActivityDate = date;
    loan.updatedAt = now;
    this.saveLoans(loans);

    // Auto-create Income (Money In) transaction
    const tx = this.addTransaction({
      businessId: 'biz_default',
      date,
      time: getCurrentTimeString(),
      type: 'income',
      amount,
      paymentMethod,
      category: 'Loan Repaid',
      note: notes ? `Loan repayment from ${loan.borrowerName}: ${notes}` : `Loan repayment from ${loan.borrowerName} (Pending: ${formatCurrency(loan.pendingAmount)})`,
      isLoan: true,
      loanType: 'repaid',
      borrowerName: loan.borrowerName,
      borrowerPhone: loan.borrowerPhone,
      loanId: loan.id,
      staffName,
    });

    return { loan, transaction: tx };
  }

  public deleteLoan(id: string): void {
    const loans = this.getLoans().filter(l => l.id !== id);
    this.saveLoans(loans);
  }

  // --- DATA BACKUP / RESTORE ---
  public exportFullBackup(): string {
    const data = {
      version: '4.0',
      exportedAt: new Date().toISOString(),
      config: this.getConfig(),
      transactions: this.getTransactions(),
      closings: this.getClosings(),
      loans: this.getLoans(),
      openingBalances: localStorage.getItem(STORAGE_KEYS.OPENING_BALANCES)
        ? JSON.parse(localStorage.getItem(STORAGE_KEYS.OPENING_BALANCES)!)
        : {},
    };
    return JSON.stringify(data, null, 2);
  }

  public importFullBackup(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.config) localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(data.config));
      if (data.transactions) localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(data.transactions));
      if (data.closings) localStorage.setItem(STORAGE_KEYS.CLOSINGS, JSON.stringify(data.closings));
      if (data.loans) localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(data.loans));
      if (data.openingBalances) localStorage.setItem(STORAGE_KEYS.OPENING_BALANCES, JSON.stringify(data.openingBalances));
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  }

  public resetToSampleData(): void {
    localStorage.clear();
    this.ensureInitialized();
  }
}

export const storage = StorageService.getInstance();
