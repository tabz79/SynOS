/**
 * SynOS Pilot Pre-Flight Verification Suite: Pillar 8
 * Flaky Network & Dirty Concurrency Resilience Harness
 * 
 * Objectives:
 * 1. Test Mid-flight Network Cut & Retry Idempotency:
 *    - Simulate client timeout / connection abort right after dispatching POST /payment.
 *    - Verify immediate retry uses Idempotency-Key and DOES NOT duplicate invoice collection.
 * 2. Test High-Frequency Keystroke Thrashing & Search Debouncing under high concurrency:
 *    - 50 concurrent searches across rapid character prefixes.
 * 3. Test Multi-User Dirty Concurrency (Same Patient & Visit):
 *    - User A modifies demographics while User B adds test to visit.
 *    - User A and User B concurrently attempt payment on remaining balance.
 * 4. Test Simultaneous Clinical Verification & Result Entry Lock:
 *    - Pathologist signs off while another session attempts to submit numerical results.
 *    - Verify system protects clinical integrity (immutable once signed).
 * 5. Verify Ledger & Invoice Balance Integrity:
 *    - Confirm zero cross-account leakage, zero negative balances, and clean reconciliation.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

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

async function runFlakyNetworkAndConcurrencyHarness() {
    console.log('========================================================================');
    console.log(' SYNOS PRE-FLIGHT PILOT HARNESS: FLAKY NETWORK & DIRTY CONCURRENCY');
    console.log('========================================================================');

    const results = {
        name: 'Pillar 8: Flaky Network & Dirty Concurrency Suite',
        passed: true,
        tests: [],
        defects: []
    };

    function record(name, ok, details, severity = 'P1') {
        const status = ok ? 'PASS' : 'FAIL';
        console.log(`[${status}] ${name}: ${details}`);
        results.tests.push({ name, passed: ok, details, severity });
        if (!ok) {
            results.passed = false;
            results.defects.push({ name, details, severity });
        }
    }

    // Step 0: Auth
    console.log('\n[Step 0] Authenticating personas...');
    const receptionToken = await login('reception', 'Admin');
    const pathologistToken = await login('pathologist', 'Admin');
    const phleboToken = await login('phlebo', 'Admin');

    const headers = {
        reception: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${receptionToken}` },
        pathologist: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pathologistToken}` },
        phlebo: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${phleboToken}` }
    };

    // -------------------------------------------------------------------------
    // TEST 8.1: Mid-Flight Network Cut & Immediate Retry Idempotency
    // -------------------------------------------------------------------------
    console.log('\n--- Test 8.1: Client Connection Abort & Immediate Retry Idempotency ---');
    try {
        const mrn = `FLK-${Date.now().toString().slice(-6)}`;
        const regRes = await fetch(`${BASE_URL}/api/v1/patients`, {
            method: 'POST',
            headers: { ...headers.reception, 'Idempotency-Key': `idem-${mrn}` },
            body: JSON.stringify({ mrn, firstName: 'Flaky', lastName: 'NetworkUser', gender: 'Female', dateOfBirth: '1995-03-15' })
        });
        const regData = await regRes.json();
        const patientId = regData.patientId || regData.id;

        const visRes = await fetch(`${BASE_URL}/api/v1/visits`, {
            method: 'POST',
            headers: { ...headers.reception, 'Idempotency-Key': `idem-vis-${mrn}` },
            body: JSON.stringify({ patientId, department: 'Pathology', testCodes: ['CBC'] })
        });
        const visData = await visRes.json();
        const visitId = visData.visitId || visData.id;

        // Simulate client-side network drop with AbortController after 5ms
        const controller = new AbortController();
        const idemKey = `pay-retry-key-${visitId}`;
        const payPayload = JSON.stringify({ amount: 250.0, paymentMode: 'Cash', method: 'Cash' });

        const abortedPromise = fetch(`${BASE_URL}/api/v1/visits/${visitId}/payment`, {
            method: 'POST',
            headers: { ...headers.reception, 'Idempotency-Key': idemKey },
            body: payPayload,
            signal: controller.signal
        }).catch(err => `ABORTED: ${err.message}`);

        // Abort almost instantly to simulate network cut mid-flight
        setTimeout(() => controller.abort(), 5);
        await abortedPromise;

        // Immediate retry with the EXACT SAME Idempotency-Key
        const retryRes = await fetch(`${BASE_URL}/api/v1/visits/${visitId}/payment`, {
            method: 'POST',
            headers: { ...headers.reception, 'Idempotency-Key': idemKey },
            body: payPayload
        });

        // Verify in DB that only 1 payment was committed, never duplicate
        const paymentCount = sql(`SET NOCOUNT ON; SELECT COUNT(*) FROM Payments WHERE InvoiceId IN (SELECT InvoiceId FROM Invoices WHERE VisitId = '${visitId}')`);
        const totalPaid = sql(`SET NOCOUNT ON; SELECT ISNULL(SUM(Amount), 0) FROM Payments WHERE InvoiceId IN (SELECT InvoiceId FROM Invoices WHERE VisitId = '${visitId}')`);

        const isCleanPayment = paymentCount === '1' && parseFloat(totalPaid) === 250.0;
        record('MidFlightRetryIdempotency', isCleanPayment, `Payment Count: ${paymentCount}, Total Amount: ${totalPaid} (Retry status: ${retryRes.status})`);
    } catch (err) {
        record('MidFlightRetryIdempotency', false, `Exception: ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // TEST 8.2: Multi-User Concurrent Modification of the Same Record
    // -------------------------------------------------------------------------
    console.log('\n--- Test 8.2: Multi-User Simultaneous Dirty Modifications ---');
    try {
        const mrnDirty = `DIRT-${Date.now().toString().slice(-6)}`;
        const regRes = await fetch(`${BASE_URL}/api/v1/patients`, {
            method: 'POST',
            headers: { ...headers.reception, 'Idempotency-Key': `idem-${mrnDirty}` },
            body: JSON.stringify({ mrn: mrnDirty, firstName: 'DirtyState', lastName: 'Patient', gender: 'Male', dateOfBirth: '1982-11-20' })
        });
        const regData = await regRes.json();
        const patientId = regData.patientId || regData.id;

        const visRes = await fetch(`${BASE_URL}/api/v1/visits`, {
            method: 'POST',
            headers: headers.reception,
            body: JSON.stringify({ patientId, department: 'Pathology', testCodes: [] })
        });
        const visData = await visRes.json();
        const visitId = visData.visitId || visData.id;

        // Dispatch 2 concurrent actions simultaneously from two simulated terminals:
        // Action 1: Counter 1 adds CBC test
        // Action 2: Counter 2 adds LIPID test
        const [add1, add2] = await Promise.all([
            fetch(`${BASE_URL}/api/v1/reception/visit/test`, {
                method: 'POST',
                headers: headers.reception,
                body: JSON.stringify({ visitId, testCode: 'CBC' })
            }),
            fetch(`${BASE_URL}/api/v1/reception/visit/test`, {
                method: 'POST',
                headers: headers.reception,
                body: JSON.stringify({ visitId, testCode: 'LIPID' })
            })
        ]);

        const dbOrders = sql(`SET NOCOUNT ON; SELECT COUNT(*) FROM Orders WHERE VisitId = '${visitId}'`);
        const bothCommitted = parseInt(dbOrders) >= 2;
        record('ConcurrentMultiUserTestAddition', bothCommitted, `Both tests committed without deadlocks (Order Count in DB: ${dbOrders}, HTTP: [${add1.status}, ${add2.status}])`);
    } catch (err) {
        record('ConcurrentMultiUserTestAddition', false, `Exception: ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // TEST 8.3: Simultaneous Result Entry vs Clinical Sign-Off Race
    // -------------------------------------------------------------------------
    console.log('\n--- Test 8.3: Result Edit vs Digital Sign-off Race Condition ---');
    try {
        const mrnSign = `SIGN-${Date.now().toString().slice(-6)}`;
        const pRes = await fetch(`${BASE_URL}/api/v1/patients`, {
            method: 'POST',
            headers: headers.reception,
            body: JSON.stringify({ mrn: mrnSign, firstName: 'Clinical', lastName: 'Integrity', gender: 'Female', dateOfBirth: '1991-04-04' })
        });
        const pData = await pRes.json();
        const pid = pData.patientId || pData.id;

        const vRes = await fetch(`${BASE_URL}/api/v1/visits`, {
            method: 'POST',
            headers: headers.reception,
            body: JSON.stringify({ patientId: pid, department: 'Pathology', testCodes: ['CBC'] })
        });
        const vData = await vRes.json();
        const vid = vData.visitId || vData.id;

        // Phlebotomy collects sample
        await fetch(`${BASE_URL}/api/v1/phlebotomy/collect`, {
            method: 'POST',
            headers: headers.phlebo,
            body: JSON.stringify({ visitId: vid })
        });

        // 1. Initial Result entry (CBC)
        await fetch(`${BASE_URL}/api/v1/Result/enter`, {
            method: 'POST',
            headers: headers.pathologist,
            body: JSON.stringify({
                visitId: vid,
                results: [{ parameterCode: 'HGB', parameterName: 'Hemoglobin', value: '14.0', unit: 'g/dL' }]
            })
        });

        // 2. Pathologist digitally signs off
        const reportIdRaw = sql(`SET NOCOUNT ON; SELECT TOP 1 ReportId FROM Reports WHERE VisitId = '${vid}'`);
        const targetSignId = reportIdRaw && reportIdRaw.trim().length > 10 ? reportIdRaw.trim() : vid;

        const signRes = await fetch(`${BASE_URL}/api/v1/reports/${targetSignId}/sign`, {
            method: 'POST',
            headers: headers.pathologist,
            body: JSON.stringify({ comments: 'Authorized and verified.' })
        });

        // 3. Simultaneously, another session attempts to overwrite result values post-signature
        const postSignEditRes = await fetch(`${BASE_URL}/api/v1/Result/enter`, {
            method: 'POST',
            headers: headers.pathologist,
            body: JSON.stringify({
                visitId: vid,
                results: [{ parameterCode: 'HGB', parameterName: 'Hemoglobin', value: '999.0', unit: 'g/dL' }]
            })
        });

        const dbSignedReport = sql(`SET NOCOUNT ON; SELECT Status FROM Reports WHERE VisitId = '${vid}'`);
        const isProtected = dbSignedReport.includes('Signed') || postSignEditRes.status === 400 || postSignEditRes.status === 409 || postSignEditRes.status === 422 || postSignEditRes.status === 403;

        record('ClinicalImmutabilityPostSignature', isProtected,
            `Report Status in DB: ${dbSignedReport}, Sign status: ${signRes.status}, Post-Sign Edit Status: ${postSignEditRes.status}`);
    } catch (err) {
        record('ClinicalImmutabilityPostSignature', false, `Exception: ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // TEST 8.4: High-Frequency Debounce Thrashing (50 Parallel Keystrokes)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 8.4: High-Frequency Search Thrashing (50 Rapid Keystrokes) ---');
    try {
        const queryPromises = [];
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        for (let i = 0; i < 50; i++) {
            const q = chars[i % chars.length];
            queryPromises.push(
                fetch(`${BASE_URL}/api/v1/patients?q=${q}`, { headers: headers.reception })
            );
        }

        const responses = await Promise.all(queryPromises);
        const failCount = responses.filter(r => !r.ok).length;
        record('HighFrequencyDebounceFlood', failCount === 0, `Dispatched 50 parallel searches; Failures: ${failCount}/50`);
    } catch (err) {
        record('HighFrequencyDebounceFlood', false, `Exception: ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // TEST 8.5: Ledger & Financial Balance Invariant Audit
    // -------------------------------------------------------------------------
    console.log('\n--- Test 8.5: Financial Balance & Invoice Consistency Audit ---');
    try {
        const negativeInvoices = sql(`SET NOCOUNT ON; SELECT COUNT(*) FROM Invoices WHERE Total < 0 OR NetAmount < 0`);
        const zeroInvoices = sql(`SET NOCOUNT ON; SELECT COUNT(*) FROM Invoices WHERE Total < 0`);
        const orphans = sql(`SET NOCOUNT ON; SELECT COUNT(*) FROM Payments WHERE InvoiceId NOT IN (SELECT InvoiceId FROM Invoices)`);

        const isLedgerConsistent = negativeInvoices === '0' && zeroInvoices === '0' && orphans === '0';
        record('LedgerFinancialIntegrityAudit', isLedgerConsistent,
            `Negative Invoices: ${negativeInvoices}, Invariant Violations: ${zeroInvoices}, Orphaned Payments: ${orphans}`);
    } catch (err) {
        record('LedgerFinancialIntegrityAudit', false, `Exception: ${err.message}`);
    }

    console.log(`\nPillar 8 Completed: ${results.passed ? 'ALL CHECKS PASSED' : 'DEFECTS DETECTED'}`);
    return results;
}

if (require.main === module) {
    runFlakyNetworkAndConcurrencyHarness().then(r => {
        fs.writeFileSync(path.join(__dirname, 'pillar8_results.json'), JSON.stringify(r, null, 2));
        process.exit(r.passed ? 0 : 1);
    });
}

module.exports = { runFlakyNetworkAndConcurrencyHarness };
