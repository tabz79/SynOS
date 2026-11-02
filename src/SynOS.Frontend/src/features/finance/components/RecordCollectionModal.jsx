import React, { useState } from 'react';
import { X, IndianRupee, ShieldCheck, AlertCircle, Smartphone, CreditCard, Landmark } from 'lucide-react';

export const RecordCollectionModal = ({ isOpen, onClose, onConfirm, entityName, totalAmount, pendingAmount, mode = 'collection' }) => {
  const [amount, setAmount] = useState(pendingAmount);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(parseFloat(amount), paymentMethod, notes);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPayout = mode === 'payout';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-zinc-950 rounded-2xl border dark:border-zinc-800 border-zinc-200 shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b dark:border-zinc-900 border-zinc-100 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
            {isPayout ? 'Execute Payout' : 'Record Collection'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer">
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-tighter">
              {isPayout ? 'Beneficiary Partner' : 'Source Account'}
            </p>
            <p className="text-lg font-bold dark:text-zinc-100 text-zinc-900">{entityName}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border dark:border-zinc-800 border-zinc-100">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                {isPayout ? 'Commission Total' : 'Total Bill'}
              </p>
              <p className="text-sm font-bold dark:text-zinc-300">₹{Number(totalAmount || 0).toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border dark:border-zinc-800 border-zinc-100">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                {isPayout ? 'Payable Balance' : 'Pending Dues'}
              </p>
              <p className="text-sm font-bold text-rose-500">₹{Number(pendingAmount || 0).toLocaleString()}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-tighter">Amount to {isPayout ? 'Pay' : 'Collect'} (INR)</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                <IndianRupee className="w-4 h-4" />
              </div>
              <input 
                type="number"
                step="0.01"
                min="0.01"
                max={pendingAmount}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border dark:border-zinc-800 border-zinc-200 dark:bg-zinc-900 bg-white focus:ring-2 focus:ring-synos-primary/20 focus:border-synos-primary outline-none transition-all text-sm font-bold font-mono"
                placeholder="0.00"
              />
            </div>
            <p className="text-[10px] text-zinc-500 italic">Partial settlements are automatically tracked against the ledger.</p>
          </div>

          {/* Payment Method / Channel Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-tighter">Payment Channel</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'Cash', label: 'Cash', icon: IndianRupee },
                { id: 'UPI', label: 'UPI / POS', icon: Smartphone },
                { id: 'Card', label: 'Card', icon: CreditCard },
                { id: 'BankTransfer', label: 'Bank / NEFT', icon: Landmark }
              ].map(m => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`py-2 px-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? "bg-synos-primary text-white border-synos-primary shadow-xs"
                        : "bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-[10px] tracking-tight whitespace-nowrap">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes / Reference */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-tighter">Notes / Reference (Optional)</label>
            <input 
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Counter collection memo, UPI txn ID, or receipt ref"
              className="w-full px-3 py-2 text-xs rounded-xl border dark:border-zinc-800 border-zinc-200 dark:bg-zinc-900 bg-white outline-none focus:border-synos-primary transition-all text-zinc-800 dark:text-zinc-200"
            />
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
              className="w-full py-3 bg-synos-primary hover:bg-synos-primary/90 text-white rounded-xl font-bold text-sm shadow-lg shadow-synos-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              {isSubmitting ? "Processing..." : (isPayout ? "Confirm & Issue Payout" : "Confirm & Record Collection")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
