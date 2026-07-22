import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Package, AlertTriangle, Check, Loader2, ListFilter, ArrowRight, Star, ShieldAlert, Sparkles } from 'lucide-react';
import { InventoryApi } from '@/api/inventory';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { usePanelEntry } from '@/hooks/useSynOSMotion';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useTheme } from '@/context/ThemeContext';
import { getCompatibleUnits, calculateBaseQuantity, getDefaultConsumptionUnit } from '@/utils/unitConversion';

export function StockRequestPanel({ isOpen, onClose, screenName }) {
    const { user } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [allowedItems, setAllowedItems] = useState([]);
    const [allItems, setAllItems] = useState([]);
    const [activeTab, setActiveTab] = useState('role'); // 'role' or 'catalog'
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [selectedUnit, setSelectedUnit] = useState('units');
    const [autoMapRequest, setAutoMapRequest] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const panelRef = useRef(null);
    usePanelEntry(panelRef, isOpen);
    useFocusTrap(panelRef, isOpen, onClose);

    const getScreenName = () => {
        if (screenName) return screenName;
        const path = window.location.pathname.toLowerCase();
        if (path.includes('reception')) return 'Reception';
        if (path.includes('phlebotomy')) return 'Phlebotomy';
        if (path.includes('radiology') || path.includes('xray') || path.includes('mri') || path.includes('ct')) return 'Radiology';
        if (path.includes('lab') || path.includes('workbench') || path.includes('processing')) return 'Lab Workbench';
        if (path.includes('pathology')) return 'Pathology Desk';
        if (path.includes('typing') || path.includes('typist')) return 'Report Typing';
        if (path.includes('delivery') || path.includes('dispatch')) return 'Dispatch & Logistics';
        return 'Operations Screen';
    };

    useEffect(() => {
        if (isOpen) {
            loadItems();
        } else {
            // Reset state on close
            setSearchQuery('');
            setSelectedItem(null);
            setQuantity(1);
            setSelectedUnit('units');
            setAutoMapRequest(false);
            setError(null);
            setSuccess(false);
            setActiveTab('role');
        }
    }, [isOpen]);

    useEffect(() => {
        if (selectedItem) {
            setSelectedUnit(getDefaultConsumptionUnit(selectedItem.unitOfMeasure));
        }
    }, [selectedItem]);

    const loadItems = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [allowed, all] = await Promise.all([
                InventoryApi.getAllowedItems(),
                InventoryApi.getAllActiveItems()
            ]);
            setAllowedItems(allowed || []);
            setAllItems(all || []);
            
            // If user has role mapped items, default to role tab; otherwise fall back to catalog tab
            if ((allowed || []).length > 0) {
                setActiveTab('role');
            } else {
                setActiveTab('catalog');
            }
        } catch (err) {
            console.error("Failed to load inventory items", err);
            setError("Could not load inventory items. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const isSelectedItemRoleMapped = selectedItem && allowedItems.some(i => i.consumableId === selectedItem.consumableId);

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!selectedItem) return;

        setIsSubmitting(true);
        setError(null);

        const baseUom = selectedItem.unitOfMeasure || 'units';
        const baseQty = calculateBaseQuantity(quantity, selectedUnit, baseUom);
        const fromScreen = getScreenName();
        const userRoleName = user?.role || user?.designation || 'Admin';

        try {
            await InventoryApi.createRequest(selectedItem.consumableId, baseQty, user?.branchId, fromScreen, userRoleName);
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

    const currentCatalog = activeTab === 'role' ? allowedItems : allItems;
    const filteredItems = currentCatalog.filter(item => 
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
                        <p className={cn("text-[10px] uppercase font-semibold tracking-wider flex items-center gap-1.5", ui.subtitle)}>
                            <span>{user?.branchName || 'Main Lab'}</span>
                            <span>•</span>
                            <span className="text-emerald-500 font-bold">{user?.role || 'Staff'} Role</span>
                        </p>
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
            <div className="flex-1 min-h-0 flex flex-col p-6 space-y-5 overflow-y-auto custom-scrollbar">
                {success ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center animate-in zoom-in duration-300">
                        <div className="mb-4 rounded-full bg-emerald-500/20 p-4 text-emerald-500">
                            <Check className="h-12 w-12" />
                        </div>
                        <h4 className={cn("text-xl font-bold", ui.title)}>Stock Request Submitted</h4>
                        <p className={cn("mt-2 text-sm", ui.subtitle)}>The store manager will process your request shortly.</p>
                    </div>
                ) : (
                    <>
                        {/* Prominent Role vs Central Catalog Tabs */}
                        <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/50">
                            <button
                                onClick={() => { setActiveTab('role'); setSelectedItem(null); }}
                                className={cn(
                                    "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all",
                                    activeTab === 'role'
                                        ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                                )}
                            >
                                <Star className="w-3.5 h-3.5 fill-current" />
                                <span>Role Items ({allowedItems.length})</span>
                            </button>

                            <button
                                onClick={() => { setActiveTab('catalog'); setSelectedItem(null); }}
                                className={cn(
                                    "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all",
                                    activeTab === 'catalog'
                                        ? "bg-white dark:bg-zinc-900 text-synos-primary dark:text-blue-400 shadow-xs"
                                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                                )}
                            >
                                <Package className="w-3.5 h-3.5" />
                                <span>All Catalog ({allItems.length})</span>
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                            <input 
                                type="text"
                                placeholder={activeTab === 'role' ? `Search ${allowedItems.length} assigned ${user?.role || 'role'} items...` : `Search entire ${allItems.length} inventory catalog...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={cn("w-full rounded-xl border py-2.5 pl-10 pr-4 text-xs font-medium outline-none transition-all", ui.input)}
                            />
                        </div>

                        {/* Items List */}
                        <div className="flex-1 min-h-[220px] max-h-64 space-y-1 overflow-y-auto custom-scrollbar pr-1">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-10 opacity-40">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                    <p className="mt-2 text-xs font-semibold uppercase tracking-wider">Scanning Inventory Catalog...</p>
                                </div>
                            ) : filteredItems.length === 0 ? (
                                <div className="py-8 text-center opacity-50 space-y-2">
                                    <AlertTriangle className="mx-auto h-7 w-7 text-amber-500" />
                                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                        {activeTab === 'role' ? `No inventory items mapped to '${user?.role || 'Staff'}' role yet` : 'No inventory items match your search'}
                                    </p>
                                    {activeTab === 'role' && (
                                        <button 
                                            onClick={() => setActiveTab('catalog')}
                                            className="text-xs text-synos-primary font-bold hover:underline block mx-auto"
                                        >
                                            Browse Entire 38-Item Central Catalog ➔
                                        </button>
                                    )}
                                </div>
                            ) : (
                                filteredItems.map((item) => {
                                    const isMappedToUserRole = allowedItems.some(i => i.consumableId === item.consumableId);

                                    return (
                                        <button
                                            key={item.consumableId}
                                            onClick={() => setSelectedItem(item)}
                                            className={cn(
                                                "flex w-full items-center justify-between rounded-xl p-3 text-left transition-all border mb-1.5",
                                                selectedItem?.consumableId === item.consumableId
                                                    ? ui.itemCard.selected
                                                    : ui.itemCard.hover
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "rounded-lg p-2 shrink-0",
                                                    selectedItem?.consumableId === item.consumableId 
                                                        ? "bg-emerald-500/20 text-emerald-500" 
                                                        : isDark ? "bg-black/20 text-zinc-400" : "bg-zinc-100 text-zinc-500"
                                                )}>
                                                    <Package className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold flex items-center gap-2">
                                                        <span>{item.name}</span>
                                                        {isMappedToUserRole && (
                                                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-500">Role Item</span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] opacity-60 font-mono mt-0.5">{item.code} • Stock Unit: {item.unitOfMeasure}</div>
                                                </div>
                                            </div>

                                            {selectedItem?.consumableId === item.consumableId && (
                                                <div className="bg-emerald-500 text-white rounded-full p-1">
                                                    <Check className="h-3.5 w-3.5" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {/* Selected Item Quantity & Unit Section */}
                        {selectedItem && (
                            <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/60 space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className={cn("text-[10px] uppercase font-bold tracking-wider block", ui.subtitle)}>Requested Quantity & Unit</label>
                                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{selectedItem.name}</span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <input 
                                        type="number"
                                        step="any"
                                        min="0.0001"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        className={cn("w-28 rounded-xl border py-2.5 px-3 text-center text-lg font-bold outline-none transition-all", ui.input)}
                                    />
                                    
                                    <select
                                        value={selectedUnit}
                                        onChange={(e) => setSelectedUnit(e.target.value)}
                                        className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 py-3 px-3 text-xs font-bold bg-white dark:bg-zinc-900 text-synos-primary outline-none"
                                    >
                                        {getCompatibleUnits(selectedItem.unitOfMeasure).map(u => (
                                            <option key={u.value} value={u.value}>{u.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Live Equivalency Helper */}
                                <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl flex items-center gap-2">
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                    <span>
                                        <strong>{quantity} {selectedUnit}</strong>  ➜  Equiv. <strong>{calculateBaseQuantity(quantity, selectedUnit, selectedItem.unitOfMeasure)} {selectedItem.unitOfMeasure}</strong> stock deduction
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Unmapped / Cross-Role Governance Notice */}
                        {selectedItem && !isSelectedItemRoleMapped && (
                            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2 animate-in fade-in duration-200">
                                <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold">
                                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>Cross-Role Request Notice</span>
                                </div>
                                <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
                                    <strong>{selectedItem.name}</strong> is outside your standard <strong>{user?.role || 'Staff'}</strong> role catalog. Requesting this will require Store Manager approval.
                                </p>
                                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={autoMapRequest}
                                        onChange={(e) => setAutoMapRequest(e.target.checked)}
                                        className="rounded border-amber-500 text-amber-600 focus:ring-amber-500"
                                    />
                                    <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                                        Recommend adding this item to '{user?.role || 'Staff'}' role for future quick access
                                    </span>
                                </label>
                            </div>
                        )}

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
                            "w-full rounded-xl py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95 disabled:opacity-30 disabled:active:scale-100",
                            !selectedItem 
                                ? (isDark ? "bg-zinc-800 text-zinc-500" : "bg-zinc-100 text-zinc-400") 
                                : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-900/20"
                        )}
                    >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Submit Stock Request <ArrowRight className="h-4 w-4" /></>}
                    </button>
                </div>
            )}
        </div>
    );
}
