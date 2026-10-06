import React, { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, Trash2 } from 'lucide-react';
import { AuditLog } from '../types/index.js';

export const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/audit-logs');
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.actor_email && log.actor_email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-4">
      {/* Banner */}
      <div className="p-4 bg-white border border-[#e5e7eb] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[#1f2937]">Immutable Audit Trail</h3>
          <p className="text-xs text-[#6b7280]">
            Developer deletion log and system modifications. Deletions strictly require logged reason.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={isLoading}
          className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e5e7eb] bg-white hover:bg-[#f5f6f8] text-xs font-semibold text-[#374151] transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#9ca3af]" />
          <input
            type="text"
            placeholder="Search actor, entity, reason, or email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937] placeholder-[#9ca3af] focus:outline-none focus:border-blue-600 transition"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937] focus:outline-none focus:border-blue-600 transition"
          >
            <option value="ALL">All Actions</option>
            <option value="DELETE">Deletions Only (Developer)</option>
            <option value="CLAIM">Flat Claims</option>
            <option value="UPDATE">Updates</option>
            <option value="CREATE">Creates</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[#e5e7eb] bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#e5e7eb] bg-[#f9fafb] text-[#6b7280] font-semibold uppercase text-[10px]">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Audit Justification / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f1f3] text-[#374151]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#9ca3af] italic">
                    No matching audit entries found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const isDelete = log.action === 'DELETE';
                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-[#f9fafb] ${isDelete ? 'bg-[#fef2f2]/40' : ''}`}
                    >
                      <td className="py-3 px-4 font-mono text-[11px] text-[#6b7280] whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#1f2937]">{log.user_name}</div>
                        <div className="text-[11px] text-[#6b7280] font-mono">{log.actor_email || log.user_role}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isDelete
                              ? 'badge-overdue'
                              : log.action === 'CLAIM'
                              ? 'badge-pending'
                              : 'badge-paid'
                          }`}
                        >
                          {isDelete && <Trash2 className="w-2.5 h-2.5" />}
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-blue-600 whitespace-nowrap">
                        {log.entity_type} #{log.entity_id}
                      </td>
                      <td className="py-3 px-4 min-w-[320px]">
                        <p className={`text-xs ${isDelete ? 'text-[#b42318] font-semibold' : 'text-[#374151]'}`}>
                          {log.reason}
                        </p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
