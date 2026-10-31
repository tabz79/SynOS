import React from 'react';
import { Search, Building2, Beaker, Activity, Calendar, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';

export const FilterPill = ({ label, count, isActive, onClick, variant = "default" }) => {
    if (variant === "outline") {
        return (
            <button
                type="button"
                onClick={onClick}
                className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 cursor-pointer flex items-center gap-1.5",
                    isActive
                        ? "bg-zinc-900 border-zinc-900 text-white dark:bg-white dark:border-white dark:text-zinc-950 shadow-xs"
                        : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
                )}
            >
                <span>{label}</span>
                {count !== undefined && (
                    <span className={cn(
                        "text-xs px-1.5 py-0.2 rounded-full font-mono",
                        isActive ? "bg-white/20 text-white dark:bg-black/20 dark:text-black" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                    )}>
                        {count}
                    </span>
                )}
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5",
                isActive
                    ? "bg-synos-primary text-white shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
            )}
        >
            <span>{label}</span>
            {count !== undefined && (
                <span className={cn(
                    "text-xs px-1.5 py-0.2 rounded-full font-mono",
                    isActive ? "bg-white/20 text-white" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                )}>
                    {count}
                </span>
            )}
        </button>
    );
};

export const FinanceFilterBar = ({
    searchQuery,
    onSearchChange,
    searchPlaceholder = "Search patient, bill or reference...",
    statusFilter,
    onStatusChange,
    statusOptions,
    categoryFilter,
    onCategoryChange,
    categoryOptions,
    branchFilter,
    onBranchChange,
    branches = [],
    departmentFilter,
    onDepartmentChange,
    departmentOptions = ['All', 'Pathology', 'Radiology'],
    modalityFilter,
    onModalityChange,
    modalityOptions,
    doctorFilter,
    onDoctorChange,
    doctorOptions = [],
    dateRange,
    onDateRangeChange,
    dateRangeOptions = ['Today', 'Yesterday', 'This Week', 'This Month', 'This Quarter', 'This Year', 'All Time', 'Custom Range'],
    customDates = { start: '', end: '' },
    onCustomDatesChange,
    extraControls
}) => {
    return (
        <div className="space-y-3 p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/50 border dark:border-zinc-800 border-zinc-200">
            {/* Top Row: Primary Category, Status & Search */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
                    {statusOptions && statusOptions.length > 0 && (
                        <>
                            {statusOptions.map(opt => {
                                const label = typeof opt === 'object' ? opt.label : opt;
                                const val = typeof opt === 'object' ? opt.value : opt;
                                const count = typeof opt === 'object' ? opt.count : undefined;
                                return (
                                    <FilterPill
                                        key={val}
                                        label={label}
                                        count={count}
                                        isActive={statusFilter === val}
                                        onClick={() => onStatusChange && onStatusChange(val)}
                                    />
                                );
                            })}
                        </>
                    )}

                    {statusOptions && categoryOptions && (
                        <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-800 mx-2 hidden lg:block" />
                    )}

                    {categoryOptions && categoryOptions.length > 0 && (
                        <>
                            {categoryOptions.map(opt => {
                                const label = typeof opt === 'object' ? opt.label : opt;
                                const val = typeof opt === 'object' ? opt.value : opt;
                                const count = typeof opt === 'object' ? opt.count : undefined;
                                return (
                                    <FilterPill
                                        key={val}
                                        label={label}
                                        count={count}
                                        isActive={categoryFilter === val}
                                        onClick={() => onCategoryChange && onCategoryChange(val)}
                                        variant="outline"
                                    />
                                );
                            })}
                        </>
                    )}
                </div>

                {/* Search Input */}
                {onSearchChange && (
                    <div className="relative min-w-[220px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={searchQuery || ''}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:border-synos-primary transition-all"
                        />
                    </div>
                )}
            </div>

            {/* Bottom Row: Multi-dimensional facets & Date Range */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                {/* Branch Selector */}
                {onBranchChange && (
                    <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-950 px-2 py-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <Building2 size={13} className="text-zinc-400" />
                        <select
                            value={branchFilter || 'All'}
                            onChange={(e) => onBranchChange(e.target.value)}
                            className="bg-transparent text-xs font-semibold text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer"
                        >
                            <option value="All">All Branches</option>
                            {branches.map(b => (
                                <option key={b.branchId || b.id} value={b.branchId || b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Department Selector */}
                {onDepartmentChange && (
                    <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-950 px-2 py-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <Beaker size={13} className="text-zinc-400" />
                        <select
                            value={departmentFilter || 'All'}
                            onChange={(e) => {
                                onDepartmentChange(e.target.value);
                                if (onModalityChange) onModalityChange('All');
                            }}
                            className="bg-transparent text-xs font-semibold text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer"
                        >
                            {departmentOptions.map(dept => (
                                <option key={dept} value={dept}>{dept === 'All' ? 'All Departments' : dept}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Modality Selector */}
                {onModalityChange && (
                    <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-950 px-2 py-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <Activity size={13} className="text-zinc-400" />
                        <select
                            value={modalityFilter || 'All'}
                            onChange={(e) => onModalityChange(e.target.value)}
                            className="bg-transparent text-xs font-semibold text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer"
                        >
                            <option value="All">All Modalities / Disciplines</option>
                            {modalityOptions ? (
                                modalityOptions.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))
                            ) : (
                                <>
                                    {departmentFilter !== 'Radiology' && (
                                        <optgroup label="Pathology Disciplines">
                                            <option value="Biochemistry">Biochemistry</option>
                                            <option value="Hematology">Hematology</option>
                                            <option value="Microbiology">Microbiology</option>
                                            <option value="Histopathology">Histopathology</option>
                                        </optgroup>
                                    )}
                                    {departmentFilter !== 'Pathology' && (
                                        <optgroup label="Radiology Modalities">
                                            <option value="X-Ray">X-Ray</option>
                                            <option value="CT Scan">CT Scan</option>
                                            <option value="Ultrasound">Ultrasound</option>
                                            <option value="MRI">MRI</option>
                                        </optgroup>
                                    )}
                                </>
                            )}
                        </select>
                    </div>
                )}

                {/* Doctor / Referring Provider Selector */}
                {onDoctorChange && (
                    <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-950 px-2 py-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <Stethoscope size={13} className="text-zinc-400" />
                        <select
                            value={doctorFilter || 'All'}
                            onChange={(e) => onDoctorChange(e.target.value)}
                            className="bg-transparent text-xs font-semibold text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer max-w-[180px] truncate"
                        >
                            <option value="All">All Doctors / Referrers</option>
                            {doctorOptions.map(doc => {
                                const val = typeof doc === 'object' ? doc.value || doc.name : doc;
                                const label = typeof doc === 'object' ? doc.label || doc.name : doc;
                                return <option key={val} value={val}>{label}</option>;
                            })}
                        </select>
                    </div>
                )}

                {extraControls}

                {/* Date Range Selector */}
                {onDateRangeChange && (
                    <div className="flex items-center gap-2 ml-auto">
                        {dateRange === 'Custom Range' && (
                            <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-300">
                                <input
                                    type="date"
                                    value={customDates?.start || ''}
                                    onChange={(e) => onCustomDatesChange && onCustomDatesChange({ ...customDates, start: e.target.value })}
                                    className="bg-white dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-200 rounded-lg px-2 py-1 text-xs font-bold text-synos-primary outline-none"
                                />
                                <span className="text-zinc-400 text-xs">to</span>
                                <input
                                    type="date"
                                    value={customDates?.end || ''}
                                    onChange={(e) => onCustomDatesChange && onCustomDatesChange({ ...customDates, end: e.target.value })}
                                    className="bg-white dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-200 rounded-lg px-2 py-1 text-xs font-bold text-synos-primary outline-none"
                                />
                            </div>
                        )}
                        <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-950 px-2 py-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
                            <Calendar size={13} className="text-zinc-400" />
                            <select
                                value={dateRange || 'This Month'}
                                onChange={(e) => onDateRangeChange(e.target.value)}
                                className="bg-transparent text-xs font-semibold dark:text-zinc-300 outline-none focus:border-synos-primary transition-all cursor-pointer"
                            >
                                {dateRangeOptions.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
