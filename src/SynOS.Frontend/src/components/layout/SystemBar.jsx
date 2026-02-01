import { useState, useEffect, useRef } from 'react'; // Added useRef
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { ChevronDown, Globe, Shield, Wifi, WifiOff, Clock } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap'; // Added

export function SystemBar({ serverTime, syncStatus = "Not Synced" }) {
    const { user, logout } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());

    // Dropdown State: 'role' | 'facility' | null
    const [activeDropdown, setActiveDropdown] = useState(null);

    // FOCUS CANON: Dropdown Traps
    const facilityRef = useRef(null);
    const roleRef = useRef(null);

    useFocusTrap(facilityRef, activeDropdown === 'facility', () => setActiveDropdown(null));
    useFocusTrap(roleRef, activeDropdown === 'role', () => setActiveDropdown(null));

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

    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };

    const handleSwitchBranch = (branchId) => {
        console.log("Switching to branch:", branchId);
        alert(`Switching to branch ${branchId} is not yet implemented on backend.`);
        setActiveDropdown(null);
    };

    // MOCK Branch List
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
        <div className="h-14 flex items-center justify-between px-6 select-none relative z-50 bg-zinc-900/80 backdrop-blur-xl border-b border-white/5 shadow-2xl">
            {/* Overlay to close dropdowns */}
            {activeDropdown && (
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setActiveDropdown(null)} />
            )}

            {/* Left: Product Identity */}
            <div className="flex items-center gap-4">
                {/* Logo Mark or Icon could go here */}
                <div className="flex flex-col leading-none">
                    <span className="text-white font-bold tracking-tight text-base font-sans bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                        SynOS
                    </span>
                    <span className="text-zinc-500 font-medium text-[10px] tracking-wider uppercase opacity-80 pt-0.5">
                        Synthesized Lab Intelligence
                    </span>
                </div>
            </div>

            {/* Right: Operational Context (Glass Pills) */}
            <div className="flex items-center gap-3">

                {/* 1. Branch Context (Dropdown Pill) */}
                <div className="relative">
                    <button
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200 group focus-synos active:scale-95",
                            activeDropdown === 'facility'
                                ? "bg-white/10 border-white/10 text-white"
                                : "bg-black/20 border-white/5 text-zinc-400 hover:bg-white/5 hover:border-white/10 hover:text-zinc-200"
                        )}
                        onClick={() => setActiveDropdown(activeDropdown === 'facility' ? null : 'facility')}
                    >
                        <Globe className="w-3.5 h-3.5 opacity-70" />
                        <span className="text-xs font-medium">{user?.branchName || "Unknown"}</span>
                        <ChevronDown className={cn("w-3 h-3 opacity-50 transition-transform", activeDropdown === 'facility' && "rotate-180")} />
                    </button>

                    {/* Menu */}
                    {activeDropdown === 'facility' && (
                        <div ref={facilityRef} className="absolute top-full right-0 mt-2 w-64 bg-zinc-900/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 fade-in duration-260 ease-synos z-[60] p-1 ring-1 ring-white/10">
                            <div className="px-3 py-2 border-b border-white/5 mb-1">
                                <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Active Facility</span>
                            </div>
                            {availableBranches.map(branch => (
                                <button
                                    key={branch.id}
                                    onClick={() => handleSwitchBranch(branch.id)}
                                    className="w-full text-left px-3 py-2 text-zinc-300 hover:bg-white/5 hover:text-synos-primary hover:underline decoration-synos-primary decoration-2 underline-offset-2 rounded-lg text-xs transition-all flex items-center justify-between group focus-synos active:scale-95"
                                >
                                    <span>{branch.name}</span>
                                    {user?.branchName?.includes(branch.name.split(' ')[0]) && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* 2. User Identity (Dropdown Pill) */}
                <div className="relative">
                    <button
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200 group focus-synos active:scale-95",
                            activeDropdown === 'role'
                                ? "bg-white/10 border-white/10 text-white"
                                : "bg-black/20 border-white/5 text-zinc-400 hover:bg-white/5 hover:border-white/10 hover:text-zinc-200"
                        )}
                        onClick={() => setActiveDropdown(activeDropdown === 'role' ? null : 'role')}
                    >
                        <Shield className="w-3.5 h-3.5 opacity-70" />
                        <span className="text-xs font-medium">{user?.name || "User"}</span>
                        <ChevronDown className={cn("w-3 h-3 opacity-50 transition-transform", activeDropdown === 'role' && "rotate-180")} />
                    </button>

                    {/* Menu */}
                    {activeDropdown === 'role' && (
                        <div ref={roleRef} className="absolute top-full right-0 mt-2 w-48 bg-zinc-900/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 fade-in duration-260 ease-synos z-[60] p-1 ring-1 ring-white/10">
                            <div className="px-3 py-2 border-b border-white/5 mb-1">
                                <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">{user?.role || "Operator"}</span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="w-full text-left px-3 py-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg text-xs transition-all font-medium flex items-center gap-2 focus-synos active:scale-95"
                            >
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="h-6 w-[1px] bg-white/5 mx-2" />

                {/* 3. Operational Time & Sync */}
                <div className="flex items-center gap-4 bg-black/20 border border-white/5 rounded-full px-4 py-1.5">
                    <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-zinc-600" />
                        <span className="text-zinc-400 text-xs font-mono tracking-tight">
                            {dateDisplay} <span className="text-zinc-200">{timeDisplay}</span>
                        </span>
                    </div>

                    <div className="w-[1px] h-3 bg-white/10" />

                    <div className="flex items-center gap-1.5">
                        {isConnected ? (
                            <Wifi className="w-3.5 h-3.5 text-emerald-500/80" />
                        ) : (
                            <WifiOff className="w-3.5 h-3.5 text-red-500/80 animate-pulse" />
                        )}
                        <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider",
                            isConnected ? "text-emerald-500" : "text-red-500"
                        )}>
                            {isConnected ? "Live" : "Offline"}
                        </span>
                    </div>
                </div>

            </div>
        </div>
    );
}
