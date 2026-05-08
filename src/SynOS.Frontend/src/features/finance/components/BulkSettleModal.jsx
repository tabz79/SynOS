import React, { useState } from 'react';
import { FinanceUtils } from './FinanceUtils';

export const BulkSettleModal = ({ isOpen, onClose, onConfirm, partnerName, selectedBills }) => {
    const [amount, setAmount] = useState('');
    const totalDue = selectedBills.reduce((acc, bill) => acc + (bill.amount - bill.amountReceived), 0);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border dark:border-zinc-800 border-zinc-200 overflow-hidden scale-in duration-300">
                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold dark:text-white text-zinc-900">Bulk Settlement</h2>
                        <p className="text-sm text-zinc-500 font-medium">Processing payment for <span className="text-synos-primary font-bold">{partnerName}</span></p>
                    </div>

                    <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/50 border dark:border-zinc-800 border-zinc-200 space-y-3">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-500">Selected Bills</span>
                            <span className="font-bold dark:text-zinc-300">{selectedBills.length}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-500">Total Outstanding</span>
                            <span className="font-bold text-rose-500">{FinanceUtils.formatCurrency(totalDue)}</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1">Settlement Amount (₹)</label>
                            <input 
                                type="number" 
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="Enter total amount received"
                                className="w-full px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-950 border-2 border-transparent focus:border-synos-primary outline-none transition-all dark:text-white font-bold text-lg"
                            />
                            <div className="flex gap-2 pt-2">
                                {[0.5, 1].map(pct => (
                                    <button 
                                        key={pct}
                                        onClick={() => setAmount((totalDue * pct).toFixed(2))}
                                        className="flex-1 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                                    >
                                        {pct * 100}% Dues
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                            <p className="text-[10px] text-amber-500 leading-relaxed font-medium">
                                <span className="font-bold uppercase mr-1">Distribution:</span>
                                Funds will be applied to the oldest bills first (FIFO) until the amount is exhausted.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button 
                            onClick={onClose}
                            className="flex-1 py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-sm font-bold text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            disabled={!amount || parseFloat(amount) <= 0}
                            onClick={() => onConfirm(parseFloat(amount))}
                            className="flex-[2] py-3 rounded-2xl bg-synos-primary text-sm font-bold text-white shadow-lg shadow-synos-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale disabled:hover:scale-100"
                        >
                            Process Settlement
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
