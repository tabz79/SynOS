import React from 'react';
import { 
    Package, 
    AlertTriangle, 
    Clock, 
    ShoppingCart, 
    Activity, 
    ArrowUpRight, 
    CheckCircle2, 
    ExternalLink,
    Zap,
    Wrench,
    FileSpreadsheet,
    FlaskConical
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const InventoryEquipmentSection = ({
    navigate = () => {}
}) => {
    // Inventory and Equipment state indicators
    const lowStockCount = 2; // e.g. CBC Lyse and Glucose Hexokinase
    const expiringBatchesCount = 1; // 1 lot expiring in <30 days
    const pendingReordersCount = 3; // 3 requisitions pending PO
    const activeAnalyzersCount = 5; // 5 major diagnostics machines online

    return (
        <div className="space-y-3 pt-2">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1">
                <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-6 rounded-full bg-gradient-to-b from-indigo-500 to-purple-500"></div>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-normal">
                            Inventory & Equipment Health
                        </h2>
                        <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                            Reagent buffer levels, batch expiry surveillance, procurement orders, and analyzer uptime.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/25 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Analyzers 100% Operational
                    </span>
                </div>
            </div>

            {/* 4 iOS-Inspired Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 lg:gap-3.5 items-stretch">
                
                {/* Pod 1: Low-Stock Reagents */}
                <div 
                    onClick={() => navigate('/inventory?tab=ledger')}
                    className="p-3.5 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_6px_20px_rgba(15,23,42,0.06)] flex flex-col justify-between cursor-pointer hover:border-white hover:shadow-[0_12px_32px_rgba(15,23,42,0.14)] transition-all group min-h-[110px]"
                    title="Click to view reagent stock ledger"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold tracking-wider uppercase text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-rose-500" />
                            Low-Stock Reagents
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </div>

                    <div className="my-1.5">
                        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-mono tabular-nums">
                            {lowStockCount} Items
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                        <span>Below Safety Threshold</span>
                        <span className="text-rose-600 dark:text-rose-400 font-bold">Action Needed</span>
                    </div>
                </div>

                {/* Pod 2: Expiring Batches */}
                <div 
                    onClick={() => navigate('/inventory?tab=history')}
                    className="p-3.5 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_6px_20px_rgba(15,23,42,0.06)] flex flex-col justify-between cursor-pointer hover:border-white hover:shadow-[0_12px_32px_rgba(15,23,42,0.14)] transition-all group min-h-[110px]"
                    title="Click to view batch lot history and expiry surveillance"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold tracking-wider uppercase text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            Expiring Batches
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </div>

                    <div className="my-1.5">
                        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-mono tabular-nums">
                            {expiringBatchesCount} Batch
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                        <span>Expiring within 30 days</span>
                        <span className="text-amber-600 dark:text-amber-400 font-bold">Surveillance Active</span>
                    </div>
                </div>

                {/* Pod 3: Reorders Required */}
                <div 
                    onClick={() => navigate('/inventory?tab=procurement')}
                    className="p-3.5 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_6px_20px_rgba(15,23,42,0.06)] flex flex-col justify-between cursor-pointer hover:border-white hover:shadow-[0_12px_32px_rgba(15,23,42,0.14)] transition-all group min-h-[110px]"
                    title="Click to view purchase orders and branch requisitions"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold tracking-wider uppercase text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                            <ShoppingCart className="w-3.5 h-3.5 text-indigo-500" />
                            Reorders Required
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </div>

                    <div className="my-1.5">
                        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-mono tabular-nums">
                            {pendingReordersCount} Demands
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                        <span>Procurement Pipeline</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">PO Review</span>
                    </div>
                </div>

                {/* Pod 4: Equipment & Analyzers */}
                <div 
                    onClick={() => navigate('/admin')}
                    className="p-3.5 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_6px_20px_rgba(15,23,42,0.06)] flex flex-col justify-between cursor-pointer hover:border-white hover:shadow-[0_12px_32px_rgba(15,23,42,0.14)] transition-all group min-h-[110px]"
                    title="Click to view Operations Control Tower"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold tracking-wider uppercase text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-teal-500" />
                            Analyzers Online
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </div>

                    <div className="my-1.5">
                        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-mono tabular-nums">
                            {activeAnalyzersCount} / 5 Active
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                        <span>Path & Radio Stations</span>
                        <span className="text-teal-600 dark:text-teal-400 font-bold">0 Downtime</span>
                    </div>
                </div>

            </div>

            {/* 3 Action Triage Cards for Inventory and Equipment */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3 lg:gap-3.5">
                
                {/* Triage 1: Mindray Hematology CBC Lyse Reorder */}
                <div className="p-3.5 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_6px_20px_rgba(15,23,42,0.06)] flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 uppercase tracking-wide">
                                Low Stock Alert
                            </span>
                            <span className="text-[11px] font-mono font-bold text-slate-400 dark:text-zinc-500">Buffer: 5</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Mindray CBC Lyse Diluent (5L)</h4>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                            Only 2 bottles in main stock room. Needed for Hematology analyzer runs.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/inventory?tab=procurement')}
                        className="mt-3.5 w-full py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 group cursor-pointer"
                    >
                        <span>Create Purchase Order</span>
                        <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                </div>

                {/* Triage 2: Troponin-I Batch Expiry */}
                <div className="p-3.5 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_6px_20px_rgba(15,23,42,0.06)] flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wide">
                                Expiry in 18 Days
                            </span>
                            <span className="text-[11px] font-mono font-bold text-slate-400 dark:text-zinc-500">Lot #TRP-884</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Troponin-I Rapid Cassettes</h4>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                            40 cards in stock expiring on Nov 24. Prioritize for incoming cardiac panels.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/inventory?tab=history')}
                        className="mt-3.5 w-full py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 group cursor-pointer border border-slate-300/60 dark:border-zinc-700"
                    >
                        <span>Review Lot Expiry</span>
                        <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                </div>

                {/* Triage 3: Analyzer Calibration & Modalities */}
                <div className="p-3.5 rounded-[22px] bg-gradient-to-br from-[#F5F7FA] via-[#F8FAFC] to-[#EDF1F5] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 border border-white/90 dark:border-zinc-800 shadow-[0_6px_20px_rgba(15,23,42,0.06)] flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20 uppercase tracking-wide">
                                5 Modalities Active
                            </span>
                            <span className="text-[11px] font-mono font-bold text-slate-400 dark:text-zinc-500">Calibration OK</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Radiology & Biochemistry Stations</h4>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                            MRI 1.5T, CT, Ultrasound, X-Ray & Auto-Analyzers running normal worklists.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/admin')}
                        className="mt-3.5 w-full py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 group cursor-pointer"
                    >
                        <span>Open Operations Tower</span>
                        <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                </div>

            </div>
        </div>
    );
};
