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
import {
  subscribeToTransactions,
  subscribeToClosings,
  subscribeToLoans,
  subscribeToConfig,
  testCloudConnection as testCloudConnectionService,
  fetchAllDataFromCloud,
  pushAllLocalDataToCloud,
  saveTransactionToCloud,
  saveClosingToCloud,
  saveLoanToCloud,
  saveConfigToCloud,
  deleteTransactionFromCloud,
  deleteLoanFromCloud,
  type CloudConnectionResult,
  DEFAULT_FIREBASE_CONFIG
} from '../services/firebaseService';
import { sound } from '../services/audioService';

export type CloudConnectionState = 'connected' | 'connecting' | 'error' | 'disabled' | 'offline';

interface AppContextType {
  config: BusinessConfig;
  updateConfig: (newConfig: BusinessConfig) => void;
  
  // Cloud & Firebase Status
  isCloudConnected: boolean;
  cloudStatus: CloudConnectionState;
  cloudErrorMessage: string | null;
  lastCloudSync: number | null;
  firebaseProjectId: string;
  testCloudConnection: () => Promise<CloudConnectionResult>;
  syncAllToCloud: () => Promise<{ success: boolean; totalUploaded: number; errors: number }>;
  pullAllFromCloud: () => Promise<{ success: boolean; count: number; error?: string }>;

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
  addUpiAccount: (account: string) => void;
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
  const initialSession = storage.getSession();
  const [config, setConfigState] = useState<BusinessConfig>(() => storage.getConfig());
  const [currentScreen, setCurrentScreen] = useState<CurrentScreen>(() => initialSession?.role || 'landing');
  const [selectedMember, setSelectedMember] = useState<string>(() => initialSession?.member || 'Admin / Owner');
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());

  // Cloud State
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);
  const [cloudStatus, setCloudStatus] = useState<CloudConnectionState>('connecting');
  const [cloudErrorMessage, setCloudErrorMessage] = useState<string | null>(null);
  const [lastCloudSync, setLastCloudSync] = useState<number | null>(null);

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
    }, 3200);
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

  // Initial Firestore Diagnostic Check on load
  useEffect(() => {
    let isMounted = true;
    testCloudConnectionService().then(res => {
      if (!isMounted) return;
      if (res.success) {
        setIsCloudConnected(true);
        setCloudStatus('connected');
        setCloudErrorMessage(null);
        setLastCloudSync(Date.now());
      } else {
        setIsCloudConnected(false);
        setCloudStatus(res.status as CloudConnectionState);
        setCloudErrorMessage(res.details || res.message);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Real-time Cloud Sync with Firebase Firestore
  useEffect(() => {
    const bizId = config.id || 'biz_default';

    const handleFirestoreError = (err: any) => {
      setIsCloudConnected(false);
      const errMsg = String(err?.message || err);
      if (errMsg.includes('Cloud Firestore API has not been used') || errMsg.includes('is disabled')) {
        setCloudStatus('disabled');
        setCloudErrorMessage('Cloud Firestore database is disabled or not yet created in Firebase Console.');
      } else if (errMsg.includes('permission-denied')) {
        setCloudStatus('error');
        setCloudErrorMessage('Firestore Permission Denied (check Security Rules in Firebase Console).');
      } else {
        setCloudStatus('offline');
        setCloudErrorMessage(errMsg);
      }
    };

    // 1. Transactions Stream
    const unsubTx = subscribeToTransactions(
      bizId,
      cloudTxs => {
        setIsCloudConnected(true);
        setCloudStatus('connected');
        setCloudErrorMessage(null);
        setLastCloudSync(Date.now());
        if (cloudTxs) {
          storage.saveTransactions(cloudTxs);
          setTransactions(cloudTxs);
          setDayBalances(storage.calculateDayBalances(selectedDate));
        }
      },
      handleFirestoreError
    );

    // 2. Closings Stream
    const unsubClosings = subscribeToClosings(
      bizId,
      cloudClosingsMap => {
        setIsCloudConnected(true);
        setCloudStatus('connected');
        setCloudErrorMessage(null);
        setLastCloudSync(Date.now());
        const list = Object.values(cloudClosingsMap);
        if (list) {
          localStorage.setItem('acl_counter_closings_v5', JSON.stringify(list));
          setClosings(list);
          setDayBalances(storage.calculateDayBalances(selectedDate));
        }
      },
      handleFirestoreError
    );

    // 3. Loans Stream
    const unsubLoans = subscribeToLoans(
      bizId,
      cloudLoans => {
        setIsCloudConnected(true);
        setCloudStatus('connected');
        setCloudErrorMessage(null);
        setLastCloudSync(Date.now());
        if (cloudLoans) {
          storage.saveLoans(cloudLoans);
          setLoans(cloudLoans);
        }
      },
      handleFirestoreError
    );

    // 4. Config Stream
    const unsubConfig = subscribeToConfig(
      bizId,
      cloudConfig => {
        setIsCloudConnected(true);
        setCloudStatus('connected');
        setCloudErrorMessage(null);
        setLastCloudSync(Date.now());
        if (cloudConfig) {
          const localConfig = storage.getConfig();
          const mergedConfig: BusinessConfig = {
            ...localConfig,
            ...cloudConfig,
            incomeCategories: Array.isArray(cloudConfig.incomeCategories) ? cloudConfig.incomeCategories : localConfig.incomeCategories,
            expenseCategories: Array.isArray(cloudConfig.expenseCategories) ? cloudConfig.expenseCategories : localConfig.expenseCategories,
          };
          localStorage.setItem('acl_counter_config_v5', JSON.stringify(mergedConfig));
          setConfigState(mergedConfig);
        }
      },
      handleFirestoreError
    );

    return () => {
      unsubTx();
      unsubClosings();
      unsubLoans();
      unsubConfig();
    };
  }, [config.id, selectedDate]);

  // Test Cloud Connection Action
  const testCloudConnection = async (): Promise<CloudConnectionResult> => {
    setCloudStatus('connecting');
    const result = await testCloudConnectionService();
    if (result.success) {
      setIsCloudConnected(true);
      setCloudStatus('connected');
      setCloudErrorMessage(null);
      setLastCloudSync(Date.now());
      showToast('✓ Firebase Cloud Firestore Connected & Healthy!', 'success');
    } else {
      setIsCloudConnected(false);
      setCloudStatus(result.status as CloudConnectionState);
      setCloudErrorMessage(result.details || result.message);
      showToast(result.message, 'error');
    }
    return result;
  };

  // Sync all local data to Cloud
  const syncAllToCloud = async (): Promise<{ success: boolean; totalUploaded: number; errors: number }> => {
    try {
      const currentData = {
        config: storage.getConfig(),
        transactions: storage.getTransactions(),
        closings: storage.getClosings(),
        loans: storage.getLoans(),
      };
      showToast('Syncing all local data to Firebase Cloud...', 'info');
      const res = await pushAllLocalDataToCloud(currentData);
      if (res.errors === 0) {
        setIsCloudConnected(true);
        setCloudStatus('connected');
        setLastCloudSync(Date.now());
        showToast(`✓ Uploaded ${res.totalUploaded} records to Firebase!`, 'success');
        return { success: true, ...res };
      } else {
        showToast(`Synced ${res.totalUploaded} records (${res.errors} errors).`, 'error');
        return { success: false, ...res };
      }
    } catch (e: any) {
      showToast(`Sync failed: ${e?.message || e}`, 'error');
      return { success: false, totalUploaded: 0, errors: 1 };
    }
  };

  // Pull all data from Cloud
  const pullAllFromCloud = async (): Promise<{ success: boolean; count: number; error?: string }> => {
    try {
      showToast('Fetching latest records from Firebase Cloud...', 'info');
      const cloudData = await fetchAllDataFromCloud(config.id || 'biz_default');
      let count = 0;

      if (cloudData.config) {
        storage.saveConfig(cloudData.config);
        setConfigState(cloudData.config);
      }
      if (cloudData.transactions && cloudData.transactions.length > 0) {
        storage.saveTransactions(cloudData.transactions);
        setTransactions(cloudData.transactions);
        count += cloudData.transactions.length;
      }
      if (cloudData.closings && cloudData.closings.length > 0) {
        localStorage.setItem('acl_counter_closings_v5', JSON.stringify(cloudData.closings));
        setClosings(cloudData.closings);
        count += cloudData.closings.length;
      }
      if (cloudData.loans && cloudData.loans.length > 0) {
        storage.saveLoans(cloudData.loans);
        setLoans(cloudData.loans);
        count += cloudData.loans.length;
      }

      refreshData();
      setIsCloudConnected(true);
      setCloudStatus('connected');
      setLastCloudSync(Date.now());
      showToast(`✓ Successfully downloaded ${count} records from Cloud!`, 'success');
      return { success: true, count };
    } catch (e: any) {
      const msg = e?.message || 'Failed to pull cloud data';
      showToast(`Cloud fetch failed: ${msg}`, 'error');
      return { success: false, count: 0, error: msg };
    }
  };

  const updateConfig = (newConfig: BusinessConfig) => {
    storage.saveConfig(newConfig);
    setConfigState(newConfig);
    sound.setEnabled(newConfig.soundEnabled);
    saveConfigToCloud(newConfig);
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
        storage.saveSession('admin', 'Admin / Owner');
        showToast('Logged in as Admin');
        return true;
      }
    } else {
      const matchedCounter = counters.find(c => c.name.toLowerCase() === member.toLowerCase());
      const expectedPassword = matchedCounter?.password || config.employeePassword || 'P@counter';
      
      if (password === expectedPassword) {
        const staffName = matchedCounter ? matchedCounter.name : member;
        setSelectedMember(staffName);
        setCurrentScreen('employee');
        storage.saveSession('employee', staffName);
        showToast(`Logged in as ${staffName}`);
        return true;
      }
    }

    sound.playWarning();
    return false;
  };

  const logoutToLanding = () => {
    storage.clearSession();
    setCurrentScreen('landing');
    showToast('Returned to Login Screen', 'info');
  };

  const addTransaction = (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Transaction => {
    const newTx = storage.addTransaction({
      ...tx,
      businessId: config.id || 'biz_default',
      staffName: tx.staffName || selectedMember,
    });
    saveTransactionToCloud(newTx);
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
    saveTransactionToCloud(tx);
    refreshData();
    showToast('Transaction updated');
  };

  const deleteTransaction = (id: string) => {
    storage.deleteTransaction(id);
    deleteTransactionFromCloud(id);
    refreshData();
    showToast('Transaction removed', 'info');
  };

  const addCategory = (type: TransactionType, cat: string) => {
    storage.addCategory(type, cat);
    refreshData();
  };

  const addUpiAccount = (account: string) => {
    storage.addUpiAccount(account);
    refreshData();
  };

  const saveClosing = (closing: Omit<DailyClosing, 'id' | 'closedAt'>): DailyClosing => {
    const res = storage.saveClosing({
      ...closing,
      businessId: config.id || 'biz_default',
      closedBy: closing.closedBy || selectedMember,
    });
    saveClosingToCloud(res);
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
    const res = storage.giveLoan(borrowerName, borrowerPhone, amount, paymentMethod, selectedMember, selectedDate, notes);
    saveLoanToCloud(res.loan);
    saveTransactionToCloud(res.transaction);
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
    const res = storage.repayLoan(loanId, amount, paymentMethod, selectedMember, selectedDate, notes);
    saveLoanToCloud(res.loan);
    saveTransactionToCloud(res.transaction);
    sound.playIncome();
    refreshData();
    showToast(`Loan repayment of ₹${amount.toLocaleString()} received!`);
  };

  const deleteLoan = (id: string) => {
    storage.deleteLoan(id);
    deleteLoanFromCloud(id);
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
        isCloudConnected,
        cloudStatus,
        cloudErrorMessage,
        lastCloudSync,
        firebaseProjectId: DEFAULT_FIREBASE_CONFIG.projectId,
        testCloudConnection,
        syncAllToCloud,
        pullAllFromCloud,
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
        addUpiAccount,
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
