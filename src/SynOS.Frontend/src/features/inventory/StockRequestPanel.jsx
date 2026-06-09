import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Package, AlertTriangle, Check, Loader2, ListFilter, ArrowRight } from 'lucide-react';
import { InventoryApi } from '@/api/inventory';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { usePanelEntry } from '@/hooks/useSynOSMotion';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useTheme } from '@/context/ThemeContext';

export function StockRequestPanel({ isOpen, onClose }) {
    const { user } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [allowedItems, setAllowedItems] = useState([]);
    const [allItems, setAllItems] = useState([]);
    const [showAll, setShowAll] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const panelRef = useRef(null);
    usePanelEntry(panelRef, isOpen);
    useFocusTrap(panelRef, isOpen, onClose);

    useEffect(() => {
        if (isOpen) {
            loadItems();
        } else {
            // Reset state on close
            setSearchQuery('');
            setSelectedItem(null);
            setQuantity(1);
            setError(null);
            setSuccess(false);
            setShowAll(false);
        }
    }, [isOpen]);

    const loadItems = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [allowed, all] = await Promise.all([
                InventoryApi.getAllowedItems(),
                InventoryApi.getAllActiveItems()
            ]);
            setAllowedItems(allowed);
            setAllItems(all);
        } catch (err) {
            console.error("Failed to load inventory items", err);
            setError("Could not load inventory items. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!selectedItem) return;

        setIsSubmitting(true);
        setError(null);
        try {
            await InventoryApi.createRequest(selectedItem.consumableId, quantity, user.branchId);
            setSuccess(true);
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (err) {
            setError(err.message || "Failed to submit request.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const itemsToDisplay = showAll ? allItems : allowedItems;
    const filteredItems = itemsToDisplay.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const ui = isDark ? {
        panel: "bg-zinc-900 border-l border-white/10 shadow-2xl relative z-20",
        header: "bg-zinc-900 border-b border-white/5",
        footer: "bg-zinc-900 border-t border-white/5",
        title: "text-white",
        subtitle: "text-zinc-500",
        input: "bg-black/40 border-white/5 text-white placeholder-zinc-500 focus:border-emerald-500/50",
        itemCard: {
            selected: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
            hover: "hover:bg-white/5 text-zinc-400 hover:text-zinc-200"
        }
    } : {
        panel: "bg-white border-l border-zinc-200 shadow-[-20px_0_50px_rgba(0,0,0,0.1)] relative z-20",
        header: "bg-zinc-50 border-b border-zinc-200",
        footer: "bg-zinc-50 border-t border-zinc-200",
        title: "text-zinc-900",
        subtitle: "text-zinc-500",
        input: "bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-emerald-500/50",
        itemCard: {
            selected: "bg-emerald-50 text-emerald-700 border-emerald-200",
            hover: "hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900"
        }
    };

    if (!isOpen) return null;

    return (
        <div ref={panelRef} className={cn("flex flex-col h-full overflow-hidden w-full", ui.panel)}>
            {/* Header */}
            <div className={cn("h-16 flex items-center justify-between px-6 shrink-0", ui.header)}>
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500">
                        <Package className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className={cn("text-lg font-semibold tracking-tight", ui.title)}>Stock Request</h2>
                        <p className={cn("text-[10px] uppercase font-semibold tracking-wider", ui.subtitle)}>{user?.branchName}</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className={cn(
                        "p-2 -mr-2 rounded-full transition-all duration-200 active:scale-95",
                        isDark ? "hover:bg-white/10 text-zinc-400 hover:text-white" : "hover:bg-black/5 text-zinc-500 hover:text-zinc-900"
                    )}
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 flex flex-col p-6 space-y-6 overflow-y-auto custom-scrollbar">
                {success ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center animate-in zoom-in duration-300">
                        <div className="mb-4 rounded-full bg-emerald-500/20 p-4 text-emerald-500">
                            <Check className="h-12 w-12" />
                        </div>
                        <h4 className={cn("text-xl font-bold", ui.title)}>Request Submitted</h4>
                        <p className={cn("mt-2 text-sm", ui.subtitle)}>The store will process your request shortly.</p>
                    </div>
                ) : (
                    <>
                        {/* Search & Toggle */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className={cn("text-xs font-semibold uppercase tracking-wider", ui.subtitle)}>Select Consumable</label>
                                <button 
                                    onClick={() => setShowAll(!showAll)}
                                    className={cn(
                                        "flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded transition-all",
                                        showAll 
                                            ? "bg-amber-500/20 text-amber-500" 
                                            : isDark ? "bg-zinc-800 text-zinc-500 hover:text-zinc-300" : "bg-zinc-100 text-zinc-400 hover:text-zinc-600"
                                    )}
                                >
                                    <ListFilter className="h-3 w-3" />
                                    {showAll ? "All Items" : "Essential"}
                                </button>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                                <input 
                                    type="text"
                                    placeholder="Search by name or code..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={cn("w-full rounded-xl border py-3 pl-10 pr-4 text-sm outline-none transition-all", ui.input)}
                                />
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 min-h-0 space-y-1 overflow-y-auto custom-scrollbar pr-1">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-10 opacity-40">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                    <p className="mt-2 text-xs font-semibold uppercase tracking-wider">Scanning Catalog...</p>
                                </div>
                            ) : filteredItems.length === 0 ? (
                                <div className="py-10 text-center opacity-40">
                                    <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
                                    <p className="text-sm font-medium">No matches found</p>
                                    {!showAll && (
                                        <button 
                                            onClick={() => setShowAll(true)}
                                            className="mt-2 text-xs text-emerald-500 hover:underline font-bold"
                                        >
                                            Search entire catalog
                                        </button>
                                    )}
                                </div>
                            ) : (
                                filteredItems.map((item) => (
                                    <button
                                        key={item.consumableId}
                                        onClick={() => setSelectedItem(item)}
                                        className={cn(
                                            "flex w-full items-center justify-between rounded-xl p-3 text-left transition-all border border-transparent mb-1",
                                            selectedItem?.consumableId === item.consumableId
                                                ? ui.itemCard.selected
                                                : ui.itemCard.hover
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "rounded-lg p-2",
                                                selectedItem?.consumableId === item.consumableId 
                                                    ? "bg-emerald-500/20" 
                                                    : isDark ? "bg-black/20" : "bg-white"
                                            )}>
                                                <Package className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold">{item.name}</div>
                                                <div className="text-[10px] opacity-60 font-mono">{item.code} • {item.unitOfMeasure}</div>
                                            </div>
                                        </div>
                                        {selectedItem?.consumableId === item.consumableId && (
                                            <div className="bg-emerald-500 text-white rounded-full p-1">
                                                <Check className="h-3 w-3" />
                                            </div>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>

                        {/* Quantity */}
                        <div className={cn("p-4 rounded-2xl border", isDark ? "bg-black/20 border-white/5" : "bg-zinc-50 border-zinc-200")}>
                            <label className={cn("text-[10px] uppercase font-semibold tracking-wider block mb-2", ui.subtitle)}>Desired Quantity</label>
                            <div className="flex items-center gap-4">
                                <input 
                                    type="number"
                                    min="1"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className={cn("flex-1 rounded-xl border py-4 text-center text-xl font-semibold outline-none transition-all", ui.input)}
                                />
                                <div className={cn("text-sm font-semibold uppercase", ui.subtitle)}>{selectedItem?.unitOfMeasure || 'units'}</div>
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-xl bg-red-500/10 p-4 text-center text-xs text-red-500 border border-red-500/20 animate-in shake-in duration-300">
                                {error}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Footer */}
            {!success && (
                <div className={cn("p-6 shrink-0", ui.footer)}>
                    <button 
                        onClick={handleSubmit}
                        disabled={!selectedItem || isSubmitting}
                        className={cn(
                            "w-full rounded-xl py-4 text-sm font-semibold uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95 disabled:opacity-30 disabled:active:scale-100",
                            !selectedItem 
                                ? (isDark ? "bg-zinc-800 text-zinc-500" : "bg-zinc-100 text-zinc-400") 
                                : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-900/20"
                        )}
                    >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Submit Request <ArrowRight className="h-4 w-4" /></>}
                    </button>
                </div>
            )}
        </div>
    );
}
