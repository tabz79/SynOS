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
     * @param {Object} payload - { patientId, referralPartnerId, paymentCollectionModel }
     * @returns {Promise<Object>} - { visitId }
     */
    startVisit: async (payload) => {
        // PER OPTION B: POST /api/v1/reception/start-visit (Confirmed in ReceptionController.cs)
        const response = await fetch('/api/v1/reception/start-visit', {
            method: 'POST',
            headers: ReceptionApi.getHeaders(),
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            if (response.status === 401) {
                console.warn("Unauthorized: Session expired or invalid.");
                localStorage.removeItem('synos_jwt');
                window.location.href = '/login'; // Force re-auth
                throw new Error("Unauthorized");
            }
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Server Error: ${response.status}`);
        }

        const json = await response.json();
        // UNWRAP API RESPONSE: Backend wraps in { data: { ... }, success: true }
        return json.data || json;
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
     * Fetches the dashboard summary metrics.
     * @returns {Promise<any>}
     */
    getDashboardSummary: async () => {
        const baseUrl = '/api/v1';
        const response = await fetch(`${baseUrl}/dashboard/reception/summary`, {
            method: 'GET',
            headers: ReceptionApi.getHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch dashboard summary');
        }

        return await response.json();
    },

    /**
     * Fetches the current intake snapshot (Stateless).
     * @param {string|null} patientId 
     * @param {string|null} visitId 
     * @returns {Promise<any>}
     */
    getIntakeSnapshot: async (patientId, visitId) => {
        // Construct Query Params
        const params = new URLSearchParams();
        if (patientId) params.append('patientId', patientId);
        if (visitId) params.append('visitId', visitId);

        const response = await fetch(`/api/v1/reception/intake/snapshot?${params.toString()}`, {
            method: 'GET',
            headers: ReceptionApi.getHeaders()
        });

        if (!response.ok) {
            if (response.status === 404) return null; // Or empty snapshot
            throw new Error('Failed to fetch intake snapshot');
        }

        return await response.json();
    },

    // DELETED: setIntakePatient (Stateless frontend owns ID)
    // DELETED: clearIntakePatient (Stateless frontend clears ID)

    /**
     * Adds a test to the specified visit.
     * @param {string} visitId
     * @param {string} testCode 
     * @returns {Promise<void>}
     */
    addTestToVisit: async (visitId, testCode) => {
        // PER PHASE 6.2: POST /api/v1/reception/visit/test
        const response = await fetch('/api/v1/reception/visit/test', {
            method: 'POST',
            headers: ReceptionApi.getHeaders(),
            // Payload aligned with IntakeAddTestRequest
            body: JSON.stringify({ VisitId: visitId, TestCode: testCode })
        });
        if (!response.ok) throw new Error('Failed to add test');
    },

    /**
     * Removes a test from the specified visit.
     * @param {string} visitId
     * @param {string} testCode 
     * @returns {Promise<void>}
     */
    removeTestFromVisit: async (visitId, testCode) => {
        // PER PHASE 6.2: DELETE /api/v1/reception/visit/test
        const response = await fetch(`/api/v1/reception/visit/test?visitId=${visitId}&testCode=${encodeURIComponent(testCode)}`, {
            method: 'DELETE',
            headers: ReceptionApi.getHeaders()
        });
        if (!response.ok) throw new Error('Failed to remove test');
    },

    /**
     * Fetches the Discount Master catalog.
     * @returns {Promise<Array>}
     */
    getDiscountMaster: async () => {
        // Assuming endpoint based on test catalog pattern
        const response = await fetch('/api/v1/admin/discounts', {
            headers: ReceptionApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load discount catalog");
        return response.json();
    },

    /**
     * Applies a discount code to the specified visit.
     * @param {string} visitId
     * @param {string} discountCode 
     * @returns {Promise<void>}
     */
    applyDiscountToVisit: async (visitId, discountCode) => {
        const response = await fetch('/api/v1/reception/visit/discount', {
            method: 'POST',
            headers: ReceptionApi.getHeaders(),
            body: JSON.stringify({ visitId, discountCode })
        });
        if (!response.ok) throw new Error('Failed to apply discount');
    },

    /**
     * Removes the discount from the specified visit.
     * @param {string} visitId
     * @returns {Promise<void>}
     */
    removeDiscountFromVisit: async (visitId) => {
        const response = await fetch(`/api/v1/reception/visit/discount?visitId=${visitId}`, {
            method: 'DELETE',
            headers: ReceptionApi.getHeaders()
        });
        if (!response.ok) throw new Error('Failed to remove discount');
    },

    /**
     * Commits the visit.
     * @param {string} visitId
     * @returns {Promise<void>}
     */
    commitVisit: async (visitId) => {
        const response = await fetch('/api/v1/reception/visit/commit', {
            method: 'POST',
            headers: ReceptionApi.getHeaders(),
            body: JSON.stringify({ visitId })
        });
        if (!response.ok) throw new Error('Failed to generate bill');
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
            if (response.status === 401) {
                console.warn("Unauthorized: Session expired or invalid.");
                localStorage.removeItem('synos_jwt');
                window.location.href = '/login';
                throw new Error("Unauthorized");
            }
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
    },

    /**
     * Registers a new patient.
     * @param {Object} payload - { name, mobile, age, gender }
     * @returns {Promise<Object>} - { patientId }
     */
    registerPatient: async (payload) => {
        // MAP FRONTEND TO BACKEND DTO
        // Backend expects: { Phone, Name, Dob, Gender }

        let dob = null;
        if (payload.age) {
            const currentYear = new Date().getFullYear();
            const birthYear = currentYear - parseInt(payload.age);
            dob = `${birthYear}-01-01T00:00:00Z`; // Approximate
        }

        const backendPayload = {
            Phone: payload.mobile,
            Name: payload.name,
            Dob: dob,
            Gender: payload.gender
        };

        const response = await fetch('/api/v1/reception/intake/register-patient', {
            method: 'POST',
            headers: ReceptionApi.getHeaders(),
            body: JSON.stringify(backendPayload)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || "Failed to register patient");
        }


        const json = await response.json();
        return json.data || json;
    },

    /**
     * Fetches the Referral Partners.
     * @returns {Promise<Array>}
     */
    getReferralPartners: async () => {
        const response = await fetch('/api/v1/admin/referral-partners', {
            headers: ReceptionApi.getHeaders()
        });
        if (!response.ok) throw new Error("Failed to load referral partners");
        return response.json();
    },

    /**
     * Updates the referrer text (free text) for the visit.
     * @param {string} visitId
     * @param {string} referrerText
     * @returns {Promise<void>}
     */
    updateReferrerText: async (visitId, referrerText) => {
        const response = await fetch('/api/v1/reception/visit/referrer-text', {
            method: 'PATCH',
            headers: ReceptionApi.getHeaders(),
            body: JSON.stringify({ visitId, referrerText })
        });
        if (!response.ok) throw new Error('Failed to update referrer text');
    },

    /**
     * Applies a referral partner to the visit.
     * @param {string} visitId
     * @param {string} referralPartnerId
     * @returns {Promise<void>}
     */
    applyReferralToVisit: async (visitId, referralPartnerId) => {
        console.log("DEBUG: applyReferralToVisit Payload:", { visitId, referralPartnerId });
        const response = await fetch('/api/v1/reception/visit/referral', {
            method: 'POST',
            headers: ReceptionApi.getHeaders(),
            body: JSON.stringify({ VisitId: visitId, ReferralPartnerId: referralPartnerId })
        });
        if (!response.ok) {
            const errText = await response.text();
            console.error("DEBUG: applyReferral Error:", response.status, errText);
            throw new Error(`Failed to apply referral (${response.status}): ${errText}`);
        }
    },

    /**
     * Removes the referral partner from the visit.
     * @param {string} visitId
     * @returns {Promise<void>}
     */
    removeReferralFromVisit: async (visitId) => {
        const response = await fetch(`/api/v1/reception/visit/referral?visitId=${visitId}`, {
            method: 'DELETE',
            headers: ReceptionApi.getHeaders()
        });
        if (!response.ok) throw new Error('Failed to remove referral');
    },

    /**
     * Marks the visit as prepaid (Patient already paid).
     * @param {string} visitId
     * @returns {Promise<void>}
     */
    markVisitAsPrepaid: async (visitId) => {
        const response = await fetch('/api/v1/reception/visit/mark-prepaid', {
            method: 'POST',
            headers: ReceptionApi.getHeaders(),
            body: JSON.stringify({ visitId })
        });
        if (!response.ok) throw new Error('Failed to mark as prepaid');
    },

    /**
     * Collects payment for the visit.
     * @param {string} visitId
     * @param {number} amount
     * @param {string} mode - 'Cash', 'Card', 'UPI'
     * @returns {Promise<void>}
     */
    collectPayment: async (visitId, amount, mode = 'Cash') => {
        // PER RECEPTION CONTROLLER: POST /api/v1/reception/complete-payment
        // DTO: ReceptionCompletePaymentRequest { VisitId, Amount, Method }
        const response = await fetch('/api/v1/reception/complete-payment', {
            method: 'POST',
            headers: ReceptionApi.getHeaders(),
            body: JSON.stringify({
                VisitId: visitId,
                Amount: amount,
                Method: mode
            })
        });
        if (!response.ok) {
            let errorMessage = 'Failed to collect payment';
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
                if (errorData.inner) {
                    errorMessage += `\nDetails: ${errorData.inner}`;
                }
            } catch (e) {
                console.error("Failed to parse error response", e);
            }
            throw new Error(errorMessage);
        }
    }
};
