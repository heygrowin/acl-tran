import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDMKlciKP2FM2ZA3ejX9lmqcM1JBAQJ9fU',
  authDomain: 'acl-tran.firebaseapp.com',
  projectId: 'acl-tran',
  storageBucket: 'acl-tran.firebasestorage.app',
  messagingSenderId: '107247193372',
  appId: '1:107247193372:web:3aeb912265f40807a2bed9',
  measurementId: 'G-NT1WWMSVY2',
};

const app = getApps().length > 0 ? getApp() : initializeApp(DEFAULT_FIREBASE_CONFIG);
const db = getFirestore(app);

async function cleanTestData() {
  console.log('🧹 Inspecting and Purging test & demo data from Firestore...');

  // 1. Clean Loans
  const loansRef = collection(db, 'loans');
  const loansSnap = await getDocs(loansRef);
  let deletedLoans = 0;
  console.log(`Found ${loansSnap.docs.length} loans in Firestore:`);
  for (const docSnap of loansSnap.docs) {
    const data = docSnap.data();
    console.log(`- Loan ID: ${docSnap.id}, Borrower: "${data.borrowerName}", Pending: ₹${data.pendingAmount}, Notes: "${data.notes}"`);
    const name = (data.borrowerName || '').trim().toLowerCase();
    if (name.includes('ramesh') || name.includes('demo') || data.notes?.includes('Emergency loan') || data.notes?.includes('Advance for raw material') || data.notes?.includes('test')) {
      console.log(`  Deleting test loan: ${docSnap.id}`);
      await deleteDoc(doc(db, 'loans', docSnap.id));
      deletedLoans++;
    }
  }

  // 2. Clean Transactions
  const txRef = collection(db, 'transactions');
  const txSnap = await getDocs(txRef);
  let deletedTxs = 0;
  console.log(`Found ${txSnap.docs.length} transactions in Firestore:`);
  for (const docSnap of txSnap.docs) {
    const data = docSnap.data();
    const note = (data.note || '').toLowerCase();
    const cat = (data.category || '').toLowerCase();
    const date = data.date || '';
    
    // Check if test transaction
    if (
      note.includes('ramesh') ||
      date === '2026-08-18' ||
      cat === 'owner drawer cash withdrawal' ||
      note.includes('admin took cash from vault drawer') ||
      note.includes('partial return') ||
      note.includes('emergency loan') ||
      note.includes('advance for raw material') ||
      note.includes('test')
    ) {
      console.log(`  Deleting test transaction: ${docSnap.id} (${data.category} - ₹${data.amount} on ${data.date})`);
      await deleteDoc(doc(db, 'transactions', docSnap.id));
      deletedTxs++;
    }
  }

  console.log(`\n✅ Finished cleaning Firestore! Deleted ${deletedLoans} test loans and ${deletedTxs} test transactions.`);
  process.exit(0);
}

cleanTestData().catch(err => {
  console.error('Error cleaning test data:', err);
  process.exit(1);
});
