import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const NotificationContext = createContext(null);

const DEFAULT_SEED_NOTIFICATIONS = [
    {
        id: 'feat-revamped-options',
        type: 'feature',
        category: 'system',
        title: 'Revamped Options Panel',
        message: 'Explore new quick workflows, cash drawer ledger & staff HR tools.',
        priority: 'normal',
        dismissible: true,
        action: { label: 'Explore Tools', type: 'OPEN_OPTIONS' },
        timestamp: new Date()
    },
    {
        id: 'remind-start-shift',
        type: 'reminder',
        category: 'shift',
        title: 'Start Shift Cash',
        message: 'Record your opening drawer cash balance before accepting patient bills.',
        priority: 'high',
        dismissible: true,
        action: { label: 'Open Drawer', type: 'OPEN_DRAWER' },
        timestamp: new Date()
    },
    {
        id: 'remind-end-shift',
        type: 'reminder',
        category: 'shift',
        title: 'End Shift Handover',
        message: 'Remember to click End Shift & handover counter cash before logging out.',
        priority: 'normal',
        dismissible: true,
        action: { label: 'End Shift', type: 'OPEN_END_SHIFT' },
        timestamp: new Date()
    }
];

export function NotificationProvider({ children }) {
    const [notifications, setNotifications] = useState(() => {
        try {
            const saved = sessionStorage.getItem('synos_notifications_list');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (_) {}
        return DEFAULT_SEED_NOTIFICATIONS;
    });

    // Floating Toast Stack (strictly the latest 3 FIFO items)
    const [toastNotifications, setToastNotifications] = useState(() => {
        return notifications.slice(0, 3);
    });

    const [isCenterOpen, setIsCenterOpen] = useState(false);

    // Save active notifications to session storage
    useEffect(() => {
        try {
            sessionStorage.setItem('synos_notifications_list', JSON.stringify(notifications));
        } catch (_) {}
    }, [notifications]);

    // Push new notification (FIFO: newest takes slot 1, oldest evicted beyond 3 in toasts)
    const notify = useCallback((item) => {
        if (!item || !item.message) return;
        const newNotif = {
            id: item.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            type: item.type || 'activity',
            category: item.category || 'billing',
            title: item.title || 'SynOS Update',
            message: item.message,
            priority: item.priority || 'normal',
            dismissible: item.dismissible !== false,
            action: item.action || null,
            timestamp: item.timestamp || new Date()
        };

        setNotifications(prev => {
            const filtered = prev.filter(n => n.id !== newNotif.id);
            return [newNotif, ...filtered];
        });

        setToastNotifications(prev => {
            const filtered = prev.filter(t => t.id !== newNotif.id);
            return [newNotif, ...filtered].slice(0, 3);
        });
    }, []);

    // Dismiss single notification
    const dismiss = useCallback((id) => {
        if (!id) return;
        setNotifications(prev => prev.filter(n => n.id !== id));
        setToastNotifications(prev => prev.filter(t => t.id !== id));
    }, []);

    // Clear all dismissible notifications
    const clearAll = useCallback(() => {
        setNotifications(prev => prev.filter(n => !n.dismissible));
        setToastNotifications([]);
    }, []);

    // Action Execution Router
    const executeAction = useCallback((notification) => {
        if (!notification?.action) return;
        const { type, payload } = notification.action;
        window.dispatchEvent(new CustomEvent('synos:trigger-action', {
            detail: { type, payload, notificationId: notification.id }
        }));
    }, []);

    const toggleCenter = useCallback(() => {
        setIsCenterOpen(prev => !prev);
    }, []);

    const openCenter = useCallback(() => {
        setIsCenterOpen(true);
    }, []);

    const closeCenter = useCallback(() => {
        setIsCenterOpen(false);
    }, []);

    // Connect to in-app custom event hints (Drawer Shortage, Duplicate Doctor, etc.)
    useEffect(() => {
        const handleHint = (e) => {
            const { id, title, message, type, action } = e.detail || {};
            if (!message) return;
            notify({
                id: id || `hint_${Date.now()}`,
                type: type === 'warning' ? 'alert' : 'activity',
                category: type === 'warning' ? 'billing' : 'clinical',
                title: title || 'Desk Alert',
                message,
                priority: type === 'warning' ? 'high' : 'normal',
                action: action || null
            });
        };

        const handleDismiss = (e) => {
            const { id } = e.detail || {};
            if (id) dismiss(id);
        };

        window.addEventListener('synos:notification-hint', handleHint);
        window.addEventListener('synos:dismiss-notification-hint', handleDismiss);
        return () => {
            window.removeEventListener('synos:notification-hint', handleHint);
            window.removeEventListener('synos:dismiss-notification-hint', handleDismiss);
        };
    }, [notify, dismiss]);

    const unreadCount = useMemo(() => {
        return notifications.length;
    }, [notifications]);

    const value = useMemo(() => ({
        notifications,
        toastNotifications,
        unreadCount,
        isCenterOpen,
        notify,
        dismiss,
        clearAll,
        executeAction,
        toggleCenter,
        openCenter,
        closeCenter
    }), [notifications, toastNotifications, unreadCount, isCenterOpen, notify, dismiss, clearAll, executeAction, toggleCenter, openCenter, closeCenter]);

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
}
