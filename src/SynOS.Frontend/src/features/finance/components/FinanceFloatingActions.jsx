import React, { useState, useRef, useEffect } from 'react';
import { Download, Printer, X, ChevronUp, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Enterprise Floating Squircle Action Button for Finance Screens.
 * Floats at bottom-left in a compact squircle footprint.
 * Expands upwards when clicked to reveal Download, Print, and contextual action buttons.
 * Automatically collapses on outside click or Escape.
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
            {/* EXPANDED ACTIONS POPOVER (Expands upwards) */}
            {isOpen && (
                <div 
                    className="absolute bottom-13 left-0 mb-2 min-w-[240px] p-2 rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xl shadow-zinc-950/20 space-y-1 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-150 origin-bottom-left"
                >
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800/60 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Quick Actions</span>
                        <span className="text-[9px] font-medium text-zinc-400">Esc to close</span>
                    </div>

                    {/* Contextual Extra Actions (e.g. Doctor Invoice) */}
                    {extraActions && extraActions.map((action, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => {
                                if (action.onClick) action.onClick();
                                setIsOpen(false);
                            }}
                            disabled={action.disabled}
                            className={cn(
                                "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer group/action text-left",
                                action.className || "text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                            )}
                        >
                            <div className="flex items-center gap-2.5">
                                {action.icon && <action.icon size={14} className="shrink-0" />}
                                <span>{action.label}</span>
                            </div>
                            {action.count !== undefined && action.count !== null && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                                    {action.count}
                                </span>
                            )}
                        </button>
                    ))}

                    {/* Download Action */}
                    {onDownload && (
                        <button
                            type="button"
                            onClick={() => {
                                onDownload();
                                setIsOpen(false);
                            }}
                            disabled={downloadDisabled}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-synos-primary hover:text-white dark:hover:bg-synos-primary dark:hover:text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group/btn text-left"
                        >
                            <div className="flex items-center gap-2.5">
                                <Download size={14} className="shrink-0 group-hover/btn:translate-y-0.5 transition-transform" />
                                <span>{downloadLabel}</span>
                            </div>
                            {downloadCount !== undefined && downloadCount !== null && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 group-hover/btn:bg-white/20 group-hover/btn:text-white">
                                    {downloadCount}
                                </span>
                            )}
                        </button>
                    )}

                    {/* Print Summary Action */}
                    {onPrint && (
                        <button
                            type="button"
                            onClick={() => {
                                onPrint();
                                setIsOpen(false);
                            }}
                            disabled={printDisabled}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group/print text-left"
                        >
                            <div className="flex items-center gap-2.5">
                                <Printer size={14} className="shrink-0 group-hover/print:scale-110 transition-transform" />
                                <span>{printLabel}</span>
                            </div>
                        </button>
                    )}
                </div>
            )}

            {/* FLOATING SQUIRCLE TRIGGER BUTTON */}
            <button
                type="button"
                onClick={() => setIsOpen(prev => !prev)}
                title={isOpen ? "Close Actions" : "Downloads & Quick Actions"}
                aria-label="Downloads and quick actions"
                className={cn(
                    "w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer shadow-xl",
                    isOpen
                        ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30 rotate-90 scale-105"
                        : "bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 shadow-zinc-950/25 dark:shadow-black/40 hover:scale-105 active:scale-95 border border-white/10 dark:border-zinc-300/40"
                )}
            >
                {isOpen ? (
                    <X size={18} className="transition-transform duration-200 -rotate-90" />
                ) : (
                    <Download size={18} className="transition-transform duration-200 hover:translate-y-0.5" />
                )}
            </button>
        </div>
    );
};
export default FinanceFloatingActions;
