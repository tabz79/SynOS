import { apiClient } from './client';

const API_BASE = '/api/v1/admin';

export const AdminApi = {
    getRoles: async () => {
        return apiClient.get(`${API_BASE}/users/roles`);
    },
    
    getUsers: async () => {
        return apiClient.get(`${API_BASE}/users`);
    },

    getBranches: async () => {
        return apiClient.get(`${API_BASE}/users/branches`);
    },

    getTests: async () => {
        return apiClient.get(`${API_BASE}/tests`);
    },

    createTest: async (dto) => {
        return apiClient.post(`${API_BASE}/tests`, dto);
    },

    updateTest: async (id, dto) => {
        return apiClient.put(`${API_BASE}/tests/${id}`, dto);
    },

    deleteTest: async (id) => {
        return apiClient.delete(`${API_BASE}/tests/${id}`);
    }
};
