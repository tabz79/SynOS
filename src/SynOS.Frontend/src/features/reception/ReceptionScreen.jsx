import { useState, useEffect } from 'react'
import { Plus, Users, ClipboardList, Bed, Clock } from 'lucide-react'
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
    const { isOpen: isIntentPanelOpen, openPanel } = useReceptionPanelUI();

    // Wiring: Initial Load + SignalR Subscription
    useEffect(() => {
        // 1. Initial Snapshot
        const loadInitial = async () => {
            try {
                const data = await ReceptionApi.getDashboardSummary();
                if (data) setSummary(data);
            } catch (e) {
                console.error("Failed to fetch initial summary", e);
            }
        };

        loadInitial();

        // 2. Connect SignalR
        const connect = async () => {
            await SignalRService.startConnection();

            // 3. Subscribe to Updates (Pure Replacement)
            SignalRService.onReceptionSummaryUpdated((payload) => {
                // STRICT: Replace pure state. No merging.
                setSummary(payload);
            });
        };

        connect();

        // Cleanup
        return () => {
            SignalRService.stopConnection();
        };
    }, []);

    // Derived strictly for display (formatting only)
    const realityTiles = summary ? [
        { value: summary.walkInsToday?.toString() || "0", label: "Walk-Ins Today", icon: Users, color: "amber" },
        { value: `₹${(summary.paymentsCollected || 0).toLocaleString()}`, label: "Payments Collected", icon: ClipboardList, color: "emerald" },
        { value: summary.pendingReports?.toString() || "0", label: "Pending Reports", icon: Bed, color: "red" }, // Semantic ID: Bed -> Pending
        { value: `${summary.avgReportTimeMinutes || 0}m`, label: "Avg Report Time", icon: Clock, color: "default" },
    ] : [
        // Skeleton / Empty State while loading
        { value: "—", label: "Walk-Ins Today", icon: Users, color: "default" },
        { value: "—", label: "Payments Collected", icon: ClipboardList, color: "default" },
        { value: "—", label: "Pending Reports", icon: Bed, color: "default" },
        { value: "—", label: "Avg Report Time", icon: Clock, color: "default" },
    ];

    // Dummy Queue Data
    const queueColumns = [
        { header: "Token ID", accessor: "token", className: "font-mono text-zinc-400" },
        { header: "Patient Name", accessor: "name", className: "font-medium text-white" },
        {
            header: "Status",
            accessor: "status",
            render: (row) => (
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${row.status === 'Pending' ? 'bg-amber-500/10 text-amber-500' :
                    row.status === 'Blocked' ? 'bg-red-500/10 text-red-500' :
                        'bg-emerald-500/10 text-emerald-500'
                    }`}>
                    {row.status}
                </span>
            )
        },
        { header: "Waiting", accessor: "waiting", className: "font-mono text-zinc-500" },
        { header: "Description", accessor: "description", className: "text-zinc-500" },
    ];

    // Dummy Refresh Logic could go here (Polling)

    const queueData = [
        { token: "P-2026-14592", name: "Rahul Deshmukh", status: "Pending", waiting: "12m", description: "Registration Incomplete" },
        { token: "P-2026-14601", name: "Anjali Gupta", status: "Blocked", waiting: "45m", description: "Insurance Failed" },
        { token: "P-2026-14588", name: "Vikram Singh", status: "Finalized", waiting: "Completed", description: "Discharge Processed" },
        { token: "P-2026-14601", name: "Priya Sharma", status: "Blocked", waiting: "45m", description: "Insurance Failed" },
        { token: "P-2026-14588", name: "Amit Kumar", status: "Finalized", waiting: "Completed", description: "Discharge Processed" },
        { token: "P-2026-14592", name: "Neha Patel", status: "Pending", waiting: "45m", description: "Registration Incomplete" },
        { token: "P-2026-14592", name: "Suresh Reddy", status: "Pending", waiting: "30m", description: "Registration Incomplete" },
        { token: "P-2026-14601", name: "Priya Sharma", status: "Blocked", waiting: "45m", description: "Insurance Failed" },
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
                                <ActionQueueHeader title="Action Queues" count={queueData.length} />
                                <button
                                    onClick={openPanel}
                                    className="bg-zinc-100 hover:bg-white text-zinc-900 border border-zinc-200 px-4 py-1.5 rounded-md text-xs font-bold shadow-sm transition-all flex items-center gap-2 pointer-events-auto"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    New Walk-In
                                </button>
                            </div>
                            <ActionQueue columns={queueColumns} data={queueData} />
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
