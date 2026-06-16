import { useState, useEffect, useCallback } from 'react';
import { ProcessingApi } from '@/api/processing';
import { SignalRService } from '@/lib/signalr';
import { useAuth } from '@/context/AuthContext';

export function useProcessing(showHistory = false) {
    const [queue, setQueue] = useState([]);
    const [summary, setSummary] = useState({
        pending: 0,
        urgent: 0,
        critical: 0,
        completed: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();

    const loadQueue = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await ProcessingApi.getQueue(showHistory);
            const normalized = ProcessingApi.normalizeQueueData(data);
            setQueue(normalized);
            updateSummary(normalized);
        } catch (error) {
            console.error('Failed to load processing queue:', error);
        } finally {
            setIsLoading(false);
        }
    }, [showHistory]);

    const updateSummary = (items) => {
        const stats = {
            pending: items.filter(i => i.status === 0).length,
            urgent: items.filter(i => i.priority === 'Urgent').length,
            critical: items.filter(i => i.priority === 'Critical').length,
            completed: items.filter(i => i.status === 2).length // In real app, this might come from a different endpoint or specific "today" filter
        };
        setSummary(stats);
    };

    useEffect(() => {
        loadQueue();

        const connectSignalR = async () => {
            await SignalRService.startConnection();

            // Handle status updates (Claimed, Completed, DraftSaved)
            SignalRService.onAssignmentUpdateReceived((payload) => {
                // payload: { type: 'assignment-update', assignmentId, status }
                setQueue(prev => {
                    const newQueue = prev.map(item => {
                        if (item.id === payload.assignmentId) {
                            return { 
                                ...item, 
                                status: getStatusEnumValue(payload.status),
                                operationalStatus: payload.status,
                                assignedResourceId: payload.assignedResourceId ?? item.assignedResourceId,
                                assignedTechnicianName: payload.assignedTechnicianName ?? item.assignedTechnicianName
                            };
                        }
                        return item;
                    });
                    updateSummary(newQueue);
                    return newQueue;
                });
            });
            
            // Handle new items or visit-level updates
            SignalRService.onActionQueueDeltaReceived((delta) => {
                // If the delta involves this department, or it's a general update, refresh
                // Since delta projects the "current" department, we can check it
                if (delta && (!delta.departmentCode || delta.departmentCode === user?.departmentCode)) {
                    loadQueue();
                }
            });

            // ReceptionSummaryUpdated can also be used if the backend reflects processing stats there
            SignalRService.onReceptionSummaryUpdated((stats) => {
                // Mapping if necessary
            });
        };

        connectSignalR();

        return () => {
            SignalRService.stopConnection();
        };
    }, [loadQueue]);

    const getStatusEnumValue = (statusStr) => {
        const map = {
            'Pending': 0,
            'Claimed': 1,
            'Completed': 2,
            'DraftSaved': 1 // Still claimed/active
        };
        return map[statusStr] ?? 0;
    };

    // Optimistic / Local UI state updates
    const updateLocalState = useCallback((assignmentId, updates) => {
        setQueue(prev => {
            const next = prev.map(item => item.id === assignmentId ? { ...item, ...updates } : item);
            updateSummary(next);
            return next;
        });
    }, []);

    return {
        queue,
        summary,
        isLoading,
        refreshQueue: loadQueue,
        updateLocalState
    };
}
