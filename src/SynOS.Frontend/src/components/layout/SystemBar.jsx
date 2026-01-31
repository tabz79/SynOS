import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export function SystemBar({ serverTime, syncStatus = "Not Synced" }) {
    const { user } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());

    // Time Anchor Logic: Re-sync when serverTime push arrives
    useEffect(() => {
        if (serverTime) {
            setCurrentTime(new Date(serverTime));
        }
    }, [serverTime]);

    // Ticking Logic: Increment locally (Strictly defined as "Derived Time")
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(prev => new Date(prev.getTime() + 1000));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Formatters
    const timeDisplay = currentTime.toLocaleTimeString('en-US', {
        hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const dateDisplay = currentTime.toLocaleDateString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    }).split('/').reverse().join('-'); // YYYY-MM-DD

    const isConnected = syncStatus === "Synced";

    return (
        <div className="h-10 bg-synos-background border-b border-synos-border flex items-center justify-between px-4 text-xs font-mono text-synos-secondary select-none">
            {/* Left: Product Identity (Strict) */}
            <div className="flex items-center gap-6">
                <span className="text-white font-bold tracking-tight text-sm font-sans">
                    SynOS <span className="text-synos-secondary font-normal opacity-70">– Synthesized Lab Operating System</span>
                </span>
            </div>

            {/* Right: Operational Context (Strict Data Binding) */}
            <div className="flex items-center gap-6">

                {/* 1. Branch Context (Truth from JWT) */}
                <div className="flex items-center gap-2">
                    <span className="text-synos-secondary">Facility:</span>
                    <span className="text-white font-medium">{user?.branchName || "Unknown"}</span>
                </div>

                {/* 2. User Identity (Truth from JWT) */}
                <div className="flex items-center gap-2">
                    <span className="text-synos-secondary">Role:</span>
                    <span className="text-synos-primary">
                        {user?.name || "User"} - {user?.role || "Role"}
                    </span>
                </div>

                {/* 3. Operational Time (Anchored) */}
                <div className="flex items-center gap-2 border-l border-synos-border pl-6">
                    <span>Server Time:</span>
                    <span className="text-white tabular-nums">
                        {dateDisplay} {timeDisplay}
                    </span>
                </div>

                {/* 4. Connectivity (Strict State) */}
                <div className="flex items-center gap-2">
                    <span>Sync:</span>
                    <span className={cn(
                        "font-bold",
                        isConnected ? "text-synos-emerald" : "text-synos-red"
                    )}>
                        {isConnected ? "Synced" : "Not Synced"}
                    </span>
                </div>
            </div>
        </div>
    );
}
