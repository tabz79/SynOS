import React, { useState, useRef, useEffect } from 'react';
import { Download, Printer, X, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Enterprise Floating Quick Action Buttons for Finance Screens.
 * Floats at bottom-left in a compact squircle footprint.
 * When clicked, expands HORIZONTALLY to reveal standalone, high-contrast action buttons:
 *   [ Close (X) ] [ Extra Action(s) ] [ Download Summary ] [ Print Summary ]
 * Not enclosed in any floating card/modal to avoid background washout.
 * Automatically collapses on outside click, Escape key, or when an action is executed.
 * Screen-aware: adjusts along horizontal overflow on smaller screens.
 */
export const FinanceFloatingActions = ({
    onDownload = null,
    downloadLabel = "Download Summary",
    downloadCount = null,
    downloadDisabled = false,
    onPrint = null,
    printLabel = "Print Summary",
    printDisabled = false,
    extraActions = [],
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Outside click & Escape key dismissal
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    const hasAnyAction = onDownload || onPrint || (extraActions && extraActions.length > 0);
    if (!hasAnyAction) return null;

    return (
        <div ref={containerRef} className={cn("sticky bottom-6 left-8 z-50 select-none w-fit", className)}>
            {!isOpen ? (
                /* COLLAPSED: Single floating squircle trigger */
                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    title="Downloads & Quick Actions"
                    aria-label="Downloads and quick actions"
                    className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer shadow-2xl shadow-zinc-950/40 bg-zinc-900 hover:bg-zinc-800 text-white border border-white/20 hover:scale-105 active:scale-95"
                >
                    <Download size={18} className="transition-transform duration-200 hover:translate-y-0.5" />
                </button>
            ) : (
                /* EXPANDED HORIZONTALLY: Standalone high-contrast floating buttons (NO enclosing modal card) */
                <div className="flex items-center gap-2 max-w-[calc(100vw-6rem)] sm:max-w-[calc(100vw-20rem)] overflow-x-auto no-scrollbar animate-in fade-in slide-in-from-left-3 duration-200 py-0.5">
                    {/* 1. Collapse / Close Trigger */}
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        title="Collapse Actions (Esc)"
                        aria-label="Collapse actions"
                        className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-150 cursor-pointer shadow-2xl shadow-zinc-950/40 bg-zinc-900 hover:bg-rose-600 text-white border border-white/20 active:scale-95 shrink-0"
                    >
                        <X size={18} />
                    </button>

                    {/* 2. Extra Action Buttons (e.g. Doctor Invoice) */}
                    {extraActions && extraActions.map((action, idx) => {
                        const IconComponent = action.icon || FileSpreadsheet;
                        return (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                    if (action.onClick) action.onClick();
                                    setIsOpen(false);
                                }}
                                disabled={action.disabled}
                                className={cn(
                                    "h-11 px-4 rounded-2xl flex items-center gap-2 font-bold text-xs shadow-2xl border border-white/20 shrink-0 whitespace-nowrap active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
                                    action.className || "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/40"
                                )}
                            >
                                <IconComponent size={15} className="shrink-0" />
                                <span>{action.label}</span>
                                {action.count !== undefined && action.count !== null && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 text-white font-bold">
                                        {action.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}

                    {/* 3. Download Summary Button */}
                    {onDownload && (
                        <button
                            type="button"
                            onClick={() => {
                                onDownload();
                                setIsOpen(false);
                            }}
                            disabled={downloadDisabled}
                            className="h-11 px-4.5 rounded-2xl flex items-center gap-2 font-bold text-xs shadow-2xl shadow-blue-950/40 bg-synos-primary hover:bg-synos-primary/90 text-white border border-white/20 shrink-0 whitespace-nowrap active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Download size={15} className="shrink-0" />
                            <span>{downloadLabel}</span>
                            {downloadCount !== undefined && downloadCount !== null && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/25 text-white font-bold">
                                    {downloadCount}
                                </span>
                            )}
                        </button>
                    )}

                    {/* 4. Print Summary Button */}
                    {onPrint && (
                        <button
                            type="button"
                            onClick={() => {
                                onPrint();
                                setIsOpen(false);
                            }}
                            disabled={printDisabled}
                            className="h-11 px-4.5 rounded-2xl flex items-center gap-2 font-bold text-xs shadow-2xl shadow-zinc-950/40 bg-zinc-900 hover:bg-zinc-800 text-white border border-white/20 shrink-0 whitespace-nowrap active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Printer size={15} className="shrink-0" />
                            <span>{printLabel}</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default FinanceFloatingActions;
