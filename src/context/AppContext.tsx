import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  BusinessConfig,
  Transaction,
  DailyClosing,
  LoanRecord,
  DayBalances,
  CurrentScreen,
  AdminTab,
  TransactionType,
  CounterProfile
} from '../types';
import { storage, getTodayDateString } from '../services/storageService';
import { sound } from '../services/audioService';

interface AppContextType {
  config: BusinessConfig;
  updateConfig: (newConfig: BusinessConfig) => void;
  
  // Navigation & Screens
  currentScreen: CurrentScreen;
  selectedMember: string;
  loginAsMember: (member: string, password: string) => boolean;
  logoutToLanding: () => void;

  // Counter Management (Admin)
  counters: CounterProfile[];
  addCounter: (name: string, password?: string, color?: string) => void;
  updateCounter: (id: string, name: string, password?: string, color?: string) => void;
  deleteCounter: (id: string) => boolean;
  
  adminTab: AdminTab;
  setAdminTab: (tab: AdminTab) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  
  // Data
  dayBalances: DayBalances;
  transactions: Transaction[];
  todayTransactions: Transaction[];
  closings: DailyClosing[];
  loans: LoanRecord[];

  // Actions
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Transaction;
  updateTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
  addCategory: (type: TransactionType, cat: string) => void;
  saveClosing: (closing: Omit<DailyClosing, 'id' | 'closedAt'>) => DailyClosing;

  // Loan Management
  giveLoan: (borrowerName: string, borrowerPhone: string, amount: number, paymentMethod: string, notes?: string) => void;
  repayLoan: (loanId: string, amount: number, paymentMethod: string, notes?: string) => void;
  deleteLoan: (id: string) => void;

  // Data Purge
  deleteTransactionsBetween: (startDate: string, endDate: string) => number;
  deleteTransactionsByMonth: (yearMonth: string) => number;

  refreshData: () => void;

  // Modals & Triggers
  isCounterModalOpen: boolean;
  counterInitialType: TransactionType;
  editingTransaction: Transaction | null;
  openCounterModal: (initialType?: TransactionType, txToEdit?: Transaction | null) => void;
  closeCounterModal: () => void;

  isClosingModalOpen: boolean;
  openClosingModal: () => void;
  closeClosingModal: () => void;

