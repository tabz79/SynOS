import { useLayoutEffect, useRef } from 'react';
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";
import { Users, User, RefreshCw } from 'lucide-react';

export function RealityTile({ 
    value, 
    label, 
    shortLabel, 
    qualifier, 
    icon: Icon, 
    color = "default", 
    id, 
    style, 
    isHidden, 
    isCollapsed, 
    isPool, 
    scopeBadge,
    isDual,
    individualValue,
    poolLabel = "Pool Total",
    individualLabel = "You"
}) {
    const colorClasses = {
        default: "bg-zinc-200",
        amber: "bg-synos-amber",
        red: "bg-synos-red",
        emerald: "bg-synos-emerald",
        blue: "bg-blue-200",
        zinc: "bg-zinc-300"
    };

    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const ui = {
        card: isDark
            ? "bg-white/95 border-white/10 shadow-lg"
            : "bg-white shadow-[0_4px_12px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,1)] border border-black/[0.1] hover:bg-white",
        text: "text-zinc-900"
    };

    // ADAPTIVE LABEL LOGIC:
    // Minimized: Use shortLabel if available (e.g. "Prepaid Bills")
    // Maximized: Use full label (e.g. "Prepaid Bills Issued")
    const displayLabel = (isCollapsed && shortLabel) ? shortLabel : label;

    // Tooltip: Always show full context on hover, especially if truncated or using short label
    const tileTitle = isCollapsed ? `${label}${qualifier ? ` (${qualifier})` : ''}` : undefined;

    return (
        <div
            id={id}
            style={{
                ...style,
                background: isDark
                    ? `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAt66YlAAAAB3RSTlMAo7S066u0v76zAAABJklEQVQ4jXWSwW7DIAyGvRNoV9HeIdp7B2nvHaK9d7D27lX836VpY6t0p8oHicDHP4Z99qGf96HvX+h7NfSmX8U8z9M0z6+P/m8X6fB6L78XpX4X5X4O6fc8l7e8n+T9KO87ed+m77pP33Wfvuu6T991nb7rum/ed5+87z55333yvvvkfffJ++6T990n77pP33Wfvus6fdd13rrvu67rvXXfd13ne+u+77rO99Z933Wdt67rtnXdt67rtnWdt67rtjW999Y9ve9997mPu8997uPus9fZZ6+zz15nn73OPnudvU9f0+v0Nb1OX9Pr9DW9Tm9O9vTmaE5vjua09f7o/db7rff7f9H3v6XvP9TzL/X+U8+/1fMv9fw7fQ=="), 
                         #ffffff`
                    : `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAt66YlAAAAB3RSTlMAo7S066u0v76zAAABJklEQVQ4jXWSwW7DIAyGvRNoV9HeIdp7B2nvHaK9d7D27lX836VpY6t0p8oHicDHP4Z99qGf96HvX+h7NfSmX8U8z9M0z6+P/m8X6fB6L78XpX4X5X4O6fc8l7e8n+T9KO87ed+m77pP33Wfvuu6T991nb7rum/ed5+87z55333yvvvkfffJ++6T990n77pP33Wfvus6fdd13rrvu67rvXXfd13ne+u+77rO99Z933Wdt67rtnXdt67rtnWdt67rtjW999Y9ve9997mPu8997uPus9fZZ6+zz15nn73OPnudvU9f0+v0Nb1OX9Pr9DW9Tm9O9vTmaE5vjua09f7o/db7rff7f9H3v6XvP9TzL/X+U8+/1fMv9fw7fQ=="), 
                         linear-gradient(to bottom, #ffffff 0%, #f9fafb 100%)`
            }}
            title={tileTitle}
            className={cn(
                "rounded-xl transition-[transform,opacity] duration-300 group cursor-default flex flex-col justify-between",
                "isolation-auto relative z-10",
                ui.card,
                isHidden && "opacity-0 pointer-events-none hidden",
                // Grid Height Standardization: Preserve full card height in both expanded and collapsed views
                "p-3.5 sm:p-4 h-28 sm:h-32 gap-0"
            )}
        >
            {isDual ? (
                /* DUAL METRIC SPLIT LAYOUT (Mockup Option B) */
                <div className="flex flex-col h-full w-full justify-between">
                    {/* TOP: Icon Badge + Title */}
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border",
                                isDark 
                                    ? "bg-zinc-800/80 text-zinc-300 border-zinc-700/60" 
                                    : "bg-slate-100 text-zinc-700 border-slate-200/80 shadow-xs"
                            )}>
                                {Icon ? <Icon className="w-4 h-4" /> : null}
                            </div>
                            <span className={cn(
                                "font-bold text-xs sm:text-sm tracking-tight truncate",
                                isDark ? "text-zinc-100" : "text-zinc-900"
                            )}>
                                {displayLabel}
                            </span>
                        </div>
                        {scopeBadge ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20 shrink-0 truncate">
                                {scopeBadge}
                            </span>
                        ) : null}
                    </div>

                    {/* BOTTOM: Horizontal Split (Primary Value on Left, Secondary Pod on Right) */}
                    <div className="flex items-center justify-between w-full mt-auto pt-1 gap-1 sm:gap-2">
                        {/* Left: Primary Value + Label */}
                        <div className="flex flex-col min-w-0">
                            <span className={cn(
                                "font-extrabold font-sans tracking-tight block tabular-nums leading-tight",
                                ui.text,
                                value && value.toString().length > 8 ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
                            )}>
                                {value}
                            </span>
                            <span className="text-[10px] sm:text-[11px] font-semibold text-zinc-500 tracking-tight mt-0.5 truncate">
                                {poolLabel}
                            </span>
                        </div>

                        {/* Divider */}
                        <div className="h-8 w-px bg-slate-200 dark:bg-zinc-700/60 shrink-0 self-center mx-1 sm:mx-1.5" />

                        {/* Right: Recessed Pod (Context Icon + Secondary Amount) */}
                        <div 
                            title={individualLabel === "Pool" ? "Pool Total (Branch-wide)" : "Desk Total (You)"}
                            className={cn(
                                "rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 flex items-center justify-center shrink-0 border transition-all group-hover:scale-[1.02]",
                                isDark 
                                    ? "bg-zinc-800/90 border-zinc-700/80 shadow-xs" 
                                    : "bg-slate-100/90 border-slate-200/80 shadow-xs"
                            )}
                        >
                            <div className="flex items-center gap-1.5 leading-none">
                                {individualLabel === "Pool" ? (
                                    <Users className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                ) : (
                                    <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                )}
                                <span className={cn(
                                    "font-bold font-sans tracking-tight tabular-nums",
                                    ui.text,
                                    individualValue && individualValue.toString().length > 6 ? "text-base sm:text-lg" : "text-lg sm:text-xl"
                                )}>
                                    {individualValue}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* STANDARD SINGLE-METRIC LAYOUT (3-Tier Vertical Slot Separation) */
                <div className="flex flex-col h-full w-full justify-between overflow-hidden">
                    {/* TIER 1: TOP METADATA HEADER (Badge + Icon) */}
                    <div className="flex items-center justify-between w-full h-5 shrink-0 mb-1">
                        <div className="flex items-center gap-1 min-w-0">
                            {isPool ? (
                                <span 
                                    title="Branch Pool: Consolidated across all reception desks"
                                    className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0 truncate"
                                >
                                    <Users className="w-2.5 h-2.5" />
                                    Pool
                                </span>
                            ) : scopeBadge ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20 shrink-0 truncate">
                                    {scopeBadge}
                                </span>
                            ) : null}
                        </div>
                        <div className="flex shrink-0 items-center justify-end">
                            {Icon ? (
                                <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
                            ) : null}
                        </div>
                    </div>

                    {/* TIER 2: CENTER NUMERIC VALUE (100% Width to Itself) */}
                    <div className="flex-1 flex items-center min-w-0 w-full overflow-hidden my-auto">
                        <span 
                            title={String(value)}
                            className={cn(
                                "font-extrabold font-sans tracking-tight block tabular-nums truncate w-full text-left",
                                ui.text,
                                (value ? value.toString().length : 0) > 8 ? "text-xl sm:text-2xl" :
                                (value ? value.toString().length : 0) > 6 ? "text-2xl sm:text-3xl" :
                                (value ? value.toString().length : 0) > 4 ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl"
                            )}
                        >
                            {value}
                        </span>
                    </div>

                    {/* TIER 3: BOTTOM FOOTER (Label) */}
                    <div className="w-full shrink-0 pt-1 border-t border-black/[0.04] dark:border-white/[0.04]">
                        <div className="text-zinc-500 dark:text-zinc-400 transition-colors group-hover:text-zinc-700 dark:group-hover:text-zinc-200 flex items-baseline gap-1.5 whitespace-nowrap overflow-hidden text-xs font-semibold normal-case">
                            <span className="truncate">{displayLabel}</span>
                            {qualifier && (
                                <span className="opacity-60 font-normal truncate text-[11px]">
                                    {qualifier}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export function RealitySummary({ tiles = [], isCollapsed, isServerUpdating = false }) {
    const containerRef = useRef(null);
    const tileRefs = useRef(new Map());
    const prevRects = useRef(new Map());

    // Fallback when tiles are empty during server update / maintenance
    if ((!tiles || tiles.length === 0) && isServerUpdating) {
        return (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/30 backdrop-blur-md p-6 sm:p-8 flex flex-col items-center justify-center text-center gap-2.5 animate-in fade-in duration-300">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                </div>
                <div>
                    <h3 className="text-base sm:text-lg font-bold text-amber-950 dark:text-amber-100">
                        Server is updating, hang on...
                    </h3>
                    <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 mt-1 max-w-md">
                        SynOS is applying an update. This usually takes 2 to 4 minutes. Your clinical records and tokens are completely safe. Live figures will reappear automatically once the update completes.
                    </p>
                </div>
            </div>
        );
    }

    // FLIP ENGINE: OS-Grade Morphing (260ms)
    useLayoutEffect(() => {
        // 1. Measure LAST (Current State)
        const currentRects = new Map();

        // Measure Container first for height transition if needed (but we strictly animate tiles)
        // We focus on TILES as rigid bodies.

        tiles.forEach((_, idx) => {
            const node = tileRefs.current.get(idx);
            if (node) {
                currentRects.set(idx, node.getBoundingClientRect());
            }
        });

        // 2. Calculate Delta & Invert
        tiles.forEach((_, idx) => {
            const domNode = tileRefs.current.get(idx);
            const first = prevRects.current.get(idx);
            const last = currentRects.get(idx);

            if (domNode && first && last) {
                const dx = first.left - last.left;
                const dy = first.top - last.top;
                // Scale not needed if width/height are handled via transform or if we accept layout reflow.
                // Constraint: "DO NOT animate width/height". 
                // So we MUST use Scale to warp the element if its size changed.
                // Check for valid dimensions to prevent Infinite Scale
                if (last.width > 0 && last.height > 0) {
                    const sw = first.width / last.width;
                    const sh = first.height / last.height;

                    // Safe Opacity: 1 or 0, never undefined
                    const startOpacity = (isCollapsed && idx >= 6) ? 1 : 1;
                    const endOpacity = (isCollapsed && idx >= 6) ? 0 : 1;

                    // INVERT: Instant Teleport back to old position/size
                    const animation = domNode.animate([
                        {
                            transformOrigin: 'top left',
                            transform: `translate(${dx}px, ${dy}px) scale(${sw}, ${sh})`,
                            opacity: startOpacity
                        },
                        {
                            transformOrigin: 'top left',
                            transform: 'none',
                            opacity: endOpacity
                        }
                    ], {
                        duration: 260, // SynOS Motion Canon
                        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                        fill: 'both'
                    });

                    // 4. PERFORMANCE CANON: Layer Promotion
                    domNode.style.willChange = 'transform, opacity';
                    animation.onfinish = () => {
                        domNode.style.willChange = 'auto';
                    };
                }

            }
        });

        // 3. Update Ref for Next Turn
        prevRects.current = currentRects;

    }, [isCollapsed, tiles]); // Trigger FLIP on state change

    // Capture FIRST (Before Update) is implicit in prevRects.current from previous render.
    // However, on Mount, prevRects is empty. 
    // We update prevRects on every render to ensure we have the "Before" state for the NEXT update.
    // But useLayoutEffect runs POST-update.
    // So we need to store rects BEFORE the update creates the new layout.
    // Standard trick: useLayoutEffect logic is correct for "Last", but "First" must be captured BEFORE mutations.
    // In React, we can't easily hook "componentWillUpdate".
    // Strategy: We use a separate Effect to capture "Snapshot" or we trust the previous effect's save.
    // The `prevRects.current` updated at the end of this effect SERVES as the `first` for the NEXT run.

    return (
        <div
            ref={containerRef}
            className={cn(
                "grid transition-none", // Removed will-change-transform (Fixes Pixelated Text)
                isCollapsed
                    ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5 pb-0"
                    : "grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4 p-1" // Bold prominent 2x4 card grid
            )}
        >
            {tiles.map((tile, idx) => (
                <div
                    key={idx}
                    ref={el => tileRefs.current.set(idx, el)}
                    className={cn(
                        // Hide tiles 7 & 8 completely when collapsed so 1 single row of 6 full-sized cards is rendered
                        isCollapsed && idx >= 6 && "hidden"
                    )}
                >
                    <RealityTile
                        {...tile}
                        id={`tile-${idx}`}
                        isCollapsed={isCollapsed}
                        isHidden={isCollapsed && idx >= 6}
                    />
                </div>
            ))}
        </div>
    );
}
