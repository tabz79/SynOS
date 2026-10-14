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
    ExternalLink
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';
import { PatientTaxInvoiceA4 } from '@/features/finance/components/documents/PatientTaxInvoiceA4';
import { PartnerClaimStatementA4 } from '@/features/finance/components/documents/PartnerClaimStatementA4';
import { ReferralPayoutVoucherA4 } from '@/features/finance/components/documents/ReferralPayoutVoucherA4';

export const CommercialPaperworkTab = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [previewDocType, setPreviewDocType] = useState('patient'); // 'patient' | 'partner' | 'voucher'
    
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

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const data = await FinanceApi.getStationerySettings();
            if (data && typeof data === 'object') {
                setSettings(prev => ({ ...prev, ...data }));
            }
        } catch (err) {
            console.error("Failed to load stationery settings:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        try {
            setSaving(true);
            await FinanceApi.saveStationerySettings(settings);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 4000);
        } catch (err) {
            console.error("Failed to save stationery settings:", err);
            alert("Error saving settings: " + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field, value) => {
        setSettings(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Live Mock Data for Interactive Studio Preview
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
        topMarginMm: settings.topMarginMm
    };

    const mockPatientInvoice = {
        invoiceId: "mock-inv-001",
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
            address: "Plot 14, Doctors Colony, Khammam"
        },
        items: [
            {
                orderId: "ord-1",
                testCode: "CBC",
                testName: "Complete Blood Count (5-Part Automated)",
                department: "Hematology",
                unitPrice: 350,
                discount: 0,
                taxPercentage: 0,
                netPrice: 350
            },
            {
                orderId: "ord-2",
                testCode: "LFT",
                testName: "Liver Function Test Profile",
                department: "Biochemistry",
                unitPrice: 850,
                discount: 50,
                taxPercentage: 0,
                netPrice: 800
            },
            {
                orderId: "ord-3",
                testCode: "USG-ABD",
                testName: "Ultrasound Whole Abdomen & Pelvis",
                department: "Radiology",
                unitPrice: 1200,
                discount: 0,
                taxPercentage: 0,
                netPrice: 1200
            }
        ],
        financial: {
            subtotal: 2400,
            itemDiscounts: 50,
            overallDiscount: 0,
            taxableAmount: 2350,
            cgst: 0,
            sgst: 0,
            totalTax: 0,
            grandTotal: 2350,
            amountPaid: 1500,
            balanceDue: 850,
            amountInWords: "Rupees Two Thousand Three Hundred Fifty Only",
            balanceInWords: "Rupees Eight Hundred Fifty Only"
        },
        payments: [
            {
                paymentId: "pay-1",
                receiptNumber: "RCPT-2026-0811",
                amount: 1500,
                paymentMethod: "UPI",
                referenceNumber: "UPI/394829104",
                receivedAt: new Date().toISOString()
            }
        ],
        upiQrString: `upi://pay?pa=${encodeURIComponent(settings.upiId)}&pn=${encodeURIComponent(settings.labLegalName)}&am=850.00&cu=INR&tn=Invoice-INV-202610-0042`
    };

    const mockPartnerInvoice = {
        statementId: "mock-stmt-001",
        statementNo: "B2B-202610-0019",
        generatedAt: new Date().toISOString(),
        lab: mockLabProfile,
        partner: {
            partnerId: "part-dr-khalikh",
            name: "Dr. Khaleeq Ur Rahman, MD",
            clinicName: "Khaleeq Polyclinic & Maternity Center",
            phone: "+91 98490 11223",
            email: "dr.khaleeq@polyclinic.in",
            address: "Main Road, Wyra Road, Khammam"
        },
        items: [
            {
                receivableFactId: "rf-1",
                visitToken: "T-0104",
                date: new Date(Date.now() - 2 * 86400000).toISOString(),
                patientName: "Mohammed Afzal",
                mrn: "SYN-2026-9011",
                ageGender: "42Y / M",
                investigations: "CBC, Serum Creatinine, HbA1c",
                grossBilled: 950,
                amountReceived: 0,
                netClaimDue: 950
            },
            {
                receivableFactId: "rf-2",
                visitToken: "T-0118",
                date: new Date(Date.now() - 1 * 86400000).toISOString(),
                patientName: "Smt. Lakshmi Devi",
                mrn: "SYN-2026-9025",
                ageGender: "58Y / F",
                investigations: "Lipid Profile, Thyroid Profile Total (T3, T4, TSH)",
                grossBilled: 1250,
                amountReceived: 0,
                netClaimDue: 1250
            },
            {
                receivableFactId: "rf-3",
                visitToken: "T-0129",
                date: new Date().toISOString(),
                patientName: "Venkateswarlu Rao",
                mrn: "SYN-2026-9039",
                ageGender: "63Y / M",
                investigations: "Digital Chest X-Ray PA View",
                grossBilled: 450,
                amountReceived: 0,
                netClaimDue: 450
            }
        ],
        summary: {
            totalVisits: 3,
            grossBilled: 2650,
            amountReceived: 0,
            netClaimDue: 2650,
            amountInWords: "Rupees Two Thousand Six Hundred Fifty Only"
        },
        upiQrString: `upi://pay?pa=${encodeURIComponent(settings.upiId)}&pn=${encodeURIComponent(settings.labLegalName)}&am=2650.00&cu=INR&tn=B2B-Invoice-B2B-202610-0019`
    };

    const mockPayoutVoucher = {
        voucherNo: "VCH-202610-0053",
        generatedAt: new Date().toISOString(),
        financialYear: "2026 - 2027",
        lab: mockLabProfile,
        doctor: {
            partnerId: "part-dr-khalikh",
            name: "Dr. Khaleeq Ur Rahman, MD",
            clinicName: "Khaleeq Polyclinic & Maternity Center",
            phone: "+91 98490 11223",
            pan: "BKPPR9988C",
            bankName: "State Bank of India",
            accountNumber: "30291049201",
            ifsc: "SBIN0000854"
        },
        items: [
            {
                factId: "pf-1",
                token: "T-0042",
                date: new Date(Date.now() - 3 * 86400000).toISOString(),
                patientName: "P. Anjaiah",
                testNames: "Whole Abdomen USG, LFT",
                patientPaid: 2050,
                commissionRatePct: 20,
                referralAmount: 410
            },
            {
                factId: "pf-2",
                token: "T-0055",
                date: new Date(Date.now() - 2 * 86400000).toISOString(),
                patientName: "G. Sunitha",
                testNames: "Complete Blood Count, ESR",
                patientPaid: 450,
                commissionRatePct: 20,
                referralAmount: 90
            },
            {
                factId: "pf-3",
                token: "T-0068",
                date: new Date(Date.now() - 1 * 86400000).toISOString(),
                patientName: "B. Suresh Babu",
                testNames: "CT Brain Plain (128 Slice)",
                patientPaid: 3200,
                commissionRatePct: 25,
                referralAmount: 800
            }
        ],
        summary: {
            totalReferredVisits: 3,
            totalPatientCollection: 5700,
            grossReferralAmount: 1300,
            tdsPercentage: 5,
            tdsDeduction: 65,
            netPayoutAmount: 1235,
            netPayoutInWords: "Rupees One Thousand Two Hundred Thirty Five Only"
        }
    };

    return (
        <div className="space-y-8 animate-fadeIn text-xs">
            {/* TOP HEADER & ACTION BANNER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b dark:border-zinc-800 border-zinc-200 pb-6">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-inner">
                        <FileSpreadsheet size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            Invoices & Commercial Paperwork Builder
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                                Live Studio
                            </span>
                        </h2>
                        <p className="text-zinc-500 text-xs">
                            Manage lab tax invoices, B2B partner bills, referral commission vouchers, UPI gateway, and letterhead margins.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={loadSettings}
                        disabled={loading || saving}
                        className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 font-bold flex items-center gap-2 transition-all cursor-pointer"
                    >
                        <RotateCcw size={14} />
                        <span>Reload</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
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
                                <span>Save Settings</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {saveSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center gap-3 animate-in fade-in duration-300">
                    <Check size={18} className="shrink-0 text-emerald-500" />
                    <div>
                        <strong className="font-bold">Stationery configuration saved successfully!</strong>
                        <p className="text-[11px] opacity-90">All newly generated patient tax invoices, B2B claim bills, and referral payout vouchers will now use these live commercial parameters.</p>
                    </div>
                </div>
            )}

            {/* MAIN DUAL-COLUMN STUDIO GRID */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                
                {/* LEFT COLUMN: BUILDER FORMS (7 COLS) */}
                <div className="xl:col-span-7 space-y-6">

                    {/* SECTION 1: LAB LEGAL PROFILE */}
                    <div className="synos-dept-card rounded-2xl p-6 space-y-5">
                        <div className="flex items-center justify-between border-b dark:border-zinc-800 border-zinc-200 pb-3">
                            <div className="flex items-center gap-2.5">
                                <Building2 size={16} className="text-indigo-600 dark:text-indigo-400" />
                                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                                    1. Commercial Legal Entity & Contact Profile
                                </h3>
                            </div>
                            <span className="text-[10px] text-zinc-400 font-semibold">Printed on all invoices & vouchers</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                    Legal Entity Registered Name (GSTIN Registered) *
                                </label>
                                <input
                                    type="text"
                                    value={settings.labLegalName}
                                    onChange={(e) => handleChange('labLegalName', e.target.value)}
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
                                    onChange={(e) => handleChange('labTradeName', e.target.value)}
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
                                    onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
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
                                    onChange={(e) => handleChange('pan', e.target.value.toUpperCase())}
                                    maxLength={10}
                                    placeholder="AAAAA0000A"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-mono font-bold text-zinc-900 dark:text-zinc-100 uppercase focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                    Registered Facility Address (Printed on Bill Header)
                                </label>
                                <textarea
                                    rows={2}
                                    value={settings.address}
                                    onChange={(e) => handleChange('address', e.target.value)}
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
                                    onChange={(e) => handleChange('phone', e.target.value)}
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
                                    onChange={(e) => handleChange('email', e.target.value)}
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
                                    onChange={(e) => handleChange('bankName', e.target.value)}
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
                                    onChange={(e) => handleChange('accountHolderName', e.target.value)}
                                    placeholder="Account holder as per bank passbook"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                    Current / Cash Credit Account Number *
                                </label>
                                <input
                                    type="text"
                                    value={settings.accountNumber}
                                    onChange={(e) => handleChange('accountNumber', e.target.value)}
                                    placeholder="50200012345678"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                    Bank IFSC Code (11-Alpha/Numeric) *
                                </label>
                                <input
                                    type="text"
                                    value={settings.ifscCode}
                                    onChange={(e) => handleChange('ifscCode', e.target.value.toUpperCase())}
                                    maxLength={11}
                                    placeholder="HDFC0001234"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-mono font-bold text-zinc-900 dark:text-zinc-100 uppercase focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                    Primary UPI VPA ID (Virtual Payment Address)
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={settings.upiId}
                                        onChange={(e) => handleChange('upiId', e.target.value)}
                                        placeholder="e.g. synoslab@hdfcbank or billing@icici"
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-mono font-bold text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                                    />
                                    <QrCode size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />
                                </div>
                                <p className="text-[10px] text-zinc-400 mt-1.5 leading-relaxed">
                                    Dynamic UPI QR is generated on each bill with the exact invoice due amount encoded for 100% error-free patient & doctor collections.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: LETTERHEAD MODES & MARGIN GEOMETRY */}
                    <div className="synos-dept-card rounded-2xl p-6 space-y-5">
                        <div className="flex items-center justify-between border-b dark:border-zinc-800 border-zinc-200 pb-3">
                            <div className="flex items-center gap-2.5">
                                <Sliders size={16} className="text-amber-500" />
                                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                                    3. Stationery Format & Letterhead Geometry
                                </h3>
                            </div>
                            <span className="text-[10px] text-zinc-400 font-semibold">Physical vs Digital A4</span>
                        </div>

                        {/* MODE SWITCHER */}
                        <div className="space-y-2">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                                Default Paperwork Print Layout
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => handleChange('defaultLetterheadMode', 'digital')}
                                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                                        settings.defaultLetterheadMode === 'digital'
                                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-950 dark:text-indigo-200 font-bold shadow-xs'
                                            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-extrabold text-xs">Digital Stationery</span>
                                        {settings.defaultLetterheadMode === 'digital' && <Check size={14} className="text-indigo-500" />}
                                    </div>
                                    <p className="text-[10px] text-zinc-500 leading-normal">
                                        Prints full lab branding, header, logo, and address directly on plain white A4 paper.
                                    </p>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleChange('defaultLetterheadMode', 'preprinted')}
                                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                                        settings.defaultLetterheadMode === 'preprinted'
                                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-950 dark:text-indigo-200 font-bold shadow-xs'
                                            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-extrabold text-xs">Pre-Printed Letterhead</span>
                                        {settings.defaultLetterheadMode === 'preprinted' && <Check size={14} className="text-indigo-500" />}
                                    </div>
                                    <p className="text-[10px] text-zinc-500 leading-normal">
                                        Leaves blank top margin for clinic/lab pre-printed stationery. Perfect for offset printed sheets.
                                    </p>
                                </button>
                            </div>
                        </div>

                        {/* TOP MARGIN SLIDER (ACTIVE WHEN PREPRINTED) */}
                        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-[11px] font-black text-zinc-800 dark:text-zinc-200">
                                        Top Letterhead Clearance Margin
                                    </span>
                                    <p className="text-[10px] text-zinc-400">
                                        Distance from top of sheet to the first line of content in pre-printed mode.
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono font-black text-xs">
                                        {settings.topMarginMm} mm
                                    </span>
                                </div>
                            </div>

                            <input
                                type="range"
                                min={0}
                                max={80}
                                step={5}
                                value={settings.topMarginMm}
                                onChange={(e) => handleChange('topMarginMm', parseInt(e.target.value) || 0)}
                                className="w-full accent-indigo-600 cursor-pointer"
                            />
                            <div className="flex justify-between text-[9px] text-zinc-400 font-mono">
                                <span>0 mm (No gap)</span>
                                <span>40 mm (Standard Lab Letterhead)</span>
                                <span>80 mm (High Header)</span>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 4: TERMS & CONDITIONS AND SIGNATORY */}
                    <div className="synos-dept-card rounded-2xl p-6 space-y-5">
                        <div className="flex items-center justify-between border-b dark:border-zinc-800 border-zinc-200 pb-3">
                            <div className="flex items-center gap-2.5">
                                <ShieldCheck size={16} className="text-purple-500" />
                                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                                    4. Commercial Terms, Legal Clauses & Signatures
                                </h3>
                            </div>
                            <span className="text-[10px] text-zinc-400 font-semibold">Standard Indian Commercial Terms</span>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                    Patient & B2B Tax Invoice Terms (Printed at bottom)
                                </label>
                                <textarea
                                    rows={4}
                                    value={settings.termsAndConditions}
                                    onChange={(e) => handleChange('termsAndConditions', e.target.value)}
                                    placeholder="Enter standard payment terms, dispute resolution, jurisdiction..."
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none font-mono text-[11px]"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                    Referral Commission & TDS Statutory Policy (Printed on Doctor Payout Vouchers)
                                </label>
                                <textarea
                                    rows={3}
                                    value={settings.referralTerms || ""}
                                    onChange={(e) => handleChange('referralTerms', e.target.value)}
                                    placeholder="Referral commission terms, TDS deduction declaration under Section 194H..."
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none font-mono text-[11px]"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                                    Authorized Signatory Designation Title
                                </label>
                                <input
                                    type="text"
                                    value={settings.signatoryTitle}
                                    onChange={(e) => handleChange('signatoryTitle', e.target.value)}
                                    placeholder="e.g. Authorised Signatory / Accounts Desk"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-bold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>
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
                                Interactive
                            </span>
                        </div>

                        {/* DOCUMENT TEMPLATE SELECTOR TABS */}
                        <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-800/80 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setPreviewDocType('patient')}
                                className={`py-2 px-1 text-center rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                                    previewDocType === 'patient'
                                        ? 'bg-synos-primary text-white shadow-sm'
                                        : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                Patient Tax Bill
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreviewDocType('partner')}
                                className={`py-2 px-1 text-center rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                                    previewDocType === 'partner'
                                        ? 'bg-synos-primary text-white shadow-sm'
                                        : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                B2B Partner Invoice
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreviewDocType('voucher')}
                                className={`py-2 px-1 text-center rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                                    previewDocType === 'voucher'
                                        ? 'bg-synos-primary text-white shadow-sm'
                                        : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                Payout Voucher
                            </button>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-800">
                            <span>Mode: <strong className="text-zinc-200 capitalize">{settings.defaultLetterheadMode}</strong></span>
                            <span>Margin: <strong className="text-zinc-200 font-mono">{settings.topMarginMm}mm</strong></span>
                            <span>UPI QR: <strong className="text-emerald-400 font-mono">Active</strong></span>
                        </div>
                    </div>

                    {/* SCALED A4 CANVAS PREVIEW WRAPPER */}
                    <div className="rounded-2xl border dark:border-zinc-800 border-zinc-200 bg-zinc-100 dark:bg-zinc-950 p-3 overflow-hidden shadow-inner max-h-[780px] overflow-y-auto">
                        <div className="bg-white text-zinc-900 rounded-xl shadow-2xl p-6 border border-zinc-300 transform scale-90 sm:scale-95 origin-top transition-all">
                            {previewDocType === 'patient' && (
                                <PatientTaxInvoiceA4
                                    data={mockPatientInvoice}
                                    letterheadMode={settings.defaultLetterheadMode}
                                    topMarginMm={settings.topMarginMm}
                                />
                            )}
                            {previewDocType === 'partner' && (
                                <PartnerClaimStatementA4
                                    data={mockPartnerInvoice}
                                    letterheadMode={settings.defaultLetterheadMode}
                                    topMarginMm={settings.topMarginMm}
                                />
                            )}
                            {previewDocType === 'voucher' && (
                                <ReferralPayoutVoucherA4
                                    data={mockPayoutVoucher}
                                    letterheadMode={settings.defaultLetterheadMode}
                                    topMarginMm={settings.topMarginMm}
                                />
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
