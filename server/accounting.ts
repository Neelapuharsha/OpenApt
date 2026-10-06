import { getDb, saveDb } from './db.js';

export interface TrialBalanceRow {
  code: string;
  name: string;
  category: string;
  debitPaise: number;
  creditPaise: number;
  netDebitPaise: number;
  netCreditPaise: number;
}

export interface BalanceSheetData {
  assets: { code: string; name: string; amountPaise: number }[];
  totalAssetsPaise: number;
  liabilities: { code: string; name: string; amountPaise: number }[];
  totalLiabilitiesPaise: number;
  equity: { code: string; name: string; amountPaise: number }[];
  currentSurplusPaise: number;
  totalEquityPaise: number;
  isBalanced: boolean;
  variancePaise: number;
}

export interface IncomeExpenseData {
  income: { code: string; name: string; amountPaise: number }[];
  totalIncomePaise: number;
  expenses: { code: string; name: string; amountPaise: number }[];
  totalExpensesPaise: number;
  netSurplusPaise: number;
}

export async function getTrialBalance(): Promise<{ rows: TrialBalanceRow[]; totalDebitsPaise: number; totalCreditsPaise: number; isBalanced: boolean }> {
  const db = await getDb();
  const query = `
    SELECT 
      c.code,
      c.name,
      c.category,
      COALESCE(SUM(jl.debit_paise), 0) AS total_debit,
      COALESCE(SUM(jl.credit_paise), 0) AS total_credit
    FROM chart_of_accounts c
    LEFT JOIN journal_lines jl ON c.code = jl.account_code
    LEFT JOIN journal_entries je ON jl.entry_id = je.id
    GROUP BY c.code, c.name, c.category
    ORDER BY c.code ASC
  `;

  const res = db.exec(query);
  const rows: TrialBalanceRow[] = [];
  let totalDebits = 0;
  let totalCredits = 0;

  if (res.length && res[0].values) {
    for (const val of res[0].values) {
      const code = val[0] as string;
      const name = val[1] as string;
      const category = val[2] as string;
      const debit = Number(val[3]) || 0;
      const credit = Number(val[4]) || 0;

      totalDebits += debit;
      totalCredits += credit;

      let netDebit = 0;
      let netCredit = 0;
      if (['ASSET', 'EXPENSE'].includes(category)) {
        if (debit >= credit) {
          netDebit = debit - credit;
        } else {
          netCredit = credit - debit;
        }
      } else {
        if (credit >= debit) {
          netCredit = credit - debit;
        } else {
          netDebit = debit - credit;
        }
      }

      rows.push({
        code,
        name,
        category,
        debitPaise: debit,
        creditPaise: credit,
        netDebitPaise: netDebit,
        netCreditPaise: netCredit,
      });
    }
  }

  return {
    rows,
    totalDebitsPaise: totalDebits,
    totalCreditsPaise: totalCredits,
    isBalanced: totalDebits === totalCredits,
  };
}

export async function getIncomeExpenseStatement(): Promise<IncomeExpenseData> {
  const { rows } = await getTrialBalance();
  const income: { code: string; name: string; amountPaise: number }[] = [];
  let totalIncome = 0;
  const expenses: { code: string; name: string; amountPaise: number }[] = [];
  let totalExpenses = 0;

  for (const r of rows) {
    if (r.category === 'INCOME') {
      const amount = r.creditPaise - r.debitPaise;
      income.push({ code: r.code, name: r.name, amountPaise: amount });
      totalIncome += amount;
    } else if (r.category === 'EXPENSE') {
      const amount = r.debitPaise - r.creditPaise;
      expenses.push({ code: r.code, name: r.name, amountPaise: amount });
      totalExpenses += amount;
    }
  }

  return {
    income,
    totalIncomePaise: totalIncome,
    expenses,
    totalExpensesPaise: totalExpenses,
    netSurplusPaise: totalIncome - totalExpenses,
  };
}

