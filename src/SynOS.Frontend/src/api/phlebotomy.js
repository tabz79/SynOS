import { ReceptionApi } from './reception'

export const PhlebotomyApi = {
    getCollectionPlan: async (visitId) => {
        const response = await fetch(ReceptionApi.withBranchId(`/api/v1/phlebotomy/plan/${visitId}`), {
            headers: ReceptionApi.getHeaders()
        });
        if (!response.ok) throw new Error(`Failed to fetch collection plan: ${response.status}`);
        return response.json();
    },
    getCollectionSummary: async (visitId) => {
        const response = await fetch(ReceptionApi.withBranchId(`/api/v1/phlebotomy/collection-summary/${visitId}`), {
            headers: ReceptionApi.getHeaders()
        });
        if (!response.ok) throw new Error(`Failed to fetch collection summary: ${response.status}`);
        return response.json();
    },

    claimAssignment: async (assignmentId) => {
        const response = await fetch(ReceptionApi.withBranchId('/api/v1/phlebotomy/claim'), {
            method: 'POST',
            headers: ReceptionApi.getHeaders(),
            body: JSON.stringify({ AssignmentId: assignmentId })
        });
        if (!response.ok) throw new Error('Failed to claim assignment');
    },

    collectAssignment: async (assignmentId) => {
        const response = await fetch(ReceptionApi.withBranchId('/api/v1/phlebotomy/collect'), {
            method: 'POST',
            headers: ReceptionApi.getHeaders(),
            body: JSON.stringify({ AssignmentId: assignmentId })
        });
        if (!response.ok) throw new Error('Failed to complete collection');
    },
    
    printLabels: async (visitId) => {
        const response = await fetch(ReceptionApi.withBranchId('/api/v1/phlebotomy/print-labels'), {
            method: 'POST',
            headers: ReceptionApi.getHeaders(),
            body: JSON.stringify({ VisitId: visitId })
        });
        if (!response.ok) throw new Error('Failed to print labels');
        return response.json();
    }
};
