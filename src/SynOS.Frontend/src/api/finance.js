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

    getReferenceLabs: async () => {
        const response = await fetch(FinanceApi.withBranchId('/api/v1/ReferencePayables/labs'), {
            headers: FinanceApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load reference labs");
        return response.json();
    },

    getPendingTestsForLab: async (labId) => {
        const response = await fetch(FinanceApi.withBranchId(`/api/v1/Outsourcing/labs/${labId}/pending-tests`), {
            headers: FinanceApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load pending tests");
        return response.json();
    },

    activateReferenceLab: async (labId) => {
        const response = await fetch(FinanceApi.withBranchId(`/api/v1/Outsourcing/labs/${labId}/activate`), {
            method: 'PATCH',
            headers: FinanceApi.getHeaders()
        });
        if (!response.ok) throw new Error("Activation failed");
        return response.json();
    },

    activateReferenceLabWithRates: async (labId, data) => {
        const response = await fetch(FinanceApi.withBranchId(`/api/v1/Outsourcing/labs/${labId}/activate-with-rates`), {
            method: 'POST',
            headers: FinanceApi.getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error("Batch activation with rates failed");
        return response.json();
    },

    getLabAuditLogs: async () => {
        const response = await fetch(FinanceApi.withBranchId('/api/v1/Outsourcing/labs/audit'), {
            headers: FinanceApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load audit logs");
        return response.json();
    },

    createDraftReferenceLab: async (data) => {
        const response = await fetch('/api/v1/Outsourcing/labs/draft', {
            method: 'POST',
            headers: FinanceApi.getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error("Failed to register reference lab draft");
        return response.json();
    },

    updateReferenceLab: async (id, data) => {
        const response = await fetch(`/api/v1/Outsourcing/labs/${id}`, {
            method: 'PUT',
            headers: FinanceApi.getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error("Failed to update reference lab");
        return response.json();
    },

    deleteReferenceLab: async (labId) => {
        const response = await fetch(`/api/v1/Outsourcing/labs/${labId}`, {
            method: 'DELETE',
            headers: FinanceApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to deactivate reference lab");
        return true;
    },

    addRateToLab: async (labId, data) => {
        const response = await fetch(`/api/v1/Outsourcing/labs/${labId}/rates`, {
            method: 'POST',
            headers: FinanceApi.getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error("Failed to add rate rule");
        return response.json();
    },

    getLabRates: async (labId) => {
        const response = await fetch(`/api/v1/Outsourcing/labs/${labId}/rates`, {
            headers: FinanceApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load lab rates");
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

    getPendingPricingPayables: async () => {
        const response = await fetch(FinanceApi.withBranchId('/api/v1/ReferencePayables/pending-pricing'), {
            headers: FinanceApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load pending pricing payables");
        return response.json();
    },

    resolvePricing: async (data) => {
        const response = await fetch('/api/v1/ReferencePayables/resolve-pricing', {
            method: 'POST',
            headers: FinanceApi.getHeaders(),
            body: JSON.stringify({
                ...data,
                userId: localStorage.getItem('synos_user_id') || '00000000-0000-0000-0000-000000000000'
            })
        });
        if (!response.ok) throw new Error("Failed to resolve pricing");
        return response.json();
    },

    getRateRules: async () => {
        const response = await fetch(FinanceApi.withBranchId('/api/v1/ReferencePayables/rules'), {
            headers: FinanceApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load rate rules");
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
        const response = await fetch(FinanceApi.withBranchId('/api/v1/economics/referral-payables'), {
            headers: FinanceApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load referral payables");
        return response.json();
    },

    getReferralSummary: async () => {
        const response = await fetch(FinanceApi.withBranchId('/api/v1/admin/referral-partners/summary'), {
            headers: FinanceApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load referral summary");
        return response.json();
    },

    settleReferralPayout: async (data) => {
        const response = await fetch('/api/v1/admin/referral-settle/payout', {
            method: 'POST',
            headers: FinanceApi.getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "Failed to settle referral payout");
        }
        return response.json();
    },

    settleReferralRecovery: async (data) => {
        const response = await fetch('/api/v1/admin/referral-settle/recovery', {
            method: 'POST',
            headers: FinanceApi.getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "Failed to settle referral recovery");
        }
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

    createReferralPartner: async (data) => {
        const response = await fetch('/api/v1/admin/referral-partners', {
            method: 'POST',
            headers: FinanceApi.getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error("Failed to create referral partner");
        return response.json();
    },

    createDraftPartner: async (data) => {
        const response = await fetch('/api/v1/admin/referral-partners/draft', {
            method: 'POST',
            headers: FinanceApi.getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error("Failed to create draft partner");
        return response.json();
    },

    updateReferralPartner: async (id, data) => {
        const response = await fetch(`/api/v1/admin/referral-partners/${id}`, {
            method: 'PUT',
            headers: FinanceApi.getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error("Failed to update referral partner");
        return response.json();
    },

    deactivateReferralPartner: async (id) => {
        const response = await fetch(`/api/v1/admin/referral-partners/${id}`, {
            method: 'DELETE',
            headers: FinanceApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to deactivate referral partner");
        return true;
    },

    approvePartner: async (id, commissionPercentage) => {
        const response = await fetch(`/api/v1/admin/referral-partners/${id}/approve`, {
            method: 'POST',
            headers: FinanceApi.getHeaders(),
            body: JSON.stringify({ commissionPercentage })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "Failed to approve partner");
        }
        return true;
    },

    getReferralRulesForPartner: async (partnerId) => {
        const response = await fetch(FinanceApi.withBranchId(`/api/v1/admin/referral-partners/${partnerId}/commission-rules`), {
            headers: FinanceApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load referral rules");
        return response.json();
    },

    createReferralRule: async (partnerId, data) => {
        const response = await fetch(`/api/v1/admin/referral-partners/${partnerId}/commission-rules`, {
            method: 'POST',
            headers: FinanceApi.getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error("Failed to create commission rule");
        return response.json();
    },

    deleteReferralRule: async (ruleId) => {
        const response = await fetch(`/api/v1/admin/commission-rules/${ruleId}`, {
            method: 'DELETE',
            headers: FinanceApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to delete commission rule");
        return true;
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

    getSettlementHistory: async () => {
        // We'll use a combined feed of SpendFacts and RevenueFacts with 'Referral' or 'Partner' source
        const response = await fetch(FinanceApi.withBranchId('/api/v1/economics/settlement-history?category=Referral'), {
            headers: FinanceApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load settlement history");
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
    },

    getTests: async () => {
        const response = await fetch('/api/v1/admin/tests', {
            headers: FinanceApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to fetch tests");
        return response.json();
    },

    getDepartments: async () => {
        const response = await fetch(FinanceApi.withBranchId('/api/v1/admin/operations/resources'), {
            headers: FinanceApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to fetch departments");
        return response.json();
    },

    createTest: async (data) => {
        const response = await fetch('/api/v1/admin/tests', {
            method: 'POST',
            headers: FinanceApi.getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error("Failed to create test in master catalog");
        return response.json();
    },

    /**
     * WORKFORCE & PAYROLL API
     */
    WorkforceApi: {
        // Staff Registry
        getStaff: async () => {
            const response = await fetch('/api/v1/staff', { headers: FinanceApi.getHeaders() });
            if (!response.ok) throw new Error("Failed to load staff members");
            return response.json();
        },
        createStaff: async (data) => {
            const response = await fetch('/api/v1/staff', {
                method: 'POST',
                headers: FinanceApi.getHeaders(),
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error("Failed to create staff member");
            return response.json();
        },
        updateStaff: async (id, data) => {
            const response = await fetch(`/api/v1/staff/${id}`, {
                method: 'PUT',
                headers: FinanceApi.getHeaders(),
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error("Failed to update staff member");
            return true;
        },
        deleteStaff: async (id) => {
            const response = await fetch(`/api/v1/staff/${id}`, {
                method: 'DELETE',
                headers: FinanceApi.getHeaders()
            });
            if (!response.ok) throw new Error("Failed to delete staff member");
            return true;
        },

        // Payroll Lifecycle
        getPeriods: async () => {
            const response = await fetch('/api/v1/payroll/periods', { headers: FinanceApi.getHeaders() });
            if (!response.ok) throw new Error("Failed to load payroll periods");
            return response.json();
        },
        createPeriod: async (data) => {
            const response = await fetch('/api/v1/payroll/periods', {
                method: 'POST',
                headers: FinanceApi.getHeaders(),
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error("Failed to create payroll period");
            return response.json();
        },
        getRuns: async () => {
            const response = await fetch('/api/v1/payroll/runs', { headers: FinanceApi.getHeaders() });
            if (!response.ok) throw new Error("Failed to load payroll runs");
            return response.json();
        },
        startRun: async (periodId) => {
            const response = await fetch('/api/v1/payroll/runs', {
                method: 'POST',
                headers: FinanceApi.getHeaders(),
                body: JSON.stringify({ payrollPeriodId: periodId })
            });
            if (!response.ok) throw new Error("Failed to start payroll run");
            return response.json();
        },
        calculateRun: async (runId) => {
            const response = await fetch(`/api/v1/payroll/runs/${runId}/calculate`, {
                method: 'POST',
                headers: FinanceApi.getHeaders()
            });
            if (!response.ok) throw new Error("Calculation failed");
            return response.json();
        },
        getRunReview: async (runId) => {
            const response = await fetch(`/api/v1/payroll/runs/${runId}/review`, { headers: FinanceApi.getHeaders() });
            if (!response.ok) throw new Error("Failed to load run review data");
            return response.json();
        },
        finalizeRun: async (runId) => {
            const response = await fetch(`/api/v1/payroll/runs/${runId}/finalize`, {
                method: 'POST',
                headers: FinanceApi.getHeaders()
            });
            if (!response.ok) throw new Error("Finalization failed");
            return response.json();
        },
        getRunPayables: async (runId) => {
            const response = await fetch(`/api/v1/payroll/runs/${runId}/payables`, { headers: FinanceApi.getHeaders() });
            if (!response.ok) throw new Error("Failed to load finalized payables");
            return response.json();
        },
        bulkSettleRun: async (runId, method = 0) => {
            const response = await fetch(`/api/v1/payroll/runs/${runId}/bulk-settle`, {
                method: 'POST',
                headers: FinanceApi.getHeaders(),
                body: JSON.stringify({ method })
            });
            if (!response.ok) throw new Error("Bulk settlement failed");
            return response.json();
        },

        // Admin (Advances, Statutory)
        getStatutoryConfigs: async () => {
            const response = await fetch('/api/v1/workforce-admin/statutory-configs', { headers: FinanceApi.getHeaders() });
            if (!response.ok) throw new Error("Failed to load statutory configs");
            return response.json();
        },
        updateStatutoryConfig: async (data) => {
            const response = await fetch('/api/v1/workforce-admin/statutory-configs', {
                method: 'POST',
                headers: FinanceApi.getHeaders(),
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error("Failed to update config");
            return response.json();
        },
        getPolicies: async () => {
            const response = await fetch('/api/v1/workforce-admin/policies', { headers: FinanceApi.getHeaders() });
            if (!response.ok) throw new Error("Failed to load workforce policies");
            return response.json();
        },
        updatePolicy: async (data) => {
            const response = await fetch('/api/v1/workforce-admin/policies', {
                method: 'POST',
                headers: FinanceApi.getHeaders(),
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error("Failed to update policy");
            return response.json();
        },
        syncQuotas: async (quota) => {
            const response = await fetch('/api/v1/workforce-admin/policies/sync-quotas', {
                method: 'POST',
                headers: FinanceApi.getHeaders(),
                body: JSON.stringify(quota)
            });
            if (!response.ok) throw new Error("Failed to sync quotas");
            return response.json();
        },
        getAdvances: async () => {
            const response = await fetch('/api/v1/workforce-admin/advances', { headers: FinanceApi.getHeaders() });
            if (!response.ok) throw new Error("Failed to load advances");
            return response.json();
        },
        requestAdvance: async (data) => {
            const response = await fetch('/api/v1/workforce-admin/advances', {
                method: 'POST',
                headers: FinanceApi.getHeaders(),
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error("Failed to record advance");
            return response.json();
        },
        approveAdvance: async (id) => {
            const response = await fetch(`/api/v1/workforce-admin/advances/${id}/approve`, {
                method: 'POST',
                headers: FinanceApi.getHeaders()
            });
            if (!response.ok) throw new Error("Failed to approve advance");
            return response.json();
        },

        // Attendance
        getAttendanceSummary: async (employeeId, month) => {
            const response = await fetch(`/api/v1/attendance/summary/${employeeId}?month=${month}`, { headers: FinanceApi.getHeaders() });
            if (!response.ok) throw new Error("Failed to load attendance summary");
            return response.json();
        },
        getAttendanceAudit: async (employeeId) => {
            const response = await fetch(`/api/v1/attendance/audit/${employeeId}`, { headers: FinanceApi.getHeaders() });
            if (!response.ok) throw new Error("Failed to load attendance audit");
            return response.json();
        },
        getImpactAnalysis: async (employeeId, start, end) => {
            const response = await fetch(`/api/v1/attendance/impact-analysis?employeeId=${employeeId}&start=${start}&end=${end}`, { headers: FinanceApi.getHeaders() });
            if (!response.ok) throw new Error("Impact analysis failed");
            return response.json();
        },
        getLopSummary: async (month) => {
            const response = await fetch(`/api/v1/attendance/lop-summary?month=${month}`, { headers: FinanceApi.getHeaders() });
            if (!response.ok) throw new Error("Failed to load LOP summary");
            return response.json();
        },
        getPendingLeaves: async () => {
            const response = await fetch('/api/v1/attendance/pending-leaves', { headers: FinanceApi.getHeaders() });
            if (!response.ok) throw new Error("Failed to load pending leaves");
            return response.json();
        },
        reviewLeave: async (data) => {
            const response = await fetch('/api/v1/attendance/review-leave', {
                method: 'POST',
                headers: FinanceApi.getHeaders(),
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error("Failed to review leave request");
            return true;
        },
        markException: async (data) => {
            const response = await fetch('/api/v1/attendance/exception', {
                method: 'POST',
                headers: FinanceApi.getHeaders(),
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error("Failed to mark exception");
            return true;
        },

        // Identity Provisioning
        getPendingAccess: async () => {
            const response = await fetch('/api/v1/staff/pending-access', { headers: FinanceApi.getHeaders() });
            if (!response.ok) throw new Error("Failed to load pending access list");
            return response.json();
        },
        provisionAccess: async (id, data) => {
            const response = await fetch(`/api/v1/staff/${id}/provision-access`, {
                method: 'POST',
                headers: FinanceApi.getHeaders(),
                body: JSON.stringify(data) // Includes username, email, password, roles
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || "Failed to provision login");
            }
            return response.json();
        },
        provisionSimplifiedAccess: async (employeeId, initialPassword) => {
            const response = await fetch('/api/v1/payroll/provision-access', {
                method: 'POST',
                headers: FinanceApi.getHeaders(),
                body: JSON.stringify({ employeeId, initialPassword })
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || "Failed to provision system access");
            }
            return response.json();
        },
        deactivateAccess: async (id) => {
            const response = await fetch(`/api/v1/staff/${id}/deactivate-access`, {
                method: 'PATCH',
                headers: FinanceApi.getHeaders()
            });
            if (!response.ok) throw new Error("Failed to deactivate access");
            return true;
        },
        reactivateAccess: async (id) => {
            const response = await fetch(`/api/v1/staff/${id}/reactivate-access`, {
                method: 'PATCH',
                headers: FinanceApi.getHeaders()
            });
            if (!response.ok) throw new Error("Failed to reactivate access");
            return true;
        },
        syncSeededUsers: async () => {
            // Migration Bridge (Dev Only)
            const response = await fetch('/api/v1/staff/sync-seeded-users', {
                method: 'POST',
                headers: FinanceApi.getHeaders()
            });
            if (!response.ok) throw new Error("Migration sync failed");
            return response.json();
        }
    }
};
