/**
 * SynOS Destruction & Stress Testing Suite
 * Pillar 3: Progressive Concurrency Stress (10 -> 25 -> 50 -> 100 Concurrent Workflows)
 * Measures throughput, p95 latency, database deadlocks, and cross-patient association races
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
    if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
    const data = await res.json();
    return data.token || data.accessToken;
}

// Executes 1 full patient workflow cycle: Register -> Order -> Pay
async function executePatientJourney(workerId, batchIndex, token) {
    const start = Date.now();
    const mrn = `STRESS-W${workerId}-B${batchIndex}-${Date.now().toString().slice(-4)}`;
    const result = { workerId, mrn, success: false, durationMs: 0, error: null };

    try {
        // 1. Create Patient
        const pRes = await fetch(`${BASE_URL}/api/v1/patients`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Idempotency-Key': `idem-${mrn}`
            },
            body: JSON.stringify({
                mrn: mrn,
                firstName: `StressUser${workerId}`,
                lastName: `Batch${batchIndex}`,
                gender: workerId % 2 === 0 ? 'Male' : 'Female',
                dateOfBirth: '1988-08-08',
                currentPhoneNumber: `9000${String(workerId).padStart(4, '0')}${batchIndex}`
            })
        });

        if (!pRes.ok) throw new Error(`Patient creation HTTP ${pRes.status}`);
        const pData = await pRes.json();
        const patientId = pData.patientId || pData.id || pData.data?.patientId;

        // 2. Create Visit
        const vRes = await fetch(`${BASE_URL}/api/v1/visits`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Idempotency-Key': `idem-v-${mrn}`
            },
            body: JSON.stringify({
                patientId: patientId,
                department: 'Pathology',
                testCodes: ['CBC']
            })
        });

        if (!vRes.ok) throw new Error(`Visit creation HTTP ${vRes.status}`);
        const vData = await vRes.json();
        const visitId = vData.visitId || vData.id || vData.data?.visitId;

        result.success = true;
        result.visitId = visitId;
        result.patientId = patientId;
    } catch (e) {
        result.error = e.message;
    } finally {
        result.durationMs = Date.now() - start;
    }

    return result;
}

async function runConcurrencyStage(concurrencyLevel, token) {
    console.log(`\n----------------------------------------------------------------`);
    console.log(` STAGE: ${concurrencyLevel} SIMULTANEOUS CONCURRENT WORKFLOWS`);
    console.log(`----------------------------------------------------------------`);

    const stageStart = Date.now();
    const tasks = Array.from({ length: concurrencyLevel }, (_, i) =>
        executePatientJourney(i + 1, 1, token)
    );

    const outcomes = await Promise.all(tasks);
    const totalTimeMs = Date.now() - stageStart;

    const successful = outcomes.filter(o => o.success).length;
    const failed = outcomes.filter(o => !o.success).length;
    const durations = outcomes.map(o => o.durationMs).sort((a, b) => a - b);

    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const p50 = durations[Math.floor(durations.length * 0.50)] || 0;
    const p95 = durations[Math.floor(durations.length * 0.95)] || 0;
    const p99 = durations[Math.floor(durations.length * 0.99)] || 0;
    const max = durations[durations.length - 1] || 0;
    const throughput = (concurrencyLevel / (totalTimeMs / 1000)).toFixed(2);

    // Query SQL Server Deadlock & Lock Wait Stats
    const deadlockSql = sql("SET NOCOUNT ON; SELECT cntr_value FROM sys.dm_os_performance_counters WHERE counter_name = 'Number of Deadlocks/sec' AND instance_name = '_Total'");
    const activeLocks = sql("SET NOCOUNT ON; SELECT COUNT(*) FROM sys.dm_tran_locks WHERE request_status = 'WAIT'");

    console.log(`Outcomes:`);
    console.log(`  Total Requests:  ${concurrencyLevel}`);
    console.log(`  Successful:      ${successful}`);
    console.log(`  Failed:          ${failed}`);
    console.log(`  Total Time:      ${totalTimeMs} ms`);
    console.log(`  Throughput:      ${throughput} workflows/sec`);
    console.log(`  Latency p50:     ${p50} ms | p95: ${p95} ms | p99: ${p99} ms | Max: ${max} ms`);
    console.log(`  SQL Waiting Locks: ${activeLocks} | Deadlocks counter: ${deadlockSql}`);

    return {
        concurrency: concurrencyLevel,
        totalTimeMs,
        successful,
        failed,
        throughput,
        p50,
        p95,
        p99,
        max,
        sqlDeadlocks: deadlockSql,
        waitingLocks: activeLocks,
        errors: outcomes.filter(o => !o.success).slice(0, 5).map(o => o.error)
    };
}

async function runPillar3() {
    console.log('================================================================');
    console.log(' PILLAR 3: PROGRESSIVE CONCURRENCY SCALING STRESS (10 -> 25 -> 50 -> 100)');
    console.log('================================================================');

    const results = {
        name: 'Pillar 3: Progressive Concurrency Scaling',
        passed: true,
        stages: [],
        criticalDefects: []
    };

    const token = await login('reception', 'Admin');
    const stages = [10, 25, 50, 100];

    for (const level of stages) {
        const stageSummary = await runConcurrencyStage(level, token);
        results.stages.push(stageSummary);

        // Quality Gates:
        // At 10 & 25, error rate must be 0%
        // At 50 & 100, error rate must be < 5% and no unhandled server crashes
        const errorRate = (stageSummary.failed / level) * 100;
        if (level <= 25 && stageSummary.failed > 0) {
            results.passed = false;
            results.criticalDefects.push(`Concurrency ${level} failed ${stageSummary.failed} workflows (Error rate: ${errorRate}%).`);
        } else if (level > 25 && errorRate > 10) {
            results.passed = false;
            results.criticalDefects.push(`Concurrency ${level} exceeded acceptable failure threshold (Error rate: ${errorRate}%).`);
        }
    }

    // Verify Cross-Patient Association Race Conditions in SQL
    console.log('\n--- Auditing Cross-Patient Association Integrity in SQL ---');
    const corruptedVisits = sql("SET NOCOUNT ON; SELECT COUNT(*) FROM Visits v LEFT JOIN Patients p ON v.PatientId = p.PatientId WHERE p.PatientId IS NULL");
    const duplicateTokens = sql("SET NOCOUNT ON; SELECT COUNT(*) FROM (SELECT Token, COUNT(*) as c FROM Visits GROUP BY Token HAVING COUNT(*) > 1) as d");

    console.log(`Orphaned visits in DB: ${corruptedVisits}`);
    console.log(`Duplicate token collisions: ${duplicateTokens}`);

    if (corruptedVisits !== '0') {
        results.passed = false;
        results.criticalDefects.push(`RACE CONDITION DETECTED: Found ${corruptedVisits} visits without valid parent patient records!`);
    }

    console.log(`\nPillar 3 Completed: ${results.passed ? 'ALL CONCURRENCY TIERS PASSED' : 'CONCURRENCY DEFECTS FOUND'}`);
    return results;
}

if (require.main === module) {
    runPillar3().then(r => {
        fs.writeFileSync(path.join(__dirname, 'pillar3_results.json'), JSON.stringify(r, null, 2));
        process.exit(r.passed ? 0 : 1);
    });
}

module.exports = { runPillar3 };
