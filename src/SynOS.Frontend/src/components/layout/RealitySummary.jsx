import { useLayoutEffect, useRef } from 'react';
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";

export function RealityTile({ value, label, qualifier, icon: Icon, color = "default", id, style, isHidden, isCollapsed }) {
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
            className={cn(
                "rounded-xl transition-[transform,opacity] duration-300 group cursor-default flex flex-col justify-between",
                "isolation-auto relative z-10",
                ui.card,
                // FLIP: Opacity handled via props/style during animation, but base state here
                isHidden && "opacity-0 pointer-events-none",
                // STATE A (Expanded): h-32, p-5
                // STATE C (Instrument): Compact padding, content-driven height
                isCollapsed ? "px-4 py-2.5 gap-1.5" : "p-5 h-32"
            )}
        >
            <div className="flex justify-between items-start">
                <span className={cn(
                    "font-bold font-sans tracking-tight group-hover:scale-[1.02] transition-transform duration-300 origin-left",
                    ui.text,
                    // TYPOGRAPHY MORPH & SCALING:
                    // State C (Collapsed): Always 3xl
                    // State A (Expanded): Scale based on length to fit 1M+ (7+ chars)
                    isCollapsed
                        ? "text-3xl leading-tight pb-0.5" // Fixed: leading-none caused clipping. Added pb-0.5 buffer.
                        : value && value.toString().length > 9 ? "text-3xl leading-snug" // 1 Crore+
                            : value && value.toString().length > 6 ? "text-4xl leading-snug" // 10 Lakhs+
                                : "text-5xl leading-tight pb-1" // Default (Added pb-1 and relaxed leading)
                )}>
                    {value}
                </span>
                {Icon && <Icon className={cn(
                    "transition-colors duration-300",
                    isCollapsed ? "w-4 h-4" : "w-6 h-6",
                    // MONOCHROME CORRECTION: Visible Gray (zinc-500) instead of Faint Gray (zinc-300)
                    "text-zinc-500 group-hover:text-zinc-700"
                )} />}
            </div>

            <div className="w-full">
                <div className={cn(
                    "text-zinc-600 transition-colors group-hover:text-zinc-800 flex items-baseline gap-1.5 whitespace-nowrap overflow-hidden",
                    isCollapsed
                        ? "text-xs font-medium mb-1.5" // TECHNICAL METADATA (State C)
                        : "text-sm font-medium mb-3 normal-case" // CONTEXT LABEL (State A)
                )}>
                    <span className="truncate">{label}</span>
                    {qualifier && (
                        <span className={cn(
                            "opacity-60 font-normal truncate",
                            isCollapsed ? "text-[10px]" : "text-xs"
                        )}>
                            {qualifier}
                        </span>
                    )}
                </div>

                {/* Progress/indicator line */}
                <div className={cn(
                    "w-full bg-zinc-100 rounded-full overflow-hidden",
                    isCollapsed ? "h-1" : "h-1.5"
                )}>
                    <div className={cn("h-full rounded-full w-1/3 transition-all duration-500", colorClasses[color] || "bg-zinc-400")} />
                </div>
            </div>
        </div>
    );
}

export function RealitySummary({ tiles = [], isCollapsed }) {
    const containerRef = useRef(null);
    const tileRefs = useRef(new Map());
    const prevRects = useRef(new Map());

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
                    ? "grid-cols-6 grid-rows-[auto_0px] gap-x-4 gap-y-0 pb-0 overflow-hidden" // Only clip when collapsed (hiding row 2)
                    : "grid-cols-4 gap-4 p-1" // Added p-1 to breathe and show shadows
            )}
        >
            {tiles.map((tile, idx) => (
                <div
                    key={idx}
                    ref={el => tileRefs.current.set(idx, el)}
                    className={cn(
                        // Wrapper div for grid positioning (FLIP target)
                        // Tiles 7 & 8 in Collapsed Mode:
                        // They are in Row 2. We hide them via opacity.
                        // Container overflow-hidden clips them.
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
