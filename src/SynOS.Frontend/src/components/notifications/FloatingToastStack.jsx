import React, { useEffect } from 'react';
import { BellOff } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import { NotificationItemCard } from './NotificationItemCard';

function ToastItem({ notif, onDismissToast, onAction }) {
    useEffect(() => {
        // Auto-dismiss floating toast after 5 seconds (does NOT delete from Notification Center)
        const timer = setTimeout(() => {
            onDismissToast(notif.id);
        }, 5000);
        return () => clearTimeout(timer);
    }, [notif.id, onDismissToast]);

    return (
        <div className="pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
            <NotificationItemCard
                notif={notif}
                onDismiss={onDismissToast}
                onAction={(n) => {
                    onAction(n);
                    onDismissToast(n.id);
                }}
            />
        </div>
    );
}

export function FloatingToastStack({ isSuppressed = false }) {
    const { 
        toastNotifications, 
        dismissToast, 
        executeAction, 
        toastsEnabled,
        toggleToastsEnabled 
    } = useNotifications();

    // If suppressed by active drawer/panel, or disabled by user, or no toasts
    if (isSuppressed || !toastsEnabled || !toastNotifications || toastNotifications.length === 0) {
        return null;
    }

    return (
        <aside 
            aria-label="Floating Desk Notifications"
            className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 w-[330px] sm:w-[360px] pointer-events-none select-none"
        >
            {/* Quick Mute / Disable Popups Header Pill */}
            <div className="flex justify-end pointer-events-auto pr-1">
                <button
                    type="button"
                    onClick={toggleToastsEnabled}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-900/80 hover:bg-slate-950 text-white shadow-xs backdrop-blur-md transition-all cursor-pointer opacity-70 hover:opacity-100"
                    title="Mute toast popups (keeps in Notification Center)"
                >
                    <BellOff className="w-2.5 h-2.5" />
                    <span>Mute popups</span>
                </button>
            </div>

            {toastNotifications.map((notif) => (
                <ToastItem
                    key={notif.id}
                    notif={notif}
                    onDismissToast={dismissToast}
                    onAction={executeAction}
                />
            ))}
        </aside>
    );
}
