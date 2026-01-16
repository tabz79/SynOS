import { useEffect, useState } from 'react'
import { ReceptionApi } from '@/api/reception'
import { cn } from '@/lib/utils'
import {
    Loader2, RefreshCcw, AlertCircle,
    UserPlus, FlaskConical, FileText, CheckCircle2, DollarSign, Clock, AlertTriangle
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
    'default': AlertTriangle
};

export function ActivityStream() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchActivity = async () => {
        try {
            const data = await ReceptionApi.getActivityStream();

            // Defensive check for array
            if (!Array.isArray(data)) {
                // If it's a known error object from our API wrapper
                if (data && data.message) throw new Error(data.message);
                throw new Error("Invalid format received from server");
            }

            setEvents(data);
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
        const interval = setInterval(fetchActivity, 45000); // 45s Poll
        return () => clearInterval(interval);
    }, []);

    // Format Relative Time (Visual Only - Permitted)
    const getRelativeTime = (isoString) => {
        const diff = Date.now() - new Date(isoString).getTime();
        const minutes = Math.floor(diff / 60000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return 'Today';
    };

    return (
        <div className="bg-zinc-900 border border-synos-border rounded-xl h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="h-10 border-b border-synos-border/50 flex items-center justify-between px-3 bg-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-synos-emerald animate-pulse"></span>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-300">Activity Stream</h3>
                </div>
                {loading && <Loader2 className="w-3 h-3 text-zinc-500 animate-spin" />}
            </div>

            {/* Stream Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-0 relative scrollbar-thin scrollbar-thumb-zinc-800">
                {error && (
                    <div className="flex items-center gap-2 text-red-400 text-xs p-2 mb-4 bg-red-500/10 rounded">
                        <AlertCircle className="w-3 h-3" />
                        {error}
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && events.length === 0 && (
                    <div className="text-center text-zinc-600 text-xs py-10 italic">
                        No activity recorded today.
                    </div>
                )}

                {/* Timeline */}
                <div className="relative border-l border-zinc-800 ml-2 space-y-6 pb-4">
                    {events.map((event, index) => {
                        // Dynamic Icon Resolution
                        const IconComponent = IconMap[event.icon] || IconMap['default'];

                        return (
                            <div key={event.eventId || index} className="pl-6 relative group">
                                {/* Icon Indicator - Backend Driven Color */}
                                <div
                                    className="absolute -left-[9px] top-1 rounded-full bg-zinc-900 border border-zinc-800 p-0.5"
                                    style={{ borderColor: event.color }} // Optional: Tint border with event color
                                >
                                    <IconComponent
                                        className="w-3.5 h-3.5"
                                        style={{ color: event.color || '#71717a' }} // Fallback to zinc-500
                                    />
                                </div>

                                {/* Time & Actor */}
                                <div className="text-[10px] items-center gap-2 flex text-zinc-500 font-mono mb-0.5">
                                    <span title={new Date(event.occurredAt).toLocaleTimeString()}>
                                        {getRelativeTime(event.occurredAt)}
                                    </span>
                                    {event.actorName && (
                                        <span className="text-zinc-600">• {event.actorName}</span>
                                    )}
                                </div>

                                {/* Token */}
                                <div className="text-xs font-bold text-zinc-200 mb-0.5 font-mono tracking-tight">
                                    {event.token || event.tokenId} {/* Handle DTO variation gracefully */}
                                </div>

                                {/* Summary / Message - Verbatim */}
                                <div className="text-xs text-zinc-400 leading-snug break-words">
                                    {event.message || event.summaryText} {/* Handle DTO variation gracefully */}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    )
}
