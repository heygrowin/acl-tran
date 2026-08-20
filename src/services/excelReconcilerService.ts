import * as XLSX from 'xlsx';
import type { Transaction } from '../types';

export interface StatementTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm or HH:mm AM/PM
  amount: number;
  type: 'credit' | 'debit';
  status: 'success' | 'failed' | 'pending';
  paymentMode: string;
  customerUpiId?: string;
  customerPhone?: string;
  rrn?: string;
  description?: string;
  raw: Record<string, any>;
}

export interface StatementDaySummary {
  date: string;
  totalSuccessCreditAmount: number;
  totalSuccessCreditCount: number;
  totalSuccessDebitAmount: number;
  totalSuccessDebitCount: number;
  transactions: StatementTransaction[];
}

export interface ParsedStatementReport {
  fileName: string;
  totalTransactions: number;
  detectedFormat: string;
  datesAvailable: string[];
  daysMap: Record<string, StatementDaySummary>;
}

export interface ReconciliationComparison {
  date: string;
  statementOnlineAmount: number;
  statementOnlineCount: number;
  appOnlineAmount: number;
  appOnlineCount: number;
  amountDifference: number; // statement - app
  countDifference: number;
  isMatched: boolean;
  statementTransactions: StatementTransaction[];
  appTransactions: Transaction[];
  matchedItems: { statementTx: StatementTransaction; appTx?: Transaction }[];
  missingInApp: StatementTransaction[];
  extraInApp: Transaction[];
}

// Clean date to YYYY-MM-DD
export function normalizeDate(rawDate: any): string {
  if (!rawDate) return '';
  const str = String(rawDate).trim();
  
  // Check YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Check DD-MM-YYYY or DD/MM/YYYY
  const dmy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }

  // Check Excel serial number
  if (typeof rawDate === 'number' && rawDate > 20000 && rawDate < 60000) {
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + rawDate * 86400000);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Try standard parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return str;
}