export async function getBalanceSheet(): Promise<BalanceSheetData> {
  const { rows } = await getTrialBalance();
  const ie = await getIncomeExpenseStatement();

  const assets: { code: string; name: string; amountPaise: number }[] = [];
  let totalAssets = 0;
  const liabilities: { code: string; name: string; amountPaise: number }[] = [];
  let totalLiabilities = 0;
  const equity: { code: string; name: string; amountPaise: number }[] = [];
  let totalEquityBase = 0;

  for (const r of rows) {
    if (r.category === 'ASSET') {
      const net = r.debitPaise - r.creditPaise;
      assets.push({ code: r.code, name: r.name, amountPaise: net });
      totalAssets += net;
    } else if (r.category === 'LIABILITY') {
      const net = r.creditPaise - r.debitPaise;
      liabilities.push({ code: r.code, name: r.name, amountPaise: net });
      totalLiabilities += net;
    } else if (r.category === 'EQUITY') {
      const net = r.creditPaise - r.debitPaise;
      equity.push({ code: r.code, name: r.name, amountPaise: net });
      totalEquityBase += net;
    }
  }

  const currentSurplusPaise = ie.netSurplusPaise;
  const totalEquityPaise = totalEquityBase + currentSurplusPaise;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquityPaise;
  const variance = totalAssets - totalLiabilitiesAndEquity;

  return {
    assets,
    totalAssetsPaise: totalAssets,
    liabilities,
    totalLiabilitiesPaise: totalLiabilities,
    equity,
    currentSurplusPaise,
    totalEquityPaise,
    isBalanced: Math.abs(variance) === 0,
    variancePaise: variance,
  };
}

export async function generateMonthlyDemands(billingMonth: string, actor: string): Promise<{ count: number; totalPaise: number }> {
  const db = await getDb();
  
  // Check if already generated
  const check = db.exec("SELECT COUNT(*) FROM maintenance_bills WHERE billing_month = ?", [billingMonth]);
  if (check.length && (check[0].values[0][0] as number) > 0) {
    throw new Error(`Maintenance demands for ${billingMonth} have already been generated.`);
  }

  const flatsRes = db.exec("SELECT id, flat_number, maintenance_paise FROM flats WHERE status = 'ACTIVE'");
  if (!flatsRes.length || !flatsRes[0].values.length) {
    throw new Error("No active flats found to bill.");
  }

  let totalAmountPaise = 0;
  const flatsList = flatsRes[0].values;
  const dueDate = `${billingMonth}-15`;

  for (const row of flatsList) {
    const flatId = row[0] as number;
    const flatNum = row[1] as string;
    const amt = row[2] as number;
    totalAmountPaise += amt;

    db.run(`
      INSERT INTO maintenance_bills (bill_no, flat_id, billing_month, amount_paise, due_date, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'UNPAID', datetime('now'))
    `, [`BILL-${billingMonth.replace('-', '')}-${flatNum}`, flatId, billingMonth, amt, dueDate]);
  }

  // Journal Entry: Debit 1100 Maintenance Receivables, Credit 4010 Maintenance Income
  const jeRes = db.exec("SELECT COUNT(*) FROM journal_entries");
  const count = (jeRes[0]?.values[0][0] as number) + 1;
  const entryNo = `JE-${billingMonth.substring(0, 4)}-${String(count).padStart(4, '0')}`;

  db.run(`
    INSERT INTO journal_entries (entry_no, entry_date, description, reference_id, reference_type, created_by, is_reversed, idempotency_key, created_at)
    VALUES (?, datetime('now'), ?, ?, 'BILLING', ?, 0, ?, datetime('now'))
  `, [
    entryNo,
    `Monthly Maintenance Demand Generation for ${billingMonth} (${flatsList.length} flats)`,
    `DEMAND-${billingMonth}`,
    actor,
    `DEMAND-${billingMonth}`
  ]);

  const entryIdRes = db.exec("SELECT last_insert_rowid()")[0].values[0][0] as number;

  db.run(`
    INSERT INTO journal_lines (entry_id, account_code, debit_paise, credit_paise, memo) VALUES
    (?, '1100', ?, 0, ?),
    (?, '4010', 0, ?, ?)
  `, [
    entryIdRes, totalAmountPaise, `Maintenance fees receivable for ${billingMonth}`,
    entryIdRes, totalAmountPaise, `Maintenance income earned for ${billingMonth}`
  ]);

  saveDb();
  return { count: flatsList.length, totalPaise: totalAmountPaise };
}

