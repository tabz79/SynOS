
import { useState, useEffect, useRef } from 'react';
import { cn } from "@/lib/utils";
import { ProcessingApi } from '@/api/processing';
import { User, Clipboard, Hash, Clock, AlertCircle, Loader2, ArrowRight, Cpu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { RichPatientCard } from '@/components/patient/RichPatientCard';
import { ResultEntryGrid } from './ResultEntryGrid';

const evaluateFormula = (formula, values) => {
    try {
        const tokens = formula.match(/\b[A-Za-z_][A-Za-z0-9_]*\b/g) || [];
        const evalValues = {};
        for (const token of tokens) {
            const valStr = values[token];
            if (valStr === undefined || valStr === null || valStr === '' || valStr === '-') {
                return '';
            }
            const val = parseFloat(valStr);
            if (isNaN(val)) {
                return '';
            }
            evalValues[token] = val;
        }

        let expr = formula;
        const sortedTokens = [...tokens].sort((a, b) => b.length - a.length);
        for (const token of sortedTokens) {
            const regex = new RegExp(`\\b${token}\\b`, 'g');
            expr = expr.replace(regex, evalValues[token]);
        }

        if (!/^[0-9+\-*/().\s]+$/.test(expr)) {
            return '';
        }

        let result = Function(`"use strict"; return (${expr})`)();
        
        if (result === Infinity || result === -Infinity || isNaN(result)) {
            return '-';
        }
        
        return Number(result).toFixed(2);
    } catch (err) {
        console.error("Formula evaluation error:", formula, err);
        return '';
    }
};

const runCalculations = (currentResults, parameters) => {
    const newResults = { ...currentResults };
    const calculatedParams = parameters.filter(p => p.isCalculated);
    
    if (calculatedParams.length === 0) return newResults;

    let changed = true;
    let passes = 0;
    while (changed && passes < 3) {
        changed = false;
        passes++;
        
        for (const param of calculatedParams) {
            const prevVal = newResults[param.parameterCode];
            let newVal = '';
            
            if (param.formula) {
                newVal = evaluateFormula(param.formula, newResults);
            } else {
                // Hardcoded fallback for known parameters (Legacy Fallback matching C# backend)
                const code = param.parameterCode;
                if (code === "GLOB" || code === "GLOBULIN") {
                    const tpVal = newResults["TP"] ?? newResults["T_P"] ?? newResults["TOTAL_PROTEIN"];
                    const albVal = newResults["ALB"] ?? newResults["ALBUMIN"];
                    if (tpVal !== undefined && tpVal !== null && tpVal !== '' && tpVal !== '-' &&
                        albVal !== undefined && albVal !== null && albVal !== '' && albVal !== '-') {
                        const tp = parseFloat(tpVal);
                        const alb = parseFloat(albVal);
                        if (!isNaN(tp) && !isNaN(alb)) {
                            newVal = (tp - alb).toFixed(2);
                        }
                    }
                } else if (code === "AG_RATIO" || code === "ALB : GLOB" || code === "ALB_GLOB") {
                    const albVal = newResults["ALB"] ?? newResults["ALBUMIN"];
                    const tpVal = newResults["TP"] ?? newResults["T_P"] ?? newResults["TOTAL_PROTEIN"];
                    if (tpVal !== undefined && tpVal !== null && tpVal !== '' && tpVal !== '-' &&
                        albVal !== undefined && albVal !== null && albVal !== '' && albVal !== '-') {
                        const tp = parseFloat(tpVal);
                        const alb = parseFloat(albVal);
                        if (!isNaN(tp) && !isNaN(alb)) {
                            const glob = tp - alb;
                            if (glob !== 0) {
                                newVal = (alb / glob).toFixed(2);
                            } else {
                                newVal = "-";
                            }
                        }
                    }
                } else if (code === "BIL_I" || code === "BILIRUBIN_INDIRECT") {
                    const totalVal = newResults["BIL_T"] ?? newResults["BILIRUBIN_TOTAL"];
                    const directVal = newResults["BIL_D"] ?? newResults["BILIRUBIN_DIRECT"];
                    if (totalVal !== undefined && totalVal !== null && totalVal !== '' && totalVal !== '-' &&
                        directVal !== undefined && directVal !== null && directVal !== '' && directVal !== '-') {
                        const total = parseFloat(totalVal);
                        const direct = parseFloat(directVal);
                        if (!isNaN(total) && !isNaN(direct)) {
                            newVal = (total - direct).toFixed(2);
                        }
                    }
                } else if (code === "HCT" || code === "HEMATOCRIT") {
                    const rbcVal = newResults["RBC"];
                    const mcvVal = newResults["MCV"];
                    if (rbcVal !== undefined && rbcVal !== null && rbcVal !== '' && rbcVal !== '-' &&
                        mcvVal !== undefined && mcvVal !== null && mcvVal !== '' && mcvVal !== '-') {
                        const rbc = parseFloat(rbcVal);
                        const mcv = parseFloat(mcvVal);
                        if (!isNaN(rbc) && !isNaN(mcv)) {
                            newVal = (rbc * mcv / 10).toFixed(1);
                        }
                    }
                }
            }
            
            if (newVal !== prevVal) {
                newResults[param.parameterCode] = newVal;
                changed = true;
            }
        }
    }
    return newResults;
};

export function DepartmentWorkbenchIntentPanel({ assignmentId, onClose, onDirtyUpdate, onUpdateLocalState }) {
    const { user } = useAuth();
    const [detail, setDetail] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importNotice, setImportNotice] = useState(null);
    const [error, setError] = useState(null);
    
    // Centralized results state: { [parameterCode]: value }
    const [results, setResults] = useState({});
    const initialResultsRef = useRef({});

    const handleImportFromAnalyzer = async () => {
        if (!assignmentId) return;
        try {
            setIsImporting(true);
            setError(null);
            setImportNotice(null);
            
            const res = await ProcessingApi.importFromAnalyzer(assignmentId);
            if (res && res.importedResults) {
                setResults(prev => {
                    const updated = {
                        ...prev,
                        ...res.importedResults
                    };
                    const paramsList = detail?.tests?.flatMap(t => t.parameters?.map(p => ({
                        parameterCode: p.parameterCode,
                        isCalculated: p.isCalculated || p.hasFormula || !!p.formula,
                        formula: p.formula
                    }))) || [];
                    return runCalculations(updated, paramsList);
                });
                onDirtyUpdate?.(true);
                setImportNotice(res.message || `✓ Imported ${res.importedCount || 3} parameter results from ${res.analyzerName || 'Analyzer'}`);
            }
        } catch (err) {
            console.error("Analyzer import error:", err);
            setError(err.message || "Failed to query connected blood analyzer.");
        } finally {
            setIsImporting(false);
        }
    };

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
                
                const paramsList = data.tests?.flatMap(t => t.parameters?.map(p => ({
                    parameterCode: p.parameterCode,
                    isCalculated: p.isCalculated || p.hasFormula || !!p.formula,
                    formula: p.formula
                }))) || [];
                
                const computed = runCalculations(initial, paramsList);
                setResults(computed);
                initialResultsRef.current = computed;
            } catch (err) {
                console.error("Failed to load assignment detail", err);
                setError("Failed to load assignment detail.");
            } finally {
                setIsLoading(false);
            }
        };

        loadDetail();
    }, [assignmentId]);

    const isAvailable = detail && !detail.assignedResourceId;
    const isAssignedToMe = detail && detail.assignedResourceId === user?.resourceId;

    const handleClaim = async () => {
        if (!assignmentId) return;
        setIsClaiming(true);
        setError(null);
        try {
            await ProcessingApi.claimAssignment(assignmentId);
            setDetail(prev => ({ ...prev, assignedResourceId: user.resourceId }));
            onUpdateLocalState?.(assignmentId, { 
                assignedResourceId: user.resourceId,
                assignedTechnicianName: user.name || user.username || 'Current User'
            });
        } catch (err) {
            setError(err.message || "Failed to claim assignment.");
        } finally {
            setIsClaiming(false);
        }
    };

    const handleValueChange = (parameterCode, value) => {
        setResults(prev => {
            const updated = {
                ...prev,
                [parameterCode]: value
            };
            const paramsList = detail?.tests?.flatMap(t => t.parameters?.map(p => ({
                parameterCode: p.parameterCode,
                isCalculated: p.isCalculated || p.hasFormula || !!p.formula,
                formula: p.formula
            }))) || [];
            return runCalculations(updated, paramsList);
        });
    };

    // Safe Side-Effect: Monitor results to update isDirty state in parent
    useEffect(() => {
        // Skip calling parent on first mount/hydrate
        if (isLoading) return;

        const isDirty = JSON.stringify(results) !== JSON.stringify(initialResultsRef.current);
        onDirtyUpdate?.(isDirty);
    }, [results, isLoading, onDirtyUpdate]);

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

    const handleSendEmptyToTypist = async () => {
        if (!window.confirm("Are you sure you want to send this report with empty values to the Typist?")) return;
        try {
            setIsSaving(true);
            await ProcessingApi.completeAssignment(assignmentId);
            onClose();
        } catch (err) {
            console.error("Skip to typist failed", err);
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
                <div className="flex justify-between items-start">
                    <div className="flex-1 mr-4">
                        <RichPatientCard 
                            patient={{
                                patientId: detail.patient?.patientId,
                                firstName: detail.patient?.patientName.split(' ')[0],
                                lastName: detail.patient?.patientName.split(' ').slice(1).join(' '),
                                mrn: detail.patient?.mrn,
                                gender: detail.patient?.sex,
                                dateOfBirth: detail.patient?.dateOfBirth,
                                isDateOfBirthKnown: detail.patient?.isDateOfBirthKnown,
                                lastVisitTestCodes: detail.tests?.map(t => t.testCode) || []
                            }}
                            isLocked={true}
                        />
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-zinc-500/10 rounded-lg text-zinc-500 transition-colors shrink-0"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Content: Entry Grid */}
            <div className="flex-1 overflow-auto custom-scrollbar relative">
                <div className={cn(
                    "transition-all duration-300",
                    isAvailable ? "opacity-30 grayscale-[50%] pointer-events-none blur-sm" : "opacity-100"
                )}>
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

                {/* Lock Overlay */}
                {isAvailable && (
                    <div className="absolute inset-0 flex items-center justify-center p-8 text-center bg-black/5 dark:bg-white/0 select-none">
                        <div className="bg-white dark:bg-zinc-800 p-6 rounded-2xl shadow-2xl border dark:border-white/10 border-zinc-200 animate-in zoom-in-95 duration-200">
                            <div className="w-12 h-12 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Clipboard className="w-6 h-6 text-cyan-500" />
                            </div>
                            <h4 className="text-sm font-black uppercase tracking-widest dark:text-white text-zinc-900 mb-2">Clinical Detail Locked</h4>
                            <p className="text-xs text-zinc-500 leading-relaxed">
                                Please claim this assignment to access <br />
                                laboratory parameters and result entry.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Actions (Sticky) */}
            <div className="p-4 border-t dark:border-white/10 border-zinc-200 dark:bg-zinc-900 bg-white shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                {isAvailable ? (
                    <button
                        onClick={handleClaim}
                        disabled={isClaiming}
                        className="w-full h-12 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-xl shadow-black/10 disabled:opacity-50"
                    >
                        {isClaiming ? <Loader2 className="w-5 h-5 animate-spin" /> : "Assign to Me"}
                        {!isClaiming && <ArrowRight className="w-4 h-4" />}
                    </button>
                ) : isAssignedToMe ? (
                    <div className="flex flex-col gap-2.5 w-full">
                        {importNotice && (
                            <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xxs flex items-center justify-between animate-fadeIn">
                                <span>{importNotice}</span>
                                <button onClick={() => setImportNotice(null)} className="text-zinc-400 hover:text-zinc-600 ml-2">✕</button>
                            </div>
                        )}

                        {/* First Row: Import from Analyzer | Skip to Typist */}
                        <div className="flex gap-2">
                            <button 
                                onClick={handleImportFromAnalyzer}
                                disabled={isSaving || isImporting}
                                className="flex-1 h-11 rounded-xl text-xs font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50"
                                title="Query connected lab analyzer and populate test parameter results"
                            >
                                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4 text-indigo-500" />}
                                <span>Import from Analyzer</span>
                            </button>
                            <button 
                                onClick={handleSendEmptyToTypist}
                                disabled={isSaving || isImporting}
                                className="flex-1 h-11 dark:bg-zinc-800 bg-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 rounded-xl text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                Skip / Send Empty to Typist
                            </button>
                        </div>

                        {/* Second Row: Save Draft | Complete Processing */}
                        <div className="flex gap-2">
                            <button 
                                 onClick={handleSaveDraft} 
                                 disabled={isSaving || isImporting}
                                 className="flex-1 h-12 rounded-xl text-xs font-bold border dark:border-white/10 border-zinc-200 dark:text-zinc-300 hover:bg-zinc-500/5 transition-all disabled:opacity-50"
                            >
                                {isSaving ? "Saving..." : "Save Draft"}
                            </button>
                            <button 
                                onClick={handleComplete}
                                className="flex-1 h-12 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
                                disabled={isSaving || isImporting}
                            >
                                Complete Processing
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        disabled
                        className="w-full h-12 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border dark:border-white/5 border-zinc-200"
                    >
                        Assigned to Another Technician
                    </button>
                )}
            </div>
        </div>
    );
}
