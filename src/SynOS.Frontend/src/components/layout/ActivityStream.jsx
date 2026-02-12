import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Activity, CheckCircle2, User, CreditCard, TestTube2, AlertCircle, Stethoscope, Microscope, FileText } from 'lucide-react'
import { ReceptionApi } from '../../api/reception'
import { cn } from "@/lib/utils"
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext' // Context for theme detection

export function ActivityStream({ serverTime }) {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    // THEME DETECTION (Matches ActionQueue)
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const fetchActivity = async () => {
        try {
            const data = await ReceptionApi.getActivityStream();

            let mappedData = data.filter(e => {
                if (!e.metadataObj) {
                    try {
                        e.metadataObj = (typeof e.metadata === 'string') ? JSON.parse(e.metadata) : (e.metadata || {});
                    }
                    catch { e.metadataObj = {}; }
                }

                if (e.visibility === 'Hide') return false;

                // 1. FILTER NOISE: Remove "Visit created..." explicitly as per user request
                // (User prefers "Visit Started" from VISIT_UPDATED)
                if (e.eventType === 'VISIT_CREATED') return false;

                // 1.1 Universal Filter: 0.00 Bills
                if (e.eventType === 'BILL_GENERATED') {
                    const title = e.title || e.summaryText || e.SummaryText || "";
                    if (title.includes('0.00')) return false;
                    const total = parseFloat(e.metadataObj.Total || e.metadataObj.Amount || 0);
                    if (total === 0) return false;
                }

                // 1.2 Role-Based Filter
                const userRole = user?.role || 'Reception';
                if (userRole === 'Phlebotomy' || userRole === 'Lab' || userRole === 'Pathologist') {
                    if (e.eventType === 'PAYMENT_RECEIVED' || e.eventType === 'BILL_GENERATED' || e.eventType === 'VISIT_Prepaid') {
                        return false;
                    }
                }

                // 1.3 Minimalist Filter: Remove "Visit started" redundancy if somehow remaining?
                // Actually user LIKES "Visit started", dislikes "Visit created".
                // So we keep VISIT_UPDATED events.

                return true;
            });

            const sorted = mappedData.sort((a, b) => {
                const dateA = new Date(a.occurredAt).getTime();
                const dateB = new Date(b.occurredAt).getTime();
                return dateB - dateA;
            });

            setEvents(sorted);
            setLoading(false);
        } catch (err) {
            console.error("Activity Stream Poll Failed:", err);
            if (events.length === 0) setLoading(false);
        }
    };

    useEffect(() => {
        fetchActivity();
        const interval = setInterval(fetchActivity, 5000);
        return () => clearInterval(interval);
    }, [user?.role]);

    const getRelativeTime = (dateString) => {
        if (!dateString) return "";
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return "";
            let now = serverTime ? new Date(serverTime) : new Date();
            if (isNaN(now.getTime())) now = new Date();
            const diffInSeconds = Math.floor((now - date) / 1000);
            if (isNaN(diffInSeconds)) return "";

            if (diffInSeconds < 60) return "just now";
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
            return `${Math.floor(diffInSeconds / 86400)}d ago`;
        } catch { return ""; }
    };

    const cleanMessage = (msg, metaObj) => {
        if (!msg) return "";
        let clean = msg.replace(/\(Fact:.*?\)/g, "").trim();
        clean = clean.replace(/[0-9a-fA-F-]{36}/g, (match) => {
            if (metaObj.PartnerName) return metaObj.PartnerName;
            if (metaObj.PatientName) return metaObj.PatientName;
            return "External Partner";
        });
        return clean;
    };

    const mapEventTypeToIcon = (type, msg) => {
        const message = (msg || "").toLowerCase();
        if (message.includes('added test')) return <Activity className="h-4 w-4 text-muted-foreground" />;
        if (message.includes('removed test')) return <Activity className="h-4 w-4 text-muted-foreground" />;
        if (message.includes('referral partner')) return <User className="h-4 w-4 text-muted-foreground" />;

        switch (type) {
            case 'VISIT_CREATED': return <User className="h-4 w-4 text-muted-foreground" />;
            // User prefers Financial Event as completion signal -> Check Circle
            case 'PAYMENT_RECEIVED': return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />;
            case 'RECEIVABLE_CREATED': return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />;

            // Fallback for visits without payment (e.g. Free/Zero Due) -> Check Circle
            case 'VISIT_FINALIZED': return <CheckCircle2 className="h-4 w-4 text-muted-foreground" />;
            default: return <Activity className="h-4 w-4 text-muted-foreground" />;
        }
    };

    const groupedEvents = useMemo(() => {
        const groups = [];
        let currentGroup = null;

        events.forEach(event => {
            const msg = event.title || event.summaryText || event.SummaryText || "";
            const rawToken = event.tokenId || event.TokenId || event.token || event.metadataObj?.TokenId;
            const token = rawToken || "System";

            if (!currentGroup || currentGroup.token !== token) {
                if (currentGroup) groups.push(currentGroup);

                let groupPatientName = event.metadataObj?.PatientName;
                if (!groupPatientName) {
                    groupPatientName = (token === "System") ? "Operational Log" : "Processing...";
                }

                currentGroup = {
                    token: token,
                    patientName: groupPatientName,
                    actorName: event.metadataObj?.ActorName || event.actorName || "User",
                    items: [{ ...event, messageResolved: msg }],
                    timestamp: event.occurredAt
                };
            } else {
                currentGroup.items.push({ ...event, messageResolved: msg });
                if (currentGroup.patientName === "Processing..." && event.metadataObj?.PatientName) {
                    currentGroup.patientName = event.metadataObj.PatientName;
                }
            }
        });
        if (currentGroup) groups.push(currentGroup);

        return groups.map(group => {
            const hasFinancialEvent = group.items.some(i =>
                i.eventType === 'PAYMENT_RECEIVED' ||
                i.eventType === 'RECEIVABLE_CREATED'
            );

            const mergedItems = group.items.filter(item => {
                // HIDE NOISE: If we have a financial event, hide "Visit Finalized"
                if (hasFinancialEvent && item.eventType === 'VISIT_FINALIZED') {
                    return false;
                }
                // Also hide Duplicate "Visit marked as Paid" if "Prepaid Credit Issued" exists
                if (item.eventType === 'VISIT_FINALIZED' && (item.title || "").toLowerCase().includes("visit marked as paid") && hasFinancialEvent) {
                    return false;
                }
                return true;
            });

            return { ...group, items: mergedItems };
        });
    }, [events]);

    // STYLES MATCHING ACTION QUEUE
    const ui = {
        container: isDark
            ? "bg-zinc-900 border-white/5 shadow-2xl"
            : "bg-white border-black/[0.1] shadow-[0_4px_20px_rgba(0,0,0,0.05)]",
        headerRow: isDark
            ? "bg-zinc-800 border-b border-white/5"
            : "border-b border-black/[0.08]",
    };

    // Light mode Gradient for Header
    const lightHeaderStyle = !isDark ? {
        background: `linear-gradient(to bottom, rgba(248, 253, 255, 0.98) 0%, rgba(238, 245, 248, 0.98) 50%, rgba(228, 235, 238, 0.98) 100%)`
    } : {};

    return (
        <div className={cn("flex flex-col h-full rounded-xl border overflow-hidden transition-all duration-300", ui.container)}>
            {/* MATCHING HEADER STYLE */}
            <div className={cn("h-12 flex items-center px-4 shrink-0", ui.headerRow)} style={lightHeaderStyle}>
                <div className="flex items-center gap-2">
                    {/* REQ: Keep Pulse Green in Top Window Bar */}
                    <Activity className="h-4 w-4 text-green-600" />
                    <h2 className={cn(
                        "text-sm font-medium",
                        isDark ? "text-zinc-200" : "text-zinc-800"
                    )}>
                        Live Stream
                    </h2>
                </div>
            </div>

            <div className="flex-1 overflow-hidden p-0 relative">
                <ScrollArea className="h-full">
                    <div className="p-4 space-y-6">
                        {loading && <div className="text-center text-xs text-muted-foreground py-4">Syncing stream...</div>}

                        {!loading && events.length === 0 && (
                            <div className="text-center text-xs text-muted-foreground py-8">
                                No activity in the last 24 hours
                            </div>
                        )}

                        {groupedEvents.map((group, groupIdx) => (
                            // REQ: Left side lines too faded -> Made darker (border-black/[0.1] or border-zinc-700)
                            <div key={`${group.token}-${groupIdx}`} className={cn(
                                "relative pl-4 border-l",
                                isDark ? "border-zinc-700" : "border-black/[0.1]" // Darker than default border
                            )}>
                                {/* Timeline Dot */}
                                <div className={cn(
                                    "absolute -left-1.5 top-0 h-3 w-3 rounded-full border-2",
                                    isDark ? "bg-zinc-800 border-zinc-900" : "bg-white border-white ring-1 ring-black/[0.1]"
                                )} />

                                <div className="mb-3 flex flex-col gap-0.5">
                                    <div className="flex items-center gap-2">
                                        {/* REQ: Fix Token Spacing - Trimmed & Monospace Font adjusted */}
                                        <span className={cn(
                                            "text-[10px] font-mono font-medium px-1.5 py-0.5 rounded",
                                            isDark ? "text-zinc-400 bg-white/5" : "text-zinc-600 bg-black/[0.04]"
                                        )}>
                                            {(group.token || "").trim()}
                                        </span>
                                        <span className="text-xs text-foreground/90 font-medium truncate max-w-[140px]">
                                            {group.patientName}
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground pl-1">
                                        by <span className="text-foreground/70">{group.actorName}</span> • {getRelativeTime(group.timestamp)}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {group.items.map((event, idx) => (
                                        <div key={event.eventId || idx} className="group relative flex gap-3 text-sm">
                                            <div className="mt-0.5 transition-colors text-muted-foreground group-hover:text-foreground">
                                                {mapEventTypeToIcon(event.eventType, event.messageResolved)}
                                            </div>
                                            <div className="flex-1 space-y-0.5">
                                                <p className="text-xs leading-none text-foreground/85 group-hover:text-foreground transition-colors">
                                                    {cleanMessage(event.messageResolved, event.metadataObj)}
                                                </p>

                                                {event.subMessage && (
                                                    <p className="text-[10px] text-emerald-600/80 dark:text-emerald-500/70">{event.subMessage}</p>
                                                )}

                                                {event.metadataObj?.TestCodes && Array.isArray(event.metadataObj.TestCodes) && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {event.metadataObj.TestCodes.map(code => (
                                                            <span key={code} className="text-[9px] bg-muted text-muted-foreground px-1 rounded border border-border/50">{code}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </div>
    )
}
