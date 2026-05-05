import { useState, useEffect } from 'react'
import { SystemBar } from '@/components/layout/SystemBar'
import { RealitySummary } from '@/components/layout/RealitySummary'
import { ActionQueue, ActionQueueHeader } from '@/components/layout/ActionQueue'
import { 
    Package, 
    AlertCircle, 
    CheckCircle2, 
    Truck, 
    LayoutDashboard, 
    ListFilter, 
    PlusCircle, 
    ClipboardList, 
    History,
    XCircle,
    Zap,
    Plus,
    X
} from 'lucide-react'
import { SignalRService } from '@/lib/signalr'
import { cn } from '@/lib/utils'
import { InventoryApi } from '@/api/inventory'
import { OpeningStockOnboarding } from './OpeningStockOnboarding'

const QuickItemModal = ({ isOpen, onClose, onCreated }) => {
    const [formData, setFormData] = useState({
        name: '',
        itemCode: '',
        unitOfMeasure: 'units',
        lowStockThreshold: 10,
        category: 'General'
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            const newItem = await InventoryApi.createInventoryItem(formData);
            onCreated(newItem);
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-zinc-200 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between bg-zinc-50 dark:bg-white/[0.02]">
                    <div>
                        <h3 className="text-xl font-black dark:text-white tracking-tight">Provision New Item</h3>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Register missing consumable</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-zinc-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-red-500 text-[10px] font-bold uppercase text-center">
                            {error}
                        </div>
                    )}
                    
                    <div className="space-y-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black uppercase text-zinc-500 ml-2">Display Name</label>
                            <input 
                                required
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                className="bg-zinc-100 dark:bg-zinc-800/50 border-none rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-2 ring-synos-primary outline-none transition-all dark:text-white"
                                placeholder="e.g. EDTA Tube 4ml"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-black uppercase text-zinc-500 ml-2">Unit</label>
                                <input 
                                    required
                                    type="text"
                                    value={formData.unitOfMeasure}
                                    onChange={(e) => setFormData({...formData, unitOfMeasure: e.target.value})}
                                    className="bg-zinc-100 dark:bg-zinc-800/50 border-none rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-2 ring-synos-primary outline-none transition-all dark:text-white"
                                    placeholder="units"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-black uppercase text-zinc-500 ml-2">Alert Threshold</label>
                                <input 
                                    required
                                    type="number"
                                    value={formData.lowStockThreshold}
                                    onChange={(e) => setFormData({...formData, lowStockThreshold: parseInt(e.target.value)})}
                                    className="bg-zinc-100 dark:bg-zinc-800/50 border-none rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-2 ring-synos-primary outline-none transition-all dark:text-white"
                                />
                            </div>
                        </div>
                    </div>

                    <button 
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-synos-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-synos-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <PlusCircle className="w-5 h-5" />}
                        Register & Select Item
                    </button>
                </form>
            </div>
        </div>
    );
};

