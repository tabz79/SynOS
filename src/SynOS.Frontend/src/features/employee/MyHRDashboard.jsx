import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { Calendar, Clock, CheckCircle, AlertCircle, CalendarDays } from 'lucide-react';
import { AttendanceApi } from '@/api/attendance';

export function MyHRDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    presentDays: 0,
    absentDays: 0,
    pendingLeaves: 0,
    approvedLeaves: 0
  });
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [summaryRes, requestsList] = await Promise.all([
          AttendanceApi.getMySummary().catch(() => null),
          AttendanceApi.getMyRequests().catch(() => [])
        ]);

        const summary = summaryRes?.summary || {};
        const pendingCount = (requestsList || []).filter(r => r.status === 'Pending').length;
        const approvedCount = (requestsList || []).filter(r => r.status === 'Approved').length;

        setStats({
          presentDays: summary.totalPresentDays || 0,
          absentDays: summary.totalAbsentDays || 0,
          pendingLeaves: pendingCount,
          approvedLeaves: approvedCount
        });

        if (summaryRes?.employeeId) {
          const audit = await AttendanceApi.getAudit(summaryRes.employeeId).catch(() => null);
          setRecentLogs(audit?.events || []);
        }
      } catch (err) {
        console.error("Failed to load HR dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Welcome, {user?.name}</h1>
        <p className="text-zinc-500">Here's your workforce summary for this month.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          label="Present Days" 
          value={stats.presentDays} 
          icon={CheckCircle} 
          color="emerald" 
        />
        <StatCard 
          label="Absences" 
          value={stats.absentDays} 
          icon={AlertCircle} 
          color="rose" 
        />
        <StatCard 
          label="Leaves Taken" 
          value={stats.approvedLeaves} 
          icon={Calendar} 
          color="blue" 
        />
        <StatCard 
          label="Pending Req" 
          value={stats.pendingLeaves} 
          icon={Clock} 
          color="amber" 
        />
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <section className="synos-dept-card rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-zinc-900 dark:text-white mb-4 flex items-center gap-2 border-b dark:border-zinc-800 border-zinc-200 pb-3">
            <Clock className="w-4 h-4 text-indigo-500" />
            Recent Activity
          </h2>
          <div className="space-y-3">
            {recentLogs.length > 0 ? (
              recentLogs.slice(0, 5).map((log, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b dark:border-zinc-800/60 border-zinc-100 last:border-0">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{log.status}</span>
                    <span className="text-[10px] font-mono text-zinc-500">{new Date(log.timestamp).toLocaleDateString()}</span>
                  </div>
                  <StatusBadge status={log.status} />
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-zinc-500 text-xs italic">
                No recent activity recorded.
              </div>
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="synos-dept-card rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-zinc-900 dark:text-white mb-4 flex items-center gap-2 border-b dark:border-zinc-800 border-zinc-200 pb-3">
            <CalendarDays className="w-4 h-4 text-indigo-500" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 gap-3">
            <QuickActionButton 
              label="Apply for Leave" 
              description="Submit a new leave application" 
              path="/my-hr/leave"
            />
            <QuickActionButton 
              label="View Attendance History" 
              description="Detailed logs of your shifts" 
              path="/my-hr/attendance"
            />
            <QuickActionButton 
              label="Check Request Status" 
              description="Monitor approval of your leaves" 
              path="/my-hr/requests"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  const colors = {
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    rose: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
    blue: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
  };

  return (
    <div className="synos-dept-card rounded-2xl p-4 flex flex-col items-center text-center border border-zinc-200 dark:border-zinc-800">
      <div className={cn("p-2 rounded-xl mb-2 border", colors[color])}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-extrabold mt-0.5">{label}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    Present: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    Absent: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    PaidLeave: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    UnpaidLeave: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
    HalfDay: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  };

  const style = config[status] || "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";

  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-tight", style)}>
      {status}
    </span>
  );
}

function QuickActionButton({ label, description, path }) {
  return (
    <a 
      href={path}
      className="p-4 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 transition-all shadow-xs active:scale-95 flex flex-col text-left group"
    >
      <span className="text-xs font-extrabold text-indigo-700 dark:text-indigo-300 group-hover:text-indigo-600">{label}</span>
      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">{description}</span>
    </a>
  );
}
