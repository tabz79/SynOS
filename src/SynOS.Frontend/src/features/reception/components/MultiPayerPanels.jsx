import React, { useState, useEffect } from 'react';
import { ShieldCheck, Building2, Briefcase, IndianRupee, Plus, X, Loader2, Sparkles, Check, Building } from 'lucide-react';
import { ReceptionApi, clearReceptionMasterCaches } from '@/api/reception';
import { cn } from '@/lib/utils';

export function MultiPayerSelector({
    billingMode,
    onChangeMode,
    disabled = false,
    isDark = false
}) {
    const modes = [
        {
            id: 'Standard',
            title: 'Direct / Standard',
            subtitle: 'Desk collection & doc cut',
            icon: IndianRupee,
            badge: 'Retail'
        },
        {
            id: 'PrepaidPartner',
            title: 'Prepaid Partner',
            subtitle: 'Collected at referral center',
            icon: Building2,
            badge: 'B2B Partner'
        },
        {
            id: 'Insurance',
            title: 'Insurance / TPA',
            subtitle: 'Cashless pre-auth claim',
            icon: ShieldCheck,
            badge: 'Cashless'
        },
        {
            id: 'Corporate',
            title: 'Corporate B2B',
            subtitle: 'Contracted packages & rates',
            icon: Briefcase,
            badge: 'Tie-Up'
        }
    ];

    return (
        <div className="space-y-1.5 w-full">
            <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Billing & Payer Mode
                </label>
                <span className="text-[10px] text-zinc-400 font-medium">Select context to configure pricing & settlement</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 xl:gap-3">
                {modes.map((m) => {
                    const Icon = m.icon;
                    const isSelected = billingMode === m.id;
                    return (
                        <button
                            key={m.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => onChangeMode(m.id)}
                            className={cn(
                                "relative flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all active:scale-[0.98] cursor-pointer",
                                isSelected
                                    ? isDark
                                        ? "bg-synos-primary/15 border-synos-primary text-white shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-synos-primary"
                                        : "bg-blue-50/80 border-blue-500 text-blue-950 shadow-sm ring-1 ring-blue-500"
                                    : isDark
                                        ? "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                                        : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50/60",
                                disabled && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <div className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-colors",
                                isSelected
                                    ? isDark
                                        ? "bg-synos-primary text-white border-synos-primary"
                                        : "bg-blue-600 text-white border-blue-600"
                                    : isDark
                                        ? "bg-zinc-800 text-zinc-400 border-zinc-700"
                                        : "bg-zinc-100 text-zinc-500 border-zinc-200"
                            )}>
                                <Icon className="w-3.5 h-3.5" />
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-xs font-bold truncate leading-tight">
                                        {m.title}
                                    </span>
                                    {isSelected && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                    )}
                                </div>
                                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5 truncate">
                                    {m.subtitle}
                                </p>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export function InsuranceContextPanel({
    insuranceCompanies = [],
    selectedCompanyId,
    policyNumber,
    preAuthNumber,
    coPayAmount,
    onChange,
    onOpenAddModal,
    isDark = false,
    disabled = false
}) {
    return (
        <div className={cn(
            "p-3 rounded-xl border space-y-3 animate-in fade-in duration-200",
            isDark ? "bg-zinc-900/80 border-blue-900/40" : "bg-blue-50/50 border-blue-200/80"
        )}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        Cashless Insurance / TPA Details
                    </span>
                </div>
                <button
                    type="button"
                    onClick={onOpenAddModal}
                    disabled={disabled}
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                    <Plus className="w-3 h-3" /> Add Insurer
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Insurer Dropdown */}
                <div className="sm:col-span-2">
                    <label className="block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                        Insurance Company / TPA Provider <span className="text-rose-500">*</span>
                    </label>
                    <select
                        value={selectedCompanyId || ''}
                        disabled={disabled}
                        onChange={(e) => onChange({ insuranceCompanyId: e.target.value ? parseInt(e.target.value, 10) : null })}
                        className={cn(
                            "w-full h-8 px-2.5 rounded-lg text-xs font-medium border outline-none transition-all",
                            isDark
                                ? "bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-blue-500"
                                : "bg-white border-zinc-300 text-zinc-900 focus:border-blue-500 shadow-sm"
                        )}
                    >
                        <option value="">-- Select Empanelled Insurance Company --</option>
                        {insuranceCompanies.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.name} {c.tpaCode ? `(${c.tpaCode})` : ''} - {c.payerType || 'TPA'}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Policy / Card No */}
                <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                        Policy / Member ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                        type="text"
                        placeholder="e.g. POL-84920491"
                        value={policyNumber || ''}
                        disabled={disabled}
                        onChange={(e) => onChange({ policyNumber: e.target.value })}
                        className={cn(
                            "w-full h-8 px-2.5 rounded-lg text-xs font-medium border outline-none transition-all font-mono",
                            isDark
                                ? "bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-blue-500"
                                : "bg-white border-zinc-300 text-zinc-900 focus:border-blue-500 shadow-sm"
                        )}
                    />
                </div>

                {/* Pre-Auth Approval No */}
                <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                        Pre-Auth / Approval No.
                    </label>
                    <input
                        type="text"
                        placeholder="e.g. AUTH-2026-X89"
                        value={preAuthNumber || ''}
                        disabled={disabled}
                        onChange={(e) => onChange({ preAuthApprovalNumber: e.target.value })}
                        className={cn(
                            "w-full h-8 px-2.5 rounded-lg text-xs font-medium border outline-none transition-all font-mono",
                            isDark
                                ? "bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-blue-500"
                                : "bg-white border-zinc-300 text-zinc-900 focus:border-blue-500 shadow-sm"
                        )}
                    />
                </div>

                {/* Co-Pay Amount */}
                <div className="sm:col-span-2">
                    <label className="block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                        Patient Co-Pay Amount (₹) <span className="text-zinc-400 font-normal">(Leave 0 for 100% cashless)</span>
                    </label>
                    <div className="relative">
                        <span className="absolute left-2.5 top-1.5 text-xs text-zinc-400 font-mono">₹</span>
                        <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={coPayAmount === undefined || coPayAmount === null ? '' : coPayAmount}
                            disabled={disabled}
                            onChange={(e) => onChange({ insuranceCoPayAmount: e.target.value ? parseFloat(e.target.value) : 0 })}
                            className={cn(
                                "w-full h-8 pl-6 pr-2.5 rounded-lg text-xs font-bold border outline-none transition-all font-mono",
                                isDark
                                    ? "bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-blue-500"
                                    : "bg-white border-zinc-300 text-zinc-900 focus:border-blue-500 shadow-sm"
                            )}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export function CorporateContextPanel({
    corporateAccounts = [],
    selectedAccountId,
    employeeId,
    corporateRateRules = [],
    onAddPackageTest,
    onChange,
    onOpenAddModal,
    isDark = false,
    disabled = false
}) {
    // Packages configured for this corporate (isProfile === true or package rules)
    const packageRules = corporateRateRules.filter(r => r.isPackage || r.isProfile);

    return (
        <div className={cn(
            "p-3 rounded-xl border space-y-3 animate-in fade-in duration-200",
            isDark ? "bg-zinc-900/80 border-indigo-900/40" : "bg-indigo-50/50 border-indigo-200/80"
        )}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        Corporate Tie-up & B2B Packages
                    </span>
                </div>
                <button
                    type="button"
                    onClick={onOpenAddModal}
                    disabled={disabled}
                    className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                    <Plus className="w-3 h-3" /> Add Account
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Corporate Account Dropdown */}
                <div className="sm:col-span-2">
                    <label className="block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                        Corporate Client / Organization <span className="text-rose-500">*</span>
                    </label>
                    <select
                        value={selectedAccountId || ''}
                        disabled={disabled}
                        onChange={(e) => onChange({ corporateAccountId: e.target.value ? parseInt(e.target.value, 10) : null })}
                        className={cn(
                            "w-full h-8 px-2.5 rounded-lg text-xs font-medium border outline-none transition-all",
                            isDark
                                ? "bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-indigo-500"
                                : "bg-white border-zinc-300 text-zinc-900 focus:border-indigo-500 shadow-sm"
                        )}
                    >
                        <option value="">-- Select Contracted Corporate Account --</option>
                        {corporateAccounts.map(a => (
                            <option key={a.id} value={a.id}>
                                {a.companyName} {a.corporateCode ? `[${a.corporateCode}]` : ''}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Employee / Staff ID */}
                <div className="sm:col-span-2">
                    <label className="block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                        Employee ID / Staff Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                        type="text"
                        placeholder="e.g. EMP-10492 or STAFF-SBI-829"
                        value={employeeId || ''}
                        disabled={disabled}
                        onChange={(e) => onChange({ employeeId: e.target.value })}
                        className={cn(
                            "w-full h-8 px-2.5 rounded-lg text-xs font-medium border outline-none transition-all font-mono",
                            isDark
                                ? "bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-indigo-500"
                                : "bg-white border-zinc-300 text-zinc-900 focus:border-indigo-500 shadow-sm"
                        )}
                    />
                </div>
            </div>

            {/* Contracted Packages Quick Chips */}
            {selectedAccountId && (
                <div className="pt-1 border-t border-indigo-200/50 dark:border-indigo-900/50 space-y-1.5">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-500" /> Contracted Corporate Bundles
                        </span>
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                            {packageRules.length} packages available
                        </span>
                    </div>

                    {packageRules.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                            {packageRules.map(pkg => (
                                <button
                                    key={pkg.id || pkg.testCode}
                                    type="button"
                                    onClick={() => onAddPackageTest && onAddPackageTest(pkg)}
                                    className={cn(
                                        "px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border transition-all active:scale-95 cursor-pointer",
                                        isDark
                                            ? "bg-indigo-950/60 border-indigo-700/60 text-indigo-200 hover:bg-indigo-900/80"
                                            : "bg-white border-indigo-300 text-indigo-900 hover:bg-indigo-50 shadow-sm"
                                    )}
                                    title={`Click to add ${pkg.testName || pkg.name} at contracted corporate rate ₹${pkg.corporatePrice}`}
                                >
                                    <Plus className="w-3 h-3 text-indigo-500" />
                                    <span>{pkg.testName || pkg.name}</span>
                                    <span className="font-mono text-emerald-600 dark:text-emerald-400">₹{pkg.corporatePrice}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[10px] italic text-zinc-500">
                            Corporate pricing active: Catalog search will automatically reflect negotiated rates.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

export function AddInsuranceCompanyModal({
    isOpen,
    onClose,
    onSuccess,
    isDark = false
}) {
    const [name, setName] = useState('');
    const [tpaCode, setTpaCode] = useState('');
    const [payerType, setPayerType] = useState('TPA');
    const [contactPhone, setContactPhone] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            setError("Company name is required.");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            const created = await ReceptionApi.createInsuranceCompany({
                name: name.trim(),
                tpaCode: tpaCode.trim() || null,
                payerType,
                contactPhone: contactPhone.trim() || null,
                contactEmail: contactEmail.trim() || null
            });
            onSuccess(created);
            onClose();
        } catch (err) {
            setError(err.message || "Failed to create insurance company");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className={cn(
                "w-full max-w-md rounded-2xl border shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150",
                isDark ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"
            )}>
                <div className="flex items-center justify-between border-b pb-3 border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-blue-500" />
                        <h3 className="text-sm font-bold">Add Empanelled Insurer / TPA</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {error && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                            Insurance / TPA Name *
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Star Health & Allied Insurance"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={cn(
                                "w-full h-9 px-3 rounded-lg text-xs font-medium border outline-none",
                                isDark ? "bg-zinc-950 border-zinc-700 focus:border-blue-500" : "bg-zinc-50 border-zinc-300 focus:border-blue-500"
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                                TPA Code
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. STAR_TPA"
                                value={tpaCode}
                                onChange={(e) => setTpaCode(e.target.value)}
                                className={cn(
                                    "w-full h-9 px-3 rounded-lg text-xs font-mono uppercase border outline-none",
                                    isDark ? "bg-zinc-950 border-zinc-700 focus:border-blue-500" : "bg-zinc-50 border-zinc-300 focus:border-blue-500"
                                )}
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                                Payer Type
                            </label>
                            <select
                                value={payerType}
                                onChange={(e) => setPayerType(e.target.value)}
                                className={cn(
                                    "w-full h-9 px-3 rounded-lg text-xs font-medium border outline-none",
                                    isDark ? "bg-zinc-950 border-zinc-700 focus:border-blue-500" : "bg-zinc-50 border-zinc-300 focus:border-blue-500"
                                )}
                            >
                                <option value="TPA">Third-Party Administrator (TPA)</option>
                                <option value="DirectInsurer">Direct Insurer</option>
                                <option value="GovernmentScheme">Government Scheme (PMJAY/CGHS)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                                Helpdesk Phone
                            </label>
                            <input
                                type="text"
                                placeholder="1800-XXX-XXXX"
                                value={contactPhone}
                                onChange={(e) => setContactPhone(e.target.value)}
                                className={cn(
                                    "w-full h-9 px-3 rounded-lg text-xs font-medium border outline-none",
                                    isDark ? "bg-zinc-950 border-zinc-700 focus:border-blue-500" : "bg-zinc-50 border-zinc-300 focus:border-blue-500"
                                )}
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                                Claims Email
                            </label>
                            <input
                                type="email"
                                placeholder="claims@starhealth.in"
                                value={contactEmail}
                                onChange={(e) => setContactEmail(e.target.value)}
                                className={cn(
                                    "w-full h-9 px-3 rounded-lg text-xs font-medium border outline-none",
                                    isDark ? "bg-zinc-950 border-zinc-700 focus:border-blue-500" : "bg-zinc-50 border-zinc-300 focus:border-blue-500"
                                )}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3.5 py-2 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                        >
                            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Create Insurer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export function AddCorporateAccountModal({
    isOpen,
    onClose,
    onSuccess,
    isDark = false
}) {
    const [companyName, setCompanyName] = useState('');
    const [corporateCode, setCorporateCode] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [billingCycleDays, setBillingCycleDays] = useState(30);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!companyName.trim()) {
            setError("Company name is required.");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            const created = await ReceptionApi.createCorporateAccount({
                companyName: companyName.trim(),
                corporateCode: corporateCode.trim() || null,
                contactPerson: contactPerson.trim() || null,
                contactPhone: contactPhone.trim() || null,
                contactEmail: contactEmail.trim() || null,
                billingCycleDays: parseInt(billingCycleDays, 10) || 30
            });
            onSuccess(created);
            onClose();
        } catch (err) {
            setError(err.message || "Failed to create corporate account");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className={cn(
                "w-full max-w-md rounded-2xl border shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150",
                isDark ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"
            )}>
                <div className="flex items-center justify-between border-b pb-3 border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-indigo-500" />
                        <h3 className="text-sm font-bold">Add Corporate Account Tie-up</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {error && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                            Company / Organization Name *
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. State Bank of India or TCS"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className={cn(
                                "w-full h-9 px-3 rounded-lg text-xs font-medium border outline-none",
                                isDark ? "bg-zinc-950 border-zinc-700 focus:border-indigo-500" : "bg-zinc-50 border-zinc-300 focus:border-indigo-500"
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                                Corporate Code
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. CORP-SBI"
                                value={corporateCode}
                                onChange={(e) => setCorporateCode(e.target.value)}
                                className={cn(
                                    "w-full h-9 px-3 rounded-lg text-xs font-mono uppercase border outline-none",
                                    isDark ? "bg-zinc-950 border-zinc-700 focus:border-indigo-500" : "bg-zinc-50 border-zinc-300 focus:border-indigo-500"
                                )}
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                                Billing Cycle (Days)
                            </label>
                            <input
                                type="number"
                                min="7"
                                max="90"
                                value={billingCycleDays}
                                onChange={(e) => setBillingCycleDays(e.target.value)}
                                className={cn(
                                    "w-full h-9 px-3 rounded-lg text-xs font-medium border outline-none",
                                    isDark ? "bg-zinc-950 border-zinc-700 focus:border-indigo-500" : "bg-zinc-50 border-zinc-300 focus:border-indigo-500"
                                )}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                                HR / Liaison Contact
                            </label>
                            <input
                                type="text"
                                placeholder="HR Manager Name"
                                value={contactPerson}
                                onChange={(e) => setContactPerson(e.target.value)}
                                className={cn(
                                    "w-full h-9 px-3 rounded-lg text-xs font-medium border outline-none",
                                    isDark ? "bg-zinc-950 border-zinc-700 focus:border-indigo-500" : "bg-zinc-50 border-zinc-300 focus:border-indigo-500"
                                )}
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                                Phone Number
                            </label>
                            <input
                                type="text"
                                placeholder="+91 98765 43210"
                                value={contactPhone}
                                onChange={(e) => setContactPhone(e.target.value)}
                                className={cn(
                                    "w-full h-9 px-3 rounded-lg text-xs font-medium border outline-none",
                                    isDark ? "bg-zinc-950 border-zinc-700 focus:border-indigo-500" : "bg-zinc-50 border-zinc-300 focus:border-indigo-500"
                                )}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                            Contact Email
                        </label>
                        <input
                            type="email"
                            placeholder="hr@company.com"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            className={cn(
                                "w-full h-9 px-3 rounded-lg text-xs font-medium border outline-none",
                                isDark ? "bg-zinc-950 border-zinc-700 focus:border-indigo-500" : "bg-zinc-50 border-zinc-300 focus:border-indigo-500"
                            )}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3.5 py-2 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                        >
                            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Create Corporate Account
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export function AddReferralPartnerModal({
    isOpen,
    onClose,
    onSuccess,
    initialPaymentModel = 'LabCollects',
    isDark = false
}) {
    const [name, setName] = useState('');
    const [partnerType, setPartnerType] = useState('Doctor'); // Doctor | Clinic | Hospital
    const [contactInfo, setContactInfo] = useState('');
    const [commissionPercentage, setCommissionPercentage] = useState(10);
    const [paymentCollectionModel, setPaymentCollectionModel] = useState(initialPaymentModel);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setPaymentCollectionModel(initialPaymentModel);
            setName('');
            setContactInfo('');
            setError(null);
        }
    }, [isOpen, initialPaymentModel]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            setError("Partner / Doctor / Clinic name is required.");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            const created = await ReceptionApi.createReferralPartner({
                name: name.trim(),
                partnerType: partnerType,
                contactInfo: contactInfo.trim() || null,
                defaultCommissionPercentage: parseFloat(commissionPercentage) || 0,
                calculationBase: 'AfterDiscounts',
                paymentCollectionModel: paymentCollectionModel,
                isActive: true
            });
            clearReceptionMasterCaches();
            if (onSuccess) onSuccess(created);
            onClose();
        } catch (err) {
            setError(err.message || "Failed to create referral partner in database");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className={cn(
                "w-full max-w-md rounded-2xl border shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150",
                isDark ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"
            )}>
                <div className="flex items-center justify-between border-b pb-3 border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-emerald-500" />
                        <div>
                            <h3 className="text-sm font-bold">Add Referral Partner</h3>
                            <p className="text-[10px] text-zinc-500">Persists directly to database (ReferralPartners table)</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {error && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                            Partner / Doctor / Clinic Name *
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Dr. Rajesh Sharma, MD or Apex Diagnostic Care"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={cn(
                                "w-full h-9 px-3 rounded-lg text-xs font-medium border outline-none",
                                isDark ? "bg-zinc-950 border-zinc-700 focus:border-emerald-500" : "bg-zinc-50 border-zinc-300 focus:border-emerald-500"
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                                Partner Type
                            </label>
                            <select
                                value={partnerType}
                                onChange={(e) => setPartnerType(e.target.value)}
                                className={cn(
                                    "w-full h-9 px-3 rounded-lg text-xs font-medium border outline-none cursor-pointer",
                                    isDark ? "bg-zinc-950 border-zinc-700 focus:border-emerald-500" : "bg-zinc-50 border-zinc-300 focus:border-emerald-500"
                                )}
                            >
                                <option value="Doctor">Doctor / Physician</option>
                                <option value="Clinic">Clinic / Diagnostic Center</option>
                                <option value="Hospital">Hospital / Nursing Home</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                                Default Cut %
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={commissionPercentage}
                                onChange={(e) => setCommissionPercentage(e.target.value)}
                                className={cn(
                                    "w-full h-9 px-3 rounded-lg text-xs font-medium border outline-none",
                                    isDark ? "bg-zinc-950 border-zinc-700 focus:border-emerald-500" : "bg-zinc-50 border-zinc-300 focus:border-emerald-500"
                                )}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                            Contact Info / Phone / Address
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. +91 98765 43210, Civil Lines"
                            value={contactInfo}
                            onChange={(e) => setContactInfo(e.target.value)}
                            className={cn(
                                "w-full h-9 px-3 rounded-lg text-xs font-medium border outline-none",
                                isDark ? "bg-zinc-950 border-zinc-700 focus:border-emerald-500" : "bg-zinc-50 border-zinc-300 focus:border-emerald-500"
                            )}
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                            Default Collection Model
                        </label>
                        <select
                            value={paymentCollectionModel}
                            onChange={(e) => setPaymentCollectionModel(e.target.value)}
                            className={cn(
                                "w-full h-9 px-3 rounded-lg text-xs font-medium border outline-none cursor-pointer",
                                isDark ? "bg-zinc-950 border-zinc-700 focus:border-emerald-500" : "bg-zinc-50 border-zinc-300 focus:border-emerald-500"
                            )}
                        >
                            <option value="LabCollects">Lab Collects at Desk (Direct / Commission)</option>
                            <option value="PartnerCollects">Partner Collects Outside (Prepaid B2B Bill)</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3.5 py-2 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Save Referral Partner
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

