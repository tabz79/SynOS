import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from "@/lib/utils"
import { useFlipGroup } from "@/hooks/useSynOSMotion"
import { Plus, Users, ClipboardList, Bed, Clock, Loader2, ChevronDown, Package, Receipt, Wallet, TrendingDown, ArrowDownLeft, SlidersHorizontal, RefreshCw } from 'lucide-react'
import { StockRequestPanel } from '../inventory/StockRequestPanel'
import { SystemBar } from '@/components/layout/SystemBar'
import { RealitySummary } from '@/components/layout/RealitySummary'
import { ActionQueue, ActionQueueHeader } from '@/components/layout/ActionQueue'
import { ActivityStream } from '@/components/layout/ActivityStream'
import { TokenCell, PatientCell, StatusCell } from '@/components/layout/ActionQueueCells'
import { IntentPanel } from '@/features/reception/components/IntentPanel'
import { ReceptionExpenseDrawer } from '@/features/reception/components/ReceptionExpenseDrawer'
import { ReceptionB2BReceivablesDrawer } from '@/features/reception/components/ReceptionB2BReceivablesDrawer'
import { ReceptionOptionsPanel } from '@/features/reception/components/ReceptionOptionsPanel'
import { useReceptionDrawer } from '@/features/reception/hooks/useReceptionPanelUI'
import { ReceptionApi, prewarmReceptionCatalogs } from '@/api/reception'
import { FinanceApi } from '@/api/finance'
import { SignalRService } from '@/lib/signalr'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'

