import React, { useState } from 'react';
import { ShieldAlert, Trash2, X, Lock, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

interface DeveloperDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'FLAT' | 'RESIDENT' | 'COMPLAINT' | 'NOTICE' | 'BYLAW' | 'MEETING' | 'DEMO_DATA_RESET';
  entityId: string | number;
  entityDescription: string;
  onDeleted: () => void;
}

export const DeveloperDeleteModal: React.FC<DeveloperDeleteModalProps> = ({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityDescription,
  onDeleted,
}) => {
  const { currentUser } = useAuth();
  const [reason, setReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isSuperAdmin =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.email === 'neelapuharsha@gmail.com' ||
    currentUser?.email === 'neelapuharsha@gmail.com';

  const developerEmail = 'neelapuharsha@gmail.com';

  const handleDelete = async () => {
    setError(null);
    if (!reason || reason.trim().length < 5) {
      setError('A mandatory reason (minimum 5 characters) is required for audit trail compliance.');
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch('/api/admin/developer-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actor: {
            id: currentUser?.id || 1,
            username: 'developer',
            full_name: 'Harsha Vardhan Neelapu (Developer / Super Admin)',
            role: 'SUPER_ADMIN',
            email: 'neelapuharsha@gmail.com',
          },
          entity_type: entityType,
          entity_id: entityId,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete record');
      }

      onDeleted();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Deletion error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-xl bg-white border border-[#e5e7eb] p-6 shadow-2xl text-[#1f2937]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e5e7eb]">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1f2937]">Developer Deletion Safeguard</h3>
              <p className="text-xs text-[#6b7280]">Restricted Super Admin Action</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#6b7280] hover:text-[#1f2937] hover:bg-[#f5f6f8]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isSuperAdmin ? (
          <div className="mt-4 space-y-4">
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 space-y-1.5">
              <div className="flex items-center gap-2 font-bold uppercase text-red-800">
                <Lock className="w-4 h-4" />
                Access Restricted: Role Denied
              </div>
              <p className="leading-relaxed">
                Data deletion is strictly restricted to the <strong>Developer / Super Admin</strong> (<code>neelapuharsha@gmail.com</code> - Harsha Vardhan Neelapu). 
                Society Admins and Residents cannot delete records under OpenApt GAAP compliance guidelines.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-lg bg-[#f5f6f8] hover:bg-[#e5e7eb] text-xs font-semibold text-[#374151] transition"
            >
              Dismiss
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3.5">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="p-3 bg-[#f5f6f8] rounded-lg border border-[#e5e7eb] text-xs text-[#4b5563]">
              <div className="text-[#6b7280] text-[11px] uppercase font-semibold mb-0.5">Target Entity</div>
              <div className="font-semibold text-[#1f2937]">{entityDescription}</div>
              <div className="text-[11px] text-[#6b7280] mt-0.5">Type: <span className="font-mono text-blue-600">{entityType}</span> | ID: <span className="font-mono text-blue-600">#{entityId}</span></div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <span className="font-bold">Immutable Audit Trail:</span>
              <p className="mt-0.5 text-amber-900/90 text-[11px]">
                This deletion will be logged with your developer identity (<code className="font-semibold">{developerEmail}</code>), timestamp, and the mandatory reason below.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">
                Reason for Deletion <span className="text-red-500 font-bold">* MANDATORY</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="State explicit justification (minimum 5 characters)..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937] focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-2 rounded-lg bg-[#f5f6f8] hover:bg-[#e5e7eb] text-xs font-semibold text-[#4b5563] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting || reason.trim().length < 5}
                className="w-2/3 flex items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 py-2 text-xs font-semibold text-white shadow-sm transition disabled:opacity-50"
              >
                {isDeleting ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Authorize Deletion</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
