import { TubeInstructionCard } from './TubeInstructionCard'

export function CollectionInstructionList({ instructions = [], isLoading = false }) {
    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2].map(i => (
                    <div key={i} className="animate-pulse bg-zinc-800/10 dark:bg-white/5 h-20 rounded-xl" />
                ))}
            </div>
        );
    }

    if (!instructions || instructions.length === 0) {
        return (
            <div className="text-center p-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                <p className="text-sm font-medium text-zinc-500">No collection instructions found.</p>
                <p className="text-xs text-zinc-400 mt-1">This visit may not require a blood draw.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {instructions.map((instruction, idx) => (
                <TubeInstructionCard
                    key={`${instruction.tubeCode}-${idx}`}
                    instruction={instruction}
                    index={idx}
                />
            ))}
        </div>
    );
}