export function ReceptionScreen() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const { user } = useAuth();
    const isReceptionist = user?.role === 'Receptionist';
    const [activeQueue, setActiveQueue] = useState("pending");
    
    // Persistent Summary & Queue State (Prevents disappearing numbers during 2-5 min server updates)
    const [summary, setSummary] = useState(() => {
        try {
            const cached = localStorage.getItem('synos_cached_reality_summary');
            return cached ? JSON.parse(cached) : null;
        } catch (_) {
            return null;
        }
    });
    // Unified Drawer State + Helpers
    const { isOpen: isIntentPanelOpen, openCreateIntent, openResumeIntent, openCorrectionIntent } = useReceptionDrawer();

    const [actionQueue, setActionQueue] = useState(() => {
        try {
            const cached = localStorage.getItem('synos_cached_action_queue');
            return cached ? JSON.parse(cached) : [];
        } catch (_) {
            return [];
        }
    }); // Real Data
    const [isLoadingQueue, setIsLoadingQueue] = useState(() => {
        try {
            return !localStorage.getItem('synos_cached_action_queue');
        } catch (_) {
            return true;
        }
    });
    const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
    const [isExpenseDrawerOpen, setIsExpenseDrawerOpen] = useState(false);
    const [isB2BReceivablesOpen, setIsB2BReceivablesOpen] = useState(false);
    const [isOptionsPanelOpen, setIsOptionsPanelOpen] = useState(false);
    const [todayB2BPendingCount, setTodayB2BPendingCount] = useState(0);
    const [isServerUpdating, setIsServerUpdating] = useState(false);

    // History State (Phase 5)
    // We use a Ref for SignalR callback access, and State for Render.
    const [showHistory, setShowHistory] = useState(false);
    const showHistoryRef = useRef(false);

    // Sync Ref
    useEffect(() => { showHistoryRef.current = showHistory; }, [showHistory]);

    // New Header State
    const [serverTimeAnchor, setServerTimeAnchor] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState("Not Synced");

    // Helper: Normalize Backend DTO using shared API method
    const normalizeQueueData = ReceptionApi.normalizeQueueData;

    const refreshDashboard = async (targetVisitId, action) => {
        if (action === 'deleted' && targetVisitId) {
            // INSTANT OPTIMISTIC EVICTION (< 1 ms): Remove deleted visit immediately from UI queue
            setActionQueue(prev => prev.filter(r => r.visitId !== targetVisitId));
        }

        try {
            const [summaryData, queueData, b2bGroups] = await Promise.all([
                ReceptionApi.getDashboardSummary(),
                ReceptionApi.getActionQueue(showHistoryRef.current),
                FinanceApi.getTodayB2BReceivables().catch(() => [])
            ]);
            if (summaryData) {
                setSummary(summaryData);
                try {
                    localStorage.setItem('synos_cached_reality_summary', JSON.stringify(summaryData));
                } catch (_) {}
            }
            if (Array.isArray(queueData)) {
                const norm = normalizeQueueData(queueData);
                setActionQueue(norm);
                try {
                    if (norm.length > 0) {
                        localStorage.setItem('synos_cached_action_queue', JSON.stringify(norm));
                    }
                } catch (_) {}
            }
            if (Array.isArray(b2bGroups)) {
                setTodayB2BPendingCount(b2bGroups.length);
            }
            setIsServerUpdating(false);
            setConnectionStatus("Synced");
        } catch (e) {
            console.warn("Failed to refresh dashboard data (Server may be updating):", e);
            setIsServerUpdating(true);
            setConnectionStatus("Updating");
        } finally {
            setIsLoadingQueue(false);
        }
    };

    // Wiring: Initial Load + SignalR Subscription + Deletion Event Listener
    useEffect(() => {
        const handleVisitDeleted = (e) => {
            const deletedId = e.detail?.visitId;
            if (deletedId) {
                // Instant zero-lag removal from Action Queues table
                setActionQueue(prev => prev.filter(r => r.visitId !== deletedId));
                refreshDashboard();
            }
        };
        window.addEventListener('synos:visit-deleted', handleVisitDeleted);

        // Pre-warm master catalogs in background immediately on mount (< 1 ms start)
        prewarmReceptionCatalogs();

        // 1. Initial Snapshot
        refreshDashboard();

        // 2. Connect SignalR
        const connect = async () => {
            // 3. Subscribe BEFORE connecting (to catch initial push)
            SignalRService.onReceptionSummaryUpdated((payload) => {
                console.log("ReceptionScreen: Received Reality Summary Update", payload);
                if (payload) {
                    setSummary(payload);
                    try {
                        localStorage.setItem('synos_cached_reality_summary', JSON.stringify(payload));
                    } catch (_) {}
                }
            });

            // TARGETED DELTA PAYLOAD (Eliminates Thundering Herd)
            SignalRService.onActionQueueDeltaReceived((deltaRow) => {
                if (!deltaRow) return;

                const normalized = normalizeQueueData([deltaRow])[0];
                if (!normalized) return;

                console.log("ReceptionScreen: Delta Received", { 
                    visitId: normalized.visitId, 
                    token: normalized.token, 
                    status: normalized.operationalStatus,
                    isFinalized: normalized.isFinalized 
                });

                // MULTI-DESK DRAFT ISOLATION INVARIANT (Zero-Seepage Rule):
                // If this visit is an unfinalized draft, it belongs strictly and only to the desk that created it.
                // Discard foreign drafts created by other receptionists or admins on other workstations!
                const isDraft = !normalized.isFinalized || 
                                Boolean(normalized.token?.startsWith('D-')) || 
                                normalized.operationalStatus === 'Draft';

                const currentUserId = user?.id;
                const draftOwnerId = normalized.assignedToUserId;
                if (isDraft && draftOwnerId && currentUserId && String(draftOwnerId).toLowerCase() !== String(currentUserId).toLowerCase()) {
                    console.log("ReceptionScreen: Discarded foreign draft delta from desk", draftOwnerId);
                    return;
                }

                setActionQueue(prev => {
                    const exists = prev.some(r => r.visitId === normalized.visitId);
                    
                    // Filter: If we are in "Live" mode, we only care about:
                    // 1. Unpaid visits (Backlog)
                    // 2. Today's visits (Paid or Unpaid)
                    const isActionable = !normalized.isFinalized || normalized.dateGroup === "Today";
                    
                    if (exists) {
                        if (!isActionable && !showHistoryRef.current) {
                            // It was finalized and it's not from today - remove it from Live view
                            return prev.filter(r => r.visitId !== normalized.visitId);
                        }
                        return prev.map(r => r.visitId === normalized.visitId ? normalized : r);
                    } else {
                        // Only add new items if they are actionable or we are in history mode
                        if (isActionable || showHistoryRef.current) {
                            return [normalized, ...prev];
                        }
                        return prev;
                    }
                });
            });

            SignalRService.onActionQueueUpdated(() => {
                // SignalR triggers refresh - must respect current filter
                ReceptionApi.getActionQueue(showHistoryRef.current).then(data => {
                    if (Array.isArray(data)) {
                        console.log("SignalR: Action Queue Refreshed");
                        setActionQueue(normalizeQueueData(data));
                    }
                });
            });

            // Anchor Time & Sync Status
            SignalRService.onReceiveServerTime((time) => {
                setServerTimeAnchor(time);
                // setConnectionStatus("Synced"); -> Handled by Status Listener now
            });

            // Status Listener (Handles Disconnects/Reconnects & Server Updates)
            SignalRService.onConnectionStatusChanged((status) => {
                if (status === "Reconnecting") {
                    setIsServerUpdating(true);
                    setConnectionStatus("Updating");
                } else if (status === "Synced") {
                    setIsServerUpdating(false);
                    setConnectionStatus("Synced");
                    refreshDashboard();
                } else {
                    setConnectionStatus(status);
                }
            });

            try {
                await SignalRService.startConnection();
            } catch (err) {
                setConnectionStatus("Not Synced");
            }
        };

        connect();

        // Failsafe Polling (every 5 minutes)
        const interval = setInterval(async () => {
            try {
                const data = await ReceptionApi.getActionQueue(showHistoryRef.current);
                if (Array.isArray(data)) {
                    setActionQueue(normalizeQueueData(data));
                }
            } catch (e) {
                console.error("Queue Poll Failed", e);
            }
        }, 300000);

        // Cleanup
        return () => {
            window.removeEventListener('synos:visit-deleted', handleVisitDeleted);
            SignalRService.stopConnection();
            if (window._signalrStatusSubscribers) window._signalrStatusSubscribers = []; // Reset subs
            clearInterval(interval);
        };
    }, []);

    // Active Health Poller when Server is updating / restarting (probes /health every 3s)
    useEffect(() => {
        if (!isServerUpdating) return;

        let isCancelled = false;
        const probeInterval = setInterval(async () => {
            try {
                const res = await fetch('/health', { method: 'GET', cache: 'no-store' });
                if (res.ok && !isCancelled) {
                    console.log("Server came back online from update!");
                    setIsServerUpdating(false);
                    setConnectionStatus("Synced");
                    refreshDashboard();
                    SignalRService.startConnection();
                }
            } catch (_) {
                // Server still installing/updating, wait for next tick
            }
        }, 3000);

        return () => {
            isCancelled = true;
            clearInterval(probeInterval);
        };
    }, [isServerUpdating]);

    // STAGE 7: FLIP ANIMATION STATE
    const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(() => window.innerHeight < 700);

    // MOTION CANON: Vertical FLIP Group
    const summaryRef = useRef(null);
    const queueRef = useRef(null);
    useFlipGroup([summaryRef, queueRef], [isSummaryCollapsed], { scaleCompensation: true });

    // EFFECT: Reload Queue when Toggle Changes
    useEffect(() => {
        setIsLoadingQueue(true);
        ReceptionApi.getActionQueue(showHistory).then(data => {
            if (Array.isArray(data)) setActionQueue(normalizeQueueData(data));
            setIsLoadingQueue(false);
        }).catch(e => {
            console.error("History Toggle Failed", e);
            setIsLoadingQueue(false);
        });
    }, [showHistory]);

    // STAGE 1: Data Fetching (SignalR + Polling) (Strict DTO)
    const todayNonDraftQueue = actionQueue?.filter(r => 
        r.dateGroup === "Today" &&
        !r.token?.toUpperCase().startsWith('D-') && 
        (r.operationalStatus || '').toLowerCase() !== 'draft' &&
        (r.status || '').toLowerCase() !== 'draft'
    ) || [];

    // Enterprise Resilience: ensure Walk-Ins KPI reflects canonical physical patient intake across all desks.
    // If backend reports > 0, use it. If backend lag reports 0 while tokens sit in today's active queue, seamlessly reflect queue length.
    const effectiveWalkIns = summary 
        ? ((Number(summary.walkInsToday) > 0) 
            ? Number(summary.walkInsToday) 
            : (todayNonDraftQueue.length > 0 ? todayNonDraftQueue.length : (Number(summary.walkInsToday) || 0)))
        : (todayNonDraftQueue.length || 0);

    const realityTiles = summary ? [
        { 
            value: effectiveWalkIns.toString(), 
            label: "Walk-Ins", 
            qualifier: "Paid/Credit", 
            icon: Users, 
            color: "zinc",
            isPool: isReceptionist ? true : undefined 
        },
        { 
            value: `₹${(summary.paymentsCashTotal || 0).toLocaleString()}`, 
            label: "Cash Collected", 
            icon: ClipboardList, 
            color: "emerald",
            scopeBadge: isReceptionist ? "Desk" : undefined
        },
        { 
            value: summary.paymentsOnlineCount?.toString() || "0", 
            label: "Online Payments", 
            icon: ClipboardList, 
            color: "blue",
            scopeBadge: isReceptionist ? "Desk" : undefined
        },
        { 
            value: `₹${(summary.paymentsOnlineTotal || 0).toLocaleString()}`, 
            label: "Online Total", 
            icon: ClipboardList, 
            color: "blue",
            scopeBadge: isReceptionist ? "Desk" : undefined
        },
        { 
            value: summary.prepaidBillsCount?.toString() || "0", 
            label: "Prepaid Bills Issued", 
            shortLabel: "Prepaid Bills", 
            icon: ClipboardList, 
            color: "amber",
            scopeBadge: isReceptionist ? "Desk" : undefined
        },
        { 
            value: `₹${(summary.prepaidBillsTotal || 0).toLocaleString()}`, 
            label: "Prepaid Total", 
            icon: ClipboardList, 
            color: "amber",
            scopeBadge: isReceptionist ? "Desk" : undefined
        },
        { 
            isDual: true,
            value: `₹${(summary.dailyExpensesCashPool !== undefined && summary.dailyExpensesCashPool !== null ? summary.dailyExpensesCashPool : (summary.dailyExpensesCashTotal || 0)).toLocaleString()}`, 
            individualValue: `₹${(summary.dailyExpensesCashIndividual || 0).toLocaleString()}`,
            poolLabel: "Pool Total",
            label: "Recorded Expenses", 
            shortLabel: "Daily Expenses", 
            icon: Receipt, 
            color: "red"
        },
        { 
            isDual: true,
            value: `₹${(summary.cashDrawerBalancePool !== undefined && summary.cashDrawerBalancePool !== null ? summary.cashDrawerBalancePool : (summary.cashDrawerBalance || 0)).toLocaleString()}`, 
            individualValue: `₹${(summary.cashDrawerBalanceIndividual || 0).toLocaleString()}`,
            poolLabel: "Pool Total",
            label: "Cash in the Drawer", 
            shortLabel: "Cash Drawer", 
            icon: Wallet, 
            color: "emerald"
        },
    ] : [
        { value: "—", label: "Walk-Ins", qualifier: "(Paid/Credit)", icon: Users, color: "default", isPool: isReceptionist ? true : undefined },
        { value: "—", label: "Cash Collected", icon: ClipboardList, color: "default", scopeBadge: isReceptionist ? "Desk" : undefined },
        { value: "—", label: "Online Payments", icon: ClipboardList, color: "default", scopeBadge: isReceptionist ? "Desk" : undefined },
        { value: "—", label: "Online Total", icon: ClipboardList, color: "default", scopeBadge: isReceptionist ? "Desk" : undefined },
        { value: "—", label: "Credit Bills", icon: ClipboardList, color: "default", scopeBadge: isReceptionist ? "Desk" : undefined },
        { value: "—", label: "Credit Value", icon: ClipboardList, color: "default", scopeBadge: isReceptionist ? "Desk" : undefined },
        { isDual: true, value: "—", individualValue: "—", poolLabel: "Pool Total", label: "Recorded Expenses", shortLabel: "Daily Expenses", icon: Receipt, color: "default" },
        { isDual: true, value: "—", individualValue: "—", poolLabel: "Pool Total", label: "Cash in the Drawer", shortLabel: "Cash Drawer", icon: Wallet, color: "default" },
    ];

    // ACTION QUEUE COLUMNS (Strict Backend Truth)
    const queueColumns = [
        {
            header: "Token ID",
            accessor: "token",
            className: "w-32",
            render: (row) => (
                <TokenCell
                    row={row}
                    theme={theme}
                    onAction={(r) => {
                        openResumeIntent(r.visitId);
                    }}
                />
            )
        },
        {
            header: "Patient",
            accessor: "patientName",
            className: "min-w-[200px]",
            render: (row) => <PatientCell row={row} />
        },
        {
            // =========================================================================================
            // 🏛️ ENTERPRISE ARCHITECTURAL CONTRACT: ACTION QUEUE PAYMENT & STATUS SEMANTICS
            // =========================================================================================
            // CRITICAL INVARIANT FOR ALL AI CODING AGENTS & DEVELOPERS:
            // This column is a mission-critical front-desk operational ledger. DO NOT alter, re-order,
            // or pollute the 6-state payment classification hierarchy below:
            //
            // 1. DRAFT:       Uncommitted visits with temporary tokens (D-xxx).
            // 2. PREPAID:     Corporate B2B referral visits billed to partner accounts.
            //                 - NEVER hijack or overwrite PREPAID with OVERPAID, REFUND DUE, or cash alerts.
            //                 - Subtext MUST display the referring doctor/partner name (row.referrerName).
            // 3. OVERPAID:    STRICTLY scoped to retail direct visits (!isPrepaid && !isDraft) where desk
            //                 collections exceed billed total (totalPaid > totalBilled).
            // 4. PARTIAL DUE: Active retail visits with partial desk payments (totalPaid > 0 && remainingDue > 0).
            // 5. FULL DUE:    100% counter credit visits (totalPaid === 0 && remainingDue > 0).
            // 6. PAID:        Fully settled desk collections (Cash, UPI, Card).
            //
            // Any proposed modification MUST comply with Section II Invariant 5 in AGENTS.md.
            // =========================================================================================
            header: "Payment",
            accessor: "paymentDisplay",
            className: "w-40",
            render: (row) => {
                const totalBilled = Number(row.totalAmount || 0);
                const totalPaid = Number(row.totalPaid || 0);
                
                const isDraft = (row.token && row.token.toUpperCase().startsWith("D-")) || 
                                (row.paymentMethod || "").toLowerCase() === "draft" || 
                                (row.operationalStatus || "").toLowerCase() === "draft";
                const isPrepaid = !isDraft && (row.paymentMethod === "Prepaid" || (row.paymentDisplay && row.paymentDisplay.startsWith("Prepaid")));
                // Enterprise scoping: isOverpaid applies strictly to retail direct desk collections exceeding billed total. NEVER hijack Corporate B2B Prepaid visits.
                const isOverpaid = !isDraft && !isPrepaid && totalPaid > totalBilled && totalBilled > 0;
                const remainingDue = row.remainingDue !== undefined ? Number(row.remainingDue) : Math.max(0, totalBilled - totalPaid);
                const isPartial = !isDraft && !isPrepaid && !isOverpaid && (row.paymentMethod === "Partial Due" || (row.paymentDisplay && row.paymentDisplay.includes("Partial")) || (totalPaid > 0 && remainingDue > 0));
                const isPaid = !isDraft && !isPrepaid && !isPartial && !isOverpaid && (row.paymentMethod === "Paid" || row.paymentMethod === "Cash" || row.paymentMethod === "UPI" || row.paymentMethod === "Card" || (remainingDue === 0 && totalBilled > 0));
                const isFullDue = !isDraft && !isPrepaid && !isPaid && !isPartial && !isOverpaid && (totalPaid === 0 && (remainingDue > 0 || (row.paymentMethod || '').toLowerCase().includes('due') || (row.paymentMethod || '').toLowerCase().includes('credit')));

                const badgeBase = "text-[10px] px-1.5 py-0.5 rounded font-mono leading-none border uppercase tracking-wide shrink-0 font-bold";
                let badgeColor = "bg-zinc-500/10 dark:text-zinc-400 text-zinc-600 border-zinc-500/20";
                let badgeText = row.paymentMethod || "DUE";

                if (isDraft) {
                    badgeColor = "bg-amber-500/10 dark:text-amber-400 text-amber-600 border-amber-500/20";
                    badgeText = "DRAFT";
                } else if (isPrepaid) {
                    badgeColor = "bg-red-500/10 dark:text-red-400 text-red-600 border-red-500/20";
                    badgeText = "PREPAID";
                } else if (isOverpaid) {
                    badgeColor = "bg-rose-500/15 dark:text-rose-300 text-rose-700 border-rose-500/30";
                    badgeText = "OVERPAID";
                } else if (isPartial) {
                    badgeColor = "bg-amber-500/10 dark:text-amber-400 text-amber-600 border-amber-500/20";
                    badgeText = "PARTIAL DUE";
                } else if (isFullDue) {
                    badgeColor = "bg-orange-500/15 dark:text-orange-300 text-orange-700 border-orange-500/30";
                    badgeText = "FULL DUE";
                } else if (isPaid) {
                    badgeColor = "bg-emerald-500/10 dark:text-emerald-400 text-emerald-600 border-emerald-500/20";
                    badgeText = row.paymentMethod || "PAID";
                }

                // If partial, primary emphasis is the remaining due amount to collect
                const displayAmount = isDraft
                    ? (totalBilled ? `₹${totalBilled.toLocaleString()}` : "₹0")
                    : (isPartial
                        ? `₹${remainingDue.toLocaleString()}`
                        : (totalBilled ? `₹${totalBilled.toLocaleString()}` : "₹0"));

                return (
                    <div className="flex flex-col gap-1 items-start justify-center min-h-[3rem]">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-sm dark:text-zinc-200 text-zinc-900 leading-none pt-0.5">{displayAmount}</span>
                            <span className={`${badgeBase} ${badgeColor}`}>
                                {badgeText}
                            </span>
                        </div>
                        {!isPrepaid && isOverpaid ? (
                            <span className="type-meta text-rose-600 dark:text-rose-400 text-[10px] font-mono font-bold">
                                Refund Due: ₹{(totalPaid - totalBilled).toLocaleString()} (Paid: ₹{totalPaid.toLocaleString()})
                            </span>
                        ) : isPartial && totalPaid > 0 ? (
                            <span className="type-meta text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-medium">
                                Paid: ₹{totalPaid.toLocaleString()}
                            </span>
                        ) : null}
                        {isPrepaid && row.referrerName && (
                            <span className="type-meta text-zinc-500 truncate max-w-[140px]" title={row.referrerName}>
                                {row.referrerName}
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            header: "Status",
            accessor: "operationalStatus",
            className: "w-40",
            render: (row) => <StatusCell row={row} />
        }
    ];

    return (
        <div className="h-screen w-screen dark:bg-synos-background bg-transparent text-foreground flex flex-col overflow-hidden font-sans selection:bg-white/20 relative">
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1] dark:hidden">
                <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAt66YlAAAAB3RSTlMAo7S066u0v76zAAABJklEQVQ4jXWSwW7DIAyGvRNoV9HeIdp7B2nvHaK9d7D27lX836VpY6t0p8oHicDHP4Z99qGf96HvX+h7NfSmX8U8z9M0z6+P/m8X6fB6L78XpX4X5X4O6fc8l7e8n+T9KO87ed+m77pP33Wfvuu6T991nb7rum/ed5+87z55333yvvvkfffJ++6T990n77pP33Wfvus6fdd13rrvu67rvXXfd13ne+u+77rO99Z933Wdt67rtnXdt67rtnWdt67rtjW999Y9ve9997mPu8997uPus9fZZ6+zz15nn73OPnudvU9f0+v0Nb1OX9Pr9DW9Tm9O9vTmaE5vjua09f7o/db7rff7f9H3v6XvP9TzL/X+U8+/1fMv9fw7fQ==")` }} />
                <div className="absolute top-[-15%] left-[-5%] w-[50%] h-[55%] animate-pulse" style={{ background: 'radial-gradient(circle at 40% 40%, rgba(6, 182, 212, 0.07) 0%, rgba(6, 182, 212, 0.02) 45%, rgba(6, 182, 212, 0) 85%)', animationDuration: '10s' }} />
                <div className="absolute top-[-10%] right-[10%] w-[45%] h-[50%]" style={{ background: 'radial-gradient(circle at center, rgba(37, 99, 235, 0.05) 0%, rgba(37, 99, 235, 0.01) 50%, rgba(37, 99, 235, 0) 90%)' }} />
                <div className="absolute top-[5%] left-[35%] w-[25%] h-[25%]" style={{ background: 'radial-gradient(circle at center, rgba(39, 39, 42, 0.04) 0%, rgba(39, 39, 42, 0) 75%)' }} />
                <div className="absolute top-[-25%] right-[-10%] w-[60%] h-[65%]" style={{ background: 'radial-gradient(circle at 60% 30%, rgba(52, 211, 153, 0.06) 0%, rgba(52, 211, 153, 0.01) 40%, rgba(52, 211, 153, 0) 80%)' }} />
                <div className="absolute top-[10%] left-[15%] w-[30%] h-[30%]" style={{ background: 'radial-gradient(circle at center, rgba(251, 191, 36, 0.03) 0%, rgba(251, 191, 36, 0) 70%)' }} />
            </div>

            <SystemBar serverTime={serverTimeAnchor} syncStatus={connectionStatus} />

            <div className="flex-1 p-4 overflow-hidden relative">
                <div className="flex h-full gap-4">
                    {/* Main Dashboard Panel - STABLE WIDTH, NO CONTRACTION/EXPANSION REF-LOW */}
                    <div className="flex-1 flex flex-col min-h-0 min-w-0">
                        <div className={`flex flex-col h-full transition-opacity duration-200 ${(isIntentPanelOpen || isInventoryModalOpen || isExpenseDrawerOpen || isB2BReceivablesOpen || isOptionsPanelOpen) ? 'opacity-35 pointer-events-none' : 'opacity-100'}`}>
                            <div
                                ref={summaryRef}
                                className="mb-2.5 shrink-0"
                            >
                                <div className="flex items-center justify-between mb-1.5 px-2 sticky top-0 dark:bg-synos-background bg-transparent z-10 py-0.5">
                                    <div className="flex items-center gap-2.5">
                                        <h2 className="text-lg font-bold dark:text-zinc-200 text-zinc-800">Reality Summary</h2>
                                        {isServerUpdating && (
                                            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-xs font-bold animate-pulse flex items-center gap-1.5">
                                                <RefreshCw className="w-3 h-3 animate-spin text-amber-500" /> Server is updating, hang on...
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setIsSummaryCollapsed(!isSummaryCollapsed)}
                                        className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded-md hover:bg-white/5"
                                        title={isSummaryCollapsed ? "Expand View" : "Collapse View"}
                                    >
                                        <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isSummaryCollapsed && "-rotate-90")} />
                                    </button>
                                </div>
                                {isServerUpdating && realityTiles && (
                                    <div className="mb-2 px-3.5 py-2 rounded-xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 text-amber-800 dark:text-amber-200 flex items-center justify-between shadow-xs animate-in fade-in duration-200">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                                <RefreshCw className="w-3 h-3 animate-spin" />
                                            </div>
                                            <div className="truncate">
                                                <span className="font-bold text-xs sm:text-sm">Server is updating, hang on...</span>
                                                <span className="text-[11px] opacity-80 ml-2 hidden md:inline">
                                                    Applying updates • Your clinical data & tokens are safe • Resuming automatically
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
                                            Auto-resuming
                                        </span>
                                    </div>
                                )}
                                <RealitySummary tiles={realityTiles} isCollapsed={isSummaryCollapsed} isServerUpdating={isServerUpdating} />
                            </div>

                            <div
                                ref={queueRef}
                                className="flex-1 flex flex-col min-h-0 relative"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-4">
                                        <ActionQueueHeader title="Action Queues" count={actionQueue.length} />
                                        <div className="flex items-center gap-2 dark:bg-zinc-900/50 bg-white rounded-lg p-1 border dark:border-white/5 border-zinc-200 shadow-sm">
                                            <button
                                                onClick={() => setShowHistory(false)}
                                                className={cn(
                                                    "text-[10px] uppercase font-bold px-2 py-0.5 rounded transition-colors",
                                                    !showHistory ? "bg-zinc-800 text-white shadow-sm" : (theme === 'dark' ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-500 hover:text-zinc-900")
                                                )}
                                            >
                                                Live
                                            </button>
                                            <button
                                                onClick={() => setShowHistory(true)}
                                                className={cn(
                                                    "text-[10px] uppercase font-bold px-2 py-0.5 rounded transition-colors",
                                                    showHistory ? "bg-zinc-800 text-white shadow-sm" : (theme === 'dark' ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-500 hover:text-zinc-900")
                                                )}
                                            >
                                                History (7d)
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setIsOptionsPanelOpen(true)}
                                            className={cn(
                                                "px-3.5 py-2 rounded-lg text-sm font-bold shadow-lg transition-all duration-200 flex items-center gap-2 pointer-events-auto active:scale-95 border cursor-pointer",
                                                isOptionsPanelOpen
                                                    ? (theme === 'dark' ? "bg-zinc-800 text-white border-zinc-700" : "bg-slate-200 text-slate-900 border-slate-300")
                                                    : (theme === 'dark' ? "bg-zinc-900 text-zinc-300 border-white/10 hover:text-white hover:bg-zinc-800" : "bg-white text-zinc-700 border-zinc-200 hover:text-zinc-900 hover:bg-zinc-50")
                                            )}
                                            title="Quick Desk Options, Workflows & Staff HR Portal"
                                        >
                                            <SlidersHorizontal className="w-4 h-4 text-synos-primary" />
                                            <span>Options</span>
                                            {todayB2BPendingCount > 0 && (
                                                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-600 text-white animate-pulse">
                                                    {todayB2BPendingCount}
                                                </span>
                                            )}
                                        </button>
                                        <button
                                            onClick={openCreateIntent}
                                            className={cn(
                                                "px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition-colors duration-200 flex items-center gap-2 pointer-events-auto active:scale-95 cursor-pointer",
                                                theme === 'dark' ? "bg-zinc-100 text-zinc-900 hover:bg-white shadow-black/40" : "bg-zinc-800 text-white hover:bg-zinc-700 shadow-black/20"
                                            )}
                                        >
                                            <Plus className="w-4 h-4" />
                                            Registration
                                        </button>
                                    </div>
                                </div>
                                {isLoadingQueue ? (
                                    <div className="flex-1 flex items-center justify-center border border-dashed dark:border-zinc-800 border-zinc-300 rounded-xl">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="w-6 h-6 animate-spin dark:text-zinc-600 text-zinc-400" />
                                            <span className="text-xs dark:text-zinc-600 text-zinc-400">Loading live operational stream...</span>
                                        </div>
                                    </div>
                                ) : isServerUpdating && (!actionQueue || actionQueue.length === 0) ? (
                                    <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-amber-500/30 dark:border-amber-500/20 rounded-xl p-8 bg-amber-500/5">
                                        <RefreshCw className="w-6 h-6 animate-spin text-amber-500 mb-2" />
                                        <span className="text-sm font-bold text-amber-800 dark:text-amber-300">Server is updating, hang on...</span>
                                        <span className="text-xs text-amber-600 dark:text-amber-400 mt-1">Reconnecting to live queue stream automatically...</span>
                                    </div>
                                ) : (
                                    <ActionQueue columns={queueColumns} data={actionQueue} />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Activity Stream Column when Drawer is closed */}
                    <div className={cn(
                        "w-[220px] md:w-[250px] lg:w-[290px] xl:w-[340px] 2xl:w-[380px] flex flex-col min-h-0 transition-opacity duration-200 shrink-0",
                        (isIntentPanelOpen || isInventoryModalOpen || isExpenseDrawerOpen || isB2BReceivablesOpen || isOptionsPanelOpen) ? "hidden" : "flex"
                    )}>
                        <ActivityStream serverTime={serverTimeAnchor} />
                    </div>

                    {/* GPU-Accelerated Registration Panel Drawer */}
                    <IntentPanel onVisitUpdated={refreshDashboard} />
                    <ReceptionOptionsPanel
                        isOpen={isOptionsPanelOpen}
                        onClose={() => {
                            setIsOptionsPanelOpen(false);
                            refreshDashboard();
                        }}
                        onOpenPatientDirectory={() => {
                            setIsOptionsPanelOpen(false);
                            navigate('/admin/patients');
                        }}
                        onOpenMyHr={() => {
                            setIsOptionsPanelOpen(false);
                            navigate('/my-hr');
                        }}
                        pendingB2BCount={todayB2BPendingCount}
                        onDataUpdated={refreshDashboard}
                    />
                    <StockRequestPanel
                        isOpen={isInventoryModalOpen}
                        onClose={() => setIsInventoryModalOpen(false)}
                    />
                    <ReceptionExpenseDrawer
                        isOpen={isExpenseDrawerOpen}
                        onClose={() => {
                            setIsExpenseDrawerOpen(false);
                            refreshDashboard();
                        }}
                    />
                    <ReceptionB2BReceivablesDrawer
                        isOpen={isB2BReceivablesOpen}
                        onClose={() => {
                            setIsB2BReceivablesOpen(false);
                            refreshDashboard();
                        }}
                    />
                </div>
            </div>
        </div>
    )
}
