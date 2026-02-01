import { cn } from "@/lib/utils";

export function RealityTile({ value, label, icon: Icon, color = "default" }) {
    const colorClasses = {
        default: "bg-zinc-200",
        amber: "bg-synos-amber",
        red: "bg-synos-red",
        emerald: "bg-synos-emerald"
    };

    return (
        <div className="bg-synos-card text-synos-cardText rounded-xl p-5 flex flex-col justify-between h-32 shadow-sm border border-transparent hover:border-zinc-300/50 hover:bg-zinc-50 transition-all duration-300 group cursor-default">
            <div className="flex justify-between items-start">
                <span className="text-5xl font-bold font-sans tracking-tight text-zinc-900 group-hover:scale-[1.02] transition-transform duration-300 origin-left">
                    {value}
                </span>
                {Icon && <Icon className="w-6 h-6 text-zinc-300 group-hover:text-zinc-400 transition-colors" />}
            </div>

            <div className="w-full">
                <div className="text-sm text-zinc-600 font-medium mb-3 group-hover:text-zinc-800 transition-colors">{label}</div>
                {/* Progress/indicator line */}
                <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full w-1/3 transition-all duration-500", colorClasses[color])} />
                </div>
            </div>
        </div>
    );
}

export function RealitySummary({ tiles = [] }) {
    return (
        <div className="grid grid-cols-4 gap-4">
            {tiles.map((tile, idx) => (
                <RealityTile key={idx} {...tile} />
            ))}
        </div>
    );
}
