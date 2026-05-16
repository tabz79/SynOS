import React, { useState, useEffect } from 'react';
import { X, Wallet, Save, User, Calendar, IndianRupee } from 'lucide-react';
import { FinanceApi } from '@/api/finance';

const { WorkforceApi } = FinanceApi;

export function AdvanceRequestModal({ isOpen, onClose, staffList, onAdvanceAdded }) {
    const [formData, setFormData] = useState({
        employeeId: '',
        amount: '',
        reason: '',
        repaymentTerms: 'Deduct from next payroll',
        requestedAt: new Date().toISOString().split('T')[0]
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await WorkforceApi.requestAdvance({
                employeeId: formData.employeeId,
                amount: parseFloat(formData.amount),
                purpose: formData.reason,
                requestedAt: new Date(formData.requestedAt).toISOString(),
                status: "Pending"
            });
            onAdvanceAdded();
            onClose();
        } catch (error) {
            console.error("Failed to record advance:", error);
            alert("Error recording advance request.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b dark:border-zinc-900 border-zinc-100 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-amber-500/10 rounded-xl">
                            <Wallet className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold dark:text-white">Record Salary Advance</h2>
                            <p className="text-xs text-zinc-500">Log a manual advance payment for an employee.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Select Employee</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <select 
                                required
                                value={formData.employeeId}
                                onChange={e => setFormData({...formData, employeeId: e.target.value})}
                                className="w-full bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                            >
                                <option value="">Select an employee...</option>
                                {staffList.map(s => (
                                    <option key={s.employeeId} value={s.employeeId}>
                                        {s.firstName} {s.lastName} ({s.jobTitle})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Amount (₹)</label>
                            <div className="relative">
                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <input 
                                    type="number"
                                    required
                                    value={formData.amount}
                                    onChange={e => setFormData({...formData, amount: e.target.value})}
                                    className="w-full bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Request Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <input 
                                    type="date"
                                    required
                                    value={formData.requestedAt}
                                    onChange={e => setFormData({...formData, requestedAt: e.target.value})}
                                    className="w-full bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Reason / Notes</label>
                        <textarea 
                            value={formData.reason}
                            onChange={e => setFormData({...formData, reason: e.target.value})}
                            className="w-full bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500/50 transition-all min-h-[80px]"
                            placeholder="Brief reason for the advance..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t dark:border-zinc-900 border-zinc-100">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl border dark:border-zinc-800 border-zinc-200 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={isSubmitting || !formData.employeeId}
                            className="px-8 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Recording...' : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Issue Advance
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
