import React, { useState, useEffect, useRef } from 'react';
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
                            <select 
                                required
                                value={manualEntry.consumableId}
                                onChange={(e) => setManualEntry({...manualEntry, consumableId: e.target.value})}
                                className="w-full bg-zinc-50 dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-synos-primary/20"
                            >
                                <option value="">Select Item...</option>
                                {items.map(i => (
                                    <option key={i.itemId} value={i.itemId}>{i.name} ({i.itemCode})</option>
                                ))}
                            </select>
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
                                            <td className="p-2">
                                                <select value={entry.consumableId} onChange={(e) => { const n = [...bulkEntries]; n[index].consumableId = e.target.value; setBulkEntries(n); }} className="w-full bg-transparent outline-none p-2 focus:bg-zinc-100 dark:focus:bg-zinc-800 rounded-md">
                                                    <option value="">Select...</option>
                                                    {items.map(i => <option key={i.itemId} value={i.itemId}>{i.name}</option>)}
                                                </select>
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
