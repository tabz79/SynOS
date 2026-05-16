import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

export function AttendanceExceptionModal({ isOpen, onClose, date, employeeId, currentStatus, rawStatus, initialNotes, onSave }) {
    const isFuture = new Date(date) > new Date();
    const [status, setStatus] = useState(rawStatus || currentStatus || (isFuture ? 'PaidLeave' : 'Present'));
    const [notes, setNotes] = useState(initialNotes || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSave({
                employeeId,
                date,
                status,
                notes
            });
            onClose();
        } catch (error) {
            alert("Failed to update status: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const options = [
        { id: 'Present', label: 'Present', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        { id: 'PaidLeave', label: 'Paid Leave', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        { id: 'UnpaidLeave', label: 'Unpaid Leave (LOP)', icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
        { id: 'Absent', label: 'Absent', icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-600/10' },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border dark:border-zinc-800 border-zinc-200 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b dark:border-zinc-800 border-zinc-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold dark:text-white">
                            {isFuture ? "Plan Advance Leave" : "Modify Attendance"}
                        </h2>
                        <p className="text-xs text-zinc-500 mt-1">
                            {isFuture ? "Schedule a leave fact for" : "Status for"} {new Date(date).toLocaleDateString(undefined, { dateStyle: 'full' })}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-3">
                        {options.map((opt) => {
                            const Icon = opt.icon;
                            const isActive = status === opt.id;
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setStatus(opt.id)}
                                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                                        isActive 
                                            ? `border-synos-primary ${opt.bg}` 
                                            : 'border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700'
                                    }`}
                                >
                                    <Icon className={`w-6 h-6 ${opt.color}`} />
                                    <span className="text-xs font-bold dark:text-zinc-300">{opt.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Notes / Reason</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Optional explanation for audit purposes..."
                            className="w-full bg-zinc-50 dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-synos-primary/50 outline-none min-h-[100px] resize-none transition-all"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-2xl border dark:border-zinc-800 border-zinc-200 text-sm font-bold dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 py-3 bg-synos-primary text-white rounded-2xl text-sm font-bold shadow-lg shadow-synos-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? "Saving..." : (isFuture ? "Schedule Leave" : "Update Truth")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
