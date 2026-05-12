import React, { useState } from 'react';
import { ReceptionApi } from '@/api/reception';
import { cn } from '@/lib/utils';
import { Beaker, Plus, Loader2 } from 'lucide-react';

const OutsourceDraftForm = ({ visitId, referenceLabs, onSuccess, onCancel, isDark, uiStyles }) => {
    const [testName, setTestName] = useState('');
    const [price, setPrice] = useState('');
    const [selectedLabId, setSelectedLabId] = useState('');
    const [isAddingNewLab, setIsAddingNewLab] = useState(false);
    const [newLabName, setNewLabName] = useState('');
    const [newLabLocation, setNewLabLocation] = useState('');
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!testName.trim()) {
            setError('Test Name is required.');
            return;
        }
        if (!price || isNaN(price)) {
            setError('Valid Dispatch Price is required.');
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
                parseFloat(price),
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
            <div className="flex items-center gap-2 mb-4">
                <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", 
                    isDark ? "bg-amber-500/10 text-amber-500" : "bg-amber-500/10 text-amber-600")}>
                    <Beaker className="w-3.5 h-3.5" />
                </div>
                <h4 className={cn(uiStyles.sectionTitle)}>
                    Manual Outsource Dispatch
                </h4>
            </div>

            {error && (
                <div className={cn("text-xs mb-3 font-medium p-2 rounded border", 
                    isDark ? "text-red-400 bg-red-900/20 border-red-500/30" : "text-red-600 bg-red-50 border-red-200")}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                            Test Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={testName}
                            onChange={(e) => setTestName(e.target.value)}
                            className={cn("w-full h-10 rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors disabled:opacity-50", uiStyles.input)}
                            placeholder="e.g. Rare Genetic Panel"
                            disabled={isSubmitting}
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                            Dispatch Price (₹) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
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
                            onChange={(e) => {
                                if (e.target.value === "NEW") {
                                    setIsAddingNewLab(true);
                                    setSelectedLabId('');
                                } else {
                                    setIsAddingNewLab(false);
                                    setSelectedLabId(e.target.value);
                                }
                            }}
                            className={cn("flex-1 h-10 rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors disabled:opacity-50", uiStyles.input)}
                            disabled={isSubmitting}
                        >
                            <option value="">Select Lab...</option>
                            {referenceLabs.map(lab => (
                                <option key={lab.id} value={lab.id}>{lab.name}</option>
                            ))}
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
                        disabled={isSubmitting || !testName.trim() || !price}
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
