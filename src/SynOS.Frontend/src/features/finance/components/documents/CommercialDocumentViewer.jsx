import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
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
    FileSpreadsheet,
    Receipt
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const CommercialDocumentViewer = ({ 
    isOpen, 
    onClose, 
    title = "Commercial Document", 
    children, 
    onWhatsAppShare,
    onDownloadCsv,
    defaultLetterheadMode = "digital",
    topMarginMm = 40,
    paperSize = "a4", // "a4" | "thermal80"
    recordCount = null
}) => {
    const [letterheadMode, setLetterheadMode] = useState(defaultLetterheadMode); // "digital" | "preprinted"
    const [customMargin, setCustomMargin] = useState(topMarginMm);
    const [zoom, setZoom] = useState(1);
    const printAreaRef = useRef(null);

    if (!isOpen) return null;

    const isThermal = paperSize === 'thermal80';

    // A4 Sheet Physical Governance Calculation:
    // Page 1 budget: ~18 rows with Header, Badges & KPIs
    // Continuation pages: ~28 rows with repeating thead & margins
    const estimatedPages = isThermal 
        ? 1 
        : (typeof recordCount === 'number' && recordCount > 0 
            ? (recordCount <= 18 ? 1 : 1 + Math.ceil((recordCount - 18) / 28))
            : 1);

    const handlePrint = () => {
        window.print();
    };

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:overflow-visible animate-in fade-in duration-300">
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
                        max-width: none !important;
                        margin: 0 !important;
                        padding: ${isThermal ? '2mm 3mm' : '8mm 10mm'} !important;
                        box-shadow: none !important;
                        border: none !important;
                        background: white !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    @page {
                        size: ${isThermal ? '80mm auto' : 'A4 portrait'};
                        margin: ${isThermal ? '0 !important' : '10mm 10mm 12mm 10mm'};
                    }
                    thead {
                        display: table-header-group !important;
                    }
                    tfoot {
                        display: table-footer-group !important;
                    }
                    tr {
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }
                    .synos-avoid-page-break {
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }
                }
            `}</style>

            <div className={cn(
                "relative w-full bg-zinc-100 dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[96vh] overflow-hidden print:max-h-none print:border-none print:shadow-none print:bg-white print:rounded-none",
                isThermal ? "max-w-xl" : "max-w-5xl"
            )}>
                
                {/* TOOLBAR (NO-PRINT) */}
                <div className="no-print p-4 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-synos-primary/10 border border-synos-primary/20 flex items-center justify-center text-synos-primary">
                            {isThermal ? <Receipt size={18} /> : <FileText size={18} />}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-black text-zinc-900 dark:text-white leading-tight">{title}</h2>
                                {!isThermal && typeof recordCount === 'number' && recordCount > 0 && (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                        {recordCount} Records • ~{estimatedPages} A4 Page{estimatedPages > 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                            <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                                {isThermal ? "Point of Sale • 80mm Thermal Receipt" : `Enterprise Document System • A4 Standard (Page 1: ~18 rows; subsequent: ~28 rows/page)`}
                            </p>
                        </div>
                    </div>

                    {/* ACTIONS & CONTROLS */}
                    <div className="flex items-center flex-wrap gap-2 ml-auto">
                        {/* Letterhead Switch - Only for A4 documents */}
                        {!isThermal && (
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
                        )}

                        {/* Top Margin Slider (Only shown if preprinted) */}
                        {!isThermal && letterheadMode === 'preprinted' && (
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

                        {/* Thermal Printer Indicator if thermal mode */}
                        {isThermal && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                                <Printer size={12} />
                                <span>POS 80mm Roll</span>
                            </div>
                        )}

                        {/* CSV Export Button */}
                        {onDownloadCsv && (
                            <button
                                onClick={onDownloadCsv}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-bold transition-all shadow-xs cursor-pointer border border-zinc-200 dark:border-zinc-700"
                                title="Download CSV / Excel"
                            >
                                <FileSpreadsheet size={14} className="text-emerald-600 dark:text-emerald-400" />
                                <span className="hidden sm:inline">CSV</span>
                            </button>
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
                            <span>{isThermal ? "Print Slip (80mm)" : "Print / PDF"}</span>
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
                            width: isThermal ? '80mm' : '210mm',
                            minHeight: isThermal ? 'auto' : '297mm',
                            boxSizing: 'border-box'
                        }}
                        className={cn(
                            "bg-white text-zinc-900 shadow-xl border border-zinc-300 rounded-sm p-8 sm:p-12 relative flex flex-col justify-between print:shadow-none print:border-none print:p-0 print:w-full",
                            isThermal && "max-w-[340px] p-4 sm:p-5 font-mono text-xs shadow-md border-dashed border-zinc-300 rounded-lg justify-start"
                        )}
                    >
                        {/* CLONE CHILDREN WITH LETTERHEAD PROPS */}
                        {React.cloneElement(children, { 
                            letterheadMode, 
                            topMarginMm: customMargin 
                        })}

                        {/* RUNNING A4 DOCUMENT FOOTER */}
                        {!isThermal && (
                            <div className="mt-6 pt-2 border-t border-zinc-200 flex items-center justify-between text-[8px] text-zinc-400 select-none print:text-zinc-500 synos-avoid-page-break">
                                <span>SynOS Enterprise Clinical & Financial OS • Confidential</span>
                                <span>A4 Verified Statement • Generated: {new Date().toLocaleDateString()}</span>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};
