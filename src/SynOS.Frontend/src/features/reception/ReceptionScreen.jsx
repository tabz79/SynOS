import { useState, useEffect } from 'react'
import { Plus, Users, ClipboardList, Bed, Clock, Loader2 } from 'lucide-react'
import { SystemBar } from '@/components/layout/SystemBar'
import { RealitySummary } from '@/components/layout/RealitySummary'
import { ActionQueue, ActionQueueHeader } from '@/components/layout/ActionQueue'
import { ActivityStream } from '@/components/layout/ActivityStream'
import { IntentPanel } from '@/features/reception/components/IntentPanel'
import { useReceptionPanelUI } from '@/features/reception/hooks/useReceptionPanelUI'
import { ReceptionApi } from '@/api/reception'
import { SignalRService } from '@/lib/signalr'

export function ReceptionScreen() {
    const [activeQueue, setActiveQueue] = useState("pending");
    const [summary, setSummary] = useState(null);
    // Unified Drawer State + Helpers
    const { isOpen: isIntentPanelOpen, openCreateIntent, openResumeIntent, openCorrectionIntent } = useReceptionPanelUI();

    const [actionQueue, setActionQueue] = useState([]); // Real Data
    const [isLoadingQueue, setIsLoadingQueue] = useState(true);

    // New Header State
    const [serverTimeAnchor, setServerTimeAnchor] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState("Not Synced");

    // Helper: Normalize Backend DTO (PascalCase -> camelCase) using defensive mapping
    const normalizeQueueData = (data) => {
        if (!Array.isArray(data)) return [];
        return data.map(row => ({
            ...row, // Preserve originals
            visitId: row.visitId || row.VisitId,
            token: row.token || row.Token,
            patientName: row.patientName || row.PatientName,
            patientAgeGender: row.patientAgeGender || row.PatientAgeGender,
            testCodes: row.testCodes || row.TestCodes || [],
            paymentDisplay: row.paymentDisplay || row.PaymentDisplay, // Phase 4 Alignment
            totalAmount: row.totalAmount || row.TotalAmount,
            paymentMethod: row.paymentMethod || row.PaymentMethod,
            referrerName: row.referrerName || row.ReferrerName,
            operationalStatus: row.operationalStatus || row.OperationalStatus,
            isFinalized: row.isFinalized || row.IsFinalized // 🔹 TRUTH: Explicit Backend Flag
        }));
    };

    // Wiring: Initial Load + SignalR Subscription
    useEffect(() => {
        // 1. Initial Snapshot
        const loadInitial = async () => {
            try {
                const [summaryData, queueData] = await Promise.all([
                    ReceptionApi.getDashboardSummary(),
                    ReceptionApi.getActionQueue()
                ]);

                if (summaryData) setSummary(summaryData);
                if (Array.isArray(queueData)) {
                    console.log("DEBUG: Action Queue Raw:", queueData);
                    setActionQueue(normalizeQueueData(queueData));
                }
            } catch (e) {
                console.error("Failed to fetch initial dashboard data", e);
            } finally {
                setIsLoadingQueue(false);
            }
        };

        loadInitial();

        // 2. Connect SignalR
        const connect = async () => {
            // 3. Subscribe BEFORE connecting (to catch initial push)
            SignalRService.onReceptionSummaryUpdated((payload) => {
                setSummary(payload);
            });

            SignalRService.onActionQueueUpdated(() => {
                ReceptionApi.getActionQueue().then(data => {
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

            // Status Listener (Handles Disconnects/Reconnects)
            SignalRService.onConnectionStatusChanged((status) => {
                setConnectionStatus(status);
            });

            try {
                await SignalRService.startConnection();
            } catch (err) {
                setConnectionStatus("Not Synced");
            }
        };

        connect();

        // Failsafe Polling (every 30s)
        const interval = setInterval(async () => {
            try {
                const data = await ReceptionApi.getActionQueue();
                if (Array.isArray(data)) {
                    setActionQueue(normalizeQueueData(data));
                }
            } catch (e) {
                console.error("Queue Poll Failed", e);
            }
        }, 30000);

        // Cleanup
        return () => {
            SignalRService.stopConnection();
            if (window._signalrStatusSubscribers) window._signalrStatusSubscribers = []; // Reset subs
            clearInterval(interval);
        };
    }, []);

    // Derived strictly for display (formatting only)
    // Derived strictly for display (formatting only)
    // STAGE 2: 4x2 Grid Mapping (Strict DTO)
    const realityTiles = summary ? [
        // ROW 1: Operations & Cash Flow
        { value: summary.walkInsToday?.toString() || "0", label: "Walk-Ins (Paid/Credit)", icon: Users, color: "zinc" },
        { value: `₹${(summary.paymentsCashTotal || 0).toLocaleString()}`, label: "Cash Collected", icon: ClipboardList, color: "emerald" },
        { value: summary.paymentsOnlineCount?.toString() || "0", label: "Online Payments", icon: ClipboardList, color: "blue" },
        { value: `₹${(summary.paymentsOnlineTotal || 0).toLocaleString()}`, label: "Online Total", icon: ClipboardList, color: "blue" },

        // ROW 2: Receivables & Lab Performance
        { value: summary.prepaidBillsCount?.toString() || "0", label: "Prepaid Bills Issued", icon: ClipboardList, color: "amber" }, // Prepaid = Credit
        { value: `₹${(summary.prepaidBillsTotal || 0).toLocaleString()}`, label: "Prepaid Total", icon: ClipboardList, color: "amber" },
        { value: summary.pendingReports?.toString() || "0", label: "Pending Reports", icon: Bed, color: "red" },
        { value: `${summary.avgReportTimeMinutes || 0}m`, label: "Avg Report Time", icon: Clock, color: "default" },
    ] : [
        // Skeleton / Empty State
        { value: "—", label: "Walk-Ins", icon: Users, color: "default" },
        { value: "—", label: "Cash Collected", icon: ClipboardList, color: "default" },
        { value: "—", label: "Online Payments", icon: ClipboardList, color: "default" },
        { value: "—", label: "Online Total", icon: ClipboardList, color: "default" },
        { value: "—", label: "Credit Bills", icon: ClipboardList, color: "default" },
        { value: "—", label: "Credit Value", icon: ClipboardList, color: "default" },
        { value: "—", label: "Pending Reports", icon: Bed, color: "default" },
        { value: "—", label: "Avg Report Time", icon: Clock, color: "default" },
    ];

    // ACTION QUEUE COLUMNS (Strict Backend Truth)
    const queueColumns = [
        {
            header: "Token ID",
            accessor: "token",
            className: "font-mono text-zinc-400 w-32",
            render: (row) => (
                <button
                    onClick={() => {
                        // 🔹 FINALIZATION TRUTH:
                        // If Backend says it's finalized (Paid), we show Correction Mode.
                        // Otherwise, we open Resume Mode.
                        if (row.isFinalized) {
                            openCorrectionIntent(row.visitId); // EXPLICIT CORRECTION
                        } else {
                            openResumeIntent(row.visitId); // EXPLICIT RESUME
                        }
                    }}
                    className="hover:text-synos-primary hover:underline decoration-synos-primary decoration-2 underline-offset-2 transition-all font-bold tracking-tight"
                >
                    {row.token}
                </button>
            )
        },
        {
            header: "Patient",
            accessor: "patientName",
            className: "text-white min-w-[200px]",
            render: (row) => (
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-zinc-200">{row.patientName}</span>
                        {/* Age/Sex Badge */}
                        <span className="bg-zinc-800 text-zinc-400 text-[10px] px-1.5 py-0.5 rounded border border-zinc-700 font-mono">
                            {row.patientAgeGender || "N/A"}
                        </span>
                    </div>
                    {/* Test Code Chips (No Truncation) */}
                    <div className="flex flex-wrap gap-1">
                        {row.testCodes && row.testCodes.map((code, idx) => (
                            <span key={idx} className="bg-synos-primary/10 text-synos-primary border border-synos-primary/20 text-[10px] px-1 py-0.5 rounded font-mono leading-none">
                                {code}
                            </span>
                        ))}
                    </div>
                </div>
            )
        },
        {
            header: "Payment",
            accessor: "paymentDisplay",
            className: "text-zinc-400 w-40",
            render: (row) => {
                // Determine Badge Logic
                const isPrepaid = row.paymentMethod === "Prepaid";
                // Match Test Code Dimensions/Font exactly
                const badgeBase = "text-[10px] px-1 py-0.5 rounded font-mono leading-none border uppercase tracking-wide";
                const badgeColor = isPrepaid
                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

                const amount = row.totalAmount
                    ? `₹${row.totalAmount.toLocaleString()}`
                    : "₹0";

                return (
                    <div className="flex flex-col gap-1 items-start">
                        {/* Row 1: Price + Referrer Badge */}
                        <div className="flex items-center gap-2">
                            {/* Match Patient Name Style */}
                            <span className="font-medium text-sm text-zinc-200">{amount}</span>

                            {/* Match Age/Gender Badge Style */}
                            {isPrepaid && (
                                <span className="bg-zinc-800 text-zinc-400 text-[10px] px-1.5 py-0.5 rounded border border-zinc-700 font-mono" title={row.referrerName}>
                                    {row.referrerName}
                                </span>
                            )}
                        </div>

                        {/* Row 2: Payment Method Badge (Matches Test Code Style) */}
                        <span className={`${badgeBase} ${badgeColor}`}>
                            {row.paymentMethod || "DUE"}
                        </span>
                    </div>
                )
            }
        },
        {
            header: "Operational Status",
            accessor: "operationalStatus",
            className: "w-40",
            render: (row) => (
                <span className={`
                    px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border
                    bg-zinc-800 text-zinc-400 border-zinc-700
                `}>
                    {/* RAW BACKEND TRUTH - NO INTERPRETATION */}
                    {row.operationalStatus}
                </span>
            )
        }
    ];

    return (
        <div className="h-screen w-screen bg-synos-background text-synos-foreground flex flex-col overflow-hidden font-sans selection:bg-white/20">
            {/* 1. Global System Bar */}
            <SystemBar serverTime={serverTimeAnchor} syncStatus={connectionStatus} />

            <div className="flex-1 p-4 overflow-hidden">
                <div className="flex h-full gap-4 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">

                    {/* Left Column: Reality + Work */}
                    <div
                        className={`
                            flex flex-col min-h-0 transition-[width] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                            ${isIntentPanelOpen ? 'w-[60%]' : 'w-[75%]'}
                        `}
                    >
                        <div className={`flex flex-col h-full transition-opacity duration-300 ${isIntentPanelOpen ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>

                            {/* Header for Reality Summary */}
                            <div className="mb-4">
                                <h2 className="text-lg font-medium text-zinc-200 mb-2 px-1">Reality Summary</h2>
                                <RealitySummary tiles={realityTiles} />
                            </div>

                            {/* Action Queues */}
                            <div className="flex-1 flex flex-col min-h-0 relative">
                                <div className="flex items-center justify-between mb-2">
                                    <ActionQueueHeader title="Action Queues" count={actionQueue.length} />
                                    <button
                                        onClick={openCreateIntent}
                                        className="bg-zinc-100 hover:bg-white text-zinc-900 border border-zinc-200 px-4 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30 transition-all duration-200 flex items-center gap-2 pointer-events-auto active:scale-95 active:shadow-inner"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Registration
                                    </button>
                                </div>
                                {isLoadingQueue ? (
                                    <div className="flex-1 flex items-center justify-center border border-dashed border-zinc-800 rounded-xl">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
                                            <span className="text-xs text-zinc-600">Loading live operational stream...</span>
                                        </div>
                                    </div>
                                ) : (
                                    <ActionQueue columns={queueColumns} data={actionQueue} />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Audit Panel OR Intent Panel */}
                    <div
                        className={`
                            min-h-0 relative transition-[width] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                            ${isIntentPanelOpen ? 'w-[40%]' : 'w-[25%]'}
                        `}
                    >
                        {isIntentPanelOpen ? <IntentPanel /> : <ActivityStream serverTime={serverTimeAnchor} />}
                    </div>

                </div>
            </div>
        </div>
    )
}
