
import { useState, useEffect, useRef } from 'react';
import { cn } from "@/lib/utils";
import { ProcessingApi } from '@/api/processing';
import { User, Clipboard, Hash, Clock, AlertCircle } from 'lucide-react';
import { ResultEntryGrid } from './ResultEntryGrid';

export function DepartmentWorkbenchIntentPanel({ assignmentId, onClose, onDirtyUpdate, saveTriggerRef }) {
    const [detail, setDetail] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Centralized results state: { [parameterCode]: value }
    const [results, setResults] = useState({});
    const initialResultsRef = useRef({});

    useEffect(() => {
        if (!assignmentId) return;

        const loadDetail = async () => {
            try {
                setIsLoading(true);
                const data = await ProcessingApi.getAssignmentDetail(assignmentId);
                setDetail(data);
                
                // Initialize results
                const initial = {};
                data.tests?.forEach(test => {
                    test.parameters?.forEach(p => {
                        if (p.existingResultValue) initial[p.parameterCode] = p.existingResultValue;
                    });
                });
                setResults(initial);
                initialResultsRef.current = initial;
            } catch (err) {
                console.error("Failed to load assignment detail", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadDetail();
    }, [assignmentId]);

    const handleValueChange = (parameterCode, value) => {
        setResults(prev => {
            const next = { ...prev, [parameterCode]: value };
            const isDirty = JSON.stringify(next) !== JSON.stringify(initialResultsRef.current);
            onDirtyUpdate?.(isDirty);
            return next;
        });
    };

    const handleSaveDraft = async () => {
        try {
            setIsSaving(true);
            // Format for API: results is a map, DTO expects a list in request
            const resultsList = Object.entries(results).map(([parameterCode, value]) => ({
                // We need orderId here. In a multi-test assignment, we need to map parameter back to order.
                // For now, let's assume we can find it or simplify the API update.
                // Wait, the API SubmitAssignmentResultsRequestDto expects Results: [{ OrderId, ParameterCode, Value }]
                // Let's refine the results state to { [parameterCode]: { orderId, value } }
            }));
            
            // Re-evaluating: let's stick to the simplest format that works.
            // I'll update the saving logic to rebuild the DTO.
            const dataToSave = [];
            detail.tests.forEach(test => {
                test.parameters.forEach(p => {
                    if (results[p.parameterCode] !== undefined) {
                        dataToSave.push({
                            orderId: test.orderId,
                            parameterCode: p.parameterCode,
                            value: results[p.parameterCode]
                        });
                    }
                });
            });

            await ProcessingApi.saveDraft(assignmentId, dataToSave);
            initialResultsRef.current = { ...results };
            onDirtyUpdate?.(false);
        } catch (err) {
            console.error("Save Draft failed", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleComplete = async () => {
        try {
            setIsSaving(true);
            await handleSaveDraft();
            await ProcessingApi.completeAssignment(assignmentId);
            onClose();
        } catch (err) {
            console.error("Completion failed", err);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center dark:bg-zinc-900 bg-white rounded-xl border dark:border-white/5 border-zinc-200">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-800 rounded-full" />
                    <div className="text-zinc-500 font-bold uppercase text-xs tracking-widest">Hydrating Clinical Context...</div>
                </div>
            </div>
        );
    }

    if (!detail) return null;

    return (
        <div className="h-full dark:bg-zinc-900 bg-white rounded-xl border dark:border-white/5 border-zinc-200 shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Header: Clinical Context */}
            <div className="p-4 border-b dark:border-white/10 border-zinc-200 dark:bg-zinc-950/50 bg-zinc-50/50 relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase text-cyan-500 bg-cyan-500/10 px-1.5 py-0.5 rounded leading-none">
                                {detail.specimen?.accessionNumber}
                            </span>
                            <span className={cn(
                                "text-[10px] font-black uppercase px-1.5 py-0.5 rounded leading-none",
                                detail.priority === 'Urgent' ? "bg-amber-500/20 text-amber-500" : "bg-zinc-500/10 text-zinc-500"
                            )}>
                                {detail.priority || 'Routine'}
                            </span>
                        </div>
                        <h3 className="text-xl font-black dark:text-white text-zinc-900 tracking-tight leading-none uppercase">
                            {detail.patient?.patientName}
                        </h3>
                        <div className="flex gap-4 mt-2">
                             <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                                <User className="w-3 h-3" />
                                {detail.patient?.sex} / {detail.patient?.age}Y
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium whitespace-nowrap">
                                <Clipboard className="w-3 h-3" />
                                {detail.specimen?.specimenType}
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-zinc-500/10 rounded-lg text-zinc-500 transition-colors"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Content: Entry Grid */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                {detail.tests?.map((test, tIdx) => (
                    <div key={test.orderId} className="mb-6">
                        <div className="px-4 py-2 dark:bg-zinc-800/30 bg-zinc-100 flex items-center justify-between sticky top-0 z-10 border-b dark:border-white/5 border-zinc-200">
                             <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                                <span className="text-[11px] font-black uppercase tracking-wider dark:text-zinc-400 text-zinc-600">
                                    {test.testName}
                                </span>
                             </div>
                        </div>
                        <ResultEntryGrid 
                            test={test} 
                            results={results}
                            onValueChange={handleValueChange}
                            onSaveDraft={handleSaveDraft}
                            isSaving={isSaving}
                        />
                    </div>
                ))}
            </div>

            {/* Footer Actions (Sticky) */}
            <div className="p-4 border-t dark:border-white/10 border-zinc-200 dark:bg-zinc-900 bg-white flex justify-end gap-3">
                <button 
                    onClick={onClose}
                    className="px-6 py-2 text-sm font-bold text-zinc-500 hover:text-zinc-700 transition-colors"
                >
                    Cancel
                </button>
                <div className="flex gap-2">
                    <button 
                         onClick={handleSaveDraft} 
                         disabled={isSaving}
                         className="px-6 py-2 rounded-lg text-sm font-bold border dark:border-white/10 border-zinc-200 dark:text-zinc-300 hover:bg-zinc-500/5 transition-all disabled:opacity-50"
                    >
                        Save Draft
                    </button>
                    <button 
                        onClick={handleComplete}
                        className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-cyan-500/20 transition-all active:scale-95 disabled:opacity-50"
                        disabled={isSaving}
                    >
                        Complete Processing
                    </button>
                </div>
            </div>
        </div>
    );
}