// Placeholder Tab Components
const InventoryDashboard = () => {
    const [metrics, setMetrics] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const load = async () => {
        try {
            const data = await InventoryApi.getDashboardMetrics();
            setMetrics(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    if (isLoading) return (
        <div className="flex-1 flex items-center justify-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 animate-pulse">Calculating System Pulse...</p>
        </div>
    );

    return (
        <div className="flex-1 flex flex-col min-h-0 gap-8">
            <div className="shrink-0">
                <div className="flex items-center justify-between mb-4 px-2">
                    <h2 className="type-display !text-2xl">System Overview</h2>
                    <button onClick={load} className="type-section-header text-synos-primary hover:underline cursor-pointer">Refresh Pulse</button>
                </div>
                <RealitySummary 
                    tiles={[
                        { 
                            value: metrics?.pendingRequestsCount.toString() || "0", 
                            label: "Pending Demands", 
                            qualifier: "From Branches", 
                            icon: ClipboardList, 
                            color: metrics?.pendingRequestsCount > 0 ? "red" : "emerald" 
                        },
                        { 
                            value: metrics?.criticalStockCount.toString() || "0", 
                            label: "Critical Items", 
                            qualifier: "Stock Out", 
                            icon: AlertCircle, 
                            color: metrics?.criticalStockCount > 0 ? "red" : "zinc" 
                        },
                        { 
                            value: metrics?.lowStockCount.toString() || "0", 
                            label: "Low Stock", 
                            qualifier: "Action Needed", 
                            icon: ListFilter, 
                            color: "amber" 
                        },
                        { 
                            value: metrics?.totalStockItems.toString() || "0", 
                            label: "Tracked Items", 
                            qualifier: "Total Catalog", 
                            icon: Package, 
                            color: "blue" 
                        },
                    ]} 
                    isCollapsed={false} 
                />
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-zinc-900/50 rounded-[2.5rem] border border-zinc-200 dark:border-white/5 p-8 shadow-xl flex flex-col items-center justify-center text-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h3 className="type-display !text-xl">Fulfillment Health</h3>
                    <p className="type-body opacity-80 max-w-xs">
                        Inventory fulfillment logic is operational. You have fulfilled <b>{metrics?.fulfilledTodayCount}</b> requests today across all laboratory nodes.
                    </p>
                </div>

                <div className="bg-white dark:bg-zinc-900/50 rounded-[2.5rem] border border-zinc-200 dark:border-white/5 p-8 shadow-xl flex flex-col gap-6">
                    <h3 className="type-section-header text-center">Critical Signals</h3>
                    <div className="flex-1 flex flex-col gap-4">
                        <div className={cn(
                            "flex justify-between items-center px-6 py-4 rounded-2xl transition-all",
                            metrics?.pendingRequestsCount > 0 ? "bg-red-500/10 border border-red-500/20" : "bg-zinc-50 dark:bg-white/5"
                        )}>
                            <span className="type-label">Branch Requests</span>
                            <span className={cn("type-section-header", metrics?.pendingRequestsCount > 0 ? "text-red-500" : "text-emerald-500")}>
                                {metrics?.pendingRequestsCount > 0 ? `${metrics.pendingRequestsCount} URGENT` : "STABLE"}
                            </span>
                        </div>
                        <div className={cn(
                            "flex justify-between items-center px-6 py-4 rounded-2xl transition-all",
                            metrics?.criticalStockCount > 0 ? "bg-red-500/10 border border-red-500/20" : "bg-zinc-50 dark:bg-white/5"
                        )}>
                            <span className="type-label">Stock Outs</span>
                            <span className={cn("type-section-header", metrics?.criticalStockCount > 0 ? "text-red-500" : "text-emerald-500")}>
                                {metrics?.criticalStockCount > 0 ? `${metrics.criticalStockCount} CRITICAL` : "HEALTHY"}
                            </span>
                        </div>
                        <div className={cn(
                            "flex justify-between items-center px-6 py-4 rounded-2xl transition-all",
                            metrics?.lowStockCount > 0 ? "bg-amber-500/10 border border-amber-500/20" : "bg-zinc-50 dark:bg-white/5"
                        )}>
                            <span className="type-label">Low Stock Alert</span>
                            <span className={cn("type-section-header", metrics?.lowStockCount > 0 ? "text-amber-500" : "text-emerald-500")}>
                                {metrics?.lowStockCount > 0 ? `${metrics.lowStockCount} REORDER` : "ADEQUATE"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StockLedger = ({ onReceive }) => {
    const [stock, setStock] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [branchFilter, setBranchFilter] = useState("All");
    const [selectedItem, setSelectedItem] = useState(null);
    const [lots, setLots] = useState([]);
    const [isLotsLoading, setIsLotsLoading] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await InventoryApi.getStockLedger();
                setStock(data);
            } catch (e) {
                console.error("Failed to load stock", e);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    const loadLots = async (item) => {
        if (selectedItem?.itemId === item.itemId && selectedItem?.branchId === item.branchId) {
            setSelectedItem(null);
            return;
        }
        setSelectedItem(item);
        setIsLotsLoading(true);
        try {
            const data = await InventoryApi.getItemLots(item.itemId, item.branchId);
            setLots(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLotsLoading(false);
        }
    };

    const branches = ["All", ...new Set(stock.map(s => s.branchName))];

    const filteredStock = stock.filter(s => {
        const matchesSearch = s.itemName.toLowerCase().includes(search.toLowerCase()) || 
                             s.itemCode.toLowerCase().includes(search.toLowerCase());
        const matchesBranch = branchFilter === "All" || s.branchName === branchFilter;
        return matchesSearch && matchesBranch;
    });

    return (
        <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-white/5">
            <div className="flex-1 flex flex-col min-h-0 p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-6 shrink-0">
                    <h2 className="text-xl font-bold dark:text-white">Stock Ledger</h2>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="Search items..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg px-4 py-2 text-sm focus:ring-1 ring-synos-primary w-64 outline-none"
                        />
                        <select 
                            value={branchFilter}
                            onChange={(e) => setBranchFilter(e.target.value)}
                            className="bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg px-4 py-2 text-sm focus:ring-1 ring-synos-primary outline-none"
                        >
                            {branches.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center border-2 border-dashed border-zinc-800/10 rounded-xl">
                            <p className="text-zinc-500 animate-pulse font-bold tracking-widest">SYNCING REALITY...</p>
                        </div>
                    ) : filteredStock.length === 0 ? (
                        <div className="h-full flex items-center justify-center border-2 border-dashed border-zinc-800/10 rounded-xl">
                            <p className="text-zinc-500">No matching items found</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-white dark:bg-zinc-900 z-10">
                                <tr className="border-b dark:border-white/10 text-[10px] uppercase tracking-wider text-zinc-500 font-black">
                                    <th className="px-4 py-4">Item</th>
                                    <th className="px-4 py-4">Code</th>
                                    <th className="px-4 py-4">Branch</th>
                                    <th className="px-4 py-4 text-right">Quantity</th>
                                    <th className="px-4 py-4">Status</th>
                                    <th className="px-4 py-4 text-right">Quick Ops</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-white/5">
                                {filteredStock.map((item, idx) => (
                                    <tr 
                                        key={idx} 
                                        onClick={() => loadLots(item)}
                                        className={cn(
                                            "group cursor-pointer transition-all duration-200",
                                            selectedItem?.itemId === item.itemId && selectedItem?.branchId === item.branchId
                                                ? "bg-synos-primary/5 border-l-2 border-synos-primary" 
                                                : "hover:bg-zinc-50 dark:hover:bg-white/[0.02]"
                                        )}
                                    >
                                        <td className="px-4 py-4">
                                            <div className="font-bold dark:text-zinc-200 leading-tight">{item.itemName}</div>
                                        </td>
                                        <td className="px-4 py-4 text-[10px] font-mono text-zinc-500 uppercase">{item.itemCode}</td>
                                        <td className="px-4 py-4 text-xs text-zinc-500 font-medium">{item.branchName}</td>
                                        <td className={cn(
                                            "px-4 py-4 text-right font-black font-mono text-lg",
                                            item.status === 'Critical' ? "text-red-500" : 
                                            item.status === 'Low' ? "text-amber-500" : "text-emerald-500"
                                        )}>
                                            {item.totalQuantity.toLocaleString()} <span className="text-[10px] uppercase font-bold text-zinc-500 ml-1">{item.unit}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            {item.status === 'Critical' ? (
                                                <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-red-500 bg-red-500/10 px-2.5 py-1 rounded-full w-fit border border-red-500/20">
                                                    <AlertCircle className="w-3 h-3" />
                                                    Stock Out
                                                </span>
                                            ) : item.status === 'Low' ? (
                                                <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full w-fit border border-amber-500/20">
                                                    <AlertCircle className="w-3 h-3" />
                                                    Low Stock
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full w-fit border border-emerald-500/20">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Healthy
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onReceive(item);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-auto text-[10px] font-bold uppercase bg-synos-primary text-white px-3 py-1.5 rounded-lg transition-all hover:scale-105 active:scale-95 shadow-lg shadow-synos-primary/20"
                                            >
                                                <PlusCircle className="w-3 h-3" />
                                                Receive
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Drill-down Side Panel */}
            <div className={cn(
                "absolute top-0 right-0 bottom-0 w-[400px] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-white/10 shadow-2xl transition-transform duration-300 transform z-20 flex flex-col",
                selectedItem ? "translate-x-0" : "translate-x-full"
            )}>
                {selectedItem && (
                    <>
                        <div className="p-6 border-b border-zinc-200 dark:border-white/5 flex items-center justify-between shrink-0 bg-zinc-50 dark:bg-white/[0.02]">
                            <div>
                                <h3 className="font-black text-lg dark:text-white leading-tight">{selectedItem.itemName}</h3>
                                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">{selectedItem.itemCode} • {selectedItem.branchName}</p>
                            </div>
                            <button 
                                onClick={() => setSelectedItem(null)}
                                className="p-2 hover:bg-zinc-200 dark:hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <PlusCircle className="w-5 h-5 rotate-45 text-zinc-500" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-zinc-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-zinc-200 dark:border-white/5">
                                    <div className="text-[10px] font-bold text-zinc-500 uppercase mb-1">In Stock</div>
                                    <div className="text-2xl font-black dark:text-white font-mono">{selectedItem.totalQuantity} <span className="text-xs font-normal text-zinc-500 uppercase">{selectedItem.unit}</span></div>
                                </div>
                                <div className="bg-zinc-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-zinc-200 dark:border-white/5">
                                    <div className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Batches</div>
                                    <div className="text-2xl font-black dark:text-white font-mono">{lots.length}</div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <h4 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Active Lots / Batches</h4>
                                {isLotsLoading ? (
                                    <div className="py-20 text-center text-zinc-500 animate-pulse font-bold text-[10px] uppercase">Retrieving Batches...</div>
                                ) : lots.length === 0 ? (
                                    <div className="py-20 text-center text-zinc-500 border-2 border-dashed border-zinc-800/10 rounded-2xl">No active lots found</div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {lots.map(lot => (
                                            <div key={lot.lotId} className="p-4 bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-white/5 rounded-2xl group/lot relative overflow-hidden">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="font-bold font-mono text-sm dark:text-white">#{lot.lotNumber}</div>
                                                    <div className="font-black font-mono text-emerald-500">{lot.quantity}</div>
                                                </div>
                                                <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold uppercase">
                                                    <span>Rec: {new Date(lot.receivedAt).toLocaleDateString()}</span>
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded-md",
                                                        lot.isExpired ? "bg-red-500/10 text-red-500" : "bg-zinc-500/10"
                                                    )}>
                                                        Exp: {lot.expiryDate ? new Date(lot.expiryDate).toLocaleDateString() : 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-white/[0.02]">
                            <button 
                                onClick={() => onReceive(selectedItem)}
                                className="w-full bg-synos-primary text-white font-bold py-4 rounded-2xl shadow-xl shadow-synos-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <PlusCircle className="w-5 h-5" />
                                Receive for this item
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const ReceiveStock = ({ prefilledItem }) => {
    const [items, setItems] = useState([]);
    const [isLoadingItems, setIsLoadingItems] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        itemId: prefilledItem?.itemId || "",
        quantity: "",
        batchNumber: "",
        expiryDate: "",
        unitCost: "0",
        branchId: prefilledItem?.branchId || "a0000000-0000-0000-0000-000000000001", // Default to Main
        supplierId: null
    });

    const loadItems = async () => {
        setIsLoadingItems(true);
        try {
            const data = await InventoryApi.getInventoryItems();
            setItems(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingItems(false);
        }
    };

    useEffect(() => {
        loadItems();
    }, []);

    useEffect(() => {
        if (prefilledItem) {
            setFormData(prev => ({ 
                ...prev, 
                itemId: prefilledItem.itemId,
                branchId: prefilledItem.branchId
            }));
        }
    }, [prefilledItem]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await InventoryApi.receiveStock({
                ...formData,
                quantity: parseFloat(formData.quantity),
                unitCost: parseFloat(formData.unitCost)
            });
            alert("Stock received and logged successfully");
            setFormData({
                itemId: "",
                quantity: "",
                batchNumber: "",
                expiryDate: "",
                unitCost: "0",
                branchId: formData.branchId,
                supplierId: null
            });
        } catch (e) {
            alert(e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleItemCreated = (newItem) => {
        setItems(prev => [...prev, newItem].sort((a, b) => a.name.localeCompare(b.name)));
        setFormData(prev => ({ ...prev, itemId: newItem.itemId }));
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 max-w-2xl mx-auto w-full py-10">
            <QuickItemModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onCreated={handleItemCreated} 
            />

            <div className="mb-8 flex items-end justify-between px-2">
                <div>
                    <h2 className="text-3xl font-black dark:text-white mb-2 tracking-tight">Receive Stock</h2>
                    <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.2em]">Goods Received Note (GRN) Entry</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 text-[10px] font-black uppercase text-synos-primary bg-synos-primary/10 px-4 py-2 rounded-xl border border-synos-primary/20 hover:scale-105 active:scale-95 transition-all"
                >
                    <Plus className="w-3 h-3" />
                    New Item Identity
                </button>
            </div>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900/50 rounded-[2.5rem] border border-zinc-200 dark:border-white/5 p-10 shadow-2xl flex flex-col gap-8">
                <div className="grid grid-cols-1 gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase text-zinc-500 ml-4 tracking-widest">Select Item</label>
                        <select 
                            required
                            value={formData.itemId}
                            onChange={(e) => setFormData({ ...formData, itemId: e.target.value })}
                            className="bg-zinc-100 dark:bg-zinc-800/50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 ring-synos-primary outline-none transition-all dark:text-white"
                        >
                            <option value="">Choose an inventory item...</option>
                            {items.map(item => (
                                <option key={item.itemId} value={item.itemId}>{item.name} ({item.itemCode})</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase text-zinc-500 ml-4 tracking-widest">Batch / Lot #</label>
                            <input 
                                required
                                type="text" 
                                placeholder="e.g. BATCH-2024-001"
                                value={formData.batchNumber}
                                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                                className="bg-zinc-100 dark:bg-zinc-800/50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 ring-synos-primary outline-none transition-all dark:text-white uppercase placeholder:normal-case placeholder:font-normal"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase text-zinc-500 ml-4 tracking-widest">Quantity Received</label>
                            <input 
                                required
                                type="number" 
                                step="0.0001"
                                placeholder="0.00"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                className="bg-zinc-100 dark:bg-zinc-800/50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 ring-synos-primary outline-none transition-all dark:text-white font-mono"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase text-zinc-500 ml-4 tracking-widest">Expiry Date</label>
                            <input 
                                type="date" 
                                value={formData.expiryDate}
                                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                className="bg-zinc-100 dark:bg-zinc-800/50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 ring-synos-primary outline-none transition-all dark:text-white"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase text-zinc-500 ml-4 tracking-widest">Unit Cost (Optional)</label>
                            <input 
                                type="number" 
                                step="0.01"
                                value={formData.unitCost}
                                onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                                className="bg-zinc-100 dark:bg-zinc-800/50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 ring-synos-primary outline-none transition-all dark:text-white font-mono"
                            />
                        </div>
                    </div>
                </div>

                <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-4 w-full bg-synos-primary text-white font-black py-6 rounded-[1.5rem] shadow-2xl shadow-synos-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100"
                >
                    {isSubmitting ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            RECORDING ENTRY...
                        </>
                    ) : (
                        <>
                            <PlusCircle className="w-6 h-6" />
                            COMMIT TO LEDGER
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};

const RequestsQueue = () => {
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isActioning, setIsActioning] = useState(null); // requestId being processed

    const load = async () => {
        setIsLoading(true);
        try {
            // Passing null to get ALL requests across all branches
            const data = await InventoryApi.getPendingRequests();
            setRequests(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleFulfill = async (requestId) => {
        setIsActioning(requestId);
        try {
            await InventoryApi.fulfillRequest(requestId);
            await load(); // Refresh
        } catch (e) {
            alert(e.message);
        } finally {
            setIsActioning(null);
        }
    };

    const handleIgnore = async (requestId) => {
        if (!confirm("Are you sure you want to ignore this request?")) return;
        setIsActioning(requestId);
        try {
            await InventoryApi.ignoreRequest(requestId);
            await load(); // Refresh
        } catch (e) {
            alert(e.message);
        } finally {
            setIsActioning(null);
        }
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-white/5 p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-6 shrink-0">
                <div>
                    <h2 className="text-xl font-bold dark:text-white">Requests Queue</h2>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Pending items from operational branches</p>
                </div>
                <button 
                    onClick={load}
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-lg transition-colors text-zinc-500"
                >
                    <History className={cn("w-5 h-5", isLoading && "animate-spin")} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center border-2 border-dashed border-zinc-800/10 rounded-xl">
                        <p className="text-zinc-500 animate-pulse font-bold tracking-widest uppercase text-[10px]">Scanning Branch Demands...</p>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="h-full flex items-center justify-center border-2 border-dashed border-zinc-800/10 rounded-xl flex-col gap-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500/20" />
                        <p className="text-zinc-500 font-bold text-xs">All branch requests fulfilled</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-white dark:bg-zinc-900 z-10">
                            <tr className="border-b dark:border-white/10 text-[10px] uppercase tracking-wider text-zinc-500 font-black">
                                <th className="px-4 py-4">Consumable</th>
                                <th className="px-4 py-4">Branch</th>
                                <th className="px-4 py-4">Requested By</th>
                                <th className="px-4 py-4 text-right">Quantity</th>
                                <th className="px-4 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-white/5">
                            {requests.map((req) => (
                                <tr key={req.requestId} className="group hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors">
                                    <td className="px-4 py-4">
                                        <div className="font-bold dark:text-zinc-200">{req.consumableName}</div>
                                        <div className="text-[9px] text-zinc-500 font-mono mt-0.5">{new Date(req.requestedAt).toLocaleString()}</div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className="text-[10px] font-black uppercase text-synos-primary bg-synos-primary/10 px-2 py-0.5 rounded-md border border-synos-primary/20">
                                            {req.branchName}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-xs text-zinc-500 font-medium">{req.requestedByUserName}</td>
                                    <td className="px-4 py-4 text-right">
                                        <div className="font-black font-mono text-lg dark:text-white">
                                            {req.quantity} <span className="text-[9px] uppercase font-bold text-zinc-500">{req.unitOfMeasure}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                disabled={isActioning !== null}
                                                onClick={() => handleIgnore(req.requestId)}
                                                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                title="Ignore Request"
                                            >
                                                <XCircle className="w-5 h-5" />
                                            </button>
                                            <button 
                                                disabled={isActioning !== null}
                                                onClick={() => handleFulfill(req.requestId)}
                                                className={cn(
                                                    "bg-synos-primary text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl transition-all shadow-lg shadow-synos-primary/20 flex items-center gap-2",
                                                    isActioning === req.requestId ? "opacity-50" : "hover:scale-105 active:scale-95"
                                                )}
                                            >
                                                {isActioning === req.requestId ? (
                                                    <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <Zap className="w-3 h-3" />
                                                )}
                                                Fulfill
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

const MovementHistory = () => {
    const [movements, setMovements] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const load = async () => {
        setIsLoading(true);
        try {
            const data = await InventoryApi.getMovementHistory();
            setMovements(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const getMovementBadge = (type) => {
        const types = {
            'Receive': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            'Consumption': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
            'RequestFulfillment': 'bg-synos-primary/10 text-synos-primary border-synos-primary/20',
            'Wastage': 'bg-red-500/10 text-red-500 border-red-500/20',
            'OpeningBalance': 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
        };
        return types[type] || 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-white/5 p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-6 shrink-0">
                <div>
                    <h2 className="text-xl font-bold dark:text-white">Operational Audit Trail</h2>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Forensic movement logging & traceability</p>
                </div>
                <button 
                    onClick={load}
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-lg transition-colors text-zinc-500"
                >
                    <History className={cn("w-5 h-5", isLoading && "animate-spin")} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center border-2 border-dashed border-zinc-800/10 rounded-xl">
                        <p className="text-zinc-500 animate-pulse font-bold tracking-widest uppercase text-[10px]">Reconstructing Audit Logs...</p>
                    </div>
                ) : movements.length === 0 ? (
                    <div className="h-full flex items-center justify-center border-2 border-dashed border-zinc-800/10 rounded-xl">
                        <p className="text-zinc-500 font-bold text-xs">No movements recorded yet</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-white dark:bg-zinc-900 z-10">
                            <tr className="border-b dark:border-white/10 text-[10px] uppercase tracking-wider text-zinc-500 font-black">
                                <th className="px-4 py-4">Item & Batch</th>
                                <th className="px-4 py-4">Type</th>
                                <th className="px-4 py-4">Quantity</th>
                                <th className="px-4 py-4">Location</th>
                                <th className="px-4 py-4">Recorded By</th>
                                <th className="px-4 py-4 text-right">Reference</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-white/5">
                            {movements.map((move) => (
                                <tr key={move.movementId} className="group hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors">
                                    <td className="px-4 py-4">
                                        <div className="font-bold dark:text-zinc-200">{move.itemName}</div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[9px] text-zinc-500 font-mono">LOT: {move.lotNumber}</span>
                                            <span className="text-[9px] text-zinc-500/50">•</span>
                                            <span className="text-[9px] text-zinc-400">{new Date(move.movedAt).toLocaleString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className={cn(
                                            "text-[9px] font-black uppercase px-2 py-0.5 rounded-md border",
                                            getMovementBadge(move.movementType)
                                        )}>
                                            {move.movementType}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="font-black font-mono dark:text-white">
                                            {move.quantity > 0 ? `+${move.quantity}` : move.quantity}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-xs text-zinc-500 font-medium">
                                        {move.branchName}
                                    </td>
                                    <td className="px-4 py-4 text-xs text-zinc-500 font-medium">
                                        {move.recordedBy}
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <div className="text-[9px] font-mono text-zinc-500 uppercase">
                                            {move.reference}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export function InventoryTerminal() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [prefilledItem, setPrefilledItem] = useState(null);
    const [serverTime, setServerTime] = useState(new Date().toISOString());
    const [connectionStatus, setConnectionStatus] = useState("Not Synced");

    useEffect(() => {
        const connect = async () => {
            SignalRService.onReceiveServerTime((time) => setServerTime(time));
            SignalRService.onConnectionStatusChanged((status) => setConnectionStatus(status));
            try {
                await SignalRService.startConnection();
            } catch (err) {
                setConnectionStatus("Not Synced");
            }
        };
        connect();
    }, []);

    const handleQuickReceive = (item) => {
        setPrefilledItem(item);
        setActiveTab('receive');
    };

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'ledger', label: 'Stock Ledger', icon: ListFilter },
        { id: 'receive', label: 'Receive Stock', icon: PlusCircle },
        { id: 'requests', label: 'Requests Queue', icon: ClipboardList },
        { id: 'history', label: 'Movement History', icon: History },
        { id: 'onboarding', label: 'Add Existing Stock', icon: Package },
    ];

    return (
        <div className="flex flex-col h-screen w-screen overflow-hidden dark:bg-zinc-950 bg-transparent text-zinc-900 dark:text-zinc-300 selection:bg-synos-primary/20">
            {/* High-Complexity Atmospheric Accents (PERFORMANCE OPTIMIZED) */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1] dark:hidden">
                {/* 1. Grain/Noise Base */}
                <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAt66YlAAAAB3RSTlMAo7S066u0v76zAAABJklEQVQ4jXWSwW7DIAyGvRNoV9HeIdp7B2nvHaK9d7D27lX836VpY6t0p8oHicDHP4Z99qGf96HvX+h7NfSmX8U8z9M0z6+P/m8X6fB6L78XpX4X5X4O6fc8l7e8n+T9KO87ed+m77pP33Wfvuu6T991nb7rum/ed5+87z55333yvvvkfffJ++6T990n77pP33Wfvus6fdd13rrvu67rvXXfd13ne+u+77rO99Z933Wdt67rtnXdt67rtnWdt67rtjW999Y9ve9997mPu8997uPus9fZZ6+zz15nn73OPnudvU9f0+v0Nb1OX9Pr9DW9Tm9O9vTmaE5vjua09f7o/db7rff7f9H3v6XvP9TzL/X+U8+/1fMv9fw7fQ==")` }} />

                {/* Static Blooms */}
                <div
                    className="absolute top-[-15%] left-[-5%] w-[50%] h-[55%]"
                    style={{ background: 'radial-gradient(circle at 40% 40%, rgba(6, 182, 212, 0.05) 0%, rgba(6, 182, 212, 0) 70%)' }}
                />
                <div
                    className="absolute top-[-10%] right-[10%] w-[45%] h-[50%]"
                    style={{ background: 'radial-gradient(circle at center, rgba(37, 99, 235, 0.03) 0%, rgba(37, 99, 235, 0) 80%)' }}
                />
                <div
                    className="absolute top-[-25%] right-[-10%] w-[60%] h-[65%]"
                    style={{ background: 'radial-gradient(circle at 60% 30%, rgba(52, 211, 153, 0.04) 0%, rgba(52, 211, 153, 0) 70%)' }}
                />
            </div>

            <SystemBar serverTime={serverTime} syncStatus={connectionStatus} />

            <div className="flex flex-1 overflow-hidden relative z-10">
                {/* Sidebar - STATIC FROST MODEL */}
                <aside 
                    style={{
                        backgroundImage: `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAt66YlAAAAB3RSTlMAo7S066u0v76zAAABJklEQVQ4jXWSwW7DIAyGvRNoV9HeIdp7B2nvHaK9d7D27lX836VpY6t0p8oHicDHP4Z99qGf96HvX+h7NfSmX8U8z9M0z6+P/m8X6fB6L78XpX4X5X4O6fc8l7e8n+T9KO87ed+m77pP33Wfvuu6T991nb7rum/ed5+87z55333yvvvkfffJ++6T990n77pP33Wfvus6fdd13rrvu67rvXXfd13ne+u+77rO99Z933Wdt67rtnXdt67rtnWdt67rtjW999Y9ve9997mPu8997uPus9fZZ6+zz15nn73OPnudvU9f0+v0Nb1OX9Pr9DW9Tm9O9vTmaE5vjua09f7o/db7rff7f9H3v6XvP9TzL/X+U8+/1fMv9fw7fQ==")`,
                        backgroundBlendMode: 'overlay',
                        backgroundRepeat: 'repeat'
                    }}
                    className="w-64 border-r dark:border-zinc-900 border-zinc-200 dark:bg-zinc-950 bg-gradient-to-b from-white/98 to-zinc-50/95 flex flex-col relative shrink-0"
                >
                    <div className="absolute inset-0 border-r border-white/40 pointer-events-none" />
                    
                    <nav className="flex-1 overflow-y-auto p-4 pt-8 space-y-2 relative z-10">
                        <div className="px-3 mb-6">
                            <span className="type-section-header transition-colors">Inventory Ops</span>
                        </div>
                        <div className="space-y-1">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveTab(tab.id);
                                        if (tab.id !== 'receive') setPrefilledItem(null);
                                    }}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group border",
                                        activeTab === tab.id 
                                            ? "bg-synos-primary/10 dark:text-white text-synos-primary dark:border-synos-primary/20 border-synos-primary/30" 
                                            : "text-zinc-500 dark:hover:bg-zinc-900 hover:bg-zinc-200/50 hover:text-zinc-900 border-transparent"
                                    )}
                                >
                                    <tab.icon className={cn("w-4 h-4 shrink-0 transition-colors", activeTab === tab.id ? "text-synos-primary" : "group-hover:text-synos-primary")} />
                                    <span className="type-label !text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-300 transition-colors">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                    <div className="flex-1 overflow-y-auto p-8 relative z-10">
                        {activeTab === 'dashboard' && <InventoryDashboard />}
                        {activeTab === 'ledger' && <StockLedger onReceive={handleQuickReceive} />}
                        {activeTab === 'receive' && <ReceiveStock prefilledItem={prefilledItem} />}
                        { activeTab === 'requests' && <RequestsQueue /> }
                        { activeTab === 'onboarding' && <OpeningStockOnboarding /> }
                        { activeTab === 'history' && <MovementHistory /> }
                    </div>
                </main>
            </div>
        </div>
    );
}
