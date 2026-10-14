import { FinanceApi } from '@/api/finance';

// In-memory cache for fast lookups
let cachedMappings = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60000; // 1 minute

export const DocumentRoutingService = {
    /**
     * Retrieves all system document slots and their active template mappings.
     */
    getMappings: async (forceRefresh = false) => {
        const now = Date.now();
        if (!forceRefresh && cachedMappings && (now - lastFetchTime < CACHE_TTL_MS)) {
            return cachedMappings;
        }

        try {
            const data = await FinanceApi.getDocumentMappings();
            if (Array.isArray(data)) {
                cachedMappings = data;
                lastFetchTime = now;
                return cachedMappings;
            }
        } catch (err) {
            console.warn("DocumentRoutingService: Using fallback defaults due to network error", err);
        }

        return cachedMappings || DocumentRoutingService.getDefaultMappings();
    },

    /**
     * Resolves the active mapping configuration for a specific feature trigger slot.
     */
    resolveSlot: async (slotId) => {
        const mappings = await DocumentRoutingService.getMappings();
        const slot = mappings.find(s => s.slotId === slotId);
        if (slot) return slot;

        // Fallback default
        const defaults = DocumentRoutingService.getDefaultMappings();
        return defaults.find(s => s.slotId === slotId) || defaults[0];
    },

    /**
     * Updates and saves the document mappings registry.
     */
    saveMappings: async (updatedMappings) => {
        await FinanceApi.saveDocumentMappings(updatedMappings);
        cachedMappings = updatedMappings;
        lastFetchTime = Date.now();
        return cachedMappings;
    },

    /**
     * Clear cached mappings.
     */
    clearCache: () => {
        cachedMappings = null;
        lastFetchTime = 0;
    },

    /**
     * System default slots.
     */
    getDefaultMappings: () => [
        {
            slotId: "patient_tax_invoice",
            module: "Reception & Billing",
            moduleCode: "reception",
            slotName: "Patient Tax Invoice (A4)",
            triggerDescription: "Patient checkout, Visit Billing, and Past Invoice reprint",
            assignedTemplateId: "template_patient_a4_modern",
            templateName: "Modern GST Tax Invoice (A4)",
            letterheadMode: "digital",
            topMarginMm: 40,
            enableUpiQr: true,
            enableBankDetails: true
        },
        {
            slotId: "patient_thermal_receipt",
            module: "Reception & Cash Desk",
            moduleCode: "reception",
            slotName: "Counter Quick Token / Cash Slip (80mm POS)",
            triggerDescription: "Rapid counter collection and cash token roll printer",
            assignedTemplateId: "template_thermal_pos_80mm",
            templateName: "Thermal 80mm Cash Slip",
            letterheadMode: "raw_thermal",
            topMarginMm: 0,
            enableUpiQr: true,
            enableBankDetails: false
        },
        {
            slotId: "partner_b2b_invoice",
            module: "Referral Terminal",
            moduleCode: "referral",
            slotName: "Partner B2B Diagnostic Service Invoice",
            triggerDescription: "Outsourced tests recovery from partner clinics and doctors",
            assignedTemplateId: "template_partner_b2b_a4",
            templateName: "B2B Diagnostic Tax Invoice (A4)",
            letterheadMode: "digital",
            topMarginMm: 40,
            enableUpiQr: true,
            enableBankDetails: true
        },
        {
            slotId: "referral_payout_voucher",
            module: "Referral Terminal",
            moduleCode: "referral",
            slotName: "Doctor Commission Payout Voucher",
            triggerDescription: "Referral fee disbursement and Section 194H TDS advice",
            assignedTemplateId: "template_referral_voucher_a4",
            templateName: "Doctor Commission Payout Voucher (A4)",
            letterheadMode: "digital",
            topMarginMm: 40,
            enableUpiQr: false,
            enableBankDetails: true
        },
        {
            slotId: "procurement_po",
            module: "Inventory & Procurement",
            moduleCode: "inventory",
            slotName: "Vendor Purchase Order (PO)",
            triggerDescription: "Lab reagent, consumable, and capital equipment ordering",
            assignedTemplateId: "template_procurement_po_a4",
            templateName: "Commercial Purchase Order (A4)",
            letterheadMode: "digital",
            topMarginMm: 40,
            enableUpiQr: false,
            enableBankDetails: true
        },
        {
            slotId: "procurement_grn",
            module: "Inventory & Stores",
            moduleCode: "inventory",
            slotName: "Goods Receipt Note (GRN)",
            triggerDescription: "Store intake receipt and delivery check-in acknowledgment",
            assignedTemplateId: "template_grn_a4",
            templateName: "Material Inward / GRN (A4)",
            letterheadMode: "digital",
            topMarginMm: 35,
            enableUpiQr: false,
            enableBankDetails: false
        },
        {
            slotId: "workforce_payslip",
            module: "Workforce & HR",
            moduleCode: "workforce",
            slotName: "Employee Monthly Salary Slip",
            triggerDescription: "Monthly payroll run and staff salary disbursement",
            assignedTemplateId: "template_payslip_a4",
            templateName: "Confidential Salary Pay Slip (A4)",
            letterheadMode: "digital",
            topMarginMm: 40,
            enableUpiQr: false,
            enableBankDetails: true
        },
        {
            slotId: "overhead_expense_voucher",
            module: "Overheads & Expenses",
            moduleCode: "finance",
            slotName: "Petty Cash & Expense Payment Voucher",
            triggerDescription: "Daily operating expenses, maintenance, courier, utilities, and tea/coffee",
            assignedTemplateId: "template_expense_voucher_a4",
            templateName: "Payment & Debit Voucher (A5 / Half-Sheet)",
            letterheadMode: "digital",
            topMarginMm: 25,
            enableUpiQr: false,
            enableBankDetails: false
        }
    ]
};
