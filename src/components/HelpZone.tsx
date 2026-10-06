import React, { useState, useEffect } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Camera, KeyRound, Calculator, Landmark, Search, CheckCircle2 } from 'lucide-react';
import { HelpGuide } from '../types/index.js';

export const HelpZone: React.FC = () => {
  const [guides, setGuides] = useState<HelpGuide[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>('cctv-camera-access');

  useEffect(() => {
    fetch('/api/help-zone/guides')
      .then(res => res.json())
      .then(data => setGuides(data))
      .catch(err => console.error('Failed to load help guides:', err));
  }, []);

  const getGuideIcon = (id: string) => {
    switch (id) {
      case 'cctv-camera-access': return <Camera className="w-4 h-4 text-blue-600" />;
      case 'ownership-tenant-transfer': return <KeyRound className="w-4 h-4 text-blue-600" />;
      case 'maintenance-calculation': return <Calculator className="w-4 h-4 text-blue-600" />;
      case 'banking-upi-verification': return <Landmark className="w-4 h-4 text-blue-600" />;
      default: return <HelpCircle className="w-4 h-4 text-blue-600" />;
    }
  };

  const filteredGuides = guides.filter(g =>
    g.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.badge.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="p-4 bg-white border border-[#e5e7eb] rounded-lg">
        <h3 className="text-sm font-bold text-[#1f2937]">Help Zone & Community SOPs</h3>
        <p className="text-xs text-[#6b7280]">
          Standard operating procedures for cameras, move-out & ownership transfers, fee calculations, and banking.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#9ca3af]" />
        <input
          type="text"
          placeholder="Search guides, camera rules, or banking..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937] placeholder-[#9ca3af] focus:outline-none focus:border-blue-600 transition"
        />
      </div>

      {/* Guides List */}
      <div className="space-y-3">
        {filteredGuides.map(guide => {
          const isExpanded = expandedId === guide.id;
          return (
            <div
              key={guide.id}
              className="rounded-lg border border-[#e5e7eb] bg-white overflow-hidden shadow-sm"
            >
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : guide.id)}
                className="w-full p-4 text-left flex items-center justify-between hover:bg-[#f9fafb] transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#f5f6f8] shrink-0">
                    {getGuideIcon(guide.id)}
                  </div>
                  <div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#f5f6f8] text-[#4b5563]">
                      {guide.badge}
                    </span>
                    <h4 className="text-[14px] font-bold text-[#1f2937] mt-1">{guide.title}</h4>
                    <p className="text-xs text-[#6b7280] mt-0.5">{guide.summary}</p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-[#6b7280] shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#6b7280] shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="px-5 pb-4 pt-1 border-t border-[#f0f1f3] bg-[#fcfcfd] space-y-2">
                  <div className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider mb-1">
                    Standard Checklist:
                  </div>
                  <ol className="space-y-1.5 text-xs text-[#374151]">
                    {guide.steps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2 p-1.5 rounded bg-white border border-[#f0f1f3]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#16803c] shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
