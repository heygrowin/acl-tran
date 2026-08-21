import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import type {
  Transaction,
  DailyClosing,
  LoanRecord,
  BusinessConfig
} from '../types';

// Firebase configuration loaded from environment variables (.env)
const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {} as any;
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'demo.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'demo-proj',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'demo.appspot.com',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '00000000',
  appId: env.VITE_FIREBASE_APP_ID || '1:00000000:web:000000',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || 'G-000000',
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Collection Names
const COLLECTIONS = {
  TRANSACTIONS: 'transactions',
  CLOSINGS: 'closings',
  LOANS: 'loans',
  CONFIG: 'config',
};

// --- Firestore Sync Listeners ---

export function subscribeToTransactions(
  businessId: string,
  onData: (txs: Transaction[]) => void,
  onError?: (error: any) => void
) {
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
        console.warn('Firestore transactions listener warning:', err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('Could not subscribe to transactions in Firestore:', err);
    return () => {};
  }
}

export function subscribeToClosings(
  businessId: string,
  onData: (closings: Record<string, DailyClosing>) => void,
  onError?: (error: any) => void
) {
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
        console.warn('Firestore closings listener warning:', err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('Could not subscribe to closings in Firestore:', err);
    return () => {};
  }
}

export function subscribeToLoans(
  businessId: string,
  onData: (loans: LoanRecord[]) => void,
  onError?: (error: any) => void
) {
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
        console.warn('Firestore loans listener warning:', err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('Could not subscribe to loans in Firestore:', err);
    return () => {};
  }
}

export function subscribeToConfig(
  businessId: string,
  onData: (config: BusinessConfig) => void,
  onError?: (error: any) => void
) {
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
        console.warn('Firestore config listener warning:', err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('Could not subscribe to config in Firestore:', err);
    return () => {};
  }
}

// --- Cloud Write Operations ---

export async function saveTransactionToCloud(tx: Transaction): Promise<void> {
  try {
    await setDoc(doc(db, COLLECTIONS.TRANSACTIONS, tx.id), tx);
  } catch (err) {
    console.warn('Failed to save transaction to Firestore:', err);
  }
}

export async function deleteTransactionFromCloud(txId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTIONS.TRANSACTIONS, txId));
  } catch (err) {
    console.warn('Failed to delete transaction from Firestore:', err);
  }
}

export async function saveClosingToCloud(closing: DailyClosing): Promise<void> {
  try {
    const id = `${closing.businessId}_${closing.date}`;
    await setDoc(doc(db, COLLECTIONS.CLOSINGS, id), closing);
  } catch (err) {
    console.warn('Failed to save closing to Firestore:', err);
  }
}

export async function saveLoanToCloud(loan: LoanRecord): Promise<void> {
  try {
    await setDoc(doc(db, COLLECTIONS.LOANS, loan.id), loan);
  } catch (err) {
    console.warn('Failed to save loan to Firestore:', err);
  }
}

export async function deleteLoanFromCloud(loanId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTIONS.LOANS, loanId));
  } catch (err) {
    console.warn('Failed to delete loan from Firestore:', err);
  }
}

export async function saveConfigToCloud(config: BusinessConfig): Promise<void> {
  try {
    await setDoc(doc(db, COLLECTIONS.CONFIG, config.id), config);
  } catch (err) {
    console.warn('Failed to save config to Firestore:', err);
  }
}

export async function deleteTransactionsBetweenInCloud(businessId: string, startDate: string, endDate: string): Promise<void> {
  try {
    const q = query(
      collection(db, COLLECTIONS.TRANSACTIONS),
      where('businessId', '==', businessId)
    );
    const snapshot = await getDocs(q);
    const deletePromises: Promise<void>[] = [];
    snapshot.forEach(docSnap => {
      const tx = docSnap.data() as Transaction;
      if (tx.date >= startDate && tx.date <= endDate) {
        deletePromises.push(deleteDoc(docSnap.ref));
      }
    });
    await Promise.all(deletePromises);
  } catch (err) {
    console.warn('Failed to batch delete transactions in Firestore:', err);
  }
}
