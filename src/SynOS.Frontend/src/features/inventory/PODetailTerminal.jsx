import React, { useState, useEffect } from 'react';
import { 
    ArrowLeft, 
    Plus, 
    Trash2, 
    CheckCircle2, 
    AlertCircle,
    Package,
    IndianRupee,
    Building2,
    ShoppingCart,
    MessageSquare,
    Printer
} from 'lucide-react';
import { PurchasingApi } from '@/api/purchasing';
import { InventoryApi } from '@/api/inventory';

export const PODetailTerminal = ({ poId, onBack }) => {
    const [po, setPo] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [catalog, setCatalog] = useState([]);
    const [showAddItem, setShowAddItem] = useState(false);
    
    const [newItem, setNewItem] = useState({
        tubeId: '',
        orderedQuantity: 1,
        unitPrice: 0,
        taxRate: 0
    });

    useEffect(() => {
        loadData();
    }, [poId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [poData, poItems, inventory] = await Promise.all([
                PurchasingApi.getPurchaseOrder(poId),
                PurchasingApi.getPOItems(poId),
                InventoryApi.getInventoryItems()
            ]);
            setPo(poData);
            setItems(poItems);
            setCatalog(inventory);
        } catch (err) {
            console.error("Failed to load PO details:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = async () => {
        try {
            await PurchasingApi.addPOItem(poId, newItem);
            loadData();
            setShowAddItem(false);
            setNewItem({ tubeId: '', orderedQuantity: 1, unitPrice: 0, taxRate: 0 });
        } catch (err) {
            alert(err.message);
        }
    };

    const handleApprove = async () => {
        if (!window.confirm("Are you sure you want to approve and lock this Purchase Order? This will move it to the 'Ordered' state.")) return;
        try {
            await PurchasingApi.approvePurchaseOrder(poId);
            loadData();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleWhatsAppDispatch = () => {
        const totalValue = items.reduce((acc, item) => acc + (item.orderedQuantity * item.unitPrice), 0);
        const itemDetails = items.map(i => `• ${i.tube?.name || 'Item'}: ${i.orderedQuantity} qty`).join('\n');
        
        const message = `*PURCHASE ORDER - SRI DIVYA LAB*\n\n` +
            `Dear *${po.supplier?.name}*,\n` +
            `We have placed a new order with the following details:\n\n` +
            `*PO ID:* PO-${po.poId.substring(0, 8).toUpperCase()}\n` +
            `*Date:* ${new Date().toLocaleDateString()}\n\n` +
            `*Items:*\n${itemDetails}\n\n` +
            `*Total Value:* ₹${totalValue.toLocaleString()}\n\n` +
            `Please acknowledge this order. You can view/download the formal PO here:\n` +
            `${window.location.origin}/api/v1/purchasing/po/${po.poId}/print\n\n` +
            `Regards,\nInventory Dept.`;

        const whatsappUrl = `https://wa.me/${po.supplier?.phone || ''}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    if (loading || !po) return <div className="p-20 text-center animate-pulse italic">Synchronizing order facts...</div>;

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-500">
            {/* Header */}
            <div className="flex items-center justify-between bg-zinc-900 text-white p-6 rounded-[2rem] shadow-xl">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight">Order PO-{po.poId.substring(0, 8).toUpperCase()}</h2>
                        <div className="flex items-center gap-2 text-[10px] uppercase font-semibold tracking-wider text-zinc-400 mt-1">
                            <Building2 className="w-3 h-3" />
                            {po.supplier?.name}
                            <span className="mx-1">•</span>
                            <span className="text-synos-primary">{po.status}</span>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Total Value</p>
                    <p className="text-xl font-semibold">₹{items.reduce((acc, item) => acc + (item.orderedQuantity * item.unitPrice), 0).toLocaleString()}</p>
                </div>
            </div>

            {/* Item Management Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Items List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white dark:bg-zinc-900/40 border dark:border-zinc-800 border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b dark:border-zinc-800 border-zinc-200 bg-zinc-50/50 dark:bg-zinc-900/40 flex justify-between items-center">
                            <h3 className="text-[10px] font-semibold uppercase text-zinc-500 tracking-wider">Line Items</h3>
                            <span className="text-xs font-semibold">{items.length} Positions</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider border-b dark:border-zinc-800">
                                        <th className="px-6 py-3 font-semibold">Item Description</th>
                                        <th className="px-6 py-3 font-semibold text-center">Qty</th>
                                        <th className="px-6 py-3 font-semibold text-right">Unit Price</th>
                                        <th className="px-6 py-3 font-semibold text-right">Ext. Price</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-zinc-800">
                                    {items.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-10 text-center text-xs text-zinc-500 italic">No items added to this commitment.</td>
                                        </tr>
                                    ) : (
                                        items.map(item => (
                                            <tr key={item.poItemId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <Package className="w-4 h-4 text-zinc-400" />
                                                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">{item.tube?.name || "Stock Item"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center font-semibold text-xs">{item.orderedQuantity}</td>
                                                <td className="px-6 py-4 text-right text-xs">₹{item.unitPrice.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right font-semibold text-xs">₹{(item.orderedQuantity * item.unitPrice).toLocaleString()}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right: Add Item Sidebar */}
                <div className="space-y-6">
                    {po.status === 'Draft' && (
                        <div className="p-8 bg-synos-primary/5 border border-synos-primary/20 rounded-[2rem] space-y-6">
                            <div>
                                <h3 className="text-base font-semibold text-synos-primary tracking-tight">Add Line Item</h3>
                                <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Append demand to order</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-semibold uppercase text-zinc-500 ml-4 tracking-wider">Item Search</label>
                                    <select 
                                        value={newItem.tubeId}
                                        onChange={(e) => setNewItem({...newItem, tubeId: e.target.value})}
                                        className="w-full bg-white dark:bg-zinc-950 border-none rounded-2xl px-6 py-4 text-xs font-medium focus:ring-2 ring-synos-primary outline-none transition-all dark:text-white"
                                    >
                                        <option value="">Choose item...</option>
                                        {catalog.map(item => (
                                            <option key={item.itemId} value={item.itemId}>{item.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-semibold uppercase text-zinc-500 ml-4 tracking-wider">Quantity</label>
                                        <input 
                                            type="number"
                                            value={newItem.orderedQuantity}
                                            onChange={(e) => setNewItem({...newItem, orderedQuantity: parseInt(e.target.value)})}
                                            className="w-full bg-white dark:bg-zinc-950 border-none rounded-2xl px-6 py-4 text-xs font-medium focus:ring-2 ring-synos-primary outline-none transition-all dark:text-white"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-semibold uppercase text-zinc-500 ml-4 tracking-wider">Unit Price (₹)</label>
                                        <input 
                                            type="number"
                                            value={newItem.unitPrice}
                                            onChange={(e) => setNewItem({...newItem, unitPrice: parseFloat(e.target.value)})}
                                            className="w-full bg-white dark:bg-zinc-950 border-none rounded-2xl px-6 py-4 text-xs font-medium focus:ring-2 ring-synos-primary outline-none transition-all dark:text-white"
                                        />
                                    </div>
                                </div>

                                <button 
                                    onClick={handleAddItem}
                                    disabled={!newItem.tubeId || newItem.orderedQuantity <= 0}
                                    className="w-full bg-synos-primary text-white font-semibold py-4 rounded-2xl shadow-xl shadow-synos-primary/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <Plus className="w-5 h-5" />
                                    Add to Order
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="p-8 bg-zinc-900 rounded-[2rem] text-white space-y-4">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-amber-500" />
                            <h4 className="text-xs font-semibold uppercase tracking-wider">
                                {po.status === 'Draft' ? 'Finalize Order' : 'Order Locked'}
                            </h4>
                        </div>
                        <p className="text-[10px] text-zinc-400 font-medium">
                            {po.status === 'Draft' 
                                ? "Once approved, this PO will be locked and can be matched against incoming goods."
                                : "This order is active. You can now match goods receipts against this PO."
                            }
                        </p>
                        {po.status === 'Draft' && (
                            <button 
                                onClick={handleApprove}
                                className="w-full py-4 bg-white text-zinc-900 rounded-xl text-[10px] font-semibold uppercase tracking-wider hover:bg-emerald-500 hover:text-white transition-all"
                            >
                                Approve & Lock PO
                            </button>
                        )}
                        {po.status === 'Approved' && (
                            <>
                                <div className="w-full py-4 bg-emerald-500 text-white rounded-xl text-[10px] font-semibold uppercase tracking-wider flex items-center justify-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Active Commitment
                                </div>
                                <button 
                                    onClick={handleWhatsAppDispatch}
                                    className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    Dispatch via WhatsApp
                                </button>
                                <button 
                                    onClick={() => window.open(`/api/v1/purchasing/po/${po.poId}/print`, '_blank')}
                                    className="w-full py-4 bg-transparent hover:bg-white/5 text-zinc-400 rounded-xl text-[10px] font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                                >
                                    <Printer className="w-4 h-4" />
                                    Print / View PDF
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
