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
                // Check if explicit initial focus element exists (e.g. edit demographics)
                const initialTarget = ref.current.querySelector('#btn-edit-demographics') || 
                                      ref.current.querySelector('[data-initial-focus="true"]') ||
                                      ref.current.querySelector('[autofocus]');
                if (initialTarget) {
                    initialTarget.focus();
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
                // If an element already handled the event explicitly, respect it
                if (e.defaultPrevented) return;

                // ESCAPE HATCH
                if (e.key === 'Escape' && onClose) {
                    e.preventDefault();
                    e.stopPropagation();
                    onClose();
                    return;
                }

                // DETERMINISTIC TAB CYCLING (Universal Cross-Browser & Cross-OS)
                // macOS Safari skips buttons & checkboxes by default during native tab;
                // Programmatic focus cycling ensures 100% reliable tab navigation across all form elements.
                if (e.key === 'Tab') {
                    const currentFocusables = getFocusables(ref.current);
                    if (currentFocusables.length === 0) {
                        e.preventDefault();
                        return;
                    }

                    e.preventDefault();

                    let currentIndex = currentFocusables.indexOf(document.activeElement);
                    if (currentIndex === -1 && document.activeElement) {
                        const closest = document.activeElement.closest('button, input, select, textarea, a, [tabindex]');
                        if (closest) currentIndex = currentFocusables.indexOf(closest);
                    }

                    let targetIndex;
                    if (e.shiftKey) { // Backwards (Shift + Tab)
                        if (currentIndex <= 0) {
                            targetIndex = currentFocusables.length - 1;
                        } else {
                            targetIndex = currentIndex - 1;
                        }
                    } else { // Forwards (Tab)
                        if (currentIndex === -1 || currentIndex >= currentFocusables.length - 1) {
                            targetIndex = 0;
                        } else {
                            targetIndex = currentIndex + 1;
                        }
                    }

                    const targetEl = currentFocusables[targetIndex];
                    if (targetEl) {
                        targetEl.focus();
                        if (typeof targetEl.scrollIntoView === 'function') {
                            targetEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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
            if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') return false;
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') return false;
            return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
        });
}
