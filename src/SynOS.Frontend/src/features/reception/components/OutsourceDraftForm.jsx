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
        <div className={cn(uiStyles.section, "animate-in fade-in zoom-in-95 duration-200")}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                    <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center border shadow-2xs", 
                        isDark ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-600 border-blue-200/80"
                    )}>
                        <Beaker className="w-4 h-4" />
                    </div>
                    <h4 className={uiStyles.sectionTitle}>
                        Outsource Dispatch
                    </h4>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                        type="checkbox" 
                        checked={isManualEntry}
                        onChange={(e) => handleToggleManual(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
                        Manual Entry (New Test)
                    </span>
                </label>
            </div>

            {error && (
                <div className={cn("text-xs font-medium p-3 rounded-xl border animate-in fade-in", 
                    isDark ? "text-red-400 bg-red-900/20 border-red-500/30" : "text-red-700 bg-red-50 border-red-200")}>
                    {error}
                </div>
            )}

            <div className={cn("relative", isManualEntry && "opacity-40 grayscale pointer-events-none")}>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-zinc-300 tracking-normal mb-1.5">
                    Search Existing Catalog (Recommended)
                </label>
                <div className="relative">
                    <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        style={{ paddingLeft: '3rem', paddingRight: '1rem' }}
                        className={cn(uiStyles.input, "w-full h-12 rounded-xl text-base focus:outline-none transition-colors")}
                        placeholder={isManualEntry ? "Disabled in manual mode" : "Search by Test Name or Code..."}
                        disabled={isSubmitting || isManualEntry}
                    />
                </div>
                
                {showSuggestions && suggestions.length > 0 && (
                    <div className={cn(
                        "absolute top-full left-0 right-0 mt-1.5 rounded-xl p-1 shadow-xl z-30 border overflow-y-auto space-y-1 backdrop-blur-md max-h-56", 
                        uiStyles.suggestionBox,
                        isDark ? "bg-zinc-900/95 border-zinc-700/60 shadow-black/50" : "bg-white/95 border-zinc-200/90 shadow-zinc-900/10"
                    )}>
                        {suggestions.map(t => (
                            <button
                                key={t.testId || t.testCode}
                                type="button"
                                onClick={() => handleSelectTest(t)}
                                className={cn(
                                    "w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150 flex items-center justify-between group cursor-pointer",
                                    isDark ? "hover:bg-zinc-800/70 border border-transparent text-zinc-300 hover:text-white" : "hover:bg-zinc-50 border border-transparent text-zinc-700 hover:text-zinc-900"
                                )}
                            >
                                <div>
                                    <div className="text-sm font-bold text-slate-900 dark:text-white">{t.testName}</div>
                                    <div className="text-xs font-mono text-slate-500 dark:text-zinc-400 mt-0.5">{t.testCode}</div>
                                </div>
                                <div className="text-sm font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                                    ₹{t.basePrice}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className={cn("h-px w-full my-3", isDark ? "bg-zinc-800" : "bg-slate-200/70")} />

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                        <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-zinc-300 tracking-normal mb-1.5">
                            Test Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={testName}
                            onChange={(e) => setTestName(e.target.value)}
                            className={cn(uiStyles.input, "w-full h-12 rounded-xl text-base font-medium disabled:opacity-50")}
                            placeholder="e.g. Rare Genetic Panel"
                            disabled={isSubmitting || (!isManualEntry && selectedTest)}
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-zinc-300 tracking-normal mb-1.5">
                            Patient Price (₹) <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="number"
                            value={patientPrice}
                            onChange={(e) => setPatientPrice(e.target.value)}
                            className={cn(uiStyles.input, "w-full h-12 rounded-xl text-base font-mono font-bold text-slate-900 dark:text-white disabled:opacity-50")}
                            placeholder="0.00"
                            disabled={isSubmitting || (!isManualEntry && selectedTest)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-zinc-300 tracking-normal mb-1.5">
                            Vendor Cost (₹)
                        </label>
                        <input
                            type="number"
                            value={vendorCost}
                            onChange={(e) => setVendorCost(e.target.value)}
                            className={cn(uiStyles.input, "w-full h-12 rounded-xl text-base font-mono font-medium text-slate-700 dark:text-zinc-200 disabled:opacity-50")}
                            placeholder="0.00"
                            disabled={isSubmitting}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-zinc-300 tracking-normal mb-1.5">
                        Reference Lab Partner <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex gap-2">
                        <select
                            value={isAddingNewLab ? "NEW" : selectedLabId}
                            onChange={(e) => handleLabChange(e.target.value)}
                            className={cn(
                                uiStyles.input,
                                "w-full h-12 rounded-xl text-base font-medium cursor-pointer disabled:opacity-50", 
                                (!isManualEntry && selectedTest && selectedTest.labRates?.length === 1) && "bg-slate-100 dark:bg-zinc-800 cursor-not-allowed"
                            )}
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
                            <option value="NEW" className="text-blue-600 dark:text-blue-400 font-bold">+ Add New Reference Lab</option>
                        </select>
                    </div>
                </div>

                {isAddingNewLab && (
                    <div className={cn(
                        "p-4 rounded-xl border space-y-3 animate-in slide-in-from-top-2 duration-200", 
                        isDark ? "bg-zinc-950/60 border-zinc-800" : "bg-white/80 border-[#CCDCE8]"
                    )}>
                        <div className="text-xs font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider">Provisional Lab Details</div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-zinc-300 tracking-normal mb-1.5">
                                    Lab Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newLabName}
                                    onChange={(e) => setNewLabName(e.target.value)}
                                    className={cn(uiStyles.input, "w-full h-12 rounded-xl text-base font-medium")}
                                    placeholder="Enter lab name..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-zinc-300 tracking-normal mb-1.5">
                                    Location
                                </label>
                                <input
                                    type="text"
                                    value={newLabLocation}
                                    onChange={(e) => setNewLabLocation(e.target.value)}
                                    className={cn(uiStyles.input, "w-full h-12 rounded-xl text-base font-medium")}
                                    placeholder="City/Area..."
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="px-4 py-2.5 text-sm font-semibold rounded-xl text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || !testName.trim() || !patientPrice}
                        className="px-5 py-2.5 text-sm font-bold rounded-xl text-white bg-[#506A85] hover:bg-[#435970] shadow-xs active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Plus className="w-4 h-4" />
                        )}
                        <span>{isSubmitting ? 'Processing...' : 'Add Outsourced Test'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default OutsourceDraftForm;
