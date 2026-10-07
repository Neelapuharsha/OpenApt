import initSqlJs, { Database } from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';

let dbInstance: Database | null = null;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'openapt.sqlite');

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const buffer = fs.readFileSync(DB_FILE);
      dbInstance = new SQL.Database(buffer);
      console.log('[OpenApt DB] Loaded existing database from disk.');
    } catch (err) {
      console.error('[OpenApt DB] Error loading existing DB file, creating fresh:', err);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
    console.log('[OpenApt DB] Initialized new in-memory SQLite database.');
  }

  initSchema(dbInstance);
  saveDb();
  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('[OpenApt DB] Failed to persist database to disk:', err);
  }
}

function initSchema(db: Database): void {
  db.run(`
    -- Society Settings
    CREATE TABLE IF NOT EXISTS society_settings (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      short_name TEXT NOT NULL,
      address TEXT,
      registration_no TEXT,
      total_flats INTEGER NOT NULL,
      default_maintenance_paise INTEGER NOT NULL,
      currency TEXT DEFAULT 'INR',
      timezone TEXT DEFAULT 'Asia/Kolkata',
      is_demo_mode INTEGER DEFAULT 0,
      bank_opening_balance_paise INTEGER DEFAULT 25000000,
      updated_at TEXT
    );

    -- Users & Credentials
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      phone TEXT,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('SUPER_ADMIN','PRESIDENT','SECRETARY','TREASURER','RESIDENT')),
      password_hash TEXT,
      flat_id INTEGER,
      is_active INTEGER DEFAULT 1,
      created_at TEXT
    );

    -- User Sessions
    CREATE TABLE IF NOT EXISTS user_sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      role TEXT NOT NULL,
      flat_id INTEGER,
      created_at TEXT NOT NULL
    );

    -- Flats Directory
    CREATE TABLE IF NOT EXISTS flats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flat_number TEXT UNIQUE NOT NULL,
      block TEXT NOT NULL,
      floor INTEGER NOT NULL,
      area_sqft INTEGER DEFAULT 1200,
      maintenance_paise INTEGER NOT NULL,
      status TEXT DEFAULT 'ACTIVE'
    );

    -- Residents & Detailed Questionnaire
    CREATE TABLE IF NOT EXISTS residents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flat_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      nickname TEXT,
      dob TEXT,
      email TEXT,
      phone TEXT NOT NULL,
      whatsapp_phone TEXT,
      profession TEXT,
      languages_spoken TEXT,
      occupancy_type TEXT NOT NULL CHECK(occupancy_type IN ('OWNER', 'TENANT')),
      family_count INTEGER NOT NULL DEFAULT 1,
      family_details TEXT,
      vehicles_data TEXT,
      is_claimed INTEGER DEFAULT 0,
      claimed_at TEXT,
      is_primary INTEGER DEFAULT 1,
      created_at TEXT
    );

    -- Chart of Accounts
    CREATE TABLE IF NOT EXISTS chart_of_accounts (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE')),
      description TEXT
    );

    -- Journal Entries (Double-Entry Header with Idempotency Key)
    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_no TEXT UNIQUE NOT NULL,
      entry_date TEXT NOT NULL,
      description TEXT NOT NULL,
      reference_id TEXT,
      reference_type TEXT,
      created_by TEXT NOT NULL,
      is_reversed INTEGER DEFAULT 0,
      reversal_entry_id INTEGER,
      idempotency_key TEXT UNIQUE,
      created_at TEXT
    );

    -- Journal Lines (Double-Entry Lines: debits & credits balance)
    CREATE TABLE IF NOT EXISTS journal_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id INTEGER NOT NULL,
      account_code TEXT NOT NULL,
      debit_paise INTEGER NOT NULL DEFAULT 0,
      credit_paise INTEGER NOT NULL DEFAULT 0,
      flat_id INTEGER,
      memo TEXT
    );

    -- Maintenance Demands / Bills
    CREATE TABLE IF NOT EXISTS maintenance_bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_no TEXT UNIQUE NOT NULL,
      flat_id INTEGER NOT NULL,
      billing_month TEXT NOT NULL,
      amount_paise INTEGER NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT DEFAULT 'UNPAID',
      created_at TEXT
    );

    -- Payment Receipts
    CREATE TABLE IF NOT EXISTS payment_receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_no TEXT UNIQUE NOT NULL,
      flat_id INTEGER NOT NULL,
      bill_id INTEGER,
      amount_paise INTEGER NOT NULL,
      payment_mode TEXT NOT NULL,
      transaction_ref TEXT,
      payment_date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT
    );

    -- Out-of-pocket Reimbursement Claims
    CREATE TABLE IF NOT EXISTS reimbursement_claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      claim_no TEXT UNIQUE NOT NULL,
      resident_id INTEGER,
      flat_id INTEGER NOT NULL,
      claimant_name TEXT NOT NULL,
      description TEXT NOT NULL,
      amount_paise INTEGER NOT NULL,
      expense_account TEXT DEFAULT '5070',
      status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'DISBURSED', 'REJECTED')),
      claim_date TEXT NOT NULL,
      disbursed_date TEXT,
      transaction_ref TEXT,
      notes TEXT,
      created_at TEXT
    );

    -- Complaints & Feedback
    CREATE TABLE IF NOT EXISTS complaints_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_no TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('APARTMENT_ISSUE', 'APP_FEEDBACK', 'IMPROVEMENT_IDEA')),
      flat_id INTEGER,
      submitted_by_name TEXT NOT NULL,
      submitted_by_phone TEXT,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      priority TEXT DEFAULT 'MEDIUM',
      status TEXT DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
      created_at TEXT,
      resolved_at TEXT
    );

    -- Governance: Bylaws
    CREATE TABLE IF NOT EXISTS bylaws (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      effective_date TEXT,
      updated_at TEXT
    );

    -- Governance: Notices
    CREATE TABLE IF NOT EXISTS society_notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      notice_type TEXT DEFAULT 'GENERAL',
      target_audience TEXT DEFAULT 'ALL',
      published_by TEXT NOT NULL,
      published_at TEXT,
      is_pinned INTEGER DEFAULT 0
    );

    -- Governance: Meeting Schedules
    CREATE TABLE IF NOT EXISTS meeting_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_type TEXT NOT NULL CHECK(meeting_type IN ('AGM', 'EGM', 'COMMITTEE', 'MONTHLY')),
      meeting_date TEXT NOT NULL,
      agenda TEXT NOT NULL,
      venue TEXT NOT NULL,
      minutes_url_or_text TEXT,
      status TEXT DEFAULT 'SCHEDULED'
    );

    -- Immutable Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      user_id INTEGER,
      user_name TEXT NOT NULL,
      user_role TEXT NOT NULL,
      actor_email TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      previous_value TEXT,
      new_value TEXT,
      reason TEXT NOT NULL
    );
  `);

  // Seed default Chart of Accounts if empty
  const countAccounts = db.exec("SELECT COUNT(*) as cnt FROM chart_of_accounts");
  if (!countAccounts.length || (countAccounts[0].values[0][0] as number) === 0) {
    db.run(`
      INSERT INTO chart_of_accounts (code, name, category, description) VALUES
      ('1010', 'Society Main Bank Account (HDFC/SBI)', 'ASSET', 'Primary operational bank account'),
      ('1020', 'Petty Cash', 'ASSET', 'Cash held by treasurer for day-to-day minor expenses'),
      ('1100', 'Maintenance Fees Receivable', 'ASSET', 'Outstanding dues owed by flat residents'),
      ('2010', 'Resident Maintenance Advances', 'LIABILITY', 'Prepaid maintenance amounts and surplus payments'),
      ('2020', 'Reimbursements Payable', 'LIABILITY', 'Approved out-of-pocket expenses owed back to residents'),
      ('2030', 'Vendor Payables', 'LIABILITY', 'Unpaid vendor invoices for security, housekeeping, etc.'),
      ('3010', 'Society Corpus & Sinking Equity', 'EQUITY', 'Permanent sinking fund and builder handover corpus'),
      ('3020', 'Retained Operating Surplus', 'EQUITY', 'Accumulated excess of income over expenditure'),
      ('4010', 'Monthly Maintenance Income', 'INCOME', 'Recurring monthly maintenance billed to flats'),
      ('4020', 'Move-in / Move-out & Amenity Fees', 'INCOME', 'Clubhouse bookings and shifting charges'),
      ('4030', 'Bank Interest Income', 'INCOME', 'Interest earned on corpus fixed deposits'),
      ('5010', 'Security Personnel Services', 'EXPENSE', '24/7 Security guard agency monthly payroll'),
      ('5020', 'Housekeeping & Garbage Collection', 'EXPENSE', 'Daily cleaning staff and municipal garbage processing'),
      ('5030', 'Common Area Electricity (BESCOM/TSSPDCL)', 'EXPENSE', 'Common lighting, pump, and elevator power bills'),
      ('5040', 'Water Supply & Tanker Charges', 'EXPENSE', 'Municipal water connection and emergency tankers'),
      ('5050', 'Elevator AMC & Maintenance', 'EXPENSE', 'Quarterly lift service and annual maintenance contracts'),
      ('5060', 'Diesel Generator (DG) Fuel & AMC', 'EXPENSE', 'Backup power diesel and servicing'),
      ('5070', 'Repairs & Emergency Maintenance', 'EXPENSE', 'Plumbing, borewell motors, STP, and emergency repairs'),
      ('5080', 'Audit, Software & Legal Fees', 'EXPENSE', 'Annual chartered accountant audit and management software');
    `);
  }

  // Society Settings: Subhashini Star Enclave (SSE)
  db.run(`
    INSERT OR REPLACE INTO society_settings (
      id, name, short_name, address, registration_no, total_flats, default_maintenance_paise, is_demo_mode, bank_opening_balance_paise, updated_at
    ) VALUES (
      1, 
      'Subhashini Star Enclave (SSE)', 
      'SSE', 
      'Plot 14-18, Hitech City Main Road, Madhapur, Hyderabad, Telangana 500081', 
      'REG/HYD/SOC/2021/4892', 
      32, 
      450000, 
      0, 
      25000000, 
      datetime('now')
    );
  `);

}