  // Toast / Notification
  toastMessage: { text: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfigState] = useState<BusinessConfig>(() => storage.getConfig());
  const [currentScreen, setCurrentScreen] = useState<CurrentScreen>('landing');
  const [selectedMember, setSelectedMember] = useState<string>('Counter Member 1');
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());

  const [transactions, setTransactions] = useState<Transaction[]>(() => storage.getTransactions());
  const [closings, setClosings] = useState<DailyClosing[]>(() => storage.getClosings());
  const [loans, setLoans] = useState<LoanRecord[]>(() => storage.getLoans());
  const [dayBalances, setDayBalances] = useState<DayBalances>(() => storage.calculateDayBalances(getTodayDateString()));

  // UI Modals
  const [isCounterModalOpen, setIsCounterModalOpen] = useState(false);
  const [counterInitialType, setCounterInitialType] = useState<TransactionType>('income');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(prev => (prev?.text === text ? null : prev));
    }, 2800);
  }, []);

  const refreshData = useCallback(() => {
    const freshConfig = storage.getConfig();
    setConfigState(freshConfig);
    sound.setEnabled(freshConfig.soundEnabled);
    setTransactions(storage.getTransactions());
    setClosings(storage.getClosings());
    setLoans(storage.getLoans());
    setDayBalances(storage.calculateDayBalances(selectedDate));
  }, [selectedDate]);

  useEffect(() => {
    refreshData();
  }, [selectedDate, refreshData]);

  const updateConfig = (newConfig: BusinessConfig) => {
    storage.saveConfig(newConfig);
    setConfigState(newConfig);
    sound.setEnabled(newConfig.soundEnabled);
    showToast('Settings saved!');
  };

  const counters = config.counters || [];

  const addCounter = (name: string, password?: string, color?: string) => {
    storage.addCounter(name, password, color);
    refreshData();
    showToast(`Counter "${name}" created!`);
  };

  const updateCounter = (id: string, name: string, password?: string, color?: string) => {
    storage.updateCounter(id, name, password, color);
    refreshData();
    showToast(`Counter updated!`);
  };

  const deleteCounter = (id: string): boolean => {
    const ok = storage.deleteCounter(id);
    if (ok) {
      refreshData();
      showToast('Counter deleted');
      return true;
    } else {
      showToast('Cannot delete the last remaining counter', 'error');
      return false;
    }
  };

  const loginAsMember = (member: string, password: string): boolean => {
    const isAdmin = member.toLowerCase().includes('admin');
    
    if (isAdmin) {
      if (password === (config.adminPassword || 'admin@123')) {
        setSelectedMember('Admin / Owner');
        setCurrentScreen('admin');
        showToast('Logged in as Admin');
        return true;
      }
    } else {
      const matchedCounter = counters.find(c => c.name.toLowerCase() === member.toLowerCase());
      const expectedPassword = matchedCounter?.password || config.employeePassword || 'P@counter';
      
      if (password === expectedPassword) {
        setSelectedMember(matchedCounter ? matchedCounter.name : member);
        setCurrentScreen('employee');
        showToast(`Logged in as ${member}`);
        return true;
      }
    }

    sound.playWarning();
    return false;
  };

  const logoutToLanding = () => {
    setCurrentScreen('landing');
    showToast('Returned to Profile Selection', 'info');
  };

  const addTransaction = (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Transaction => {
    const newTx = storage.addTransaction({
      ...tx,
      staffName: tx.staffName || selectedMember,
    });
    if (tx.type === 'income') {
      sound.playIncome();
    } else {
      sound.playExpense();
    }
    refreshData();
    showToast(`✓ ${tx.type === 'income' ? 'Income' : 'Expense'}: ₹${tx.amount.toLocaleString()}`);
    return newTx;
  };

  const updateTransaction = (tx: Transaction) => {
    storage.updateTransaction(tx);
    refreshData();
    showToast('Transaction updated');
  };

  const deleteTransaction = (id: string) => {
    storage.deleteTransaction(id);
    refreshData();
    showToast('Transaction removed', 'info');
  };

  const addCategory = (type: TransactionType, cat: string) => {
    storage.addCategory(type, cat);
    refreshData();
  };

  const saveClosing = (closing: Omit<DailyClosing, 'id' | 'closedAt'>): DailyClosing => {
    const res = storage.saveClosing({
      ...closing,
      closedBy: closing.closedBy || selectedMember,
    });
    if (res.status === 'balanced') {
      sound.playBalanced();
    } else {
      sound.playWarning();
    }
    refreshData();
    showToast(`Day Closing: ${res.status === 'balanced' ? '✓ Money Matched' : res.status.toUpperCase()}`);
    return res;
  };

  // --- LOAN ACTIONS ---
  const giveLoan = (
    borrowerName: string,
    borrowerPhone: string,
    amount: number,
    paymentMethod: string,
    notes?: string
  ) => {
    storage.giveLoan(borrowerName, borrowerPhone, amount, paymentMethod, selectedMember, selectedDate, notes);
    sound.playExpense();
    refreshData();
    showToast(`Loan of ₹${amount.toLocaleString()} given to ${borrowerName}`);
  };

  const repayLoan = (
    loanId: string,
    amount: number,
    paymentMethod: string,
    notes?: string
  ) => {
    storage.repayLoan(loanId, amount, paymentMethod, selectedMember, selectedDate, notes);
    sound.playIncome();
    refreshData();
    showToast(`Loan repayment of ₹${amount.toLocaleString()} received!`);
  };

  const deleteLoan = (id: string) => {
    storage.deleteLoan(id);
    refreshData();
    showToast('Loan record removed', 'info');
  };

  // --- DATA PURGE ACTIONS ---
  const deleteTransactionsBetween = (startDate: string, endDate: string): number => {
    const count = storage.deleteTransactionsBetween(startDate, endDate);
    refreshData();
    showToast(`Deleted ${count} transactions between ${startDate} and ${endDate}`);
    return count;
  };

  const deleteTransactionsByMonth = (yearMonth: string): number => {
    const count = storage.deleteTransactionsByMonth(yearMonth);
    refreshData();
    showToast(`Deleted ${count} transactions for ${yearMonth}`);
    return count;
  };

  const openCounterModal = (initialType: TransactionType = 'income', txToEdit: Transaction | null = null) => {
    setCounterInitialType(initialType);
    setEditingTransaction(txToEdit);
    setIsCounterModalOpen(true);
  };

  const closeCounterModal = () => {
    setIsCounterModalOpen(false);
    setEditingTransaction(null);
  };

  const openClosingModal = () => setIsClosingModalOpen(true);
  const closeClosingModal = () => setIsClosingModalOpen(false);

  const todayStr = getTodayDateString();
  const todayTransactions = transactions.filter(t => t.date === (currentScreen === 'employee' ? todayStr : selectedDate));

  return (
    <AppContext.Provider
      value={{
        config,
        updateConfig,
        currentScreen,
        selectedMember,
        loginAsMember,
        logoutToLanding,
        counters,
        addCounter,
        updateCounter,
        deleteCounter,
        adminTab,
        setAdminTab,
        selectedDate,
        setSelectedDate,
        dayBalances,
        transactions,
        todayTransactions,
        closings,
        loans,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addCategory,
        saveClosing,
        giveLoan,
        repayLoan,
        deleteLoan,
        deleteTransactionsBetween,
        deleteTransactionsByMonth,
        refreshData,
        isCounterModalOpen,
        counterInitialType,
        editingTransaction,
        openCounterModal,
        closeCounterModal,
        isClosingModalOpen,
        openClosingModal,
        closeClosingModal,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
