import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export function SystemBar({ serverTime, syncStatus = "Not Synced" }) {
    const { user, logout } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());

    // Dropdown State: 'role' | 'facility' | null
    const [activeDropdown, setActiveDropdown] = useState(null);

    // Time Anchor Logic
    useEffect(() => {
        if (serverTime) {
            setCurrentTime(new Date(serverTime));
        }
    }, [serverTime]);

    // Ticking Logic
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(prev => new Date(prev.getTime() + 1000));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Close dropdowns on outside click (simple implementation via background overlay if needed, or just relying on selection)
    // For now, simple toggles.

    const handleLogout = () => {
        logout();
        window.location.href = '/login'; // Force full reload/redirect
    };

    const handleSwitchBranch = (branchId) => {
        // TODO: Implement actual Backend Switch (POST /auth/switch)
        // For Phase 1, we just log it. The List is Mock.
        console.log("Switching to branch:", branchId);
        alert(`Switching to branch ${branchId} is not yet implemented on backend.`);
        setActiveDropdown(null);
    };

    // MOCK Branch List (Until API provided)
    const availableBranches = [
        { id: 'b1', name: 'Main Branch (HQ)' },
        { id: 'b2', name: 'City Center Hub' },
        { id: 'b3', name: 'Westside Satellite' }
    ];

    // Formatters
    const timeDisplay = currentTime.toLocaleTimeString('en-US', {
        hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const dateDisplay = currentTime.toLocaleDateString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    }).split('/').reverse().join('-');

    const isConnected = syncStatus === "Synced";

    return (
        <div className="h-10 bg-synos-background border-b border-synos-border flex items-center justify-between px-4 text-xs font-mono text-synos-secondary select-none relative z-50">
            {/* Overlay to close dropdowns */}
            {activeDropdown && (
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setActiveDropdown(null)} />
            )}

            {/* Left: Product Identity */}
            <div className="flex items-center gap-6">
                <span className="text-white font-bold tracking-tight text-sm font-sans">
                    SynOS <span className="text-synos-secondary font-normal opacity-70">– Synthesized Lab Operating System</span>
                </span>
            </div>

            {/* Right: Operational Context */}
            <div className="flex items-center gap-6">

                {/* 1. Branch Context (Dropdown) */}
                <div className="relative">
                    <div
                        className="flex items-center gap-2 cursor-pointer hover:bg-zinc-800/50 px-2 py-1 rounded transition-colors"
                        onClick={() => setActiveDropdown(activeDropdown === 'facility' ? null : 'facility')}
                    >
                        <span className="text-synos-secondary">Facility:</span>
                        <span className="text-white font-medium">{user?.branchName || "Unknown"}</span>
                    </div>

                    {/* Sliding Modal for Facility */}
                    {activeDropdown === 'facility' && (
                        <div className="absolute top-full left-0 mt-1 w-64 bg-zinc-900 border border-zinc-800/50 rounded-lg shadow-2xl overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200 z-50">
                            <div className="p-2 border-b border-zinc-800 bg-zinc-950/50">
                                <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px] pl-2">Switch Facility</span>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto p-1">
                                {availableBranches.map(branch => (
                                    <button
                                        key={branch.id}
                                        onClick={() => handleSwitchBranch(branch.id)}
                                        className="w-full text-left px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white rounded text-xs transition-colors flex items-center justify-between group"
                                    >
                                        <span>{branch.name}</span>
                                        {user?.branchName?.includes(branch.name.split(' ')[0]) && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. User Identity (Dropdown) */}
                <div className="relative">
                    <div
                        className="flex items-center gap-2 cursor-pointer hover:bg-zinc-800/50 px-2 py-1 rounded transition-colors"
                        onClick={() => setActiveDropdown(activeDropdown === 'role' ? null : 'role')}
                    >
                        <span className="text-synos-secondary">Role:</span>
                        <span className="text-synos-primary">
                            {user?.name || "User"} - {user?.role || "Role"}
                        </span>
                    </div>

                    {/* Sliding Modal for Role */}
                    {activeDropdown === 'role' && (
                        <div className="absolute top-full right-0 mt-1 w-48 bg-zinc-900 border border-zinc-800/50 rounded-lg shadow-2xl overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200 z-50">
                            <div className="p-2 border-b border-zinc-800 bg-zinc-950/50">
                                <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px] pl-2">Session Control</span>
                            </div>
                            <div className="p-1">
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left px-3 py-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded text-xs transition-colors font-medium flex items-center gap-2"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. Operational Time */}
                <div className="flex items-center gap-2 border-l border-synos-border pl-6">
                    <span>Server Time:</span>
                    <span className="text-white tabular-nums">
                        {dateDisplay} {timeDisplay}
                    </span>
                </div>

                {/* 4. Connectivity */}
                <div className="flex items-center gap-2">
                    <span>Sync:</span>
                    <span className={cn(
                        "font-bold transition-colors duration-300",
                        isConnected ? "text-synos-emerald" : "text-synos-red animate-pulse"
                    )}>
                        {isConnected ? "Synced" : "Not Synced"}
                    </span>
                </div>
            </div>
        </div>
    );
}
