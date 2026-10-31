import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Building2, Briefcase, IndianRupee, Plus, X, Loader2, Sparkles, Check, Building, ChevronDown, ChevronRight, Search } from 'lucide-react';
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
            subtitle: 'Desk collection & standard tariff',
            icon: IndianRupee,
            badge: 'Retail'
        },
        {
            id: 'PrepaidPartner',
            title: 'Corporate B2B (Prepaid)',
            subtitle: 'B2B partner billed, ₹0 at desk',
            icon: Building2,
            badge: 'B2B Prepaid'
        },
        {
            id: 'Insurance',
            title: 'Insurance / TPA',
            subtitle: 'Cashless pre-auth claim',
            icon: ShieldCheck,
            badge: 'Cashless'
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 xl:gap-3">
                {modes.map((m) => {
                    const Icon = m.icon;
                    const isSelected = billingMode === m.id;
                    return (
                        <button
                            key={m.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => {
                                if (!disabled && billingMode !== m.id) onChangeMode(m.id);
                            }}
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
    corporateAccounts = [],
    selectedCompanyId,
    policyNumber,
    preAuthNumber,
    coPayAmount,
    onChange,
    onOpenAddModal,
    isDark = false,
    disabled = false
}) {
    const [localPolicy, setLocalPolicy] = useState(policyNumber || '');
    const [localPreAuth, setLocalPreAuth] = useState(preAuthNumber || '');
    const [localCoPay, setLocalCoPay] = useState(coPayAmount === undefined || coPayAmount === null ? '' : coPayAmount);
    const [showAdvanced, setShowAdvanced] = useState(Boolean(preAuthNumber || (coPayAmount && Number(coPayAmount) > 0)));

    // Searchable Combobox State
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const comboboxRef = useRef(null);
    const dropdownListRef = useRef(null);

    const isPolicyFocusedRef = useRef(false);
    const isPreAuthFocusedRef = useRef(false);
    const isCoPayFocusedRef = useRef(false);

    const policyTimerRef = useRef(null);
    const preAuthTimerRef = useRef(null);
    const coPayTimerRef = useRef(null);

    // Combine standard insurance companies & institutional accounts (e.g. LIC, SBI)
    const allProviders = [
        ...insuranceCompanies.map(c => ({
            id: c.insuranceCompanyId || c.id,
            name: c.name,
            code: c.code,
            tpaName: c.tpaName,
            isCorporate: false
        })),
        ...corporateAccounts.map(c => ({
            id: c.corporateAccountId || c.id,
            name: c.companyName || c.name,
            code: c.corporateCode || c.code,
            tpaName: c.contactPerson || 'Corporate Tie-up',
            isCorporate: true
        }))
    ];

    const selectedProvider = allProviders.find(p => p.id === selectedCompanyId);

    const filteredProviders = allProviders.filter(p => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
            (p.name || '').toLowerCase().includes(q) ||
            (p.code || '').toLowerCase().includes(q) ||
            (p.tpaName || '').toLowerCase().includes(q)
        );
    });

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (comboboxRef.current && !comboboxRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
                if (selectedProvider) {
                    setIsSearching(false);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [selectedProvider]);

    // Keep highlighted index in view
    useEffect(() => {
        if (isDropdownOpen && highlightedIndex >= 0 && dropdownListRef.current) {
            const el = dropdownListRef.current.children[highlightedIndex];
            if (el) {
                el.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex, isDropdownOpen]);

    const handleSelectProvider = (prov) => {
        if (prov.isCorporate) {
            onChange({ corporateAccountId: prov.id, insuranceCompanyId: null }, { persist: true, silent: false, refreshSnapshot: true });
        } else {
            onChange({ insuranceCompanyId: prov.id, corporateAccountId: null }, { persist: true, silent: false, refreshSnapshot: true });
        }
        setIsDropdownOpen(false);
        setIsSearching(false);
        setSearchQuery('');
    };

    const handleComboboxKeyDown = (e) => {
        if (!isDropdownOpen || filteredProviders.length === 0) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                setIsDropdownOpen(true);
            }
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev < filteredProviders.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredProviders.length - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex >= 0 && highlightedIndex < filteredProviders.length) {
                handleSelectProvider(filteredProviders[highlightedIndex]);
            }
        } else if (e.key === 'Escape') {
            setIsDropdownOpen(false);
            if (selectedProvider) setIsSearching(false);
        }
    };

    useEffect(() => {
        if (!isPolicyFocusedRef.current) setLocalPolicy(policyNumber || '');
    }, [policyNumber]);

    useEffect(() => {
        if (!isPreAuthFocusedRef.current) setLocalPreAuth(preAuthNumber || '');
    }, [preAuthNumber]);

    useEffect(() => {
        if (!isCoPayFocusedRef.current) setLocalCoPay(coPayAmount === undefined || coPayAmount === null ? '' : coPayAmount);
    }, [coPayAmount]);

    useEffect(() => {
        return () => {
            if (policyTimerRef.current) clearTimeout(policyTimerRef.current);
            if (preAuthTimerRef.current) clearTimeout(preAuthTimerRef.current);
            if (coPayTimerRef.current) clearTimeout(coPayTimerRef.current);
        };
    }, []);

    const handlePolicyChange = (val) => {
        setLocalPolicy(val);
        // Immediate in-memory sync (no API call, no spinner)
        onChange({ policyNumber: val }, { persist: false });
        // Debounced silent background persist
        if (policyTimerRef.current) clearTimeout(policyTimerRef.current);
        policyTimerRef.current = setTimeout(() => {
            onChange({ policyNumber: val }, { persist: true, silent: true, refreshSnapshot: false });
        }, 500);
    };

    const handlePolicyBlur = () => {
        isPolicyFocusedRef.current = false;
        if (policyTimerRef.current) clearTimeout(policyTimerRef.current);
        onChange({ policyNumber: localPolicy }, { persist: true, silent: true, refreshSnapshot: false });
    };

    const handlePreAuthChange = (val) => {
        setLocalPreAuth(val);
        // Immediate in-memory sync (no API call, no spinner)
        onChange({ preAuthApprovalNumber: val }, { persist: false });
        // Debounced silent background persist
        if (preAuthTimerRef.current) clearTimeout(preAuthTimerRef.current);
        preAuthTimerRef.current = setTimeout(() => {
            onChange({ preAuthApprovalNumber: val }, { persist: true, silent: true, refreshSnapshot: false });
        }, 500);
    };

    const handlePreAuthBlur = () => {
        isPreAuthFocusedRef.current = false;
        if (preAuthTimerRef.current) clearTimeout(preAuthTimerRef.current);
        onChange({ preAuthApprovalNumber: localPreAuth }, { persist: true, silent: true, refreshSnapshot: false });
    };

    const handleCoPayChange = (val) => {
        setLocalCoPay(val);
        const parsed = val ? parseFloat(val) : 0;
        // Immediate in-memory sync
        onChange({ insuranceCoPayAmount: parsed }, { persist: false });
        // Debounced silent background persist
        if (coPayTimerRef.current) clearTimeout(coPayTimerRef.current);
        coPayTimerRef.current = setTimeout(() => {
            onChange({ insuranceCoPayAmount: parsed }, { persist: true, silent: true, refreshSnapshot: false });
        }, 500);
    };

    const handleCoPayBlur = () => {
        isCoPayFocusedRef.current = false;
        if (coPayTimerRef.current) clearTimeout(coPayTimerRef.current);
        const parsed = localCoPay ? parseFloat(localCoPay) : 0;
        onChange({ insuranceCoPayAmount: parsed }, { persist: true, silent: true, refreshSnapshot: false });
    };

    return (
        <div className={cn(
            "p-3 rounded-xl border space-y-3 animate-in fade-in duration-200",
            isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-white border-zinc-200/90 shadow-2xs"
        )}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                        Insurance & Corporate Details
                    </span>
                </div>
                <button
                    type="button"
                    onClick={onOpenAddModal}
                    disabled={disabled}
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                    <Plus className="w-3 h-3" /> Add Company
                </button>
            </div>

            <div className="space-y-3">
                {/* 1. ENTERPRISE SEARCHABLE COMBOBOX OR SELECTED TILE */}
                <div>
                    <label className="block text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                        Insurance / Corporate Company <span className="text-rose-500">*</span>
                    </label>

                    {selectedProvider && !isSearching ? (
                        /* Selected Company Tile */
                        <div className={cn(
                            "flex items-center justify-between p-2.5 rounded-xl border transition-all",
                            isDark 
                                ? "bg-zinc-950/80 border-blue-500/30 text-white" 
                                : "bg-blue-50/40 border-blue-200 text-zinc-900"
                        )}>
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                                    selectedProvider.isCorporate
                                        ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
                                        : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                    )}>
                                    {selectedProvider.isCorporate ? <Briefcase size={16} /> : <ShieldCheck size={16} />}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-bold text-xs truncate">
                                            {selectedProvider.name}
                                        </span>
                                        {selectedProvider.code && (
                                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-zinc-200/60 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300/40 dark:border-zinc-700/50">
                                                {selectedProvider.code}
                                            </span>
                                        )}
                                        <span className={cn(
                                            "text-[9px] font-bold px-1.5 py-0.2 rounded border",
                                            selectedProvider.isCorporate 
                                                ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                                                : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                        )}>
                                            {selectedProvider.isCorporate ? "Corporate" : "Insurance"}
                                        </span>
                                    </div>
                                    {selectedProvider.tpaName && (
                                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                            {selectedProvider.tpaName}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {!disabled && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsSearching(true);
                                        setSearchQuery('');
                                        setIsDropdownOpen(true);
                                    }}
                                    className="ml-2 px-2.5 py-1 rounded-lg text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 border border-blue-500/20 transition-colors shrink-0 cursor-pointer"
                                >
                                    Change
                                </button>
                            )}
                        </div>
                    ) : (
                        /* Searchable Combobox Input with Anchored Dropdown */
                        <div className="relative" ref={comboboxRef}>
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    disabled={disabled}
                                    autoFocus={isSearching}
                                    placeholder={selectedProvider ? `Currently: ${selectedProvider.name}` : "Search from 50+ companies & insurers (e.g. LIC, Star, SBI)..."}
                                    onFocus={() => setIsDropdownOpen(true)}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setIsDropdownOpen(true);
                                        setHighlightedIndex(0);
                                    }}
                                    onKeyDown={handleComboboxKeyDown}
                                    className={cn(
                                        "w-full h-9 pl-9 pr-8 rounded-lg text-xs font-medium border outline-none transition-all",
                                        isDark
                                            ? "bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-blue-500 placeholder:text-zinc-500"
                                            : "bg-white border-zinc-300 text-zinc-900 focus:border-blue-500 shadow-sm placeholder:text-zinc-400"
                                    )}
                                />
                                {selectedProvider && isSearching && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsSearching(false);
                                            setIsDropdownOpen(false);
                                        }}
                                        className="absolute right-2.5 top-2 text-[10px] font-bold text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 px-1.5 py-0.5 rounded"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>

                            {/* Anchored Dropdown List */}
                            {isDropdownOpen && (
                                <div className={cn(
                                    "absolute top-full left-0 right-0 mt-1.5 rounded-xl border shadow-xl z-50 overflow-hidden max-h-60 flex flex-col backdrop-blur-md",
                                    isDark ? "bg-zinc-900/95 border-zinc-700/60 shadow-black/50" : "bg-white/95 border-zinc-200/90 shadow-zinc-900/10"
                                )}>
                                    <div className="px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[10px] text-zinc-400 font-medium bg-zinc-50/50 dark:bg-zinc-950/50">
                                        <span>{filteredProviders.length} companies available</span>
                                        <span>Use ↑↓ keys + Enter</span>
                                    </div>
                                    
                                    <div className="p-1 overflow-y-auto space-y-1" ref={dropdownListRef}>
                                        {filteredProviders.length > 0 ? (
                                            filteredProviders.map((p, idx) => {
                                                const isSelected = highlightedIndex === idx;
                                                return (
                                                    <div
                                                        key={p.id}
                                                        onMouseEnter={() => setHighlightedIndex(idx)}
                                                        onClick={() => handleSelectProvider(p)}
                                                        className={cn(
                                                            "p-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-all duration-150 text-left",
                                                            isSelected
                                                                ? (isDark 
                                                                    ? "bg-blue-500/15 border border-blue-400/40 text-white font-bold shadow-xs scale-[0.99]" 
                                                                    : "bg-blue-50/90 border border-blue-400/50 text-blue-900 font-bold shadow-xs scale-[0.99]")
                                                                : (isDark 
                                                                    ? "hover:bg-zinc-800/70 border border-transparent text-zinc-200 hover:text-white" 
                                                                    : "hover:bg-zinc-50 border border-transparent text-zinc-800 hover:text-zinc-950")
                                                        )}
                                                    >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className={cn(
                                                            "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
                                                            p.isCorporate ? "bg-indigo-500/10 text-indigo-500" : "bg-blue-500/10 text-blue-500"
                                                        )}>
                                                            {p.isCorporate ? <Briefcase size={13} /> : <ShieldCheck size={13} />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="text-xs font-bold leading-tight truncate">
                                                                    {p.name}
                                                                </span>
                                                                {p.code && (
                                                                    <span className="px-1 py-0.2 rounded text-[9px] font-mono font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                                                                        {p.code}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {p.tpaName && (
                                                                <span className="text-[10px] text-zinc-400 truncate block mt-0.5">
                                                                    {p.tpaName}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className={cn(
                                                        "text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ml-2",
                                                        p.isCorporate 
                                                            ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                                                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                                    )}>
                                                        {p.isCorporate ? "Corporate" : "Insurance"}
                                                    </span>
                                                </div>
                                            );
                                        })
                                    ) : (
                                            <div className="p-4 text-center text-xs text-zinc-400">
                                                No company found matching "{searchQuery}"
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 2. EMPLOYEE ID / MEMBER NO (OPTIONAL) */}
                <div>
                    <label className="block text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                        Employee ID / Member No. <span className="text-zinc-400 font-normal">(Optional)</span>
                    </label>
                    <input
                        type="text"
                        placeholder="e.g. EMP-10492 or Member ID"
                        value={localPolicy}
                        disabled={disabled}
                        onFocus={() => { isPolicyFocusedRef.current = true; }}
                        onBlur={handlePolicyBlur}
                        onChange={(e) => handlePolicyChange(e.target.value)}
                        className={cn(
                            "w-full h-8 px-2.5 rounded-lg text-xs font-medium border outline-none transition-all font-mono",
                            isDark
                                ? "bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-blue-500"
                                : "bg-white border-zinc-300 text-zinc-900 focus:border-blue-500 shadow-sm"
                        )}
                    />
                </div>

                {/* 3. ADVANCED CLAIM SETTINGS TOGGLE */}
                <div className="pt-0.5">
                    <button
                        type="button"
                        onClick={() => setShowAdvanced(prev => !prev)}
                        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors cursor-pointer py-0.5 select-none"
                    >
                        {showAdvanced ? <ChevronDown size={13} className="text-zinc-400" /> : <ChevronRight size={13} className="text-zinc-400" />}
                        <span>{showAdvanced ? "Hide Advanced Claim Details" : "Show Advanced Claim Details (Pre-Auth, Co-Pay)"}</span>
                        {(localPreAuth || (localCoPay && Number(localCoPay) > 0)) && !showAdvanced && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Has pre-auth or co-pay values" />
                        )}
                    </button>
                </div>

                {/* 4. COLLAPSIBLE ADVANCED CLAIM FIELDS */}
                {showAdvanced && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-dashed border-zinc-200 dark:border-zinc-800 animate-in fade-in duration-200">
                        {/* Pre-Auth Approval No */}
                        <div>
                            <label className="block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                                Pre-Auth / Approval No. <span className="text-zinc-400 font-normal">(Optional)</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. AUTH-2026-X89"
                                value={localPreAuth}
                                disabled={disabled}
                                onFocus={() => { isPreAuthFocusedRef.current = true; }}
                                onBlur={handlePreAuthBlur}
                                onChange={(e) => handlePreAuthChange(e.target.value)}
                                className={cn(
                                    "w-full h-8 px-2.5 rounded-lg text-xs font-medium border outline-none transition-all font-mono",
                                    isDark
                                        ? "bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-blue-500"
                                        : "bg-white border-zinc-300 text-zinc-900 focus:border-blue-500 shadow-sm"
                                )}
                            />
                        </div>

                        {/* Co-Pay Amount */}
                        <div>
                            <label className="block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                                Patient Co-Pay Amount (₹) <span className="text-zinc-400 font-normal">(Leave 0 for 100% cashless)</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-2.5 top-1.5 text-xs text-zinc-400 font-mono">₹</span>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={localCoPay}
                                    disabled={disabled}
                                    onFocus={() => { isCoPayFocusedRef.current = true; }}
                                    onBlur={handleCoPayBlur}
                                    onChange={(e) => handleCoPayChange(e.target.value)}
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
                )}
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
    const [localEmployeeId, setLocalEmployeeId] = useState(employeeId || '');
    const isFocusedRef = useRef(false);
    const debounceTimerRef = useRef(null);

    // Sync external changes only when not actively typing/focused
    useEffect(() => {
        if (!isFocusedRef.current) {
            setLocalEmployeeId(employeeId || '');
        }
    }, [employeeId]);

    // Clean up timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, []);

    const handleEmployeeIdChange = (val) => {
        setLocalEmployeeId(val);

        // Immediate in-memory sync to avoid stale validations (no API call, no spinner)
        onChange({ employeeId: val }, { persist: false });

        // Debounce backend persistence (silent background save, no spinner, no snapshot refresh)
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
            onChange({ employeeId: val }, { persist: true, silent: true, refreshSnapshot: false });
        }, 500);
    };

    const handleEmployeeIdBlur = () => {
        isFocusedRef.current = false;
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        onChange({ employeeId: localEmployeeId }, { persist: true, silent: true, refreshSnapshot: false });
    };

    return (
        <div className={cn(
            "p-3 rounded-xl border space-y-3 animate-in fade-in duration-200",
            isDark ? "bg-zinc-900/80 border-indigo-900/40" : "bg-indigo-50/50 border-indigo-200/80"
        )}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        Corporate Tie-up Account
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
                        onChange={(e) => onChange({ corporateAccountId: e.target.value || null }, { persist: true, silent: false, refreshSnapshot: true })}
                        className={cn(
                            "w-full h-8 px-2.5 rounded-lg text-xs font-medium border outline-none transition-all",
                            isDark
                                ? "bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-indigo-500"
                                : "bg-white border-zinc-300 text-zinc-900 focus:border-indigo-500 shadow-sm"
                        )}
                    >
                        <option value="">-- Select Contracted Corporate Account --</option>
                        {corporateAccounts.map(a => {
                            const accId = a.corporateAccountId || a.id;
                            return (
                                <option key={accId} value={accId}>
                                    {a.companyName} {a.corporateCode ? `[${a.corporateCode}]` : ''}
                                </option>
                            );
                        })}
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
                        value={localEmployeeId}
                        disabled={disabled}
                        onFocus={() => { isFocusedRef.current = true; }}
                        onBlur={handleEmployeeIdBlur}
                        onChange={(e) => handleEmployeeIdChange(e.target.value)}
                        className={cn(
                            "w-full h-8 px-2.5 rounded-lg text-xs font-medium border outline-none transition-all font-mono",
                            isDark
                                ? "bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-indigo-500"
                                : "bg-white border-zinc-300 text-zinc-900 focus:border-indigo-500 shadow-sm"
                        )}
                    />
                </div>
            </div>

            {/* Active Corporate Account Info Footer */}
            {selectedAccountId && (
                <div className="pt-1.5 border-t border-indigo-200/50 dark:border-indigo-900/50 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                        <Sparkles className="w-3 h-3 text-amber-500" /> Contracted corporate rates & packages active below
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">₹0 collected at desk</span>
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
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-xs rounded-2xl animate-in fade-in duration-150">
            <div className={cn(
                "w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col",
                isDark ? "bg-zinc-900 border-white/10 text-white shadow-2xl" : "bg-white border-black/10 text-zinc-900 shadow-2xl"
            )}>
                {/* Header */}
                <div className={cn(
                    "px-5 py-3.5 flex items-center justify-between border-b shrink-0",
                    isDark ? "bg-zinc-900 border-white/10" : "bg-gradient-to-r from-zinc-50 to-white border-black/5"
                )}>
                    <div className="flex items-center gap-2.5">
                        <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border",
                            isDark ? "bg-zinc-800 border-zinc-700 text-blue-400" : "bg-blue-50 border-blue-200 text-blue-600"
                        )}>
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold tracking-tight">Add Empanelled Insurer / TPA</h3>
                            <p className="text-[10px] text-zinc-500 font-medium">Persists to InsuranceCompanies master table</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={cn(
                            "p-1.5 rounded-lg transition-all cursor-pointer",
                            isDark ? "hover:bg-white/10 text-zinc-400 hover:text-white" : "hover:bg-black/5 text-zinc-500 hover:text-zinc-900"
                        )}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {error && (
                    <div className="m-4 mb-0 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                            Insurance / TPA Name *
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Star Health & Allied Insurance"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={cn(
                                "w-full h-9 px-3 rounded-xl text-xs font-medium border outline-none transition-all",
                                isDark
                                    ? "bg-zinc-950 border-zinc-800 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    : "bg-white border-zinc-300 text-zinc-900 shadow-xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                                TPA Code
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. STAR_TPA"
                                value={tpaCode}
                                onChange={(e) => setTpaCode(e.target.value)}
                                className={cn(
                                    "w-full h-9 px-3 rounded-xl text-xs font-mono uppercase border outline-none transition-all",
                                    isDark
                                        ? "bg-zinc-950 border-zinc-800 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        : "bg-white border-zinc-300 text-zinc-900 shadow-xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                                )}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                                Payer Type
                            </label>
                            <select
                                value={payerType}
                                onChange={(e) => setPayerType(e.target.value)}
                                className={cn(
                                    "w-full h-9 px-3 rounded-xl text-xs font-medium border outline-none cursor-pointer transition-all",
                                    isDark
                                        ? "bg-zinc-950 border-zinc-800 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        : "bg-white border-zinc-300 text-zinc-900 shadow-xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
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
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                                Helpdesk Phone
                            </label>
                            <input
                                type="text"
                                placeholder="1800-XXX-XXXX"
                                value={contactPhone}
                                onChange={(e) => setContactPhone(e.target.value)}
                                className={cn(
                                    "w-full h-9 px-3 rounded-xl text-xs font-medium border outline-none transition-all",
                                    isDark
                                        ? "bg-zinc-950 border-zinc-800 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        : "bg-white border-zinc-300 text-zinc-900 shadow-xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                                )}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                                Claims Email
                            </label>
                            <input
                                type="email"
                                placeholder="claims@starhealth.in"
                                value={contactEmail}
                                onChange={(e) => setContactEmail(e.target.value)}
                                className={cn(
                                    "w-full h-9 px-3 rounded-xl text-xs font-medium border outline-none transition-all",
                                    isDark
                                        ? "bg-zinc-950 border-zinc-800 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        : "bg-white border-zinc-300 text-zinc-900 shadow-xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                                )}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className={cn(
                                "px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                                isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-zinc-600 hover:text-zinc-900 hover:bg-black/5"
                            )}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2 shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
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
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-xs rounded-2xl animate-in fade-in duration-150">
            <div className={cn(
                "w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col",
                isDark ? "bg-zinc-900 border-white/10 text-white shadow-2xl" : "bg-white border-black/10 text-zinc-900 shadow-2xl"
            )}>
                {/* Header */}
                <div className={cn(
                    "px-5 py-3.5 flex items-center justify-between border-b shrink-0",
                    isDark ? "bg-zinc-900 border-white/10" : "bg-gradient-to-r from-zinc-50 to-white border-black/5"
                )}>
                    <div className="flex items-center gap-2.5">
                        <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border",
                            isDark ? "bg-zinc-800 border-zinc-700 text-indigo-400" : "bg-indigo-50 border-indigo-200 text-indigo-600"
                        )}>
                            <Briefcase className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold tracking-tight">Add Corporate Account Tie-up</h3>
                            <p className="text-[10px] text-zinc-500 font-medium">Persists to CorporateAccounts master table</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={cn(
                            "p-1.5 rounded-lg transition-all cursor-pointer",
                            isDark ? "hover:bg-white/10 text-zinc-400 hover:text-white" : "hover:bg-black/5 text-zinc-500 hover:text-zinc-900"
                        )}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {error && (
                    <div className="m-4 mb-0 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                            Company / Organization Name *
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. State Bank of India or TCS"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className={cn(
                                "w-full h-9 px-3 rounded-xl text-xs font-medium border outline-none transition-all",
                                isDark
                                    ? "bg-zinc-950 border-zinc-800 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    : "bg-white border-zinc-300 text-zinc-900 shadow-xs focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                                Corporate Code
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. CORP-SBI"
                                value={corporateCode}
                                onChange={(e) => setCorporateCode(e.target.value)}
                                className={cn(
                                    "w-full h-9 px-3 rounded-xl text-xs font-mono uppercase border outline-none transition-all",
                                    isDark
                                        ? "bg-zinc-950 border-zinc-800 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                        : "bg-white border-zinc-300 text-zinc-900 shadow-xs focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                                )}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                                Billing Cycle (Days)
                            </label>
                            <input
                                type="number"
                                min="7"
                                max="90"
                                value={billingCycleDays}
                                onChange={(e) => setBillingCycleDays(e.target.value)}
                                className={cn(
                                    "w-full h-9 px-3 rounded-xl text-xs font-medium border outline-none transition-all",
                                    isDark
                                        ? "bg-zinc-950 border-zinc-800 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                        : "bg-white border-zinc-300 text-zinc-900 shadow-xs focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                                )}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                                HR / Liaison Contact
                            </label>
                            <input
                                type="text"
                                placeholder="HR Manager Name"
                                value={contactPerson}
                                onChange={(e) => setContactPerson(e.target.value)}
                                className={cn(
                                    "w-full h-9 px-3 rounded-xl text-xs font-medium border outline-none transition-all",
                                    isDark
                                        ? "bg-zinc-950 border-zinc-800 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                        : "bg-white border-zinc-300 text-zinc-900 shadow-xs focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                                )}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                                Phone Number
                            </label>
                            <input
                                type="text"
                                placeholder="+91 98765 43210"
                                value={contactPhone}
                                onChange={(e) => setContactPhone(e.target.value)}
                                className={cn(
                                    "w-full h-9 px-3 rounded-xl text-xs font-medium border outline-none transition-all",
                                    isDark
                                        ? "bg-zinc-950 border-zinc-800 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                        : "bg-white border-zinc-300 text-zinc-900 shadow-xs focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                                )}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                            Contact Email
                        </label>
                        <input
                            type="email"
                            placeholder="hr@company.com"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            className={cn(
                                "w-full h-9 px-3 rounded-xl text-xs font-medium border outline-none transition-all",
                                isDark
                                    ? "bg-zinc-950 border-zinc-800 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    : "bg-white border-zinc-300 text-zinc-900 shadow-xs focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                            )}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className={cn(
                                "px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                                isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-zinc-600 hover:text-zinc-900 hover:bg-black/5"
                            )}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
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
    initialPartnerType = 'Doctor',
    isDark = false
}) {
    const [name, setName] = useState('');
    const [partnerType, setPartnerType] = useState(initialPartnerType); // Doctor | RMP | Clinic | Hospital
    const [contactInfo, setContactInfo] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setPartnerType(initialPartnerType || 'Doctor');
            setName('');
            setContactInfo('');
            setError(null);
        }
    }, [isOpen, initialPartnerType]);

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
                defaultCommissionPercentage: 0,
                calculationBase: 'AfterDiscounts',
                paymentCollectionModel: initialPaymentModel || 'LabCollects',
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
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-xs rounded-2xl animate-in fade-in duration-150">
            <div className={cn(
                "w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col",
                isDark ? "bg-zinc-900 border-white/10 text-white shadow-2xl" : "bg-white border-black/10 text-zinc-900 shadow-2xl"
            )}>
                {/* Header */}
                <div className={cn(
                    "px-5 py-3.5 flex items-center justify-between border-b shrink-0",
                    isDark ? "bg-zinc-900 border-white/10" : "bg-gradient-to-r from-zinc-50 to-white border-black/5"
                )}>
                    <div className="flex items-center gap-2.5">
                        <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border",
                            isDark ? "bg-zinc-800 border-zinc-700 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-600"
                        )}>
                            <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold tracking-tight">Add Referral Partner</h3>
                            <p className="text-[10px] text-zinc-500 font-medium">Quickly register doctor or referral partner</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={cn(
                            "p-1.5 rounded-lg transition-all cursor-pointer",
                            isDark ? "hover:bg-white/10 text-zinc-400 hover:text-white" : "hover:bg-black/5 text-zinc-500 hover:text-zinc-900"
                        )}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {error && (
                    <div className="m-4 mb-0 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                            Partner / Doctor / Clinic Name *
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Dr. Rajesh Sharma, MD or Apex Diagnostic Care"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={cn(
                                "w-full h-9 px-3 rounded-xl text-xs font-medium border outline-none transition-all",
                                isDark
                                    ? "bg-zinc-950 border-zinc-800 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                    : "bg-white border-zinc-300 text-zinc-900 shadow-xs focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                                Partner Type
                            </label>
                            <select
                                value={partnerType}
                                onChange={(e) => setPartnerType(e.target.value)}
                                className={cn(
                                    "w-full h-9 px-3 rounded-xl text-xs font-medium border outline-none cursor-pointer transition-all",
                                    isDark
                                        ? "bg-zinc-950 border-zinc-800 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                        : "bg-white border-zinc-300 text-zinc-900 shadow-xs focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                                )}
                            >
                                <option value="Doctor">Doctor / Physician</option>
                                <option value="RMP">RMP (Rural Medical Practitioner)</option>
                                <option value="Clinic">Clinic / Diagnostic Center</option>
                                <option value="Hospital">Hospital / Nursing Home</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                                Contact Info / Phone / Address
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. +91 98765 43210, Civil Lines"
                                value={contactInfo}
                                onChange={(e) => setContactInfo(e.target.value)}
                                className={cn(
                                    "w-full h-9 px-3 rounded-xl text-xs font-medium border outline-none transition-all",
                                    isDark
                                        ? "bg-zinc-950 border-zinc-800 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                        : "bg-white border-zinc-300 text-zinc-900 shadow-xs focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                                )}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className={cn(
                                "px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                                isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-zinc-600 hover:text-zinc-900 hover:bg-black/5"
                            )}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
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

export function AddDiscountReasonModal({ isOpen, onClose, isDark, onSuccess }) {
    const [reasonText, setReasonText] = useState('');
    const [category, setCategory] = useState('Doctor Recommendation');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (!reasonText.trim()) {
            setError("Please enter a discount reason name");
            return;
        }

        setIsSubmitting(true);
        try {
            const created = await ReceptionApi.createDiscountReason({
                reasonText: reasonText.trim(),
                category: category.trim(),
                description: description.trim() || null,
                isActive: true
            });
            if (onSuccess) onSuccess(created);
            setReasonText('');
            setDescription('');
            onClose();
        } catch (err) {
            setError(err.message || "Failed to create discount reason");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-xs rounded-2xl animate-in fade-in duration-150">
            <div className={cn(
                "w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col",
                isDark ? "bg-zinc-900 border-white/10 text-white shadow-2xl" : "bg-white border-black/10 text-zinc-900 shadow-2xl"
            )}>
                {/* Header */}
                <div className={cn(
                    "px-5 py-3.5 flex items-center justify-between border-b shrink-0",
                    isDark ? "bg-zinc-900 border-white/10" : "bg-gradient-to-r from-zinc-50 to-white border-black/5"
                )}>
                    <div className="flex items-center gap-2.5">
                        <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border",
                            isDark ? "bg-zinc-800 border-zinc-700 text-synos-primary" : "bg-blue-50 border-blue-200 text-synos-primary"
                        )}>
                            <Plus className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold tracking-tight">Add Preset Reason</h3>
                            <p className="text-[10px] text-zinc-500 font-medium">Standardize reasons for receptionist billing to prevent spelling errors</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={cn(
                            "p-1.5 rounded-lg transition-all cursor-pointer",
                            isDark ? "hover:bg-white/10 text-zinc-400 hover:text-white" : "hover:bg-black/5 text-zinc-500 hover:text-zinc-900"
                        )}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {error && (
                    <div className="m-4 mb-0 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                            Reason / Authorization Authority *
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Dr. DVR Recommendation, Lab Owner Approval, BPL Concession"
                            value={reasonText}
                            onChange={(e) => setReasonText(e.target.value)}
                            className={cn(
                                "w-full h-9 px-3 rounded-xl text-xs font-medium border outline-none transition-all",
                                isDark
                                    ? "bg-zinc-950 border-zinc-800 text-white focus:border-synos-primary focus:ring-1 focus:ring-synos-primary"
                                    : "bg-white border-zinc-300 text-zinc-900 shadow-xs focus:border-synos-primary focus:ring-1 focus:ring-synos-primary"
                            )}
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                            Category *
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className={cn(
                                "w-full h-9 px-3 rounded-xl text-xs font-medium border outline-none cursor-pointer transition-all",
                                isDark
                                    ? "bg-zinc-950 border-zinc-800 text-white focus:border-synos-primary focus:ring-1 focus:ring-synos-primary"
                                    : "bg-white border-zinc-300 text-zinc-900 shadow-xs focus:border-synos-primary focus:ring-1 focus:ring-synos-primary"
                            )}
                        >
                            <option value="Doctor Recommendation">Doctor Recommendation</option>
                            <option value="Management Approval">Management Approval</option>
                            <option value="Special Concession">Special Concession</option>
                            <option value="Internal Courtesy">Internal Courtesy</option>
                            <option value="Social Support">Social Support</option>
                            <option value="Campaign">Campaign / Camp</option>
                            <option value="General">General</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                            Description / Policy Notes (Optional)
                        </label>
                        <textarea
                            rows={2}
                            placeholder="Optional instructions or notes for reception staff..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className={cn(
                                "w-full p-2.5 rounded-xl text-xs font-medium border outline-none transition-all resize-none",
                                isDark
                                    ? "bg-zinc-950 border-zinc-800 text-white focus:border-synos-primary focus:ring-1 focus:ring-synos-primary"
                                    : "bg-white border-zinc-300 text-zinc-900 shadow-xs focus:border-synos-primary focus:ring-1 focus:ring-synos-primary"
                            )}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className={cn(
                                "px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                                isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-zinc-600 hover:text-zinc-900 hover:bg-black/5"
                            )}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-synos-primary hover:bg-synos-primary/90 text-white flex items-center gap-2 shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Save & Select Reason
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

