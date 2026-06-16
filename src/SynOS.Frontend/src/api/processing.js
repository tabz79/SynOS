
export const ProcessingApi = {
    getQueue: async (includeHistory = false) => {
        const response = await fetch(`/api/processing/queue?includeHistory=${includeHistory}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
        });
        if (!response.ok) {
            const error = new Error('Failed to fetch queue');
            error.status = response.status;
            throw error;
        }
        return await response.json();
    },

    getAssignmentDetail: async (id) => {
        const response = await fetch(`/api/processing/assignment/${id}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}` }
        });
        if (!response.ok) {
            const error = new Error('Failed to fetch assignment detail');
            error.status = response.status;
            throw error;
        }
        return await response.json();
    },

    claimAssignment: async (id) => {
        const response = await fetch('/api/processing/claim', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ processingAssignmentId: id })
        });
        if (!response.ok) {
            const error = new Error('Failed to claim assignment');
            error.status = response.status;
            throw error;
        }
        return await response.json();
    },

    saveDraft: async (id, results) => {
        const response = await fetch(`/api/processing/assignment/${id}/save`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ results })
        });
        if (!response.ok) {
            const error = new Error('Failed to save draft');
            error.status = response.status;
            throw error;
        }
        return await response.json();
    },

    completeAssignment: async (id) => {
        const response = await fetch('/api/processing/complete', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('synos_jwt')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ processingAssignmentId: id })
        });
        if (!response.ok) {
            const error = new Error('Failed to complete assignment');
            error.status = response.status;
            throw error;
        }
        return await response.json();
    },

    normalizeQueueData: (items) => {
        return items.map(item => ({
            id: item.processingAssignmentId,
            token: item.accessionNumber,
            patientName: item.patientName,
            testName: item.testName,
            priority: item.priority,
            specimenType: item.specimenTypeCode,
            status: item.status, // ProcessingAssignmentStatus enum
            assignedResourceId: item.assignedResourceId,
            assignedTechnicianName: item.assignedTechnicianName,
            createdAt: item.createdAt,
            // ActionQueue expected fields
            operationalStatus: item.status === 0 ? "Pending" : 
                             item.status === 1 ? "Assigned" : 
                             item.status === 2 ? "Completed" : "Error"
        }));
    }
};
