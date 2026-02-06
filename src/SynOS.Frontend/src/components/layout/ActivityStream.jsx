import { useEffect, useState, useMemo } from 'react'
import { useTheme } from '@/context/ThemeContext'
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
    const { theme } = useTheme();
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

    const isDark = theme === 'dark';

    const ui = {
        container: isDark
            ? "bg-zinc-900 border-white/5 shadow-xl ring-white/5"
            : "bg-white border-black/[0.1] shadow-[0_4px_20px_rgba(0,0,0,0.05)]",
        header: isDark
            ? "bg-zinc-800 border-b border-white/5"
            : "border-black/[0.05] bg-black/[0.02]"
    };

    return (
        <div
            className={cn(
                "flex flex-col min-h-0 rounded-2xl overflow-hidden h-full transition-all duration-300 border",
                ui.container
            )}
            style={{
                background: isDark
                    ? `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAt66YlAAAAB3RSTlMAo7S066u0v76zAAABJklEQVQ4jXWSwW7DIAyGvRNoV9HeIdp7B2nvHaK9d7D27lX836VpY6t0p8oHicDHP4Z99qGf96HvX+h7NfSmX8U8z9M0z6+P/m8X6fB6L78XpX4X5X4O6fc8l7e8n+T9KO87ed+m77pP33Wfvuu6T991nb7rum/ed5+87z55333yvvvkfffJ++6T990n77pP33Wfvus6fdd13rrvu67rvXXfd13ne+u+77rO99Z933Wdt67rtnXdt67rtnWdt67rtjW999Y9ve9997mPu8997uPus9fZZ6+zz15nn73OPnudvU9f0+v0Nb1OX9Pr9DW9Tm9O9vTmaE5vjua09f7o/db7rff7f9H3v6XvP9TzL/X+U8+/1fMv9fw7fQ=="), 
                         #18181b`
                    : `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAt66YlAAAAB3RSTlMAo7S066u0v76zAAABJklEQVQ4jXWSwW7DIAyGvRNoV9HeIdp7B2nvHaK9d7D27lX836VpY6t0p8oHicDHP4Z99qGf96HvX+h7NfSmX8U8z9M0z6+P/m8X6fB6L78XpX4X5X4O6fc8l7e8n+T9KO87ed+m77pP33Wfvuu6T991nb7rum/ed5+87z55333yvvvkfffJ++6T990n77pP33Wfvus6fdd13rrvu67rvXXfd13ne+u+77rO99Z933Wdt67rtnXdt67rtnWdt67rtjW999Y9ve9997mPu8997uPus9fZZ6+zz15nn73OPnudvU9f0+v0Nb1OX9Pr9DW9Tm9O9vTmaE5vjua09f7o/db7rff7f9H3v6XvP9TzL/X+U8+/1fMv9fw7fQ=="), 
                         linear-gradient(to bottom, rgba(252, 254, 255, 0.99) 0%, rgba(248, 252, 255, 0.99) 50%, rgba(245, 250, 255, 0.99) 100%)`
            }}
        >
            {/* Header */}
            <div
                className={cn("h-10 flex items-center justify-between px-4 z-10", ui.header)}
                style={!isDark ? {
                    background: `linear-gradient(to bottom, rgba(248, 253, 255, 0.98) 0%, rgba(238, 245, 248, 0.98) 50%, rgba(228, 235, 238, 0.98) 100%)`
                } : {}}
            >
                <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-synos-emerald" />
                    <h3 className="font-bold text-[11px] uppercase tracking-widest text-zinc-800">Live Stream</h3>
                </div>
                {loading && <Loader2 className="w-3 h-3 text-zinc-500 animate-spin" />}
            </div>

            {/* Stream Content */}
            <div className={cn(
                "flex-1 overflow-y-auto p-4 space-y-6 relative scrollbar-thin hover:scrollbar-thumb-zinc-400",
                isDark ? "scrollbar-thumb-zinc-800/50" : "scrollbar-thumb-zinc-300"
            )}>
                {error && (
                    <div className="flex items-center gap-2 text-red-300 text-xs p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {error}
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && events.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600 space-y-3">
                        <div className="p-4 rounded-3xl dark:bg-zinc-800/20 bg-black/[0.03] shadow-inner">
                            <Activity className="w-10 h-10 opacity-20" />
                        </div>
                        <span className="text-xs italic opacity-50">Silence on the deck...</span>
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
                                    <div className="absolute left-[5px] top-3 bottom-[-24px] w-[1px] dark:bg-zinc-800/50 bg-zinc-200" />
                                )}

                                {/* Group Head (Token) */}
                                <div className="absolute -left-[3px] top-0.5 w-4 h-4 rounded-full dark:bg-zinc-900 bg-white border-2 dark:border-zinc-700 border-zinc-200 z-10 box-content shadow-sm" />

                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "text-xs font-bold font-mono tracking-tight",
                                            isSystem ? "text-zinc-500" : "dark:text-white text-zinc-900"
                                        )}>
                                            {group.token || "System Event"}
                                        </span>
                                        {/* Actor Badge in Header */}
                                        {group.actorName && (
                                            <span className="text-[10px] dark:text-zinc-500 text-zinc-500 dark:bg-zinc-800/50 bg-zinc-200/50 px-1.5 py-0.5 rounded border dark:border-zinc-700/50 border-zinc-300/50">
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
                                                    <p className="text-xs dark:text-zinc-400 text-zinc-600 dark:group-hover/item:text-zinc-300 group-hover/item:text-zinc-900 transition-colors leading-relaxed">
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
