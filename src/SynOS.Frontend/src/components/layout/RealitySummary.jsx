import { cn } from "@/lib/utils";

export function RealityTile({ value, label, icon: Icon, color = "default" }) {
    const colorClasses = {
        default: "bg-zinc-200",
        amber: "bg-synos-amber",
        red: "bg-synos-red",
        emerald: "bg-synos-emerald"
    };

    return (
        <div className="bg-synos-card text-synos-cardText rounded-xl p-5 flex flex-col justify-between h-32 shadow-sm">
            <div className="flex justify-between items-start">
                <span className="text-5xl font-bold font-sans tracking-tight text-zinc-900">
                    {value}
                </span>
                {Icon && <Icon className="w-6 h-6 text-zinc-300" />}
            </div>

            <div className="w-full">
                <div className="text-sm text-zinc-600 font-medium mb-3">{label}</div>
                {/* Progress/indicator line */}
                <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full w-1/3", colorClasses[color])} />
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
