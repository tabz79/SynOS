import { useLayoutEffect, useRef } from 'react';

/**
 * SYNOS MOTION CANON v1.0
 * The Single Source of Truth for System Physics.
 * 
 * Duration: 260ms (OS-Grade Snap)
 * Easing: cubic-bezier(0.22, 1, 0.36, 1) (Inverse-In, Rapid-Out, Soft-Settle)
 */

export const SYNOS_MOTION = {
    DURATION: 260,
    EASING: "cubic-bezier(0.22, 1, 0.36, 1)"
};

/**
 * useFlipGroup
 * 
 * Orchestrates a FLIP animation for a group of elements.
 * 
 * @param {Array<React.RefObject>} refs - Array of refs to animated elements
 * @param {Array<any>} triggers - Dependency array that triggers the FLIP
 * @param {Object} options - Optional config
 */
export function useFlipGroup(refs, triggers = [], options = {}) {
    const prevRects = useRef(new Map());

    useLayoutEffect(() => {
        // 1. MEASURE LAST (Current/New State)
        const currentRects = new Map();

        refs.forEach((ref, idx) => {
            if (ref.current) {
                currentRects.set(idx, ref.current.getBoundingClientRect());
            }
        });

        // 2. INVERT & PLAY
        refs.forEach((ref, idx) => {
            const domNode = ref.current;
            const first = prevRects.current.get(idx);
            const last = currentRects.get(idx);

            if (domNode && first && last) {
                const dy = first.top - last.top;
                const dx = first.left - last.left;

                // Only animate if there is actual movement
                if (dy !== 0 || dx !== 0) {
                    domNode.animate([
                        { transform: `translate(${dx}px, ${dy}px)` },
                        { transform: 'none' }
                    ], {
                        duration: SYNOS_MOTION.DURATION,
                        easing: SYNOS_MOTION.EASING,
                        fill: 'both' // Ensures no flicker at end
                    });
                }
            }
        });

        // 3. CAPTURE FOR NEXT TURN
        prevRects.current = currentRects;

    }, triggers);
}

/**
 * usePanelEntry
 * 
 * Animates a panel entering from right-to-left rigidly.
 * Ideally called when mounted.
 */
export function usePanelEntry(ref, isVisible) {
    useLayoutEffect(() => {
        if (isVisible && ref.current) {
            ref.current.animate([
                { transform: 'translateX(20px)', opacity: 0 }, // Subtle slide, not full screen
                { transform: 'none', opacity: 1 }
            ], {
                duration: SYNOS_MOTION.DURATION,
                easing: SYNOS_MOTION.EASING,
                fill: 'both'
            });
        }
    }, [isVisible]);
}
