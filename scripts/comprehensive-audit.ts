import fs from 'fs';
import initSqlJs from 'sql.js';

const BASE_URL = 'http://localhost:3000';

export interface AuditRecord {
  testId: string;
  scenario: string;
  expectedResult: string;
  actualResult: string;
  status: 'PASS' | 'FAIL';
  databaseImpact: string;
  ledgerImpact: string;
  securityImpact: string;
  reproductionSteps: string[];
  details?: any;
}

const auditRecords: AuditRecord[] = [];

function record(rec: AuditRecord) {
  auditRecords.push(rec);
  const tag = rec.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
  console.log(`\n${tag} [${rec.testId}] ${rec.scenario}`);
  console.log(`   Expected: ${rec.expectedResult}`);
  console.log(`   Actual:   ${rec.actualResult}`);
  if (rec.status === 'FAIL') {
    console.log(`   DB Impact:       ${rec.databaseImpact}`);
    console.log(`   Ledger Impact:   ${rec.ledgerImpact}`);
    console.log(`   Security Impact: ${rec.securityImpact}`);
  }
}

async function api(path: string, options: any = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  let data: any = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data };
}

async function getSqlDb() {
  const SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync('data/openapt.sqlite');
  return new SQL.Database(fileBuffer);
}

export async function runFullAuditSuite() {
  console.log('================================================================================');
  console.log(' OPENAPT COMPREHENSIVE END-TO-END AUDIT & FINANCIAL INTEGRITY AUDIT SUITE');
  console.log(' Society: Subhashini Star Enclave (SSE) | 32 Units | Base Maintenance: ₹4,500');
  console.log('================================================================================\n');

  // ==========================================================================
  // SECTION 2: INITIAL DATABASE INTEGRITY
  // ==========================================================================
  console.log('\n--- [SECTION 2] INITIAL DATABASE INTEGRITY ---');
  {
    const db = await getSqlDb();

    // 2.1 Society Settings
    const soc = db.exec("SELECT name, total_flats, default_maintenance_paise FROM society_settings WHERE id = 1")[0]?.values[0];
    const socName = soc?.[0];
    const totalFlats = soc?.[1];
    const defMaint = soc?.[2];
    record({
      testId: 'INIT-01',
      scenario: 'Society name and flat configuration in society_settings',
      expectedResult: 'Name: Subhashini Star Enclave (SSE), total_flats: 32, default_maintenance_paise: 450000',
      actualResult: `Name: ${socName}, total_flats: ${totalFlats}, default_maintenance_paise: ${defMaint}`,
      status: (socName === 'Subhashini Star Enclave (SSE)' && totalFlats === 32 && defMaint === 450000) ? 'PASS' : 'FAIL',
      databaseImpact: 'society_settings table seeded with correct society metadata',
      ledgerImpact: 'Neutral',
      securityImpact: 'None',
      reproductionSteps: ['Query society_settings WHERE id = 1']
    });

    // 2.2 Flat Count exactly 32
    const flatCount = db.exec("SELECT COUNT(*) FROM flats")[0]?.values[0][0] as number;
    record({
      testId: 'INIT-02',
      scenario: 'Flats table contains exactly 32 units (A-101 to D-402)',
      expectedResult: 'Exactly 32 flats',
      actualResult: `${flatCount} flats found`,
      status: flatCount === 32 ? 'PASS' : 'FAIL',
      databaseImpact: flatCount === 32 ? '32 flats properly mapped across blocks A, B, C, D' : `Discrepancy: ${flatCount} flats`,
      ledgerImpact: 'Affects total demand billing potential (32 x ₹4,500 = ₹1,44,000)',
      securityImpact: 'None',
      reproductionSteps: ['Query SELECT COUNT(*) FROM flats']
    });

    // 2.3 Duplicate Flats
    const dupFlats = db.exec("SELECT flat_number, COUNT(*) FROM flats GROUP BY flat_number HAVING COUNT(*) > 1")[0]?.values?.length || 0;
    record({
      testId: 'INIT-03',
      scenario: 'No duplicate flat numbers in flats directory',
      expectedResult: '0 duplicate flat numbers',
      actualResult: `${dupFlats} duplicates found`,
      status: dupFlats === 0 ? 'PASS' : 'FAIL',
      databaseImpact: 'UNIQUE constraint on flat_number enforced',
      ledgerImpact: 'Prevents double-billing of identical units',
      securityImpact: 'Prevents identity confusion during resident claiming',
      reproductionSteps: ['Query SELECT flat_number, COUNT(*) FROM flats GROUP BY flat_number HAVING COUNT(*) > 1']
    });

    // 2.4 Opening Bank Balance
    const obBank = Number(db.exec("SELECT SUM(debit_paise) FROM journal_lines WHERE account_code = '1010'")[0]?.values[0][0]) || 0;
    record({
      testId: 'INIT-04',
      scenario: 'Opening bank balance seeded at ₹2,50,000 (25,000,000 paise)',
      expectedResult: '25000000 paise (₹2,50,000)',
      actualResult: `${obBank} paise (₹${(obBank / 100).toLocaleString('en-IN')})`,
      status: obBank === 25000000 ? 'PASS' : 'FAIL',
      databaseImpact: 'journal_lines Account 1010 initial debit',
      ledgerImpact: 'Establishes initial liquid asset baseline for society',
      securityImpact: 'None',
      reproductionSteps: ["Query SELECT SUM(debit_paise) FROM journal_lines WHERE account_code = '1010'"]
    });

    // 2.5 Opening Equity / Corpus
    const obEq = Number(db.exec("SELECT SUM(credit_paise) FROM journal_lines WHERE account_code = '3010'")[0]?.values[0][0]) || 0;
    record({
      testId: 'INIT-05',
      scenario: 'Opening equity corpus seeded at ₹2,50,000 (25,000,000 paise)',
      expectedResult: '25000000 paise (₹2,50,000)',
      actualResult: `${obEq} paise (₹${(obEq / 100).toLocaleString('en-IN')})`,
      status: obEq === 25000000 ? 'PASS' : 'FAIL',
      databaseImpact: 'journal_lines Account 3010 initial credit',
      ledgerImpact: 'Establishes capital corpus reserve baseline',
      securityImpact: 'None',
      reproductionSteps: ["Query SELECT SUM(credit_paise) FROM journal_lines WHERE account_code = '3010'"]
    });

    // 2.6 Trial Balance Variance at Start
    const tbRes = await api('/api/accounting/trial-balance');
    const tb = tbRes.data;
    const isBalanced = tb?.isBalanced === true && tb?.totalDebitsPaise === tb?.totalCreditsPaise;
    record({
      testId: 'INIT-06',
      scenario: 'Clean Trial Balance exhibits EXACTLY ₹0 variance',
      expectedResult: 'isBalanced: true, totalDebitsPaise === totalCreditsPaise',
      actualResult: `isBalanced: ${tb?.isBalanced}, Debits: ₹${(tb?.totalDebitsPaise / 100).toLocaleString('en-IN')}, Credits: ₹${(tb?.totalCreditsPaise / 100).toLocaleString('en-IN')}`,
      status: isBalanced ? 'PASS' : 'FAIL',
      databaseImpact: 'Every journal entry adheres to sum(debits) == sum(credits)',
      ledgerImpact: 'Fundamental double-entry invariance holds',
      securityImpact: 'None',
      reproductionSteps: ['GET /api/accounting/trial-balance']
    });

    // 2.7 Balance Sheet Equation
    const bsRes = await api('/api/accounting/balance-sheet');
    const bs = bsRes.data;
    const totalLiabEqSurp = (bs?.totalLiabilitiesPaise || 0) + (bs?.totalEquityPaise || 0);
    const bsEquationHolds = bs?.totalAssetsPaise === totalLiabEqSurp && bs?.isBalanced === true;
    record({
      testId: 'INIT-07',
      scenario: 'Balance Sheet Equation: Assets = Liabilities + Equity + Operational Surplus',
      expectedResult: 'Assets == Liabilities + Equity (including current surplus)',
      actualResult: `Assets: ₹${(bs?.totalAssetsPaise / 100).toLocaleString('en-IN')}, Liab+Equity: ₹${(totalLiabEqSurp / 100).toLocaleString('en-IN')}, isBalanced: ${bs?.isBalanced}`,
      status: bsEquationHolds ? 'PASS' : 'FAIL',
      databaseImpact: 'Balance sheet correctly aggregates accounts into category statements',
      ledgerImpact: 'Zero financial discrepancy across balance sheet categories',
      securityImpact: 'None',
      reproductionSteps: ['GET /api/accounting/balance-sheet']
    });

    // 2.8 Clean Slate Check: Zero orphan bills, receipts, complaints, claims
    const receiptsCount = db.exec("SELECT COUNT(*) FROM payment_receipts")[0]?.values[0][0];
    const billsCount = db.exec("SELECT COUNT(*) FROM maintenance_bills")[0]?.values[0][0];
    const complaintsCount = db.exec("SELECT COUNT(*) FROM complaints_feedback")[0]?.values[0][0];
    const claimsCount = db.exec("SELECT COUNT(*) FROM reimbursement_claims")[0]?.values[0][0];
    const isClean = receiptsCount === 0 && billsCount === 0 && complaintsCount === 0 && claimsCount === 0;
    record({
      testId: 'INIT-08',
      scenario: 'Zero orphan or demo receipts, bills, complaints, or reimbursement claims',
      expectedResult: '0 receipts, 0 bills, 0 complaints, 0 claims',
      actualResult: `Receipts: ${receiptsCount}, Bills: ${billsCount}, Complaints: ${complaintsCount}, Claims: ${claimsCount}`,
      status: isClean ? 'PASS' : 'FAIL',
      databaseImpact: 'Database starts from an authentic zero-transaction clean slate',
      ledgerImpact: 'No ghost accounting entries in the system',
      securityImpact: 'No leftover mock test data or stale resident records',
      reproductionSteps: ['Query counts of payment_receipts, maintenance_bills, complaints_feedback, reimbursement_claims']
    });
  }

  // ==========================================================================
  // SECTION 3: SUPER ADMIN TEST & DELETION SAFEGUARD
  // ==========================================================================
  console.log('\n--- [SECTION 3] SUPER ADMIN TEST & DELETION SAFEGUARD ---');
  {
    const superAdmin = {
      role: 'SUPER_ADMIN',
      email: 'neelapuharsha@gmail.com',
      name: 'Harsha Vardhan Neelapu'
    };

    // 3.1 Super Admin Login & Privilege
    const loginRes = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'neelapuharsha@gmail.com', password: 'dev' })
    });
    record({
      testId: 'ADMIN-01',
      scenario: 'Super Admin login verification for developer account (neelapuharsha@gmail.com)',
      expectedResult: 'Status 200, role: SUPER_ADMIN, email: neelapuharsha@gmail.com',
      actualResult: `Status ${loginRes.status}, role: ${loginRes.data?.user?.role}, email: ${loginRes.data?.user?.email}`,
      status: (loginRes.status === 200 && loginRes.data?.user?.role === 'SUPER_ADMIN') ? 'PASS' : 'FAIL',
      databaseImpact: 'Authenticated user session identified as developer/super-admin',
      ledgerImpact: 'None',
      securityImpact: 'Ensures only designated developer email holds SUPER_ADMIN role',
      reproductionSteps: ['POST /api/auth/login with identifier neelapuharsha@gmail.com']
    });

    // Create a temporary complaint ticket to test deletion safeguard
    const createTmp = await api('/api/complaints', {
      method: 'POST',
      body: JSON.stringify({
        type: 'APARTMENT_ISSUE',
        category: 'Plumbing',
        title: 'Temporary QA Ticket for Deletion Safeguard',
        description: 'Testing mandatory audit reason and deletion rules',
        priority: 'LOW',
        submitted_by_name: 'Harsha QA Tester'
      })
    });
    const tmpTicketRes = await api('/api/complaints');
    const tmpTicket = tmpTicketRes.data?.find((c: any) => c.title === 'Temporary QA Ticket for Deletion Safeguard');
    const ticketId = tmpTicket?.id;

    // 3.2 Attempt deletion WITHOUT an audit reason
    const delNoReason = await api('/api/admin/developer-delete', {
      method: 'POST',
      body: JSON.stringify({
        actor: superAdmin,
        entity_type: 'COMPLAINT',
        entity_id: ticketId,
        reason: ''
      })
    });
    record({
      testId: 'ADMIN-02',
      scenario: 'Attempt deletion WITHOUT audit reason is BLOCKED (Mandatory Invariant)',
      expectedResult: 'Status 400 Bad Request with mandatory audit reason error',
      actualResult: `Status ${delNoReason.status}: ${JSON.stringify(delNoReason.data)}`,
      status: (delNoReason.status === 400 && delNoReason.data?.error?.includes('reason')) ? 'PASS' : 'FAIL',
      databaseImpact: 'Record remains intact in database; deletion rejected',
      ledgerImpact: 'None',
      securityImpact: 'Enforces accountability: no silent or unexplained deletions allowed',
      reproductionSteps: ['POST /api/admin/developer-delete with reason: ""']
    });

    // 3.3 Attempt deletion WITH valid reason: "Testing deletion"
    const delValid = await api('/api/admin/developer-delete', {
      method: 'POST',
      body: JSON.stringify({
        actor: superAdmin,
        entity_type: 'COMPLAINT',
        entity_id: ticketId,
        reason: 'Testing deletion'
      })
    });
    record({
      testId: 'ADMIN-03',
      scenario: 'Attempt deletion WITH valid reason "Testing deletion" succeeds',
      expectedResult: 'Status 200, success: true',
      actualResult: `Status ${delValid.status}: ${JSON.stringify(delValid.data)}`,
      status: (delValid.status === 200 && delValid.data?.success === true) ? 'PASS' : 'FAIL',
      databaseImpact: 'Record removed from complaints_feedback table',
      ledgerImpact: 'None',
      securityImpact: 'Authorized developer deletion completes safely',
      reproductionSteps: ['POST /api/admin/developer-delete with reason: "Testing deletion"']
    });

    // 3.4 Verify record is removed
    const verifyList = await api('/api/complaints');
    const stillExists = verifyList.data?.some((c: any) => c.id === ticketId);
    record({
      testId: 'ADMIN-04',
      scenario: 'Database verification: deleted ticket no longer exists in database',
      expectedResult: 'Record completely purged from complaints_feedback',
      actualResult: stillExists ? 'Record still present in database' : 'Record successfully removed',
      status: !stillExists ? 'PASS' : 'FAIL',
      databaseImpact: 'Row deleted from complaints_feedback',
      ledgerImpact: 'None',
      securityImpact: 'Target entity removed as requested',
      reproductionSteps: ['GET /api/complaints and check for ticketId']
    });

    // 3.5 Verify Audit Log entry
    const auditRes = await api('/api/audit-logs');
    const logEntry = auditRes.data?.find((l: any) => l.entity_id == ticketId && l.entity_type === 'COMPLAINT');
    const hasAuditLog = logEntry &&
      logEntry.action === 'DELETE' &&
      logEntry.reason === 'Testing deletion' &&
      logEntry.actor_email === 'neelapuharsha@gmail.com';
    record({
      testId: 'ADMIN-05',
      scenario: 'Audit Log contains entry with actor email, timestamp, and explanation',
      expectedResult: 'Entry with action: DELETE, actor: neelapuharsha@gmail.com, reason: Testing deletion',
      actualResult: logEntry ? `Actor: ${logEntry.actor_email}, Action: ${logEntry.action}, Reason: "${logEntry.reason}", Timestamp: ${logEntry.timestamp}` : 'No audit entry found',
      status: Boolean(hasAuditLog) ? 'PASS' : 'FAIL',
      databaseImpact: 'Row inserted into immutable audit_logs table',
      ledgerImpact: 'None',
      securityImpact: 'Permanent audit trail created for forensic traceability',
      reproductionSteps: ['GET /api/audit-logs and locate entity_id']
    });
  }

  // ==========================================================================
  // SECTION 4: RBAC SECURITY TEST
  // ==========================================================================
  console.log('\n--- [SECTION 4] RBAC SECURITY TEST ---');
  {
    const residentActor = { role: 'RESIDENT', email: 'resident@example.com', name: 'Dr. Rao' };
    const treasurerActor = { role: 'TREASURER', email: 'treasurer@subhashinise.org', name: 'Treasurer Anand' };
    const presidentActor = { role: 'PRESIDENT', email: 'president@subhashinise.org', name: 'President Ramesh' };
    const secretaryActor = { role: 'SECRETARY', email: 'secretary@subhashinise.org', name: 'Secretary Suresh' };

    // 4.1 Resident -> delete flat
    const r1 = await api('/api/admin/developer-delete', {
      method: 'POST',
      body: JSON.stringify({ actor: residentActor, entity_type: 'FLAT', entity_id: 1, reason: 'Unauthorized flat delete' })
    });
    record({
      testId: 'RBAC-01',
      scenario: 'Resident attempts to delete flat via backend API',
      expectedResult: 'Status 403 Forbidden',
      actualResult: `Status ${r1.status}: ${JSON.stringify(r1.data)}`,
      status: r1.status === 403 ? 'PASS' : 'FAIL',
      databaseImpact: 'Flat table protected from deletion',
      ledgerImpact: 'None',
      securityImpact: 'Unauthorized resident flat deletion blocked',
      reproductionSteps: ['POST /api/admin/developer-delete with actor role RESIDENT']
    });

    // 4.2 Resident -> delete payment
    const r2 = await api('/api/admin/developer-delete', {
      method: 'POST',
      body: JSON.stringify({ actor: residentActor, entity_type: 'PAYMENT', entity_id: 1, reason: 'Unauthorized payment delete' })
    });
    record({
      testId: 'RBAC-02',
      scenario: 'Resident attempts to delete payment record via backend API',
      expectedResult: 'Status 403 Forbidden (or 400 Unsupported)',
      actualResult: `Status ${r2.status}`,
      status: (r2.status === 403 || r2.status === 400) ? 'PASS' : 'FAIL',
      databaseImpact: 'Payment receipts table protected from deletion',
      ledgerImpact: 'Financial integrity preserved',
      securityImpact: 'Unauthorized resident payment tampering blocked',
      reproductionSteps: ['POST /api/admin/developer-delete with actor role RESIDENT']
    });

    // 4.3 Resident -> delete transaction
    const r3 = await api('/api/admin/developer-delete', {
      method: 'POST',
      body: JSON.stringify({ actor: residentActor, entity_type: 'TRANSACTION', entity_id: 1, reason: 'Unauthorized tx delete' })
    });
    record({
      testId: 'RBAC-03',
      scenario: 'Resident attempts to delete ledger transaction via backend API',
      expectedResult: 'Status 403 Forbidden (or 400 Unsupported)',
      actualResult: `Status ${r3.status}`,
      status: (r3.status === 403 || r3.status === 400) ? 'PASS' : 'FAIL',
      databaseImpact: 'Journal entries table protected from deletion',
      ledgerImpact: 'Ledger integrity preserved',
      securityImpact: 'Financial tampering blocked',
      reproductionSteps: ['POST /api/admin/developer-delete with actor role RESIDENT']
    });

    // 4.4 Treasurer -> delete payment / ledger transaction
    const r4 = await api('/api/admin/developer-delete', {
      method: 'POST',
      body: JSON.stringify({ actor: treasurerActor, entity_type: 'FLAT', entity_id: 1, reason: 'Treasurer delete attempt' })
    });
    record({
      testId: 'RBAC-04',
      scenario: 'Treasurer attempts to delete system records via backend API',
      expectedResult: 'Status 403 Forbidden (Deletions restricted exclusively to Developer / Super Admin)',
      actualResult: `Status ${r4.status}: ${JSON.stringify(r4.data)}`,
      status: r4.status === 403 ? 'PASS' : 'FAIL',
      databaseImpact: 'System records remain immutable against Treasurer deletion',
      ledgerImpact: 'None',
      securityImpact: 'Segregation of duties: Treasurer cannot unilaterally delete records',
      reproductionSteps: ['POST /api/admin/developer-delete with actor role TREASURER']
    });

    // 4.5 President & Secretary -> delete financial transaction
    const r5 = await api('/api/admin/developer-delete', {
      method: 'POST',
      body: JSON.stringify({ actor: presidentActor, entity_type: 'TRANSACTION', entity_id: 1, reason: 'President delete attempt' })
    });
    record({
      testId: 'RBAC-05',
      scenario: 'President & Secretary attempt to delete financial transaction',
      expectedResult: 'Status 403 Forbidden',
      actualResult: `Status ${r5.status}`,
      status: r5.status === 403 ? 'PASS' : 'FAIL',
      databaseImpact: 'Ledger entries immutable against Committee executive deletion',
      ledgerImpact: 'Prevents unauthorized financial modifications',
      securityImpact: 'Segregation of duties strictly enforced',
      reproductionSteps: ['POST /api/admin/developer-delete with actor role PRESIDENT']
    });

    // 4.6 Resident -> modify another resident via Questionnaire
    // Attempting to overwrite Flat 1 (A-101) resident details from an unauthenticated caller
    const r6 = await api('/api/residents/questionnaire', {
      method: 'POST',
      body: JSON.stringify({
        flat_id: 1,
        name: 'Malicious Attacker Overwrite',
        phone: '9000000000',
        occupancy_type: 'OWNER',
        family_count: 5
      })
    });
    // Checking whether backend verifies flat ownership or session authorization
    const dbNow = await getSqlDb();
    const flat1Resident = dbNow.exec("SELECT name FROM residents WHERE flat_id = 1")[0]?.values[0]?.[0];
    const isVulnerableOverwrite = flat1Resident === 'Malicious Attacker Overwrite';
    record({
      testId: 'RBAC-06',
      scenario: 'Resident attempts to modify another flat resident record via Questionnaire endpoint',
      expectedResult: 'Status 401/403 Forbidden: Caller must be verified owner of the specified flat_id',
      actualResult: isVulnerableOverwrite
        ? `VULNERABILITY: Endpoint permitted unauthenticated overwrite of Flat 1 resident name to "${flat1Resident}" (Status ${r6.status})`
        : `Protected: Status ${r6.status}`,
      status: !isVulnerableOverwrite && r6.status >= 400 ? 'PASS' : 'FAIL',
      databaseImpact: isVulnerableOverwrite ? 'CRITICAL: Arbitrary resident profile overwriting allowed' : 'Protected',
      ledgerImpact: 'None',
      securityImpact: 'High severity Broken Object Level Authorization (BOLA/IDOR) on /api/residents/questionnaire',
      reproductionSteps: ['POST /api/residents/questionnaire with flat_id: 1 and arbitrary payload']
    });

    // 4.7 Resident -> view another flat financial information
    // Calling GET /api/flats
    const r7 = await api('/api/flats');
    const exposesAllBalances = Array.isArray(r7.data) && r7.data.some(f => f.outstanding_paise !== null || f.resident_phone !== null);
    record({
      testId: 'RBAC-07',
      scenario: 'Resident / Public caller attempts to view all other flats financial balances via GET /api/flats',
      expectedResult: 'Residents should only be allowed to view their own flat outstanding balance and private phone/email details',
      actualResult: exposesAllBalances
        ? `DATA LEAKAGE: GET /api/flats returns financial outstanding dues and resident phone/email of all 32 flats to any caller`
        : 'Protected',
      status: !exposesAllBalances ? 'PASS' : 'FAIL',
      databaseImpact: 'Read-only access to all flats metadata and outstanding balances',
      ledgerImpact: 'None',
      securityImpact: 'Privacy Violation / Missing Access Control on /api/flats endpoint',
      reproductionSteps: ['GET /api/flats without authentication headers']
    });
  }

  // ==========================================================================
  // SECTION 5: MONTHLY DEMAND TEST & IDEMPOTENCY
  // ==========================================================================
  console.log('\n--- [SECTION 5] MONTHLY DEMAND TEST & IDEMPOTENCY ---');
  {
    // Generate October 2026 demand: 32 flats x ₹4,500 = ₹1,44,000 (14,400,000 paise)
    const genDemand1 = await api('/api/accounting/demands', {
      method: 'POST',
      body: JSON.stringify({
        billing_month: '2026-10',
        actor: { name: 'Treasurer Anand', role: 'TREASURER' }
      })
    });

    const db = await getSqlDb();
    const billsCount = db.exec("SELECT COUNT(*) FROM maintenance_bills WHERE billing_month = '2026-10'")[0]?.values[0][0] as number;
    const billsTotal = Number(db.exec("SELECT SUM(amount_paise) FROM maintenance_bills WHERE billing_month = '2026-10'")[0]?.values[0][0]) || 0;

    record({
      testId: 'DEMAND-01',
      scenario: 'Generate October 2026 monthly demand for all 32 flats (32 x ₹4,500 = ₹1,44,000)',
      expectedResult: 'Status 200, count: 32, totalPaise: 14400000 (₹1,44,000)',
      actualResult: `Status ${genDemand1.status}, count: ${genDemand1.data?.count}, totalPaise: ${genDemand1.data?.totalPaise} (₹${((genDemand1.data?.totalPaise || 0) / 100).toLocaleString('en-IN')})`,
      status: (genDemand1.status === 200 && genDemand1.data?.count === 32 && genDemand1.data?.totalPaise === 14400000) ? 'PASS' : 'FAIL',
      databaseImpact: '32 rows inserted into maintenance_bills with billing_month 2026-10',
      ledgerImpact: 'Debit 1100 Receivables (14,400,000 paise), Credit 4010 Income (14,400,000 paise)',
      securityImpact: 'None',
      reproductionSteps: ['POST /api/accounting/demands with billing_month: "2026-10"']
    });

    record({
      testId: 'DEMAND-02',
      scenario: 'Database verification: exactly 32 bills exist for 2026-10 totaling ₹1,44,000',
      expectedResult: '32 bills in maintenance_bills table totaling 14,400,000 paise',
      actualResult: `${billsCount} bills found totaling ${billsTotal} paise (₹${(billsTotal / 100).toLocaleString('en-IN')})`,
      status: (billsCount === 32 && billsTotal === 14400000) ? 'PASS' : 'FAIL',
      databaseImpact: 'maintenance_bills rows properly populated with foreign key flat_id and due_date',
      ledgerImpact: 'Accounts Receivable accurately reflects ₹1,44,000 asset addition',
      securityImpact: 'None',
      reproductionSteps: ["Query SELECT COUNT(*), SUM(amount_paise) FROM maintenance_bills WHERE billing_month = '2026-10'"]
    });

    // Check Journal Entry
    const jeDemand = db.exec("SELECT id, entry_no, idempotency_key FROM journal_entries WHERE reference_type = 'BILLING' AND reference_id = 'DEMAND-2026-10'");
    const jeCount = jeDemand[0]?.values?.length || 0;
    record({
      testId: 'DEMAND-03',
      scenario: 'General ledger records demand journal entry with idempotency key DEMAND-2026-10',
      expectedResult: 'Exactly 1 journal entry with reference DEMAND-2026-10',
      actualResult: `${jeCount} journal entry rows found`,
      status: jeCount === 1 ? 'PASS' : 'FAIL',
      databaseImpact: 'Header row in journal_entries and 2 rows in journal_lines (1100 debit, 4010 credit)',
      ledgerImpact: 'Double-entry balance maintained with equal debits and credits',
      securityImpact: 'None',
      reproductionSteps: ["Query SELECT id FROM journal_entries WHERE reference_id = 'DEMAND-2026-10'"]
    });

    // Run the same demand-generation operation AGAIN (Idempotency test)
    const genDemand2 = await api('/api/accounting/demands', {
      method: 'POST',
      body: JSON.stringify({
        billing_month: '2026-10',
        actor: { name: 'Treasurer Anand', role: 'TREASURER' }
      })
    });
    record({
      testId: 'DEMAND-04',
      scenario: 'Submitting duplicate demand generation is BLOCKED by idempotency guard',
      expectedResult: 'Status 400 Bad Request with "already been generated" message',
      actualResult: `Status ${genDemand2.status}: ${JSON.stringify(genDemand2.data)}`,
      status: (genDemand2.status === 400 && genDemand2.data?.error?.includes('already been generated')) ? 'PASS' : 'FAIL',
      databaseImpact: 'No duplicate rows created in maintenance_bills',
      ledgerImpact: 'Prevents double-counting ₹1,44,000 of income or receivables',
      securityImpact: 'Protects financial system against duplicate billing attacks/retries',
      reproductionSteps: ['POST /api/accounting/demands with billing_month: "2026-10" a second time']
    });

    // Verify bills count remains exactly 32
    const billsCountAfter = (await getSqlDb()).exec("SELECT COUNT(*) FROM maintenance_bills WHERE billing_month = '2026-10'")[0]?.values[0][0] as number;
    record({
      testId: 'DEMAND-05',
      scenario: 'Bills count in database remains exactly 32 after duplicate submission attempt',
      expectedResult: '32 bills in maintenance_bills',
      actualResult: `${billsCountAfter} bills in maintenance_bills`,
      status: billsCountAfter === 32 ? 'PASS' : 'FAIL',
      databaseImpact: 'Database integrity preserved',
      ledgerImpact: 'No ghost receivables created',
      securityImpact: 'None',
      reproductionSteps: ["Query SELECT COUNT(*) FROM maintenance_bills WHERE billing_month = '2026-10'"]
    });
  }

  // ==========================================================================
  // SECTION 6: PAYMENT COLLECTION TEST (A-101 Full Payment ₹4,500)
  // ==========================================================================
  console.log('\n--- [SECTION 6] PAYMENT COLLECTION TEST (A-101 Full Payment ₹4,500) ---');
  {
    const db = await getSqlDb();
    const flatA101 = db.exec("SELECT id FROM flats WHERE flat_number = 'A-101'")[0]?.values[0][0] as number;

    const payA101 = await api('/api/accounting/payments', {
      method: 'POST',
      body: JSON.stringify({
        flat_id: flatA101,
        amount_paise: 450000,
        payment_mode: 'UPI',
        transaction_ref: 'UPI/A101/OCT2026/001',
        actor: { name: 'Treasurer Anand', role: 'TREASURER' }
      })
    });
    const receiptNo = payA101.data?.receiptNo;

    record({
      testId: 'PAY-01',
      scenario: 'Record full payment ₹4,500 generates sequential receipt number REC-YYYYMM-XXXX',
      expectedResult: 'Receipt matches regex ^REC-\\d{6}-\\d{4}$',
      actualResult: `Receipt: ${receiptNo} (Status ${payA101.status})`,
      status: (payA101.status === 200 && /^REC-\d{6}-\d{4}$/.test(receiptNo)) ? 'PASS' : 'FAIL',
      databaseImpact: 'payment_receipts row created with receipt_no, flat_id, amount_paise',
      ledgerImpact: 'Debit 1010 Bank (450,000 paise), Credit 1100 Receivables (450,000 paise)',
      securityImpact: 'None',
      reproductionSteps: ['POST /api/accounting/payments for Flat A-101 with amount_paise: 450000']
    });

    const dbAfter = await getSqlDb();
    const billStatus = dbAfter.exec("SELECT status FROM maintenance_bills WHERE flat_id = ? AND billing_month = '2026-10'", [flatA101])[0]?.values[0][0];
    record({
      testId: 'PAY-02',
      scenario: 'A-101 October maintenance bill status updated to PAID in database',
      expectedResult: 'Bill status: PAID',
      actualResult: `Bill status: ${billStatus}`,
      status: billStatus === 'PAID' ? 'PASS' : 'FAIL',
      databaseImpact: 'maintenance_bills row updated with status = PAID',
      ledgerImpact: 'A-101 individual receivable settled',
      securityImpact: 'None',
      reproductionSteps: ["Query SELECT status FROM maintenance_bills WHERE flat_id = (SELECT id FROM flats WHERE flat_number = 'A-101')"]
    });

    const tbRes = await api('/api/accounting/trial-balance');
    const tb = tbRes.data;
    record({
      testId: 'PAY-03',
      scenario: 'Trial Balance remains balanced with ₹0 variance after full payment',
      expectedResult: 'isBalanced: true, totalDebitsPaise === totalCreditsPaise',
      actualResult: `isBalanced: ${tb?.isBalanced}, Debits: ${tb?.totalDebitsPaise}, Credits: ${tb?.totalCreditsPaise}`,
      status: (tb?.isBalanced === true && tb?.totalDebitsPaise === tb?.totalCreditsPaise) ? 'PASS' : 'FAIL',
      databaseImpact: 'Bank debit equals Receivables credit',
      ledgerImpact: 'Zero variance',
      securityImpact: 'None',
      reproductionSteps: ['GET /api/accounting/trial-balance']
    });
  }

  // ==========================================================================
  // SECTION 7: PARTIAL PAYMENT TEST (A-102 Partial Payment ₹2,000)
  // ==========================================================================
  console.log('\n--- [SECTION 7] PARTIAL PAYMENT TEST (A-102 Partial Payment ₹2,000) ---');
  {
    const db = await getSqlDb();
    const flatA102 = db.exec("SELECT id FROM flats WHERE flat_number = 'A-102'")[0]?.values[0][0] as number;

    const payA102 = await api('/api/accounting/payments', {
      method: 'POST',
      body: JSON.stringify({
        flat_id: flatA102,
        amount_paise: 200000,
        payment_mode: 'NEFT',
        transaction_ref: 'NEFT/A102/OCT2026/001',
        actor: { name: 'Treasurer Anand', role: 'TREASURER' }
      })
    });

    record({
      testId: 'PARTIAL-01',
      scenario: 'Partial payment ₹2,000 recorded against ₹4,500 demand',
      expectedResult: 'Status 200, receipt generated',
      actualResult: `Status ${payA102.status}, Receipt: ${payA102.data?.receiptNo}`,
      status: payA102.status === 200 ? 'PASS' : 'FAIL',
      databaseImpact: 'payment_receipts row inserted for ₹2,000',
      ledgerImpact: 'Debit 1010 Bank (200,000 paise), Credit 1100 Receivables (200,000 paise)',
      securityImpact: 'None',
      reproductionSteps: ['POST /api/accounting/payments for Flat A-102 with amount_paise: 200000']
    });

    const dbAfter = await getSqlDb();
    const billStatus = dbAfter.exec("SELECT status FROM maintenance_bills WHERE flat_id = ? AND billing_month = '2026-10'", [flatA102])[0]?.values[0][0];
    record({
      testId: 'PARTIAL-02',
      scenario: 'A-102 maintenance bill marked PARTIALLY_PAID in database',
      expectedResult: 'Status: PARTIALLY_PAID',
      actualResult: `Status: ${billStatus}`,
      status: billStatus === 'PARTIALLY_PAID' ? 'PASS' : 'FAIL',
      databaseImpact: 'maintenance_bills updated to PARTIALLY_PAID',
      ledgerImpact: 'Net receivable for A-102 remains ₹2,500',
      securityImpact: 'None',
      reproductionSteps: ["Query SELECT status FROM maintenance_bills WHERE flat_id = (SELECT id FROM flats WHERE flat_number = 'A-102')"]
    });
  }

  // ==========================================================================
  // SECTION 8: OVERPAYMENT TEST (A-103 vs Actual 3rd Flat A-201)
  // ==========================================================================
  console.log('\n--- [SECTION 8] OVERPAYMENT TEST (A-103 vs Actual 3rd Flat A-201) ---');
  {
    const db = await getSqlDb();

    // 8.1 Testing A-103 as requested in prompt
    const flatA103Res = db.exec("SELECT id FROM flats WHERE flat_number = 'A-103'");
    const flatA103Exists = flatA103Res.length > 0 && flatA103Res[0].values.length > 0;
    record({
      testId: 'OVERPAY-01',
      scenario: 'Verification of flat number "A-103" in Subhashini Star Enclave 32-unit directory',
      expectedResult: 'Flat directory should contain unit A-103 if building has 3+ units per floor',
      actualResult: flatA103Exists
        ? 'Flat A-103 found'
        : 'SCHEMA DEFECT / PROMPT MISMATCH: Flat A-103 DOES NOT EXIST in 32-unit structure (Blocks A-D have 2 units/floor: 101, 102, 201, 202, 301, 302, 401, 402)',
      status: flatA103Exists ? 'PASS' : 'FAIL',
      databaseImpact: 'flats table schema lookup for A-103 returns empty set',
      ledgerImpact: 'Direct payment to non-existent flat_id will fail foreign key/lookup validation',
      securityImpact: 'None',
      reproductionSteps: ["Query SELECT id FROM flats WHERE flat_number = 'A-103'"]
    });

    // 8.2 Testing overpayment logic on actual 3rd flat: A-201 (Demand ₹4,500, Pay ₹6,000)
    const flatA201 = db.exec("SELECT id FROM flats WHERE flat_number = 'A-201'")[0]?.values[0][0] as number;
    const payA201 = await api('/api/accounting/payments', {
      method: 'POST',
      body: JSON.stringify({
        flat_id: flatA201,
        amount_paise: 600000, // ₹6,000
        payment_mode: 'UPI',
        transaction_ref: 'UPI/A201/OCT2026/OVERPAY',
        actor: { name: 'Treasurer Anand', role: 'TREASURER' }
      })
    });

    record({
      testId: 'OVERPAY-02',
      scenario: 'Overpayment ₹6,000 against ₹4,500 demand recorded successfully for Flat A-201',
      expectedResult: 'Status 200, receipt generated',
      actualResult: `Status ${payA201.status}, Receipt: ${payA201.data?.receiptNo}`,
      status: payA201.status === 200 ? 'PASS' : 'FAIL',
      databaseImpact: 'payment_receipts row created for 600,000 paise',
      ledgerImpact: 'Debit 1010 Bank (600,000 paise), Credit 1100 Receivables (450,000 paise), Credit 2010 Advances (150,000 paise)',
      securityImpact: 'None',
      reproductionSteps: ['POST /api/accounting/payments for Flat A-201 with amount_paise: 600000']
    });

    const dbAfter = await getSqlDb();
    const billStatus = dbAfter.exec("SELECT status FROM maintenance_bills WHERE flat_id = ? AND billing_month = '2026-10'", [flatA201])[0]?.values[0][0];
    record({
      testId: 'OVERPAY-03',
      scenario: 'Overpayment marks maintenance bill as PAID',
      expectedResult: 'Status: PAID',
      actualResult: `Status: ${billStatus}`,
      status: billStatus === 'PAID' ? 'PASS' : 'FAIL',
      databaseImpact: 'maintenance_bills updated to PAID',
      ledgerImpact: 'Receivable for October demand cleared',
      securityImpact: 'None',
      reproductionSteps: ["Query SELECT status FROM maintenance_bills WHERE flat_id = (SELECT id FROM flats WHERE flat_number = 'A-201')"]
    });

    // Verify Account 2010 (Resident Maintenance Advances Liability) has credit of ₹1,500 (150,000 paise)
    const advancesRes = dbAfter.exec("SELECT SUM(credit_paise) FROM journal_lines WHERE account_code = '2010'");
    const totalAdvances = Number(advancesRes[0]?.values[0][0]) || 0;
    record({
      testId: 'OVERPAY-04',
      scenario: 'Excess ₹1,500 credited to Resident Maintenance Advances Liability (Account 2010)',
      expectedResult: '150000 paise (₹1,500) in Account 2010',
      actualResult: `${totalAdvances} paise (₹${(totalAdvances / 100).toLocaleString('en-IN')})`,
      status: totalAdvances === 150000 ? 'PASS' : 'FAIL',
      databaseImpact: 'journal_lines row for account 2010 with credit_paise = 150000',
      ledgerImpact: 'Balance sheet liability increases by ₹1,500; resident balance does NOT go negative',
      securityImpact: 'None',
      reproductionSteps: ["Query SELECT SUM(credit_paise) FROM journal_lines WHERE account_code = '2010'"]
    });

    const tbRes = await api('/api/accounting/trial-balance');
    record({
      testId: 'OVERPAY-05',
      scenario: 'Trial Balance remains balanced with ₹0 variance after overpayment split',
      expectedResult: 'isBalanced: true',
      actualResult: `isBalanced: ${tbRes.data?.isBalanced}`,
      status: tbRes.data?.isBalanced === true ? 'PASS' : 'FAIL',
      databaseImpact: 'Debit 1010 (600,000) == Credit 1100 (450,000) + Credit 2010 (150,000)',
      ledgerImpact: 'Double entry balances perfectly',
      securityImpact: 'None',
      reproductionSteps: ['GET /api/accounting/trial-balance']
    });
  }

  // ==========================================================================
  // SECTION 9: DUPLICATE PAYMENT / IDEMPOTENCY TEST
  // ==========================================================================
  console.log('\n--- [SECTION 9] DUPLICATE PAYMENT / IDEMPOTENCY TEST ---');
  {
    const db = await getSqlDb();
    const flatA202 = db.exec("SELECT id FROM flats WHERE flat_number = 'A-202'")[0]?.values[0][0] as number;
    const sameRef = 'UPI/DUP-TEST/REF-99999';

    // Submit payment 1
    const p1 = await api('/api/accounting/payments', {
      method: 'POST',
      body: JSON.stringify({
        flat_id: flatA202,
        amount_paise: 450000,
        payment_mode: 'UPI',
        transaction_ref: sameRef,
        actor: { name: 'Treasurer Anand', role: 'TREASURER' }
      })
    });
    const receipt1 = p1.data?.receiptNo;

    // Submit payment 2 with identical transaction reference
    const p2 = await api('/api/accounting/payments', {
      method: 'POST',
      body: JSON.stringify({
        flat_id: flatA202,
        amount_paise: 450000,
        payment_mode: 'UPI',
        transaction_ref: sameRef,
        actor: { name: 'Treasurer Anand', role: 'TREASURER' }
      })
    });
    const receipt2 = p2.data?.receiptNo;

    record({
      testId: 'IDEMP-01',
      scenario: 'Duplicate payment submission with identical transaction reference returns existing receipt',
      expectedResult: 'Both API requests return identical receipt number without secondary transaction',
      actualResult: `P1: ${receipt1}, P2: ${receipt2}`,
      status: (receipt1 === receipt2 && Boolean(receipt1)) ? 'PASS' : 'FAIL',
      databaseImpact: 'Only ONE receipt recorded in payment_receipts',
      ledgerImpact: 'Bank credited only once; no duplicate journal entries created',
      securityImpact: 'Prevents double-spending, rapid double-click, and network retry duplication',
      reproductionSteps: ['POST /api/accounting/payments twice with identical transaction_ref']
    });

    const dbAfter = await getSqlDb();
    const dupCount = dbAfter.exec("SELECT COUNT(*) FROM payment_receipts WHERE transaction_ref = ?", [sameRef])[0]?.values[0][0] as number;
    record({
      testId: 'IDEMP-02',
      scenario: 'Database contains exactly ONE payment receipt record for reference',
      expectedResult: 'COUNT == 1',
      actualResult: `${dupCount} receipts found`,
      status: dupCount === 1 ? 'PASS' : 'FAIL',
      databaseImpact: 'payment_receipts table deduplicated by transaction_ref',
      ledgerImpact: 'Zero financial inflation',
      securityImpact: 'None',
      reproductionSteps: ['Query SELECT COUNT(*) FROM payment_receipts WHERE transaction_ref = ?']
    });
  }

  // ==========================================================================
  // SECTION 10: REVERSAL TEST
  // ==========================================================================
  console.log('\n--- [SECTION 10] REVERSAL TEST ---');
  {
    const db = await getSqlDb();
    const jeRes = db.exec("SELECT id, entry_no, is_reversed FROM journal_entries WHERE reference_type = 'RECEIPT' ORDER BY id DESC LIMIT 1");
    const jeId = jeRes[0]?.values[0][0] as number;
    const jeNo = jeRes[0]?.values[0][1] as string;

    const reverseRes = await api('/api/accounting/reverse', {
      method: 'POST',
      body: JSON.stringify({
        entry_id: jeId,
        reason: 'Payment bounce correction',
        actor: { name: 'Treasurer Anand', role: 'TREASURER' }
      })
    });

    record({
      testId: 'REV-01',
      scenario: 'Non-destructive reversal executed via /api/accounting/reverse',
      expectedResult: 'Status 200, success: true, reversalNo generated',
      actualResult: `Status ${reverseRes.status}: ${JSON.stringify(reverseRes.data)}`,
      status: (reverseRes.status === 200 && reverseRes.data?.success === true) ? 'PASS' : 'FAIL',
      databaseImpact: 'New reversing journal entry appended to journal_entries',
      ledgerImpact: 'All debit and credit lines inverted; trial balance variance remains ₹0',
      securityImpact: 'Audit compliant: Original entry never deleted',
      reproductionSteps: ['POST /api/accounting/reverse with entry_id and reason']
    });

    const dbAfter = await getSqlDb();
    const origStatus = dbAfter.exec("SELECT is_reversed FROM journal_entries WHERE id = ?", [jeId])[0]?.values[0][0];
    record({
      testId: 'REV-02',
      scenario: 'Original journal entry remains intact in database with is_reversed = 1',
      expectedResult: 'is_reversed == 1',
      actualResult: `is_reversed: ${origStatus}`,
      status: origStatus === 1 ? 'PASS' : 'FAIL',
      databaseImpact: 'journal_entries row updated with is_reversed = 1',
      ledgerImpact: 'Historical audit trail preserved',
      securityImpact: 'None',
      reproductionSteps: ['Query SELECT is_reversed FROM journal_entries WHERE id = ?']
    });

    const revEntryRes = dbAfter.exec("SELECT id, entry_no FROM journal_entries WHERE reference_id = ? AND reference_type = 'REVERSAL'", [jeNo]);
    const hasRevEntry = (revEntryRes[0]?.values?.length || 0) === 1;
    record({
      testId: 'REV-03',
      scenario: 'Inverted reversing journal entry created in ledger',
      expectedResult: 'Exactly 1 reversing journal entry referencing original entry number',
      actualResult: `${revEntryRes[0]?.values?.length || 0} entries found`,
      status: hasRevEntry ? 'PASS' : 'FAIL',
      databaseImpact: 'Reversal entry appended to journal_entries and journal_lines',
      ledgerImpact: 'Exact mathematical offsetting of debits and credits',
      securityImpact: 'None',
      reproductionSteps: ["Query SELECT id FROM journal_entries WHERE reference_type = 'REVERSAL'"]
    });

    const tbRes = await api('/api/accounting/trial-balance');
    record({
      testId: 'REV-04',
      scenario: 'Trial Balance maintains ₹0 variance after reversal',
      expectedResult: 'isBalanced: true',
      actualResult: `isBalanced: ${tbRes.data?.isBalanced}`,
      status: tbRes.data?.isBalanced === true ? 'PASS' : 'FAIL',
      databaseImpact: 'Debits equal credits across ledger',
      ledgerImpact: 'Zero variance',
      securityImpact: 'None',
      reproductionSteps: ['GET /api/accounting/trial-balance']
    });
  }

  // ==========================================================================
  // SECTION 11: REIMBURSEMENT TEST
  // ==========================================================================
  console.log('\n--- [SECTION 11] REIMBURSEMENT CYCLE TEST ---');
  {
    const db = await getSqlDb();
    const flatB101 = db.exec("SELECT id FROM flats WHERE flat_number = 'B-101'")[0]?.values[0][0] as number;
    const bankBefore = Number(db.exec("SELECT SUM(debit_paise - credit_paise) FROM journal_lines WHERE account_code = '1010'")[0]?.values[0][0]) || 0;

    // Step 1: Resident files claim for emergency plumbing materials: ₹2,500 (250,000 paise)
    const claimRes = await api('/api/accounting/reimbursements', {
      method: 'POST',
      body: JSON.stringify({
        flat_id: flatB101,
        claimant_name: 'Rajesh Kumar',
        description: 'Emergency submersible pump capacitor and pipe repair',
        amount_paise: 250000,
        expense_account: '5070'
      })
    });
    record({
      testId: 'REIMB-01',
      scenario: 'Resident claim ₹2,500 submitted with status PENDING',
      expectedResult: 'Status 200, success: true',
      actualResult: `Status ${claimRes.status}`,
      status: (claimRes.status === 200 && claimRes.data?.success === true) ? 'PASS' : 'FAIL',
      databaseImpact: 'reimbursement_claims row inserted with status = PENDING',
      ledgerImpact: 'Neutral until approved/accrued or disbursed',
      securityImpact: 'None',
      reproductionSteps: ['POST /api/accounting/reimbursements with amount_paise: 250000']
    });

    // Verify Bank is NOT affected at claim submission stage
    const dbMid = await getSqlDb();
    const bankMid = Number(dbMid.exec("SELECT SUM(debit_paise - credit_paise) FROM journal_lines WHERE account_code = '1010'")[0]?.values[0][0]) || 0;
    record({
      testId: 'REIMB-02',
      scenario: 'Bank Account balance is completely unaffected at claim filing stage',
      expectedResult: 'Bank before == Bank mid',
      actualResult: `Before: ₹${(bankBefore / 100).toLocaleString('en-IN')}, Mid: ₹${(bankMid / 100).toLocaleString('en-IN')}`,
      status: bankBefore === bankMid ? 'PASS' : 'FAIL',
      databaseImpact: 'Zero journal lines touching Account 1010 at claim submission',
      ledgerImpact: 'Bank cash balance untouched',
      securityImpact: 'None',
      reproductionSteps: ["Query SELECT SUM(debit_paise - credit_paise) FROM journal_lines WHERE account_code = '1010'"]
    });

    const clmRow = dbMid.exec("SELECT id FROM reimbursement_claims WHERE description LIKE '%capacitor%'")[0]?.values[0][0] as number;

    // Step 2: Treasurer disburses claim via IMPS
    const disburseRes = await api(`/api/accounting/reimbursements/${clmRow}/disburse`, {
      method: 'POST',
      body: JSON.stringify({
        transaction_ref: 'IMPS/REIMB/2026/001',
        actor: { name: 'Treasurer Anand', role: 'TREASURER' }
      })
    });
    record({
      testId: 'REIMB-03',
      scenario: 'Treasurer IMPS disbursement completes successfully',
      expectedResult: 'Status 200, claim status DISBURSED',
      actualResult: `Status ${disburseRes.status}`,
      status: disburseRes.status === 200 ? 'PASS' : 'FAIL',
      databaseImpact: 'reimbursement_claims row updated with status = DISBURSED',
      ledgerImpact: 'Debit 5070 Repairs, Credit 2020 Payables (Accrual) & Debit 2020, Credit 1010 Bank (Disbursement)',
      securityImpact: 'None',
      reproductionSteps: ['POST /api/accounting/reimbursements/:id/disburse']
    });

    const dbFinal = await getSqlDb();
    const liab2020Res = dbFinal.exec("SELECT SUM(debit_paise), SUM(credit_paise) FROM journal_lines WHERE account_code = '2020'");
    const deb2020 = Number(liab2020Res[0]?.values[0][0]) || 0;
    const cred2020 = Number(liab2020Res[0]?.values[0][1]) || 0;
    record({
      testId: 'REIMB-04',
      scenario: 'Reimbursements Payable Account 2020 nets out to ₹0 (no double-counting)',
      expectedResult: 'Debits == Credits (250000 paise)',
      actualResult: `Debit 2020: ${deb2020}, Credit 2020: ${cred2020}`,
      status: (deb2020 === cred2020 && deb2020 === 250000) ? 'PASS' : 'FAIL',
      databaseImpact: 'Temporary liability cleared upon payment',
      ledgerImpact: 'Net liability impact is ₹0',
      securityImpact: 'None',
      reproductionSteps: ["Query SELECT SUM(debit_paise), SUM(credit_paise) FROM journal_lines WHERE account_code = '2020'"]
    });

    const bankFinal = Number(dbFinal.exec("SELECT SUM(debit_paise - credit_paise) FROM journal_lines WHERE account_code = '1010'")[0]?.values[0][0]) || 0;
    record({
      testId: 'REIMB-05',
      scenario: 'Bank Account decreased by exactly ₹2,500 upon disbursement',
      expectedResult: 'Bank decreased by 250000 paise (₹2,50,000 to ₹2,47,500 net change)',
      actualResult: `Difference: ${bankBefore - bankFinal} paise (₹${((bankBefore - bankFinal) / 100).toLocaleString('en-IN')})`,
      status: bankBefore - bankFinal === 250000 ? 'PASS' : 'FAIL',
      databaseImpact: 'journal_lines Account 1010 credited by 250,000 paise',
      ledgerImpact: 'Cash decreased by exact disbursement amount',
      securityImpact: 'None',
      reproductionSteps: ["Query SELECT SUM(debit_paise - credit_paise) FROM journal_lines WHERE account_code = '1010'"]
    });
  }

  // ==========================================================================
  // SECTION 12: BANK RECONCILIATION
  // ==========================================================================
  console.log('\n--- [SECTION 12] BANK RECONCILIATION ---');
  {
    // Independent bank calculation:
    // Opening balance: +₹2,50,000 (25,000,000 paise)
    // A-101 payment:   +₹4,500 (450,000 paise)
    // A-102 payment:   +₹2,000 (200,000 paise)
    // A-201 payment:   +₹6,000 (600,000 paise)
    // A-202 payment:   +₹4,500 (450,000 paise)
    // A-202 reversal:  -₹4,500 (-450,000 paise)
    // Reimbursement:   -₹2,500 (-250,000 paise)
    // Net expected:    ₹2,50,000 + 4,500 + 2,000 + 6,000 + 4,500 - 4,500 - 2,500 = ₹2,60,000 (26,000,000 paise)

    const expectedBankPaise = 26000000;
    const db = await getSqlDb();
    const dbBankPaise = Number(db.exec("SELECT SUM(debit_paise - credit_paise) FROM journal_lines WHERE account_code = '1010'")[0]?.values[0][0]) || 0;

    const bsRes = await api('/api/accounting/balance-sheet');
    const bsBank = bsRes.data?.assets?.find((a: any) => a.code === '1010')?.amountPaise || 0;

    record({
      testId: 'RECON-01',
      scenario: 'Three-way Bank Reconciliation: Expected vs Database vs Balance Sheet Dashboard',
      expectedResult: `Expected (${expectedBankPaise}) == DB (${expectedBankPaise}) == Dashboard (${expectedBankPaise})`,
      actualResult: `Expected: ₹${(expectedBankPaise / 100).toLocaleString('en-IN')}, DB: ₹${(dbBankPaise / 100).toLocaleString('en-IN')}, Dashboard: ₹${(bsBank / 100).toLocaleString('en-IN')}`,
      status: (expectedBankPaise === dbBankPaise && dbBankPaise === bsBank) ? 'PASS' : 'FAIL',
      databaseImpact: 'Zero discrepancy between general ledger and financial reports',
      ledgerImpact: 'Complete audit reconcilability',
      securityImpact: 'None',
      reproductionSteps: ['Compare manual sum with DB Account 1010 balance and Balance Sheet']
    });
  }

  // ==========================================================================
  // SECTION 13: RESIDENT CLAIM FLOW
  // ==========================================================================
  console.log('\n--- [SECTION 13] RESIDENT CLAIM FLOW ---');
  {
    const db = await getSqlDb();
    const flatB201 = db.exec("SELECT id FROM flats WHERE flat_number = 'B-201'")[0]?.values[0][0] as number;

    // 13.1 Lookup unclaimed flat B-201
    const lookup1 = await api('/api/auth/lookup-flat', {
      method: 'POST',
      body: JSON.stringify({ flat_id: flatB201, phone: '9988776655' })
    });
    record({
      testId: 'CLAIM-01',
      scenario: 'Unclaimed flat lookup indicates isClaimed: false',
      expectedResult: 'Status 200, isClaimed: false',
      actualResult: `Status ${lookup1.status}, isClaimed: ${lookup1.data?.isClaimed}`,
      status: (lookup1.status === 200 && lookup1.data?.isClaimed === false) ? 'PASS' : 'FAIL',
      databaseImpact: 'Query checks residents table for flat_id',
      ledgerImpact: 'None',
      securityImpact: 'Identifies unit as ready for initial resident claim',
      reproductionSteps: ['POST /api/auth/lookup-flat for Flat B-201']
    });

    // 13.2 Claim B-201
    const claimRes = await api('/api/auth/claim-and-login', {
      method: 'POST',
      body: JSON.stringify({
        flat_id: flatB201,
        phone: '9988776655',
        password: 'password123',
        is_claim_action: true,
        occupancy_type: 'OWNER',
        full_name: 'Venkatesh Murthy'
      })
    });
    record({
      testId: 'CLAIM-02',
      scenario: 'Resident claims B-201 and creates password',
      expectedResult: 'Status 200, user created and mapped to flat B-201',
      actualResult: `Status ${claimRes.status}, user: ${claimRes.data?.user?.username}, flat_id: ${claimRes.data?.user?.flat_id}`,
      status: (claimRes.status === 200 && claimRes.data?.user?.flat_id === flatB201) ? 'PASS' : 'FAIL',
      databaseImpact: 'residents table updated with is_claimed = 1; users table credentials created',
      ledgerImpact: 'None',
      securityImpact: 'Unit claimed and bound to resident phone credentials',
      reproductionSteps: ['POST /api/auth/claim-and-login with is_claim_action: true']
    });

    // 13.3 Complete 1-2-3 Questionnaire (Personal profile, Household, Vehicles/Parking)
    const qRes = await api('/api/residents/questionnaire', {
      method: 'POST',
      headers: { Authorization: `Bearer ${claimRes.data?.token}` },
      body: JSON.stringify({
        flat_id: flatB201,
        name: 'Venkatesh Murthy',
        nickname: 'Venkat',
        phone: '9988776655',
        whatsapp_phone: '9988776655',
        email: 'venkatesh.murthy@example.com',
        profession: 'Software Architect',
        occupancy_type: 'OWNER',
        family_count: 3,
        family_details: [{ name: 'Sunita', relation: 'Spouse' }, { name: 'Aarav', relation: 'Son' }],
        vehicles_data: {
          two_wheelers: [{ brand: 'Honda Activa', reg_no: 'TS09EA1234' }],
          cars: [{ brand: 'Hyundai Creta', reg_no: 'TS09FA5678' }],
          bicycles: 1,
          parking_notes: 'Covered slot #B-201'
        }
      })
    });
    record({
      testId: 'CLAIM-03',
      scenario: 'Complete 1-2-3 Questionnaire (Profile, Household, Vehicles)',
      expectedResult: 'Status 200, success: true',
      actualResult: `Status ${qRes.status}`,
      status: qRes.status === 200 ? 'PASS' : 'FAIL',
      databaseImpact: 'residents table populated with detailed profile, family JSON, vehicles JSON',
      ledgerImpact: 'None',
      securityImpact: 'None',
      reproductionSteps: ['POST /api/residents/questionnaire for Flat B-201']
    });

    // 13.4 Persistence check across logout and re-login
    const relogin = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: '9988776655', password: 'password123' })
    });
    record({
      testId: 'CLAIM-04',
      scenario: 'Resident logs in again with newly created credentials and verifies profile persistence',
      expectedResult: 'Status 200, resident profile retrieved with name Venkatesh Murthy',
      actualResult: `Status ${relogin.status}, Name: ${relogin.data?.resident?.name}, Phone: ${relogin.data?.resident?.phone}`,
      status: (relogin.status === 200 && relogin.data?.resident?.name === 'Venkatesh Murthy') ? 'PASS' : 'FAIL',
      databaseImpact: 'Persistent credentials and resident profile stored in SQLite disk database',
      ledgerImpact: 'None',
      securityImpact: 'Authentication works reliably across sessions',
      reproductionSteps: ['POST /api/auth/login with identifier 9988776655']
    });
  }

  // ==========================================================================
  // SECTION 14: ALREADY CLAIMED FLAT
  // ==========================================================================
  console.log('\n--- [SECTION 14] ALREADY CLAIMED FLAT ---');
  {
    const db = await getSqlDb();
    const flatB201 = db.exec("SELECT id FROM flats WHERE flat_number = 'B-201'")[0]?.values[0][0] as number;

    // Second resident attempts to claim the ALREADY CLAIMED flat B-201
    const claimDup = await api('/api/auth/claim-and-login', {
      method: 'POST',
      body: JSON.stringify({
        flat_id: flatB201,
        phone: '9111222333',
        password: 'intruderpass',
        is_claim_action: true,
        occupancy_type: 'TENANT'
      })
    });

    record({
      testId: 'CLAIM-05',
      scenario: 'Second resident attempts to claim already claimed flat B-201',
      expectedResult: 'Status 400 Bad Request: Flat has already been claimed',
      actualResult: `Status ${claimDup.status}: ${JSON.stringify(claimDup.data)}`,
      status: (claimDup.status === 400 && claimDup.data?.error?.includes('already been claimed')) ? 'PASS' : 'FAIL',
      databaseImpact: 'Flat B-201 claim remains untouched; no intruder credentials created',
      ledgerImpact: 'None',
      securityImpact: 'Flat hijacking prevented; existing resident password not exposed',
      reproductionSteps: ['POST /api/auth/claim-and-login with is_claim_action: true on already claimed flat']
    });
  }

  // ==========================================================================
  // SECTION 15: RESIDENT DATA ISOLATION
  // ==========================================================================
  console.log('\n--- [SECTION 15] RESIDENT DATA ISOLATION ---');
  {
    // A-101 resident tries to access A-102, B-201, C-301 private data
    const flatsRes = await api('/api/flats');
    const allFlats = flatsRes.data || [];
    const leakedPhones = allFlats.filter((f: any) => f.resident_phone && f.flat_number !== 'A-101');

    record({
      testId: 'ISO-01',
      scenario: 'Resident data isolation: Directory API masks phone numbers and financial balances of other flats',
      expectedResult: 'Other residents phone numbers, emails, and balances should be masked or restricted to Admins',
      actualResult: leakedPhones.length > 0
        ? `DATA ISOLATION FAILURE: ${leakedPhones.length} other flats phone numbers and balances exposed in unauthenticated API response`
        : 'Data properly isolated',
      status: leakedPhones.length === 0 ? 'PASS' : 'FAIL',
      databaseImpact: 'Unrestricted SELECT query across flats and residents',
      ledgerImpact: 'Financial balances exposed across units',
      securityImpact: 'Privacy and data isolation violation: residents can see neighbors personal data',
      reproductionSteps: ['GET /api/flats and inspect resident_phone of other flats']
    });
  }

  console.log('\n================================================================================');
  console.log(` AUDIT COMPLETE: ${auditRecords.filter(r => r.status === 'PASS').length} / ${auditRecords.length} PASSED`);
  console.log('================================================================================\n');

  return auditRecords;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runFullAuditSuite().catch(err => {
    console.error('Fatal audit execution error:', err);
    process.exit(1);
  });
}
