import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Save, Percent, Building2 } from 'lucide-react';
import { FinanceApi } from '@/api/finance';

const { WorkforceApi } = FinanceApi;

export function StatutoryConfigModal({ isOpen, onClose, onConfigUpdated }) {
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) loadConfigs();
    }, [isOpen]);

    const loadConfigs = async () => {
        setLoading(true);
        try {
            const data = await WorkforceApi.getStatutoryConfigs();
            setConfigs(data);
        } catch (error) {
            console.error("Failed to load statutory configs:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (config) => {
        setIsSubmitting(true);
        try {
            await WorkforceApi.updateStatutoryConfig(config);
            loadConfigs();
            onConfigUpdated();
        } catch (error) {
            console.error("Failed to update config:", error);
            alert("Update failed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b dark:border-zinc-900 border-zinc-100 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                            <ShieldCheck className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold dark:text-white">Statutory Configurations</h2>
                            <p className="text-xs text-zinc-500">Manage PF, ESI, and Tax deduction rates.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {loading ? (
                        <div className="py-12 text-center text-zinc-500">Loading configurations...</div>
                    ) : (
                        <div className="space-y-4">
                            {configs.length === 0 && (
                                <div className="p-8 text-center border-2 border-dashed dark:border-zinc-800 border-zinc-200 rounded-2xl">
                                    <p className="text-sm text-zinc-500">No statutory configurations found.</p>
                                    <button 
                                        onClick={() => handleUpdate({ componentName: 'PF', employeeRate: 0.12, employerRate: 0.13, isActive: true })}
                                        className="mt-4 text-synos-primary text-xs font-bold uppercase tracking-widest hover:underline"
                                    >
                                        Initialize Defaults (PF/ESI)
                                    </button>
                                </div>
                            )}
                            
                            {configs.map(config => (
                                <div key={config.configId} className="p-4 dark:bg-zinc-900 bg-zinc-50 border dark:border-zinc-800 border-zinc-200 rounded-2xl group transition-all hover:border-emerald-500/50">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-100 flex items-center justify-center font-black text-xs">
                                                {config.componentName}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm dark:text-white">{config.componentName} Calculation</h4>
                                                <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">Automatic Deduction Engine</p>
                                            </div>
                                        </div>
                                        <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${config.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-500/10 text-zinc-500'}`}>
                                            {config.isActive ? 'ACTIVE' : 'DISABLED'}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Employee Share (%)</label>
                                            <div className="relative">
                                                <input 
                                                    type="number"
                                                    value={config.employeeRate * 100}
                                                    onChange={e => {
                                                        const updated = configs.map(c => c.configId === config.configId ? {...c, employeeRate: parseFloat(e.target.value) / 100} : c);
                                                        setConfigs(updated);
                                                    }}
                                                    className="w-full bg-white dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-100 rounded-xl px-4 py-2 text-sm outline-none"
                                                />
                                                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400" />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Employer Share (%)</label>
                                            <div className="relative">
                                                <input 
                                                    type="number"
                                                    value={config.employerRate * 100}
                                                    onChange={e => {
                                                        const updated = configs.map(c => c.configId === config.configId ? {...c, employerRate: parseFloat(e.target.value) / 100} : c);
                                                        setConfigs(updated);
                                                    }}
                                                    className="w-full bg-white dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-100 rounded-xl px-4 py-2 text-sm outline-none"
                                                />
                                                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400" />
                                            </div>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => handleUpdate(config)}
                                        disabled={isSubmitting}
                                        className="w-full py-2 bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all hover:bg-emerald-500 dark:hover:bg-emerald-500 dark:hover:text-white"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border-t dark:border-zinc-900 border-zinc-100 flex justify-between items-center">
                    <p className="text-[10px] text-zinc-500 max-w-[200px]">Changes here will affect future payroll calculations only.</p>
                    <button onClick={onClose} className="px-6 py-2 rounded-xl text-sm font-bold dark:text-zinc-400 hover:text-synos-primary transition-colors">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
