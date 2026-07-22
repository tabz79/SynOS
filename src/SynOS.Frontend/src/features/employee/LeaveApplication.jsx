import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AttendanceApi } from '@/api/attendance';
import { cn } from '@/lib/utils';
import { Send, AlertCircle, CheckCircle } from 'lucide-react';

export function LeaveApplication() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    leaveType: 'Casual',
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  const leaveTypes = [
    'Sick', 'Casual', 'Earned', 'LossOfPay', 
    'Emergency', 'InfectionExposure', 'Quarantine', 'OnCallCompensatoryOff'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: 'loading', message: 'Submitting application...' });

    try {
      await AttendanceApi.submitLeave({
        ...formData,
        employeeId: user.employeeId,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
      });
      setStatus({ type: 'success', message: 'Leave application submitted successfully!' });
      setFormData({ leaveType: 'Casual', startDate: '', endDate: '', reason: '' });
    } catch (err) {
      console.error("Failed to submit leave:", err);
      setStatus({ type: 'error', message: 'Failed to submit application. Please try again.' });
    }
  };

  return (
    <div className="w-full space-y-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Apply for Leave</h1>
        <p className="text-zinc-500">Submit your leave request for supervisor approval.</p>
      </header>

      <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-2xl p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Leave Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Leave Type</label>
              <select
                required
                value={formData.leaveType}
                onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                className="w-full bg-zinc-50 dark:bg-black border border-black/5 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-synos-primary/20 transition-all"
              >
                {leaveTypes.map(t => (
                  <option key={t} value={t}>{t.replace(/([A-Z])/g, ' $1').trim()}</option>
                ))}
              </select>
            </div>

            {/* Empty space for grid alignment */}
            <div className="hidden md:block"></div>

            {/* Start Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Start Date</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full bg-zinc-50 dark:bg-black border border-black/5 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-synos-primary/20 transition-all"
              />
            </div>

            {/* End Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">End Date</label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full bg-zinc-50 dark:bg-black border border-black/5 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-synos-primary/20 transition-all"
              />
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Reason / Notes</label>
            <textarea
              rows={4}
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Briefly explain the reason for your leave..."
              className="w-full bg-zinc-50 dark:bg-black border border-black/5 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-synos-primary/20 transition-all resize-none"
            />
          </div>

          {/* Status Message */}
          {status.type !== 'idle' && (
            <div className={cn(
              "p-4 rounded-xl flex items-center gap-3 text-sm font-medium",
              status.type === 'success' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
              status.type === 'error' ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" :
              "bg-zinc-500/10 text-zinc-500 border border-zinc-500/20"
            )}>
              {status.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {status.message}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={status.type === 'loading'}
            className="w-full bg-synos-primary hover:bg-synos-primary/90 text-white font-bold py-3 rounded-xl shadow-lg shadow-synos-primary/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            Submit Application
          </button>
        </form>
      </div>
    </div>
  );
}
