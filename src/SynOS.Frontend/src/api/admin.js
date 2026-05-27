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

    createUser: async (dto) => {
        return apiClient.post(`${API_BASE}/users`, dto);
    },

    updateUser: async (id, dto) => {
        return apiClient.put(`${API_BASE}/users/${id}`, dto);
    },

    resetPassword: async (id, password) => {
        return apiClient.post(`${API_BASE}/users/${id}/reset-password`, { password });
    },

    assignBranchRole: async (id, branchId, roleId, roleName) => {
        return apiClient.post(`${API_BASE}/users/${id}/branches`, { branchId, roleId, roleName });
    },

    removeBranchRole: async (id, branchId, roleId) => {
        return apiClient.delete(`${API_BASE}/users/${id}/branches?branchId=${branchId}&roleId=${roleId}`);
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
    },

    getDepartments: async () => {
        return apiClient.get(`/api/v1/admin/departments`);
    },

    createDepartment: async (dto) => {
        return apiClient.post(`/api/v1/admin/departments`, dto);
    },

    updateDepartment: async (id, dto) => {
        return apiClient.put(`/api/v1/admin/departments/${id}`, dto);
    },

    deleteDepartment: async (id) => {
        return apiClient.delete(`/api/v1/admin/departments/${id}`);
    },

    getWorkspaces: async () => {
        return apiClient.get(`${API_BASE}/users/workspaces`);
    },

    createWorkspace: async (dto) => {
        return apiClient.post(`${API_BASE}/users/workspaces`, dto);
    },

    updateWorkspace: async (id, dto) => {
        return apiClient.put(`${API_BASE}/users/workspaces/${id}`, dto);
    },

    deleteWorkspace: async (id) => {
        return apiClient.delete(`${API_BASE}/users/workspaces/${id}`);
    },

    setUserWorkspaces: async (id, workspaceIds) => {
        return apiClient.post(`${API_BASE}/users/${id}/workspaces`, { workspaceIds });
    }
};
