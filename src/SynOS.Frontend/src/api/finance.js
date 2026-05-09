import { useAuth } from '@/context/AuthContext';

/**
 * Finance Terminal API Utility
 * Connects the Finance UI to the Hardened Truth Engine.
 */
export const FinanceApi = {
    getHeaders: () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}`
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

    getPartnerReceivablesSummary: async () => {
        const response = await fetch(FinanceApi.withBranchId('/api/v1/economics/partner-receivables-summary'), {
            headers: FinanceApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load partner summary");
        return response.json();
    },

    getRevenueTrends: async (days = 30) => {
        const url = `/api/v1/economics/trends?days=${days}`;
        const response = await fetch(FinanceApi.withBranchId(url), {
            headers: FinanceApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load revenue trends");
        return response.json();
    },

    settleBulkPartnerReceivables: async (partnerId, factIds, totalAmount, paymentMode) => {
        const response = await fetch('/api/settlements/receivable/bulk', {
            method: 'POST',
            headers: FinanceApi.getHeaders(),
            body: JSON.stringify({ partnerId, factIds, totalAmount, paymentMode })
        });
        if (!response.ok) throw new Error("Failed to process bulk settlement");
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
    },

    /**
     * EXPENSES (OPX) HARDENING
     */
    getExpenseFeed: async (start, end) => {
        const url = `/api/v1/economics/expense-facts${start && end ? `?start=${start}&end=${end}` : ''}`;
        const response = await fetch(FinanceApi.withBranchId(url), {
            headers: FinanceApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load expense feed");
        return response.json();
    },

    getVendorPayablesSummary: async () => {
        const response = await fetch(FinanceApi.withBranchId('/api/v1/Payables/summary'), {
            headers: FinanceApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load vendor liability summary");
        return response.json();
    },

    settleBulkVendorPayables: async (vendorId, amount, paymentMethod) => {
        const response = await fetch('/api/v1/Payables/bulk-settle', {
            method: 'POST',
            headers: FinanceApi.getHeaders(),
            body: JSON.stringify({ vendorId, amount, paymentMethod })
        });
        if (!response.ok) throw new Error("Failed to process bulk vendor settlement");
        return response.json();
    },

    recordDailyExpense: async (data) => {
        const response = await fetch('/api/v1/OverheadExpenses', {
            method: 'POST',
            headers: FinanceApi.getHeaders(),
            body: JSON.stringify({
                category: data.category,
                amount: data.amount,
                description: data.description,
                expenseDate: new Date().toISOString(),
                userId: localStorage.getItem('synos_user_id') || '00000000-0000-0000-0000-000000000000'
            })
        });
        if (!response.ok) throw new Error("Failed to record daily expense");
        
        const result = await response.json();
        
        // Immediately settle it to emit SpendFact (Daily Expense logic)
        await FinanceApi.settleOverheadExpense(result.overheadPayableId, data.amount, data.paymentMethod);
        
        return result;
    },

    getVendors: async () => {
        const response = await fetch('/api/v1/finance/Vendors', {
            headers: FinanceApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to fetch vendors");
        return response.json();
    },

    createVendor: async (data) => {
        const response = await fetch('/api/v1/finance/Vendors', {
            method: 'POST',
            headers: FinanceApi.getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const err = await response.text();
            throw new Error(err || "Failed to create vendor");
        }
        return response.json();
    },

    updateVendor: async (id, data) => {
        const response = await fetch(`/api/v1/finance/Vendors/${id}`, {
            method: 'PUT',
            headers: FinanceApi.getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error("Failed to update vendor");
        return true;
    }
};
