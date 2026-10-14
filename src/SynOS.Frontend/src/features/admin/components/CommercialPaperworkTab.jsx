import React, { useState, useEffect } from 'react';
import { 
    FileSpreadsheet, 
    Printer, 
    QrCode, 
    Building2, 
    CreditCard, 
    FileText, 
    Check, 
    Save, 
    RotateCcw, 
    Eye, 
    Sliders, 
    ShieldCheck, 
    AlertCircle, 
    Sparkles, 
    Receipt, 
    Send,
    ExternalLink,
    MapPin,
    Layers,
    ArrowRight,
    Workflow,
    Package,
    Users,
    DollarSign
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';
import { PatientTaxInvoiceA4 } from '@/features/finance/components/documents/PatientTaxInvoiceA4';
import { ThermalPosReceipt80mm } from '@/features/finance/components/documents/ThermalPosReceipt80mm';
import { PartnerClaimStatementA4 } from '@/features/finance/components/documents/PartnerClaimStatementA4';
import { ReferralPayoutVoucherA4 } from '@/features/finance/components/documents/ReferralPayoutVoucherA4';
import { ProcurementPurchaseOrderA4 } from '@/features/finance/components/documents/ProcurementPurchaseOrderA4';
import { WorkforcePaySlipA4 } from '@/features/finance/components/documents/WorkforcePaySlipA4';
import { PettyExpenseVoucherA4 } from '@/features/finance/components/documents/PettyExpenseVoucherA4';

export const CommercialPaperworkTab = () => {
    const [studioTab, setStudioTab] = useState('matrix'); // 'matrix' | 'profile'
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [moduleFilter, setModuleFilter] = useState('all');
    
    // Active Preview Slot (corresponds to slotId)
    const [previewSlotId, setPreviewSlotId] = useState('patient_tax_invoice');

    // Commercial Stationery Settings
    const [settings, setSettings] = useState({
        labLegalName: "SynOS Diagnostic Centre & Laboratory",
        labTradeName: "Advanced Pathology & Imaging Services",
        address: "Central Diagnostic Facility, Hyderabad, Telangana",
        phone: "+91 98765 43210",
        email: "billing@synoslab.in",
        website: "www.synoslab.in",
        gstin: "36AAAAA0000A1Z5",
        pan: "AAAAA0000A",
        bankName: "HDFC Bank",
        accountNumber: "50200012345678",
        ifscCode: "HDFC0001234",
        branch: "Main Branch, Hyderabad",
        accountHolderName: "SynOS Healthcare Diagnostic Services",
        upiId: "synoslab@hdfcbank",
        enableUpiQr: true,
        defaultLetterheadMode: "digital", // "digital" | "preprinted"
        topMarginMm: 40,
        bottomMarginMm: 15,
        termsAndConditions: "1. All disputes are subject to local jurisdiction.\n2. Payment terms: Due within 15 days of invoice date.\n3. In case of online payment, please mention invoice or statement reference number.\n4. Cheques are subject to realization.",
        referralTerms: "1. Referral incentives are credited strictly post patient bill realization.\n2. TDS @ 5% is deducted under Section 194H of Income Tax Act for annual payouts exceeding ₹15,000.\n3. In case of patient refund or cancellation, corresponding commission entries are reversed.",
        signatoryTitle: "Authorised Signatory / Accounts Desk"
    });

    // Document Mappings Registry
    const [mappings, setMappings] = useState([]);

    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async () => {
        try {
            setLoading(true);
            const [stationeryRes, mappingsRes] = await Promise.all([
                FinanceApi.getStationerySettings(),
                FinanceApi.getDocumentMappings()
            ]);

            if (stationeryRes && typeof stationeryRes === 'object') {
                setSettings(prev => ({ ...prev, ...stationeryRes }));
            }
            if (Array.isArray(mappingsRes)) {
                setMappings(mappingsRes);
            }
        } catch (err) {
            console.error("Failed to load paperwork data:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAll = async (e) => {
        if (e) e.preventDefault();
        try {
            setSaving(true);
            await Promise.all([
                FinanceApi.saveStationerySettings(settings),
                FinanceApi.saveDocumentMappings(mappings)
            ]);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 4000);
        } catch (err) {
            console.error("Failed to save paperwork settings:", err);
            alert("Error saving: " + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleSettingChange = (field, value) => {
        setSettings(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleMappingChange = (slotId, field, value) => {
        setMappings(prev => prev.map(slot => {
            if (slot.slotId === slotId) {
                return { ...slot, [field]: value };
            }
            return slot;
        }));
    };

    // Live Mock Lab Profile derived from settings
    const mockLabProfile = {
        labLegalName: settings.labLegalName,
        labTradeName: settings.labTradeName,
        address: settings.address,
        phone: settings.phone,
        email: settings.email,
        gstin: settings.gstin,
        pan: settings.pan,
        bankName: settings.bankName,
        accountNumber: settings.accountNumber,
        ifscCode: settings.ifscCode,
        branch: settings.branch,
        accountHolderName: settings.accountHolderName,
        upiId: settings.upiId,
        termsAndConditions: settings.termsAndConditions,
        signatoryTitle: settings.signatoryTitle,
        defaultLetterheadMode: settings.defaultLetterheadMode,
        topMarginMm: settings.topMarginMm,
        enableUpiQr: settings.enableUpiQr
    };

    // Active Slot Config
    const currentActiveSlot = mappings.find(s => s.slotId === previewSlotId) || {
        letterheadMode: settings.defaultLetterheadMode,
        topMarginMm: settings.topMarginMm,
        enableUpiQr: settings.enableUpiQr
    };

    // Available Templates Catalog
    const TEMPLATE_OPTIONS = {
        patient_tax_invoice: [
            { id: 'template_patient_a4_modern', label: 'Modern GST Tax Invoice (A4)' },
            { id: 'template_patient_a4_compact', label: 'Compact Single-Page Bill (A4)' },
            { id: 'template_patient_a4_detailed', label: 'Detailed Clinical Breakdown (A4)' }
        ],
        patient_thermal_receipt: [
            { id: 'template_thermal_pos_80mm', label: 'Thermal 80mm Standard Cash Slip' },
            { id: 'template_thermal_pos_58mm', label: 'Thermal 58mm Ultra-Compact Slip' }
        ],
        partner_b2b_invoice: [
            { id: 'template_partner_b2b_a4', label: 'B2B Diagnostic Tax Invoice (A4)' },
            { id: 'template_partner_b2b_consolidated', label: 'Monthly Consolidated Statement (A4)' }
        ],
        referral_payout_voucher: [
            { id: 'template_referral_voucher_a4', label: 'Doctor Commission Payout Voucher (A4)' },
            { id: 'template_referral_summary_slip', label: 'Direct Bank Remittance Advice (A4)' }
        ],
        procurement_po: [
            { id: 'template_procurement_po_a4', label: 'Commercial Purchase Order (A4)' },
            { id: 'template_procurement_po_reagent', label: 'Reagents & Cold-Chain PO (A4)' }
        ],
        procurement_grn: [
            { id: 'template_grn_a4', label: 'Material Inward / Goods Receipt Note (A4)' }
        ],
        workforce_payslip: [
            { id: 'template_payslip_a4', label: 'Confidential Salary Pay Slip (A4)' },
            { id: 'template_payslip_executive', label: 'Executive Compensation Advice (A4)' }
        ],
        overhead_expense_voucher: [
            { id: 'template_expense_voucher_a4', label: 'Payment & Debit Voucher (A5 / Half-Sheet)' },
            { id: 'template_expense_cash_slip', label: 'Petty Cash Slip (A4 Dual-Voucher)' }
        ]
    };

    // Filter Mappings
    const filteredMappings = mappings.filter(m => {
        if (moduleFilter === 'all') return true;
        return m.moduleCode === moduleFilter;
    });

    return (
        <div className="space-y-6 animate-fadeIn text-xs">
            {/* TOP HEADER & STUDIO CONTROLS */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b dark:border-zinc-800 border-zinc-200 pb-5">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-inner">
                        <FileSpreadsheet size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            Commercial Paperwork & Invoicing Studio
                            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider">
                                ERP Matrix
                            </span>
                        </h2>
                        <p className="text-zinc-500 text-xs">
                            Map specific paperwork templates to software features, configure legal profiles, bank remittance, and letterheads.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={loadAllData}
                        disabled={loading || saving}
                        className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 font-bold flex items-center gap-2 transition-all cursor-pointer"
                    >
                        <RotateCcw size={14} />
                        <span>Reload</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleSaveAll}
                        disabled={saving}
                        className="px-6 py-2.5 rounded-xl bg-synos-primary hover:bg-synos-primary/90 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-synos-primary/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                        {saving ? (
                            <>
                                <span className="animate-spin">⏳</span>
                                <span>Saving...</span>
                            </>
                        ) : saveSuccess ? (
                            <>
                                <Check size={16} className="text-emerald-300" />
                                <span>Saved Successfully!</span>
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                <span>Save All Changes</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* STUDIO SUB-TABS: MATRIX VS PROFILE */}
            <div className="flex items-center gap-3 border-b dark:border-zinc-800 border-zinc-200 pb-2">
                <button
                    type="button"
                    onClick={() => setStudioTab('matrix')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        studioTab === 'matrix'
                            ? 'bg-synos-primary text-white shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                    }`}
                >
                    <Workflow size={15} />
                    <span>Document Routing & Feature Mapping ({mappings.length} Slots)</span>
                </button>
                <button
                    type="button"
                    onClick={() => setStudioTab('profile')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        studioTab === 'profile'
                            ? 'bg-synos-primary text-white shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                    }`}
                >
                    <Building2 size={15} />
                    <span>Commercial Legal Profile & Remittance Gateway</span>
                </button>
            </div>

            {saveSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center gap-3 animate-in fade-in duration-300">
                    <Check size={18} className="shrink-0 text-emerald-500" />
                    <div>
                        <strong className="font-bold">Paperwork registry and commercial settings saved!</strong>
                        <p className="text-[11px] opacity-90">All features across SynOS (Reception, Referral Terminal, Stores, HR, Accounts) will now dynamically resolve these mapped templates.</p>
                    </div>
                </div>
            )}

            {/* DUAL-COLUMN STUDIO GRID */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                
                {/* LEFT COLUMN: ACTIVE VIEW (7 COLS) */}
                <div className="xl:col-span-7 space-y-6">

                    {/* VIEW A: DOCUMENT ROUTING & FEATURE MAPPING MATRIX */}
                    {studioTab === 'matrix' && (
                        <div className="space-y-4">
                            {/* MODULE FILTER BAR */}
                            <div className="flex flex-wrap items-center gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-900/60 rounded-2xl border dark:border-zinc-800 border-zinc-200">
                                {[
                                    { id: 'all', label: 'All ERP Modules' },
                                    { id: 'reception', label: '🏥 Reception & Cash' },
                                    { id: 'referral', label: '🤝 Referral Terminal' },
                                    { id: 'inventory', label: '📦 Stores & Orders' },
                                    { id: 'workforce', label: '👥 Workforce & HR' },
                                    { id: 'finance', label: '💼 Expense & Cash' }
                                ].map(mod => (
                                    <button
                                        key={mod.id}
                                        type="button"
                                        onClick={() => setModuleFilter(mod.id)}
                                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                                            moduleFilter === mod.id
                                                ? 'bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 shadow-sm'
                                                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                                        }`}
                                    >
                                        {mod.label}
                                    </button>
                                ))}
                            </div>

                            {/* SLOTS LIST CARDS */}
                            <div className="space-y-4">
                                {filteredMappings.map(slot => {
                                    const isSelectedForPreview = previewSlotId === slot.slotId;
                                    const availableOptions = TEMPLATE_OPTIONS[slot.slotId] || [
                                        { id: slot.assignedTemplateId, label: slot.templateName }
                                    ];

                                    return (
                                        <div 
                                            key={slot.slotId}
                                            className={`synos-dept-card rounded-2xl p-5 border transition-all ${
                                                isSelectedForPreview 
                                                    ? 'border-indigo-500 shadow-md bg-indigo-500/5 dark:bg-indigo-950/20' 
                                                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                                            }`}
                                        >
                                            {/* CARD HEADER */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b dark:border-zinc-800 border-zinc-200">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-[10px] font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                                                        {slot.module}
                                                    </span>
                                                    <h3 className="text-xs font-black text-zinc-900 dark:text-zinc-100">
                                                        {slot.slotName}
                                                    </h3>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => setPreviewSlotId(slot.slotId)}
                                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                                                        isSelectedForPreview
                                                            ? 'bg-indigo-600 text-white shadow-xs'
                                                            : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                                                    }`}
                                                >
                                                    <Eye size={12} />
                                                    <span>{isSelectedForPreview ? "Live Preview Active" : "Test Drive in Studio"}</span>
                                                </button>
                                            </div>

                                            {/* TRIGGER DESCRIPTION */}
                                            <p className="text-[11px] text-zinc-500 pt-2 pb-3 font-medium leading-relaxed">
                                                <strong className="text-zinc-700 dark:text-zinc-300 font-bold mr-1">Trigger Touchpoint:</strong>
                                                {slot.triggerDescription}
                                            </p>

                                            {/* CONFIGURATION CONTROLS */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-[11px]">
                                                {/* TEMPLATE PICKER */}
                                                <div>
                                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                                                        Assigned Paperwork Template
                                                    </label>
                                                    <select
                                                        value={slot.assignedTemplateId}
                                                        onChange={(e) => {
                                                            const opt = availableOptions.find(o => o.id === e.target.value);
                                                            handleMappingChange(slot.slotId, 'assignedTemplateId', e.target.value);
                                                            if (opt) handleMappingChange(slot.slotId, 'templateName', opt.label);
                                                        }}
                                                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-bold text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer"
                                                    >
                                                        {availableOptions.map(opt => (
                                                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* LETTERHEAD MODE PICKER */}
                                                <div>
                                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                                                        Letterhead Stationery Mode
                                                    </label>
                                                    <select
                                                        value={slot.letterheadMode}
                                                        onChange={(e) => handleMappingChange(slot.slotId, 'letterheadMode', e.target.value)}
                                                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-bold text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer"
                                                    >
                                                        <option value="digital">Digital Stationery (Full Printed Header)</option>
                                                        <option value="preprinted">Pre-Printed Letterhead (Blank Clearance Gap)</option>
                                                        {slot.slotId === 'patient_thermal_receipt' && (
                                                            <option value="raw_thermal">Direct POS Thermal (Roll Printer)</option>
                                                        )}
                                                    </select>
                                                </div>

                                                {/* MARGIN SLIDER (IF PREPRINTED) */}
                                                {slot.letterheadMode === 'preprinted' && (
                                                    <div className="sm:col-span-2 space-y-1.5 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                                                        <div className="flex justify-between items-center text-[10px]">
                                                            <span className="text-zinc-500 font-semibold">Top Letterhead Clearance Gap:</span>
                                                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{slot.topMarginMm || 40} mm</span>
                                                        </div>
                                                        <input
                                                            type="range"
                                                            min={0}
                                                            max={80}
                                                            step={5}
                                                            value={slot.topMarginMm || 40}
                                                            onChange={(e) => handleMappingChange(slot.slotId, 'topMarginMm', parseInt(e.target.value) || 0)}
                                                            className="w-full accent-indigo-600 cursor-pointer"
                                                        />
                                                    </div>
                                                )}

                                                {/* TOGGLES */}
                                                <div className="sm:col-span-2 flex flex-wrap items-center gap-4 pt-1 text-[11px]">
                                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                                        <input
                                                            type="checkbox"
                                                            checked={slot.enableUpiQr ?? false}
                                                            onChange={(e) => handleMappingChange(slot.slotId, 'enableUpiQr', e.target.checked)}
                                                            className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                        />
                                                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">Embed Dynamic UPI Payment QR</span>
                                                    </label>

                                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                                        <input
                                                            type="checkbox"
                                                            checked={slot.enableBankDetails ?? false}
                                                            onChange={(e) => handleMappingChange(slot.slotId, 'enableBankDetails', e.target.checked)}
                                                            className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                        />
                                                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">Include Bank Remittance Box</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* VIEW B: COMMERCIAL PROFILE & REMITTANCE */}
                    {studioTab === 'profile' && (
                        <div className="space-y-6">
                            {/* SECTION 1: LAB LEGAL PROFILE */}
                            <div className="synos-dept-card rounded-2xl p-6 space-y-5">
                                <div className="flex items-center justify-between border-b dark:border-zinc-800 border-zinc-200 pb-3">
                                    <div className="flex items-center gap-2.5">
                                        <Building2 size={16} className="text-indigo-600 dark:text-indigo-400" />
                                        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                                            1. Commercial Legal Entity & Contact Profile
                                        </h3>
                                    </div>
                                    <span className="text-[10px] text-zinc-400 font-semibold">Shared across all documents</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2">
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                            Legal Entity Registered Name (GSTIN Registered) *
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.labLegalName}
                                            onChange={(e) => handleSettingChange('labLegalName', e.target.value)}
                                            placeholder="e.g. SynOS Diagnostic Centre & Laboratory Pvt Ltd"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-bold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                            Trade Name / Sub-Header Tagline
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.labTradeName}
                                            onChange={(e) => handleSettingChange('labTradeName', e.target.value)}
                                            placeholder="e.g. Comprehensive Pathology, Digital Radiology & Medical Imaging"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                            GSTIN Number (15-Digit) *
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.gstin}
                                            onChange={(e) => handleSettingChange('gstin', e.target.value.toUpperCase())}
                                            maxLength={15}
                                            placeholder="36AAAAA0000A1Z5"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-mono font-bold text-zinc-900 dark:text-zinc-100 uppercase focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                            PAN Number (Permanent Account No.)
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.pan}
                                            onChange={(e) => handleSettingChange('pan', e.target.value.toUpperCase())}
                                            maxLength={10}
                                            placeholder="AAAAA0000A"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-mono font-bold text-zinc-900 dark:text-zinc-100 uppercase focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                            Registered Facility Address
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={settings.address}
                                            onChange={(e) => handleSettingChange('address', e.target.value)}
                                            placeholder="Full street address, district, state, PIN code"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                            Commercial Phone / Helpdesk
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.phone}
                                            onChange={(e) => handleSettingChange('phone', e.target.value)}
                                            placeholder="+91 98765 43210"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                            Billing & Accounts Email
                                        </label>
                                        <input
                                            type="email"
                                            value={settings.email}
                                            onChange={(e) => handleSettingChange('email', e.target.value)}
                                            placeholder="billing@synoslab.in"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: BANK REMITTANCE & UPI QR */}
                            <div className="synos-dept-card rounded-2xl p-6 space-y-5">
                                <div className="flex items-center justify-between border-b dark:border-zinc-800 border-zinc-200 pb-3">
                                    <div className="flex items-center gap-2.5">
                                        <CreditCard size={16} className="text-emerald-600 dark:text-emerald-400" />
                                        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                                            2. Bank Remittance & Dynamic UPI Payment Gateway
                                        </h3>
                                    </div>
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                        <QrCode size={12} /> Instant Bharat QR
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                            Bank Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.bankName}
                                            onChange={(e) => handleSettingChange('bankName', e.target.value)}
                                            placeholder="e.g. HDFC Bank, ICICI Bank"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-bold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                            Account Beneficiary Name
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.accountHolderName}
                                            onChange={(e) => handleSettingChange('accountHolderName', e.target.value)}
                                            placeholder="Account holder as per bank passbook"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                            Current Account Number *
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.accountNumber}
                                            onChange={(e) => handleSettingChange('accountNumber', e.target.value)}
                                            placeholder="50200012345678"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                            Bank IFSC Code *
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.ifscCode}
                                            onChange={(e) => handleSettingChange('ifscCode', e.target.value.toUpperCase())}
                                            maxLength={11}
                                            placeholder="HDFC0001234"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-mono font-bold text-zinc-900 dark:text-zinc-100 uppercase focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                            Primary UPI VPA ID
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={settings.upiId}
                                                onChange={(e) => handleSettingChange('upiId', e.target.value)}
                                                placeholder="e.g. synoslab@hdfcbank or billing@icici"
                                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-mono font-bold text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                                            />
                                            <QrCode size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 3: TERMS & SIGNATURE */}
                            <div className="synos-dept-card rounded-2xl p-6 space-y-5">
                                <div className="flex items-center justify-between border-b dark:border-zinc-800 border-zinc-200 pb-3">
                                    <div className="flex items-center gap-2.5">
                                        <ShieldCheck size={16} className="text-purple-500" />
                                        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                                            3. Commercial Terms & Authorized Signatory
                                        </h3>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                            Patient & B2B Tax Invoice Terms
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={settings.termsAndConditions}
                                            onChange={(e) => handleSettingChange('termsAndConditions', e.target.value)}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none font-mono text-[11px]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                            Authorized Signatory Title
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.signatoryTitle}
                                            onChange={(e) => handleSettingChange('signatoryTitle', e.target.value)}
                                            placeholder="e.g. Authorised Signatory / Accounts Desk"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-bold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: LIVE INTERACTIVE DOCUMENT STUDIO PREVIEW (5 COLS) */}
                <div className="xl:col-span-5 sticky top-6 space-y-4">
                    
                    {/* PREVIEW CONTROLLER CARD */}
                    <div className="p-4 rounded-2xl bg-zinc-900 text-white shadow-xl space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles size={16} className="text-amber-400" />
                                <span className="font-black text-xs uppercase tracking-wider">
                                    Live Paperwork Studio Preview
                                </span>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                                {currentActiveSlot.letterheadMode}
                            </span>
                        </div>

                        {/* SLOT QUICK SWITCHER CHIPS */}
                        <div className="flex flex-wrap gap-1.5">
                            {mappings.map(slot => (
                                <button
                                    key={slot.slotId}
                                    type="button"
                                    onClick={() => setPreviewSlotId(slot.slotId)}
                                    className={`px-2 py-1 rounded-lg text-[9px] font-black transition-all cursor-pointer ${
                                        previewSlotId === slot.slotId
                                            ? 'bg-synos-primary text-white shadow-xs'
                                            : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
                                    }`}
                                >
                                    {slot.slotName.split('(')[0].trim()}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-800">
                            <span>Slot: <strong className="text-indigo-400">{previewSlotId}</strong></span>
                            <span>Margin: <strong className="text-zinc-200 font-mono">{currentActiveSlot.topMarginMm ?? 40}mm</strong></span>
                            <span>Mode: <strong className="text-emerald-400 capitalize">{currentActiveSlot.letterheadMode || 'digital'}</strong></span>
                        </div>
                    </div>

                    {/* SCALED A4 CANVAS PREVIEW WRAPPER */}
                    <div className="rounded-2xl border dark:border-zinc-800 border-zinc-200 bg-zinc-100 dark:bg-zinc-950 p-3 overflow-hidden shadow-inner max-h-[780px] overflow-y-auto">
                        <div className="bg-white text-zinc-900 rounded-xl shadow-2xl p-6 border border-zinc-300 transform scale-90 sm:scale-95 origin-top transition-all">
                            {/* 1. PATIENT TAX INVOICE */}
                            {previewSlotId === 'patient_tax_invoice' && (
                                <PatientTaxInvoiceA4
                                    data={{
                                        billNumber: "INV-202610-0042",
                                        date: new Date().toISOString(),
                                        dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
                                        status: "Partial",
                                        lab: mockLabProfile,
                                        patient: {
                                            fullName: "K. Ramesh Kumar",
                                            mrn: "SYN-2026-9042",
                                            phone: "+91 98480 22334",
                                            gender: "Male",
                                            age: "46 Yrs",
                                            address: "Doctors Colony, Khammam"
                                        },
                                        items: [
                                            { testCode: "CBC", testName: "Complete Blood Count (5-Part Automated)", unitPrice: 350, netPrice: 350 },
                                            { testCode: "LFT", testName: "Liver Function Test Profile", unitPrice: 850, netPrice: 800 },
                                            { testCode: "USG", testName: "Ultrasound Whole Abdomen", unitPrice: 1200, netPrice: 1200 }
                                        ],
                                        financial: {
                                            subtotal: 2400,
                                            itemDiscounts: 50,
                                            grandTotal: 2350,
                                            amountPaid: 1500,
                                            balanceDue: 850,
                                            amountInWords: "Rupees Two Thousand Three Hundred Fifty Only"
                                        },
                                        payments: [
                                            { receiptNumber: "RCPT-0811", amount: 1500, paymentMethod: "UPI" }
                                        ],
                                        upiQrString: `upi://pay?pa=${encodeURIComponent(settings.upiId)}&pn=${encodeURIComponent(settings.labLegalName)}&am=850.00&cu=INR`
                                    }}
                                    letterheadMode={currentActiveSlot.letterheadMode}
                                    topMarginMm={currentActiveSlot.topMarginMm}
                                />
                            )}

                            {/* 2. THERMAL POS RECEIPT */}
                            {previewSlotId === 'patient_thermal_receipt' && (
                                <ThermalPosReceipt80mm
                                    data={{
                                        receiptNumber: "RCPT-202610-0912",
                                        dateTime: new Date().toLocaleString(),
                                        token: "T-0142",
                                        lab: mockLabProfile,
                                        patient: {
                                            fullName: "K. Ramesh Kumar",
                                            mrn: "SYN-2026-9042",
                                            age: "46Y",
                                            gender: "M"
                                        },
                                        items: [
                                            { testName: "Complete Blood Count", unitPrice: 350 },
                                            { testName: "Serum Creatinine", unitPrice: 200 }
                                        ],
                                        financial: {
                                            grandTotal: 550,
                                            amountPaid: 550,
                                            balanceDue: 0
                                        },
                                        upiQrString: `upi://pay?pa=${encodeURIComponent(settings.upiId)}&pn=${encodeURIComponent(settings.labLegalName)}&am=550.00&cu=INR`
                                    }}
                                />
                            )}

                            {/* 3. PARTNER B2B INVOICE */}
                            {previewSlotId === 'partner_b2b_invoice' && (
                                <PartnerClaimStatementA4
                                    data={{
                                        statementNo: "B2B-202610-0019",
                                        generatedAt: new Date().toISOString(),
                                        lab: mockLabProfile,
                                        partner: {
                                            partnerId: "part-dr-khalikh",
                                            name: "Dr. Khaleeq Ur Rahman, MD",
                                            clinicName: "Khaleeq Polyclinic & Maternity Center",
                                            phone: "+91 98490 11223",
                                            address: "Wyra Road, Khammam"
                                        },
                                        items: [
                                            { visitToken: "T-0104", date: new Date().toISOString(), patientName: "Mohammed Afzal", investigations: "CBC, Creatinine", grossBilled: 950, amountReceived: 0, netClaimDue: 950 },
                                            { visitToken: "T-0118", date: new Date().toISOString(), patientName: "Smt. Lakshmi Devi", investigations: "Lipid Profile, Thyroid", grossBilled: 1250, amountReceived: 0, netClaimDue: 1250 }
                                        ],
                                        summary: {
                                            totalVisits: 2,
                                            grossBilled: 2200,
                                            amountReceived: 0,
                                            netClaimDue: 2200,
                                            amountInWords: "Rupees Two Thousand Two Hundred Only"
                                        },
                                        upiQrString: `upi://pay?pa=${encodeURIComponent(settings.upiId)}&pn=${encodeURIComponent(settings.labLegalName)}&am=2200.00&cu=INR`
                                    }}
                                    letterheadMode={currentActiveSlot.letterheadMode}
                                    topMarginMm={currentActiveSlot.topMarginMm}
                                />
                            )}

                            {/* 4. REFERRAL PAYOUT VOUCHER */}
                            {previewSlotId === 'referral_payout_voucher' && (
                                <ReferralPayoutVoucherA4
                                    data={{
                                        voucherNo: "VCH-202610-0053",
                                        generatedAt: new Date().toISOString(),
                                        financialYear: "2026 - 2027",
                                        lab: mockLabProfile,
                                        doctor: {
                                            name: "Dr. Khaleeq Ur Rahman, MD",
                                            clinicName: "Khaleeq Polyclinic & Maternity Center",
                                            phone: "+91 98490 11223",
                                            pan: "BKPPR9988C",
                                            bankName: "State Bank of India",
                                            accountNumber: "30291049201",
                                            ifsc: "SBIN0000854"
                                        },
                                        items: [
                                            { token: "T-0042", date: new Date().toISOString(), patientName: "P. Anjaiah", testNames: "Whole Abdomen USG, LFT", patientPaid: 2050, commissionRatePct: 20, referralAmount: 410 },
                                            { token: "T-0068", date: new Date().toISOString(), patientName: "B. Suresh Babu", testNames: "CT Brain Plain", patientPaid: 3200, commissionRatePct: 25, referralAmount: 800 }
                                        ],
                                        summary: {
                                            totalReferredVisits: 2,
                                            totalPatientCollection: 5250,
                                            grossReferralAmount: 1210,
                                            tdsPercentage: 5,
                                            tdsDeduction: 60.5,
                                            netPayoutAmount: 1149.5,
                                            netPayoutInWords: "Rupees One Thousand One Hundred Forty Nine Only"
                                        }
                                    }}
                                    letterheadMode={currentActiveSlot.letterheadMode}
                                    topMarginMm={currentActiveSlot.topMarginMm}
                                />
                            )}

                            {/* 5. VENDOR PURCHASE ORDER */}
                            {(previewSlotId === 'procurement_po' || previewSlotId === 'procurement_grn') && (
                                <ProcurementPurchaseOrderA4
                                    data={{
                                        poNumber: "PO-202610-0012",
                                        lab: mockLabProfile,
                                        vendor: {
                                            name: "Roche Diagnostics India Pvt Ltd",
                                            contactPerson: "Mr. Anand Varma",
                                            phone: "+91 98490 88776",
                                            gstin: "36AABCR1234F1Z9",
                                            address: "Phase 2, Hyderabad"
                                        }
                                    }}
                                    letterheadMode={currentActiveSlot.letterheadMode}
                                    topMarginMm={currentActiveSlot.topMarginMm}
                                />
                            )}

                            {/* 6. WORKFORCE SALARY PAY SLIP */}
                            {previewSlotId === 'workforce_payslip' && (
                                <WorkforcePaySlipA4
                                    data={{
                                        lab: mockLabProfile,
                                        monthYear: "October 2026"
                                    }}
                                    letterheadMode={currentActiveSlot.letterheadMode}
                                    topMarginMm={currentActiveSlot.topMarginMm}
                                />
                            )}

                            {/* 7. PETTY CASH EXPENSE VOUCHER */}
                            {previewSlotId === 'overhead_expense_voucher' && (
                                <PettyExpenseVoucherA4
                                    data={{
                                        lab: mockLabProfile,
                                        voucherNumber: "EXP-202610-0031"
                                    }}
                                    letterheadMode={currentActiveSlot.letterheadMode}
                                    topMarginMm={currentActiveSlot.topMarginMm}
                                />
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
