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
  updateInitialBalances: (balances: { cash: number; rtgs: number; upi: number }) => void;
  
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
  updateCategory: (type: TransactionType, oldName: string, newName: string) => void;
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
  counterInitialStaff?: string;
  editingTransaction: Transaction | null;
  openCounterModal: (initialType?: TransactionType, txToEdit?: Transaction | null, initialCounter?: string) => void;
  closeCounterModal: () => void;

  isClosingModalOpen: boolean;
  closingTargetStaff?: string;
  openClosingModal: (targetStaff?: string) => void;
  closeClosingModal: () => void;

  // Item / Category Analysis Modal & Tab State
  isItemHistoryModalOpen: boolean;
  itemHistoryCategory: string;
  selectedAnalysisCategory: string;
  setSelectedAnalysisCategory: (cat: string) => void;
  openItemHistoryModal: (category: string) => void;
  closeItemHistoryModal: () => void;

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
  const [counterInitialStaff, setCounterInitialStaff] = useState<string | undefined>(undefined);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [closingTargetStaff, setClosingTargetStaff] = useState<string | undefined>(undefined);

  // Item History Modal & Analysis State
  const [isItemHistoryModalOpen, setIsItemHistoryModalOpen] = useState(false);
  const [itemHistoryCategory, setItemHistoryCategory] = useState<string>('TEA');
  const [selectedAnalysisCategory, setSelectedAnalysisCategory] = useState<string>('TEA');

  const openItemHistoryModal = useCallback((category: string) => {
    const cleanCat = category.trim() || 'TEA';
    setItemHistoryCategory(cleanCat);
    setSelectedAnalysisCategory(cleanCat);
    setIsItemHistoryModalOpen(true);
  }, []);

  const closeItemHistoryModal = useCallback(() => {
    setIsItemHistoryModalOpen(false);
  }, []);

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
          const currentConfig = storage.getConfig();
          const reconciledTxs = storage.reconcileLegacyCategories(currentConfig, cloudTxs);
          storage.saveTransactions(reconciledTxs);
          setTransactions(reconciledTxs);
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
          const mergedCounters = (cloudConfig.counters || localConfig.counters || []).map(cloudC => {
            const localC = (localConfig.counters || []).find(
              lc => lc.id === cloudC.id || (lc.name && cloudC.name && lc.name.trim().toUpperCase() === cloudC.name.trim().toUpperCase())
            );
            const resolvedPass = (cloudC.password && String(cloudC.password).trim()) || (localC?.password && String(localC.password).trim()) || undefined;
            return {
              ...localC,
              ...cloudC,
              password: resolvedPass,
            };
          });

          const localTreasury = storage.getInitialTreasuryBalances();
          const resolvedInitialCash = (cloudConfig.initialCash !== undefined && cloudConfig.initialCash > 0)
            ? cloudConfig.initialCash
            : (localConfig.initialCash || localTreasury.cash || 0);

          const resolvedInitialRtgs = (cloudConfig.initialRtgs !== undefined && cloudConfig.initialRtgs > 0)
            ? cloudConfig.initialRtgs
            : (localConfig.initialRtgs || localTreasury.rtgs || 0);

          const resolvedInitialUpi = (cloudConfig.initialUpi !== undefined && cloudConfig.initialUpi > 0)
            ? cloudConfig.initialUpi
            : (localConfig.initialUpi || localTreasury.upi || 0);

          const mergedIncomeCategories = Array.from(
            new Set([
              ...(localConfig.incomeCategories || []),
              ...(Array.isArray(cloudConfig.incomeCategories) ? cloudConfig.incomeCategories : []),
            ])
          );
          const mergedExpenseCategories = Array.from(
            new Set([
              ...(localConfig.expenseCategories || []),
              ...(Array.isArray(cloudConfig.expenseCategories) ? cloudConfig.expenseCategories : []),
            ])
          );

          const mergedConfig: BusinessConfig = {
            ...localConfig,
            ...cloudConfig,
            initialCash: resolvedInitialCash,
            initialRtgs: resolvedInitialRtgs,
            initialUpi: resolvedInitialUpi,
            counters: mergedCounters,
            incomeCategories: mergedIncomeCategories,
            expenseCategories: mergedExpenseCategories,
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

  const updateInitialBalances = (balances: { cash: number; rtgs: number; upi: number }) => {
    storage.setInitialTreasuryBalances(balances);
    const updatedCfg = storage.getConfig();
    setConfigState(updatedCfg);
    saveConfigToCloud(updatedCfg);
    refreshData();
    showToast('Initial Balances saved successfully!', 'success');
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
      const matchedCounter = counters.find(
        c => c.name && c.name.trim().toLowerCase() === member.trim().toLowerCase()
      );
      const customPass = (matchedCounter?.password && String(matchedCounter.password).trim()) ? String(matchedCounter.password).trim() : null;
      const expectedPassword = customPass || config.employeePassword || 'P@counter';
      
      if (password.trim() === expectedPassword.trim()) {
        const staffName = matchedCounter ? matchedCounter.name : member;
        setSelectedMember(staffName);
        setCurrentScreen('employee');
        storage.saveSession('employee', staffName);
        showToast(`Logged in as ${staffName}`);
        return true;
      }
    }

    return false;
  };

  const logoutToLanding = () => {
    storage.clearSession();
    setCurrentScreen('landing');
    showToast('Returned to Login Screen', 'info');
  };

  const addTransaction = (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Transaction => {
    if (tx.category && tx.category.trim()) {
      const cleanCat = tx.category.trim();
      if (cleanCat !== 'CASH IN HAND' && cleanCat !== 'BANK (RTGS)' && !cleanCat.startsWith('UPI ')) {
        storage.addCategory(tx.type, cleanCat);
      }
    }

    const newTx = storage.addTransaction({
      ...tx,
      businessId: config.id || 'biz_default',
      staffName: tx.staffName || selectedMember,
    });
    saveTransactionToCloud(newTx);
    refreshData();
    showToast(`✓ ${tx.type === 'income' ? 'Income' : 'Expense'}: ₹${tx.amount.toLocaleString()}`);
    return newTx;
  };

  const updateTransaction = (tx: Transaction) => {
    if (tx.category && tx.category.trim()) {
      const cleanCat = tx.category.trim();
      if (cleanCat !== 'CASH IN HAND' && cleanCat !== 'BANK (RTGS)' && !cleanCat.startsWith('UPI ')) {
        storage.addCategory(tx.type, cleanCat);
      }
    }
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

  const updateCategory = (type: TransactionType, oldName: string, newName: string) => {
    storage.updateCategory(type, oldName, newName);
    refreshData();
    showToast(`Category updated to "${newName}"`);
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

  const openCounterModal = (
    initialType: TransactionType = 'income',
    txToEdit: Transaction | null = null,
    initialCounter?: string
  ) => {
    setCounterInitialType(initialType);
    setEditingTransaction(txToEdit);
    setCounterInitialStaff(initialCounter);
    setIsCounterModalOpen(true);
  };

  const closeCounterModal = () => {
    setIsCounterModalOpen(false);
    setEditingTransaction(null);
    setCounterInitialStaff(undefined);
  };

  const openClosingModal = (targetStaff?: string) => {
    setClosingTargetStaff(targetStaff);
    setIsClosingModalOpen(true);
  };
  const closeClosingModal = () => {
    setIsClosingModalOpen(false);
    setClosingTargetStaff(undefined);
  };

  const handleSetSelectedDate = useCallback((newDate: string) => {
    if (currentScreen === 'employee') {
      const d3 = new Date();
      d3.setDate(d3.getDate() - 3);
      const minD = d3.toISOString().split('T')[0];
      const today = getTodayDateString();
      if (newDate < minD) {
        setSelectedDate(minD);
        showToast('Employees can only view records up to 3 days in the past', 'info');
        return;
      }
      if (newDate > today) {
        setSelectedDate(today);
        return;
      }
    }
    setSelectedDate(newDate);
  }, [currentScreen, showToast]);

  const todayTransactions = transactions.filter(t => t.date === selectedDate);

  return (
    <AppContext.Provider
      value={{
        config,
        updateConfig,
        updateInitialBalances,
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
        setSelectedDate: handleSetSelectedDate,
        dayBalances,
        transactions,
        todayTransactions,
        closings,
        loans,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addCategory,
        updateCategory,
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
        counterInitialStaff,
        editingTransaction,
        openCounterModal,
        closeCounterModal,
        isClosingModalOpen,
        closingTargetStaff,
        openClosingModal,
        closeClosingModal,
        isItemHistoryModalOpen,
        itemHistoryCategory,
        selectedAnalysisCategory,
        setSelectedAnalysisCategory,
        openItemHistoryModal,
        closeItemHistoryModal,
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
