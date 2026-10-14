import { useEffect, useRef } from 'react';

/**
 * useFocusTrap
 * 
 * Implements the SynOS "Iron Dome" Containment Law.
 * 
 * 1. TRAP: Focus cannot escape the container while active.
 * 2. RESTORE: Focus returns to trigger on close.
 * 3. ESCAPE: Esc key triggers strict dismissal.
 * 
 * @param {React.RefObject} ref - The container to trap focus within
 * @param {boolean} isActive - Whether the trap is currently active
 * @param {Function} [onClose] - Optional callback for Escape key dismissal
 */
export function useFocusTrap(ref, isActive, onClose) {
    const previousFocus = useRef(null);

    useEffect(() => {
        if (isActive && ref.current) {
            // 1. CAPTURE STATE
            previousFocus.current = document.activeElement;

            // 2. INITIAL FOCUS (Auto-Focus first element)
            const focusables = getFocusables(ref.current);
            if (focusables.length > 0) {
                // Check if any element already has autofocus attribute
                const autoFocusEl = ref.current.querySelector('[autofocus]');
                if (autoFocusEl) {
                    autoFocusEl.focus();
                } else {
                    // Prefer first interactive form input (phone/test search) over close button
                    const firstInput = ref.current.querySelector('input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])');
                    if (firstInput) {
                        firstInput.focus();
                    } else {
                        focusables[0].focus();
                    }
                }
            }

            // 3. TRAP EVENT LISTENERS
            const handleKeyDown = (e) => {
                // ESCAPE HATCH
                if (e.key === 'Escape' && onClose) {
                    e.preventDefault();
                    e.stopPropagation();
                    onClose();
                    return;
                }

                // TAB TRAP
                if (e.key === 'Tab') {
                    const currentFocusables = getFocusables(ref.current);
                    if (currentFocusables.length === 0) {
                        e.preventDefault();
                        return;
                    }

                    const first = currentFocusables[0];
                    const last = currentFocusables[currentFocusables.length - 1];

                    if (e.shiftKey) { // SHIFT + TAB (Backwards)
                        if (document.activeElement === first || !ref.current.contains(document.activeElement)) {
                            e.preventDefault();
                            last.focus();
                        }
                    } else { // TAB (Forwards)
                        if (document.activeElement === last || !ref.current.contains(document.activeElement)) {
                            e.preventDefault();
                            first.focus();
                        }
                    }
                }
            };

            document.addEventListener('keydown', handleKeyDown);

            return () => {
                document.removeEventListener('keydown', handleKeyDown);
                // 4. RESTORE FOCUS
                if (previousFocus.current && document.body.contains(previousFocus.current)) {
                    previousFocus.current.focus();
                }
            };
        }
    }, [isActive, ref, onClose]);
}

/**
 * Helper: Get all interactive elements
 * Filters out hidden/disabled inputs.
 */
function getFocusables(element) {
    if (!element) return [];

    const selector = [
        'input:not([disabled]):not([type="hidden"])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        'button:not([disabled])',
        'a[href]',
        '[tabindex]:not([tabindex="-1"])',
        '.focus-synos:not([disabled])'
    ].join(', ');

    return Array.from(element.querySelectorAll(selector))
        .filter(el => {
            return !el.hasAttribute('hidden') && 
                   getComputedStyle(el).display !== 'none' &&
                   getComputedStyle(el).visibility !== 'hidden';
        });
}
