import { useAuth } from '@/context/AuthContext';

/**
 * Finance Terminal API Utility
 * Connects the Finance UI to the Hardened Truth Engine.
 */
export const FinanceApi = {
    getHeaders: () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    }),

    withBranchId: (url) => {
        const branchId = localStorage.getItem('activeBranchId');
        if (!branchId) return url;
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}branchId=${branchId}`;
    },

    /**
     * Fetches profitability summary from the Economics Intelligence Service.
     */
    getProfitabilitySummary: async (start, end) => {
        const url = `/api/v1/economics/profitability${start && end ? `?start=${start}&end=${end}` : ''}`;
        const response = await fetch(FinanceApi.withBranchId(url), {
            headers: FinanceApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load profitability summary");
        return response.json();
    },

    /**
     * Fetches historical revenue facts.
     */
    getRevenueHistory: async (start, end) => {
        const url = `/api/v1/economics/revenue-facts${start && end ? `?start=${start}&end=${end}` : ''}`;
        const response = await fetch(FinanceApi.withBranchId(url), {
            headers: FinanceApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load revenue history");
        return response.json();
    },

    /**
     * Fetches institutional/partner bills.
     */
    getFinanceBills: async () => {
        const response = await fetch(FinanceApi.withBranchId('/api/v1/finance/bills'), {
            headers: FinanceApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load finance bills");
        return response.json();
    },

    /**
     * Fetches vendor payables.
     */
    getVendorPayables: async () => {
        const response = await fetch(FinanceApi.withBranchId('/api/v1/Payables'), {
            headers: FinanceApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load vendor payables");
        return response.json();
    },

    settleVendorPayable: async (id, amount) => {
        const response = await fetch(`/api/v1/Payables/${id}/settle`, {
            method: 'PATCH',
            headers: FinanceApi.getHeaders(),
            body: JSON.stringify({ amount })
        });
        if (!response.ok) throw new Error("Failed to settle vendor payable");
        return response.json();
    },

    /**
     * Fetches overhead expenses/obligations.
     */
    getOverheadExpenses: async () => {
        const response = await fetch(FinanceApi.withBranchId('/api/v1/OverheadExpenses'), {
            headers: FinanceApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load overhead expenses");
        return response.json();
    },

    settleOverheadExpense: async (id, amount, paymentMethod = 'BankTransfer') => {
        const response = await fetch(`/api/v1/OverheadExpenses/${id}/settle`, {
            method: 'POST',
            headers: FinanceApi.getHeaders(),
            body: JSON.stringify({ amount, paymentMethod })
        });
        if (!response.ok) throw new Error("Failed to settle overhead expense");
        return response.json();
    },

    /**
     * Fetches outsourced test payables.
     */
    getOutsourcedPayables: async () => {
        const response = await fetch(FinanceApi.withBranchId('/api/v1/ReferencePayables'), {
            headers: FinanceApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load outsourced payables");
        return response.json();
    },

    settleOutsourcedPayable: async (id, amount) => {
        const response = await fetch(`/api/v1/ReferencePayables/${id}/settle`, {
            method: 'PATCH',
            headers: FinanceApi.getHeaders(),
            body: JSON.stringify({ amount })
        });
        if (!response.ok) throw new Error("Failed to settle outsourced payable");
        return response.json();
    },

    /**
     * Fetches pending partner receivables.
     */
    getReceivables: async () => {
        const response = await fetch(FinanceApi.withBranchId('/api/v1/receivables'), {
            headers: FinanceApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load receivables");
        return response.json();
    },

    settlePartnerReceivable: async (id, amount) => {
        const response = await fetch(`/api/settlements/receivable/${id}/settle`, {
            method: 'POST',
            headers: FinanceApi.getHeaders(),
            body: JSON.stringify({ amount })
        });
        if (!response.ok) throw new Error("Failed to settle receivable");
        return response.json();
    },

    /**
     * Fetches referral commission payables.
     */
    getReferralPayables: async () => {
        const response = await fetch(FinanceApi.withBranchId('/api/v1/Economics/referral-payables'), {
            headers: FinanceApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load referral payables");
        return response.json();
    },

    settleReferralPayable: async (id, amount) => {
        const response = await fetch(`/api/settlements/referral-payable/${id}/settle`, {
            method: 'POST',
            headers: FinanceApi.getHeaders(),
            body: JSON.stringify({ amount })
        });
        if (!response.ok) throw new Error("Failed to settle referral payout");
        return response.json();
    },

    /**
     * Fetches referral partners registry.
     */
    getReferralPartners: async () => {
        const response = await fetch(FinanceApi.withBranchId('/api/v1/admin/referral-partners'), {
            headers: FinanceApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load referral partners");
        return response.json();
    },

    /**
     * Fetches referral commission rules.
     */
    getReferralRules: async () => {
        const response = await fetch(FinanceApi.withBranchId('/api/v1/admin/referral-commission-rules'), {
            headers: FinanceApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load referral rules");
        return response.json();
    }
};
