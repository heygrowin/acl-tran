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
import {
  saveTransactionToCloud,
  deleteTransactionFromCloud,
  saveClosingToCloud,
  saveLoanToCloud,
  deleteLoanFromCloud,
  saveConfigToCloud,
  deleteTransactionsBetweenInCloud
} from './firebaseService';

const STORAGE_KEYS = {
  CONFIG: 'acl_counter_config_v5',
  TRANSACTIONS: 'acl_counter_transactions_v5',
  CLOSINGS: 'acl_counter_closings_v5',
  LOANS: 'acl_counter_loans_v5',
  OPENING_BALANCES: 'acl_counter_opening_balances_v5',
  CURRENT_ROLE: 'acl_counter_current_role_v5',
  SESSION: 'acl_counter_session_v5',
};

// Payment methods: Cash, RTGS, UPI
export const DEFAULT_PAYMENT_METHODS: PaymentMethodConfig[] = [
  { id: 'cash', name: 'Cash', type: 'cash', enabled: true, color: '#10b981', iconName: 'Banknote' },
  { id: 'rtgs', name: 'RTGS', type: 'online', enabled: true, color: '#2563eb', iconName: 'Building' },
  { id: 'upi', name: 'UPI', type: 'online', enabled: true, color: '#6366f1', iconName: 'QrCode' },
];

export const DEFAULT_COUNTERS: CounterProfile[] = [
  { id: 'krishna', name: 'KRISHNA', color: '#1e1b87', bg: '#eff6ff', border: '#bfdbfe' },
  { id: 'navin', name: 'NAVIN', color: '#1e1b87', bg: '#eff6ff', border: '#bfdbfe' },
  { id: 'sunil', name: 'SUNIL', color: '#1e1b87', bg: '#eff6ff', border: '#bfdbfe' },
  { id: 'anay', name: 'ANAY', color: '#1e1b87', bg: '#eff6ff', border: '#bfdbfe' },
  { id: 'sonam', name: 'SONAM', color: '#1e1b87', bg: '#eff6ff', border: '#bfdbfe' },
  { id: 'other', name: 'OTHER', color: '#1e1b87', bg: '#eff6ff', border: '#bfdbfe' },
];

export const DEFAULT_INCOME_CATEGORIES = [
  'LAB WORK',
  'GOODS',
  'ID CARD',
  'OTHER )',
  'CASH IN HAND',
  'Customer Order',
  'Advance Payment',
  'Product Sale',
  'Service Charge',
  'Other Income'
];

export const DEFAULT_EXPENSE_CATEGORIES = [
  'TEATRANSPORT',
  'FOOD',
  'PARSAL',
  'BANK (RTGS)',
  'CASH IN HAND',
  'TEA',
  'TRANSPORTING',
  'Material / Goods Purchase',
  'Staff Wages / Salary',
  'Shop Expenses / Bills',
  'Other Expense'
];

export const DEFAULT_UPI_ACCOUNTS: string[] = [];

export const DEFAULT_CONFIG: BusinessConfig = {
  id: 'biz_default',
  businessName: 'DEMOSTRATION PACK',
  tagline: 'Daily Cash & Transaction Manager',
  phone: '+91 98765 43210',
  currency: '₹',
  adminPassword: 'admin@123',
  employeePassword: 'P@counter',
  activeStaffName: 'KRISHNA',
  staffMembers: ['KRISHNA', 'NAVIN', 'SUNIL', 'ANAY', 'SONAM', 'OTHER'],
  counters: DEFAULT_COUNTERS,
  defaultOpeningCash: 10000,
  defaultOpeningOnline: 5000,
  initialCash: 0,
  initialRtgs: 0,
  initialUpi: 0,
  incomeCategories: DEFAULT_INCOME_CATEGORIES,
  expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
  upiAccounts: DEFAULT_UPI_ACCOUNTS,
  paymentMethods: DEFAULT_PAYMENT_METHODS,
  theme: 'light',
  soundEnabled: false,
  storageMode: 'firebase',
};

