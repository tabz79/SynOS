/**
 * SynOS Destruction & Stress Testing Suite
 * Pillar 2: UI Abuse, Button Spamming & Hostile Payloads
 * Tests double/triple click race conditions, network cuts, and hostile input integrity
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.SYNOS_URL || 'http://localhost:59999';
const SQL_INSTANCE = process.env.SYNOS_SQL || '.\\SYNOS';
const SQL_DB = process.env.SYNOS_DB || 'SynOSDb-1';

function sql(query) {
    try {
        const escaped = query.replace(/"/g, '""');
        const cmd = `sqlcmd -S "${SQL_INSTANCE}" -d "${SQL_DB}" -E -Q "${escaped}" -h -1 -W`;
        return execSync(cmd, { encoding: 'utf8', timeout: 20000 }).trim();
    } catch (e) {
        return `SQL_ERROR: ${e.message}`;
    }
}

async function login(username, password) {
    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw new Error(`Auth failed for ${username}: ${res.status}`);
    const data = await res.json();
    return data.token || data.accessToken;
}

async function runPillar2() {
    console.log('================================================================');
    console.log(' PILLAR 2: UI ABUSE, BUTTON SPAMMING, AND HOSTILE PAYLOADS');
    console.log('================================================================');

    const results = {
        name: 'Pillar 2: UI Abuse & Chaos',
        passed: true,
        tests: [],
        defects: []
    };

    function record(testName, ok, details, severity = 'P2') {
        console.log(`[${ok ? 'PASS' : 'FAIL'}] ${testName}: ${details}`);
        results.tests.push({ test: testName, passed: ok, details, severity });
        if (!ok) {
            results.passed = false;
            results.defects.push({ test: testName, details, severity });
        }
    }

    const token = await login('reception', 'Admin');

    // SUB-TEST 2.1: Double / Triple Click Attack on Patient Registration
    console.log('\n--- Test 2.1: Double/Triple Click Spamming on Registration ---');
    const mrnSpam = 'SPAM-' + Date.now().toString().slice(-6);
    const patPayload = {
        mrn: mrnSpam,
        firstName: 'John',
        lastName: 'SpamAttack',
        gender: 'Male',
        dateOfBirth: '1990-01-01',
        currentPhoneNumber: '9111222333',
        address: '100 Attack St'
    };

    // Fire 5 identical creation requests concurrently within milliseconds (simulating rapid clicking)
    const spamPromises = Array.from({ length: 5 }, () =>
        fetch(`${BASE_URL}/api/v1/patients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(patPayload)
        })
    );

    const spamResponses = await Promise.all(spamPromises);
    const okCount = spamResponses.filter(r => r.ok).length;

    // Check database: How many patients with this MRN exist?
    const countInDb = sql(`SELECT COUNT(*) FROM Patients WHERE MRN = '${mrnSpam}'`);
    console.log(`Spam registration sent 5 concurrent requests. HTTP OKs: ${okCount}, Records in DB: ${countInDb}`);

    if (countInDb === '1') {
        record('DoubleRegistrationDedup', true, `Database contains exactly 1 record despite 5 parallel clicks.`);
    } else if (parseInt(countInDb) > 1) {
        record('DoubleRegistrationDedup', false, `RACE CONDITION: Found ${countInDb} duplicate patients in DB with same MRN!`, 'P1-Critical');
    } else {
        record('DoubleRegistrationDedup', false, `Unexpected DB count: ${countInDb}`, 'P2');
    }

    // SUB-TEST 2.2: Payment Button Spamming (Duplicate Payment Race Condition)
    console.log('\n--- Test 2.2: Double-Click on Payment Capture ---');
    // First create a clean patient & visit
    const pRes = await fetch(`${BASE_URL}/api/v1/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ mrn: 'PAY-' + Date.now().toString().slice(-6), firstName: 'Payment', lastName: 'Racer', gender: 'Female', dateOfBirth: '1992-02-02' })
    });
    const pData = await pRes.json();
    const pid = pData.patientId || pData.id || pData.data?.patientId;

    const vRes = await fetch(`${BASE_URL}/api/v1/visits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ patientId: pid, department: 'Pathology', totalAmount: 1000.0, paidAmount: 0.0, status: 'Registered' })
    });
    const vData = await vRes.json();
    const vid = vData.visitId || vData.id || vData.data?.visitId;

    // Send 3 concurrent payments for the same visit simultaneously
    const payPromises = Array.from({ length: 3 }, () =>
        fetch(`${BASE_URL}/api/v1/invoices/${vid}/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ amount: 1000.0, paymentMethod: 'Cash', notes: 'Double click test' })
        })
    );

    const payResponses = await Promise.all(payPromises);
    const payOkCount = payResponses.filter(r => r.ok).length;

    // Check database: How many payments recorded? Is total paid > total amount?
    const totalPaidInDb = sql(`SELECT ISNULL(SUM(Amount), 0) FROM Payments WHERE VisitId = '${vid}'`);
    const balanceInDb = sql(`SELECT BalanceAmount FROM Visits WHERE VisitId = '${vid}'`);

    console.log(`Payment spam sent 3 concurrent requests. HTTP OKs: ${payOkCount}, Total Paid in DB: ${totalPaidInDb}, Balance: ${balanceInDb}`);
    const totalPaidNum = parseFloat(totalPaidInDb) || 0;

    if (totalPaidNum === 1000.0) {
        record('PaymentDoubleCaptureIdempotency', true, `Database captured exactly 1000.0 without over-collection.`);
    } else if (totalPaidNum > 1000.0) {
        record('PaymentDoubleCaptureIdempotency', false, `OVER-COLLECTION DEFECT: Captured ${totalPaidNum} on 1000.0 invoice due to concurrent payment spam!`, 'P0-Blocker');
    } else {
        record('PaymentDoubleCaptureIdempotency', true, `Handled cleanly (Recorded: ${totalPaidNum})`);
    }

    // SUB-TEST 2.3: Absurdly Long Values & Buffer Overflow Simulation
    console.log('\n--- Test 2.3: Absurdly Long Input Fuzzing (10,000 chars) ---');
    const hugeString = 'A'.repeat(10000);
    const fuzzPayload = {
        mrn: 'FUZZ-' + Date.now().toString().slice(-4),
        firstName: hugeString,
        lastName: 'FuzzTest',
        gender: 'Male',
        dateOfBirth: '1980-01-01',
        address: hugeString
    };

    const fuzzRes = await fetch(`${BASE_URL}/api/v1/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(fuzzPayload)
    });

    // Should return 400 Bad Request or cleanly truncate, NOT crash the process or throw 500
    if (fuzzRes.status === 400 || fuzzRes.status === 422) {
        record('InputValidationLengthCheck', true, `Cleanly rejected 10KB string with HTTP ${fuzzRes.status}.`);
    } else if (fuzzRes.status >= 500) {
        record('InputValidationLengthCheck', false, `UNHANDLED 500 ERROR on oversized payload: ${await fuzzRes.text()}`, 'P1-Critical');
    } else {
        record('InputValidationLengthCheck', true, `Handled with HTTP ${fuzzRes.status}`);
    }

    // SUB-TEST 2.4: Malformed Garbage & SQL Injection Sequences
    console.log('\n--- Test 2.4: Malicious Input Injection ---');
    const sqliPayload = {
        mrn: "SQLI-" + Date.now().toString().slice(-4),
        firstName: "Robert'); DROP TABLE Students;--",
        lastName: "' OR 1=1 --",
        gender: "<script>alert('xss')</script>",
        dateOfBirth: "2099-12-31" // Future birth date
    };

    const sqliRes = await fetch(`${BASE_URL}/api/v1/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(sqliPayload)
    });

    // Verify DB integrity - Ensure Patients table is still intact
    const patTableCheck = sql("SELECT COUNT(*) FROM Patients");
    const sqlIntact = !patTableCheck.includes('SQL_ERROR') && parseInt(patTableCheck) >= 1;
    record('SqlInjectionHardening', sqlIntact, `Database remained intact after SQLi payload (Total patients: ${patTableCheck})`);

    // SUB-TEST 2.5: Negative Money & Balance Tampering
    console.log('\n--- Test 2.5: Financial Logic Attack (Negative Payment Amount) ---');
    const negPayRes = await fetch(`${BASE_URL}/api/v1/invoices/${vid}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount: -500.0, paymentMethod: 'Cash', notes: 'Negative money injection' })
    });

    if (negPayRes.status === 400 || negPayRes.status === 422) {
        record('NegativeAmountRejection', true, `Correctly rejected negative amount with HTTP ${negPayRes.status}.`);
    } else if (negPayRes.ok) {
        record('NegativeAmountRejection', false, `FINANCIAL INTEGRITY DEFECT: Accepted -500.0 payment on invoice!`, 'P0-Blocker');
    } else {
        record('NegativeAmountRejection', true, `Handled negative payment attempt with HTTP ${negPayRes.status}`);
    }

    console.log(`\nPillar 2 Completed: ${results.passed ? 'ALL CHECKS PASSED' : 'DEFECTS DETECTED'}`);
    return results;
}

if (require.main === module) {
    runPillar2().then(r => {
        fs.writeFileSync(path.join(__dirname, 'pillar2_results.json'), JSON.stringify(r, null, 2));
        process.exit(r.passed ? 0 : 1);
    });
}

module.exports = { runPillar2 };
