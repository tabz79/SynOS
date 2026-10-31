import React, { useState } from 'react';
import { ReceptionApi } from '@/api/reception';
import { cn } from '@/lib/utils';
import { Beaker, Plus, Loader2, Search } from 'lucide-react';

const OutsourceDraftForm = ({ visitId, referenceLabs, outsourcedCatalog = [], onSuccess, onCancel, isDark, uiStyles }) => {
    const [isManualEntry, setIsManualEntry] = useState(false);
    const [testName, setTestName] = useState('');
    const [patientPrice, setPatientPrice] = useState(''); // What lab charges patient (₹1000)
    const [vendorCost, setVendorCost] = useState(''); // What vendor charges us (₹400)
    const [selectedLabId, setSelectedLabId] = useState('');
    const [isAddingNewLab, setIsAddingNewLab] = useState(false);
    const [newLabName, setNewLabName] = useState('');
    const [newLabLocation, setNewLabLocation] = useState('');
    
    const [selectedTest, setSelectedTest] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const suggestions = searchTerm.length < 2 ? [] : outsourcedCatalog.filter(t => 
        (t.testName || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
        (t.testCode || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleToggleManual = (checked) => {
        setIsManualEntry(checked);
        if (checked) {
            setSelectedTest(null);
            setSearchTerm('');
            setTestName('');
            setPatientPrice('');
            setVendorCost('');
            setSelectedLabId('');
            setIsAddingNewLab(false);
        }
    };

    const handleSelectTest = (test) => {
        setIsManualEntry(false);
        setSelectedTest(test);
        setTestName(test.testName);
        setPatientPrice(test.basePrice || '');
        setSearchTerm(test.testName);
        setShowSuggestions(false);
        
        // Auto-select lab and price if rules exist
        if (test.labRates && test.labRates.length > 0) {
            const firstRule = test.labRates[0];
            setSelectedLabId(firstRule.labId);
            setVendorCost(firstRule.cost);
            setIsAddingNewLab(false);
        } else {
            setVendorCost('');
            setSelectedLabId('');
        }
    };

    const handleLabChange = (labId) => {
        if (labId === "NEW") {
            setIsAddingNewLab(true);
            setSelectedLabId('');
        } else {
            setIsAddingNewLab(false);
            setSelectedLabId(labId);
            
            // Update vendor cost from rules if catalog test is selected
            if (selectedTest && selectedTest.labRates) {
                const rule = selectedTest.labRates.find(r => r.labId === labId);
                if (rule) {
                    setVendorCost(rule.cost);
                }
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!testName.trim()) {
            setError('Test Name is required.');
            return;
        }
        if (!patientPrice || isNaN(patientPrice)) {
            setError('Valid Patient Price is required.');
            return;
        }
        if (vendorCost && isNaN(vendorCost)) {
            setError('Vendor Cost must be a number.');
            return;
        }
        if (!isAddingNewLab && !selectedLabId) {
            setError('Please select a Reference Lab or add a new one.');
            return;
        }
        if (isAddingNewLab && !newLabName.trim()) {
            setError('New Lab Name is required.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            let finalLabId = selectedLabId;

            // 1. Create Draft Lab if needed
            if (isAddingNewLab) {
                const draftLab = await ReceptionApi.createDraftReferenceLab({
                    name: newLabName,
                    location: newLabLocation,
                    status: 'Provisional'
                });
                finalLabId = draftLab.id || draftLab.Id;
            }

            // 2. Add Outsourced Test to Visit
            await ReceptionApi.addOutsourcedTestToVisit(
                visitId,
                testName,
                parseFloat(patientPrice),
                vendorCost ? parseFloat(vendorCost) : null,
                finalLabId
            );

            if (onSuccess) onSuccess();
        } catch (err) {
            setError(err.message || 'Failed to add outsourced test.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className={cn("p-4 animate-in fade-in zoom-in-95 duration-200 border rounded-xl", uiStyles.section)}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", 
                        isDark ? "bg-amber-500/10 text-amber-500" : "bg-amber-500/10 text-amber-600")}>
                        <Beaker className="w-3.5 h-3.5" />
                    </div>
                    <h4 className={cn(uiStyles.sectionTitle)}>
                        Outsource Dispatch
                    </h4>
                </div>

                <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                        type="checkbox" 
                        checked={isManualEntry}
                        onChange={(e) => handleToggleManual(e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-300 text-synos-primary focus:ring-synos-primary"
                    />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest group-hover:text-amber-500 transition-colors">
                        Manual Entry (New Test)
                    </span>
                </label>
            </div>

            {error && (
                <div className={cn("text-xs mb-3 font-medium p-2 rounded border", 
                    isDark ? "text-red-400 bg-red-900/20 border-red-500/30" : "text-red-600 bg-red-50 border-red-200")}>
                    {error}
                </div>
            )}

            <div className={cn("mb-4 relative", isManualEntry && "opacity-40 grayscale pointer-events-none")}>
                <label className="block text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <Search className="w-3 h-3" />
                    Search Existing Catalog (Recommended)
                </label>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    className={cn("w-full h-10 rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors border-amber-500/20", uiStyles.input)}
                    placeholder={isManualEntry ? "Disabled in manual mode" : "Search by Test Name or Code..."}
                    disabled={isSubmitting || isManualEntry}
                />
                
                {showSuggestions && suggestions.length > 0 && (
                    <div className={cn("absolute top-full left-0 right-0 mt-1 rounded-lg overflow-y-auto z-20 border shadow-xl max-h-48", 
                        isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200")}>
                        {suggestions.map(t => (
                            <button
                                key={t.testId || t.testCode}
                                type="button"
                                onClick={() => handleSelectTest(t)}
                                className={cn("w-full text-left px-3 py-2 transition-colors border-b last:border-0 flex items-center justify-between group",
                                    isDark ? "hover:bg-zinc-800 border-zinc-800/50" : "hover:bg-zinc-50 border-zinc-100")}
                            >
                                <div>
                                    <div className="text-sm font-medium">{t.testName}</div>
                                    <div className="text-[10px] opacity-50 font-mono">{t.testCode}</div>
                                </div>
                                <div className="text-xs font-bold text-amber-500 group-hover:scale-110 transition-transform">
                                    ₹{t.basePrice}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className={cn("h-px w-full mb-6", isDark ? "bg-zinc-800" : "bg-zinc-100")} />

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                            Test Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={testName}
                            onChange={(e) => setTestName(e.target.value)}
                            className={cn("w-full h-10 rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors disabled:opacity-50", uiStyles.input)}
                            placeholder="e.g. Rare Genetic Panel"
                            disabled={isSubmitting || (!isManualEntry && selectedTest)}
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-synos-primary uppercase tracking-wider mb-1.5">
                            Patient Price (₹) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            value={patientPrice}
                            onChange={(e) => setPatientPrice(e.target.value)}
                            className={cn("w-full h-10 rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors disabled:opacity-50 font-bold", uiStyles.input)}
                            placeholder="0.00"
                            disabled={isSubmitting || (!isManualEntry && selectedTest)}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1.5">
                            Vendor Cost (₹)
                        </label>
                        <input
                            type="number"
                            value={vendorCost}
                            onChange={(e) => setVendorCost(e.target.value)}
                            className={cn("w-full h-10 rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors disabled:opacity-50", uiStyles.input)}
                            placeholder="0.00"
                            disabled={isSubmitting}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                        Reference Lab Partner <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                        <select
                            value={isAddingNewLab ? "NEW" : selectedLabId}
                            onChange={(e) => handleLabChange(e.target.value)}
                            className={cn("flex-1 h-10 rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors disabled:opacity-50", 
                                uiStyles.input, 
                                (!isManualEntry && selectedTest && selectedTest.labRates?.length === 1) && "bg-zinc-100 dark:bg-zinc-800 cursor-not-allowed")}
                            disabled={isSubmitting || (!isManualEntry && selectedTest && selectedTest.labRates?.length === 1)}
                        >
                            <option value="">Select Lab...</option>
                            {referenceLabs
                                .filter(lab => {
                                    if (isManualEntry || !selectedTest || !selectedTest.labRates || selectedTest.labRates.length === 0) return true;
                                    return selectedTest.labRates.some(r => r.labId === lab.id);
                                })
                                .map(lab => (
                                    <option key={lab.id} value={lab.id}>{lab.name}</option>
                                ))
                            }
                            <option value="NEW" className="text-amber-500 font-bold">+ Add New Reference Lab</option>
                        </select>
                    </div>
                </div>

                {isAddingNewLab && (
                    <div className={cn("p-3 rounded-lg border space-y-3 animate-in slide-in-from-top-2 duration-200", 
                        isDark ? "bg-black/20 border-zinc-800" : "bg-white/40 border-black/5")}>
                        <div className="text-[10px] font-black text-amber-500/50 uppercase tracking-widest">Provisional Lab Details</div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                                    Lab Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newLabName}
                                    onChange={(e) => setNewLabName(e.target.value)}
                                    className={cn("w-full h-9 rounded-lg px-3 text-sm focus:outline-none transition-colors", uiStyles.input)}
                                    placeholder="Enter lab name..."
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                                    Location
                                </label>
                                <input
                                    type="text"
                                    value={newLabLocation}
                                    onChange={(e) => setNewLabLocation(e.target.value)}
                                    className={cn("w-full h-9 rounded-lg px-3 text-sm focus:outline-none transition-colors", uiStyles.input)}
                                    placeholder="City/Area..."
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className={cn("px-4 py-2 text-xs font-medium transition-colors disabled:opacity-50",
                            isDark ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900")}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || !testName.trim() || !patientPrice}
                        className={cn("px-4 py-2 text-xs font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2",
                            isDark 
                                ? "text-white bg-amber-600 border border-amber-500/30 hover:bg-amber-500" 
                                : "text-white bg-zinc-900 border border-black/10 hover:bg-black")}
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                            <Plus className="w-3 h-3" />
                        )}
                        {isSubmitting ? 'Processing...' : 'Add Outsourced Test'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default OutsourceDraftForm;
