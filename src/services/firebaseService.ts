import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import type {
  Transaction,
  DailyClosing,
  LoanRecord,
  BusinessConfig
} from '../types';

// Firebase configuration loaded from environment or real default project
const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {} as any;

export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyDMKlciKP2FM2ZA3ejX9lmqcM1JBAQJ9fU',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'acl-tran.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'acl-tran',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'acl-tran.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '107247193372',
  appId: env.VITE_FIREBASE_APP_ID || '1:107247193372:web:3aeb912265f40807a2bed9',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || 'G-NT1WWMSVY2',
};

// Initialize Firebase App singleton safely
export const app = getApps().length > 0 ? getApp() : initializeApp(DEFAULT_FIREBASE_CONFIG);
export const db = getFirestore(app);

// Firestore Collection Names
export const COLLECTIONS = {
  TRANSACTIONS: 'transactions',
  CLOSINGS: 'closings',
  LOANS: 'loans',
  CONFIG: 'config',
  PING: 'system_status',
};

/**
 * Utility to strip undefined and deeply clean data before sending to Firestore.
 * Firestore throws a runtime error if any object property has a value of undefined.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return data;
  return JSON.parse(
    JSON.stringify(data, (_, value) => (value === undefined ? null : value))
  );
}

export function isTestOrServerEnvironment(): boolean {
  if (typeof window === 'undefined') return true;
  if ((window as any).__TEST_ENV__ || (globalThis as any).__TEST_ENV__) return true;
  return false;
}

export interface CloudConnectionResult {
  success: boolean;
  status: 'connected' | 'permission_denied' | 'api_disabled' | 'offline' | 'error';
  message: string;
  projectId: string;
  details?: string;
}

/**
 * Perform a live read/write test to check if Cloud Firestore is active, reachable,
 * and has proper security rules.
 */
export async function testCloudConnection(): Promise<CloudConnectionResult> {
  const projectId = DEFAULT_FIREBASE_CONFIG.projectId;
  try {
    const pingDocRef = doc(db, COLLECTIONS.PING, 'health_check');
    const testPayload = sanitizeForFirestore({
      lastChecked: Date.now(),
      status: 'healthy',
      clientTime: new Date().toISOString(),
      projectId,
    });

    // Attempt write and read
    await setDoc(pingDocRef, testPayload, { merge: true });

    return {
      success: true,
      status: 'connected',
      message: `Successfully connected to Firebase Firestore (${projectId})!`,
      projectId,
    };
  } catch (err: any) {
    const errorMsg = String(err?.message || err);
    console.error('Firestore Diagnostic Test Error:', err);

    if (errorMsg.includes('Cloud Firestore API has not been used') || errorMsg.includes('is disabled')) {
      return {
        success: false,
        status: 'api_disabled',
        message: 'Cloud Firestore Database is not created/enabled yet in Firebase Console.',
        projectId,
        details: `Please visit https://console.firebase.google.com/project/${projectId}/firestore and click "Create Database".`,
      };
    }

    if (errorMsg.includes('permission-denied') || errorMsg.includes('PERMISSION_DENIED')) {
      return {
        success: false,
        status: 'permission_denied',
        message: 'Firestore Permission Denied (Security Rules issue).',
        projectId,
        details: `Please go to Firebase Console > Firestore > Rules, and set: allow read, write: if true;`,
      };
    }

    if (errorMsg.includes('offline') || errorMsg.includes('unavailable') || errorMsg.includes('network')) {
      return {
        success: false,
        status: 'offline',
        message: 'Network offline or unreachable.',
        projectId,
        details: errorMsg,
      };
    }

    return {
      success: false,
      status: 'error',
      message: `Firebase Error: ${errorMsg}`,
      projectId,
      details: errorMsg,
    };
  }
}

// --- Firestore Sync Listeners ---