export async function recordPayment(params: {
  flatId: number;
  amountPaise: number;
  paymentMode: string;
  transactionRef?: string;
  paymentDate?: string;
  notes?: string;
  actor: string;
}): Promise<{ receiptNo: string }> {
  const db = await getDb();
  const { flatId, amountPaise, paymentMode, transactionRef, notes, actor } = params;
  const paymentDate = params.paymentDate || new Date().toISOString().slice(0, 10);

  // Find flat details
  const flatRes = db.exec("SELECT flat_number, maintenance_paise FROM flats WHERE id = ?", [flatId]);
  if (!flatRes.length || !flatRes[0].values.length) {
    throw new Error("Flat not found");
  }
  const flatNum = flatRes[0].values[0][0] as string;

  // Idempotency: If transaction reference was already recorded, return existing receipt
  if (transactionRef && transactionRef.trim()) {
    const dupCheck = db.exec("SELECT receipt_no FROM payment_receipts WHERE transaction_ref = ?", [transactionRef.trim()]);
    if (dupCheck.length && dupCheck[0].values.length) {
      const existingReceipt = dupCheck[0].values[0][0] as string;
      return { receiptNo: existingReceipt };
    }
  }

  // Generate sequential receipt number: REC-YYYYMM-XXXX
  const yearMonth = paymentDate.replace(/-/g, '').substring(0, 6);
  const countRes = db.exec("SELECT COUNT(*) FROM payment_receipts WHERE receipt_no LIKE ?", [`REC-${yearMonth}-%`]);
  const nextSeq = ((countRes[0]?.values[0][0] as number) || 0) + 1;
  const receiptNo = `REC-${yearMonth}-${String(nextSeq).padStart(4, '0')}`;

  // Find outstanding unpaid bills for this flat
  const billsRes = db.exec(`
    SELECT id, amount_paise, status FROM maintenance_bills 
    WHERE flat_id = ? AND status != 'PAID' 
    ORDER BY billing_month ASC
  `, [flatId]);

  let remainingPayment = amountPaise;
  let clearedReceivable = 0;
  let linkedBillId: number | null = null;

  if (billsRes.length && billsRes[0].values.length) {
    for (const bRow of billsRes[0].values) {
      if (remainingPayment <= 0) break;
      const bId = bRow[0] as number;
      const bAmt = bRow[1] as number;
      if (!linkedBillId) linkedBillId = bId;

      if (remainingPayment >= bAmt) {
        remainingPayment -= bAmt;
        clearedReceivable += bAmt;
        db.run("UPDATE maintenance_bills SET status = 'PAID' WHERE id = ?", [bId]);
      } else {
        clearedReceivable += remainingPayment;
        remainingPayment = 0;
        db.run("UPDATE maintenance_bills SET status = 'PARTIALLY_PAID' WHERE id = ?", [bId]);
      }
    }
  }

  // Any leftover payment goes to Resident Advances Liability (2010)
  const advanceAmount = remainingPayment;

  // Insert payment receipt
  db.run(`
    INSERT INTO payment_receipts (receipt_no, flat_id, bill_id, amount_paise, payment_mode, transaction_ref, payment_date, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `, [receiptNo, flatId, linkedBillId, amountPaise, paymentMode, transactionRef || '', paymentDate, notes || '']);

  // Double-Entry Journal:
  // Debit 1010 Bank (Total Amount)
  // Credit 1100 Receivables (Cleared amount)
  // Credit 2010 Resident Advances (Excess amount, if any)
  const jeCountRes = db.exec("SELECT COUNT(*) FROM journal_entries");
  const jeCount = ((jeCountRes[0]?.values[0][0] as number) || 0) + 1;
  const entryNo = `JE-${yearMonth.substring(0, 4)}-${String(jeCount).padStart(4, '0')}`;

  db.run(`
    INSERT INTO journal_entries (entry_no, entry_date, description, reference_id, reference_type, created_by, is_reversed, idempotency_key, created_at)
    VALUES (?, ?, ?, ?, 'RECEIPT', ?, 0, ?, datetime('now'))
  `, [
    entryNo,
    paymentDate,
    `Maintenance collection for Flat ${flatNum} (${receiptNo})`,
    receiptNo,
    actor,
    receiptNo
  ]);

  const entryId = db.exec("SELECT last_insert_rowid()")[0].values[0][0] as number;

  // Line 1: Debit Bank
  db.run(`
    INSERT INTO journal_lines (entry_id, account_code, debit_paise, credit_paise, flat_id, memo)
    VALUES (?, '1010', ?, 0, ?, ?)
  `, [entryId, amountPaise, flatId, `${paymentMode} payment received for Flat ${flatNum}`]);

  // Line 2: Credit Receivables (if any dues cleared)
  if (clearedReceivable > 0) {
    db.run(`
      INSERT INTO journal_lines (entry_id, account_code, debit_paise, credit_paise, flat_id, memo)
      VALUES (?, '1100', 0, ?, ?, ?)
    `, [entryId, clearedReceivable, flatId, `Dues settlement for Flat ${flatNum}`]);
  }

  // Line 3: Credit Resident Advances (if overpayment or no outstanding bill)
  if (advanceAmount > 0) {
    db.run(`
      INSERT INTO journal_lines (entry_id, account_code, debit_paise, credit_paise, flat_id, memo)
      VALUES (?, '2010', 0, ?, ?, ?)
    `, [entryId, advanceAmount, flatId, `Advance surplus credit for Flat ${flatNum}`]);
  }

  saveDb();
  return { receiptNo };
}

