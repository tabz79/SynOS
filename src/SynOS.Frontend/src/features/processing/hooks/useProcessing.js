import { useState, useEffect, useCallback } from 'react';
import { ProcessingApi } from '@/api/processing';
import { SignalRService } from '@/lib/signalr';
import { useAuth } from '@/context/AuthContext';

export function useProcessing() {
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
            const data = await ProcessingApi.getQueue();
            const normalized = ProcessingApi.normalizeQueueData(data);
            setQueue(normalized);
            updateSummary(normalized);
        } catch (error) {
            console.error('Failed to load processing queue:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

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

            // Handle Delta updates for the queue
            SignalRService.onActionQueueDeltaReceived((delta) => {
                const normalized = ProcessingApi.normalizeQueueData([delta])[0];
                setQueue(prev => {
                    const exists = prev.find(item => item.id === normalized.id);
                    let newQueue;
                    if (exists) {
                        newQueue = prev.map(item => item.id === normalized.id ? normalized : item);
                    } else {
                        newQueue = [normalized, ...prev];
                    }
                    updateSummary(newQueue);
                    return newQueue;
                });
            });

            // Handle status updates (Claimed, Completed, DraftSaved)
            SignalRService.onAssignmentUpdateReceived((payload) => {
                // payload: { type: 'assignment-update', assignmentId, status }
                setQueue(prev => {
                    const newQueue = prev.map(item => {
                        if (item.id === payload.assignmentId) {
                            return { 
                                ...item, 
                                status: getStatusEnumValue(payload.status),
                                operationalStatus: payload.status 
                            };
                        }
                        return item;
                    });
                    updateSummary(newQueue);
                    return newQueue;
                });
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

    return {
        queue,
        summary,
        isLoading,
        refreshQueue: loadQueue
    };
}
