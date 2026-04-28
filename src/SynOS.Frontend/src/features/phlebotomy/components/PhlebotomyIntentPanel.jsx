import { useState, useEffect } from 'react'
import { X, ArrowRight, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'
import { PhlebotomyApi } from '@/api/phlebotomy'
import { RichPatientCard } from '@/components/patient/RichPatientCard'
import { CollectionInstructionList } from './CollectionInstructionList'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { SignalRService } from '@/lib/signalr'
import { CheckCircle2, Printer } from 'lucide-react'

export function PhlebotomyIntentPanel({ isOpen, visitId, closePanel, queueItem, onUpdateLocalState }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { user } = useAuth();

    // State 
    const [isLoadingPlan, setIsLoadingPlan] = useState(false);
    const [planData, setPlanData] = useState(null);
    const [isClaiming, setIsClaiming] = useState(false);
    const [isCollecting, setIsCollecting] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [error, setError] = useState(null);
    const [inventoryShortages, setInventoryShortages] = useState([]);
    const [showPrintSuccess, setShowPrintSuccess] = useState(false);

    // Derived Status from Queue Item (as per plan adjustment)
    const isAvailable = queueItem && !queueItem.assignedPhlebotomistId;
    const isAssignedToMe = queueItem?.assignedPhlebotomistId === user?.id;

    useEffect(() => {
        let isMounted = true;
        if (isOpen && visitId) {
            const fetchPlan = async () => {
                setIsLoadingPlan(true);
                setError(null);
                try {
                    try {
                        const data = await PhlebotomyApi.getCollectionPlan(visitId);
                        if (isMounted) setPlanData(data);
                        } catch (err) {
                        // If plan is not found (already collected), try summary
                        if (err.message.includes('404') || err.message.includes('not found') || err.message.includes('collected')) {
                            console.info(`[Phlebotomy] Plan not found (404), attempting to fetch collection summary for ${visitId}`);
                            const summary = await PhlebotomyApi.getCollectionSummary(visitId);
                            // Normalize summary to plan schema for UI consistency
                            const normalizedData = {
                                visitId: summary.visitId,
                                patient: summary.patient,
                                isHistory: true,
                                instructions: summary.specimens.map(s => ({
                                    tubeName: s.tubeName,
                                    specimenName: s.specimenTypeName,
                                    accessionNumber: s.accessionNumber,
                                    status: s.status,
                                    tests: s.tests.map(t => ({ testName: t, testCode: 'TEST' })), // Fallback code for summary
                                    requiredTubes: 1, 
                                    isCollected: true
                                }))
                            };
                            
                            // Deduplicate test codes for the patient card
                            if (normalizedData.patient) {
                                normalizedData.patient.lastVisitTestCodes = Array.from(new Set(
                                    normalizedData.instructions.flatMap(i => i.tests.map(t => t.testName.substring(0, 4).toUpperCase()))
                                ));
                            }

                            if (isMounted) setPlanData(normalizedData);
                        } else {
                            throw err;
                        }
                    }
                } catch (err) {
                    if (isMounted) setError(err.message || 'Failed to fetch collection details.');
                } finally {
                    if (isMounted) setIsLoadingPlan(false);
                }
            };
            fetchPlan();
        } else {
            // Reset state on close
            setPlanData(null);
            setError(null);
        }
        return () => { isMounted = false; };
    }, [isOpen, visitId]);

    useEffect(() => {
        if (isOpen) {
            SignalRService.onInventoryShortageReceived((payload) => {
                // Check if this shortage is relevant to current plan
                if (planData?.instructions?.some(i => i.tubeCode === payload.tubeCode)) {
                    setInventoryShortages(prev => {
                        const exists = prev.find(s => s.tubeCode === payload.tubeCode);
                        if (exists) return prev;
                        return [...prev, payload];
                    });
                }
            });
        } else {
            setInventoryShortages([]);
        }
    }, [isOpen, planData]);

    const handleClaim = async () => {
        if (!planData?.assignmentId) return;
        setIsClaiming(true);
        setError(null);
        try {
            await PhlebotomyApi.claimAssignment(planData.assignmentId);
            // Optimistically update the parent's action queue so the tab switches 
            // (or let SignalR handle it if we wait, but adjusting locally provides instant feedback)
            if (onUpdateLocalState) {
                onUpdateLocalState(queueItem.visitId, {
                    assignedPhlebotomistId: user.id,
                    assignedPhlebotomistName: user.name || user.username || 'Current User'
                });
            }
        } catch (err) {
            setError(err.message || 'Failed to claim assignment.');
        } finally {
            setIsClaiming(false);
        }
    };

    const handleCollect = async () => {
        if (!planData?.assignmentId) return;
        setIsCollecting(true);
        setError(null);
        try {
            console.log("Completing collection for assignment:", planData.assignmentId);
            await PhlebotomyApi.collectAssignment(planData.assignmentId);
            closePanel(); 
        } catch (err) {
            setError(err.message || 'Failed to complete collection.');
            setIsCollecting(false); // Reset to show error, don't close
        }
    };

    const handlePrint = async () => {
        if (!visitId) return;
        setIsPrinting(true);
        setError(null);
        try {
            console.log("Printing labels for visit:", visitId);
            await PhlebotomyApi.printLabels(visitId);
            setShowPrintSuccess(true);
            setTimeout(() => setShowPrintSuccess(false), 3000);
        } catch (err) {
            setError(err.message || 'Failed to print labels.');
        } finally {
            setIsPrinting(false);
        }
    };

    // Style Dictionary
    const ui = isDark ? {
        panel: "bg-zinc-900 border-l border-white/10 shadow-2xl relative z-20",
        header: "bg-zinc-900 border-b border-white/5",
        footer: "bg-zinc-900 border-t border-white/5",
        title: "text-white",
        subtitle: "text-zinc-500",
        actionBtn: {
            claim: "bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/5",
            collect: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg",
            disabled: "bg-zinc-800 text-zinc-500"
        }
    } : {
        panel: cn(
            "bg-[linear-gradient(to_bottom,#F5FCFF_0%,#E6F2F5_50%,#D7E1E4_100%)]",
            "border-l border-white shadow-[-20px_0_50px_rgba(0,0,0,0.3)]",
            "border-t border-white/80",
            "relative z-20"
        ),
        header: "bg-[linear-gradient(to_bottom,rgba(248,253,255,0.98)_0%,rgba(238,245,248,0.98)_50%,rgba(228,235,238,0.98)_100%)] border-b border-black/[0.06]",
        footer: "bg-[#D7E1E4] border-t border-black/[0.06] shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]",
        title: "text-zinc-900",
        actionBtn: {
            claim: "bg-zinc-900 text-white hover:bg-black shadow-lg shadow-black/20",
            collect: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20",
            disabled: "bg-zinc-100 text-zinc-400 border border-black/[0.05]"
        }
    };

    if (!isOpen) return null;

    return (
        <div className={cn("flex flex-col h-full overflow-hidden rounded-2xl", ui.panel)}>
            {/* Header */}
            <div className={cn("h-16 flex items-center justify-between px-4 shrink-0", ui.header)}>
                <h2 className={cn("text-lg font-bold tracking-tight", ui.title)}>
                    Phlebotomy Intent
                </h2>
                <button
                    onClick={closePanel}
                    className={cn(
                        "p-2 -mr-2 rounded-full transition-all duration-200 active:scale-95",
                        isDark ? "hover:bg-white/10 text-zinc-400 hover:text-white" : "hover:bg-black/5 text-zinc-500 hover:text-zinc-900"
                    )}
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Error Banner */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-red-50 dark:bg-red-900/30 border-b border-red-100 dark:border-red-900 overflow-hidden"
                    >
                        <div className="p-3 flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Inventory Shortage Banner */}
            <AnimatePresence>
                {inventoryShortages.length > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-100 dark:border-amber-900 overflow-hidden"
                    >
                        {inventoryShortages.map((s, idx) => (
                            <div key={idx} className="p-3 flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-bold">INVENTORY SHORTAGE:</span> {s.tubeCode} stock is low (Only {s.available} available). Required {s.required}.
                                    <p className="text-[10px] opacity-70">Clinician notified. Proceeding as non-blocking alert.</p>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-4">

                {/* Patient Summary Card */}
                {isLoadingPlan ? (
                    <div className="animate-pulse bg-zinc-800/10 dark:bg-white/5 h-24 rounded-xl" />
                ) : planData ? (
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                        <RichPatientCard
                            patient={{
                                ...planData.patient,
                                lastVisitTestCodes: planData.instructions?.flatMap(i => i.tests.map(t => t.testCode)) || []
                            }}
                            isLocked={true}
                        />
                    </motion.div>
                ) : null}

                {/* Instructions Section */}
                {!isLoadingPlan && planData && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="flex-1 flex flex-col"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
                                Required Collections
                            </h3>
                            <span className="text-xs font-medium px-2 py-0.5 bg-black/5 dark:bg-white/10 rounded-full">
                                {planData.instructions?.reduce((sum, inst) => sum + inst.requiredTubes, 0) || 0} Tubes Total
                            </span>
                        </div>

                        {/* Blurring filter if available to imply "locked" state */}
                        <div className={cn("transition-all duration-300 relative", isAvailable ? "opacity-40 pointer-events-none grayscale-[50%]" : "opacity-100")}>
                            <CollectionInstructionList instructions={planData.instructions} />

                            {/* Overlay message when available */}
                            {isAvailable && (
                                <div className="absolute inset-0 flex items-center justify-center -translate-y-4">
                                    <div className="bg-black/40 backdrop-blur-md text-white text-xs font-medium px-4 py-2 rounded-full border border-white/10 shadow-xl">
                                        Claim Assignment to View Complete Details
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Footer Actions */}
            <div className={cn("p-4 space-y-3 shrink-0", ui.footer)}>
                {isAvailable ? (
                    <button
                        onClick={handleClaim}
                        disabled={isClaiming || isLoadingPlan}
                        className={cn(
                            "w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2",
                            isClaiming ? ui.actionBtn.disabled : ui.actionBtn.claim
                        )}
                    >
                        {isClaiming ? <Loader2 className="w-5 h-5 animate-spin" /> : "Assign to Me"}
                    </button>
                ) : isAssignedToMe ? (
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={handlePrint}
                            disabled={isPrinting || !isAssignedToMe || isLoadingPlan}
                            className={cn(
                                "h-12 px-6 rounded-xl flex items-center gap-2 font-bold transition-all duration-200",
                                showPrintSuccess 
                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                    : !isAssignedToMe || isPrinting ? ui.actionBtn.disabled : "bg-white border border-black/[0.08] hover:bg-zinc-50 text-zinc-900"
                            )}
                        >
                            {showPrintSuccess ? <CheckCircle2 className="w-4 h-4" /> : isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                            {showPrintSuccess ? "Sent to Printer" : "Print All Labels"}
                        </button>
                        <button
                            onClick={handleCollect}
                            disabled={isCollecting || isLoadingPlan}
                            className={cn(
                                "py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-95",
                                isCollecting ? ui.actionBtn.disabled : ui.actionBtn.collect
                            )}
                        >
                            {isCollecting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete"} <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                ) : planData?.isHistory ? (
                     <button
                        disabled
                        className={cn(
                            "w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-100"
                        )}
                    >
                       <CheckCircle2 className="w-4 h-4" /> Collection Completed
                    </button>
                ) : (
                    // Assigned to someone else fallback
                     <button
                        disabled
                        className={cn(
                            "w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2",
                            ui.actionBtn.disabled
                        )}
                    >
                       Assigned to Another Phlebotomist
                    </button>
                )}
            </div>
        </div>
    );
}