export function parseStatementBuffer(data: ArrayBuffer | Uint8Array, fileName = 'statement.xlsx'): ParsedStatementReport {
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const daysMap: Record<string, StatementDaySummary> = {};
  let detectedFormat = 'Generic Statement';

  if (rawRows.length > 0) {
    const firstRow = rawRows[0];
    const rowStr = JSON.stringify(firstRow);
    if ('Mintoak Transaction ID' in firstRow || 'Transaction RRN' in firstRow) {
      detectedFormat = 'Mintoak / POS UPI Report';
    } else if ('Merchant Transaction ID' in firstRow || rowStr.includes('PhonePe')) {
      detectedFormat = 'PhonePe Merchant Report';
    } else if (rowStr.includes('Paytm')) {
      detectedFormat = 'Paytm Merchant Report';
    } else if (rowStr.includes('GPay') || rowStr.includes('Google Pay')) {
      detectedFormat = 'Google Pay Business Report';
    }
  }

  rawRows.forEach((row, idx) => {
    // Detect Date
    const rawDate = row['Transaction Date'] || row['Date'] || row['Txn Date'] || row['TxnDate'] || row['date'];
    const date = normalizeDate(rawDate);
    if (!date || !date.includes('-')) return;

    // Detect Time
    const time = String(row['Transaction Time'] || row['Time'] || row['Txn Time'] || row['time'] || '').trim();

    // Detect Amount
    let rawAmount = row['Transaction Amount'] || row['Amount'] || row['Txn Amount'] || row['Credit'] || row['Credit Amount'] || row['amount'] || 0;
    if (typeof rawAmount === 'string') {
      rawAmount = parseFloat(rawAmount.replace(/[^0-9.-]/g, '')) || 0;
    }
    const amount = Math.abs(Number(rawAmount) || 0);

    // Detect Status
    const rawStatus = String(row['Transaction Status'] || row['Status'] || row['Txn Status'] || row['status'] || 'Success').toLowerCase();
    const isSuccess = rawStatus.includes('success') || rawStatus === 'captured' || rawStatus === 'settled' || rawStatus === 'ok';

    // Detect Type (Credit vs Debit)
    const rawType = String(row['Transaction Type'] || row['Type'] || row['type'] || 'SALE').toUpperCase();
    const isDebit = rawType.includes('REFUND') || rawType.includes('DEBIT') || rawType.includes('EXPENSE');
    const type: 'credit' | 'debit' = isDebit ? 'debit' : 'credit';

    // Detect Payment Mode
    const paymentMode = String(row['Payment Type'] || row['Payment Mode'] || row['Mode'] || 'UPI').trim() || 'UPI';

    const customerUpiId = String(row['Customer UPI ID'] || row['Payer VPA'] || row['UPI ID'] || '').trim() || undefined;
    const customerPhone = String(row['Customer Mobile Number'] || row['Customer Phone'] || row['Payer Mobile'] || '').trim() || undefined;
    const rrn = String(row['Transaction RRN'] || row['RRN'] || row['Mintoak Transaction ID'] || row['Bank Reference No'] || '').trim() || undefined;
    const description = String(row['Description'] || row['Remarks'] || row['Narration'] || '').trim() || undefined;

    const tx: StatementTransaction = {
      id: `stmt_${date}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      date,
      time: time || '12:00',
      amount,
      type,
      status: isSuccess ? 'success' : 'failed',
      paymentMode,
      customerUpiId,
      customerPhone,
      rrn,
      description,
      raw: row,
    };

    if (!daysMap[date]) {
      daysMap[date] = {
        date,
        totalSuccessCreditAmount: 0,
        totalSuccessCreditCount: 0,
        totalSuccessDebitAmount: 0,
        totalSuccessDebitCount: 0,
        transactions: [],
      };
    }

    daysMap[date].transactions.push(tx);

    if (isSuccess) {
      if (type === 'credit') {
        daysMap[date].totalSuccessCreditAmount += amount;
        daysMap[date].totalSuccessCreditCount += 1;
      } else {
        daysMap[date].totalSuccessDebitAmount += amount;
        daysMap[date].totalSuccessDebitCount += 1;
      }
    }
  });

  const datesAvailable = Object.keys(daysMap).sort().reverse();

  return {
    fileName,
    totalTransactions: rawRows.length,
    detectedFormat,
    datesAvailable,
    daysMap,
  };
}

export function reconcileDayTransactions(
  date: string,
  statementReport: ParsedStatementReport | null,
  allAppTransactions: Transaction[]
): ReconciliationComparison {
  const daySummary = statementReport?.daysMap[date];
  const statementTxs = daySummary?.transactions.filter(t => t.status === 'success') || [];
  
  // App online transactions for this date
  const appTxs = allAppTransactions.filter(t => {
    if (t.date !== date) return false;
    const isOnline = t.paymentMethod.toLowerCase() === 'upi' || 
                     t.paymentMethod.toLowerCase() === 'rtgs' || 
                     t.paymentMethod.toLowerCase() === 'online';
    return isOnline && t.type === 'income';
  });

  const statementOnlineAmount = daySummary ? daySummary.totalSuccessCreditAmount : 0;
  const statementOnlineCount = daySummary ? daySummary.totalSuccessCreditCount : 0;

  const appOnlineAmount = appTxs.reduce((sum, t) => sum + t.amount, 0);
  const appOnlineCount = appTxs.length;

  const amountDifference = statementOnlineAmount - appOnlineAmount;
  const countDifference = statementOnlineCount - appOnlineCount;
  const isMatched = Math.abs(amountDifference) < 0.01 && countDifference === 0;

  // Matching algorithm
  const remainingAppTxs = [...appTxs];
  const matchedItems: { statementTx: StatementTransaction; appTx?: Transaction }[] = [];
  const missingInApp: StatementTransaction[] = [];

  statementTxs.forEach(sTx => {
    // Try to match by exact amount
    const matchIdx = remainingAppTxs.findIndex(aTx => Math.abs(aTx.amount - sTx.amount) < 0.01);
    if (matchIdx !== -1) {
      const [matchedAppTx] = remainingAppTxs.splice(matchIdx, 1);
      matchedItems.push({ statementTx: sTx, appTx: matchedAppTx });
    } else {
      missingInApp.push(sTx);
      matchedItems.push({ statementTx: sTx });
    }
  });

  const extraInApp = remainingAppTxs;

  return {
    date,
    statementOnlineAmount,
    statementOnlineCount,
    appOnlineAmount,
    appOnlineCount,
    amountDifference,
    countDifference,
    isMatched,
    statementTransactions: statementTxs,
    appTransactions: appTxs,
    matchedItems,
    missingInApp,
    extraInApp,
  };
}
