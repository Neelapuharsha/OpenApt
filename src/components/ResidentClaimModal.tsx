import React, { useState, useEffect } from 'react';
import { Home, Phone, Lock, AlertCircle, ShieldCheck, X, Check, ArrowRight } from 'lucide-react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase.js';
import { Flat } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';

interface ResidentClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  flats: Flat[];
  onClaimSuccess: () => void;
}

export const ResidentClaimModal: React.FC<ResidentClaimModalProps> = ({
  isOpen,
  onClose,
  flats,
  onClaimSuccess,
}) => {
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [selectedFlatId, setSelectedFlatId] = useState<number | ''>('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [occupancyType, setOccupancyType] = useState<'OWNER' | 'TENANT'>('OWNER');
  
  const [step, setStep] = useState<'DETAILS' | 'CONFIRM_CLAIM'>('DETAILS');
  const [lookupData, setLookupData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setStep('DETAILS');
      setLookupData(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!phone || phone.trim().length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!selectedFlatId) {
      setError('Please select your flat number.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/lookup-flat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flat_id: selectedFlatId, phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to lookup flat');

      setLookupData(data);
      if (data.resident && data.resident.name) {
        setFullName(data.resident.name);
      }
      if (data.resident && data.resident.occupancy_type) {
        setOccupancyType(data.resident.occupancy_type);
      }

      setStep('CONFIRM_CLAIM');
    } catch (err: any) {
      setError(err.message || 'Lookup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    setError(null);
    if (!password || password.length < 4) {
      setError('Please set a secure password (at least 4 characters).');
      return;
    }

    setIsLoading(true);
    try {
      const isClaim = !lookupData?.isClaimed;
      const res = await fetch('/api/auth/claim-and-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flat_id: selectedFlatId,
          phone: phone.trim(),
          password,
          is_claim_action: isClaim,
          full_name: fullName,
          occupancy_type: occupancyType,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Claim / Login failed');

      login(data.user, data.resident, data.needsQuestionnaire);
      onClaimSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email?.toLowerCase();

      // Check if developer
      if (email === 'neelapuharsha@gmail.com' || email === 'mirthipativijaya264@gmail.com') {
        login({
          username: 'developer',
          email: 'neelapuharsha@gmail.com',
          full_name: 'Harsha Vardhan Neelapu (Developer / Super Admin)',
          role: 'SUPER_ADMIN',
          phone: '9876500000',
          token: 'dev-token-superadmin'
        });
        onClose();
        return;
      }

      // Query login
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Google login failed. Please register flat first.');
      }
      login(data.user, data.resident, data.needsQuestionnaire);
      onClaimSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Google Sign-in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedFlat = flats.find(f => f.id === Number(selectedFlatId));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-md rounded-xl bg-white border border-[#e5e7eb] p-6 shadow-2xl text-[#1f2937]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#e5e7eb]">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1f2937]">Resident Login & Claim</h2>
              <p className="text-xs text-[#6b7280]">Phone + Flat Verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#6b7280] hover:text-[#1f2937] hover:bg-[#f5f6f8]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3.5 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {step === 'DETAILS' ? (
          <form onSubmit={handleLookup} className="mt-4 space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">
                Mobile Number (10 Digits)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-3 text-[#9ca3af]" />
                <input
                  type="tel"
                  placeholder="e.g. 9848011223"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937] placeholder-[#9ca3af] focus:outline-none focus:border-blue-600 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">
                Select Your Flat Number
              </label>
              <div className="relative">
                <Home className="w-4 h-4 absolute left-3 top-3 text-[#9ca3af]" />
                <select
                  value={selectedFlatId}
                  onChange={e => setSelectedFlatId(e.target.value ? Number(e.target.value) : '')}
                  required
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937] focus:outline-none focus:border-blue-600 transition appearance-none cursor-pointer"
                >
                  <option value="">-- Choose your flat (e.g. A-101, B-202) --</option>
                  {flats.map(f => (
                    <option key={f.id} value={f.id}>
                      Flat {f.flat_number} (Block {f.block}, Floor {f.floor}) {f.is_claimed ? '• Claimed' : '• Available to Claim'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-5 w-full flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 py-2.5 text-xs font-semibold text-white shadow-sm transition disabled:opacity-50"
            >
              {isLoading ? (
                <span>Checking Flat Status...</span>
              ) : (
                <>
                  <span>Verify Flat & Proceed</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="relative my-3.5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#e5e7eb]"></div>
              </div>
              <div className="relative flex justify-center text-[11px]">
                <span className="bg-white px-2 text-[#9ca3af]">or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#e5e7eb] bg-white hover:bg-[#f9fafb] py-2 text-xs font-semibold text-[#374151] transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Sign in with Google</span>
            </button>
          </form>
        ) : (
          <div className="mt-4 space-y-3.5">
            {!lookupData?.isClaimed ? (
              <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold">Claiming Confirmation</h4>
                    <p className="mt-0.5 leading-relaxed">
                      You are claiming <strong>Flat {selectedFlat?.flat_number}</strong> as your residence. Please double-check before confirming.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold">Registered Flat</h4>
                    <p className="mt-0.5">
                      Flat {selectedFlat?.flat_number} is registered. Enter your password to log in.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!lookupData?.isClaimed && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937] focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Occupancy Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOccupancyType('OWNER')}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg border transition ${
                        occupancyType === 'OWNER'
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'bg-white border-[#e5e7eb] text-[#6b7280] hover:text-[#1f2937]'
                      }`}
                    >
                      Flat Owner
                    </button>
                    <button
                      type="button"
                      onClick={() => setOccupancyType('TENANT')}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg border transition ${
                        occupancyType === 'TENANT'
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'bg-white border-[#e5e7eb] text-[#6b7280] hover:text-[#1f2937]'
                      }`}
                    >
                      Tenant / Resident
                    </button>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">
                {lookupData?.isClaimed ? 'Enter Password' : 'Set Account Password'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-[#9ca3af]" />
                <input
                  type="password"
                  placeholder={lookupData?.isClaimed ? '••••••••' : 'Set a password for your account'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937] focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep('DETAILS')}
                className="w-1/3 py-2 rounded-lg bg-[#f5f6f8] hover:bg-[#e5e7eb] text-xs font-semibold text-[#4b5563]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isLoading}
                className="w-2/3 flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 py-2 text-xs font-semibold text-white shadow-sm transition disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{lookupData?.isClaimed ? 'Log In' : 'Confirm Claim & Continue'}</span>
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
