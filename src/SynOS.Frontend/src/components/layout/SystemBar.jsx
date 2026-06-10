import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Globe, Shield, Wifi, WifiOff, Clock, Moon, Sun, Monitor, Activity } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { ReceptionApi } from '@/api/reception';

export function SystemBar({ serverTime, syncStatus = "Not Synced" }) {
  const { user, logout, activeOversightBranchId, setOversightBranch } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [availableBranches, setAvailableBranches] = useState([]);

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

  // Fetch branches for management view (Admins only)
  useEffect(() => {
    const isAdmin = user?.role === 'Admin' || user?.role === 'SystemAdmin' || 
                   (Array.isArray(user?.role) && (user.role.includes('Admin') || user.role.includes('SystemAdmin')));
    
    if (isAdmin) {
      ReceptionApi.getBranches().then(branches => {
        setAvailableBranches(branches);
        // Auto-select first branch if none active and we're an admin
        if (!activeOversightBranchId && branches.length > 0) {
          setOversightBranch(branches[0].id || branches[0].branchId);
        }
      }).catch(err => console.error("Failed to fetch branches:", err));
    }
  }, [user?.role]);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const isAdmin = user?.role === 'Admin' || user?.role === 'SystemAdmin' || 
                 (Array.isArray(user?.role) && (user.role.includes('Admin') || user.role.includes('SystemAdmin')));

  const currentBranchName = isAdmin
    ? (availableBranches.find(b => (b.id || b.branchId) === activeOversightBranchId)?.name || user?.branchName || "Select Branch...")
    : (user?.branchName || "Unknown Branch");

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
  const isDark = theme === 'dark';

  const ui = {
    bar: isDark
      ? "bg-zinc-900 shadow-none border-b border-white/5"
      : "bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.3)] border-b border-black/[0.15]",
    pill: isDark
      ? "bg-black border border-white/5 text-zinc-100 hover:bg-zinc-800"
      : "bg-white/95 border border-black/[0.1] shadow-[0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)] text-zinc-800 hover:bg-white",
    timePill: isDark
      ? "bg-black border border-white/5"
      : "bg-white/90 border border-black/[0.1] shadow-[0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)]"
  };

  return (
    <div
      className={cn(
        "sticky top-0 z-50 h-12 w-full px-6 flex items-center justify-between select-none transition-all duration-300 isolation-auto",
        ui.bar
      )}
      style={{
        background: isDark
          ? `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAt66YlAAAAB3RSTlMAo7S066u0v76zAAABJklEQVQ4jXWSwW7DIAyGvRNoV9HeIdp7B2nvHaK9d7D27lX836VpY6t0p8oHicDHP4Z99qGf96HvX+h7NfSmX8U8z9M0z6+P/m8X6fB6L78XpX4X5X4O6fc8l7e8n+T9KO87ed+m77pP33Wfvuu6T991nb7rum/ed5+87z55333yvvvkfffJ++6T990n77pP33Wfvus6fdd13rrvu67rvXXfd13ne+u+77rO99Z933Wdt67rtnXdt67rtnWdt67rtjW999Y9ve9997mPu8997uPus9fZZ6+zz15nn73OPnudvU9f0+v0Nb1OX9Pr9DW9Tm9O9vTmaE5vjua09f7o/db7rff7f9H3v6XvP9TzL/X+U8+/1fMv9fw7fQ=="), 
             #18181b`
          : `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAt66YlAAAAB3RSTlMAo7S066u0v76zAAABJklEQVQ4jXWSwW7DIAyGvRNoV9HeIdp7B2nvHaK9d7D27lX836VpY6t0p8oHicDHP4Z99qGf96HvX+h7NfSmX8U8z9M0z6+P/m8X6fB6L78XpX4X5X4O6fc8l7e8n+T9KO87ed+m77pP33Wfvuu6T991nb7rum/ed5+87z55333yvvvkfffJ++6T990n77pP33Wfvus6fdd13rrvu67rvXXfd13ne+u+77rO99Z933Wdt67rtnXdt67rtnWdt67rtjW999Y9ve9997mPu8997uPus9fZZ6+zz15nn73OPnudvU9f0+v0Nb1OX9Pr9DW9Tm9O9vTmaE5vjua09f7o/db7rff7f9H3v6XvP9TzL/X+U8+/1fMv9fw7fQ=="), 
             linear-gradient(to bottom, #F5FCFF 0%, #E6F2F5 50%, #D7E1E4 100%)`
      }}
    >

      {activeDropdown && (
        <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)} />
      )}

      {/* LEFT — Identity (Single Brand Lockup) */}
      <div 
        className="flex items-center ml-[36px] cursor-pointer"
        onClick={() => navigate('/')}
      >
        <img 
          src="/assets/synos-lockup.svg" 
          alt="SynOS" 
          className="h-8 object-contain dark:invert" 
        />
      </div>

      {/* RIGHT — Controls */}
      <div className="flex items-center gap-3">

        {/* Branch (Fake Frost Pill) */}
        <div className="relative">
          <button
            onClick={() => {
              if (isAdmin) {
                setActiveDropdown(activeDropdown === 'facility' ? null : 'facility');
              }
            }}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all",
              ui.pill,
              !isAdmin && "cursor-default hover:bg-zinc-900"
            )}
          >
            <Globe className="w-3.5 h-3.5 opacity-70" />
            {currentBranchName}
            {isAdmin && <ChevronDown className="w-3 h-3 opacity-50" />}
          </button>

          {activeDropdown === 'facility' && isAdmin && (
            <div
              ref={facilityRef}
              className={cn(
                "absolute right-0 mt-2 w-64 z-50 rounded-2xl p-1 shadow-xl border",
                isDark ? "dark:bg-zinc-800 dark:border-white/10" : "bg-white border-black/5"
              )}
            >
              {availableBranches.map(b => (
                <button
                  key={b.id || b.branchId}
                  className={cn(
                    "w-full px-3 py-2 text-left text-xs rounded-lg hover:bg-black/5 dark:hover:bg-white/5",
                    (b.id || b.branchId) === activeOversightBranchId && "bg-zinc-700/50 text-synos-primary font-bold"
                  )}
                  onClick={() => {
                    setOversightBranch(b.id || b.branchId);
                    setActiveDropdown(null);
                    window.location.reload(); // Reload to refresh all data with new branch context
                  }}
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
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all",
              ui.pill
            )}
          >
            <Shield className="w-3.5 h-3.5 opacity-70" />
            {user?.name || "User"}
            <ChevronDown className="w-3 h-3 opacity-50" />
          </button>

          {activeDropdown === 'role' && (
            <div
              ref={roleRef}
              className={cn(
                "absolute right-0 mt-2 w-48 z-50 rounded-2xl p-1 shadow-xl border",
                isDark ? "dark:bg-zinc-800 dark:border-white/10" : "bg-white border-black/5"
              )}
            >
              <button
                className="w-full px-3 py-2 text-xs rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {isDark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                Theme: {theme}
              </button>

              <div className="h-px bg-black/5 dark:bg-white/5 my-1" />
              
              <button
                className="w-full px-3 py-2 text-xs rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2"
                onClick={() => { navigate('/my-hr'); setActiveDropdown(null); }}
              >
                <Shield className="w-3.5 h-3.5" />
                My HR
              </button>

              <button
                className="w-full px-3 py-2 text-xs rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2"
                onClick={() => { navigate('/my-hr/attendance'); setActiveDropdown(null); }}
              >
                <Clock className="w-3.5 h-3.5" />
                My Attendance
              </button>

              <button
                className="w-full px-3 py-2 text-xs rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2"
                onClick={() => { navigate('/my-hr/leave'); setActiveDropdown(null); }}
              >
                <Activity className="w-3.5 h-3.5" />
                Apply Leave
              </button>

              <button
                className="w-full px-3 py-2 text-xs rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2"
                onClick={() => { navigate('/my-hr/requests'); setActiveDropdown(null); }}
              >
                <Activity className="w-3.5 h-3.5 opacity-50" />
                My Requests
              </button>

              <div className="h-px bg-black/5 dark:bg-white/5 my-1" />

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
        <div className={cn(
          "flex items-center gap-4 px-4 py-1.5 rounded-xl",
          ui.timePill
        )}>
          <span className="font-mono text-xs dark:text-zinc-400 text-zinc-700">
            {dateDisplay} <span className="dark:text-zinc-200 text-zinc-900">{timeDisplay}</span>
          </span>

          <div className="w-px h-3 dark:bg-white/10 bg-black/10" />

          {isConnected ? (
            <span className="flex items-center gap-1 text-emerald-500 text-[10px] font-bold">
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
