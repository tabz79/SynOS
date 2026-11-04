import React, { useState, useEffect, useMemo } from 'react';
import { 
    X, 
    ArrowDownLeft, 
    Wallet, 
    QrCode, 
    CreditCard, 
    Building2, 
    CheckCircle2, 
    Clock, 
    History, 
    Printer, 
    RefreshCw, 
    Search, 
    User, 
    Receipt, 
    BarChart3, 
    ArrowRight,
    Check,
    AlertCircle,
    Info
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { legacyTriggerPrint, generateThermalB2BSettlementSlipHtml } from '@/utils/thermalPrinter';

const QUICK_PAYER_PRESETS = [
    "Doctor's Assistant",
    "Lab Compounder",
    "Partner Staff",
    "Doctor In-Person",
    "Self / Patient"
];

export function ReceptionB2BReceivablesDrawer({ isOpen, onClose }) {
    const { user } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Theme styling matching IntentPanel & ReceptionExpenseDrawer
    const ui = isDark ? {
        panel: "bg-zinc-950 border-l border-zinc-800 shadow-2xl z-30",
        header: "bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800",
        footer: "bg-zinc-900/80 backdrop-blur-md border-t border-zinc-800 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.5)]",
        card: "bg-zinc-900/90 border border-zinc-800 shadow-xl rounded-2xl",
        recessedPod: "rounded-xl border border-zinc-800 bg-zinc-950/80 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]",
        title: "text-white",
        subtitle: "text-zinc-400"
    } : {
        panel: cn(
            "bg-[radial-gradient(ellipse_at_top,_#EAF2F9_0%,_#DCE7F2_50%,_#CEDCE8_100%)]",
            "border-l border-white/80 shadow-[-20px_0_60px_rgba(15,35,60,0.18)] z-30"
        ),
        header: "bg-white/70 backdrop-blur-md border-b border-slate-200/80",
        footer: "bg-white/90 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_20px_-10px_rgba(15,35,60,0.15)]",
        card: "bg-white/90 border border-[#D5E2EC] shadow-[0_4px_16px_rgba(15,35,60,0.06)] rounded-2xl",
        recessedPod: "rounded-xl border border-[#DCE7F2] bg-[#F2F7FA] shadow-[inset_0_1px_3px_rgba(15,35,60,0.06)]",
        title: "text-slate-900",
        subtitle: "text-slate-500"
    };

    const [activeTab, setActiveTab] = useState('record'); // 'record' | 'history' | 'summary'
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [groups, setGroups] = useState([]);
    const [history, setHistory] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState(null);

    // Form selection state
    const [selectedPartnerId, setSelectedPartnerId] = useState(null);
    const [selectedFactIds, setSelectedFactIds] = useState([]);
    const [amount, setAmount] = useState('');
    const [paymentMode, setPaymentMode] = useState('Cash'); // 'Cash' | 'UPI' | 'BankTransfer'
    const [receivedFrom, setReceivedFrom] = useState('');
    const [notes, setNotes] = useState('');

    // Last completed receipt for thermal printing
    const [completedReceipt, setCompletedReceipt] = useState(null);

    // Load data when opened or tab changed
    const loadData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [receivablesData, historyData] = await Promise.all([
                FinanceApi.getTodayB2BReceivables().catch(() => []),
                FinanceApi.getTodayB2BSettlementsHistory().catch(() => [])
            ]);
            setGroups(receivablesData || []);
            setHistory(historyData || []);

            // If partner not selected or no longer available, select first partner
            if (receivablesData && receivablesData.length > 0) {
                if (!selectedPartnerId || !receivablesData.some(g => g.partnerId === selectedPartnerId)) {
                    selectPartner(receivablesData[0]);
                }
            } else {
                setSelectedPartnerId(null);
                setSelectedFactIds([]);
                setAmount('');
            }
        } catch (err) {
            console.error("Failed to load today's B2B receivables:", err);
            setError(err.message || "Failed to load data");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadData();
            setCompletedReceipt(null);
        }
    }, [isOpen]);

    const selectedGroup = useMemo(() => {
        return groups.find(g => g.partnerId === selectedPartnerId) || null;
    }, [groups, selectedPartnerId]);

    const selectPartner = (group) => {
        setSelectedPartnerId(group.partnerId);
        const factIds = (group.visits || []).map(v => v.receivableFactId);
        setSelectedFactIds(factIds);
        setAmount(group.totalDueToday ? group.totalDueToday.toString() : '');
        setReceivedFrom(group.partnerName ? `${group.partnerName} Representative` : '');
    };

    const toggleVisitSelection = (factId, visitDue) => {
        let newFactIds;
        if (selectedFactIds.includes(factId)) {
            newFactIds = selectedFactIds.filter(id => id !== factId);
        } else {
            newFactIds = [...selectedFactIds, factId];
        }
        setSelectedFactIds(newFactIds);

        // Recalculate amount to match selected visits
        if (selectedGroup) {
            const sumSelected = (selectedGroup.visits || [])
                .filter(v => newFactIds.includes(v.receivableFactId))
                .reduce((sum, v) => sum + (v.amountDue || 0), 0);
            setAmount(sumSelected > 0 ? sumSelected.toString() : '');
        }
    };

    const selectAllVisits = () => {
        if (!selectedGroup) return;
        const allIds = (selectedGroup.visits || []).map(v => v.receivableFactId);
        setSelectedFactIds(allIds);
        setAmount(selectedGroup.totalDueToday ? selectedGroup.totalDueToday.toString() : '');
    };

    const clearAllVisits = () => {
        setSelectedFactIds([]);
        setAmount('');
    };

    // Calculate sum of selected visits for validation
    const selectedVisitsTotal = useMemo(() => {
        if (!selectedGroup || !selectedGroup.visits) return 0;
        return selectedGroup.visits
            .filter(v => selectedFactIds.includes(v.receivableFactId))
            .reduce((acc, v) => acc + (v.amountDue || 0), 0);
    }, [selectedGroup, selectedFactIds]);

    const handleSettle = async (e) => {
        e?.preventDefault();
        const numAmount = parseFloat(amount);
        if (!numAmount || numAmount <= 0) {
            alert("Please enter a valid settlement amount.");
            return;
        }
        if (!selectedPartnerId || selectedFactIds.length === 0) {
            alert("Please select at least one visit to settle.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const payload = {
                partnerId: selectedPartnerId,
                factIds: selectedFactIds,
                amount: numAmount,
                paymentMode: paymentMode,
                receivedFrom: receivedFrom.trim() || `${selectedGroup?.partnerName || 'Partner'} Representative`,
                notes: notes.trim()
            };

            const receipt = await FinanceApi.settleSameDayB2BReceivables(payload);
            setCompletedReceipt(receipt);

            // Automatically trigger 80mm thermal receipt print
            try {
                const printHtml = generateThermalB2BSettlementSlipHtml(receipt);
                await legacyTriggerPrint(printHtml);
            } catch (pErr) {
                console.warn("Thermal print failed:", pErr);
            }

            // Refresh queue
            await loadData();
        } catch (err) {
            console.error("Settlement failed:", err);
            setError(err.message || "Failed to settle B2B receivables");
            alert(err.message || "Failed to process settlement");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filtered groups for search
    const filteredGroups = useMemo(() => {
        if (!searchQuery.trim()) return groups;
        const q = searchQuery.toLowerCase();
        return groups.filter(g => 
            (g.partnerName && g.partnerName.toLowerCase().includes(q)) ||
            (g.clinicName && g.clinicName.toLowerCase().includes(q))
        );
    }, [groups, searchQuery]);

    // Financial summary calculations
    const summaryMetrics = useMemo(() => {
        const totalSettledToday = history.reduce((sum, h) => sum + (h.amount || 0), 0);
        const cashSettled = history.filter(h => (h.paymentMode || '').toLowerCase() === 'cash').reduce((sum, h) => sum + (h.amount || 0), 0);
        const upiSettled = history.filter(h => (h.paymentMode || '').toLowerCase().includes('upi')).reduce((sum, h) => sum + (h.amount || 0), 0);
        const bankSettled = history.filter(h => {
            const m = (h.paymentMode || '').toLowerCase();
            return m.includes('bank') || m.includes('card');
        }).reduce((sum, h) => sum + (h.amount || 0), 0);
        const totalPendingDue = groups.reduce((sum, g) => sum + (g.totalDueToday || 0), 0);
        const totalVisitsSettled = history.reduce((sum, h) => sum + (h.visitCount || 0), 0);

        return {
            totalSettledToday,
            cashSettled,
            upiSettled,
            bankSettled,
            totalPendingDue,
            totalVisitsSettled,
            settlementCount: history.length
        };
    }, [history, groups]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end p-2 sm:p-3 md:p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in">
            <div 
                className={cn(
                    "h-full flex flex-col overflow-hidden rounded-[24px] sm:rounded-[28px] border border-white/80 dark:border-white/10 shadow-2xl transition-all duration-300 ease-in-out z-30",
                    activeTab === 'record'
                        ? "w-full sm:w-[92vw] md:w-[75vw] lg:w-[50vw] xl:w-[44vw] 2xl:w-[40vw] min-w-[580px] max-w-[880px]"
                        : "w-[96vw] sm:w-[94vw] md:w-[90vw] lg:w-[86vw] xl:w-[85vw] 2xl:w-[85vw] max-w-[1780px]",
                    ui.panel
                )}
            >
                {/* 1. TERMINAL HEADER */}
                <div className={cn("px-6 sm:px-8 py-3 shrink-0 border-b flex flex-col gap-2.5", ui.header)}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <h2 className={cn("text-base sm:text-lg lg:text-xl font-bold tracking-normal flex items-baseline gap-2", ui.title)}>
                                Accounts Receivable Terminal
                                <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-full border border-slate-200/60 dark:border-zinc-700/60">
                                    #REC-B2B
                                </span>
                            </h2>
                            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                Station: Reception Desk (Same-Day Window)
                            </span>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className={cn(
                                "p-1.5 sm:p-2 rounded-full transition-all duration-200 active:scale-95 cursor-pointer shrink-0",
                                isDark ? "hover:bg-white/10 text-zinc-400 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                            )}
                            title="Close Terminal (Esc)"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Area 2: Three-Tab Navigation */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-zinc-800/80 border border-slate-300/40 dark:border-zinc-700/40">
                            <button
                                onClick={() => setActiveTab('record')}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                    activeTab === 'record'
                                        ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs font-extrabold"
                                        : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                                )}
                            >
                                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                                <span>1 Record Collection</span>
                                {groups.length > 0 && (
                                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                                        {groups.length}
                                    </span>
                                )}
                            </button>

                            <button
                                onClick={() => setActiveTab('history')}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                    activeTab === 'history'
                                        ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs font-extrabold"
                                        : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                                )}
                            >
                                <History className="w-3.5 h-3.5 text-blue-600" />
                                <span>2 Today's Settlements</span>
                                {history.length > 0 && (
                                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-bold">
                                        {history.length}
                                    </span>
                                )}
                            </button>

                            <button
                                onClick={() => setActiveTab('summary')}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                    activeTab === 'summary'
                                        ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs font-extrabold"
                                        : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                                )}
                            >
                                <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
                                <span>3 Inflow Summary</span>
                            </button>
                        </div>

                        <button
                            onClick={loadData}
                            disabled={isLoading}
                            className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 transition-colors cursor-pointer"
                            title="Refresh Today's Data"
                        >
                            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                        </button>
                    </div>
                </div>

                {/* 2. TAB 1: RECORD COLLECTION WORKBENCH */}
                {activeTab === 'record' && (
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        {completedReceipt ? (
                            /* SUCCESS RECEIPT STATE */
                            <div className="p-6 sm:p-8 flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center text-center space-y-6">
                                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center border-2 border-emerald-500/30">
                                    <CheckCircle2 className="w-10 h-10" />
                                </div>

                                <div className="space-y-1">
                                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                        Settlement Authorized & Collected
                                    </span>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                                        ₹{Number(completedReceipt.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
                                        Receipt #{completedReceipt.receiptNo}
                                    </p>
                                </div>

                                <div className={cn("p-4 w-full max-w-md text-left space-y-2 text-xs", ui.recessedPod)}>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 dark:text-zinc-400">Corporate Partner:</span>
                                        <span className="font-bold text-slate-900 dark:text-white">{completedReceipt.partnerName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 dark:text-zinc-400">Payment Channel:</span>
                                        <span className="font-bold uppercase text-emerald-600">{completedReceipt.paymentMode}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 dark:text-zinc-400">Received From:</span>
                                        <span className="font-bold text-slate-900 dark:text-white">{completedReceipt.receivedFrom || 'Representative'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 dark:text-zinc-400">Settled Visits:</span>
                                        <span className="font-bold text-slate-900 dark:text-white">{completedReceipt.settledVisits?.length || 0} Visits</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 dark:text-zinc-400">Cashier:</span>
                                        <span className="font-bold text-slate-900 dark:text-white">{completedReceipt.cashierName}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            try {
                                                const html = generateThermalB2BSettlementSlipHtml(completedReceipt);
                                                await legacyTriggerPrint(html);
                                            } catch (e) {
                                                console.error(e);
                                            }
                                        }}
                                        className="flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-slate-900 text-white dark:bg-white dark:text-black flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform cursor-pointer"
                                    >
                                        <Printer className="w-4 h-4" />
                                        Print Slip (80mm)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCompletedReceipt(null)}
                                        className="flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform cursor-pointer"
                                    >
                                        Done / Record Next
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* MAIN FORM WORKBENCH */
                            <form onSubmit={handleSettle} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                                <div className="p-4 sm:p-6 w-full flex-1 min-h-0 overflow-y-auto space-y-4 animate-in fade-in duration-300 pr-1.5 sm:pr-3">
                                    {/* STEP 1: INFLOW SOURCE & CORPORATE PARTNER */}
                                    <div className={cn("p-4 sm:p-5 space-y-3 shrink-0", ui.card)}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-[#5A6E85] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                                                    1
                                                </div>
                                                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-normal">
                                                    Inflow Source & Corporate Partner
                                                </h3>
                                            </div>
                                            <span className="text-xs text-slate-500 dark:text-zinc-400">
                                                Attribution Context
                                            </span>
                                        </div>

                                        {groups.length === 0 ? (
                                            <div className="py-6 px-4 text-center rounded-xl border border-dashed border-slate-300 dark:border-zinc-800 space-y-2">
                                                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center">
                                                    <Check className="w-5 h-5" />
                                                </div>
                                                <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                                                    Zero Pending B2B Dues Today
                                                </div>
                                                <p className="text-[11px] text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
                                                    All corporate B2B prepaid referrals registered today are settled, or no B2B visits billed yet today.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                {groups.map(g => {
                                                    const isSelected = selectedPartnerId === g.partnerId;
                                                    return (
                                                        <button
                                                            key={g.partnerId}
                                                            type="button"
                                                            onClick={() => selectPartner(g)}
                                                            className={cn(
                                                                "p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer relative",
                                                                isSelected
                                                                    ? (isDark
                                                                        ? "bg-zinc-800 border-2 border-emerald-500 shadow-md ring-1 ring-emerald-500/50"
                                                                        : "bg-white border-2 border-emerald-600 shadow-[0_4px_16px_rgba(16,185,129,0.15)] ring-1 ring-emerald-600/30")
                                                                    : (isDark
                                                                        ? "bg-zinc-800/60 border-zinc-700/60 hover:bg-zinc-800 shadow-xs"
                                                                        : "bg-white/80 border border-[#D5E2EC] hover:bg-white hover:border-slate-300 shadow-[0_1px_3px_rgba(15,35,60,0.04)]")
                                                            )}
                                                        >
                                                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shrink-0">
                                                                <Building2 className="w-4 h-4" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                                        {g.partnerName}
                                                                    </span>
                                                                    {isSelected && <div className="w-2 h-2 rounded-full bg-emerald-600 shrink-0 ml-1" />}
                                                                </div>
                                                                {g.clinicName && (
                                                                    <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">{g.clinicName}</p>
                                                                )}
                                                                <div className="mt-1 flex items-center justify-between text-[11px]">
                                                                    <span className="text-slate-500 dark:text-zinc-400">
                                                                        {g.totalVisitsCount} {g.totalVisitsCount === 1 ? 'Visit' : 'Visits'}
                                                                    </span>
                                                                    <span className="font-extrabold text-emerald-700 dark:text-emerald-400">
                                                                        ₹{Number(g.totalDueToday).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* STEP 2: INFLOW PARTICULARS & TODAY'S VISITS */}
                                    {selectedGroup && (
                                        <div className={cn("p-4 sm:p-5 space-y-4 shrink-0", ui.card)}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-[#5A6E85] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                                                        2
                                                    </div>
                                                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-normal">
                                                        Inflow Particulars & Today's Visits
                                                    </h3>
                                                </div>
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200/60 dark:border-zinc-700/60">
                                                    Operational Inflow
                                                </span>
                                            </div>

                                            {/* Visits Checklist */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="font-bold text-slate-700 dark:text-zinc-300">
                                                        Select Patient Visits to Settle ({selectedFactIds.length}/{selectedGroup.visits?.length || 0}):
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={selectAllVisits}
                                                            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                                                        >
                                                            Select All
                                                        </button>
                                                        <span className="text-slate-300">|</span>
                                                        <button
                                                            type="button"
                                                            onClick={clearAllVisits}
                                                            className="text-[11px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                                                        >
                                                            Clear
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="max-h-48 overflow-y-auto space-y-1.5 p-1 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
                                                    {(selectedGroup.visits || []).map(v => {
                                                        const isChecked = selectedFactIds.includes(v.receivableFactId);
                                                        return (
                                                            <div
                                                                key={v.receivableFactId}
                                                                onClick={() => toggleVisitSelection(v.receivableFactId, v.amountDue)}
                                                                className={cn(
                                                                    "p-2.5 rounded-lg flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer",
                                                                    isChecked
                                                                        ? "bg-white dark:bg-zinc-900 border border-emerald-500/30 shadow-2xs"
                                                                        : "hover:bg-slate-100 dark:hover:bg-zinc-900/60 opacity-70"
                                                                )}
                                                            >
                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isChecked}
                                                                        onChange={() => {}}
                                                                        className="w-4 h-4 rounded text-emerald-600 focus:ring-0 cursor-pointer"
                                                                    />
                                                                    <div className="min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                                                                                #{v.token}
                                                                            </span>
                                                                            <span className="font-bold text-slate-800 dark:text-zinc-200 truncate">
                                                                                {v.patientName}
                                                                            </span>
                                                                            <span className="text-[10px] text-slate-400">
                                                                                ({v.gender || ''} {v.age ? `${v.age}y` : ''})
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-[10.5px] text-slate-500 dark:text-zinc-400 truncate">
                                                                            {v.testsSummary}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="text-right shrink-0">
                                                                    <span className="font-mono font-extrabold text-slate-900 dark:text-white block">
                                                                        ₹{Number(v.amountDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                                    </span>
                                                                    <span className="text-[9px] uppercase font-bold text-amber-600">
                                                                        Unsettled
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Recessed Pod for Amount */}
                                            <div className={cn("p-3.5 sm:p-4 space-y-1.5", ui.recessedPod)}>
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                                        Collection / Settlement Amount (₹) *
                                                    </label>
                                                    {amount && selectedVisitsTotal > 0 && (
                                                        <span className={cn(
                                                            "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                                            parseFloat(amount) >= selectedVisitsTotal
                                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                : "bg-amber-50 text-amber-700 border-amber-200"
                                                        )}>
                                                            {parseFloat(amount) >= selectedVisitsTotal ? "Full Clearance" : "Partial Collection"}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl sm:text-3xl font-black text-slate-400 dark:text-zinc-500">₹</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        required
                                                        placeholder="0.00"
                                                        value={amount}
                                                        onChange={(e) => setAmount(e.target.value)}
                                                        className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-2xl sm:text-3xl font-black outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-900 dark:text-white tabular-nums shadow-inner"
                                                    />
                                                </div>
                                            </div>

                                            {/* Payer Particulars */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                                    Received From / Payer Representative *
                                                </label>
                                                
                                                {/* Presets */}
                                                <div className="flex flex-wrap gap-1.5">
                                                    {QUICK_PAYER_PRESETS.map(preset => (
                                                        <button
                                                            key={preset}
                                                            type="button"
                                                            onClick={() => setReceivedFrom(`${preset} (${selectedGroup.partnerName})`)}
                                                            className="text-[10px] font-semibold px-2 py-1 rounded-md bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
                                                        >
                                                            {preset}
                                                        </button>
                                                    ))}
                                                </div>

                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="e.g. Ramesh (Compounder for Anjum Hospital)"
                                                    value={receivedFrom}
                                                    onChange={(e) => setReceivedFrom(e.target.value)}
                                                    className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white shadow-2xs"
                                                />
                                            </div>

                                            {/* Notes / Purpose */}
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                                    Remarks / Notes (Optional)
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Cleared morning patient batch at counter"
                                                    value={notes}
                                                    onChange={(e) => setNotes(e.target.value)}
                                                    className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white shadow-2xs"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* STEP 3: SETTLEMENT & FINANCIALS */}
                                    {selectedGroup && (
                                        <div className={cn("p-4 sm:p-5 space-y-4 shrink-0", ui.card)}>
                                            <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/[0.06]">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-[#5A6E85] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                                                        3
                                                    </div>
                                                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-normal">
                                                        Settlement & Financials
                                                    </h3>
                                                </div>
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                    Immediate Counter Inflow
                                                </span>
                                            </div>

                                            {/* Recessed Net Amount Pod */}
                                            <div className={cn("p-4 space-y-1", ui.recessedPod)}>
                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                                                    Net Inflow Amount
                                                </span>
                                                <div className="flex items-baseline justify-between">
                                                    <span className="text-xs text-slate-500 dark:text-zinc-400">Ledger & Reception Impact</span>
                                                    <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">
                                                        ₹{amount ? parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Inflow Channels */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                                    Inflow Channel
                                                </label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {[
                                                        { id: 'Cash', label: 'Cash Drawer', icon: Wallet, desc: 'Adds to counter cash' },
                                                        { id: 'UPI', label: 'UPI / Scan', icon: QrCode, desc: 'Direct online scan' },
                                                        { id: 'BankTransfer', label: 'Bank / Card', icon: CreditCard, desc: 'Card POS / Direct' }
                                                    ].map(mode => {
                                                        const Icon = mode.icon;
                                                        const isSelected = paymentMode === mode.id;
                                                        return (
                                                            <button
                                                                key={mode.id}
                                                                type="button"
                                                                onClick={() => setPaymentMode(mode.id)}
                                                                className={cn(
                                                                    "p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer text-center",
                                                                    isSelected
                                                                        ? (isDark
                                                                            ? "bg-zinc-800 border-2 border-emerald-500 text-white shadow-md ring-1 ring-emerald-500/50"
                                                                            : "bg-white border-2 border-emerald-600 text-emerald-950 shadow-[0_4px_16px_rgba(16,185,129,0.15)] ring-1 ring-emerald-600/30")
                                                                        : (isDark
                                                                            ? "bg-zinc-800/60 border-zinc-700/60 hover:bg-zinc-800 text-zinc-400 hover:text-white"
                                                                            : "bg-white/80 border border-[#D5E2EC] hover:bg-white text-slate-600 hover:text-slate-900 shadow-2xs")
                                                                )}
                                                            >
                                                                <Icon className={cn("w-5 h-5", isSelected ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400")} />
                                                                <span className="text-xs font-bold leading-none">{mode.label}</span>
                                                                <span className="text-[9.5px] opacity-70 leading-none">{mode.desc}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Metadata Attribution Pod */}
                                            <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 gap-1">
                                                <div className="flex items-center gap-1.5">
                                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                                    <span>Received By: <strong className="text-slate-700 dark:text-zinc-200">{user?.name || 'Reception Staff'}</strong></span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                    <span>Settlement Window: <strong className="text-emerald-600 dark:text-emerald-400">Strictly Same-Day</strong></span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* STICKY FOOTER */}
                                {selectedGroup && (
                                    <div className={cn("px-6 sm:px-8 py-3.5 border-t flex items-center justify-between shrink-0", ui.footer)}>
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
                                        >
                                            Cancel
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={isSubmitting || !amount || parseFloat(amount) <= 0 || selectedFactIds.length === 0}
                                            className={cn(
                                                "py-2.5 px-6 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95",
                                                isSubmitting || !amount || parseFloat(amount) <= 0 || selectedFactIds.length === 0
                                                    ? "opacity-50 cursor-not-allowed bg-slate-300 dark:bg-zinc-800 text-slate-500"
                                                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                                            )}
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                    Authorizing...
                                                </>
                                            ) : (
                                                <>
                                                    Authorize & Receive ₹{amount ? parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                                                    <ArrowRight className="w-4 h-4" />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </form>
                        )}
                    </div>
                )}

                {/* 3. TAB 2: TODAY'S SETTLEMENTS */}
                {activeTab === 'history' && (
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    Today's B2B Collections History
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-zinc-400">
                                    All B2B receivables cleared at the reception desk during today's shift.
                                </p>
                            </div>
                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200">
                                {history.length} Collections Today
                            </span>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto">
                            {history.length === 0 ? (
                                <div className="py-16 text-center text-slate-400 space-y-2">
                                    <Receipt className="w-10 h-10 mx-auto opacity-40" />
                                    <p className="text-xs font-bold">No B2B settlements recorded today yet</p>
                                    <p className="text-[11px] text-slate-500">Recorded collections will appear here in real-time.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {history.map(item => (
                                        <div 
                                            key={item.receiptNo}
                                            className={cn("p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4", ui.card)}
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-slate-700 dark:text-zinc-300">
                                                        {item.receiptNo}
                                                    </span>
                                                    <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                                                        {item.partnerName}
                                                    </span>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        {item.paymentMode}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-zinc-400">
                                                    <span>Settled: {new Date(item.settledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                                    <span>•</span>
                                                    <span>Visits: {item.visitCount} ({item.patientTokens?.join(', ') || 'N/A'})</span>
                                                    <span>•</span>
                                                    <span>Cashier: {item.cashierName}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 self-end sm:self-center">
                                                <div className="text-right">
                                                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                        ₹{Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        const html = generateThermalB2BSettlementSlipHtml(item);
                                                        await legacyTriggerPrint(html);
                                                    }}
                                                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer"
                                                    title="Reprint 80mm Slip"
                                                >
                                                    <Printer className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 4. TAB 3: INFLOW SUMMARY */}
                {activeTab === 'summary' && (
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-6 space-y-6">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Today's B2B Inflow & Cash Drawer Impact
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-zinc-400">
                                Operational telemetry for same-day B2B settlements across physical and digital channels.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className={cn("p-4 rounded-xl border space-y-1", ui.card)}>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total B2B Collected</span>
                                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                    ₹{summaryMetrics.totalSettledToday.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </div>
                                <span className="text-[10px] text-slate-500">{summaryMetrics.settlementCount} Settlement Batches</span>
                            </div>

                            <div className={cn("p-4 rounded-xl border space-y-1", ui.card)}>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cash Drawer Addition</span>
                                <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                                    ₹{summaryMetrics.cashSettled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </div>
                                <span className="text-[10px] text-slate-500">Reflected in Reality Summary</span>
                            </div>

                            <div className={cn("p-4 rounded-xl border space-y-1", ui.card)}>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Digital / UPI Collected</span>
                                <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                                    ₹{summaryMetrics.upiSettled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </div>
                                <span className="text-[10px] text-slate-500">Direct online reconciliation</span>
                            </div>

                            <div className={cn("p-4 rounded-xl border space-y-1", ui.card)}>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Still Pending Today</span>
                                <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                                    ₹{summaryMetrics.totalPendingDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </div>
                                <span className="text-[10px] text-slate-500">{groups.length} Partners Unsettled</span>
                            </div>
                        </div>

                        <div className={cn("p-4 rounded-xl border space-y-2 text-xs", ui.recessedPod)}>
                            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-zinc-200">
                                <Info className="w-4 h-4 text-blue-500" />
                                Single Source of Truth & Zero Heuristic Seepage Contract
                            </div>
                            <p className="text-slate-600 dark:text-zinc-400 leading-relaxed text-[11px]">
                                This terminal operates on a strictly locked same-day operational window enforced by the backend kernel (<code className="font-mono text-xs">ILabTimeProvider</code>). Aged receivables older than today must be cleared exclusively through the Finance Hub by authorized administrators.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
