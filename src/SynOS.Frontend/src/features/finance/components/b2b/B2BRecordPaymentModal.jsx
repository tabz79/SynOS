import React, { useState, useEffect } from 'react';
import { 
    X, 
    CreditCard, 
    Building2, 
    Calendar, 
    FileText, 
    CheckCircle2, 
    AlertCircle, 
    DollarSign,
    ArrowRight,
    Loader2
} from 'lucide-react';
import { FinanceApi } from '@/api/finance';

export const B2BRecordPaymentModal = ({ 
    isOpen, 
    onClose, 
    account, 
    accounts = [], 
    onSuccess 
}) => {
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [amount, setAmount] = useState('');
    const [paymentMode, setPaymentMode] = useState('BankTransfer');
    const [reference, setReference] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [accountDetail, setAccountDetail] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    useEffect(() => {
        if (account?.accountId) {
            setSelectedAccountId(account.accountId);
        } else if (accounts.length > 0 && !selectedAccountId) {
            setSelectedAccountId(accounts[0].accountId);
        }
    }, [account, accounts]);

    useEffect(() => {
        if (!selectedAccountId || !isOpen) return;
        const fetchDetail = async () => {
            try {
                setLoadingDetail(true);
                const res = await FinanceApi.getB2BAccountDetail(selectedAccountId);
                setAccountDetail(res);
                if (res?.financials?.outstanding) {
                    setAmount(res.financials.outstanding.toString());
                }
            } catch (err) {
                console.error("Failed to fetch account detail for payment", err);
            } finally {
                setLoadingDetail(false);
            }
        };
        fetchDetail();
    }, [selectedAccountId, isOpen]);

    if (!isOpen) return null;

    const currentAccount = accounts.find(a => a.accountId === selectedAccountId) || account;
    const openBills = accountDetail?.bills?.filter(b => b.status !== 'Settled') || [];

    const handleSettle = async (e) => {
        e.preventDefault();
        const amt = parseFloat(amount);
        if (isNaN(amt) || amt <= 0) {
            alert("Please enter a valid payment amount.");
            return;
        }

        try {
            setSubmitting(true);
            const factIds = openBills.map(b => b.factId);
            await FinanceApi.settleBulkPartnerReceivables(
                selectedAccountId, 
                factIds, 
                amt, 
                paymentMode, 
                reference.trim() || undefined
            );
            onSuccess && onSuccess();
            onClose();
        } catch (err) {
            console.error("Settlement failed", err);
            alert("Payment settlement failed: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 shadow-2xs">
                            <CreditCard size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                                Record B2B Payment Receipt
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                Automated FIFO allocation across outstanding invoices
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSettle} className="p-6 space-y-4">
                    {/* Account Selector */}
                    <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                            Debtor Account (Hospital / Clinic / Corporate)
                        </label>
                        <select
                            value={selectedAccountId}
                            onChange={(e) => setSelectedAccountId(e.target.value)}
                            disabled={Boolean(account?.accountId)}
                            className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500 shadow-2xs"
                        >
                            {accounts.map(a => (
                                <option key={a.accountId} value={a.accountId}>
                                    {a.accountName} ({a.accountType}) — Due: ₹{(a.outstanding || 0).toLocaleString()}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Account Balance Highlight */}
                    {accountDetail && (
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/60 flex items-center justify-between text-xs">
                            <div>
                                <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Outstanding</span>
                                <span className="text-sm font-black text-rose-600 dark:text-rose-400 tabular-nums">
                                    ₹{(accountDetail.financials?.outstanding || 0).toLocaleString()}
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] text-slate-400 uppercase font-bold block">Unpaid Bills</span>
                                <span className="font-bold text-slate-800 dark:text-zinc-200">
                                    {openBills.length} Invoices
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Amount & Mode */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                                Amount Received (₹) *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                required
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full p-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-black text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500 shadow-2xs"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                                Payment Mode *
                            </label>
                            <select
                                value={paymentMode}
                                onChange={(e) => setPaymentMode(e.target.value)}
                                className="w-full p-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500 shadow-2xs"
                            >
                                <option value="BankTransfer">Bank Transfer / NEFT / RTGS</option>
                                <option value="Cheque">Cheque / Demand Draft</option>
                                <option value="UPI">UPI / Digital QR</option>
                                <option value="Cash">Cash at Lab Counter</option>
                            </select>
                        </div>
                    </div>

                    {/* Reference / UTR */}
                    <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                            Reference / UTR / Cheque Number
                        </label>
                        <input
                            type="text"
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            placeholder="e.g. UTR123456789 or CHQ-004521"
                            className="w-full p-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500 shadow-2xs"
                        />
                    </div>

                    {/* FIFO Allocation Preview Note */}
                    <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 text-[11px] text-indigo-700 dark:text-indigo-300 leading-relaxed flex items-start gap-2">
                        <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                        <div>
                            Payment will be applied chronologically starting from the oldest outstanding invoice (FIFO).
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-synos-primary text-white text-xs font-bold hover:brightness-105 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                            {submitting && <Loader2 size={14} className="animate-spin" />}
                            <span>Confirm & Settle Dues</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
