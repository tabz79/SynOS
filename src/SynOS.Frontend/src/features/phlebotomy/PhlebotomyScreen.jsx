import { useState, useEffect, useRef } from 'react'
import { cn } from "@/lib/utils"
// Reusing Shared Canon Layout Components (Safe - No Logic within them)
import { SystemBar } from '@/components/layout/SystemBar'
import { RealitySummary } from '@/components/layout/RealitySummary'
import { ActionQueue, ActionQueueHeader } from '@/components/layout/ActionQueue'
import { ActivityStream } from '@/components/layout/ActivityStream'
import { useTheme } from '@/context/ThemeContext'
import { Users, TestTube2, AlertCircle, CheckCircle2, Plus, ChevronDown, Package } from 'lucide-react'
import { StockRequestPanel } from '../inventory/StockRequestPanel'
import { PhlebotomyIntentPanel } from './components/PhlebotomyIntentPanel'
import { useFlipGroup } from "@/hooks/useSynOSMotion"
import { ReceptionApi } from '@/api/reception'
import { SignalRService } from '@/lib/signalr'
import { TokenCell, PatientCell, StatusCell, PhlebotomistCell } from '@/components/layout/ActionQueueCells'
import { useAuth } from '@/context/AuthContext'

export function PhlebotomyScreen() {
    const { theme } = useTheme();
    // Local UI State for Skeleton (No Context Dependency)
    const [isIntentPanelOpen, setIsIntentPanelOpen] = useState(false);
    const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);
    const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);

    // Dynamic Data
    const [actionQueue, setActionQueue] = useState([]);
    const [isLoadingQueue, setIsLoadingQueue] = useState(true);
    const [summary, setSummary] = useState(null);
    const [serverTime, setServerTime] = useState(new Date().toISOString());
    const [connectionStatus, setConnectionStatus] = useState("Not Synced");
    const { user } = useAuth();

    // Assignment Workflow State
    const [activeAssignmentTab, setActiveAssignmentTab] = useState("available"); // available | assigned
    const [selectedVisitId, setSelectedVisitId] = useState(null);

    // MOTION CANON: FLIP Group for Layout
    const summaryRef = useRef(null);
    const queueRef = useRef(null);
    useFlipGroup([summaryRef, queueRef], [isSummaryCollapsed], { scaleCompensation: true });

    const [showHistory, setShowHistory] = useState(false);
    const showHistoryRef = useRef(false);
    useEffect(() => { showHistoryRef.current = showHistory; }, [showHistory]);

    // Helper: Normalize Backend DTO using shared API method
    const normalizeQueueData = ReceptionApi.normalizeQueueData;

    // Filter Function for Branch-Wide Phlebotomy View
    const isPhleboRelevant = (row) => 
        row.operationalStatus === 'Ready for Sample' || 
        row.operationalStatus === 'Pending Collection' ||
        row.operationalStatus === 'Collected' ||
        row.operationalStatus === 'In Processing' ||
        row.operationalStatus === 'Reporting' ||
        row.operationalStatus === 'Completed' ||
        row.operationalStatus === 'Reported' ||
        row.operationalStatus === 'Delivered' ||
        showHistoryRef.current;

    // Wiring: Initial Load + SignalR Subscription
    useEffect(() => {
        // 1. Initial Snapshot
        const loadInitial = async () => {
            setIsLoadingQueue(true);
            try {
                const [summaryData, queueData] = await Promise.all([
                    ReceptionApi.getDashboardSummary(),
                    ReceptionApi.getActionQueue(showHistory)
                ]);

                if (summaryData) setSummary(summaryData);
                if (Array.isArray(queueData)) {
                    const phleboData = normalizeQueueData(queueData).filter(isPhleboRelevant);
                    setActionQueue(phleboData);
                }
            } catch (e) {
                console.error("Failed to fetch initial phlebotomy data", e);
            } finally {
                setIsLoadingQueue(false);
            }
        };

        loadInitial();

        // 2. Connect SignalR
        const connect = async () => {
            SignalRService.onReceptionSummaryUpdated((payload) => {
                setSummary(payload);
            });

            SignalRService.onActionQueueDeltaReceived((deltaRow) => {
                if (!deltaRow) return;

                const normalized = normalizeQueueData([deltaRow])[0];

                setActionQueue(prev => {
                    const isRelevantNow = isPhleboRelevant(normalized);
                    const exists = prev.some(r => r.visitId === normalized.visitId);

                    if (exists) {
                        // Update or Remove if status shifted away from Pending
                        if (isRelevantNow) {
                            return prev.map(r => r.visitId === normalized.visitId ? normalized : r);
                        } else {
                            return prev.filter(r => r.visitId !== normalized.visitId);
                        }
                    } else if (isRelevantNow) {
                        // Unshift new Token to top of queue
                        return [normalized, ...prev];
                    }
                    return prev;
                });
            });

            SignalRService.onActionQueueUpdated(() => {
                ReceptionApi.getActionQueue(showHistoryRef.current).then(data => {
                    if (Array.isArray(data)) {
                        setActionQueue(normalizeQueueData(data).filter(isPhleboRelevant));
                    }
                });
            });

            // Anchor Time & Sync Status
            SignalRService.onReceiveServerTime((time) => {
                setServerTime(time);
            });

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

        // Failsafe Polling (every 5 minutes)
        const interval = setInterval(async () => {
            try {
                const data = await ReceptionApi.getActionQueue(showHistoryRef.current);
                if (Array.isArray(data)) {
                    setActionQueue(normalizeQueueData(data).filter(isPhleboRelevant));
                }
            } catch (e) {
                console.error("Queue Poll Failed", e);
            }
        }, 300000);

        return () => clearInterval(interval);
    }, []);

    // REALITY TILES (Live Data mapping)
    const realityTiles = summary ? [
        { value: summary.walkInsToday?.toString() || "0", label: "Walk-Ins Today", qualifier: "Active", icon: Users, color: "blue" },
        { value: summary.pendingCollections?.toString() || "0", label: "Pending Samples", qualifier: "Awaiting", icon: AlertCircle, color: "red" },
        { value: summary.completedCollections?.toString() || "0", label: "Collected Today", icon: TestTube2, color: "emerald" },
        { value: summary.testsRunning?.toString() || "0", label: "Tests Running", icon: CheckCircle2, color: "zinc" },
    ] : [
        { value: "-", label: "Pending Samples", qualifier: "Urgent", icon: AlertCircle, color: "red" },
        { value: "-", label: "Collected Today", icon: TestTube2, color: "emerald" },
        { value: "-", label: "Walk-Ins Today", icon: Users, color: "blue" },
        { value: "-", label: "Tests Running", icon: CheckCircle2, color: "zinc" },
    ];

    // Intent Panel Actions
    const handleOpenIntentPanel = (row) => {
        if (!row || !row.visitId) return;
        setSelectedVisitId(row.visitId);
        setIsIntentPanelOpen(true);
    };

    // ACTION QUEUE COLUMNS (Phlebotomy Canon Alignment)
    const queueColumns = [
        {
            header: "Token ID",
            accessor: "token",
            className: "w-32",
            render: (row) => <TokenCell row={row} theme={theme} onAction={handleOpenIntentPanel} />
        },
        {
            header: "Patient",
            accessor: "patientName",
            className: "min-w-[200px]",
            render: (row) => <PatientCell row={row} />
        },
        {
            header: "ASSIGNED PHLEBOTOMIST",
            accessor: "assignedPhlebotomistName",
            className: "w-48",
            render: (row) => <PhlebotomistCell row={row} />
        },
        {
            header: "Status",
            accessor: "operationalStatus",
            className: "w-40",
            render: (row) => <StatusCell row={row} />
        }
    ];

    // Assignment Simulation Logic -> Real Local State Update
    const handleUpdateLocalState = (visitId, updates) => {
        setActionQueue(prev => prev.map(row => {
            if (row.visitId === visitId) {
                return { ...row, ...updates };
            }
            return row;
        }));
    };

    const isAdmin = user?.role === 'Admin' || user?.role === 'SystemAdmin';

    // Filtered Queue Data (Client-Side Isolation vs Admin Oversight)
    const filteredQueue = actionQueue.filter(row => {
        if (showHistory) {
            if (activeAssignmentTab === "available") {
                return row.assignedPhlebotomistId !== user?.id;
            } else {
                return row.assignedPhlebotomistId === user?.id;
            }
        } else {
            if (activeAssignmentTab === "available") {
                return !row.assignedPhlebotomistId;
            } else {
                // ADMIN RULE: Admins see EVERYTHING in the assigned tab
                if (isAdmin) {
                    return !!row.assignedPhlebotomistId;
                }
                // Standard User: See only what is assigned to ME
                return row.assignedPhlebotomistId === user?.id;
            }
        }
    });

    const selectedQueueItem = actionQueue.find(r => r.visitId === selectedVisitId);

    return (
        <div className="h-screen w-screen dark:bg-synos-background bg-transparent text-foreground flex flex-col overflow-hidden font-sans selection:bg-white/20 relative">
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1] dark:hidden">
                <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAt66YlAAAAB3RSTlMAo7S066u0v76zAAABJklEQVQ4jXWSwW7DIAyGvRNoV9HeIdp7B2nvHaK9d7D27lX836VpY6t0p8oHicDHP4Z99qGf96HvX+h7NfSmX8U8z9M0z6+P/m8X6fB6L78XpX4X5X4O6fc8l7e8n+T9KO87ed+m77pP33Wfvuu6T991nb7rum/ed5+87z55333yvvvkfffJ++6T990n77pP33Wfvus6fdd13rrvu67rvXXfd13ne+u+77rO99Z933Wdt67rtnXdt67rtnWdt67rtjW999Y9ve9997mPu8997uPus9fZZ6+zz15nn73OPnudvU9f0+v0Nb1OX9Pr9DW9Tm9O9vTmaE5vjua09f7o/db7rff7f9H3v6XvP9TzL/X+U8+/1fMv9fw7fQ==")` }} />
                <div className="absolute top-[-10%] right-[10%] w-[50%] h-[50%]" style={{ background: 'radial-gradient(circle at center, rgba(6, 182, 212, 0.05) 0%, rgba(6, 182, 212, 0) 70%)' }} />
            </div>

            <SystemBar serverTime={serverTime} syncStatus={connectionStatus} />

            <div className="flex-1 p-4 overflow-hidden">
                <div className="flex h-full gap-4">
                    <div
                        className={cn(
                            "flex flex-col min-h-0 transition-all duration-500 ease-out",
                            (isIntentPanelOpen || isInventoryModalOpen) ? 'w-[60%] opacity-40 pointer-events-none scale-[0.99]' : 'w-[75%] opacity-100 scale-100'
                        )}
                    >
                        <div ref={summaryRef} className="mb-4 shrink-0">
                            <div className="flex items-center justify-between mb-2 px-3 sticky top-0 dark:bg-synos-background bg-transparent z-10 py-1">
                                <h2 className="text-lg font-bold dark:text-zinc-200 text-zinc-800">Reality Summary</h2>
                                <button
                                    onClick={() => setIsSummaryCollapsed(!isSummaryCollapsed)}
                                    className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded-md hover:bg-white/5"
                                    title={isSummaryCollapsed ? "Expand View" : "Collapse View"}
                                >
                                    <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isSummaryCollapsed && "-rotate-90")} />
                                </button>
                            </div>
                            <RealitySummary tiles={realityTiles} isCollapsed={isSummaryCollapsed} />
                        </div>

                        <div ref={queueRef} className="flex-1 flex flex-col min-h-0 relative">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-4">
                                    <ActionQueueHeader title="Collection Queue" count={filteredQueue.length} />
                                    <div className="flex items-center gap-2 dark:bg-zinc-900/50 bg-white rounded-lg p-1 border dark:border-white/5 border-zinc-200 shadow-sm">
                                        <button
                                            onClick={() => setActiveAssignmentTab("available")}
                                            className={cn(
                                                "text-[10px] uppercase font-bold px-2 py-0.5 rounded transition-all",
                                                activeAssignmentTab === "available" ? "bg-zinc-800 text-white shadow-sm" : (theme === 'dark' ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-500 hover:text-zinc-900")
                                            )}
                                        >
                                            Available
                                        </button>
                                        <button
                                            onClick={() => setActiveAssignmentTab("assigned")}
                                            className={cn(
                                                "text-[10px] uppercase font-bold px-2 py-0.5 rounded transition-all",
                                                activeAssignmentTab === "assigned" ? "bg-zinc-800 text-white shadow-sm" : (theme === 'dark' ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-500 hover:text-zinc-900")
                                            )}
                                        >
                                            Assigned
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 dark:bg-zinc-900/50 bg-white rounded-lg p-1 border dark:border-white/5 border-zinc-200 shadow-sm">
                                        <button
                                            onClick={() => setShowHistory(false)}
                                            className={cn(
                                                "text-[10px] uppercase font-bold px-2 py-0.5 rounded transition-all",
                                                !showHistory ? "bg-zinc-800 text-white shadow-sm" : (theme === 'dark' ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-500 hover:text-zinc-900")
                                            )}
                                        >
                                            Live
                                        </button>
                                        <button
                                            onClick={() => setShowHistory(true)}
                                            className={cn(
                                                "text-[10px] uppercase font-bold px-2 py-0.5 rounded transition-all",
                                                showHistory ? "bg-zinc-800 text-white shadow-sm" : (theme === 'dark' ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-500 hover:text-zinc-900")
                                            )}
                                        >
                                            History (7d)
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsInventoryModalOpen(true)}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition-all duration-200 flex items-center gap-2 pointer-events-auto active:scale-95 border",
                                            theme === 'dark' ? "bg-zinc-900 text-zinc-400 border-white/5 hover:text-white hover:bg-zinc-800" : "bg-white text-zinc-600 border-zinc-200 hover:text-zinc-900 hover:bg-zinc-50"
                                        )}
                                    >
                                        <Package className="w-4 h-4" />
                                        Request Stock
                                    </button>
                                    <button
                                        onClick={() => setIsIntentPanelOpen(true)}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition-all duration-200 flex items-center gap-2 pointer-events-auto active:scale-95",
                                            theme === 'dark' ? "bg-zinc-100 text-zinc-900 hover:bg-white shadow-black/40" : "bg-zinc-800 text-white hover:bg-zinc-700 shadow-black/20"
                                        )}
                                    >
                                        <Plus className="w-4 h-4" />
                                        Walk-In Collection
                                    </button>
                                </div>
                            </div>
                            <ActionQueue
                                columns={queueColumns}
                                data={filteredQueue}
                                isLoading={isLoadingQueue}
                            />
                        </div>
                    </div>

                    <div
                        className={cn(
                            "transition-all duration-500 ease-out flex flex-col min-w-0",
                            (isIntentPanelOpen || isInventoryModalOpen) ? 'w-[40%]' : 'w-[25%]'
                        )}
                    >
                        <div className="flex-1 flex flex-col min-h-0 relative">
                            <PhlebotomyIntentPanel 
                                isOpen={isIntentPanelOpen} 
                                visitId={selectedVisitId}
                                queueItem={selectedQueueItem}
                                closePanel={() => {
                                    setIsIntentPanelOpen(false);
                                    setSelectedVisitId(null);
                                }}
                                onUpdateLocalState={handleUpdateLocalState}
                            />

                            <StockRequestPanel
                                isOpen={isInventoryModalOpen}
                                onClose={() => setIsInventoryModalOpen(false)}
                            />

                            <div className={cn(
                                "flex-1 flex flex-col min-h-0 transition-opacity duration-300",
                                (isIntentPanelOpen || isInventoryModalOpen) ? "opacity-0 pointer-events-none" : "opacity-100"
                            )}>
                                <ActivityStream serverTime={serverTime} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
