import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, 
    Printer, 
    Download, 
    FileSpreadsheet, 
    Building2, 
    Calendar, 
    ShieldCheck, 
    CheckCircle2, 
    Layers, 
    Clock,
    Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const FinancePrintableSummaryModal = ({
    isOpen,
    onClose,
    title = "Financial Operations Summary",
    subtitle = "Enterprise Financial Audit & Ledger Report",
    dateRangeText = "Current Period",
    filterTags = [],
    kpis = [],
    columns = [],
    data = [],
    summaryTotals = null,
    onDownloadCsv = null,
    categoryLabel = "FINANCE LEDGER SUMMARY",
    labInfo = null
}) => {
    const printAreaRef = useRef(null);

    if (!isOpen) return null;

    const defaultLab = {
        labLegalName: "SynOS Diagnostic Centre & Laboratory",
        labTradeName: "Comprehensive Pathology, Radiology & Molecular Diagnostics",
        address: "Central Diagnostic Complex, Wyra Road, Khammam, Telangana - 507001",
        phone: "+91 98765 43210",
        email: "billing@synoslab.in",
        gstin: "36AAAAA0000A1Z5",
        pan: "AAAAA0000A"
    };

    const lab = { ...defaultLab, ...labInfo };

    const handlePrint = () => {
        window.print();
    };

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:overflow-visible animate-in fade-in duration-300">
            {/* PRINT-SPECIFIC CSS */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    #synos-summary-sheet, #synos-summary-sheet * {
                        visibility: visible !important;
                    }
                    #synos-summary-sheet {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        max-width: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                        background: white !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    @page {
                        size: A4 portrait;
                        margin: 10mm 10mm 12mm 10mm;
                    }
                }
            `}</style>

            <div className="relative w-full max-w-5xl bg-zinc-100 dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[96vh] overflow-hidden print:max-h-none print:border-none print:shadow-none print:bg-white print:rounded-none">
                
                {/* TOOLBAR (NO-PRINT) */}
                <div className="no-print p-4 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-synos-primary/10 border border-synos-primary/20 flex items-center justify-center text-synos-primary">
                            <FileSpreadsheet size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-zinc-900 dark:text-white leading-tight">{title}</h2>
                            <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                                {categoryLabel} • {data.length} Records • A4 Printable Document
                            </p>
                        </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex items-center flex-wrap gap-2 ml-auto">
                        {onDownloadCsv && (
                            <button
                                onClick={onDownloadCsv}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-200 transition-all cursor-pointer"
                                title="Export data to CSV spreadsheet"
                            >
                                <Download size={14} />
                                <span>Export CSV</span>
                            </button>
                        )}

                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-synos-primary hover:bg-synos-primary/90 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                            title="Print official summary document"
                        >
                            <Printer size={14} />
                            <span>Print Summary</span>
                        </button>

                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-all cursor-pointer ml-1"
                            title="Close modal"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* SCROLLABLE DOCUMENT CANVAS */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center print:p-0 print:overflow-visible custom-scrollbar">
                    <div 
                        id="synos-summary-sheet"
                        ref={printAreaRef}
                        className="w-full max-w-[210mm] bg-white text-zinc-900 p-8 sm:p-10 shadow-lg rounded-2xl print:shadow-none print:rounded-none print:p-0 print:max-w-none flex flex-col min-h-[280mm] justify-between"
                    >
                        <div>
                            {/* 1. CLINIC / LAB LETTERHEAD */}
                            <div className="flex justify-between items-start pb-4 border-b-2 border-zinc-900 gap-4">
                                <div className="space-y-1">
                                    <div className="inline-flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-black text-xs">
                                            S
                                        </div>
                                        <h1 className="text-xl font-black text-zinc-900 tracking-tight leading-none uppercase">
                                            {lab.labLegalName}
                                        </h1>
                                    </div>
                                    <p className="text-[11px] font-semibold text-zinc-600">{lab.labTradeName}</p>
                                    <p className="text-[10px] text-zinc-500 max-w-md leading-relaxed">{lab.address}</p>
                                    <div className="flex items-center gap-3 text-[10px] text-zinc-600 pt-0.5 font-medium">
                                        <span>Tel: {lab.phone}</span>
                                        <span>•</span>
                                        <span>Email: {lab.email}</span>
                                    </div>
                                </div>

                                <div className="text-right space-y-1 shrink-0">
                                    <div className="inline-block px-3 py-1 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest rounded">
                                        OFFICIAL LEDGER SUMMARY
                                    </div>
                                    <p className="text-[10px] font-mono text-zinc-500 font-semibold pt-1">
                                        GSTIN: <span className="font-bold text-zinc-900">{lab.gstin}</span>
                                    </p>
                                    <p className="text-[10px] font-mono text-zinc-500 font-semibold">
                                        PAN: <span className="font-bold text-zinc-900">{lab.pan}</span>
                                    </p>
                                </div>
                            </div>

                            {/* 2. REPORT TITLE & AUDIT METADATA STRIP */}
                            <div className="my-4 p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <div>
                                    <h2 className="text-sm font-black uppercase tracking-wide text-zinc-900">{title}</h2>
                                    <p className="text-[11px] text-zinc-500 font-medium">{subtitle}</p>
                                </div>
                                <div className="text-left sm:text-right shrink-0">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800">
                                        <Calendar size={13} className="text-zinc-500" />
                                        <span>Period: {dateRangeText}</span>
                                    </div>
                                    <div className="text-[10px] text-zinc-400 font-mono">
                                        Generated: {new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                    </div>
                                </div>
                            </div>

                            {/* 3. ACTIVE FILTERS APPLIED */}
                            {filterTags && filterTags.length > 0 && (
                                <div className="mb-4 flex flex-wrap items-center gap-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mr-1 flex items-center gap-1">
                                        <Filter size={11} /> Filters:
                                    </span>
                                    {filterTags.map((tag, i) => (
                                        <span key={i} className="text-[10px] font-semibold bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-md border border-zinc-200">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* 4. SUMMARY KPI METRIC CARDS */}
                            {kpis && kpis.length > 0 && (
                                <div className={cn(
                                    "grid gap-2 mb-5",
                                    kpis.length <= 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
                                )}>
                                    {kpis.map((k, idx) => (
                                        <div key={idx} className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                                            <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 leading-tight">
                                                {k.label}
                                            </p>
                                            <p className={cn("text-base font-black mt-0.5 leading-tight", k.color || "text-zinc-900")}>
                                                {k.value}
                                            </p>
                                            {k.subtext && (
                                                <p className="text-[9px] text-zinc-400 font-medium mt-0.5">{k.subtext}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* 5. DATA TABLE */}
                            <div className="border border-zinc-200 rounded-xl overflow-hidden mb-6">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-zinc-100 border-b border-zinc-200 text-zinc-600 font-bold uppercase tracking-wider text-[10px]">
                                            <th className="py-2.5 px-3 w-8 text-center">#</th>
                                            {columns.map(col => (
                                                <th 
                                                    key={col.key} 
                                                    className={cn(
                                                        "py-2.5 px-3",
                                                        col.align === 'right' ? 'text-right' : (col.align === 'center' ? 'text-center' : 'text-left')
                                                    )}
                                                >
                                                    {col.label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-200">
                                        {data.map((row, idx) => (
                                            <tr key={row.id || row.billNumber || row.visitId || idx} className="hover:bg-zinc-50/50">
                                                <td className="py-2 px-3 text-center text-[10px] text-zinc-400 font-mono">
                                                    {idx + 1}
                                                </td>
                                                {columns.map(col => (
                                                    <td 
                                                        key={col.key} 
                                                        className={cn(
                                                            "py-2 px-3 text-[11px]",
                                                            col.align === 'right' ? 'text-right font-mono font-semibold' : (col.align === 'center' ? 'text-center' : 'text-left')
                                                        )}
                                                    >
                                                        {col.render ? col.render(row[col.key], row, idx) : (row[col.key] !== undefined && row[col.key] !== null ? String(row[col.key]) : '-')}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}

                                        {data.length === 0 && (
                                            <tr>
                                                <td colSpan={columns.length + 1} className="py-10 text-center text-zinc-400 text-xs italic">
                                                    No transactions or items matching current period and filters.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>

                                    {/* 6. BOLD TOTALS ROW */}
                                    {summaryTotals && data.length > 0 && (
                                        <tfoot>
                                            <tr className="bg-zinc-100 border-t-2 border-zinc-300 font-bold text-zinc-900 text-[11px]">
                                                <td className="py-2.5 px-3 text-center font-bold text-zinc-500">TOTAL</td>
                                                {columns.map(col => (
                                                    <td 
                                                        key={col.key} 
                                                        className={cn(
                                                            "py-2.5 px-3",
                                                            col.align === 'right' ? 'text-right font-mono font-black' : (col.align === 'center' ? 'text-center font-bold' : 'text-left font-bold')
                                                        )}
                                                    >
                                                        {summaryTotals[col.key] !== undefined ? summaryTotals[col.key] : ''}
                                                    </td>
                                                ))}
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>

                        {/* 7. AUDIT & SIGNATORY FOOTER */}
                        <div className="pt-6 border-t border-zinc-200 mt-auto">
                            <div className="grid grid-cols-3 gap-6 text-center text-zinc-600 text-[10px] mb-6">
                                <div>
                                    <div className="h-10 border-b border-dashed border-zinc-300 flex items-end justify-center pb-1 font-mono text-zinc-400">
                                        System Generated
                                    </div>
                                    <p className="mt-1 font-bold text-zinc-700 uppercase">Prepared By</p>
                                </div>
                                <div>
                                    <div className="h-10 border-b border-dashed border-zinc-300 flex items-end justify-center pb-1 font-mono text-zinc-400">
                                        Finance Desk
                                    </div>
                                    <p className="mt-1 font-bold text-zinc-700 uppercase">Verified & Audited</p>
                                </div>
                                <div>
                                    <div className="h-10 border-b border-dashed border-zinc-300 flex items-end justify-center pb-1 font-mono text-zinc-400">
                                        Authorized Seal
                                    </div>
                                    <p className="mt-1 font-bold text-zinc-700 uppercase">Authorized Signatory</p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-between items-center text-[9px] text-zinc-400 font-mono gap-1 border-t border-zinc-100 pt-2">
                                <span>SynOS Enterprise Clinical Operating System • Financial Intelligence Engine</span>
                                <span>Confidential • Internal Diagnostic & Billing Audit</span>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};