export async function reverseJournalEntry(entryId: number, reason: string, actor: string): Promise<string> {
  const db = await getDb();
  const jeRes = db.exec("SELECT entry_no, entry_date, description, is_reversed FROM journal_entries WHERE id = ?", [entryId]);
  if (!jeRes.length || !jeRes[0].values.length) {
    throw new Error("Journal entry not found");
  }

  const origNo = jeRes[0].values[0][0] as string;
  const isReversed = jeRes[0].values[0][3] as number;
  if (isReversed) {
    throw new Error(`Journal entry ${origNo} has already been reversed.`);
  }

  // Fetch all lines
  const linesRes = db.exec("SELECT account_code, debit_paise, credit_paise, flat_id, memo FROM journal_lines WHERE entry_id = ?", [entryId]);
  if (!linesRes.length || !linesRes[0].values.length) {
    throw new Error("No lines found for journal entry");
  }

  const jeCountRes = db.exec("SELECT COUNT(*) FROM journal_entries");
  const nextSeq = ((jeCountRes[0]?.values[0][0] as number) || 0) + 1;
  const year = new Date().getFullYear();
  const revNo = `REV-${year}-${String(nextSeq).padStart(4, '0')}`;

  db.run(`
    INSERT INTO journal_entries (entry_no, entry_date, description, reference_id, reference_type, created_by, is_reversed, created_at)
    VALUES (?, datetime('now'), ?, ?, 'REVERSAL', ?, 0, datetime('now'))
  `, [
    revNo,
    `Reversal of ${origNo}: ${reason}`,
    origNo,
    actor
  ]);

  const revId = db.exec("SELECT last_insert_rowid()")[0].values[0][0] as number;

  // Swap debits and credits
  for (const line of linesRes[0].values) {
    const acc = line[0] as string;
    const debit = line[1] as number;
    const credit = line[2] as number;
    const flatId = line[3] as number | null;
    const memo = line[4] as string | null;

    db.run(`
      INSERT INTO journal_lines (entry_id, account_code, debit_paise, credit_paise, flat_id, memo)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [revId, acc, credit, debit, flatId, `Inverted reversal line for ${memo || acc}`]);
  }

  // Mark original as reversed
  db.run("UPDATE journal_entries SET is_reversed = 1, reversal_entry_id = ? WHERE id = ?", [revId, entryId]);

  saveDb();
  return revNo;
}
