export const ReceptionApi = {
    // Helper to get headers
    getHeaders: () => {
        const token = localStorage.getItem('synos_jwt');
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    },

    /**
     * Commits the reception intent to start a visit.
     * @param {Object} payload - ReceptionStartVisitRequest
     * @returns {Promise<Object>} - Response data
     */
    startVisit: async (payload) => {
        const response = await fetch('/api/v1/reception/start-visit', {
            method: 'POST',
            headers: ReceptionApi.getHeaders(),
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Server Error: ${response.status}`);
        }

        return response.json();
    },

    /**
     * Searches for patients by query string.
     * @param {string} query 
     * @returns {Promise<Array>}
     */
    searchPatients: async (query) => {
        if (!query || query.length < 3) return [];
        const response = await fetch(`/api/v1/patients?q=${encodeURIComponent(query)}`, {
            headers: ReceptionApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to search patients");
        return response.json();
    },

    /**
     * Fetches the Test Master catalog.
     * @returns {Promise<Array>}
     */
    getTestCatalog: async () => {
        const response = await fetch('/api/v1/admin/tests', {
            headers: ReceptionApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load test catalog");
        return response.json();
    },

    /**
     * Fetches the live activity stream for the branch.
     * @returns {Promise<Array>}
     */
    getActivityStream: async () => {
        // FIX: Using correct Default Branch GUID provided by user
        const branchGuid = "A0000000-0000-0000-0000-000000000001";
        const response = await fetch(`/api/v1/branch/activity?branchId=${branchGuid}`, {
            headers: ReceptionApi.getHeaders()
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("DEBUG: Activity Stream Failed Response:", response.status, errorText);
            throw new Error(`Activity Stream Failed (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        console.log("DEBUG: Activity Stream Payload:", data);

        if (!Array.isArray(data)) {
            console.error("CRITICAL: Expected Array, got:", typeof data);
            return []; // Fail safe
        }

        return data;
    }
};
