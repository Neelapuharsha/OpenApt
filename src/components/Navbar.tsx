import React, { useState } from 'react';
import {
  Bell,
  ChevronDown,
  Sparkles,
  LogOut,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { UserRole } from '../types/index.js';

interface NavbarProps {
  onOpenClaimModal: () => void;
  onOpenQuestionnaire: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenClaimModal, onOpenQuestionnaire }) => {
  const { currentUser, logout, switchRole } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return { label: 'SUPER ADMIN (DEVELOPER)', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'PRESIDENT':
        return { label: 'PRESIDENT', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'SECRETARY':
        return { label: 'SECRETARY', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'TREASURER':
        return { label: 'TREASURER', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'RESIDENT':
        return { label: 'RESIDENT / TENANT', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
  };

  const handleSimulatePush = () => {
    const alerts = [
      '⚡ Bescom Power: DG backup operational for common water pumps.',
      '📢 Monthly Maintenance demand for October generated.',
      '💧 Overhead Water Tank Sanitization scheduled for Saturday 9 AM to 4 PM.',
      '🚗 Parking Reminder: Guest parking restricted to 4 hours in V-slots.'
    ];
    const picked = alerts[Math.floor(Math.random() * alerts.length)];
    setNotificationToast(picked);
    setTimeout(() => setNotificationToast(null), 4500);

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('OpenApt Property Notice', { body: picked, icon: '/pwa-192x192.png' });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  };

  const roleInfo = currentUser ? getRoleBadge(currentUser.role) : null;
  const initials = currentUser?.full_name
    ? currentUser.full_name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'HV';

  return (
    <>
      <header className="h-14 sm:h-16 bg-white border-b border-[#e5e7eb] px-4 sm:px-6 md:px-8 flex items-center justify-between sticky top-0 z-30">
        <div className="flex-1 min-w-0 mr-3">
          <h1 className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl font-bold text-[#1f2937] leading-tight truncate">
            OpenApt
          </h1>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-4 text-[13px] text-[#6b7280] shrink-0">
          <span className="hidden md:inline font-medium text-xs text-[#9ca3af]">October 2026</span>

          {/* Push notification test bell */}
          <button
            onClick={handleSimulatePush}
            title="Notification Alerts"
            className="p-1.5 sm:p-2 rounded-lg hover:bg-[#f5f6f8] text-[#6b7280] hover:text-[#1f2937] transition relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-600" />
          </button>

          {/* Quick claim flat button */}
          {(!currentUser || (currentUser.role === 'RESIDENT' && !currentUser.flat_id)) && (
            <button
              onClick={onOpenClaimModal}
              className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
            >
              Claim Flat
            </button>
          )}

          {/* Avatar Profile Pill */}
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-1.5 p-0.5 pl-1.5 rounded-full hover:bg-[#f5f6f8] border border-transparent hover:border-[#e5e7eb] transition cursor-pointer"
              >
                <div className="w-[32px] h-[32px] sm:w-[34px] sm:h-[34px] rounded-full bg-[#e5e7eb] flex items-center justify-center font-bold text-[#374151] text-xs">
                  {initials}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#6b7280]" />
              </button>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white border border-[#e5e7eb] shadow-xl p-3.5 z-50 text-xs">
                  <div className="pb-3 border-b border-[#f0f1f3]">
                    <div className="font-bold text-[#1f2937] text-sm">{currentUser.full_name}</div>
                    <div className="text-[#6b7280] text-[11px] mt-0.5 font-mono">
                      {currentUser.email || currentUser.phone}
                    </div>
                    {roleInfo && (
                      <div className="mt-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${roleInfo.color}`}>
                          {roleInfo.label}
                        </span>
                      </div>
                    )}
                  </div>

                  {currentUser.role === 'RESIDENT' && (
                    <div className="py-2 border-b border-[#f0f1f3]">
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          onOpenQuestionnaire();
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[#f5f6f8] text-[#1f2937] flex items-center gap-2 font-medium"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span>1-2-3 Resident Questionnaire</span>
                      </button>
                    </div>
                  )}

                  <div className="py-2.5 border-b border-[#f0f1f3] space-y-1">
                    <div className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider px-2">
                      Switch Persona (Testing)
                    </div>
                    {[
                      { role: 'SUPER_ADMIN', name: 'Harsha Vardhan Neelapu (Developer)' },
                      { role: 'PRESIDENT', name: 'President (Ramesh Sharma)' },
                      { role: 'SECRETARY', name: 'Secretary (Suresh Reddy)' },
                      { role: 'TREASURER', name: 'Treasurer (Anand Kulkarni)' },
                      { role: 'RESIDENT', name: 'Resident (Test Resident • Unclaimed)' },
                    ].map(persona => (
                      <button
                        key={persona.role}
                        onClick={() => {
                          switchRole(persona.role as any);
                          setIsProfileOpen(false);
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between text-xs transition ${
                          currentUser.role === persona.role
                            ? 'bg-blue-50 text-blue-700 font-semibold'
                            : 'text-[#4b5563] hover:bg-[#f5f6f8]'
                        }`}
                      >
                        <span>{persona.name}</span>
                        {currentUser.role === persona.role && <Check className="w-3.5 h-3.5 text-blue-600" />}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => {
                        logout();
                        setIsProfileOpen(false);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-red-50 text-red-600 flex items-center gap-2 font-medium transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenClaimModal}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition"
            >
              Log In
            </button>
          )}
        </div>
      </header>

      {/* Push simulation alert toast */}
      {notificationToast && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm rounded-xl bg-white border border-[#e5e7eb] shadow-xl p-4 text-[#1f2937] animate-in slide-in-from-top-2">
          <div className="flex items-start gap-2.5">
            <Bell className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-bold text-blue-600 uppercase">Property Notice</div>
              <p className="text-xs text-[#374151] mt-0.5">{notificationToast}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
