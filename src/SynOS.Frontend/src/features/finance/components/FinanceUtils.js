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
