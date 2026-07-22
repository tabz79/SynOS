import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle2, AlertCircle, FileText, Check, X, ShieldAlert, CalendarDays } from 'lucide-react';
import { AttendanceApi } from '@/api/attendance';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { AttendanceCalendar } from '../finance/components/workforce/AttendanceCalendar';

export function MyAttendance() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });

  const loadAttendance = async () => {
    try {
      setLoading(true);
      const res = await AttendanceApi.getMySummary(selectedMonth);
      setData(res);
    } catch (err) {
      console.error("Failed to load attendance summary:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [selectedMonth]);

  const summary = data?.summary || {};
  const dailyStatuses = summary?.dailyStatuses || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-synos-primary" />
            Attendance History & Roster
          </h1>
          <p className="text-sm text-zinc-500">View your daily shift records, present days, and leave facts.</p>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="month"
            value={selectedMonth.substring(0, 7)}
            onChange={(e) => setSelectedMonth(`${e.target.value}-01`)}
            className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-200 px-4 py-2 rounded-xl text-sm font-bold outline-none focus:border-synos-primary"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Days Present</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{summary.totalPresentDays || 0}</p>
        </div>
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Approved Leaves</p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{summary.totalLeaveDays || 0}</p>
        </div>
        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
          <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Planned Leaves</p>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{summary.totalPlannedLeaves || 0}</p>
        </div>
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
          <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Total Absences / LOP</p>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{summary.totalAbsentDays || 0}</p>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-6">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-synos-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-zinc-500">Loading attendance roster...</p>
            </div>
          </div>
        ) : (
          <AttendanceCalendar statuses={dailyStatuses} isLocked={false} />
        )}
      </div>
    </div>
  );
}

export function RequestStatus() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const list = await AttendanceApi.getMyRequests();
      setRequests(list || []);
    } catch (err) {
      console.error("Failed to load leave requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-synos-primary" />
            My Leave Applications
          </h1>
          <p className="text-sm text-zinc-500">Track the status of your submitted leave requests and manager reviews.</p>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-synos-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-zinc-500">Loading your applications...</p>
          </div>
        </div>
      ) : requests.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-2xl">
          <CalendarDays className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">No Leave Applications Found</h3>
          <p className="text-xs text-zinc-500 mt-1">You have not submitted any leave requests yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {requests.map((req) => {
            const isPending = req.status === 'Pending';
            const isApproved = req.status === 'Approved';
            const isRejected = req.status === 'Rejected';

            let statusBadge = (
              <span className="px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold rounded-full flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Pending Review
              </span>
            );

            if (isApproved) {
              statusBadge = (
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-full flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> Approved
                </span>
              );
            } else if (isRejected) {
              statusBadge = (
                <span className="px-3 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold rounded-full flex items-center gap-1.5">
                  <X className="w-3.5 h-3.5" /> Rejected
                </span>
              );
            }

            return (
              <div key={req.leaveRequestId} className="p-5 bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-2xl shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-synos-primary uppercase tracking-wider">{req.leaveType} Leave</span>
                    <p className="text-xs text-zinc-400 mt-0.5">Applied on {new Date(req.appliedAt).toLocaleDateString()}</p>
                  </div>
                  {statusBadge}
                </div>

                <div className="space-y-2 py-2 border-y border-black/5 dark:border-white/5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Duration</span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-200">
                      {new Date(req.startDate).toLocaleDateString()} &mdash; {new Date(req.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  {req.reason && (
                    <div className="flex flex-col gap-1">
                      <span className="text-zinc-500">Reason</span>
                      <p className="text-zinc-700 dark:text-zinc-300 italic bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-lg border border-black/5 dark:border-white/5">
                        "{req.reason}"
                      </p>
                    </div>
                  )}
                </div>

                {req.managerNotes && (
                  <div className="text-xs bg-amber-500/5 border border-amber-500/20 p-2.5 rounded-lg text-amber-700 dark:text-amber-300">
                    <span className="font-bold">Manager Note:</span> {req.managerNotes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
