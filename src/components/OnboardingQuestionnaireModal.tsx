import React, { useState } from 'react';
import { User, Users, Car, Check, ChevronRight, ChevronLeft, Sparkles, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

interface OnboardingQuestionnaireModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMMON_LANGUAGES = ['Telugu', 'Hindi', 'English', 'Tamil', 'Kannada', 'Marathi', 'Bengali', 'Gujarati', 'Malayalam'];

export const OnboardingQuestionnaireModal: React.FC<OnboardingQuestionnaireModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser, residentProfile, updateResidentProfile, setNeedsQuestionnaire } = useAuth();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Personal Profile
  const [name, setName] = useState(residentProfile?.name || currentUser?.full_name || '');
  const [nickname, setNickname] = useState(residentProfile?.nickname || '');
  const [dob, setDob] = useState(residentProfile?.dob || '1990-01-01');
  const [email, setEmail] = useState(residentProfile?.email || currentUser?.email || '');
  const [phone, setPhone] = useState(residentProfile?.phone || currentUser?.phone || '');
  const [sameAsPhone, setSameAsPhone] = useState(true);
  const [whatsappPhone, setWhatsappPhone] = useState(residentProfile?.whatsapp_phone || currentUser?.phone || '');

  // Step 2: Household & Occupation
  const [profession, setProfession] = useState(residentProfile?.profession || '');
  const [languages, setLanguages] = useState<string[]>(() => {
    if (Array.isArray(residentProfile?.languages_spoken)) return residentProfile.languages_spoken;
    if (typeof residentProfile?.languages_spoken === 'string') {
      try { return JSON.parse(residentProfile.languages_spoken); } catch { return ['Telugu', 'English']; }
    }
    return ['Telugu', 'English'];
  });
  const [familyCount, setFamilyCount] = useState<number>(residentProfile?.family_count || 3);
  const [familyMembers, setFamilyMembers] = useState<{ name: string; relation: string }[]>(
    residentProfile?.family_details || [{ name: '', relation: 'Spouse' }]
  );

  // Step 3: Vehicle Registry
  const [twoWheelers, setTwoWheelers] = useState<{ brand: string; reg_no: string }[]>(
    residentProfile?.vehicles_data?.two_wheelers || [{ brand: 'Honda Activa', reg_no: '' }]
  );
  const [cars, setCars] = useState<{ brand: string; reg_no: string }[]>(
    residentProfile?.vehicles_data?.cars || [{ brand: '', reg_no: '' }]
  );
  const [bicycles, setBicycles] = useState<number>(residentProfile?.vehicles_data?.bicycles || 0);
  const [parkingNotes, setParkingNotes] = useState<string>(residentProfile?.vehicles_data?.notes || '');

  if (!isOpen) return null;

  const toggleLanguage = (lang: string) => {
    if (languages.includes(lang)) {
      setLanguages(languages.filter(l => l !== lang));
    } else {
      setLanguages([...languages, lang]);
    }
  };

  const addFamilyMember = () => {
    setFamilyMembers([...familyMembers, { name: '', relation: 'Family Member' }]);
  };

  const removeFamilyMember = (idx: number) => {
    setFamilyMembers(familyMembers.filter((_, i) => i !== idx));
  };

  const addTwoWheeler = () => {
    setTwoWheelers([...twoWheelers, { brand: '', reg_no: '' }]);
  };

  const removeTwoWheeler = (idx: number) => {
    setTwoWheelers(twoWheelers.filter((_, i) => i !== idx));
  };

  const addCar = () => {
    setCars([...cars, { brand: '', reg_no: '' }]);
  };

  const removeCar = (idx: number) => {
    setCars(cars.filter((_, i) => i !== idx));
  };

  const handleNext = () => {
    setError(null);
    if (currentStep === 1) {
      if (!name.trim()) {
        setError('Full Name is required.');
        return;
      }
      if (!phone.trim()) {
        setError('Phone number is required.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!familyCount || familyCount < 1) {
        setError('Family Member Count is mandatory (must be at least 1).');
        return;
      }
      setCurrentStep(3);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        flat_id: currentUser?.flat_id || residentProfile?.flat_id || 1,
        name: name.trim(),
        nickname: nickname.trim(),
        dob,
        email: email.trim(),
        phone: phone.trim(),
        whatsapp_phone: sameAsPhone ? phone.trim() : whatsappPhone.trim(),
        profession: profession.trim(),
        languages_spoken: languages,
        occupancy_type: residentProfile?.occupancy_type || 'OWNER',
        family_count: Number(familyCount),
        family_details: familyMembers.filter(m => m.name.trim() !== ''),
        vehicles_data: {
          two_wheelers: twoWheelers.filter(v => v.brand.trim() || v.reg_no.trim()),
          cars: cars.filter(c => c.brand.trim() || c.reg_no.trim()),
          bicycles: Number(bicycles),
          notes: parkingNotes.trim()
        }
      };

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = currentUser?.token || localStorage.getItem('openapt_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/residents/questionnaire', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit questionnaire');

      updateResidentProfile(data.resident);
      setNeedsQuestionnaire(false);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Submission error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-xl rounded-xl bg-white border border-[#e5e7eb] p-6 shadow-2xl text-[#1f2937] max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#e5e7eb]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1f2937]">Resident Setup Questionnaire</h2>
              <p className="text-xs text-[#6b7280]">1-Time 3-Step Profile Setup for Flat {currentUser?.flat_number || 'Resident'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#6b7280] hover:text-[#1f2937] hover:bg-[#f5f6f8]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1-2-3 Step Wizard Tracker */}
        <div className="py-4">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-0.5 bg-[#e5e7eb] -z-0">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' }}
              />
            </div>

            {/* Step 1 */}
            <div className="flex flex-col items-center gap-1 z-10">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                  currentStep >= 1
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#f5f6f8] text-[#9ca3af] border border-[#e5e7eb]'
                }`}
              >
                1
              </div>
              <span className={`text-[11px] font-semibold ${currentStep === 1 ? 'text-blue-600' : 'text-[#6b7280]'}`}>
                Personal
              </span>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center gap-1 z-10">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                  currentStep >= 2
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#f5f6f8] text-[#9ca3af] border border-[#e5e7eb]'
                }`}
              >
                2
              </div>
              <span className={`text-[11px] font-semibold ${currentStep === 2 ? 'text-blue-600' : 'text-[#6b7280]'}`}>
                Household
              </span>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center gap-1 z-10">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                  currentStep === 3
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#f5f6f8] text-[#9ca3af] border border-[#e5e7eb]'
                }`}
              >
                3
              </div>
              <span className={`text-[11px] font-semibold ${currentStep === 3 ? 'text-blue-600' : 'text-[#6b7280]'}`}>
                Vehicles
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3.5">
          {currentStep === 1 && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Full Legal Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Dr. Venkat Rao"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937] focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Nickname / Alias <span className="text-[#9ca3af] font-normal">(neighbor name)</span>
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={e => setNickname(e.target.value)}
                    placeholder="e.g. Venkat"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937] focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={e => setDob(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937] focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="e.g. venkat@example.com"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937] focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#f5f6f8] rounded-lg border border-[#e5e7eb] space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#374151] mb-1">
                      Phone Number (Login ID)
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937] focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#374151] mb-1">
                      WhatsApp Number
                    </label>
                    <input
                      type="tel"
                      disabled={sameAsPhone}
                      value={sameAsPhone ? phone : whatsappPhone}
                      onChange={e => setWhatsappPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937] focus:outline-none focus:border-blue-600 disabled:opacity-60"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#4b5563]">
                  <input
                    type="checkbox"
                    checked={sameAsPhone}
                    onChange={e => setSameAsPhone(e.target.checked)}
                    className="rounded border-[#d1d5db] text-blue-600 focus:ring-blue-500"
                  />
                  <span>WhatsApp number is identical to mobile number</span>
                </label>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Profession / Occupation
                </label>
                <input
                  type="text"
                  value={profession}
                  onChange={e => setProfession(e.target.value)}
                  placeholder="e.g. Software Architect, Doctor, Teacher"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937] focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Languages Spoken
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_LANGUAGES.map(lang => {
                    const isSelected = languages.includes(lang);
                    return (
                      <button
                        type="button"
                        key={lang}
                        onClick={() => toggleLanguage(lang)}
                        className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
                          isSelected
                            ? 'bg-blue-50 text-blue-700 border border-blue-300'
                            : 'bg-white text-[#4b5563] border border-[#e5e7eb] hover:bg-[#f5f6f8]'
                        }`}
                      >
                        {lang} {isSelected && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 bg-[#f5f6f8] rounded-lg border border-[#e5e7eb] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-[#1f2937]">
                      Family Member Count <span className="text-red-500 font-bold">* MANDATORY</span>
                    </label>
                    <p className="text-[11px] text-[#6b7280]">Total occupants residing in flat including yourself</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFamilyCount(Math.max(1, familyCount - 1))}
                      className="w-7 h-7 rounded-lg bg-white border border-[#e5e7eb] flex items-center justify-center font-bold text-[#374151]"
                    >
                      -
                    </button>
                    <span className="w-7 text-center font-bold text-blue-600">{familyCount}</span>
                    <button
                      type="button"
                      onClick={() => setFamilyCount(familyCount + 1)}
                      className="w-7 h-7 rounded-lg bg-white border border-[#e5e7eb] flex items-center justify-center font-bold text-[#374151]"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#e5e7eb]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-[#374151]">Co-occupant Details (Optional)</span>
                    <button
                      type="button"
                      onClick={addFamilyMember}
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Member
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {familyMembers.map((mem, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Member Name"
                          value={mem.name}
                          onChange={e => {
                            const updated = [...familyMembers];
                            updated[idx].name = e.target.value;
                            setFamilyMembers(updated);
                          }}
                          className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937]"
                        />
                        <input
                          type="text"
                          placeholder="Relation (e.g. Spouse)"
                          value={mem.relation}
                          onChange={e => {
                            const updated = [...familyMembers];
                            updated[idx].relation = e.target.value;
                            setFamilyMembers(updated);
                          }}
                          className="w-32 px-2.5 py-1.5 text-xs rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937]"
                        />
                        <button
                          type="button"
                          onClick={() => removeFamilyMember(idx)}
                          className="p-1 text-[#9ca3af] hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-3">
              {/* 2-Wheelers */}
              <div className="p-3 bg-[#f5f6f8] rounded-lg border border-[#e5e7eb] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1f2937]">2-Wheelers (Bikes / Scooters)</span>
                  <button
                    type="button"
                    onClick={addTwoWheeler}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add 2-Wheeler
                  </button>
                </div>
                {twoWheelers.map((veh, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Brand & Model (e.g. Activa 6G)"
                      value={veh.brand}
                      onChange={e => {
                        const updated = [...twoWheelers];
                        updated[idx].brand = e.target.value;
                        setTwoWheelers(updated);
                      }}
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937]"
                    />
                    <input
                      type="text"
                      placeholder="Reg No (TS09EA1234)"
                      value={veh.reg_no}
                      onChange={e => {
                        const updated = [...twoWheelers];
                        updated[idx].reg_no = e.target.value.toUpperCase();
                        setTwoWheelers(updated);
                      }}
                      className="w-32 px-2.5 py-1.5 text-xs rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937] font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => removeTwoWheeler(idx)}
                      className="p-1 text-[#9ca3af] hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* 4-Wheelers */}
              <div className="p-3 bg-[#f5f6f8] rounded-lg border border-[#e5e7eb] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1f2937]">4-Wheelers (Cars)</span>
                  <button
                    type="button"
                    onClick={addCar}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Car
                  </button>
                </div>
                {cars.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Make & Model (e.g. Creta)"
                      value={c.brand}
                      onChange={e => {
                        const updated = [...cars];
                        updated[idx].brand = e.target.value;
                        setCars(updated);
                      }}
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937]"
                    />
                    <input
                      type="text"
                      placeholder="Reg No (TS09FH5678)"
                      value={c.reg_no}
                      onChange={e => {
                        const updated = [...cars];
                        updated[idx].reg_no = e.target.value.toUpperCase();
                        setCars(updated);
                      }}
                      className="w-32 px-2.5 py-1.5 text-xs rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937] font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => removeCar(idx)}
                      className="p-1 text-[#9ca3af] hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">Bicycles</label>
                  <input
                    type="number"
                    min="0"
                    value={bicycles}
                    onChange={e => setBicycles(Math.max(0, Number(e.target.value)))}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">Parking Notes</label>
                  <input
                    type="text"
                    placeholder="Slot B-14"
                    value={parkingNotes}
                    onChange={e => setParkingNotes(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3.5 mt-2 border-t border-[#e5e7eb] flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((currentStep - 1) as any)}
              className="px-3.5 py-1.5 text-xs font-semibold text-[#4b5563] hover:bg-[#f5f6f8] rounded-lg flex items-center gap-1 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          ) : <div />}

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1 transition"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 transition disabled:opacity-50"
            >
              {isSubmitting ? <span>Saving...</span> : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Finish Setup</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
