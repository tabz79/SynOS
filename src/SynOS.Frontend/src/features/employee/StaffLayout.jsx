import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { SystemBar } from '@/components/layout/SystemBar';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { User, Calendar, FileText, History, ArrowLeft, Shield } from 'lucide-react';

export function StaffLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Overview', path: '/my-hr', icon: User },
    { id: 'attendance', label: 'Attendance', path: '/my-hr/attendance', icon: Calendar },
    { id: 'apply', label: 'Apply Leave', path: '/my-hr/leave', icon: FileText },
    { id: 'requests', label: 'My Requests', path: '/my-hr/requests', icon: History },
  ];

  return (
    <div className="h-screen w-screen bg-[#F8FAFC] dark:bg-zinc-950 flex flex-col overflow-hidden font-sans relative">
      {/* High-Complexity Atmospheric Accents matching Admin Layout */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-[0] dark:hidden">
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAt66YlAAAAB3RSTlMAo7S066u0v76zAAABJklEQVQ4jXWSwW7DIAyGvRNoV9HeIdp7B2nvHaK9d7D27lX836VpY6t0p8oHicDHP4Z99qGf96HvX+h7NfSmX8U8z9M0z6+P/m8X6fB6L78XpX4X5X4O6fc8l7e8n+T9KO87ed+m77pP33Wfvuu6T991nb7rum/ed5+87z55333yvvvkfffJ++6T990n77pP33Wfvus6fdd13rrvu67rvXXfd13ne+u+77rO99Z933Wdt67rtnWdt67rtnWdt67rtjW999Y9ve9997mPu8997uPus9fZZ6+zz15nn73OPnudvU9f0+v0Nb1OX9Pr9DW9Tm9O9vTmaE5vjua09f7o/db7rff7f9H3v6XvP9TzL/X+U8+/1fMv9fw7fQ==")` }} />
        <div className="absolute top-[-15%] left-[-5%] w-[50%] h-[55%]" style={{ background: 'radial-gradient(circle at 40% 40%, rgba(6, 182, 212, 0.05) 0%, rgba(6, 182, 212, 0) 70%)' }} />
        <div className="absolute top-[-10%] right-[10%] w-[45%] h-[50%]" style={{ background: 'radial-gradient(circle at center, rgba(37, 99, 235, 0.03) 0%, rgba(37, 99, 235, 0) 80%)' }} />
        <div className="absolute top-[-25%] right-[-10%] w-[60%] h-[65%]" style={{ background: 'radial-gradient(circle at 60% 30%, rgba(52, 211, 153, 0.04) 0%, rgba(52, 211, 153, 0) 70%)' }} />
      </div>

      <SystemBar syncStatus="Synced" />
      
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Sidebar - STATIC FROST MODEL */}
        <aside 
          style={{ 
            backgroundImage: `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAt66YlAAAAB3RSTlMAo7S066u0v76zAAABJklEQVQ4jXWSwW7DIAyGvRNoV9HeIdp7B2nvHaK9d7D27lX836VpY6t0p8oHicDHP4Z99qGf96HvX+h7NfSmX8U8z9M0z6+P/m8X6fB6L78XpX4X5X4O6fc8l7e8n+T9KO87ed+m77pP33Wfvuu6T991nb7rum/ed5+87z55333yvvvkfffJ++6T990n77pP33Wfvus6fdd13rrvu67rvXXfd13ne+u+77rO99Z933Wdt67rtnWdt67rtnWdt67rtjW999Y9ve9997mPu8997uPus9fZZ6+zz15nn73OPnudvU9f0+v0Nb1OX9Pr9DW9Tm9O9vTmaE5vjua09f7o/db7rff7f9H3v6XvP9TzL/X+U8+/1fMv9fw7fQ==")`,
            backgroundBlendMode: 'overlay',
            backgroundRepeat: 'repeat'
          }}
          className="hidden md:flex w-64 flex-col border-r border-zinc-200 dark:border-zinc-800/80 bg-gradient-to-b from-white/98 to-zinc-50/95 dark:bg-zinc-950 p-4 justify-between"
        >
          <div>
            <div className="mb-6 px-2 pb-4 border-b border-zinc-200/80 dark:border-zinc-800/60">
              <h2 className="text-base font-extrabold tracking-tight text-zinc-900 dark:text-white uppercase">My HR Portal</h2>
              <p className="text-xs font-medium text-zinc-500 mt-0.5">Personal Workforce Space</p>
            </div>

            <nav className="space-y-1">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border",
                      isActive 
                        ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 shadow-xs" 
                        : "border-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white"
                    )}
                  >
                    <item.icon className={cn("w-4 h-4", isActive ? "text-indigo-600 dark:text-indigo-400" : "opacity-60")} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sidebar User Chip */}
          <div className="pt-4 border-t border-zinc-200/80 dark:border-zinc-800/60 px-2 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center">
              {user?.name ? user.name.substring(0, 2).toUpperCase() : 'HR'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{user?.name || 'Staff User'}</p>
              <p className="text-[10px] text-zinc-500 truncate">{user?.role || 'Employee'}</p>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {/* Mobile Back Button */}
          <div className="md:hidden mb-4">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-zinc-500 text-xs font-bold py-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>

          <div className="w-full space-y-6 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden flex items-center justify-around h-16 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 pb-safe z-20">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-1 flex-1 py-1 transition-all",
                isActive ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-zinc-500"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
