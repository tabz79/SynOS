import { Wifi, CircleDollarSign, History } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SystemBar({ role = "Receptionist", facility = "Central Lab", serverTime, syncStatus = "Connected" }) {
    return (
        <div className="h-10 bg-synos-background border-b border-synos-border flex items-center justify-between px-4 text-xs font-mono text-synos-secondary select-none">
            {/* Left: Identity */}
            <div className="flex items-center gap-6">
                <span className="text-white font-bold tracking-tight text-sm font-sans">SynOS</span>
                <div className="flex items-center gap-2">
                    <span className="text-synos-secondary">Role:</span>
                    <span className="text-synos-primary">{role}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-synos-secondary">Facility:</span>
                    <span className="text-white">{facility}</span>
                </div>
            </div>

            {/* Right: System State */}
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <span>Server Time:</span>
                    <span className="text-white">{serverTime || "2026-01-13 18:25:00 IST"}</span>
                </div>

                <div className="flex items-center gap-2">
                    <span>Sync:</span>
                    <span className={cn(
                        "flex items-center gap-1",
                        syncStatus === "Connected" ? "text-synos-emerald" : "text-synos-red"
                    )}>
                        {syncStatus}
                        <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse",
                            syncStatus === "Connected" ? "bg-synos-emerald" : "bg-synos-red"
                        )} />
                    </span>
                </div>

                <div className="flex items-center gap-1 text-synos-secondary">
                    <span>Audit:</span>
                    <span className="text-white">Active</span>
                </div>
            </div>
        </div>
    );
}
