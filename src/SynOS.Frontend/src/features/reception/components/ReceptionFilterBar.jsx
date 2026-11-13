import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Clock, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ReceptionFilterBar({
    className = "",
    filter = { preset: 'today', startDate: '', endDate: '', singleDate: '' },
    onChange
}) {
    const [isSingleDateOpen, setIsSingleDateOpen] = useState(false);
    const [isCustomRangeOpen, setIsCustomRangeOpen] = useState(false);

    const singleDatePopoverRef = useRef(null);
    const customRangePopoverRef = useRef(null);

    // Click outside to close popovers
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (singleDatePopoverRef.current && !singleDatePopoverRef.current.contains(e.target)) {
                setIsSingleDateOpen(false);
            }
            if (customRangePopoverRef.current && !customRangePopoverRef.current.contains(e.target)) {
                setIsCustomRangeOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const timePresets = [
        { id: 'today', label: 'Today' },
        { id: 'month', label: 'This Month' },
        { id: 'quarter', label: 'This Quarter' },
        { id: 'year', label: 'This Year' }
    ];

    const formatDateForInput = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formatHumanDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            const [y, m, d] = dateStr.split('-');
            const date = new Date(Number(y), Number(m) - 1, Number(d));
            return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        } catch {
            return dateStr;
        }
    };

    const handlePresetSelect = (presetId) => {
        setIsSingleDateOpen(false);
        setIsCustomRangeOpen(false);
        if (onChange) {
            onChange({
                preset: presetId,
                startDate: '',
                endDate: '',
                singleDate: ''
            });
        }
    };

    const handleSingleDateSelect = (dateStr) => {
        if (!dateStr) return;
        setIsSingleDateOpen(false);
        setIsCustomRangeOpen(false);
        if (onChange) {
            onChange({
                preset: 'singleDate',
                startDate: dateStr,
                endDate: dateStr,
                singleDate: dateStr
            });
        }
    };

    const handleQuickSinglePastDay = (daysAgo) => {
        const target = new Date();
        target.setDate(target.getDate() - daysAgo);
        const dateStr = formatDateForInput(target);
        handleSingleDateSelect(dateStr);
    };

    const handleCustomRangeChange = (field, value) => {
        const updatedStart = field === 'startDate' ? value : (filter.startDate || '');
        const updatedEnd = field === 'endDate' ? value : (filter.endDate || '');

        if (onChange) {
            onChange({
                preset: 'custom',
                startDate: updatedStart,
                endDate: updatedEnd,
                singleDate: ''
            });
        }
    };

    const handleQuickDaysRange = (days) => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - (days - 1));

        const startStr = formatDateForInput(start);
        const endStr = formatDateForInput(end);

        if (onChange) {
            onChange({
                preset: 'custom',
                startDate: startStr,
                endDate: endStr,
                singleDate: ''
            });
        }
        setIsCustomRangeOpen(false);
    };

    const isToday = filter.preset === 'today';
    const isMonth = filter.preset === 'month';
    const isQuarter = filter.preset === 'quarter';
    const isYear = filter.preset === 'year';
    const isSingleDate = filter.preset === 'singleDate';
    const isCustomRange = filter.preset === 'custom';

    return (
        <div className={cn("flex items-center gap-1.5 flex-nowrap shrink-0", className)}>
            <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-zinc-800/80 p-0.5 sm:p-1 rounded-xl shrink-0">
                {/* Standard Horizon Presets */}
                {timePresets.map((t) => {
                    const isSelected = filter.preset === t.id;
                    return (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => handlePresetSelect(t.id)}
                            className={cn(
                                "px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                                isSelected
                                    ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-xs font-bold"
                                    : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
                            )}
                        >
                            {t.label}
                        </button>
                    );
                })}

                {/* 1. Dedicated Custom Date (Single Specific Day Picker) */}
                <div className="relative" ref={singleDatePopoverRef}>
                    <button
                        type="button"
                        onClick={() => {
                            setIsCustomRangeOpen(false);
                            setIsSingleDateOpen(!isSingleDateOpen);
                        }}
                        className={cn(
                            "px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
                            isSingleDate
                                ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-xs font-bold"
                                : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
                        )}
                        title="Select one specific date (e.g. November 2nd)"
                    >
                        <Calendar className="w-3.5 h-3.5 text-synos-primary" />
                        <span>
                            {isSingleDate && filter.singleDate
                                ? formatHumanDate(filter.singleDate)
                                : "Custom Date"}
                        </span>
                        <ChevronDown className={cn("w-3 h-3 transition-transform duration-200 opacity-60", isSingleDateOpen && "rotate-180")} />
                    </button>

                    {/* Single Date Floating Popover */}
                    {isSingleDateOpen && (
                        <div className="absolute right-0 top-full mt-2 w-auto min-w-[260px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-3 rounded-2xl shadow-xl z-50 animate-in fade-in slide-in-from-top-1 duration-150 space-y-2.5">
                            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-zinc-800">
                                <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1 uppercase tracking-wider">
                                    <Clock className="w-3.5 h-3.5 text-synos-primary" />
                                    Specific Day
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setIsSingleDateOpen(false)}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 cursor-pointer"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Quick Days Selector */}
                            <div className="flex items-center gap-1">
                                {[
                                    { label: 'Yesterday', daysAgo: 1 },
                                    { label: '2d Ago', daysAgo: 2 },
                                    { label: '3d Ago', daysAgo: 3 },
                                    { label: '7d Ago', daysAgo: 7 }
                                ].map((q) => (
                                    <button
                                        key={q.daysAgo}
                                        type="button"
                                        onClick={() => handleQuickSinglePastDay(q.daysAgo)}
                                        className="flex-1 px-1.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer text-center"
                                    >
                                        {q.label}
                                    </button>
                                ))}
                            </div>

                            {/* Precise Calendar Input */}
                            <div className="pt-1 border-t border-slate-100 dark:border-zinc-800 flex items-center gap-2">
                                <input
                                    type="date"
                                    value={filter.singleDate || ''}
                                    onChange={(e) => handleSingleDateSelect(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-synos-primary"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Dedicated Custom Range (From / To Horizon Picker) */}
                <div className="relative" ref={customRangePopoverRef}>
                    <button
                        type="button"
                        onClick={() => {
                            setIsSingleDateOpen(false);
                            setIsCustomRangeOpen(!isCustomRangeOpen);
                        }}
                        className={cn(
                            "px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
                            isCustomRange
                                ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-xs font-bold"
                                : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
                        )}
                        title="Select custom date range (From date to To date)"
                    >
                        <Calendar className="w-3.5 h-3.5 text-synos-primary" />
                        <span>Custom Range</span>
                        {isCustomRange && filter.startDate && filter.endDate && (
                            <span className="text-[10px] bg-synos-primary/10 text-synos-primary px-1.5 py-0.5 rounded font-mono hidden md:inline">
                                {formatHumanDate(filter.startDate)} - {formatHumanDate(filter.endDate)}
                            </span>
                        )}
                        <ChevronDown className={cn("w-3 h-3 transition-transform duration-200 opacity-60", isCustomRangeOpen && "rotate-180")} />
                    </button>

                    {/* Custom Range Floating Popover */}
                    {isCustomRangeOpen && (
                        <div className="absolute right-0 top-full mt-2 w-auto min-w-[300px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-3 rounded-2xl shadow-xl z-50 animate-in fade-in slide-in-from-top-1 duration-150 space-y-2.5">
                            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-zinc-800">
                                <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1 uppercase tracking-wider">
                                    <Clock className="w-3.5 h-3.5 text-synos-primary" />
                                    Date Range Horizon
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setIsCustomRangeOpen(false)}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 cursor-pointer"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Quick Days Selector */}
                            <div className="flex items-center gap-1">
                                {[
                                    { label: '2 Days', days: 2 },
                                    { label: '3 Days', days: 3 },
                                    { label: '7 Days', days: 7 },
                                    { label: '30 Days', days: 30 }
                                ].map((q) => (
                                    <button
                                        key={q.days}
                                        type="button"
                                        onClick={() => handleQuickDaysRange(q.days)}
                                        className="flex-1 px-2 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer text-center"
                                    >
                                        {q.label}
                                    </button>
                                ))}
                            </div>

                            {/* Range Inputs */}
                            <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-zinc-800">
                                <input
                                    type="date"
                                    value={filter.startDate || ''}
                                    onChange={(e) => handleCustomRangeChange('startDate', e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-synos-primary"
                                />
                                <span className="text-xs text-slate-400 font-medium shrink-0">to</span>
                                <input
                                    type="date"
                                    value={filter.endDate || ''}
                                    onChange={(e) => handleCustomRangeChange('endDate', e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-synos-primary"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
