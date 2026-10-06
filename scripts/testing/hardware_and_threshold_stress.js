import http from 'http';

const BASE_URL = 'http://localhost:59998';

async function login(username, password) {
    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    return data.token || data.accessToken;
}

async function stressThermalBarcodeLabels(phleboToken, visitId, iterations = 50) {
    console.log(`\n===============================================================`);
    console.log(`[TEST 1] Thermal Barcode Label Spooler Stress (${iterations} concurrent jobs)`);
    console.log(`===============================================================`);

    const start = Date.now();
    let success = 0;
    let failed = 0;
    const latencies = [];

    const promises = Array.from({ length: iterations }, async (_, idx) => {
        const reqStart = Date.now();
        try {
            const res = await fetch(`${BASE_URL}/api/v1/phlebotomy/print-labels`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${phleboToken}`
                },
                body: JSON.stringify({ visitId })
            });
            const duration = Date.now() - reqStart;
            latencies.push(duration);
            if (res.ok) {
                success++;
            } else {
                failed++;
                const text = await res.text();
                if (idx < 3) console.log(`  Req #${idx + 1} Failed (${res.status}): ${text.substring(0, 100)}`);
            }
        } catch (err) {
            failed++;
            latencies.push(Date.now() - reqStart);
            if (idx < 3) console.log(`  Req #${idx + 1} Error: ${err.message}`);
        }
    });

    await Promise.all(promises);
    const totalTime = Date.now() - start;
    latencies.sort((a, b) => a - b);
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;

    console.log(`Summary:`);
    console.log(`  Total Requests: ${iterations}`);
    console.log(`  Success (200 OK): ${success}`);
    console.log(`  Failed: ${failed}`);
    console.log(`  Total Time: ${totalTime} ms`);
    console.log(`  Avg Latency: ${avg.toFixed(1)} ms`);
    console.log(`  p95 Latency: ${p95} ms`);
    console.log(`  Throughput: ${(iterations / (totalTime / 1000)).toFixed(1)} print-jobs/sec`);
    return { success, failed, avg, p95, throughput: iterations / (totalTime / 1000) };
}

async function stressThermalInvoicePrint(receptionToken, invoiceId, iterations = 50) {
    console.log(`\n===============================================================`);
    console.log(`[TEST 2] Thermal Invoice Receipt Print Stress (${iterations} concurrent jobs)`);
    console.log(`===============================================================`);

    const start = Date.now();
    let success = 0;
    let failed = 0;
    const latencies = [];

    const promises = Array.from({ length: iterations }, async (_, idx) => {
        const reqStart = Date.now();
        try {
            const res = await fetch(`${BASE_URL}/api/v1/invoices/${invoiceId}/print`, {
                headers: {
                    'Authorization': `Bearer ${receptionToken}`
                }
            });
            const duration = Date.now() - reqStart;
            latencies.push(duration);
            if (res.ok) {
                success++;
            } else {
                failed++;
            }
        } catch (err) {
            failed++;
            latencies.push(Date.now() - reqStart);
        }
    });

    await Promise.all(promises);
    const totalTime = Date.now() - start;
    latencies.sort((a, b) => a - b);
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;

    console.log(`Summary:`);
    console.log(`  Total Requests: ${iterations}`);
    console.log(`  Success: ${success}`);
    console.log(`  Failed: ${failed}`);
    console.log(`  Total Time: ${totalTime} ms`);
    console.log(`  Avg Latency: ${avg.toFixed(1)} ms`);
    console.log(`  p95 Latency: ${p95} ms`);
    console.log(`  Throughput: ${(iterations / (totalTime / 1000)).toFixed(1)} req/sec`);
    return { success, failed, avg, p95, throughput: iterations / (totalTime / 1000) };
}

async function stressSystemThreshold(token) {
    console.log(`\n===============================================================`);
    console.log(`[TEST 3] Stepped Concurrency Saturation & Breaking Threshold Test`);
    console.log(`===============================================================`);

    const concurrencySteps = [10, 25, 50, 100, 150, 200];
    const results = [];

    for (const concurrency of concurrencySteps) {
        const totalRequests = concurrency * 4;
        const latencies = [];
        let success = 0;
        let errors = 0;
        const start = Date.now();

        // Fire batches of `concurrency` in flight
        let completed = 0;
        while (completed < totalRequests) {
            const batchSize = Math.min(concurrency, totalRequests - completed);
            const batch = Array.from({ length: batchSize }, async () => {
                const reqStart = Date.now();
                try {
                    const res = await fetch(`${BASE_URL}/health`);
                    const dur = Date.now() - reqStart;
                    latencies.push(dur);
                    if (res.ok) success++;
                    else errors++;
                } catch (e) {
                    errors++;
                    latencies.push(Date.now() - reqStart);
                }
            });
            await Promise.all(batch);
            completed += batchSize;
        }

        const elapsed = Date.now() - start;
        latencies.sort((a, b) => a - b);
        const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
        const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
        const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
        const rps = (totalRequests / (elapsed / 1000)).toFixed(1);

        console.log(`Concurrency Level: ${concurrency} simultaneous workers`);
        console.log(`  Requests: ${totalRequests} | OK: ${success} | Err: ${errors}`);
        console.log(`  RPS: ${rps} req/sec | p50: ${p50}ms | p95: ${p95}ms | p99: ${p99}ms`);

        results.push({ concurrency, totalRequests, success, errors, rps, p50, p95, p99 });
        if (p95 > 1000 || errors > 0) {
            console.log(`  [!] Degraded or threshold hit at concurrency ${concurrency}!`);
        }
    }
    return results;
}

async function main() {
    try {
        console.log("Authenticating test roles...");
        const adminToken = await login('admin', 'admin123');
        const phleboToken = await login('phlebo', 'admin123');
        const receptionToken = await login('reception', 'Admin');

        const visitId = '8BAC3A83-0FDC-4FAD-83A7-59F8F11A9308';
        const invoiceId = '9F13E6A8-6BDC-443E-AF0A-9EA103186A25';

        // 1. Phlebotomy thermal label printer stress
        await stressThermalBarcodeLabels(phleboToken, visitId, 50);

        // 2. Reception invoice thermal print stress
        await stressThermalInvoicePrint(receptionToken, invoiceId, 50);

        // 3. System Concurrency & Breaking Threshold test
        await stressSystemThreshold(adminToken);

        console.log("\n===============================================================");
        console.log("ALL HARDWARE AND THRESHOLD STRESS TESTS COMPLETED");
        console.log("===============================================================");
    } catch (err) {
        console.error("FATAL ERROR IN STRESS RUN:", err);
    }
}

main();
