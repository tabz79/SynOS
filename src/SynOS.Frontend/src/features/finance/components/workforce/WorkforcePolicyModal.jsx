import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, ShieldAlert, Save, Info } from 'lucide-react';
import { FinanceApi } from '@/api/finance';

const { WorkforceApi } = FinanceApi;

export function WorkforcePolicyModal({ isOpen, onClose, onSuccess }) {
    const [policy, setPolicy] = useState(null);
    const [isEnabled, setIsEnabled] = useState(true);
    const [quota, setQuota] = useState(2);
    const [syncAll, setSyncAll] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) loadPolicy();
    }, [isOpen]);

    const loadPolicy = async () => {
        setLoading(true);
        try {
            const policies = await WorkforceApi.getPolicies();
            const leavePolicy = policies.find(p => p.policyName === 'LeavePolicy');
            if (leavePolicy) {
                setPolicy(leavePolicy);
                setIsEnabled(leavePolicy.isEnabled);
                const config = JSON.parse(leavePolicy.configJson || '{}');
                setQuota(config.defaultMonthlyPaidLeave || 2);
            }
        } catch (error) {
            console.error("Failed to load policy:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSubmitting(true);
        try {
            const data = {
                policyId: policy?.policyId || '00000000-0000-0000-0000-000000000000',
                policyName: 'LeavePolicy',
                isEnabled,
                configJson: JSON.stringify({ defaultMonthlyPaidLeave: quota })
            };
            await WorkforceApi.updatePolicy(data);
            
            if (syncAll) {
                await WorkforceApi.syncQuotas(quota);
            }

            onSuccess?.();
            onClose();
        } catch (error) {
            alert("Failed to save policy: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border dark:border-zinc-800 border-zinc-200 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b dark:border-zinc-800 border-zinc-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold dark:text-white">Global Leave Policy</h2>
                        <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider font-bold">Workforce Compliance Rules</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    {/* Policy Status */}
                    <div className="flex items-center justify-between p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-950/50 border dark:border-zinc-800 border-zinc-100">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${isEnabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                {isEnabled ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                            </div>
                            <div>
                                <h3 className="text-sm font-bold dark:text-white">Policy Enforcement</h3>
                                <p className="text-xs text-zinc-500">{isEnabled ? 'Active: Rules are being applied to payroll' : 'Disabled: No leave restrictions'}</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsEnabled(!isEnabled)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isEnabled ? 'bg-synos-primary' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Monthly Paid Leave Quota (Per Staff)</label>
                            <div className="relative group">
                                <input 
                                    type="number"
                                    value={quota}
                                    onChange={(e) => setQuota(parseInt(e.target.value) || 0)}
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-200 rounded-2xl px-5 py-4 text-lg font-bold dark:text-white focus:ring-2 focus:ring-synos-primary/50 outline-none transition-all group-hover:border-zinc-300 dark:group-hover:border-zinc-700"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    <span className="text-xs font-bold text-zinc-400">Days / Month</span>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 mt-2 px-1">
                                <Info className="w-3.5 h-3.5 text-synos-primary mt-0.5" />
                                <p className="text-[10px] text-zinc-500 leading-relaxed">
                                    This value defines the standard paid leave entitlement for all active staff members. 
                                    Exceeding this limit within a payroll cycle will automatically trigger Loss of Pay (LOP) calculations.
                                </p>
                            </div>
                        </div>

                        {/* Batch Update Option */}
                        <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                                        <ShieldCheck className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold dark:text-amber-500">Mass Sync Quota</p>
                                        <p className="text-[10px] text-amber-700/60 dark:text-amber-500/60">Update all existing staff records</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSyncAll(!syncAll)}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${syncAll ? 'bg-amber-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                                >
                                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${syncAll ? 'translate-x-5' : 'translate-x-1'}`} />
                                </button>
                            </div>
                            
                            {syncAll && (
                                <div className="pt-2 border-t border-amber-500/10 animate-in fade-in slide-in-from-top-1">
                                    <p className="text-[10px] text-amber-700 dark:text-amber-500 font-medium italic">
                                        Warning: This will overwrite individual overrides in the employee master records.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-zinc-50 dark:bg-zinc-950/50 border-t dark:border-zinc-800 border-zinc-100 flex gap-3">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-3 rounded-2xl border dark:border-zinc-800 border-zinc-200 text-sm font-bold dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isSubmitting || loading}
                        className="flex-[2] py-3 bg-synos-primary text-white rounded-2xl text-sm font-bold shadow-lg shadow-synos-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? 'Saving Policy...' : (
                            <>
                                <Save className="w-4 h-4" />
                                Update Global Truth
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
