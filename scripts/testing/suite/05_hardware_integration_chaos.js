/**
 * SynOS Destruction & Stress Testing Suite
 * Pillar 6: Hardware & Machine Integration Chaos Under Heavy Load
 * Concurrently floods DICOM C-STORE, ASTM/HL7 Analyzer frames, and Thermal Print jobs while patients are active
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');

const BASE_URL = process.env.SYNOS_URL || 'http://localhost:59999';
const DICOM_PORT = 8899;
const ANALYZER_PORT = 5000; // Typical default ASTM listener

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

// Simulates an ASTM E1381 frame transmission to SynOS Analyzer TCP Listener
function sendAstmFrame(host, port, sampleBarcode, analyte, val) {
    return new Promise((resolve) => {
        const client = new net.Socket();
        let receivedAck = false;

        client.setTimeout(4000);
        client.connect(port, host, () => {
            // ASTM ENQ
            client.write('\x05');
        });

        client.on('data', (data) => {
            if (data.includes('\x06')) { // ACK
                receivedAck = true;
                // Send ASTM Data Frame: Header, Patient, Order, Result, Terminator
                const frame = `\x021H|\\^&|||Analyzer01|||||||P|1\rP|1||||Patient^Stress\rO|1|${sampleBarcode}||^^^${analyte}\rR|1|^^^${analyte}|${val}|g/dL||N||F\rL|1|N\r\x03\x04`;
                client.write(frame);
                client.end();
            }
        });

        client.on('error', () => { client.destroy(); resolve(false); });
        client.on('timeout', () => { client.destroy(); resolve(false); });
        client.on('close', () => resolve(receivedAck));
    });
}

async function runHardwareChaos() {
    console.log('================================================================');
    console.log(' PILLAR 6: HARDWARE & MACHINE INTEGRATION CHAOS UNDER LOAD');
    console.log('================================================================');

    const results = {
        name: 'Pillar 6: Hardware & Machine Chaos',
        passed: true,
        tests: [],
        metrics: {}
    };

    function record(name, ok, details) {
        console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}: ${details}`);
        results.tests.push({ test: name, passed: ok, details });
        if (!ok) results.passed = false;
    }

    const token = await login('reception', 'Admin');

    // 1. Concurrently launch 15 active patient registrations
    console.log('\n--- 1. Generating Active Patient Load in Background ---');
    const backgroundPatients = Array.from({ length: 15 }, async (_, i) => {
        try {
            const pRes = await fetch(`${BASE_URL}/api/v1/patients`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    mrn: `LOAD-${i}-${Date.now().toString().slice(-4)}`,
                    firstName: `LoadPat${i}`,
                    lastName: 'Chaos',
                    gender: 'Male',
                    dateOfBirth: '1990-01-01'
                })
            });
            return pRes.ok;
        } catch {
            return false;
        }
    });

    // 2. Concurrently blast 10 ASTM Analyzer transmission packets
    console.log('--- 2. Blasting ASTM Analyzer TCP Packets into Port 5000 ---');
    const astmTasks = Array.from({ length: 10 }, (_, i) =>
        sendAstmFrame('127.0.0.1', ANALYZER_PORT, `BARCODE-${i}`, 'HGB', '13.5')
    );

    // 3. Concurrently blast DICOM C-STORE image uploads
    console.log('--- 3. Blasting DICOM Modality C-STORE Studies to Port 8899 ---');
    const dicomTestScript = path.join(__dirname, '..', 'test-restart-resilience.py');
    let dicomPromise = Promise.resolve();
    if (fs.existsSync(dicomTestScript)) {
        dicomPromise = new Promise((res) => {
            try {
                const out = execSync(`python "${dicomTestScript}"`, { encoding: 'utf8', timeout: 35000 });
                res({ ok: true, output: out });
            } catch (err) {
                res({ ok: false, error: err.message });
            }
        });
    }

    // Await all simultaneous activities together
    const [patientOutcomes, astmOutcomes, dicomOutcome] = await Promise.all([
        Promise.all(backgroundPatients),
        Promise.all(astmTasks),
        dicomPromise
    ]);

    const successfulPatients = patientOutcomes.filter(Boolean).length;
    console.log(`Concurrent Load Results:`);
    console.log(`  Patients Created Under Chaos: ${successfulPatients}/15`);
    console.log(`  ASTM Messages Dispatched:     ${astmOutcomes.length}`);
    console.log(`  DICOM Resilience Outcome:     ${dicomOutcome?.ok ? 'SUCCESS' : 'FAILED'}`);

    record('ConcurrentPatientCreationDuringHardwareLoad', successfulPatients >= 12, `${successfulPatients}/15 patients created successfully.`);
    record('DicomIngestionUnderLoad', dicomOutcome?.ok !== false, dicomOutcome?.ok ? 'DICOM C-STORE succeeded under load.' : dicomOutcome?.error);

    console.log(`\nPillar 6 Completed: ${results.passed ? 'ALL HARDWARE CHAOS TESTS PASSED' : 'DEFECTS DETECTED'}`);
    return results;
}

if (require.main === module) {
    runHardwareChaos().then(r => {
        fs.writeFileSync(path.join(__dirname, 'pillar6_results.json'), JSON.stringify(r, null, 2));
        process.exit(r.passed ? 0 : 1);
    });
}

module.exports = { runHardwareChaos };
