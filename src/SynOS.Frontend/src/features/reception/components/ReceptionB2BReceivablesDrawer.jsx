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
    ArrowLeft,
    Check,
    AlertCircle,
    Info,
    ChevronDown,
    ChevronUp,
    Percent,
    Tag,
    ShieldCheck,
    Layers,
    Sparkles
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

const CONCESSION_REASONS = [
    "Director / Owner Direct Waiver",
    "Goodwill Partner Retainer Discount",
    "Volume Rebate Settlement",
    "Disputed Item Billing Adjustment",
    "Special Compassionate Allowance"
];

export function ReceptionB2BReceivablesDrawer({ isOpen, onClose, embedded = false, onBack = null }) {
    const { user } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Theme styling matching IntentPanel & ReceptionExpenseDrawer
    const ui = isDark ? {
        panel: "bg-zinc-950 border-l border-zinc-800 shadow-2xl z-30",
        header: "bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800",
        footer: "bg-zinc-900/80 backdrop-blur-md border-t border-zinc-800 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.5)]",
        card: "rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl",
        recessedPod: "rounded-xl border border-zinc-800 bg-zinc-950/80 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]",
        input: "bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-synos-primary rounded-xl",
        title: "text-white",
        subtitle: "text-zinc-400"
    } : {
        panel: cn(
            "bg-[#CBD5E1] dark:bg-zinc-950",
            "border-l border-white/80 shadow-[-20px_0_60px_rgba(15,35,60,0.18)] z-30"
        ),
        header: "bg-white/80 backdrop-blur-md border-b border-slate-300/80 shadow-xs",
        footer: "bg-white/80 backdrop-blur-md border-t border-slate-300/80 shadow-[0_-4px_20px_-10px_rgba(15,35,60,0.05)]",
        card: "rounded-2xl bg-white border border-[#CBD5E1] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.09),0_4px_10px_-2px_rgba(0,0,0,0.04)]",
        recessedPod: "rounded-xl border border-[#CCDCE8] bg-gradient-to-b from-[#E2EDF5] to-[#D9E6EF] shadow-[inset_0_1px_3px_rgba(15,35,60,0.06),0_1px_0_rgba(255,255,255,0.7)]",
        input: "bg-white border border-[#CBD5E1] shadow-[inset_0_1px_2px_rgba(15,35,60,0.04)] text-slate-900 placeholder:text-slate-400 focus:border-blue-500 rounded-xl",
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
    const [expandedPartnerIds, setExpandedPartnerIds] = useState(new Set());
    const [termsMode, setTermsMode] = useState('FULL'); // 'FULL' | 'PARTIAL'
    const [amount, setAmount] = useState('');
    const [hasConcession, setHasConcession] = useState(false);
    const [concessionAmount, setConcessionAmount] = useState('');
    const [concessionReason, setConcessionReason] = useState('Director / Owner Direct Waiver');
    const [concessionAuthorizer, setConcessionAuthorizer] = useState('');
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
        setExpandedPartnerIds(prev => new Set([...prev, group.partnerId]));
        const factIds = (group.visits || []).map(v => v.receivableFactId);
        setSelectedFactIds(factIds);
        setTermsMode('FULL');
        setHasConcession(false);
        setConcessionAmount('');
        const total = (group.visits || []).reduce((sum, v) => sum + (Number(v.amountDue) || 0), 0);
        setAmount(total > 0 ? total.toString() : '');
        setReceivedFrom(group.partnerName ? `${group.partnerName} Representative` : '');
    };

    const togglePartnerAccordion = (partnerId) => {
        setExpandedPartnerIds(prev => {
            const next = new Set(prev);
            if (next.has(partnerId)) {
                next.delete(partnerId);
            } else {
                next.add(partnerId);
            }
            return next;
        });
    };

    // Calculate sum of selected visits for validation
    const selectedVisitsTotal = useMemo(() => {
        if (!selectedGroup || !selectedGroup.visits) return 0;
        return selectedGroup.visits
            .filter(v => selectedFactIds.includes(v.receivableFactId))
            .reduce((acc, v) => acc + (Number(v.amountDue) || 0), 0);
    }, [selectedGroup, selectedFactIds]);

    const toggleVisitSelection = (factId) => {
        let newFactIds;
        if (selectedFactIds.includes(factId)) {
            newFactIds = selectedFactIds.filter(id => id !== factId);
        } else {
            newFactIds = [...selectedFactIds, factId];
        }
        setSelectedFactIds(newFactIds);

        // Recalculate amount if in FULL mode
        if (selectedGroup) {
            const sumSelected = (selectedGroup.visits || [])
                .filter(v => newFactIds.includes(v.receivableFactId))
                .reduce((sum, v) => sum + (Number(v.amountDue) || 0), 0);
            if (termsMode === 'FULL') {
                const conc = hasConcession ? (parseFloat(concessionAmount) || 0) : 0;
                setAmount(Math.max(0, sumSelected - conc).toString());
            }
        }
    };

    const selectAllVisitsForPartner = (partnerGroup) => {
        const factIds = (partnerGroup.visits || []).map(v => v.receivableFactId);
        setSelectedFactIds(factIds);
        if (termsMode === 'FULL') {
            const sumSelected = (partnerGroup.visits || []).reduce((sum, v) => sum + (Number(v.amountDue) || 0), 0);
            const conc = hasConcession ? (parseFloat(concessionAmount) || 0) : 0;
            setAmount(Math.max(0, sumSelected - conc).toString());
        }
    };

    const clearAllVisitsForPartner = () => {
        setSelectedFactIds([]);
        if (termsMode === 'FULL') {
            setAmount('0');
        }
    };

    // Smart FIFO Auto-Allocation Engine:
    // Calculates how amount + concessionAmount is distributed across selected visits in FIFO order
    const allocationSummary = useMemo(() => {
        if (!selectedGroup || !selectedGroup.visits) {
            return {
                visitAllocations: new Map(),
                totalAllocated: 0,
                totalPaidAllocated: 0,
                totalConcessionAllocated: 0,
                totalSelectedDue: 0,
                netToClear: 0,
                remainingDue: 0,
                fullPaidCount: 0,
                partialPaidCount: 0,
                unsettledCount: 0
            };
        }

        const numAmount = parseFloat(amount) || 0;
        const numConcession = hasConcession ? (parseFloat(concessionAmount) || 0) : 0;
        let availablePayment = numAmount;
        let availableConcession = numConcession;

        const visitAllocations = new Map();
        let fullPaidCount = 0;
        let partialPaidCount = 0;
        let unsettledCount = 0;
        let totalPaidAllocated = 0;
        let totalConcessionAllocated = 0;

        const visits = selectedGroup.visits || [];
        for (const v of visits) {
            const isSelected = selectedFactIds.includes(v.receivableFactId);
            if (!isSelected) {
                visitAllocations.set(v.receivableFactId, {
                    isSelected: false,
                    paymentAllocated: 0,
                    concessionAllocated: 0,
                    totalAllocated: 0,
                    remainingDue: Number(v.amountDue) || 0,
                    status: 'EXCLUDED'
                });
                continue;
            }

            const due = Number(v.amountDue) || 0;
            // 1. Allocate real payment first
            const payApply = Math.min(availablePayment, due);
            availablePayment -= payApply;
            totalPaidAllocated += payApply;

            // 2. Allocate concession next
            const concApply = Math.min(availableConcession, due - payApply);
            availableConcession -= concApply;
            totalConcessionAllocated += concApply;

            const totalAllocated = payApply + concApply;
            const remainingDue = Math.max(0, due - totalAllocated);

            let status = 'UNSETTLED';
            if (totalAllocated >= due) {
                status = 'FULL';
                fullPaidCount++;
            } else if (totalAllocated > 0) {
                status = 'PARTIAL';
                partialPaidCount++;
            } else {
                status = 'UNSETTLED';
                unsettledCount++;
            }

            visitAllocations.set(v.receivableFactId, {
                isSelected: true,
                paymentAllocated: payApply,
                concessionAllocated: concApply,
                totalAllocated,
                remainingDue,
                status
            });
        }

        const totalCleared = totalPaidAllocated + totalConcessionAllocated;
        const netToClear = Math.max(0, selectedVisitsTotal - (hasConcession ? (parseFloat(concessionAmount) || 0) : 0));
        const remainingDue = Math.max(0, selectedVisitsTotal - totalCleared);

        return {
            visitAllocations,
            totalAllocated: totalCleared,
            totalPaidAllocated,
            totalConcessionAllocated,
            totalSelectedDue: selectedVisitsTotal,
            netToClear,
            remainingDue,
            fullPaidCount,
            partialPaidCount,
            unsettledCount
        };
    }, [selectedGroup, selectedFactIds, amount, hasConcession, concessionAmount, selectedVisitsTotal]);

    const handleTermsModeChange = (mode) => {
        setTermsMode(mode);
        if (mode === 'FULL') {
            const conc = hasConcession ? (parseFloat(concessionAmount) || 0) : 0;
            setAmount(Math.max(0, selectedVisitsTotal - conc).toString());
        }
    };

    const handleConcessionToggle = (enabled) => {
        setHasConcession(enabled);
        if (!enabled) {
            setConcessionAmount('');
            if (termsMode === 'FULL') {
                setAmount(selectedVisitsTotal.toString());
            }
        } else {
            if (termsMode === 'FULL' && concessionAmount) {
                const conc = parseFloat(concessionAmount) || 0;
                setAmount(Math.max(0, selectedVisitsTotal - conc).toString());
            }
        }
    };

    const handleConcessionAmountChange = (val) => {
        setConcessionAmount(val);
        if (termsMode === 'FULL') {
            const conc = parseFloat(val) || 0;
            setAmount(Math.max(0, selectedVisitsTotal - conc).toString());
        }
    };

    const applyPercentage = (pct) => {
        const netBase = Math.max(0, selectedVisitsTotal - (hasConcession ? (parseFloat(concessionAmount) || 0) : 0));
        const val = Math.round((netBase * pct) / 100);
        setAmount(val.toString());
    };

    const handleSettle = async (e) => {
        e?.preventDefault();
        const numAmount = parseFloat(amount) || 0;
        const numConcession = hasConcession ? (parseFloat(concessionAmount) || 0) : 0;
        if (numAmount < 0 || (numAmount === 0 && numConcession === 0)) {
            alert("Please enter a valid settlement or concession amount.");
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
                concessionAmount: numConcession > 0 ? numConcession : null,
                concessionReason: numConcession > 0 ? (concessionReason.trim() || "B2B Waiver") : null,
                concessionAuthorizer: numConcession > 0 ? (concessionAuthorizer.trim() || user?.name || "Lab Owner") : null,
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

    // Filtered groups for search across partner names, patient names, tokens, tests
    const filteredGroups = useMemo(() => {
        if (!searchQuery.trim()) return groups;
        const q = searchQuery.toLowerCase().trim();
        return groups.filter(g => {
            const partnerMatch = (g.partnerName || '').toLowerCase().includes(q) || 
                                 (g.clinicName || '').toLowerCase().includes(q) ||
                                 (g.phone || '').includes(q);
            if (partnerMatch) return true;
            return (g.visits || []).some(v => 
                (v.patientName || '').toLowerCase().includes(q) ||
                (v.token || '').toLowerCase().includes(q) ||
                (v.testsSummary || '').toLowerCase().includes(q)
            );
        });
    }, [groups, searchQuery]);

    // Totals across all groups for telemetry
    const totalPendingVisits = useMemo(() => {
        return groups.reduce((acc, g) => acc + (g.visits?.length || 0), 0);
    }, [groups]);

    const totalDueToday = useMemo(() => {
        return groups.reduce((acc, g) => acc + (Number(g.totalDueToday) || 0), 0);
    }, [groups]);

    // Telemetry summary metrics
    const summaryMetrics = useMemo(() => {
        const totalSettledToday = history.reduce((sum, h) => sum + (h.amount || 0), 0);
        const cashSettled = history.filter(h => h.paymentMode === 'Cash').reduce((sum, h) => sum + (h.amount || 0), 0);
        const upiSettled = history.filter(h => h.paymentMode === 'UPI').reduce((sum, h) => sum + (h.amount || 0), 0);
        const bankSettled = history.filter(h => h.paymentMode === 'BankTransfer').reduce((sum, h) => sum + (h.amount || 0), 0);
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

    const innerContent = (
            <div 
                className={cn(
                    "h-full flex flex-col overflow-hidden rounded-[24px] transition-all duration-300 ease-in-out z-30",
                    embedded ? "w-full border-none shadow-none" : "w-[96vw] sm:w-[94vw] md:w-[92vw] lg:w-[88vw] xl:w-[85vw] 2xl:w-[85vw] max-w-[1780px] border border-white/80 dark:border-white/10 shadow-2xl",
                    ui.panel
                )}
            >
                {/* 1. TERMINAL HEADER */}
                <div className={cn("px-6 sm:px-8 py-3 shrink-0 border-b flex flex-col gap-2.5", ui.header)}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 sm:gap-3">
                            {onBack && (
                                <button
                                    type="button"
                                    onClick={onBack}
                                    className="p-1.5 rounded-xl hover:bg-slate-200/60 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer active:scale-95 border border-slate-300/60 dark:border-zinc-700/60 bg-white/70 dark:bg-zinc-900/70 mr-1"
                                    title="Back to Options Menu"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5 text-synos-primary" />
                                    <span>Options</span>
                                </button>
                            )}
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
                        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/80 dark:bg-zinc-800/80 border border-slate-300/80 dark:border-zinc-700/40">
                            <button
                                onClick={() => setActiveTab('record')}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                    activeTab === 'record'
                                        ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-xs font-bold border border-slate-200/80"
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
                                        ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-xs font-bold border border-slate-200/80"
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
                                        ? "bg-white dark:bg-zinc-900 text-synos-primary shadow-xs font-bold border border-slate-200/80"
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

                {/* 2. TAB 1: RECORD COLLECTION WORKBENCH (Extended Split Tab Design) */}
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
                                    {completedReceipt.concessionAmount > 0 && (
                                        <div className="flex justify-between text-orange-600 dark:text-orange-400">
                                            <span>Concession / Waiver:</span>
                                            <span className="font-bold">-₹{Number(completedReceipt.concessionAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
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
                            /* SPLIT 2-COLUMN EXTENDED WORKBENCH (IntentPanel Native Facelift Layout) */
                            <form onSubmit={handleSettle} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                                <div className="p-3 sm:p-4 max-w-full mx-auto w-full flex-1 min-h-0 flex flex-col overflow-hidden">
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 xl:gap-5 items-stretch flex-1 min-h-0 overflow-hidden">
                                        {/* ============================================================ */}
                                        {/* LEFT COLUMN: PREPAID REFERRAL DEBTORS & PATIENT VISITS LIST  */}
                                        {/* (7 Columns - IntentPanel Card Architecture)                 */}
                                        {/* ============================================================ */}
                                        <div className="lg:col-span-7 flex flex-col gap-3 h-full min-h-0 overflow-hidden">
                                            <div className={cn("flex flex-col flex-1 min-h-0 overflow-hidden p-3.5 sm:p-4", ui.card)}>
                                                {/* Left Top Header with Circular Badge 1 */}
                                                <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-zinc-800 shrink-0">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-6 h-6 rounded-full bg-[#5A6E85] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                                                            1
                                                        </div>
                                                        <div>
                                                            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                                                Prepaid Referral Debtors
                                                            </h3>
                                                            <p className="text-[10.5px] text-slate-500 dark:text-zinc-400">
                                                                Select partner and bills to clear or partially settle
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-zinc-300">
                                                            {groups.length} Partners • {totalPendingVisits} Bills
                                                        </span>
                                                        <span className="block text-xs font-black text-emerald-700 dark:text-emerald-400 font-mono">
                                                            Due: ₹{totalDueToday.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Search Bar */}
                                                <div className="relative pt-2.5 pb-2 shrink-0">
                                                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                                    <input
                                                        type="text"
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        placeholder="Search partner hospital, doctor, patient name, token, test..."
                                                        className={cn("w-full pl-9 pr-8 py-2 text-xs font-medium outline-none", ui.input)}
                                                    />
                                                    {searchQuery && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setSearchQuery('')}
                                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Scrollable Debtors Accordion List */}
                                                <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1">
                                            {groups.length === 0 ? (
                                                <div className="py-16 text-center space-y-2">
                                                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center">
                                                        <Check className="w-6 h-6" />
                                                    </div>
                                                    <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                                                        Zero Pending B2B Dues Today
                                                    </h4>
                                                    <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
                                                        All corporate B2B prepaid referrals registered today are settled, or no B2B visits billed yet today.
                                                    </p>
                                                </div>
                                            ) : filteredGroups.length === 0 ? (
                                                <div className="py-12 text-center text-slate-400 space-y-1 text-xs">
                                                    <p className="font-bold">No partners or visits match "{searchQuery}"</p>
                                                    <p className="text-[11px]">Try searching by accession token (#MAI-xxx) or test name.</p>
                                                </div>
                                            ) : (
                                                filteredGroups.map(g => {
                                                    const isSelectedPartner = selectedPartnerId === g.partnerId;
                                                    // Partner expansion is governed solely by expandedPartnerIds
                                                    const isExpanded = expandedPartnerIds.has(g.partnerId);
                                                    const partnerVisits = g.visits || [];
                                                    const partnerSelectedVisits = partnerVisits.filter(v => selectedFactIds.includes(v.receivableFactId));
                                                    const isAllSelected = partnerVisits.length > 0 && partnerSelectedVisits.length === partnerVisits.length;

                                                    return (
                                                        <div 
                                                            key={g.partnerId}
                                                            className={cn(
                                                                "rounded-xl border transition-all overflow-hidden",
                                                                "bg-gradient-to-b from-[#E2EDF5] to-[#D9E6EF] dark:bg-zinc-950/80 shadow-[inset_0_1px_3px_rgba(15,35,60,0.06),0_1px_0_rgba(255,255,255,0.7)]",
                                                                isSelectedPartner
                                                                    ? "border-emerald-500 shadow-md ring-2 ring-emerald-500/50"
                                                                    : "border-[#CCDCE8] dark:border-zinc-800 hover:border-slate-400"
                                                            )}
                                                        >
                                                            {/* Partner Accordion Header */}
                                                            <div 
                                                                className={cn(
                                                                    "p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors",
                                                                    isSelectedPartner
                                                                        ? "bg-emerald-500/10 dark:bg-emerald-950/20 border-b border-emerald-200/60 dark:border-emerald-900/30"
                                                                        : "hover:bg-black/5 dark:hover:bg-white/5"
                                                                )}
                                                                onClick={() => {
                                                                    if (!isSelectedPartner) {
                                                                        selectPartner(g);
                                                                    } else {
                                                                        togglePartnerAccordion(g.partnerId);
                                                                    }
                                                                }}
                                                            >
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <div className={cn(
                                                                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border",
                                                                        isSelectedPartner
                                                                            ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                                                                            : "bg-white/90 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-300 dark:border-zinc-700"
                                                                    )}>
                                                                        <Building2 className="w-4 h-4" />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                                                                {g.partnerName}
                                                                            </span>
                                                                            {isSelectedPartner && (
                                                                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase bg-emerald-600 text-white font-mono">
                                                                                    ACTIVE
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {g.clinicName && (
                                                                            <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">{g.clinicName}</p>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-3 shrink-0">
                                                                    <div className="text-right">
                                                                        <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 font-mono block">
                                                                            ₹{Number(g.totalDueToday).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                                        </span>
                                                                        <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-400">
                                                                            {partnerVisits.length} {partnerVisits.length === 1 ? 'Visit' : 'Visits'}
                                                                        </span>
                                                                    </div>

                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            togglePartnerAccordion(g.partnerId);
                                                                        }}
                                                                        className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-400 transition-colors cursor-pointer"
                                                                    >
                                                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Partner Visits List (Accordion Body) */}
                                                            {isExpanded && (
                                                                <div className="p-3 bg-slate-50/70 dark:bg-zinc-950/60 border-t border-slate-200/60 dark:border-zinc-800/60 space-y-2">
                                                                    {/* Action Row */}
                                                                    <div className="flex items-center justify-between text-[11px] px-1">
                                                                        <span className="font-semibold text-slate-600 dark:text-zinc-400">
                                                                            {isSelectedPartner
                                                                                ? `${partnerSelectedVisits.length}/${partnerVisits.length} selected for settlement`
                                                                                : `${partnerVisits.length} registered visits today`}
                                                                        </span>
                                                                        <div className="flex items-center gap-2">
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setSelectedPartnerId(g.partnerId);
                                                                                    selectAllVisitsForPartner(g);
                                                                                }}
                                                                                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                                                                            >
                                                                                Select All ({partnerVisits.length})
                                                                            </button>
                                                                            <span className="text-slate-300">|</span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setSelectedPartnerId(g.partnerId);
                                                                                    clearAllVisitsForPartner();
                                                                                }}
                                                                                className="text-[11px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                                                                            >
                                                                                Clear
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {/* Visit Cards */}
                                                                    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                                                                        {partnerVisits.map(v => {
                                                                            const isChecked = isSelectedPartner && selectedFactIds.includes(v.receivableFactId);
                                                                            const alloc = isSelectedPartner ? allocationSummary.visitAllocations.get(v.receivableFactId) : null;

                                                                            return (
                                                                                <div
                                                                                    key={v.receivableFactId}
                                                                                    onClick={() => {
                                                                                        if (!isSelectedPartner) {
                                                                                            selectPartner(g);
                                                                                        }
                                                                                        toggleVisitSelection(v.receivableFactId);
                                                                                    }}
                                                                                    className={cn(
                                                                                        "p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all cursor-pointer",
                                                                                        isChecked
                                                                                            ? "bg-white dark:bg-zinc-900 border-emerald-500/60 shadow-xs ring-1 ring-emerald-500/20"
                                                                                            : "bg-white/70 dark:bg-zinc-900/60 border-slate-200/90 dark:border-zinc-800 hover:bg-white text-slate-800 dark:text-zinc-200"
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
                                                                                                <span className="font-mono font-extrabold text-slate-900 dark:text-white">
                                                                                                    #{v.token}
                                                                                                </span>
                                                                                                <span className="font-bold text-slate-800 dark:text-zinc-200 truncate">
                                                                                                    {v.patientName}
                                                                                                </span>
                                                                                                <span className="text-[10px] text-slate-400">
                                                                                                    ({v.gender || ''} {v.age ? `${v.age}y` : ''})
                                                                                                </span>
                                                                                            </div>
                                                                                            <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate max-w-[280px]">
                                                                                                {v.testsSummary || "Standard Investigation"}
                                                                                            </p>
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Smart Allocation Live Preview Badges */}
                                                                                    <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                                                                                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                                                                                            ₹{Number(v.amountDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                                                        </span>

                                                                                        {alloc && alloc.isSelected ? (
                                                                                            alloc.status === 'FULL' ? (
                                                                                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 uppercase font-mono">
                                                                                                    ✓ CLEARED ₹{alloc.totalAllocated}
                                                                                                </span>
                                                                                            ) : alloc.status === 'PARTIAL' ? (
                                                                                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 uppercase font-mono">
                                                                                                    PARTIAL: ₹{alloc.totalAllocated} (Due ₹{alloc.remainingDue})
                                                                                                </span>
                                                                                            ) : (
                                                                                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 uppercase font-mono">
                                                                                                    DUE ₹{alloc.remainingDue}
                                                                                                </span>
                                                                                            )
                                                                                        ) : (
                                                                                            <span className="text-[9px] uppercase font-bold text-slate-400 font-mono">
                                                                                                UNSETTLED
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                </div>

                                        {/* ============================================================ */}
                                        {/* RIGHT COLUMN: SETTLEMENTS, PARTIAL ENGINE & FINANCIALS      */}
                                        {/* ============================================================ */}
                                        <div className="lg:col-span-5 flex flex-col gap-3 h-full min-h-0 overflow-y-auto pr-1">
                                            <div className={cn("flex flex-col flex-1 min-h-0 p-3.5 sm:p-4 space-y-3.5", ui.card)}>
                                                {/* Right Column Header */}
                                                <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-zinc-800 shrink-0">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-6 h-6 rounded-full bg-[#5A6E85] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                                                            2
                                                        </div>
                                                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                                            Settlement & Financials
                                                        </h3>
                                                    </div>
                                                    {selectedGroup && (
                                                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 truncate max-w-[200px]">
                                                            {selectedGroup.partnerName} ({selectedFactIds.length} Bills)
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Scrollable Right Form */}
                                                <div className="flex-1 min-h-0 space-y-3.5">
                                            {!selectedGroup ? (
                                                <div className="py-20 text-center text-slate-400 space-y-2 text-xs">
                                                    <Building2 className="w-10 h-10 mx-auto opacity-30" />
                                                    <p className="font-bold">Select a B2B Partner from the left panel</p>
                                                    <p className="text-[11px]">Click any hospital or doctor partner to load their outstanding patient visits.</p>
                                                </div>
                                            ) : (
                                                <>
                                                    {/* 1. SETTLEMENT TERMS (FULL VS PARTIAL) */}
                                                    <div className={cn("p-4 space-y-3 shrink-0", ui.card)}>
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                                                Settlement Terms & Mode
                                                            </label>
                                                            <span className="text-[10.5px] font-mono text-slate-500">
                                                                Selected Bills Total: <strong className="text-slate-900 dark:text-white">₹{selectedVisitsTotal.toLocaleString()}</strong>
                                                            </span>
                                                        </div>

                                                        {/* Segmented Full vs Partial Pill */}
                                                        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-200/70 dark:bg-zinc-800 border border-slate-300/80 dark:border-zinc-700">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleTermsModeChange('FULL')}
                                                                className={cn(
                                                                    "py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                                                                    termsMode === 'FULL'
                                                                        ? "bg-slate-900 text-white border border-slate-900 shadow-md font-extrabold dark:bg-white dark:text-slate-900 dark:border-white"
                                                                        : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                                                                )}
                                                            >
                                                                <CheckCircle2 className={cn("w-3.5 h-3.5", termsMode === 'FULL' ? "text-white dark:text-emerald-600" : "text-emerald-600")} />
                                                                <span>Full Settle (₹{selectedVisitsTotal.toLocaleString()})</span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => handleTermsModeChange('PARTIAL')}
                                                                className={cn(
                                                                    "py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                                                                    termsMode === 'PARTIAL'
                                                                        ? "bg-slate-900 text-white border border-slate-900 shadow-md font-extrabold dark:bg-white dark:text-slate-900 dark:border-white"
                                                                        : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                                                                )}
                                                            >
                                                                <Percent className={cn("w-3.5 h-3.5", termsMode === 'PARTIAL' ? "text-white dark:text-amber-500" : "text-amber-600")} />
                                                                <span>Partial Settle</span>
                                                            </button>
                                                        </div>

                                                        {/* Amount Input */}
                                                        <div className={cn("p-3.5 space-y-2", ui.recessedPod)}>
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                                                    Amount Received at Desk Today (₹) *
                                                                </span>
                                                                {termsMode === 'PARTIAL' && (
                                                                    <div className="flex items-center gap-1">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => applyPercentage(25)}
                                                                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-slate-300"
                                                                        >
                                                                            25%
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => applyPercentage(50)}
                                                                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-slate-300"
                                                                        >
                                                                            50%
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => applyPercentage(75)}
                                                                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-slate-300"
                                                                        >
                                                                            75%
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="relative">
                                                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400 dark:text-zinc-500">₹</span>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    required
                                                                    placeholder="0.00"
                                                                    value={amount}
                                                                    onChange={(e) => setAmount(e.target.value)}
                                                                    className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl pl-9 pr-4 py-2 text-2xl font-black outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white tabular-nums shadow-inner"
                                                                />
                                                            </div>

                                                            {termsMode === 'PARTIAL' && (
                                                                <div className="flex items-center gap-1.5 text-[10.5px] text-emerald-700 dark:text-emerald-400 font-medium pt-0.5">
                                                                    <Sparkles className="w-3 h-3 shrink-0" />
                                                                    <span>Smart FIFO Allocation: Automatically clears older patient bills and records partial dues.</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* 2. SECONDARY CONCESSION / WRITE-OFF WAIVER (Pastel Orange Styling) */}
                                                    <div className="rounded-2xl border border-orange-500/30 bg-orange-500/5 dark:bg-orange-950/20 p-4 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <Tag className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                                                <span className="text-xs font-bold text-orange-950 dark:text-orange-200 uppercase tracking-wide">
                                                                    Secondary Concession / Write-off Waiver
                                                                </span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleConcessionToggle(!hasConcession)}
                                                                className={cn(
                                                                    "px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer",
                                                                    hasConcession
                                                                        ? "bg-orange-600 text-white shadow-xs"
                                                                        : "bg-orange-500/10 text-orange-700 dark:text-orange-300 hover:bg-orange-500/20 border border-orange-500/20"
                                                                )}
                                                            >
                                                                {hasConcession ? "Remove Waiver" : "+ Apply Waiver"}
                                                            </button>
                                                        </div>

                                                        {hasConcession && (
                                                            <div className="space-y-3 pt-1 animate-in fade-in duration-200">
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                                    {/* Concession Amount */}
                                                                    <div className="space-y-1">
                                                                        <label className="text-[10px] font-bold uppercase tracking-wider text-orange-800 dark:text-orange-300">
                                                                            Waiver Amount (₹) *
                                                                        </label>
                                                                        <div className="relative">
                                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-orange-400">₹</span>
                                                                            <input
                                                                                type="number"
                                                                                step="0.01"
                                                                                placeholder="0.00"
                                                                                value={concessionAmount}
                                                                                onChange={(e) => handleConcessionAmountChange(e.target.value)}
                                                                                className="w-full bg-white dark:bg-zinc-900 border border-orange-300 dark:border-orange-800 rounded-xl pl-7 pr-3 py-1.5 text-sm font-bold text-orange-950 dark:text-orange-100 outline-none focus:ring-2 focus:ring-orange-500 tabular-nums"
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    {/* Authorized By */}
                                                                    <div className="space-y-1">
                                                                        <label className="text-[10px] font-bold uppercase tracking-wider text-orange-800 dark:text-orange-300">
                                                                            Authorized By *
                                                                        </label>
                                                                        <input
                                                                            type="text"
                                                                            placeholder="e.g. Dr. Vasudeva Rao / Lab Owner"
                                                                            value={concessionAuthorizer}
                                                                            onChange={(e) => setConcessionAuthorizer(e.target.value)}
                                                                            className="w-full bg-white dark:bg-zinc-900 border border-orange-300 dark:border-orange-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-orange-950 dark:text-orange-100 outline-none focus:ring-2 focus:ring-orange-500"
                                                                        />
                                                                    </div>
                                                                </div>

                                                                {/* Reason Presets */}
                                                                <div className="space-y-1.5">
                                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-orange-800 dark:text-orange-300">
                                                                        Waiver / Concession Reason *
                                                                    </label>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {CONCESSION_REASONS.map(r => (
                                                                            <button
                                                                                key={r}
                                                                                type="button"
                                                                                onClick={() => setConcessionReason(r)}
                                                                                className={cn(
                                                                                    "text-[9.5px] font-medium px-2 py-0.5 rounded-md transition-colors cursor-pointer",
                                                                                    concessionReason === r
                                                                                        ? "bg-orange-600 text-white font-bold"
                                                                                        : "bg-white/80 dark:bg-zinc-800 text-orange-900 dark:text-orange-200 hover:bg-orange-100"
                                                                                )}
                                                                            >
                                                                                {r}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                    <input
                                                                        type="text"
                                                                        value={concessionReason}
                                                                        onChange={(e) => setConcessionReason(e.target.value)}
                                                                        placeholder="Custom concession justification..."
                                                                        className="w-full bg-white dark:bg-zinc-900 border border-orange-300 dark:border-orange-800 rounded-xl px-3 py-1.5 text-xs text-orange-950 dark:text-orange-100 outline-none"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* 3. FINANCIAL SUMMARY POD */}
                                                    <div className={cn("p-4 space-y-2", ui.recessedPod)}>
                                                        <div className="flex justify-between text-xs text-slate-500 dark:text-zinc-400">
                                                            <span>Gross Tariff Selected:</span>
                                                            <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                                                                ₹{selectedVisitsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                            </span>
                                                        </div>

                                                        {hasConcession && parseFloat(concessionAmount) > 0 && (
                                                            <div className="flex justify-between text-xs text-orange-600 dark:text-orange-400 font-semibold">
                                                                <span>Concession / Write-off:</span>
                                                                <span className="font-mono font-bold">
                                                                    -₹{Number(concessionAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                                </span>
                                                            </div>
                                                        )}

                                                        <div className="flex justify-between text-xs text-slate-700 dark:text-zinc-300 font-bold pt-1 border-t border-slate-200 dark:border-zinc-800">
                                                            <span>Net Clearance Target:</span>
                                                            <span className="font-mono">
                                                                ₹{allocationSummary.netToClear.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-baseline justify-between pt-1">
                                                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                                                Desk Collection Now:
                                                            </span>
                                                            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                                ₹{amount ? parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                                                            </span>
                                                        </div>

                                                        <div className="flex justify-between text-xs pt-1 border-t border-slate-200 dark:border-zinc-800">
                                                            <span className="text-slate-500 dark:text-zinc-400">Balance Remaining Due:</span>
                                                            <span className={cn(
                                                                "font-mono font-bold",
                                                                allocationSummary.remainingDue > 0 ? "text-amber-600" : "text-emerald-600"
                                                            )}>
                                                                {allocationSummary.remainingDue > 0
                                                                    ? `₹${allocationSummary.remainingDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                                                                    : "₹0.00 (Fully Cleared)"}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* 4. RECEIVED FROM & REMARKS */}
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                                            Received From / Payer Representative *
                                                        </label>
                                                        <div className="flex flex-wrap gap-1">
                                                            {QUICK_PAYER_PRESETS.map(preset => (
                                                                <button
                                                                    key={preset}
                                                                    type="button"
                                                                    onClick={() => setReceivedFrom(`${preset} (${selectedGroup.partnerName})`)}
                                                                    className="text-[9.5px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
                                                                >
                                                                    {preset}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <input
                                                            type="text"
                                                            required
                                                            placeholder="e.g. Ramesh (Hospital Compounder)"
                                                            value={receivedFrom}
                                                            onChange={(e) => setReceivedFrom(e.target.value)}
                                                            className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                                                        />
                                                    </div>

                                                    {/* Remarks */}
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                                            Remarks / Audit Notes (Optional)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. Morning OPD batch settlement at reception"
                                                            value={notes}
                                                            onChange={(e) => setNotes(e.target.value)}
                                                            className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                                                        />
                                                    </div>

                                                    {/* 5. PAYMENT CHANNEL */}
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                                            Payment Channel
                                                        </label>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {[
                                                                { id: 'Cash', label: 'Cash Drawer', icon: Wallet, desc: 'Adds to counter cash' },
                                                                { id: 'UPI', label: 'UPI / Scan', icon: QrCode, desc: 'Instant QR' },
                                                                { id: 'BankTransfer', label: 'Bank / Card', icon: CreditCard, desc: 'POS / Transfer' }
                                                            ].map(mode => {
                                                                const Icon = mode.icon;
                                                                const isSelected = paymentMode === mode.id;
                                                                return (
                                                                    <button
                                                                        key={mode.id}
                                                                        type="button"
                                                                        onClick={() => setPaymentMode(mode.id)}
                                                                        className={cn(
                                                                            "p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer text-center",
                                                                            isSelected
                                                                                ? "bg-slate-900 text-white border-slate-900 shadow-md ring-1 ring-slate-900 dark:bg-white dark:text-slate-900 dark:border-white"
                                                                                : "bg-white dark:bg-zinc-800/80 border border-slate-200/90 dark:border-zinc-700 hover:bg-slate-50 text-slate-700 dark:text-zinc-300 shadow-2xs"
                                                                        )}
                                                                    >
                                                                        <Icon className={cn("w-4 h-4", isSelected ? "text-white dark:text-slate-900" : "text-slate-500")} />
                                                                        <span className="text-xs font-bold leading-none">{mode.label}</span>
                                                                        <span className={cn("text-[9px] leading-none", isSelected ? "text-white/80 dark:text-slate-700" : "text-slate-500")}>{mode.desc}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                                </div>

                                                {/* Sticky Footer Action Bar inside Card */}
                                                {selectedGroup && (
                                                    <div className={cn("pt-3 border-t flex items-center justify-between shrink-0", isDark ? "border-zinc-800" : "border-slate-200/80")}>
                                                        <button
                                                            type="button"
                                                            onClick={onClose}
                                                            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
                                                        >
                                                            Cancel
                                                        </button>

                                                        <button
                                                            type="submit"
                                                            disabled={isSubmitting || selectedFactIds.length === 0 || ((parseFloat(amount) || 0) <= 0 && (!hasConcession || (parseFloat(concessionAmount) || 0) <= 0))}
                                                            className={cn(
                                                                "py-2.5 px-6 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95",
                                                                isSubmitting || selectedFactIds.length === 0 || ((parseFloat(amount) || 0) <= 0 && (!hasConcession || (parseFloat(concessionAmount) || 0) <= 0))
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
                                                                    Authorize & Settle ₹{amount ? parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                                                                    {allocationSummary.remainingDue > 0 && (
                                                                        <span className="text-[10px] opacity-80 font-normal">
                                                                            (Due: ₹{allocationSummary.remainingDue.toLocaleString('en-IN', { minimumFractionDigits: 0 })})
                                                                        </span>
                                                                    )}
                                                                    <ArrowRight className="w-4 h-4" />
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
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
                                                    {item.concessionAmount > 0 && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-orange-600 dark:text-orange-400 font-bold">
                                                                Waiver: ₹{Number(item.concessionAmount).toLocaleString()}
                                                            </span>
                                                        </>
                                                    )}
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
    );

    if (embedded) {
        return innerContent;
    }

    return (
        <div className="fixed inset-0 z-50 flex justify-end p-2 sm:p-3 md:p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in">
            {innerContent}
        </div>
    );
}
