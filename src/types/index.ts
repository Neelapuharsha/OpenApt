export type UserRole = 'SUPER_ADMIN' | 'PRESIDENT' | 'SECRETARY' | 'TREASURER' | 'RESIDENT';

export interface User {
  id?: number;
  username: string;
  email?: string;
  phone?: string;
  full_name: string;
  role: UserRole;
  flat_id?: number;
  flat_number?: string;
  token?: string;
}

export interface Flat {
  id: number;
  flat_number: string;
  block: string;
  floor: number;
  area_sqft: number;
  maintenance_paise: number;
  status: string;
  resident_id?: number;
  resident_name?: string;
  resident_phone?: string;
  resident_email?: string;
  occupancy_type?: 'OWNER' | 'TENANT';
  is_claimed?: boolean;
  family_count?: number;
  vehicles_data?: {
    two_wheelers?: { brand: string; reg_no: string }[];
    cars?: { brand: string; reg_no: string }[];
    bicycles?: number;
    notes?: string;
  };
  outstanding_paise?: number;
}

export interface Resident {
  id: number;
  flat_id: number;
  name: string;
  nickname?: string;
  dob?: string;
  email?: string;
  phone: string;
  whatsapp_phone?: string;
  profession?: string;
  languages_spoken?: string | string[];
  occupancy_type: 'OWNER' | 'TENANT';
  family_count: number;
  family_details?: { name: string; relation: string }[];
  vehicles_data?: {
    two_wheelers?: { brand: string; reg_no: string }[];
    cars?: { brand: string; reg_no: string }[];
    bicycles?: number;
    notes?: string;
  };
  is_claimed: boolean;
  claimed_at?: string;
  created_at?: string;
}

export interface JournalLine {
  account_code: string;
  account_name: string;
  account_category: string;
  debit_paise: number;
  credit_paise: number;
  flat_id?: number;
  memo?: string;
}

export interface JournalEntry {
  id: number;
  entry_no: string;
  entry_date: string;
  description: string;
  reference_id?: string;
  reference_type?: string;
  created_by: string;
  is_reversed: boolean;
  created_at: string;
  lines: JournalLine[];
  totalDebitPaise: number;
  totalCreditPaise: number;
}

export interface TrialBalanceRow {
  code: string;
  name: string;
  category: string;
  debitPaise: number;
  creditPaise: number;
  netDebitPaise: number;
  netCreditPaise: number;
}

export interface BalanceSheetData {
  assets: { code: string; name: string; amountPaise: number }[];
  totalAssetsPaise: number;
  liabilities: { code: string; name: string; amountPaise: number }[];
  totalLiabilitiesPaise: number;
  equity: { code: string; name: string; amountPaise: number }[];
  currentSurplusPaise: number;
  totalEquityPaise: number;
  isBalanced: boolean;
  variancePaise: number;
}

export interface IncomeExpenseData {
  income: { code: string; name: string; amountPaise: number }[];
  totalIncomePaise: number;
  expenses: { code: string; name: string; amountPaise: number }[];
  totalExpensesPaise: number;
  netSurplusPaise: number;
}

export interface PaymentReceipt {
  id: number;
  receipt_no: string;
  flat_id: number;
  flat_number?: string;
  resident_name?: string;
  amount_paise: number;
  payment_mode: string;
  transaction_ref?: string;
  payment_date: string;
  notes?: string;
}

export interface ReimbursementClaim {
  id: number;
  claim_no: string;
  flat_id: number;
  flat_number?: string;
  claimant_name: string;
  description: string;
  amount_paise: number;
  expense_account: string;
  status: 'PENDING' | 'APPROVED' | 'DISBURSED' | 'REJECTED';
  claim_date: string;
  disbursed_date?: string;
  transaction_ref?: string;
  notes?: string;
}

export interface Complaint {
  id: number;
  ticket_no: string;
  type: 'APARTMENT_ISSUE' | 'APP_FEEDBACK' | 'IMPROVEMENT_IDEA';
  flat_id?: number;
  flat_number?: string;
  submitted_by_name: string;
  submitted_by_phone?: string;
  category: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  created_at: string;
  resolved_at?: string;
}

export interface Bylaw {
  id: number;
  category: string;
  title: string;
  content: string;
  effective_date: string;
  updated_at: string;
}

export interface SocietyNotice {
  id: number;
  title: string;
  content: string;
  notice_type: string;
  target_audience: 'ALL' | 'OWNERS' | 'TENANTS';
  published_by: string;
  published_at: string;
  is_pinned: boolean;
}

export interface MeetingSchedule {
  id: number;
  meeting_type: 'AGM' | 'EGM' | 'COMMITTEE' | 'MONTHLY';
  meeting_date: string;
  agenda: string;
  venue: string;
  minutes_url_or_text?: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
}

export interface AuditLog {
  id: number;
  timestamp: string;
  user_id?: number;
  user_name: string;
  user_role: string;
  actor_email?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  previous_value?: string;
  new_value?: string;
  reason: string;
}

export interface HelpGuide {
  id: string;
  title: string;
  badge: string;
  summary: string;
  steps: string[];
}
