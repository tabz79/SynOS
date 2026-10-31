import { useState } from 'react'
import { cn } from '@/lib/utils'
import { TestTube2, Check, ChevronDown } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { motion, AnimatePresence } from 'framer-motion'

export function TubeInstructionCard({ instruction, index }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [isExpanded, setIsExpanded] = useState(false);

    // Safely extract properties
    const tubeName = instruction?.tubeName || 'Unknown Tube';
    const specimenName = instruction?.specimenName || instruction?.specimenType || 'Unknown Specimen';
    const requiredTubes = instruction?.requiredTubes || 1;
    const tests = instruction?.tests || [];
    const color = instruction?.color || '#94a3b8'; // Default slate gray if no color

    const ui = isDark ? {
        card: "bg-zinc-900 border border-white/10 rounded-xl overflow-hidden shadow-lg",
        header: "bg-zinc-800/50 p-3 flex items-center gap-3 cursor-pointer hover:bg-zinc-800 transition-colors",
        tubeIconBox: "bg-zinc-900 border border-white/10 shrink-0",
        title: "text-zinc-100 font-bold",
        subtitle: "text-zinc-400 font-medium text-xs",
        badge: "bg-synos-primary/20 text-synos-primary border border-synos-primary/20",
        expandBg: "bg-black/20"
    } : {
        card: "bg-white border border-black/5 rounded-xl overflow-hidden shadow-sm",
        header: "bg-black/[0.02] p-3 flex items-center gap-3 cursor-pointer hover:bg-black/[0.04] transition-colors",
        tubeIconBox: "bg-white border border-black/10 shadow-sm shrink-0",
        title: "text-zinc-900 font-bold",
        subtitle: "text-zinc-500 font-medium text-xs",
        badge: "bg-zinc-100 text-zinc-700 border border-black/5",
        expandBg: "bg-white"
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={ui.card}
        >
            <div
                className={ui.header}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {/* Tube Icon with Color Indicator */}
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center relative", ui.tubeIconBox)}>
                    <TestTube2 className="w-5 h-5 text-zinc-400 z-10" />
                    {/* Color Strip Indicator */}
                    <div
                        className="absolute bottom-0 left-0 right-0 h-2 rounded-b-lg opacity-80"
                        style={{ backgroundColor: color }}
                    />
                </div>

                {/* Main Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                        <span className={cn("truncate text-sm", ui.title)}>
                            {tubeName}
                        </span>
                        <div className="flex items-center gap-2">
                            {/* Color Dot (Optional redundant identifier, often requested by phlebotomists) */}
                            <div className="w-3 h-3 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: color }} title={color} />
                            <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider", ui.badge)}>
                                {requiredTubes} Tube{requiredTubes > 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                    <div className={ui.subtitle}>
                        {specimenName}
                    </div>
                    {instruction?.accessionNumber && (
                        <div className="flex items-center gap-1.5 mt-1.5 px-2 py-0.5 bg-synos-primary/5 dark:bg-synos-primary/10 rounded border border-synos-primary/10 w-fit">
                            <span className="text-[9px] font-mono font-bold text-synos-primary/60 uppercase tracking-tighter">Acc:</span>
                            <span className="text-[10px] font-mono font-bold text-synos-primary tracking-tight">{instruction.accessionNumber}</span>
                        </div>
                    )}
                </div>

                {/* Expand Toggle */}
                <div className="shrink-0 text-zinc-400">
                    <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isExpanded && "rotate-180")} />
                </div>
            </div>

            {/* Expandable Test List */}
            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className={cn("border-t border-black/5 dark:border-white/5", ui.expandBg)}
                    >
                        <div className="p-3 space-y-2">
                            <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1">
                                Included Tests
                            </div>
                            {tests.map((test, idx) => (
                                <div key={test.testCode || idx} className="flex items-start gap-2">
                                    <Check className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                                    <div>
                                        <div className="text-sm font-medium dark:text-zinc-300 text-zinc-800 leading-tight">
                                            {test.testName}
                                        </div>
                                        <div className="type-code text-[10px] text-zinc-500 uppercase">
                                            {test.testCode}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
