import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Receipt,
  Users,
  CreditCard,
  TrendingDown,
  FileSpreadsheet,
  Bell,
  HelpCircle,
  ShieldCheck,
  Building,
  Menu,
  X
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Navbar } from './components/Navbar.js';
import { AccountingDashboard } from './components/AccountingDashboard.js';
import { FlatsDirectory } from './components/FlatsDirectory.js';
import { ComplaintsHub } from './components/ComplaintsHub.js';
import { GovernanceHub } from './components/GovernanceHub.js';
import { HelpZone } from './components/HelpZone.js';
import { AuditLogViewer } from './components/AuditLogViewer.js';
import { ResidentClaimModal } from './components/ResidentClaimModal.js';
import { OnboardingQuestionnaireModal } from './components/OnboardingQuestionnaireModal.js';
import { OfflineIndicator } from './components/OfflineIndicator.js';
import { PWAInstallButton } from './components/PWAInstallButton.js';
import { Flat } from './types/index.js';

type NavSection =
  | 'DASHBOARD'
  | 'MAINTENANCE'
  | 'RESIDENTS'
  | 'PAYMENTS'
  | 'EXPENSES'
  | 'REPORTS'
  | 'NOTICES'
  | 'HELP_ZONE'
  | 'AUDIT_LOG';

function MainApp() {
  const { currentUser, needsQuestionnaire } = useAuth();
  const [activeSection, setActiveSection] = useState<NavSection>('DASHBOARD');
  const [flats, setFlats] = useState<Flat[]>([]);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isQuestionnaireOpen, setIsQuestionnaireOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const fetchFlats = async () => {
    try {
      const headers: Record<string, string> = {};
      const token = currentUser?.token || localStorage.getItem('openapt_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/flats', { headers });
      const data = await res.json();
      setFlats(data);
    } catch (err) {
      console.error('Failed to load flats:', err);
    }
  };

  useEffect(() => {
    fetchFlats();
  }, [currentUser]);

  useEffect(() => {
    if (needsQuestionnaire) {
      setIsQuestionnaireOpen(true);
    }
  }, [needsQuestionnaire]);

  const navItems = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'MAINTENANCE', label: 'Maintenance & Dues', icon: Receipt },
    { id: 'RESIDENTS', label: 'Residents & Flats', icon: Users },
    { id: 'PAYMENTS', label: 'Payments & Receipts', icon: CreditCard },
    { id: 'EXPENSES', label: 'Expenses & Requests', icon: TrendingDown },
    { id: 'REPORTS', label: 'Financial Reports', icon: FileSpreadsheet },
    { id: 'NOTICES', label: 'Bylaws & Notices', icon: Bell },
    { id: 'HELP_ZONE', label: 'Help Zone', icon: HelpCircle },
    { id: 'AUDIT_LOG', label: 'Audit Trail', icon: ShieldCheck },
  ];

  const getSectionTitle = () => {
    switch (activeSection) {
      case 'DASHBOARD': return 'Maintenance Dashboard';
      case 'MAINTENANCE': return 'Maintenance Demand & Collections';
      case 'RESIDENTS': return 'Flats & Residents Directory';
      case 'PAYMENTS': return 'Payment Receipts Register';
      case 'EXPENSES': return 'Expenses & Resident Requests';
      case 'REPORTS': return 'Financial Statements & Reports';
      case 'NOTICES': return 'Governance & Society Notices';
      case 'HELP_ZONE': return 'Help Zone & Guides';
      case 'AUDIT_LOG': return 'Developer Audit Trail';
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f5f6f8] text-[#1f2937]">
      {/* Sidebar matching user uploaded aside */}
      <aside className={`
        w-[230px] bg-white border-r border-[#e5e7eb] p-6 py-6 flex-shrink-0 flex flex-col justify-between
        ${isMobileMenuOpen ? 'fixed inset-y-0 left-0 z-50 shadow-2xl block' : 'hidden md:flex'}
      `}>
        <div>
          {/* Brand */}
          <div className="flex items-center justify-between pb-6 px-2">
            <div className="text-[19px] font-bold text-[#1f2937]">
              Open<span className="text-blue-600">Apt</span>
            </div>
            {isMobileMenuOpen && (
              <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-[#6b7280]">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Navigation Buttons */}
          <nav className="space-y-0.5">
            {navItems.map(item => {
              const isActive = activeSection === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id as any);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`
                    w-full border-0 text-left px-3 py-2.5 rounded-[7px] text-[14px] flex items-center gap-2.5 transition cursor-pointer
                    ${isActive
                      ? 'bg-[#eff6ff] text-blue-600 font-semibold'
                      : 'text-[#4b5563] hover:bg-[#f9fafb] hover:text-[#1f2937]'}
                  `}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-[#6b7280]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Install & Footer */}
        <div className="pt-4 border-t border-[#f0f1f3] space-y-3 px-2">
          <PWAInstallButton />
          <div className="text-[11px] text-[#6b7280]">
            <div className="font-semibold text-[#1f2937]">Subhashini Star Enclave</div>
            <div className="font-mono text-[10px] text-[#9ca3af] mt-0.5">SSE · GAAP Engine Active</div>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-emerald-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Firebase Cloud Active</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Header Bar Toggle */}
        <div className="md:hidden bg-white border-b border-[#e5e7eb] px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1 rounded text-[#4b5563]"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="font-bold text-[17px]">
            Open<span className="text-blue-600">Apt</span>
          </div>
          <div className="w-6" />
        </div>

        {/* Top Header */}
        <Navbar
          currentSectionTitle={getSectionTitle()}
          onOpenClaimModal={() => setIsClaimModalOpen(true)}
          onOpenQuestionnaire={() => setIsQuestionnaireOpen(true)}
        />

        {/* Main Content Container */}
        <main className="p-6 md:p-8 max-w-[1300px] w-full flex-1">
          {activeSection === 'DASHBOARD' && <AccountingDashboard />}
          {activeSection === 'MAINTENANCE' && <AccountingDashboard />}
          {activeSection === 'RESIDENTS' && (
            <FlatsDirectory onOpenClaimModal={() => setIsClaimModalOpen(true)} />
          )}
          {activeSection === 'PAYMENTS' && <AccountingDashboard />}
          {activeSection === 'EXPENSES' && <ComplaintsHub />}
          {activeSection === 'REPORTS' && <AccountingDashboard />}
          {activeSection === 'NOTICES' && <GovernanceHub />}
          {activeSection === 'HELP_ZONE' && <HelpZone />}
          {activeSection === 'AUDIT_LOG' && <AuditLogViewer />}
        </main>
      </div>

      {/* Offline Toast */}
      <OfflineIndicator />

      {/* Resident Claim Modal */}
      <ResidentClaimModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        flats={flats}
        onClaimSuccess={() => {
          fetchFlats();
        }}
      />

      {/* 1-2-3 Questionnaire Modal */}
      <OnboardingQuestionnaireModal
        isOpen={isQuestionnaireOpen}
        onClose={() => setIsQuestionnaireOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
