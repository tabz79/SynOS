import { apiClient } from './client';

const API_BASE = '/api/v1/patients';

export const PatientApi = {
    searchPatients: async (query, limit = 20, offset = 0) => {
        return apiClient.get(`${API_BASE}?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`);
    },

    getPatientById: async (id) => {
        return apiClient.get(`${API_BASE}/${id}`);
    },

    updatePatient: async (id, dto) => {
        return apiClient.put(`${API_BASE}/${id}`, dto);
    },

    getPhoneHistory: async (id) => {
        return apiClient.get(`${API_BASE}/${id}/phone-history`);
    },

    getPossibleDuplicates: async (id) => {
        return apiClient.get(`${API_BASE}/${id}/possible-duplicates`);
    },

    getMergePreview: async (targetId, sourceId) => {
        return apiClient.post(`${API_BASE}/merge-preview`, { targetId, sourceId });
    },

    mergePatients: async (targetId, sourceId) => {
        return apiClient.post(`${API_BASE}/merge`, { targetId, sourceId });
    },

    getVisits: async (id) => {
        return apiClient.get(`${API_BASE}/${id}/visits`);
    },

    getFinancials: async (id) => {
        return apiClient.get(`${API_BASE}/${id}/financials`);
    }
};
