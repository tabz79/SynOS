/**
 * Multi-dimensional enterprise search matcher for Reception Action Queue.
 * Simultaneously evaluates:
 * - Token ID (e.g. "MRI-053", "053", "#053")
 * - Patient Name, Phone, MRN / UHID (with phonetic normalization e.g. Lakshmi <-> Laxmi, CH.LAXMI <-> Laxmi)
 * - Bill Number (short bill no, canonical bill no)
 * - Payment Method & Partner (e.g. "Prepaid", "Surabhi", "Split", "Cash")
 * - Operational & Clinical Status (e.g. "Awaiting Scan", "Reporting", "Ready for Sample", "In Lab", "Completed")
 * - Investigation / Modality (e.g. "MRI LUMBAR SPINE", "CT BRAIN PLAIN", "Contrast")
 */

export function normalizeSearchTerm(str) {
    if (!str) return '';
    return String(str)
        .toLowerCase()
        .replace(/[.\-#/_\s]/g, '') // remove common separators: dots, dashes, slashes, hashes, underscores, spaces
        .replace(/ksh/g, 'x');       // phonetic alias: "lakshmi" -> "laxmi"
}

export function matchesActionQueueSearch(row, query) {
    if (!query || !query.trim()) return true;

    const cleanQuery = query.trim().toLowerCase();
    const terms = cleanQuery.split(/\s+/).filter(Boolean);

    // Tests string extraction
    const testsStr = Array.isArray(row.testCodes)
        ? row.testCodes.join(' ')
        : (row.testCodes || '');

    const rawPool = [
        row.token || '',
        row.billNumber || '',
        row.patientName || '',
        row.patientAgeGender || '',
        row.paymentDisplay || '',
        row.paymentMethod || '',
        row.referrerName || '',
        row.operationalStatus || '',
        testsStr,
        row.patientPhone || '',
        row.mrn || '',
        row.uhid || ''
    ];

    const combinedRaw = rawPool.join(' ').toLowerCase();
    const combinedNorm = rawPool.map(normalizeSearchTerm).join(' ');

    return terms.every(term => {
        const normTerm = normalizeSearchTerm(term);

        // 1. Direct raw substring match
        if (combinedRaw.includes(term)) return true;

        // 2. Normalized match (handles punctuation like CH.LAXMI and phonetic aliases like Lakshmi)
        if (normTerm && combinedNorm.includes(normTerm)) return true;

        // 3. Partial numeric match for token digits (e.g. "53" matches "MRI-053")
        const termDigits = term.replace(/\D/g, '');
        if (termDigits && normalizeSearchTerm(row.token).includes(termDigits)) return true;

        return false;
    });
}
