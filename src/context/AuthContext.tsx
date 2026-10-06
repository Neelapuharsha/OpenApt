import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Resident } from '../types/index.js';

interface AuthContextType {
  currentUser: User | null;
  residentProfile: Resident | null;
  needsQuestionnaire: boolean;
  setNeedsQuestionnaire: (val: boolean) => void;
  login: (user: User, resident?: Resident | null, needsQ?: boolean) => void;
  logout: () => void;
  switchRole: (role: User['role']) => void;
  updateResidentProfile: (profile: Resident) => void;
  showClaimModal: boolean;
  setShowClaimModal: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PRESET_USERS: Record<string, User> = {
  SUPER_ADMIN: {
    username: 'developer',
    email: 'neelapuharsha@gmail.com',
    full_name: 'Harsha Vardhan Neelapu (Developer / Super Admin)',
    role: 'SUPER_ADMIN',
    phone: '9876500000',
    token: 'dev-token-superadmin'
  },
  PRESIDENT: {
    username: 'president',
    email: 'president@subhashinise.org',
    full_name: 'Ramesh Sharma (President)',
    role: 'PRESIDENT',
    phone: '9876511111',
    token: 'dev-token-president'
  },
  SECRETARY: {
    username: 'secretary',
    email: 'secretary@subhashinise.org',
    full_name: 'Suresh Reddy (Secretary)',
    role: 'SECRETARY',
    phone: '9876522222',
    token: 'dev-token-secretary'
  },
  TREASURER: {
    username: 'treasurer',
    email: 'treasurer@subhashinise.org',
    full_name: 'Anand Kulkarni (Treasurer)',
    role: 'TREASURER',
    phone: '9876533333',
    token: 'dev-token-treasurer'
  },
  RESIDENT: {
    username: 'resident_test',
    email: 'resident@subhashinise.org',
    full_name: 'Resident (Test Occupant)',
    role: 'RESIDENT',
    phone: '9848011223',
    flat_id: 1,
    flat_number: 'A-101',
    token: 'dev-token-resident-1'
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to Super Admin (Developer) so the developer has immediate access
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('openapt_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed.email === 'mirthipativijaya264@gmail.com' ||
          parsed.role === 'SUPER_ADMIN' ||
          parsed.username === 'developer'
        ) {
          const migrated: User = {
            ...parsed,
            username: 'developer',
            email: 'neelapuharsha@gmail.com',
            full_name: 'Harsha Vardhan Neelapu (Developer / Super Admin)',
            role: 'SUPER_ADMIN',
            phone: '9876500000',
            token: parsed.token || 'dev-token-superadmin'
          };
          localStorage.setItem('openapt_user', JSON.stringify(migrated));
          return migrated;
        }
        return parsed;
      }
    } catch { /* noop */ }
    return PRESET_USERS.SUPER_ADMIN;
  });

  const [residentProfile, setResidentProfile] = useState<Resident | null>(() => {
    try {
      const saved = localStorage.getItem('openapt_resident');
      if (saved) return JSON.parse(saved);
    } catch { /* noop */ }
    return null;
  });

  const [needsQuestionnaire, setNeedsQuestionnaire] = useState<boolean>(false);
  const [showClaimModal, setShowClaimModal] = useState<boolean>(false);

  // Cleanse any legacy local storage occurrences on mount
  useEffect(() => {
    try {
      const rawUser = localStorage.getItem('openapt_user');
      if (rawUser && rawUser.includes('mirthipativijaya264@gmail.com')) {
        localStorage.setItem(
          'openapt_user',
          rawUser.replace(/mirthipativijaya264@gmail\.com/g, 'neelapuharsha@gmail.com')
        );
      }
      const rawRes = localStorage.getItem('openapt_resident');
      if (rawRes && rawRes.includes('mirthipativijaya264@gmail.com')) {
        localStorage.setItem(
          'openapt_resident',
          rawRes.replace(/mirthipativijaya264@gmail\.com/g, 'neelapuharsha@gmail.com')
        );
      }
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('openapt_user', JSON.stringify(currentUser));
      if (currentUser.token) {
        localStorage.setItem('openapt_token', currentUser.token);
      }
    } else {
      localStorage.removeItem('openapt_user');
      localStorage.removeItem('openapt_token');
    }
  }, [currentUser]);

  useEffect(() => {
    if (residentProfile) {
      localStorage.setItem('openapt_resident', JSON.stringify(residentProfile));
    } else {
      localStorage.removeItem('openapt_resident');
    }
  }, [residentProfile]);

  const login = (user: User, resident?: Resident | null, needsQ?: boolean) => {
    const cleanUser: User = {
      ...user,
      email: (user.role === 'SUPER_ADMIN' || user.email === 'mirthipativijaya264@gmail.com')
        ? 'neelapuharsha@gmail.com'
        : user.email,
      full_name: user.role === 'SUPER_ADMIN'
        ? 'Harsha Vardhan Neelapu (Developer / Super Admin)'
        : user.full_name
    };
    setCurrentUser(cleanUser);
    if (cleanUser.token) {
      localStorage.setItem('openapt_token', cleanUser.token);
    }
    if (resident) setResidentProfile(resident);
    if (needsQ !== undefined) setNeedsQuestionnaire(needsQ);
  };

  const logout = () => {
    setCurrentUser(null);
    setResidentProfile(null);
    setNeedsQuestionnaire(false);
    localStorage.removeItem('openapt_user');
    localStorage.removeItem('openapt_token');
    localStorage.removeItem('openapt_resident');
  };

  const switchRole = (role: User['role']) => {
    const preset = PRESET_USERS[role];
    if (preset) {
      setCurrentUser(preset);
      if (role === 'RESIDENT') {
        setResidentProfile({
          id: 1,
          flat_id: 1,
          name: 'Dr. Venkat Rao',
          nickname: 'Venkat',
          dob: '1982-04-12',
          email: 'venkat.rao@example.com',
          phone: '9848011223',
          profession: 'Cardiologist',
          occupancy_type: 'OWNER',
          family_count: 4,
          is_claimed: true,
          vehicles_data: {
            two_wheelers: [{ brand: 'Honda Activa 6G', reg_no: 'TS09EA1234' }],
            cars: [{ brand: 'Toyota Fortuner', reg_no: 'TS09UB9900' }],
            bicycles: 1,
            notes: 'Basement Slot A-01'
          }
        });
      } else {
        setResidentProfile(null);
      }
    }
  };

  const updateResidentProfile = (profile: Resident) => {
    setResidentProfile(profile);
    if (currentUser) {
      setCurrentUser({
        ...currentUser,
        full_name: profile.name,
        email: profile.email || currentUser.email
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        residentProfile,
        needsQuestionnaire,
        setNeedsQuestionnaire,
        login,
        logout,
        switchRole,
        updateResidentProfile,
        showClaimModal,
        setShowClaimModal
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
