import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { SystemBar } from '@/components/layout/SystemBar';
import { cn } from '@/lib/utils';
import { User, Calendar, FileText, History, ArrowLeft } from 'lucide-react';

export function StaffLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { id: 'dashboard', label: 'Overview', path: '/my-hr', icon: User },
    { id: 'attendance', label: 'Attendance', path: '/my-hr/attendance', icon: Calendar },
    { id: 'apply', label: 'Apply Leave', path: '/my-hr/leave', icon: FileText },
    { id: 'requests', label: 'My Requests', path: '/my-hr/requests', icon: History },
  ];

  return (
    <div className="h-screen w-screen bg-[#F5FCFF] dark:bg-zinc-950 flex flex-col overflow-hidden font-sans">
      <SystemBar />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation - Hidden on small screens, shown on desktop */}
        <div className="hidden md:flex w-64 flex-col border-r border-black/5 dark:border-white/5 bg-white dark:bg-zinc-900 p-4">
          <div className="mb-6 px-2">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">My HR</h2>
            <p className="text-xs text-zinc-500">Personal Workforce Space</p>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                    isActive 
                      ? "bg-synos-primary/10 text-synos-primary shadow-sm" 
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5"
                  )}
                >
                  <item.icon className={cn("w-4 h-4", isActive ? "text-synos-primary" : "opacity-60")} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-zinc-50 dark:bg-zinc-950/50">
          {/* Mobile Back Button */}
          <div className="md:hidden mb-4">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-zinc-500 text-sm py-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>

          <div className="max-w-4xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden flex items-center justify-around h-16 border-t border-black/5 dark:border-white/5 bg-white dark:bg-zinc-900 px-2 pb-safe">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-1 flex-1 py-1 transition-all",
                isActive ? "text-synos-primary" : "text-zinc-500"
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
