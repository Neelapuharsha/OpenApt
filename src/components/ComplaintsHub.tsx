import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Lock, Receipt, CheckCircle, Clock } from 'lucide-react';
import { Complaint, ReimbursementClaim, Flat } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';
import { DeveloperDeleteModal } from './DeveloperDeleteModal.js';

export const ComplaintsHub: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'REQUESTS' | 'EXPENSE_CLAIMS'>('REQUESTS');
  
  // Complaints states
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'APARTMENT_ISSUE' | 'APP_FEEDBACK'>('ALL');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Complaint | null>(null);

  const [type, setType] = useState<'APARTMENT_ISSUE' | 'APP_FEEDBACK' | 'IMPROVEMENT_IDEA'>('APARTMENT_ISSUE');
  const [category, setCategory] = useState('Plumbing');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'URGENT'>('MEDIUM');

  // Expense claims states
  const [reimbursements, setReimbursements] = useState<ReimbursementClaim[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimFlatId, setClaimFlatId] = useState<number | ''>('');
  const [claimName, setClaimName] = useState<string>('');
  const [claimDesc, setClaimDesc] = useState<string>('');
  const [claimAmount, setClaimAmount] = useState<number>(1500);
  const [claimAccount, setClaimAccount] = useState<string>('5070');

  const fetchComplaints = async () => {
    try {
      const res = await fetch('/api/complaints');
      const data = await res.json();
      setComplaints(data);
    } catch (err) {
      console.error('Failed to load complaints:', err);
    }
  };

  const fetchReimbursements = async () => {
    try {
      const [clmRes, flRes] = await Promise.all([
        fetch('/api/accounting/reimbursements').then(r => r.json()),
        fetch('/api/flats').then(r => r.json()),
      ]);
      setReimbursements(clmRes);
      setFlats(flRes);
    } catch (err) {
      console.error('Failed to load reimbursements:', err);
    }
  };

  useEffect(() => {
    fetchComplaints();
    fetchReimbursements();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          flat_id: currentUser?.flat_id || null,
          submitted_by_name: currentUser?.full_name || 'Resident',
          submitted_by_phone: currentUser?.phone || '',
          category,
          title: title.trim(),
          description: description.trim(),
          priority,
        }),
      });

      if (res.ok) {
        setIsSubmitModalOpen(false);
        setTitle('');
        setDescription('');
        fetchComplaints();
      }
    } catch (err) {
      console.error('Failed to submit ticket:', err);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/complaints/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, actor: currentUser }),
      });
      if (res.ok) fetchComplaints();
    } catch (err) {
      console.error('Failed to update ticket status:', err);
    }
  };

  const handleFileClaim = async (e: React.FormEvent) => {
    e.preventDefault();
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
        fetchReimbursements();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDisburseClaim = async (claimId: number) => {
    if (!confirm('Disburse repayment to resident? This records bank credit and clears the Reimbursement Payable.')) return;
    try {
      const res = await fetch(`/api/accounting/reimbursements/${claimId}/disburse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_ref: `IMPS/${Date.now().toString().slice(-6)}`,
          actor: currentUser,
        }),
      });
      if (res.ok) fetchReimbursements();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isAdmin = ['SUPER_ADMIN', 'PRESIDENT', 'SECRETARY'].includes(currentUser?.role || '');
  const isTreasurerOrAdmin = ['SUPER_ADMIN', 'PRESIDENT', 'SECRETARY', 'TREASURER'].includes(currentUser?.role || '');

  const filtered = complaints.filter(c => {
    if (activeFilter === 'ALL') return true;
    return c.type === activeFilter;
  });

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="p-4 bg-white border border-[#e5e7eb] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-[#1f2937]">Expenses & Resident Requests</h3>
          <p className="text-xs text-[#6b7280]">
            Log apartment maintenance requests, plumbing, lift tickets, or claim out-of-pocket society repair reimbursements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'REQUESTS' ? (
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Request</span>
            </button>
          ) : (
            <button
              onClick={() => setIsClaimModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Submit Expense Claim</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs: Requests vs Out-of-pocket Expenses */}
      <div className="flex border-b border-[#e5e7eb] text-xs font-semibold">
        <button
          onClick={() => setActiveTab('REQUESTS')}
          className={`py-2 px-4 border-b-2 transition cursor-pointer ${
            activeTab === 'REQUESTS'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-[#6b7280] hover:text-[#1f2937]'
          }`}
        >
          Resident Maintenance Requests ({complaints.length})
        </button>
        <button
          onClick={() => setActiveTab('EXPENSE_CLAIMS')}
          className={`py-2 px-4 border-b-2 transition cursor-pointer ${
            activeTab === 'EXPENSE_CLAIMS'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-[#6b7280] hover:text-[#1f2937]'
          }`}
        >
          Expense Claims & Reimbursements ({reimbursements.length})
        </button>
      </div>

      {/* TAB 1: RESIDENT REQUESTS */}
      {activeTab === 'REQUESTS' && (
        <div className="space-y-3">
          {/* Filter Sub-Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeFilter === 'ALL'
                  ? 'bg-white border border-[#e5e7eb] text-blue-600 shadow-xs'
                  : 'text-[#6b7280] hover:text-[#1f2937]'
              }`}
            >
              All Requests ({complaints.length})
            </button>
            <button
              onClick={() => setActiveFilter('APARTMENT_ISSUE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeFilter === 'APARTMENT_ISSUE'
                  ? 'bg-white border border-[#e5e7eb] text-blue-600 shadow-xs'
                  : 'text-[#6b7280] hover:text-[#1f2937]'
              }`}
            >
              Apartment Maintenance
            </button>
            <button
              onClick={() => setActiveFilter('APP_FEEDBACK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeFilter === 'APP_FEEDBACK'
                  ? 'bg-white border border-[#e5e7eb] text-blue-600 shadow-xs'
                  : 'text-[#6b7280] hover:text-[#1f2937]'
              }`}
            >
              App Feedback & Ideas
            </button>
          </div>

          {/* Tickets List */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="p-8 text-center bg-white border border-[#e5e7eb] rounded-lg text-xs text-[#9ca3af]">
                No maintenance requests reported yet. Click "New Request" to log a ticket.
              </div>
            ) : (
              filtered.map(item => {
                const isResolved = item.status === 'RESOLVED' || item.status === 'CLOSED';
                const isUrgent = item.priority === 'URGENT';

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-lg bg-white border border-[#e5e7eb] hover:border-[#cbd5e1] transition shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-600">{item.ticket_no}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#f5f6f8] text-[#4b5563]">
                          {item.category}
                        </span>
                        {item.flat_number && (
                          <span className="text-xs text-[#1f2937] font-semibold">· Flat {item.flat_number}</span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isUrgent ? 'badge-overdue' : 'bg-[#f5f6f8] text-[#6b7280]'
                          }`}
                        >
                          {item.priority}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isResolved
                              ? 'badge-paid'
                              : item.status === 'IN_PROGRESS'
                              ? 'bg-blue-50 text-blue-700'
                              : 'badge-pending'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <h4 className="text-[14px] font-bold text-[#1f2937] mt-1.5">{item.title}</h4>
                      <p className="text-xs text-[#4b5563] mt-0.5">{item.description}</p>
                      <div className="text-[11px] text-[#6b7280] mt-1 font-mono">
                        Reported by {item.submitted_by_name} · {item.created_at}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-center">
                      {isAdmin && (
                        <select
                          value={item.status}
                          onChange={e => handleUpdateStatus(item.id, e.target.value)}
                          className="px-2 py-1 text-xs rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937]"
                        >
                          <option value="OPEN">Open</option>
                          <option value="IN_PROGRESS">In-Progress</option>
                          <option value="RESOLVED">Resolved</option>
                          <option value="CLOSED">Closed</option>
                        </select>
                      )}

                      {isSuperAdmin ? (
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="p-1 rounded text-[#9ca3af] hover:text-red-600 transition"
                          title="Developer delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <span title="Deletions locked to Developer" className="text-[#d1d5db] p-1">
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: EXPENSE CLAIMS & REIMBURSEMENTS */}
      {activeTab === 'EXPENSE_CLAIMS' && (
        <div className="space-y-3">
          <div className="overflow-x-auto bg-white border border-[#e5e7eb] rounded-lg">
            <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-[#e5e7eb] bg-[#f9fafb] text-[#6b7280] font-semibold uppercase text-[11px]">
                  <th className="py-3 px-4">Claim ID</th>
                  <th className="py-3 px-4">Flat No</th>
                  <th className="py-3 px-4">Claimant Resident</th>
                  <th className="py-3 px-4">Description / Item</th>
                  <th className="py-3 px-4">Expense Account</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f1f3] text-[#374151]">
                {reimbursements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#9ca3af] italic">
                      No out-of-pocket society expense claims filed yet.
                    </td>
                  </tr>
                ) : (
                  reimbursements.map(c => (
                    <tr key={c.id} className="hover:bg-[#f9fafb]">
                      <td className="py-2.5 px-4 font-mono font-bold text-blue-600">CLM-{c.id}</td>
                      <td className="py-2.5 px-4 font-semibold text-[#1f2937]">Flat {c.flat_number}</td>
                      <td className="py-2.5 px-4">{c.claimant_name}</td>
                      <td className="py-2.5 px-4 max-w-xs">{c.description}</td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-[#6b7280]">{c.expense_account}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-[#1f2937]">
                        ₹{(c.amount_paise / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            c.status === 'DISBURSED'
                              ? 'badge-paid'
                              : c.status === 'APPROVED'
                              ? 'bg-blue-50 text-blue-700'
                              : 'badge-pending'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {c.status !== 'DISBURSED' && isTreasurerOrAdmin && (
                          <button
                            onClick={() => handleDisburseClaim(c.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded transition cursor-pointer"
                          >
                            Disburse IMPS
                          </button>
                        )}
                        {c.status === 'DISBURSED' && (
                          <span className="text-[11px] text-[#16803c] font-medium flex items-center justify-end gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Disbursed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: New Maintenance Ticket */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-xl bg-white border border-[#e5e7eb] p-6 shadow-2xl text-[#1f2937]">
            <h3 className="text-base font-bold text-[#1f2937] mb-2">New Maintenance Request</h3>
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#374151] mb-1 font-semibold">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setType('APARTMENT_ISSUE'); setCategory('Plumbing'); }}
                    className={`py-2 px-3 rounded-lg border font-semibold transition ${
                      type === 'APARTMENT_ISSUE'
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-[#e5e7eb] text-[#6b7280]'
                    }`}
                  >
                    Apartment Issue
                  </button>
                  <button
                    type="button"
                    onClick={() => { setType('APP_FEEDBACK'); setCategory('App Feedback'); }}
                    className={`py-2 px-3 rounded-lg border font-semibold transition ${
                      type === 'APP_FEEDBACK'
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-[#e5e7eb] text-[#6b7280]'
                    }`}
                  >
                    App Feedback
                  </button>
                </div>
              </div>

              {type === 'APARTMENT_ISSUE' && (
                <div>
                  <label className="block text-[#374151] mb-1 font-semibold">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937]"
                  >
                    <option value="Plumbing">Plumbing & Water Supply</option>
                    <option value="Electrical">Electrical & Lighting</option>
                    <option value="Elevator">Elevator / Lift Service</option>
                    <option value="Cleaning">Housekeeping & Garbage</option>
                    <option value="Security">Security & Gates</option>
                    <option value="Common Areas">Clubhouse & Parking</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[#374151] mb-1 font-semibold">Title</label>
                <input
                  type="text"
                  required
                  placeholder="Brief summary (e.g., Water tap leaking in Block B corridor)..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937]"
                />
              </div>

              <div>
                <label className="block text-[#374151] mb-1 font-semibold">Details / Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide details to help committee and technician resolve..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937] resize-none"
                />
              </div>

              <div>
                <label className="block text-[#374151] mb-1 font-semibold">Priority</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937]"
                >
                  <option value="LOW">Low - General inquiry</option>
                  <option value="MEDIUM">Medium - Normal repair</option>
                  <option value="URGENT">Urgent - Water / Lift / Power issue</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="w-1/2 py-2 rounded-lg bg-[#f5f6f8] text-[#4b5563] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Expense Claim */}
      {isClaimModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-xl bg-white border border-[#e5e7eb] p-6 shadow-2xl text-[#1f2937]">
            <h3 className="text-base font-bold text-[#1f2937] mb-2">Claim Society Expense Reimbursement</h3>
            <p className="text-xs text-[#6b7280] mb-3">
              Did you pay out-of-pocket for an emergency society expense? Submit your bill here for committee approval.
            </p>
            <form onSubmit={handleFileClaim} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#374151] mb-1 font-semibold">Flat</label>
                <select
                  value={claimFlatId}
                  onChange={e => setClaimFlatId(e.target.value ? Number(e.target.value) : '')}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937]"
                >
                  <option value="">Select Flat...</option>
                  {flats.map(f => (
                    <option key={f.id} value={f.id}>
                      Flat {f.flat_number} {f.resident_name ? `(${f.resident_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#374151] mb-1 font-semibold">Resident Name</label>
                <input
                  type="text"
                  placeholder="Your full name..."
                  value={claimName}
                  onChange={e => setClaimName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937]"
                />
              </div>

              <div>
                <label className="block text-[#374151] mb-1 font-semibold">Expense Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Emergency plumber pipe replacement Block C..."
                  value={claimDesc}
                  onChange={e => setClaimDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#374151] mb-1 font-semibold">Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={claimAmount}
                    onChange={e => setClaimAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937]"
                  />
                </div>
                <div>
                  <label className="block text-[#374151] mb-1 font-semibold">Expense Category</label>
                  <select
                    value={claimAccount}
                    onChange={e => setClaimAccount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937]"
                  >
                    <option value="5070">5070 - Repairs & Emergency</option>
                    <option value="5020">5020 - Housekeeping & Cleaning</option>
                    <option value="5040">5040 - Water Tanker</option>
                    <option value="5060">5060 - DG Fuel & Generator</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(false)}
                  className="w-1/2 py-2 rounded-lg bg-[#f5f6f8] text-[#4b5563] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
                >
                  Submit Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Developer Delete Modal */}
      {deleteTarget && (
        <DeveloperDeleteModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          entityType="COMPLAINT"
          entityId={deleteTarget.id}
          entityDescription={`Ticket #${deleteTarget.ticket_no}: ${deleteTarget.title}`}
          onDeleted={() => {
            fetchComplaints();
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
};
