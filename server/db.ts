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

  // Developer User: Harsha Vardhan Neelapu
  db.run(`
    INSERT OR REPLACE INTO users (id, username, email, phone, full_name, role, password_hash, is_active, created_at)
    VALUES 
    (1, 'developer', 'neelapuharsha@gmail.com', '9876500000', 'Harsha Vardhan Neelapu (Developer / Super Admin)', 'SUPER_ADMIN', 'dev123', 1, datetime('now')),
    (2, 'president', 'president@subhashinise.org', '9876511111', 'Ramesh Sharma (President)', 'PRESIDENT', 'pres123', 1, datetime('now')),
    (3, 'secretary', 'secretary@subhashinise.org', '9876522222', 'Suresh Reddy (Secretary)', 'SECRETARY', 'sec123', 1, datetime('now')),
    (4, 'treasurer', 'treasurer@subhashinise.org', '9876533333', 'Anand Kulkarni (Treasurer)', 'TREASURER', 'treas123', 1, datetime('now'));
  `);

  // Seed Flats for Subhashini Star Enclave (Blocks A, B, C, D)
  const countFlats = db.exec("SELECT COUNT(*) as cnt FROM flats");
  if (!countFlats.length || (countFlats[0].values[0][0] as number) === 0) {
    const blocks = ['A', 'B', 'C', 'D'];
    const floors = [1, 2, 3, 4];
    for (const block of blocks) {
      for (const floor of floors) {
        for (let unit = 1; unit <= 2; unit++) {
          const flatNum = `${block}-${floor}0${unit}`;
          db.run(
            `INSERT INTO flats (flat_number, block, floor, area_sqft, maintenance_paise, status) VALUES (?, ?, ?, ?, ?, 'ACTIVE')`,
            [flatNum, block, floor, 1350, 450000]
          );
        }
      }
    }
  }

  // Pre-seed clean opening balance entry for Subhashini Star Enclave
  const countJournal = db.exec("SELECT COUNT(*) as cnt FROM journal_entries");
  if (!countJournal.length || (countJournal[0].values[0][0] as number) === 0) {
    db.run(`
      INSERT INTO journal_entries (entry_no, entry_date, description, reference_id, reference_type, created_by, is_reversed, idempotency_key, created_at)
      VALUES ('JE-2026-0001', '2026-10-01', 'Opening Balance: Subhashini Star Enclave Bank Corpus', 'CORPUS-OPEN', 'SETUP', 'Harsha Vardhan Neelapu', 0, 'OPEN-CORPUS-SSE-2026', datetime('now'))
    `);
    const je1Id = db.exec("SELECT last_insert_rowid()")[0].values[0][0] as number;
    db.run(`
      INSERT INTO journal_lines (entry_id, account_code, debit_paise, credit_paise, memo) VALUES
      (?, '1010', 25000000, 0, 'Opening balance in HDFC Society Bank Account'),
      (?, '3010', 0, 25000000, 'Subhashini Star Enclave Corpus & Handover Reserve')
    `, [je1Id, je1Id]);
  }

  // Pre-seed Bylaws if empty
  const countBylaws = db.exec("SELECT COUNT(*) as cnt FROM bylaws");
  if (!countBylaws.length || (countBylaws[0].values[0][0] as number) === 0) {
    db.run(`
      INSERT INTO bylaws (category, title, content, effective_date, updated_at) VALUES
      ('Parking', 'Designated Parking & Guest Vehicle Policy', '1. Each registered flat is allotted one covered vehicle parking slot marked with their flat number. 2. Visitor parking is permitted only in designated V-slots for a maximum of 4 hours. 3. Blocking driveways incurs a ₹500 fine.', '2026-01-01', datetime('now')),
      ('Noise & Decibels', 'Silent Hours and Community Etiquette', '1. Strict silent hours are enforced between 10:00 PM and 6:00 AM daily. 2. Loud music and drilling are strictly prohibited on Sundays and after 7:00 PM on weekdays.', '2026-01-01', datetime('now')),
      ('Pets', 'Pet Registration, Leash & Sanitation Guidelines', '1. All pet owners must register pets with the Secretary and keep vaccination certificates up to date. 2. Pets must be leashed at all times in corridors and lifts.', '2026-01-01', datetime('now')),
      ('Waste Management', 'Mandatory 3-Way Waste Segregation', '1. Green bin: Wet/organic kitchen waste. 2. Blue bin: Dry recyclable waste. 3. Red bin: Sanitary/hazardous waste. Unsegregated waste will be rejected.', '2026-01-01', datetime('now')),
      ('Renovation', 'Interior Renovation & Moving Protocols', '1. Prior written approval from President/Secretary is required before starting interior work. 2. Shifting lift padding must be used at all times.', '2026-01-01', datetime('now'));
    `);
  }

  // Pre-seed Notices if empty
  const countNotices = db.exec("SELECT COUNT(*) as cnt FROM society_notices");
  if (!countNotices.length || (countNotices[0].values[0][0] as number) === 0) {
    db.run(`
      INSERT INTO society_notices (title, content, notice_type, target_audience, published_by, published_at, is_pinned) VALUES
      ('Welcome to Subhashini Star Enclave (SSE) Resident Portal', 'Dear Residents, OpenApt is now live for Subhashini Star Enclave. Please claim your flat using your mobile number and select your flat number to configure your resident profile.', 'GENERAL', 'ALL', 'Harsha Vardhan Neelapu (Developer)', datetime('now'), 1);
    `);
  }

  // Pre-seed Meeting Schedules if empty
  const countMeetings = db.exec("SELECT COUNT(*) as cnt FROM meeting_schedules");
  if (!countMeetings.length || (countMeetings[0].values[0][0] as number) === 0) {
    db.run(`
      INSERT INTO meeting_schedules (meeting_type, meeting_date, agenda, venue, minutes_url_or_text, status) VALUES
      ('AGM', '2026-10-25 10:30', '1. Annual accounts audit presentation. 2. Maintenance budget and sinking fund allocation. 3. Election of Executive Committee.', 'Society Clubhouse Ground Floor', 'Draft minutes will be published post meeting.', 'SCHEDULED');
    `);
  }
}
