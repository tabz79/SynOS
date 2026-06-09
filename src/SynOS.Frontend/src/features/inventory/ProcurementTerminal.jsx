import React, { useState, useEffect } from 'react';
import { 
    FileText, 
    Plus, 
    Search, 
    ShoppingCart, 
    Truck, 
    Clock, 
    CheckCircle2, 
    AlertCircle,
    ArrowRight,
    Building2,
    Package,
    IndianRupee,
    X,
    Filter
} from 'lucide-react';
import { PurchasingApi } from '@/api/purchasing';
import { FinanceApi } from '@/api/finance';
import { InventoryApi } from '@/api/inventory';
import { PODetailTerminal } from './PODetailTerminal';

export const ProcurementTerminal = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPO, setSelectedPO] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAddVendorModal, setShowAddVendorModal] = useState(false);
    const [vendors, setVendors] = useState([]);
    const [selectedVendor, setSelectedVendor] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [poList, vendorList] = await Promise.all([
                PurchasingApi.getPurchaseOrders(),
                FinanceApi.getVendors()
            ]);
            setOrders(poList);
            setVendors(vendorList);
        } catch (err) {
            console.error("Failed to load procurement data:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePO = async () => {
        if (!selectedVendor) return;
        try {
            const newPO = await PurchasingApi.createPurchaseOrder(selectedVendor);
            setOrders([newPO, ...orders]);
            setShowCreateModal(false);
            setSelectedVendor('');
        } catch (err) {
            alert(err.message);
        }
    };

    if (selectedPO) {
        return <PODetailTerminal poId={selectedPO} onBack={() => setSelectedPO(null)} />;
    }

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <h1 className="text-xl font-bold dark:text-white text-zinc-900 flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-synos-primary" />
                        Procurement Terminal
                    </h1>
                    <p className="text-xs text-zinc-500 tracking-tight">Formalizing commitments and managing supplier obligations.</p>
                </div>
                <button 
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-synos-primary text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-synos-primary/20 hover:scale-105 transition-all"
                >
                    <Plus className="w-4 h-4" />
                    New Purchase Order
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border dark:border-zinc-800 border-zinc-200 bg-white dark:bg-zinc-900 shadow-sm">
                    <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Active POs</p>
                    <p className="text-lg font-semibold text-synos-primary">{orders.filter(o => o.status !== 'Closed').length}</p>
                </div>
                <div className="p-4 rounded-xl border dark:border-zinc-800 border-zinc-200 bg-white dark:bg-zinc-900 shadow-sm">
                    <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Pending Receipt</p>
                    <p className="text-lg font-semibold text-amber-500">{orders.filter(o => o.status === 'Approved').length}</p>
                </div>
                <div className="p-4 rounded-xl border dark:border-zinc-800 border-zinc-200 bg-white dark:bg-zinc-900 shadow-sm">
                    <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Order Value (Total)</p>
                    <p className="text-lg font-semibold text-zinc-900 dark:text-white">₹--</p>
                </div>
                <div className="p-4 rounded-xl border dark:border-zinc-800 border-zinc-200 bg-white dark:bg-zinc-900 shadow-sm">
                    <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Suppliers</p>
                    <p className="text-lg font-semibold text-zinc-900 dark:text-white">{vendors.length}</p>
                </div>
            </div>

            {/* Main PO Feed */}
            <div className="bg-white dark:bg-zinc-900/20 border dark:border-zinc-800 border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b dark:border-zinc-800 border-zinc-200 bg-zinc-50/50 dark:bg-zinc-900/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Search className="w-3.5 h-3.5 text-zinc-400" />
                        <input 
                            type="text" 
                            placeholder="Search PO#, Vendor or Item..." 
                            className="bg-transparent border-none text-xs focus:ring-0 w-64 dark:text-zinc-300"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="p-1.5 rounded-lg border dark:border-zinc-800 border-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                            <Filter className="w-3.5 h-3.5 text-zinc-500" />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b dark:border-zinc-800 border-zinc-200 bg-zinc-50/30 dark:bg-zinc-900/10">
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Order ID & Date</th>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Vendor</th>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Status</th>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">Items</th>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-zinc-800 divide-zinc-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-xs text-zinc-500 animate-pulse italic">Synchronizing with central procurement...</td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-xs text-zinc-500 italic">No purchase orders found. Start by creating one.</td>
                                </tr>
                            ) : (
                                orders.map(po => (
                                    <tr key={po.poId} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-mono font-bold text-synos-primary">PO-{po.poId.substring(0, 8).toUpperCase()}</span>
                                                <span className="text-[10px] text-zinc-500">{new Date(po.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                                    <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                                                </div>
                                                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">{po.supplier?.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter border ${
                                                po.status === 'Draft' ? 'bg-zinc-100 text-zinc-500 border-zinc-200' :
                                                po.status === 'Approved' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                                                po.status === 'Closed' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                                'bg-zinc-100 text-zinc-500 border-zinc-200'
                                            }`}>
                                                {po.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-xs font-bold text-zinc-500">{po.poItems?.length || 0}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => setSelectedPO(po.poId)}
                                                className="text-synos-primary hover:underline text-xs font-bold flex items-center gap-1 ml-auto"
                                            >
                                                Manage Order
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create PO Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-zinc-950 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-zinc-200 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b dark:border-zinc-800 border-zinc-200 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold dark:text-white tracking-tight">Initiate Order</h3>
                                <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">Select your supplying partner</p>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl">
                                <X className="w-5 h-5 text-zinc-400" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-4">
                                    <label className="text-[10px] font-semibold uppercase text-zinc-500 tracking-wider">Select Vendor</label>
                                    <button 
                                        onClick={() => setShowAddVendorModal(true)}
                                        className="text-[10px] text-synos-primary font-bold uppercase hover:underline"
                                    >
                                        + New Supplier
                                    </button>
                                </div>
                                <select 
                                    value={selectedVendor}
                                    onChange={(e) => setSelectedVendor(e.target.value)}
                                    className="w-full bg-zinc-100 dark:bg-white/5 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 ring-synos-primary outline-none transition-all dark:text-white"
                                >
                                    <option value="">Choose Supplier...</option>
                                    {vendors.map(v => (
                                        <option key={v.supplierId} value={v.supplierId}>{v.name}</option>
                                    ))}
                                </select>
                            </div>

                            <button 
                                onClick={handleCreatePO}
                                disabled={!selectedVendor}
                                className="w-full bg-synos-primary text-white font-semibold py-4 rounded-2xl shadow-xl shadow-synos-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                Generate Draft PO
                                <FileText className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Add Vendor Modal */}
            {showAddVendorModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
                    <div className="bg-white dark:bg-zinc-950 w-full max-w-sm rounded-[2.5rem] shadow-2xl border border-zinc-200 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b dark:border-zinc-800 border-zinc-200 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold dark:text-white tracking-tight">Onboard Supplier</h3>
                                <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">Quick master data entry</p>
                            </div>
                            <button onClick={() => setShowAddVendorModal(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl">
                                <X className="w-5 h-5 text-zinc-400" />
                            </button>
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const formData = new FormData(e.target);
                            try {
                                const newVendor = await FinanceApi.createVendor({
                                    name: formData.get('name'),
                                    category: formData.get('category'),
                                    email: formData.get('email')
                                });
                                setVendors([newVendor, ...vendors]);
                                setSelectedVendor(newVendor.supplierId);
                                setShowAddVendorModal(false);
                            } catch (err) {
                                alert(err.message);
                            }
                        }} className="p-8 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold uppercase text-zinc-500 ml-4 tracking-wider">Company Name</label>
                                <input name="name" required className="w-full bg-zinc-100 dark:bg-white/5 border-none rounded-2xl px-6 py-4 text-xs font-medium focus:ring-2 ring-synos-primary outline-none transition-all dark:text-white" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold uppercase text-zinc-500 ml-4 tracking-wider">Category</label>
                                <input name="category" placeholder="Medical / Lab / General" className="w-full bg-zinc-100 dark:bg-white/5 border-none rounded-2xl px-6 py-4 text-xs font-medium focus:ring-2 ring-synos-primary outline-none transition-all dark:text-white" />
                            </div>
                            <button type="submit" className="w-full bg-synos-primary text-white font-semibold py-4 rounded-2xl shadow-xl shadow-synos-primary/20 hover:scale-[1.02] transition-all">
                                Register & Select
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