// Helper: Format Date to YYYY-MM-DD
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: Format Date to DD-MM-YYYY
export function formatDDMMYYYY(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
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

export function isCashInHandTransaction(t: Transaction | null | undefined): boolean {
  if (!t) return false;
  const cat = (t.category || '').trim().toUpperCase();
  const note = (t.note || '').trim().toUpperCase();
  
  if (
    cat === 'CASH IN HAND' ||
    cat === 'CASH IN HANDS' ||
    cat === 'CASH-IN-HAND' ||
    cat === 'CASH_IN_HAND' ||
    cat.includes('CASH IN HAND') ||
    cat.includes('CASH IN HANDS') ||
    cat.includes('CASH-IN-HAND')
  ) {
    return true;
  }

  if (
    note.includes('PHYSICAL DRAWER COUNT') ||
    note.includes('CASH IN HAND') ||
    note.includes('CASH IN HANDS') ||
    note.includes('PHYSICAL CASH HANDOVER') ||
    note.includes('CLOSING HANDOVER')
  ) {
    return true;
  }

  return false;
}

export function isRightSideEntry(t: Transaction): boolean {
  if (t.type === 'expense') return true;
  if (isCashInHandTransaction(t)) return true;
  const cUpper = (t.category || '').trim().toUpperCase();
  if (cUpper === 'BANK (RTGS)') return true;
  if (cUpper.startsWith('UPI ') && !cUpper.includes('LAB WORK') && !cUpper.includes('GOODS')) return true;
  return false;
}

// Clean Initial State (0 Sample Data)
function seedInitialData(): {
  config: BusinessConfig;
  transactions: Transaction[];
  closings: DailyClosing[];
  loans: LoanRecord[];
} {
  return {
    config: DEFAULT_CONFIG,
    transactions: [],
    closings: [],
    loans: [],
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
    
    // Purge any legacy demo data from older v4 keys
    try {
      localStorage.removeItem('acl_counter_config_v4');
      localStorage.removeItem('acl_counter_transactions_v4');
      localStorage.removeItem('acl_counter_closings_v4');
      localStorage.removeItem('acl_counter_loans_v4');
    } catch (e) {
      // ignore
    }

    // Purge any synthetic test/demo loans or test transactions
    try {
      const rawLoans = localStorage.getItem(STORAGE_KEYS.LOANS);
      if (rawLoans) {
        const loans: LoanRecord[] = JSON.parse(rawLoans);
        const cleanLoans = loans.filter(l => {
          const name = (l.borrowerName || '').trim().toLowerCase();
          const note = (l.notes || '').toLowerCase();
          return !name.includes('ramesh') && !note.includes('emergency loan') && !note.includes('advance for raw material');
        });
        if (cleanLoans.length !== loans.length) {
          localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(cleanLoans));
        }
      }

      const rawTxs = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (rawTxs) {
        const txs: Transaction[] = JSON.parse(rawTxs);
        const cleanTxs = txs.filter(t => {
          const note = (t.note || '').toLowerCase();
          const cat = (t.category || '').toLowerCase();
          const date = t.date || '';
          return (
            !note.includes('ramesh') &&
            date !== '2026-08-18' &&
            cat !== 'owner drawer cash withdrawal' &&
            !note.includes('admin took cash from vault drawer') &&
            !note.includes('emergency loan') &&
            !note.includes('advance for raw material')
          );
        });
        if (cleanTxs.length !== txs.length) {
          localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(cleanTxs));
        }
      }
    } catch (e) {
      // ignore
    }

    const existingConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (!existingConfig) {
      const initial = seedInitialData();
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(initial.config));
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(initial.transactions));
      localStorage.setItem(STORAGE_KEYS.CLOSINGS, JSON.stringify(initial.closings));
      localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(initial.loans));
      saveConfigToCloud(initial.config);
    }
  }

  // --- CONFIG ---
  public getConfig(): BusinessConfig {
    let savedTreasury = { cash: 0, rtgs: 0, upi: 0 };
    try {
      const rawTreasury = localStorage.getItem('acl_counter_initial_treasury_balances');
      if (rawTreasury) {
        savedTreasury = JSON.parse(rawTreasury);
      }
    } catch (e) {
      // ignore
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          initialCash: Number(parsed.initialCash) || Number(savedTreasury.cash) || 0,
          initialRtgs: Number(parsed.initialRtgs) || Number(savedTreasury.rtgs) || 0,
          initialUpi: Number(parsed.initialUpi) || Number(savedTreasury.upi) || 0,
          incomeCategories: Array.isArray(parsed.incomeCategories) ? parsed.incomeCategories : DEFAULT_INCOME_CATEGORIES,
          expenseCategories: Array.isArray(parsed.expenseCategories) ? parsed.expenseCategories : DEFAULT_EXPENSE_CATEGORIES,
          upiAccounts: Array.isArray(parsed.upiAccounts)
            ? parsed.upiAccounts.filter((a: string) => !['Shop QR', 'PhonePe QR', 'Paytm QR', 'Bank QR', 'Bank UPI'].includes(a))
            : DEFAULT_UPI_ACCOUNTS,
          counters: (parsed.counters && parsed.counters.length > 0) ? parsed.counters : DEFAULT_COUNTERS,
        };
      }
    } catch (e) {
      console.error('Failed to load config', e);
    }
    return {
      ...DEFAULT_CONFIG,
      initialCash: Number(savedTreasury.cash) || 0,
      initialRtgs: Number(savedTreasury.rtgs) || 0,
      initialUpi: Number(savedTreasury.upi) || 0,
    };
  }

  public saveConfig(config: BusinessConfig): void {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
    saveConfigToCloud(config);
  }

  // --- SESSION PERSISTENCE ---
  public getSession(): { role: 'admin' | 'employee'; member: string } | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.role === 'admin' || parsed.role === 'employee')) {
          return parsed;
        }
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  public saveSession(role: 'admin' | 'employee', member: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify({ role, member }));
    } catch (e) {
      // ignore
    }
  }

  public clearSession(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    } catch (e) {
      // ignore
    }
  }

  // --- COUNTERS MANAGEMENT ---
  public addCounter(name: string, password?: string, color?: string): void {
    const cleanName = name.trim();
    if (!cleanName) return;
    const cfg = this.getConfig();
    const existing = cfg.counters || DEFAULT_COUNTERS;
    
    if (existing.some(c => c.name.toLowerCase() === cleanName.toLowerCase())) {
      return;
    }

    const newId = `cnt_${Date.now()}`;
    const newCounter: CounterProfile = {
      id: newId,
      name: cleanName,
      password: password && password.trim() ? password.trim() : undefined,
      color: color || '#3b82f6',
    };

    this.saveConfig({
      ...cfg,
      counters: [...existing, newCounter],
      staffMembers: Array.from(new Set([...cfg.staffMembers, cleanName])),
    });
  }

  public updateCounter(id: string, name: string, password?: string, color?: string): void {
    const cfg = this.getConfig();
    const existing = cfg.counters || DEFAULT_COUNTERS;
    const updatedCounters = existing.map(c => {
      if (c.id === id) {
        return {
          ...c,
          name: name.trim() || c.name,
          password: password !== undefined ? (password.trim() || undefined) : c.password,
          color: color || c.color,
        };
      }
      return c;
    });

    this.saveConfig({
      ...cfg,
      counters: updatedCounters,
      staffMembers: Array.from(new Set(updatedCounters.map(c => c.name))),
    });
  }

  public deleteCounter(id: string): boolean {
    const cfg = this.getConfig();
    const existing = cfg.counters || DEFAULT_COUNTERS;
    if (existing.length <= 1) return false;

    const counterToDelete = existing.find(c => c.id === id);
    const updatedCounters = existing.filter(c => c.id !== id);

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

  public updateCategory(type: 'income' | 'expense', oldName: string, newName: string): boolean {
    const cleanOld = oldName.trim();
    const cleanNew = newName.trim();
    if (!cleanOld || !cleanNew || cleanOld === cleanNew) return false;

    const cfg = this.getConfig();
    if (type === 'income') {
      const updated = (cfg.incomeCategories || []).map(c => (c.toLowerCase() === cleanOld.toLowerCase() ? cleanNew : c));
      this.saveConfig({ ...cfg, incomeCategories: updated });
    } else {
      const updated = (cfg.expenseCategories || []).map(c => (c.toLowerCase() === cleanOld.toLowerCase() ? cleanNew : c));
      this.saveConfig({ ...cfg, expenseCategories: updated });
    }

    // Also update existing transactions with this category name
    const txs = this.getTransactions();
    let changed = false;
    const updatedTxs = txs.map(t => {
      if (t.type === type && t.category && t.category.toLowerCase() === cleanOld.toLowerCase()) {
        changed = true;
        return { ...t, category: cleanNew, updatedAt: Date.now() };
      }
      return t;
    });
    if (changed) {
      this.saveTransactions(updatedTxs);
    }
    return true;
  }

  // --- AUTO-SAVE UPI ACCOUNT ---
  public addUpiAccount(acc: string): void {
    const cleanAcc = acc.trim();
    if (!cleanAcc) return;
    const cfg = this.getConfig();
    const existing = cfg.upiAccounts || DEFAULT_UPI_ACCOUNTS;
    if (!existing.some(a => a.toLowerCase() === cleanAcc.toLowerCase())) {
      this.saveConfig({
        ...cfg,
        upiAccounts: [cleanAcc, ...existing],
      });
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

  // --- TREASURY INITIAL BALANCES & RUNNING TOTALS ---
  public getInitialTreasuryBalances(): { cash: number; rtgs: number; upi: number } {
    let savedBalances = { cash: 0, rtgs: 0, upi: 0 };
    try {
      const raw = localStorage.getItem('acl_counter_initial_treasury_balances');
      if (raw) {
        savedBalances = JSON.parse(raw);
      }
    } catch (e) {
      // ignore
    }
    const config = this.getConfig();
    return {
      cash: Number(config.initialCash) || Number(savedBalances.cash) || 0,
      rtgs: Number(config.initialRtgs) || Number(savedBalances.rtgs) || 0,
      upi: Number(config.initialUpi) || Number(savedBalances.upi) || 0,
    };
  }

  public setInitialTreasuryBalances(balances: { cash: number; rtgs: number; upi: number }): void {
    const cleanBalances = {
      cash: Number(balances.cash) || 0,
      rtgs: Number(balances.rtgs) || 0,
      upi: Number(balances.upi) || 0,
    };
    try {
      localStorage.setItem('acl_counter_initial_treasury_balances', JSON.stringify(cleanBalances));
    } catch (e) {
      // ignore
    }
    const config = this.getConfig();
    config.initialCash = cleanBalances.cash;
    config.initialRtgs = cleanBalances.rtgs;
    config.initialUpi = cleanBalances.upi;
    this.saveConfig(config);
  }

  public calculateTreasuryBalances(transactionsList?: Transaction[], upToDate?: string): {
    initialCash: number;
    initialRtgs: number;
    initialUpi: number;
    initialTotal: number;
    
    receivedCash: number;
    receivedRtgs: number;
    receivedUpi: number;
    receivedTotal: number;
    
    expenseCash: number;
    expenseRtgs: number;
    expenseUpi: number;
    expenseTotal: number;
    
    adminExpenseCash: number;
    adminExpenseRtgs: number;
    adminExpenseUpi: number;
    adminExpenseTotal: number;

    adminIncomeCash: number;
    adminIncomeRtgs: number;
    adminIncomeUpi: number;
    adminIncomeTotal: number;

    adminTransactions: Transaction[];
    
    actualCash: number;
    actualRtgs: number;
    actualUpi: number;
    actualTotal: number;
  } {
    const init = this.getInitialTreasuryBalances();
    const allTxs = transactionsList || this.getTransactions();
    
    const relevantTxs = upToDate 
      ? allTxs.filter(t => t.date <= upToDate)
      : allTxs;

    let receivedCash = 0;
    let receivedRtgs = 0;
    let receivedUpi = 0;

    let expenseCash = 0;
    let expenseRtgs = 0;
    let expenseUpi = 0;

    let adminExpenseCash = 0;
    let adminExpenseRtgs = 0;
    let adminExpenseUpi = 0;

    let adminIncomeCash = 0;
    let adminIncomeRtgs = 0;
    let adminIncomeUpi = 0;

    let counterClosingCash = 0;

    const adminTransactions: Transaction[] = [];

    relevantTxs.forEach(t => {
      if (!t) return;
      const pMethod = (t.paymentMethod || 'cash').toString().toLowerCase();
      const sName = (t.staffName || '').trim().toUpperCase();
      const isAdmin = sName === 'ADMIN' || sName === 'ADMIN / OWNER' || sName === 'OWNER';
      const cUpper = (t.category || '').trim().toUpperCase();
      const isRightSide = cUpper === 'CASH IN HAND' || cUpper === 'BANK (RTGS)' || (cUpper.startsWith('UPI ') && !cUpper.includes('LAB WORK') && !cUpper.includes('GOODS'));

      if (isAdmin) {
        adminTransactions.push(t);
      }

      // Counter cash handed over upon Day Closing or physical transfer into Admin drawer
      const isCounterCashHandover = (cUpper === 'CASH IN HAND' || cUpper === 'CASH IN HAND (DRAWER/SAFE)') && pMethod === 'cash' && !isAdmin;
      if (isCounterCashHandover) {
        counterClosingCash += (t.amount || 0);
      }

      if (t.type === 'income') {
        if (!isRightSide) {
          if (pMethod === 'cash') {
            receivedCash += (t.amount || 0);
            if (isAdmin) adminIncomeCash += (t.amount || 0);
          } else if (pMethod === 'rtgs') {
            receivedRtgs += (t.amount || 0);
            if (isAdmin) adminIncomeRtgs += (t.amount || 0);
          } else if (pMethod === 'upi') {
            receivedUpi += (t.amount || 0);
            if (isAdmin) adminIncomeUpi += (t.amount || 0);
          }
        }
      } else if (t.type === 'expense') {
        if (pMethod === 'cash') {
          expenseCash += (t.amount || 0);
          if (isAdmin) adminExpenseCash += (t.amount || 0);
        } else if (pMethod === 'rtgs') {
          expenseRtgs += (t.amount || 0);
          if (isAdmin) adminExpenseRtgs += (t.amount || 0);
        } else if (pMethod === 'upi') {
          expenseUpi += (t.amount || 0);
          if (isAdmin) adminExpenseUpi += (t.amount || 0);
        }
      }
    });

    const receivedTotal = receivedCash + receivedRtgs + receivedUpi;
    const expenseTotal = expenseCash + expenseRtgs + expenseUpi;
    const adminExpenseTotal = adminExpenseCash + adminExpenseRtgs + adminExpenseUpi;
    const adminIncomeTotal = adminIncomeCash + adminIncomeRtgs + adminIncomeUpi;

    // Actual Cash in Admin drawer = Initial Baseline Cash + Day Closings/Handovers from Counters + Admin direct cash deposits - Admin direct cash withdrawals
    const actualCash = init.cash + counterClosingCash + adminIncomeCash - adminExpenseCash;
    const actualRtgs = init.rtgs + receivedRtgs - expenseRtgs;
    const actualUpi = init.upi + receivedUpi - expenseUpi;
    const actualTotal = actualCash + actualRtgs + actualUpi;

    // Sort admin transactions newest first
    adminTransactions.sort((a, b) => {
      const dateDiff = (b.date || '').localeCompare(a.date || '');
      if (dateDiff !== 0) return dateDiff;
      return (b.time || '').localeCompare(a.time || '');
    });

    return {
      initialCash: init.cash,
      initialRtgs: init.rtgs,
      initialUpi: init.upi,
      initialTotal: init.cash + init.rtgs + init.upi,
      
      receivedCash,
      receivedRtgs,
      receivedUpi,
      receivedTotal,
      
      expenseCash,
      expenseRtgs,
      expenseUpi,
      expenseTotal,
      
      adminExpenseCash,
      adminExpenseRtgs,
      adminExpenseUpi,
      adminExpenseTotal,

      adminIncomeCash,
      adminIncomeRtgs,
      adminIncomeUpi,
      adminIncomeTotal,

      adminTransactions,
      
      actualCash,
      actualRtgs,
      actualUpi,
      actualTotal,
    };
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
    saveTransactionToCloud(newTx);
    return newTx;
  }

  public updateTransaction(updatedTx: Transaction): void {
    const transactions = this.getTransactions();
    const idx = transactions.findIndex(t => t.id === updatedTx.id);
    if (idx !== -1) {
      const tx = { ...updatedTx, updatedAt: Date.now() };
      transactions[idx] = tx;
      this.saveTransactions(transactions);
      saveTransactionToCloud(tx);
    }
  }

  public deleteTransaction(id: string): void {
    const transactions = this.getTransactions().filter(t => t.id !== id);
    this.saveTransactions(transactions);
    deleteTransactionFromCloud(id);
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
    const cfg = this.getConfig();
    deleteTransactionsBetweenInCloud(cfg.id, startDate, endDate);
    return deletedCount;
  }

  public deleteTransactionsByMonth(yearMonth: string): number {
    const transactions = this.getTransactions();
    const toKeep = transactions.filter(t => !t.date.startsWith(yearMonth));
    const deletedCount = transactions.length - toKeep.length;
    this.saveTransactions(toKeep);
    const cfg = this.getConfig();
    deleteTransactionsBetweenInCloud(cfg.id, `${yearMonth}-01`, `${yearMonth}-31`);
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
    saveClosingToCloud(newClosing);

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

    const cfg = this.getConfig();
    const bizId = cfg.id || 'biz_default';

    if (loan) {
      loan.totalLent += amount;
      loan.pendingAmount += amount;
      loan.lastActivityDate = date;
      if (notes) loan.notes = notes;
      loan.updatedAt = now;
      loan.businessId = bizId;
    } else {
      loan = {
        id: `loan_${now}_${Math.random().toString(36).substring(2, 6)}`,
        businessId: bizId,
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
    saveLoanToCloud(loan);

    // Auto-create Expense (Money Out) transaction
    const tx = this.addTransaction({
      businessId: bizId,
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

    const cfg = this.getConfig();
    const bizId = cfg.id || 'biz_default';
    const now = Date.now();
    loan.totalRepaid += amount;
    loan.pendingAmount = Math.max(0, loan.pendingAmount - amount);
    loan.lastActivityDate = date;
    loan.updatedAt = now;
    loan.businessId = bizId;
    this.saveLoans(loans);
    saveLoanToCloud(loan);

    // Auto-create Income (Money In) transaction
    const tx = this.addTransaction({
      businessId: bizId,
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
    deleteLoanFromCloud(id);
  }

  // --- DATA BACKUP / RESTORE ---
  public exportFullBackup(): string {
    const data = {
      version: '5.0',
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
      if (data.config) this.saveConfig(data.config);
      if (data.transactions) {
        this.saveTransactions(data.transactions);
        data.transactions.forEach((t: Transaction) => saveTransactionToCloud(t));
      }
      if (data.closings) {
        localStorage.setItem(STORAGE_KEYS.CLOSINGS, JSON.stringify(data.closings));
        data.closings.forEach((c: DailyClosing) => saveClosingToCloud(c));
      }
      if (data.loans) {
        this.saveLoans(data.loans);
        data.loans.forEach((l: LoanRecord) => saveLoanToCloud(l));
      }
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
