import React, { useState, useEffect } from 'react';
import { BookOpen, Bell, Calendar, Plus, Trash2, Pin, Lock, Clock, MapPin } from 'lucide-react';
import { Bylaw, SocietyNotice, MeetingSchedule } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';
import { DeveloperDeleteModal } from './DeveloperDeleteModal.js';

export const GovernanceHub: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'BYLAWS' | 'NOTICES' | 'MEETINGS'>('BYLAWS');

  const [bylaws, setBylaws] = useState<Bylaw[]>([]);
  const [notices, setNotices] = useState<SocietyNotice[]>([]);
  const [meetings, setMeetings] = useState<MeetingSchedule[]>([]);

  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticeAudience, setNoticeAudience] = useState<'ALL' | 'OWNERS' | 'TENANTS'>('ALL');
  const [noticePinned, setNoticePinned] = useState(false);

  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [meetingType, setMeetingType] = useState<'AGM' | 'EGM' | 'COMMITTEE' | 'MONTHLY'>('MONTHLY');
  const [meetingDate, setMeetingDate] = useState('2026-10-25 10:30');
  const [meetingAgenda, setMeetingAgenda] = useState('');
  const [meetingVenue, setMeetingVenue] = useState('Society Clubhouse');

  const [deleteTarget, setDeleteTarget] = useState<{ type: 'BYLAW' | 'NOTICE' | 'MEETING'; id: number; title: string } | null>(null);

  const fetchData = async () => {
    try {
      const [byRes, notRes, meetRes] = await Promise.all([
        fetch('/api/governance/bylaws').then(r => r.json()),
        fetch('/api/governance/notices').then(r => r.json()),
        fetch('/api/governance/meetings').then(r => r.json()),
      ]);
      setBylaws(byRes);
      setNotices(notRes);
      setMeetings(meetRes);
    } catch (err) {
      console.error('Failed to load governance data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeContent.trim()) return;

    try {
      const res = await fetch('/api/governance/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: noticeTitle.trim(),
          content: noticeContent.trim(),
          target_audience: noticeAudience,
          is_pinned: noticePinned,
          published_by: currentUser?.full_name || 'Management Committee',
        }),
      });
      if (res.ok) {
        setIsNoticeModalOpen(false);
        setNoticeTitle('');
        setNoticeContent('');
        fetchData();
      }
    } catch (err) {
      console.error('Failed to publish notice:', err);
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingAgenda.trim()) return;

    try {
      const res = await fetch('/api/governance/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meeting_type: meetingType,
          meeting_date: meetingDate,
          agenda: meetingAgenda.trim(),
          venue: meetingVenue.trim(),
        }),
      });
      if (res.ok) {
        setIsMeetingModalOpen(false);
        setMeetingAgenda('');
        fetchData();
      }
    } catch (err) {
      console.error('Failed to schedule meeting:', err);
    }
  };

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isAdmin = ['SUPER_ADMIN', 'PRESIDENT', 'SECRETARY'].includes(currentUser?.role || '');

  return (
    <div className="space-y-4">
      {/* Banner */}
      <div className="p-4 bg-white border border-[#e5e7eb] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[#1f2937]">Society Governance, Notices & AGMs</h3>
          <p className="text-xs text-[#6b7280]">
            Bylaws, circulars, general body meeting schedules, and resolutions.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            {activeTab === 'NOTICES' && (
              <button
                onClick={() => setIsNoticeModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Publish Circular
              </button>
            )}
            {activeTab === 'MEETINGS' && (
              <button
                onClick={() => setIsMeetingModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Schedule Meeting
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#e5e7eb] gap-1 text-[13px] font-semibold">
        <button
          onClick={() => setActiveTab('BYLAWS')}
          className={`py-2 px-3.5 transition cursor-pointer ${
            activeTab === 'BYLAWS' ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-[#6b7280]'
          }`}
        >
          Apartment Bylaws ({bylaws.length})
        </button>
        <button
          onClick={() => setActiveTab('NOTICES')}
          className={`py-2 px-3.5 transition cursor-pointer ${
            activeTab === 'NOTICES' ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-[#6b7280]'
          }`}
        >
          Circulars & Notices ({notices.length})
        </button>
        <button
          onClick={() => setActiveTab('MEETINGS')}
          className={`py-2 px-3.5 transition cursor-pointer ${
            activeTab === 'MEETINGS' ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-[#6b7280]'
          }`}
        >
          AGM Meetings ({meetings.length})
        </button>
      </div>

      {/* Tab 1: Bylaws */}
      {activeTab === 'BYLAWS' && (
        <div className="space-y-3">
          {bylaws.map(b => (
            <div key={b.id} className="p-4 rounded-lg bg-white border border-[#e5e7eb] shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-[#f0f1f3]">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f5f6f8] text-[#4b5563] uppercase">
                    {b.category}
                  </span>
                  <h4 className="text-sm font-bold text-[#1f2937]">{b.title}</h4>
                </div>
                {isSuperAdmin ? (
                  <button
                    onClick={() => setDeleteTarget({ type: 'BYLAW', id: b.id, title: b.title })}
                    className="p-1 rounded text-[#9ca3af] hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span title="Locked" className="text-[#d1d5db] p-1"><Lock className="w-3 h-3" /></span>
                )}
              </div>
              <p className="text-xs text-[#4b5563] mt-2 leading-relaxed whitespace-pre-line">{b.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Notices */}
      {activeTab === 'NOTICES' && (
        <div className="space-y-3">
          {notices.map(n => (
            <div key={n.id} className={`p-4 rounded-lg bg-white border ${n.is_pinned ? 'border-blue-300' : 'border-[#e5e7eb]'} shadow-sm`}>
              <div className="flex items-center justify-between pb-2 border-b border-[#f0f1f3]">
                <div className="flex items-center gap-2">
                  {n.is_pinned && <Pin className="w-3.5 h-3.5 text-blue-600 fill-blue-600 shrink-0" />}
                  <h4 className="text-sm font-bold text-[#1f2937]">{n.title}</h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#f5f6f8] text-[#4b5563]">
                    Target: {n.target_audience}
                  </span>
                </div>
                {isSuperAdmin && (
                  <button
                    onClick={() => setDeleteTarget({ type: 'NOTICE', id: n.id, title: n.title })}
                    className="p-1 rounded text-[#9ca3af] hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-xs text-[#4b5563] mt-2 leading-relaxed">{n.content}</p>
              <div className="text-[11px] text-[#6b7280] mt-2 font-mono flex items-center justify-between">
                <span>By: {n.published_by}</span>
                <span>{n.published_at}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Meetings */}
      {activeTab === 'MEETINGS' && (
        <div className="space-y-3">
          {meetings.map(m => (
            <div key={m.id} className="p-4 rounded-lg bg-white border border-[#e5e7eb] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                    {m.meeting_type}
                  </span>
                  <span className="text-xs font-semibold text-[#1f2937] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#6b7280]" />
                    {m.meeting_date}
                  </span>
                  <span className="text-xs text-[#6b7280] flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#9ca3af]" />
                    {m.venue}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-[#1f2937] mt-1.5">Agenda</h4>
                <p className="text-xs text-[#4b5563] mt-0.5">{m.agenda}</p>
                {m.minutes_url_or_text && (
                  <div className="text-xs text-blue-800 mt-2 p-2 rounded bg-blue-50 border border-blue-100">
                    <strong>Minutes:</strong> {m.minutes_url_or_text}
                  </div>
                )}
              </div>

              {isSuperAdmin && (
                <button
                  onClick={() => setDeleteTarget({ type: 'MEETING', id: m.id, title: m.meeting_type })}
                  className="p-1 rounded text-[#9ca3af] hover:text-red-600 self-start sm:self-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Publish Notice Modal */}
      {isNoticeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-xl bg-white border border-[#e5e7eb] p-6 shadow-2xl text-[#1f2937]">
            <h3 className="text-base font-bold text-[#1f2937] mb-2">Publish Notice</h3>
            <form onSubmit={handleCreateNotice} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#374151] mb-1 font-semibold">Title</label>
                <input
                  type="text"
                  required
                  value={noticeTitle}
                  onChange={e => setNoticeTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#374151] mb-1 font-semibold">Audience</label>
                  <select
                    value={noticeAudience}
                    onChange={e => setNoticeAudience(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937]"
                  >
                    <option value="ALL">All Residents</option>
                    <option value="OWNERS">Owners Only</option>
                    <option value="TENANTS">Tenants Only</option>
                  </select>
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-[#374151]">
                    <input
                      type="checkbox"
                      checked={noticePinned}
                      onChange={e => setNoticePinned(e.target.checked)}
                      className="rounded border-[#d1d5db] text-blue-600"
                    />
                    <span>Pin to Top</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-[#374151] mb-1 font-semibold">Content</label>
                <textarea
                  rows={4}
                  required
                  value={noticeContent}
                  onChange={e => setNoticeContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937] resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNoticeModalOpen(false)}
                  className="w-1/3 py-2 rounded-lg bg-[#f5f6f8] text-[#4b5563] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Meeting Modal */}
      {isMeetingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-xl bg-white border border-[#e5e7eb] p-6 shadow-2xl text-[#1f2937]">
            <h3 className="text-base font-bold text-[#1f2937] mb-2">Schedule Meeting</h3>
            <form onSubmit={handleCreateMeeting} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#374151] mb-1 font-semibold">Type</label>
                  <select
                    value={meetingType}
                    onChange={e => setMeetingType(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937]"
                  >
                    <option value="AGM">Annual General Meeting (AGM)</option>
                    <option value="EGM">Extraordinary General Meeting (EGM)</option>
                    <option value="COMMITTEE">Managing Committee</option>
                    <option value="MONTHLY">Monthly Society Review</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#374151] mb-1 font-semibold">Date & Time</label>
                  <input
                    type="text"
                    required
                    value={meetingDate}
                    onChange={e => setMeetingDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937] font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[#374151] mb-1 font-semibold">Venue</label>
                <input
                  type="text"
                  required
                  value={meetingVenue}
                  onChange={e => setMeetingVenue(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937]"
                />
              </div>
              <div>
                <label className="block text-[#374151] mb-1 font-semibold">Agenda</label>
                <textarea
                  rows={3}
                  required
                  value={meetingAgenda}
                  onChange={e => setMeetingAgenda(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937] resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMeetingModalOpen(false)}
                  className="w-1/3 py-2 rounded-lg bg-[#f5f6f8] text-[#4b5563] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <DeveloperDeleteModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          entityType={deleteTarget.type}
          entityId={deleteTarget.id}
          entityDescription={`${deleteTarget.type}: ${deleteTarget.title}`}
          onDeleted={fetchData}
        />
      )}
    </div>
  );
};