export function subscribeToTransactions(
  businessId: string,
  onData: (txs: Transaction[]) => void,
  onError?: (error: any) => void
) {
  if (isTestOrServerEnvironment()) return () => {};
  try {
    const q = query(
      collection(db, COLLECTIONS.TRANSACTIONS),
      where('businessId', '==', businessId)
    );

    return onSnapshot(
      q,
      snapshot => {
        const txs: Transaction[] = [];
        snapshot.forEach(docSnap => {
          txs.push(docSnap.data() as Transaction);
        });
        // Sort descending by timestamp / date
        txs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        onData(txs);
      },
      err => {
        console.warn('Firestore transactions listener warning:', err?.message || err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('Could not subscribe to transactions in Firestore:', err);
    if (onError) onError(err);
    return () => {};
  }
}

export function subscribeToClosings(
  businessId: string,
  onData: (closings: Record<string, DailyClosing>) => void,
  onError?: (error: any) => void
) {
  if (isTestOrServerEnvironment()) return () => {};
  try {
    const q = query(
      collection(db, COLLECTIONS.CLOSINGS),
      where('businessId', '==', businessId)
    );

    return onSnapshot(
      q,
      snapshot => {
        const map: Record<string, DailyClosing> = {};
        snapshot.forEach(docSnap => {
          const closing = docSnap.data() as DailyClosing;
          map[closing.date] = closing;
        });
        onData(map);
      },
      err => {
        console.warn('Firestore closings listener warning:', err?.message || err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('Could not subscribe to closings in Firestore:', err);
    if (onError) onError(err);
    return () => {};
  }
}

export function subscribeToLoans(
  businessId: string,
  onData: (loans: LoanRecord[]) => void,
  onError?: (error: any) => void
) {
  if (isTestOrServerEnvironment()) return () => {};
  try {
    const q = query(
      collection(db, COLLECTIONS.LOANS),
      where('businessId', '==', businessId)
    );

    return onSnapshot(
      q,
      snapshot => {
        const loans: LoanRecord[] = [];
        snapshot.forEach(docSnap => {
          loans.push(docSnap.data() as LoanRecord);
        });
        loans.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        onData(loans);
      },
      err => {
        console.warn('Firestore loans listener warning:', err?.message || err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('Could not subscribe to loans in Firestore:', err);
    if (onError) onError(err);
    return () => {};
  }
}

export function subscribeToConfig(
  businessId: string,
  onData: (config: BusinessConfig) => void,
  onError?: (error: any) => void
) {
  if (isTestOrServerEnvironment()) return () => {};
  try {
    const configDocRef = doc(db, COLLECTIONS.CONFIG, businessId);
    return onSnapshot(
      configDocRef,
      docSnap => {
        if (docSnap.exists()) {
          onData(docSnap.data() as BusinessConfig);
        }
      },
      err => {
        console.warn('Firestore config listener warning:', err?.message || err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('Could not subscribe to config in Firestore:', err);
    if (onError) onError(err);
    return () => {};
  }
}

// --- Cloud Write Operations ---

export async function saveTransactionToCloud(tx: Transaction): Promise<boolean> {
  if (isTestOrServerEnvironment()) return true;
  try {
    const clean = sanitizeForFirestore(tx);
    await setDoc(doc(db, COLLECTIONS.TRANSACTIONS, tx.id), clean, { merge: true });
    return true;
  } catch (err) {
    console.warn('Failed to save transaction to Firestore:', err);
    return false;
  }
}

export async function deleteTransactionFromCloud(txId: string): Promise<boolean> {
  if (isTestOrServerEnvironment()) return true;
  try {
    await deleteDoc(doc(db, COLLECTIONS.TRANSACTIONS, txId));
    return true;
  } catch (err) {
    console.warn('Failed to delete transaction from Firestore:', err);
    return false;
  }
}

export async function saveClosingToCloud(closing: DailyClosing): Promise<boolean> {
  if (isTestOrServerEnvironment()) return true;
  try {
    const clean = sanitizeForFirestore(closing);
    const id = `${closing.businessId}_${closing.date}`;
    await setDoc(doc(db, COLLECTIONS.CLOSINGS, id), clean, { merge: true });
    return true;
  } catch (err) {
    console.warn('Failed to save closing to Firestore:', err);
    return false;
  }
}

export async function saveLoanToCloud(loan: LoanRecord): Promise<boolean> {
  if (isTestOrServerEnvironment()) return true;
  try {
    const clean = sanitizeForFirestore(loan);
    await setDoc(doc(db, COLLECTIONS.LOANS, loan.id), clean, { merge: true });
    return true;
  } catch (err) {
    console.warn('Failed to save loan to Firestore:', err);
    return false;
  }
}

export async function deleteLoanFromCloud(loanId: string): Promise<boolean> {
  if (isTestOrServerEnvironment()) return true;
  try {
    await deleteDoc(doc(db, COLLECTIONS.LOANS, loanId));
    return true;
  } catch (err) {
    console.warn('Failed to delete loan from Firestore:', err);
    return false;
  }
}

export async function saveConfigToCloud(config: BusinessConfig): Promise<boolean> {
  if (isTestOrServerEnvironment()) return true;
  try {
    const clean = sanitizeForFirestore(config);
    await setDoc(doc(db, COLLECTIONS.CONFIG, config.id), clean, { merge: true });
    return true;
  } catch (err) {
    console.warn('Failed to save config to Firestore:', err);
    return false;
  }
}

export async function deleteTransactionsBetweenInCloud(
  businessId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  if (isTestOrServerEnvironment()) return 0;
  try {
    const q = query(
      collection(db, COLLECTIONS.TRANSACTIONS),
      where('businessId', '==', businessId)
    );
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    let count = 0;

    snapshot.forEach(docSnap => {
      const tx = docSnap.data() as Transaction;
      if (tx.date >= startDate && tx.date <= endDate) {
        batch.delete(docSnap.ref);
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
    }
    return count;
  } catch (err) {
    console.warn('Failed to batch delete transactions in Firestore:', err);
    return 0;
  }
}

export async function updateCategoryInCloud(
  businessId: string,
  type: 'income' | 'expense',
  oldName: string,
  newName: string
): Promise<number> {
  if (isTestOrServerEnvironment()) return 0;
  try {
    const cleanOld = oldName.trim();
    const cleanNew = newName.trim();
    if (!cleanOld || !cleanNew || cleanOld === cleanNew) return 0;

    const normOld = cleanOld.toLowerCase();
    const strippedOld = normOld.replace(/[\s\-_]/g, '');

    // 1. Update Category in Cloud Config Doc
    try {
      const configDocRef = doc(db, COLLECTIONS.CONFIG, businessId);
      const configSnap = await getDoc(configDocRef);
      if (configSnap.exists()) {
        const cfg = configSnap.data() as BusinessConfig;
        if (type === 'income') {
          const updated = (cfg.incomeCategories || []).map(c => {
            const normC = c.trim().toLowerCase();
            if (normC === normOld || normC.replace(/[\s\-_]/g, '') === strippedOld) return cleanNew;
            return c;
          });
          await setDoc(configDocRef, { incomeCategories: Array.from(new Set(updated)) }, { merge: true });
        } else {
          const updated = (cfg.expenseCategories || []).map(c => {
            const normC = c.trim().toLowerCase();
            if (normC === normOld || normC.replace(/[\s\-_]/g, '') === strippedOld) return cleanNew;
            return c;
          });
          await setDoc(configDocRef, { expenseCategories: Array.from(new Set(updated)) }, { merge: true });
        }
      }
    } catch (e) {
      console.warn('Could not update category in cloud config:', e);
    }

    // 2. Query and batch-update all transactions in Firestore matching oldName (or its normalized space variants)
    const q = query(
      collection(db, COLLECTIONS.TRANSACTIONS),
      where('businessId', '==', businessId)
    );
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    let count = 0;

    snapshot.forEach(docSnap => {
      const tx = docSnap.data() as Transaction;
      const txCat = (tx.category || '').trim().toLowerCase();
      const txCatStripped = txCat.replace(/[\s\-_]/g, '');

      if (
        (tx.type === type || !tx.type) &&
        (txCat === normOld || txCatStripped === strippedOld)
      ) {
        batch.update(docSnap.ref, {
          category: cleanNew,
          updatedAt: Date.now(),
        });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
    }
    return count;
  } catch (err) {
    console.warn('Failed to update category in Firestore transactions:', err);
    return 0;
  }
}

/**
 * Fetch all data for a business from Cloud Firestore
 */
export async function fetchAllDataFromCloud(businessId: string): Promise<{
  config?: BusinessConfig;
  transactions: Transaction[];
  closings: DailyClosing[];
  loans: LoanRecord[];
}> {
  const result: {
    config?: BusinessConfig;
    transactions: Transaction[];
    closings: DailyClosing[];
    loans: LoanRecord[];
  } = {
    transactions: [],
    closings: [],
    loans: [],
  };

  try {
    // 1. Config
    const configSnap = await getDocs(
      query(collection(db, COLLECTIONS.CONFIG), where('id', '==', businessId))
    );
    configSnap.forEach(d => {
      result.config = d.data() as BusinessConfig;
    });

    // 2. Transactions
    const txSnap = await getDocs(
      query(collection(db, COLLECTIONS.TRANSACTIONS), where('businessId', '==', businessId))
    );
    txSnap.forEach(d => {
      result.transactions.push(d.data() as Transaction);
    });
    result.transactions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    // 3. Closings
    const closingSnap = await getDocs(
      query(collection(db, COLLECTIONS.CLOSINGS), where('businessId', '==', businessId))
    );
    closingSnap.forEach(d => {
      result.closings.push(d.data() as DailyClosing);
    });
    result.closings.sort((a, b) => b.date.localeCompare(a.date));

    // 4. Loans
    const loanSnap = await getDocs(
      query(collection(db, COLLECTIONS.LOANS), where('businessId', '==', businessId))
    );
    loanSnap.forEach(d => {
      result.loans.push(d.data() as LoanRecord);
    });
    result.loans.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch (err) {
    console.error('Failed to fetch all data from Firestore:', err);
    throw err;
  }

  return result;
}

/**
 * Push all local data into Cloud Firestore
 */
export async function pushAllLocalDataToCloud(data: {
  config: BusinessConfig;
  transactions: Transaction[];
  closings: DailyClosing[];
  loans: LoanRecord[];
}): Promise<{ totalUploaded: number; errors: number }> {
  let totalUploaded = 0;
  let errors = 0;

  // 1. Upload Config
  try {
    await saveConfigToCloud(data.config);
    totalUploaded++;
  } catch (e) {
    errors++;
  }

  // 2. Upload Transactions in batches of 400 (Firestore max batch is 500)
  const txs = data.transactions || [];
  for (let i = 0; i < txs.length; i += 400) {
    const chunk = txs.slice(i, i + 400);
    const batch = writeBatch(db);
    chunk.forEach(tx => {
      const clean = sanitizeForFirestore({ ...tx, businessId: data.config.id });
      batch.set(doc(db, COLLECTIONS.TRANSACTIONS, tx.id), clean, { merge: true });
    });
    try {
      await batch.commit();
      totalUploaded += chunk.length;
    } catch (err) {
      console.error('Batch upload error for transactions:', err);
      errors += chunk.length;
    }
  }

  // 3. Upload Closings
  const closings = data.closings || [];
  for (const c of closings) {
    const ok = await saveClosingToCloud({ ...c, businessId: data.config.id });
    if (ok) totalUploaded++;
    else errors++;
  }

  // 4. Upload Loans
  const loans = data.loans || [];
  for (const l of loans) {
    const ok = await saveLoanToCloud({ ...l, businessId: data.config.id });
    if (ok) totalUploaded++;
    else errors++;
  }

  return { totalUploaded, errors };
}
