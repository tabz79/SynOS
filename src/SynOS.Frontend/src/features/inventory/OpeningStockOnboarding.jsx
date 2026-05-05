import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    Box, 
    Upload, 
    Table as TableIcon, 
    FileText, 
    Barcode, 
    Plus, 
    Trash2, 
    Save, 
    AlertCircle,
    ChevronRight,
    Search,
    CheckCircle2,
    X,
    Keyboard
} from 'lucide-react';
import { InventoryApi } from '@/api/inventory';
import { AdminApi } from '@/api/admin';
import { useAuth } from '@/context/AuthContext';

const GravityDropdown = ({ items, value, onChange, placeholder = "Select Item..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [dropdownStyles, setDropdownStyles] = useState({});
    const containerRef = useRef(null);
    const dropdownRef = useRef(null);
    const [newItem, setNewItem] = useState({ name: '', code: '', unit: 'units', category: 'General' });
    const [categories, setCategories] = useState(['Pathology', 'Radiology', 'Imaging', 'Consumable', 'Stationery', 'General']);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategory, setNewCategory] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (items.length > 0) {
            const catalogCategories = [...new Set(items.map(i => i.category).filter(Boolean))];
            setCategories(prev => [...new Set([...prev, ...catalogCategories])]);
        }
    }, [items]);

    const selectedItem = items.find(i => i.itemId === value);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target) && 
                dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setIsAddingNew(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const updatePosition = () => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const dropdownHeight = isAddingNew ? 450 : 350; // Increased threshold for safety

            const styles = {
                position: 'fixed',
                left: rect.left,
                width: rect.width,
                zIndex: 9999,
            };

            // Gravity Logic: If not enough space below, and more space above, flip up
            if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
                styles.bottom = window.innerHeight - rect.top + 8;
                styles.top = 'auto';
            } else {
                styles.top = rect.bottom + 8;
                styles.bottom = 'auto';
            }

            setDropdownStyles(styles);
        }
    };

    useLayoutEffect(() => {
        updatePosition();
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen, isAddingNew]);

    const handleSaveNewItem = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const result = await InventoryApi.createInventoryItem({
                name: newItem.name,
                itemCode: newItem.code,
                unitOfMeasure: newItem.unit,
                category: newItem.category,
                lowStockThreshold: 10
            });
            onChange(result.itemId);
            setIsAddingNew(false);
            setIsOpen(false);
            setNewItem({ name: '', code: '', unit: 'units', category: 'General' });
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredItems = items.filter(i => 
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        i.itemCode?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const cn = (...classes) => classes.filter(Boolean).join(' ');

    return (
        <div ref={containerRef} className="relative w-full">
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-200 rounded-xl px-4 py-3 cursor-pointer flex items-center justify-between group hover:border-synos-primary/50 transition-all"
            >
                <span className={selectedItem ? "text-sm font-black dark:text-white" : "text-sm text-zinc-500 font-medium"}>
                    {selectedItem ? `${selectedItem.name} (${selectedItem.itemCode})` : placeholder}
                </span>
                <ChevronRight className={cn("w-4 h-4 text-zinc-400 transition-transform duration-300", isOpen && "rotate-90 text-synos-primary")} />
            </div>

            {isOpen && createPortal(
                <div 
                    ref={dropdownRef}
                    style={dropdownStyles}
                    className="bg-white dark:bg-zinc-900 border dark:border-white/10 border-zinc-200 rounded-[1.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                >
                    {!isAddingNew ? (
                        <div className="flex flex-col h-full max-h-[300px]">
                            <div className="p-3 border-b dark:border-white/5 space-y-2 shrink-0">
                                <button 
                                    onClick={() => setIsAddingNew(true)}
                                    className="w-full flex items-center gap-3 p-3 bg-synos-primary/10 text-synos-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-synos-primary hover:text-white transition-all group"
                                >
                                    <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                                    Add New Item to Catalog
                                </button>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
                                    <input 
                                        autoFocus
                                        placeholder="Search catalog..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-zinc-50 dark:bg-zinc-950 border-none rounded-lg pl-9 pr-4 py-2 text-xs font-bold outline-none focus:ring-2 ring-synos-primary/20 transition-all dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                                {filteredItems.length === 0 ? (
                                    <div className="py-8 text-center text-[10px] font-black uppercase text-zinc-500 tracking-widest">No Matches Detected</div>
                                ) : (
                                    filteredItems.map(item => (
                                        <div 
                                            key={item.itemId}
                                            onClick={() => { onChange(item.itemId); setIsOpen(false); }}
                                            className="flex flex-col p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-white/5 cursor-pointer group transition-colors"
                                        >
                                            <span className="text-xs font-black dark:text-zinc-200 group-hover:text-synos-primary transition-colors">{item.name}</span>
                                            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mt-1">{item.itemCode}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSaveNewItem} className="p-6 space-y-4 animate-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Provisioning Form</h4>
                                <button type="button" onClick={() => setIsAddingNew(false)} className="text-[10px] font-black text-synos-primary hover:underline">Back to List</button>
                            </div>
                            
                            <div className="space-y-3">
                                <input required value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="Product Name" className="w-full bg-zinc-50 dark:bg-zinc-950 border dark:border-white/5 border-zinc-200 rounded-lg px-4 py-2 text-xs font-bold outline-none focus:ring-2 ring-synos-primary/20 dark:text-white" />
                                <div className="grid grid-cols-2 gap-3">
                                    <input required value={newItem.code} onChange={e => setNewItem({...newItem, code: e.target.value})} placeholder="Code" className="w-full bg-zinc-50 dark:bg-zinc-950 border dark:border-white/5 border-zinc-200 rounded-lg px-4 py-2 text-xs font-bold outline-none focus:ring-2 ring-synos-primary/20 dark:text-white uppercase" />
                                    <input required value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} placeholder="Unit (ml/box)" className="w-full bg-zinc-50 dark:bg-zinc-950 border dark:border-white/5 border-zinc-200 rounded-lg px-4 py-2 text-xs font-bold outline-none focus:ring-2 ring-synos-primary/20 dark:text-white" />
                                </div>
                                
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Category</label>
                                    </div>
                                    <div className="relative">
                                        {isAddingCategory ? (
                                            <div className="flex gap-2">
                                                <input 
                                                    autoFocus
                                                    value={newCategory}
                                                    onChange={e => setNewCategory(e.target.value)}
                                                    placeholder="Custom Category..."
                                                    className="flex-1 bg-zinc-50 dark:bg-zinc-950 border dark:border-white/5 border-zinc-200 rounded-lg px-4 py-2 text-xs font-bold outline-none focus:ring-2 ring-synos-primary/20 dark:text-white"
                                                />
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        if (newCategory.trim()) {
                                                            setCategories([...categories, newCategory.trim()]);
                                                            setNewItem({...newItem, category: newCategory.trim()});
                                                            setIsAddingCategory(false);
                                                            setNewCategory('');
                                                        }
                                                    }}
                                                    className="bg-synos-primary text-white p-2 rounded-lg"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </button>
                                                <button type="button" onClick={() => setIsAddingCategory(false)} className="bg-zinc-200 dark:bg-white/10 text-zinc-500 p-2 rounded-lg">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <select 
                                                value={newItem.category}
                                                onChange={(e) => {
                                                    if (e.target.value === 'NEW') {
                                                        setIsAddingCategory(true);
                                                    } else {
                                                        setNewItem({...newItem, category: e.target.value});
                                                    }
                                                }}
                                                className="w-full bg-zinc-50 dark:bg-zinc-950 border dark:border-white/5 border-zinc-200 rounded-lg px-4 py-2 text-xs font-bold outline-none focus:ring-2 ring-synos-primary/20 dark:text-white cursor-pointer"
                                            >
                                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                                <option value="NEW" className="text-synos-primary font-black">+ ADD NEW CATEGORY</option>
                                            </select>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button 
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-synos-primary text-white font-black py-3 rounded-xl shadow-lg shadow-synos-primary/20 flex items-center justify-center gap-2 uppercase tracking-[0.2em] text-[10px]"
                            >
                                {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                                Provision Item
                            </button>
                        </form>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};

export function OpeningStockOnboarding() {
    const { user } = useAuth();
    const [activeMethod, setActiveMethod] = useState('manual'); 
    const [items, setItems] = useState([]);
    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);

    // Manual Entry State
    const [manualEntry, setManualEntry] = useState({
        consumableId: '',
        quantity: '',
        batchNumber: '',
        expiryDate: ''
    });

    // Bulk Entry (Grid) State
    const [bulkEntries, setBulkEntries] = useState([]);

    const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);

    // Paste Area State
    const [pasteData, setPasteData] = useState('');

    // Barcode State
    const [barcodeInput, setBarcodeInput] = useState('');
    const barcodeRef = useRef(null);

    // File Input Ref
    const fileInputRef = useRef(null);

    useEffect(() => {
        loadMetadata();
    }, []);

    useEffect(() => {
        if (activeMethod === 'barcode' && barcodeRef.current) {
            barcodeRef.current.focus();
        }
    }, [activeMethod]);

    const loadMetadata = async () => {
        try {
            const [itemsData, branchesData] = await Promise.all([
                InventoryApi.getInventoryItems(),
                AdminApi.getBranches()
            ]);
            setItems(itemsData);
            setBranches(branchesData);
            
            if (user?.branchId) {
                setSelectedBranch(user.branchId);
            }
        } catch (err) {
            setError("Failed to load metadata.");
        }
    };

    const handleItemCreated = (newItem) => {
        setItems(prev => [...prev, newItem].sort((a, b) => a.name.localeCompare(b.name)));
        // Refresh catalog to ensure consistent state
        loadMetadata();
    };

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        if (!selectedBranch) { setError("Please select a target branch."); return; }
        
        setLoading(true);
        setError(null);
        try {
            await InventoryApi.createOpeningStockSingle({
                ...manualEntry,
                branchId: selectedBranch
            });
            setSuccess(true);
            setManualEntry({ consumableId: '', quantity: '', batchNumber: '', expiryDate: '' });
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkSubmit = async () => {
        const validEntries = bulkEntries.filter(e => e.consumableId && e.quantity);
        if (validEntries.length === 0) { setError("No valid entries to save."); return; }
        if (!selectedBranch) { setError("Please select a target branch."); return; }

        setLoading(true);
        setError(null);
        try {
            const payload = validEntries.map(e => ({
                consumableId: e.consumableId,
                quantity: parseFloat(e.quantity),
                batchNumber: e.batchNumber,
                expiryDate: e.expiryDate || null,
                branchId: selectedBranch
            }));
            await InventoryApi.createOpeningStockBulk(payload);
            setSuccess(true);
            setBulkEntries([]);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const parsePasteData = () => {
        const rows = pasteData.split('\n').filter(r => r.trim());
        const parsed = rows.map(row => {
            const cols = row.split('\t'); 
            const match = items.find(i => 
                i.name.toLowerCase() === cols[0]?.trim().toLowerCase() || 
                i.itemCode?.toLowerCase() === cols[0]?.trim().toLowerCase()
            );

            return {
                id: Math.random(),
                consumableId: match?.itemId || '',
                quantity: cols[1]?.trim() || '',
                batchNumber: cols[2]?.trim() || '',
                expiryDate: cols[3]?.trim() || ''
            };
        });
        setBulkEntries([...bulkEntries, ...parsed]);
        setActiveMethod('grid');
        setPasteData('');
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const rows = text.split('\n').slice(1); // Skip header
            const parsed = rows.map(row => {
                const cols = row.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
                if (cols.length < 2) return null;

                const match = items.find(i => 
                    i.name.toLowerCase() === cols[0]?.toLowerCase() || 
                    i.itemCode?.toLowerCase() === cols[0]?.toLowerCase()
                );

                return {
                    id: Math.random(),
                    consumableId: match?.itemId || '',
                    quantity: cols[1] || '',
                    batchNumber: cols[2] || '',
                    expiryDate: cols[3] || ''
                };
            }).filter(Boolean);

            setBulkEntries([...bulkEntries, ...parsed]);
            setActiveMethod('grid');
        };
        reader.readAsText(file);
    };

    const handleBarcodeScan = (e) => {
        if (e.key === 'Enter' && barcodeInput.trim()) {
            const match = items.find(i => 
                i.itemCode?.toLowerCase() === barcodeInput.trim().toLowerCase()
            );

            if (match) {
                setBulkEntries([{
                    id: Date.now(),
                    consumableId: match.itemId,
                    quantity: '1',
                    batchNumber: 'SCAN-LOT',
                    expiryDate: ''
                }, ...bulkEntries]);
                setBarcodeInput('');
                setActiveMethod('grid');
            } else {
                setError(`Barcode "${barcodeInput}" not found in catalog.`);
                setBarcodeInput('');
            }
        }
    };

    const methods = [
        { id: 'manual', name: 'Manual Entry', icon: Plus },
        { id: 'grid', name: 'Quick Grid', icon: TableIcon },
        { id: 'paste', name: 'Smart Paste', icon: FileText },
        { id: 'upload', name: 'Bulk Upload (.csv)', icon: Upload },
        { id: 'barcode', name: 'Barcode Scanner', icon: Barcode },
    ];

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Hidden File Input */}
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".csv" 
                onChange={handleFileUpload} 
            />

            {/* Header Area */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white text-zinc-900 tracking-tight">
                        Add Existing Stock
                    </h1>
                    <p className="text-zinc-500 text-sm mt-1">
                        Onboard your physical inventory into the digital ledger.
                    </p>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 ml-1">Target Branch</label>
                        <select 
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                            className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-synos-primary/20 min-w-[200px]"
                        >
                            <option value="">Select Branch...</option>
                            {branches.map(b => (
                                <option key={b.branchId} value={b.branchId}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Feedback */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center justify-between text-red-500 animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                    <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
                </div>
            )}

            {success && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-center gap-3 text-emerald-500 animate-in slide-in-from-top-4">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-medium">Stock Onboarded Successfully!</p>
                </div>
            )}

            {/* Tabs */}
            <div className="grid grid-cols-5 gap-2">
                {methods.map((m) => (
                    <button
                        key={m.id}
                        onClick={() => {
                            if (m.id === 'upload') {
                                fileInputRef.current.click();
                            } else {
                                setActiveMethod(m.id);
                            }
                        }}
                        className={`
                            flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all duration-300
                            ${activeMethod === m.id 
                                ? 'bg-synos-primary/10 border-synos-primary/30 text-synos-primary shadow-lg shadow-synos-primary/5' 
                                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700'
                            }
                        `}
                    >
                        <m.icon className={`w-6 h-6 ${activeMethod === m.id ? 'animate-pulse' : ''}`} />
                        <span className="text-xs font-semibold">{m.name}</span>
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 border-zinc-200 rounded-3xl p-8 shadow-xl relative min-h-[400px]">
                {activeMethod === 'manual' && (
                    <form onSubmit={handleManualSubmit} className="grid grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-300">
                        <div className="col-span-2 space-y-1">
                            <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Consumable Item</label>
                            <GravityDropdown 
                                items={items} 
                                value={manualEntry.consumableId} 
                                onChange={(val) => setManualEntry({...manualEntry, consumableId: val})}
                                placeholder="Search or Register Product..."
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Quantity</label>
                            <input type="number" required step="any" value={manualEntry.quantity} onChange={(e) => setManualEntry({...manualEntry, quantity: e.target.value})} placeholder="0.00" className="w-full bg-zinc-50 dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-200 rounded-xl px-4 py-3 outline-none" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Batch Number</label>
                            <input type="text" value={manualEntry.batchNumber} onChange={(e) => setManualEntry({...manualEntry, batchNumber: e.target.value})} placeholder="e.g. B123-X" className="w-full bg-zinc-50 dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-200 rounded-xl px-4 py-3 outline-none" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Expiry Date</label>
                            <input type="date" value={manualEntry.expiryDate} onChange={(e) => setManualEntry({...manualEntry, expiryDate: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-200 rounded-xl px-4 py-3 outline-none" />
                        </div>
                        <div className="col-span-2 pt-4">
                            <button type="submit" disabled={loading} className="w-full bg-synos-primary text-white font-bold py-4 rounded-2xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-synos-primary/20">
                                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                                Onboard Single Item
                            </button>
                        </div>
                    </form>
                )}

                {activeMethod === 'grid' && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                        <div className="max-h-[400px] overflow-y-auto rounded-xl border dark:border-zinc-800 border-zinc-200">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-zinc-50 dark:bg-zinc-950 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-4 font-bold text-zinc-500 uppercase text-[10px]">Item</th>
                                        <th className="p-4 font-bold text-zinc-500 uppercase text-[10px] w-32">Qty</th>
                                        <th className="p-4 font-bold text-zinc-500 uppercase text-[10px] w-40">Batch</th>
                                        <th className="p-4 font-bold text-zinc-500 uppercase text-[10px] w-48">Expiry</th>
                                        <th className="p-4 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-zinc-800 divide-zinc-200">
                                    {bulkEntries.map((entry, index) => (
                                        <tr key={entry.id}>
                                            <td className="p-2 min-w-[300px]">
                                                <GravityDropdown 
                                                    items={items} 
                                                    value={entry.consumableId} 
                                                    onChange={(val) => { 
                                                        const n = [...bulkEntries]; 
                                                        n[index].consumableId = val; 
                                                        setBulkEntries(n); 
                                                    }} 
                                                />
                                            </td>
                                            <td className="p-2"><input type="number" value={entry.quantity} onChange={(e) => { const n = [...bulkEntries]; n[index].quantity = e.target.value; setBulkEntries(n); }} className="w-full bg-transparent outline-none p-2 focus:bg-zinc-100 dark:focus:bg-zinc-800 rounded-md" /></td>
                                            <td className="p-2"><input type="text" value={entry.batchNumber} onChange={(e) => { const n = [...bulkEntries]; n[index].batchNumber = e.target.value; setBulkEntries(n); }} className="w-full bg-transparent outline-none p-2 focus:bg-zinc-100 dark:focus:bg-zinc-800 rounded-md" /></td>
                                            <td className="p-2"><input type="date" value={entry.expiryDate} onChange={(e) => { const n = [...bulkEntries]; n[index].expiryDate = e.target.value; setBulkEntries(n); }} className="w-full bg-transparent outline-none p-2 focus:bg-zinc-100 dark:focus:bg-zinc-800 rounded-md" /></td>
                                            <td className="p-2"><button onClick={() => setBulkEntries(bulkEntries.filter((_, i) => i !== index))} className="p-2 text-zinc-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex items-center justify-between">
                            <button onClick={() => setBulkEntries([...bulkEntries, { id: Date.now(), consumableId: '', quantity: '', batchNumber: '', expiryDate: '' }])} className="text-synos-primary text-sm font-bold flex items-center gap-2 hover:underline"><Plus className="w-4 h-4" /> Add Row</button>
                            <button onClick={handleBulkSubmit} disabled={loading} className="bg-synos-primary text-white font-bold px-8 py-3 rounded-xl flex items-center gap-2">{loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />} Commit {bulkEntries.length} Items</button>
                        </div>
                    </div>
                )}

                {activeMethod === 'paste' && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                        <textarea value={pasteData} onChange={(e) => setPasteData(e.target.value)} placeholder="Paste Excel rows here..." className="w-full h-64 bg-zinc-50 dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-200 rounded-2xl p-6 font-mono text-xs outline-none focus:ring-2 focus:ring-synos-primary/20" />
                        <button onClick={parsePasteData} className="w-full bg-synos-primary text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2"><Search className="w-5 h-5" /> Parse Paste Buffer</button>
                    </div>
                )}

                {activeMethod === 'barcode' && (
                    <div className="flex flex-col items-center justify-center gap-8 py-12 animate-in fade-in zoom-in-95 duration-300">
                        <div className="w-24 h-24 bg-synos-primary/10 rounded-full flex items-center justify-center">
                            <Barcode className="w-12 h-12 text-synos-primary" />
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-xl font-bold dark:text-white">Waiting for Scan...</h3>
                            <p className="text-sm text-zinc-500">Scan an item barcode or type the code below.</p>
                        </div>
                        <div className="relative w-full max-w-sm">
                            <Keyboard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <input 
                                ref={barcodeRef}
                                type="text"
                                value={barcodeInput}
                                onChange={(e) => setBarcodeInput(e.target.value)}
                                onKeyDown={handleBarcodeScan}
                                placeholder="Scan or Type Item Code..."
                                className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl pl-12 pr-4 py-4 font-bold outline-none ring-2 ring-synos-primary/10 focus:ring-synos-primary/50 transition-all text-center"
                            />
                        </div>
                        <div className="flex flex-wrap justify-center gap-4 mt-4">
                            <div className="bg-zinc-50 dark:bg-white/5 px-4 py-2 rounded-lg border dark:border-white/5 text-[10px] font-bold text-zinc-400">AUTOFOCUS ENABLED</div>
                            <div className="bg-zinc-50 dark:bg-white/5 px-4 py-2 rounded-lg border dark:border-white/5 text-[10px] font-bold text-zinc-400">ENTER TO COMMIT</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
