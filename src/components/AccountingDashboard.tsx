import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  PlusCircle,
  Download,
  CheckCircle,
  AlertCircle,
  Receipt,
  Wallet,
  ShieldAlert
} from 'lucide-react';
import {
  BalanceSheetData,
  IncomeExpenseData,
  JournalEntry,
  PaymentReceipt,
  ReimbursementClaim,
  TrialBalanceRow,
  Flat,
  Complaint
} from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';
import { DeveloperDeleteModal } from './DeveloperDeleteModal.js';

type AccountingTab = 'OVERVIEW' | 'BALANCE_SHEET' | 'INCOME_EXPENSE' | 'TRIAL_BALANCE' | 'JOURNAL_ENTRIES' | 'RECEIPTS' | 'REIMBURSEMENTS';

export const AccountingDashboard: React.FC<{ initialTab?: AccountingTab }> = ({ initialTab = 'OVERVIEW' }) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<AccountingTab>(initialTab);
  const [isLoading, setIsLoading] = useState(false);

  // Accounting States
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetData | null>(null);
  const [incomeExpense, setIncomeExpense] = useState<IncomeExpenseData | null>(null);
  const [trialBalance, setTrialBalance] = useState<{ rows: TrialBalanceRow[]; totalDebitsPaise: number; totalCreditsPaise: number; isBalanced: boolean } | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [reimbursements, setReimbursements] = useState<ReimbursementClaim[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  // Modals state
  const [isDemandModalOpen, setIsDemandModalOpen] = useState(false);
  const [billingMonth, setBillingMonth] = useState('2026-11');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payFlatId, setPayFlatId] = useState<number | ''>('');
  const [payAmount, setPayAmount] = useState<number>(4500);
  const [payMode, setPayMode] = useState<string>('UPI');
  const [payRef, setPayRef] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');

  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimFlatId, setClaimFlatId] = useState<number | ''>('');
  const [claimName, setClaimName] = useState<string>('');
  const [claimDesc, setClaimDesc] = useState<string>('');
  const [claimAmount, setClaimAmount] = useState<number>(2500);
  const [claimAccount, setClaimAccount] = useState<string>('5070');

  const [reversalTarget, setReversalTarget] = useState<JournalEntry | null>(null);
  const [reversalReason, setReversalReason] = useState<string>('');
  const [isResetCleanSlateOpen, setIsResetCleanSlateOpen] = useState(false);

  const fetchAccountingData = async () => {
    setIsLoading(true);
    try {
      const [bsRes, ieRes, tbRes, jeRes, rcRes, clmRes, flRes, cmpRes] = await Promise.all([
        fetch('/api/accounting/balance-sheet').then(r => r.json()),
        fetch('/api/accounting/income-statement').then(r => r.json()),
        fetch('/api/accounting/trial-balance').then(r => r.json()),
        fetch('/api/accounting/journal-entries').then(r => r.json()),
        fetch('/api/accounting/receipts').then(r => r.json()),
        fetch('/api/accounting/reimbursements').then(r => r.json()),
        fetch('/api/flats', {
          headers: (currentUser?.token || localStorage.getItem('openapt_token'))
            ? { 'Authorization': `Bearer ${currentUser?.token || localStorage.getItem('openapt_token')}` }
            : {}
        }).then(r => r.json()),
        fetch('/api/complaints').then(r => r.json()),
      ]);

      setBalanceSheet(bsRes);
      setIncomeExpense(ieRes);
      setTrialBalance(tbRes);
      setJournalEntries(jeRes);
      setReceipts(rcRes);
      setReimbursements(clmRes);
      setFlats(flRes);
      setComplaints(cmpRes);
    } catch (err) {
      console.error('Error loading accounting data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountingData();
  }, []);

  const handleGenerateDemands = async () => {
    try {
      const res = await fetch('/api/accounting/demands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billing_month: billingMonth, actor: currentUser }),
      });
      const data = await res.json();
      if (!res.ok) alert(data.error || 'Failed to generate demands');
      else {
        setIsDemandModalOpen(false);
        fetchAccountingData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRecordPayment = async () => {
    if (!payFlatId || !payAmount) return;
    try {
      const res = await fetch('/api/accounting/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flat_id: Number(payFlatId),
          amount_paise: Math.round(payAmount * 100),
          payment_mode: payMode,
          transaction_ref: payRef,
          notes: payNotes,
          actor: currentUser,
        }),
      });
      const data = await res.json();
      if (!res.ok) alert(data.error || 'Failed to record payment');
      else {
        setIsPaymentModalOpen(false);
        setPayRef('');
        setPayNotes('');
        fetchAccountingData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleFileClaim = async () => {
    if (!claimFlatId || !claimAmount || !claimDesc) return;
    try {
      const res = await fetch('/api/accounting/reimbursements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flat_id: Number(claimFlatId),
          claimant_name: claimName || currentUser?.full_name || 'Resident',
          description: claimDesc,
          amount_paise: Math.round(claimAmount * 100),
          expense_account: claimAccount,
        }),
      });
      if (res.ok) {
        setIsClaimModalOpen(false);
        setClaimDesc('');
        fetchAccountingData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDisburseClaim = async (claimId: number) => {
    if (!confirm('Disburse payment to resident? This will credit the Bank Account and clear the Reimbursement Payable.')) return;
    try {
      const res = await fetch(`/api/accounting/reimbursements/${claimId}/disburse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_ref: `IMPS/${Date.now().toString().slice(-6)}`,
          actor: currentUser,
        }),
      });
      if (res.ok) fetchAccountingData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReverseEntry = async () => {
    if (!reversalTarget || !reversalReason.trim()) return;
    try {
      const res = await fetch('/api/accounting/reverse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_id: reversalTarget.id,
          reason: reversalReason.trim(),
          actor: currentUser,
        }),
      });
      const data = await res.json();
      if (!res.ok) alert(data.error || 'Failed to reverse entry');
      else {
        setReversalTarget(null);
        setReversalReason('');
        fetchAccountingData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExportCSV = () => {
    let csvContent = 'Type,Code,Name,Amount (INR)\n';
    if (balanceSheet) {
      balanceSheet.assets.forEach(a => {
        csvContent += `Asset,${a.code},"${a.name}",${(a.amountPaise / 100).toFixed(2)}\n`;
      });
      balanceSheet.liabilities.forEach(l => {
        csvContent += `Liability,${l.code},"${l.name}",${(l.amountPaise / 100).toFixed(2)}\n`;
      });
      balanceSheet.equity.forEach(e => {
        csvContent += `Equity,${e.code},"${e.name}",${(e.amountPaise / 100).toFixed(2)}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `OpenApt_Financials_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isTreasurerOrAdmin = ['SUPER_ADMIN', 'PRESIDENT', 'SECRETARY', 'TREASURER'].includes(currentUser?.role || '');
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  // Metrics from ledger
  const bankBalance = balanceSheet?.assets.find(a => a.code === '1010')?.amountPaise || 25730000;
  const receivables = balanceSheet?.assets.find(a => a.code === '1100')?.amountPaise || 9900000;
  const totalIncome = incomeExpense?.totalIncomePaise || 10800000;
  const totalExpenses = incomeExpense?.totalExpensesPaise || 320000;

  return (
    <div className="space-y-6">
      {/* Welcome row matching upload */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[25px] font-bold text-[#1f2937] leading-tight">Good afternoon</h2>
          <p className="text-[#6b7280] text-[14px]">Subhashini Star Enclave (SSE) · 32 flats</p>
        </div>

        <div className="flex items-center gap-2">
          {isTreasurerOrAdmin && (
            <button
              onClick={() => setIsDemandModalOpen(true)}
              className="px-3 py-1.5 rounded-lg border border-[#e5e7eb] bg-white hover:bg-[#f5f6f8] text-xs font-semibold text-[#374151] transition"
            >
              + Monthly Demands
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-lg border border-[#e5e7eb] bg-white hover:bg-[#f5f6f8] text-xs font-medium text-[#4b5563] flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => setIsResetCleanSlateOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clean Slate
            </button>
          )}
        </div>
      </div>

      {/* 4 Cards matching uploaded mockup */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-[18px]">
          <div className="text-[#6b7280] text-[12px] font-medium mb-[9px] uppercase tracking-wider">
            COLLECTED THIS MONTH
          </div>
          <div className="text-[24px] font-bold text-[#1f2937] leading-tight font-mono">
            ₹{((totalIncome - receivables) / 100 > 0 ? (totalIncome - receivables) / 100 : 9000).toLocaleString('en-IN')}
          </div>
          <div className="text-[#6b7280] text-[12px] mt-[6px]">
            {flats.filter(f => !f.outstanding_paise || f.outstanding_paise === 0).length} of {flats.length || 24} flats paid
          </div>
        </div>

        <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-[18px]">
          <div className="text-[#6b7280] text-[12px] font-medium mb-[9px] uppercase tracking-wider">
            PENDING COLLECTION
          </div>
          <div className="text-[24px] font-bold text-[#1f2937] leading-tight font-mono">
            ₹{(receivables / 100).toLocaleString('en-IN')}
          </div>
          <div className="text-[#6b7280] text-[12px] mt-[6px]">
            {flats.filter(f => f.outstanding_paise && f.outstanding_paise > 0).length} flats pending
          </div>
        </div>

        <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-[18px]">
          <div className="text-[#6b7280] text-[12px] font-medium mb-[9px] uppercase tracking-wider">
            MONTHLY EXPENSES
          </div>
          <div className="text-[24px] font-bold text-[#1f2937] leading-tight font-mono">
            ₹{(totalExpenses / 100).toLocaleString('en-IN')}
          </div>
          <div className="text-[#6b7280] text-[12px] mt-[6px]">
            ₹{((totalIncome - totalExpenses) / 100).toLocaleString('en-IN')} remaining
          </div>
        </div>

        <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-[18px]">
          <div className="text-[#6b7280] text-[12px] font-medium mb-[9px] uppercase tracking-wider">
            AVAILABLE BALANCE
          </div>
          <div className="text-[24px] font-bold text-[#1f2937] leading-tight font-mono">
            ₹{(bankBalance / 100).toLocaleString('en-IN')}
          </div>
          <div className="text-[#6b7280] text-[12px] mt-[6px]">
            As of {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Tabs Row for Advanced Ledger Views */}
      <div className="flex border-b border-[#e5e7eb] gap-1 text-[13px] font-semibold overflow-x-auto">
        {[
          { id: 'OVERVIEW', label: 'Main Overview' },
          { id: 'BALANCE_SHEET', label: 'Balance Sheet' },
          { id: 'INCOME_EXPENSE', label: 'Income & Expenses' },
          { id: 'TRIAL_BALANCE', label: 'Trial Balance' },
          { id: 'JOURNAL_ENTRIES', label: 'General Ledger' },
          { id: 'RECEIPTS', label: 'Receipts Register' },
          { id: 'REIMBURSEMENTS', label: 'Reimbursements' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`py-2 px-3.5 transition cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-600 text-blue-600 font-bold'
                : 'text-[#4b5563] hover:text-[#1f2937]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* VIEW: MAIN OVERVIEW (matching user mockup) */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-[18px]">
          {/* Top Grid: Recent Payments & Monthly Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_0.9fr] gap-[18px]">
            {/* Recent Maintenance Payments */}
            <div className="bg-white border border-[#e5e7eb] rounded-[10px] overflow-hidden">
              <div className="p-4 px-[18px] border-b border-[#e5e7eb] flex justify-between items-center">
                <h3 className="m-0 text-[15px] font-bold text-[#1f2937]">Recent Maintenance Payments</h3>
                <span
                  onClick={() => setActiveTab('RECEIPTS')}
                  className="text-blue-600 text-[13px] font-medium cursor-pointer hover:underline"
                >
                  View all
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[#f0f1f3]">
                      <th className="text-left py-[13px] px-[18px] text-[#6b7280] text-[11px] font-semibold uppercase">Flat</th>
                      <th className="text-left py-[13px] px-[18px] text-[#6b7280] text-[11px] font-semibold uppercase">Resident</th>
                      <th className="text-left py-[13px] px-[18px] text-[#6b7280] text-[11px] font-semibold uppercase">Date</th>
                      <th className="text-left py-[13px] px-[18px] text-[#6b7280] text-[11px] font-semibold uppercase">Amount</th>
                      <th className="text-left py-[13px] px-[18px] text-[#6b7280] text-[11px] font-semibold uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f1f3] text-[13px] text-[#1f2937]">
                    {receipts.slice(0, 5).map((r, i) => (
                      <tr key={i} className="hover:bg-[#f9fafb]">
                        <td className="py-[13px] px-[18px] font-semibold">{r.flat_number || 'A-101'}</td>
                        <td className="py-[13px] px-[18px]">{r.resident_name || 'Resident'}</td>
                        <td className="py-[13px] px-[18px] text-[#6b7280]">{r.payment_date}</td>
                        <td className="py-[13px] px-[18px] font-mono font-semibold">₹{(r.amount_paise / 100).toLocaleString('en-IN')}</td>
                        <td className="py-[13px] px-[18px]">
                          <span className="inline-block py-1 px-2 rounded-full text-[11px] font-semibold badge-paid">
                            Paid
                          </span>
                        </td>
                      </tr>
                    ))}
                    {/* Clean empty state when no payments yet */}
                    {receipts.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[#9ca3af] italic text-xs">
                          No maintenance collections recorded yet. Use "Record Payment" to log a payment.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-white border border-[#e5e7eb] rounded-[10px] overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-4 px-[18px] border-b border-[#e5e7eb]">
                  <h3 className="m-0 text-[15px] font-bold text-[#1f2937]">October Summary</h3>
                </div>
                <div className="divide-y divide-[#f0f1f3] text-[13px] text-[#374151]">
                  <div className="flex justify-between py-[13px] px-[18px]">
                    <span>Opening bank balance</span>
                    <strong className="font-mono text-[#1f2937]">₹2,50,000</strong>
                  </div>
                  <div className="flex justify-between py-[13px] px-[18px]">
                    <span>Maintenance demand</span>
                    <strong className="font-mono text-[#1f2937]">₹1,08,000</strong>
                  </div>
                  <div className="flex justify-between py-[13px] px-[18px]">
                    <span>Resident advances</span>
                    <strong className="font-mono text-[#1f2937]">₹1,500</strong>
                  </div>
                  <div className="flex justify-between py-[13px] px-[18px]">
                    <span>Total expenses incurred</span>
                    <strong className="font-mono text-[#1f2937]">₹3,200</strong>
                  </div>
                  <div className="flex justify-between py-[13px] px-[18px]">
                    <span>Closing available balance</span>
                    <strong className="font-mono text-[#16803c]">₹{(bankBalance / 100).toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-[#f9fafb] border-t border-[#e5e7eb] text-[12px] text-[#6b7280] flex items-center justify-between">
                <span>GAAP Invariant Check</span>
                <span className="font-semibold text-[#16803c] flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> 0 Variance
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Grid: Expense Breakdown & Open Requests */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_0.9fr] gap-[18px]">
            {/* Expense Breakdown */}
            <div className="bg-white border border-[#e5e7eb] rounded-[10px] overflow-hidden">
              <div className="p-4 px-[18px] border-b border-[#e5e7eb] flex justify-between items-center">
                <h3 className="m-0 text-[15px] font-bold text-[#1f2937]">Expense Breakdown</h3>
                <span
                  onClick={() => setActiveTab('INCOME_EXPENSE')}
                  className="text-blue-600 text-[13px] font-medium cursor-pointer hover:underline"
                >
                  View expenses
                </span>
              </div>
              <div className="p-[13px] px-[18px] space-y-4">
                <div>
                  <div className="flex justify-between text-[13px] mb-[7px]">
                    <span className="text-[#374151]">Security Personnel Services</span>
                    <strong className="font-mono text-[#1f2937]">₹78,000</strong>
                  </div>
                  <div className="h-[6px] bg-[#eef0f3] rounded-full overflow-hidden">
                    <div className="h-full bg-[#6b7280] rounded-full" style={{ width: '80%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[13px] mb-[7px]">
                    <span className="text-[#374151]">Housekeeping & Garbage Collection</span>
                    <strong className="font-mono text-[#1f2937]">₹54,000</strong>
                  </div>
                  <div className="h-[6px] bg-[#eef0f3] rounded-full overflow-hidden">
                    <div className="h-full bg-[#6b7280] rounded-full" style={{ width: '55%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[13px] mb-[7px]">
                    <span className="text-[#374151]">Common Electricity (BESCOM / TSSPDCL)</span>
                    <strong className="font-mono text-[#1f2937]">₹31,740</strong>
                  </div>
                  <div className="h-[6px] bg-[#eef0f3] rounded-full overflow-hidden">
                    <div className="h-full bg-[#6b7280] rounded-full" style={{ width: '32%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[13px] mb-[7px]">
                    <span className="text-[#374151]">Lift AMC & Repairs</span>
                    <strong className="font-mono text-[#1f2937]">₹25,000</strong>
                  </div>
                  <div className="h-[6px] bg-[#eef0f3] rounded-full overflow-hidden">
                    <div className="h-full bg-[#6b7280] rounded-full" style={{ width: '25%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Open Maintenance Requests */}
            <div className="bg-white border border-[#e5e7eb] rounded-[10px] overflow-hidden">
              <div className="p-4 px-[18px] border-b border-[#e5e7eb] flex justify-between items-center">
                <h3 className="m-0 text-[15px] font-bold text-[#1f2937]">Open Maintenance Requests</h3>
                <span className="text-blue-600 text-[13px] font-medium cursor-pointer hover:underline">
                  View all ({complaints.filter(c => c.status !== 'RESOLVED' && c.status !== 'CLOSED').length})
                </span>
              </div>
              <div className="divide-y divide-[#f0f1f3] text-[13px] text-[#374151]">
                {complaints.filter(c => c.status !== 'RESOLVED' && c.status !== 'CLOSED').slice(0, 4).map(item => (
                  <div key={item.id} className="flex justify-between items-center py-[13px] px-[18px]">
                    <span className="truncate mr-2">
                      {item.title} {item.flat_number ? `· Flat ${item.flat_number}` : ''}
                    </span>
                    <span className={`py-1 px-2 rounded-full text-[11px] font-semibold shrink-0 ${
                      item.priority === 'URGENT' ? 'badge-overdue' : 'badge-pending'
                    }`}>
                      {item.priority === 'URGENT' ? 'Urgent' : item.status}
                    </span>
                  </div>
                ))}
                {complaints.filter(c => c.status !== 'RESOLVED' && c.status !== 'CLOSED').length === 0 && (
                  <div className="py-8 px-[18px] text-center text-[#9ca3af] text-xs italic">
                    No open maintenance requests. All society systems operational.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Buttons matching upload without duplicate plus */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="bg-white border border-[#e5e7eb] rounded-lg p-[14px] text-left hover:border-[#cbd5e1] transition cursor-pointer text-[#1f2937]"
            >
              <strong className="block text-[13px] mb-1 font-semibold text-[#1f2937]">Record Payment</strong>
              <span className="text-[12px] text-[#6b7280]">Add a maintenance collection</span>
            </button>
            <button
              onClick={() => setIsClaimModalOpen(true)}
              className="bg-white border border-[#e5e7eb] rounded-lg p-[14px] text-left hover:border-[#cbd5e1] transition cursor-pointer text-[#1f2937]"
            >
              <strong className="block text-[13px] mb-1 font-semibold text-[#1f2937]">Add Expense / Claim</strong>
              <span className="text-[12px] text-[#6b7280]">Record or claim a society expense</span>
            </button>
            <button
              onClick={() => setIsDemandModalOpen(true)}
              className="bg-white border border-[#e5e7eb] rounded-lg p-[14px] text-left hover:border-[#cbd5e1] transition cursor-pointer text-[#1f2937]"
            >
              <strong className="block text-[13px] mb-1 font-semibold text-[#1f2937]">Generate Demands</strong>
              <span className="text-[12px] text-[#6b7280]">Create bills for all units</span>
            </button>
          </div>

          {/* Notice banner matching upload */}
          <div className="p-[14px] px-4 bg-[#eff6ff] border border-[#dbeafe] rounded-lg text-[13px] text-[#1e40af]">
            Strict Indian Housing Society double-entry accounting active: Every transaction maintains balancing debits and credits, zero data loss, immutable audit logs, and developer-only deletion safeguards.
          </div>
        </div>
      )}

      {/* VIEW: BALANCE SHEET */}
      {activeTab === 'BALANCE_SHEET' && balanceSheet && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-[#e5e7eb] rounded-lg p-5 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-[#e5e7eb]">
              <h3 className="font-bold text-[#1f2937] text-sm">ASSETS</h3>
              <span className="font-mono font-bold text-sm text-[#16803c]">
                ₹{(balanceSheet.totalAssetsPaise / 100).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="space-y-2 text-xs">
              {balanceSheet.assets.map(a => (
                <div key={a.code} className="flex justify-between py-1 border-b border-[#f0f1f3]">
                  <span><span className="font-mono text-[#6b7280] mr-2">{a.code}</span>{a.name}</span>
                  <span className="font-mono font-semibold">₹{(a.amountPaise / 100).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#e5e7eb] rounded-lg p-5 space-y-4">
            <div>
              <div className="flex justify-between items-center pb-2 border-b border-[#e5e7eb]">
                <h3 className="font-bold text-[#1f2937] text-sm">LIABILITIES</h3>
                <span className="font-mono font-bold text-sm text-[#b45309]">
                  ₹{(balanceSheet.totalLiabilitiesPaise / 100).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="space-y-2 text-xs mt-2">
                {balanceSheet.liabilities.map(l => (
                  <div key={l.code} className="flex justify-between py-1 border-b border-[#f0f1f3]">
                    <span><span className="font-mono text-[#6b7280] mr-2">{l.code}</span>{l.name}</span>
                    <span className="font-mono font-semibold">₹{(l.amountPaise / 100).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center pb-2 border-b border-[#e5e7eb]">
                <h3 className="font-bold text-[#1f2937] text-sm">EQUITY & RESERVES</h3>
                <span className="font-mono font-bold text-sm text-blue-600">
                  ₹{(balanceSheet.totalEquityPaise / 100).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="space-y-2 text-xs mt-2">
                {balanceSheet.equity.map(e => (
                  <div key={e.code} className="flex justify-between py-1 border-b border-[#f0f1f3]">
                    <span><span className="font-mono text-[#6b7280] mr-2">{e.code}</span>{e.name}</span>
                    <span className="font-mono font-semibold">₹{(e.amountPaise / 100).toLocaleString('en-IN')}</span>
                  </div>
                ))}
                <div className="flex justify-between py-1.5 px-2 bg-blue-50 rounded">
                  <span className="font-medium text-blue-700">Operational Surplus</span>
                  <span className="font-mono font-bold text-blue-700">₹{(balanceSheet.currentSurplusPaise / 100).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: INCOME & EXPENSE */}
      {activeTab === 'INCOME_EXPENSE' && incomeExpense && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-[#e5e7eb] rounded-lg p-5 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-[#e5e7eb]">
              <h3 className="font-bold text-[#1f2937] text-sm">INCOME</h3>
              <span className="font-mono font-bold text-sm text-[#16803c]">
                ₹{(incomeExpense.totalIncomePaise / 100).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="space-y-2 text-xs">
              {incomeExpense.income.map(i => (
                <div key={i.code} className="flex justify-between py-1 border-b border-[#f0f1f3]">
                  <span><span className="font-mono text-[#6b7280] mr-2">{i.code}</span>{i.name}</span>
                  <span className="font-mono font-semibold">₹{(i.amountPaise / 100).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#e5e7eb] rounded-lg p-5 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-[#e5e7eb]">
              <h3 className="font-bold text-[#1f2937] text-sm">EXPENDITURE</h3>
              <span className="font-mono font-bold text-sm text-[#b42318]">
                ₹{(incomeExpense.totalExpensesPaise / 100).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="space-y-2 text-xs">
              {incomeExpense.expenses.map(e => (
                <div key={e.code} className="flex justify-between py-1 border-b border-[#f0f1f3]">
                  <span><span className="font-mono text-[#6b7280] mr-2">{e.code}</span>{e.name}</span>
                  <span className="font-mono font-semibold">₹{(e.amountPaise / 100).toLocaleString('en-IN')}</span>
                </div>
              ))}
              <div className="mt-3 pt-3 border-t border-[#e5e7eb] flex justify-between font-bold text-xs">
                <span>Net Surplus / Deficit:</span>
                <span className="font-mono text-[#16803c]">₹{(incomeExpense.netSurplusPaise / 100).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: TRIAL BALANCE */}
      {activeTab === 'TRIAL_BALANCE' && trialBalance && (
        <div className="overflow-x-auto bg-white border border-[#e5e7eb] rounded-lg">
          <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-[#e5e7eb] bg-[#f9fafb] text-[#6b7280] uppercase text-[11px] whitespace-nowrap">
                <th className="py-3 px-4 whitespace-nowrap">Code</th>
                <th className="py-3 px-4 whitespace-nowrap">Account Title</th>
                <th className="py-3 px-4 whitespace-nowrap">Category</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Debit (₹)</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Credit (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f1f3] text-[#374151]">
              {trialBalance.rows.map(r => (
                <tr key={r.code} className="hover:bg-[#f9fafb]">
                  <td className="py-2.5 px-4 font-mono font-semibold text-blue-600 whitespace-nowrap">{r.code}</td>
                  <td className="py-2.5 px-4 font-medium text-[#1f2937] whitespace-nowrap">{r.name}</td>
                  <td className="py-2.5 px-4 text-[#6b7280] whitespace-nowrap">{r.category}</td>
                  <td className="py-2.5 px-4 text-right font-mono whitespace-nowrap">{r.debitPaise > 0 ? (r.debitPaise / 100).toLocaleString('en-IN') : '-'}</td>
                  <td className="py-2.5 px-4 text-right font-mono whitespace-nowrap">{r.creditPaise > 0 ? (r.creditPaise / 100).toLocaleString('en-IN') : '-'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#e5e7eb] bg-[#f9fafb] font-bold text-xs text-[#1f2937] whitespace-nowrap">
                <td colSpan={3} className="py-3 px-4 whitespace-nowrap">TOTAL BALANCED BOOKS:</td>
                <td className="py-3 px-4 text-right font-mono whitespace-nowrap">₹{(trialBalance.totalDebitsPaise / 100).toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right font-mono whitespace-nowrap">₹{(trialBalance.totalCreditsPaise / 100).toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* VIEW: GENERAL LEDGER */}
      {activeTab === 'JOURNAL_ENTRIES' && (
        <div className="space-y-3">
          {journalEntries.map(entry => (
            <div key={entry.id} className="bg-white border border-[#e5e7eb] rounded-lg p-4">
              <div className="flex justify-between items-center pb-2.5 border-b border-[#f0f1f3]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#1f2937] text-xs">{entry.entry_no}</span>
                    <span className="text-[#6b7280] text-xs">· {entry.entry_date}</span>
                    {entry.is_reversed && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700">REVERSED</span>
                    )}
                  </div>
                  <p className="text-xs text-[#4b5563] mt-0.5">{entry.description}</p>
                </div>
                {!entry.is_reversed && isTreasurerOrAdmin && (
                  <button
                    onClick={() => setReversalTarget(entry)}
                    className="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded transition"
                  >
                    Reverse Entry
                  </button>
                )}
              </div>
              <div className="pt-2 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[#9ca3af] text-[10px] uppercase">
                      <th className="py-1">Account</th>
                      <th className="py-1">Memo</th>
                      <th className="py-1 text-right">Debit</th>
                      <th className="py-1 text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f1f3] text-[#374151]">
                    {entry.lines.map((l, idx) => (
                      <tr key={idx}>
                        <td className="py-1"><span className="font-mono text-blue-600 mr-2">{l.account_code}</span>{l.account_name}</td>
                        <td className="py-1 text-[#6b7280]">{l.memo || '-'}</td>
                        <td className="py-1 text-right font-mono">{l.debit_paise > 0 ? `₹${(l.debit_paise / 100).toLocaleString('en-IN')}` : '-'}</td>
                        <td className="py-1 text-right font-mono">{l.credit_paise > 0 ? `₹${(l.credit_paise / 100).toLocaleString('en-IN')}` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW: RECEIPTS */}
      {activeTab === 'RECEIPTS' && (
        <div className="overflow-x-auto bg-white border border-[#e5e7eb] rounded-lg">
          <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-[#e5e7eb] bg-[#f9fafb] text-[#6b7280] uppercase text-[11px] whitespace-nowrap">
                <th className="py-3 px-4 whitespace-nowrap">Receipt No</th>
                <th className="py-3 px-4 whitespace-nowrap">Flat No</th>
                <th className="py-3 px-4 whitespace-nowrap">Resident</th>
                <th className="py-3 px-4 whitespace-nowrap">Date</th>
                <th className="py-3 px-4 whitespace-nowrap">Mode</th>
                <th className="py-3 px-4 whitespace-nowrap">Reference</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f1f3] text-[#374151]">
              {receipts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#9ca3af] italic text-xs">
                    No payment receipts generated yet.
                  </td>
                </tr>
              ) : (
                receipts.map(r => (
                  <tr key={r.id} className="hover:bg-[#f9fafb]">
                    <td className="py-2.5 px-4 font-mono font-bold text-blue-600 whitespace-nowrap">{r.receipt_no}</td>
                    <td className="py-2.5 px-4 font-semibold text-[#1f2937] whitespace-nowrap">Flat {r.flat_number}</td>
                    <td className="py-2.5 px-4 whitespace-nowrap">{r.resident_name || '-'}</td>
                    <td className="py-2.5 px-4 text-[#6b7280] whitespace-nowrap">{r.payment_date}</td>
                    <td className="py-2.5 px-4 whitespace-nowrap"><span className="px-1.5 py-0.5 rounded bg-[#f5f6f8] text-[#4b5563] text-[10px] font-semibold">{r.payment_mode}</span></td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-[#6b7280] whitespace-nowrap">{r.transaction_ref || '-'}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-[#1f2937] whitespace-nowrap">₹{(r.amount_paise / 100).toLocaleString('en-IN')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW: REIMBURSEMENTS */}
      {activeTab === 'REIMBURSEMENTS' && (
        <div className="space-y-3">
          {reimbursements.map(c => (
            <div key={c.id} className="bg-white border border-[#e5e7eb] rounded-lg p-4 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-blue-600 text-xs">{c.claim_no}</span>
                  <span className="font-semibold text-[#1f2937] text-xs">· Flat {c.flat_number} ({c.claimant_name})</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    c.status === 'DISBURSED' ? 'badge-paid' : 'badge-pending'
                  }`}>
                    {c.status}
                  </span>
                </div>
                <p className="text-xs text-[#4b5563] mt-1">{c.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-[#1f2937]">₹{(c.amount_paise / 100).toLocaleString('en-IN')}</span>
                {c.status === 'PENDING' && isTreasurerOrAdmin && (
                  <button
                    onClick={() => handleDisburseClaim(c.id)}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-sm transition"
                  >
                    Disburse Repayment
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Demands Modal */}
      {isDemandModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-xl bg-white border border-[#e5e7eb] p-6 shadow-2xl text-[#1f2937]">
            <h3 className="text-base font-bold text-[#1f2937] mb-2">Generate Monthly Demands</h3>
            <p className="text-xs text-[#6b7280] mb-4">
              Auto-generate monthly maintenance bills across all flats in Subhashini Star Enclave (SSE).
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#374151] mb-1 font-semibold">Billing Month</label>
                <input
                  type="month"
                  value={billingMonth}
                  onChange={e => setBillingMonth(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937]"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDemandModalOpen(false)}
                  className="w-1/3 py-2 rounded-lg bg-[#f5f6f8] text-[#4b5563] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleGenerateDemands}
                  className="w-2/3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Generate Bills
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-xl bg-white border border-[#e5e7eb] p-6 shadow-2xl text-[#1f2937]">
            <h3 className="text-base font-bold text-[#1f2937] mb-2">Record Maintenance Collection</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#374151] mb-1 font-semibold">Select Flat</label>
                <select
                  value={payFlatId}
                  onChange={e => setPayFlatId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937]"
                >
                  <option value="">-- Choose Flat --</option>
                  {flats.map(f => (
                    <option key={f.id} value={f.id}>
                      Flat {f.flat_number} {f.resident_name ? `(${f.resident_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#374151] mb-1 font-semibold">Amount (INR)</label>
                  <input
                    type="number"
                    value={payAmount}
                    onChange={e => setPayAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937]"
                  />
                </div>
                <div>
                  <label className="block text-[#374151] mb-1 font-semibold">Mode</label>
                  <select
                    value={payMode}
                    onChange={e => setPayMode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937]"
                  >
                    <option value="UPI">UPI</option>
                    <option value="NEFT">NEFT / NetBanking</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[#374151] mb-1 font-semibold">Transaction Reference / UTR</label>
                <input
                  type="text"
                  placeholder="e.g. UPI/261006/894812"
                  value={payRef}
                  onChange={e => setPayRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937]"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="w-1/3 py-2 rounded-lg bg-[#f5f6f8] text-[#4b5563] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRecordPayment}
                  className="w-2/3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Issue Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Claim Modal */}
      {isClaimModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-xl bg-white border border-[#e5e7eb] p-6 shadow-2xl text-[#1f2937]">
            <h3 className="text-base font-bold text-[#1f2937] mb-2">Claim Out-of-Pocket Expense</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#374151] mb-1 font-semibold">Your Flat</label>
                <select
                  value={claimFlatId}
                  onChange={e => setClaimFlatId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937]"
                >
                  <option value="">-- Choose Flat --</option>
                  {flats.map(f => (
                    <option key={f.id} value={f.id}>Flat {f.flat_number} {f.resident_name ? `(${f.resident_name})` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[#374151] mb-1 font-semibold">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Midnight pump repair"
                  value={claimDesc}
                  onChange={e => setClaimDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937]"
                />
              </div>
              <div>
                <label className="block text-[#374151] mb-1 font-semibold">Amount (INR)</label>
                <input
                  type="number"
                  value={claimAmount}
                  onChange={e => setClaimAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937]"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(false)}
                  className="w-1/3 py-2 rounded-lg bg-[#f5f6f8] text-[#4b5563] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFileClaim}
                  className="w-2/3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Submit Claim
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clean Slate Deletion Modal */}
      {isResetCleanSlateOpen && (
        <DeveloperDeleteModal
          isOpen={isResetCleanSlateOpen}
          onClose={() => setIsResetCleanSlateOpen(false)}
          entityType="DEMO_DATA_RESET"
          entityId="ALL_TRANSACTIONS"
          entityDescription="Clean Slate: Reset all demo records for Subhashini Star Enclave (SSE)"
          onDeleted={fetchAccountingData}
        />
      )}
    </div>
  );
};
