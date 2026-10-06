const BASE_URL = 'http://localhost:59998';

async function testExtremeSaturation() {
    console.log("=== EXTREME CONCURRENCY BREAKING TEST (300, 500, 750 simultaneous workers) ===");
    const extremeSteps = [300, 500, 750];

    for (const concurrency of extremeSteps) {
        const totalRequests = concurrency * 2;
        const latencies = [];
        let success = 0;
        let errors = 0;
        const start = Date.now();

        const promises = Array.from({ length: totalRequests }, async () => {
            const reqStart = Date.now();
            try {
                const res = await fetch(`${BASE_URL}/health`);
                const dur = Date.now() - reqStart;
                latencies.push(dur);
                if (res.ok) success++;
                else errors++;
            } catch (err) {
                errors++;
                latencies.push(Date.now() - reqStart);
            }
        });

        await Promise.all(promises);
        const elapsed = Date.now() - start;
        latencies.sort((a, b) => a - b);
        const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
        const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
        const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
        const max = latencies[latencies.length - 1] || 0;
        const rps = (totalRequests / (elapsed / 1000)).toFixed(1);

        console.log(`\nConcurrency: ${concurrency} simultaneous connections (${totalRequests} total reqs)`);
        console.log(`  Completed in: ${elapsed} ms`);
        console.log(`  OK: ${success} | Errors/Dropped: ${errors}`);
        console.log(`  Throughput: ${rps} req/sec`);
        console.log(`  p50: ${p50} ms | p95: ${p95} ms | p99: ${p99} ms | Max: ${max} ms`);

        if (errors > 0 || p95 > 2000) {
            console.log(`  >>> INFLECTION POINT / SATURATION THRESHOLD REACHED AT CONCURRENCY ${concurrency} <<<`);
        }
    }
}

testExtremeSaturation();
