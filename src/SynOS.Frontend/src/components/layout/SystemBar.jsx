import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import {
  ChevronDown,
  Globe,
  Shield,
  Wifi,
  WifiOff,
  Clock,
  Moon,
  Sun
} from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useTheme } from '@/context/ThemeContext';

export function SystemBar({ serverTime, syncStatus = "Not Synced" }) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeDropdown, setActiveDropdown] = useState(null);

  const facilityRef = useRef(null);
  const roleRef = useRef(null);

  useFocusTrap(facilityRef, activeDropdown === 'facility', () => setActiveDropdown(null));
  useFocusTrap(roleRef, activeDropdown === 'role', () => setActiveDropdown(null));

  useEffect(() => {
    if (serverTime) setCurrentTime(new Date(serverTime));
  }, [serverTime]);

  useEffect(() => {
    const t = setInterval(() => {
      setCurrentTime(p => new Date(p.getTime() + 1000));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const availableBranches = [
    { id: 'b1', name: 'Main Branch (HQ)' },
    { id: 'b2', name: 'City Center Hub' },
    { id: 'b3', name: 'Westside Satellite' }
  ];

  const timeDisplay = currentTime.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const dateDisplay = currentTime
    .toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .split('/')
    .reverse()
    .join('-');

  const isConnected = syncStatus === "Synced";

  /**
   * ANTI-GRAVITY PERFORMANCE ARCHITECTURE:
   * 1. Removal of 'backdrop-filter: blur' as it triggers a GPU convolution death-loop when combined with background animations.
   * 2. Replacement with 'Fake Frost' model: Layered static gradients + High-density alpha (0.95+) mimics the frosted look.
   * 3. Micro-Grain Texture: Injected SVG noise simulates the organic surface refraction seen in frosted glass.
   * 4. Stacking Isolation: 'isolation: isolate' and 'will-change' ensures the browser promotes this bar to its own hardware-accelerated compositor layer.
   */
  return (
    <div
      className={cn(
        "sticky top-0 z-50 h-14 w-full px-6 flex items-center justify-between select-none transition-all duration-300",
        "shadow-[0_4px_12px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.3)]",
        "border-b border-black/[0.15] isolation-auto",
        "dark:bg-zinc-900/80 dark:shadow-none dark:border-white/10 dark:backdrop-blur-xl dark:backdrop-saturate-[2.0]"
      )}
      style={{
        willChange: 'transform',
        isolation: 'isolate',
        background: theme === 'dark'
          ? undefined
          : `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.015'/%3E%3C/svg%3E"), 
             linear-gradient(to bottom, rgba(245, 252, 255, 0.96) 0%, rgba(230, 242, 245, 0.98) 50%, rgba(215, 225, 228, 0.98) 100%)`
      }}
    >

      {activeDropdown && (
        <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)} />
      )}

      {/* LEFT — Identity */}
      <div className="flex flex-col leading-none">
        <span className="text-zinc-900 dark:text-white font-bold tracking-tight text-base">
          SynOS
        </span>
        <span className="text-zinc-500 text-[10px] tracking-wider uppercase">
          Synthesized Lab Intelligence
        </span>
      </div>

      {/* RIGHT — Controls */}
      <div className="flex items-center gap-3">

        {/* Branch (Fake Frost Pill) */}
        <div className="relative">
          <button
            onClick={() => setActiveDropdown(activeDropdown === 'facility' ? null : 'facility')}
            className="
              flex items-center gap-2 px-3 py-1.5 rounded-xl
              bg-white/95 border border-black/[0.1]
              shadow-[0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)]
              text-zinc-800 text-xs font-medium
              hover:bg-white transition-all
            "
          >
            <Globe className="w-3.5 h-3.5 opacity-70" />
            {user?.branchName || "Unknown"}
            <ChevronDown className="w-3 h-3 opacity-50" />
          </button>

          {activeDropdown === 'facility' && (
            <div
              ref={facilityRef}
              className="
                absolute right-0 mt-2 w-64 z-50
                bg-white/95 backdrop-blur-xl rounded-2xl p-1
                border border-black/5
                shadow-xl
              "
            >
              {availableBranches.map(b => (
                <button
                  key={b.id}
                  className="w-full px-3 py-2 text-left text-xs rounded-lg hover:bg-black/5"
                  onClick={() => setActiveDropdown(null)}
                >
                  {b.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User (Fake Frost Pill) */}
        <div className="relative">
          <button
            onClick={() => setActiveDropdown(activeDropdown === 'role' ? null : 'role')}
            className="
              flex items-center gap-2 px-3 py-1.5 rounded-xl
              bg-white/95 border border-black/[0.1]
              shadow-[0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)]
              text-zinc-800 text-xs font-medium
              hover:bg-white transition-all
            "
          >
            <Shield className="w-3.5 h-3.5 opacity-70" />
            {user?.name || "User"}
            <ChevronDown className="w-3 h-3 opacity-50" />
          </button>

          {activeDropdown === 'role' && (
            <div
              ref={roleRef}
              className="
                absolute right-0 mt-2 w-48 z-50
                bg-white/95 backdrop-blur-xl rounded-2xl p-1
                border border-black/5 shadow-xl
              "
            >
              <button
                className="w-full px-3 py-2 text-xs rounded-lg hover:bg-black/5 flex items-center gap-2"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                Theme: {theme}
              </button>

              <button
                className="w-full px-3 py-2 text-xs rounded-lg text-red-500 hover:bg-red-500/10"
                onClick={handleLogout}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>

        {/* Time + Status (Fake Frost Pill) */}
        <div className="
          flex items-center gap-4 px-4 py-1.5 rounded-xl
          bg-white/90 border border-black/[0.1]
          shadow-[0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)]
        ">
          <span className="font-mono text-xs text-zinc-700">
            {dateDisplay} <span className="text-zinc-900">{timeDisplay}</span>
          </span>

          <div className="w-px h-3 bg-black/10" />

          {isConnected ? (
            <span className="flex items-center gap-1 text-emerald-600 text-[10px] font-bold">
              <Wifi className="w-3.5 h-3.5" /> LIVE
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-500 text-[10px] font-bold">
              <WifiOff className="w-3.5 h-3.5 animate-pulse" /> OFFLINE
            </span>
          )}
        </div>

      </div>
    </div>
  );
}
