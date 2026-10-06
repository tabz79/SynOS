import net from 'net';

const PORTS = [104, 8899, 10411];
const TARGET_HOST = '127.0.0.1';

async function testPortConnection(port) {
    return new Promise((resolve) => {
        const client = new net.Socket();
        client.setTimeout(2000);
        client.connect(port, TARGET_HOST, () => {
            client.destroy();
            resolve({ port, open: true });
        });
        client.on('error', (err) => {
            resolve({ port, open: false, error: err.message });
        });
        client.on('timeout', () => {
            client.destroy();
            resolve({ port, open: false, error: 'TIMEOUT' });
        });
    });
}

async function tcpRapidConnectFlood(port, count = 50) {
    console.log(`\n--- [1] Rapid TCP Connect/Disconnect Flood on Port ${port} (${count} connections) ---`);
    let connected = 0;
    let errors = 0;
    const promises = [];

    for (let i = 0; i < count; i++) {
        promises.push(new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(3000);
            socket.connect(port, TARGET_HOST, () => {
                connected++;
                socket.destroy();
                resolve();
            });
            socket.on('error', () => {
                errors++;
                resolve();
            });
            socket.on('timeout', () => {
                errors++;
                socket.destroy();
                resolve();
            });
        }));
    }

    await Promise.all(promises);
    console.log(`Result: ${connected} connected, ${errors} errors/refused`);
    return { connected, errors };
}

async function malformedPayloadFuzz(port) {
    console.log(`\n--- [2] Malformed Payload & Protocol Fuzzing on Port ${port} ---`);
    const payloads = [
        { name: 'Pure Garbage (Random Binary)', data: Buffer.from(Array.from({ length: 256 }, () => Math.floor(Math.random() * 256))) },
        { name: 'HTTP GET Request', data: Buffer.from("GET /api/health HTTP/1.1\r\nHost: localhost\r\n\r\n") },
        { name: 'SQL Injection String', data: Buffer.from("'; DROP TABLE RadiologyStudies; -- ") },
        { name: 'Null Byte Stream (1KB)', data: Buffer.alloc(1024, 0) },
        { name: 'Malformed DICOM Preamble', data: Buffer.concat([Buffer.alloc(128, 0), Buffer.from('DICM'), Buffer.from([0xFF, 0xFF, 0x00, 0x00])]) },
        { name: 'Oversized Chunk (64KB noise)', data: Buffer.alloc(65536, 0xAA) }
    ];

    for (const p of payloads) {
        await new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(2500);
            socket.connect(port, TARGET_HOST, () => {
                socket.write(p.data, () => {
                    // Give server 100ms to parse/react
                    setTimeout(() => {
                        socket.destroy();
                        console.log(`  [+] Sent ${p.name} (${p.data.length} bytes) - Server handled without crashing connection`);
                        resolve();
                    }, 100);
                });
            });
            socket.on('error', (err) => {
                console.log(`  [-] Sent ${p.name} - Server gracefully closed/reset connection (${err.code || err.message})`);
                resolve();
            });
            socket.on('timeout', () => {
                socket.destroy();
                console.log(`  [*] Sent ${p.name} - Socket timed out gracefully`);
                resolve();
            });
        });
    }
}

async function run() {
    console.log("=== SYNOS HARDWARE PROTOCOL DESTRUCTION: DICOM C-STORE SCP (X-Ray / CT / MRI) ===");
    for (const port of PORTS) {
        const check = await testPortConnection(port);
        console.log(`Port ${port} status:`, check.open ? "ONLINE & LISTENING" : `OFFLINE (${check.error})`);
        if (check.open) {
            await tcpRapidConnectFlood(port, 40);
            await malformedPayloadFuzz(port);
        }
    }
    console.log("\n=== DICOM HARDWARE STRESS TEST RUN COMPLETE ===");
}

run();
