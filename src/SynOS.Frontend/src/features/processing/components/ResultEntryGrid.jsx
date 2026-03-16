
import { useState, useEffect, useRef } from 'react';
import { cn } from "@/lib/utils";
import { ParameterRow } from './ParameterRow';

export function ResultEntryGrid({ test, results, onValueChange, onSaveDraft, isSaving }) {
    const [activeIndex, setActiveIndex] = useState(0);
    const rowRefs = useRef([]);

    useEffect(() => {
        // Autofocus first parameter
        if (test.parameters?.length > 0) {
            setActiveIndex(0);
            setTimeout(() => {
                const firstInput = rowRefs.current[0]?.querySelector('input, select, textarea, button');
                firstInput?.focus();
            }, 100);
        }
    }, [test]);

    const handleKeyDown = (e, index) => {
        const isLast = index === test.parameters.length - 1;
        const isFirst = index === 0;

        if (e.key === 'Enter' || e.key === 'Tab') {
            if (e.shiftKey) {
                // SHIFT + ENTER / TAB -> Previous
                if (!isFirst) {
                    e.preventDefault();
                    focusElement(index - 1);
                }
            } else {
                // ENTER / TAB -> Next
                if (!isLast) {
                    e.preventDefault();
                    focusElement(index + 1);
                }
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!isLast) focusElement(index + 1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!isFirst) focusElement(index - 1);
        } else if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            onSaveDraft();
        }
    };

    const focusElement = (index) => {
        setActiveIndex(index);
        const input = rowRefs.current[index]?.querySelector('input, select, textarea, [role="combobox"]');
        input?.focus();
    };

    return (
        <div className="flex flex-col">
            {/* Grid Header */}
            <div className="grid grid-cols-[1fr_120px_80px_140px] px-4 py-2 text-[10px] uppercase font-black tracking-tighter dark:text-zinc-500 text-zinc-400 border-b dark:border-white/5 border-zinc-100">
                <div>Parameter</div>
                <div className="text-center">Result</div>
                <div className="text-center">Unit</div>
                <div className="text-right">Reference</div>
            </div>

            {/* Grid Rows */}
            <div className="divide-y dark:divide-white/5 divide-zinc-100">
                {test.parameters?.map((param, idx) => (
                    <div 
                        key={param.parameterCode} 
                        ref={el => rowRefs.current[idx] = el}
                        className={cn(
                            "grid grid-cols-[1fr_120px_80px_140px] px-4 py-3 transition-colors",
                            activeIndex === idx ? "dark:bg-white/5 bg-zinc-50" : "hover:dark:bg-white/[0.02] hover:bg-zinc-50/50"
                        )}
                        onClick={() => setActiveIndex(idx)}
                    >
                        <div className="flex flex-col">
                            <span className="text-sm font-bold dark:text-zinc-200 text-zinc-900 leading-tight">
                                {param.parameterName}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500">
                                {param.parameterCode}
                            </span>
                        </div>
                        
                        <div className="flex justify-center items-center">
                            <ParameterRow 
                                parameter={param}
                                value={results[param.parameterCode] || ''}
                                onChange={(val) => onValueChange(param.parameterCode, val)}
                                onKeyDown={(e) => handleKeyDown(e, idx)}
                                isActive={activeIndex === idx}
                            />
                        </div>

                        <div className="text-center text-xs text-zinc-500 flex items-center justify-center font-medium">
                            {param.unit || '—'}
                        </div>

                        <div className="text-right text-[11px] font-mono dark:text-zinc-400 text-zinc-500 flex items-center justify-end leading-tight">
                            {param.referenceRange || '—'}
                        </div>
                    </div>
                ))}
            </div>
            
            {test.parameters?.length === 0 && (
                <div className="p-8 text-center text-zinc-500 italic text-sm">
                    No parameters defined for this test.
                </div>
            )}
        </div>
    );
}
