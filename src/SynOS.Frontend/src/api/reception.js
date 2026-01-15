export const ReceptionApi = {
    /**
     * Commits the reception intent to start a visit.
     * @param {Object} payload - ReceptionStartVisitRequest
     * @returns {Promise<Object>} - Response data
     */
    startVisit: async (payload) => {
        const response = await fetch('/api/v1/reception/start-visit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 'Authorization': 'Bearer ...' // TODO: Add Auth Token when Auth context is ready
            },
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
        const response = await fetch(`/api/v1/patients?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error("Failed to search patients");
        return response.json();
    },

    /**
     * Fetches the Test Master catalog.
     * @returns {Promise<Array>}
     */
    getTestCatalog: async () => {
        const response = await fetch('/api/v1/admin/tests');
        if (!response.ok) throw new Error("Failed to load test catalog");
        return response.json();
    },

    /**
     * Fetches the live activity stream for the branch.
     * @returns {Promise<Array>}
     */
    getActivityStream: async () => {
        // FIX: Added mandatory branchId param per debug prompt & Logged response
        const response = await fetch('/api/v1/branch/activity?branchId=Main');
        if (!response.ok) throw new Error("Failed to load activity stream");

        const data = await response.json();
        console.log("DEBUG: Activity Stream Payload:", data);

        if (!Array.isArray(data)) {
            console.error("CRITICAL: Expected Array, got:", typeof data);
            return []; // Fail safe
        }

        return data;
    }
};
