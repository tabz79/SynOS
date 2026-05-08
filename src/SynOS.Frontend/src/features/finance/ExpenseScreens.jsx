import React, { useState, useEffect } from 'react';
import { 
    Search, 
    Download, 
    ArrowRight, 
    Clock, 
    AlertCircle, 
    CheckCircle2,
    Building2,
    Package,
    Beaker
} from 'lucide-react';
import { RecordCollectionModal } from './components/RecordCollectionModal';
import { FinanceApi } from '@/api/finance';

// --- SHARED COMPONENTS ---

const StatusBadge = ({ status }) => {
    const styles = {
        Settled: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        PartiallyPaid: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        Pending: "bg-rose-500/10 text-rose-500 border-rose-500/20",
        Overdue: "bg-rose-600/10 text-rose-600 border-rose-600/20 font-bold"
    };

    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${styles[status] || "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"}`}>
            {status}
        </span>
    );
};

const FilterTab = ({ label, isActive, onClick }) => (
    <button 
        onClick={onClick}
        className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${isActive ? 'bg-white dark:bg-zinc-900 shadow-sm text-synos-primary' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'}`}
    >
        {label}
    </button>
);

// --- SCREENS ---

export const VendorPayablesScreen = () => {
    const [payables, setPayables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPayable, setSelectedPayable] = useState(null);
    const [activeFilter, setActiveFilter] = useState('All');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await FinanceApi.getVendorPayables();
            setPayables(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSettle = (p) => {
        setSelectedPayable(p);
        setIsModalOpen(true);
    };

    const confirmSettle = async (amount) => {
        await FinanceApi.settleVendorPayable(selectedPayable.vendorPayableId, amount);
        await loadData();
    };

    const filtered = payables.filter(p => activeFilter === 'All' || p.status === activeFilter);

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <Header title="Vendor Payables" description="Manage inventory procurement liabilities." />
            
            <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-900/50 rounded-xl w-fit">
                {['All', 'Pending', 'PartiallyPaid', 'Settled'].map(f => (
                    <FilterTab key={f} label={f} isActive={activeFilter === f} onClick={() => setActiveFilter(f)} />
                ))}
            </div>

            <div className="rounded-2xl border dark:border-zinc-800 border-zinc-200 bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
                {loading ? <LoadingState /> : (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b dark:border-zinc-900 border-zinc-100">
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Payable ID</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Amount Due</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Paid</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-center">Status</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Created</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-zinc-900 divide-zinc-100">
                            {filtered.map(p => (
                                <tr key={p.vendorPayableId} className="group hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                                    <td className="p-4 text-xs font-bold dark:text-zinc-200">{p.vendorPayableId.substring(0, 8)}</td>
                                    <td className="p-4 text-xs font-bold text-right">₹{p.amount.toLocaleString()}</td>
                                    <td className="p-4 text-xs font-semibold text-right text-rose-500">₹{p.amountPaid.toLocaleString()}</td>
                                    <td className="p-4 text-center"><StatusBadge status={p.status} /></td>
                                    <td className="p-4 text-xs text-zinc-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => handleSettle(p)} className="px-3 py-1.5 rounded-lg bg-synos-primary/10 text-synos-primary text-[10px] font-bold uppercase hover:bg-synos-primary hover:text-white transition-all">Settle</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {selectedPayable && (
                <RecordCollectionModal 
                    isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onConfirm={confirmSettle}
                    entityName={`Vendor Payable ${selectedPayable.vendorPayableId.substring(0, 8)}`}
                    totalAmount={selectedPayable.amount} pendingAmount={selectedPayable.amount - selectedPayable.amountPaid}
                    mode="payout"
                />
            )}
        </div>
    );
};

export const OverheadBillsScreen = () => {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selected, setSelected] = useState(null);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await FinanceApi.getOverheadExpenses();
            setExpenses(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSettle = (e) => {
        setSelected(e);
        setIsModalOpen(true);
    };

    const confirmSettle = async (amount) => {
        await FinanceApi.settleOverheadExpense(selected.overheadPayableId, amount);
        await loadData();
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <Header title="Overhead Obligations" description="Track recurring operational bills (Rent, Utilities, etc)." />
            
            <div className="rounded-2xl border dark:border-zinc-800 border-zinc-200 bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
                {loading ? <LoadingState /> : (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b dark:border-zinc-900 border-zinc-100">
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Description</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Amount</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-center">Status</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Due Date</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-zinc-900 divide-zinc-100">
                            {expenses.map(e => (
                                <tr key={e.overheadPayableId} className="group hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                                    <td className="p-4">
                                        <p className="text-xs font-bold dark:text-zinc-200">{e.description}</p>
                                        <p className="text-[10px] text-zinc-500 uppercase">{e.category}</p>
                                    </td>
                                    <td className="p-4 text-xs font-bold text-right">₹{e.amountDue.toLocaleString()}</td>
                                    <td className="p-4 text-center"><StatusBadge status={e.status} /></td>
                                    <td className="p-4 text-xs text-zinc-400">{new Date(e.dueDate).toLocaleDateString()}</td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => handleSettle(e)} className="px-3 py-1.5 rounded-lg bg-synos-primary/10 text-synos-primary text-[10px] font-bold uppercase hover:bg-synos-primary hover:text-white transition-all">Settle</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {selected && (
                <RecordCollectionModal 
                    isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onConfirm={confirmSettle}
                    entityName={selected.description}
                    totalAmount={selected.amountDue} pendingAmount={selected.amountDue - selected.amountPaid}
                    mode="payout"
                />
            )}
        </div>
    );
};

export const OutsourcedPayablesScreen = () => {
    const [payables, setPayables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selected, setSelected] = useState(null);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await FinanceApi.getOutsourcedPayables();
            setPayables(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSettle = (p) => {
        setSelected(p);
        setIsModalOpen(true);
    };

    const confirmSettle = async (amount) => {
        await FinanceApi.settleOutsourcedPayable(selected.id, amount);
        await loadData();
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <Header title="Outsourced Test Payables" description="Liabilities for tests sent to reference laboratories." />
            
            <div className="rounded-2xl border dark:border-zinc-800 border-zinc-200 bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
                {loading ? <LoadingState /> : (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b dark:border-zinc-900 border-zinc-100">
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Reference Lab</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Amount Due</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-center">Status</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Created</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-zinc-900 divide-zinc-100">
                            {payables.map(p => (
                                <tr key={p.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                                    <td className="p-4 text-xs font-bold dark:text-zinc-200">{p.referenceLabName || "Reference Lab"}</td>
                                    <td className="p-4 text-xs font-bold text-right">₹{p.amountDue.toLocaleString()}</td>
                                    <td className="p-4 text-center"><StatusBadge status={p.status} /></td>
                                    <td className="p-4 text-xs text-zinc-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => handleSettle(p)} className="px-3 py-1.5 rounded-lg bg-synos-primary/10 text-synos-primary text-[10px] font-bold uppercase hover:bg-synos-primary hover:text-white transition-all">Settle</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {selected && (
                <RecordCollectionModal 
                    isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onConfirm={confirmSettle}
                    entityName={selected.referenceLabName || "Reference Lab"}
                    totalAmount={selected.amountDue} pendingAmount={selected.amountDue - selected.amountPaid}
                    mode="payout"
                />
            )}
        </div>
    );
};

// --- PRIVATE HELPERS ---

const Header = ({ title, description }) => (
    <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold dark:text-white text-zinc-900">{title}</h1>
        <p className="text-sm text-zinc-500 font-medium">{description}</p>
    </div>
);

const LoadingState = () => (
    <div className="p-20 text-center text-zinc-500 animate-pulse font-medium">Synchronizing liability ledger...</div>
);
