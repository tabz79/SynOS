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
    }
};
