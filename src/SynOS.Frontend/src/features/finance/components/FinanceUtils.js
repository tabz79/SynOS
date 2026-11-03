/**
 * Finance Utility Functions
 */

export const FinanceUtils = {
    formatCurrency: (amount, currency = 'INR') => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0
        }).format(amount);
    },

    mapRevenueSource: (source) => {
        const mapping = {
            'Patient': 'Walk-In Patient',
            'Corporate': 'Corporate Account',
            'Insurance': 'Insurance Panel',
            'Partner': 'B2B Partner',
            'Other': 'Miscellaneous'
        };
        return mapping[source] || source;
    },

    mapPaymentMode: (mode) => {
        const mapping = {
            'Cash': 'Physical Cash',
            'UPI': 'Digital (UPI)',
            'Card': 'Debit/Credit Card',
            'BankTransfer': 'Net Banking/NEFT',
            'Other': 'Other Mode'
        };
        return mapping[mode] || mode;
    },

    getAgingCategory: (date) => {
        const days = Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60 * 24));
        if (days <= 7) return '0-7 Days';
        if (days <= 30) return '8-30 Days';
        return '30+ Days (Overdue)';
    },

    getAgingColor: (date) => {
        const days = Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60 * 24));
        if (days <= 7) return 'text-emerald-500';
        if (days <= 30) return 'text-amber-500';
        return 'text-rose-500';
    }
};

/**
 * Enterprise-grade Canonical OG Bill Number Generator
 * Standard clinical format: ${BranchToken}-${YYMMDD} e.g. MAI004-261103
 */
export const formatCanonicalBillNo = (bill) => {
    if (!bill) return 'MAI000-000000';

    // If already in MAI001-261102 format (letters + digits - digits), return as is
    if (bill.billNumber && /^[A-Za-z]{2,5}\d{3,4}-\d{6}$/.test(bill.billNumber)) {
        return bill.billNumber;
    }
    if (bill.canonicalBillNo && /^[A-Za-z]{2,5}\d{3,4}-\d{6}$/.test(bill.canonicalBillNo)) {
        return bill.canonicalBillNo;
    }

    // Extract raw token
    const rawToken = bill.token || bill.visitToken || bill.tokenNumber || '';
    let cleanToken = rawToken ? rawToken.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';

    // If token starts with D (draft), don't falsely mask it
    if (!cleanToken) {
        const bCode = (bill.branchCode || bill.branchName || 'MAI').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'MAI';
        cleanToken = `${bCode}000`;
    }

    // Extract YYMMDD from date
    let dateStr = '';
    const dateVal = bill.occurredAt || bill.date || bill.createdAt || bill.tokenDate;
    if (dateVal) {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) {
            const yy = String(d.getFullYear()).slice(-2);
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            dateStr = `${yy}${mm}${dd}`;
        }
    }
    if (!dateStr) {
        const now = new Date();
        dateStr = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    }

    return `${cleanToken}-${dateStr}`;
};

/**
 * Authoritative Client-Side Temporal Filter
 * Strictly validates whether an entity's date falls within the selected preset
 */
export const isWithinTimeRange = (dateVal, preset = 'today', customDates = null) => {
    if (!dateVal) return false;
    const p = (preset || '').toLowerCase().trim();
    if (p === 'all' || p === 'all time') return true;

    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return false;

    const now = new Date();

    if (p === 'today') {
        return (
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth() &&
            d.getDate() === now.getDate()
        );
    }

    if (p === 'yesterday') {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        return (
            d.getFullYear() === yesterday.getFullYear() &&
            d.getMonth() === yesterday.getMonth() &&
            d.getDate() === yesterday.getDate()
        );
    }

    if (p === 'week' || p === 'this week') {
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        const endOfToday = new Date(now);
        endOfToday.setHours(23, 59, 59, 999);
        return d >= sevenDaysAgo && d <= endOfToday;
    }

    if (p === 'month' || p === 'this month' || p === 'mtd') {
        return (
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth()
        );
    }

    if (p === 'quarter' || p === 'this quarter' || p.startsWith('q')) {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const dateQuarter = Math.floor(d.getMonth() / 3);
        return d.getFullYear() === now.getFullYear() && currentQuarter === dateQuarter;
    }

    if (p === 'year' || p === 'this year' || p === 'fy') {
        return d.getFullYear() === now.getFullYear();
    }

    if (p === 'custom') {
        if (!customDates || (!customDates.start && !customDates.end)) return true;
        const targetTime = d.getTime();
        if (customDates.start) {
            const start = new Date(customDates.start);
            start.setHours(0, 0, 0, 0);
            if (targetTime < start.getTime()) return false;
        }
        if (customDates.end) {
            const end = new Date(customDates.end);
            end.setHours(23, 59, 59, 999);
            if (targetTime > end.getTime()) return false;
        }
        return true;
    }

    return true;
};

/**
 * Universal Draft Detector
 */
export const isDraftEntity = (item) => {
    if (!item) return false;
    if (item.isDraft === true) return true;
    const token = String(item.token || item.visitToken || item.tokenNumber || '').trim().toUpperCase();
    if (token.startsWith('D-') || token.startsWith('D_') || /^D[0-9A-F]{8,}/i.test(token)) return true;
    const status = String(item.status || item.visitStatus || '').trim().toLowerCase();
    if (status === 'draft') return true;
    const billNo = String(item.billNumber || item.canonicalBillNo || '').trim().toUpperCase();
    if (billNo.startsWith('D-') || billNo.startsWith('DDF') || /^D[0-9A-F]{8,}/i.test(billNo) || /^D-?[0-9A-F]{8,}-\d{6}$/i.test(billNo)) return true;
    return false;
};

/**
 * Authoritative Receivable Status Evaluator (Zero Heuristic Leakage)
 * Deterministic Invariant: SettledAt != null OR BalanceDue <= 0 means Settled everywhere
 */
export const getReceivableStatus = (item) => {
    if (!item) return 'Pending';
    if (item.isSettled === true) return 'Settled';
    if (item.settledAt) return 'Settled';
    const total = Number(item.totalAmount ?? item.amount ?? 0);
    const paid = Number(item.paidAmount ?? item.amountReceived ?? 0);
    const due = item.balanceDue !== undefined && !isNaN(item.balanceDue) ? Number(item.balanceDue) : (total - paid);
    if (due <= 0.0001) return 'Settled';
    const rawStatus = String(item.status || item.paymentStatus || '').trim().toLowerCase();
    if (rawStatus === 'settled' || rawStatus === 'paid') return 'Settled';
    if (paid > 0 || rawStatus === 'partial') return 'Partial';
    return 'Pending';
};

export const isReceivableSettled = (item) => getReceivableStatus(item) === 'Settled';

export const getEffectiveBalanceDue = (item) => {
    if (!item || isReceivableSettled(item)) return 0;
    const total = Number(item.totalAmount ?? item.amount ?? 0);
    const paid = Number(item.paidAmount ?? item.amountReceived ?? 0);
    const due = item.balanceDue !== undefined && !isNaN(item.balanceDue) ? Number(item.balanceDue) : (total - paid);
    return Math.max(0, isNaN(due) ? 0 : due);
};

