const getHeaders = () => {
    const token = localStorage.getItem('synos_jwt');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

const withBranchId = (url) => {
    const branchId = localStorage.getItem('synos_oversight_branch_id');
    if (branchId && branchId !== 'undefined' && branchId !== 'null') {
        if (url.toLowerCase().includes('branchid=')) return url;
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}branchId=${branchId}`;
    }
    return url;
};

export const HealthCardApi = {
    getPlans: async () => {
        const response = await fetch('/api/v1/reception/health-cards/plans', {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch health card plans');
        return await response.json();
    },

    issueCard: async (payload) => {
        const url = withBranchId('/api/v1/reception/health-cards/issue');
        const response = await fetch(url, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to issue health card');
        return data;
    },

    checkEligibility: async (patientId, phoneNumber) => {
        const params = new URLSearchParams();
        if (patientId) params.append('patientId', patientId);
        if (phoneNumber) params.append('phoneNumber', phoneNumber);
        const url = withBranchId(`/api/v1/reception/health-cards/eligibility?${params.toString()}`);
        const response = await fetch(url, {
            headers: getHeaders()
        });
        if (!response.ok) return { hasActiveCard: false, isPatientEnrolledBeneficiary: false };
        return await response.json();
    },

    enrollBeneficiary: async (cardId, payload) => {
        const url = withBranchId(`/api/v1/reception/health-cards/${cardId}/enroll-beneficiary`);
        const response = await fetch(url, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to enroll family member');
        return data;
    },

    recordUsage: async (payload) => {
        const url = withBranchId('/api/v1/reception/health-cards/record-usage');
        const response = await fetch(url, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to record health card usage');
        return data;
    },

    attachToVisit: async (visitId, planId) => {
        const url = withBranchId('/api/v1/reception/health-cards/attach-to-visit');
        const response = await fetch(url, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ visitId, planId })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to attach health card to visit');
        return data;
    },

    getCards: async (query = '', limit = 50) => {
        const params = new URLSearchParams();
        if (query) params.append('query', query);
        params.append('limit', limit);
        const url = withBranchId(`/api/v1/reception/health-cards?${params.toString()}`);
        const response = await fetch(url, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch health cards');
        return await response.json();
    },

    getCardById: async (cardId) => {
        const url = withBranchId(`/api/v1/reception/health-cards/${cardId}`);
        const response = await fetch(url, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch health card details');
        return await response.json();
    }
};
