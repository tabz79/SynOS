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
                    ReceptionApi.getActionQueue() // FIXED: Use correct endpoint
                ]);

                if (summaryData) setSummary(summaryData);
                if (Array.isArray(queueData)) {
                    console.log("DEBUG: Action Queue Raw:", queueData); // Verify Integrity
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
            await SignalRService.startConnection();

            // 3. Subscribe to Updates (Pure Replacement)
            SignalRService.onReceptionSummaryUpdated((payload) => {
                setSummary(payload);
            });
        };

        connect();

        // Failsafe Polling (every 30s)
        const interval = setInterval(async () => {
            try {
                const data = await ReceptionApi.getActionQueue(); // FIXED: Use correct endpoint
                if (Array.isArray(data)) {
                    console.log("DEBUG: Action Queue Poll:", data);
                    setActionQueue(normalizeQueueData(data));
                }
            } catch (e) {
                console.error("Queue Poll Failed", e);
            }
        }, 30000);

        // Cleanup
        return () => {
            SignalRService.stopConnection();
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
        { value: summary.prepaidBillsCount?.toString() || "0", label: "Credit Bills Issued", icon: ClipboardList, color: "amber" }, // Prepaid = Credit
        { value: `₹${(summary.prepaidBillsTotal || 0).toLocaleString()}`, label: "Credit Value (AR)", icon: ClipboardList, color: "amber" },
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
            className: "text-zinc-400 w-32",
            render: (row) => (
                <div className="text-xs font-mono text-zinc-300">
                    {row.paymentDisplay || "—"}
                </div>
            )
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
            <SystemBar />

            <div className="flex-1 p-4 overflow-hidden">
                <div
                    className={`
                        grid gap-4 h-full transition-all duration-500 ease-in-out
                        ${isIntentPanelOpen ? 'grid-cols-synos-focus' : 'grid-cols-synos-default'}
                    `}
                >

                    {/* Left Column: Reality + Work */}
                    <div className={`flex flex-col min-h-0 transition-opacity duration-300 ${isIntentPanelOpen ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>

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
                                    className="bg-zinc-100 hover:bg-white text-zinc-900 border border-zinc-200 px-4 py-1.5 rounded-md text-xs font-bold shadow-sm transition-all flex items-center gap-2 pointer-events-auto"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    New Walk-In
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

                    {/* Right Column: Audit Panel OR Intent Panel */}
                    <div className="min-h-0 relative">
                        {isIntentPanelOpen ? <IntentPanel /> : <ActivityStream />}
                    </div>

                </div>
            </div>
        </div>
    )
}
