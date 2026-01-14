import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";

export function AuditPanel() {
    return (
        <div className="flex flex-col h-full">
            {/* Header - Aligns with Reality Summary Header */}
            {/* Header - Aligns with Reality Summary Header */}
            <div className="flex items-center gap-2 mb-2 px-1">
                <span className="text-lg font-medium text-zinc-200">Detail / Audit Panel</span>
            </div>

            {/* Content Window - Aligns with Tiles */}
            <div className="flex-1 bg-zinc-800/30 border border-synos-border rounded-xl p-4 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-auto space-y-8 pr-2">
                    {/* Timeline Item Example 1 */}
                    <div className="relative pl-6">
                        <div className="absolute left-0 top-1.5 w-2 h-2 bg-zinc-600 rounded-full" />
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-mono text-zinc-500">[18:24:55]</span>
                            <p className="text-sm text-zinc-300 leading-snug">
                                User <span className="font-semibold text-white">Receptionist_01</span> viewed <span className="font-mono text-synos-primary">P-2026-14592</span>.
                            </p>
                        </div>
                    </div>

                    {/* Timeline Item Example 2 */}
                    <div className="relative pl-6">
                        <div className="absolute left-0 top-1.5 w-2 h-2 bg-zinc-600 rounded-full" />
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-mono text-zinc-500">[18:23:22]</span>
                            <p className="text-sm text-zinc-300 leading-snug">
                                System updated Bed <span className="font-semibold text-white">B-402</span> to <span className="text-synos-red">Occupied</span>.
                            </p>
                        </div>
                    </div>

                    {/* Timeline Item Example 3 */}
                    <div className="relative pl-6">
                        <div className="absolute left-0 top-1.5 w-2 h-2 bg-zinc-600 rounded-full" />
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-mono text-zinc-500">[18:21:10]</span>
                            <p className="text-sm text-zinc-300 leading-snug">
                                Alert: Insurance failed for <span className="font-mono text-synos-primary">P-2026-14601</span>.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Session ID */}
                <div className="mt-4 pt-4 border-t border-synos-border text-center">
                    <span className="text-xs text-zinc-600 font-mono">Session: 8f7e-2a1c</span>
                </div>
            </div>
        </div>
    );
}
