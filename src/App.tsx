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
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Navbar } from './components/Navbar.js';
import { AccountingDashboard } from './components/AccountingDashboard.js';
import { MaintenancePage } from './components/MaintenancePage.js';
import { PaymentsPage } from './components/PaymentsPage.js';
import { ReportsPage } from './components/ReportsPage.js';
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
  const navigate = useNavigate();
  const location = useLocation();
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
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/maintenance', label: 'Maintenance & Dues', icon: Receipt },
    { path: '/residents', label: 'Residents & Flats', icon: Users },
    { path: '/payments', label: 'Payments & Receipts', icon: CreditCard },
    { path: '/expenses', label: 'Expenses & Requests', icon: TrendingDown },
    { path: '/reports', label: 'Financial Reports', icon: FileSpreadsheet },
    { path: '/notices', label: 'Bylaws & Notices', icon: Bell },
    { path: '/help', label: 'Help Zone', icon: HelpCircle },
    { path: '/audit', label: 'Audit Trail', icon: ShieldCheck },
  ];

  return (
    <div className="flex min-h-screen bg-[#f5f6f8] text-[#1f2937]">
      <aside className={`
        w-[230px] bg-white border-r border-[#e5e7eb] p-6 py-6 flex-shrink-0 flex flex-col justify-between
        ${isMobileMenuOpen ? 'fixed inset-y-0 left-0 z-50 shadow-2xl block' : 'hidden md:flex'}
      `}>
        <div>
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

          <nav className="space-y-0.5">
            {navItems.map(item => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
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

        <div className="pt-4 border-t border-[#f0f1f3] space-y-3 px-2">
          <PWAInstallButton />
          <div className="text-[11px] text-[#6b7280]">
            <div className="font-semibold text-[#1f2937]">Apartment Not Configured</div>
            <div className="font-mono text-[10px] text-[#9ca3af] mt-0.5">Please onboard society</div>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-emerald-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Firebase Cloud Active</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
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

        <Navbar
          onOpenClaimModal={() => setIsClaimModalOpen(true)}
          onOpenQuestionnaire={() => setIsQuestionnaireOpen(true)}
        />

        <main className="p-6 md:p-8 max-w-[1300px] w-full flex-1">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<AccountingDashboard />} />
            <Route path="/maintenance" element={<MaintenancePage />} />
            <Route path="/residents" element={<FlatsDirectory onOpenClaimModal={() => setIsClaimModalOpen(true)} />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/expenses" element={<ComplaintsHub />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/notices" element={<GovernanceHub />} />
            <Route path="/help" element={<HelpZone />} />
            <Route path="/audit" element={<AuditLogViewer />} />
          </Routes>
        </main>
      </div>

      <OfflineIndicator />

      <ResidentClaimModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        flats={flats}
        onClaimSuccess={() => {
          fetchFlats();
        }}
      />

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
