import React, { useState, useEffect, useMemo } from 'react';
import { 
    Zap, 
    Search, 
    Check, 
    Percent, 
    IndianRupee, 
    AlertCircle, 
    CheckCircle2, 
    ChevronDown, 
    ChevronUp, 
    Save, 
    Trash2, 
    Sparkles, 
    BookOpen, 
    Building2, 
    Stethoscope, 
    Loader2, 
    ArrowRight,
    RefreshCw,
    Edit3,
    X,
    Filter
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';
import { cn } from '@/lib/utils';

// ============================================================================
// INDIVIDUAL DOCTOR LEARNED RATE CARD ACCORDION WITH INLINE SEARCH & FILTERS
// ============================================================================
const DoctorLearnedCard = ({
    group,
    isCollapsed,
    onToggleCollapse,
    editingRuleId,
    editRuleState,
    setEditRuleState,
    isSavingRule,
    handleStartEditRule,
    handleCancelEditRule,
    handleSaveEditRule,
    handleDeleteRule
}) => {
    const [search, setSearch] = useState('');
    const [selectedDept, setSelectedDept] = useState('ALL');
    const [selectedRateType, setSelectedRateType] = useState('ALL'); // 'ALL' | 'Percentage' | 'Flat'

    const rules = group.rules || [];
    const totalCount = rules.length;

    // Unique departments with counts
    const departmentStats = useMemo(() => {
        const counts = {};
        rules.forEach(r => {
            const dept = r.departmentName || 'General Diagnostics';
            counts[dept] = (counts[dept] || 0) + 1;
        });
        return Object.keys(counts).sort().map(name => ({
            name,
            count: counts[name]
        }));
    }, [rules]);

    // Rate type counts
    const rateTypeStats = useMemo(() => {
        let pct = 0;
        let flat = 0;
        rules.forEach(r => {
            const isPct = r.commissionType === 0 || r.commissionType === 'Percentage';
            if (isPct) pct++;
            else flat++;
        });
        return { pct, flat };
    }, [rules]);

    const isFilterActive = Boolean(search.trim()) || selectedDept !== 'ALL' || selectedRateType !== 'ALL';

    const resetFilters = () => {
        setSearch('');
        setSelectedDept('ALL');
        setSelectedRateType('ALL');
    };

    // Filtered rules for this doctor
    const filteredRules = useMemo(() => {
        return rules.filter(rule => {
            // 1. Investigation / Test search
            if (search.trim()) {
                const q = search.toLowerCase().trim();
                const matchName = rule.testName?.toLowerCase().includes(q);
                const matchCode = rule.testCode?.toLowerCase().includes(q);
                if (!matchName && !matchCode) return false;
            }

            // 2. Department filter
            if (selectedDept !== 'ALL') {
                const dept = rule.departmentName || 'General Diagnostics';
                if (dept !== selectedDept) return false;
            }

            // 3. Rate type filter
            if (selectedRateType !== 'ALL') {
                const isPct = rule.commissionType === 0 || rule.commissionType === 'Percentage';
                if (selectedRateType === 'Percentage' && !isPct) return false;
                if (selectedRateType === 'Flat' && isPct) return false;
            }

            return true;
        });
    }, [rules, search, selectedDept, selectedRateType]);

    return (
        <div className="synos-dept-card rounded-2xl overflow-hidden transition-all shadow-xs border border-slate-200/80 dark:border-zinc-800">
            {/* DOCTOR / CLINIC ACCORDION HEADER */}
            <div 
                onClick={onToggleCollapse}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50/70 dark:bg-zinc-900/40 border-b border-zinc-100 dark:border-zinc-900 cursor-pointer hover:bg-slate-100/60 dark:hover:bg-zinc-800/40 transition-colors select-none"
            >
                <div className="flex items-start sm:items-center gap-3.5">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleCollapse();
                        }}
                        className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors shrink-0 mt-0.5 sm:mt-0"
                    >
                        {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                    </button>

                    <div className="w-10 h-10 rounded-xl bg-synos-primary/10 text-synos-primary flex items-center justify-center shrink-0">
                        <Stethoscope size={20} />
                    </div>

                    <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                {group.doctorName}
                            </h4>
                            <span className="px-2.5 py-0.5 text-[10px] font-extrabold rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                {totalCount} Learned Rate{totalCount !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-0.5 flex-wrap">
                            {group.clinicName && (
                                <span className="flex items-center gap-1 font-medium">
                                    <Building2 size={12} />
                                    {group.clinicName}
                                </span>
                            )}
                            <span>• Partner Default Cut: <b>{group.defaultCommissionPercentage}%</b></span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto text-xs font-bold text-zinc-400">
                    <span>{isCollapsed ? "Click to view rates" : "Click to collapse"}</span>
                </div>
            </div>

            {/* EXPANDED CONTENT AREA */}
            {!isCollapsed && (
                <div>
                    {/* INLINE DEDICATED SEARCH & FILTERS TOOLBAR */}
                    <div className="px-5 py-3.5 bg-slate-50/90 dark:bg-zinc-900/60 border-b border-zinc-200/80 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
                            {/* 1. Search Investigation / Code */}
                            <div className="relative flex-1 min-w-[200px] max-w-sm group">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-synos-primary transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Filter by investigation or test code..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-8.5 pr-7 py-1.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-medium outline-none focus:ring-1 focus:ring-synos-primary text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 transition-all shadow-2xs"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => setSearch('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5"
                                        title="Clear search"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>

                            {/* 2. Department Filter Dropdown */}
                            <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 shadow-2xs">
                                <Filter size={13} className="text-zinc-400 shrink-0" />
                                <select
                                    value={selectedDept}
                                    onChange={(e) => setSelectedDept(e.target.value)}
                                    className="bg-transparent text-xs font-semibold text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer pr-1"
                                >
                                    <option value="ALL">All Departments ({totalCount})</option>
                                    {departmentStats.map(d => (
                                        <option key={d.name} value={d.name}>
                                            {d.name} ({d.count})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* 3. Rate Type Filter Pill Group */}
                            <div className="inline-flex items-center bg-slate-200/70 dark:bg-zinc-800 p-0.5 rounded-xl border border-slate-300/60 dark:border-zinc-700 text-xs font-bold">
                                <button
                                    type="button"
                                    onClick={() => setSelectedRateType('ALL')}
                                    className={cn(
                                        "px-2.5 py-1 rounded-lg transition-all text-xs cursor-pointer",
                                        selectedRateType === 'ALL'
                                            ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-2xs font-extrabold"
                                            : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                                    )}
                                >
                                    All Types ({totalCount})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedRateType('Percentage')}
                                    className={cn(
                                        "px-2.5 py-1 rounded-lg transition-all text-xs cursor-pointer",
                                        selectedRateType === 'Percentage'
                                            ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-2xs font-extrabold"
                                            : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                                    )}
                                >
                                    % ({rateTypeStats.pct})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedRateType('Flat')}
                                    className={cn(
                                        "px-2.5 py-1 rounded-lg transition-all text-xs cursor-pointer",
                                        selectedRateType === 'Flat'
                                            ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-2xs font-extrabold"
                                            : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                                    )}
                                >
                                    ₹ Flat ({rateTypeStats.flat})
                                </button>
                            </div>
                        </div>

                        {/* Right side: Matching Count & Reset Action */}
                        <div className="flex items-center gap-2 text-xs shrink-0">
                            <span className="text-zinc-400 font-medium text-[11px]">
                                Showing <b className="text-zinc-800 dark:text-zinc-200 font-bold">{filteredRules.length}</b> of {totalCount}
                            </span>
                            {isFilterActive && (
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="text-[11px] font-bold text-synos-primary hover:underline ml-1 cursor-pointer"
                                >
                                    Reset Filters
                                </button>
                            )}
                        </div>
                    </div>

                    {/* RATES TABLE */}
                    <div className="p-0 overflow-x-auto">
                        {filteredRules.length === 0 ? (
                            <div className="py-12 text-center text-zinc-400 space-y-2">
                                <p className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                                    No learned rates match your search / filter criteria
                                </p>
                                <p className="text-[11px] text-zinc-400">
                                    Try modifying the test name, selecting a different department, or clearing filters.
                                </p>
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-bold mt-1 cursor-pointer"
                                >
                                    <X size={12} /> Clear Filters
                                </button>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/40 dark:bg-zinc-900/20 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                                        <th className="py-3 px-5">Investigation / Test</th>
                                        <th className="py-3 px-4">Department</th>
                                        <th className="py-3 px-4 text-right">MRP (₹)</th>
                                        <th className="py-3 px-4 text-center">Rate Type</th>
                                        <th className="py-3 px-4 text-right">Commission Cut</th>
                                        <th className="py-3 px-4 text-right">Payout / Test</th>
                                        <th className="py-3 px-4 text-center">Status</th>
                                        <th className="py-3 px-5 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200/80 dark:divide-zinc-800/80 font-medium">
                                    {filteredRules.map(rule => {
                                        const isEditing = editingRuleId === rule.ruleId;
                                        const isPercentage = isEditing 
                                            ? editRuleState.type === 'Percentage'
                                            : (rule.commissionType === 0 || rule.commissionType === 'Percentage');

                                        const numVal = isEditing 
                                            ? (parseFloat(editRuleState.value) || 0)
                                            : Number(rule.commissionValue || 0);

                                        const payout = isPercentage 
                                            ? (rule.testPrice * numVal) / 100 
                                            : numVal;

                                        return (
                                            <tr 
                                                key={rule.ruleId} 
                                                className={cn(
                                                    "transition-colors",
                                                    isEditing 
                                                        ? "bg-amber-50/70 dark:bg-amber-950/20 ring-1 ring-amber-300 dark:ring-amber-700/60" 
                                                        : "hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30"
                                                )}
                                            >
                                                {/* Investigation / Test */}
                                                <td className="py-3.5 px-5">
                                                    <div className="font-bold text-zinc-900 dark:text-zinc-100">
                                                        {rule.testName}
                                                    </div>
                                                    <div className="text-[10px] text-zinc-400 font-mono">
                                                        {rule.testCode}
                                                    </div>
                                                </td>

                                                {/* Department */}
                                                <td className="py-3.5 px-4 text-zinc-500 font-medium">
                                                    {rule.departmentName || 'General'}
                                                </td>

                                                {/* MRP */}
                                                <td className="py-3.5 px-4 text-right font-mono font-bold text-zinc-700 dark:text-zinc-300">
                                                    ₹{Number(rule.testPrice || 0).toLocaleString('en-IN')}
                                                </td>

                                                {/* Rate Type */}
                                                <td className="py-3.5 px-4 text-center">
                                                    {isEditing ? (
                                                        <div className="inline-flex items-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-0.5 shadow-2xs">
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditRuleState({ ...editRuleState, type: 'Percentage' })}
                                                                className={cn(
                                                                    "px-2.5 py-1 text-[10px] font-bold rounded transition-all cursor-pointer",
                                                                    editRuleState.type === 'Percentage' ? "bg-synos-primary text-white shadow-2xs" : "text-zinc-400 hover:text-zinc-600"
                                                                )}
                                                            >
                                                                %
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditRuleState({ ...editRuleState, type: 'Flat' })}
                                                                className={cn(
                                                                    "px-2.5 py-1 text-[10px] font-bold rounded transition-all cursor-pointer",
                                                                    editRuleState.type === 'Flat' ? "bg-synos-primary text-white shadow-2xs" : "text-zinc-400 hover:text-zinc-600"
                                                                )}
                                                            >
                                                                ₹ Flat
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className={cn(
                                                            "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase",
                                                            isPercentage 
                                                                ? "bg-blue-500/10 text-blue-600 border border-blue-500/20" 
                                                                : "bg-purple-500/10 text-purple-600 border border-purple-500/20"
                                                        )}>
                                                            {isPercentage ? 'Percentage' : 'Flat'}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Commission Cut */}
                                                <td className="py-3.5 px-4 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                                                    {isEditing ? (
                                                        <div className="flex items-center justify-end">
                                                            <input
                                                                type="number"
                                                                step="any"
                                                                value={editRuleState.value}
                                                                onChange={(e) => setEditRuleState({ ...editRuleState, value: e.target.value })}
                                                                className="w-20 px-2.5 py-1 bg-white dark:bg-zinc-900 border border-amber-300 dark:border-amber-700 rounded-lg text-xs font-bold text-right outline-none focus:ring-1 focus:ring-synos-primary"
                                                            />
                                                        </div>
                                                    ) : (
                                                        isPercentage ? `${rule.commissionValue}%` : `₹${rule.commissionValue} Flat`
                                                    )}
                                                </td>

                                                {/* Payout / Test */}
                                                <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                    ₹{payout.toFixed(2)}
                                                </td>

                                                {/* Status */}
                                                <td className="py-3.5 px-4 text-center">
                                                    {isEditing ? (
                                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                                            Editing
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                                            Active
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Action */}
                                                <td className="py-3.5 px-5 text-right">
                                                    {isEditing ? (
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                onClick={() => handleSaveEditRule(rule)}
                                                                disabled={isSavingRule}
                                                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-2xs cursor-pointer"
                                                                title="Save Changes"
                                                            >
                                                                {isSavingRule ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} strokeWidth={2.5} />}
                                                                <span>Save</span>
                                                            </button>
                                                            <button
                                                                onClick={handleCancelEditRule}
                                                                disabled={isSavingRule}
                                                                className="p-1.5 bg-slate-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-slate-300 rounded-xl transition-all cursor-pointer"
                                                                title="Cancel"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                onClick={() => handleStartEditRule(rule)}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-synos-primary bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-sky-400 dark:hover:bg-blue-900/60 rounded-xl border border-blue-200/80 dark:border-blue-800/40 transition-all shadow-2xs cursor-pointer"
                                                                title="Edit commission rate"
                                                            >
                                                                <Edit3 size={12} />
                                                                <span>Edit</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteRule(rule.ruleId)}
                                                                className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-zinc-400 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
                                                                title="Unlink rate card"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const ReferralRateQueueTab = ({ onUpdateCount }) => {
    const [subTab, setSubTab] = useState('queue'); // 'queue' | 'rate-cards'
    const [queue, setQueue] = useState([]);
    const [loadingQueue, setLoadingQueue] = useState(true);
    const [learnedRules, setLearnedRules] = useState([]);
    const [loadingRules, setLoadingRules] = useState(false);
    
    // Search queries
    const [queueSearch, setQueueSearch] = useState('');
    const [ruleSearch, setRuleSearch] = useState('');

    // Staged rates: key is `${partnerId}_${testId}` -> { type: 'Percentage' | 'Flat', value: number | '' }
    const [stagedRates, setStagedRates] = useState({});
    
    // Collapsible doctors
    const [collapsedDoctors, setCollapsedDoctors] = useState({});
    const [collapsedLearnedDoctors, setCollapsedLearnedDoctors] = useState({});

    // Processing states
    const [savingKey, setSavingKey] = useState(null); // specific key or 'all' or partnerId
    const [lastCommitResult, setLastCommitResult] = useState(null);

    useEffect(() => {
        loadQueue();
    }, []);

    useEffect(() => {
        if (subTab === 'rate-cards') {
            loadLearnedRules(ruleSearch);
        }
    }, [subTab]);

    const loadQueue = async () => {
        try {
            setLoadingQueue(true);
            const data = await FinanceApi.getPendingLearningQueue();
            const groups = data || [];
            setQueue(groups);

            // Calculate total unmapped tests
            const totalUnmapped = groups.reduce((acc, g) => acc + (g.unmappedTests?.length || 0), 0);
            if (onUpdateCount) onUpdateCount(totalUnmapped);

            // Pre-seed staged rates
            const initialStaged = {};
            groups.forEach(g => {
                (g.unmappedTests || []).forEach(t => {
                    const key = `${g.referralPartnerId}_${t.testId}`;
                    initialStaged[key] = {
                        type: 'Percentage',
                        value: t.suggestedPercentage > 0 ? t.suggestedPercentage : ''
                    };
                });
            });
            setStagedRates(prev => ({ ...initialStaged, ...prev }));
        } catch (err) {
            console.error("Failed to load rate learning queue:", err);
        } finally {
            setLoadingQueue(false);
        }
    };

    const loadLearnedRules = async (query = '') => {
        try {
            setLoadingRules(true);
            const data = await FinanceApi.searchLearnedRules(query);
            setLearnedRules(data || []);
        } catch (err) {
            console.error("Failed to load learned rules:", err);
        } finally {
            setLoadingRules(false);
        }
    };

    const handleRateChange = (partnerId, testId, field, value) => {
        const key = `${partnerId}_${testId}`;
        setStagedRates(prev => ({
            ...prev,
            [key]: {
                ...(prev[key] || { type: 'Percentage', value: '' }),
                [field]: value
            }
        }));
    };

    const toggleDoctorCollapse = (partnerId) => {
        setCollapsedDoctors(prev => ({
            ...prev,
            [partnerId]: !prev[partnerId]
        }));
    };

    const toggleLearnedCollapse = (partnerId) => {
        setCollapsedLearnedDoctors(prev => ({
            ...prev,
            [partnerId]: !prev[partnerId]
        }));
    };

    const commitSingleRule = async (partnerId, test) => {
        const key = `${partnerId}_${test.testId}`;
        const staged = stagedRates[key];
        const val = parseFloat(staged?.value);
        if (isNaN(val) || val <= 0) {
            alert(`Please enter a valid rate for ${test.testName}`);
            return;
        }

        try {
            setSavingKey(key);
            const payload = {
                rules: [
                    {
                        referralPartnerId: partnerId,
                        testId: test.testId,
                        commissionType: staged.type,
                        commissionValue: val
                    }
                ]
            };
            const result = await FinanceApi.commitLearningRates(payload);
            setLastCommitResult(result);
            await loadQueue();
        } catch (err) {
            alert(`Failed to save rate: ${err.message}`);
        } finally {
            setSavingKey(null);
        }
    };

    const commitDoctorRules = async (doctorGroup) => {
        const rulesToCommit = [];
        for (const test of doctorGroup.unmappedTests || []) {
            const key = `${doctorGroup.referralPartnerId}_${test.testId}`;
            const staged = stagedRates[key];
            const val = parseFloat(staged?.value);
            if (!isNaN(val) && val > 0) {
                rulesToCommit.push({
                    referralPartnerId: doctorGroup.referralPartnerId,
                    testId: test.testId,
                    commissionType: staged.type,
                    commissionValue: val
                });
            }
        }

        if (rulesToCommit.length === 0) {
            alert(`Please configure at least one rate with a value > 0 for ${doctorGroup.doctorName}.`);
            return;
        }

        try {
            setSavingKey(doctorGroup.referralPartnerId);
            const payload = { rules: rulesToCommit };
            const result = await FinanceApi.commitLearningRates(payload);
            setLastCommitResult(result);
            await loadQueue();
        } catch (err) {
            alert(`Failed to save doctor rates: ${err.message}`);
        } finally {
            setSavingKey(null);
        }
    };

    const commitAllConfigured = async () => {
        const rulesToCommit = [];
        for (const g of queue) {
            for (const test of g.unmappedTests || []) {
                const key = `${g.referralPartnerId}_${test.testId}`;
                const staged = stagedRates[key];
                const val = parseFloat(staged?.value);
                if (!isNaN(val) && val > 0) {
                    rulesToCommit.push({
                        referralPartnerId: g.referralPartnerId,
                        testId: test.testId,
                        commissionType: staged.type,
                        commissionValue: val
                    });
                }
            }
        }

        if (rulesToCommit.length === 0) {
            alert("No valid rates entered to confirm. Please enter rate values first.");
            return;
        }

        try {
            setSavingKey('all');
            const payload = { rules: rulesToCommit };
            const result = await FinanceApi.commitLearningRates(payload);
            setLastCommitResult(result);
            await loadQueue();
        } catch (err) {
            alert(`Failed to save rates: ${err.message}`);
        } finally {
            setSavingKey(null);
        }
    };

    const handleDeleteRule = async (ruleId) => {
        if (!window.confirm("Remove this locked rate card entry? Any future prescriptions for this test will enter the learning queue.")) return;
        try {
            await FinanceApi.deleteLearnedRule(ruleId);
            loadLearnedRules(ruleSearch);
        } catch (err) {
            alert(`Failed to delete rule: ${err.message}`);
        }
    };

    // Inline Editing for Learned Rate Cards Tab
    const [editingRuleId, setEditingRuleId] = useState(null);
    const [editRuleState, setEditRuleState] = useState({ type: 'Percentage', value: 10 });
    const [isSavingRule, setIsSavingRule] = useState(false);

    const handleStartEditRule = (rule) => {
        const isPercentage = rule.commissionType === 0 || rule.commissionType === 'Percentage';
        setEditingRuleId(rule.ruleId);
        setEditRuleState({
            type: isPercentage ? 'Percentage' : 'Flat',
            value: rule.commissionValue ?? 10
        });
    };

    const handleCancelEditRule = () => {
        setEditingRuleId(null);
        setEditRuleState({ type: 'Percentage', value: 10 });
    };

    const handleSaveEditRule = async (rule) => {
        if (editRuleState.value === '' || isNaN(editRuleState.value) || Number(editRuleState.value) < 0) {
            alert("Please enter a valid non-negative commission rate.");
            return;
        }

        try {
            setIsSavingRule(true);
            await FinanceApi.quickLearnRate(rule.referralPartnerId, {
                testId: rule.testId,
                commissionType: editRuleState.type === 'Flat' ? 1 : 0,
                commissionValue: parseFloat(editRuleState.value)
            });

            setEditingRuleId(null);
            await loadLearnedRules(ruleSearch);
            if (onUpdateCount) onUpdateCount();
        } catch (err) {
            alert(err.message || "Failed to update rate card.");
        } finally {
            setIsSavingRule(false);
        }
    };

    // Filter queue by doctor name, clinic, or test name
    const filteredQueue = queue.filter(g => {
        const matchDoc = g.doctorName?.toLowerCase().includes(queueSearch.toLowerCase()) ||
                         g.clinicName?.toLowerCase().includes(queueSearch.toLowerCase());
        const matchTest = g.unmappedTests?.some(t => 
            t.testName?.toLowerCase().includes(queueSearch.toLowerCase()) ||
            t.testCode?.toLowerCase().includes(queueSearch.toLowerCase()) ||
            t.departmentName?.toLowerCase().includes(queueSearch.toLowerCase())
        );
        return matchDoc || matchTest;
    });

    const totalUnmappedInQueue = queue.reduce((acc, g) => acc + (g.unmappedTests?.length || 0), 0);
    const totalDoctorsInQueue = queue.length;

    // Group learned rules by doctor / referral partner
    const groupedLearnedDoctors = useMemo(() => {
        const groups = {};
        (learnedRules || []).forEach(rule => {
            const partnerId = rule.referralPartnerId || 'unknown';
            if (!groups[partnerId]) {
                groups[partnerId] = {
                    referralPartnerId: partnerId,
                    doctorName: rule.doctorName || 'Doctor / Referral Partner',
                    clinicName: rule.clinicName || '',
                    defaultCommissionPercentage: rule.defaultCommissionPercentage ?? 0,
                    rules: []
                };
            }
            groups[partnerId].rules.push(rule);
        });
        return Object.values(groups);
    }, [learnedRules]);

    const filteredLearnedGroups = useMemo(() => {
        if (!ruleSearch.trim()) return groupedLearnedDoctors;
        const q = ruleSearch.toLowerCase();
        return groupedLearnedDoctors.filter(g => 
            g.doctorName?.toLowerCase().includes(q) ||
            (g.clinicName && g.clinicName.toLowerCase().includes(q)) ||
            g.rules.some(r => 
                (r.testName && r.testName.toLowerCase().includes(q)) || 
                (r.testCode && r.testCode.toLowerCase().includes(q)) || 
                (r.departmentName && r.departmentName.toLowerCase().includes(q))
            )
        );
    }, [groupedLearnedDoctors, ruleSearch]);

    return (
        <div className="p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* SUB TAB CONTROLS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-900 pb-4">
                <div className="flex items-center gap-2 bg-slate-200/90 dark:bg-zinc-800 p-1.5 rounded-2xl border border-slate-300 dark:border-zinc-700/80 shadow-inner w-fit">
                    <button
                        onClick={() => setSubTab('queue')}
                        className={cn(
                            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all",
                            subTab === 'queue'
                                ? "bg-white dark:bg-zinc-950 text-synos-primary shadow-sm"
                                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                        )}
                    >
                        <Zap size={15} />
                        <span>Unmapped Rate Queue</span>
                        {totalUnmappedInQueue > 0 && (
                            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                {totalUnmappedInQueue}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setSubTab('rate-cards')}
                        className={cn(
                            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all",
                            subTab === 'rate-cards'
                                ? "bg-white dark:bg-zinc-950 text-synos-primary shadow-sm"
                                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                        )}
                    >
                        <BookOpen size={15} />
                        <span>Learned Rate Cards</span>
                        {learnedRules.length > 0 && (
                            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-synos-primary border border-blue-500/20">
                                {learnedRules.length}
                            </span>
                        )}
                    </button>
                </div>

                {subTab === 'queue' && totalUnmappedInQueue > 0 && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={commitAllConfigured}
                            disabled={savingKey === 'all'}
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
                        >
                            {savingKey === 'all' ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <CheckCircle2 size={15} />
                            )}
                            <span>Confirm & Learn All Configured</span>
                        </button>
                    </div>
                )}
            </div>

            {/* NOTIFICATION OF LAST COMMIT */}
            {lastCommitResult && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-start justify-between gap-3 animate-in fade-in">
                    <div className="flex items-start gap-3">
                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                                {lastCommitResult.message || "Rates successfully locked and stored!"}
                            </p>
                            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                                Recalculated {lastCommitResult.recalculatedVisitsCount} pending patient visit(s) · Recognized ₹{Number(lastCommitResult.totalCommissionRecognized || 0).toLocaleString()} commission.
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setLastCommitResult(null)}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-900 dark:text-emerald-400"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* TAB: UNMAPPED QUEUE */}
            {subTab === 'queue' && (
                <div className="space-y-6">
                    {/* INFO BANNER */}
                    <div className="p-4 bg-synos-primary/5 border border-synos-primary/10 rounded-2xl flex items-start gap-3">
                        <Sparkles size={18} className="text-synos-primary shrink-0 mt-0.5" />
                        <div className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                            <span className="font-bold text-synos-primary uppercase tracking-widest mr-2">Self-Learning Test Rate Engine:</span>
                            When doctors prescribe tests for the first time, they appear in this queue. Configure their agreed rate once (% or ₹ Flat). SynOS permanently locks the rule and recalculates all pending patient visits automatically.
                        </div>
                    </div>

                    {/* ACTION & SEARCH BAR */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative group flex-1 max-w-md">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-synos-primary transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Filter queue by doctor, clinic, or test name..." 
                                value={queueSearch}
                                onChange={(e) => setQueueSearch(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-zinc-950 border dark:border-zinc-900 border-zinc-100 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-synos-primary/20 transition-all outline-none"
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={loadQueue}
                                className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-all"
                            >
                                <RefreshCw size={14} className={cn(loadingQueue && "animate-spin")} />
                                <span>Refresh</span>
                            </button>
                        </div>
                    </div>

                    {/* QUEUE LIST */}
                    {loadingQueue ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-400">
                            <Loader2 size={32} className="animate-spin text-synos-primary" />
                            <p className="text-xs font-medium">Scanning pending doctor-test pairs...</p>
                        </div>
                    ) : filteredQueue.length === 0 ? (
                        <div className="py-20 text-center bg-white dark:bg-zinc-950 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl p-12 space-y-4">
                            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                                <CheckCircle2 size={32} />
                            </div>
                            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">All Doctor Rates Learned!</h3>
                            <p className="text-xs text-zinc-500 max-w-md mx-auto">
                                There are no unmapped doctor-test pairs pending. Every prescribed test currently in the system has a locked rate card.
                            </p>
                            <button
                                onClick={() => setSubTab('rate-cards')}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-synos-primary text-white text-xs font-bold rounded-xl shadow-md hover:bg-synos-primary/90 transition-all"
                            >
                                <BookOpen size={14} />
                                <span>View Learned Rate Cards</span>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredQueue.map(group => {
                                const isCollapsed = collapsedDoctors[group.referralPartnerId];
                                const unmappedCount = group.unmappedTests?.length || 0;
                                const isSavingDoctor = savingKey === group.referralPartnerId;

                                return (
                                    <div 
                                        key={group.referralPartnerId}
                                        className="synos-dept-card rounded-2xl overflow-hidden transition-all"
                                    >
                                        {/* DOCTOR HEADER CARD */}
                                        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-900/30 border-b border-zinc-100 dark:border-zinc-900">
                                            <div className="flex items-start sm:items-center gap-3">
                                                <button
                                                    onClick={() => toggleDoctorCollapse(group.referralPartnerId)}
                                                    className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 transition-colors"
                                                >
                                                    {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                                                </button>
                                                <div className="w-10 h-10 rounded-xl bg-synos-primary/10 text-synos-primary flex items-center justify-center shrink-0">
                                                    <Stethoscope size={20} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                                            {group.doctorName}
                                                        </h4>
                                                        <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                                            {unmappedCount} Test{unmappedCount > 1 ? 's' : ''} to Map
                                                        </span>
                                                        {group.totalPendingVisits > 0 && (
                                                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20">
                                                                {group.totalPendingVisits} Pending Visit{group.totalPendingVisits > 1 ? 's' : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-0.5">
                                                        {group.clinicName && (
                                                            <span className="flex items-center gap-1">
                                                                <Building2 size={12} />
                                                                {group.clinicName}
                                                            </span>
                                                        )}
                                                        {group.contactInfo && (
                                                            <span>• {group.contactInfo}</span>
                                                        )}
                                                        <span>• Partner Default: {group.defaultCommissionPercentage}%</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 self-end sm:self-auto">
                                                <button
                                                    onClick={() => commitDoctorRules(group)}
                                                    disabled={isSavingDoctor}
                                                    className="flex items-center gap-1.5 px-4 py-2 bg-synos-primary hover:bg-synos-primary/90 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                                >
                                                    {isSavingDoctor ? (
                                                        <Loader2 size={13} className="animate-spin" />
                                                    ) : (
                                                        <Save size={13} />
                                                    )}
                                                    <span>Confirm Doctor's Rates</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* UNMAPPED TESTS TABLE */}
                                        {!isCollapsed && (
                                            <div className="p-0 overflow-x-auto">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/20 dark:bg-zinc-900/10 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                                                            <th className="py-3 px-5">Investigation / Test</th>
                                                            <th className="py-3 px-4">Department</th>
                                                            <th className="py-3 px-4 text-right">MRP (₹)</th>
                                                            <th className="py-3 px-4 text-center">Prescribed</th>
                                                            <th className="py-3 px-4">Rate Type</th>
                                                            <th className="py-3 px-4">Commission Cut</th>
                                                            <th className="py-3 px-4 text-right">Preview Payout</th>
                                                            <th className="py-3 px-5 text-right">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-200/80 dark:divide-zinc-800/80 text-xs font-medium">
                                                        {group.unmappedTests.map(test => {
                                                            const key = `${group.referralPartnerId}_${test.testId}`;
                                                            const staged = stagedRates[key] || { type: 'Percentage', value: '' };
                                                            const isRowSaving = savingKey === key;
                                                            
                                                            const numVal = parseFloat(staged.value);
                                                            let previewPayout = 0;
                                                            if (!isNaN(numVal) && numVal > 0) {
                                                                if (staged.type === 'Percentage') {
                                                                    previewPayout = (test.price * numVal) / 100;
                                                                } else {
                                                                    previewPayout = numVal;
                                                                }
                                                            }

                                                            return (
                                                                <tr key={test.testId} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30 transition-colors">
                                                                    <td className="py-3.5 px-5">
                                                                        <div className="font-bold text-zinc-900 dark:text-zinc-100">
                                                                            {test.testName}
                                                                        </div>
                                                                        <div className="text-[10px] text-zinc-400 font-mono">
                                                                            {test.testCode}
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-3.5 px-4 text-zinc-500">
                                                                        {test.departmentName || 'General'}
                                                                    </td>
                                                                    <td className="py-3.5 px-4 text-right font-bold text-zinc-700 dark:text-zinc-300 font-mono">
                                                                        ₹{Number(test.price).toLocaleString()}
                                                                    </td>
                                                                    <td className="py-3.5 px-4 text-center">
                                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                                                                            {test.prescribedCount}x
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-3.5 px-4">
                                                                        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-lg w-fit">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleRateChange(group.referralPartnerId, test.testId, 'type', 'Percentage')}
                                                                                className={cn(
                                                                                    "flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all",
                                                                                    staged.type === 'Percentage'
                                                                                        ? "bg-white dark:bg-zinc-800 text-synos-primary shadow-xs"
                                                                                        : "text-zinc-500 hover:text-zinc-800"
                                                                                )}
                                                                            >
                                                                                <Percent size={11} />
                                                                                <span>%</span>
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleRateChange(group.referralPartnerId, test.testId, 'type', 'Flat')}
                                                                                className={cn(
                                                                                    "flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all",
                                                                                    staged.type === 'Flat'
                                                                                        ? "bg-white dark:bg-zinc-800 text-synos-primary shadow-xs"
                                                                                        : "text-zinc-500 hover:text-zinc-800"
                                                                                )}
                                                                            >
                                                                                <IndianRupee size={11} />
                                                                                <span>Flat</span>
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-3.5 px-4">
                                                                        <div className="relative w-28">
                                                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs pointer-events-none">
                                                                                {staged.type === 'Percentage' ? '%' : '₹'}
                                                                            </span>
                                                                            <input
                                                                                type="number"
                                                                                step={staged.type === 'Percentage' ? '1' : '10'}
                                                                                placeholder="0"
                                                                                value={staged.value ?? ''}
                                                                                onChange={(e) => handleRateChange(group.referralPartnerId, test.testId, 'value', e.target.value)}
                                                                                className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-synos-primary/20 focus:border-synos-primary outline-none transition-all"
                                                                            />
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-3.5 px-4 text-right">
                                                                        <span className={cn(
                                                                            "font-mono font-bold text-xs",
                                                                            previewPayout > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"
                                                                        )}>
                                                                            ₹{previewPayout.toFixed(2)}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-3.5 px-5 text-right">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => commitSingleRule(group.referralPartnerId, test)}
                                                                            disabled={isRowSaving || !staged.value}
                                                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-zinc-900 hover:bg-black dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white rounded-lg text-[11px] font-bold transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-95"
                                                                            title="Lock Rate for this test"
                                                                        >
                                                                            {isRowSaving ? (
                                                                                <Loader2 size={12} className="animate-spin" />
                                                                            ) : (
                                                                                <Check size={12} />
                                                                            )}
                                                                            <span>Lock</span>
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
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB: LEARNED RATE CARDS */}
            {subTab === 'rate-cards' && (
                <div className="space-y-6">
                    {/* ACTION & SEARCH BAR */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative group flex-1 max-w-md">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-synos-primary transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Search learned rates by doctor or test..." 
                                value={ruleSearch}
                                onChange={(e) => {
                                    setRuleSearch(e.target.value);
                                    loadLearnedRules(e.target.value);
                                }}
                                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-zinc-950 border dark:border-zinc-900 border-zinc-100 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-synos-primary/20 transition-all outline-none"
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => loadLearnedRules(ruleSearch)}
                                className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-all"
                            >
                                <RefreshCw size={14} className={cn(loadingRules && "animate-spin")} />
                                <span>Refresh</span>
                            </button>
                        </div>
                    </div>

                    {/* DOCTOR / CLINIC ACCORDION LIST FOR LEARNED RATE CARDS */}
                    {loadingRules ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-400">
                            <Loader2 size={32} className="animate-spin text-synos-primary" />
                            <p className="text-xs font-medium">Loading doctor rate cards...</p>
                        </div>
                    ) : filteredLearnedGroups.length === 0 ? (
                        <div className="py-20 text-center bg-white dark:bg-zinc-950 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl p-12 space-y-4">
                            <div className="w-16 h-16 rounded-3xl bg-blue-500/10 text-synos-primary flex items-center justify-center mx-auto">
                                <BookOpen size={32} />
                            </div>
                            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">No Learned Rate Cards Found</h3>
                            <p className="text-xs text-zinc-500 max-w-md mx-auto">
                                {ruleSearch ? `No learned doctor rates match "${ruleSearch}".` : "No customized doctor rate cards have been learned yet. Lock rates from the Unmapped Queue to build doctor rate cards."}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredLearnedGroups.map(group => (
                                <DoctorLearnedCard
                                    key={group.referralPartnerId}
                                    group={group}
                                    isCollapsed={collapsedLearnedDoctors[group.referralPartnerId]}
                                    onToggleCollapse={() => toggleLearnedCollapse(group.referralPartnerId)}
                                    editingRuleId={editingRuleId}
                                    editRuleState={editRuleState}
                                    setEditRuleState={setEditRuleState}
                                    isSavingRule={isSavingRule}
                                    handleStartEditRule={handleStartEditRule}
                                    handleCancelEditRule={handleCancelEditRule}
                                    handleSaveEditRule={handleSaveEditRule}
                                    handleDeleteRule={handleDeleteRule}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
