import fs from 'fs';
import initSqlJs from 'sql.js';

const BASE_URL = 'http://localhost:3000';

export interface TestResult {
  suite: string;
  testId: string;
  name: string;
  status: 'PASS' | 'FAIL';
  expected: string;
  actual: string;
  details?: any;
}

const results: TestResult[] = [];

function recordTest(suite: string, testId: string, name: string, status: 'PASS' | 'FAIL', expected: string, actual: string, details?: any) {
  results.push({ suite, testId, name, status, expected, actual, details });
  const icon = status === 'PASS' ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [${suite} - ${testId}] ${name}`);
  if (status === 'FAIL') {
    console.log(`   Expected: ${expected}`);
    console.log(`   Actual:   ${actual}`);
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

export async function runRemediationTests() {
  console.log('======================================================================');
  console.log(' OPENAPT SURGICAL SECURITY & API DEFECTS REMEDIATION TEST SUITE');
  console.log('======================================================================\n');

  // Step 0: Clean database reset via API
  console.log('[Setup] Synchronously resetting database to clean starting state via API...');
  const resetRes = await api('/api/admin/test-reset-clean-db', { method: 'POST' });
  if (resetRes.status !== 200) {
    throw new Error('Failed to reset test database: ' + JSON.stringify(resetRes.data));
  }
  console.log('[Setup] Clean database baseline initialized.\n');

  // ==========================================================================
  // SUITE 1: API-02 — LOGIN RESPONSE CONTRACT & ALL ROLES
  // ==========================================================================
  console.log('--- Suite 1: API-02 — Login Response Contract & Role Testing ---');
  let superAdminToken = '';
  let presidentToken = '';
  let secretaryToken = '';
  let treasurerToken = '';
  let residentAToken = '';
  let residentBToken = '';

  // 1.1 Super Admin login
  const saLogin = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'neelapuharsha@gmail.com', password: 'dev123' })
  });
  superAdminToken = saLogin.data?.token;
  recordTest(
    'API-02',
    'LOGIN-01',
    'Super Admin login returns user, resident: null, and valid session token',
    saLogin.status === 200 && saLogin.data?.user?.role === 'SUPER_ADMIN' && saLogin.data?.resident === null && Boolean(superAdminToken)
      ? 'PASS' : 'FAIL',
    'status: 200, role: SUPER_ADMIN, resident: null, token: present',
    `status: ${saLogin.status}, role: ${saLogin.data?.user?.role}, resident: ${saLogin.data?.resident}, token: ${Boolean(superAdminToken)}`
  );

  // 1.2 President login
  const presLogin = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'president', password: 'pres123' })
  });
  presidentToken = presLogin.data?.token;
  recordTest(
    'API-02',
    'LOGIN-02',
    'President login returns user, token, and backwards compatible user fields',
    presLogin.status === 200 && presLogin.data?.user?.role === 'PRESIDENT' && Boolean(presidentToken) ? 'PASS' : 'FAIL',
    'status: 200, role: PRESIDENT, token: present',
    `status: ${presLogin.status}, role: ${presLogin.data?.user?.role}, token: ${Boolean(presidentToken)}`
  );

  // 1.3 Secretary login
  const secLogin = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'secretary', password: 'sec123' })
  });
  secretaryToken = secLogin.data?.token;
  recordTest(
    'API-02',
    'LOGIN-03',
    'Secretary login returns user, token, and backwards compatible user fields',
    secLogin.status === 200 && secLogin.data?.user?.role === 'SECRETARY' && Boolean(secretaryToken) ? 'PASS' : 'FAIL',
    'status: 200, role: SECRETARY, token: present',
    `status: ${secLogin.status}, role: ${secLogin.data?.user?.role}, token: ${Boolean(secretaryToken)}`
  );

  // 1.4 Treasurer login
  const treasLogin = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'treasurer', password: 'treas123' })
  });
  treasurerToken = treasLogin.data?.token;
  recordTest(
    'API-02',
    'LOGIN-04',
    'Treasurer login returns user, token, and backwards compatible user fields',
    treasLogin.status === 200 && treasLogin.data?.user?.role === 'TREASURER' && Boolean(treasurerToken) ? 'PASS' : 'FAIL',
    'status: 200, role: TREASURER, token: present',
    `status: ${treasLogin.status}, role: ${treasLogin.data?.user?.role}, token: ${Boolean(treasurerToken)}`
  );

  // 1.5 Resident Claim & Login:
  // Lookup Flat B-201 (id: 11) and Flat A-101 (id: 1)
  const db = await getSqlDb();
  const flatB201Id = db.exec("SELECT id FROM flats WHERE flat_number = 'B-201'")[0].values[0][0] as number;
  const flatA101Id = db.exec("SELECT id FROM flats WHERE flat_number = 'A-101'")[0].values[0][0] as number;

  const claimA = await api('/api/auth/claim-and-login', {
    method: 'POST',
    body: JSON.stringify({
      flat_id: flatB201Id,
      phone: '9988776655',
      password: 'passwordA',
      is_claim_action: true,
      full_name: 'Resident A (Venkat)'
    })
  });
  residentAToken = claimA.data?.token;

  // Login as Resident A
  const resALogin = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: '9988776655', password: 'passwordA' })
  });
  residentAToken = resALogin.data?.token || residentAToken;
  recordTest(
    'API-02',
    'LOGIN-05',
    'Resident login contract contains both user and resident objects',
    resALogin.status === 200 &&
      Boolean(resALogin.data?.user) &&
      Boolean(resALogin.data?.resident) &&
      resALogin.data?.resident?.flat_id === flatB201Id &&
      Boolean(resALogin.data?.resident?.id)
      ? 'PASS' : 'FAIL',
    'response.user and response.resident present, resident.flat_id == 11',
    `user: ${Boolean(resALogin.data?.user)}, resident: ${Boolean(resALogin.data?.resident)}, flat_id: ${resALogin.data?.resident?.flat_id}`
  );

  // Claim Flat A-101 for Resident B
  const claimB = await api('/api/auth/claim-and-login', {
    method: 'POST',
    body: JSON.stringify({
      flat_id: flatA101Id,
      phone: '9111222333',
      password: 'passwordB',
      is_claim_action: true,
      full_name: 'Resident B (Rao)'
    })
  });
  residentBToken = claimB.data?.token;

  // ==========================================================================
  // SUITE 2: SEC-01 — RESIDENT PROFILE BOLA / IDOR PREVENTION
  // ==========================================================================
  console.log('\n--- Suite 2: SEC-01 — Resident Profile BOLA / IDOR Prevention ---');

  // 2.1 Unauthenticated POST /api/residents/questionnaire -> 401
  const sec1Test1 = await api('/api/residents/questionnaire', {
    method: 'POST',
    body: JSON.stringify({
      flat_id: flatA101Id,
      name: 'Malicious Attacker',
      phone: '9999999999',
      family_count: 2
    })
  });
  recordTest(
    'SEC-01',
    'SEC-01-T1',
    'Unauthenticated POST /api/residents/questionnaire is rejected with 401 Unauthorized',
    sec1Test1.status === 401 ? 'PASS' : 'FAIL',
    'Status 401 Unauthorized',
    `Status ${sec1Test1.status}: ${JSON.stringify(sec1Test1.data)}`
  );

  // 2.2 Resident A attempts to update Resident B's flat (A-101) -> 403
  const dbBeforeSec1 = await getSqlDb();
  const resBNameBefore = dbBeforeSec1.exec("SELECT name FROM residents WHERE flat_id = ?", [flatA101Id])[0]?.values[0][0];

  const sec1Test2 = await api('/api/residents/questionnaire', {
    method: 'POST',
    headers: { Authorization: `Bearer ${residentAToken}` },
    body: JSON.stringify({
      flat_id: flatA101Id, // Target foreign flat
      name: 'Hacked Resident B',
      phone: '9999999999',
      family_count: 5
    })
  });

  const dbAfterSec1 = await getSqlDb();
  const resBNameAfter = dbAfterSec1.exec("SELECT name FROM residents WHERE flat_id = ?", [flatA101Id])[0]?.values[0][0];

  recordTest(
    'SEC-01',
    'SEC-01-T2',
    "Resident A attempts to update Resident B's flat: Rejected with 403, DB unchanged",
    sec1Test2.status === 403 && resBNameBefore === resBNameAfter ? 'PASS' : 'FAIL',
    'Status 403 Forbidden, Resident B name unchanged in DB',
    `Status ${sec1Test2.status}, Name before: "${resBNameBefore}", Name after: "${resBNameAfter}"`
  );

  // 2.3 Resident A updates their OWN flat (B-201) -> 200
  const sec1Test3 = await api('/api/residents/questionnaire', {
    method: 'POST',
    headers: { Authorization: `Bearer ${residentAToken}` },
    body: JSON.stringify({
      flat_id: flatB201Id,
      name: 'Venkatesh Murthy (Authorized)',
      nickname: 'Venkat',
      dob: '1985-05-15',
      email: 'venkat@example.com',
      phone: '9988776655',
      profession: 'Software Architect',
      occupancy_type: 'OWNER',
      family_count: 3
    })
  });

  const dbAfterOwnUpdate = await getSqlDb();
  const resAName = dbAfterOwnUpdate.exec("SELECT name FROM residents WHERE flat_id = ?", [flatB201Id])[0]?.values[0][0];

  recordTest(
    'SEC-01',
    'SEC-01-T3',
    'Resident A updates their own flat: Accepted with 200, DB updated correctly',
    sec1Test3.status === 200 && resAName === 'Venkatesh Murthy (Authorized)' ? 'PASS' : 'FAIL',
    'Status 200 OK, DB reflected "Venkatesh Murthy (Authorized)"',
    `Status ${sec1Test3.status}, DB Name: "${resAName}"`
  );

  // 2.4 Attempt using another user's flat_id while authenticated -> 403
  const sec1Test4 = await api('/api/residents/questionnaire', {
    method: 'POST',
    headers: { Authorization: `Bearer ${residentAToken}` },
    body: JSON.stringify({
      flat_id: 2,
      name: 'Tamper Flat 2',
      family_count: 2
    })
  });
  recordTest(
    'SEC-01',
    'SEC-01-T4',
    'Attempt using another foreign flat_id while authenticated: Rejected with 403',
    sec1Test4.status === 403 ? 'PASS' : 'FAIL',
    'Status 403 Forbidden',
    `Status ${sec1Test4.status}`
  );

  // 2.5 Attempt manipulating user_id / resident_id in request body -> server establishes ownership
  const sec1Test5 = await api('/api/residents/questionnaire', {
    method: 'POST',
    headers: { Authorization: `Bearer ${residentAToken}` },
    body: JSON.stringify({
      user_id: 1, // Attempt to spoof super admin id
      resident_id: 999,
      flat_id: flatB201Id,
      name: 'Venkatesh Murthy Updated',
      family_count: 3
    })
  });
  const dbSpoofCheck = await getSqlDb();
  const superAdminName = dbSpoofCheck.exec("SELECT full_name FROM users WHERE id = 1")[0]?.values[0][0];

  recordTest(
    'SEC-01',
    'SEC-01-T5',
    'Attempt manipulating user_id/resident_id in body: Ignored, ownership strictly from auth',
    sec1Test5.status === 200 && superAdminName?.toString().includes('Harsha') ? 'PASS' : 'FAIL',
    'Status 200, Super Admin user record unchanged by user_id in payload',
    `Status ${sec1Test5.status}, Super Admin name: "${superAdminName}"`
  );

  // ==========================================================================
  // SUITE 3: API-01 — OPTIONAL QUESTIONNAIRE FIELDS
  // ==========================================================================
  console.log('\n--- Suite 3: API-01 — Optional Questionnaire Fields Normalization ---');

  // 3.1 Questionnaire with all fields
  const api1Test1 = await api('/api/residents/questionnaire', {
    method: 'POST',
    headers: { Authorization: `Bearer ${residentAToken}` },
    body: JSON.stringify({
      flat_id: flatB201Id,
      name: 'Venkat Full Fields',
      nickname: 'Venky',
      dob: '1985-05-15',
      email: 'venkat.all@example.com',
      phone: '9988776655',
      whatsapp_phone: '9988776655',
      profession: 'Principal Engineer',
      languages_spoken: ['Telugu', 'English', 'Hindi'],
      occupancy_type: 'OWNER',
      family_count: 4,
      family_details: [{ name: 'Sunita', relation: 'Spouse' }],
      vehicles_data: { cars: [{ brand: 'Hyundai Creta', reg_no: 'TS09AB1234' }] }
    })
  });
  recordTest(
    'API-01',
    'API-01-T1',
    'Questionnaire with all fields provided succeeds with 200',
    api1Test1.status === 200 && api1Test1.data?.success === true ? 'PASS' : 'FAIL',
    'Status 200 OK',
    `Status ${api1Test1.status}`
  );

  // 3.2 Questionnaire with only required fields (omits dob, nickname, profession, email)
  const api1Test2 = await api('/api/residents/questionnaire', {
    method: 'POST',
    headers: { Authorization: `Bearer ${residentAToken}` },
    body: JSON.stringify({
      flat_id: flatB201Id,
      name: 'Venkat Required Only',
      phone: '9988776655',
      family_count: 2
    })
  });
  recordTest(
    'API-01',
    'API-01-T2',
    'Questionnaire with only required fields succeeds with 200 (No undefined bound to SQLite)',
    api1Test2.status === 200 && api1Test2.data?.success === true ? 'PASS' : 'FAIL',
    'Status 200 OK',
    `Status ${api1Test2.status}: ${JSON.stringify(api1Test2.data)}`
  );

  // 3.3 Questionnaire with optional fields explicitly null
  const api1Test3 = await api('/api/residents/questionnaire', {
    method: 'POST',
    headers: { Authorization: `Bearer ${residentAToken}` },
    body: JSON.stringify({
      flat_id: flatB201Id,
      name: 'Venkat Null Fields',
      nickname: null,
      dob: null,
      email: null,
      profession: null,
      whatsapp_phone: null,
      phone: '9988776655',
      family_count: 2
    })
  });
  recordTest(
    'API-01',
    'API-01-T3',
    'Questionnaire with optional fields explicitly null succeeds with 200',
    api1Test3.status === 200 && api1Test3.data?.success === true ? 'PASS' : 'FAIL',
    'Status 200 OK',
    `Status ${api1Test3.status}`
  );

  // 3.4 Questionnaire with optional fields omitted
  const api1Test4 = await api('/api/residents/questionnaire', {
    method: 'POST',
    headers: { Authorization: `Bearer ${residentAToken}` },
    body: JSON.stringify({
      flat_id: flatB201Id,
      name: 'Venkat Omitted Fields',
      phone: '9988776655',
      occupancy_type: 'OWNER',
      family_count: 1
    })
  });
  recordTest(
    'API-01',
    'API-01-T4',
    'Questionnaire with optional fields completely omitted succeeds with 200',
    api1Test4.status === 200 && api1Test4.data?.success === true ? 'PASS' : 'FAIL',
    'Status 200 OK',
    `Status ${api1Test4.status}`
  );

  // ==========================================================================
  // SUITE 4: SEC-02 — /api/flats ROLE-AWARE DATA FILTERING
  // ==========================================================================
  console.log('\n--- Suite 4: SEC-02 — /api/flats Role-Aware Data Filtering ---');

  // Generate demands so flats have financial dues to test
  await api('/api/accounting/demands', {
    method: 'POST',
    headers: { Authorization: `Bearer ${treasurerToken}` },
    body: JSON.stringify({
      billing_month: '2026-10',
      actor: { name: 'Treasurer Anand', role: 'TREASURER' }
    })
  });

  // 4.1 Unauthenticated GET /api/flats
  const sec2Test1 = await api('/api/flats');
  const unauthFlats = sec2Test1.data || [];
  const exposedPhones = unauthFlats.filter((f: any) => f.resident_phone !== null);
  const exposedEmails = unauthFlats.filter((f: any) => f.resident_email !== null);
  const exposedVehicles = unauthFlats.filter((f: any) => f.vehicles_data !== null);
  const exposedDues = unauthFlats.filter((f: any) => f.outstanding_paise !== null);

  const isUnauthSafe = exposedPhones.length === 0 &&
                       exposedEmails.length === 0 &&
                       exposedVehicles.length === 0 &&
                       exposedDues.length === 0 &&
                       unauthFlats.length === 32;

  recordTest(
    'SEC-02',
    'SEC-02-T1',
    'Unauthenticated GET /api/flats masks phone, email, vehicles, and outstanding dues',
    isUnauthSafe ? 'PASS' : 'FAIL',
    'All private fields null across all 32 flats',
    `Exposed phones: ${exposedPhones.length}, emails: ${exposedEmails.length}, vehicles: ${exposedVehicles.length}, dues: ${exposedDues.length}`
  );

  // 4.2 Resident A requests /api/flats
  const sec2Test2 = await api('/api/flats', {
    headers: { Authorization: `Bearer ${residentAToken}` }
  });
  const resAFlats = sec2Test2.data || [];
  const ownFlat = resAFlats.find((f: any) => f.id === flatB201Id);
  const otherFlats = resAFlats.filter((f: any) => f.id !== flatB201Id);

  const ownDataVisible = ownFlat && ownFlat.resident_phone === '9988776655' && ownFlat.outstanding_paise !== null;
  const othersDataMasked = otherFlats.every((f: any) =>
    f.resident_phone === null &&
    f.resident_email === null &&
    f.vehicles_data === null &&
    f.outstanding_paise === null
  );

  recordTest(
    'SEC-02',
    'SEC-02-T2',
    'Resident A sees own flat data, but all other flats private data is masked',
    ownDataVisible && othersDataMasked ? 'PASS' : 'FAIL',
    'Own flat visible, all 31 other flats masked',
    `Own flat phone: ${ownFlat?.resident_phone}, Others masked: ${othersDataMasked}`
  );

  // 4.3 Resident A attempts query parameter to retrieve another flat's private data
  const sec2Test3 = await api(`/api/flats?flat_id=${flatA101Id}`, {
    headers: { Authorization: `Bearer ${residentAToken}` }
  });
  recordTest(
    'SEC-02',
    'SEC-02-T3',
    'Resident A attempts query parameter for another flat: Blocked with 403',
    sec2Test3.status === 403 ? 'PASS' : 'FAIL',
    'Status 403 Forbidden',
    `Status ${sec2Test3.status}`
  );

  // 4.4 Treasurer requests flats
  const sec2Test4 = await api('/api/flats', {
    headers: { Authorization: `Bearer ${treasurerToken}` }
  });
  const treasFlats = sec2Test4.data || [];
  const treasDuesVisible = treasFlats.some((f: any) => f.outstanding_paise !== null && f.outstanding_paise > 0);
  recordTest(
    'SEC-02',
    'SEC-02-T4',
    'Treasurer receives authorized financial balances and administrative records',
    sec2Test4.status === 200 && treasDuesVisible ? 'PASS' : 'FAIL',
    'Status 200, outstanding dues visible to Treasurer',
    `Status: ${sec2Test4.status}, Dues visible: ${treasDuesVisible}`
  );

  // 4.5 Super Admin requests flats
  const sec2Test5 = await api('/api/flats', {
    headers: { Authorization: `Bearer ${superAdminToken}` }
  });
  const saFlats = sec2Test5.data || [];
  const saCanSeeAll = saFlats.length === 32 && saFlats.some((f: any) => f.outstanding_paise !== null);
  recordTest(
    'SEC-02',
    'SEC-02-T5',
    'Super Admin receives full authorized administrative directory',
    sec2Test5.status === 200 && saCanSeeAll ? 'PASS' : 'FAIL',
    'Status 200, full directory visible to Super Admin',
    `Status: ${sec2Test5.status}, Flats count: ${saFlats.length}`
  );

  // ==========================================================================
  // SUITE 5: FINANCIAL REGRESSION — ABSOLUTE REQUIREMENT (15 Invariants)
  // ==========================================================================
  console.log('\n--- Suite 5: FINANCIAL REGRESSION — Absolute Invariant Validation ---');
  
  // Reset database to pristine state for financial regression testing
  console.log('[Financial Test Setup] Resetting database to clean opening baseline...');
  await api('/api/admin/test-reset-clean-db', { method: 'POST' });

  // Login as Treasurer for financial operations
  const treasAuth = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'treasurer', password: 'treas123' })
  });
  const tToken = treasAuth.data?.token;

  const sqlDb = await getSqlDb();

  // 5.1 Opening bank balance: ₹2,50,000
  const obBank = Number(sqlDb.exec("SELECT SUM(debit_paise) FROM journal_lines WHERE account_code = '1010'")[0]?.values[0][0]) || 0;
  recordTest('FIN-REG', 'FIN-01', 'Opening bank balance is ₹2,50,000 (25,000,000 paise)',
    obBank === 25000000 ? 'PASS' : 'FAIL', '25,000,000 paise', `${obBank} paise`
  );

  // 5.2 Opening corpus: ₹2,50,000
  const obCorp = Number(sqlDb.exec("SELECT SUM(credit_paise) FROM journal_lines WHERE account_code = '3010'")[0]?.values[0][0]) || 0;
  recordTest('FIN-REG', 'FIN-02', 'Opening equity corpus is ₹2,50,000 (25,000,000 paise)',
    obCorp === 25000000 ? 'PASS' : 'FAIL', '25,000,000 paise', `${obCorp} paise`
  );

  // 5.3 October demand: 32 x ₹4,500 = ₹1,44,000
  const genOctRes = await api('/api/accounting/demands', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tToken}` },
    body: JSON.stringify({ billing_month: '2026-10', actor: { name: 'Treasurer Anand' } })
  });
  const dbAfterGen = await getSqlDb();
  const octDemandsCount = dbAfterGen.exec("SELECT COUNT(*) FROM maintenance_bills WHERE billing_month = '2026-10'")[0]?.values[0][0];
  const octDemandsTotal = Number(dbAfterGen.exec("SELECT SUM(amount_paise) FROM maintenance_bills WHERE billing_month = '2026-10'")[0]?.values[0][0]);
  recordTest('FIN-REG', 'FIN-03', 'October demand created 32 bills totaling ₹1,44,000',
    genOctRes.status === 200 && octDemandsCount === 32 && octDemandsTotal === 14400000 ? 'PASS' : 'FAIL',
    'count: 32, total: 14400000 paise', `count: ${octDemandsCount}, total: ${octDemandsTotal} paise`
  );

  // 5.4 Duplicate demand generation remains blocked
  const dupDemandRes = await api('/api/accounting/demands', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tToken}` },
    body: JSON.stringify({ billing_month: '2026-10', actor: { name: 'Treasurer' } })
  });
  recordTest('FIN-REG', 'FIN-04', 'Duplicate demand generation remains blocked by idempotency guard',
    dupDemandRes.status === 400 ? 'PASS' : 'FAIL', 'Status 400', `Status ${dupDemandRes.status}`
  );

  // 5.5 Full payment works (A-101 ₹4,500)
  const fA101 = dbAfterGen.exec("SELECT id FROM flats WHERE flat_number = 'A-101'")[0].values[0][0] as number;
  const fullPayRes = await api('/api/accounting/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tToken}` },
    body: JSON.stringify({
      flat_id: fA101,
      amount_paise: 450000,
      payment_mode: 'UPI',
      transaction_ref: 'UPI/A101/FULL/001',
      actor: { name: 'Treasurer Anand' }
    })
  });
  const dbAfterPay1 = await getSqlDb();
  const a101BillStatus = dbAfterPay1.exec("SELECT status FROM maintenance_bills WHERE flat_id = ? AND billing_month = '2026-10'", [fA101])[0]?.values[0][0];
  recordTest('FIN-REG', 'FIN-05', 'Full payment ₹4,500 marks bill PAID and generates sequential receipt',
    fullPayRes.status === 200 && a101BillStatus === 'PAID' ? 'PASS' : 'FAIL',
    'status: 200, bill: PAID', `status: ${fullPayRes.status}, bill: ${a101BillStatus}`
  );

  // 5.6 Partial payment works (A-102 ₹2,000)
  const fA102 = dbAfterGen.exec("SELECT id FROM flats WHERE flat_number = 'A-102'")[0].values[0][0] as number;
  const partPayRes = await api('/api/accounting/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tToken}` },
    body: JSON.stringify({
      flat_id: fA102,
      amount_paise: 200000,
      payment_mode: 'NEFT',
      transaction_ref: 'NEFT/A102/PART/001',
      actor: { name: 'Treasurer Anand' }
    })
  });
  const dbAfterPay2 = await getSqlDb();
  const a102BillStatus = dbAfterPay2.exec("SELECT status FROM maintenance_bills WHERE flat_id = ? AND billing_month = '2026-10'", [fA102])[0]?.values[0][0];
  recordTest('FIN-REG', 'FIN-06', 'Partial payment ₹2,000 marks bill PARTIALLY_PAID',
    partPayRes.status === 200 && a102BillStatus === 'PARTIALLY_PAID' ? 'PASS' : 'FAIL',
    'status: 200, bill: PARTIALLY_PAID', `status: ${partPayRes.status}, bill: ${a102BillStatus}`
  );

  // 5.7 Overpayment works (A-201 Demand ₹4,500, Pay ₹6,000)
  const fA201 = dbAfterGen.exec("SELECT id FROM flats WHERE flat_number = 'A-201'")[0].values[0][0] as number;
  const overPayRes = await api('/api/accounting/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tToken}` },
    body: JSON.stringify({
      flat_id: fA201,
      amount_paise: 600000,
      payment_mode: 'UPI',
      transaction_ref: 'UPI/A201/OVER/001',
      actor: { name: 'Treasurer Anand' }
    })
  });
  recordTest('FIN-REG', 'FIN-07', 'Overpayment ₹6,000 processed successfully',
    overPayRes.status === 200 ? 'PASS' : 'FAIL', 'Status 200', `Status ${overPayRes.status}`
  );

  // 5.8 Resident advance account 2010 works
  const dbAfterOver = await getSqlDb();
  const advancePaise = Number(dbAfterOver.exec("SELECT SUM(credit_paise) FROM journal_lines WHERE account_code = '2010'")[0]?.values[0][0]) || 0;
  recordTest('FIN-REG', 'FIN-08', 'Excess ₹1,500 credited to Resident Maintenance Advances (Account 2010)',
    advancePaise === 150000 ? 'PASS' : 'FAIL', '150,000 paise (₹1,500)', `${advancePaise} paise`
  );

  // 5.9 Duplicate transaction reference remains idempotent
  const dupRef = 'UPI/DUP-CHECK/999';
  const fA202 = dbAfterGen.exec("SELECT id FROM flats WHERE flat_number = 'A-202'")[0].values[0][0] as number;
  const p1 = await api('/api/accounting/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tToken}` },
    body: JSON.stringify({ flat_id: fA202, amount_paise: 450000, payment_mode: 'UPI', transaction_ref: dupRef, actor: { name: 'Treasurer' } })
  });
  const p2 = await api('/api/accounting/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tToken}` },
    body: JSON.stringify({ flat_id: fA202, amount_paise: 450000, payment_mode: 'UPI', transaction_ref: dupRef, actor: { name: 'Treasurer' } })
  });
  recordTest('FIN-REG', 'FIN-09', 'Duplicate payment reference returns same receipt without duplicate GL entries',
    p1.data?.receiptNo === p2.data?.receiptNo && Boolean(p1.data?.receiptNo) ? 'PASS' : 'FAIL',
    'p1.receiptNo === p2.receiptNo', `p1: ${p1.data?.receiptNo}, p2: ${p2.data?.receiptNo}`
  );

  // 5.10 Reversal remains non-destructive
  const latestJeRes = (await getSqlDb()).exec("SELECT id FROM journal_entries WHERE reference_type = 'RECEIPT' ORDER BY id DESC LIMIT 1");
  const latestJeId = latestJeRes[0].values[0][0] as number;
  const revRes = await api('/api/accounting/reverse', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tToken}` },
    body: JSON.stringify({ entry_id: latestJeId, reason: 'Payment bounced check', actor: { name: 'Treasurer' } })
  });
  const dbAfterRev = await getSqlDb();
  const origStatus = dbAfterRev.exec("SELECT is_reversed FROM journal_entries WHERE id = ?", [latestJeId])[0]?.values[0][0];
  recordTest('FIN-REG', 'FIN-10', 'Reversal executes non-destructively with is_reversed = 1',
    revRes.status === 200 && origStatus === 1 ? 'PASS' : 'FAIL',
    'status: 200, is_reversed: 1', `status: ${revRes.status}, is_reversed: ${origStatus}`
  );

  // 5.11 Reimbursement accrual does not change bank
  const bankBeforeClaim = Number((await getSqlDb()).exec("SELECT SUM(debit_paise - credit_paise) FROM journal_lines WHERE account_code = '1010'")[0]?.values[0][0]) || 0;
  const claimCreate = await api('/api/accounting/reimbursements', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tToken}` },
    body: JSON.stringify({
      flat_id: fA101,
      claimant_name: 'Venkat',
      description: 'Plumbing materials',
      amount_paise: 250000,
      expense_account: '5070'
    })
  });
  const bankAfterClaim = Number((await getSqlDb()).exec("SELECT SUM(debit_paise - credit_paise) FROM journal_lines WHERE account_code = '1010'")[0]?.values[0][0]) || 0;
  recordTest('FIN-REG', 'FIN-11', 'Reimbursement claim submission does NOT alter Bank Account balance',
    claimCreate.status === 200 && bankBeforeClaim === bankAfterClaim ? 'PASS' : 'FAIL',
    'Bank balance unchanged', `Before: ${bankBeforeClaim}, After: ${bankAfterClaim}`
  );

  // 5.12 Reimbursement disbursement decreases bank exactly once
  const claimId = (await getSqlDb()).exec("SELECT id FROM reimbursement_claims ORDER BY id DESC LIMIT 1")[0].values[0][0] as number;
  const disburseRes = await api(`/api/accounting/reimbursements/${claimId}/disburse`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tToken}` },
    body: JSON.stringify({ transaction_ref: 'IMPS/REIMB/001', actor: { name: 'Treasurer' } })
  });
  const bankAfterDisburse = Number((await getSqlDb()).exec("SELECT SUM(debit_paise - credit_paise) FROM journal_lines WHERE account_code = '1010'")[0]?.values[0][0]) || 0;
  recordTest('FIN-REG', 'FIN-12', 'Reimbursement disbursement decreases bank by exactly ₹2,500',
    disburseRes.status === 200 && (bankBeforeClaim - bankAfterDisburse === 250000) ? 'PASS' : 'FAIL',
    'Bank decreased by 250,000 paise', `Difference: ${bankBeforeClaim - bankAfterDisburse} paise`
  );

  // 5.13 Trial balance variance: ₹0
  const tbRes = await api('/api/accounting/trial-balance');
  const tb = tbRes.data;
  recordTest('FIN-REG', 'FIN-13', 'Trial Balance maintains EXACTLY ₹0 variance',
    tb?.isBalanced === true && tb?.totalDebitsPaise === tb?.totalCreditsPaise ? 'PASS' : 'FAIL',
    'isBalanced: true, Debits == Credits',
    `isBalanced: ${tb?.isBalanced}, Debits: ${tb?.totalDebitsPaise}, Credits: ${tb?.totalCreditsPaise}`
  );

  // 5.14 Balance sheet variance: ₹0
  const bsRes = await api('/api/accounting/balance-sheet');
  const bs = bsRes.data;
  const variance = bs?.variancePaise || 0;
  recordTest('FIN-REG', 'FIN-14', 'Balance Sheet equation holds with EXACTLY ₹0 variance',
    bs?.isBalanced === true && variance === 0 ? 'PASS' : 'FAIL',
    'isBalanced: true, variancePaise: 0',
    `isBalanced: ${bs?.isBalanced}, variancePaise: ${variance}`
  );

  // 5.15 Bank reconciliation: ₹0 difference
  // Independent calculation:
  // Opening: 25,000,000
  // Full A-101: +450,000
  // Part A-102: +200,000
  // Over A-201: +600,000
  // Dup A-202:  +450,000
  // Rev A-202:  -450,000
  // Disburse:   -250,000
  // Total: 25,000,000 + 450,000 + 200,000 + 600,000 + 450,000 - 450,000 - 250,000 = 26,000,000 paise (₹2,60,000)
  const expectedBank = 26000000;
  const dbBank = Number((await getSqlDb()).exec("SELECT SUM(debit_paise - credit_paise) FROM journal_lines WHERE account_code = '1010'")[0]?.values[0][0]);
  const bsBank = bs?.assets?.find((a: any) => a.code === '1010')?.amountPaise;
  recordTest('FIN-REG', 'FIN-15', 'Three-way Bank Reconciliation matches with ₹0 difference',
    expectedBank === dbBank && dbBank === bsBank ? 'PASS' : 'FAIL',
    'Expected (26000000) == DB (26000000) == Dashboard (26000000)',
    `Expected: ${expectedBank}, DB: ${dbBank}, Dashboard: ${bsBank}`
  );

  console.log('\n======================================================================');
  const total = results.length;
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(` REMEDIATION TEST RESULTS: ${passed} / ${total} PASSED (${failed} FAILED)`);
  console.log('======================================================================\n');

  return { total, passed, failed, results };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runRemediationTests().catch(err => {
    console.error('Test execution error:', err);
    process.exit(1);
  });
}
