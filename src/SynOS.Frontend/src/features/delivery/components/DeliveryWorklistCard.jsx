import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, Smartphone, UserCheck } from 'lucide-react';

export function DeliveryWorklistCard({ report, isSelected, onClick }) {
    // GPT-5 Logic: Determine status on the fly
    const isDigital = report.signaturesCount > 0;
    const isVerified = report.isPhysicallyVerified || isDigital;
    const isDelivered = report.delivered;

    const getStatusBadge = () => {
        if (isDelivered) {
            return (
                <span className="flex items-center gap-1 text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 tracking-tighter">
                    <CheckCircle2 className="w-2 h-2" />
                    Delivered
                </span>
            );
        }
        if (isDigital) {
            return (
                <span className="flex items-center gap-1 text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 tracking-tighter">
                    <UserCheck className="w-2 h-2" />
                    Digital
                </span>
            );
        }
        if (report.isManualFlow && !isVerified) {
            return (
                <span className="flex items-center gap-1 text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 tracking-tighter">
                    <Clock className="w-2 h-2" />
                    Manual
                </span>
            );
        }
        if (!isVerified) {
            return (
                <span className="flex items-center gap-1 text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20 tracking-tighter">
                    <Clock className="w-2 h-2" />
                    Needs Verification
                </span>
            );
        }
        return (
            <span className="flex items-center gap-1 text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-500 border border-zinc-500/20 tracking-tighter">
                Verified
            </span>
        );
    };

    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full text-left p-4 rounded-2xl border transition-all duration-200 group relative flex flex-col gap-2",
                isSelected 
                    ? "dark:bg-synos-primary/10 bg-synos-primary/5 border-synos-primary/30 shadow-lg ring-1 ring-synos-primary/20" 
                    : "dark:bg-zinc-900/50 bg-white border-black/5 dark:border-white/5 hover:border-synos-primary/20 shadow-sm"
            )}
        >
            <div className="flex justify-between items-start min-w-0">
                <div className="flex-1 min-w-0">
                    <h3 className={cn(
                        "font-bold text-sm tracking-tight truncate mb-0.5",
                        isSelected ? "text-synos-primary" : "text-zinc-900 dark:text-zinc-100"
                    )}>
                        {report.patientName}
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-medium truncate uppercase tracking-widest">
                        {report.testName}
                    </p>
                </div>
                <div className="shrink-0 ml-2">
                    {getStatusBadge()}
                </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                <span>{report.token}</span>
                <span className="font-sans font-bold">{report.patientAgeGender}</span>
            </div>
        </button>
    );
}
