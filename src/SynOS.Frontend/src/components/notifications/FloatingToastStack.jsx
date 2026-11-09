import React from 'react';
import { useNotifications } from '@/context/NotificationContext';
import { NotificationItemCard } from './NotificationItemCard';

export function FloatingToastStack() {
    const { toastNotifications, dismiss, executeAction } = useNotifications();

    if (!toastNotifications || toastNotifications.length === 0) return null;

    return (
        <aside 
            aria-label="Floating Desk Notifications"
            className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 w-[330px] sm:w-[360px] pointer-events-none select-none animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
            {toastNotifications.map((notif) => (
                <div key={notif.id} className="pointer-events-auto">
                    <NotificationItemCard
                        notif={notif}
                        onDismiss={dismiss}
                        onAction={(n) => {
                            executeAction(n);
                            dismiss(n.id);
                        }}
                    />
                </div>
            ))}
        </aside>
    );
}
