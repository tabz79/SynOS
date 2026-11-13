import React, { useState, useRef, useEffect } from 'react';
import { 
    Calendar, 
    Building2, 
    ChevronDown, 
    Check, 
    Clock,
    X,
    Sparkles
} from 'lucide-react';
import { useGlobalFilter } from '@/context/GlobalFilterContext';
import { cn } from '@/lib/utils';

export const StandardFilterBar = ({ 
    className = "",
    showBranches = true,
    showSingleDate = true,
    showCustomRange = true,
    showPresets = true,
    onChange = null
}) => {
    const {
        presetRange,
        setPresetRange,
        customDates,
        setCustomDates,
        setQuickDays,
        setSingleDate,
        isConsolidated,
        setIsConsolidated,
        activeBranchId,
        setActiveBranchId,
        branches,
        currentBranchName,
        isAdmin
    } = useGlobalFilter();

    const [isSingleDateOpen, setIsSingleDateOpen] = useState(false);
    const [isCustomOpen, setIsCustomOpen] = useState(false);
    const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
    const branchDropdownRef = useRef(null);
    const singleDatePopoverRef = useRef(null);
    const customPopoverRef = useRef(null);

    // Click outside to close dropdowns
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target)) {
                setIsBranchDropdownOpen(false);
            }
            if (singleDatePopoverRef.current && !singleDatePopoverRef.current.contains(e.target)) {
                setIsSingleDateOpen(false);
            }
            if (customPopoverRef.current && !customPopoverRef.current.contains(e.target)) {
                setIsCustomOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handlePresetSelect = (id) => {
        setPresetRange(id);
        if (id !== 'custom') {
            setIsCustomOpen(false);
        } else {
            setIsCustomOpen(true);
        }
        if (onChange) onChange({ preset: id, isConsolidated, branchId: activeBranchId, customDates });
    };

    const handleCustomDateChange = (field, value) => {
        const updated = { ...customDates, [field]: value };
        setCustomDates(updated);
        if (onChange) onChange({ preset: 'custom', isConsolidated, branchId: activeBranchId, customDates: updated });
    };

    const handleQuickDays = (days) => {
        setQuickDays(days);
        if (onChange) onChange({ preset: 'custom', isConsolidated, branchId: activeBranchId, customDates });
    };

    const handleSelectBranch = (branchId) => {
        setActiveBranchId(branchId);
        setIsConsolidated(false);
        setIsBranchDropdownOpen(false);
        if (onChange) onChange({ preset: presetRange, isConsolidated: false, branchId, customDates });
    };

    const handleSelectConsolidated = () => {
        setIsConsolidated(true);
        setIsBranchDropdownOpen(false);
        if (onChange) onChange({ preset: presetRange, isConsolidated: true, branchId: null, customDates });
    };

    const timePresets = [
        { id: 'today', label: 'Today' },
        { id: 'month', label: 'This Month' },
        { id: 'quarter', label: 'This Quarter' },
        { id: 'year', label: 'This Year' }
    ];

    return (
        <div className={cn("flex items-center gap-2.5 flex-nowrap shrink-0", className)}>
            {/* Time Horizon Segment */}
            {showPresets && (
                <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-zinc-800/80 p-1 rounded-xl shrink-0">
                    {timePresets.map(t => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => handlePresetSelect(t.id)}
                            className={cn(
                                "px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap",
                                presetRange === t.id 
                                    ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-xs font-bold" 
                                    : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
                            )}
                        >
                            {t.label}
                        </button>
                    ))}

                    {/* Custom Date (Single Specific Day) */}
                    {showSingleDate && (
                        <div className="relative" ref={singleDatePopoverRef}>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsCustomOpen(false);
                                    setIsSingleDateOpen(!isSingleDateOpen);
                                }}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
                                    presetRange === 'singleDate'
                                        ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-xs font-bold"
                                        : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
                                )}
                                title="Select one specific date"
                            >
                                <Calendar className="w-3.5 h-3.5 text-synos-primary" />
                                <span>
                                    {presetRange === 'singleDate' && customDates?.single
                                        ? customDates.single.slice(5)
                                        : "Custom Date"}
                                </span>
                            </button>
                            {isSingleDateOpen && (
                                <div className="absolute right-0 top-full mt-2 w-auto min-w-[280px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-3 rounded-2xl shadow-xl z-50 animate-in fade-in slide-in-from-top-1 duration-150 space-y-2.5">
                                    <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-zinc-800">
                                        <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1 uppercase tracking-wider">
                                            <Clock className="w-3.5 h-3.5 text-synos-primary" />
                                            Specific Date
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setIsSingleDateOpen(false)}
                                            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 cursor-pointer"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <div className="pt-1 border-t border-slate-100 dark:border-zinc-800">
                                        <input
                                            type="date"
                                            value={customDates?.single || ''}
                                            onChange={(e) => {
                                                if (setSingleDate) setSingleDate(e.target.value);
                                                setIsSingleDateOpen(false);
                                                if (onChange) onChange({ preset: 'singleDate', isConsolidated, branchId: activeBranchId, customDates: { start: e.target.value, end: e.target.value, single: e.target.value } });
                                            }}
                                            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-synos-primary"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Custom Range Button + Floating Popover */}
                    {showCustomRange && (
                        <div className="relative" ref={customPopoverRef}>
                            <button
                                type="button"
                                onClick={() => {
                                    if (presetRange === 'custom') {
                                        setIsCustomOpen(!isCustomOpen);
                                    } else {
                                        handlePresetSelect('custom');
                                        setIsCustomOpen(true);
                                    }
                                }}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
                                    presetRange === 'custom'
                                        ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-xs font-bold"
                                        : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
                                )}
                                title="Select custom date range"
                            >
                                <Calendar className="w-3.5 h-3.5 text-synos-primary" />
                                <span>Custom Range</span>
                                {presetRange === 'custom' && customDates?.start && customDates?.end && (
                                    <span className="text-[10px] bg-synos-primary/10 text-synos-primary px-1.5 py-0.5 rounded font-mono hidden md:inline">
                                        {customDates.start.slice(5)} to {customDates.end.slice(5)}
                                    </span>
                                )}
                            </button>

                            {/* Absolute Floating Popover Bar (Zero Layout Shift) */}
                            {isCustomOpen && (
                                <div 
                                    className="absolute right-0 top-full mt-2 w-auto min-w-[320px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-3 rounded-2xl shadow-xl z-50 animate-in fade-in slide-in-from-top-1 duration-150 space-y-2.5"
                                >
                                    <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-zinc-800">
                                        <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1 uppercase tracking-wider">
                                            <Clock className="w-3.5 h-3.5 text-synos-primary" />
                                            Quick Horizon
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setIsCustomOpen(false)}
                                            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 cursor-pointer"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {[
                                            { label: '2 Days', days: 2 },
                                            { label: '3 Days', days: 3 },
                                            { label: '7 Days', days: 7 },
                                            { label: '30 Days', days: 30 }
                                        ].map(q => (
                                            <button
                                                key={q.days}
                                                type="button"
                                                onClick={() => handleQuickDays(q.days)}
                                                className="flex-1 px-2 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer text-center"
                                            >
                                                {q.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-zinc-800">
                                        <input
                                            type="date"
                                            value={customDates?.start || ''}
                                            onChange={(e) => handleCustomDateChange('start', e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-synos-primary"
                                        />
                                        <span className="text-xs text-slate-400 font-medium">to</span>
                                        <input
                                            type="date"
                                            value={customDates?.end || ''}
                                            onChange={(e) => handleCustomDateChange('end', e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-synos-primary"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Branch Horizon Segment (Consolidated vs Branch View) */}
            {showBranches && isAdmin && (
                <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-zinc-800/80 p-1 rounded-xl relative shrink-0" ref={branchDropdownRef}>
                        {/* All Branches Button */}
                        <button
                            type="button"
                            onClick={handleSelectConsolidated}
                            className={cn(
                                "px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap",
                                isConsolidated 
                                    ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-xs font-bold"
                                    : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
                            )}
                        >
                            All Branches
                        </button>

                        {/* Branch View Toggle + Dropdown Trigger */}
                        <button
                            type="button"
                            onClick={() => {
                                setIsBranchDropdownOpen(!isBranchDropdownOpen);
                            }}
                            className={cn(
                                "px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
                                !isConsolidated 
                                    ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-xs font-bold"
                                    : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
                            )}
                            title="Switch to single branch view or select specific branch"
                        >
                            <Building2 className="w-3.5 h-3.5 text-synos-primary" />
                            <span>Branch View</span>
                            {!isConsolidated && (
                                <span className="font-bold text-slate-800 dark:text-zinc-200 max-w-[120px] truncate">
                                    : {currentBranchName}
                                </span>
                            )}
                            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", isBranchDropdownOpen && "rotate-180")} />
                        </button>

                        {/* Interactive Branch Dropdown Menu */}
                        {isBranchDropdownOpen && (
                            <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-3 py-1.5 border-b border-slate-100 dark:border-zinc-800">
                                    Select Hospital / Lab Branch
                                </div>
                                <div className="py-1 space-y-0.5 max-h-60 overflow-y-auto">
                                    {branches.length === 0 ? (
                                        <div className="px-3 py-2 text-xs text-slate-400 italic">No branch records found</div>
                                    ) : (
                                        branches.map(b => {
                                            const bId = b.branchId || b.id;
                                            const isSelected = !isConsolidated && activeBranchId === bId;
                                            return (
                                                <button
                                                    key={bId}
                                                    type="button"
                                                    onClick={() => handleSelectBranch(bId)}
                                                    className={cn(
                                                        "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors cursor-pointer",
                                                        isSelected
                                                            ? "bg-synos-primary/10 text-synos-primary font-bold"
                                                            : "text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <div className={cn("w-2 h-2 rounded-full", isSelected ? "bg-synos-primary" : "bg-slate-300 dark:bg-zinc-600")} />
                                                        <span className="truncate">{b.name}</span>
                                                    </div>
                                                    {isSelected && <Check className="w-3.5 h-3.5 text-synos-primary shrink-0" />}
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
