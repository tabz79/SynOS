import { ReceptionApi } from './reception'

export const PhlebotomyApi = {
    getCollectionPlan: async (visitId) => {
        const response = await fetch(ReceptionApi.withBranchId(`/api/phlebotomy/plan/${visitId}`), {
            headers: ReceptionApi.getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch collection plan');
        return response.json();
    },

    claimAssignment: async (assignmentId) => {
        const response = await fetch(ReceptionApi.withBranchId('/api/phlebotomy/claim'), {
            method: 'POST',
            headers: ReceptionApi.getHeaders(),
            body: JSON.stringify({ AssignmentId: assignmentId })
        });
        if (!response.ok) throw new Error('Failed to claim assignment');
    },

    collectAssignment: async (assignmentId) => {
        const response = await fetch(ReceptionApi.withBranchId('/api/phlebotomy/collect'), {
            method: 'POST',
            headers: ReceptionApi.getHeaders(),
            body: JSON.stringify({ AssignmentId: assignmentId })
        });
        if (!response.ok) throw new Error('Failed to complete collection');
    }
};
