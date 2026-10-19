import React, { useState, useEffect, useCallback } from 'react';
import { 
    Tag, 
    Search, 
    Plus, 
    Edit, 
    Check, 
    X, 
    Loader2, 
    Percent, 
    IndianRupee, 
    Calendar, 
    ShieldCheck, 
    CheckCircle2, 
    XCircle,
    ArrowUpDown,
    Filter
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';

export function DiscountMasterScreen() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [discounts, setDiscounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDiscount, setEditingDiscount] = useState(null);

    const loadDiscounts = useCallback(async () => {
        try {
            setLoading(true);
            const params = {};
            if (activeFilter === 'ACTIVE') params.isActive = true;
            if (activeFilter === 'INACTIVE') params.isActive = false;
            if (searchQuery.trim()) params.search = searchQuery.trim();

            const data = await FinanceApi.getDiscounts(params);
            setDiscounts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load discount definitions:", err);
        } finally {
            setLoading(false);
        }
    }, [activeFilter, searchQuery]);

    useEffect(() => {
        loadDiscounts();
    }, [loadDiscounts]);

    // KPI Metrics
    const totalCount = discounts.length;
    const activeCount = discounts.filter(d => d.isActive).length;
    const percentageCount = discounts.filter(d => d.type === 0 || d.type === 'Percentage').length;
    const flatCount = discounts.filter(d => d.type === 1 || d.type === 'Flat').length;

    const handleOpenCreate = () => {
        setEditingDiscount(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (discount) => {
        setEditingDiscount(discount);
        setIsModalOpen(true);
    };

    return (
        <div className="flex flex-col h-full bg-transparent overflow-hidden animate-in fade-in duration-500">
            {/* TERMINAL HEADER (UNBOXED NATIVE CANVAS STYLE) */}
            <div className="px-8 pt-8 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-synos-primary/10 text-synos-primary rounded-xl">
                        <Tag size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black dark:text-white text-zinc-900 tracking-tight">
                            Discount Master
                        </h1>
                        <p className="text-xs text-zinc-500 font-medium mt-0.5">
                            Enterprise Concession Schemes, Promotional Codes, and Rate Modifiers
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleOpenCreate}
                        className="px-4 py-2.5 bg-synos-primary text-white rounded-xl text-xs font-bold hover:brightness-105 active:scale-95 shadow-md shadow-synos-primary/20 flex items-center gap-2 cursor-pointer transition-all"
                    >
                        <Plus className="w-4 h-4" /> New Discount Code
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-8 py-4 space-y-6 custom-scrollbar">
                {/* KPI Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="p-6 synos-kpi-card rounded-2xl flex flex-col justify-between space-y-3">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Total Definitions</span>
                                <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">{totalCount}</p>
                            </div>
                            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                <Tag size={17} />
                            </div>
                        </div>
                        <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-900 pt-2.5">
                            Configured Master Schemes
                        </p>
                    </div>

                    <div className="p-6 synos-kpi-card rounded-2xl flex flex-col justify-between space-y-3">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Active Schemes</span>
                                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{activeCount}</p>
                            </div>
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <CheckCircle2 size={17} />
                            </div>
                        </div>
                        <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-900 pt-2.5">
                            Available at Reception Desk
                        </p>
                    </div>

                    <div className="p-6 synos-kpi-card rounded-2xl flex flex-col justify-between space-y-3">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Percentage Rules</span>
                                <p className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight">{percentageCount}</p>
                            </div>
                            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                <Percent size={17} />
                            </div>
                        </div>
                        <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-900 pt-2.5">
                            % Tariff Reductions
                        </p>
                    </div>

                    <div className="p-6 synos-kpi-card rounded-2xl flex flex-col justify-between space-y-3">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Flat Concessions</span>
                                <p className="text-2xl font-black text-purple-600 dark:text-purple-400 tracking-tight">{flatCount}</p>
                            </div>
                            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                <IndianRupee size={17} />
                            </div>
                        </div>
                        <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-900 pt-2.5">
                            Fixed Rupee Deductions
                        </p>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search by code, discount name, or description..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-9 pl-9 pr-3 text-xs font-medium rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 outline-none focus:border-synos-primary transition-colors"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex rounded-xl p-1 bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-bold">
                            {[
                                { id: 'ALL', label: 'All' },
                                { id: 'ACTIVE', label: 'Active Only' },
                                { id: 'INACTIVE', label: 'Inactive' }
                            ].map(f => (
                                <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => setActiveFilter(f.id)}
                                    className={cn(
                                        "px-3 py-1 rounded-lg transition-all cursor-pointer",
                                        activeFilter === f.id
                                            ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
                                            : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                                    )}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Table Container */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs overflow-hidden">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-2 text-zinc-400">
                            <Loader2 className="w-6 h-6 animate-spin text-synos-primary" />
                            <span className="text-xs font-medium">Loading discount master catalog...</span>
                        </div>
                    ) : discounts.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-center p-6 space-y-2">
                            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                                <Tag className="w-6 h-6" />
                            </div>
                            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">No discount definitions found</h3>
                            <p className="text-xs text-zinc-400 max-w-sm">
                                {searchQuery ? "No discounts match your search query." : "No discounts have been created yet. Click 'New Discount Code' to configure one."}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-zinc-800 text-[10px] font-black uppercase tracking-wider text-zinc-400 bg-slate-50/60 dark:bg-zinc-950/60">
                                        <th className="py-3 px-4">Code</th>
                                        <th className="py-3 px-4">Scheme / Concession Name</th>
                                        <th className="py-3 px-4">Type</th>
                                        <th className="py-3 px-4">Value</th>
                                        <th className="py-3 px-4">Max Cap</th>
                                        <th className="py-3 px-4">Validity Period</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                                    {discounts.map((d) => {
                                        const isPercentage = d.type === 0 || d.type === 'Percentage';
                                        const id = d.discountDefinitionId || d.id;
                                        return (
                                            <tr key={id} className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/30 transition-colors">
                                                <td className="py-3.5 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                                                    <span className="px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs">
                                                        {d.code}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 font-bold text-zinc-800 dark:text-zinc-200">
                                                    {d.name}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <span className={cn(
                                                        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                                                        isPercentage
                                                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                                            : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                                                    )}>
                                                        {isPercentage ? <Percent className="w-2.5 h-2.5" /> : <IndianRupee className="w-2.5 h-2.5" />}
                                                        {isPercentage ? 'Percentage' : 'Flat ₹'}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                                                    {isPercentage ? `${d.value}%` : `₹${d.value?.toLocaleString()}`}
                                                </td>
                                                <td className="py-3.5 px-4 font-mono text-zinc-500">
                                                    {d.maxLimit ? `₹${d.maxLimit.toLocaleString()}` : '—'}
                                                </td>
                                                <td className="py-3.5 px-4 text-zinc-500 text-[11px]">
                                                    {d.effectiveFrom || d.effectiveTo ? (
                                                        <span>
                                                            {d.effectiveFrom ? new Date(d.effectiveFrom).toLocaleDateString() : 'Start'}
                                                            {' – '}
                                                            {d.effectiveTo ? new Date(d.effectiveTo).toLocaleDateString() : 'Perpetual'}
                                                        </span>
                                                    ) : (
                                                        <span className="text-zinc-400 italic">Always Effective</span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <span className={cn(
                                                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                                        d.isActive
                                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                                            : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                                                    )}>
                                                        <span className={cn("w-1.5 h-1.5 rounded-full", d.isActive ? "bg-emerald-500" : "bg-zinc-400")} />
                                                        {d.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEdit(d)}
                                                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-synos-primary hover:border-synos-primary/40 text-xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" /> Edit
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Create / Edit Modal */}
            {isModalOpen && (
                <DiscountFormModal
                    discount={editingDiscount}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => {
                        setIsModalOpen(false);
                        loadDiscounts();
                    }}
                />
            )}
        </div>
    );
}

function DiscountFormModal({ discount, onClose, onSuccess }) {
    const isEdit = !!discount;
    const [code, setCode] = useState(discount?.code || '');
    const [name, setName] = useState(discount?.name || '');
    const [type, setType] = useState(
        discount?.type === 1 || discount?.type === 'Flat' ? 1 : 0
    );
    const [value, setValue] = useState(discount?.value ?? '');
    const [maxLimit, setMaxLimit] = useState(discount?.maxLimit ?? '');
    const [effectiveFrom, setEffectiveFrom] = useState(
        discount?.effectiveFrom ? new Date(discount.effectiveFrom).toISOString().slice(0, 10) : ''
    );
    const [effectiveTo, setEffectiveTo] = useState(
        discount?.effectiveTo ? new Date(discount.effectiveTo).toISOString().slice(0, 10) : ''
    );
    const [isActive, setIsActive] = useState(discount?.isActive ?? true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!name.trim()) {
            setError("Scheme name is required.");
            return;
        }

        const numericVal = parseFloat(value);
        if (isNaN(numericVal) || numericVal <= 0) {
            setError("Discount value must be greater than zero.");
            return;
        }

        if (type === 0 && numericVal > 100) {
            setError("Percentage discount cannot exceed 100%.");
            return;
        }

        setIsSubmitting(true);
        try {
            if (isEdit) {
                const id = discount.discountDefinitionId || discount.id;
                await FinanceApi.updateDiscount(id, {
                    name: name.trim(),
                    value: numericVal,
                    maxLimit: maxLimit ? parseFloat(maxLimit) : null,
                    isActive: isActive,
                    effectiveFrom: effectiveFrom ? new Date(effectiveFrom).toISOString() : null,
                    effectiveTo: effectiveTo ? new Date(effectiveTo).toISOString() : null
                });
            } else {
                if (!code.trim()) {
                    setError("Discount code is required.");
                    setIsSubmitting(false);
                    return;
                }
                await FinanceApi.createDiscount({
                    code: code.trim().toUpperCase(),
                    name: name.trim(),
                    type: type,
                    value: numericVal,
                    maxLimit: maxLimit ? parseFloat(maxLimit) : null,
                    isActive: isActive,
                    effectiveFrom: effectiveFrom ? new Date(effectiveFrom).toISOString() : null,
                    effectiveTo: effectiveTo ? new Date(effectiveTo).toISOString() : null
                });
            }
            onSuccess();
        } catch (err) {
            setError(err.message || "Failed to save discount definition");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-900 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-synos-primary/10 border border-synos-primary/20 flex items-center justify-center text-synos-primary">
                            <Tag className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                {isEdit ? `Edit Discount (${discount.code})` : "Create New Discount Code"}
                            </h3>
                            <p className="text-[10px] text-zinc-500 font-medium">Configures concession rules for billing</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {error && (
                    <div className="m-4 mb-0 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                                Discount Code *
                            </label>
                            <input
                                type="text"
                                required
                                disabled={isEdit}
                                placeholder="e.g. SENIOR10"
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                className="w-full h-9 px-3 rounded-xl text-xs font-mono font-bold bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 outline-none focus:border-synos-primary uppercase disabled:opacity-50"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                                Concession Type *
                            </label>
                            <select
                                disabled={isEdit}
                                value={type}
                                onChange={(e) => setType(parseInt(e.target.value, 10))}
                                className="w-full h-9 px-3 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 outline-none focus:border-synos-primary disabled:opacity-50"
                            >
                                <option value={0}>Percentage (%)</option>
                                <option value={1}>Flat Amount (₹)</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                            Scheme / Concession Name *
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Senior Citizen Discount (60+ Years)"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full h-9 px-3 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 outline-none focus:border-synos-primary"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                                {type === 0 ? "Discount Percentage (%) *" : "Flat Discount (₹) *"}
                            </label>
                            <input
                                type="number"
                                required
                                min="0"
                                max={type === 0 ? 100 : 100000}
                                step={type === 0 ? "0.5" : "1"}
                                placeholder={type === 0 ? "10" : "200"}
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                className="w-full h-9 px-3 rounded-xl text-xs font-mono font-bold bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 outline-none focus:border-synos-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                                Maximum Cap (₹) (Optional)
                            </label>
                            <input
                                type="number"
                                min="0"
                                placeholder="e.g. 500"
                                value={maxLimit}
                                onChange={(e) => setMaxLimit(e.target.value)}
                                className="w-full h-9 px-3 rounded-xl text-xs font-mono font-medium bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 outline-none focus:border-synos-primary"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                                Effective From (Optional)
                            </label>
                            <input
                                type="date"
                                value={effectiveFrom}
                                onChange={(e) => setEffectiveFrom(e.target.value)}
                                className="w-full h-9 px-3 rounded-xl text-xs font-medium bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 outline-none focus:border-synos-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                                Effective To (Optional)
                            </label>
                            <input
                                type="date"
                                value={effectiveTo}
                                onChange={(e) => setEffectiveTo(e.target.value)}
                                className="w-full h-9 px-3 rounded-xl text-xs font-medium bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 outline-none focus:border-synos-primary"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                        <input
                            type="checkbox"
                            id="isActive"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-synos-primary focus:ring-synos-primary cursor-pointer"
                        />
                        <label htmlFor="isActive" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                            Active and selectable at counter
                        </label>
                    </div>

                    <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-zinc-900">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-bold hover:bg-slate-50 dark:hover:bg-zinc-900 cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 py-2.5 bg-synos-primary text-white rounded-xl text-xs font-bold hover:brightness-105 active:scale-95 disabled:opacity-50 cursor-pointer transition-all shadow-md shadow-synos-primary/20"
                        >
                            {isSubmitting ? "Saving..." : (isEdit ? "Update Scheme" : "Create Code")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
