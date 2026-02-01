import { useEffect, useState, useMemo } from 'react'
import { ReceptionApi } from '@/api/reception'
import { cn } from '@/lib/utils'
import {
    Loader2, AlertCircle,
    UserPlus, FlaskConical, FileText, CheckCircle2, DollarSign, Clock, AlertTriangle, Activity
} from 'lucide-react'

// Backend Semantic ID -> Lucide Component Map
const IconMap = {
    'user-plus': UserPlus,
    'flask': FlaskConical,
    'file-text': FileText,
    'check-circle': CheckCircle2,
    'dollar-sign': DollarSign,
    'clock': Clock,
    // Fallback
    'default': Activity
};

export function ActivityStream({ serverTime }) {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Ticking "Now" reference (synced to serverTime anchor)
    const [now, setNow] = useState(Date.now());

    // Sync `now` with `serverTime` if provided
    // If serverTime is "2026-01-31T19:00:00", we set our local derivedNow based on that 
    // PLUS the elapsed time since we received it.
    // Actually, simple ticking of `Date.now()` works IF `serverTime` was used to calculate an OFFSET.
    // For now, let's assume client/server clocks are reasonably close OR `serverTime` is just for display.
    // Better Approach: Calculate `timeOffset` when `serverTime` changes.
    const [timeOffset, setTimeOffset] = useState(0);

    useEffect(() => {
        if (serverTime) {
            const serverMs = new Date(serverTime).getTime();
            const localMs = Date.now();
            setTimeOffset(serverMs - localMs);
        }
    }, [serverTime]);

    // Ticker (Every 5s is enough for "minutes ago", but 1s for "just now")
    useEffect(() => {
        const timer = setInterval(() => {
            setNow(Date.now() + timeOffset);
        }, 1000); // 1s Resolution
        return () => clearInterval(timer);
    }, [timeOffset]);

    const fetchActivity = async () => {
        try {
            const data = await ReceptionApi.getActivityStream();

            if (!Array.isArray(data)) {
                if (data && data.message) throw new Error(data.message);
                throw new Error("Invalid format received from server");
            }
            // Sort Descending by Time
            const sorted = data.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
            setEvents(sorted);
            setLoading(false);
            setError(null);
        } catch (err) {
            console.error("Activity Stream Poll Failed:", err);
            if (events.length === 0) {
                setError(err.message || "Failed to load activity stream.");
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchActivity();
        const interval = setInterval(fetchActivity, 15000); // Poll faster (15s) for responsiveness
        return () => clearInterval(interval);
    }, []);

    // Format Relative Time
    const getRelativeTime = (isoString) => {
        if (!isoString) return '';
        const eventMs = new Date(isoString).getTime();
        const diffMs = now - eventMs;
        const seconds = Math.floor(diffMs / 1000);

        if (seconds < 10) return 'Just now';
        if (seconds < 60) return `${seconds}s ago`;

        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;

        return 'Today'; // Or date
    };

    // GROUPING LOGIC
    const groupedEvents = useMemo(() => {
        if (!events.length) return [];

        const groups = [];
        let currentGroup = null;

        events.forEach(event => {
            const groupKey = event.tokenId || event.visitId || "System";

            // Clean up the actor name (Front-end fallback)
            let displayActor = event.actorName;
            // If it looks like a GUID (length > 30 and contains hyphen), fallback
            if (displayActor && displayActor.length > 30 && displayActor.includes('-')) {
                displayActor = "User";
            }

            if (currentGroup && currentGroup.id === groupKey) {
                currentGroup.items.push(event);
            } else {
                if (currentGroup) groups.push(currentGroup);
                currentGroup = {
                    id: groupKey,
                    token: event.token || event.tokenId,
                    latestTime: event.occurredAt,
                    actorName: displayActor,
                    items: [event]
                };
            }
        });
        if (currentGroup) groups.push(currentGroup);
        return groups;
    }, [events]);

    // Helper to clean messages (Remove internal Fact IDs)
    const cleanMessage = (msg) => {
        if (!msg) return "";
        // Remove "(Fact: ...)" patterns including GUIDs
        return msg.replace(/\(Fact:.*?\)/g, "").trim();
    };

    return (
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/5 rounded-2xl h-full flex flex-col overflow-hidden shadow-2xl ring-1 ring-white/5">
            {/* Header */}
            <div className="h-10 border-b border-white/5 flex items-center justify-between px-4 bg-white/5 backdrop-blur-md z-10">
                <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-synos-emerald" />
                    <h3 className="font-bold text-[10px] uppercase tracking-widest text-zinc-400">Live Stream</h3>
                </div>
                {loading && <Loader2 className="w-3 h-3 text-zinc-500 animate-spin" />}
            </div>

            {/* Stream Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 relative scrollbar-thin scrollbar-thumb-zinc-800/50 hover:scrollbar-thumb-zinc-700">
                {error && (
                    <div className="flex items-center gap-2 text-red-300 text-xs p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {error}
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && events.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600 opacity-50 space-y-2">
                        <Activity className="w-8 h-8 opacity-20" />
                        <span className="text-xs italic">Silence on the deck...</span>
                    </div>
                )}

                {/* Timeline Groups */}
                <div className="relative ml-2 pb-4">
                    {/* Continuous Line */}

                    {groupedEvents.map((group, gIndex) => {
                        const isSystem = group.id === "System" || !group.token;

                        return (
                            <div key={gIndex} className="relative pl-6 pb-2 mb-6 last:mb-0">
                                {/* Group Connector Line */}
                                {gIndex !== groupedEvents.length - 1 && (
                                    <div className="absolute left-[5px] top-3 bottom-[-24px] w-[1px] bg-zinc-800/50" />
                                )}

                                {/* Group Head (Token) */}
                                <div className="absolute -left-[3px] top-0.5 w-4 h-4 rounded-full bg-zinc-900 border-2 border-zinc-700 z-10 box-content" />

                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "text-xs font-bold font-mono tracking-tight",
                                            isSystem ? "text-zinc-500" : "text-white"
                                        )}>
                                            {group.token || "System Event"}
                                        </span>
                                        {/* Actor Badge in Header */}
                                        {group.actorName && (
                                            <span className="text-[10px] text-zinc-500 bg-zinc-800/50 px-1.5 py-0.5 rounded border border-zinc-700/50">
                                                {group.actorName}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-zinc-500 font-mono">
                                        {getRelativeTime(group.latestTime)}
                                    </span>
                                </div>

                                {/* Group Items */}
                                <div className="space-y-3">
                                    {group.items.map((event, i) => {
                                        const IconComponent = IconMap[event.icon] || IconMap['default'];
                                        return (
                                            <div key={i} className="flex gap-3 group/item">
                                                <div className="mt-0.5 relative">
                                                    <IconComponent
                                                        className="w-3.5 h-3.5"
                                                        style={{ color: event.color || '#71717a' }}
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-xs text-zinc-400 group-hover/item:text-zinc-300 transition-colors leading-relaxed">
                                                        {cleanMessage(event.message || event.summaryText)}
                                                    </p>
                                                    {/* Actor removed from individual item */}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
