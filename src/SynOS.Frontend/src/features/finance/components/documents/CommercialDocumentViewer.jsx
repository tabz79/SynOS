import React, { useState, useRef } from 'react';
import { 
    X, 
    Printer, 
    Download, 
    Share2, 
    Building2, 
    Check, 
    FileText, 
    ZoomIn, 
    ZoomOut, 
    Sparkles, 
    MessageSquare,
    Layers,
    FileSpreadsheet
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const CommercialDocumentViewer = ({ 
    isOpen, 
    onClose, 
    title = "Commercial Document", 
    children, 
    onWhatsAppShare,
    defaultLetterheadMode = "digital",
    topMarginMm = 40
}) => {
    const [letterheadMode, setLetterheadMode] = useState(defaultLetterheadMode); // "digital" | "preprinted"
    const [customMargin, setCustomMargin] = useState(topMarginMm);
    const [zoom, setZoom] = useState(1);
    const printAreaRef = useRef(null);

    if (!isOpen) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:overflow-visible animate-in fade-in duration-300">
            {/* INLINE PRINT STYLESHEET */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    #synos-commercial-sheet, #synos-commercial-sheet * {
                        visibility: visible !important;
                    }
                    #synos-commercial-sheet {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    @page {
                        size: A4 portrait;
                        margin: 8mm;
                    }
                }
            `}</style>

            <div className="relative w-full max-w-5xl bg-zinc-100 dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[96vh] overflow-hidden print:max-h-none print:border-none print:shadow-none print:bg-white print:rounded-none">
                
                {/* TOOLBAR (NO-PRINT) */}
                <div className="no-print p-4 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-synos-primary/10 border border-synos-primary/20 flex items-center justify-center text-synos-primary">
                            <FileText size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-zinc-900 dark:text-white leading-tight">{title}</h2>
                            <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Enterprise Document System • A4 Standard</p>
                        </div>
                    </div>

                    {/* ACTIONS & CONTROLS */}
                    <div className="flex items-center flex-wrap gap-2 ml-auto">
                        {/* Letterhead Switch */}
                        <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
                            <button
                                onClick={() => setLetterheadMode('digital')}
                                className={cn(
                                    "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer",
                                    letterheadMode === 'digital'
                                        ? "bg-white dark:bg-zinc-800 text-synos-primary shadow-xs"
                                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                                )}
                            >
                                Digital Header
                            </button>
                            <button
                                onClick={() => setLetterheadMode('preprinted')}
                                title="Leaves blank top space for feeding printed clinic stationery into printer"
                                className={cn(
                                    "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1",
                                    letterheadMode === 'preprinted'
                                        ? "bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-xs"
                                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                                )}
                            >
                                <Layers size={12} />
                                <span>Printed Letterhead</span>
                            </button>
                        </div>

                        {/* Top Margin Slider (Only shown if preprinted) */}
                        {letterheadMode === 'preprinted' && (
                            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-xl text-amber-600 dark:text-amber-400 text-xs font-bold animate-in fade-in">
                                <span className="text-[10px] uppercase">Top Blank:</span>
                                <input 
                                    type="number" 
                                    min="20" 
                                    max="80" 
                                    value={customMargin}
                                    onChange={(e) => setCustomMargin(Number(e.target.value))}
                                    className="w-12 bg-white dark:bg-zinc-900 px-1 py-0.5 rounded text-center font-mono text-xs border border-amber-500/30"
                                />
                                <span className="text-[10px]">mm</span>
                            </div>
                        )}

                        {/* WhatsApp Share Button */}
                        {onWhatsAppShare && (
                            <button
                                onClick={onWhatsAppShare}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                            >
                                <MessageSquare size={14} />
                                <span className="hidden sm:inline">WhatsApp</span>
                            </button>
                        )}

                        {/* Print Button */}
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-synos-primary hover:bg-synos-primary/90 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                        >
                            <Printer size={14} />
                            <span>Print / PDF</span>
                        </button>

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl bg-zinc-200/80 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-all cursor-pointer"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* DOCUMENT PREVIEW CONTAINER (SCROLLABLE) */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center bg-zinc-200/70 dark:bg-zinc-950/70 print:p-0 print:bg-white">
                    <div 
                        id="synos-commercial-sheet"
                        ref={printAreaRef}
                        style={{
                            width: '210mm',
                            minHeight: '297mm',
                            boxSizing: 'border-box'
                        }}
                        className="bg-white text-zinc-900 shadow-xl border border-zinc-300 rounded-sm p-8 sm:p-12 relative flex flex-col justify-between print:shadow-none print:border-none print:p-0 print:w-full"
                    >
                        {/* CLONE CHILDREN WITH LETTERHEAD PROPS */}
                        {React.cloneElement(children, { 
                            letterheadMode, 
                            topMarginMm: customMargin 
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
};
