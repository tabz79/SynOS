import React, { useState } from 'react';
import { X, IndianRupee, ShieldCheck, AlertCircle } from 'lucide-react';

export const RecordCollectionModal = ({ isOpen, onClose, onConfirm, entityName, totalAmount, pendingAmount }) => {
  const [amount, setAmount] = useState(pendingAmount);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(parseFloat(amount));
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-zinc-950 rounded-2xl border dark:border-zinc-800 border-zinc-200 shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b dark:border-zinc-900 border-zinc-100 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Record Collection</h2>
          <button onClick={onClose} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors">
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-tighter">Source Account</p>
            <p className="text-lg font-bold dark:text-zinc-100 text-zinc-900">{entityName}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border dark:border-zinc-800 border-zinc-100">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Total Bill</p>
              <p className="text-sm font-bold dark:text-zinc-300">₹{totalAmount}</p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border dark:border-zinc-800 border-zinc-100">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Pending Dues</p>
              <p className="text-sm font-bold text-rose-500">₹{pendingAmount}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-tighter">Amount to Collect (INR)</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                <IndianRupee className="w-4 h-4" />
              </div>
              <input 
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border dark:border-zinc-800 border-zinc-200 dark:bg-zinc-900 bg-white focus:ring-2 focus:ring-synos-primary/20 focus:border-synos-primary outline-none transition-all text-sm font-bold"
                placeholder="0.00"
              />
            </div>
            <p className="text-[10px] text-zinc-500 italic">Partial settlements are automatically tracked against the ledger.</p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-500">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p className="text-xs font-medium">{error}</p>
            </div>
          )}

          <div className="pt-2">
            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-synos-primary hover:bg-synos-primary/90 text-white rounded-xl font-bold text-sm shadow-lg shadow-synos-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              {isSubmitting ? "Processing..." : "Confirm & Record Collection"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
