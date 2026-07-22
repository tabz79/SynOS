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
        <section className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-zinc-400" />
            Recent Activity
          </h2>
          <div className="space-y-4">
            {recentLogs.length > 0 ? (
              recentLogs.slice(0, 5).map((log, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-black/5 dark:border-white/5 last:border-0">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{log.status}</span>
                    <span className="text-xs text-zinc-500">{new Date(log.timestamp).toLocaleDateString()}</span>
                  </div>
                  <StatusBadge status={log.status} />
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-zinc-500 text-sm italic">
                No recent activity recorded.
              </div>
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-zinc-400" />
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
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    rose: "text-rose-500 bg-rose-500/10 border-rose-500/20",
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    amber: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-2xl p-4 shadow-sm flex flex-col items-center text-center">
      <div className={cn("p-2 rounded-xl mb-2 border", colors[color])}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-2xl font-black text-zinc-900 dark:text-white">{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">{label}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    Present: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    Absent: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    PaidLeave: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    UnpaidLeave: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
    HalfDay: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  };

  const style = config[status] || "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";

  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-tight", style)}>
      {status}
    </span>
  );
}

function QuickActionButton({ label, description, path }) {
  return (
    <a 
      href={path}
      className="flex flex-col p-4 rounded-xl border border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-all"
    >
      <span className="text-sm font-bold text-zinc-900 dark:text-white">{label}</span>
      <span className="text-[11px] text-zinc-500">{description}</span>
    </a>
  );
}
