import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const NotificationContext = createContext(null);

const DEFAULT_SEED_NOTIFICATIONS = [
    {
        id: 'milestone-cash-counter',
        type: 'milestone',
        category: 'billing',
        title: '₹3,180 Cash in Counter',
        message: '2 bills completed, ₹3,180 cash collected today.',
        priority: 'normal',
        dismissible: false,
        action: { label: 'Open Drawer', type: 'OPEN_DRAWER' },
        timestamp: '10:56 AM'
    },
    {
        id: 'feat-revamped-options',
        type: 'feature',
        category: 'system',
        title: 'Revamped Options Panel',
        message: 'Explore new quick workflows, cash drawer ledger & staff HR tools.',
        priority: 'normal',
        dismissible: true,
        action: { label: 'Explore Tools', type: 'OPEN_OPTIONS' },
        timestamp: 'Now'
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
        timestamp: 'Now'
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
        timestamp: 'Now'
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

    // Toasts enabled preference (saved in localStorage)
    const [toastsEnabled, setToastsEnabledState] = useState(() => {
        try {
            return localStorage.getItem('synos_toasts_enabled') !== 'false';
        } catch (_) {
            return true;
        }
    });

    // Floating Toast Stack (strictly transient FIFO items, default empty so they do not meddle indefinitely)
    const [toastNotifications, setToastNotifications] = useState([]);

    const [isCenterOpen, setIsCenterOpen] = useState(false);

    // Save active notifications to session storage
    useEffect(() => {
        try {
            sessionStorage.setItem('synos_notifications_list', JSON.stringify(notifications));
        } catch (_) {}
    }, [notifications]);

    // Toggle toasts enabled state
    const toggleToastsEnabled = useCallback(() => {
        setToastsEnabledState(prev => {
            const next = !prev;
            try {
                localStorage.setItem('synos_toasts_enabled', String(next));
            } catch (_) {}
            if (!next) {
                setToastNotifications([]);
            }
            return next;
        });
    }, []);

    const setToastsEnabled = useCallback((enabled) => {
        setToastsEnabledState(Boolean(enabled));
        try {
            localStorage.setItem('synos_toasts_enabled', String(Boolean(enabled)));
        } catch (_) {}
        if (!enabled) {
            setToastNotifications([]);
        }
    }, []);

    // Dismiss single toast without removing it from Notification Center
    const dismissToast = useCallback((id) => {
        if (!id) return;
        setToastNotifications(prev => prev.filter(t => t.id !== id));
    }, []);

    // Clear all active floating toasts immediately (e.g. when any drawer opens)
    const clearToasts = useCallback(() => {
        setToastNotifications([]);
    }, []);

    // Push new notification (FIFO: newest takes slot 1, max 3 in toasts)
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
            timestamp: item.timestamp || 'Now'
        };

        // Always add to persistent Notification Center
        setNotifications(prev => {
            const filtered = prev.filter(n => n.id !== newNotif.id);
            return [newNotif, ...filtered];
        });

        // Add to floating toasts only if user has toasts enabled
        if (toastsEnabled) {
            setToastNotifications(prev => {
                const filtered = prev.filter(t => t.id !== newNotif.id);
                return [newNotif, ...filtered].slice(0, 3);
            });
        }
    }, [toastsEnabled]);

    // Dismiss single notification permanently from Notification Center and toasts
    const dismiss = useCallback((id) => {
        if (!id) return;
        setNotifications(prev => prev.filter(n => n.id !== id));
        setToastNotifications(prev => prev.filter(t => t.id !== id));
    }, []);

    // Clear all dismissible notifications (Mark all as read)
    const clearAll = useCallback(() => {
        setNotifications(prev => prev.filter(n => !n.dismissible));
        setToastNotifications([]);
    }, []);

    const markAllAsRead = clearAll;

    // Synchronize reality summary with the milestone notification
    const syncRealitySummary = useCallback((summary) => {
        if (!summary) return;
        const cashCollected = Number(summary.paymentsCashTotal || 0);
        const drawerCash = Number(summary.cashDrawerBalancePool ?? summary.cashDrawerBalance ?? summary.paymentsCashTotal ?? 0);
        const walkIns = Number(summary.walkInsToday || 0);

        if (drawerCash > 0 || cashCollected > 0 || walkIns > 0) {
            const updateFn = (list) => list.map(n => {
                if (n.id === 'milestone-cash-counter') {
                    return {
                        ...n,
                        title: `₹${drawerCash.toLocaleString('en-IN')} Cash in Counter`,
                        message: `${walkIns} bills completed, ₹${cashCollected.toLocaleString('en-IN')} cash collected today.`
                    };
                }
                return n;
            });
            setNotifications(updateFn);
            setToastNotifications(updateFn);
        }
    }, []);

    // Action Execution Router
    const executeAction = useCallback((notification) => {
        if (!notification?.action) return;
        if (typeof notification.action.onClick === 'function') {
            try {
                notification.action.onClick(notification);
            } catch (err) {
                console.error("Failed to execute notification onClick action", err);
            }
            return;
        }
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
        toastsEnabled,
        unreadCount,
        isCenterOpen,
        notify,
        dismiss,
        dismissToast,
        clearToasts,
        toggleToastsEnabled,
        setToastsEnabled,
        clearAll,
        markAllAsRead,
        syncRealitySummary,
        executeAction,
        toggleCenter,
        openCenter,
        closeCenter
    }), [
        notifications, 
        toastNotifications, 
        toastsEnabled, 
        unreadCount, 
        isCenterOpen, 
        notify, 
        dismiss, 
        dismissToast, 
        clearToasts, 
        toggleToastsEnabled, 
        setToastsEnabled, 
        clearAll, 
        markAllAsRead, 
        syncRealitySummary, 
        executeAction, 
        toggleCenter, 
        openCenter, 
        closeCenter
    ]);

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
