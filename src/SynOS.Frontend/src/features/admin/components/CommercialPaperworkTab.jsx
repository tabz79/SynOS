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
    DollarSign,
    CheckSquare,
    Square,
    ChevronDown,
    ChevronRight,
    Plus, 
    Trash2, 
    Settings2,
    Upload
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';
import { DEFAULT_DOCUMENT_SCHEMAS } from '@/features/finance/components/documents/documentLayoutSchemas';
import { DynamicInvoiceCanvas } from '@/features/finance/components/documents/DynamicInvoiceCanvas';

export const CommercialPaperworkTab = () => {
    const [studioTab, setStudioTab] = useState('matrix'); // 'matrix' | 'profile'
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [moduleFilter, setModuleFilter] = useState('all');
    
    // Active Preview Slot (corresponds to slotId)
    const [previewSlotId, setPreviewSlotId] = useState('patient_tax_invoice');

    // Expanded accordions in modular box manager on left
    const [expandedBoxIds, setExpandedBoxIds] = useState({
        header: true,
        docBadge: false,
        partyDetails: true,
        itemsTable: false,
        financialSummary: false,
        bankAndUpi: false
    });

    // Custom box creation input state
    const [newBoxName, setNewBoxName] = useState('');
    const [showAddBoxInput, setShowAddBoxInput] = useState(false);

    // Reactive Layout Schemas for each document type
    const [schemas, setSchemas] = useState(() => {
        return JSON.parse(JSON.stringify(DEFAULT_DOCUMENT_SCHEMAS));
    });

    // Commercial Stationery Settings
    const [settings, setSettings] = useState({
        labLegalName: "SynOS Diagnostic Centre & Laboratory",
        labTradeName: "Advanced Pathology & Imaging Services",
        logoUrl: "",
        receiptPrinterName: "",
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

            const cachedLogo = typeof window !== 'undefined' ? window.localStorage?.getItem('synos_lab_logo') : null;
            const cachedPrinter = typeof window !== 'undefined' ? window.localStorage?.getItem('synos_receipt_printer_name') : null;

            if (stationeryRes && typeof stationeryRes === 'object') {
                setSettings(prev => ({ 
                    ...prev, 
                    ...stationeryRes,
                    logoUrl: stationeryRes.logoUrl || cachedLogo || prev.logoUrl || "",
                    receiptPrinterName: stationeryRes.receiptPrinterName || cachedPrinter || prev.receiptPrinterName || ""
                }));
            } else if (cachedLogo || cachedPrinter) {
                setSettings(prev => ({
                    ...prev,
                    logoUrl: cachedLogo || prev.logoUrl || "",
                    receiptPrinterName: cachedPrinter || prev.receiptPrinterName || ""
                }));
            }

            if (Array.isArray(mappingsRes)) {
                setMappings(mappingsRes);
                // If customLayout exists in any mapping, merge it into schemas
                setSchemas(prev => {
                    const merged = { ...prev };
                    mappingsRes.forEach(m => {
                        if (m.customLayout && typeof m.customLayout === 'object') {
                            merged[m.slotId] = m.customLayout;
                        }
                    });
                    return merged;
                });
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
            const mappingsToSave = mappings.map(m => ({
                ...m,
                customLayout: schemas[m.slotId] || null
            }));

            await Promise.all([
                FinanceApi.saveStationerySettings(settings),
                FinanceApi.saveDocumentMappings(mappingsToSave)
            ]);

            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    if (settings.logoUrl) {
                        window.localStorage.setItem('synos_lab_logo', settings.logoUrl);
                    } else {
                        window.localStorage.removeItem('synos_lab_logo');
                    }
                    if (settings.receiptPrinterName) {
                        window.localStorage.setItem('synos_receipt_printer_name', settings.receiptPrinterName);
                    }
                }
            } catch (storageErr) {
                console.warn("Storage sync warning:", storageErr);
            }

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 4000);
        } catch (err) {
            console.error("Failed to save paperwork settings:", err);
            alert("Error saving: " + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert("Logo file is too large. Please select an image under 2MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target.result;
            handleSettingChange('logoUrl', dataUrl);
            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    window.localStorage.setItem('synos_lab_logo', dataUrl);
                }
            } catch (err) {
                console.warn("Could not cache logo in localStorage:", err);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveLogo = () => {
        handleSettingChange('logoUrl', '');
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.removeItem('synos_lab_logo');
            }
        } catch {}
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

    // Active Slot Config
    const currentActiveSlot = mappings.find(s => s.slotId === previewSlotId) || {
        slotId: previewSlotId,
        slotName: "Document",
        letterheadMode: settings.defaultLetterheadMode,
        topMarginMm: settings.topMarginMm,
        enableUpiQr: settings.enableUpiQr
    };

    // Active layout schema for preview
    const activeSchema = schemas[previewSlotId] || DEFAULT_DOCUMENT_SCHEMAS[previewSlotId] || {
        slotId: previewSlotId,
        boxes: {}
    };

    // Handle updates from canvas (text edits, deletions, additions)
    const handleUpdateSchema = (newSchema) => {
        setSchemas(prev => ({
            ...prev,
            [previewSlotId]: newSchema
        }));
    };

    // Toggle Box on/off (from Left Checkboxes or from Canvas Delete button)
    const handleToggleBox = (boxId, forceVal) => {
        setSchemas(prev => {
            const currentSlotSchema = prev[previewSlotId] || DEFAULT_DOCUMENT_SCHEMAS[previewSlotId];
            if (!currentSlotSchema || !currentSlotSchema.boxes) return prev;
            const currentBox = currentSlotSchema.boxes[boxId];
            if (!currentBox) return prev;

            const nextVal = forceVal !== undefined ? forceVal : !currentBox.enabled;

            return {
                ...prev,
                [previewSlotId]: {
                    ...currentSlotSchema,
                    boxes: {
                        ...currentSlotSchema.boxes,
                        [boxId]: {
                            ...currentBox,
                            enabled: nextVal
                        }
                    }
                }
            };
        });
    };

    // Toggle individual subfield inside a box on/off
    const handleToggleField = (boxId, fieldId, enabled) => {
        setSchemas(prev => {
            const currentSlotSchema = prev[previewSlotId] || DEFAULT_DOCUMENT_SCHEMAS[previewSlotId];
            if (!currentSlotSchema?.boxes?.[boxId]) return prev;

            const box = currentSlotSchema.boxes[boxId];

            // If it's a table column
            if (box.columns && box.columns[fieldId]) {
                return {
                    ...prev,
                    [previewSlotId]: {
                        ...currentSlotSchema,
                        boxes: {
                            ...currentSlotSchema.boxes,
                            [boxId]: {
                                ...box,
                                columns: {
                                    ...box.columns,
                                    [fieldId]: {
                                        ...box.columns[fieldId],
                                        enabled
                                    }
                                }
                            }
                        }
                    }
                };
            }

            // Normal field
            if (!box.fields?.[fieldId]) return prev;
            return {
                ...prev,
                [previewSlotId]: {
                    ...currentSlotSchema,
                    boxes: {
                        ...currentSlotSchema.boxes,
                        [boxId]: {
                            ...box,
                            fields: {
                                ...box.fields,
                                [fieldId]: {
                                    ...box.fields[fieldId],
                                    enabled
                                }
                            }
                        }
                    }
                }
            };
        });
    };

    // Add a brand new custom section/box to the bill
    const handleCreateCustomBox = (e) => {
        e.preventDefault();
        if (!newBoxName.trim()) return;

        const boxId = `custom_box_${Date.now()}`;
        setSchemas(prev => {
            const currentSlotSchema = prev[previewSlotId] || DEFAULT_DOCUMENT_SCHEMAS[previewSlotId];
            return {
                ...prev,
                [previewSlotId]: {
                    ...currentSlotSchema,
                    boxes: {
                        ...currentSlotSchema.boxes,
                        [boxId]: {
                            id: boxId,
                            name: newBoxName.trim(),
                            enabled: true,
                            content: 'Custom document section content...',
                            customLines: []
                        }
                    }
                }
            };
        });
        setNewBoxName('');
        setShowAddBoxInput(false);
    };

    // Reset current document layout to factory defaults
    const handleResetLayout = () => {
        if (window.confirm(`Reset "${currentActiveSlot.slotName || previewSlotId}" layout and fields back to factory defaults?`)) {
            setSchemas(prev => ({
                ...prev,
                [previewSlotId]: JSON.parse(JSON.stringify(DEFAULT_DOCUMENT_SCHEMAS[previewSlotId] || {}))
            }));
        }
    };

    // Available Templates Catalog
    const TEMPLATE_OPTIONS = {
        patient_tax_invoice: [
            { id: 'template_patient_a4_modern', label: 'Patient Bill (A4)' },
            { id: 'template_patient_a4_compact', label: 'Compact Bill (A4)' }
        ],
        patient_thermal_receipt: [
            { id: 'template_thermal_pos_80mm', label: '80mm POS Slip' },
            { id: 'template_thermal_pos_58mm', label: '58mm POS Slip' }
        ],
        partner_b2b_invoice: [
            { id: 'template_partner_b2b_a4', label: 'Doctor Bill (A4)' }
        ],
        referral_payout_voucher: [
            { id: 'template_referral_voucher_a4', label: 'Doctor Payout (A4)' }
        ],
        corporate_b2b_invoice: [
            { id: 'template_corporate_b2b_a4', label: 'Corporate Bill (A4)' }
        ],
        insurance_tpa_claim: [
            { id: 'template_insurance_tpa_a4', label: 'Insurance Bill (A4)' }
        ],
        outsourced_lab_manifest: [
            { id: 'template_outsource_manifest_a4', label: 'Outsource Manifest (A4)' }
        ],
        procurement_po: [
            { id: 'template_procurement_po_a4', label: 'Purchase Order (A4)' }
        ],
        procurement_grn: [
            { id: 'template_grn_a4', label: 'Material GRN (A4)' }
        ],
        workforce_payslip: [
            { id: 'template_payslip_a4', label: 'Salary Slip (A4)' }
        ],
        overhead_expense_voucher: [
            { id: 'template_expense_voucher_a4', label: 'Expense Voucher (A5)' }
        ],
        summary_bills_daybook: [
            { id: 'template_summary_daybook_a4', label: 'Bills Daybook (A4)' }
        ],
        summary_doctor_dues: [
            { id: 'template_summary_doctor_dues_a4', label: 'Doctor Dues Summary (A4)' }
        ],
        summary_corporate: [
            { id: 'template_summary_corporate_a4', label: 'Corporate Summary (A4)' }
        ],
        summary_insurance: [
            { id: 'template_summary_insurance_a4', label: 'Insurance Summary (A4)' }
        ],
        summary_outsource: [
            { id: 'template_summary_outsource_a4', label: 'Outsource Summary (A4)' }
        ]
    };

    // Filter Mappings
    const filteredMappings = mappings.filter(m => {
        if (moduleFilter === 'all') return true;
        return m.moduleCode === moduleFilter;
    });

    return (
        <div className="space-y-6 animate-fadeIn text-xs">
            {/* TOP HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b dark:border-zinc-800 border-zinc-200 pb-5">
                <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-inner">
                        <FileSpreadsheet size={22} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100">
                            Billing & Print Setup
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={loadAllData}
                        disabled={loading || saving}
                        className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 font-bold flex items-center gap-2 transition-all cursor-pointer"
                    >
                        <RotateCcw size={14} />
                        <span>Reload</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleSaveAll}
                        disabled={saving}
                        className="px-6 py-2 rounded-xl bg-synos-primary hover:bg-synos-primary/90 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-synos-primary/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                        {saving ? (
                            <>
                                <span className="animate-spin">⏳</span>
                                <span>Saving...</span>
                            </>
                        ) : saveSuccess ? (
                            <>
                                <Check size={16} className="text-emerald-300" />
                                <span>Saved!</span>
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                <span>Save</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* SUB-TABS */}
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
                    <span>Bill Formats</span>
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
                    <span>Lab Details & Bank</span>
                </button>
            </div>

            {saveSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center gap-2.5 animate-in fade-in duration-300 font-bold">
                    <Check size={16} className="shrink-0 text-emerald-500" />
                    <span>Settings saved successfully.</span>
                </div>
            )}

            {/* DUAL-COLUMN STUDIO GRID */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                
                {/* LEFT COLUMN: MODULAR BOXES & DOCUMENT CONFIGURATION (7 COLS) */}
                <div className="xl:col-span-7 space-y-6">

                    {/* VIEW A: BILL FORMATS */}
                    {studioTab === 'matrix' && (
                        <div className="space-y-5">
                            
                            {/* MODULE FILTER BAR */}
                            <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-zinc-100 dark:bg-zinc-900/60 rounded-2xl border dark:border-zinc-800 border-zinc-200">
                                {[
                                    { id: 'all', label: 'All' },
                                    { id: 'reception', label: 'Counter' },
                                    { id: 'referral', label: 'Doctors' },
                                    { id: 'corporate', label: 'Corporate' },
                                    { id: 'insurance', label: 'Insurance' },
                                    { id: 'outsource', label: 'Outsource' },
                                    { id: 'inventory', label: 'Stores' },
                                    { id: 'workforce', label: 'Staff' },
                                    { id: 'finance', label: 'Expenses' },
                                    { id: 'summary', label: 'Summaries' }
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

                            {/* ACTIVE DOCUMENT MODULAR BOXES MANAGER */}
                            <div className="synos-dept-card rounded-2xl p-5 border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/20 dark:bg-indigo-950/10 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b dark:border-zinc-800 border-zinc-200 pb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider">
                                            Active
                                        </span>
                                        <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                                            {currentActiveSlot.slotName || previewSlotId}
                                        </h3>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleResetLayout}
                                            className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
                                        >
                                            Reset
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowAddBoxInput(prev => !prev)}
                                            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer hover:bg-indigo-700 shadow-xs"
                                        >
                                            <Plus size={12} /> Add Box
                                        </button>
                                    </div>
                                </div>

                                {/* ADD CUSTOM BOX FORM */}
                                {showAddBoxInput && (
                                    <form onSubmit={handleCreateCustomBox} className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-center gap-2">
                                        <input 
                                            type="text" 
                                            value={newBoxName}
                                            onChange={(e) => setNewBoxName(e.target.value)}
                                            placeholder="Enter Section Name"
                                            className="px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs flex-1 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 outline-none font-bold"
                                            autoFocus
                                        />
                                        <button 
                                            type="submit"
                                            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                                        >
                                            Add
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setShowAddBoxInput(false)}
                                            className="px-2 py-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-xs cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                    </form>
                                )}

                                {/* BOXES CHECKLIST WITH EXPANDABLE SUB-FIELDS */}
                                <div className="space-y-2">
                                    {Object.entries(activeSchema.boxes || {}).map(([boxKey, box]) => {
                                        const isExpanded = !!expandedBoxIds[boxKey];
                                        const hasSubFields = (box.fields && Object.keys(box.fields).length > 0) || (box.columns && Object.keys(box.columns).length > 0);

                                        return (
                                            <div 
                                                key={boxKey}
                                                className={`rounded-xl border transition-all ${
                                                    box.enabled 
                                                        ? 'bg-white dark:bg-zinc-900/90 border-zinc-300 dark:border-zinc-700 shadow-xs' 
                                                        : 'bg-zinc-100/60 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800/80 opacity-60'
                                                }`}
                                            >
                                                {/* BOX ROW HEADER */}
                                                <div className="flex items-center justify-between p-3">
                                                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                                        <input 
                                                            type="checkbox"
                                                            checked={box.enabled}
                                                            onChange={() => handleToggleBox(boxKey)}
                                                            className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                        />
                                                        <span className="font-black text-xs text-zinc-900 dark:text-zinc-100">
                                                            {box.name || boxKey}
                                                        </span>
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${box.enabled ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                                                            {box.enabled ? "Included on Bill" : "Hidden"}
                                                        </span>
                                                    </label>

                                                    <div className="flex items-center gap-1.5">
                                                        {hasSubFields && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setExpandedBoxIds(prev => ({ ...prev, [boxKey]: !prev[boxKey] }))}
                                                                className="px-2 py-1 rounded text-[10px] font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1 cursor-pointer"
                                                            >
                                                                <span>Fields ({Object.keys(box.fields || box.columns || {}).length})</span>
                                                                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* EXPANDABLE SUB-FIELDS CHECKLIST */}
                                                {isExpanded && box.enabled && hasSubFields && (
                                                    <div className="px-3 pb-3 pt-1 border-t border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-950/30 rounded-b-xl">
                                                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-2">
                                                            Visible Information Inside this Box
                                                        </p>
                                                        
                                                        {/* Brand Logo Shortcut in Header Box */}
                                                        {boxKey === 'header' && (
                                                            <div className="p-2 mb-2 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-between gap-2">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-8 h-8 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                                                                        {settings.logoUrl ? (
                                                                            <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain p-0.5" />
                                                                        ) : (
                                                                            <Building2 size={15} className="text-zinc-400" />
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-[11px] font-black text-zinc-900 dark:text-zinc-100 block leading-tight">Brand Logo</span>
                                                                        <span className="text-[9px] text-zinc-500">{settings.logoUrl ? "Logo configured" : "No logo uploaded"}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <label className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1 shadow-xs active:scale-95">
                                                                        <Upload size={11} />
                                                                        <span>{settings.logoUrl ? "Change" : "Upload"}</span>
                                                                        <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogoUpload} className="hidden" />
                                                                    </label>
                                                                    {settings.logoUrl && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={handleRemoveLogo}
                                                                            className="p-1 rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                                                            title="Remove Logo"
                                                                        >
                                                                            <Trash2 size={12} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Fields */}
                                                        {box.fields && (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                {Object.entries(box.fields).map(([fieldKey, field]) => (
                                                                    <label key={fieldKey} className="flex items-center gap-2 text-[11px] cursor-pointer select-none hover:bg-white dark:hover:bg-zinc-900 p-1.5 rounded-lg border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 transition-all">
                                                                        <input 
                                                                            type="checkbox"
                                                                            checked={field.enabled}
                                                                            onChange={(e) => handleToggleField(boxKey, fieldKey, e.target.checked)}
                                                                            className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                        />
                                                                        <span className={`font-semibold ${field.enabled ? 'text-zinc-800 dark:text-zinc-200' : 'text-zinc-400 line-through'}`}>
                                                                            {field.label || fieldKey}
                                                                        </span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Table Columns */}
                                                        {box.columns && (() => {
                                                            const enabledCount = Object.values(box.columns).filter(c => c.enabled).length;
                                                            const isOverBudget = enabledCount > 6;
                                                            const isTight = enabledCount === 6;

                                                            return (
                                                                <div className="space-y-2 mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                                                                    <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] font-bold ${
                                                                        isOverBudget 
                                                                            ? 'bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400' 
                                                                            : isTight 
                                                                                ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                                                                                : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                                                    }`}>
                                                                        <span>A4 Column Budget: {enabledCount} / 6 recommended</span>
                                                                        <span>{isOverBudget ? '⚠️ Dense / Overflow Risk' : isTight ? 'Optimal Width' : 'Comfortable Fit'}</span>
                                                                    </div>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                        {Object.entries(box.columns).map(([colKey, col]) => (
                                                                            <label key={colKey} className="flex items-center gap-2 text-[11px] cursor-pointer select-none hover:bg-white dark:hover:bg-zinc-900 p-1.5 rounded-lg border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 transition-all">
                                                                                <input 
                                                                                    type="checkbox" 
                                                                                    checked={col.enabled}
                                                                                    onChange={(e) => handleToggleField(boxKey, colKey, e.target.checked)}
                                                                                    className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                                />
                                                                                <span className={`font-semibold ${col.enabled ? 'text-zinc-800 dark:text-zinc-200' : 'text-zinc-400 line-through'}`}>
                                                                                    Column: {col.label || colKey}
                                                                                </span>
                                                                            </label>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* BILL FORMATS LIST */}
                            <div className="space-y-3 pt-2">
                                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-500">
                                    All Bill Formats ({filteredMappings.length})
                                </h4>

                                <div className="space-y-3">
                                    {filteredMappings.map(slot => {
                                        const isSelectedForPreview = previewSlotId === slot.slotId;
                                        const availableOptions = TEMPLATE_OPTIONS[slot.slotId] || [
                                            { id: slot.assignedTemplateId, label: slot.templateName }
                                        ];

                                        return (
                                            <div 
                                                key={slot.slotId}
                                                className={`synos-dept-card rounded-2xl p-4 border transition-all ${
                                                    isSelectedForPreview 
                                                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-950/20' 
                                                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                                                }`}
                                            >
                                                {/* CARD HEADER */}
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b dark:border-zinc-800 border-zinc-200">
                                                    <div className="flex items-center gap-2">
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
                                                        <span>{isSelectedForPreview ? "Active" : "Customize"}</span>
                                                    </button>
                                                </div>

                                                {/* TRIGGER DESCRIPTION */}
                                                <p className="text-[11px] text-zinc-500 pt-2 pb-2 font-medium">
                                                    {slot.triggerDescription}
                                                </p>

                                                {/* CONFIGURATION CONTROLS */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-[11px]">
                                                    {/* TEMPLATE PICKER */}
                                                    <div>
                                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                                                            Template
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

                                                    {/* PRINT MODE PICKER */}
                                                    <div>
                                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                                                            Print Mode
                                                        </label>
                                                        <select
                                                            value={slot.letterheadMode}
                                                            onChange={(e) => handleMappingChange(slot.slotId, 'letterheadMode', e.target.value)}
                                                            className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-bold text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer"
                                                        >
                                                            <option value="digital">Digital Letterhead</option>
                                                            <option value="preprinted">Pre-Printed Stationery</option>
                                                            {slot.slotId === 'patient_thermal_receipt' && (
                                                                <option value="raw_thermal">POS Thermal Roll</option>
                                                            )}
                                                        </select>
                                                    </div>

                                                    {/* MARGIN SLIDER (IF PREPRINTED) */}
                                                    {slot.letterheadMode === 'preprinted' && (
                                                        <div className="sm:col-span-2 space-y-1.5 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                                                            <div className="flex justify-between items-center text-[10px]">
                                                                <span className="text-zinc-500 font-semibold">Top Margin (mm):</span>
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
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* VIEW B: LAB DETAILS & BANK */}
                    {studioTab === 'profile' && (
                        <div className="space-y-6">
                            {/* SECTION 1: LAB DETAILS & LOGO */}
                            <div className="synos-dept-card rounded-2xl p-6 space-y-5">
                                <div className="flex items-center justify-between border-b dark:border-zinc-800 border-zinc-200 pb-3">
                                    <div className="flex items-center gap-2.5">
                                        <Building2 size={16} className="text-indigo-600 dark:text-indigo-400" />
                                        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                                            1. Lab Details & Logo
                                        </h3>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* LOGO */}
                                    <div className="sm:col-span-2 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center gap-4">
                                        <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                                            {settings.logoUrl ? (
                                                <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center text-zinc-400 text-center p-2">
                                                    <Building2 size={24} className="mb-1 text-zinc-400" />
                                                    <span className="text-[9px] font-bold uppercase tracking-wider">No Logo</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-1.5 text-center sm:text-left">
                                            <h4 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-wider">
                                                Lab Logo
                                            </h4>
                                            <div className="flex items-center gap-2 justify-center sm:justify-start pt-1">
                                                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-xs active:scale-95 transition-all">
                                                    <Upload size={14} />
                                                    <span>{settings.logoUrl ? "Change Logo" : "Upload Logo"}</span>
                                                    <input 
                                                        type="file" 
                                                        accept="image/png,image/jpeg,image/webp,image/svg+xml" 
                                                        onChange={handleLogoUpload} 
                                                        className="hidden" 
                                                    />
                                                </label>
                                                {settings.logoUrl && (
                                                    <button
                                                        type="button"
                                                        onClick={handleRemoveLogo}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs cursor-pointer active:scale-95 transition-all"
                                                    >
                                                        <Trash2 size={13} />
                                                        <span>Remove</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                            Lab Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.labLegalName}
                                            onChange={(e) => handleSettingChange('labLegalName', e.target.value)}
                                            placeholder="Lab Name"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-bold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                            Tagline
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.labTradeName}
                                            onChange={(e) => handleSettingChange('labTradeName', e.target.value)}
                                            placeholder="Tagline / Description"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                            GSTIN *
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
                                            PAN
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
                                            Address
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={settings.address}
                                            onChange={(e) => handleSettingChange('address', e.target.value)}
                                            placeholder="Full Address"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                            Phone
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
                                            Email
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

                            {/* SECTION 2: BANK & UPI DETAILS */}
                            <div className="synos-dept-card rounded-2xl p-6 space-y-5">
                                <div className="flex items-center justify-between border-b dark:border-zinc-800 border-zinc-200 pb-3">
                                    <div className="flex items-center gap-2.5">
                                        <CreditCard size={16} className="text-emerald-600 dark:text-emerald-400" />
                                        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                                            2. Bank & UPI Details
                                        </h3>
                                    </div>
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                        <QrCode size={12} /> UPI QR
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
                                            placeholder="Bank Name"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-bold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                            Account Holder Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.accountHolderName}
                                            onChange={(e) => handleSettingChange('accountHolderName', e.target.value)}
                                            placeholder="Account Holder Name"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-bold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                            Account Number *
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.accountNumber}
                                            onChange={(e) => handleSettingChange('accountNumber', e.target.value)}
                                            placeholder="Account Number"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                            IFSC Code *
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.ifscCode}
                                            onChange={(e) => handleSettingChange('ifscCode', e.target.value.toUpperCase())}
                                            maxLength={11}
                                            placeholder="HDFC0001234"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-mono font-bold text-zinc-900 dark:text-zinc-100 uppercase focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                            Branch
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.branch}
                                            onChange={(e) => handleSettingChange('branch', e.target.value)}
                                            placeholder="Branch"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                            UPI ID (For QR Code) *
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.upiId}
                                            onChange={(e) => handleSettingChange('upiId', e.target.value)}
                                            placeholder="synoslab@hdfcbank"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-mono font-bold text-indigo-700 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 3: TERMS & SIGNATORY */}
                            <div className="synos-dept-card rounded-2xl p-6 space-y-5">
                                <div className="flex items-center justify-between border-b dark:border-zinc-800 border-zinc-200 pb-3">
                                    <div className="flex items-center gap-2.5">
                                        <ShieldCheck size={16} className="text-amber-600 dark:text-amber-400" />
                                        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                                            3. Terms & Signatory
                                        </h3>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                            Bill Terms & Conditions
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
                                            placeholder="Authorized Signatory"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-bold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 4: SLIP PRINTER */}
                            <div className="synos-dept-card rounded-2xl p-6 space-y-5">
                                <div className="flex items-center justify-between border-b dark:border-zinc-800 border-zinc-200 pb-3">
                                    <div className="flex items-center gap-2.5">
                                        <Printer size={16} className="text-emerald-600 dark:text-emerald-400" />
                                        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                                            4. Receipt Printer
                                        </h3>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                            Printer Name
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.receiptPrinterName || ""}
                                            onChange={(e) => handleSettingChange('receiptPrinterName', e.target.value)}
                                            placeholder="e.g. EPSON TM-T82, POS-80"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: LIVE INTERACTIVE DOCUMENT STUDIO PREVIEW (5 COLS) */}
                <div className="xl:col-span-5 sticky top-6 space-y-3">
                    
                    {/* QUICK SELECTION SHORTCUTS PILLS (THEME MATCHED, ZERO CLUTTER) */}
                    <div className="synos-dept-card rounded-2xl p-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm space-y-2.5">
                        {/* SLOT QUICK SWITCHER CHIPS */}
                        <div className="flex flex-wrap gap-1.5">
                            {mappings.map(slot => (
                                <button
                                    key={slot.slotId}
                                    type="button"
                                    onClick={() => setPreviewSlotId(slot.slotId)}
                                    className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
                                        previewSlotId === slot.slotId
                                            ? 'bg-synos-primary text-white shadow-xs'
                                            : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                                    }`}
                                >
                                    {slot.slotName.split('(')[0].trim()}
                                </button>
                            ))}
                        </div>

                        {/* STATUS */}
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-medium pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                            <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold">
                                <Sparkles size={11} /> Click text to edit
                            </span>
                            <span className="font-mono text-zinc-400 capitalize">
                                {currentActiveSlot.letterheadMode || 'digital'}
                            </span>
                        </div>
                    </div>

                    {/* SCALED A4 CANVAS PREVIEW WRAPPER */}
                    <div className="rounded-2xl border dark:border-zinc-800 border-zinc-200 bg-zinc-100 dark:bg-zinc-950 p-3 overflow-hidden shadow-inner max-h-[780px] overflow-y-auto">
                        <div className="bg-white text-zinc-900 rounded-xl shadow-2xl p-6 border border-zinc-300 transform scale-90 sm:scale-95 origin-top transition-all">
                            <DynamicInvoiceCanvas 
                                schema={activeSchema}
                                onUpdateSchema={handleUpdateSchema}
                                letterheadMode={currentActiveSlot.letterheadMode}
                                topMarginMm={currentActiveSlot.topMarginMm}
                                labSettings={settings}
                                onToggleBox={handleToggleBox}
                            />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
